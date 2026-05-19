-- ============================================================================
-- EduFlow — 0001_init.sql
-- Schema relacional completo (PostgreSQL / Supabase).
-- Enums via text + CHECK. PKs uuid. Multi-tenant por centro_id.
-- Auth gerida pela app (public.users, NÃO auth.users) — fase atual.
-- ============================================================================

create extension if not exists pgcrypto;

-- ── centros ─────────────────────────────────────────────────────────────────
create table public.centros (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null unique,
  created_at  timestamptz not null default now()
);

-- ── users (auth gerida pela app) ────────────────────────────────────────────
create table public.users (
  id            uuid primary key default gen_random_uuid(),
  centro_id     uuid not null references public.centros(id) on delete restrict,
  nome          text not null,
  email         text not null unique,
  password_hash text,
  role          text not null
                  check (role in ('admin','rececionista','explicador','encarregado')),
  created_at    timestamptz not null default now()
);

-- ── disciplinas ─────────────────────────────────────────────────────────────
create table public.disciplinas (
  id         uuid primary key default gen_random_uuid(),
  centro_id  uuid not null references public.centros(id) on delete restrict,
  nome       text not null,
  cor_hsl    text,
  created_at timestamptz not null default now(),
  unique (centro_id, nome)
);

-- ── professor_perfis (1:1 com users role='explicador') ──────────────────────
create table public.professor_perfis (
  user_id      uuid primary key references public.users(id) on delete cascade,
  centro_id    uuid not null references public.centros(id) on delete restrict,
  telefone     text,
  valor_hora   numeric(8,2) not null check (valor_hora >= 0),
  habilitacoes text,
  iban         text,
  nif          text,
  estado       text not null default 'ativo'
                 check (estado in ('ativo','inativo')),
  created_at   timestamptz not null default now()
);

create table public.disponibilidades (
  id                uuid primary key default gen_random_uuid(),
  professor_user_id uuid not null references public.professor_perfis(user_id) on delete cascade,
  dia_semana        integer not null check (dia_semana between 1 and 7),
  hora_inicio       time not null,
  hora_fim          time not null,
  created_at        timestamptz not null default now(),
  check (hora_fim > hora_inicio)
);

create table public.professor_disciplinas (
  professor_user_id uuid not null references public.professor_perfis(user_id) on delete cascade,
  disciplina_id     uuid not null references public.disciplinas(id) on delete cascade,
  primary key (professor_user_id, disciplina_id)
);

-- ── alunos ──────────────────────────────────────────────────────────────────
create table public.alunos (
  id                   uuid primary key default gen_random_uuid(),
  centro_id            uuid not null references public.centros(id) on delete restrict,
  nome                 text not null,
  email                text,
  telefone             text,
  escola               text,
  ano_letivo           integer check (ano_letivo between 1 and 12),
  estado               text not null default 'ativo'
                         check (estado in ('ativo','inativo','pre-inscrito')),
  data_inscricao       date not null,
  valor_hora           numeric(8,2) check (valor_hora >= 0),
  explicador_user_id   uuid references public.professor_perfis(user_id) on delete set null,
  encarregado_nome     text not null,
  encarregado_email    text,
  encarregado_telefone text,
  encarregado_nif      text,
  encarregado_user_id  uuid references public.users(id) on delete set null,
  created_at           timestamptz not null default now()
);

create table public.alunos_disciplinas (
  aluno_id      uuid not null references public.alunos(id) on delete cascade,
  disciplina_id uuid not null references public.disciplinas(id) on delete cascade,
  primary key (aluno_id, disciplina_id)
);

-- ── salas ───────────────────────────────────────────────────────────────────
create table public.salas (
  id           uuid primary key default gen_random_uuid(),
  centro_id    uuid not null references public.centros(id) on delete restrict,
  nome         text not null,
  capacidade   integer not null check (capacidade > 0),
  equipamentos text[] not null default '{}',
  estado       text not null default 'disponível'
                 check (estado in ('disponível','manutenção')),
  created_at   timestamptz not null default now(),
  unique (centro_id, nome)
);

