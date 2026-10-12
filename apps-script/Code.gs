/**
 * Sin Yolanda El Paso · correos de reservaciones (Google Apps Script, V8)
 *
 * El sitio guarda la reserva en Supabase y, en paralelo, hace POST aquí.
 * Si este script falla, la reserva NO se pierde: solo no sale el correo.
 *
 * Acciones (campo "accion" del JSON):
 *   - "nueva"  (o vacío): correo al cliente + correo al equipo.
 *   - "estado": correo corto al cliente cuando el admin confirma o cancela.
 *   - "prueba": manda los dos correos con una reserva falsa a TEAM_EMAILS.
 *
 * Script Properties (Configuración del proyecto > Propiedades del script):
 *   TEAM_EMAILS        correos del equipo separados por coma (obligatorio)
 *   SITE_URL           https://sinyolandaelpaso.com (sin diagonal final)
 *   LOGO_URL           PNG del logo, ej. https://sinyolandaelpaso.com/assets/logos/logo-email.png
 *   SHEET_ID           (opcional) Google Sheet de respaldo
 *   SUPABASE_URL       (recomendado) para leer la reserva real por folio
 *   SUPABASE_ANON_KEY  (recomendado) llave anon de Supabase
 *
 * Regla de copy: nada de guiones largos en ningún texto.
 */

const MARCA = {
  terracota: '#C4502A', terracotaOscuro: '#8E3A1E', mostaza: '#E0A63A',
  crema: '#F3E4C8', cremaClaro: '#FBF1DD', chocolate: '#3B1F14', rosa: '#E8879A',
};
const DIRECCION = '340 Vin Rambla Dr, El Paso, TX';
const ZONA_HORARIA = 'America/Denver';
const LIMITE_POR_CORREO = 3; // por hora
const LIMITE_GLOBAL = 60; // por hora, para que nadie use esto de spam

// Deben coincidir con src/config.js y src/data/mesas.json del sitio.
const OCASIONES = {
  cantar: { es: 'Solo vengo a cantar', en: 'Just here to sing' },
  cumpleanos: { es: 'Cumpleaños', en: 'Birthday' },
  despedida: { es: 'Despedida de soltera', en: 'Bachelorette' },
  divorcio: { es: 'Fiesta de divorcio', en: 'Divorce party' },
  posada: { es: 'Posada de empresa', en: 'Company posada' },
  'recovery-brunch': { es: 'Recovery Brunch', en: 'Recovery Brunch' },
  otra: { es: 'Otra', en: 'Other' },
};
const EXTRAS = {
  pastel: { es: 'Pastel de cumpleaños con vela', en: 'Birthday cake with candle' },
  despedida: { es: 'Decoración de despedida', en: 'Bachelorette decorations' },
  botella: { es: 'Botella reservada', en: 'Reserved bottle' },
  mariachi: { es: 'Que el mariachi te cante', en: 'Mariachi serenade' },
};
const ZONAS = {
  'cerca-micro': { es: 'Cerca del micro', en: 'Near the mic' },
  tranquis: { es: 'Más tranquis', en: 'Chill side' },
  barra: { es: 'Barra', en: 'Bar' },
  terraza: { es: 'Terraza', en: 'Patio' },
};

/* ============================================================
   Textos ES / EN
   ============================================================ */
