// Minimalny zapis PNG (RGBA) dla narzędzi — bez zależności.
import { deflateSync } from 'node:zlib';

const table = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc = (buf: Uint8Array) => { let c = 0xffffffff; for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

function chunk(type: string, data: Uint8Array): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), Buffer.from(data)]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
}

export function png(w: number, h: number, rgba: Uint8ClampedArray | Uint8Array): Buffer {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array())]);
}

/** Arkusz: komórki `cell`×`cell` px, każdy sprite powiększony `scale` razy, tło komórek w szachownicę. */
export function sheet(items: { px: Uint8ClampedArray; w: number; h: number }[][], scale: number, cell: number, bg = [[38, 34, 42], [46, 41, 51]]): Buffer {
  const rows = items.length, cols = Math.max(...items.map(r => r.length));
  const W = cols * cell, H = rows * cell;
  const out = new Uint8ClampedArray(W * H * 4);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const b = bg[(r + c) % 2];
    for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) {
      const i = ((r * cell + y) * W + c * cell + x) * 4;
      out[i] = b[0]; out[i + 1] = b[1]; out[i + 2] = b[2]; out[i + 3] = 255;
    }
    const it = items[r][c];
    if (!it) continue;
    const ox = c * cell + Math.floor((cell - it.w * scale) / 2), oy = r * cell + Math.floor((cell - it.h * scale) / 2);
    for (let y = 0; y < it.h; y++) for (let x = 0; x < it.w; x++) {
      const s = (y * it.w + x) * 4;
      if (!it.px[s + 3]) continue;
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        const i = ((oy + y * scale + dy) * W + ox + x * scale + dx) * 4;
        out[i] = it.px[s]; out[i + 1] = it.px[s + 1]; out[i + 2] = it.px[s + 2]; out[i + 3] = 255;
      }
    }
  }
  return png(W, H, out);
}
