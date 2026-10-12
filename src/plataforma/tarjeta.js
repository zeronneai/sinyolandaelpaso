import { obtener, guardarCliente, normalizarTelefono, suscribir } from './datos.js';
import { $, iniciarPlataforma, toast, sonar } from './ui.js';
import { htmlTarjeta, SELLOS_PREMIO } from './lealtad.js';

iniciarPlataforma({ recargar: () => cliente && buscar(cliente.telefono) });

const params = new URLSearchParams(location.search);
const mesa = params.get('mesa');
if (mesa) {
  $('#volver-mesa').hidden = false;
  $('#volver-mesa').href = `/mesa/?m=${encodeURIComponent(mesa)}#mas`;
}

let cliente = null;
let telBuscado = '';

function pintar() {
  $('#carta').innerHTML = cliente ? htmlTarjeta(cliente) : '';
}

async function buscar(tel) {
  telBuscado = normalizarTelefono(tel);
  cliente = await obtener('clientes', { telefono: telBuscado });
  $('#nueva').hidden = Boolean(cliente);
  $('#buscar').hidden = Boolean(cliente);
  try { localStorage.setItem('sy-mi-tel', telBuscado); } catch (e) {}
  pintar();
}

$('#buscar').addEventListener('submit', (e) => {
  e.preventDefault();
  const d = $('#tel').value.replace(/\D/g, '');
  if (d.length < 10) return toast('Pon tu número completo, compa.', { tipo: 'error' });
  buscar($('#tel').value);
});
$('#nueva').addEventListener('submit', async (e) => {
  e.preventDefault();
  cliente = await guardarCliente({ nombre: $('#nombre').value.trim(), telefono: telBuscado, sellos: 0, visitas: 0, etiquetas: ['tarjeta'] });
  $('#nueva').hidden = true;
  $('#buscar').hidden = true;
  pintar();
  toast('¡Tu tarjeta está lista! Pídele tu primer sello al host.', { tipo: 'reserva', icono: 'corazon' });
});

// Cuando el host pone un sello en el admin, aparece aquí al instante.
suscribir('clientes', ({ nueva }) => {
  if (!cliente || nueva?.id !== cliente.id) return;
  const antes = cliente.sellos || 0;
  cliente = { ...cliente, ...nueva };
  pintar();
  if ((cliente.sellos || 0) > antes) {
    sonar(cliente.sellos >= SELLOS_PREMIO ? 'brindis' : 'ding');
    navigator.vibrate?.(200);
    toast(cliente.sellos >= SELLOS_PREMIO ? '¡Completaste tu tarjeta! Cantarito de la casa.' : '¡Nuevo sello!', { tipo: 'reserva', icono: 'destello' });
  }
});

try {
  const guardado = params.get('tel') || localStorage.getItem('sy-mi-tel');
  if (guardado) {
    $('#tel').value = guardado;
    buscar(guardado);
  }
} catch (e) {}
