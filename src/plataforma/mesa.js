import { listar, insertar, suscribir, subirFoto } from './datos.js';
import { $, $$, esc, iniciarPlataforma, toast, sonar, linkUber, haceCuanto } from './ui.js';
import { mesaPorId, nombreZona, MESAS } from './disponibilidad.js';
import { escucharBrindis } from './brindis.js';
import menuData from '../data/menu.json';
import { CONFIG } from '../config.js';

const PEDIR = CONFIG.pedidosDesdeMesa !== false;

const numero = Number(new URLSearchParams(location.search).get('m'));
const MESA = mesaPorId(numero);
const CLAVE = `sy-mesa-${numero}`;

const estado = { turnos: [], dedicatorias: [], llamados: [], fotos: [], pedidos: [] };
const mios = (() => {
  const vacio = { turnos: [], dedicatorias: [], llamados: [], fotos: [], pedidos: [] };
  try { return { ...vacio, ...JSON.parse(localStorage.getItem(CLAVE)) }; } catch (e) { return vacio; }
})();
const guardarMios = () => {
  try { localStorage.setItem(CLAVE, JSON.stringify(mios)); } catch (e) {}
};

iniciarPlataforma({ recargar: () => cargar() });

/* ============================================================
   Sin mesa válida: escoger una
   ============================================================ */

function iniciar() {
  $('#mesa-titulo').innerHTML = `Mesa ${MESA.numero} <span>· ${esc(nombreZona(MESA.zona))}</span>`;
  document.title = `Mesa ${MESA.numero} | Sin Yolanda El Paso`;
  $('#tabbar').hidden = false;
  pintarMenu();
  if (PEDIR) pintarCarrito();
  else {
    $('#pedir-aviso').hidden = true;
    $('#pedir-alternativa').textContent = 'No se ordena desde aquí: tu mesero te atiende.';
  }
  pintarSugerencias();
  $('#uber').href = linkUber();
  escucharBrindis();
  cargar();
  pintarMasExtra();
  suscribir(['turnos_micro', 'dedicatorias', 'llamados', 'fotos', 'pedidos'], ({ tabla, nueva }) => {
    if (!nueva) return;
    const lista = { turnos_micro: estado.turnos, dedicatorias: estado.dedicatorias, llamados: estado.llamados, fotos: estado.fotos, pedidos: estado.pedidos }[tabla];
    const i = lista.findIndex((x) => x.id === nueva.id);
    if (i >= 0) lista[i] = { ...lista[i], ...nueva };
    else lista.push(nueva);
    pintarVivo(tabla, nueva);
  });
  const inicial = location.hash.slice(1);
  ir(['menu', 'micro', 'dedic', 'servicio', 'mas'].includes(inicial) ? inicial : 'menu');
}

async function cargar() {
  const [t, d, l, f, p] = await Promise.all([
    listar('turnos_micro'), listar('dedicatorias'), listar('llamados'), listar('fotos'),
    PEDIR ? listar('pedidos', { eq: { mesa: MESA.numero } }).catch(() => []) : [],
  ]);
  estado.pedidos = p || [];
  pintarMisPedidos();
  estado.turnos = t;
  estado.dedicatorias = d;
  estado.llamados = l;
  estado.fotos = f;
  pintarMisFotos();
  pintarMiTurno();
  pintarMiDedicatoria();
  pintarFila();
  pintarLlamados();
}

/* ---------- Pestañas ---------- */
function ir(tab) {
  $$('.tab').forEach((s) => (s.hidden = s.id !== `tab-${tab}`));
  $$('#tabbar button').forEach((b) => b.setAttribute('aria-current', b.dataset.tab === tab ? 'page' : 'false'));
  history.replaceState(null, '', `#${tab}`);
  window.scrollTo({ top: 0 });
}
$('#tabbar').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (b) ir(b.dataset.tab);
});

/* ============================================================
   MENÚ
   ============================================================ */
