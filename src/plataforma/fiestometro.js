// El Fiestómetro: quiz de 6 preguntas con resultado e imagen para story (1080x1920).

import { $, esc, iniciarPlataforma } from './ui.js';

iniciarPlataforma();

const PREGUNTAS = [
  ['¿Cómo llegas a la fiesta?', ['Tranqui, a ver qué onda', 'Con ganas de una ronda', 'Con outfit y la bola completa', 'Con sombrero, botas y el micro en la mano']],
  ['¿Qué canción te representa hoy?', ['Si nos dejan', 'Me gustas mucho', 'La Bikina', 'El Rey']],
  ['Suena tu canción favorita. ¿Qué haces?', ['La tarareo en la mesa', 'Muevo los hombros', 'Me paro a bailar', 'Me subo al escenario sin pedir permiso']],
  ['¿Qué pides primero?', ['Un agua mineral', 'Una cerveza', 'Un cantarito', 'La botella para la mesa']],
  ['¿A qué hora te vas?', ['Antes de las 10', 'A medianoche, después del brindis', 'Cuando prenden las luces', 'Me tienen que sacar']],
  ['¿Cómo termina tu noche?', ['En mi camita', 'Con unos tacos', 'Con fotos para la story', 'Siendo leyenda de Sin Yolanda']],
];

const NIVELES = [
  { max: 3, n: 1, titulo: 'Calentando motores', frase: 'Vienes tranqui, pero la noche apenas empieza.', receta: 'Si nos dejan y un cantarito para arrancar.' },
  { max: 7, n: 2, titulo: 'Ya se te subió el ritmo', frase: 'Los hombros ya se están moviendo solos.', receta: 'Me gustas mucho y una ronda para la mesa.' },
  { max: 11, n: 3, titulo: 'Alma de la fiesta', frase: 'Donde llegas, se prende. Así de simple.', receta: 'La Bikina y un Mátalas.' },
  { max: 15, n: 4, titulo: 'Juan Gabriel en Bellas Artes', frase: 'Esto ya es arte. Que te escuche todo El Chuco.', receta: 'El Noa Noa y un cantarito doble.' },
  { max: 18, n: 5, titulo: 'Dueño del micro', frase: 'Nivel máximo. Tú no vienes a la fiesta: tú eres la fiesta.', receta: 'El Rey y la botella completa.' },
];

const mesa = new URLSearchParams(location.search).get('mesa');
if (mesa) {
  $('#volver-mesa').hidden = false;
  $('#volver-mesa').href = `/mesa/?m=${encodeURIComponent(mesa)}#mas`;
}

const respuestas = [];

function pintarPregunta(i) {
  const [p, ops] = PREGUNTAS[i];
  $('#quiz').innerHTML = `
    <p class="quiz__paso">Pregunta ${i + 1} de ${PREGUNTAS.length}</p>
    <div class="quiz__barra"><span style="width:${(i / PREGUNTAS.length) * 100}%"></span></div>
    <h2 class="quiz__pregunta">${esc(p)}</h2>
    <div class="quiz__opciones">${ops.map((o, k) => `<button type="button" class="quiz__op" data-k="${k}">${esc(o)}</button>`).join('')}</div>`;
  $('#quiz .quiz__op').focus();
}

$('#quiz').addEventListener('click', (e) => {
  const b = e.target.closest('.quiz__op');
  if (!b) return;
  respuestas.push(Number(b.dataset.k));
  if (respuestas.length < PREGUNTAS.length) pintarPregunta(respuestas.length);
  else mostrarResultado();
});

function nivelDe(puntos) {
  return NIVELES.find((n) => puntos <= n.max) || NIVELES.at(-1);
}

function mostrarResultado() {
  const puntos = respuestas.reduce((s, x) => s + x, 0);
  const n = nivelDe(puntos);
  $('#quiz').hidden = true;
  const r = $('#resultado');
  r.hidden = false;
  r.innerHTML = `
    <div class="resultado">
      <p class="resultado__eti">Tu nivel de fiesta</p>
      <p class="resultado__nivel">Nivel ${n.n}</p>
      <div class="medidor" role="img" aria-label="Nivel ${n.n} de 5">${[1, 2, 3, 4, 5].map((k) => `<span class="${k <= n.n ? 'lleno' : ''}">♥</span>`).join('')}</div>
      <h2 class="resultado__titulo">${esc(n.titulo)}</h2>
      <p class="maquina">${esc(n.frase)}</p>
      <p class="resultado__receta"><strong>Receta de la casa:</strong> ${esc(n.receta)}</p>
    </div>
    <div class="botones">
      <button type="button" class="btn btn--mostaza btn--grande btn--ancho" id="story">Descargar para mi story</button>
      <a class="btn btn--chocolate btn--ancho" href="/reservaciones/?ocasion=cantar">Ven a cantarlo</a>
      <button type="button" class="btn-texto" id="otra">Hacerlo otra vez</button>
    </div>
    <p class="ayuda" style="text-align:center">Súbela y etiqueta a <strong>@sinyolandaelpaso</strong>.</p>`;
  r.focus();
  $('#story').addEventListener('click', () => compartirStory(n));
  $('#otra').addEventListener('click', () => {
    respuestas.length = 0;
    r.hidden = true;
    $('#quiz').hidden = false;
    pintarPregunta(0);
  });
}

/* ============================================================
   Imagen para story 1080 x 1920
   ============================================================ */
