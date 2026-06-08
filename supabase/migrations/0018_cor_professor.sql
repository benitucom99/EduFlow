-- ============================================================================
-- EduFlow — 0018_cor_professor.sql
-- Transição "cor por disciplina" → "cor por professor".
--
-- 1. Elimina a cor das disciplinas (cor_hsl), que deixou de ser usada.
-- 2. Adiciona a cor do professor em professor_perfis (usada para pintar os
--    blocos das aulas no calendário). NULL = sem cor definida → o frontend
--    cai numa paleta automática por índice.
-- ============================================================================

alter table public.disciplinas
  drop column if exists cor_hsl;

alter table public.professor_perfis
  add column if not exists cor text;
