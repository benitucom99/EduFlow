-- Configuração do período do ano letivo por centro.
-- Quando NULL, o sistema usa o default calculado (31 de Julho).
ALTER TABLE centros
  ADD COLUMN IF NOT EXISTS ano_letivo_inicio date,
  ADD COLUMN IF NOT EXISTS ano_letivo_fim date;
