import { Disciplina } from "@/contexts/DataContext";

// Modelo de hierarquia (estrito, 2 níveis):
//  - CATEGORIA = disciplina de topo (parentId === null). É só uma caixa de
//    organização: NÃO tem preço e os alunos não a frequentam diretamente.
//  - FOLHA / SUB-DISCIPLINA = disciplina com pai (parentId !== null). É a única
//    cobrável e agendável; é onde vivem as taxas horárias.

/** Categoria = disciplina de topo (sem pai). */
export function isCategoria(all: Disciplina[], id: string): boolean {
  const d = all.find(x => x.id === id);
  return d ? d.parentId == null : false;
}

/** Folha/sub-disciplina = disciplina com pai (cobrável/agendável). */
export function isFolha(all: Disciplina[], id: string): boolean {
  return !isCategoria(all, id);
}

export function childrenOf(all: Disciplina[], parentId: string): Disciplina[] {
  return all.filter(d => d.parentId === parentId);
}

/** Categorias = disciplinas de topo (sem pai). */
export function topLevel(all: Disciplina[]): Disciplina[] {
  return all.filter(d => d.parentId == null);
}

/** Todas as folhas/sub-disciplinas selecionáveis. */
export function folhas(all: Disciplina[]): Disciplina[] {
  return all.filter(d => d.parentId != null);
}

export interface FolhaGrupo {
  categoriaNome: string;
  folhas: Disciplina[];
}

/**
 * Folhas agrupadas pela categoria-pai, para dropdowns/checkboxes.
 * Categorias sem sub-disciplinas não aparecem (não há nada selecionável).
 */
export function folhasAgrupadas(all: Disciplina[]): FolhaGrupo[] {
  const grupos: FolhaGrupo[] = [];
  for (const top of topLevel(all)) {
    const filhas = childrenOf(all, top.id);
    if (filhas.length > 0) grupos.push({ categoriaNome: top.nome, folhas: filhas });
  }
  return grupos;
}
