// Genera el icono y splash de Diaria: «sol sobre línea» — sol ámbar suave
// con resplandor sobre fondo tinta y una fina línea-horizonte. Node puro,
// sin dependencias: PNG con el zlib integrado, bordes suaves por
// supersampling ×4. Re-ejecutable (como scripts/generar-alarma).
//
// Uso: node scripts/generar-icono.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const TINTA = [0x1b, 0x24, 0x30]; // #1B2430
const AMBAR = [0xde, 0x9e, 0x38]; // #DE9E38
const AMBAR_CLARO = [0xf0, 0xc9, 0x86]; // resplandor
const SS = 4; // supersampling

function mezclar(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

// Color de un punto (x,y) en [0,1] del icono. fondo=false → transparente
// fuera del sol (para el foreground adaptativo y el splash).
function colorEn(u, v, opciones) {
  const { fondo } = opciones;
  const cx = 0.5;
  const cy = 0.46; // sol ligeramente por encima del centro
  const r = 0.2; // radio del disco
  const d = Math.hypot(u - cx, v - cy);

  // horizonte: línea fina bajo el sol
  const yHor = 0.68;
  const grosorHor = 0.006;
  const anchoHor = 0.30; // media anchura
  const enHorizonte =
    Math.abs(v - yHor) < grosorHor && Math.abs(u - cx) < anchoHor;

  let color = null; // null = transparente
  if (fondo) color = TINTA;

  // resplandor (halo) del sol
  if (d < r * 2.1) {
    const t = Math.max(0, 1 - (d - r) / (r * 1.1));
    if (d >= r) {
      const halo = mezclar(TINTA, AMBAR, 0.18 * t);
      color = fondo ? halo : d < r * 1.5 ? [...AMBAR, Math.round(60 * t)] : color;
    }
  }
  // disco del sol (degradado suave ámbar → ámbar claro arriba)
  if (d < r) {
    const grad = Math.max(0, Math.min(1, (cy - v) / r + 0.5));
    color = mezclar(AMBAR, AMBAR_CLARO, grad * 0.5);
  }
  // horizonte ámbar
  if (enHorizonte) color = AMBAR;

  return color;
}

function generar(destino, tam, opciones) {
  const canal = 4; // RGBA
  const buffer = Buffer.alloc(tam * tam * canal);

  for (let y = 0; y < tam; y++) {
    for (let x = 0; x < tam; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      // supersampling
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / tam;
          const v = (y + (sy + 0.5) / SS) / tam;
          const c = colorEn(u, v, opciones);
          if (c) {
            const alpha = c.length === 4 ? c[3] : 255;
            r += c[0] * alpha;
            g += c[1] * alpha;
            b += c[2] * alpha;
            a += alpha;
          }
        }
      }
      const n = SS * SS;
      const off = (y * tam + x) * canal;
      if (a > 0) {
        buffer[off] = Math.round(r / a);
        buffer[off + 1] = Math.round(g / a);
        buffer[off + 2] = Math.round(b / a);
        buffer[off + 3] = Math.round(a / n);
      } else {
        buffer[off + 3] = 0;
      }
    }
  }

  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, codificarPNG(buffer, tam, tam));
  console.log('OK', path.basename(destino), `${tam}²`);
}

// PNG mínimo (RGBA, sin filtros) comprimido con zlib.
function codificarPNG(rgba, ancho, alto) {
  const filas = Buffer.alloc((ancho * 4 + 1) * alto);
  for (let y = 0; y < alto; y++) {
    filas[y * (ancho * 4 + 1)] = 0; // filtro None
    rgba.copy(filas, y * (ancho * 4 + 1) + 1, y * ancho * 4, (y + 1) * ancho * 4);
  }
  const idat = zlib.deflateSync(filas, { level: 9 });

  const trozo = (tipo, datos) => {
    const largo = Buffer.alloc(4);
    largo.writeUInt32BE(datos.length, 0);
    const tipoBuf = Buffer.from(tipo, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([tipoBuf, datos])) >>> 0, 0);
    return Buffer.concat([largo, tipoBuf, datos, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(ancho, 0);
  ihdr.writeUInt32BE(alto, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    trozo('IHDR', ihdr),
    trozo('IDAT', idat),
    trozo('IEND', Buffer.alloc(0)),
  ]);
}

const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = TABLA_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const ASSETS = path.join(__dirname, '..', 'assets', 'images');
// icono de app y favicon: con fondo tinta
generar(path.join(ASSETS, 'icon.png'), 1024, { fondo: true });
generar(path.join(ASSETS, 'favicon.png'), 96, { fondo: true });
// foreground adaptativo y splash: sol sobre transparente (el fondo lo pone
// adaptiveIcon.backgroundColor / el color del splash plugin)
generar(path.join(ASSETS, 'android-icon-foreground.png'), 1024, { fondo: false });
generar(path.join(ASSETS, 'splash-icon.png'), 512, { fondo: false });
console.log('Icono «sol sobre línea» generado.');
