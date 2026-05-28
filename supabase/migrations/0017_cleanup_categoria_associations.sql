-- Remove professor_disciplinas rows pointing to category-level disciplines (parent_id IS NULL).
-- These are invalid under the strict 2-level hierarchy: only sub-disciplines (leaves) are bookable/billable.
DELETE FROM professor_disciplinas pd
USING disciplinas d
WHERE pd.disciplina_id = d.id
  AND d.parent_id IS NULL;

-- Same cleanup for alunos_disciplinas
DELETE FROM alunos_disciplinas ad
USING disciplinas d
WHERE ad.disciplina_id = d.id
  AND d.parent_id IS NULL;