async function logoMostaza() {
  const svg = await fetch('/assets/logos/sinyolanda-wordmark.svg').then((r) => r.text());
  const url = URL.createObjectURL(new Blob([svg.replace(/currentColor/g, '#E0A63A')], { type: 'image/svg+xml' }));
  return new Promise((ok) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.src = url;
  });
}

function ajustarTexto(x, texto, maxAncho, tam, fuente) {
  let t = tam;
  do {
    x.font = `${t}px ${fuente}`;
    t -= 4;
  } while (x.measureText(texto).width > maxAncho && t > 30);
}

function lineas(x, texto, maxAncho) {
  const palabras = texto.split(' ');
  const out = [];
  let linea = '';
  for (const p of palabras) {
    const prueba = linea ? `${linea} ${p}` : p;
    if (x.measureText(prueba).width > maxAncho && linea) {
      out.push(linea);
      linea = p;
    } else linea = prueba;
  }
  out.push(linea);
  return out;
}

export async function storyPNG(n) {
  await Promise.all([document.fonts.load('100px Anton'), document.fonts.load('50px "Bebas Neue"'), document.fonts.load('40px "Special Elite"')]);
  const W = 1080, H = 1920;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = '#C4502A';
  x.fillRect(0, 0, W, H);
  // rayos de sol
  x.fillStyle = 'rgba(142,58,30,.55)';
  for (let i = 0; i < 28; i++) {
    const a = (i * Math.PI * 2) / 28;
    x.beginPath();
    x.moveTo(W / 2, 1000);
    x.arc(W / 2, 1000, 2000, a, a + Math.PI / 28);
    x.closePath();
    x.fill();
  }
  // papel picado
  const colores = ['#E0A63A', '#F3E4C8', '#E8879A', '#3B1F14'];
  x.strokeStyle = '#3B1F14';
  x.lineWidth = 4;
  x.beginPath();
  x.moveTo(0, 30);
  x.quadraticCurveTo(W / 2, 70, W, 30);
  x.stroke();
  for (let i = 0; i < 9; i++) {
    const bx = 18 + i * 118, by = 36 + Math.sin((i / 8) * Math.PI) * 18;
    x.fillStyle = colores[i % 4];
    x.beginPath();
    x.moveTo(bx, by);
    x.lineTo(bx + 100, by);
    x.lineTo(bx + 100, by + 110);
    for (let k = 0; k < 6; k++) x.lineTo(bx + 100 - k * 16.6 - 8.3, by + (k % 2 ? 110 : 124));
    x.lineTo(bx, by + 110);
    x.closePath();
    x.fill();
    x.fillStyle = '#C4502A';
    x.beginPath();
    x.arc(bx + 50, by + 55, 16, 0, Math.PI * 2);
    x.fill();
  }

  const logo = await logoMostaza();
  const lw = 720, lh = (lw * logo.height) / logo.width;
  x.drawImage(logo, (W - lw) / 2, 230, lw, lh);

  x.textAlign = 'center';
  x.fillStyle = '#FBF1DD';
  x.font = '64px "Bebas Neue"';
  x.fillText('MI NIVEL DE FIESTA', W / 2, 640);

  // Nivel gigante con sombra
  x.font = '300px Anton';
  x.fillStyle = '#3B1F14';
  x.fillText(`NIVEL ${n.n}`, W / 2 + 14, 960 + 14);
  x.fillStyle = '#E0A63A';
  x.fillText(`NIVEL ${n.n}`, W / 2, 960);

  // corazones
  x.font = '96px Anton';
  for (let k = 0; k < 5; k++) {
    x.fillStyle = k < n.n ? '#E8879A' : 'rgba(251,241,221,.3)';
    x.fillText('♥', W / 2 - 280 + k * 140, 1110);
  }

  // título del nivel
  x.fillStyle = '#FBF1DD';
  ajustarTexto(x, n.titulo.toUpperCase(), W - 140, 110, 'Anton');
  const tl = lineas(x, n.titulo.toUpperCase(), W - 140);
  tl.forEach((l, i) => x.fillText(l, W / 2, 1270 + i * 120));

  x.font = '46px "Special Elite"';
  x.fillStyle = '#fff';
  lineas(x, n.frase, W - 180).forEach((l, i) => x.fillText(l, W / 2, 1270 + tl.length * 120 + 40 + i * 60));

  // pie chocolate
  x.fillStyle = '#3B1F14';
  x.fillRect(0, H - 260, W, 260);
  x.fillStyle = '#E0A63A';
  x.font = '64px "Bebas Neue"';
  x.fillText('@SINYOLANDAELPASO', W / 2, H - 160);
  x.fillStyle = '#FBF1DD';
  x.font = '40px "Bebas Neue"';
  x.fillText('HAZ EL TUYO EN SINYOLANDAELPASO.COM/FIESTOMETRO', W / 2, H - 95);

  return new Promise((ok) => c.toBlob(ok, 'image/png'));
}

async function compartirStory(n) {
  const btn = $('#story');
  btn.disabled = true;
  btn.textContent = 'Armando tu story...';
  const blob = await storyPNG(n);
  const archivo = new File([blob], `fiestometro-nivel-${n.n}.png`, { type: 'image/png' });
  btn.disabled = false;
  btn.textContent = 'Descargar para mi story';
  if (navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: 'Mi nivel de fiesta', text: 'Etiqueta a @sinyolandaelpaso' });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = archivo.name;
  a.click();
}

pintarPregunta(0);
