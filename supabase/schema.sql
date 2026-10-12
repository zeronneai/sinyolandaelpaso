-- ============================================================
-- Sin Yolanda El Paso · plataforma
-- Correr completo en Supabase > SQL Editor. Después correr seed.sql.
--
-- OJO: las políticas RLS de abajo son ABIERTAS PARA EL DEMO (anon puede
-- leer, insertar y actualizar). Antes de producción el admin debe entrar
-- con Supabase Auth y hay que cerrar estas políticas. Ver README.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- Tablas ----------

create table if not exists public.mesas (
  id         int primary key,
  numero     int not null unique,
  zona       text not null,
  capacidad  int not null check (capacidad > 0),
  x          int not null,
  y          int not null,
  forma      text not null default 'redonda'
);

create table if not exists public.reservas (
  id               uuid primary key default gen_random_uuid(),
  folio            text not null unique,
  fecha            date not null,
  hora             text not null check (hora ~ '^\d{2}:\d{2}$'),
  personas         int not null check (personas between 1 and 30),
  mesa_id          int references public.mesas(id) on delete set null,
  zona             text,
  nombre           text not null,
  correo           text not null,
  telefono         text not null,
  ocasion          text,
  corazon_roto     boolean not null default false,
  comentarios      text check (char_length(comentarios) <= 500),
  extras           jsonb not null default '[]'::jsonb,
  estado           text not null default 'pendiente'
                   check (estado in ('pendiente','confirmada','llego','sentada','se_fue','no_llego','cancelada')),
  deposito_estado  text not null default 'no_aplica'
                   check (deposito_estado in ('no_aplica','pendiente','pagado','reembolsado','fallido')),
  monto_deposito   numeric(10,2) not null default 0,
  source           text,
  llegada_at       timestamptz,
  created_at       timestamptz not null default now()
);
create index if not exists reservas_fecha_idx on public.reservas (fecha);

create table if not exists public.lista_espera (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  telefono    text,
  personas    int not null default 2,
  estado      text not null default 'esperando' check (estado in ('esperando','avisado','sentado','se_fue')),
  created_at  timestamptz not null default now()
);

create table if not exists public.dedicatorias (
  id          uuid primary key default gen_random_uuid(),
  mesa        int,
  cancion     text not null,
  para        text not null,
  mensaje     text check (char_length(mensaje) <= 140),
  anonimo     boolean not null default false,
  estado      text not null default 'en_fila' check (estado in ('en_fila','cantada','saltada')),
  created_at  timestamptz not null default now()
);

create table if not exists public.turnos_micro (
  id          uuid primary key default gen_random_uuid(),
  mesa        int,
  nombre      text not null,
  cancion     text not null,
  artista     text,
  estado      text not null default 'en_fila' check (estado in ('en_fila','cantando','cantado','saltado')),
  created_at  timestamptz not null default now()
);

create table if not exists public.llamados (
  id           uuid primary key default gen_random_uuid(),
  mesa         int not null,
  tipo         text not null check (tipo in ('mesero','cuenta','ayuda')),
  estado       text not null default 'pendiente' check (estado in ('pendiente','atendido')),
  atendido_at  timestamptz,
  created_at   timestamptz not null default now()
);

create table if not exists public.fotos (
  id          uuid primary key default gen_random_uuid(),
  mesa        int,
  url         text not null,
  estado      text not null default 'pendiente' check (estado in ('pendiente','aprobada','rechazada')),
  created_at  timestamptz not null default now()
);

create table if not exists public.clientes (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null,
  correo         text,
  telefono       text unique,
  visitas        int not null default 0,
  sellos         int not null default 0,
  ultima_visita  date,
  cumpleanos     date,
  notas          text,
  etiquetas      text[] not null default '{}'
);

create table if not exists public.resenas (
  id          uuid primary key default gen_random_uuid(),
  folio       text,
  estrellas   int not null check (estrellas between 1 and 5),
  comentario  text,
  created_at  timestamptz not null default now()
);

create table if not exists public.eventos_pantalla (
  id          uuid primary key default gen_random_uuid(),
  tipo        text not null,
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- ---------- RLS (DEMO: abierto) ----------

do $$
declare t text;
begin
  foreach t in array array['mesas','reservas','lista_espera','dedicatorias','turnos_micro',
                           'llamados','fotos','clientes','resenas','eventos_pantalla']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists demo_leer on public.%I', t);
    execute format('drop policy if exists demo_insertar on public.%I', t);
    execute format('drop policy if exists demo_actualizar on public.%I', t);
    execute format('create policy demo_leer on public.%I for select to anon, authenticated using (true)', t);
    execute format('create policy demo_insertar on public.%I for insert to anon, authenticated with check (true)', t);
    execute format('create policy demo_actualizar on public.%I for update to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ---------- Realtime ----------

do $$
declare t text;
begin
  foreach t in array array['reservas','lista_espera','dedicatorias','turnos_micro',
                           'llamados','fotos','clientes','resenas','eventos_pantalla']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---------- Storage para el muro de fotos ----------

insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do nothing;

drop policy if exists demo_fotos_subir on storage.objects;
create policy demo_fotos_subir on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'fotos');
drop policy if exists demo_fotos_leer on storage.objects;
create policy demo_fotos_leer on storage.objects
  for select to anon, authenticated using (bucket_id = 'fotos');

-- ---------- Reiniciar demo ----------
-- Borra todo y vuelve a sembrar con sembrar_demo() (definida en seed.sql).
-- QUITAR antes de producción.

create or replace function public.reiniciar_demo()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  truncate public.reservas, public.lista_espera, public.dedicatorias, public.turnos_micro,
           public.llamados, public.fotos, public.clientes, public.resenas, public.eventos_pantalla;
  perform public.sembrar_demo();
end $$;

grant execute on function public.reiniciar_demo() to anon, authenticated;
