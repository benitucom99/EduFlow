-- ============================================================================
-- EduFlow — 0010_rls_role_hardening.sql
-- LOTE 1 da auditoria de segurança.
--
-- Contexto: a 0006_rls_role_checks.sql nunca foi aplicada em produção (o seu
-- DROP POLICY sobre tabelas já removidas em 0004 fazia-a falhar). Em produção
-- estavam ativas apenas as policies de 0003/0004, que filtram só por centro_id
-- SEM verificação de role — qualquer autenticado (explicador/encarregado) podia
-- escrever em tudo, incl. faturacao e valor_hora de explicadores.
--
-- Esta migração:
--   1. Trigger anti-escalada em public.users (bloqueia self-change de role/
--      centro_id por não-admins; isenta service_role e o onboarding).
--   2. RLS por papel em todas as tabelas operacionais:
--        admin / rececionista : SELECT + ALL no seu centro.
--        explicador           : SELECT em tabelas operacionais (nunca faturacao),
--                               UPDATE só no próprio perfil e em presenças.
--                               Sem INSERT/DELETE.
--      Preserva users_read_self (0009) para o login funcionar sempre.
-- ============================================================================

-- ── Parte 1: trigger anti-escalada de privilégios ───────────────────────────
create or replace function public.prevent_privilege_escalation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Isenta backend privilegiado (edge functions) e a atribuição inicial de role
  -- durante o onboarding (old.role IS NULL, feito pela RPC security definer).
  if auth.role() <> 'service_role'
     and old.role is not null
     and (new.role is distinct from old.role
          or new.centro_id is distinct from old.centro_id)
     and coalesce(public.current_user_role(), '') <> 'admin' then
    raise exception 'Não autorizado a alterar role ou centro_id';
  end if;
  return new;
end $$;

drop trigger if exists trg_prevent_privilege_escalation on public.users;
create trigger trg_prevent_privilege_escalation
  before update on public.users
  for each row execute function public.prevent_privilege_escalation();

-- Impede um explicador de adulterar campos financeiros/de tenant no próprio
-- perfil (valor_hora, centro_id). RLS WITH CHECK não restringe colunas, daí o
-- trigger. Admin/rececionista e service_role passam.
create or replace function public.prevent_perfil_financial_tamper()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.role() <> 'service_role'
     and (new.valor_hora is distinct from old.valor_hora
          or new.centro_id is distinct from old.centro_id)
     and coalesce(public.current_user_role(), '') not in ('admin','rececionista') then
    raise exception 'Não autorizado a alterar valor_hora ou centro_id do perfil';
  end if;
  return new;
end $$;

drop trigger if exists trg_prevent_perfil_financial_tamper on public.professor_perfis;
create trigger trg_prevent_perfil_financial_tamper
  before update on public.professor_perfis
  for each row execute function public.prevent_perfil_financial_tamper();


-- ── Parte 2: redefinir RLS por role ─────────────────────────────────────────
-- Drop das policies vivas (0003/0004) + quaisquer remanescentes role-aware.
-- NÃO se faz drop de users_read_self (0009) — mantém-se.

drop policy if exists centros_all    on public.centros;
drop policy if exists centros_select on public.centros;
drop policy if exists centros_update on public.centros;
drop policy if exists centros_admin_select on public.centros;
drop policy if exists centros_admin_modify on public.centros;
drop policy if exists centros_explicador_select on public.centros;

drop policy if exists users_all         on public.users;
drop policy if exists users_select      on public.users;
drop policy if exists users_update_self on public.users;
drop policy if exists users_admin_select on public.users;
drop policy if exists users_admin_modify on public.users;
drop policy if exists users_explicador_select on public.users;
drop policy if exists users_explicador_update on public.users;

drop policy if exists disciplinas_all    on public.disciplinas;
drop policy if exists disciplinas_select on public.disciplinas;
drop policy if exists disciplinas_modify on public.disciplinas;
drop policy if exists disciplinas_admin_select on public.disciplinas;
drop policy if exists disciplinas_admin_modify on public.disciplinas;
drop policy if exists disciplinas_explicador_select on public.disciplinas;

drop policy if exists professor_perfis_all    on public.professor_perfis;
drop policy if exists professor_perfis_select on public.professor_perfis;
drop policy if exists professor_perfis_modify on public.professor_perfis;
drop policy if exists professor_perfis_admin_select on public.professor_perfis;
drop policy if exists professor_perfis_admin_modify on public.professor_perfis;
drop policy if exists professor_perfis_explicador_select on public.professor_perfis;
drop policy if exists professor_perfis_explicador_update on public.professor_perfis;