const NIVELES = [
  ['¿Vienes a celebrar?', 'Cantarito doble.'],
  ['¿Viste sus historias 14 veces hoy?', 'Quesabirria con extra consomé, para el alma.'],
  ['¿Te sientes la reina de la noche?', 'El Rey, y pide "El Rey" al micro.'],
  ['¿Vienes con toda tu bola?', 'Una ronda de Mátalas y a la pista.'],
  ['¿Lo superaste? (mentira)', 'Elotitos para compartir con tu bola.'],
];
function pintarMenu() {
  const todos = menuData.categorias.flatMap((c) => c.platillos.filter((p) => !p.pendiente));
  $('#top-pedidos').innerHTML = todos
    .filter((p) => p.top)
    .map(
      (p) => `<li class="top-item">${PEDIR ? `<button type="button" class="mas-btn mas-btn--top" data-agregar="${esc(p.nombre.es)}" aria-label="Agregar ${esc(p.nombre.es)} a mi pedido">+</button>` : ''}${
        p.foto ? `<img src="${p.foto}" alt="" loading="lazy">` : `<span class="top-item__icono"><svg aria-hidden="true"><use href="#i-${p.nombre.es.includes('Quesa') ? 'corazon' : p.nombre.es.includes('Elot') ? 'sol' : 'micro'}"/></svg></span>`
      }<strong>${esc(p.nombre.es)}</strong></li>`,
    )
    .join('');
  $('#nivel').innerHTML = NIVELES.map(([q, r]) => `<li><span>${esc(q)}</span><strong>${esc(r)}</strong></li>`).join('');
  $('#carta').innerHTML = menuData.categorias
    .map(
      (c) => `<details class="carta-cat" ${c.id === 'cocteles' ? 'open' : ''}>
      <summary>${esc(c.nombre.es)}</summary>
      <ul role="list">${c.platillos
        .map((p) =>
          p.pendiente
            ? '<li class="carta-item carta-item--pendiente">Próximamente en el menú</li>'
            : `<li class="carta-item${PEDIR ? ' carta-item--pedir' : ''}">${p.foto ? `<img src="${p.foto}" alt="" loading="lazy">` : ''}<div><strong>${esc(p.nombre.es)}</strong><p>${esc(p.descripcion.es)}</p></div>${
                PEDIR ? `<button type="button" class="mas-btn" data-agregar="${esc(p.nombre.es)}" aria-label="Agregar ${esc(p.nombre.es)} a mi pedido">+</button>` : ''
              }</li>`,
        )
        .join('')}</ul></details>`,
    )
    .join('');
}

/* ============================================================
   PEDIR DESDE LA MESA
   ============================================================ */
const CLAVE_CARRITO = `sy-carrito-${numero}`;
let carrito = (() => {
  try { return JSON.parse(localStorage.getItem(CLAVE_CARRITO)) || []; } catch (e) { return []; }
})();
const guardarCarrito = () => {
  try { localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito)); } catch (e) {}
};
const TXT_PEDIDO = {
  nuevo: ['Pedido recibido', 'Ya le llegó a la barra.'],
  preparando: ['Preparándose', 'Ya están en eso, ahorita sale.'],
  entregado: ['¡Entregado!', '¿Algo más? Aquí sigue el menú.'],
  cancelado: ['No se pudo', 'Tu mesero te va a explicar.'],
};

function pintarCarrito() {
  if (!PEDIR) return;
  const n = carrito.reduce((a, x) => a + x.cantidad, 0);
  $('#carrito').hidden = n === 0;
  $('#carrito-n').textContent = n;
  $('#pedido-lista').innerHTML = carrito.length
    ? carrito
        .map(
          (x, i) => `<li class="pedido-linea"><span class="pedido-linea__n">${esc(x.nombre)}</span>
      <span class="cantidad" role="group" aria-label="Cantidad de ${esc(x.nombre)}">
        <button type="button" data-menos="${i}" aria-label="Quitar uno">−</button><b>${x.cantidad}</b><button type="button" data-mas="${i}" aria-label="Agregar uno">+</button>
      </span></li>`,
        )
        .join('')
    : '<li class="vacio">Todavía no agregas nada.</li>';
}

