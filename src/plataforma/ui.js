// Utilidades de interfaz compartidas por todas las páginas de la plataforma.

import { ENV } from './entorno.js';
import { modo, alReiniciar } from './datos.js';
import { formatoHora } from '../js/horario.js';

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

export const esc = (s = '') =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Banner de modo demo y aviso de modo local. Llamar una vez por página. */
export function iniciarPlataforma({ recargar } = {}) {
  if (ENV.demo && !$('.banner-demo')) {
    const b = document.createElement('div');
    b.className = 'banner-demo';
    b.setAttribute('role', 'note');
    b.innerHTML = 'MODO DEMO · pagos simulados';
    document.body.prepend(b);
  }
  if (modo === 'local' && !$('.aviso-local')) {
    const a = document.createElement('p');
    a.className = 'aviso-local';
    a.innerHTML =
      '<span aria-hidden="true">●</span> Modo local: sin Supabase, los cambios solo se ven en las pestañas de este navegador.';
    document.body.append(a);
  }
  if (recargar) alReiniciar(() => recargar());
}

/* ---------- Fechas ---------- */
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const fechaDate = (iso) => new Date(`${iso}T12:00:00Z`);
/** '2026-10-17' -> 'sábado 17 de octubre' */
export function fechaLarga(iso) {
  const f = fechaDate(iso);
  return `${DIAS[f.getUTCDay()]} ${f.getUTCDate()} de ${MESES[f.getUTCMonth()]}`;
}
/** '2026-10-17' -> 'sáb 17 oct' */
export function fechaCorta(iso) {
  const f = fechaDate(iso);
  return `${DIAS[f.getUTCDay()].slice(0, 3)} ${f.getUTCDate()} ${MESES[f.getUTCMonth()].slice(0, 3)}`;
}
export const hora = (hhmm) => formatoHora(hhmm);
export { DIAS as DIAS_ES, MESES as MESES_ES };

/** Minutos desde un ISO hasta ahora. */
export const minutosDesde = (iso) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
export function haceCuanto(iso) {
  const m = minutosDesde(iso);
  if (m < 1) return 'ahorita';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return d === 1 ? 'ayer' : `hace ${d} días`;
  }
  return `hace ${h} h ${m % 60} min`;
}

/* ---------- Toasts ---------- */
export function toast(texto, { tipo = 'info', icono = null, duracion = 5000 } = {}) {
  let zona = $('.toasts');
  if (!zona) {
    zona = document.createElement('div');
    zona.className = 'toasts';
    zona.setAttribute('role', 'status');
    zona.setAttribute('aria-live', 'polite');
    document.body.append(zona);
  }
  const t = document.createElement('div');
  t.className = `toast toast--${tipo}`;
  t.innerHTML = `${icono ? `<svg aria-hidden="true"><use href="#i-${icono}"/></svg>` : ''}<span>${texto}</span>`;
  zona.append(t);
  requestAnimationFrame(() => t.classList.add('toast--visible'));
  setTimeout(() => {
    t.classList.remove('toast--visible');
    setTimeout(() => t.remove(), 400);
  }, duracion);
  return t;
}

/* ---------- Sonido corto (sin archivos) ---------- */
let audioCtx = null;
export function sonar(tipo = 'ding') {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    const notas = { ding: [880, 1320], alerta: [660, 440, 660], brindis: [523, 659, 784, 1046] }[tipo] || [880];
    notas.forEach((f, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      const t0 = audioCtx.currentTime + i * 0.12;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
      o.connect(g).connect(audioCtx.destination);
      o.start(t0);
      o.stop(t0 + 0.3);
    });
  } catch (e) {}
}

/* ---------- Links útiles ---------- */
export const linkWhatsApp = (telefono, texto) =>
  `https://wa.me/${String(telefono || '').replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`;

export function linkUber(direccion = '340 Vin Rambla Dr, El Paso, TX') {
  const p = new URLSearchParams({
    action: 'setPickup',
    pickup: 'my_location',
    'dropoff[nickname]': 'Sin Yolanda El Paso',
    'dropoff[formatted_address]': direccion,
  });
  return `https://m.uber.com/ul/?${p}`;
}

/** Link de Google Calendar para una reserva. */
export function linkCalendario({ fecha, hora: hhmm, titulo, detalles, lugar }) {
  const [h, m] = hhmm.split(':').map(Number);
  const inicio = `${fecha.replace(/-/g, '')}T${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}00`;
  const finH = (h + 2) % 24;
  const finFecha = h + 2 >= 24 ? sumarDias(fecha, 1) : fecha;
  const fin = `${finFecha.replace(/-/g, '')}T${String(finH).padStart(2, '0')}${String(m).padStart(2, '0')}00`;
  const p = new URLSearchParams({ action: 'TEMPLATE', text: titulo, dates: `${inicio}/${fin}`, details: detalles, location: lugar, ctz: 'America/Denver' });
  return `https://calendar.google.com/calendar/render?${p}`;
}

export function sumarDias(iso, dias) {
  const f = fechaDate(iso);
  f.setUTCDate(f.getUTCDate() + dias);
  return f.toISOString().slice(0, 10);
}

/** URL absoluta dentro del sitio (para QR y links compartidos). */
export const urlSitio = (ruta) => new URL(ruta, window.location.origin).href;

/** Analítica: GA4 y Meta Pixel si están cargados (IDs en config.js). */
export function track(evento, datos = {}) {
  try {
    window.gtag?.('event', evento, datos);
    if (evento === 'reserva_enviada') window.fbq?.('track', 'Lead', datos);
  } catch (e) {}
}

/** Origen de la visita: ?utm_source=, ?src= o el código de un creador. */
export function fuente() {
  const p = new URLSearchParams(location.search);
  const f = p.get('utm_source') || p.get('src');
  if (f) {
    try { sessionStorage.setItem('sy-fuente', f); } catch (e) {}
    return f;
  }
  try { return sessionStorage.getItem('sy-fuente') || 'directo'; } catch (e) { return 'directo'; }
}
