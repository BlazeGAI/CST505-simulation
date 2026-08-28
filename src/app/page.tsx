import Link from "next/link";
import { MODULES } from "@/lib/sim/modules";
import { StatusBadge } from "@/components/status-badge";

const HIGHLIGHTS = [
  { label: "Deterministic", detail: "Every run is seeded, so results are exactly reproducible." },
  { label: "Runs in your browser", detail: "No server, no accounts, no install." },
  { label: "Six investigations", detail: "One per week, aligned to the revised course activities." },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <section className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-indigo-700 dark:text-indigo-400">
          CST505 &middot; Advanced Operating Systems Theory
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
          Simulation Suite
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
          Six deterministic, browser-based simulations for HarborLink, the course&apos;s fictional
          resource-constrained edge platform. Each investigation connects textbook theory with a
          live or instructor-supplied observation when the activity requires one, then uses a
          controlled simulation for repeatable comparison. Keep direct observation, simulated
          evidence, theoretical interpretation, assumptions, and production limitations clearly
          separated in the Simulation Evidence Record and exported evidence package.
        </p>

        <dl className="mt-8 grid gap-4 sm:grid-cols-3">
          {HIGHLIGHTS.map((item) => (
            <div key={item.label} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <dt className="text-sm font-semibold text-slate-900 dark:text-white">{item.label}</dt>
              <dd className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.detail}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-14" aria-labelledby="modules-heading">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="modules-heading" className="text-xl font-semibold tracking-tight">
            Simulation modules
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Weeks 1&ndash;6</p>
        </div>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {MODULES.map((module, index) => (
            <li key={module.slug}>
              <Link
                href={`/modules/${module.slug}`}
                className="group flex h-full flex-col rounded-xl border border-slate-200 p-5 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:hover:border-indigo-500"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400"
                  >
                    {index + 1}
                  </span>
                  <StatusBadge status={module.status} />
                </div>
                <h3 className="mt-3 font-semibold text-slate-900 group-hover:text-indigo-700 dark:text-white dark:group-hover:text-indigo-400">
                  {module.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {module.summary}
                </p>
                <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {module.weekLabel} &middot; {module.activityLabel} &middot; {module.clo.join(", ")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14 max-w-3xl rounded-lg border border-slate-200 p-5 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
        These are controlled instructional models, not live operating-system, container, or
        virtual-machine environments. Complete any assigned live-system or instructor-provided
        observation separately, redact identifying details, and do not treat either evidence source
        as a universal production guarantee. Drafts stay only in this browser until you export them.
      </section>
    </div>
  );
}
