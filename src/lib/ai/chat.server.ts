import { createOpenAI } from "@ai-sdk/openai";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId } from "./run-id.server";

function db(token: string) {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        if (!h.get("Authorization")) h.set("Authorization", `Bearer ${token}`);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const statusEnum = z.enum(["todo", "in_progress", "done"]);

function buildTools(sb: ReturnType<typeof db>) {
  return {
    listTasks: tool({
      description: "List all tasks on the Kanban board with their status, due date, estimate and tags.",
      inputSchema: z.object({}),
      execute: async () => {
        const { data, error } = await sb.from("tasks").select("*").order("position");
        if (error) return { error: error.message };
        return { tasks: data };
      },
    }),
    createTask: tool({
      description: "Create a new task card.",
      inputSchema: z.object({
        title: z.string(),
        description: z.string().nullable(),
        status: statusEnum.nullable(),
        due_at: z.string().nullable().describe("ISO 8601 datetime or null"),
        estimate_minutes: z.number().nullable(),
        tags: z.array(z.string()).nullable(),
      }),
      execute: async (i) => {
        const status = i.status ?? "todo";
        const { data: last } = await sb
          .from("tasks")
          .select("position")
          .eq("status", status)
          .order("position", { ascending: false })
          .limit(1);
        const { data, error } = await sb
          .from("tasks")
          .insert({
            title: i.title,
            description: i.description ?? "",
            status,
            due_at: i.due_at,
            estimate_minutes: i.estimate_minutes,
            tags: i.tags ?? [],
            position: (last?.[0]?.position ?? 0) + 1,
          })
          .select()
          .single();
        return error ? { error: error.message } : { task: data };
      },
    }),
    updateTask: tool({
      description: "Update fields of an existing task, including moving it to another column via status.",
      inputSchema: z.object({
        id: z.string(),
        title: z.string().nullable(),
        description: z.string().nullable(),
        status: statusEnum.nullable(),
        due_at: z.string().nullable(),
        estimate_minutes: z.number().nullable(),
        tags: z.array(z.string()).nullable(),
      }),
      execute: async ({ id, ...rest }) => {
        const patch: Database["public"]["Tables"]["tasks"]["Update"] = { updated_at: new Date().toISOString() };
        for (const [k, v] of Object.entries(rest)) if (v !== null) (patch as Record<string, unknown>)[k] = v;
        const { data, error } = await sb.from("tasks").update(patch).eq("id", id).select().single();
        return error ? { error: error.message } : { task: data };
      },
    }),
    deleteTask: tool({
      description: "Delete a task permanently.",
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }) => {
        const { error } = await sb.from("tasks").delete().eq("id", id);
        return error ? { error: error.message } : { deleted: id };
      },
    }),
  };
}

export async function handleChat(request: Request) {
  const body = (await request.json()) as { messages: UIMessage[]; threadId: string };
  const { messages, threadId } = body;
  if (!threadId || !Array.isArray(messages)) return new Response("Bad request", { status: 400 });

  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token || token.split(".").length !== 3) return new Response("Unauthorized", { status: 401 });

  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return new Response("AI is not configured", { status: 500 });

  const sb = db(token);
  const { data: claims, error: claimsError } = await sb.auth.getClaims(token);
  if (claimsError || !claims?.claims?.sub) return new Response("Unauthorized", { status: 401 });

  const { data: thread } = await sb.from("chat_threads").select("id").eq("id", threadId).maybeSingle();
  if (!thread) return new Response("Not found", { status: 404 });
  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  const now = new Date().toISOString();
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    instructions: `You are Flow, a friendly, concise task-management assistant living inside a Kanban board with columns To Do (todo), In Progress (in_progress) and Complete (done). Current time: ${now}. Always call listTasks before answering questions about tasks or before updating/deleting (to find ids). Use tools to create, edit, move and delete tasks when asked. After acting, briefly confirm what changed. Use markdown lists for summaries.`,
    messages: await convertToModelMessages(messages),
    tools: buildTools(sb),
    stopWhen: stepCountIs(50),
    abortSignal: request.signal,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  const response = result.toUIMessageStreamResponse({
    originalMessages: messages,
    sendReasoning: true,
    onFinish: async ({ messages: all }) => {
      const rows = all.map((m) => ({
        thread_id: threadId,
        message_id: m.id,
        role: m.role,
        message: JSON.parse(JSON.stringify(m)),
      }));
      const { error } = await sb.from("chat_messages").upsert(rows, { onConflict: "thread_id,message_id" });
      if (error) console.error("Failed to save chat messages", error);
      const firstUser = all.find((m) => m.role === "user");
      const text = firstUser?.parts.find((p) => p.type === "text");
      const patch: { updated_at: string; title?: string } = { updated_at: new Date().toISOString() };
      if (all.length <= 2 && text && "text" in text) patch.title = text.text.slice(0, 60);
      await sb.from("chat_threads").update(patch).eq("id", threadId);
    },
  });
  const runId = runIdFetch.getRunId();
  if (runId) response.headers.set("X-Lovable-AIG-Run-ID", runId);
  return response;
}
