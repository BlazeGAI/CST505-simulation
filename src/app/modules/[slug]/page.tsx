import Link from "next/link";
import { notFound } from "next/navigation";
import { MODULES, getModule } from "@/lib/sim/modules";
import { StatusBadge } from "@/components/status-badge";

export function generateStaticParams() {
  return MODULES.map((moduleSummary) => ({ slug: moduleSummary.slug }));
}

export default async function ModulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const moduleSummary = getModule(slug);
  if (!moduleSummary) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        <Link href="/" className="underline hover:text-indigo-700 dark:hover:text-indigo-400">
          Simulation modules
        </Link>{" "}
        / {moduleSummary.weekLabel}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{moduleSummary.title}</h1>
        <StatusBadge status={moduleSummary.status} />
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {moduleSummary.clo.join(", ")}
      </p>

      <p className="mt-4 text-slate-700 dark:text-slate-300">{moduleSummary.summary}</p>

      <div className="mt-6 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
        This module&apos;s simulation, golden-seed tests, evidence outputs, keyboard workflow, and
        accessibility checks ship in a dedicated follow-up pull request, after the foundation
        described in <Link href="/docs" className="underline">the architecture documentation</Link>{" "}
        is approved. Until then, try the{" "}
        <Link href="/demo" className="underline">
          foundation engine demo
        </Link>{" "}
        to see how the simulation engine, Simulation Evidence Record, and export pipeline this
        module will use already work end to end.
      </div>

      <h2 className="mt-8 text-lg font-semibold">Learning goals</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700 dark:text-slate-300">
        {moduleSummary.learningGoals.map((goal) => (
          <li key={goal}>{goal}</li>
        ))}
      </ul>
    </div>
  );
}
