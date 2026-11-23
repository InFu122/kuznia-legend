import { B, ELEM, LEGEND, ORES, QUAL, RAR, SLOTS, R, qMult, qOf } from '../data';
import { awText, baseName, itemName, mainVal } from '../engine/formulas';
import type { FoeType, Item } from '../engine/types';
import { SUBS } from '../data';
import { f1, fmt } from './format';
import { itemUrl } from '../art/render';
import { Px } from './Px';

/** Plakietka jakości I–V (żelazo, brąz, srebro, złoto, płomień); przedmioty sprzed jakości to I. */
export function QBadge({ q, size = '' }: { q?: number; size?: '' | 'big' | 'sm' }) {
  const n = qOf({ q });
  const Q = QUAL[n - 1];
  return <span class={`qb q${n}${size ? ' ' + size : ''}`} title={`Jakość ${Q.n}${Q.b ? ` — +${Q.b}% statystyk` : ''}`} aria-label={`jakość ${Q.n}`}>{Q.n}</span>;
}
/** Ile z wartości statystyki daje jakość (statystyka dodatkowa jest zapisana już z premią). */
export const qShare = (v: number, q?: number) => { const m = qMult(q); return m > 1 ? Math.round((v - v / m) * 10) / 10 : 0; };

/** Jakość w podglądzie przedmiotu: skala I–V z premiami i to, ile daje jakość tego przedmiotu. */
export function QualityScale({ it }: { it: Item }) {
  const n = qOf(it);
  const Q = QUAL[n - 1];
  const extra = mainVal(it) - mainVal({ ...it, q: undefined });
  return (
    <div class={`iq q${n}`}>
      <div class="iq-h">
        <span>Jakość <QBadge q={it.q} size="sm" /></span>
        <b>{Q.b ? `+${Q.b}% do wszystkich statystyk` : 'bez premii'}</b>
      </div>
      <ol class="iq-scale" aria-label="Skala jakości">
        {QUAL.map((x, i) => (
          <li key={x.n} class={`${i + 1 <= n ? 'on' : ''}${i + 1 === n ? ' now' : ''}`}>
            <span class={`qb sm q${i + 1}`}>{x.n}</span>
            <small>{x.b ? `+${x.b}%` : '0%'}</small>
          </li>
        ))}
      </ol>
      {Q.b > 0 && <small class="iq-note">Z jakości: <b>+{fmt(extra)}</b> {SLOTS[it.slot].stat === 'dmg' ? 'obrażeń' : 'zdrowia'}{it.subs.length ? ' i część każdej statystyki dodatkowej (zaznaczona niżej)' : ''}.</small>}
      {Q.b === 0 && <small class="iq-note">Wyższa jakość tego samego przedmiotu dałaby do +{QUAL[QUAL.length - 1].b}% statystyk.</small>}
    </div>
  );
}

/** „jakość IV · +13%” — do opisów przedmiotu. */
export const qText = (q?: number) => { const Q = QUAL[qOf({ q }) - 1]; return `jakość ${Q.n}${Q.b ? ` (+${Q.b}%)` : ''}`; };

/** `proof` (tylko z serwerem): czy serwer może potwierdzić pochodzenie przedmiotu. */
interface Props { it: Item; delta?: number; reveal?: boolean; history?: boolean; proof?: boolean }

