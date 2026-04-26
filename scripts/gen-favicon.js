// Generates public/favicon.ico — run once with: node scripts/gen-favicon.js
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// CRC32
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

// Draw 32x32 RGBA: black circle bg + white crescent
const SIZE = 32;
const raw = Buffer.alloc(SIZE * SIZE * 4, 0);

const bgCx = 16, bgCy = 16, bgR = 15.5;
const moonCx = 16, moonCy = 16, moonR = 12;
const cutCx = 21.5, cutCy = 16, cutR = 10.5;

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const i = (y * SIZE + x) * 4;
    const inBg   = (x-bgCx)**2   + (y-bgCy)**2   <= bgR**2;
    const inMoon = (x-moonCx)**2 + (y-moonCy)**2 <= moonR**2;
    const inCut  = (x-cutCx)**2  + (y-cutCy)**2  <= cutR**2;
    if (!inBg) continue;
    raw[i+3] = 255;
    if (inMoon && !inCut) { raw[i] = 255; raw[i+1] = 255; raw[i+2] = 255; }
    // else black (already 0,0,0)
  }
}

// PNG filter: prepend 0x00 (None) to each row
const scanlines = Buffer.alloc(SIZE * (1 + SIZE * 4));
for (let y = 0; y < SIZE; y++) {
  scanlines[y * (1 + SIZE*4)] = 0;
  raw.copy(scanlines, y * (1 + SIZE*4) + 1, y * SIZE*4, (y+1) * SIZE*4);
}

const idat = zlib.deflateSync(scanlines);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0); ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; ihdr[9] = 6; // 8-bit depth, RGBA

const png = Buffer.concat([
  Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', idat),
  chunk('IEND', Buffer.alloc(0)),
]);

// ICO: header + 1 directory entry + PNG data
const icoHdr = Buffer.alloc(6);
icoHdr.writeUInt16LE(0, 0); icoHdr.writeUInt16LE(1, 2); icoHdr.writeUInt16LE(1, 4);

const dir = Buffer.alloc(16);
dir[0] = 32; dir[1] = 32; dir[2] = 0; dir[3] = 0;
dir.writeUInt16LE(1, 4); dir.writeUInt16LE(32, 6);
dir.writeUInt32LE(png.length, 8);
dir.writeUInt32LE(22, 12); // 6 + 16

fs.writeFileSync(path.join(__dirname, '..', 'public', 'favicon.ico'), Buffer.concat([icoHdr, dir, png]));
console.log('public/favicon.ico written');
