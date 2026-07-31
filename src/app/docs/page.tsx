import Link from "next/link";

const REPO_URL = "https://github.com/BlazeGAI/CST505-simulation";

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Documentation</h1>
      <p className="mt-4 text-slate-700 dark:text-slate-300">
        The full architecture decision record &mdash; including the ten foundation architecture
        questions and answers, technology versions, and the module-by-module pull request plan
        &mdash; lives in the repository rather than in the deployed app, so it stays versioned
        alongside the code it describes.
      </p>
      <ul className="mt-6 space-y-3">
        <li className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <Link
            href={`${REPO_URL}/blob/main/docs/architecture.md`}
            className="font-medium text-indigo-700 underline dark:text-indigo-400"
          >
            docs/architecture.md
          </Link>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Stack and versions, the seeded simulation-engine contract, schema versioning, data
            model, testing strategy, and the ten architecture questions and answers.
          </p>
        </li>
        <li className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <Link
            href={`${REPO_URL}/blob/main/docs/roadmap.md`}
            className="font-medium text-indigo-700 underline dark:text-indigo-400"
          >
            docs/roadmap.md
          </Link>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            What ships in the foundation pull request versus each module&apos;s own follow-up pull
            request, and the acceptance checklist every module PR must satisfy.
          </p>
        </li>
        <li className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <Link
            href={`${REPO_URL}/blob/main/docs/accessibility.md`}
            className="font-medium text-indigo-700 underline dark:text-indigo-400"
          >
            docs/accessibility.md
          </Link>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            The accessibility approach every module commits to, and how it is checked
            automatically.
          </p>
        </li>
        <li className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <Link
            href={REPO_URL}
            className="font-medium text-indigo-700 underline dark:text-indigo-400"
          >
            Repository README
          </Link>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Local setup, available scripts, and project structure.
          </p>
        </li>
      </ul>
    </div>
  );
}
