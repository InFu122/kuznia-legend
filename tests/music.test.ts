// Muzyka: każdy utwór z playlist ma plik, a podział zgadza się z opisem (spokojne / dynamiczne / tylko boss).
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PLAYLISTS } from '../src/ui/music';

describe('muzyka', () => {
  it('każdy utwór z playlist ma plik w public/audio', () => {
    for (const t of new Set(Object.values(PLAYLISTS).flat())) expect(existsSync(`public/audio/m-${t}.mp3`), t).toBe(true);
  });
  it('chóry tylko przy bossach, spokojne tylko w krainach, dynamiczne wszędzie', () => {
    for (const t of ['gregorian-choir', 'religious-choir']) { expect(PLAYLISTS.boss).toContain(t); expect(PLAYLISTS.camp).not.toContain(t); expect(PLAYLISTS.dung).not.toContain(t); }
    for (const t of ['helpless-land', 'legend', 'medieval-kingdom']) { expect(PLAYLISTS.camp).toContain(t); expect(PLAYLISTS.boss).not.toContain(t); expect(PLAYLISTS.dung).not.toContain(t); }
    for (const t of ['celtic-wild', 'mystical-fantasy', 'celtic-fantasy', 'naughty-princess']) for (const m of ['camp', 'dung', 'boss'] as const) expect(PLAYLISTS[m]).toContain(t);
  });
});
