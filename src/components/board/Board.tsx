import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { AnimatePresence, motion } from "motion/react";
import { Bot, LayoutGrid, LogOut, Plus, Search, Sparkle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { COLUMNS, TINT_CLASSES, fetchTasks, tasksQueryKey, tintFor, type Status, type Task } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { SortableTaskCard, TaskCardView } from "./TaskCard";
import { TaskDialog, type TaskDraft } from "./TaskDialog";
import { CategoryIcon } from "./CategoryIcon";
import { ChatPanel } from "./ChatPanel";

function UserMenu() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return data ?? { id: u.user.id, display_name: u.user.email ?? "You", avatar_url: null, created_at: "" };
    },
  });

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { redirect: undefined }, replace: true });
  };

  const name = profile?.display_name || "You";
  return (
    <div className="flex items-center gap-2">
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt={name} className="h-9 w-9 rounded-xl object-cover ring-1 ring-border" />
      ) : (
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-sm font-bold ring-1 ring-border">
          {name.slice(0, 1).toUpperCase()}
        </div>
      )}
      <button
        onClick={signOut}
        title="Sign out"
        className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground ring-1 ring-border transition hover:bg-accent hover:text-foreground"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}

type Columns = Record<Status, string[]>;

function group(tasks: Task[]): Columns {
  const c: Columns = { todo: [], in_progress: [], done: [] };
  [...tasks].sort((a, b) => a.position - b.position).forEach((t) => c[t.status as Status]?.push(t.id));
  return c;
}

