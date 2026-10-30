// Wszystkie liczby balansu w jednym miejscu, żeby symulator i gra korzystały z tych samych wartości.

/** Progi legendy: wymagana Sława Czynów i bonus do statystyki głównej. */
export const LEGEND = [
  { n: '', at: 0, b: 0 },
  { n: 'Zahartowany', at: 1000, b: 0.05 },
  { n: 'Sławny', at: 5000, b: 0.10 },
  { n: 'Przebudzony', at: 20000, b: 0.10 },
] as const;

export const SMITH_TITLES = [
  { n: 'Czeladnik', at: 0 },
  { n: 'Kowal', at: 200 },
  { n: 'Mistrz Kuźni', at: 1000 },
  { n: 'Arcymistrz Kuźni', at: 5000 },
] as const;

/** Szansa na przeskok o 1 i o 2 rzadkości (w %) na wybranych poziomach kuźni; pomiędzy liniowo. */
export const JUMP_TABLE: [number, number, number][] = [
  [1, 10, 1], [5, 12, 1.4], [10, 14, 1.9], [15, 16.5, 2.4], [20, 19, 2.9], [25, 22, 3.4], [30, 25, 4],
  // kuźnia do 200. poziomu: dalej wolniej, ale z każdym poziomem trochę więcej
  [50, 27.5, 4.5], [80, 30, 5], [120, 33, 5.6], [160, 36, 6.2], [200, 39, 6.8],
];

/** Co odblokowuje poziom kuźni (kuźnia rośnie do 200. poziomu — ok. roku gry). */
export const FORGE_UNLOCKS: Record<number, string> = {
  5: 'wytop Srebra, auto-wytop, rafinacja rud',
  10: 'domieszki żywiołów, runy slotów',
  12: 'wytop Mithrilu, wytop seryjny ×2',
  15: 'przekuwanie przedmiotów, rudy unikalne (zestawy)',
  20: 'wytop seryjny ×3',
  25: 'wytop Adamantytu',
  40: 'wytop Obsydianu',
  60: 'wytop Smoczej Stali',
  85: 'wytop Eterytu',
  100: 'wytop Gwiezdnego Kruszcu',
  120: 'wytop Boskiej Rudy',
  200: 'najwyższy poziom kuźni',
};

/**
 * Tempo gry. Siła przedmiotu zależy od poziomu kuźni (ulepszenia trwają coraz dłużej) i od rzadkości (rudy),
 * a nie od postępu w kampanii — dzięki temu krainy stawiają ściany, które pokonuje się kuźnią i farmieniem.
 * FORGE_AT_BOSS[L] = poziom kuźni, jakiego gra oczekuje przy bossie krainy L.
 * RARITY_AT_BOSS[L] = oczekiwany średni mnożnik rzadkości ekwipunku przy bossie krainy L.
 * Czas ulepszeń kuźni: UPGRADE_MIN (pierwsze poziomy minuty, potem godziny i dni; łącznie do 200. poziomu ok. roku).
 * Kampania kończy się przy kuźni ok. 120 (pół roku); dalej Otchłań — kręgi bez końca (`abyssForge` itd. w formulas.ts).
 */
export const FORGE_AT_BOSS = [2, 4, 7, 10, 13, 16, 20, 25, 30, 38, 46, 55, 66, 80, 98, 120];
export const RARITY_AT_BOSS = [1.15, 1.3, 1.5, 1.75, 1.95, 2.15, 2.3, 2.5, 2.85, 3.15, 3.45, 3.65, 4.1, 4.45, 4.85, 5.35];
/**
 * Dodatkowy mnożnik siły wrogów przy bossie krainy L (zdrowie i obrażenia). Skalibrowany symulatorem:
 * gracz zbiera substaty, legendy i rzadkie rudy szybciej niż zakłada sama krzywa rzadkości.
 */
export const ENEMY_SCALE_AT_BOSS = [1.0, 1.05, 1.25, 1.9, 2.5, 3.1, 4.2, 4.6, 4.6, 5.6, 6.0, 6.5, 9.9, 13.8, 22, 30];
/**
 * Siła przedmiotu rośnie o 8% na poziom przedmiotu do ITEM_LVL_SOFT (kuźnia 30), dalej o ITEM_LVL_GROWTH_HI na poziom —
 * kuźnia rośnie do 200, więc liczby nie mogą wybuchnąć. Poziom przedmiotu = 2 × poziom kuźni (+0–2).
 */
export const ITEM_LVL_GROWTH = 1.08;
export const ITEM_LVL_GROWTH_HI = 1.04;
export const ITEM_LVL_SOFT = 60;

