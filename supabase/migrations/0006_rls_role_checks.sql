-- ============================================================================
-- EduFlow — 0006_rls_role_checks.sql
-- Redefine RLS por role de negócio.
--
-- Admin / Rececionista : SELECT + ALL em tudo do seu centro.
-- Explicador           : SELECT em tabelas operacionais (nunca faturacao).
--                        UPDATE apenas no próprio perfil e em presenças.
--                        Sem INSERT nem DELETE em qualquer tabela.
--
-- Helpers usados: public.current_centro_id()  (0003)
--                 public.current_user_role()   (0003)
-- ============================================================================

-- ── Step 1: Drop de todas as policies existentes ─────────────────────────────

-- centros  (0001: centros_all  |  0003: centros_select, centros_update)
drop policy if exists centros_all    on public.centros;
drop policy if exists centros_select on public.centros;
drop policy if exists centros_update on public.centros;

-- users  (0001: users_all  |  0003: users_select, users_update_self)
drop policy if exists users_all         on public.users;
drop policy if exists users_select      on public.users;
drop policy if exists users_update_self on public.users;

-- disciplinas  (0001: disciplinas_all  |  0003: disciplinas_select, disciplinas_modify)
drop policy if exists disciplinas_all    on public.disciplinas;
drop policy if exists disciplinas_select on public.disciplinas;
drop policy if exists disciplinas_modify on public.disciplinas;

-- professor_perfis  (0001: professor_perfis_all  |  0003: professor_perfis_select, professor_perfis_modify)
drop policy if exists professor_perfis_all    on public.professor_perfis;
drop policy if exists professor_perfis_select on public.professor_perfis;
drop policy if exists professor_perfis_modify on public.professor_perfis;

-- professor_disciplinas  (0001 + 0003: professor_disciplinas_all)
drop policy if exists professor_disciplinas_all    on public.professor_disciplinas;
drop policy if exists professor_disciplinas_select on public.professor_disciplinas;
drop policy if exists professor_disciplinas_modify on public.professor_disciplinas;

-- alunos  (0001: alunos_all  |  0003: alunos_select, alunos_modify)
drop policy if exists alunos_all    on public.alunos;
drop policy if exists alunos_select on public.alunos;
drop policy if exists alunos_modify on public.alunos;

-- alunos_disciplinas  (0001 + 0003: alunos_disciplinas_all)
drop policy if exists alunos_disciplinas_all    on public.alunos_disciplinas;
drop policy if exists alunos_disciplinas_select on public.alunos_disciplinas;
drop policy if exists alunos_disciplinas_modify on public.alunos_disciplinas;

-- salas  (0001: salas_all  |  0003: salas_select, salas_modify)
drop policy if exists salas_all    on public.salas;
drop policy if exists salas_select on public.salas;
drop policy if exists salas_modify on public.salas;

-- aulas  (0001: aulas_all  |  0003: aulas_select, aulas_modify)
drop policy if exists aulas_all    on public.aulas;
drop policy if exists aulas_select on public.aulas;
drop policy if exists aulas_modify on public.aulas;

-- aula_professores  (0001 + 0003: aula_professores_all)
drop policy if exists aula_professores_all    on public.aula_professores;
drop policy if exists aula_professores_select on public.aula_professores;
drop policy if exists aula_professores_modify on public.aula_professores;

-- aula_alunos  (0001 + 0003: aula_alunos_all)
drop policy if exists aula_alunos_all    on public.aula_alunos;
drop policy if exists aula_alunos_select on public.aula_alunos;
drop policy if exists aula_alunos_modify on public.aula_alunos;

-- faturacao  (0004: faturacao_select, faturacao_modify)
drop policy if exists faturacao_all    on public.faturacao;
drop policy if exists faturacao_select on public.faturacao;
drop policy if exists faturacao_modify on public.faturacao;

-- tabelas eliminadas em 0004 — IF EXISTS por segurança
drop policy if exists servicos_all       on public.servicos;
drop policy if exists servicos_select    on public.servicos;
drop policy if exists servicos_modify    on public.servicos;
drop policy if exists servico_tiers_all  on public.servico_tiers;
drop policy if exists disponibilidades_all on public.disponibilidades;


