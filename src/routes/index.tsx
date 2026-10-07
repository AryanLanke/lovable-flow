import { createFileRoute } from "@tanstack/react-router";
import { Board } from "@/components/board/Board";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flow — Kanban board with AI assistant" },
      { name: "description", content: "A gorgeous dark Kanban board with drag and drop and a built-in AI task assistant." },
      { property: "og:title", content: "Flow — Kanban board with AI assistant" },
      { property: "og:description", content: "Plan, drag and manage tasks with an AI assistant that can act on your board." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Board />,
});
