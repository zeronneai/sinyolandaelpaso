-- ============================================================
-- Datos de demo. GENERADO por scripts/generar-seed.mjs desde
-- src/plataforma/seed.js. No lo edites a mano: corre `npm run seed`.
-- Las fechas son relativas a hoy en El Paso (America/Denver).
-- ============================================================

create or replace function public.sembrar_demo()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  hoy date := (now() at time zone 'America/Denver')::date;
begin
  insert into public.mesas (id, numero, zona, capacidad, x, y, forma) values
    (1, 1, 'cerca-micro', 4, 320, 175, 'redonda'),
    (2, 2, 'cerca-micro', 4, 430, 175, 'redonda'),
    (3, 3, 'cerca-micro', 6, 570, 175, 'cuadrada'),
    (4, 4, 'cerca-micro', 6, 680, 175, 'cuadrada'),
    (5, 5, 'cerca-micro', 8, 340, 300, 'rectangular'),
    (6, 6, 'cerca-micro', 4, 470, 300, 'redonda'),
    (7, 7, 'cerca-micro', 2, 565, 300, 'redonda'),
    (8, 8, 'cerca-micro', 12, 670, 300, 'rectangular'),
    (9, 9, 'tranquis', 2, 830, 155, 'redonda'),
    (10, 10, 'tranquis', 2, 930, 155, 'redonda'),
    (11, 11, 'tranquis', 4, 830, 270, 'cuadrada'),
    (12, 12, 'tranquis', 4, 930, 270, 'cuadrada'),
    (13, 13, 'tranquis', 6, 880, 390, 'rectangular'),
    (14, 14, 'tranquis', 10, 880, 510, 'rectangular'),
    (15, 15, 'barra', 2, 150, 165, 'periquera'),
    (16, 16, 'barra', 2, 150, 255, 'periquera'),
    (17, 17, 'barra', 2, 150, 345, 'periquera'),
    (18, 18, 'barra', 4, 150, 435, 'periquera'),
    (19, 19, 'barra', 4, 150, 525, 'periquera'),
    (20, 20, 'terraza', 4, 300, 630, 'redonda'),
    (21, 21, 'terraza', 4, 410, 630, 'redonda'),
    (22, 22, 'terraza', 6, 520, 630, 'cuadrada'),
    (23, 23, 'terraza', 6, 630, 630, 'cuadrada'),
    (24, 24, 'terraza', 8, 745, 630, 'rectangular')
  on conflict (id) do update set numero = excluded.numero, zona = excluded.zona, capacidad = excluded.capacidad, x = excluded.x, y = excluded.y, forma = excluded.forma;

  insert into public.reservas (extras, modo_fiesta, comentarios, deposito_estado, monto_deposito, folio, hora, personas, mesa_id, zona, nombre, correo, telefono, ocasion, estado, source, fecha, llegada_at, created_at) values
    ('[{"id":"pastel","cantidad":1}]'::jsonb, false, null, 'pagado', 35, 'SY-EP-DEMO01', '19:00', 4, 2, 'cerca-micro', 'Valeria Domínguez', 'valeria.dominguez@example.com', '+1 915 555 0141', 'cumpleanos', 'sentada', 'instagram', hoy + 0, now() - interval '35 minutes', now() - interval '2955 minutes'),
    ('[{"id":"despedida","cantidad":1}]'::jsonb, false, 'Somos 8 y la novia no sabe nada. Shhh.', 'pagado', 50, 'SY-EP-DEMO02', '19:30', 8, 5, 'cerca-micro', 'Mariana Treviño', 'mariana.trevino@example.com', '+52 656 555 0192', 'despedida', 'llego', 'tiktok', hoy + 0, now() - interval '6 minutes', now() - interval '3457 minutes'),
    ('[]'::jsonb, true, null, 'no_aplica', 0, 'SY-EP-DEMO03', '20:00', 2, 7, 'cerca-micro', 'Jesús "Chuy" Arellano', 'chuy.arellano@example.com', '+1 915 555 0177', 'cantar', 'confirmada', 'google', hoy + 0, null, now() - interval '3389 minutes'),
    ('[{"id":"botella","cantidad":1}]'::jsonb, true, 'Noche de amigas. Queremos que la festejada se sienta reina.', 'pagado', 120, 'SY-EP-DEMO04', '20:30', 6, 3, 'cerca-micro', 'Daniela Robles', 'dani.robles@example.com', '+1 915 555 0118', 'amigas', 'confirmada', 'instagram', hoy + 0, null, now() - interval '3002 minutes'),
    ('[]'::jsonb, false, null, 'no_aplica', 0, 'SY-EP-DEMO05', '21:00', 4, 11, 'tranquis', 'Carlos Ochoa', 'carlos.ochoa@example.com', '+1 915 555 0163', 'cantar', 'pendiente', 'creador-lalo', hoy + 0, null, now() - interval '3318 minutes'),
    ('[]'::jsonb, true, null, 'no_aplica', 0, 'SY-EP-DEMO06', '21:30', 3, 18, 'barra', 'Andrea Saucedo', 'andrea.saucedo@example.com', '+52 656 555 0110', 'cantar', 'pendiente', 'instagram', hoy + 0, null, now() - interval '3060 minutes'),
    ('[{"id":"mariachi","cantidad":1}]'::jsonb, false, 'Posada de la oficina, factura a nombre de la empresa.', 'pagado', 200, 'SY-EP-DEMO07', '22:00', 12, 8, 'cerca-micro', 'Luis Fernando Holguín', 'lf.holguin@example.com', '+1 915 555 0155', 'posada', 'confirmada', 'google', hoy + 0, null, now() - interval '3194 minutes'),
    ('[]'::jsonb, false, null, 'no_aplica', 0, 'SY-EP-DEMO08', '19:00', 2, 9, 'tranquis', 'Paola Chávez', 'paola.chavez@example.com', '+1 915 555 0124', 'cantar', 'confirmada', 'instagram', dia_abierto(1), null, now() - interval '3074 minutes'),
    ('[{"id":"pastel","cantidad":1}]'::jsonb, false, null, 'pendiente', 35, 'SY-EP-DEMO09', '20:30', 6, 4, 'cerca-micro', 'Ricardo Montes', 'ricardo.montes@example.com', '+1 915 555 0181', 'cumpleanos', 'pendiente', 'tiktok', dia_abierto(1), null, now() - interval '2997 minutes'),
    ('[{"id":"despedida","cantidad":1},{"id":"botella","cantidad":1}]'::jsonb, false, null, 'pagado', 170, 'SY-EP-DEMO10', '21:00', 10, 14, 'tranquis', 'Karla Villalobos', 'karla.villalobos@example.com', '+52 656 555 0137', 'despedida', 'confirmada', 'instagram', dia_abierto(2), null, now() - interval '3446 minutes'),
    ('[]'::jsonb, true, null, 'no_aplica', 0, 'SY-EP-DEMO11', '22:00', 4, 1, 'cerca-micro', 'Brenda Lucero', 'brenda.lucero@example.com', '+1 915 555 0109', 'amigas', 'confirmada', 'creador-lalo', dia_abierto(2), null, now() - interval '2888 minutes'),
    ('[]'::jsonb, false, null, 'no_aplica', 0, 'SY-EP-DEMO12', '10:30', 8, 24, 'terraza', 'Óscar Meraz', 'oscar.meraz@example.com', '+1 915 555 0146', 'recovery-brunch', 'confirmada', 'google', hoy + (7 - extract(dow from hoy)::int), null, now() - interval '3288 minutes'),
    ('[]'::jsonb, true, null, 'no_aplica', 0, 'SY-EP-DEMO13', '12:00', 4, 21, 'terraza', 'Fernanda Quiñones', 'fer.quinones@example.com', '+52 656 555 0170', 'recovery-brunch', 'pendiente', 'instagram', hoy + (7 - extract(dow from hoy)::int), null, now() - interval '3254 minutes'),
    ('[]'::jsonb, false, null, 'no_aplica', 0, 'SY-EP-DEMO14', '19:30', 2, 10, 'tranquis', 'Miguel Ángel Durán', 'miguel.duran@example.com', '+1 915 555 0158', 'cantar', 'cancelada', 'google', dia_abierto(4), null, now() - interval '3213 minutes'),
    ('[{"id":"pastel","cantidad":1},{"id":"mariachi","cantidad":1}]'::jsonb, false, null, 'pagado', 185, 'SY-EP-DEMO15', '20:00', 6, 22, 'terraza', 'Ximena Portillo', 'ximena.portillo@example.com', '+1 915 555 0133', 'cumpleanos', 'confirmada', 'tiktok', dia_abierto(5), null, now() - interval '3064 minutes');

  insert into public.turnos_micro (mesa, nombre, cancion, artista, estado, created_at) values
    (2, 'Valeria', 'La Bikina', 'Luis Miguel', 'cantando', now() - interval '4 minutes'),
    (5, 'Mariana y sus damas', 'La Chona', 'Los Tucanes de Tijuana', 'en_fila', now() - interval '12 minutes'),
    (7, 'Chuy', 'El Rey', 'José Alfredo Jiménez', 'en_fila', now() - interval '9 minutes'),
    (3, 'Dani', 'Mátalas', 'Alejandro Fernández', 'en_fila', now() - interval '3 minutes');

  insert into public.dedicatorias (mesa, cancion, para, mensaje, anonimo, estado, created_at) values
    (2, 'El Noa Noa', 'Valeria', 'Feliz cumple, amiga. Que se prenda la fiesta.', false, 'en_fila', now() - interval '18 minutes'),
    (3, 'Mátalas', 'Las reinas de la mesa 3', 'Esta va por las que mandan.', true, 'en_fila', now() - interval '14 minutes'),
    (5, 'Me gustas mucho', 'La novia', 'Para la futura señora. Te vamos a extrañar los viernes.', false, 'en_fila', now() - interval '8 minutes'),
    (11, 'El Rey', 'Mi compadre', 'Porque sigues siendo el rey.', true, 'cantada', now() - interval '40 minutes'),
    (18, 'El Sinaloense', 'Todos los de la barra', '¡Salud, dinero y amor!', false, 'en_fila', now() - interval '2 minutes');

  insert into public.llamados (mesa, tipo, estado, atendido_at, created_at) values
    (5, 'mesero', 'pendiente', null, now() - interval '2 minutes'),
    (2, 'cuenta', 'pendiente', null, now() - interval '7 minutes'),
    (3, 'mesero', 'atendido', now() - interval '48 minutes', now() - interval '50 minutes'),
    (8, 'cuenta', 'atendido', now() - interval '34 minutes', now() - interval '40 minutes'),
    (11, 'mesero', 'atendido', now() - interval '22 minutes', now() - interval '25 minutes'),
    (18, 'ayuda', 'atendido', now() - interval '11 minutes', now() - interval '15 minutes');

  insert into public.lista_espera (nombre, telefono, personas, estado, created_at) values
    ('Rocío Galindo', '+1 915 555 0190', 4, 'esperando', now() - interval '22 minutes'),
    ('Tony Esparza', '+52 656 555 0128', 2, 'esperando', now() - interval '11 minutes'),
    ('Familia Rentería', '+1 915 555 0115', 6, 'avisado', now() - interval '30 minutes');

  insert into public.clientes (nombre, correo, telefono, visitas, sellos, cumpleanos, notas, etiquetas, ultima_visita) values
    ('Valeria Domínguez', 'valeria.dominguez@example.com', '+1 915 555 0141', 6, 4, '1994-10-12', 'Siempre pide mesa 2. Canta Juanga.', array['frecuente','cumpleañera']::text[], hoy - 9),
    ('Mariana Treviño', 'mariana.trevino@example.com', '+52 656 555 0192', 2, 2, '1997-03-08', 'Organiza despedidas.', array['grupos']::text[], hoy - 30),
    ('Jesús "Chuy" Arellano', 'chuy.arellano@example.com', '+1 915 555 0177', 11, 5, '1989-07-21', 'El rey del micro. Le toca cantarito de la casa.', array['frecuente','vip']::text[], hoy - 3),
    ('Daniela Robles', 'dani.robles@example.com', '+1 915 555 0118', 3, 3, '1991-12-02', null, array['fiestera']::text[], hoy - 14),
    ('Carlos Ochoa', 'carlos.ochoa@example.com', '+1 915 555 0163', 1, 1, null, 'Llegó por el creador Lalo.', array[]::text[], hoy - 45),
    ('Paola Chávez', 'paola.chavez@example.com', '+1 915 555 0124', 4, 2, '1996-05-19', null, array['brunch']::text[], hoy - 7),
    ('Karla Villalobos', 'karla.villalobos@example.com', '+52 656 555 0137', 2, 1, '1993-09-30', 'Viene de Juárez con grupo grande.', array['grupos']::text[], hoy - 60),
    ('Brenda Lucero', 'brenda.lucero@example.com', '+1 915 555 0109', 5, 4, '1990-02-14', 'Organiza la noche de amigas cada mes.', array['frecuente','fiestera']::text[], hoy - 5),
    ('Óscar Meraz', 'oscar.meraz@example.com', '+1 915 555 0146', 8, 3, '1985-11-03', 'Brunch de domingo con la familia.', array['brunch','frecuente']::text[], hoy - 6),
    ('Ximena Portillo', 'ximena.portillo@example.com', '+1 915 555 0133', 1, 0, '2001-10-20', null, array['nueva']::text[], null);

  insert into public.resenas (folio, estrellas, comentario, created_at) values
    ('SY-EP-DEMO11', 5, 'La mejor noche de amigas. Cantamos hasta quedarnos sin voz.', now() - interval '4320 minutes'),
    ('SY-EP-DEMO08', 5, 'El cantarito y el ambiente, de diez.', now() - interval '7200 minutes'),
    ('SY-EP-DEMO12', 4, 'Muy buen brunch, la música un poco alta para la abuela.', now() - interval '8640 minutes'),
    ('SY-EP-DEMO05', 2, 'Tardaron mucho en traer la cuenta.', now() - interval '11520 minutes');

  insert into public.fotos (mesa, url, estado, created_at) values
    (2, '/assets/fotos/ig_singing.jpg', 'aprobada', now() - interval '25 minutes'),
    (5, '/assets/fotos/ig_green.jpg', 'aprobada', now() - interval '15 minutes'),
    (11, '/assets/fotos/jarrito.jpg', 'pendiente', now() - interval '3 minutes');

end $$;

-- n-ésimo día abierto después de hoy (sin lunes ni martes)
create or replace function public.dia_abierto(n int)
returns date
language sql
stable
as $$
  select d::date
  from generate_series((now() at time zone 'America/Denver')::date + 1,
                       (now() at time zone 'America/Denver')::date + 21,
                       interval '1 day') d
  where extract(dow from d) not in (1, 2)
  order by d
  offset n - 1
  limit 1
$$;

select public.reiniciar_demo();
