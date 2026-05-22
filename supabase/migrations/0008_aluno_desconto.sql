ALTER TABLE public.alunos ADD COLUMN IF NOT EXISTS desconto INTEGER NOT NULL DEFAULT 0 CHECK (desconto >= 0 AND desconto <= 100);
