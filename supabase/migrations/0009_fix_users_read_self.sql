-- Garante que qualquer utilizador pode sempre ler o seu próprio perfil (vital para o onboarding e login seguro)
create policy users_read_self on public.users
  for select to authenticated
  using (id = auth.uid());
