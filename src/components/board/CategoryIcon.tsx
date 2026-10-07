import {
  Briefcase,
  Code2,
  Euro,
  Gift,
  GraduationCap,
  Megaphone,
  NotebookText,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

const MAP: [RegExp, LucideIcon][] = [
  [/meet|team|call/i, Users],
  [/learn|course|study/i, GraduationCap],
  [/personal|gift|home/i, Gift],
  [/financ|money|budget|pay/i, Euro],
  [/market|ad|social/i, Megaphone],
  [/dev|code|tech|bug/i, Code2],
  [/ops|admin|setup/i, Wrench],
  [/work|client/i, Briefcase],
];

export function CategoryIcon({ tag, className }: { tag?: string; className?: string }) {
  const Icon = (tag && MAP.find(([re]) => re.test(tag))?.[1]) || NotebookText;
  return <Icon className={className} strokeWidth={2.2} />;
}
