/**
 * Generates every icon Postbox ships from ONE drawing of the mark.
 *
 *   node scripts/generate-icons.mjs
 *
 * Writes:
 *   app/icon.svg              the browser-tab favicon (vector)
 *   app/favicon.ico           16, 32 and 48px, for /favicon.ico requests
 *   app/apple-icon.png        180px, iOS home screen (full bleed; iOS rounds it)
 *   public/icon-192.png       PWA "any" icons (rounded plate)
 *   public/icon-512.png
 *   public/icon-maskable-192.png   PWA "maskable" (full bleed, mark in the
 *   public/icon-maskable-512.png   central safe zone so a circle crop keeps it)
 *
 * ── WHY ──
 * Until 21 Nov 2026 the favicon was a single near-black speech bubble from
 * before the brand went green, while the logo on every page is two messages
 * in green; and /favicon.ico, which browsers and Google ask for by default,
 * was a 404. The PWA and Apple icons were hand-made copies of the old one.
 * One script means the next palette change is one edit and one command, not
 * six files somebody has to remember.
 *
 * ── THE DESIGN ──
 * The two-message mark from components/Logo.tsx, on a plate of the brand
 * green (--accent in light, #174a33): the front message white, the rear one
 * the dark theme's light green (#8fd4ac), the thread lines cut through to the
 * plate. A plate, not a bare mark, because a favicon sits on tab strips of
 * every colour; the old single-colour mark needed a dark-mode media query and
 * still vanished on some.
 *
 * Literal colours on purpose: an icon is its own document and cannot read
 * globals.css. Keep them in step with --accent and the dark --accent there.
 */
import sharp from "sharp";
import { writeFileSync } from "node:fs";

const PLATE = "#174a33"; // --accent, light theme
const FRONT = "#ffffff"; // --on-accent, light theme
const REAR = "#8fd4ac"; // --accent, dark theme

// The mark's paths, exactly as in components/Logo.tsx (64x64 box).
const MARK = `
  <path fill="${REAR}" d="M16 10H51C53.21 10 55 11.79 55 14V35C55 37.21 53.21 39 51 39H24L16 47V10Z"/>
  <path fill="${FRONT}" d="M9 19H44C46.21 19 48 20.79 48 23V50C48 52.21 46.21 54 44 54H9C6.79 54 5 52.21 5 50V23C5 20.79 6.79 19 9 19Z"/>
  <path fill="${PLATE}" d="M13 29H40V33H13Z"/>
  <path fill="${PLATE}" d="M13 38H34V42H13Z"/>`;

/**
 * The mark on a plate. `scale` is how much of the box the mark fills;
 * `radius` rounds the plate (0 = full bleed, for platforms that mask it).
 * The mark's own box runs 5..55 by 10..54, so it is centred on (30, 32).
 */
function svg({ scale, radius, title = true }) {
  const t = `translate(32 32) scale(${scale}) translate(-30 -32)`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"${title ? ' role="img" aria-label="Postbox"' : ""}>
  <rect width="64" height="64" rx="${radius}" fill="${PLATE}"/>
  <g transform="${t}">${MARK}
  </g>
</svg>
`;
}

// The tab icon and the "any" PWA icons: rounded plate, mark nearly filling it.
const ROUNDED = svg({ scale: 0.86, radius: 14 });
// Full bleed with the mark inside the maskable safe zone (the central 80%).
const MASKABLE = svg({ scale: 0.62, radius: 0, title: false });
// iOS rounds the corners itself and shows transparency as black.
const APPLE = svg({ scale: 0.74, radius: 0, title: false });

const png = (source, size) =>
  sharp(Buffer.from(source), { density: 384 }).resize(size, size).png().toBuffer();

/** An .ico holding PNG images (supported by every browser since IE11). */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + images.length * 16;
  for (const { size, data } of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2); // palette
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

writeFileSync("app/icon.svg", ROUNDED);
writeFileSync(
  "app/favicon.ico",
  ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(ROUNDED, size) })))),
);
writeFileSync("app/apple-icon.png", await png(APPLE, 180));
writeFileSync("public/icon-192.png", await png(ROUNDED, 192));
writeFileSync("public/icon-512.png", await png(ROUNDED, 512));
writeFileSync("public/icon-maskable-192.png", await png(MASKABLE, 192));
writeFileSync("public/icon-maskable-512.png", await png(MASKABLE, 512));
console.log("icons written");