const T = {
  es: {
    dias: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
    meses: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
    fecha: (d, n, m) => `${d} ${n} de ${m}`,
    asuntoCliente: (n, f) => `¡Ya quedó, ${n}! Tu mesa en Sin Yolanda El Paso · ${f}`,
    hola: (n) => `¡Ya quedó, ${n}!`,
    intro: (f, h, p) => `Recibimos tu reserva para el <b>${f}</b> a las <b>${h}</b>, ${p} ${p === 1 ? 'persona' : 'personas'}. La cantina te confirma en breve por correo o WhatsApp.`,
    admite: (p) => `ADMITE ${p} ${p === 1 ? 'PERSONA' : 'PERSONAS'}`,
    folio: 'Folio', fechaL: 'Fecha', horaL: 'Hora', personasL: 'Personas', mesaL: 'Mesa', ocasionL: 'Ocasión', extrasL: 'Extras',
    sinMesa: 'La arma el host', mesa: (n, z) => `${n} · ${z}`,
    escanea: 'Enséñalo al llegar',
    verNoche: 'VER MI NOCHE', invita: 'INVITA A TU BOLA', calendario: 'Agregar a mi calendario', llegar: 'Cómo llegar',
    textoInvita: (f, h, url) => `Ya apartamos en Sin Yolanda El Paso el ${f} a las ${h}. Aquí están los detalles: ${url}`,
    reglasT: 'Reglas de la casa',
    reglas: ['Trae toda la actitud. Aquí nadie viene a llorar solo.', 'Ven con la garganta preparada. Un tecito antes no está de más.', 'Apúntate temprano al micrófono: la fila crece después de las 10.'],
    deposito: 'Depósito', depEstado: { pagado: 'Pagado', pendiente: 'Pendiente', reembolsado: 'Reembolsado', fallido: 'No se pudo cobrar' },
    cierres: {
      cumpleanos: 'Y que no se te olvide: el pastel y Las Mañanitas van por nuestra cuenta de sentimiento. ¡Feliz cumple!',
      despedida: 'Que la futura señora llegue lista: esta noche se despide en grande. ¡Ajúa!',
      divorcio: 'Recién soltera, recién soltero: hoy se brinda por la libertad. ¡Salud!',
      roto: 'Y tranquilo, aquí no se llora: aquí se canta.',
      normal: 'Esto se va a prender. ¡Cáile!',
    },
    pie: 'Sin Yolanda El Paso · 340 Vin Rambla Dr, El Paso, TX · @sinyolandaelpaso',
    confirmadaAsunto: (n, f) => `¡Confirmada, ${n}! Te esperamos el ${f} · Sin Yolanda El Paso`,
    confirmadaT: '¡Tu mesa está confirmada!',
    confirmadaTxt: (f, h) => `La cantina confirmó tu reserva para el <b>${f}</b> a las <b>${h}</b>. Aquí va otra vez tu boleto.`,
    canceladaAsunto: (n) => `Tu reserva quedó cancelada, ${n} · Sin Yolanda El Paso`,
    canceladaT: 'Tu reserva quedó cancelada',
    canceladaTxt: (f, h) => `Cancelamos tu reserva del <b>${f}</b> a las <b>${h}</b>. Si fue un error o quieres otra fecha, aquí te esperamos.`,
    otraFecha: 'APARTAR OTRA FECHA',
  },
  en: {
    dias: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    meses: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    fecha: (d, n, m) => `${d}, ${m} ${n}`,
    asuntoCliente: (n, f) => `You're all set, ${n}! Your table at Sin Yolanda El Paso · ${f}`,
    hola: (n) => `You're all set, ${n}!`,
    intro: (f, h, p) => `We got your reservation for <b>${f}</b> at <b>${h}</b>, ${p} ${p === 1 ? 'guest' : 'guests'}. The cantina will confirm shortly by email or WhatsApp.`,
    admite: (p) => `ADMITS ${p}`,
    folio: 'Confirmation', fechaL: 'Date', horaL: 'Time', personasL: 'Guests', mesaL: 'Table', ocasionL: 'Occasion', extrasL: 'Extras',
    sinMesa: 'The host will set it up', mesa: (n, z) => `${n} · ${z}`,
    escanea: 'Show it when you arrive',
    verNoche: 'SEE MY NIGHT', invita: 'INVITE YOUR CREW', calendario: 'Add to my calendar', llegar: 'Directions',
    textoInvita: (f, h, url) => `We booked Sin Yolanda El Paso for ${f} at ${h}. Here are the details: ${url}`,
    reglasT: 'House rules',
    reglas: ['Bring all the attitude. Nobody cries alone here.', 'Warm up that voice. A little tea before never hurts.', 'Sign up for the mic early: the line grows after 10.'],
    deposito: 'Deposit', depEstado: { pagado: 'Paid', pendiente: 'Pending', reembolsado: 'Refunded', fallido: 'Payment failed' },
    cierres: {
      cumpleanos: 'Birthday mode is on: cake, candles and Las Mañanitas, cantina style.',
      despedida: 'Get the bride-to-be ready: tonight she says goodbye in style. ¡Ajúa!',
      divorcio: 'Newly single? Tonight we toast to freedom. ¡Salud!',
      roto: "And don't worry: here we don't cry, we sing.",
      normal: "This is about to get lit. See you there!",
    },
    pie: 'Sin Yolanda El Paso · 340 Vin Rambla Dr, El Paso, TX · @sinyolandaelpaso',
    confirmadaAsunto: (n, f) => `Confirmed, ${n}! See you on ${f} · Sin Yolanda El Paso`,
    confirmadaT: 'Your table is confirmed!',
    confirmadaTxt: (f, h) => `The cantina confirmed your reservation for <b>${f}</b> at <b>${h}</b>. Here is your ticket again.`,
    canceladaAsunto: (n) => `Your reservation was canceled, ${n} · Sin Yolanda El Paso`,
    canceladaT: 'Your reservation was canceled',
    canceladaTxt: (f, h) => `We canceled your reservation for <b>${f}</b> at <b>${h}</b>. If that was a mistake or you want another date, we are here.`,
    otraFecha: 'BOOK ANOTHER DATE',
  },
};

