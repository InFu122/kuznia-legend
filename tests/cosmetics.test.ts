import { describe, expect, it } from 'vitest';
import { EVENT, EVENT_MILESTONES, EVENTS, PASS_LEVELS, SKIN_IDS } from '../src/data';
import { heroKey, heroPixels, avatarPixels } from '../src/art/actors';
import { cleanReward } from '../src/engine/clan';
import { unlockLook } from '../src/engine/cosmetics';
import { milestoneReward } from '../src/engine/events';
import { grant } from '../src/engine/reward';
import { legacyReset } from '../src/engine/legacy';
import { passItemsReward } from '../src/engine/shop';
import { migrate, newState } from '../src/engine/state';
import { T0, makeGame } from './helpers';

describe('wygląd: stroje i ramki', () => {
  it('nowa gra: strój kowala i prosta ramka', () => {
    const s = newState(T0);
    expect(s.look).toEqual({ skin: 'zwykly', frame: 'prosta', skins: ['zwykly'], frames: ['prosta'] });
  });

  it('odblokowanie i wybór; nieznane i zablokowane odrzucone', () => {
    const { g, s } = makeGame();
    expect(g.setSkin('szkarlat')).toBe(false);
    expect(unlockLook(s, ['szkarlat', 'nieznany', 'szkarlat'], ['iskra'])).toBe(true);
    expect(s.look.skins).toEqual(['zwykly', 'szkarlat']);
    expect(unlockLook(s, ['szkarlat'], [])).toBe(false);
    expect(g.setSkin('szkarlat')).toBe(true);
    expect(g.setFrame('iskra')).toBe(true);
    expect(s.look.skin).toBe('szkarlat');
    expect(s.look.frame).toBe('iskra');
  });

  it('nagrody: przepustka, wydarzenie, Dziedzictwo, serwer', () => {
    const { ctx, s } = makeGame();
    const r30 = passItemsReward(PASS_LEVELS[29].prem, s);
    expect(r30.skins).toEqual(['szkarlat']);
    expect(passItemsReward(PASS_LEVELS[9].prem, s).frames).toEqual(['przepustka']);
    expect(passItemsReward(PASS_LEVELS[19].free, s).skins).toEqual(['nocny']);
    const last = milestoneReward(0, EVENT_MILESTONES.length - 1, s);
    expect(last.skins).toEqual([EVENTS.kuznia.skin]);
    expect(last.frames).toEqual([EVENTS.kuznia.frame]);
    expect(milestoneReward(0, 0, s).skins).toBeUndefined();
    grant(ctx, last);
    expect(s.look.skins).toContain('ognisty');
    expect(s.look.frames).toContain('iskra');
    s.forge.lvl = 30;
    const n = legacyReset(s, null, T0);
    expect(n.look.skins).toContain('zloty');
    expect(n.look.skin).toBe(s.look.skin);
    const c = cleanReward({ skins: ['mistrz', 'zly' as never], frames: ['diament', 'x' as never] });
    expect(c.skins).toEqual(['mistrz']);
    expect(c.frames).toEqual(['diament']);
    expect(EVENT.FLOORS).toBe(10);
  });

  it('migracja: śmieci w wyglądzie naprawione', () => {
    const m = migrate({ v: 13, look: { skin: 'mistrz', frame: 'zly', skins: ['lowca', 7, 'zly'], frames: 'x' } }, T0);
    expect(m.look.skins).toEqual(['zwykly', 'lowca']);
    expect(m.look.skin).toBe('zwykly');
    expect(m.look.frame).toBe('prosta');
    expect(migrate({ v: 13, look: { skin: 'lowca', frame: 'prosta', skins: ['lowca'], frames: [] } }, T0).look.skin).toBe('lowca');
  });

  it('każdy strój rysuje innego bohatera i awatar', () => {
    const keys = new Set(SKIN_IDS.map(k => heroKey({}, k)));
    expect(keys.size).toBe(SKIN_IDS.length);
    const sig = (a: Uint8ClampedArray) => Array.from(a).join(',');
    expect(new Set(SKIN_IDS.map(k => sig(heroPixels({}, k)))).size).toBe(SKIN_IDS.length);
    expect(avatarPixels('zwykly').length).toBe(18 * 18 * 4);
  });
});