function agregar(nombre) {
  const x = carrito.find((c) => c.nombre === nombre);
  if (x) x.cantidad = Math.min(20, x.cantidad + 1);
  else carrito.push({ nombre, cantidad: 1 });
  guardarCarrito();
  pintarCarrito();
  const btn = $('#ver-carrito');
  btn.classList.remove('carrito__btn--pulso');
  void btn.offsetWidth;
  btn.classList.add('carrito__btn--pulso');
}

function pintarMisPedidos() {
  if (!PEDIR) return;
  const lista = estado.pedidos
    .filter((p) => mios.pedidos.includes(p.id))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 3);
  $('#mis-pedidos').innerHTML = lista
    .map((p) => {
      const [t, d] = TXT_PEDIDO[p.estado] || TXT_PEDIDO.nuevo;
      const items = (p.items || []).map((x) => `${x.cantidad} ${esc(x.nombre)}`).join(', ');
      return `<div class="mi-pedido mi-pedido--${p.estado}"><p class="mi-pedido__t">${t}</p><p>${items}</p><p class="mi-pedido__d">${d} · ${haceCuanto(p.created_at)}</p></div>`;
    })
    .join('');
}

if (PEDIR) {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-agregar]');
    if (a) return agregar(a.dataset.agregar);
  });
  $('#ver-carrito').addEventListener('click', () => {
    pintarCarrito();
    $('#hoja-pedido').showModal();
  });
  $('#pedido-seguir').addEventListener('click', () => $('#hoja-pedido').close());
  $('#hoja-pedido').addEventListener('click', (e) => {
    if (e.target === $('#hoja-pedido')) $('#hoja-pedido').close();
    const mas = e.target.closest('[data-mas]');
    const menos = e.target.closest('[data-menos]');
    if (mas) carrito[mas.dataset.mas].cantidad = Math.min(20, carrito[mas.dataset.mas].cantidad + 1);
    if (menos) {
      const i = Number(menos.dataset.menos);
      carrito[i].cantidad -= 1;
      if (carrito[i].cantidad <= 0) carrito.splice(i, 1);
    }
    if (mas || menos) {
      guardarCarrito();
      pintarCarrito();
      if (!carrito.length) $('#hoja-pedido').close();
    }
  });
  $('#pedido-enviar').addEventListener('click', async () => {
    if (!carrito.length || !MESA) return;
    const b = $('#pedido-enviar');
    b.disabled = true;
    try {
      const p = await insertar('pedidos', {
        mesa: MESA.numero,
        items: carrito.map((x) => ({ nombre: x.nombre, cantidad: x.cantidad })),
        nota: $('#pedido-nota').value.trim() || null,
        estado: 'nuevo',
        entregado_at: null,
      });
      mios.pedidos.push(p.id);
      guardarMios();
      if (!estado.pedidos.find((x) => x.id === p.id)) estado.pedidos.push(p);
      carrito = [];
      guardarCarrito();
      $('#pedido-nota').value = '';
      pintarCarrito();
      pintarMisPedidos();
      $('#hoja-pedido').close();
      ir('menu');
      toast('¡Pedido mandado! Ya va para tu mesa.', { tipo: 'reserva', icono: 'cantarito' });
      sonar('ding');
    } catch (er) {
      toast('No se pudo mandar el pedido. Llama a tu mesero, porfa.', { tipo: 'error' });
    } finally {
      b.disabled = false;
    }
  });
}

/* ============================================================
   AL MICRO
   ============================================================ */
