-- ============================================================================
-- EduFlow — 0019_revert_cor_professor.sql
-- Reverte a transição "cor por disciplina" → "cor por professor" feita na
-- migração 0018. Acompanha o `git revert` do commit d595a4a no código.
--
-- 1. Recria disciplinas.cor_hsl (text, nullable), tal como em 0001_init.
--    NOTA: os dados de cor originais foram destruídos pelo DROP em 0018 e não
--    são recuperáveis — a coluna volta vazia (NULL); o frontend cai na paleta
--    automática até as cores serem reconfiguradas.
-- 2. Remove professor_perfis.cor (cor por professor), que deixou de ser usada.
--    NOTA: as cores que os professores tinham configurado são perdidas.
-- ============================================================================

alter table public.disciplinas
  add column if not exists cor_hsl text;

alter table public.professor_perfis
  drop column if exists cor;
