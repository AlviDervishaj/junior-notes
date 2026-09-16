// Generates an 11x11 dot tile for the Kraft & Ink dot-grid paper.
// Pure Node — zlib and a local crc32 only, no dependencies.
//
// React Native has no radial-gradient and a View-per-dot would be thousands of
// nodes, so the grid is a repeating image tile (resizeMode="repeat").
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const PITCH = 11; // points; must match Layout.dotSpacing
const RADIUS = 0.9; // points

// One variant per scheme. Colours must match Palette.rule / PaletteDark.rule
// in src/theme/colors.ts.
const VARIANTS = [
  { suffix: '', dot: [0xd6, 0xc8, 0xac] },
  { suffix: '-dark', dot: [0x3a, 0x31, 0x25] },
];

// One tile per screen density, so the dots stay crisp instead of being
// upscaled from the 1x bitmap on 2x/3x displays.
const DENSITIES = [1, 2, 3];

const table = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = table[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

function makeTile(scale, dot) {
  const size = PITCH * scale;
  const radius = RADIUS * scale;
  const centre = 1.5 * scale;

  // RGBA raw scanlines, each prefixed with filter byte 0.
  const raw = [];
  for (let y = 0; y < size; y++) {
    raw.push(0);
    for (let x = 0; x < size; x++) {
      const dist = Math.hypot(x - centre, y - centre);
      // Feather the edge by roughly one device pixel for a soft printed dot.
      const alpha = dist <= radius ? 255 : dist <= radius + 0.7 * scale ? 110 : 0;
      raw.push(dot[0], dot[1], dot[2], alpha);
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.from(raw), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('assets/images', { recursive: true });
for (const variant of VARIANTS) {
  for (const scale of DENSITIES) {
    const density = scale === 1 ? '' : `@${scale}x`;
    const path = `assets/images/dot-grid${variant.suffix}${density}.png`;
    const png = makeTile(scale, variant.dot);
    writeFileSync(path, png);
    console.log(`wrote ${path} (${PITCH * scale}x${PITCH * scale}, ${png.length} bytes)`);
  }
}
