import Link from "next/link";
import { MODULES } from "@/lib/sim/modules";

const NAV_LINKS = [
  { href: "/", label: "Overview" },
  ...MODULES.map((m) => ({ href: `/modules/${m.slug}`, label: m.title })),
  { href: "/demo", label: "Foundation Demo" },
  { href: "/docs", label: "Docs" },
];

export function SiteHeader() {
  return (
    <header className="print:hidden border-b border-slate-200 dark:border-slate-800">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          CST505 Simulation Suite
        </Link>
        <nav aria-label="Primary" className="ml-auto">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="rounded px-1 py-0.5 text-slate-600 hover:text-indigo-700 hover:underline dark:text-slate-300 dark:hover:text-indigo-400"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
