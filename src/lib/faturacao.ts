import { Aula, Aluno, Explicador, Disciplina, ModoPagamentoProfessor, MomentoPagamento, Presenca, EscalaoPreco } from "@/contexts/DataContext";

/**
 * Preço/hora individual efetivo para uma duração (descontos por volume).
 * Escolhe o escalão de maior `duracaoMin` cujo limiar é atingido pela duração e
 * aplica esse preço a TODA a aula. Sem escalão atingido → o preço base.
 * Defensivo quanto a ordem/validade dos escalões.
 */
export function precoHoraIndividualParaDuracao(
  precoBase: number,
  escaloes: EscalaoPreco[] | undefined,
  duracao: number
): number {
  const aplicaveis = (escaloes ?? [])
    .filter(e => e.duracaoMin > 0 && e.precoHora >= 0 && duracao >= e.duracaoMin)
    .sort((a, b) => a.duracaoMin - b.duracaoMin);
  return aplicaveis.length ? aplicaveis[aplicaveis.length - 1].precoHora : precoBase;
}

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Decide a cobrança ao aluno por aula×aluno, segundo o momento de pagamento.
 * Função pura (sem dependências externas) — `hoje` injetável para testes.
 *
 * - "fim": comportamento histórico — só cobra presença efetiva (e falta
 *   injustificada conforme a decisão por-aula). Reposição não tem efeito especial.
 * - "inicio": mensalidade — cobra agendadas futuras (projeção) e faltas
 *   justificadas (já pagas); reposição custa 0€ (a falta original já foi paga).
 *
 * A falta injustificada respeita SEMPRE a decisão por-aula (cobrarFaltaDecisao),
 * em ambos os momentos.
 */
export function calcularCobrancaAula(args: {
  presenca: Presenca;
  cobrarFaltaDecisao: boolean;
  isReposicao: boolean;
  data: string;
  momento: MomentoPagamento;
  precoBase: number;
  hoje?: string;
}): { cobrar: boolean; valor: number } {
  const { presenca, cobrarFaltaDecisao, isReposicao, data, momento, precoBase } = args;
  const hoje = args.hoje ?? hojeISO();

  // Falta injustificada: decisão por-aula manda, em qualquer momento.
  if (presenca === "falta_injustificada") {
    return cobrarFaltaDecisao ? { cobrar: true, valor: precoBase } : { cobrar: false, valor: 0 };
  }

  if (momento === "inicio") {
    // Reposição já foi paga (via a falta justificada original) → 0€ ao aluno,
    // mas continua a aparecer na fatura (cobrar=true) com valor zero.
    if (isReposicao) return { cobrar: true, valor: 0 };
    if (presenca === "presente") return { cobrar: true, valor: precoBase };
    if (presenca === "falta_justificada") return { cobrar: true, valor: precoBase };
    // Sem marcação: cobra só se ainda é futura (mensalidade avança = projeção).
    if (presenca === null && data > hoje) return { cobrar: true, valor: precoBase };
    return { cobrar: false, valor: 0 };
  }

  // momento === "fim" (comportamento atual): só presença efetiva cobra.
  if (presenca === "presente") return { cobrar: true, valor: precoBase };
  return { cobrar: false, valor: 0 };
}

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export function parseDurationHours(horaInicio: string, horaFim: string): number {
  const [h1, m1] = horaInicio.split(":").map(Number);
  const [h2, m2] = horaFim.split(":").map(Number);
  // Math.max(0, …): se horaFim for anterior a horaInicio (dados inválidos),
  // devolve 0 em vez de uma duração negativa que falsearia a faturação.
  return Math.max(0, (h2 * 60 + m2 - h1 * 60 - m1) / 60);
}

