import { describe, expect, it } from 'vitest';
import { buildSync } from 'esbuild';
import vm from 'node:vm';

// Nakama zamraża zmienne globalne modułu po starcie serwera. Pamięć podręczna uzupełniana dopiero w trakcie gry
// (np. tablica wygładzonego złota) rzucała wtedy „Cannot add property 1, object is not extensible” i psuła ataki
// na bossa klanowego i smoka. Ten test składa moduł serwera tak jak server/build.mjs, zamraża go jak Nakama
// i woła funkcje silnika, które liczą złoto i krainy.

const code = buildSync({
  entryPoints: ['server/src/main.ts'],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2017',
  write: false,
  logLevel: 'silent',
}).outputFiles[0].text;

function deepFreeze(o: unknown, seen = new Set<unknown>()) {
  if (o === null || (typeof o !== 'object' && typeof o !== 'function') || seen.has(o)) return;
  seen.add(o);
  for (const k of Object.getOwnPropertyNames(o)) {
    const d = Object.getOwnPropertyDescriptor(o, k);
    if (d && 'value' in d) deepFreeze(d.value, seen);
  }
  Object.freeze(o);
}

describe('serwer po zamrożeniu zmiennych globalnych (jak w Nakamie)', () => {
  const ctx = vm.createContext({});
  vm.runInContext(code, ctx);
  const builtins = new Set(Object.getOwnPropertyNames(vm.runInNewContext('globalThis')));
  for (const k of Object.getOwnPropertyNames(ctx)) if (!builtins.has(k)) deepFreeze((ctx as Record<string, unknown>)[k]);
  const g = ctx as Record<string, (...a: number[]) => unknown>;

  it('złoto z fali i wygładzone fale liczą się bez błędu', () => {
    expect(() => { for (let f = 1; f <= 200; f++) g.goldWavesSmooth(f); }).not.toThrow();
    expect(() => { for (let s = 0; s < 400; s += 7) g.goldWave(s); }).not.toThrow();
    expect(g.goldWave(120)).toBeGreaterThan(0);
  });

  it('krainy Otchłani i oczekiwany etap kuźni liczą się bez błędu', () => {
    expect(() => { for (let i = 0; i < 60; i++) g.landDef(i); }).not.toThrow();
    expect(() => { for (let f = 1; f <= 200; f += 3) g.gAtForge(f); }).not.toThrow();
  });
});
