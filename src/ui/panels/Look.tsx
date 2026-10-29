// Wygląd bohatera: stroje (kolory i płaszcz) i ramki awatara. Wyłącznie ozdoby.
import { FRAMES, FRAME_IDS, SKINS, SKIN_IDS } from '../../data';
import { heroUrl } from '../../art/render';
import type { Game } from '../../engine/game';
import { Avatar } from '../Avatar';

export function LookView({ game, close }: { game: Game; close: () => void }) {
  const l = game.s.look;
  return (
    <>
      <div class="row">
        <div><div class="eyebrow">Wygląd</div><div class="h">Stroje i ramki</div></div>
        <Avatar skin={l.skin} frame={l.frame} size={48} />
      </div>
      <p class="sub">Tylko ozdoby — nie zmieniają statystyk. Strój to kolory bohatera i płaszcz (spod ekwipunku widać głównie płaszcz). Strój i ramkę widzą inni gracze na arenie i w rankingach.</p>
      <div class="eyebrow" style={{ marginTop: '6px' }}>Stroje ({l.skins.length}/{SKIN_IDS.length})</div>
      <ul class="lookgrid">
        {SKIN_IDS.map(id => {
          const have = l.skins.includes(id);
          const on = l.skin === id;
          return (
            <li key={id} class={`${have ? '' : 'lock'}${on ? ' on' : ''}`}>
              <button disabled={!have || on} onClick={() => game.setSkin(id)} aria-pressed={on}>
                <img class="lk-hero" src={heroUrl({}, id)} alt="" draggable={false} />
                <b>{SKINS[id].n}</b>
                <small>{on ? 'założony' : have ? 'załóż' : SKINS[id].src}</small>
              </button>
            </li>
          );
        })}
      </ul>
      <div class="eyebrow" style={{ marginTop: '6px' }}>Ramki ({l.frames.length}/{FRAME_IDS.length})</div>
      <ul class="lookgrid frames">
        {FRAME_IDS.map(id => {
          const have = l.frames.includes(id);
          const on = l.frame === id;
          return (
            <li key={id} class={`${have ? '' : 'lock'}${on ? ' on' : ''}`}>
              <button disabled={!have || on} onClick={() => game.setFrame(id)} aria-pressed={on}>
                <Avatar skin={l.skin} frame={id} size={44} />
                <b>{FRAMES[id].n}</b>
                <small>{on ? 'wybrana' : have ? 'wybierz' : FRAMES[id].src}</small>
              </button>
            </li>
          );
        })}
      </ul>
      <button class="btn" onClick={close}>Zamknij</button>
    </>
  );
}
