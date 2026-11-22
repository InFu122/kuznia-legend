import type { CapacitorConfig } from '@capacitor/cli';

// Aplikacja na telefon: gra z dist/ w paczce, serwer gry pod publicznym adresem (VITE_SERVER_URL przy budowaniu).
const config: CapacitorConfig = {
  appId: 'pl.kuznialegend.gra',
  appName: 'Kuźnia Legend',
  webDir: 'dist',
  backgroundColor: '#16120f',
  android: { backgroundColor: '#16120f' },
  plugins: {
    LocalNotifications: { smallIcon: 'ic_stat_kuznia', iconColor: '#e7be62' },
    // Gra rysuje się pod paskami systemu (viewport-fit=cover) i sama dodaje odstępy z env(safe-area-inset-*).
    SystemBars: { insetsHandling: 'css', style: 'DARK', initialViewportFitValueHint: 'cover' },
    // Logowanie przez Google (połączenie postępu z kontem Google). Pozostałe serwisy wyłączone — ich biblioteki nie trafiają do aplikacji.
    SocialLogin: { providers: { google: true, facebook: false, apple: false, twitter: false } },
  },
};

export default config;
