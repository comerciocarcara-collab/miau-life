-- =====================================================================
-- MIAU LIFE · Etapa 4 (Vida Fit: água, medidas, treinos e receitas)
-- Como usar: Supabase > SQL Editor > "+" > Create a new snippet
--            > cole TUDO isto > Run.
-- Pode rodar mais de uma vez sem problema.
-- (Rode DEPOIS do schema.sql, etapa2.sql e etapa3.sql.)
-- =====================================================================

-- Metas pessoais da Vida Fit (uma linha por pessoa)
create table if not exists public.fit_perfil (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique default auth.uid() references auth.users(id) on delete cascade,
  meta_agua_ml  integer not null default 2000 check (meta_agua_ml > 0),
  meta_peso_kg  numeric(5,1),
  created_at    timestamptz not null default now()
);

-- Água bebida em cada dia (uma linha por dia)
create table if not exists public.agua (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  dia         date not null,
  ml          integer not null default 0 check (ml >= 0),
  created_at  timestamptz not null default now(),
  unique (user_id, dia)
);

-- Medidas e peso
create table if not exists public.medidas (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  dia          date not null,
  peso_kg      numeric(5,1),
  cintura_cm   numeric(5,1),
  quadril_cm   numeric(5,1),
  braco_cm     numeric(5,1),
  coxa_cm      numeric(5,1),
  nota         text,
  created_at   timestamptz not null default now()
);
create index if not exists medidas_user_dia on public.medidas (user_id, dia);

-- Treinos (exercicios: lista com nome, series, repeticoes e carga)
create table if not exists public.treinos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome          text not null,
  dias_semana   smallint[],                 -- 0=Dom ... 6=Sáb (vazio = sem dia fixo)
  exercicios    jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);

-- Dias em que cada treino foi feito
create table if not exists public.treinos_feitos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  treino_id   uuid not null references public.treinos(id) on delete cascade,
  dia         date not null,
  created_at  timestamptz not null default now(),
  unique (treino_id, dia)
);

-- Receitas
create table if not exists public.receitas (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome          text not null,
  refeicao      text not null default 'Almoço',
  ingredientes  text,
  preparo       text,
  favorita      boolean not null default false,
  created_at    timestamptz not null default now()
);

-- SEGURANÇA: cada pessoa só enxerga e altera os PRÓPRIOS dados ---------
alter table public.fit_perfil      enable row level security;
alter table public.agua            enable row level security;
alter table public.medidas         enable row level security;
alter table public.treinos         enable row level security;
alter table public.treinos_feitos  enable row level security;
alter table public.receitas        enable row level security;

drop policy if exists "fit_perfil: so o dono" on public.fit_perfil;
create policy "fit_perfil: so o dono" on public.fit_perfil
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "agua: so o dono" on public.agua;
create policy "agua: so o dono" on public.agua
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "medidas: so o dono" on public.medidas;
create policy "medidas: so o dono" on public.medidas
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "treinos: so o dono" on public.treinos;
create policy "treinos: so o dono" on public.treinos
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "treinos_feitos: so o dono" on public.treinos_feitos;
create policy "treinos_feitos: so o dono" on public.treinos_feitos
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "receitas: so o dono" on public.receitas;
create policy "receitas: so o dono" on public.receitas
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
