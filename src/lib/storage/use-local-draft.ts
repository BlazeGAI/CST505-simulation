"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readDraft, writeDraft, clearDraft } from "./local-draft-store";

export type DraftStatus = "idle" | "saved";

/**
 * Client-side hook that keeps a piece of state mirrored to localStorage
 * under `key`, debounced so rapid keystrokes don't thrash storage. Reads
 * the existing draft (if any) on mount, after hydration, so the server-
 * rendered markup and the first client render match.
 */
export function useLocalDraft<T>(key: string, initialValue: T, debounceMs = 400) {
  const [value, setValue] = useState<T>(initialValue);
  const [status, setStatus] = useState<DraftStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hydratedRef = useRef(false);

  useEffect(() => {
    const existing = readDraft<T>(key);
    if (existing !== undefined) {
      // One-time hydration from localStorage after mount: the server has no
      // access to this browser's storage, so the first render always uses
      // `initialValue` and this effect reconciles it with what's actually
      // stored, avoiding a server/client markup mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(existing);
    }
    hydratedRef.current = true;
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [key]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      writeDraft(key, value);
      setStatus("saved");
      setLastSavedAt(new Date().toISOString());
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [key, value, debounceMs]);

  const clear = useCallback(() => {
    clearDraft(key);
    setValue(initialValue);
    setStatus("idle");
    setLastSavedAt(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { value, setValue, status, lastSavedAt, clear };
}
