-- ============================================================================
-- EduFlow — 0024_aluno_horarios.sql
-- Gerador de Horários Recorrentes (Horários Base do aluno).
--
-- Materializa os "Horários Base" em tabelas dedicadas (não JSONB) para permitir
-- integridade referencial (disciplina/professor/sala) e, sobretudo, ligar cada
-- aula gerada ao horário que a originou (aulas.horario_id) — a base do
-- One-Way Sync: recalcular um horário apaga e recria apenas as aulas FUTURAS
-- com esse horario_id; apagar uma aula isolada no calendário nunca afeta o
-- horário base (aulas.horario_id é ON DELETE SET NULL / a app só apaga a aula).
-- ============================================================================

-- ── aluno_horarios (cabeçalho do horário base) ──────────────────────────────
create table public.aluno_horarios (
  id                 uuid primary key default gen_random_uuid(),
  centro_id          uuid not null references public.centros(id) on delete restrict,
  aluno_id           uuid not null references public.alunos(id) on delete cascade,
  disciplina_id      uuid not null references public.disciplinas(id) on delete restrict,
  professor_user_id  uuid references public.professor_perfis(user_id) on delete set null,
  sala_id            uuid references public.salas(id) on delete set null,
  tipo               text not null default 'individual'
                       check (tipo in ('individual','grupo')),
  duracao_min        integer not null default 60
                       check (duracao_min between 15 and 480),
  ano_letivo_inteiro boolean not null default true,
  data_inicio        date not null,
  data_fim           date not null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (data_fim >= data_inicio)
);

-- ── aluno_horario_slots (construtor semanal: dia + hora) ─────────────────────
-- dia_semana em ISO 1=segunda .. 7=domingo (igual a public.disponibilidades).
create table public.aluno_horario_slots (
  id          uuid primary key default gen_random_uuid(),
  horario_id  uuid not null references public.aluno_horarios(id) on delete cascade,
  dia_semana  integer not null check (dia_semana between 1 and 7),
  hora_inicio time not null,
  unique (horario_id, dia_semana, hora_inicio)
);

-- ── aulas.horario_id: liga a aula ao horário base que a gerou ────────────────
-- SET NULL: apagar o horário não obriga a apagar aulas já realizadas; a app
-- remove explicitamente as aulas FUTURAS antes (ver deleteAlunoHorario).
alter table public.aulas
  add column horario_id uuid references public.aluno_horarios(id) on delete set null;

-- ── índices (queries quentes) ───────────────────────────────────────────────
create index idx_aluno_horarios_aluno  on public.aluno_horarios (aluno_id);
create index idx_aluno_horarios_centro on public.aluno_horarios (centro_id);
create index idx_aluno_horarios_disc   on public.aluno_horarios (disciplina_id);
create index idx_aluno_horarios_prof   on public.aluno_horarios (professor_user_id);
create index idx_aluno_horarios_sala   on public.aluno_horarios (sala_id);
create index idx_horario_slots_horario on public.aluno_horario_slots (horario_id);
create index idx_aulas_horario         on public.aulas (horario_id);

-- ── updated_at automático ────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_aluno_horarios_touch on public.aluno_horarios;
create trigger trg_aluno_horarios_touch
  before update on public.aluno_horarios
  for each row execute function public.touch_updated_at();

-- ── RLS (mesmo padrão por papel das tabelas operacionais; ver 0010) ──────────
alter table public.aluno_horarios enable row level security;
alter table public.aluno_horario_slots enable row level security;

-- aluno_horarios: admin/rececionista leem e gerem no seu centro; explicador lê.
create policy aluno_horarios_admin_select on public.aluno_horarios
  for select to authenticated
  using (public.current_user_role() in ('admin','rececionista') and centro_id = public.current_centro_id());
create policy aluno_horarios_admin_modify on public.aluno_horarios
  for all to authenticated
  using (public.current_user_role() in ('admin','rececionista') and centro_id = public.current_centro_id())
  with check (public.current_user_role() in ('admin','rececionista') and centro_id = public.current_centro_id());
create policy aluno_horarios_explicador_select on public.aluno_horarios
  for select to authenticated
  using (public.current_user_role() = 'explicador' and centro_id = public.current_centro_id());

-- aluno_horario_slots: junção via aluno_horarios.
create policy aluno_horario_slots_admin_select on public.aluno_horario_slots
  for select to authenticated
  using (public.current_user_role() in ('admin','rececionista') and exists (
    select 1 from public.aluno_horarios h
     where h.id = aluno_horario_slots.horario_id and h.centro_id = public.current_centro_id()));
create policy aluno_horario_slots_admin_modify on public.aluno_horario_slots
  for all to authenticated
  using (public.current_user_role() in ('admin','rececionista') and exists (
    select 1 from public.aluno_horarios h
     where h.id = aluno_horario_slots.horario_id and h.centro_id = public.current_centro_id()))
  with check (public.current_user_role() in ('admin','rececionista') and exists (
    select 1 from public.aluno_horarios h
     where h.id = aluno_horario_slots.horario_id and h.centro_id = public.current_centro_id()));
create policy aluno_horario_slots_explicador_select on public.aluno_horario_slots
  for select to authenticated
  using (public.current_user_role() = 'explicador' and exists (
    select 1 from public.aluno_horarios h
     where h.id = aluno_horario_slots.horario_id and h.centro_id = public.current_centro_id()));
