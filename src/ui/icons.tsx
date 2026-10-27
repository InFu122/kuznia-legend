import type { SlotId } from '../engine/types';

const SLOT_SVG: Record<SlotId, string> = {
  bron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 4L9.5 14.5M20 4h-4M20 4v4M7 12l5 5M8.5 15.5l-4 4"/></svg>',
  helm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M5 16a7 7 0 0 1 14 0v3H5z"/><path d="M12 9v5M9 16h6"/></svg>',
  zbroja: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M8 4h8l3 4-2 2v10H7V10L5 8z"/><path d="M12 9v11"/></svg>',
  rekawice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M8 20v-5l-2-3V8h2v3V5h2v6V4h2v7V5h2v8l2-2 1.5 1.5L16 17v3z"/></svg>',
  buty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M8 4h5v10l6 2.5V20H6v-6l2-2z"/></svg>',
  pas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 10h18v4H3z"/><path d="M10 8.5h4v7h-4z"/></svg>',
  pierscien: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><circle cx="12" cy="14.5" r="5"/><path d="M10 6.5l2-3 2 3-2 2z"/></svg>',
  amulet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M6 3c0 6 3 9 6 9s6-3 6-9"/><path d="M12 12l3 3.5-3 4.5-3-4.5z"/></svg>',
};

export type Tab = 'kuznia' | 'bohater' | 'nauka' | 'krainy' | 'lochy' | 'kodeks';

const TAB_SVG: Record<Tab, string> = {
  kuznia: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 8h13c0 3 2 4 5 4-1 2-3 3-6 3v2h2v3H7v-3h2v-2c-3 0-6-3-6-7z"/></svg>',
  bohater: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/></svg>',
  nauka: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3z"/><path d="M21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z"/></svg>',
  krainy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 19l6-10 4 6 3-4 5 8z"/><circle cx="17" cy="6" r="2"/></svg>',
  lochy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"><path d="M4 20V10a8 6 0 0 1 16 0v10"/><path d="M4 20h16M9 20v-5h6v5"/></svg>',
  kodeks: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/></svg>',
};

export const SlotIcon = ({ slot }: { slot: SlotId }) => <span class="icon-wrap" dangerouslySetInnerHTML={{ __html: SLOT_SVG[slot] }} />;
export const TabIcon = ({ tab }: { tab: Tab }) => <span class="icon-wrap" dangerouslySetInnerHTML={{ __html: TAB_SVG[tab] }} />;
