// Logowanie przez Google na telefonie (Credential Manager przez wtyczkę @capgo/capacitor-social-login).
// Gra potrzebuje tylko tokenu tożsamości — sprawdza go serwer i na tej podstawie łączy konto gry z kontem Google.
// W przeglądarce logowania Google nie ma (zostaje kod przeniesienia).
import { isNative } from '../ui/pwa';

/** Klient OAuth „Aplikacja internetowa” z Google Cloud (jawny; ten sam sprawdza serwer w server/src/google.ts). */
export const GOOGLE_CLIENT_ID = '938097614064-ku6cvjo4fao8fvav0u8cs0elfsstih86.apps.googleusercontent.com';

/** Logowanie Google jest dostępne (aplikacja z Google Play). */
export const googleAvailable = () => isNative();

type SL = typeof import('@capgo/capacitor-social-login').SocialLogin;
let sl: Promise<SL> | null = null;
const plugin = () => (sl ??= import('@capgo/capacitor-social-login').then(async m => {
  // Bez dodatkowego „authorize” — wystarczy token tożsamości (zwykła MainActivity, bez dodatkowych uprawnień).
  await m.SocialLogin.initialize({ google: { webClientId: GOOGLE_CLIENT_ID, skipAuthOnlyAuthorizationAfterSignIn: true } });
  return m.SocialLogin;
}).catch(e => { sl = null; throw e; }));

/** Gracz przerwał wybór konta — bez komunikatu o błędzie. */
export class GoogleCancelled extends Error {}

/** Okno wyboru konta Google → token tożsamości dla serwera. */
export async function googleToken(): Promise<string> {
  const s = await plugin();
  let r: Awaited<ReturnType<SL['login']>>;
  try {
    r = await s.login({ provider: 'google', options: {} });
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (/cancel/i.test(m)) throw new GoogleCancelled('Anulowano.');
    // Numer błędu Google (np. 28444 — w Google Cloud nie zgadza się SHA-1 albo nazwa pakietu) pomaga znaleźć przyczynę.
    const code = /\[(\d+)\]/.exec(m)?.[1];
    throw new Error(`Logowanie przez Google nie powiodło się${code ? ` (błąd ${code})` : ''}.`);
  }
  const res = r.result as { idToken?: string | null };
  if (!res.idToken) throw new Error('Google nie przekazał danych logowania — spróbuj ponownie.');
  return res.idToken;
}
