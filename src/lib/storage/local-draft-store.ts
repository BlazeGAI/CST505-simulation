/**
 * Local-only draft persistence. There is no account system and no backend:
 * every scenario configuration and evidence record a student edits is
 * saved to the browser's localStorage and never leaves the device unless
 * the student explicitly exports it. See docs/architecture.md, questions
 * 3 and 5 (data model and privacy posture).
 */
const NAMESPACE = "cst505-sim";

export function draftKey(
  moduleId: string,
  scenarioId: string,
  kind: "config" | "evidence" | "runs",
): string {
  return `${NAMESPACE}:${kind}:${moduleId}:${scenarioId}`;
}

function hasLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readDraft<T>(key: string): T | undefined {
  if (!hasLocalStorage()) return undefined;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    // Corrupt or unparsable draft: treat as absent rather than throwing,
    // so a bad localStorage entry never blocks the app from loading.
    return undefined;
  }
}

export function writeDraft<T>(key: string, value: T): void {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota/availability errors (e.g. private browsing); the draft
    // simply won't persist across reloads in that session.
  }
}

export function clearDraft(key: string): void {
  if (!hasLocalStorage()) return;
  window.localStorage.removeItem(key);
}

export function listDraftKeys(prefix: string = NAMESPACE): string[] {
  if (!hasLocalStorage()) return [];
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith(prefix)) keys.push(k);
  }
  return keys;
}
