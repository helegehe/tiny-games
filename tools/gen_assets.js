const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const AUDIO_DIR = path.join(ROOT, 'assets', 'audio');
const IMG_DIR = path.join(ROOT, 'assets', 'images');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function writeWav(filePath, samples, sampleRate = 22050) {
  const numSamples = samples.length;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i += 1) {
    let v = samples[i];
    if (v > 1) v = 1;
    if (v < -1) v = -1;
    buffer.writeInt16LE(Math.floor(v * 32767), 44 + i * 2);
  }

  fs.writeFileSync(filePath, buffer);
}

function tone(freq, durSec, gain = 0.25, sampleRate = 22050) {
  const count = Math.floor(durSec * sampleRate);
  const arr = new Array(count);
  for (let i = 0; i < count; i += 1) {
    const t = i / sampleRate;
    const env = Math.exp(-3 * t / durSec);
    arr[i] = Math.sin(2 * Math.PI * freq * t) * gain * env;
  }
  return arr;
}

function silence(durSec, sampleRate = 22050) {
  return new Array(Math.floor(durSec * sampleRate)).fill(0);
}

function concat(parts) {
  return parts.reduce((acc, x) => acc.concat(x), []);
}

function chord(freqs, durSec, gain = 0.22, sampleRate = 22050) {
  const count = Math.floor(durSec * sampleRate);
  const arr = new Array(count);
  for (let i = 0; i < count; i += 1) {
    const t = i / sampleRate;
    const env = Math.exp(-2.8 * t / durSec);
    let sum = 0;
    for (let j = 0; j < freqs.length; j += 1) {
      sum += Math.sin(2 * Math.PI * freqs[j] * t);
    }
    arr[i] = (sum / freqs.length) * gain * env;
  }
  return arr;
}

function writeSvg(name, body) {
  fs.writeFileSync(path.join(IMG_DIR, name), body, 'utf8');
}

ensureDir(AUDIO_DIR);
ensureDir(IMG_DIR);

const ok = concat([tone(880, 0.08), tone(1175, 0.1)]);
const bad = concat([tone(190, 0.11, 0.28), tone(140, 0.11, 0.24)]);
const timeout = concat([tone(880, 0.06), silence(0.02), tone(880, 0.06), silence(0.02), tone(660, 0.12)]);
const levelup = concat([tone(520, 0.08), tone(660, 0.08), tone(780, 0.08), tone(1040, 0.14)]);
const gameover = concat([tone(540, 0.12), tone(420, 0.12), tone(300, 0.2)]);
const click = tone(720, 0.05, 0.2);
const bgm = concat([
  chord([262, 330, 392], 0.45, 0.12),
  chord([294, 370, 440], 0.45, 0.12),
  chord([330, 415, 494], 0.45, 0.12),
  chord([294, 370, 440], 0.45, 0.12)
]);

writeWav(path.join(AUDIO_DIR, 'click_ok.wav'), ok);
writeWav(path.join(AUDIO_DIR, 'click_bad.wav'), bad);
writeWav(path.join(AUDIO_DIR, 'timeout.wav'), timeout);
writeWav(path.join(AUDIO_DIR, 'level_up.wav'), levelup);
writeWav(path.join(AUDIO_DIR, 'game_over.wav'), gameover);
writeWav(path.join(AUDIO_DIR, 'tap.wav'), click);
writeWav(path.join(AUDIO_DIR, 'bgm_loop.wav'), bgm);

writeSvg('title_bg.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 750 1334"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="#ffd7b5"/><stop offset="50%" stop-color="#ffe9f6"/><stop offset="100%" stop-color="#d3f7ff"/></linearGradient></defs><rect width="750" height="1334" fill="url(#g)"/><circle cx="88" cy="130" r="80" fill="rgba(255,255,255,.35)"/><circle cx="680" cy="96" r="110" fill="rgba(255,255,255,.25)"/><circle cx="670" cy="1160" r="140" fill="rgba(255,255,255,.2)"/></svg>`);
writeSvg('button_primary.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 88"><rect x="2" y="2" width="316" height="84" rx="18" fill="#0077ff" stroke="#09408f" stroke-width="4"/><text x="160" y="56" fill="#fff" font-size="34" text-anchor="middle" font-family="sans-serif">按钮</text></svg>`);
writeSvg('card_placeholder.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 160"><rect x="3" y="3" width="214" height="154" rx="16" fill="#ffffff" stroke="#334" stroke-width="4"/><text x="110" y="76" fill="#222" font-size="36" text-anchor="middle" font-family="sans-serif">图案</text><text x="110" y="120" fill="#667" font-size="18" text-anchor="middle" font-family="sans-serif">类别·颜色</text></svg>`);
writeSvg('icon_coin.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><circle cx="64" cy="64" r="56" fill="#ffd84a" stroke="#cc9a00" stroke-width="8"/><text x="64" y="79" text-anchor="middle" fill="#8f5a00" font-size="54" font-family="sans-serif">¥</text></svg>`);

console.log('assets generated');
