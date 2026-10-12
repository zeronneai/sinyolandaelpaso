// Ajustes: estado de la configuración y correo de prueba para la junta.

import { ENV } from '../entorno.js';
import { modo } from '../datos.js';
import { mandarCorreo } from '../correos.js';
import { $, esc } from '../ui.js';

const ajustesVista = {
  id: 'ajustes',
  titulo: 'Ajustes',
  icono: 'sombrero',
  montar(el) {
    const linea = (ok, txt) => `<p class="estado-config${ok ? ' estado-config--ok' : ''}">${txt}</p>`;
    el.innerHTML = `<div class="ajustes">
      <section class="panel">
        <h2 class="panel__t">Correos</h2>
        ${linea(Boolean(ENV.appsScriptUrl), ENV.appsScriptUrl ? 'Apps Script conectado' : 'Falta VITE_APPS_SCRIPT_URL')}
        <p>Cada reserva manda 2 correos (cliente y equipo) y cada confirmación o cancelación, 1. Con Gmail normal hay 100 al día; con Google Workspace, 1,500.</p>
        <p>El correo de prueba usa una reserva falsa y llega a los correos del equipo (TEAM_EMAILS): el del cliente y el de "Nueva reserva".</p>
        <button type="button" class="btn btn--mostaza btn--grande" id="prueba" ${ENV.appsScriptUrl ? '' : 'disabled'}>Mandar correo de prueba</button>
        <div class="resultado-prueba" id="resultado" hidden></div>
      </section>
      <section class="panel">
        <h2 class="panel__t">Plataforma</h2>
        ${linea(modo === 'supabase', modo === 'supabase' ? 'Supabase en vivo' : 'Modo local (sin Supabase)')}
        ${linea(true, ENV.demo ? 'Modo demo encendido' : 'Modo producción')}
        ${linea(ENV.pagos === 'stripe', ENV.pagos === 'stripe' ? 'Pagos con Stripe' : 'Pagos simulados')}
        <p>Estos valores salen de las variables de entorno de Vercel. Ver README.</p>
      </section>
    </div>`;
    $('#prueba')?.addEventListener('click', async () => {
      const b = $('#prueba');
      const res = $('#resultado');
      b.disabled = true;
      b.textContent = 'Mandando...';
      const r = await mandarCorreo('prueba');
      res.hidden = false;
      res.innerHTML = r.ok
        ? `¡Listo! Revisa la bandeja de ${esc((r.enviadoA || []).join(', ') || 'TEAM_EMAILS')}.`
        : `No se pudo: ${esc(r.error || 'error desconocido')}`;
      b.disabled = false;
      b.textContent = 'Mandar correo de prueba';
    });
  },
};

export const VISTAS_AJUSTES = [ajustesVista];