drop policy if exists professor_disciplinas_all    on public.professor_disciplinas;
drop policy if exists professor_disciplinas_select on public.professor_disciplinas;
drop policy if exists professor_disciplinas_modify on public.professor_disciplinas;
drop policy if exists professor_disciplinas_admin_select on public.professor_disciplinas;
drop policy if exists professor_disciplinas_admin_modify on public.professor_disciplinas;
drop policy if exists professor_disciplinas_explicador_select on public.professor_disciplinas;

drop policy if exists alunos_all    on public.alunos;
drop policy if exists alunos_select on public.alunos;
drop policy if exists alunos_modify on public.alunos;
drop policy if exists alunos_admin_select on public.alunos;
drop policy if exists alunos_admin_modify on public.alunos;
drop policy if exists alunos_explicador_select on public.alunos;

drop policy if exists alunos_disciplinas_all    on public.alunos_disciplinas;
drop policy if exists alunos_disciplinas_select on public.alunos_disciplinas;
drop policy if exists alunos_disciplinas_modify on public.alunos_disciplinas;
drop policy if exists alunos_disciplinas_admin_select on public.alunos_disciplinas;
drop policy if exists alunos_disciplinas_admin_modify on public.alunos_disciplinas;
drop policy if exists alunos_disciplinas_explicador_select on public.alunos_disciplinas;

drop policy if exists salas_all    on public.salas;
drop policy if exists salas_select on public.salas;
drop policy if exists salas_modify on public.salas;
drop policy if exists salas_admin_select on public.salas;
drop policy if exists salas_admin_modify on public.salas;
drop policy if exists salas_explicador_select on public.salas;

drop policy if exists aulas_all    on public.aulas;
drop policy if exists aulas_select on public.aulas;
drop policy if exists aulas_modify on public.aulas;
drop policy if exists aulas_admin_select on public.aulas;
drop policy if exists aulas_admin_modify on public.aulas;
drop policy if exists aulas_explicador_select on public.aulas;

drop policy if exists aula_professores_all    on public.aula_professores;
drop policy if exists aula_professores_select on public.aula_professores;
drop policy if exists aula_professores_modify on public.aula_professores;
drop policy if exists aula_professores_admin_select on public.aula_professores;
drop policy if exists aula_professores_admin_modify on public.aula_professores;
drop policy if exists aula_professores_explicador_select on public.aula_professores;

drop policy if exists aula_alunos_all    on public.aula_alunos;
drop policy if exists aula_alunos_select on public.aula_alunos;
drop policy if exists aula_alunos_modify on public.aula_alunos;
drop policy if exists aula_alunos_admin_select on public.aula_alunos;
drop policy if exists aula_alunos_admin_modify on public.aula_alunos;
drop policy if exists aula_alunos_explicador_select on public.aula_alunos;
drop policy if exists aula_alunos_explicador_update on public.aula_alunos;

drop policy if exists faturacao_all    on public.faturacao;
drop policy if exists faturacao_select on public.faturacao;
drop policy if exists faturacao_modify on public.faturacao;
drop policy if exists faturacao_admin_select on public.faturacao;
drop policy if exists faturacao_admin_modify on public.faturacao;

-- ── centros ──────────────────────────────────────────────────────────────────
create policy centros_admin_select on public.centros
  for select to authenticated
  using (public.current_user_role() in ('admin','rececionista') and id = public.current_centro_id());
create policy centros_admin_modify on public.centros
  for all to authenticated
  using (public.current_user_role() in ('admin','rececionista') and id = public.current_centro_id())
  with check (public.current_user_role() in ('admin','rececionista') and id = public.current_centro_id());
create policy centros_explicador_select on public.centros
  for select to authenticated
  using (public.current_user_role() = 'explicador' and id = public.current_centro_id());

-- ── users (users_read_self de 0009 mantém-se) ────────────────────────────────
create policy users_admin_select on public.users
  for select to authenticated
  using (public.current_user_role() in ('admin','rececionista') and centro_id = public.current_centro_id());
create policy users_admin_modify on public.users
  for all to authenticated
  using (public.current_user_role() in ('admin','rececionista') and centro_id = public.current_centro_id())
  with check (public.current_user_role() in ('admin','rececionista') and centro_id = public.current_centro_id());
create policy users_explicador_select on public.users
  for select to authenticated
  using (public.current_user_role() = 'explicador' and centro_id = public.current_centro_id());
-- Self-update permitido; o trigger impede mudar role/centro_id.
create policy users_self_update on public.users
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ── disciplinas ──────────────────────────────────────────────────────────────
create policy disciplinas_admin_select on public.disciplinas
  for select to authenticated
  using (public.current_user_role() in ('admin','rececionista') and centro_id = public.current_centro_id());
