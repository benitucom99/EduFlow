-- Disciplinas: hierarquia (sub-disciplinas)
ALTER TABLE public.disciplinas
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.disciplinas(id) ON DELETE CASCADE;

-- Tutor por-disciplina na inscrição do aluno
ALTER TABLE public.alunos_disciplinas
  ADD COLUMN IF NOT EXISTS explicador_id uuid REFERENCES public.professor_perfis(user_id) ON DELETE SET NULL;

-- Aluno: morada + encarregado_nome opcional
ALTER TABLE public.alunos ADD COLUMN IF NOT EXISTS morada text;
ALTER TABLE public.alunos ALTER COLUMN encarregado_nome DROP NOT NULL;

-- Centro: modo de pagamento do professor
ALTER TABLE public.centros
  ADD COLUMN IF NOT EXISTS modo_pagamento_professor text NOT NULL DEFAULT 'base'
  CHECK (modo_pagamento_professor IN ('base', 'por_disciplina'));

-- Valor/hora por-disciplina do professor
ALTER TABLE public.professor_disciplinas
  ADD COLUMN IF NOT EXISTS valor_hora numeric(8,2) CHECK (valor_hora >= 0);