/** Tempa testowe (przyspieszenie walki, kuźni i timerów). Z serwerem — tylko gdy serwer ma włączony tryb testowy. */
export const TEST_SPEEDS = [1, 10, 50, 100] as const;

/**
 * Czas ulepszenia kuźni DO poziomu n (w minutach; indeks = poziom). Pierwsze poziomy szybkie (samouczek: 30 s),
 * potem coraz dłużej: poz. 10 ≈ 2 h łącznie, 15 ≈ 18 h, 20 ≈ 5 dni, 30 ≈ 19 dni, 60 ≈ 2,3 mies., 100 ≈ 4,7 mies., 200 ≈ rok.
 */
const UPGRADE_MIN_20 = [
  0, 0,
  0.5, 1, 2, 4, 7, 12, 20, 30, 45,          // 2–10
  60, 90, 150, 240, 420,                    // 11–15: 1 h … 7 h
  720, 960, 1200, 1560, 1920,               // 16–20: 12 h … 32 h
];
/**
 * Czasy ulepszeń kuźni sprzed kuźni do 200 (do 30. poziomu: 2…9 dni na poziom). Z nich liczą się dalej czasy badań
 * w Nauce (40% czasu „poziomu” badania) — badania zachowują dawne tempo.
 */
export const TECH_TIME_MIN = [...UPGRADE_MIN_20, 2880, 3600, 4320, 5040, 5760, 7200, 8640, 10080, 11520, 12960];
/** Od 21. poziomu: ok. 32 h, potem coraz dłużej — do ok. 2,8 dnia na 200. poziomie (łącznie ok. roku). */
export const UPGRADE_MIN: number[] = Array.from({ length: 201 }, (_, n) =>
  (n <= 20 ? UPGRADE_MIN_20[n] : Math.round((1920 * (1 + (1.1 * (n - 20)) / 180)) / 10) * 10));

/**
 * Złoto: ile fal walki „kosztuje” następne ulepszenie kuźni przy kuźni na poziomie f — więcej z dwóch:
 * GOLD_WAVES × GOLD_WAVES_GROWTH^(f−1) (na starcie 50 fal) albo K fal na minutę czasu następnego ulepszenia,
 * gdzie K rośnie od GOLD_TIME_K (do poziomu GOLD_CUT_FROM — pierwsze godziny gry są hojne) do GOLD_TIME_K × GOLD_CUT
 * (od poziomu GOLD_CUT_TO). Gracz grający ok. 3 h dziennie (plus nagrody offline z Nocną zmianą) zarabia niewiele
 * więcej, niż kosztują ulepszenia — zapas złota to kilka kolejnych ulepszeń, a nie kilkadziesiąt.
 */
export const GOLD_WAVES = 50;
export const GOLD_WAVES_GROWTH = 1.2;
export const GOLD_TIME_K = 4.5;
export const GOLD_CUT = 2.5;
export const GOLD_CUT_FROM = 10;
export const GOLD_CUT_TO = 20;

