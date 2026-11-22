import { CASE_KEY, CaseSchema, type Case } from "./case.ts";

// Browser-local persistence. One versioned key; nothing leaves the browser.
// Storage is read lazily on the client so the server render never touches it.

export type StorageHealth = "ok" | "unavailable" | "corrupt" | "write-failed" | "clear-failed";
export type StoreSnapshot = { status: "loading" } | { status: "ready"; current: Case | null; storage: StorageHealth };

const LOADING: StoreSnapshot = { status: "loading" };
let snapshot: StoreSnapshot | null = null;
const listeners = new Set<() => void>();

function read(): StoreSnapshot {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(CASE_KEY);
  } catch {
    return { status: "ready", current: null, storage: "unavailable" };
  }
  if (raw === null) return { status: "ready", current: null, storage: "ok" };
  try {
    const parsed = CaseSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return { status: "ready", current: parsed.data, storage: "ok" };
  } catch { /* fall through: unreadable JSON is reported as corrupt below */ }
  return { status: "ready", current: null, storage: "corrupt" };
}

function emit() {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab changed the case: reload rather than silently overwrite it later.
  const onStorage = (event: StorageEvent) => {
    if (event.key === CASE_KEY || event.key === null) { snapshot = read(); emit(); }
  };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); window.removeEventListener("storage", onStorage); };
}

export function getSnapshot(): StoreSnapshot {
  snapshot ??= read();
  return snapshot;
}

export function getServerSnapshot(): StoreSnapshot {
  return LOADING;
}

/** Writes the case; on failure the change is kept for this tab and the failure is reported. */
export function saveCase(next: Case | null) {
  let storage: StorageHealth = "ok";
  try {
    if (next) window.localStorage.setItem(CASE_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(CASE_KEY);
  } catch {
    storage = next ? "write-failed" : "clear-failed";
  }
  snapshot = { status: "ready", current: next, storage };
  emit();
}
