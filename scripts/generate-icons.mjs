// Gera os ícones do PWA. Roda sob demanda (`node scripts/generate-icons.mjs`),
// não no build: os PNGs são versionados, então o build não precisa de pngjs.
//
// O desenho é uma anilha — círculo laranja com furo escuro e uma barra
// atravessando — feito por matemática de pixel para não depender de
// rasterizador nativo (sharp/canvas) só para gerar três arquivos.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "client", "public", "icons");

const INK = [32, 35, 31];      // #20231f
const ACCENT = [224, 107, 60]; // #e06b3c
const CREAM = [247, 247, 242]; // #f7f7f2

function put(png, x, y, [r, g, b]) {
  const idx = (png.width * y + x) << 2;
  png.data[idx] = r;
  png.data[idx + 1] = g;
  png.data[idx + 2] = b;
  png.data[idx + 3] = 255;
}

function makeIcon(size, { padded }) {
  const png = new PNG({ width: size, height: size });
  const c = (size - 1) / 2;

  // `padded` deixa margem para o recorte de ícone mascarável do Android; no
  // apple-touch-icon o iOS já aplica o próprio arredondamento.
  const outer = size * (padded ? 0.34 : 0.42);
  const inner = outer * 0.42;
  const barHalf = size * (padded ? 0.055 : 0.065);
  const barReach = outer * 1.32;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - c;
      const dy = y - c;
      const dist = Math.hypot(dx, dy);

      let color = INK;
      const onBar = Math.abs(dy) <= barHalf && Math.abs(dx) <= barReach;
      if (onBar) color = CREAM;
      if (dist <= outer) color = dist <= inner ? INK : ACCENT;
      if (onBar && dist <= inner) color = CREAM;

      put(png, x, y, color);
    }
  }
  return PNG.sync.write(png);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const { name, size, padded } of [
  { name: "icon-192.png", size: 192, padded: true },
  { name: "icon-512.png", size: 512, padded: true },
  { name: "apple-touch-icon.png", size: 180, padded: false },
]) {
  writeFileSync(join(OUT_DIR, name), makeIcon(size, { padded }));
  console.log("gerado:", name);
}
