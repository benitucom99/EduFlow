-- ============================================================================
-- EduFlow — 0014_explicador_convite.sql
-- Convite/ativação de acesso para explicadores.
--
-- Contexto: o explicador já tem conta auth.users (criada no create-explicador
-- com password aleatória) + linha users (role='explicador') + professor_perfis,
-- todos com o mesmo id. "Convidar" NÃO cria conta — gera um link de recovery
-- para o explicador definir a própria password e ativar o acesso.
--
-- Estas duas colunas registam o estado do convite, mostrado no perfil:
--   convite_enviado_em IS NULL                         → "Não convidado"
--   convite_enviado_em NOT NULL, acesso_ativado_em NULL → "Pendente (enviado em…)"
--   acesso_ativado_em NOT NULL                          → "Ativo"
-- ============================================================================

alter table public.professor_perfis
  add column if not exists convite_enviado_em timestamptz,
  add column if not exists acesso_ativado_em  timestamptz;

-- O próprio explicador marca o acesso como ativado após definir a password.
-- security definer: corre como dono da função (ignora as colunas/policies),
-- mas só toca na própria linha (auth.uid()) e só se ainda não estiver ativada.
create or replace function public.mark_acesso_ativado() returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.professor_perfis
     set acesso_ativado_em = now()
   where user_id = auth.uid()
     and acesso_ativado_em is null;
end $$;

-- Por omissão o Postgres concede EXECUTE a PUBLIC (inclui anon). Trancar para
-- que só utilizadores autenticados possam chamar (advisor 0028).
revoke execute on function public.mark_acesso_ativado() from public, anon;
grant  execute on function public.mark_acesso_ativado() to authenticated;
