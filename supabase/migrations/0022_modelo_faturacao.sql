-- ============================================================================
-- EduFlow — 0022_modelo_faturacao.sql
-- Momento de pagamento do centro: início do mês (mensalidade antecipada) ou
-- fim do mês (à hora, conforme presença).
--
--   'fim'    → comportamento histórico: cobra o que foi efetivamente dado.
--   'inicio' → mensalidade: cobra aulas agendadas/futuras e faltas justificadas
--              (já pagas); reposições custam 0€ ao aluno.
--
-- Default 'fim' = comportamento atual intacto. Centros só mudam ao escolher
-- ativamente 'inicio' nas Definições Gerais.
-- ============================================================================

alter table public.centros
  add column if not exists momento_pagamento text not null default 'fim'
  check (momento_pagamento in ('inicio','fim'));
