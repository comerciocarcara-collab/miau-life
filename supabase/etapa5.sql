-- =====================================================================
-- MIAU LIFE · Etapa 5 (Energia, "Só 1 coisa agora", Agenda do dia, Viagem)
-- Como usar: Supabase > SQL Editor > "+" > Create a new snippet
--            > cole TUDO isto > Run.
-- Pode rodar mais de uma vez sem problema. Nada do que já existe é apagado.
-- (Rode DEPOIS do schema.sql, etapa2.sql, etapa3.sql e etapa4.sql.)
-- =====================================================================

-- Campos novos nas atividades ------------------------------------------
alter table public.atividades add column if not exists minutos          integer;   -- tempo estimado
alter table public.atividades add column if not exists esforco          text;      -- leve · medio · pesado
alter table public.atividades add column if not exists pai_id           uuid references public.atividades(id) on delete cascade; -- micropasso de uma tarefa maior
alter table public.atividades add column if not exists ordem            integer;   -- ordem dos micropassos / fila
alter table public.atividades add column if not exists adiada_ate       date;      -- botão "Depois": escondida até este dia
alter table public.atividades add column if not exists adiada_vezes     integer not null default 0;
alter table public.atividades add column if not exists deslocamento_min integer;   -- ida + volta de um compromisso
alter table public.atividades add column if not exists eh_deslocamento  boolean not null default false; -- bloco de estrada / voo

do $$ begin
  alter table public.atividades add constraint atividades_esforco_ok check (esforco is null or esforco in ('leve','medio','pesado'));
exception when duplicate_object then null; end $$;

create index if not exists atividades_pai on public.atividades (pai_id);

-- Cuidados: versão mínima para dias de energia baixa -------------------
alter table public.cuidados add column if not exists versao_minima text;

-- ENERGIA: cada check-in do dia ----------------------------------------
create table if not exists public.energia (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  dia         date not null,
  nivel       text not null check (nivel in ('baixa','media','boa')),
  marcas      text[] not null default '{}',   -- dormi_bem · agua · comi · cochilei
  created_at  timestamptz not null default now()
);
create index if not exists energia_user_dia on public.energia (user_id, dia);

-- PAUSAS: uma área "descansando" entre duas datas (ex.: Estudos na viagem)
create table if not exists public.pausas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  area_id     uuid not null references public.areas(id) on delete cascade,
  de          date not null,
  ate         date not null,
  motivo      text,
  created_at  timestamptz not null default now()
);

-- VIAGENS ----------------------------------------------------------------
create table if not exists public.viagens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  destino     text not null,
  ida         date,
  volta       date,
  hospedagem  text,
  notas       text,
  pausar_estudos boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.viagem_trechos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  viagem_id   uuid not null references public.viagens(id) on delete cascade,
  tipo        text not null default 'voo',     -- voo · carro · onibus · pernoite
  origem      text,                            -- BEL
  origem_nome text,                            -- Belém
  destino     text,
  destino_nome text,
  numero      text,                            -- G3 2055
  partida     timestamptz,
  chegada     timestamptz,
  aeroporto   text,
  portao      text,
  localizador text,
  checkin_em  timestamptz,                     -- quando abre o check-in online
  notas       text,
  created_at  timestamptz not null default now()
);

create table if not exists public.viagem_itens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  viagem_id   uuid not null references public.viagens(id) on delete cascade,
  tipo        text not null default 'checklist' check (tipo in ('checklist','desejo')),
  nome        text not null,
  quando      text,                            -- desejo: "sábado de manhã"
  feito       boolean not null default false,
  created_at  timestamptz not null default now()
);

-- SEGURANÇA: cada pessoa só enxerga e altera os PRÓPRIOS dados ---------
alter table public.energia         enable row level security;
alter table public.pausas          enable row level security;
alter table public.viagens         enable row level security;
alter table public.viagem_trechos  enable row level security;
alter table public.viagem_itens    enable row level security;

drop policy if exists "energia: so o dono" on public.energia;
create policy "energia: so o dono" on public.energia
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "pausas: so o dono" on public.pausas;
create policy "pausas: so o dono" on public.pausas
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "viagens: so o dono" on public.viagens;
create policy "viagens: so o dono" on public.viagens
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "viagem_trechos: so o dono" on public.viagem_trechos;
create policy "viagem_trechos: so o dono" on public.viagem_trechos
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "viagem_itens: so o dono" on public.viagem_itens;
create policy "viagem_itens: so o dono" on public.viagem_itens
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- MANTER ACORDADO: uma consulta pública e leve que o GitHub faz a cada 3 dias,
-- para o Supabase gratuito não pausar o projeto por falta de uso.
create or replace function public.manter_acordado() returns text
language sql stable security definer set search_path = public as $$ select 'miau'::text $$;
grant execute on function public.manter_acordado() to anon, authenticated;
