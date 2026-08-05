import Link from "next/link";
import { MODULES } from "@/lib/sim/modules";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  return (
    <header className="print:hidden sticky top-0 z-10 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-4">
        <Link href="/" className="flex items-baseline gap-2 rounded">
          <span className="text-lg font-semibold tracking-tight">CST505</span>
          <span className="text-sm text-slate-500 dark:text-slate-400">Simulation Suite</span>
        </Link>
        <nav aria-label="Modules" className="ml-auto">
          <ul className="flex flex-wrap gap-1.5">
            {MODULES.map((module) => (
              <li key={module.slug}>
                <Link
                  href={`/modules/${module.slug}`}
                  title={module.title}
                  aria-label={`${module.weekLabel}: ${module.title}`}
                  className="inline-flex h-8 items-center rounded-full border border-slate-200 px-3 text-xs font-medium text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
                >
                  {module.weekLabel.replace("Week ", "W")}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
