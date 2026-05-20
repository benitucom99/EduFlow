-- ============================================================================
-- EduFlow — 0004_simplify_schema.sql
-- MVP schema simplification:
--   • DROP TABLE disponibilidades
--   • DROP TABLE servico_tiers + servicos (substituídos por disciplinas.preco_por_aula)
--   • ALTER TABLE salas    — manter apenas id, centro_id, nome
--   • ALTER TABLE disciplinas — adicionar preco_por_aula
--   • CREATE TABLE faturacao — registos mensais de cobrança/pagamento com RLS
-- ============================================================================

-- ── Step 1: Drop servico_tiers (filho de servicos — antes de DROP servicos)
drop policy if exists servico_tiers_all on public.servico_tiers;
drop index  if exists public.idx_servico_tiers_svc;
drop table  if exists public.servico_tiers;

-- ── Step 2: Drop disponibilidades
drop policy if exists disponibilidades_all on public.disponibilidades;
drop index  if exists public.idx_disp_prof;
drop table  if exists public.disponibilidades;

-- ── Step 3: Simplificar salas — remover capacidade, equipamentos, estado
alter table public.salas
  drop column if exists capacidade,
  drop column if exists equipamentos,
  drop column if exists estado;

-- ── Step 4: Drop servicos — preco_por_aula passa a viver em disciplinas
drop policy if exists servicos_select on public.servicos;
drop policy if exists servicos_modify on public.servicos;
drop index  if exists public.idx_servicos_disciplina;
drop table  if exists public.servicos;

-- ── Step 5: Adicionar preco_por_aula a disciplinas
alter table public.disciplinas
  add column if not exists preco_por_aula numeric(8,2) not null default 0
    check (preco_por_aula >= 0);

-- Seed de preços para o centro demo (UUIDs fixos do 0002_seed.sql)
update public.disciplinas set preco_por_aula = 25.00 where id = 'd0000000-0000-0000-0000-000000000001'; -- Matemática
update public.disciplinas set preco_por_aula = 20.00 where id = 'd0000000-0000-0000-0000-000000000002'; -- Português
update public.disciplinas set preco_por_aula = 20.00 where id = 'd0000000-0000-0000-0000-000000000003'; -- Inglês
update public.disciplinas set preco_por_aula = 25.00 where id = 'd0000000-0000-0000-0000-000000000004'; -- Física e Química
update public.disciplinas set preco_por_aula = 22.00 where id = 'd0000000-0000-0000-0000-000000000005'; -- Biologia e Geologia
update public.disciplinas set preco_por_aula = 20.00 where id = 'd0000000-0000-0000-0000-000000000006'; -- Economia
update public.disciplinas set preco_por_aula = 25.00 where id = 'd0000000-0000-0000-0000-000000000007'; -- Geometria Descritiva
update public.disciplinas set preco_por_aula = 20.00 where id = 'd0000000-0000-0000-0000-000000000008'; -- História

-- ── Step 6: Criar tabela faturacao
-- Guarda o resultado mensal calculado pelo React a partir das presenças.
--
-- Fórmula aluno:     COUNT(presenças aluno X disciplina Y no mês) × disciplinas.preco_por_aula
-- Fórmula professor: horas_trabalhadas × professor_perfis.valor_hora
--
-- tipo = 'cobranca_aluno'      → aluno_id + disciplina_id preenchidos, professor_user_id null
-- tipo = 'pagamento_professor' → professor_user_id preenchido, aluno_id + disciplina_id null
create table if not exists public.faturacao (
  id                 uuid primary key default gen_random_uuid(),
  centro_id          uuid not null references public.centros(id) on delete restrict,
  tipo               text not null check (tipo in ('cobranca_aluno','pagamento_professor')),
  mes_referencia     date not null,
  valor              numeric(10,2) not null check (valor >= 0),
  data_pagamento     date,
  estado             text not null default 'pendente' check (estado in ('pago','pendente')),
  aluno_id           uuid references public.alunos(id) on delete set null,
  professor_user_id  uuid references public.professor_perfis(user_id) on delete set null,
  disciplina_id      uuid references public.disciplinas(id) on delete set null,
  created_at         timestamptz not null default now(),
  constraint faturacao_aluno_mes_disciplina_unique
    unique (aluno_id, mes_referencia, disciplina_id)
);

-- ── Step 7: RLS para faturacao (padrão igual ao de salas em 0003)
alter table public.faturacao enable row level security;

create policy faturacao_select on public.faturacao
  for select to authenticated
  using (centro_id = public.current_centro_id());

create policy faturacao_modify on public.faturacao
  for all to authenticated
  using  (centro_id = public.current_centro_id())
  with check (centro_id = public.current_centro_id());

-- ── Step 8: Indexes para faturacao
create index if not exists idx_faturacao_centro_mes
  on public.faturacao (centro_id, mes_referencia);

create index if not exists idx_faturacao_aluno
  on public.faturacao (aluno_id) where aluno_id is not null;

create index if not exists idx_faturacao_professor
  on public.faturacao (professor_user_id) where professor_user_id is not null;

create index if not exists idx_faturacao_disciplina
  on public.faturacao (disciplina_id) where disciplina_id is not null;
