import type { DungId } from '../engine/types';

export interface DungeonInfo {
  n: string;
  short: string;      // krótka nazwa nagrody
  reward: string;
  how: string;
  keys: number;       // klucze dziennie; 0 = bez limitu
  unlock: string;     // opis warunku
}

export const DUNGEONS: Record<DungId, DungeonInfo> = {
  skarbiec: { n: 'Skarbiec Złota', short: 'Złoto', reward: 'Złoto', how: '30 sekund walki z goblinami niosącymi worki; każdy kolejny daje więcej złota.', keys: 2, unlock: 'po pokonaniu 1. bossa' },
  sztolnia: { n: 'Głęboka Sztolnia', short: 'Lepsza ruda', reward: 'Ruda o poziom lepsza niż w twojej krainie', how: 'Schodzisz piętro po piętrze. Co 5 pięter wybierasz: wyjść z łupem albo ryzykować; porażka zabiera połowę worka.', keys: 2, unlock: 'po pokonaniu 2. bossa' },
  wieza: { n: 'Wieża Wyzwań', short: 'Księgi Wiedzy', reward: 'Księgi Wiedzy co 5 pięter, złoto z każdego piętra', how: 'Nieskończone piętra coraz silniejszych strażników. Postęp zostaje — zaczynasz od pierwszego niepokonanego piętra.', keys: 0, unlock: 'od 3. poziomu kuźni' },
  leza: { n: 'Leża Bossów', short: 'Rudy unikalne', reward: 'Rudy unikalne do zestawów', how: 'Walka z silniejszą wersją pokonanego bossa. Każdy boss z rudą unikalną daje własną rudę.', keys: 3, unlock: 'po pokonaniu Wilkołaka Alfy' },
  oltarze: { n: 'Ołtarze Żywiołów', short: 'Domieszki', reward: 'Domieszki żywiołu dnia', how: '5 strażników żywiołu. Każdego dnia tygodnia inny żywioł; porażka zabiera połowę nagrody.', keys: 2, unlock: 'od 10. poziomu kuźni' },
};
export const DUNG_ORDER: DungId[] = ['skarbiec', 'sztolnia', 'wieza', 'leza', 'oltarze'];
export const DUNG_SOON = ['Labirynt Minotaura', 'Krypta Bohaterów', 'Zapomniana Zbrojownia', 'Smocze Leże (rajd klanowy)'];
