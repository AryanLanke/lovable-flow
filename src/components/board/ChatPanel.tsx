import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import { ArrowUp, Bot, ChevronDown, History, Plus, Square, Trash2, Wrench, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { tasksQueryKey } from "@/lib/tasks";
import { cn } from "@/lib/utils";

const threadsKey = ["chat_threads"] as const;

export function ChatPanel({ threadId }: { threadId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showThreads, setShowThreads] = useState(false);

  const { data: threadsData } = useQuery({
    queryKey: threadsKey,
    queryFn: async () => {
      const { data } = await supabase.from("chat_threads").select("*").order("updated_at", { ascending: false });
      return data ?? [];
    },
  });
  const { data: initial, isLoading } = useQuery({
    queryKey: ["chat_messages", threadId],
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("message")
        .eq("thread_id", threadId)
        .order("created_at");
      return (data ?? []).map((r) => r.message as unknown as UIMessage);
    },
    staleTime: Infinity,
  });

  const newThread = async () => {
    const { data } = await supabase.from("chat_threads").insert({}).select("id").single();
    if (data) {
      qc.invalidateQueries({ queryKey: threadsKey });
      navigate({ to: "/chat/$threadId", params: { threadId: data.id } });
      setShowThreads(false);
    }
  };
  const deleteThread = async (id: string) => {
    await supabase.from("chat_threads").delete().eq("id", id);
    await qc.invalidateQueries({ queryKey: threadsKey });
    if (id === threadId) navigate({ to: "/" });
  };

  const threads = threadsData ?? [];
  const current = threads.find((t) => t.id === threadId);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] bg-canvas ring-1 ring-border">
      <header className="relative flex items-center gap-3 border-b border-border px-5 py-4">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Bot className="h-5 w-5" />
        </div>
        <button onClick={() => setShowThreads((s) => !s)} className="min-w-0 flex-1 text-left">
          <p className="text-sm font-semibold">Flow AI</p>
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            {current?.title ?? "New chat"} <ChevronDown className="h-3 w-3 shrink-0" />
          </p>
        </button>
        <button onClick={() => setShowThreads((s) => !s)} title="Chat history" className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
          <History className="h-4 w-4" />
        </button>
        <button onClick={newThread} title="New chat" className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
          <Plus className="h-4 w-4" />
        </button>
        <Link to="/" title="Close" className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
          <X className="h-4 w-4" />
        </Link>

        {showThreads && (
          <div className="absolute left-3 right-3 top-full z-10 mt-2 max-h-80 overflow-y-auto rounded-2xl bg-popover p-2 shadow-2xl ring-1 ring-border scrollbar-thin">
            {threads.map((t) => (
              <div
                key={t.id}
                className={cn("group flex items-center rounded-xl", t.id === threadId ? "bg-accent" : "hover:bg-accent/60")}
              >
                <Link
                  to="/chat/$threadId"
                  params={{ threadId: t.id }}
                  onClick={() => setShowThreads(false)}
                  className="min-w-0 flex-1 truncate px-3 py-2 text-sm"
                >
                  {t.title}
                </Link>
                <button
                  onClick={() => deleteThread(t.id)}
                  className="p-2 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                  title="Delete chat"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </header>
      {isLoading || !initial ? (
        <div className="flex-1 p-6 text-sm text-muted-foreground">Loading conversation…</div>
      ) : (
        <ChatWindow key={threadId} threadId={threadId} initial={initial} />
      )}
    </div>
  );
}

const SUGGESTIONS = [
  "What's due this week?",
  "How many hours are in progress?",
  "Add a task to review Q4 budget tomorrow at 3pm, 1h, tag finance",
  "Move everything overdue to In Progress",
];

function ChatWindow({ threadId, initial }: { threadId: string; initial: UIMessage[] }) {
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, stop, error } = useChat({
    id: threadId,
    messages: initial,
    transport: new DefaultChatTransport({ api: "/api/chat", body: { threadId } }),
    onFinish: () => {
      qc.invalidateQueries({ queryKey: tasksQueryKey });
      qc.invalidateQueries({ queryKey: ["chat_threads"] });
      qc.invalidateQueries({ queryKey: ["chat_messages", threadId] });
      inputRef.current?.focus();
    },
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  const busy = status === "submitted" || status === "streaming";
  const send = (text: string) => {
    if (!text.trim() || busy) return;
    sendMessage({ text });
    setInput("");
    inputRef.current?.focus();
  };

  return (
    <>
      <div className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-5 py-5">
        {messages.length === 0 && (
          <div className="space-y-4 pt-6">
            <p className="text-xl font-semibold leading-snug">
              Hi, I'm Flow. <span className="text-muted-foreground">Ask me anything about your board — or tell me what to change.</span>
            </p>
            <div className="grid gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-xl bg-secondary px-3.5 py-2.5 text-left text-sm text-foreground/80 ring-1 ring-border transition hover:bg-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[88%] space-y-2 text-sm leading-relaxed",
                m.role === "user" && "rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground",
              )}
            >
              {m.parts.map((p, i) => {
                if (p.type === "text")
                  return m.role === "user" ? (
                    <p key={i} className="whitespace-pre-wrap">{p.text}</p>
                  ) : (
                    <div key={i} className="prose-chat">
                      <ReactMarkdown>{p.text}</ReactMarkdown>
                    </div>
                  );
                if (p.type.startsWith("tool-")) {
                  const name = p.type.slice(5);
                  const state = "state" in p ? String(p.state) : "";
                  const failed = state === "output-error";
                  const doneState = state === "output-available";
                  return (
                    <details key={i} className="rounded-xl bg-secondary/70 px-3 py-2 text-xs ring-1 ring-border">
                      <summary className="flex cursor-pointer list-none items-center gap-2 text-muted-foreground">
                        <Wrench className="h-3.5 w-3.5" />
                        <span className="font-medium text-foreground/80">{name}</span>
                        <span className={cn("ml-auto", failed ? "text-destructive" : doneState ? "text-success" : "")}>
                          {failed ? "failed" : doneState ? "done" : "running…"}
                        </span>
                      </summary>
                      <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[11px] text-muted-foreground">
                        {JSON.stringify("output" in p ? p.output : "input" in p ? p.input : null, null, 2)}
                      </pre>
                    </details>
                  );
                }
                return null;
              })}
            </div>
          </div>
        ))}
        {status === "submitted" && (
          <div className="flex gap-1.5 px-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: `${i * 120}ms` }} />
            ))}
          </div>
        )}
        {error && <p className="rounded-xl bg-destructive/15 px-3 py-2 text-sm text-destructive">{error.message || "Something went wrong."}</p>}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="m-3 flex items-end gap-2 rounded-2xl bg-secondary p-2 ring-1 ring-border focus-within:ring-primary/60"
      >
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Ask Flow or give it a task…"
          className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        {busy ? (
          <button type="button" onClick={stop} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-foreground text-background">
            <Square className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        )}
      </form>
    </>
  );
}
