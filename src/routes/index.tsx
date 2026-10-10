import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LayoutGrid, Sparkle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/board", replace: true });
    });
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-rail px-6 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-3xl bg-primary text-primary-foreground shadow-[0_0_50px_-8px] shadow-primary/70">
        <LayoutGrid className="h-8 w-8" />
      </div>
      <h1 className="mt-8 text-4xl font-bold tracking-tight sm:text-5xl">Flow</h1>
      <p className="mt-4 max-w-md text-base text-muted-foreground">
        A beautiful Kanban board with a built-in AI assistant that plans, organizes and updates your tasks for you.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_0_24px_-6px] shadow-primary transition hover:brightness-110"
        >
          <Sparkle className="h-4 w-4" /> Sign in to your board
        </Link>
      </div>
    </div>
  );
}
