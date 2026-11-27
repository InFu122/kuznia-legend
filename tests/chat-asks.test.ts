// Czat klanu: przycisk „Pomóż” tylko przy prośbach, przy których jeszcze można pomóc.
import { describe, expect, it } from 'vitest';
import type { ChatMsg } from '../src/save/chat';
import { openAsks } from '../src/ui/panels/Chat';
import { ORES } from '../src/data';

const SREBRO = ORES.findIndex(o => o.n === 'Srebro');

const ask = (id: string, t: string): ChatMsg => ({ id, ch: 'clan', uid: 'sys', n: '', t, k: 'ask', time: 0, mine: false });

describe('prośby w czacie klanu', () => {
  const msgs = [
    ask('a', 'Maczetix prosi o rudę: 15 × Mithril.'),
    ask('b', 'Maczetix prosi o pomoc: Kuźnia → poziom 16.'),
    ask('c', 'Sowa prosi o pomoc: Kuźnia → poziom 12.'),
    ask('d', 'Sowa prosi o pomoc w badaniu: Górnik.'),
    ask('e', 'Iskra prosi o rudę: 15 × Srebro.'),
    ask('f', 'Iskra prosi o rudę: 15 × Srebro.'),
    { ...ask('g', 'zwykła wiadomość'), k: 'msg' as const },
  ];

  it('spełnione, wygasłe i takie, w których już pomogłem, tracą przycisk; z powtórzonych zostaje najnowsza', () => {
    const open = openAsks(msgs, {
      helps: [
        { uid: '1', n: 'Maczetix', lvl: 16, k: 'f', got: 2, done: true }, // już pomogłem
        { uid: '2', n: 'Sowa', lvl: 12, k: 'f', got: 1, done: false },
        { uid: '2', n: 'Sowa', lvl: 0, k: 't', tn: 'Górnik', got: 0, done: false },
      ],
      ores: [{ id: 'o1', n: 'Iskra', ore: SREBRO, want: 15, got: 3 }], // Mithril Maczetixa już zebrany
    });
    expect([...open].sort()).toEqual(['c', 'd', 'f']);
    expect(open.has('a')).toBe(false);
    expect(open.has('b')).toBe(false);
    expect(open.has('e')).toBe(false); // starsza z dwóch takich samych
  });

  it('bez stanu klanu nic nie wiadomo — przyciski zostają', () => {
    expect(openAsks(msgs, null).size).toBe(6);
  });
});