create policy disciplinas_admin_modify on public.disciplinas
  for all to authenticated
  using (public.current_user_role() in ('admin','rececionista') and centro_id = public.current_centro_id())
  with check (public.current_user_role() in ('admin','rececionista') and centro_id = public.current_centro_id());
create policy disciplinas_explicador_select on public.disciplinas
  for select to authenticated
  using (public.current_user_role() = 'explicador' and centro_id = public.current_centro_id());

-- ── professor_perfis ─────────────────────────────────────────────────────────
create policy professor_perfis_admin_select on public.professor_perfis
  for select to authenticated
  using (public.current_user_role() in ('admin','rececionista') and centro_id = public.current_centro_id());
create policy professor_perfis_admin_modify on public.professor_perfis
  for all to authenticated
  using (public.current_user_role() in ('admin','rececionista') and centro_id = public.current_centro_id())
  with check (public.current_user_role() in ('admin','rececionista') and centro_id = public.current_centro_id());
create policy professor_perfis_explicador_select on public.professor_perfis
  for select to authenticated
  using (public.current_user_role() = 'explicador' and centro_id = public.current_centro_id());
-- Explicador atualiza o próprio perfil; o trigger acima impede mudar valor_hora/centro_id.
create policy professor_perfis_explicador_update on public.professor_perfis
  for update to authenticated
  using (public.current_user_role() = 'explicador' and user_id = auth.uid())
  with check (public.current_user_role() = 'explicador' and user_id = auth.uid());

-- ── alunos ───────────────────────────────────────────────────────────────────
create policy alunos_admin_select on public.alunos
  for select to authenticated
  using (public.current_user_role() in ('admin','rececionista') and centro_id = public.current_centro_id());
create policy alunos_admin_modify on public.alunos
  for all to authenticated
  using (public.current_user_role() in ('admin','rececionista') and centro_id = public.current_centro_id())
  with check (public.current_user_role() in ('admin','rececionista') and centro_id = public.current_centro_id());
create policy alunos_explicador_select on public.alunos
  for select to authenticated
  using (public.current_user_role() = 'explicador' and centro_id = public.current_centro_id());

-- ── salas ────────────────────────────────────────────────────────────────────
create policy salas_admin_select on public.salas
  for select to authenticated
  using (public.current_user_role() in ('admin','rececionista') and centro_id = public.current_centro_id());
create policy salas_admin_modify on public.salas
  for all to authenticated
  using (public.current_user_role() in ('admin','rececionista') and centro_id = public.current_centro_id())
  with check (public.current_user_role() in ('admin','rececionista') and centro_id = public.current_centro_id());
create policy salas_explicador_select on public.salas
  for select to authenticated
  using (public.current_user_role() = 'explicador' and centro_id = public.current_centro_id());

-- ── aulas ────────────────────────────────────────────────────────────────────
create policy aulas_admin_select on public.aulas
  for select to authenticated
  using (public.current_user_role() in ('admin','rececionista') and centro_id = public.current_centro_id());
create policy aulas_admin_modify on public.aulas
  for all to authenticated
  using (public.current_user_role() in ('admin','rececionista') and centro_id = public.current_centro_id())
  with check (public.current_user_role() in ('admin','rececionista') and centro_id = public.current_centro_id());
create policy aulas_explicador_select on public.aulas
  for select to authenticated
  using (public.current_user_role() = 'explicador' and centro_id = public.current_centro_id());

-- ── faturacao — só admin/rececionista; explicador sem acesso ──────────────────
create policy faturacao_admin_select on public.faturacao
  for select to authenticated
  using (public.current_user_role() in ('admin','rececionista') and centro_id = public.current_centro_id());
create policy faturacao_admin_modify on public.faturacao
  for all to authenticated
  using (public.current_user_role() in ('admin','rececionista') and centro_id = public.current_centro_id())
  with check (public.current_user_role() in ('admin','rececionista') and centro_id = public.current_centro_id());

-- ── professor_disciplinas (junction via professor_perfis) ─────────────────────
create policy professor_disciplinas_admin_select on public.professor_disciplinas
  for select to authenticated
  using (public.current_user_role() in ('admin','rececionista') and exists (
    select 1 from public.professor_perfis p
     where p.user_id = professor_disciplinas.professor_user_id and p.centro_id = public.current_centro_id()));
