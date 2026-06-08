import { describe, it, expect } from "vitest";
import { calcularCobrancaAula, calcularCobrancaAlunos } from "@/lib/faturacao";
import type { Aula, Aluno, Disciplina } from "@/contexts/DataContext";

const HOJE = "2026-06-15";
const FUTURO = "2026-06-20";
const PASSADO = "2026-06-10";

// Helper para chamar a função pura com defaults sensatos.
function calc(over: Partial<Parameters<typeof calcularCobrancaAula>[0]>) {
  return calcularCobrancaAula({
    presenca: null,
    cobrarFaltaDecisao: true,
    isReposicao: false,
    data: PASSADO,
    momento: "fim",
    precoBase: 100,
    hoje: HOJE,
    ...over,
  });
}

describe("calcularCobrancaAula — momento 'fim' (comportamento atual)", () => {
  it("presente cobra o valor base", () => {
    expect(calc({ momento: "fim", presenca: "presente" })).toEqual({ cobrar: true, valor: 100 });
  });
  it("falta justificada NÃO cobra", () => {
    expect(calc({ momento: "fim", presenca: "falta_justificada" })).toEqual({ cobrar: false, valor: 0 });
  });
  it("agendada futura sem marcação NÃO cobra", () => {
    expect(calc({ momento: "fim", presenca: null, data: FUTURO })).toEqual({ cobrar: false, valor: 0 });
  });
  it("sem marcação (passada) NÃO cobra", () => {
    expect(calc({ momento: "fim", presenca: null, data: PASSADO })).toEqual({ cobrar: false, valor: 0 });
  });
  it("reposição cobra pela presença (sem efeito especial)", () => {
    expect(calc({ momento: "fim", presenca: "presente", isReposicao: true })).toEqual({ cobrar: true, valor: 100 });
    expect(calc({ momento: "fim", presenca: null, isReposicao: true })).toEqual({ cobrar: false, valor: 0 });
  });
  it("falta injustificada respeita a decisão por-aula", () => {
    expect(calc({ momento: "fim", presenca: "falta_injustificada", cobrarFaltaDecisao: true })).toEqual({ cobrar: true, valor: 100 });
    expect(calc({ momento: "fim", presenca: "falta_injustificada", cobrarFaltaDecisao: false })).toEqual({ cobrar: false, valor: 0 });
  });
});

describe("calcularCobrancaAula — momento 'inicio' (mensalidade)", () => {
  it("presente cobra base", () => {
    expect(calc({ momento: "inicio", presenca: "presente" })).toEqual({ cobrar: true, valor: 100 });
  });
  it("falta justificada COBRA (já pagou)", () => {
    expect(calc({ momento: "inicio", presenca: "falta_justificada" })).toEqual({ cobrar: true, valor: 100 });
  });
  it("agendada futura sem marcação COBRA (projeção)", () => {
    expect(calc({ momento: "inicio", presenca: null, data: FUTURO })).toEqual({ cobrar: true, valor: 100 });
  });
  it("passada sem marcação NÃO cobra", () => {
    expect(calc({ momento: "inicio", presenca: null, data: PASSADO })).toEqual({ cobrar: false, valor: 0 });
  });
  it("reposição custa 0€ mas aparece na fatura (cobrar=true)", () => {
    expect(calc({ momento: "inicio", presenca: "presente", isReposicao: true })).toEqual({ cobrar: true, valor: 0 });
    // mesmo sem presença marcada, reposição = 0€
    expect(calc({ momento: "inicio", presenca: null, isReposicao: true, data: FUTURO })).toEqual({ cobrar: true, valor: 0 });
  });
  it("falta injustificada respeita a decisão por-aula (igual nos dois momentos)", () => {
    expect(calc({ momento: "inicio", presenca: "falta_injustificada", cobrarFaltaDecisao: true })).toEqual({ cobrar: true, valor: 100 });
    expect(calc({ momento: "inicio", presenca: "falta_injustificada", cobrarFaltaDecisao: false })).toEqual({ cobrar: false, valor: 0 });
  });
});

// ── Integração: calcularCobrancaAlunos agrega corretamente ──────────────────
function mkDisc(nome: string, preco: number): Disciplina {
  return { id: `d-${nome}`, nome, precoHoraIndividual: preco, precoHoraGrupo: preco, parentId: null };
}
function mkAluno(id: string): Aluno {
  return {
    id, nome: `Aluno ${id}`, email: "", telefone: "", escola: "", anoLetivo: 0,
    disciplinas: [], encarregado: { nome: "", email: "", telefone: "" },
    estado: "ativo", dataInscricao: "2026-01-01", desconto: 0,
  };
}
function mkAula(over: Partial<Aula> & { id: string; data: string; alunoId: string }): Aula {
  const { alunoId, ...rest } = over;
  return {
    id: over.id, alunoIds: [alunoId], explicadorId: "e1", salaId: "s1",
    disciplina: "Matemática", data: over.data, horaInicio: "10:00", horaFim: "11:00",
    tipo: "individual", estado: "agendada", presencas: {}, presencaInfo: {},
    isReposicao: false, recorrencia: "unica",
    ...rest,
  };
}

describe("calcularCobrancaAlunos — agregação por momento", () => {
  const discs = [mkDisc("Matemática", 100)];
  const alunos = [mkAluno("a1")];

  it("'fim': só a aula presente conta; futura e justificada não", () => {
    const aulas: Aula[] = [
      mkAula({ id: "x1", data: PASSADO, alunoId: "a1", presencas: { a1: "presente" } }),
      mkAula({ id: "x2", data: PASSADO, alunoId: "a1", presencas: { a1: "falta_justificada" } }),
      mkAula({ id: "x3", data: FUTURO, alunoId: "a1", presencas: { a1: null } }),
    ];
    const r = calcularCobrancaAlunos(aulas, alunos, discs, "2026-06-01", "2026-06-30", "fim", HOJE);
    expect(r).toHaveLength(1);
    expect(r[0].valorTotal).toBe(100); // só a presente
  });

  it("'inicio': presente + justificada + futura contam; reposição 0€", () => {
    const aulas: Aula[] = [
      mkAula({ id: "x1", data: PASSADO, alunoId: "a1", presencas: { a1: "presente" } }),
      mkAula({ id: "x2", data: PASSADO, alunoId: "a1", presencas: { a1: "falta_justificada" } }),
      mkAula({ id: "x3", data: FUTURO, alunoId: "a1", presencas: { a1: null } }),
      mkAula({ id: "x4", data: PASSADO, alunoId: "a1", presencas: { a1: "presente" }, isReposicao: true }),
    ];
    const r = calcularCobrancaAlunos(aulas, alunos, discs, "2026-06-01", "2026-06-30", "inicio", HOJE);
    expect(r).toHaveLength(1);
    // 100 (presente) + 100 (justificada) + 100 (futura) + 0 (reposição) = 300
    expect(r[0].valorTotal).toBe(300);
  });
});