export function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${String(m).padStart(2, "0")}min`;
}

export interface AulaFaturacaoAluno {
  aula: Aula;
  presenca: "presente" | "falta_justificada" | "falta_injustificada" | null;
  duracao: number;
  precoPorHora: number;
  valorSessao: number;
  cobrar: boolean;
}

export interface ResumoAluno {
  aluno: Aluno;
  aulas: AulaFaturacaoAluno[];
  aulasRealizadas: number;
  horasTotais: number;
  valorTotal: number;
}

export function calcularCobrancaAlunos(
  aulas: Aula[],
  alunos: Aluno[],
  disciplinas: Disciplina[],
  dataInicio: string,
  dataFim: string,
  // Momento de pagamento do centro. Default "fim" = comportamento histórico.
  momento: MomentoPagamento = "fim",
  hoje?: string
): ResumoAluno[] {
  // Aulas canceladas nunca são cobradas, independentemente da presença registada.
  const aulasFiltradas = aulas.filter(a => a.estado !== "cancelada" && a.data >= dataInicio && a.data <= dataFim);
  const alunoMap = new Map(alunos.map(a => [a.id, a]));
  const discByNome = new Map(disciplinas.map(d => [d.nome, d]));
  const resultado = new Map<string, AulaFaturacaoAluno[]>();

  for (const aula of aulasFiltradas) {
    for (const alunoId of aula.alunoIds) {
      const presenca = aula.presencas[alunoId] ?? null;
      const duracao = parseDurationHours(aula.horaInicio, aula.horaFim);
      // Preço/hora efetivo conforme o tipo de aula. Em grupo, cada aluno paga o
      // preço de grupo por hora (fixo por aluno, rígido — sem escalões). Em
      // individual, aplica-se o escalão de preço por duração se existir.
      const disc = discByNome.get(aula.disciplina);
      const precoPorHora = aula.tipo === "grupo"
        ? (disc?.precoHoraGrupo ?? 0)
        : precoHoraIndividualParaDuracao(disc?.precoHoraIndividual ?? 0, disc?.escaloesPrecoIndividual, duracao);
      const aluno = alunoMap.get(alunoId);
      const descontoRatio = (aluno?.desconto || 0) / 100;
      const precoBase = (precoPorHora * duracao) * (1 - descontoRatio);
      // Decisão de cobrança conforme o momento de pagamento do centro (tabela
      // da verdade isolada em calcularCobrancaAula). Sem decisão explícita de
      // falta injustificada (faltas antigas) assume-se cobrar (retrocompat).
      const cobrarFaltaDecisao = aula.presencaInfo[alunoId]?.cobrarFalta ?? true;
      const { cobrar, valor: valorSessao } = calcularCobrancaAula({
        presenca,
        cobrarFaltaDecisao,
        isReposicao: aula.isReposicao,
        data: aula.data,
        momento,
        precoBase,
        hoje,
      });

      if (!resultado.has(alunoId)) resultado.set(alunoId, []);
      resultado.get(alunoId)!.push({ aula, presenca, duracao, precoPorHora, valorSessao, cobrar });
    }
  }

  return Array.from(resultado.entries())
    .map(([alunoId, aulasAluno]) => {
      const aluno = alunoMap.get(alunoId);
      if (!aluno) return null;
      const aulasCobradas = aulasAluno.filter(a => a.cobrar);
      return {
        aluno,
        aulas: aulasAluno,
        aulasRealizadas: aulasCobradas.length,
        horasTotais: aulasCobradas.reduce((s, a) => s + a.duracao, 0),
        valorTotal: aulasCobradas.reduce((s, a) => s + a.valorSessao, 0),
      };
    })
    .filter((r): r is ResumoAluno => r !== null && r.aulas.length > 0)
    .sort((a, b) => a.aluno.nome.localeCompare(b.aluno.nome));
}

export interface AulaFaturacaoExplicador {
  aula: Aula;
  alunosPresentes: boolean;
  duracao: number;
  valorHora: number;
  valorSessao: number;
  contabilizado: boolean;
}

export interface ResumoExplicador {
  explicador: Explicador;
  disciplinasLecionadas: string[];
  aulas: AulaFaturacaoExplicador[];
  aulasRealizadas: number;
  horasTotais: number;
  totalPagar: number;
}

export function calcularPagamentoExplicadores(
  aulas: Aula[],
  explicadores: Explicador[],
  dataInicio: string,
  dataFim: string,
  disciplinas: Disciplina[] = [],
  modoPagamento: ModoPagamentoProfessor = "base"
): ResumoExplicador[] {
  // Aulas canceladas não geram pagamento ao explicador.
  const aulasFiltradas = aulas.filter(a => a.estado !== "cancelada" && a.data >= dataInicio && a.data <= dataFim);
  const expMap = new Map(explicadores.map(e => [e.id, e]));
  // Mapa nome→Disciplina para resolver disciplinaValores (indexados por UUID)
  const discByNome = new Map(disciplinas.map(d => [d.nome, d]));
  const resultado = new Map<string, AulaFaturacaoExplicador[]>();

  for (const aula of aulasFiltradas) {
    const explicador = expMap.get(aula.explicadorId);
    if (!explicador) continue;
    const alunosPresentes = aula.alunoIds.some(id => aula.presencas[id] === "presente");
    const duracao = parseDurationHours(aula.horaInicio, aula.horaFim);
    // O professor é remunerado pela sessão se houver pelo menos um aluno
    // "cobrável": presente, OU com falta injustificada cuja decisão foi cobrar
    // (cobrar ao aluno e pagar ao professor estão interligados). Sem decisão
    // explícita (faltas antigas) assume-se cobrar. Falta justificada não conta.
    const algumCobravel = aula.alunoIds.some(id => {
      const p = aula.presencas[id];
      if (p === "presente") return true;
      if (p === "falta_injustificada") return aula.presencaInfo[id]?.cobrarFalta ?? true;
      return false;
    });
    const contabilizado = algumCobravel;

    let valorHora = explicador.valorHora;
    if (modoPagamento === "por_disciplina" && explicador.disciplinaValores) {
      const disc = discByNome.get(aula.disciplina);
      if (disc != null) {
        const vd = explicador.disciplinaValores[disc.id];
        if (vd != null) valorHora = vd;
      }
    }

    if (!resultado.has(aula.explicadorId)) resultado.set(aula.explicadorId, []);
    resultado.get(aula.explicadorId)!.push({
      aula, alunosPresentes, duracao,
      valorHora,
      valorSessao: duracao * valorHora,
      contabilizado,
    });
  }

  return Array.from(resultado.entries())
    .map(([expId, aulasExp]) => {
      const explicador = expMap.get(expId);
      if (!explicador) return null;
      const contabilizadas = aulasExp.filter(a => a.contabilizado);
      return {
        explicador,
        disciplinasLecionadas: [...new Set(aulasExp.map(a => a.aula.disciplina))],
        aulas: aulasExp,
        aulasRealizadas: contabilizadas.length,
        horasTotais: contabilizadas.reduce((s, a) => s + a.duracao, 0),
        totalPagar: contabilizadas.reduce((s, a) => s + a.valorSessao, 0),
      };
    })
    .filter((r): r is ResumoExplicador => r !== null && r.aulas.length > 0)
    .sort((a, b) => a.explicador.nome.localeCompare(b.explicador.nome));
}

// CSV export utilities
function csvLine(fields: string[]): string {
  return fields.map(f => `"${String(f).replace(/"/g, '""')}"`).join(";") + "\n";
}

