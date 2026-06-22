-- ============================================================================
-- EduFlow — 0026_pagamento_percentagem.sql
-- Terceiro modo de pagamento ao professor: 'percentagem'.
--
--   'base'          → valor/hora fixo, igual para todas as disciplinas.
--   'por_disciplina'→ valor/hora diferente por disciplina.
--   'percentagem'   → o professor recebe uma percentagem do valor cobrado ao
--                     aluno em cada aula (ex: aluno paga 20€, 40% → professor 8€).
--
-- A percentagem é por-professor (professor_perfis.percentagem_receita, 0-100).
-- Sem valor definido → fallback 0 (não recebe), explicitado na faturação.
-- Default do centro continua 'base' — comportamento histórico intacto.
-- ============================================================================

-- 1) Alargar o domínio de modo_pagamento_professor para incluir 'percentagem'.
--    O check é inline com nome auto-gerado; localiza-o e recria-o.
do $$
declare
  v_constraint text;
begin
  select conname into v_constraint
  from pg_constraint
  where conrelid = 'public.centros'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%modo_pagamento_professor%';
  if v_constraint is not null then
    execute format('alter table public.centros drop constraint %I', v_constraint);
  end if;
end $$;

alter table public.centros
  add constraint centros_modo_pagamento_professor_check
  check (modo_pagamento_professor in ('base', 'por_disciplina', 'percentagem'));

-- 2) Percentagem da receita do aluno atribuída ao professor (0-100, opcional).
alter table public.professor_perfis
  add column if not exists percentagem_receita integer
  check (percentagem_receita is null or (percentagem_receita >= 0 and percentagem_receita <= 100));