/* ============================================================
   Entrada
   ============================================================ */
function doGet() {
  return json({ ok: true, servicio: 'Sin Yolanda El Paso · correos' });
}

function doPost(e) {
  try {
    const datos = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (datos.sitio) return json({ ok: true }); // honeypot
    const accion = datos.accion || 'nueva';

    if (accion === 'prueba') return json(enviarPrueba());

    if (!/^SY-EP-[A-Z0-9]{6,12}$/.test(datos.folio || '')) return json({ ok: false, error: 'Folio inválido' });
    if (!limiteGlobal()) return json({ ok: false, error: 'Demasiados correos por ahora' });

    // Si hay Supabase, los datos salen de la base y no del navegador.
    const r = normalizar(leerDeSupabase(datos.folio) || datos, datos.lang);
    if (!esCorreo(r.correo) && accion !== 'nueva') return json({ ok: false, error: 'La reserva no tiene correo' });

    if (accion === 'estado') {
      if (r.estado !== 'confirmada' && r.estado !== 'cancelada') return json({ ok: true, omitido: true });
      if (!limitePorCorreo(`estado-${r.folio}-${r.estado}`, 1)) return json({ ok: true, omitido: 'ya enviado' });
      correoCambioEstado(r);
      return json({ ok: true, folio: r.folio });
    }

    if (!limitePorCorreo(r.correo, LIMITE_POR_CORREO)) return json({ ok: false, error: 'Límite de solicitudes por hora' });
    respaldoEnSheet(r);
    if (esCorreo(r.correo)) correoCliente(r);
    correoEquipo(r);
    return json({ ok: true, folio: r.folio });
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

/* ============================================================
   Correo al cliente
   ============================================================ */
function correoCliente(r) {
  const t = T[r.lang];
  const fecha = fechaBonita(r.fecha, r.lang);
  const hora = horaBonita(r.hora);
  const urlNoche = `${sitio()}/tu-noche/?folio=${encodeURIComponent(r.folio)}`;
  const imagenes = imagenesInline(urlNoche);

  const cierre = r.ocasion === 'cumpleanos' ? t.cierres.cumpleanos
    : r.ocasion === 'despedida' ? t.cierres.despedida
    : r.ocasion === 'divorcio' ? t.cierres.divorcio
    : r.corazon_roto ? t.cierres.roto : t.cierres.normal;

  const cuerpo = `
    ${titulo(t.hola(esc(primerNombre(r.nombre))))}
    ${parrafo(t.intro(fecha, hora, r.personas))}
    ${boleto(r, imagenes.qr ? 'cid:qr' : qrUrl(urlNoche))}
    ${depositoHTML(r)}
    ${boton(t.verNoche, urlNoche, MARCA.mostaza, MARCA.chocolate, true)}
    ${boton(t.invita, waLink('', t.textoInvita(fecha, hora, urlNoche)), MARCA.rosa, MARCA.chocolate, true)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="50%" style="padding:6px 4px 0 0">${boton(t.calendario, calendarioUrl(r, urlNoche), MARCA.cremaClaro, MARCA.chocolate, false)}</td>
      <td width="50%" style="padding:6px 0 0 4px">${boton(t.llegar, mapsUrl(), MARCA.cremaClaro, MARCA.chocolate, false)}</td>
    </tr></table>
    ${reglasHTML(t)}
    ${parrafo(`<i>${cierre}</i>`, 'center')}`;

  MailApp.sendEmail({
    to: r.correo,
    subject: t.asuntoCliente(primerNombre(r.nombre), fecha),
    htmlBody: plantilla(cuerpo, t, imagenes.logo ? 'cid:logo' : logoUrl()),
    inlineImages: imagenes.blobs,
    attachments: [ics(r, urlNoche)],
    name: 'Sin Yolanda El Paso',
    replyTo: equipo()[0] || '',
  });
}

/* ============================================================
   Correo al equipo
   ============================================================ */
function correoEquipo(r) {
  const destinatarios = equipo();
  if (!destinatarios.length) return;
  const fecha = fechaBonita(r.fecha, 'es');
  const hora = horaBonita(r.hora);
  const ocasion = (OCASIONES[r.ocasion] || OCASIONES.otra).es;
  const fila = (k, v) => `<tr><td style="padding:8px 10px;border-bottom:1px solid #eadcc2;font:bold 13px Arial,sans-serif;color:${MARCA.terracotaOscuro};white-space:nowrap;vertical-align:top">${k}</td><td style="padding:8px 10px;border-bottom:1px solid #eadcc2;font:14px Arial,sans-serif;color:${MARCA.chocolate}">${v}</td></tr>`;
  const extras = r.extras.length ? r.extras.map((x) => esc((EXTRAS[x.id] || { es: x.id }).es)).join('<br>') : 'Ninguno';
  const dep = r.deposito_estado === 'no_aplica' ? 'No aplica' : `${esc(T.es.depEstado[r.deposito_estado] || r.deposito_estado)} · ${dinero(r.monto_deposito)}`;
  const adminUrl = `${sitio()}/admin/?reserva=${encodeURIComponent(r.folio)}`;

  const cuerpo = `
    ${titulo('Nueva reserva')}
    ${parrafo(`<b>${esc(r.nombre)}</b> apartó para el <b>${fecha}</b> a las <b>${hora}</b>.`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:2px solid ${MARCA.chocolate};border-radius:12px;margin:8px 0 18px">
      ${fila('Folio', `<span style="font-family:Courier New,monospace">${esc(r.folio)}</span>`)}
      ${fila('Fecha', fecha)}
      ${fila('Hora', hora)}
      ${fila('Personas', String(r.personas))}
      ${fila('Mesa y zona', r.mesaNumero ? `Mesa ${r.mesaNumero} · ${esc(r.zonaTexto)}` : esc(r.zonaTexto || 'Sin mesa'))}
      ${fila('Ocasión', esc(ocasion))}
      ${fila('Corazón roto', r.corazon_roto ? 'Sí 💔' : 'No')}
      ${fila('Extras', extras)}
      ${fila('Depósito', dep)}
      ${fila('Correo', esc(r.correo || ''))}
      ${fila('WhatsApp', esc(r.telefono || ''))}
      ${fila('Comentarios', esc(r.comentarios || '·'))}
      ${fila('Fuente', esc(r.source || 'directo'))}
      ${fila('Estado', esc(r.estado || 'pendiente'))}
    </table>
    ${boton('VER EN EL ADMIN', adminUrl, MARCA.mostaza, MARCA.chocolate, true)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="50%" style="padding:6px 4px 0 0">${boton('WhatsApp al cliente', waLink(r.telefono, `¡Hola ${primerNombre(r.nombre)}! Te escribimos de Sin Yolanda El Paso por tu reserva ${r.folio}.`), '#25D366', '#fff', false)}</td>
      <td width="50%" style="padding:6px 0 0 4px">${boton('Responder por correo', `mailto:${encodeURIComponent(r.correo || '')}?subject=${encodeURIComponent(`Tu reserva ${r.folio} en Sin Yolanda El Paso`)}`, MARCA.cremaClaro, MARCA.chocolate, false)}</td>
    </tr></table>
    ${SHEET_URL() ? parrafo(`<a href="${SHEET_URL()}" style="color:${MARCA.terracotaOscuro}">Abrir la hoja de respaldo</a>`, 'center') : ''}`;

  const imagenes = imagenesInline(null);
  MailApp.sendEmail({
    to: destinatarios.join(','),
    subject: `🔔 Nueva reserva ${r.folio} · ${fecha} ${hora} · ${r.personas} personas · ${ocasion}`,
    htmlBody: plantilla(cuerpo, T.es, imagenes.logo ? 'cid:logo' : logoUrl()),
    inlineImages: imagenes.blobs,
    name: 'Reservas Sin Yolanda',
    replyTo: esCorreo(r.correo) ? r.correo : '',
  });
}

/* ============================================================
   Cambio de estado (confirmada / cancelada)
   ============================================================ */
function correoCambioEstado(r) {
  const t = T[r.lang];
  const fecha = fechaBonita(r.fecha, r.lang);
  const hora = horaBonita(r.hora);
  const urlNoche = `${sitio()}/tu-noche/?folio=${encodeURIComponent(r.folio)}`;
  const confirmada = r.estado === 'confirmada';
  const imagenes = imagenesInline(confirmada ? urlNoche : null);
  const cuerpo = confirmada
    ? `${titulo(t.confirmadaT)}${parrafo(t.confirmadaTxt(fecha, hora))}${boleto(r, imagenes.qr ? 'cid:qr' : qrUrl(urlNoche))}${depositoHTML(r)}${boton(t.verNoche, urlNoche, MARCA.mostaza, MARCA.chocolate, true)}${parrafo(`<i>${r.corazon_roto ? t.cierres.roto : t.cierres.normal}</i>`, 'center')}`
    : `${titulo(t.canceladaT)}${parrafo(t.canceladaTxt(fecha, hora))}${boton(t.otraFecha, `${sitio()}/reservaciones/`, MARCA.mostaza, MARCA.chocolate, true)}`;
  MailApp.sendEmail({
    to: r.correo,
    subject: confirmada ? t.confirmadaAsunto(primerNombre(r.nombre), fecha) : t.canceladaAsunto(primerNombre(r.nombre)),
    htmlBody: plantilla(cuerpo, t, imagenes.logo ? 'cid:logo' : logoUrl()),
    inlineImages: imagenes.blobs,
    attachments: confirmada ? [ics(r, urlNoche)] : [],
    name: 'Sin Yolanda El Paso',
    replyTo: equipo()[0] || '',
  });
}

/* ============================================================
   Prueba (botón "Mandar correo de prueba" del admin y testEnvio())
   ============================================================ */
function reservaFalsa() {
  const hoy = new Date();
  const en3 = new Date(hoy.getTime() + 3 * 86400000);
  return normalizar({
    folio: 'SY-EP-PRUEBA1', fecha: Utilities.formatDate(en3, ZONA_HORARIA, 'yyyy-MM-dd'), hora: '21:00', personas: 6,
    mesa_id: 3, zona: 'cerca-micro', nombre: 'Lupita Prueba Despechada', correo: equipo()[0], telefono: '+1 915 555 0123',
    ocasion: 'cumpleanos', corazon_roto: true, comentarios: 'Correo de prueba para la junta.',
    extras: [{ id: 'pastel', cantidad: 1 }, { id: 'mariachi', cantidad: 1 }], estado: 'pendiente',
    deposito_estado: 'pagado', monto_deposito: 185, source: 'prueba',
  }, 'es');
}

function enviarPrueba() {
  const destinatarios = equipo();
  if (!destinatarios.length) return { ok: false, error: 'Falta TEAM_EMAILS en las propiedades del script' };
  if (!limitePorCorreo('prueba', 5)) return { ok: false, error: 'Ya mandaste varias pruebas esta hora' };
  const r = reservaFalsa();
  correoCliente(r);
  correoEquipo(r);
  return { ok: true, enviadoA: destinatarios };
}

/** Para correr desde el editor de Apps Script. */
function testEnvio() {
  Logger.log(JSON.stringify(enviarPrueba()));
}

/** Crea la hoja de respaldo y pide los permisos la primera vez. */
function setup() {
  const id = prop('SHEET_ID');
  if (id) hojaReservas(SpreadsheetApp.openById(id));
  MailApp.getRemainingDailyQuota();
  UrlFetchApp.fetch('https://quickchart.io/qr?text=hola&size=50', { muteHttpExceptions: true });
  Logger.log('Listo. Correos que quedan hoy: ' + MailApp.getRemainingDailyQuota());
}

/* ============================================================
   Piezas de HTML (tablas e inline styles para Gmail y Outlook)
   ============================================================ */
function plantilla(cuerpo, t, logoSrc) {
  const colores = [MARCA.mostaza, MARCA.crema, MARCA.rosa, MARCA.terracota];
  const banderitas = Array.from({ length: 12 }, (_, i) =>
    `<td style="padding:0 3px"><div style="height:22px;background:${colores[i % 4]};border-radius:0 0 6px 6px;border:1px solid rgba(0,0,0,.15)"></div></td>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:${MARCA.crema}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${MARCA.crema}"><tr><td align="center" style="padding:20px 10px">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${MARCA.cremaClaro};border:3px solid ${MARCA.chocolate};border-radius:18px;overflow:hidden">
      <tr><td style="background:${MARCA.chocolate};padding:0 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${banderitas}</tr></table></td></tr>
      <tr><td align="center" style="background:${MARCA.chocolate};padding:18px 20px 22px">
        <img src="${logoSrc}" width="220" alt="Sin Yolanda El Paso" style="display:block;width:220px;max-width:70%;height:auto;border:0">
      </td></tr>
      <tr><td style="height:6px;background:${MARCA.mostaza}"></td></tr>
      <tr><td style="padding:26px 24px 10px">${cuerpo}</td></tr>
      <tr><td align="center" style="padding:16px 24px 22px;background:${MARCA.crema};font:12px Arial,sans-serif;color:${MARCA.terracotaOscuro}">${esc(t.pie)}</td></tr>
    </table>
  </td></tr></table></body></html>`;
}

function titulo(texto) {
  return `<h1 style="margin:0 0 10px;font:900 30px/1.05 Impact,'Arial Black',Arial,sans-serif;text-transform:uppercase;letter-spacing:.5px;color:${MARCA.terracota};text-align:center">${texto}</h1>`;
}
function parrafo(html, align) {
  return `<p style="margin:0 0 16px;font:16px/1.5 Georgia,'Times New Roman',serif;color:${MARCA.chocolate};text-align:${align || 'left'}">${html}</p>`;
}
function boton(texto, url, fondo, color, grande) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:${grande ? '10px 0' : '0'}"><tr><td align="center" style="background:${fondo};border:2px solid ${MARCA.chocolate};border-radius:999px">
    <a href="${url}" style="display:block;padding:${grande ? '15px 18px' : '11px 12px'};font:bold ${grande ? '17px' : '14px'} Arial,sans-serif;letter-spacing:${grande ? '2px' : '.5px'};color:${color};text-decoration:none">${esc(texto)}</a>
  </td></tr></table>`;
}

function boleto(r, qrSrc) {
  const t = T[r.lang];
  const dato = (k, v) => `<tr><td style="padding:0 0 2px;font:bold 11px Arial,sans-serif;letter-spacing:2px;color:${MARCA.terracotaOscuro};text-transform:uppercase">${k}</td></tr>
    <tr><td style="padding:0 0 10px;font:900 19px/1.15 Impact,'Arial Black',Arial,sans-serif;text-transform:uppercase;color:${MARCA.chocolate}">${v}</td></tr>`;
  const ocasion = (OCASIONES[r.ocasion] || OCASIONES.otra)[r.lang];
  const extras = r.extras.map((x) => esc((EXTRAS[x.id] || { es: x.id, en: x.id })[r.lang])).join(', ');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;background:#fff;border:3px solid ${MARCA.chocolate};border-radius:16px">
    <tr><td colspan="2" align="center" style="background:${MARCA.terracota};border-radius:12px 12px 0 0;padding:12px;font:bold 13px Arial,sans-serif;letter-spacing:4px;color:#fff;border-bottom:3px dashed ${MARCA.chocolate}">${t.admite(r.personas)}</td></tr>
    <tr>
      <td valign="top" style="padding:16px 8px 6px 18px"><table role="presentation" cellpadding="0" cellspacing="0">
        ${dato(t.fechaL, fechaBonita(r.fecha, r.lang))}
        ${dato(t.horaL, horaBonita(r.hora))}
        ${dato(t.mesaL, r.mesaNumero ? t.mesa(r.mesaNumero, esc(r.zonaTexto)) : esc(r.zonaTexto || t.sinMesa))}
        ${dato(t.ocasionL, esc(ocasion))}
        ${extras ? dato(t.extrasL, extras) : ''}
      </table></td>
      <td valign="top" align="center" width="150" style="padding:16px 18px 6px 4px">
        <img src="${qrSrc}" width="140" height="140" alt="QR ${esc(r.folio)}" style="display:block;width:140px;height:140px;border:2px solid ${MARCA.chocolate};border-radius:8px">
        <div style="font:11px Arial,sans-serif;color:${MARCA.terracotaOscuro};padding-top:6px">${t.escanea}</div>
      </td>
    </tr>
    <tr><td colspan="2" style="border-top:3px dashed ${MARCA.chocolate};padding:10px 18px">
      <table role="presentation" width="100%"><tr>
        <td style="font:bold 14px Arial,sans-serif;letter-spacing:2px;color:${MARCA.chocolate};text-transform:uppercase">${esc(primerNombre(r.nombre))}</td>
        <td align="right" style="font:15px 'Courier New',monospace;color:${MARCA.chocolate}">${t.folio}: <b>${esc(r.folio)}</b></td>
      </tr></table>
    </td></tr>
  </table>`;
}

function depositoHTML(r) {
  if (!r.deposito_estado || r.deposito_estado === 'no_aplica' || !(r.monto_deposito > 0)) return '';
  const t = T[r.lang];
  const pagado = r.deposito_estado === 'pagado';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px"><tr>
    <td style="padding:12px 16px;border-radius:12px;background:${pagado ? '#e6f6ea' : '#fff3cd'};border:2px solid ${pagado ? '#2f9e55' : MARCA.mostaza};font:15px Arial,sans-serif;color:${MARCA.chocolate}">
      <b>${t.deposito}:</b> ${dinero(r.monto_deposito)} · ${esc(t.depEstado[r.deposito_estado] || r.deposito_estado)}
    </td></tr></table>`;
}

function reglasHTML(t) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 14px;background:${MARCA.chocolate};border-radius:14px">
    <tr><td style="padding:16px 18px 6px;font:900 20px Impact,'Arial Black',Arial,sans-serif;text-transform:uppercase;color:${MARCA.mostaza}">${t.reglasT}</td></tr>
    ${t.reglas.map((x, i) => `<tr><td style="padding:4px 18px ${i === t.reglas.length - 1 ? '16px' : '4px'};font:15px/1.4 Georgia,serif;color:${MARCA.cremaClaro}"><b style="color:${MARCA.mostaza}">${i + 1}.</b> ${esc(x)}</td></tr>`).join('')}
  </table>`;
}

/* ============================================================
   Imágenes inline (logo y QR) para que Gmail y Outlook las muestren
   ============================================================ */
function imagenesInline(urlQR) {
  const blobs = {};
  let logo = false;
  let qr = false;
  try {
    const l = UrlFetchApp.fetch(logoUrl(), { muteHttpExceptions: true });
    if (l.getResponseCode() === 200) {
      blobs.logo = l.getBlob().setName('logo.png');
      logo = true;
    }
  } catch (e) { console.warn('logo', e); }
  if (urlQR) {
    try {
      const q = UrlFetchApp.fetch(qrUrl(urlQR), { muteHttpExceptions: true });
      if (q.getResponseCode() === 200) {
        blobs.qr = q.getBlob().setName('qr.png');
        qr = true;
      }
    } catch (e) { console.warn('qr', e); }
  }
  return { blobs, logo, qr };
}
const qrUrl = (texto) => `https://quickchart.io/qr?text=${encodeURIComponent(texto)}&size=300&margin=1&dark=3B1F14`;

/* ============================================================
   Archivo .ics
   ============================================================ */
function ics(r, urlNoche) {
  const inicio = instante(r.fecha, r.hora);
  const fin = new Date(inicio.getTime() + 2 * 3600000);
  const f = (d) => Utilities.formatDate(d, 'UTC', "yyyyMMdd'T'HHmmss'Z'");
  const escICS = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const titulo = r.lang === 'en' ? 'Sin Yolanda El Paso: time to sing!' : 'Sin Yolanda El Paso: ¡a cantar!';
  const texto = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sin Yolanda El Paso//Reservas//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${r.folio}@sinyolandaelpaso.com`,
    `DTSTAMP:${f(new Date())}`,
    `DTSTART:${f(inicio)}`,
    `DTEND:${f(fin)}`,
    `SUMMARY:${escICS(titulo)}`,
    `LOCATION:${escICS(DIRECCION)}`,
    `DESCRIPTION:${escICS(`Folio ${r.folio}. ${r.personas} personas. ${urlNoche}`)}`,
    `URL:${urlNoche}`,
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Sin Yolanda en 2 horas', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  return Utilities.newBlob(texto, 'text/calendar', `sin-yolanda-${r.folio}.ics`);
}

/** Fecha de servicio + hora en El Paso -> Date. Antes de las 6 AM es el día siguiente. */
function instante(fecha, hora) {
  const h = Number(hora.slice(0, 2));
  let dia = fecha;
  if (h < 6) {
    const d = Utilities.parseDate(fecha + ' 12:00', ZONA_HORARIA, 'yyyy-MM-dd HH:mm');
    dia = Utilities.formatDate(new Date(d.getTime() + 86400000), ZONA_HORARIA, 'yyyy-MM-dd');
  }
  return Utilities.parseDate(`${dia} ${hora}`, ZONA_HORARIA, 'yyyy-MM-dd HH:mm');
}

function calendarioUrl(r, urlNoche) {
  const inicio = instante(r.fecha, r.hora);
  const fin = new Date(inicio.getTime() + 2 * 3600000);
  const f = (d) => Utilities.formatDate(d, 'UTC', "yyyyMMdd'T'HHmmss'Z'");
  const q = {
    action: 'TEMPLATE',
    text: r.lang === 'en' ? 'Sin Yolanda El Paso: time to sing!' : 'Sin Yolanda El Paso: ¡a cantar!',
    dates: `${f(inicio)}/${f(fin)}`,
    details: `Folio ${r.folio}. ${urlNoche}`,
    location: DIRECCION,
  };
  return 'https://calendar.google.com/calendar/render?' + Object.keys(q).map((k) => `${k}=${encodeURIComponent(q[k])}`).join('&');
}
const mapsUrl = () => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(DIRECCION)}`;
function waLink(tel, texto) {
  const d = String(tel || '').replace(/\D/g, '');
  return `https://wa.me/${d}?text=${encodeURIComponent(texto)}`;
}

