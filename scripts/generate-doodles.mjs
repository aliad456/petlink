// Generates public/doodles.svg — the repeating pet-doodle wallpaper
// (WhatsApp-chat style). Used as a CSS mask, so the color comes from CSS.
// Run: node scripts/generate-doodles.mjs
import { writeFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as icons from "lucide-react";

const NAMES = [
  "PawPrint", "Bone", "Fish", "Cat", "Dog", "Bird", "Rabbit", "Turtle",
  "Heart", "Squirrel", "Feather", "Carrot", "Cookie", "House", "Drumstick",
  "Egg", "Shell", "Snail", "Star", "Leaf", "Volleyball", "Footprints", "Rat", "Sparkle",
];

const TILE = 480;
const CELLS = 7; // 7×7 jittered grid
const CELL = TILE / CELLS;

// Deterministic PRNG so the file doesn't change on every run.
let seed = 20260924;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 2 ** 32;
  return seed / 2 ** 32;
};

// Inner <path>/<circle>/… markup of a 24×24 lucide icon.
function inner(name) {
  const svg = renderToStaticMarkup(createElement(icons[name], { size: 24 }));
  return svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
}

const order = [...NAMES].sort(() => rand() - 0.5);
const parts = [];
let i = 0;
for (let row = 0; row < CELLS; row++) {
  for (let col = 0; col < CELLS; col++) {
    const name = order[i++ % order.length];
    const size = 20 + rand() * 12; // 20–32px
    const scale = size / 24;
    const x = col * CELL + (CELL - size) / 2 + (rand() - 0.5) * CELL * 0.35;
    const y = row * CELL + (CELL - size) / 2 + (rand() - 0.5) * CELL * 0.35;
    const rotate = (rand() - 0.5) * 60;
    parts.push(
      `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rotate.toFixed(1)} ${(size / 2).toFixed(1)} ${(size / 2).toFixed(1)}) scale(${scale.toFixed(3)})">${inner(name)}</g>`,
    );
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}" viewBox="0 0 ${TILE} ${TILE}" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${parts.join("")}</svg>\n`;
writeFileSync(new URL("../public/doodles.svg", import.meta.url), svg);
console.log(`public/doodles.svg: ${parts.length} doodles, ${(svg.length / 1024).toFixed(1)} KB`);