const SUGERENCIAS = [
  ['El Rey', 'José Alfredo Jiménez'], ['La Bikina', 'Luis Miguel'], ['Mátalas', 'Alejandro Fernández'], ['La Negra', 'Mariachi Vargas'],
  ['La Chona', 'Los Tucanes de Tijuana'], ['Payaso de rodeo', 'Caballo Dorado'], ['El Sinaloense', 'Banda El Recodo'], ['Me gustas mucho', 'Rocío Dúrcal'],
  ['Amor a la mexicana', 'Thalía'], ['El Noa Noa', 'Juan Gabriel'], ['Juana la Cubana', 'Fito Olivares'], ['Si nos dejan', 'Luis Miguel'],
];
function pintarSugerencias() {
  $('#sugerencias').innerHTML = SUGERENCIAS.map(([c, a], i) => `<button type="button" class="chip-btn" data-sug="${i}">${esc(c)}</button>`).join('');
  $('#sugerencias').addEventListener('click', (e) => {
    const b = e.target.closest('[data-sug]');
    if (!b) return;
    const [c, a] = SUGERENCIAS[b.dataset.sug];
    $('#mi-cancion').value = c;
    $('#mi-artista').value = a;
  });
  try { $('#mi-nombre').value = localStorage.getItem('sy-mi-nombre') || ''; } catch (e) {}
}

