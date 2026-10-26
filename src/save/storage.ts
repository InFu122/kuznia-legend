// Zapis gry. Teraz: pamięć przeglądarki + (gdy gra działa jako artefakt claude.ai) prywatny zapis w chmurze artefaktu.
// W etapie 3 dojdzie tu zapis na serwerze Nakama — reszta gry nie musi o tym wiedzieć.
import { migrate } from '../engine/state';
import type { GameState } from '../engine/types';

const KEY = 'kuznia-legend-save-v1';

export function loadLocal(now: number): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? migrate(JSON.parse(raw), now) : null;
  } catch {
    return null;
  }
}

export function saveLocal(json: string): void {
  try { localStorage.setItem(KEY, json); } catch { /* prywatne okno lub zablokowana pamięć */ }
}

interface DocRef { get(): Promise<{ exists: boolean; data(): Record<string, unknown> | undefined }>; set(d: Record<string, unknown>): Promise<void> }
interface CloudSave { ref: DocRef; busy: boolean }

/** Łączy z prywatnym zapisem artefaktu. Zwraca null poza artefaktem lub bez zalogowanego gracza. */
export async function connectArtifactCloud(): Promise<{ cloud: CloudSave; remote: GameState | null } | null> {
  try {
    const use = window.claude?.use;
    if (!use) return null;
    const [db, user] = await Promise.all([use('db'), use('user')]);
    if (!db || !user) return null;
    const uid = await user.id();
    if (!uid) return null;
    const ref = db.doc(`data/users/${uid}/save`) as DocRef;
    const snap = await ref.get();
    let remote: GameState | null = null;
    if (snap.exists) {
      const d = snap.data();
      if (d && typeof d.json === 'string') remote = migrate(JSON.parse(d.json), Date.now());
    }
    return { cloud: { ref, busy: false }, remote };
  } catch {
    return null;
  }
}

export async function saveCloud(c: CloudSave, json: string): Promise<boolean> {
  if (c.busy) return true;
  c.busy = true;
  try {
    await c.ref.set({ json, v: 1 });
    return true;
  } catch (e) {
    return !(e && typeof e === 'object' && (e as { code?: string }).code === 'invalid_argument');
  } finally {
    c.busy = false;
  }
}
