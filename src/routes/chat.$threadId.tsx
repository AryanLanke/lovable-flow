import { createFileRoute } from "@tanstack/react-router";
import { Board } from "@/components/board/Board";

export const Route = createFileRoute("/chat/$threadId")({
  head: () => ({
    meta: [
      { title: "Flow AI chat — Kanban board" },
      { name: "description", content: "Chat with Flow AI to query and manage your Kanban tasks." },
      { property: "og:title", content: "Flow AI chat — Kanban board" },
      { property: "og:description", content: "Your AI task assistant, right beside your board." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatRoute,
});

function ChatRoute() {
  const { threadId } = Route.useParams();
  return <Board threadId={threadId} />;
}
