// Genera versiones AVIF y WebP de las fotos en varios anchos para los srcset.
// Fuente: public/assets/fotos/*.jpg  ->  Salida: public/img/<nombre>-<ancho>.<formato>
// Corre solo antes de `npm run dev` y `npm run build`. Se salta lo que ya está al día.

import { readdirSync, mkdirSync, statSync, existsSync } from 'node:fs';
import { join, parse } from 'node:path';
import sharp from 'sharp';

const ORIGEN = 'public/assets/fotos';
const DESTINO = 'public/img';
const ANCHOS = [400, 800, 1200];
const FORMATOS = { avif: { quality: 50 }, webp: { quality: 72 } };

mkdirSync(DESTINO, { recursive: true });

let generadas = 0;
for (const archivo of readdirSync(ORIGEN)) {
  if (!/\.(jpe?g|png)$/i.test(archivo)) continue;
  const ruta = join(ORIGEN, archivo);
  const { name } = parse(archivo);
  const fuenteMtime = statSync(ruta).mtimeMs;
  const { width } = await sharp(ruta).metadata();

  // No agrandamos: si la foto mide menos que el ancho, se usa su ancho real una sola vez.
  const anchos = [...new Set(ANCHOS.map((a) => Math.min(a, width)))];
  for (const ancho of anchos) {
    for (const [formato, opciones] of Object.entries(FORMATOS)) {
      const salida = join(DESTINO, `${name}-${ancho}.${formato}`);
      if (existsSync(salida) && statSync(salida).mtimeMs > fuenteMtime) continue;
      await sharp(ruta).resize({ width: ancho }).toFormat(formato, opciones).toFile(salida);
      generadas++;
    }
  }
}
console.log(`[imagenes] ${generadas} archivos generados en ${DESTINO}`);