-- ── Step 2: centros ──────────────────────────────────────────────────────────

create policy centros_admin_select on public.centros
  for select to authenticated
  using (
    public.current_user_role() in ('admin', 'rececionista')
    and id = public.current_centro_id()
  );

create policy centros_admin_modify on public.centros
  for all to authenticated
  using (
    public.current_user_role() in ('admin', 'rececionista')
    and id = public.current_centro_id()
  )
  with check (
    public.current_user_role() in ('admin', 'rececionista')
    and id = public.current_centro_id()
  );

create policy centros_explicador_select on public.centros
  for select to authenticated
  using (
    public.current_user_role() = 'explicador'
    and id = public.current_centro_id()
  );


-- ── Step 3: users ────────────────────────────────────────────────────────────

create policy users_admin_select on public.users
  for select to authenticated
  using (
    public.current_user_role() in ('admin', 'rececionista')
    and centro_id = public.current_centro_id()
  );

create policy users_admin_modify on public.users
  for all to authenticated
  using (
    public.current_user_role() in ('admin', 'rececionista')
    and centro_id = public.current_centro_id()
  )
  with check (
    public.current_user_role() in ('admin', 'rececionista')
    and centro_id = public.current_centro_id()
  );

create policy users_explicador_select on public.users
  for select to authenticated
  using (
    public.current_user_role() = 'explicador'
    and centro_id = public.current_centro_id()
  );

create policy users_explicador_update on public.users
  for update to authenticated
  using  (public.current_user_role() = 'explicador' and id = auth.uid())
  with check (public.current_user_role() = 'explicador' and id = auth.uid());


-- ── Step 4: disciplinas ──────────────────────────────────────────────────────

create policy disciplinas_admin_select on public.disciplinas
  for select to authenticated
  using (
    public.current_user_role() in ('admin', 'rececionista')
    and centro_id = public.current_centro_id()
  );

create policy disciplinas_admin_modify on public.disciplinas
  for all to authenticated
  using (
    public.current_user_role() in ('admin', 'rececionista')
    and centro_id = public.current_centro_id()
  )
  with check (
    public.current_user_role() in ('admin', 'rececionista')
    and centro_id = public.current_centro_id()
  );

create policy disciplinas_explicador_select on public.disciplinas
  for select to authenticated
  using (
    public.current_user_role() = 'explicador'
    and centro_id = public.current_centro_id()
  );


-- ── Step 5: professor_perfis ─────────────────────────────────────────────────

create policy professor_perfis_admin_select on public.professor_perfis
  for select to authenticated
  using (
    public.current_user_role() in ('admin', 'rececionista')
    and centro_id = public.current_centro_id()
  );

create policy professor_perfis_admin_modify on public.professor_perfis
  for all to authenticated
  using (
    public.current_user_role() in ('admin', 'rececionista')
    and centro_id = public.current_centro_id()
  )
  with check (
    public.current_user_role() in ('admin', 'rececionista')
    and centro_id = public.current_centro_id()
  );

create policy professor_perfis_explicador_select on public.professor_perfis
  for select to authenticated
  using (
    public.current_user_role() = 'explicador'
    and centro_id = public.current_centro_id()
  );

create policy professor_perfis_explicador_update on public.professor_perfis
  for update to authenticated
  using  (public.current_user_role() = 'explicador' and user_id = auth.uid())
  with check (public.current_user_role() = 'explicador' and user_id = auth.uid());


-- ── Step 6: alunos ───────────────────────────────────────────────────────────

create policy alunos_admin_select on public.alunos
  for select to authenticated
  using (
    public.current_user_role() in ('admin', 'rececionista')
    and centro_id = public.current_centro_id()
  );

create policy alunos_admin_modify on public.alunos
  for all to authenticated
  using (
    public.current_user_role() in ('admin', 'rececionista')
    and centro_id = public.current_centro_id()
  )
  with check (
    public.current_user_role() in ('admin', 'rececionista')
    and centro_id = public.current_centro_id()
  );

