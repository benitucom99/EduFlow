-- ============================================================================
-- EduFlow — 0013_dual_pricing.sql
-- Preços diferenciados por disciplina: aula individual vs aula de grupo.
--   - Renomeia preco_por_hora → preco_hora_individual.
--   - Alinha precisão a numeric(10,2).
--   - Adiciona preco_hora_grupo numeric(10,2) NOT NULL DEFAULT 0 (preço fixo por
--     aluno num grupo, independente do nº de alunos).
--   - Inicializa preco_hora_grupo = preco_hora_individual.
-- Idempotente. Não afeta RLS (nenhuma policy referencia colunas de preço).
-- ============================================================================

-- Rename só se a coluna antiga existir e a nova ainda não (idempotência).
do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'disciplinas'
                and column_name = 'preco_por_hora')
     and not exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'disciplinas'
                and column_name = 'preco_hora_individual') then
    alter table public.disciplinas rename column preco_por_hora to preco_hora_individual;
  end if;
end $$;

-- Alinhar precisão (mantém o CHECK >= 0 herdado de preco_por_aula).
alter table public.disciplinas
  alter column preco_hora_individual type numeric(10,2);

-- Nova coluna de preço de grupo.
alter table public.disciplinas
  add column if not exists preco_hora_grupo numeric(10,2) not null default 0
    check (preco_hora_grupo >= 0);

-- Valor inicial: copiar o preço individual existente (só toca nas que ainda estão a 0).
update public.disciplinas
   set preco_hora_grupo = preco_hora_individual
 where preco_hora_grupo = 0;
