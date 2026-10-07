import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Task = Tables<"tasks">;
export type Status = "todo" | "in_progress" | "done";

export const COLUMNS: { id: Status; label: string; dot: string }[] = [
  { id: "todo", label: "To Do", dot: "bg-navy" },
  { id: "in_progress", label: "In Progress", dot: "bg-plum" },
  { id: "done", label: "Complete", dot: "bg-forest" },
];

const TINTS = ["rust", "navy", "plum", "forest", "teal", "violet"] as const;
export type Tint = (typeof TINTS)[number] | "slate";

export const TINT_CLASSES: Record<Tint, { bg: string; icon: string; text: string }> = {
  rust: { bg: "bg-rust-bg", icon: "bg-rust", text: "text-rust" },
  navy: { bg: "bg-navy-bg", icon: "bg-navy", text: "text-navy" },
  plum: { bg: "bg-plum-bg", icon: "bg-plum", text: "text-plum" },
  forest: { bg: "bg-forest-bg", icon: "bg-forest", text: "text-forest" },
  teal: { bg: "bg-teal-bg", icon: "bg-teal", text: "text-teal" },
  violet: { bg: "bg-violet-bg", icon: "bg-violet", text: "text-violet" },
  slate: { bg: "bg-slate-bg", icon: "bg-slate", text: "text-slate" },
};

export function tintFor(tag?: string): Tint {
  if (!tag) return "slate";
  let h = 0;
  for (const c of tag.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length] ?? "slate";
}

export function formatEstimate(min?: number | null) {
  if (!min) return null;
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatDue(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return { date, time };
}

export function timeLeft(iso?: string | null) {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  const label =
    mins < 60 ? `${mins}m` : mins < 60 * 48 ? `${Math.round(mins / 60)}h` : `${Math.round(mins / 1440)}d`;
  return { overdue: diff < 0, soon: diff >= 0 && diff < 1000 * 60 * 60 * 24, label };
}

export const tasksQueryKey = ["tasks"] as const;

export async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await supabase.from("tasks").select("*").order("position");
  if (error) throw error;
  return data ?? [];
}
