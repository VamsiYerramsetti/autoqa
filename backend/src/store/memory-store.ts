import { SessionRecord } from "../types";

const store = new Map<string, SessionRecord>();

export function saveSession(record: SessionRecord) { store.set(record.id, record); return record; }
export function getSession(id: string) { return store.get(id); }
export function updateSession(id: string, partial: Partial<SessionRecord>) {
  const existing = store.get(id);
  if (!existing) return null;
  const merged = { ...existing, ...partial };
  store.set(id, merged);
  return merged;
}
