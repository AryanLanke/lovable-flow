import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarClock, ChevronRight, Hourglass, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { TINT_CLASSES, formatDue, formatEstimate, timeLeft, tintFor, type Task } from "@/lib/tasks";
import { CategoryIcon } from "./CategoryIcon";

export function TaskCardView({ task, dragging, onOpen }: { task: Task; dragging?: boolean; onOpen?: () => void }) {
  const tint = TINT_CLASSES[task.status === "done" ? "slate" : tintFor(task.tags[0])];
  const due = formatDue(task.due_at);
  const left = task.status !== "done" ? timeLeft(task.due_at) : null;
  const est = formatEstimate(task.estimate_minutes);

  return (
    <div
      onClick={onOpen}
      className={cn(
        "group relative cursor-grab overflow-hidden rounded-2xl p-4 text-left shadow-[0_8px_24px_-12px_oklch(0_0_0/0.8)] ring-1 ring-border transition-all duration-200 active:cursor-grabbing",
        tint.bg,
        dragging ? "rotate-2 scale-[1.03] shadow-2xl ring-primary/50" : "hover:-translate-y-0.5 hover:ring-foreground/15",
        task.status === "done" && "opacity-80",
      )}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-foreground/5 blur-2xl transition-opacity group-hover:opacity-100" />
      <div className="flex gap-3.5">
        <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl text-background", tint.icon)}>
          <CategoryIcon tag={task.tags[0]} className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={cn("truncate text-[17px] font-semibold leading-tight", task.status === "done" && "line-through decoration-foreground/40")}>
            {task.title}
          </h3>
          {due ? (
            <p className="mt-1 flex items-center gap-1 text-sm text-foreground/60">
              <CalendarClock className="h-3.5 w-3.5" />
              {due.date}
              <ChevronRight className="h-3.5 w-3.5" />
              {due.time}
            </p>
          ) : (
            <p className="mt-1 text-sm text-foreground/40">No due date</p>
          )}
        </div>
      </div>
      {task.description && <p className="mt-3 line-clamp-2 text-sm text-foreground/55">{task.description}</p>}

      {(est || task.tags.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {est && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-pill px-2.5 py-1.5 text-sm">
              <Hourglass className={cn("h-3.5 w-3.5", tint.text)} />
              {est}
            </span>
          )}
          {task.tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5 rounded-lg bg-pill px-2.5 py-1.5 text-sm">
              <Tag className={cn("h-3.5 w-3.5", TINT_CLASSES[tintFor(t)].text)} />
              {t}
            </span>
          ))}
        </div>
      )}

      {left && (left.overdue || left.soon) && (
        <div className={cn("mt-3 flex items-center gap-2 text-xs font-semibold", left.overdue ? "text-destructive" : "text-success")}>
          <span className={cn("h-px flex-1", left.overdue ? "bg-destructive/60" : "bg-success/60")} />
          {left.overdue ? `Overdue ${left.label}` : `Left ${left.label}`}
        </div>
      )}
    </div>
  );
}

export function SortableTaskCard({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { status: task.status },
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "opacity-30")}
      {...attributes}
      {...listeners}
    >
      <TaskCardView task={task} onOpen={onOpen} />
    </div>
  );
}
