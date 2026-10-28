// Obrazek pixel artu: ostre piksele przy powiększeniu (rozmiar w px CSS najlepiej wielokrotnością rozmiaru sprite'a).
export const Px = ({ src, size, alt = '', cls = '' }: { src: string; size: number; alt?: string; cls?: string }) =>
  src ? <img class={`px${cls ? ' ' + cls : ''}`} src={src} width={size} height={size} alt={alt} draggable={false} /> : null;

/** Koszt / czas z ikonami: [[ikona, tekst], …] — np. Księgi, złoto i czas badania. */
export const Costs = ({ items, cls = '' }: { items: [string, string][]; cls?: string }) => (
  <span class={`costs${cls ? ' ' + cls : ''}`}>
    {items.map(([src, txt], i) => <span key={i} class="cost"><Px src={src} size={16} />{txt}</span>)}
  </span>
);
