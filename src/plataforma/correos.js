// Envío al Apps Script de correos. Nunca bloquea ni tumba la reserva:
// si falla, la reserva ya está guardada en la base.

import { ENV } from './entorno.js';

/**
 * accion: 'nueva' | 'estado' | 'prueba'
 * Resuelve { ok, ... } con la respuesta del script, o { ok: false, error }.
 */
export async function mandarCorreo(accion, reserva = {}, { lang = 'es' } = {}) {
  if (!ENV.appsScriptUrl) return { ok: false, error: 'Falta la URL del Apps Script (VITE_APPS_SCRIPT_URL)' };
  // Los datos de ejemplo usan @example.com: no gastar la cuota de correos en ellos.
  if (accion !== 'prueba' && /@example\.com$/i.test(reserva.correo || '')) return { ok: true, omitido: 'correo de ejemplo' };
  try {
    // text/plain evita el preflight de CORS con Apps Script.
    const r = await fetch(ENV.appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ accion, lang, ...reserva, userAgent: navigator.userAgent }),
    });
    return await r.json().catch(() => ({ ok: r.ok }));
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export const hayCorreos = () => Boolean(ENV.appsScriptUrl);