/* ============================================================
   Datos
   ============================================================ */
function normalizar(d, lang) {
  const mesaNumero = d.mesa_id || d.mesa || null;
  return {
    folio: String(d.folio || ''),
    fecha: String(d.fecha || ''),
    hora: String(d.hora || '00:00'),
    personas: Number(d.personas) || 1,
    mesaNumero,
    zonaTexto: d.zona ? (ZONAS[d.zona] || { es: d.zona, en: d.zona })[lang === 'en' ? 'en' : 'es'] : '',
    nombre: String(d.nombre || 'Compa').slice(0, 80),
    correo: String(d.correo || '').trim(),
    telefono: String(d.telefono || ''),
    ocasion: d.ocasion || 'cantar',
    corazon_roto: d.corazon_roto === true || d.corazon_roto === 'true',
    comentarios: d.comentarios ? String(d.comentarios).slice(0, 500) : '',
    extras: Array.isArray(d.extras) ? d.extras : [],
    estado: d.estado || 'pendiente',
    deposito_estado: d.deposito_estado || 'no_aplica',
    monto_deposito: Number(d.monto_deposito) || 0,
    source: d.source || '',
    lang: lang === 'en' || d.lang === 'en' ? 'en' : 'es',
  };
}

function leerDeSupabase(folio) {
  const url = prop('SUPABASE_URL');
  const key = prop('SUPABASE_ANON_KEY');
  if (!url || !key) return null;
  const r = UrlFetchApp.fetch(`${url}/rest/v1/reservas?folio=eq.${encodeURIComponent(folio)}&select=*`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    muteHttpExceptions: true,
  });
  if (r.getResponseCode() !== 200) return null;
  const filas = JSON.parse(r.getContentText());
  return filas[0] || null;
}

