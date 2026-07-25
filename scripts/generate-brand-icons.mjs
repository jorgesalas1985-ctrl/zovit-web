/**
 * Genera favicon.ico + iconos PNG estáticos de marca ZOVIT.
 * Diseño circular con degradado (se ve bien en el recorte redondo de Google).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function brandSvg(size) {
  const fontSize = Math.round(size * 0.58);
  const stroke = Math.max(1, Math.round(size * 0.04));
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#a855f7"/>
      <stop offset="45%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
    <radialGradient id="shine" cx="32%" cy="28%" r="65%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.35)"/>
      <stop offset="55%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
  </defs>
  <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="url(#g)"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="url(#shine)"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - stroke}" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="${stroke}"/>
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
    font-family="Arial Black, Arial, Helvetica, sans-serif"
    font-size="${fontSize}" font-weight="900" fill="#ffffff"
    letter-spacing="-1">${"Z"}</text>
</svg>`);
}

async function png(size) {
  return sharp(brandSvg(size)).png({ compressionLevel: 9 }).toBuffer();
}

/** ICO simple con varias PNG embebidas (Vista+). */
function pngsToIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6 + count * 16;
  let offset = headerSize;
  const entries = [];

  for (const buf of pngBuffers) {
    const meta = sharp(buf); // validated below via meta sync not available; use PNG IHDR
    // width/height from PNG IHDR
    const width = buf[16] * 256 + buf[17] > 255 ? 0 : buf[16] * 256 + buf[17];
    const height = buf[20] * 256 + buf[21] > 255 ? 0 : buf[20] * 256 + buf[21];
    // Prefer reading via DataView for reliability
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    entries.push({
      width: w >= 256 ? 0 : w,
      height: h >= 256 ? 0 : h,
      size: buf.length,
      offset,
      buf,
    });
    offset += buf.length;
    void width;
    void height;
    void meta;
  }

  const out = Buffer.alloc(offset);
  out.writeUInt16LE(0, 0); // reserved
  out.writeUInt16LE(1, 2); // icon type
  out.writeUInt16LE(count, 4);

  let dir = 6;
  for (const entry of entries) {
    out.writeUInt8(entry.width, dir);
    out.writeUInt8(entry.height, dir + 1);
    out.writeUInt8(0, dir + 2); // palette
    out.writeUInt8(0, dir + 3);
    out.writeUInt16LE(1, dir + 4); // planes
    out.writeUInt16LE(32, dir + 6); // bit count
    out.writeUInt32LE(entry.size, dir + 8);
    out.writeUInt32LE(entry.offset, dir + 12);
    dir += 16;
  }

  for (const entry of entries) {
    entry.buf.copy(out, entry.offset);
  }
  return out;
}

async function main() {
  const sizes = {
    favicon: [16, 32, 48],
    apple: 180,
    icon192: 192,
    icon512: 512,
    appIcon: 64,
  };

  const favPngs = [];
  for (const s of sizes.favicon) {
    favPngs.push(await png(s));
  }
  const ico = pngsToIco(favPngs);

  const targets = [
    [join(root, "app", "favicon.ico"), ico],
    [join(root, "public", "favicon.ico"), ico],
    [join(root, "public", "icon-192.png"), await png(sizes.icon192)],
    [join(root, "public", "icon-512.png"), await png(sizes.icon512)],
    [join(root, "public", "apple-touch-icon.png"), await png(sizes.apple)],
    [join(root, "app", "icon.png"), await png(sizes.appIcon)],
    [join(root, "app", "apple-icon.png"), await png(sizes.apple)],
  ];

  for (const [path, data] of targets) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, data);
    console.log("wrote", path, data.length);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