function Column({
  id,
  label,
  dot,
  ids,
  byId,
  onOpen,
  onAdd,
}: {
  id: Status;
  label: string;
  dot: string;
  ids: string[];
  byId: Map<string, Task>;
  onOpen: (t: Task) => void;
  onAdd: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const hours = ids.reduce((s, i) => s + (byId.get(i)?.estimate_minutes ?? 0), 0) / 60;
  return (
    <section className="flex min-h-0 w-[340px] shrink-0 flex-col">
      <header className="mb-4 flex items-center gap-3 px-1">
        <span className={cn("h-2.5 w-2.5 rounded-full shadow-[0_0_12px] shadow-current", dot)} />
        <h2 className="text-base font-semibold tracking-tight">{label}</h2>
        <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{ids.length}</span>
        {hours > 0 && <span className="ml-auto text-xs text-muted-foreground">{hours.toFixed(1)}h</span>}
      </header>
      <div
        ref={setNodeRef}
        className={cn(
          "scrollbar-thin flex min-h-[120px] flex-1 flex-col gap-3 overflow-y-auto rounded-3xl p-2 transition-colors",
          isOver && "bg-foreground/[0.03]",
        )}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {ids.map((tid) => {
            const t = byId.get(tid);
            return t ? <SortableTaskCard key={tid} task={t} onOpen={() => onOpen(t)} /> : null;
          })}
        </SortableContext>
        <button
          onClick={onAdd}
          className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-foreground/10 py-3.5 text-sm text-muted-foreground transition hover:border-foreground/25 hover:bg-foreground/[0.03] hover:text-foreground"
        >
          <Plus className="h-4 w-4" /> Add task
        </button>
      </div>
    </section>
  );
}

export function Board({ threadId }: { threadId?: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: tasksQueryKey, queryFn: fetchTasks });
  const tasks = useMemo(() => data ?? [], [data]);
  const [cols, setCols] = useState<Columns>(() => group([]));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ open: boolean; task: Task | null; status: Status }>({
    open: false,
    task: null,
    status: "todo",
  });

  useEffect(() => {
    if (!activeId) setCols(group(tasks));
  }, [tasks, activeId]);

  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const allTags = useMemo(() => {
    const m = new Map<string, number>();
    tasks.forEach((t) => t.tags.forEach((g) => m.set(g, (m.get(g) ?? 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [tasks]);

  const visible = (ids: string[]) =>
    ids.filter((id) => {
      const t = byId.get(id);
      if (!t) return false;
      if (tagFilter && !t.tags.includes(tagFilter)) return false;
      const q = search.trim().toLowerCase();
      return !q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const findCol = (id: string): Status | undefined =>
    (COLUMNS.find((c) => c.id === id)?.id as Status) ?? (Object.keys(cols) as Status[]).find((k) => cols[k].includes(id));

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const from = findCol(String(active.id));
    const to = findCol(String(over.id));
    if (!from || !to || from === to) return;
    setCols((prev) => {
      const fromIds = prev[from].filter((i) => i !== active.id);
      const toIds = [...prev[to]];
      const idx = toIds.indexOf(String(over.id));
      toIds.splice(idx >= 0 ? idx : toIds.length, 0, String(active.id));
      return { ...prev, [from]: fromIds, [to]: toIds };
    });
  };
  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    const aid = String(active.id);
    let next = cols;
    if (over) {
      const col = findCol(aid);
      if (col) {
        const oldI = cols[col].indexOf(aid);
        const newI = cols[col].indexOf(String(over.id));
        if (newI >= 0 && oldI !== newI) next = { ...cols, [col]: arrayMove(cols[col], oldI, newI) };
      }
    }
    setCols(next);
    setActiveId(null);
    const updates: { id: string; status: Status; position: number }[] = [];
    (Object.keys(next) as Status[]).forEach((s) =>
      next[s].forEach((id, i) => {
        const t = byId.get(id);
        if (t && (t.status !== s || t.position !== i + 1)) updates.push({ id, status: s, position: i + 1 });
      }),
    );
    if (!updates.length) return;
    qc.setQueryData<Task[]>(tasksQueryKey, (old = []) =>
      old.map((t) => {
        const u = updates.find((x) => x.id === t.id);
        return u ? { ...t, status: u.status, position: u.position } : t;
      }),
    );
    await Promise.all(
      updates.map((u) => supabase.from("tasks").update({ status: u.status, position: u.position }).eq("id", u.id)),
    );
    qc.invalidateQueries({ queryKey: tasksQueryKey });
  };

  const save = async (d: TaskDraft) => {
    if (dialog.task) {
      await supabase.from("tasks").update({ ...d, updated_at: new Date().toISOString() }).eq("id", dialog.task.id);
    } else {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const pos = Math.max(0, ...tasks.filter((t) => t.status === d.status).map((t) => t.position)) + 1;
      await supabase.from("tasks").insert({ ...d, position: pos, user_id: u.user.id });
    }
    setDialog((x) => ({ ...x, open: false }));
    qc.invalidateQueries({ queryKey: tasksQueryKey });
  };
  const remove = async () => {
    if (!dialog.task) return;
    await supabase.from("tasks").delete().eq("id", dialog.task.id);
    setDialog((x) => ({ ...x, open: false }));
    qc.invalidateQueries({ queryKey: tasksQueryKey });
  };

  const openChat = async () => {
    const { data } = await supabase.from("chat_threads").select("id").order("updated_at", { ascending: false }).limit(1);
    let id = data?.[0]?.id;
    if (!id) {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: created } = await supabase.from("chat_threads").insert({ user_id: u.user.id }).select("id").single();
      id = created?.id;
    }
    if (id) navigate({ to: "/chat/$threadId", params: { threadId: id } });
  };

  const activeTask = activeId ? byId.get(activeId) : null;
  const done = cols.done.length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <div className="flex h-screen overflow-hidden bg-rail p-2 sm:p-3">
      {/* Rail */}
      <aside className="hidden w-[88px] shrink-0 flex-col items-center gap-6 py-5 md:flex">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_0_30px_-4px] shadow-primary/60">
          <LayoutGrid className="h-5 w-5" />
        </div>
        <div className="h-px w-12 bg-border" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Tags</p>
        <div className="scrollbar-thin flex flex-1 flex-col items-center gap-3 overflow-y-auto">
          {allTags.slice(0, 8).map(([tag, n]) => {
            const tc = TINT_CLASSES[tintFor(tag)];
            const active = tagFilter === tag;
            return (
              <button
                key={tag}
                title={tag}
                onClick={() => setTagFilter(active ? null : tag)}
                className={cn(
                  "relative grid h-11 w-11 place-items-center rounded-full text-background transition hover:scale-110",
                  tc.icon,
                  active ? "ring-2 ring-foreground ring-offset-2 ring-offset-rail" : "opacity-85",
                )}
              >
                <CategoryIcon tag={tag} className="h-5 w-5" />
                <span className="absolute -bottom-1 -right-1 rounded-md bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {n}
                </span>
              </button>
            );
          })}
        </div>
        <button
          onClick={openChat}
          title="Ask Flow AI"
          className="grid h-14 w-14 place-items-center rounded-2xl bg-card text-primary ring-1 ring-border transition hover:bg-accent"
        >
          <Bot className="h-6 w-6" />
        </button>
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[28px] bg-canvas ring-1 ring-border">
        <header className="flex flex-wrap items-center gap-4 border-b border-border px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Flow board</h1>
            <p className="text-sm text-muted-foreground">
              {tasks.length} tasks · <span className="text-success">{pct}% complete</span>
            </p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-3">
            {tagFilter && (
              <button
                onClick={() => setTagFilter(null)}
                className="rounded-xl bg-accent px-3 py-2 text-sm text-foreground/80 hover:bg-secondary"
              >
                #{tagFilter} ✕
              </button>
            )}
            <label className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 ring-1 ring-border focus-within:ring-primary/60">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks"
                className="w-40 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </label>
            <button
              onClick={() => setDialog({ open: true, task: null, status: "todo" })}
              className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> New task
            </button>
            <button
              onClick={openChat}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_24px_-6px] shadow-primary transition hover:brightness-110"
            >
              <Sparkle className="h-4 w-4" /> Ask AI
            </button>
            <UserMenu />
          </div>
        </header>

        <div className="scrollbar-thin flex min-h-0 flex-1 gap-6 overflow-x-auto px-6 py-6">
          {isLoading ? (
            <p className="text-muted-foreground">Loading board…</p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}
              onDragCancel={() => setActiveId(null)}
            >
              {COLUMNS.map((c) => (
                <Column
                  key={c.id}
                  {...c}
                  ids={visible(cols[c.id])}
                  byId={byId}
                  onOpen={(t) => setDialog({ open: true, task: t, status: t.status as Status })}
                  onAdd={() => setDialog({ open: true, task: null, status: c.id })}
                />
              ))}
              <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(.2,.8,.2,1)" }}>
                {activeTask ? <TaskCardView task={activeTask} dragging /> : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </main>

      <AnimatePresence>
        {threadId && (
          <motion.div
            key="chat"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed inset-2 z-40 sm:inset-auto sm:bottom-3 sm:right-3 sm:top-3 sm:w-[420px] lg:static lg:ml-3 lg:w-[420px] lg:shrink-0"
          >
            <ChatPanel threadId={threadId} />
          </motion.div>
        )}
      </AnimatePresence>

      <TaskDialog
        open={dialog.open}
        task={dialog.task}
        defaultStatus={dialog.status}
        onClose={() => setDialog((x) => ({ ...x, open: false }))}
        onSave={save}
        onDelete={remove}
      />
    </div>
  );
}
