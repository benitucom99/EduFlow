// Shared service / pricing tier registry.
// Tiers are inclusive lower-bound: { minClasses: 1, precoHora: 20 } means
// "from 1 class up". The applicable tier for N classes is the one with the
// highest minClasses <= N.

export interface PriceTier {
  minClasses: number;
  precoHora: number;
}

export interface Servico {
  id: string;
  nome: string;
  // Default fallback price (used when no tier matches, e.g. 0 classes edge case).
  precoBase: number;
  tiersIndividual: PriceTier[];
  tiersGrupo: PriceTier[];
}

const initialServicos: Servico[] = [
  { id: "d1", nome: "Matemática",          precoBase: 20, tiersIndividual: [{ minClasses: 1, precoHora: 20 }, { minClasses: 3, precoHora: 18 }, { minClasses: 6, precoHora: 15 }], tiersGrupo: [{ minClasses: 1, precoHora: 12 }] },
  { id: "d2", nome: "Português",           precoBase: 18, tiersIndividual: [{ minClasses: 1, precoHora: 18 }, { minClasses: 3, precoHora: 16 }, { minClasses: 6, precoHora: 14 }], tiersGrupo: [{ minClasses: 1, precoHora: 11 }] },
  { id: "d3", nome: "Inglês",              precoBase: 18, tiersIndividual: [{ minClasses: 1, precoHora: 18 }, { minClasses: 3, precoHora: 16 }, { minClasses: 6, precoHora: 14 }], tiersGrupo: [{ minClasses: 1, precoHora: 11 }] },
  { id: "d4", nome: "Física e Química",    precoBase: 22, tiersIndividual: [{ minClasses: 1, precoHora: 22 }, { minClasses: 3, precoHora: 20 }, { minClasses: 6, precoHora: 17 }], tiersGrupo: [{ minClasses: 1, precoHora: 13 }] },
  { id: "d5", nome: "Biologia e Geologia", precoBase: 20, tiersIndividual: [{ minClasses: 1, precoHora: 20 }, { minClasses: 3, precoHora: 18 }, { minClasses: 6, precoHora: 15 }], tiersGrupo: [{ minClasses: 1, precoHora: 12 }] },
  { id: "d6", nome: "Economia",            precoBase: 18, tiersIndividual: [{ minClasses: 1, precoHora: 18 }, { minClasses: 3, precoHora: 16 }, { minClasses: 6, precoHora: 14 }], tiersGrupo: [{ minClasses: 1, precoHora: 11 }] },
  { id: "d7", nome: "Geometria Descritiva",precoBase: 22, tiersIndividual: [{ minClasses: 1, precoHora: 22 }, { minClasses: 3, precoHora: 20 }, { minClasses: 6, precoHora: 17 }], tiersGrupo: [{ minClasses: 1, precoHora: 13 }] },
  { id: "d8", nome: "História",            precoBase: 18, tiersIndividual: [{ minClasses: 1, precoHora: 18 }, { minClasses: 3, precoHora: 16 }, { minClasses: 6, precoHora: 14 }], tiersGrupo: [{ minClasses: 1, precoHora: 11 }] },
];

// Module-level mutable registry. ServicosPage updates this; faturacao reads it.
// Listeners are notified so subscribed components re-render.
let servicos: Servico[] = [...initialServicos];
const listeners = new Set<() => void>();

export function getServicos(): Servico[] {
  return servicos;
}

export function setServicos(next: Servico[]) {
  servicos = next;
  listeners.forEach(l => l());
}

export function subscribeServicos(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getServicoByNome(nome: string): Servico | undefined {
  return servicos.find(s => s.nome === nome);
}

/** Pick the applicable tier for a given class count. */
export function pickTier(tiers: PriceTier[], numClasses: number): PriceTier | undefined {
  const sorted = [...tiers].sort((a, b) => a.minClasses - b.minClasses);
  let match: PriceTier | undefined;
  for (const t of sorted) {
    if (numClasses >= t.minClasses) match = t;
  }
  return match ?? sorted[0];
}

/**
 * Resolve €/h for a service + tipo, given how many classes of that
 * service the student attends.
 */
export function resolveRate(disciplina: string, tipo: "individual" | "grupo", numClasses: number): number {
  const svc = getServicoByNome(disciplina);
  if (!svc) return 0;
  const tiers = tipo === "individual" ? svc.tiersIndividual : svc.tiersGrupo;
  const tier = pickTier(tiers, Math.max(numClasses, 1));
  return tier?.precoHora ?? svc.precoBase;
}
