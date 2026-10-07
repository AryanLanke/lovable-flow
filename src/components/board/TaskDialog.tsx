import { useEffect, useState } from "react";
import { Trash2, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { COLUMNS, type Status, type Task } from "@/lib/tasks";
import { cn } from "@/lib/utils";

export type TaskDraft = {
  title: string;
  description: string;
  status: Status;
  due_at: string | null;
  estimate_minutes: number | null;
  tags: string[];
};

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

export function TaskDialog({
  open,
  task,
  defaultStatus,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  task: Task | null;
  defaultStatus: Status;
  onClose: () => void;
  onSave: (draft: TaskDraft) => void;
  onDelete?: () => void;
}) {
  const [draft, setDraft] = useState<TaskDraft>({
    title: "",
    description: "",
    status: defaultStatus,
    due_at: null,
    estimate_minutes: null,
    tags: [],
  });
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (!open) return;
    setDraft(
      task
        ? {
            title: task.title,
            description: task.description,
            status: task.status as Status,
            due_at: task.due_at,
            estimate_minutes: task.estimate_minutes,
            tags: task.tags,
          }
        : { title: "", description: "", status: defaultStatus, due_at: null, estimate_minutes: null, tags: [] },
    );
    setTagInput("");
  }, [open, task, defaultStatus]);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !draft.tags.includes(t)) setDraft({ ...draft, tags: [...draft.tags, t] });
    setTagInput("");
  };

  const field = "w-full rounded-xl bg-secondary px-3.5 py-2.5 text-sm outline-none ring-1 ring-border focus:ring-primary/60";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg rounded-3xl border-border bg-popover p-6 [&>button]:hidden">
        <div className="flex items-center justify-between">
          <DialogTitle className="text-lg font-semibold">{task ? "Edit task" : "New task"}</DialogTitle>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form
          className="mt-2 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.title.trim()) onSave({ ...draft, title: draft.title.trim() });
          }}
        >
          <input
            autoFocus
            placeholder="Task title"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className={cn(field, "text-base font-medium")}
          />
          <textarea
            placeholder="Description"
            rows={3}
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            className={cn(field, "resize-none")}
          />
          <div className="flex gap-2">
            {COLUMNS.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => setDraft({ ...draft, status: c.id })}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm ring-1 ring-border transition",
                  draft.status === c.id ? "bg-accent ring-primary/60" : "bg-secondary text-muted-foreground hover:bg-accent",
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", c.dot)} />
                {c.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5 text-xs text-muted-foreground">
              Due date
              <input
                type="datetime-local"
                value={toLocalInput(draft.due_at)}
                onChange={(e) =>
                  setDraft({ ...draft, due_at: e.target.value ? new Date(e.target.value).toISOString() : null })
                }
                className={field}
              />
            </label>
            <label className="space-y-1.5 text-xs text-muted-foreground">
              Estimate (minutes)
              <input
                type="number"
                min={0}
                step={15}
                value={draft.estimate_minutes ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, estimate_minutes: e.target.value ? Number(e.target.value) : null })
                }
                className={field}
              />
            </label>
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {draft.tags.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setDraft({ ...draft, tags: draft.tags.filter((x) => x !== t) })}
                  className="inline-flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-sm hover:bg-destructive/30"
                >
                  {t} <X className="h-3 w-3" />
                </button>
              ))}
            </div>
            <input
              placeholder="Add category tag and press Enter"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag();
                }
              }}
              onBlur={addTag}
              className={field}
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            {task && onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-destructive hover:bg-destructive/15"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            ) : (
              <span />
            )}
            <button
              type="submit"
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
            >
              {task ? "Save changes" : "Create task"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