$('#form-micro').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const btn = f.querySelector('.btn--grande');
  btn.disabled = true;
  try {
    const t = await insertar('turnos_micro', { mesa: MESA.numero, nombre: f.nombre.value.trim(), cancion: f.cancion.value.trim(), artista: f.artista.value.trim() || null, estado: 'en_fila' });
    try { localStorage.setItem('sy-mi-nombre', f.nombre.value.trim()); } catch (er) {}
    mios.turnos.push(t.id);
    guardarMios();
    if (!estado.turnos.find((x) => x.id === t.id)) estado.turnos.push(t);
    f.cancion.value = '';
    f.artista.value = '';
    pintarMiTurno();
    pintarFila();
    toast('¡Ya estás en la fila! Calienta la garganta.', { tipo: 'turno', icono: 'micro' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (er) {
    toast('No te pudimos apuntar. Intenta otra vez.', { tipo: 'error' });
  } finally {
    btn.disabled = false;
  }
});

const ordenFila = () => estado.turnos.filter((t) => t.estado === 'en_fila').sort((a, b) => a.created_at.localeCompare(b.created_at));

let ultimoAviso = null;
function pintarMiTurno() {
  const caja = $('#mi-turno');
  const mis = estado.turnos.filter((t) => mios.turnos.includes(t.id));
  const activo = mis.find((t) => t.estado === 'cantando') || ordenFila().find((t) => mios.turnos.includes(t.id));
  if (!activo) {
    const ultimo = mis.sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    caja.hidden = !ultimo;
    if (ultimo) caja.innerHTML = `<p class="mi-turno__grande">${ultimo.estado === 'cantado' ? '¡Bravo!' : 'Te saltaron'}</p><p>${ultimo.estado === 'cantado' ? '¿Otra? Apúntate de nuevo.' : 'Pregúntale al host, o apúntate otra vez.'}</p>`;
    caja.className = 'mi-turno';
    return;
  }
  caja.hidden = false;
  if (activo.estado === 'cantando') {
    caja.className = 'mi-turno mi-turno--toca';
    caja.innerHTML = `<p class="mi-turno__grande">¡Te toca!</p><p>Corre al escenario: <strong>${esc(activo.cancion)}</strong></p>`;
    if (ultimoAviso !== `toca-${activo.id}`) {
      ultimoAviso = `toca-${activo.id}`;
      sonar('brindis');
      navigator.vibrate?.([300, 100, 300, 100, 600]);
    }
    return;
  }
  const fila = ordenFila();
  const pos = fila.findIndex((t) => t.id === activo.id);
  const cantando = estado.turnos.find((t) => t.estado === 'cantando');
  const anterior = pos > 0 ? fila[pos - 1] : cantando;
  caja.className = `mi-turno${pos === 0 ? ' mi-turno--casi' : ''}`;
  caja.innerHTML =
    pos === 0
      ? `<p class="mi-turno__grande">¡Prepárate!</p><p>Vas después de ${anterior ? `la mesa ${anterior.mesa}` : 'esta canción'}. <strong>${esc(activo.cancion)}</strong></p>`
      : `<p class="mi-turno__grande">Lugar ${pos + 1}</p><p>Tienes ${pos} ${pos === 1 ? 'turno' : 'turnos'} adelante. Vas con <strong>${esc(activo.cancion)}</strong>.</p>`;
  if (pos === 0 && ultimoAviso !== `casi-${activo.id}`) {
    ultimoAviso = `casi-${activo.id}`;
    sonar('ding');
    navigator.vibrate?.(200);
  }
}

function pintarFila() {
  const cantando = estado.turnos.find((t) => t.estado === 'cantando');
  const fila = ordenFila();
  $('#fila-publica').innerHTML =
    (cantando ? `<li class="fila-publica__ahora"><span>🎤</span> <strong>Cantando:</strong> ${esc(cantando.nombre)} · Mesa ${cantando.mesa}<br><small>${esc(cantando.cancion)}</small></li>` : '') +
    (fila
      .slice(0, 8)
      .map((t, i) => `<li class="${mios.turnos.includes(t.id) ? 'fila-publica__mio' : ''}"><b>${i + 1}</b> ${esc(t.nombre)} · Mesa ${t.mesa}<br><small>${esc(t.cancion)}</small></li>`)
      .join('') || '<li class="vacio">Nadie en la fila. ¡Aprovecha!</li>');
}

/* ============================================================
   DEDICATORIA
   ============================================================ */
$('#d-mensaje').addEventListener('input', (e) => ($('#d-contador').textContent = `${e.target.value.length}/140`));
$('#form-dedic').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const btn = f.querySelector('.btn--grande');
  btn.disabled = true;
  try {
    const d = await insertar('dedicatorias', {
      mesa: MESA.numero,
      cancion: f.cancion.value.trim(),
      para: f.para.value.trim(),
      mensaje: f.mensaje.value.trim() || null,
      anonimo: f.anonimo.checked,
      estado: 'en_fila',
    });
    mios.dedicatorias.push(d.id);
    guardarMios();
    if (!estado.dedicatorias.find((x) => x.id === d.id)) estado.dedicatorias.push(d);
    f.reset();
    $('#d-contador').textContent = '0/140';
    pintarMiDedicatoria();
    toast('¡Dedicatoria enviada! Que le llegue.', { tipo: 'dedicatoria', icono: 'corazon' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (er) {
    toast('No se pudo mandar. Intenta otra vez.', { tipo: 'error' });
  } finally {
    btn.disabled = false;
  }
});

function pintarMiDedicatoria() {
  const caja = $('#mi-dedic');
  const fila = estado.dedicatorias.filter((d) => d.estado === 'en_fila').sort((a, b) => a.created_at.localeCompare(b.created_at));
  const mia = fila.find((d) => mios.dedicatorias.includes(d.id));
  const ultima = estado.dedicatorias.filter((d) => mios.dedicatorias.includes(d.id)).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  if (mia) {
    const pos = fila.indexOf(mia);
    caja.hidden = false;
    caja.innerHTML = `<p class="mi-turno__grande">${pos === 0 ? '¡La que sigue!' : `Lugar ${pos + 1}`}</p><p>"${esc(mia.cancion)}" para ${esc(mia.para)}</p>`;
  } else if (ultima) {
    caja.hidden = false;
    caja.innerHTML = ultima.estado === 'cantada' ? `<p class="mi-turno__grande">¡Ya se cantó!</p><p>"${esc(ultima.cancion)}" para ${esc(ultima.para)}. Ojalá le haya llegado.</p>` : '<p class="mi-turno__grande">Se la saltaron</p><p>Pregúntale al host.</p>';
  } else caja.hidden = true;
}

/* ============================================================
   SERVICIO
   ============================================================ */
const TXT_LLAMADO = { mesero: 'Llamaste al mesero', cuenta: 'Pediste la cuenta', ayuda: 'Pediste ayuda' };
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-llamar]');
  if (!b || !MESA) return;
  const tipo = b.dataset.llamar;
  const yaPendiente = estado.llamados.find((l) => mios.llamados.includes(l.id) && l.tipo === tipo && l.estado === 'pendiente');
  if (yaPendiente) {
    toast('Ya va para allá, aguántanos tantito.', { tipo: 'llamado' });
    return;
  }
  b.disabled = true;
  try {
    const l = await insertar('llamados', { mesa: MESA.numero, tipo, estado: 'pendiente', atendido_at: null });
    mios.llamados.push(l.id);
    guardarMios();
    if (!estado.llamados.find((x) => x.id === l.id)) estado.llamados.push(l);
    pintarLlamados();
    toast('¡Ya va para allá!', { tipo: 'llamado', icono: 'sombrero' });
  } catch (er) {
    toast('No se pudo avisar. Levanta la mano, compa.', { tipo: 'error' });
  } finally {
    b.disabled = false;
  }
});

