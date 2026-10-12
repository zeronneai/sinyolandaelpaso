// Boleto de la reserva: versión HTML (estilo boleto de cine) y versión
// imagen PNG (estilo carta de lotería) para guardar en el celular.

import { qrSVG, qrPNG } from './qr.js';
import { esc, fechaLarga, hora, urlSitio } from './ui.js';
import { mesaPorId, nombreZona } from './disponibilidad.js';

export const urlTuNoche = (folio) => urlSitio(`/tu-noche/?folio=${encodeURIComponent(folio)}`);

export async function htmlBoleto(r) {
  const mesa = mesaPorId(r.mesa_id);
  const svg = await qrSVG(urlTuNoche(r.folio));
  return `
  <article class="boleto" aria-label="Boleto de tu reserva">
    <header class="boleto__cabeza">
      <span class="logo" role="img" aria-label="Sin Yolanda El Paso"></span>
      <p class="boleto__admite">Admite ${r.personas} ${r.personas === 1 ? 'persona' : 'personas'}</p>
    </header>
    <div class="boleto__cuerpo">
      <div>
        <p class="boleto__dato">Fecha</p>
        <p class="boleto__valor">${esc(fechaLarga(r.fecha))}</p>
        <p class="boleto__dato">Hora</p>
        <p class="boleto__valor">${esc(hora(r.hora))}</p>
        <p class="boleto__dato">Mesa</p>
        <p class="boleto__valor">${mesa ? `${mesa.numero} · ${esc(nombreZona(mesa.zona))}` : 'La arma el host'}</p>
      </div>
      <div class="boleto__qr">${svg}</div>
    </div>
    <footer class="boleto__pie">
      <span>${esc(r.nombre.split(' ')[0])}</span>
      <span class="boleto__folio">${esc(r.folio)}</span>
    </footer>
  </article>`;
}

let logoMostaza = null;
async function cargarLogo() {
  if (logoMostaza) return logoMostaza;
  const svg = await fetch('/assets/logos/sinyolanda-wordmark.svg').then((r) => r.text());
  const url = URL.createObjectURL(new Blob([svg.replace(/currentColor/g, '#E0A63A')], { type: 'image/svg+xml' }));
  logoMostaza = await cargarImagen(url);
  return logoMostaza;
}
const cargarImagen = (src) =>
  new Promise((ok, mal) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = mal;
    i.src = src;
  });

function textoAjustado(ctx, texto, x, y, maxAncho, tam, fuente) {
  let t = tam;
  ctx.font = `${t}px ${fuente}`;
  while (ctx.measureText(texto).width > maxAncho && t > 20) {
    t -= 2;
    ctx.font = `${t}px ${fuente}`;
  }
  ctx.fillText(texto, x, y);
}

/** Genera el PNG del boleto (1080 x 1500) estilo carta de lotería. */
export async function boletoPNG(r) {
  await Promise.all([document.fonts.load('80px Anton'), document.fonts.load('40px "Bebas Neue"'), document.fonts.load('30px "Special Elite"')]);
  const W = 1080, H = 1500;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d');
  const mesa = mesaPorId(r.mesa_id);

  // Marco de carta
  x.fillStyle = '#FBF1DD';
  x.fillRect(0, 0, W, H);
  x.strokeStyle = '#3B1F14';
  x.lineWidth = 18;
  x.strokeRect(30, 30, W - 60, H - 60);
  x.lineWidth = 4;
  x.strokeRect(62, 62, W - 124, H - 124);

  // Panel terracota con rayos
  const px = 90, py = 160, pw = W - 180, ph = 760;
  x.save();
  x.beginPath();
  x.rect(px, py, pw, ph);
  x.clip();
  x.fillStyle = '#C4502A';
  x.fillRect(px, py, pw, ph);
  x.fillStyle = 'rgba(142,58,30,.55)';
  const cx = W / 2, cy = py + ph / 2;
  for (let i = 0; i < 24; i++) {
    const a = (i * Math.PI * 2) / 24;
    x.beginPath();
    x.moveTo(cx, cy);
    x.arc(cx, cy, 1200, a, a + Math.PI / 24);
    x.closePath();
    x.fill();
  }
  x.restore();
  x.strokeStyle = '#3B1F14';
  x.lineWidth = 6;
  x.strokeRect(px, py, pw, ph);

  // Número de carta (la mesa) y "folio"
  x.fillStyle = '#3B1F14';
  x.font = '80px Anton';
  x.textAlign = 'left';
  x.fillText(mesa ? String(mesa.numero) : '★', 96, 140);
  x.textAlign = 'right';
  x.font = '34px "Special Elite"';
  x.fillText(r.folio, W - 96, 128);

  // Logo
  const logo = await cargarLogo();
  const lw = 700, lh = (lw * logo.height) / logo.width;
  x.drawImage(logo, (W - lw) / 2, py + 50, lw, lh);

  // QR
  const qr = await cargarImagen(await qrPNG(urlTuNoche(r.folio), 500));
  const q = 330;
  x.fillStyle = '#fff';
  x.fillRect((W - q) / 2 - 16, py + 330, q + 32, q + 32);
  x.drawImage(qr, (W - q) / 2, py + 346, q, q);

  // Nombre de la carta
  x.textAlign = 'center';
  x.fillStyle = '#3B1F14';
  textoAjustado(x, `LA NOCHE DE ${r.nombre.split(' ')[0].toUpperCase()}`, W / 2, 1020, W - 200, 96, 'Anton');

  x.font = '52px "Bebas Neue"';
  x.fillStyle = '#8E3A1E';
  x.fillText(`${fechaLarga(r.fecha).toUpperCase()} · ${hora(r.hora)}`, W / 2, 1100);
  x.fillText(`${r.personas} ${r.personas === 1 ? 'PERSONA' : 'PERSONAS'}${mesa ? ` · MESA ${mesa.numero} · ${nombreZona(mesa.zona).toUpperCase()}` : ''}`, W / 2, 1168);

  x.font = '36px "Special Elite"';
  x.fillStyle = '#3B1F14';
  x.fillText('Aquí no se llora, aquí se canta.', W / 2, 1270);
  x.font = '40px "Bebas Neue"';
  x.fillText('340 VIN RAMBLA DR · EL PASO, TX · @SINYOLANDAELPASO', W / 2, 1360);

  return new Promise((ok) => c.toBlob(ok, 'image/png'));
}

export async function descargarBoleto(r) {
  const blob = await boletoPNG(r);
  const archivo = new File([blob], `boleto-${r.folio}.png`, { type: 'image/png' });
  if (navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: 'Mi boleto de Sin Yolanda' });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = archivo.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
