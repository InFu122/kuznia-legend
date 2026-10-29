// Stałe wstawiane przez Vite przy budowaniu (vite.config.ts).
declare const __APP_VERSION__: string; // np. „0.2.0 · 29.10.2026 11:40”
declare const __BUILD_ID__: string;    // znacznik builda — gra porównuje go z version.json, żeby wykryć nową wersję

interface Window {
  /** Capacitor (aplikacja na telefon) — jest tylko w aplikacji, nie w przeglądarce. */
  Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
}
