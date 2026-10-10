import { createFileRoute } from "@tanstack/react-router";
import { Board } from "@/components/board/Board";

export const Route = createFileRoute("/_authenticated/board")({
  head: () => ({
    meta: [
      { title: "Flow — Your board" },
      { name: "description", content: "Your personal Kanban board with drag and drop and a built-in AI task assistant." },
      { property: "og:title", content: "Flow — Your board" },
      { property: "og:description", content: "Plan, drag and manage tasks with an AI assistant that can act on your board." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Board />,
});
