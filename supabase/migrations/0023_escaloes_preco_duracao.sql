-- ============================================================================
-- EduFlow — 0023_escaloes_preco_duracao.sql
-- Preços dinâmicos por duração ("descontos por volume") para aulas INDIVIDUAIS.
-- Cada sub-disciplina pode ter escalões opcionais: a partir de X horas, o
-- preço/hora individual passa a Y. Aplica-se a toda a aula (não progressivo).
-- Aulas de grupo e o pagamento ao professor NÃO são afetados.
--
-- Formato: [{"duracaoMin": 2, "precoHora": 17.75}, ...]  (duracaoMin em horas)
-- Sem escalões → cai no preco_hora_individual base.
-- ============================================================================

alter table public.disciplinas
  add column if not exists escaloes_preco_individual jsonb not null default '[]'::jsonb;
