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
];

export const FORGE_UNLOCKS: Record<number, string> = {
  5: 'wytop Srebra, auto-wytop, rafinacja rud',
  12: 'wytop seryjny ×2',
  10: 'wytop Mithrilu, domieszki żywiołów, runy slotów',
  15: 'wytop Adamantytu, przekuwanie przedmiotów',
  20: 'wytop Smoczej Stali, wytop seryjny ×3',
  25: 'wytop Gwiezdnego Kruszcu',
  30: 'pełna szansa na przeskok, Dziedzictwo (nowe pokolenie)',
};

/**
 * Tempo gry. Siła przedmiotu zależy od poziomu kuźni (ulepszenia trwają coraz dłużej) i od rzadkości (rudy),
 * a nie od postępu w kampanii — dzięki temu krainy stawiają ściany, które pokonuje się kuźnią i farmieniem.
 * FORGE_AT_BOSS[L] = poziom kuźni, jakiego gra oczekuje przy bossie krainy L.
 * RARITY_AT_BOSS[L] = oczekiwany średni mnożnik rzadkości ekwipunku przy bossie krainy L.
 * Czas ulepszeń kuźni: UPGRADE_MIN (pierwsze poziomy minuty, potem godziny i dni; łącznie do 30. poziomu ok. 55 dni).
 */
export const FORGE_AT_BOSS = [2, 4, 7, 10, 13, 15, 18, 20, 21, 22, 24, 25, 26, 27, 29, 30];
export const RARITY_AT_BOSS = [1.15, 1.3, 1.5, 1.8, 2.1, 2.4, 2.7, 3.0, 3.2, 3.4, 3.8, 4.2, 4.6, 5.0, 5.6, 6.2];
/**
 * Dodatkowy mnożnik siły wrogów przy bossie krainy L (zdrowie i obrażenia). Skalibrowany symulatorem:
 * gracz zbiera substaty, legendy i rzadkie rudy szybciej niż zakłada sama krzywa rzadkości.
 */
export const ENEMY_SCALE_AT_BOSS = [1.0, 1.05, 1.25, 1.9, 2.5, 3.1, 4.2, 4.6, 4.6, 4.45, 4.2, 3.85, 3.6, 3.55, 3.8, 2.9];
/** Siła przedmiotu rośnie o 8% na poziom przedmiotu; poziom przedmiotu = 2 × poziom kuźni (+0–2). */
export const ITEM_LVL_GROWTH = 1.08;

/** Tempa testowe (przyspieszenie walki, kuźni i timerów). Z serwerem — tylko gdy serwer ma włączony tryb testowy. */
export const TEST_SPEEDS = [1, 10, 50, 100] as const;

/**
 * Czas ulepszenia kuźni DO poziomu n (w minutach; indeks = poziom). Pierwsze poziomy szybkie (samouczek: 30 s),
 * potem coraz dłużej: poz. 10 ≈ 2 h łącznie, 15 ≈ 18 h, 20 ≈ 5 dni, 25 ≈ 20 dni, 30 ≈ 55 dni.
 */
export const UPGRADE_MIN = [
  0, 0,
  0.5, 1, 2, 4, 7, 12, 20, 30, 45,          // 2–10
  60, 90, 150, 240, 420,                    // 11–15: 1 h … 7 h
  720, 960, 1200, 1560, 1920,               // 16–20: 12 h … 32 h
  2880, 3600, 4320, 5040, 5760,             // 21–25: 2 … 4 dni
  7200, 8640, 10080, 11520, 12960,          // 26–30: 5 … 9 dni
];

/**
 * Złoto: ile fal walki „kosztuje” następne ulepszenie kuźni przy kuźni na poziomie f — więcej z dwóch:
 * GOLD_WAVES × GOLD_WAVES_GROWTH^(f−1) (na starcie 50 fal) albo GOLD_TIME_K fal na minutę czasu następnego ulepszenia.
 * Gracz grający ok. 3 h dziennie (plus nagrody offline) zbiera na ulepszenie przez ok. 60% jego czasu, reszta złota idzie na badania.
 */
export const GOLD_WAVES = 50;
export const GOLD_WAVES_GROWTH = 1.2;
export const GOLD_TIME_K = 4.5;

export const B = {
  PITY_MAX: 30,                 // po tylu wytopach bez przeskoku następny przeskakuje na pewno
  FORGE_MAX: 30,
  UPGRADE_COST_BASE: 100,       // koszt(n) = 100 × 1,5^(n−1)
  UPGRADE_COST_MULT: 1.5,
  AUTO_FORGE_LVL: 5,
  REFINE_FORGE_LVL: 5,
  RUNE_FORGE_LVL: 10,           // runy slotów
  RUNE_MAX: 30,
  RUNE_PCT: 1,                  // +1% głównej statystyki przedmiotu w slocie za poziom runy
  REFORGE_FORGE_LVL: 15,        // przekuwanie statystyk dodatkowych
  LEGACY_FORGE: 30,             // Dziedzictwo (nowe pokolenie) od tego poziomu kuźni
  LEGACY_STAR_PCT: 5,           // Gwiazda Mistrza: +5% obrażeń i złota
  LEGACY_LANDS_PER_STAR: 4,     // gwiazdy za pokolenie: 1 za kuźnię 30 i 1 za każde 4 pokonane krainy
  LEGACY_HEIR_PCT: 50,          // Pamiątka Rodu działa w 50% (główna statystyka i dodatkowe)          // rafinacja rud (słabsza ruda → lepsza)
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
  OFFLINE_CAP_MS: 8 * 3600 * 1000,
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
