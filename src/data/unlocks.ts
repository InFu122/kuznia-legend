// Odblokowywanie funkcji: nowy gracz zaczyna od kuźni i walki, a reszta otwiera się po kolei
// (poziom kuźni, etap pierwszej krainy albo pokonany boss). Zablokowane zakładki i przyciski mają kłódkę.
import { B } from './balance';
import { MOUNTS_UNLOCK_LAND, PETS_UNLOCK_LAND, SKILLS_UNLOCK_G } from './companions';
import { TECH_UNLOCK_FORGE } from './tech';

export type FeatureId =
  | 'bohater' | 'zadania' | 'nauka' | 'sklep' | 'krainy' | 'lochy' | 'klan' | 'czat'
  | 'auto' | 'umiejetnosci' | 'runy' | 'chowance' | 'wierzchowce' | 'arena';

export interface FeatureDef {
  n: string;
  /** Co to jest — jedno zdanie do okna z kłódką i ogłoszenia. */
  d: string;
  /** Warunek: poziom kuźni, najdalszy etap kampanii (`g`, 0 = 1. etap 1. krainy) albo liczba pokonanych krain (`lands`). */
  forge?: number;
  g?: number;
  lands?: number;
  /** Tylko z połączeniem z serwerem. */
  net?: boolean;
  /** Gdzie jest: zakładka, przycisk w nagłówku albo część zakładki. */
  at: { tab?: 'bohater' | 'nauka' | 'krainy' | 'lochy' | 'klan'; btn?: 'sklep' | 'zadania' | 'czat'; inTab?: 'kuznia' | 'bohater' | 'lochy' };
  /** Selektor elementu do wskazania po odblokowaniu (samouczek); funkcja w zakładce — gdy ta zakładka jest otwarta. */
  target: string;
}

export const FEATURES: Record<FeatureId, FeatureDef> = {
  bohater: { n: 'Bohater', d: 'Ekwipunek, statystyki i wygląd bohatera.', g: 2, at: { tab: 'bohater' }, target: '[data-tab="bohater"]' },
  zadania: { n: 'Zadania', d: 'Codzienne i tygodniowe zadania z nagrodami, kalendarz logowania i osiągnięcia.', forge: 2, at: { btn: 'zadania' }, target: '[data-btn="zadania"]' },
  nauka: { n: 'Nauka', d: 'Akademia Kowalska: badania za Księgi Wiedzy i złoto wzmacniają kuźnię, walkę i zarobki.', forge: TECH_UNLOCK_FORGE, at: { tab: 'nauka' }, target: '[data-tab="nauka"]' },
  sklep: { n: 'Sklep', d: 'Darmowy prezent dnia, nagrody za reklamy i towary za Klejnoty.', forge: 3, at: { btn: 'sklep' }, target: '[data-btn="sklep"]' },
  auto: { n: 'Auto-wytop', d: 'Kuźnia kuje sama: słabsze sprzedaje, a na wybranej rzadkości czeka na twoją decyzję.', forge: B.AUTO_FORGE_LVL, at: { inTab: 'kuznia' }, target: '.auto2 .toggle' },
  umiejetnosci: { n: 'Umiejętności', d: 'Zaklęcia ze Zwojów, które bohater rzuca sam w walce.', g: SKILLS_UNLOCK_G, at: { inTab: 'bohater' }, target: '[data-sub="skills"]' },
  krainy: { n: 'Krainy', d: 'Mapa kampanii: wracaj do pokonanych krain po ich rudy.', lands: 1, at: { tab: 'krainy' }, target: '[data-tab="krainy"]' },
  lochy: { n: 'Lochy', d: 'Codzienne lochy z kluczami: złoto, rudy, Księgi i przedmioty.', lands: 1, at: { tab: 'lochy' }, target: '[data-tab="lochy"]' },
  klan: { n: 'Klan', d: 'Wspólna kuźnia, boss klanowy, wojny i pomoc innych kowali.', lands: 1, net: true, at: { tab: 'klan' }, target: '[data-tab="klan"]' },
  czat: { n: 'Czat', d: 'Rozmowy z innymi graczami i ogłoszenia Boskich przedmiotów.', lands: 1, net: true, at: { btn: 'czat' }, target: '[data-btn="czat"]' },
  runy: { n: 'Runy', d: 'Runa wzmacnia przedmiot w swoim miejscu i zostaje w nim na zawsze.', forge: B.RUNE_FORGE_LVL, at: { inTab: 'bohater' }, target: '.card.runes' },
  arena: { n: 'Arena', d: 'Pojedynki z bohaterami innych graczy i tygodniowe ligi.', lands: B.ARENA_UNLOCK_LAND, net: true, at: { inTab: 'lochy' }, target: '.arena-banner .btn' },
  chowance: { n: 'Chowańce', d: 'Towarzysz z jaja walczy u boku bohatera i daje premię.', lands: PETS_UNLOCK_LAND, at: { inTab: 'bohater' }, target: '[data-sub="pets"]' },
  wierzchowce: { n: 'Wierzchowce', d: 'Wierzchowiec z Siodła dodaje obrażeń i zdrowia.', lands: MOUNTS_UNLOCK_LAND, at: { inTab: 'bohater' }, target: '[data-sub="mounts"]' },
};
export const FEATURE_IDS = Object.keys(FEATURES) as FeatureId[];
