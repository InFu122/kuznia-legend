// Życie klanu (etap 4b): Wspólna Kuźnia Klanu, boss klanowy, pomoc w ulepszeniach, prośby o rudę i sklep klanowy.
// Te same liczby czyta gra i serwer.

/** Premie poziomów klanu (działają u wszystkich członków). */
export type ClanEff = 'goldPct' | 'dmgPct' | 'hpPct' | 'extraOre' | 'forgeTime' | 'offlineMin';
export interface ClanLevel { xp: number; eff: [ClanEff, number][]; d: string }

/** Poziom L (1–10) wymaga łącznie `xp` Doświadczenia klanu. Premie poziomów się sumują. */
export const CLAN_LEVELS: ClanLevel[] = [
  { xp: 100, eff: [['goldPct', 3]], d: '+3% złota' },
  { xp: 400, eff: [['dmgPct', 2]], d: '+2% obrażeń' },
  { xp: 1000, eff: [['hpPct', 2]], d: '+2% zdrowia' },
  { xp: 2000, eff: [['extraOre', 5]], d: '+5% szansy na dodatkową rudę' },
  { xp: 3500, eff: [['forgeTime', 3]], d: '−3% czasu ulepszeń kuźni' },
  { xp: 5500, eff: [['dmgPct', 3]], d: '+3% obrażeń' },
  { xp: 8500, eff: [['hpPct', 3]], d: '+3% zdrowia' },
  { xp: 12500, eff: [['goldPct', 5]], d: '+5% złota' },
  { xp: 18000, eff: [['offlineMin', 30]], d: '+30 min nagród offline' },
  { xp: 25000, eff: [['dmgPct', 5], ['hpPct', 5]], d: '+5% obrażeń i zdrowia' },
];
export const CLAN_LVL_MAX = CLAN_LEVELS.length;

/** Poziom klanu z łącznego Doświadczenia. */
export function clanLevelOf(xp: number): number {
  let l = 0;
  while (l < CLAN_LEVELS.length && xp >= CLAN_LEVELS[l].xp) l++;
  return l;
}

/** Suma premii klanu na poziomie `lvl`. */
export function clanBonus(lvl: number): Partial<Record<ClanEff, number>> {
  const out: Partial<Record<ClanEff, number>> = {};
  for (const L of CLAN_LEVELS.slice(0, Math.max(0, Math.min(CLAN_LVL_MAX, lvl)))) {
    for (const [k, v] of L.eff) out[k] = (out[k] ?? 0) + v;
  }
  return out;
}

export const CLAN = {
  DONATE_PER_DAY: 3,          // datki do Wspólnej Kuźni dziennie
  DONATE_GOLD_WAVES: 15,      // datek kosztuje tyle fal złota (z najdalszego etapu)
  DONATE_XP: 10,              // Doświadczenie klanu za datek
  DONATE_COINS: 5,            // Monety klanowe za datek
  BOSS_ATTACKS: 3,            // ataki na bossa klanowego dziennie
  BOSS_HP_POWER: 3,           // zdrowie bossa = suma Mocy członków × 3 × 1,2^poziom
  BOSS_HP_GROWTH: 1.2,
  BOSS_HP_MIN: 50000,
  BOSS_SPREAD: 0.15,          // obrażenia ataku = Moc × (1 ± 0,15)
  BOSS_ATTACK_COINS: 4,       // Monety za atak
  BOSS_ATTACK_GOLD_WAVES: 5,  // złoto za atak (fale złota)
  BOSS_KILL_XP: 100,          // Doświadczenie klanu za pokonanie bossa (+20 za poziom)
  BOSS_KILL_XP_LVL: 20,
  HELP_PCT: 3,                // każda pomoc skraca ulepszenie kuźni o 3% jego czasu
  HELP_MAX: 10,               // najwyżej 10 pomocy na jedno ulepszenie (−30%)
  HELP_TTL_MS: 48 * 3600000,  // prośba o pomoc wygasa po 2 dniach
  DEEDS_PER_DAY: 10,          // pomoce i dary rudy nagradzane Monetami dziennie
  DEED_COINS: 2,
  ORE_COOLDOWN_MS: 8 * 3600000, // prośba o rudę raz na 8 godzin
  ORE_TTL_MS: 24 * 3600000,
  ORE_GIVE_MAX: 5,            // jeden dar to najwyżej 5 sztuk rudy
  LOG_MAX: 30,
} as const;

/** Ile rudy można poprosić (według rudy: Miedź … Gwiezdny Kruszec). */
export const ORE_WANT = [30, 25, 20, 15, 10, 6, 4];

/** Bossowie klanowi — kolejni po każdym pokonaniu (potem od nowa, silniejsi). */
export const CLAN_BOSSES = [
  { n: 'Żelazny Golem', pal: 'golem' },
  { n: 'Kamienny Strażnik', pal: 'kamien' },
  { n: 'Ognisty Kolos', pal: 'ogien' },
  { n: 'Lodowy Kolos', pal: 'lod' },
  { n: 'Upiór Kuźni', pal: 'upior' },
] as const;
export const clanBossOf = (lvl: number) => CLAN_BOSSES[lvl % CLAN_BOSSES.length];

/** Zdrowie bossa klanowego poziomu `lvl` dla klanu o łącznej Mocy `power`. */
export const clanBossHp = (power: number, lvl: number) =>
  Math.round(Math.max(CLAN.BOSS_HP_MIN, power * CLAN.BOSS_HP_POWER) * Math.pow(CLAN.BOSS_HP_GROWTH, lvl));

/** Sklep klanowy: ceny w Monetach, limity tygodniowe, wymagany poziom klanu. */
export type ClanShopId = 'zloto' | 'ksiega' | 'zwoj' | 'kamienie' | 'siodlo' | 'smocza' | 'jajo' | 'pieczec';
export interface ClanShopItem { n: string; cost: number; week: number; lvl: number; icon: string }
export const CLAN_SHOP: Record<ClanShopId, ClanShopItem> = {
  zloto: { n: 'Sakiewka złota', cost: 10, week: 10, lvl: 0, icon: 'zloto' },
  ksiega: { n: 'Księga Wiedzy', cost: 40, week: 3, lvl: 1, icon: 'ksiega' },
  zwoj: { n: 'Zwój zaklęć', cost: 30, week: 5, lvl: 2, icon: 'zwoj' },
  kamienie: { n: '10 Kamieni', cost: 25, week: 5, lvl: 3, icon: 'kamien' },
  siodlo: { n: 'Siodło', cost: 50, week: 2, lvl: 4, icon: 'siodlo' },
  smocza: { n: '5 × Smocza Stal', cost: 35, week: 3, lvl: 5, icon: 'ore5' },
  jajo: { n: 'Jajo (Rzadkie)', cost: 60, week: 1, lvl: 6, icon: 'jajo2' },
  pieczec: { n: 'Pieczęć Legendy', cost: 150, week: 1, lvl: 8, icon: 'pieczec' },
};
export const CLAN_SHOP_IDS = Object.keys(CLAN_SHOP) as ClanShopId[];
/** Sakiewka złota = tyle fal złota. */
export const SHOP_GOLD_WAVES = 60;
