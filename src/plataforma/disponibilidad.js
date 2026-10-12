// Disponibilidad real: horarios del día según config.js y mesas libres
// según las reservas guardadas.

import { CONFIG } from '../config.js';
import { hoyEnElPaso, ahoraEnElPaso } from '../js/horario.js';
import { sumarDias } from './ui.js';
import plano from '../data/mesas.json';

export const MESAS = plano.mesas;
export const ZONAS = plano.zonas;
export const PLANO = plano;

/** Una mesa queda ocupada este tiempo a partir de la hora de la reserva. */
export const DURACION_MIN = 120;
export const DIAS_ADELANTE = 60;
export const MAX_PERSONAS = 30;
/** Arriba de esto no se escoge mesa: el host junta mesas. */
export const MAX_POR_MESA = Math.max(...MESAS.map((m) => m.capacidad));

const ACTIVAS = new Set(['pendiente', 'confirmada', 'llego', 'sentada']);
export const reservaActiva = (r) => ACTIVAS.has(r.estado);

const aMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const aHHMM = (min) => {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
const diaSemana = (fecha) => new Date(`${fecha}T12:00:00Z`).getUTCDay();

/** Minutos "de servicio": las horas después de medianoche cuentan como +24 h. */
export function minutosServicio(hhmm) {
  const m = aMin(hhmm);
  return m < 6 * 60 ? m + 1440 : m;
}

export function fechaReservable(fecha) {
  const hoy = hoyEnElPaso();
  if (fecha < hoy || fecha > sumarDias(hoy, DIAS_ADELANTE)) return false;
  return Boolean(CONFIG.horario[diaSemana(fecha)]);
}

/** Horarios cada 30 min, desde que abre hasta 1 h antes de cerrar. */
export function horariosDelDia(fecha) {
  const h = CONFIG.horario[diaSemana(fecha)];
  if (!h) return [];
  const abre = aMin(h.abre);
  let cierra = aMin(h.cierra);
  if (cierra <= abre) cierra += 1440;
  const lista = [];
  for (let t = abre; t <= cierra - 60; t += 30) lista.push(aHHMM(t));

  // Hoy: nada que ya pasó (con 30 min de margen).
  if (fecha === hoyEnElPaso()) {
    const { minutos } = ahoraEnElPaso();
    return lista.filter((hhmm) => minutosServicio(hhmm) >= minutos + 30);
  }
  return lista;
}

/** Ids de mesas ocupadas a esa hora, según las reservas de esa fecha. */
export function mesasOcupadas(reservasDelDia, hora, { ignorarId } = {}) {
  const t = minutosServicio(hora);
  const ocupadas = new Set();
  for (const r of reservasDelDia) {
    if (!r.mesa_id || !reservaActiva(r) || r.id === ignorarId) continue;
    if (Math.abs(minutosServicio(r.hora) - t) < DURACION_MIN) ocupadas.add(r.mesa_id);
  }
  return ocupadas;
}

export function mesasLibres(reservasDelDia, hora, personas, opciones) {
  const ocupadas = mesasOcupadas(reservasDelDia, hora, opciones);
  return MESAS.filter((m) => !ocupadas.has(m.id) && m.capacidad >= personas);
}

/** [{ hora, lleno }] para pintar los horarios del paso 1. */
export function horariosConCupo(fecha, reservasDelDia, personas) {
  return horariosDelDia(fecha).map((hora) => ({
    hora,
    lleno: personas <= MAX_POR_MESA && mesasLibres(reservasDelDia, hora, personas).length === 0,
  }));
}

export const nombreZona = (zona, lang = 'es') => ZONAS[zona]?.[lang] ?? zona ?? '';
export const mesaPorId = (id) => MESAS.find((m) => m.id === Number(id));