create policy professor_disciplinas_admin_modify on public.professor_disciplinas
  for all to authenticated
  using (public.current_user_role() in ('admin','rececionista') and exists (
    select 1 from public.professor_perfis p
     where p.user_id = professor_disciplinas.professor_user_id and p.centro_id = public.current_centro_id()))
  with check (public.current_user_role() in ('admin','rececionista') and exists (
    select 1 from public.professor_perfis p
     where p.user_id = professor_disciplinas.professor_user_id and p.centro_id = public.current_centro_id()));
create policy professor_disciplinas_explicador_select on public.professor_disciplinas
  for select to authenticated
  using (public.current_user_role() = 'explicador' and exists (
    select 1 from public.professor_perfis p
     where p.user_id = professor_disciplinas.professor_user_id and p.centro_id = public.current_centro_id()));

-- ── alunos_disciplinas (junction via alunos) ─────────────────────────────────
create policy alunos_disciplinas_admin_select on public.alunos_disciplinas
  for select to authenticated
  using (public.current_user_role() in ('admin','rececionista') and exists (
    select 1 from public.alunos a
     where a.id = alunos_disciplinas.aluno_id and a.centro_id = public.current_centro_id()));
create policy alunos_disciplinas_admin_modify on public.alunos_disciplinas
  for all to authenticated
  using (public.current_user_role() in ('admin','rececionista') and exists (
    select 1 from public.alunos a
     where a.id = alunos_disciplinas.aluno_id and a.centro_id = public.current_centro_id()))
  with check (public.current_user_role() in ('admin','rececionista') and exists (
    select 1 from public.alunos a
     where a.id = alunos_disciplinas.aluno_id and a.centro_id = public.current_centro_id()));
create policy alunos_disciplinas_explicador_select on public.alunos_disciplinas
  for select to authenticated
  using (public.current_user_role() = 'explicador' and exists (
    select 1 from public.alunos a
     where a.id = alunos_disciplinas.aluno_id and a.centro_id = public.current_centro_id()));

-- ── aula_professores (junction via aulas) ────────────────────────────────────
create policy aula_professores_admin_select on public.aula_professores
  for select to authenticated
  using (public.current_user_role() in ('admin','rececionista') and exists (
    select 1 from public.aulas a where a.id = aula_professores.aula_id and a.centro_id = public.current_centro_id()));
create policy aula_professores_admin_modify on public.aula_professores
  for all to authenticated
  using (public.current_user_role() in ('admin','rececionista') and exists (
    select 1 from public.aulas a where a.id = aula_professores.aula_id and a.centro_id = public.current_centro_id()))
  with check (public.current_user_role() in ('admin','rececionista') and exists (
    select 1 from public.aulas a where a.id = aula_professores.aula_id and a.centro_id = public.current_centro_id()));
create policy aula_professores_explicador_select on public.aula_professores
  for select to authenticated
  using (public.current_user_role() = 'explicador' and exists (
    select 1 from public.aulas a where a.id = aula_professores.aula_id and a.centro_id = public.current_centro_id()));

-- ── aula_alunos (junction via aulas + update de presenças) ────────────────────
create policy aula_alunos_admin_select on public.aula_alunos
  for select to authenticated
  using (public.current_user_role() in ('admin','rececionista') and exists (
    select 1 from public.aulas a where a.id = aula_alunos.aula_id and a.centro_id = public.current_centro_id()));
create policy aula_alunos_admin_modify on public.aula_alunos
  for all to authenticated
  using (public.current_user_role() in ('admin','rececionista') and exists (
    select 1 from public.aulas a where a.id = aula_alunos.aula_id and a.centro_id = public.current_centro_id()))
  with check (public.current_user_role() in ('admin','rececionista') and exists (
    select 1 from public.aulas a where a.id = aula_alunos.aula_id and a.centro_id = public.current_centro_id()));
create policy aula_alunos_explicador_select on public.aula_alunos
  for select to authenticated
  using (public.current_user_role() = 'explicador' and exists (
    select 1 from public.aulas a where a.id = aula_alunos.aula_id and a.centro_id = public.current_centro_id()));
-- Explicador marca presenças apenas em aulas que leciona (via aula_professores).
create policy aula_alunos_explicador_update on public.aula_alunos
  for update to authenticated
  using (public.current_user_role() = 'explicador' and exists (
    select 1 from public.aulas a
      join public.aula_professores ap on ap.aula_id = a.id
     where a.id = aula_alunos.aula_id
       and a.centro_id = public.current_centro_id()
       and ap.professor_user_id = auth.uid()))
  with check (public.current_user_role() = 'explicador' and exists (
    select 1 from public.aulas a
      join public.aula_professores ap on ap.aula_id = a.id
     where a.id = aula_alunos.aula_id
       and a.centro_id = public.current_centro_id()
       and ap.professor_user_id = auth.uid()));
