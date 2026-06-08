-- ============================================================================
-- EduFlow — 0020_presencas_interativas.sql
-- Registo de presenças interativo: ao marcar uma falta, a rececionista decide
-- o seguimento. Estes dois campos guardam essa decisão na granularidade
-- aluno×aula (aula_alunos).
--
-- 1. reposicao_estado  — para FALTAS JUSTIFICADAS: se há reposição a agendar.
--      'pendente'  reposição por agendar
--      'agendada'  reposição já criada (fase futura, no calendário)
--      'nao'       sem reposição
--      NULL        não aplicável (presença != falta justificada / não perguntado)
--
-- 2. cobrar_falta  — para FALTAS INJUSTIFICADAS: cobrar ao aluno (e, ligado a
--      isso, pagar ao professor) aquela sessão.
--      true   cobra ao aluno + paga ao professor
--      false  não cobra nem paga
--      NULL   sem decisão explícita (faltas antigas) → faturacão assume cobrar+pagar
-- ============================================================================

alter table public.aula_alunos
  add column if not exists reposicao_estado text
  check (reposicao_estado in ('pendente','agendada','nao'));

alter table public.aula_alunos
  add column if not exists cobrar_falta boolean;
