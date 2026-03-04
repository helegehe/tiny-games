const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.resolve(__dirname, '..', 'assets', 'images');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

function crcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
}
const CRC_TABLE = crcTable();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  const all = Buffer.concat([t, data]);
  crc.writeUInt32BE(crc32(all), 0);
  return Buffer.concat([len, all, crc]);
}

function writePng(file, w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y += 1) {
    const rowStart = y * (w * 4 + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < w; x += 1) {
      const p = (y * w + x) * 4;
      const d = rowStart + 1 + x * 4;
      raw[d] = rgba[p];
      raw[d + 1] = rgba[p + 1];
      raw[d + 2] = rgba[p + 2];
      raw[d + 3] = rgba[p + 3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = zlib.deflateSync(raw, { level: 9 });

  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
  fs.writeFileSync(file, png);
}

function fillRect(rgba, w, h, x, y, rw, rh, color) {
  for (let j = y; j < y + rh; j += 1) {
    if (j < 0 || j >= h) continue;
    for (let i = x; i < x + rw; i += 1) {
      if (i < 0 || i >= w) continue;
      const p = (j * w + i) * 4;
      rgba[p] = color[0];
      rgba[p + 1] = color[1];
      rgba[p + 2] = color[2];
      rgba[p + 3] = color[3];
    }
  }
}

function gradient(w, h, c1, c2, c3) {
  const rgba = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    const t = y / (h - 1);
    const a = t < 0.5 ? t * 2 : (t - 0.5) * 2;
    const cA = t < 0.5 ? c1 : c2;
    const cB = t < 0.5 ? c2 : c3;
    for (let x = 0; x < w; x += 1) {
      const p = (y * w + x) * 4;
      rgba[p] = Math.round(cA[0] * (1 - a) + cB[0] * a);
      rgba[p + 1] = Math.round(cA[1] * (1 - a) + cB[1] * a);
      rgba[p + 2] = Math.round(cA[2] * (1 - a) + cB[2] * a);
      rgba[p + 3] = 255;
    }
  }
  return rgba;
}

function circle(rgba, w, h, cx, cy, r, color) {
  const rr = r * r;
  for (let y = Math.max(0, cy - r); y < Math.min(h, cy + r); y += 1) {
    for (let x = Math.max(0, cx - r); x < Math.min(w, cx + r); x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy > rr) continue;
      const p = (y * w + x) * 4;
      rgba[p] = Math.round((rgba[p] * (255 - color[3]) + color[0] * color[3]) / 255);
      rgba[p + 1] = Math.round((rgba[p + 1] * (255 - color[3]) + color[1] * color[3]) / 255);
      rgba[p + 2] = Math.round((rgba[p + 2] * (255 - color[3]) + color[2] * color[3]) / 255);
      rgba[p + 3] = 255;
    }
  }
}

function buildTitleBg() {
  const w = 750;
  const h = 1334;
  const rgba = gradient(w, h, [255, 215, 181], [255, 233, 246], [211, 247, 255]);
  circle(rgba, w, h, 88, 130, 80, [255, 255, 255, 80]);
  circle(rgba, w, h, 680, 96, 110, [255, 255, 255, 60]);
  circle(rgba, w, h, 670, 1160, 140, [255, 255, 255, 50]);
  writePng(path.join(OUT, 'title_bg.png'), w, h, rgba);
}

function buildButton() {
  const w = 320;
  const h = 88;
  const rgba = new Uint8Array(w * h * 4);
  fillRect(rgba, w, h, 0, 0, w, h, [9, 64, 143, 255]);
  fillRect(rgba, w, h, 4, 4, w - 8, h - 8, [0, 119, 255, 255]);
  writePng(path.join(OUT, 'button_primary.png'), w, h, rgba);
}

function buildCard() {
  const w = 220;
  const h = 160;
  const rgba = new Uint8Array(w * h * 4);
  fillRect(rgba, w, h, 0, 0, w, h, [51, 68, 80, 255]);
  fillRect(rgba, w, h, 4, 4, w - 8, h - 8, [255, 255, 255, 255]);
  writePng(path.join(OUT, 'card_placeholder.png'), w, h, rgba);
}

function buildCoin() {
  const w = 128;
  const h = 128;
  const rgba = new Uint8Array(w * h * 4);
  fillRect(rgba, w, h, 0, 0, w, h, [0, 0, 0, 0]);
  circle(rgba, w, h, 64, 64, 58, [204, 154, 0, 255]);
  circle(rgba, w, h, 64, 64, 52, [255, 216, 74, 255]);
  fillRect(rgba, w, h, 56, 34, 16, 56, [143, 90, 0, 255]);
  fillRect(rgba, w, h, 46, 58, 36, 12, [143, 90, 0, 255]);
  writePng(path.join(OUT, 'icon_coin.png'), w, h, rgba);
}

buildTitleBg();
buildButton();
buildCard();
buildCoin();
console.log('png assets generated');