function downloadCsv(filename: string, content: string) {
  const bom = "﻿";
  const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function exportCobrancaDetalhada(resumos: ResumoAluno[], explicadores: Explicador[], periodo: string) {
  const expMap = new Map(explicadores.map(e => [e.id, e]));
  let csv = csvLine(["Aluno", "Encarregado de Educação", "Email Encarregado", "Data", "Hora Início", "Hora Fim", "Disciplina", "Tipo", "Explicador", "Duração (min)", "Preço/Hora (€)", "Valor Sessão (€)", "Presença", "Cobrar"]);
  let totalGeral = 0;
  for (const r of resumos) {
    for (const a of r.aulas) {
      const exp = expMap.get(a.aula.explicadorId);
      const presLabel = a.presenca === "presente" ? "Presente" : a.presenca === "falta_justificada" ? "Falta Justificada" : a.presenca === "falta_injustificada" ? "Falta Injustificada" : "Não registada";
      csv += csvLine([
        r.aluno.nome, r.aluno.encarregado.nome, r.aluno.encarregado.email,
        a.aula.data.split("-").reverse().join("/"), a.aula.horaInicio, a.aula.horaFim,
        a.aula.disciplina, a.aula.tipo === "individual" ? "Individual" : "Grupo",
        exp?.nome ?? "", String(Math.round(a.duracao * 60)),
        a.precoPorHora.toFixed(2), a.valorSessao.toFixed(2), presLabel, a.cobrar ? "Sim" : "Não",
      ]);
    }
    csv += csvLine([`SUBTOTAL ${r.aluno.nome}`, "", "", "", "", "", "", "", "", "", "", r.valorTotal.toFixed(2), "", ""]);
    csv += "\n";
    totalGeral += r.valorTotal;
  }
  csv += csvLine(["TOTAL GERAL", "", "", "", "", "", "", "", "", "", "", totalGeral.toFixed(2), "", ""]);
  downloadCsv(`cobranca_alunos_${periodo}.csv`, csv);
}

export function exportCobrancaResumo(resumos: ResumoAluno[], periodo: string) {
  let csv = csvLine(["Aluno", "Encarregado de Educação", "Email Encarregado", "Telefone Encarregado", "Nº Aulas Realizadas", "Horas Totais", "Valor Total (€)"]);
  let total = 0;
  for (const r of resumos) {
    csv += csvLine([r.aluno.nome, r.aluno.encarregado.nome, r.aluno.encarregado.email, r.aluno.encarregado.telefone, String(r.aulasRealizadas), formatDuration(r.horasTotais), r.valorTotal.toFixed(2)]);
    total += r.valorTotal;
  }
  csv += csvLine(["TOTAL GERAL", "", "", "", "", "", total.toFixed(2)]);
  downloadCsv(`resumo_cobranca_${periodo}.csv`, csv);
}

export function exportPagamentoDetalhado(resumos: ResumoExplicador[], alunos: Aluno[], periodo: string) {
  const alunoMap = new Map(alunos.map(a => [a.id, a]));
  let csv = csvLine(["Explicador", "Email", "Data", "Hora Início", "Hora Fim", "Disciplina", "Aluno(s)", "Tipo", "Duração (min)", "Valor/Hora (€)", "Valor Sessão (€)", "Presença Aluno", "Contabilizado"]);
  let totalGeral = 0;
  for (const r of resumos) {
    for (const a of r.aulas) {
      const alunoNomes = a.aula.alunoIds.map(id => alunoMap.get(id)?.nome ?? id).join(", ");
      csv += csvLine([
        r.explicador.nome, r.explicador.email, a.aula.data.split("-").reverse().join("/"),
        a.aula.horaInicio, a.aula.horaFim, a.aula.disciplina, alunoNomes,
        a.aula.tipo === "individual" ? "Individual" : "Grupo",
        String(Math.round(a.duracao * 60)), a.valorHora.toFixed(2), a.valorSessao.toFixed(2),
        a.alunosPresentes ? "Presente" : "Falta", a.contabilizado ? "Sim" : "Não",
      ]);
    }
    const subtotal = r.aulas.filter(a => a.contabilizado).reduce((s, a) => s + a.valorSessao, 0);
    csv += csvLine([`SUBTOTAL ${r.explicador.nome}`, "", "", "", "", "", "", "", "", "", subtotal.toFixed(2), "", ""]);
    csv += "\n";
    totalGeral += subtotal;
  }
  csv += csvLine(["TOTAL GERAL", "", "", "", "", "", "", "", "", "", totalGeral.toFixed(2), "", ""]);
  downloadCsv(`pagamento_explicadores_${periodo}.csv`, csv);
}

export function exportPagamentoResumo(resumos: ResumoExplicador[], periodo: string, modoPagamento: ModoPagamentoProfessor = "base") {
  let csv = csvLine(["Explicador", "Email", "Telefone", "Nº Aulas", "Horas Totais", "Valor/Hora (€)", "Total a Pagar (€)"]);
  let total = 0;
  for (const r of resumos) {
    // Em por_disciplina, a taxa varia por aula: mostrar média efectiva para referência.
    const valorHoraLabel = modoPagamento === "por_disciplina"
      ? (r.horasTotais > 0 ? (r.totalPagar / r.horasTotais).toFixed(2) + " (méd.)" : "—")
      : r.explicador.valorHora.toFixed(2);
    csv += csvLine([r.explicador.nome, r.explicador.email, r.explicador.telefone, String(r.aulasRealizadas), formatDuration(r.horasTotais), valorHoraLabel, r.totalPagar.toFixed(2)]);
    total += r.totalPagar;
  }
  csv += csvLine(["TOTAL GERAL", "", "", "", "", "", total.toFixed(2)]);
  downloadCsv(`resumo_pagamentos_${periodo}.csv`, csv);
}
