// Awatar gracza: głowa bohatera w stroju w ramce (ramki i stroje: src/data/cosmetics.ts).
import { FRAMES } from '../data';
import { avatarUrl } from '../art/render';
import { frameOr, skinOr } from '../engine/cosmetics';

export function Avatar({ skin, frame, size = 36 }: { skin?: string; frame?: string; size?: number }) {
  const F = FRAMES[frameOr(frame)];
  return (
    <span class={`avatar${F.glow ? ' glow' : ''}`} style={{ '--f1': F.c1, '--f2': F.c2, '--fg': F.glow ?? 'transparent', '--sz': size + 'px' } as Record<string, string>} aria-hidden="true">
      <img src={avatarUrl(skinOr(skin))} alt="" draggable={false} />
    </span>
  );
}
