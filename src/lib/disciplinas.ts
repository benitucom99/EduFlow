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

/**
 * Nomes das categorias-pai correspondentes a um conjunto de folhas (por nome),
 * deduplicados e pela ordem das categorias. Usado nas vistas de resumo (listas)
 * para mostrar a disciplina-pai em vez das sub-disciplinas. Folhas órfãs (sem
 * categoria reconhecível) entram com o próprio nome, para nunca esconder dados.
 */
export function categoriasDasFolhas(all: Disciplina[], folhaNomes: string[]): string[] {
  const nomeSet = new Set(folhaNomes);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const top of topLevel(all)) {
    if (childrenOf(all, top.id).some(f => nomeSet.has(f.nome)) && !seen.has(top.nome)) {
      seen.add(top.nome);
      out.push(top.nome);
    }
  }
  for (const nome of folhaNomes) {
    const d = all.find(x => x.nome === nome);
    const semCategoria = !d || d.parentId == null || !all.some(x => x.id === d.parentId);
    if (semCategoria && !seen.has(nome)) {
      seen.add(nome);
      out.push(nome);
    }
  }
  return out;
}

/**
 * Como `folhasAgrupadas`, mas restrito a um conjunto de folhas (por nome). Usado
 * na vista detalhada dos perfis (categoria como título + sub-disciplinas). Folhas
 * sem categoria reconhecível vão para um grupo final sem nome (categoriaNome "").
 */
export function folhasAgrupadasFiltradas(all: Disciplina[], folhaNomes: string[]): FolhaGrupo[] {
  const nomeSet = new Set(folhaNomes);
  const grupos: FolhaGrupo[] = [];
  const capturadas = new Set<string>();
  for (const top of topLevel(all)) {
    const filhas = childrenOf(all, top.id).filter(f => nomeSet.has(f.nome));
    if (filhas.length > 0) {
      filhas.forEach(f => capturadas.add(f.nome));
      grupos.push({ categoriaNome: top.nome, folhas: filhas });
    }
  }
  const orfas = all.filter(d => nomeSet.has(d.nome) && !capturadas.has(d.nome));
  if (orfas.length > 0) grupos.push({ categoriaNome: "", folhas: orfas });
  return grupos;
}