function respaldoEnSheet(r) {
  const id = prop('SHEET_ID');
  if (!id) return;
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const hoja = hojaReservas(SpreadsheetApp.openById(id));
    hoja.appendRow([new Date(), r.folio, r.estado, r.nombre, r.correo, r.telefono, r.fecha, r.hora, r.personas,
      r.mesaNumero || '', r.zonaTexto, (OCASIONES[r.ocasion] || OCASIONES.otra).es, r.corazon_roto ? 'Sí' : 'No',
      r.extras.map((x) => x.id).join(', '), r.deposito_estado, r.monto_deposito, r.comentarios, r.lang, r.source]);
  } finally {
    lock.releaseLock();
  }
}

function hojaReservas(libro) {
  let hoja = libro.getSheetByName('Reservas');
  if (!hoja) {
    hoja = libro.insertSheet('Reservas');
    const enc = ['Timestamp', 'Folio', 'Estado', 'Nombre', 'Correo', 'Teléfono', 'Fecha', 'Hora', 'Personas', 'Mesa', 'Zona',
      'Ocasión', 'Corazón roto', 'Extras', 'Depósito', 'Monto', 'Comentarios', 'Idioma', 'Fuente'];
    hoja.getRange(1, 1, 1, enc.length).setValues([enc]).setFontWeight('bold').setBackground(MARCA.chocolate).setFontColor(MARCA.mostaza);
    hoja.setFrozenRows(1);
  }
  return hoja;
}