function pintarLlamados() {
  const lista = estado.llamados.filter((l) => mios.llamados.includes(l.id)).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 4);
  $('#mis-llamados').innerHTML = lista
    .map(
      (l) => `<div class="llamado-estado llamado-estado--${l.estado}">
      <strong>${TXT_LLAMADO[l.tipo]}</strong>
      <span>${l.estado === 'pendiente' ? `Ya va para allá · ${haceCuanto(l.created_at)}` : '¡Atendido! ¿Algo más?'}</span></div>`,
    )
    .join('');
}

/* ============================================================
   MÁS: Fiestómetro, Tarjeta Fiestera y muro de fotos
   ============================================================ */
function pintarMasExtra() {
  $('#mas-extra').innerHTML = `
    <div class="mas-grid">
      <a class="mas-card mas-card--rosa" href="/fiestometro/?mesa=${MESA.numero}">
        <svg aria-hidden="true"><use href="#i-llama"/></svg><strong>El Fiestómetro</strong><span>¿Qué tan prendido vienes? Sácalo para tu story.</span></a>
      <a class="mas-card mas-card--mostaza" href="/tarjeta/?mesa=${MESA.numero}">
        <svg aria-hidden="true"><use href="#i-corazon"/></svg><strong>Tarjeta Fiestera</strong><span>5 sellos y el cantarito va por la casa.</span></a>
    </div>
    <form class="tarjeta muro" id="form-foto">
      <h2 class="tarjeta__titulo">Tu foto a la pantalla</h2>
      <p>Sube tu foto y, si el host la aprueba, sale en las pantallas del bar.</p>
      <label class="muro__elegir">
        <input type="file" accept="image/*" id="foto-archivo" required>
        <span id="foto-nombre">📸 Escoger o tomar foto</span>
      </label>
      <img class="muro__preview" id="foto-preview" alt="" hidden>
      <label class="check"><input type="checkbox" id="foto-ok" required>
        <span>Acepto que Sin Yolanda muestre esta foto en sus pantallas y redes. Todos los que salen están de acuerdo.</span></label>
      <button class="btn btn--mostaza btn--ancho" id="foto-enviar">Mandar a la pantalla</button>
      <div id="mis-fotos" aria-live="polite"></div>
    </form>`;

  const archivo = $('#foto-archivo');
  archivo.addEventListener('change', () => {
    const f = archivo.files[0];
    if (!f) return;
    $('#foto-nombre').textContent = '📸 Cambiar foto';
    const p = $('#foto-preview');
    p.src = URL.createObjectURL(f);
    p.hidden = false;
  });
  $('#form-foto').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!archivo.files[0]) return toast('Primero escoge una foto.', { tipo: 'error' });
    if (!$('#foto-ok').checked) return toast('Falta aceptar el uso de la foto.', { tipo: 'error' });
    const b = $('#foto-enviar');
    b.disabled = true;
    b.textContent = 'Subiendo...';
    try {
      const blob = await reducirFoto(archivo.files[0]);
      const url = await subirFoto(blob);
      const foto = await insertar('fotos', { mesa: MESA.numero, url, estado: 'pendiente' });
      mios.fotos.push(foto.id);
      guardarMios();
      if (!estado.fotos.find((x) => x.id === foto.id)) estado.fotos.push(foto);
      e.target.reset();
      $('#foto-preview').hidden = true;
      $('#foto-nombre').textContent = '📸 Escoger o tomar foto';
      pintarMisFotos();
      toast('¡Foto enviada! El host la revisa y sale en la pantalla.', { tipo: 'foto', icono: 'sol' });
    } catch (er) {
      toast('No se pudo subir la foto. Intenta otra vez.', { tipo: 'error' });
    } finally {
      b.disabled = false;
      b.textContent = 'Mandar a la pantalla';
    }
  });
}

