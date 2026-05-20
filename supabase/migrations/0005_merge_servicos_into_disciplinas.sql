-- ============================================================================
-- EduFlow — 0005_merge_servicos_into_disciplinas.sql
-- Elimina tabela servicos — redundante com disciplinas no MVP.
-- Move preco_por_aula para disciplinas.
-- Adiciona UNIQUE em faturacao(aluno_id, mes_referencia, disciplina_id).
-- ============================================================================

-- ── Step 1: Drop tabela servicos (policies e índice primeiro)
drop policy if exists servicos_select on public.servicos;
drop policy if exists servicos_modify on public.servicos;
drop table  if exists public.servicos;

-- ── Step 2: Adicionar preco_por_aula a disciplinas
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

-- ── Step 3: UNIQUE constraint em faturacao (evita duplicados aluno+mês+disciplina)
alter table public.faturacao
  add constraint if not exists faturacao_aluno_mes_disciplina_unique
    unique (aluno_id, mes_referencia, disciplina_id);