export function ItemCard({ it, delta, reveal, history, proof }: Props) {
  const S = SLOTS[it.slot];
  const st = it.ls || 0;
  const next = LEGEND[Math.min(3, st + 1)];
  const legPct = st >= 3 ? 100 : Math.min(100, (it.fame / next.at) * 100);
  const kills = (Object.entries(it.kills) as [FoeType, number][]).filter(([, v]) => v > 0).map(([k, v]) => `${fmt(v)} ${k.toLowerCase()}`);
  return (
    <div class={`icard r${it.r}${reveal ? ' reveal' : ''}`}>
      <div class="ihead">
        <div class="ico"><Px src={itemUrl(it.kind, it.ore, it.r)} size={36} alt="" /></div>
        <div>
          <div class={`iname${it.aw ? ' aw' : ''}`}>{itemName(it)}{it.obieg && <span class="tag">Z historią</span>}</div>
          <div class="irar">{it.aw || it.r === R.BOSKI ? baseName(it) + ' · ' : ''}{RAR[it.r].n} · jakość <QBadge q={it.q} size="sm" />{QUAL[qOf(it) - 1].b ? ` +${QUAL[qOf(it) - 1].b}%` : ''} · poz. {it.lvl}</div>
        </div>
        {delta !== undefined && <div class={`delta ${delta >= 0 ? 'up' : 'down'}`}>{delta >= 0 ? '+' : '−'}{fmt(Math.abs(delta))}</div>}
      </div>
      <div class="imain">{S.stat === 'dmg' ? 'Obrażenia' : 'Zdrowie'} {fmt(mainVal(it))}{qOf(it) > 1 && <span class="iq-plus" title="z jakości"> +{fmt(mainVal(it) - mainVal({ ...it, q: undefined }))}</span>}</div>
      {it.subs.length > 0 && <ul class="isubs">{it.subs.map(s => <li key={s.id}>{SUBS[s.id].n} +{f1(s.v)}{SUBS[s.id].u}{qShare(s.v, it.q) > 0 && <span class="iq-plus" title="z jakości"> +{f1(qShare(s.v, it.q))}</span>}</li>)}</ul>}
      <QualityScale it={it} />
      {it.r === R.BOSKI && <div class="iaura"><span aria-hidden="true">✦</span><span><b>Boska aura:</b> +{B.DIVINE_AURA}% obrażeń i zdrowia całego bohatera, gdy ten przedmiot jest założony.</span></div>}
      {it.el && <div class="iel">Żywioł: {ELEM[it.el].el} — {ELEM[it.el].d}</div>}
      {it.aw && <div class="itrait">Cecha: {it.aw.name} — {awText(it.aw)}</div>}
      <div class="ileg">
        <div class="ileg-h">
          <span>Legenda: <b>{st >= 3 ? 'Przebudzony' : st ? LEGEND[st].n : 'jeszcze brak'}</b></span>
          <span>{fmt(it.fame)}{st < 3 ? ' / ' + fmt(next.at) : ''} Sławy</span>
        </div>
        <div class="bar"><i style={{ width: legPct + '%' }} /></div>
        {/* Wszystkie progi naraz: co już jest, co następne i co daje. */}
        <ol class="ileg-steps">
          {([1, 2, 3] as const).map(k => (
            <li key={k} class={st >= k ? 'done' : st + 1 === k ? 'next' : ''}>
              <b>{LEGEND[k].n}</b>
              <small>{st >= k ? '✓ ' : ''}{fmt(LEGEND[k].at)} · +{Math.round(LEGEND[k].b * 100)}%{k === 3 ? ' i cecha do wyboru' : ''}</small>
            </li>
          ))}
        </ol>
        {history && (
          <small class="ileg-how">
            Sława: 1 za każdego wroga, {B.FAME_BOSS} za bossa — zbierają ją tylko założone przedmioty. Przy wymianie połowa
            przechodzi na nowy. Na progu Przebudzony sam wybierasz cechę: przeciw jednemu rodzajowi wrogów albo bossom.
          </small>
        )}
        {history && (kills.length > 0 || it.bosses > 0) && <span>Czyny: {kills.join(' · ')}{it.bosses ? ' · bossowie: ' + it.bosses : ''}</span>}
      </div>
      <div class="isign">
        Kowal: <b>{it.smith}</b>{it.npc ? ' (kowal-widmo)' : ''} · {ORES[it.ore].n} · {it.land}
        {history && it.owners.length > 1 && <><br />Właściciele: {it.owners.join(' → ')}</>}
      </div>
      {proof === false && <div class="inote">Serwer nie zna pochodzenia tego przedmiotu (wykuty przed aktualizacją albo bez połączenia) — nie liczy się do rankingu Mocy i na arenie.</div>}
    </div>
  );
}
