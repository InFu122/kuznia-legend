// Wojna klanów (co tydzień) i rajd klanowy Smocze Leże. Te same liczby czyta gra i serwer.

/** Dni wojny (poniedziałek = 0). Wtorek–piątek: punkty za aktywność, sobota: bitwa, niedziela: nagrody. */
export type WarDayKind = 'dobor' | 'kucie' | 'fale' | 'lochy' | 'boss' | 'bitwa' | 'nagrody';
export const WAR_DAYS: { k: WarDayKind; short: string; n: string; how: string }[] = [
  { k: 'dobor', short: 'Pn', n: 'Dobór przeciwnika', how: 'Klany o podobnej sile dostają przeciwnika na cały tydzień. Od jutra liczą się punkty.' },
  { k: 'kucie', short: 'Wt', n: 'Dzień kucia', how: 'Każdy wytop (także auto-wytop i seryjny) to 1 punkt.' },
  { k: 'fale', short: 'Śr', n: 'Dzień walki', how: 'Co 5 pokonanych wrogów w krainach (także w nagrodach za nieobecność) to 1 punkt.' },
  { k: 'lochy', short: 'Czw', n: 'Dzień lochów', how: 'Każdy klucz zużyty w lochu to 25 punktów, każde piętro Wieży Wyzwań — 5.' },
  { k: 'boss', short: 'Pt', n: 'Dzień bossa', how: 'Każdy atak na bossa klanowego to 60 punktów (3 ataki dziennie).' },
  { k: 'bitwa', short: 'So', n: 'Bitwa', how: 'Masz 3 ataki na obrońców wrogiego klanu. Wygrana daje punkty zależne od siły obrońcy.' },
  { k: 'nagrody', short: 'Nd', n: 'Wyniki i nagrody', how: 'Zwycięski klan dostaje większe skrzynie. Nagrody trafiają do każdego, kto zdobył punkty.' },
];

export const WAR = {
  DAY_CAP: 300,            // najwyżej tyle punktów dziennie od jednej osoby (dni aktywności)
  KILLS_PER_PT: 5,
  KEY_PTS: 25,
  TOWER_PTS: 5,
  BOSS_PTS: 60,
  ATTACKS: 3,              // ataki w sobotę
  WIN_PTS: 40,             // wygrana z równym przeciwnikiem
  LOSS_PTS: 5,
  FIRST_BLOOD: 10,         // pierwsza wygrana z danym obrońcą
  WIN_XP: 200,             // Doświadczenie klanu za wygraną wojnę
  LOSS_XP: 60,
  GHOST_PER_MEMBER: 150,   // ile punktów dziennie zdobywa średnio „członek” klanu-widma
} as const;

/** Klany-widma: przeciwnicy, gdy na serwerze brakuje klanu o podobnej sile (albo jest ich nieparzyście). */
export const GHOST_CLANS: { n: string; tag: string }[] = [
  { n: 'Bractwo Popiołu', tag: 'POPÓŁ' },
  { n: 'Zakon Mgły', tag: 'MGŁA' },
  { n: 'Kowale Otchłani', tag: 'OTCH' },
  { n: 'Synowie Burzy', tag: 'BURZA' },
  { n: 'Strażnicy Kurhanu', tag: 'KURH' },
];
export const GHOST_NAMES = ['Grimwald', 'Ostrogar', 'Wiedmira', 'Borzywoj', 'Kalinda', 'Mściwuj', 'Radogost', 'Zelma', 'Hartwin', 'Dobrava', 'Sobiesław', 'Ingrid'];

/* ---------- Smocze Leże (rajd klanowy) ---------- */

/** Cztery fazy smoka. Każda ma słabość: przedmioty z tym żywiołem zadają więcej obrażeń. */
export const RAID_PHASES = [
  { n: 'Ognisty Oddech', foe: 'Czerwony Smok', weak: 'szron', d: 'Smok zieje ogniem — słabość: Lód (Szronit).' },
  { n: 'Lodowe Skrzydła', foe: 'Lodowy Smok', weak: 'zar', d: 'Łuski pokrywa szron — słabość: Ogień (Żarowiec).' },
  { n: 'Gromowy Ryk', foe: 'Smok błyskawic', weak: 'jad', d: 'Wokół smoka szaleje burza — słabość: Trucizna (Jadowit).' },
  { n: 'Cień Smoka', foe: 'Gwiezdny Pożeracz', weak: 'jasn', d: 'Smok znika w mroku — słabość: Światło (Jasnokwarc).' },
] as const;

export const RAID = {
  ATTACKS: 2,              // ataki dziennie
  DMG_MULT: 8,             // obrażenia ataku = Moc × 8 × (1 ± 0,15) × premia żywiołu
  SPREAD: 0.15,
  WEAK_PER_ITEM: 0.1,      // +10% za każdy założony przedmiot z żywiołem słabości (najwyżej +40%)
  WEAK_MAX: 0.4,
  HP_POWER: 40,            // zdrowie smoka = łączna Moc klanu × 40 × 1,15^poziom (cztery równe fazy)
  HP_MIN: 30000,
  HP_GROWTH: 1.15,
  KILL_XP: 250,            // Doświadczenie klanu za pokonanie smoka (+50 za poziom)
  KILL_XP_LVL: 50,
} as const;

/** Zdrowie jednej fazy smoka poziomu `lvl` dla klanu o łącznej Mocy `power`. */
export const raidPhaseHp = (power: number, lvl: number) =>
  Math.round((Math.max(RAID.HP_MIN, power * RAID.HP_POWER) * Math.pow(RAID.HP_GROWTH, lvl)) / RAID_PHASES.length);
