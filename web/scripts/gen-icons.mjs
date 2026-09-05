// 生成 QuickNote PWA 图标（192 / 512 / apple-touch-icon 180）
// 纯 Node 内置实现（zlib 手写 PNG 编码），无需任何第三方依赖。
// 用法：node web/scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

// ---------- PNG 编码 ----------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function encodePNG(w, h, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ---------- 绘制 ----------
const BG = [61, 107, 250]; // #3D6BFA
const FG = [255, 255, 255];

// 圆角矩形有符号距离（归一化坐标）
function rrSDF(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
}

// 三行“文字”杠（灵感：Markdown 段落）
const BARS = [
  { cy: 0.35, w: 0.60 },
  { cy: 0.50, w: 0.46 },
  { cy: 0.65, w: 0.32 }
];
const BAR_X0 = 0.20;
const BAR_H = 0.075;
const BAR_R = BAR_H / 2;

function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const SS = 4; // 4x4 超采样抗锯齿
  const outerR = 0.20;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let ar = 0, ag = 0, ab = 0, aa = 0; // 累加颜色（乘 alpha）
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const nx = (x + (sx + 0.5) / SS) / size;
          const ny = (y + (sy + 0.5) / SS) / size;
          // 外轮廓：整幅圆角方（maskable 友好）
          if (rrSDF(nx, ny, 0.5, 0.5, 0.5, 0.5, outerR) > 0) continue;
          let inside = false;
          for (const b of BARS) {
            const hw = b.w / 2;
            if (rrSDF(nx, ny, BAR_X0 + hw, b.cy, hw, BAR_H / 2, BAR_R) <= 0) {
              inside = true;
              break;
            }
          }
          const c = inside ? FG : BG;
          ar += c[0]; ag += c[1]; ab += c[2]; aa += 255;
        }
      }
      const n = SS * SS;
      const i = (y * size + x) * 4;
      rgba[i] = Math.round(ar / n);
      rgba[i + 1] = Math.round(ag / n);
      rgba[i + 2] = Math.round(ab / n);
      rgba[i + 3] = Math.round(aa / n);
    }
  }
  return rgba;
}

const targets = [
  [192, 'icon-192.png'],
  [512, 'icon-512.png'],
  [180, 'apple-touch-icon.png']
];

for (const [size, file] of targets) {
  writeFileSync(join(OUT, file), encodePNG(size, size, drawIcon(size)));
  console.log(`✓ ${file} (${size}x${size})`);
}
