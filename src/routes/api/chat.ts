import { createFileRoute } from "@tanstack/react-router";
import { handleChat } from "@/lib/ai/chat.server";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          return await handleChat(request);
        } catch (e) {
          if ((e as Error)?.name === "AbortError") return new Response(null, { status: 499 });
          console.error(e);
          return new Response("Chat failed", { status: 500 });
        }
      },
    },
  },
});
