import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutGrid } from "lucide-react";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search["redirect"] === "string" ? search["redirect"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Flow" },
      { name: "description", content: "Sign in to your Flow Kanban board." },
      { property: "og:title", content: "Sign in — Flow" },
      { property: "og:description", content: "Sign in to your Flow Kanban board." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: safeTarget(redirectTo), replace: true });
    });
  }, [navigate, redirectTo]);

  const signIn = async () => {
    setBusy(true);
    setError(null);
    if (redirectTo) sessionStorage.setItem("flow.auth.redirect", redirectTo);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.redirected) return;
    if (result.error) {
      setError("Google sign-in didn't complete. Please try again.");
      setBusy(false);
      return;
    }
    const target = sessionStorage.getItem("flow.auth.redirect") ?? safeTarget(redirectTo);
    sessionStorage.removeItem("flow.auth.redirect");
    navigate({ to: safeTarget(target), replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-rail px-6">
      <div className="w-full max-w-sm rounded-[28px] bg-canvas p-8 text-center ring-1 ring-border">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_0_40px_-8px] shadow-primary/70">
          <LayoutGrid className="h-7 w-7" />
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight">Welcome to Flow</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to open your personal board.</p>
        <button
          onClick={signIn}
          disabled={busy}
          className="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-50"
        >
          <GoogleIcon />
          {busy ? "Opening Google…" : "Continue with Google"}
        </button>
        {error && <p className="mt-4 rounded-xl bg-destructive/15 px-3 py-2 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}

function safeTarget(path?: string | null): string {
  return path && path.startsWith("/") && !path.startsWith("//") ? path : "/board";
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"
      />
    </svg>
  );
}