create policy alunos_explicador_select on public.alunos
  for select to authenticated
  using (
    public.current_user_role() = 'explicador'
    and centro_id = public.current_centro_id()
  );


-- ── Step 7: salas ────────────────────────────────────────────────────────────

create policy salas_admin_select on public.salas
  for select to authenticated
  using (
    public.current_user_role() in ('admin', 'rececionista')
    and centro_id = public.current_centro_id()
  );

create policy salas_admin_modify on public.salas
  for all to authenticated
  using (
    public.current_user_role() in ('admin', 'rececionista')
    and centro_id = public.current_centro_id()
  )
  with check (
    public.current_user_role() in ('admin', 'rececionista')
    and centro_id = public.current_centro_id()
  );

create policy salas_explicador_select on public.salas
  for select to authenticated
  using (
    public.current_user_role() = 'explicador'
    and centro_id = public.current_centro_id()
  );


-- ── Step 8: aulas ────────────────────────────────────────────────────────────

create policy aulas_admin_select on public.aulas
  for select to authenticated
  using (
    public.current_user_role() in ('admin', 'rececionista')
    and centro_id = public.current_centro_id()
  );

create policy aulas_admin_modify on public.aulas
  for all to authenticated
  using (
    public.current_user_role() in ('admin', 'rececionista')
    and centro_id = public.current_centro_id()
  )
  with check (
    public.current_user_role() in ('admin', 'rececionista')
    and centro_id = public.current_centro_id()
  );

create policy aulas_explicador_select on public.aulas
  for select to authenticated
  using (
    public.current_user_role() = 'explicador'
    and centro_id = public.current_centro_id()
  );


-- ── Step 9: faturacao — admin/rececionista apenas; explicador sem acesso ──────

create policy faturacao_admin_select on public.faturacao
  for select to authenticated
  using (
    public.current_user_role() in ('admin', 'rececionista')
    and centro_id = public.current_centro_id()
  );

create policy faturacao_admin_modify on public.faturacao
  for all to authenticated
  using (
    public.current_user_role() in ('admin', 'rececionista')
    and centro_id = public.current_centro_id()
  )
  with check (
    public.current_user_role() in ('admin', 'rececionista')
    and centro_id = public.current_centro_id()
  );


-- ── Step 10: professor_disciplinas (junction via professor_perfis) ────────────

create policy professor_disciplinas_admin_select on public.professor_disciplinas
  for select to authenticated
  using (
    public.current_user_role() in ('admin', 'rececionista')
    and exists (
      select 1 from public.professor_perfis p
       where p.user_id = professor_disciplinas.professor_user_id
         and p.centro_id = public.current_centro_id()
    )
  );

create policy professor_disciplinas_admin_modify on public.professor_disciplinas
  for all to authenticated
  using (
    public.current_user_role() in ('admin', 'rececionista')
    and exists (
      select 1 from public.professor_perfis p
       where p.user_id = professor_disciplinas.professor_user_id
         and p.centro_id = public.current_centro_id()
    )
  )
  with check (
    public.current_user_role() in ('admin', 'rececionista')
    and exists (
      select 1 from public.professor_perfis p
       where p.user_id = professor_disciplinas.professor_user_id
         and p.centro_id = public.current_centro_id()
    )
  );

create policy professor_disciplinas_explicador_select on public.professor_disciplinas
  for select to authenticated
  using (
    public.current_user_role() = 'explicador'
    and exists (
      select 1 from public.professor_perfis p
       where p.user_id = professor_disciplinas.professor_user_id
         and p.centro_id = public.current_centro_id()
    )
  );


-- ── Step 11: alunos_disciplinas (junction via alunos) ────────────────────────

create policy alunos_disciplinas_admin_select on public.alunos_disciplinas
  for select to authenticated
  using (
    public.current_user_role() in ('admin', 'rececionista')
    and exists (
      select 1 from public.alunos a
       where a.id = alunos_disciplinas.aluno_id
         and a.centro_id = public.current_centro_id()
    )
  );

