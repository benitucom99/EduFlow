-- ============================================================================
-- EduFlow — 0003_auth_integration.sql
-- Liga public.users a auth.users (Supabase Auth), aperta RLS por centro_id,
-- adiciona RPC para signup de novo centro e preserva login dos 11 demo users.
-- ============================================================================

-- pgcrypto já está habilitado em 0001 (para crypt/gen_salt usados no seed).

-- ── helpers ─────────────────────────────────────────────────────────────────
create or replace function public.current_centro_id() returns uuid
  language sql stable security definer set search_path = public as
  $$ select centro_id from public.users where id = auth.uid() $$;

create or replace function public.current_user_role() returns text
  language sql stable security definer set search_path = public as
  $$ select role from public.users where id = auth.uid() $$;

grant execute on function public.current_centro_id() to authenticated;
grant execute on function public.current_user_role() to authenticated;

-- ── trigger function (criada antes do seed; trigger só após o seed) ────────
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, nome, centro_id, role)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'nome', ''),
    null, null
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- ── seed auth.users para os 11 utilizadores demo ───────────────────────────
-- IDs idênticos aos de public.users para preservar todas as FKs.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
)
select u.id,
       '00000000-0000-0000-0000-000000000000'::uuid,
       'authenticated', 'authenticated',
       u.email,
       crypt(u.password_hash, gen_salt('bf')),
       now(), now(), now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       jsonb_build_object('nome', u.nome),
       false
  from public.users u
 where not exists (select 1 from auth.users a where a.id = u.id);

insert into auth.identities (id, user_id, provider, provider_id, identity_data, created_at, updated_at, last_sign_in_at)
select gen_random_uuid(), u.id, 'email', u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email),
       now(), now(), now()
  from auth.users u
 where not exists (
   select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email'
 );

-- ── adaptar public.users ──────────────────────────────────────────────────
alter table public.users drop column if exists password_hash;
alter table public.users alter column id drop default;
alter table public.users alter column centro_id drop not null;
alter table public.users alter column role drop not null;

-- FK para auth.users (cascade on delete: apagar user no Auth limpa public.users)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_id_fkey' and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_id_fkey
      foreign key (id) references auth.users(id) on delete cascade;
  end if;
end $$;

-- ── trigger on auth.users (depois do seed, para não duplicar) ──────────────
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── RPC para criar centro no fim do signup ─────────────────────────────────
create or replace function public.create_centro_for_new_admin(p_centro_nome text)
returns uuid language plpgsql security definer set search_path = public as $$
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
  return v_centro_id;
end $$;
grant execute on function public.create_centro_for_new_admin(text) to authenticated;

-- ── RLS: substituir policies permissivas por scoped ────────────────────────
-- Drop policies antigas
do $$
declare t text;
begin
  foreach t in array array[
    'centros','users','disciplinas','professor_perfis','disponibilidades',
    'professor_disciplinas','alunos','alunos_disciplinas','salas',
    'servicos','servico_tiers','aulas','aula_professores','aula_alunos'
  ] loop
    execute format('drop policy if exists %I on public.%I;', t || '_all', t);
  end loop;
end $$;

-- centros: select por id pertencente ao user; admin pode update do seu
create policy centros_select on public.centros for select to authenticated
  using (id = public.current_centro_id());
create policy centros_update on public.centros for update to authenticated
  using (id = public.current_centro_id())
  with check (id = public.current_centro_id());
-- nota: INSERT é feito pela RPC create_centro_for_new_admin (security definer).

-- users: ver-se a si próprio + pares do mesmo centro; só self pode update
create policy users_select on public.users for select to authenticated
  using (id = auth.uid() or centro_id = public.current_centro_id());
create policy users_update_self on public.users for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- tabelas com centro_id directo
do $$
declare t text;
begin
  foreach t in array array[
    'disciplinas','professor_perfis','alunos','salas','servicos','aulas'
  ] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (centro_id = public.current_centro_id());',
      t || '_select', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (centro_id = public.current_centro_id()) with check (centro_id = public.current_centro_id());',
      t || '_modify', t);
  end loop;
end $$;

-- junções: filtro via EXISTS no parent
create policy disponibilidades_all on public.disponibilidades for all to authenticated
  using (exists (
    select 1 from public.professor_perfis p
     where p.user_id = disponibilidades.professor_user_id
       and p.centro_id = public.current_centro_id()
  ))
  with check (exists (
    select 1 from public.professor_perfis p
     where p.user_id = disponibilidades.professor_user_id
       and p.centro_id = public.current_centro_id()
  ));

create policy professor_disciplinas_all on public.professor_disciplinas for all to authenticated
  using (exists (
    select 1 from public.professor_perfis p
     where p.user_id = professor_disciplinas.professor_user_id
       and p.centro_id = public.current_centro_id()
  ))
  with check (exists (
    select 1 from public.professor_perfis p
     where p.user_id = professor_disciplinas.professor_user_id
       and p.centro_id = public.current_centro_id()
  ));

create policy alunos_disciplinas_all on public.alunos_disciplinas for all to authenticated
  using (exists (
    select 1 from public.alunos a
     where a.id = alunos_disciplinas.aluno_id
       and a.centro_id = public.current_centro_id()
  ))
  with check (exists (
    select 1 from public.alunos a
     where a.id = alunos_disciplinas.aluno_id
       and a.centro_id = public.current_centro_id()
  ));

create policy servico_tiers_all on public.servico_tiers for all to authenticated
  using (exists (
    select 1 from public.servicos s
     where s.id = servico_tiers.servico_id
       and s.centro_id = public.current_centro_id()
  ))
  with check (exists (
    select 1 from public.servicos s
     where s.id = servico_tiers.servico_id
       and s.centro_id = public.current_centro_id()
  ));

create policy aula_professores_all on public.aula_professores for all to authenticated
  using (exists (
    select 1 from public.aulas a
     where a.id = aula_professores.aula_id
       and a.centro_id = public.current_centro_id()
  ))
  with check (exists (
    select 1 from public.aulas a
     where a.id = aula_professores.aula_id
       and a.centro_id = public.current_centro_id()
  ));

create policy aula_alunos_all on public.aula_alunos for all to authenticated
  using (exists (
    select 1 from public.aulas a
     where a.id = aula_alunos.aula_id
       and a.centro_id = public.current_centro_id()
  ))
  with check (exists (
    select 1 from public.aulas a
     where a.id = aula_alunos.aula_id
       and a.centro_id = public.current_centro_id()
  ));