export const B = {
  PITY_MAX: 30,                 // po tylu wytopach bez przeskoku następny przeskakuje na pewno
  FORGE_MAX: 200,
  UPGRADE_COST_BASE: 100,       // koszt(n) = 100 × 1,5^(n−1) do 30. poziomu…
  UPGRADE_COST_MULT: 1.5,
  UPGRADE_COST_MULT_HI: 1.04,   // …dalej ×1,04 na poziom
  UPGRADE_COST_SOFT: 30,
  AUTO_FORGE_LVL: 5,
  REFINE_FORGE_LVL: 5,
  RUNE_FORGE_LVL: 10,           // runy slotów
  RUNE_MAX: 30,
  RUNE_PCT: 1,                  // +1% głównej statystyki przedmiotu w slocie za poziom runy
  REFORGE_FORGE_LVL: 15,        // przekuwanie statystyk dodatkowych
  // Dziedzictwo (nowe pokolenie) wycofane — kuźnia rośnie do 200. Kto je przeszedł, zachowuje premie:
  LEGACY_STAR_PCT: 5,           // Gwiazda Mistrza: +5% obrażeń i złota
  LEGACY_HEIR_PCT: 50,          // Pamiątka Rodu działa w 50% (główna statystyka i dodatkowe)
  ELEM_FORGE_LVL: 10,
  AUTO_INTERVAL_MS: 900,
  WAVES_PER_STAGE: 5,
  STAGES_PER_LAND: 10,
  WAVE_HEAL: 0.3,
  ORE_DROP: 0.35,               // szansa, że fala zostawi rudę (złoto wypada zawsze)
  ORE_MAIN_MAX: 2,              // główna ruda krainy: 1–2 sztuki na drop (rzadsze po 1)
  ELEM_DROP: 0.04,
  OBIEG_CHANCE: 0.3,
  OBIEG_FIND_FROM_BOSS: 0.2,
  OBIEG_STOCK: 6,               // tyle znalezisk z Obiegu gra trzyma w zapasie (z serwerem)
  SEEDS_RESERVE: 400,           // zapas ziaren wytopu od serwera (wystarcza na Skrzynię nocnej zmiany)
  SEEDS_REFILL: 300,            // poniżej tylu ziaren gra dobiera nowe
  ARENA_FIGHTS: 5,              // walki na arenie dziennie
  ARENA_UNLOCK_LAND: 1,         // arena od drugiej krainy
  CLAN_UNLOCK_LAND: 1,          // klany po pokonaniu pierwszego bossa
  CLAN_MAX: 30,                 // członków w klanie
  CLAN_DEPUTIES: 2,             // Zastępców
  CLAN_ELDERS: 5,               // Starszych
  CHAT_GLOBAL_FORGE: 5,         // czat globalny od tego poziomu kuźni (wcześniej tylko klanowy)
  CHAT_MAX_LEN: 200,
  CHAT_SLOW_GLOBAL_MS: 3000,    // tryb wolny czatu globalnego
  CHAT_SLOW_CLAN_MS: 1000,
  FAME_BOSS: 50,
  FAME_DUNGEON: 30,
  OFFLINE_CAP_MS: 1 * 3600 * 1000, // łupy za nieobecność: 1 h, dłużej z badaniem Nocna zmiana (do 8 h) i premią klanu
  OFFLINE_EFFICIENCY: 0.5,
  OFFLINE_ORE: 0.35,            // ruda za nieobecność: 35% tego, co dałyby fale offline (złoto bez zmian)
  OFFLINE_WAVE_MS: 3500,
  OFFLINE_CHEST_MAX: 300,
  DUNGEON_KEYS: 2,
  DUNGEON_CHECKPOINT: 5,
  LEGEND_TRANSFER: 0.5,
  BOSS_HP_MULT: 8,
  BOSS_ATK_MULT: 0.11,
  WAVE_HP_MULT: 2.6,
  WAVE_ATK_DIV: 10,
  BOOK_DROP: 0.0005,            // szansa na Księgę Wiedzy z fali
  BOOKS_BOSS_FIRST: 3,          // pierwsze pokonanie bossa: 3 + numer krainy
  BOOKS_BOSS_CHANCE: 0.1,       // kolejne pokonania: szansa na 1 Księgę
  UNIQ_BOSS_FIRST: 2,           // rudy unikalne za pierwsze pokonanie bossa z zestawem
  UNIQ_BOSS_CHANCE: 0.05,       // szansa na rudę unikalną przy kolejnych pokonaniach
  RAMP_DROP: 50,                // nowa ruda wchodzi stopniowo: tyle % wytopów o rzadkość niżej na poziomie kuźni, na którym się odblokowuje…
  RAMP_LEVELS: 5,               // …i mniej z każdym poziomem — po tylu poziomach już zawsze pełne minimum
  GOLD_FORGE_AHEAD: 2,          // złoto liczone najwyżej jak dla kuźni o 2 poziomy wyższej niż gracza (choćby był dalej w kampanii)
  DIVINE_AURA: 3,               // Boska aura: +% obrażeń i zdrowia bohatera za każdy założony Boski przedmiot
  DIVINE_ORE_BOSS: 0.01,        // szansa na Boską Rudę z bossa krainy w akcie IV
  DIVINE_ORE_EVENT_BOSS: 0.05,  // szansa na Boską Rudę ze skrzyni bossa lochu sezonowego
  SKARBIEC_MS: 30000,
  SCROLL_DROP: 0.0002,          // szansa na Zwój zaklęć z fali
  SCROLLS_START: 3,             // Zwoje na start, gdy odblokują się umiejętności
  SCROLLS_BOSS_FIRST: 1,        // pierwsze pokonanie bossa: 1 + numer aktu
  SCROLL_BOSS_CHANCE: 0.1,
  EGG_BOSS_CHANCE: 0.04,        // kolejne pokonania bossa (od aktu II)
  SADDLES_BOSS_FIRST: 2,        // pierwsze pokonanie bossa od aktu III
  SADDLE_BOSS_CHANCE: 0.03,
  OLTARZE_FLOORS: 5,
} as const;
