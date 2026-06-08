-- Definições Básicas do Centro: regras de faturação para faltas injustificadas.
-- Até aqui o comportamento era rígido (cobrava sempre ao aluno, nunca pagava ao
-- professor). Estas duas flags tornam-no configurável por centro.
ALTER TABLE public.centros
  ADD COLUMN IF NOT EXISTS cobrar_falta_injustificada boolean NOT NULL DEFAULT true;

ALTER TABLE public.centros
  ADD COLUMN IF NOT EXISTS pagar_falta_injustificada boolean NOT NULL DEFAULT false;