/** Reduce la foto a 1080 px de ancho máximo, JPEG. */
async function reducirFoto(archivo) {
  const img = await new Promise((ok, mal) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = mal;
    i.src = URL.createObjectURL(archivo);
  });
  const escala = Math.min(1, 1080 / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * escala);
  c.height = Math.round(img.height * escala);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.82));
}

function pintarMisFotos() {
  const cont = $('#mis-fotos');
  if (!cont) return;
  const mis = estado.fotos.filter((f) => mios.fotos.includes(f.id)).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 3);
  const TXT = { pendiente: 'En revisión con el host', aprobada: '¡Ya está en la pantalla!', rechazada: 'Esta no pasó el filtro' };
  cont.innerHTML = mis.map((f) => `<p class="mi-foto mi-foto--${f.estado}"><img src="${esc(f.url)}" alt="">${TXT[f.estado]}</p>`).join('');
}

/* ---------- En vivo ---------- */
function pintarVivo(tabla, nueva) {
  if (tabla === 'fotos') {
    pintarMisFotos();
    if (mios.fotos.includes(nueva.id) && nueva.estado === 'aprobada') toast('¡Tu foto ya está en la pantalla!', { tipo: 'foto', icono: 'sol' });
  }
  if (tabla === 'turnos_micro') {
    pintarMiTurno();
    pintarFila();
  }
  if (tabla === 'dedicatorias') pintarMiDedicatoria();
  if (tabla === 'pedidos' && mios.pedidos.includes(nueva.id)) {
    pintarMisPedidos();
    if (nueva.estado === 'preparando') toast('Tu pedido ya se está preparando.', { tipo: 'reserva', icono: 'cantarito' });
    if (nueva.estado === 'entregado') toast('¡Tu pedido va llegando! Provecho.', { tipo: 'reserva', icono: 'cantarito' });
  }
  if (tabla === 'llamados') {
    pintarLlamados();
    if (mios.llamados.includes(nueva.id) && nueva.estado === 'atendido') toast(`${TXT_LLAMADO[nueva.tipo]}: ¡atendido!`, { tipo: 'reserva', icono: 'sombrero' });
  }
}
setInterval(pintarLlamados, 30000);

/* ---------- Arranque (al final: todo lo de arriba ya existe) ---------- */
if (!MESA) {
  $('#mesa-titulo').textContent = 'Bienvenido';
  $('#sin-mesa').hidden = false;
  $('#escoger-mesa').innerHTML = MESAS.map((m) => `<a class="chip-btn" href="/mesa/?m=${m.numero}">Mesa ${m.numero}</a>`).join('');
} else {
  iniciar();
}

export { MESA, ir };
