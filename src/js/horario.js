// Utilidades de horario compartidas por el sitio, el formulario de reservas
// y el render del HTML en build. Sin dependencias del DOM.

import { CONFIG } from '../config.js';

export const DIAS = {
  es: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

const aMinutos = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** "16:00" -> "4 PM", "21:30" -> "9:30 PM" */
export function formatoHora(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const sufijo = h < 12 ? 'AM' : 'PM';
  return m ? `${h12}:${String(m).padStart(2, '0')} ${sufijo}` : `${h12} ${sufijo}`;
}

/** Filas para la tabla de horario, agrupando días consecutivos iguales. */
export function filasHorario(lang = 'es', horario = CONFIG.horario) {
  const orden = [1, 2, 3, 4, 5, 6, 0]; // lunes primero
  const y = lang === 'es' ? ' y ' : ' & ';
  const a = lang === 'es' ? ' a ' : ' to ';
  const cerrado = lang === 'es' ? 'Cerrado' : 'Closed';
  const filas = [];
  for (const d of orden) {
    const h = horario[d];
    const texto = h ? `${formatoHora(h.abre)}${a}${formatoHora(h.cierra)}` : cerrado;
    const ultima = filas[filas.length - 1];
    if (ultima && ultima.texto === texto && ultima.dias.length < 2) ultima.dias.push(d);
    else filas.push({ dias: [d], texto, cerrado: !h });
  }
  return filas.map((f) => ({
    ...f,
    etiqueta: f.dias.map((d) => DIAS[lang][d]).join(y),
  }));
}

/** Fecha y hora "de pared" actuales en El Paso. */
export function ahoraEnElPaso(fecha = new Date()) {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: CONFIG.zonaHoraria,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(fecha);
  const get = (t) => partes.find((p) => p.type === t).value;
  const dia = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { dia, minutos: Number(get('hour')) * 60 + Number(get('minute')) };
}

/**
 * Estado de apertura. Considera los cierres de madrugada: el sábado a la 1 AM
 * sigue abierto por el horario del viernes.
 */
export function estadoApertura(fecha = new Date(), horario = CONFIG.horario) {
  const { dia, minutos } = ahoraEnElPaso(fecha);

  const ayer = horario[(dia + 6) % 7];
  if (ayer && aMinutos(ayer.cierra) < aMinutos(ayer.abre) && minutos < aMinutos(ayer.cierra)) {
    return { abierto: true, cierra: ayer.cierra };
  }

  const hoy = horario[dia];
  if (hoy) {
    const abre = aMinutos(hoy.abre);
    let cierra = aMinutos(hoy.cierra);
    if (cierra < abre) cierra += 24 * 60;
    if (minutos >= abre && minutos < cierra) return { abierto: true, cierra: hoy.cierra };
    if (minutos < abre) return { abierto: false, proximo: { dia, abre: hoy.abre, hoy: true } };
  }

  for (let i = 1; i <= 7; i++) {
    const d = (dia + i) % 7;
    if (horario[d]) return { abierto: false, proximo: { dia: d, abre: horario[d].abre, manana: i === 1 } };
  }
  return { abierto: false };
}

/** Fecha de hoy en El Paso como 'YYYY-MM-DD'. */
export function hoyEnElPaso(fecha = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: CONFIG.zonaHoraria }).format(fecha);
}

/** Próxima fecha (incluye hoy) que cae en ese día de la semana, como 'YYYY-MM-DD'. */
export function proximaFecha(diaSemana, fecha = new Date()) {
  const [y, m, d] = hoyEnElPaso(fecha).split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  const faltan = (diaSemana - base.getUTCDay() + 7) % 7;
  base.setUTCDate(base.getUTCDate() + faltan);
  return base.toISOString().slice(0, 10);
}
