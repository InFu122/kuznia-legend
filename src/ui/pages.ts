// Strony WWW obok gry na serwerze (polityka prywatności, regulamin, usuwanie konta — szablony w deploy/strony).
import { isNative } from './pwa';

/** Publiczny adres gry albo pusto, gdy gra go nie zna (lokalnie, w pliku; aplikacja dostaje go z VITE_PUBLIC_URL). */
export const publicUrl = () => {
  const env = import.meta.env.VITE_PUBLIC_URL as string | undefined;
  if (env) return env;
  const local = /^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname);
  return local || isNative() || location.protocol === 'file:' ? '' : location.origin + location.pathname;
};

/** Strona na serwerze gry albo pusto, gdy gra nie zna swojego adresu. */
export const pageUrl = (file: string) => {
  const base = publicUrl();
  return base ? new URL(file, base.endsWith('/') ? base : base + '/').href : '';
};
