-- ============================================================================
-- 0027 — Onboarding: criar "Sala 1" automaticamente com o centro.
--
-- O conceito de salas não devia ser pré-requisito no dia 1: o admin novo
-- ganha uma sala default e só visita a página Salas se precisar de mais.
-- Nota: o schema vivo de public.salas é (id, centro_id, nome, created_at) —
-- as colunas capacidade/equipamentos/estado do 0001 já não existem na BD.
-- ============================================================================

create or replace function public.create_centro_for_new_admin(p_centro_nome text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_centro_id uuid;
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if exists (select 1 from public.users where id = v_user and centro_id is not null) then
    raise exception 'user already has centro';
  end if;
  insert into public.centros (nome) values (p_centro_nome) returning id into v_centro_id;
  update public.users set centro_id = v_centro_id, role = 'admin' where id = v_user;
  insert into public.salas (centro_id, nome) values (v_centro_id, 'Sala 1');
  return v_centro_id;
end $function$;