create policy alunos_disciplinas_admin_modify on public.alunos_disciplinas
  for all to authenticated
  using (
    public.current_user_role() in ('admin', 'rececionista')
    and exists (
      select 1 from public.alunos a
       where a.id = alunos_disciplinas.aluno_id
         and a.centro_id = public.current_centro_id()
    )
  )
  with check (
    public.current_user_role() in ('admin', 'rececionista')
    and exists (
      select 1 from public.alunos a
       where a.id = alunos_disciplinas.aluno_id
         and a.centro_id = public.current_centro_id()
    )
  );

create policy alunos_disciplinas_explicador_select on public.alunos_disciplinas
  for select to authenticated
  using (
    public.current_user_role() = 'explicador'
    and exists (
      select 1 from public.alunos a
       where a.id = alunos_disciplinas.aluno_id
         and a.centro_id = public.current_centro_id()
    )
  );


-- ── Step 12: aula_professores (junction via aulas) ───────────────────────────

create policy aula_professores_admin_select on public.aula_professores
  for select to authenticated
  using (
    public.current_user_role() in ('admin', 'rececionista')
    and exists (
      select 1 from public.aulas a
       where a.id = aula_professores.aula_id
         and a.centro_id = public.current_centro_id()
    )
  );

create policy aula_professores_admin_modify on public.aula_professores
  for all to authenticated
  using (
    public.current_user_role() in ('admin', 'rececionista')
    and exists (
      select 1 from public.aulas a
       where a.id = aula_professores.aula_id
         and a.centro_id = public.current_centro_id()
    )
  )
  with check (
    public.current_user_role() in ('admin', 'rececionista')
    and exists (
      select 1 from public.aulas a
       where a.id = aula_professores.aula_id
         and a.centro_id = public.current_centro_id()
    )
  );

create policy aula_professores_explicador_select on public.aula_professores
  for select to authenticated
  using (
    public.current_user_role() = 'explicador'
    and exists (
      select 1 from public.aulas a
       where a.id = aula_professores.aula_id
         and a.centro_id = public.current_centro_id()
    )
  );


-- ── Step 13: aula_alunos (junction via aulas + update de presenças) ───────────

create policy aula_alunos_admin_select on public.aula_alunos
  for select to authenticated
  using (
    public.current_user_role() in ('admin', 'rececionista')
    and exists (
      select 1 from public.aulas a
       where a.id = aula_alunos.aula_id
         and a.centro_id = public.current_centro_id()
    )
  );

create policy aula_alunos_admin_modify on public.aula_alunos
  for all to authenticated
  using (
    public.current_user_role() in ('admin', 'rececionista')
    and exists (
      select 1 from public.aulas a
       where a.id = aula_alunos.aula_id
         and a.centro_id = public.current_centro_id()
    )
  )
  with check (
    public.current_user_role() in ('admin', 'rececionista')
    and exists (
      select 1 from public.aulas a
       where a.id = aula_alunos.aula_id
         and a.centro_id = public.current_centro_id()
    )
  );

create policy aula_alunos_explicador_select on public.aula_alunos
  for select to authenticated
  using (
    public.current_user_role() = 'explicador'
    and exists (
      select 1 from public.aulas a
       where a.id = aula_alunos.aula_id
         and a.centro_id = public.current_centro_id()
    )
  );

-- UPDATE para marcar presenças — apenas dentro do seu centro
create policy aula_alunos_explicador_update on public.aula_alunos
  for update to authenticated
  using (
    public.current_user_role() = 'explicador'
    and exists (
      select 1 from public.aulas a
       where a.id = aula_alunos.aula_id
         and a.centro_id = public.current_centro_id()
    )
  )
  with check (
    public.current_user_role() = 'explicador'
    and exists (
      select 1 from public.aulas a
       where a.id = aula_alunos.aula_id
         and a.centro_id = public.current_centro_id()
    )
  );
