import type { ModuleStatus } from "@/lib/sim/modules";

const LABELS: Record<ModuleStatus, string> = {
  planned: "Planned",
  "in-development": "In development",
  available: "Available",
};

const STYLES: Record<ModuleStatus, string> = {
  planned:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  "in-development":
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  available:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
};

export function StatusBadge({ status }: { status: ModuleStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
