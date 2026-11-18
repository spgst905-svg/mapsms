// Generates bundled WAV sounds into assets/sounds. Run: npm run sounds
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RATE = 22050;
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');
mkdirSync(out, { recursive: true });

/** notes: [freqHz, durationSec] ; freq 0 = silence */
function render(notes, { wave = 'sine', gain = 0.6 } = {}) {
  const chunks = [];
  for (const [freq, dur] of notes) {
    const n = Math.floor(RATE * dur);
    const buf = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      if (!freq) continue;
      const t = i / RATE;
      const env = Math.min(1, i / (RATE * 0.005), (n - i) / (RATE * 0.03));
      const ph = 2 * Math.PI * freq * t;
      const s = wave === 'square' ? Math.sign(Math.sin(ph)) * 0.5 : Math.sin(ph);
      buf[i] = s * env * gain;
    }
    chunks.push(buf);
  }
  return Buffer.concat(
    chunks.map((c) => {
      const b = Buffer.alloc(c.length * 2);
      c.forEach((v, i) => b.writeInt16LE(Math.round(v * 32767), i * 2));
      return b;
    }),
  );
}

function wav(pcm) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

const sounds = {
  beep: render([[880, 0.18]]),
  tick: render([[1500, 0.04]], { wave: 'square', gain: 0.4 }),
  chime: render([[784, 0.18], [1047, 0.35]]),
  bell: render([[660, 0.5], [0, 0.05], [660, 0.5]]),
  alarm: render(
    [[900, 0.15], [0, 0.05], [900, 0.15], [0, 0.05], [900, 0.15], [0, 0.05], [900, 0.3]],
    { wave: 'square', gain: 0.5 },
  ),
  digital: render([[1200, 0.08], [0, 0.04], [1600, 0.08]], { wave: 'square', gain: 0.45 }),
};

for (const [name, pcm] of Object.entries(sounds)) {
  writeFileSync(join(out, `${name}.wav`), wav(pcm));
  console.log('wrote', name);
}
