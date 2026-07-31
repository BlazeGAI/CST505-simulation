import Link from "next/link";
import { MODULES } from "@/lib/sim/modules";
import { StatusBadge } from "@/components/status-badge";

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <section>
        <p className="text-sm font-medium uppercase tracking-wide text-indigo-700 dark:text-indigo-400">
          CST505 &middot; Advanced Operating Systems Theory
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          CST505 Simulation Suite
        </h1>
        <p className="mt-4 max-w-3xl text-slate-600 dark:text-slate-300">
          Six deterministic, browser-based simulation modules for HarborLink, the course&apos;s
          fictional resource-constrained edge platform. Every module follows the same cycle:
          predict, configure a controlled scenario, run and compare deterministic simulations,
          inspect accessible traces and metrics, complete a Simulation Evidence Record, and
          export the result as JSON, CSV, or a print-ready report.
        </p>
        <p className="mt-4 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
          These are instructional models, not live operating-system, container, or virtual-machine
          environments. No accounts, no server-side database, and no student data collection: your
          drafts are saved only in this browser until you export them.
        </p>
      </section>

      <section className="mt-10" aria-labelledby="modules-heading">
        <h2 id="modules-heading" className="text-xl font-semibold">
          Simulation modules
        </h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {MODULES.map((module) => (
            <li key={module.slug}>
              <Link
                href={`/modules/${module.slug}`}
                className="block h-full rounded-lg border border-slate-200 p-4 transition hover:border-indigo-400 hover:shadow-sm dark:border-slate-800 dark:hover:border-indigo-500"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {module.weekLabel}
                  </span>
                  <StatusBadge status={module.status} />
                </div>
                <h3 className="mt-1 font-semibold">{module.title}</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{module.summary}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 rounded-lg border border-dashed border-slate-300 p-4 dark:border-slate-700">
        <h2 className="font-semibold">Foundation engine demo</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          The six modules above ship in their own pull requests. In the meantime, the{" "}
          <Link href="/demo" className="text-indigo-700 underline dark:text-indigo-400">
            foundation demo
          </Link>{" "}
          exercises the shared simulation engine, Simulation Evidence Record, local draft storage,
          and JSON/CSV/print export pipeline that every module will build on. See{" "}
          <Link href="/docs" className="text-indigo-700 underline dark:text-indigo-400">
            the architecture documentation
          </Link>{" "}
          for details and the module roadmap.
        </p>
      </section>
    </div>
  );
}
