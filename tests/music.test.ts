// Muzyka: każdy utwór z playlist ma plik, a podział zgadza się z opisem (spokojne / dynamiczne / tylko boss).
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PLAYLISTS, TRACKS, trackName } from '../src/ui/music';
import { makeGame } from './helpers';

describe('muzyka', () => {
  it('każdy utwór z playlist ma plik w public/audio', () => {
    for (const t of new Set(Object.values(PLAYLISTS).flat())) expect(existsSync(`public/audio/m-${t}.mp3`), t).toBe(true);
  });
  it('chóry tylko przy bossach, spokojne tylko w krainach, dynamiczne w lochach i u bossów (nie w krainach)', () => {
    for (const t of ['gregorian-choir', 'religious-choir']) { expect(PLAYLISTS.boss).toContain(t); expect(PLAYLISTS.camp).not.toContain(t); expect(PLAYLISTS.dung).not.toContain(t); }
    for (const t of ['helpless-land', 'legend', 'medieval-kingdom']) { expect(PLAYLISTS.camp).toContain(t); expect(PLAYLISTS.boss).not.toContain(t); expect(PLAYLISTS.dung).not.toContain(t); }
    for (const t of ['celtic-wild', 'mystical-fantasy', 'celtic-fantasy', 'naughty-princess']) {
      expect(PLAYLISTS.camp).not.toContain(t);
      for (const m of ['dung', 'boss'] as const) expect(PLAYLISTS[m]).toContain(t);
    }
  });
});

describe('wybór muzyki (nutka obok Mocy)', () => {
  it('każdy utwór z playlist jest na liście wyboru i ma polską nazwę', () => {
    expect(new Set(TRACKS.map(t => t.id))).toEqual(new Set(Object.values(PLAYLISTS).flat()));
    for (const t of TRACKS) expect(trackName(t.id)).not.toBe(t.id);
  });

  it('wybór utworu zapisuje się w ustawieniach i włącza muzykę; null wraca do automatycznej', () => {
    const { g, s } = makeGame();
    g.setMusic(false);
    g.setTrack('legend');
    expect(s.opts.track).toBe('legend');
    expect(s.opts.music).toBe(true);
    g.setTrack(null);
    expect(s.opts.track).toBeNull();
    expect(s.opts.music).toBe(true);
  });
});