/* ============================================================
   Límites
   ============================================================ */
function limitePorCorreo(clave, maximo) {
  const cache = CacheService.getScriptCache();
  const k = 'rl-' + Utilities.base64EncodeWebSafe(String(clave).toLowerCase()).slice(0, 200);
  const n = Number(cache.get(k) || 0);
  if (n >= maximo) return false;
  cache.put(k, String(n + 1), 3600);
  return true;
}
function limiteGlobal() {
  return limitePorCorreo('global', LIMITE_GLOBAL);
}

/* ============================================================
   Utilidades
   ============================================================ */
const prop = (k) => PropertiesService.getScriptProperties().getProperty(k) || '';
const sitio = () => (prop('SITE_URL') || 'https://sinyolandaelpaso.com').replace(/\/$/, '');
const logoUrl = () => prop('LOGO_URL') || `${sitio()}/assets/logos/logo-email.png`;
const equipo = () => prop('TEAM_EMAILS').split(',').map((x) => x.trim()).filter(esCorreo);
const SHEET_URL = () => (prop('SHEET_ID') ? `https://docs.google.com/spreadsheets/d/${prop('SHEET_ID')}` : '');
const esCorreo = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || ''));
const primerNombre = (n) => String(n || '').trim().split(/\s+/)[0] || 'Compa';
const dinero = (n) => '$' + Number(n).toFixed(Number(n) % 1 ? 2 : 0) + ' USD';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function fechaBonita(iso, lang) {
  const t = T[lang === 'en' ? 'en' : 'es'];
  const [y, m, d] = iso.split('-').map(Number);
  const f = new Date(Date.UTC(y, m - 1, d, 12));
  return t.fecha(t.dias[f.getUTCDay()], d, t.meses[m - 1]);
}
function horaBonita(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'AM' : 'PM'}`;
}
