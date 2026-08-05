"use client";

import { useEffect, useState } from "react";
import { getCurrentTheme, setTheme, type Theme } from "@/lib/theme";

/**
 * The inline theme-init script (see src/app/layout.tsx) sets the real
 * `.dark` class before this component ever mounts, so its initial render
 * can't know which theme is active without risking a server/client
 * mismatch. Render a neutral placeholder until mounted, then read the
 * class the init script already applied.
 */
export function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme | null>(null);

  useEffect(() => {
    // One-time hydration from the class the blocking init script already
    // set on <html> before this component ever mounted — not a state sync
    // loop, so a direct setState here is the correct, one-shot read.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(getCurrentTheme());
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeState(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === null ? "Toggle color theme" : theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:text-indigo-400 ${
        theme === null ? "opacity-0" : "opacity-100"
      }`}
    >
      {theme === "dark" ? (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <circle cx="12" cy="12" r="4" />
          <path
            strokeLinecap="round"
            d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
          />
        </svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path d="M20.742 13.045a8.088 8.088 0 0 1-2.077.273c-4.464 0-8.08-3.616-8.08-8.08 0-.712.093-1.403.267-2.06a.75.75 0 0 0-.947-.916A10.083 10.083 0 0 0 2.5 12.083C2.5 17.56 6.94 22 12.417 22a10.083 10.083 0 0 0 9.32-6.335.75.75 0 0 0-.995-.62Z" />
        </svg>
      )}
    </button>
  );
}