-- ── servicos + tiers (pricing) ──────────────────────────────────────────────
create table public.servicos (
  id            uuid primary key default gen_random_uuid(),
  centro_id     uuid not null references public.centros(id) on delete restrict,
  disciplina_id uuid references public.disciplinas(id) on delete set null,
  nome          text not null,
  preco_base    numeric(8,2) not null check (preco_base >= 0),
  created_at    timestamptz not null default now(),
  unique (centro_id, nome)
);

create table public.servico_tiers (
  id          uuid primary key default gen_random_uuid(),
  servico_id  uuid not null references public.servicos(id) on delete cascade,
  tipo        text not null check (tipo in ('individual','grupo')),
  min_classes integer not null check (min_classes >= 1),
  preco_hora  numeric(8,2) not null check (preco_hora >= 0),
  unique (servico_id, tipo, min_classes)
);

-- ── aulas + junções ─────────────────────────────────────────────────────────
create table public.aulas (
  id            uuid primary key default gen_random_uuid(),
  centro_id     uuid not null references public.centros(id) on delete restrict,
  sala_id       uuid references public.salas(id) on delete restrict,
  disciplina_id uuid not null references public.disciplinas(id) on delete restrict,
  data          date not null,
  hora_inicio   time not null,
  hora_fim      time not null,
  tipo          text not null check (tipo in ('individual','grupo')),
  estado        text not null default 'agendada'
                  check (estado in ('agendada','realizada','cancelada')),
  recorrencia   text not null default 'unica'
                  check (recorrencia in ('unica','semanal','quinzenal','ano_letivo')),
  notas         text,
  created_at    timestamptz not null default now(),
  check (hora_fim > hora_inicio)
);

-- M:N tutores. App assume exatamente 1; PK impede duplicados, seed insere 1/aula.
create table public.aula_professores (
  aula_id           uuid not null references public.aulas(id) on delete cascade,
  professor_user_id uuid not null references public.professor_perfis(user_id) on delete restrict,
  primary key (aula_id, professor_user_id)
);

-- M:N alunos + presença (espelha Record<alunoId, Presenca>; NULL = não registado).
create table public.aula_alunos (
  aula_id  uuid not null references public.aulas(id) on delete cascade,
  aluno_id uuid not null references public.alunos(id) on delete restrict,
  presenca text check (presenca in ('presente','falta_justificada','falta_injustificada')),
  primary key (aula_id, aluno_id)
);

-- ── índices (queries quentes) ───────────────────────────────────────────────
create index idx_aulas_data        on public.aulas (data);
create index idx_aulas_centro_data on public.aulas (centro_id, data);
create index idx_aulas_sala        on public.aulas (sala_id);
create index idx_aulas_disciplina  on public.aulas (disciplina_id);
create index idx_aula_prof_prof    on public.aula_professores (professor_user_id);
create index idx_aula_alunos_aluno on public.aula_alunos (aluno_id);
create index idx_disp_prof         on public.disponibilidades (professor_user_id);
create index idx_alunos_centro     on public.alunos (centro_id);
create index idx_alunos_explicador on public.alunos (explicador_user_id);
create index idx_users_role        on public.users (centro_id, role);
create index idx_servico_tiers_svc on public.servico_tiers (servico_id, tipo, min_classes);
-- FK covering indexes (advisor: unindexed_foreign_keys)
create index idx_alunos_encarregado_user on public.alunos (encarregado_user_id);
create index idx_alunos_disc_disc        on public.alunos_disciplinas (disciplina_id);
create index idx_prof_disc_disc          on public.professor_disciplinas (disciplina_id);
create index idx_prof_perfis_centro      on public.professor_perfis (centro_id);
create index idx_servicos_disciplina     on public.servicos (disciplina_id);

-- ── RLS: ativar em tudo + política permissiva (fase atual) ──────────────────
-- RLS fica ligado para nada ficar exposto por omissão quando se apertar depois;
-- com login mock (sem JWT Supabase) a política permite tudo.
do $$
declare t text;
begin
  foreach t in array array[
    'centros','users','disciplinas','professor_perfis','disponibilidades',
    'professor_disciplinas','alunos','alunos_disciplinas','salas',
    'servicos','servico_tiers','aulas','aula_professores','aula_alunos'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format(
      'create policy %I on public.%I for all to anon, authenticated using (true) with check (true);',
      t || '_all', t);
  end loop;
end $$;
