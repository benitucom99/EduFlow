-- ============================================================================
-- EduFlow — 0011_db_hardening.sql  (LOTE 3 da auditoria de segurança)
--
--   1. REVOKE EXECUTE das funções SECURITY DEFINER expostas via RPC ao anon.
--      - handle_new_user é função de trigger → ninguém a deve invocar (revoga
--        de todos; o trigger continua a disparar, é independente do EXECUTE).
--      - current_centro_id / current_user_role são usadas DENTRO das policies
--        RLS → têm de manter EXECUTE para authenticated; revoga-se só de anon.
--      - create_centro_for_new_admin é chamada no signup por authenticated.
--   2. DROP da tabela órfã public."Centros" (C maiúsculo, vazia, sem policies).
-- ============================================================================

revoke execute on function public.handle_new_user()                from public, anon, authenticated;
revoke execute on function public.current_centro_id()              from public, anon;
revoke execute on function public.current_user_role()              from public, anon;
revoke execute on function public.create_centro_for_new_admin(text) from public, anon;

-- Garante que authenticated mantém o necessário para RLS e signup.
grant execute on function public.current_centro_id()              to authenticated;
grant execute on function public.current_user_role()              to authenticated;
grant execute on function public.create_centro_for_new_admin(text) to authenticated;

-- Tabela órfã (advisor: rls_enabled_no_policy) — confirmada vazia.
drop table if exists public."Centros";
