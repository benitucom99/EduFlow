-- ============================================================================
-- 0028 — Fecho do mês: snapshot imutável da faturação + tracking de pagamentos.
--
-- "Fechar o mês" congela os cálculos da página Faturação em linhas por aluno
-- (cobrança) e por professor (pagamento). A partir daí o valor não depende de
-- recálculo em tempo real, e cada linha ganha estado de pagamento
-- (pendente/parcial/pago) com método e data.
--
-- Acesso: apenas admin (a Faturação é admin-only na app).
-- ============================================================================

create table public.fechos_mensais (
  id           uuid primary key default gen_random_uuid(),
  centro_id    uuid not null references public.centros(id) on delete cascade,
  periodo      text not null, -- "yyyy-MM"
  data_inicio  date not null,
  data_fim     date not null,
  criado_em    timestamptz not null default now(),
  criado_por   uuid references public.users(id) on delete set null,
  total_cobrar numeric(10,2) not null default 0,
  total_pagar  numeric(10,2) not null default 0,
  unique (centro_id, periodo)
);

create table public.fecho_linhas (
  id                uuid primary key default gen_random_uuid(),
  fecho_id          uuid not null references public.fechos_mensais(id) on delete cascade,
  centro_id         uuid not null references public.centros(id) on delete cascade,
  tipo              text not null check (tipo in ('cobranca','pagamento')),
  -- Referências soft (set null) para o snapshot sobreviver a eliminações;
  -- o nome fica gravado em entidade_nome.
  aluno_id          uuid references public.alunos(id) on delete set null,
  professor_user_id uuid references public.users(id) on delete set null,
  entidade_nome     text not null,
  -- Extrato das aulas da linha: [{data, horaInicio, horaFim, disciplina,
  -- duracao, precoPorHora, valor, presenca, cobrar}]
  detalhe           jsonb not null default '[]'::jsonb,
  valor             numeric(10,2) not null default 0,
  estado_pagamento  text not null default 'pendente'
                      check (estado_pagamento in ('pendente','parcial','pago')),
  valor_pago        numeric(10,2) not null default 0,
  metodo            text check (metodo in ('dinheiro','transferencia','mbway','outro')),
  pago_em           date,
  notas             text
);

create index fecho_linhas_fecho_idx on public.fecho_linhas (fecho_id);
create index fecho_linhas_centro_idx on public.fecho_linhas (centro_id);
create index fechos_mensais_centro_idx on public.fechos_mensais (centro_id);

alter table public.fechos_mensais enable row level security;
alter table public.fecho_linhas enable row level security;

create policy fechos_admin_all on public.fechos_mensais
  for all
  using (current_user_role() = 'admin' and centro_id = current_centro_id())
  with check (current_user_role() = 'admin' and centro_id = current_centro_id());

create policy fecho_linhas_admin_all on public.fecho_linhas
  for all
  using (current_user_role() = 'admin' and centro_id = current_centro_id())
  with check (current_user_role() = 'admin' and centro_id = current_centro_id());
