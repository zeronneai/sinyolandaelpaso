// Genera supabase/seed.sql a partir de src/plataforma/seed.js.
// Uso: npm run seed

import { writeFileSync } from 'node:fs';
import * as S from '../src/plataforma/seed.js';

const lit = (v) => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (Array.isArray(v) && v.every((x) => typeof x === 'string')) return `array[${v.map(lit).join(',')}]::text[]`;
  if (typeof v === 'object') return `${lit(JSON.stringify(v))}::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
};
const hace = (min) => `now() - interval '${min} minutes'`;

function insert(tabla, filas, mapear) {
  if (!filas.length) return '';
  const convertidas = filas.map(mapear);
  const cols = Object.keys(convertidas[0]);
  const valores = convertidas.map((f) => `    (${cols.map((c) => f[c]).join(', ')})`).join(',\n');
  return `  insert into public.${tabla} (${cols.join(', ')}) values\n${valores};\n\n`;
}

const sinMeta = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith('_')));
const conLit = (o) => Object.fromEntries(Object.entries(sinMeta(o)).map(([k, v]) => [k, k === 'extras' ? `${lit(JSON.stringify(v ?? []))}::jsonb` : lit(v)]));

let cuerpo = '';
cuerpo += insert('mesas', S.mesasSeed, (m) => conLit(m)).replace(';\n\n', '\n  on conflict (id) do update set numero = excluded.numero, zona = excluded.zona, capacidad = excluded.capacidad, x = excluded.x, y = excluded.y, forma = excluded.forma;\n\n');
cuerpo += insert('reservas', S.reservasSeed, (r) => ({
  ...conLit(r),
  fecha: r._dia !== undefined ? `hoy + ${r._dia}` : r._domingo ? `hoy + (7 - extract(dow from hoy)::int)` : `dia_abierto(${r._abierto})`,
  llegada_at: r._llegada ? hace(r._llegada) : 'null',
  created_at: hace(60 * 24 * 2 + Math.floor(Math.random() * 600)),
}));
cuerpo += insert('turnos_micro', S.turnosSeed, (t) => ({ ...conLit(t), created_at: hace(t._hace) }));
cuerpo += insert('dedicatorias', S.dedicatoriasSeed, (d) => ({ ...conLit(d), created_at: hace(d._hace) }));
cuerpo += insert('llamados', S.llamadosSeed, (l) => ({ ...conLit(l), atendido_at: l._atendido ? hace(l._hace - l._atendido) : 'null', created_at: hace(l._hace) }));
cuerpo += insert('lista_espera', S.esperaSeed, (e) => ({ ...conLit(e), created_at: hace(e._hace) }));
cuerpo += insert('clientes', S.clientesSeed, (c) => ({ ...conLit(c), ultima_visita: c._ultima ? `hoy - ${c._ultima}` : 'null' }));
cuerpo += insert('resenas', S.resenasSeed, (r) => ({ ...conLit(r), created_at: hace(r._hace) }));
cuerpo += insert('fotos', S.fotosSeed, (f) => ({ ...conLit(f), created_at: hace(f._hace) }));

const sql = `-- ============================================================
-- Datos de demo. GENERADO por scripts/generar-seed.mjs desde
-- src/plataforma/seed.js. No lo edites a mano: corre \`npm run seed\`.
-- Las fechas son relativas a hoy en El Paso (America/Denver).
-- ============================================================

-- Migración por si la base viene de una versión anterior del schema
-- ("corazon_roto" ahora es "modo_fiesta"). Seguro de correr varias veces.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'reservas' and column_name = 'corazon_roto') then
    if exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'reservas' and column_name = 'modo_fiesta') then
      alter table public.reservas drop column corazon_roto;
    else
      alter table public.reservas rename column corazon_roto to modo_fiesta;
    end if;
  end if;
end $$;
alter table public.reservas add column if not exists modo_fiesta boolean not null default false;

create or replace function public.sembrar_demo()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  hoy date := (now() at time zone 'America/Denver')::date;
begin
${cuerpo}end $$;

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
`;

writeFileSync(new URL('../supabase/seed.sql', import.meta.url), sql);
console.log('[seed] supabase/seed.sql generado');
