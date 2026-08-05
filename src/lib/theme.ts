/**
 * Shared source of truth for the light/dark theme toggle. `THEME_STORAGE_KEY`
 * must match the literal string hardcoded inside `applyStoredTheme` below —
 * that function's source is inlined as a blocking <script> in the document
 * head (see src/app/layout.tsx), so it can't reference this module's export;
 * closures aren't preserved across `Function.prototype.toString()`.
 */
export const THEME_STORAGE_KEY = "cst505-theme";
export type Theme = "light" | "dark";

/**
 * Sets the `.dark` class on <html> before first paint, so there is no
 * flash of the wrong theme. Runs both as the inlined blocking script (via
 * its stringified source) and, verbatim, whenever the toggle button changes
 * the theme client-side.
 */
function applyStoredTheme() {
  try {
    const stored = localStorage.getItem("cst505-theme");
    const isDark = stored === "dark" || (stored !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
  } catch {
    // localStorage/matchMedia can throw in locked-down environments; default to light.
  }
}

/** Inlined verbatim as a blocking <script> in <head> — see THEME_STORAGE_KEY's note above. */
export const THEME_INIT_SCRIPT = `(${applyStoredTheme.toString()})();`;

export function getCurrentTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function setTheme(theme: Theme) {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
}
