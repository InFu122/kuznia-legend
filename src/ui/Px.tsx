// Obrazek pixel artu: ostre piksele przy powiększeniu (rozmiar w px CSS najlepiej wielokrotnością rozmiaru sprite'a).
export const Px = ({ src, size, alt = '', cls = '' }: { src: string; size: number; alt?: string; cls?: string }) =>
  src ? <img class={`px${cls ? ' ' + cls : ''}`} src={src} width={size} height={size} alt={alt} draggable={false} /> : null;
