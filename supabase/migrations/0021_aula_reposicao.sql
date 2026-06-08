-- ============================================================================
-- EduFlow — 0021_aula_reposicao.sql
-- Marca uma aula como sendo de reposição (criada para repor uma falta
-- justificada anterior). Informativo nesta fase; a cobrança/pagamento segue as
-- regras normais conforme as presenças que a aula vier a ter.
-- ============================================================================

alter table public.aulas
  add column if not exists is_reposicao boolean not null default false;
