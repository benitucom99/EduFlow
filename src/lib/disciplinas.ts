import { Disciplina } from "@/contexts/DataContext";

// Modelo de hierarquia (flexível):
//  - Uma disciplina é CATEGORIA se tiver pelo menos uma sub-disciplina.
//  - Uma FOLHA é uma disciplina sem filhos — é a única "cobrável"/agendável.
//  - Uma disciplina de topo (sem pai) sem filhos é uma folha normal com preço.

/** Tem pelo menos uma sub-disciplina. */
export function isCategoria(all: Disciplina[], id: string): boolean {
  return all.some(d => d.parentId === id);
}

/** Folha = disciplina cobrável/agendável (sem filhos). */
export function isFolha(all: Disciplina[], id: string): boolean {
  return !isCategoria(all, id);
}

export function childrenOf(all: Disciplina[], parentId: string): Disciplina[] {
  return all.filter(d => d.parentId === parentId);
}

/** Disciplinas de topo (sem pai). */
export function topLevel(all: Disciplina[]): Disciplina[] {
  return all.filter(d => d.parentId == null);
}

export interface FolhaGrupo {
  /** Nome da categoria-pai, ou null para folhas de topo (sem categoria). */
  categoriaNome: string | null;
  folhas: Disciplina[];
}

/**
 * Folhas selecionáveis agrupadas por categoria, para dropdowns/checkboxes.
 * Categorias aparecem primeiro (com as suas folhas); folhas de topo sem
 * categoria ficam num grupo final sem rótulo.
 */
export function folhasAgrupadas(all: Disciplina[]): FolhaGrupo[] {
  const grupos: FolhaGrupo[] = [];
  const semCategoria: Disciplina[] = [];
  for (const top of topLevel(all)) {
    const filhos = childrenOf(all, top.id);
    if (filhos.length === 0) {
      semCategoria.push(top);
    } else {
      const folhas = filhos.filter(f => !isCategoria(all, f.id));
      if (folhas.length > 0) grupos.push({ categoriaNome: top.nome, folhas });
    }
  }
  if (semCategoria.length > 0) grupos.push({ categoriaNome: null, folhas: semCategoria });
  return grupos;
}

/** Lista plana de todas as folhas selecionáveis. */
export function folhas(all: Disciplina[]): Disciplina[] {
  return all.filter(d => !isCategoria(all, d.id));
}
