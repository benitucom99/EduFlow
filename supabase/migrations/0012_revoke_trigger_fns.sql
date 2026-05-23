-- ============================================================================
-- EduFlow — 0012_revoke_trigger_fns.sql  (addendum do Lote 3)
-- Os triggers introduzidos na 0010 (prevent_privilege_escalation,
-- prevent_perfil_financial_tamper) ficaram chamáveis via RPC. São funções de
-- trigger — ninguém as deve invocar diretamente. Revoga-se EXECUTE de todos
-- (o disparo do trigger é independente do EXECUTE).
-- ============================================================================
revoke execute on function public.prevent_privilege_escalation()    from public, anon, authenticated;
revoke execute on function public.prevent_perfil_financial_tamper() from public, anon, authenticated;
