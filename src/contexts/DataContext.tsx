import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { gerarAulasDoHorario } from "@/lib/horarios";

// ── Types ─────────────────────────────────────────────────────────────────────
export type Presenca = "presente" | "falta_justificada" | "falta_injustificada" | null;

// Estado de reposição de uma falta justificada (decidido no pop-up de presenças).
export type ReposicaoEstado = "pendente" | "agendada" | "nao" | null;

// Metadata por aluno×aula que acompanha a presença, decidida no momento do
// registo. Mapa paralelo a `presencas` para não tocar nos consumidores que só
// leem o estado de presença.
export interface PresencaInfo {
  reposicaoEstado: ReposicaoEstado;
  // Falta injustificada: cobrar ao aluno (e pagar ao professor) esta sessão.
  // null = sem decisão explícita (faltas antigas) → faturação assume cobrar+pagar.
  cobrarFalta: boolean | null;
}

// Escalão de preço por duração (descontos por volume) — só aulas individuais.
// A partir de `duracaoMin` horas, o preço/hora individual passa a `precoHora`.
export interface EscalaoPreco {
  duracaoMin: number;
  precoHora: number;
}

export interface Disciplina {
  id: string;
  nome: string;
  corHsl: string | null;
  precoHoraIndividual: number;
  precoHoraGrupo: number;
  // Escalões opcionais de preço/hora individual por duração (ordenados por
  // duracaoMin asc). Vazio = usa sempre o precoHoraIndividual base.
  escaloesPrecoIndividual: EscalaoPreco[];
  parentId: string | null;
}

export interface Aluno {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  escola: string;
  morada?: string;
  anoLetivo: number;
  disciplinas: string[];
  // Tutor atribuído por-disciplina. Chaveado por disciplinaId (estável), à parte
  // de `disciplinas` (nomes) para não quebrar consumidores existentes.
  disciplinaExplicadores?: Record<string, string | null>;
  encarregado: { nome: string; email: string; telefone: string };
  estado: "ativo" | "inativo" | "pre-inscrito";
  dataInscricao: string;
  valorHora?: number;
  explicadorId?: string;
  nifEncarregado?: string;
  desconto?: number;
}

export interface Explicador {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  disciplinas: string[];
  valorHora: number;
  // Valor/hora por-disciplina. Chaveado por disciplinaId, à parte de `disciplinas`
  // (nomes). Usado quando o centro está em modo "por_disciplina".
  disciplinaValores?: Record<string, number>;
  // Percentagem da receita do aluno atribuída ao professor (0-100). Usada quando
  // o centro está em modo "percentagem". null/undefined → 0 (não recebe).
  percentagemReceita?: number;
  habilitacoes: string;
  estado: "ativo" | "inativo";
  iban?: string;
  nif?: string;
  conviteEnviadoEm?: string | null;
  acessoAtivadoEm?: string | null;
}

export type ModoPagamentoProfessor = "base" | "por_disciplina" | "percentagem";

// Momento de pagamento do centro: 'fim' = à hora conforme presença (atual);
// 'inicio' = mensalidade antecipada (cobra agendadas/justificadas, reposição 0€).
export type MomentoPagamento = "inicio" | "fim";

export interface CentroConfig {
  modoPagamentoProfessor: ModoPagamentoProfessor;
  momentoPagamento: MomentoPagamento;
  anoLetivoInicio?: string; // yyyy-MM-dd; null/undefined → sem configuração
  anoLetivoFim?: string;    // yyyy-MM-dd; null/undefined → usa default (31 Jul)
}

export interface Sala {
  id: string;
  nome: string;
}

export interface Assistente {
  id: string;
  nome: string;
  email: string;
}

export interface Aula {
  id: string;
  alunoIds: string[];
  explicadorId: string;
  salaId: string;
  disciplina: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  tipo: "individual" | "grupo";
  estado: "agendada" | "realizada" | "cancelada";
  presencas: Record<string, Presenca>;
  // Metadata por aluno (reposição / decisão de cobrança), a par de `presencas`.
  presencaInfo: Record<string, PresencaInfo>;
  // Aula criada para repor uma falta justificada anterior.
  isReposicao: boolean;
  notas?: string;
  recorrencia: string;
  // Horário base que gerou esta aula (One-Way Sync). null/undefined = aula avulsa
  // criada à mão no calendário, imune a recálculos de horário.
  horarioId?: string | null;
}

// ── Horários Base (Gerador de Horários Recorrentes) ───────────────────────────
// Slot do construtor semanal: dia ISO (1=seg..7=dom) + hora de início.
export interface AlunoHorarioSlot {
  diaSemana: number;
  horaInicio: string; // "HH:mm"
}

export interface AlunoHorario {
  id: string;
  alunoId: string;
  disciplina: string;       // nome (consistente com Aula.disciplina)
  disciplinaId: string;
  explicadorId: string | null;
  salaId: string | null;
  tipo: "individual" | "grupo";
  duracaoMin: number;
  anoLetivoInteiro: boolean;
  dataInicio: string;       // yyyy-MM-dd
  dataFim: string;          // yyyy-MM-dd
  slots: AlunoHorarioSlot[];
}

export type AlunoHorarioInput = {
  alunoId: string;
  disciplina: string;
  explicadorId: string | null;
  salaId: string | null;
  tipo: "individual" | "grupo";
  duracaoMin: number;
  anoLetivoInteiro: boolean;
  dataInicio: string;
  dataFim: string;
  slots: AlunoHorarioSlot[];
};

// ── Input types ───────────────────────────────────────────────────────────────
export type DisciplinaInput = Omit<Disciplina, "id" | "precoHoraIndividual" | "precoHoraGrupo" | "escaloesPrecoIndividual" | "parentId"> & {
  precoHoraIndividual?: number;
  precoHoraGrupo?: number;
  escaloesPrecoIndividual?: EscalaoPreco[];
  parentId?: string | null;
};
export type AlunoInput = Omit<Aluno, "id" | "estado" | "dataInscricao"> & { estado?: Aluno["estado"]; dataInscricao?: string };

// Linha vinda da importação Excel/CSV de alunos. `disciplinas` são nomes crus
// tal como escritos no ficheiro — a resolução (folha/categoria/criação) é
// feita no importAlunos.
export type ImportAlunoRow = {
  nome: string;
  anoLetivo: number | null;
  email?: string;
  telefone?: string;
  escola?: string;
  disciplinas: string[];
  encarregadoNome?: string;
  encarregadoTelefone?: string;
  encarregadoEmail?: string;
};
export type ExplicadorInput = Omit<Explicador, "id" | "estado"> & { estado?: Explicador["estado"]; password?: string };
export type SalaInput = Pick<Sala, "nome">;
export type AulaInput = Omit<Aula, "id" | "estado" | "presencas"> & { estado?: Aula["estado"] };

interface DataContextType {
  disciplinas: Disciplina[];
  alunos: Aluno[];
  explicadores: Explicador[];
  salas: Sala[];
  aulas: Aula[];
  assistentes: Assistente[];
  centroConfig: CentroConfig;
  loading: boolean;
  refresh: () => Promise<void>;

  updateCentroConfig: (patch: Partial<CentroConfig>) => Promise<void>;

  createDisciplina: (data: DisciplinaInput) => Promise<Disciplina | null>;
  updateDisciplina: (id: string, patch: Partial<DisciplinaInput>) => Promise<void>;
  deleteDisciplina: (id: string) => Promise<void>;

  createAluno: (data: AlunoInput) => Promise<Aluno | null>;
  updateAluno: (id: string, patch: Partial<Aluno>) => Promise<void>;
  deleteAluno: (id: string) => Promise<void>;
  updateAlunoEstado: (id: string, novoEstado: Aluno["estado"]) => Promise<void>;
  importAlunos: (rows: ImportAlunoRow[]) => Promise<{ alunosCriados: number; disciplinasCriadas: number }>;

  createExplicador: (data: ExplicadorInput) => Promise<Explicador | null>;
  updateExplicador: (id: string, patch: Partial<Explicador>) => Promise<void>;
  deleteExplicador: (id: string) => Promise<void>;
  inviteExplicador: (explicadorId: string, redirectTo: string) => Promise<string>;

  inviteAssistente: (nome: string, email: string) => Promise<string>;
  removeAssistente: (id: string) => Promise<void>;

  createSala: (data: SalaInput) => Promise<Sala | null>;
  updateSala: (id: string, patch: Partial<Sala>) => Promise<void>;
  deleteSala: (id: string) => Promise<void>;

  alunoHorarios: AlunoHorario[];
  saveAlunoHorario: (input: AlunoHorarioInput, existingId?: string) => Promise<void>;
  deleteAlunoHorario: (id: string) => Promise<void>;

  createAulas: (entries: AulaInput[]) => Promise<void>;
  updateAula: (id: string, patch: Partial<Aula>) => Promise<void>;
  cancelAula: (id: string) => Promise<void>;
  setPresenca: (aulaId: string, alunoId: string, presenca: Presenca, extra?: { reposicaoEstado?: ReposicaoEstado; cobrarFalta?: boolean | null }) => Promise<void>;
  marcarReposicaoAgendada: (aulaId: string, alunoId: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

// Sanitiza escalões vindos da BD ou da UI: descarta entradas inválidas e
// ordena por duracaoMin asc (a lógica/UI não dependem da ordem guardada).
function normalizeEscaloes(raw: unknown): EscalaoPreco[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((e: any) => ({ duracaoMin: Number(e?.duracaoMin), precoHora: Number(e?.precoHora) }))
    .filter(e => Number.isFinite(e.duracaoMin) && e.duracaoMin > 0 && Number.isFinite(e.precoHora) && e.precoHora >= 0)
    .sort((a, b) => a.duracaoMin - b.duracaoMin);
}

// ── Loaders ───────────────────────────────────────────────────────────────────
async function loadDisciplinas(centroId: string) {
  const { data, error } = await supabase
    .from("disciplinas")
    .select("id, nome, cor_hsl, preco_hora_individual, preco_hora_grupo, escaloes_preco_individual, parent_id")
    .eq("centro_id", centroId)
    .order("nome");
  if (error) throw error;
  const discs: Disciplina[] = (data ?? []).map((d: any) => {
    const individual = Number(d.preco_hora_individual ?? 0);
    return {
      id: d.id,
      nome: d.nome,
      corHsl: d.cor_hsl ?? null,
      precoHoraIndividual: individual,
      precoHoraGrupo: Number(d.preco_hora_grupo ?? 0),
      escaloesPrecoIndividual: normalizeEscaloes(d.escaloes_preco_individual),
      parentId: d.parent_id ?? null,
    };
  });
  const idToName = new Map<string, string>();
  const nameToId = new Map<string, string>();
  discs.forEach(d => { idToName.set(d.id, d.nome); nameToId.set(d.nome, d.id); });
  // Folhas (sub-disciplinas): têm pai e não têm filhos. São as únicas a que
  // alunos/professores se podem associar. Categorias (topo) são organizativas.
  const parentIds = new Set(discs.map(d => d.parentId).filter(Boolean) as string[]);
  const leafIds = new Set(discs.filter(d => d.parentId != null && !parentIds.has(d.id)).map(d => d.id));
  return { discs, idToName, nameToId, leafIds };
}

async function loadAlunos(centroId: string, discIdToName: Map<string, string>, leafIds: Set<string>): Promise<Aluno[]> {
  const { data, error } = await supabase
    .from("alunos")
    .select("id, nome, email, telefone, escola, morada, ano_letivo, estado, data_inscricao, valor_hora, explicador_user_id, encarregado_nome, encarregado_email, encarregado_telefone, encarregado_nif, desconto, alunos_disciplinas(disciplina_id, explicador_id)")
    .eq("centro_id", centroId)
    .order("nome");
  if (error) throw error;
  return (data ?? []).map((r: any) => {
    // Só associações a folhas (sub-disciplinas) são válidas; ignora ligações a categorias.
    const adRows = (r.alunos_disciplinas ?? []).filter((ad: any) => leafIds.has(ad.disciplina_id));
    const disciplinaExplicadores: Record<string, string | null> = {};
    adRows.forEach((ad: any) => { disciplinaExplicadores[ad.disciplina_id] = ad.explicador_id ?? null; });
    return {
      id: r.id,
      nome: r.nome,
      email: r.email ?? "",
      telefone: r.telefone ?? "",
      escola: r.escola ?? "",
      morada: r.morada ?? undefined,
      anoLetivo: r.ano_letivo ?? 0,
      disciplinas: adRows.map((ad: any) => discIdToName.get(ad.disciplina_id) ?? "").filter(Boolean),
      disciplinaExplicadores,
      encarregado: { nome: r.encarregado_nome ?? "", email: r.encarregado_email ?? "", telefone: r.encarregado_telefone ?? "" },
      estado: r.estado,
      dataInscricao: r.data_inscricao,
      valorHora: r.valor_hora != null ? Number(r.valor_hora) : undefined,
      explicadorId: r.explicador_user_id ?? undefined,
      nifEncarregado: r.encarregado_nif ?? undefined,
      desconto: r.desconto ?? 0,
    };
  });
}

async function loadExplicadores(centroId: string, discIdToName: Map<string, string>, leafIds: Set<string>): Promise<Explicador[]> {
  const { data, error } = await supabase
    .from("professor_perfis")
    .select("user_id, telefone, valor_hora, percentagem_receita, habilitacoes, iban, nif, estado, convite_enviado_em, acesso_ativado_em, users!inner(nome, email), professor_disciplinas(disciplina_id, valor_hora)")
    .eq("centro_id", centroId);
  if (error) throw error;
  return (data ?? []).map((r: any) => {
    // Só associações a folhas (sub-disciplinas) são válidas; ignora ligações a categorias.
    const pdRows = (r.professor_disciplinas ?? []).filter((pd: any) => leafIds.has(pd.disciplina_id));
    const disciplinaValores: Record<string, number> = {};
    pdRows.forEach((pd: any) => { if (pd.valor_hora != null) disciplinaValores[pd.disciplina_id] = Number(pd.valor_hora); });
    return {
      id: r.user_id,
      nome: r.users?.nome ?? "",
      email: r.users?.email ?? "",
      telefone: r.telefone ?? "",
      disciplinas: pdRows.map((pd: any) => discIdToName.get(pd.disciplina_id) ?? "").filter(Boolean),
      valorHora: Number(r.valor_hora ?? 0),
      disciplinaValores,
      percentagemReceita: r.percentagem_receita != null ? Number(r.percentagem_receita) : undefined,
      habilitacoes: r.habilitacoes ?? "",
      estado: r.estado,
      iban: r.iban ?? undefined,
      nif: r.nif ?? undefined,
      conviteEnviadoEm: r.convite_enviado_em ?? null,
      acessoAtivadoEm: r.acesso_ativado_em ?? null,
    };
  });
}

// Default de arranque (antes de carregar o centro). 'fim' mantém o
// comportamento histórico de faturação.
const DEFAULT_CENTRO_CONFIG: CentroConfig = { modoPagamentoProfessor: "base", momentoPagamento: "fim", anoLetivoInicio: undefined, anoLetivoFim: undefined };

async function loadCentroConfig(centroId: string): Promise<CentroConfig> {
  const { data, error } = await supabase
    .from("centros")
    .select("modo_pagamento_professor, momento_pagamento, ano_letivo_inicio, ano_letivo_fim")
    .eq("id", centroId)
    .single();
  if (error) throw error;
  const row = data as any;
  return {
    modoPagamentoProfessor: (["por_disciplina", "percentagem"].includes(row?.modo_pagamento_professor)
      ? row.modo_pagamento_professor
      : "base") as ModoPagamentoProfessor,
    momentoPagamento: row?.momento_pagamento === "inicio" ? "inicio" : "fim",
    anoLetivoInicio: row?.ano_letivo_inicio ?? undefined,
    anoLetivoFim: row?.ano_letivo_fim ?? undefined,
  };
}

async function loadSalas(centroId: string): Promise<Sala[]> {
  const { data, error } = await supabase
    .from("salas")
    .select("id, nome")
    .eq("centro_id", centroId)
    .order("nome");
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ id: r.id, nome: r.nome }));
}

async function loadAulas(centroId: string, discIdToName: Map<string, string>): Promise<Aula[]> {
  const { data, error } = await supabase
    .from("aulas")
    .select("id, sala_id, disciplina_id, data, hora_inicio, hora_fim, tipo, estado, recorrencia, notas, is_reposicao, horario_id, aula_alunos(aluno_id, presenca, reposicao_estado, cobrar_falta), aula_professores(professor_user_id)")
    .eq("centro_id", centroId)
    .order("data");
  if (error) throw error;
  return (data ?? []).map((r: any) => {
    const presencas: Record<string, Presenca> = {};
    const presencaInfo: Record<string, PresencaInfo> = {};
    const alunoIds: string[] = [];
    (r.aula_alunos ?? []).forEach((aa: any) => {
      alunoIds.push(aa.aluno_id);
      presencas[aa.aluno_id] = aa.presenca ?? null;
      presencaInfo[aa.aluno_id] = {
        reposicaoEstado: aa.reposicao_estado ?? null,
        cobrarFalta: aa.cobrar_falta ?? null,
      };
    });
    return {
      id: r.id,
      alunoIds,
      explicadorId: (r.aula_professores ?? [])[0]?.professor_user_id ?? "",
      salaId: r.sala_id ?? "",
      disciplina: discIdToName.get(r.disciplina_id) ?? "",
      data: r.data,
      horaInicio: r.hora_inicio?.slice(0, 5) ?? "",
      horaFim: r.hora_fim?.slice(0, 5) ?? "",
      tipo: r.tipo,
      estado: r.estado,
      presencas,
      presencaInfo,
      isReposicao: r.is_reposicao ?? false,
      notas: r.notas ?? undefined,
      recorrencia: r.recorrencia,
      horarioId: r.horario_id ?? null,
    };
  });
}

// Horários base do centro, com os respetivos slots semanais.
async function loadAlunoHorarios(centroId: string, discIdToName: Map<string, string>): Promise<AlunoHorario[]> {
  const { data, error } = await supabase
    .from("aluno_horarios")
    .select("id, aluno_id, disciplina_id, professor_user_id, sala_id, tipo, duracao_min, ano_letivo_inteiro, data_inicio, data_fim, aluno_horario_slots(dia_semana, hora_inicio)")
    .eq("centro_id", centroId);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    alunoId: r.aluno_id,
    disciplina: discIdToName.get(r.disciplina_id) ?? "",
    disciplinaId: r.disciplina_id,
    explicadorId: r.professor_user_id ?? null,
    salaId: r.sala_id ?? null,
    tipo: r.tipo,
    duracaoMin: Number(r.duracao_min ?? 60),
    anoLetivoInteiro: r.ano_letivo_inteiro ?? true,
    dataInicio: r.data_inicio,
    dataFim: r.data_fim,
    slots: (r.aluno_horario_slots ?? [])
      .map((s: any) => ({ diaSemana: s.dia_semana, horaInicio: String(s.hora_inicio).slice(0, 5) }))
      .sort((a: AlunoHorarioSlot, b: AlunoHorarioSlot) => a.diaSemana - b.diaSemana || a.horaInicio.localeCompare(b.horaInicio)),
  }));
}

async function loadAssistentes(centroId: string): Promise<Assistente[]> {
  const { data, error } = await supabase
    .from("users")
    .select("id, nome, email")
    .eq("centro_id", centroId)
    .eq("role", "rececionista")
    .order("nome");
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ id: r.id, nome: r.nome ?? "", email: r.email ?? "" }));
}

// Lança o erro do Supabase se a operação falhar. As mutações UPDATE/DELETE/INSERT
// que não usam .select() ignoravam o erro silenciosamente — daí este wrapper.
async function run(query: PromiseLike<{ error: unknown }>): Promise<void> {
  const { error } = await query;
  if (error) throw error;
}

// Extrai a mensagem de erro real de uma Edge Function. Em respostas non-2xx, o
// supabase-js devolve um FunctionsHttpError cuja .message é genérica; o corpo
// JSON ({ error: "..." }) está no Response em err.context. Faz fallback para o
// data (em caso de 2xx sem user_id) e por fim para a .message genérica.
async function extractFnError(err: unknown, data: unknown): Promise<string> {
  const ctx = (err as { context?: Response })?.context;
  if (ctx && typeof ctx.json === "function") {
    try {
      const body = await ctx.clone().json();
      if (body?.error) return String(body.error);
    } catch {
      // corpo não-JSON; ignora e cai para os fallbacks abaixo
    }
  }
  if ((data as { error?: unknown })?.error) return String((data as { error: unknown }).error);
  if (err instanceof Error && err.message) return err.message;
  return "Falha ao criar explicador.";
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function DataProvider({ children }: { children: React.ReactNode }) {
  const { profile, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const centroId = profile?.centro_id ?? null;

  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [explicadores, setExplicadores] = useState<Explicador[]>([]);
  const [salas, setSalas] = useState<Sala[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [alunoHorarios, setAlunoHorarios] = useState<AlunoHorario[]>([]);
  const [assistentes, setAssistentes] = useState<Assistente[]>([]);
  const [centroConfig, setCentroConfig] = useState<CentroConfig>(DEFAULT_CENTRO_CONFIG);
  const [loading, setLoading] = useState(false);
  const [discMaps, setDiscMaps] = useState<{ idToName: Map<string, string>; nameToId: Map<string, string>; leafIds: Set<string> }>({ idToName: new Map(), nameToId: new Map(), leafIds: new Set() });

  const refresh = useCallback(async () => {
    if (!centroId) {
      setDisciplinas([]); setAlunos([]); setExplicadores([]); setSalas([]); setAulas([]); setAlunoHorarios([]); setAssistentes([]);
      setCentroConfig(DEFAULT_CENTRO_CONFIG);
      return;
    }
    setLoading(true);
    try {
      const { discs, idToName, nameToId, leafIds } = await loadDisciplinas(centroId);
      setDisciplinas(discs);
      setDiscMaps({ idToName, nameToId, leafIds });
      const [al, ex, sa, au, cfg, ast, hor] = await Promise.all([
        loadAlunos(centroId, idToName, leafIds),
        loadExplicadores(centroId, idToName, leafIds),
        loadSalas(centroId),
        loadAulas(centroId, idToName),
        loadCentroConfig(centroId),
        loadAssistentes(centroId),
        loadAlunoHorarios(centroId, idToName),
      ]);
      setAlunos(al); setExplicadores(ex); setSalas(sa); setAulas(au); setCentroConfig(cfg); setAssistentes(ast); setAlunoHorarios(hor);
    } catch (e) {
      console.error("Data refresh failed", e);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível obter os dados do centro. Verifica a ligação e tenta atualizar a página.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [centroId, toast]);

  useEffect(() => {
    if (isAuthenticated && centroId) refresh();
    else { setDisciplinas([]); setAlunos([]); setExplicadores([]); setSalas([]); setAulas([]); setAlunoHorarios([]); setAssistentes([]); setCentroConfig(DEFAULT_CENTRO_CONFIG); }
  }, [isAuthenticated, centroId, refresh]);

  // ── Refreshes granulares ──────────────────────────────────────────────────────
  // Cada mutação recarrega apenas a(s) entidade(s) que mexeu, em vez de refazer
  // o download das 5 tabelas. refreshDisciplinas devolve o novo mapa id→nome,
  // porque os nomes de disciplina ficam embebidos em alunos/explicadores/aulas.
  const refreshDisciplinas = async (): Promise<{ idToName: Map<string, string>; leafIds: Set<string> }> => {
    if (!centroId) return { idToName: new Map(), leafIds: new Set() };
    const { discs, idToName, nameToId, leafIds } = await loadDisciplinas(centroId);
    setDisciplinas(discs);
    setDiscMaps({ idToName, nameToId, leafIds });
    return { idToName, leafIds };
  };
  const refreshAlunos = async (idToName: Map<string, string> = discMaps.idToName, leafIds: Set<string> = discMaps.leafIds) => {
    if (!centroId) return;
    setAlunos(await loadAlunos(centroId, idToName, leafIds));
  };
  const refreshExplicadores = async (idToName: Map<string, string> = discMaps.idToName, leafIds: Set<string> = discMaps.leafIds) => {
    if (!centroId) return;
    setExplicadores(await loadExplicadores(centroId, idToName, leafIds));
  };
  const refreshSalas = async () => {
    if (!centroId) return;
    setSalas(await loadSalas(centroId));
  };
  const refreshAulas = async (idToName: Map<string, string> = discMaps.idToName) => {
    if (!centroId) return;
    setAulas(await loadAulas(centroId, idToName));
  };
  const refreshCentroConfig = async () => {
    if (!centroId) return;
    setCentroConfig(await loadCentroConfig(centroId));
  };
  const refreshAssistentes = async () => {
    if (!centroId) return;
    setAssistentes(await loadAssistentes(centroId));
  };
  const refreshAlunoHorarios = async (idToName: Map<string, string> = discMaps.idToName) => {
    if (!centroId) return;
    setAlunoHorarios(await loadAlunoHorarios(centroId, idToName));
  };

  const ensureCentro = () => {
    if (!centroId) throw new Error("Sem centro ativo");
    return centroId;
  };
  const discIdFor = (nome: string) => discMaps.nameToId.get(nome) ?? null;

  // ── Centro (config) ───────────────────────────────────────────────────────────
  const updateCentroConfig = async (patch: Partial<CentroConfig>) => {
    const cid = ensureCentro();
    const upd: Record<string, unknown> = {};
    if (patch.modoPagamentoProfessor !== undefined) upd.modo_pagamento_professor = patch.modoPagamentoProfessor;
    if (patch.momentoPagamento !== undefined) upd.momento_pagamento = patch.momentoPagamento;
    if (patch.anoLetivoInicio !== undefined) upd.ano_letivo_inicio = patch.anoLetivoInicio || null;
    if (patch.anoLetivoFim !== undefined) upd.ano_letivo_fim = patch.anoLetivoFim || null;
    if (Object.keys(upd).length) await run(supabase.from("centros").update(upd).eq("id", cid));
    await refreshCentroConfig();
  };

  // ── Disciplinas ─────────────────────────────────────────────────────────────
  const createDisciplina = async (data: DisciplinaInput): Promise<Disciplina | null> => {
    const cid = ensureCentro();
    const individual = data.precoHoraIndividual ?? 0;
    const grupo = data.precoHoraGrupo ?? individual;
    const { data: row, error } = await supabase.from("disciplinas").insert({
      centro_id: cid,
      nome: data.nome,
      cor_hsl: data.corHsl || null,
      preco_hora_individual: individual,
      preco_hora_grupo: grupo,
      escaloes_preco_individual: normalizeEscaloes(data.escaloesPrecoIndividual),
      parent_id: data.parentId ?? null,
    }).select().single();
    if (error) throw error;
    await refreshDisciplinas();
    const ind = Number(row.preco_hora_individual ?? 0);
    return {
      id: row.id, nome: row.nome, corHsl: row.cor_hsl ?? null,
      precoHoraIndividual: ind,
      precoHoraGrupo: Number(row.preco_hora_grupo ?? 0),
      escaloesPrecoIndividual: normalizeEscaloes(row.escaloes_preco_individual),
      parentId: row.parent_id ?? null,
    };
  };

  const updateDisciplina = async (id: string, patch: Partial<DisciplinaInput>) => {
    const upd: Record<string, unknown> = {};
    if (patch.nome !== undefined) upd.nome = patch.nome;
    if (patch.corHsl !== undefined) upd.cor_hsl = patch.corHsl || null;
    if (patch.precoHoraIndividual !== undefined) upd.preco_hora_individual = patch.precoHoraIndividual;
    if (patch.precoHoraGrupo !== undefined) upd.preco_hora_grupo = patch.precoHoraGrupo;
    if (patch.escaloesPrecoIndividual !== undefined) upd.escaloes_preco_individual = normalizeEscaloes(patch.escaloesPrecoIndividual);
    if (patch.parentId !== undefined) upd.parent_id = patch.parentId ?? null;
    if (Object.keys(upd).length) await run(supabase.from("disciplinas").update(upd).eq("id", id));
    const { idToName, leafIds } = await refreshDisciplinas();
    // Renomear afeta os nomes de disciplina embebidos noutras entidades.
    if (patch.nome !== undefined) {
      await Promise.all([refreshAlunos(idToName, leafIds), refreshExplicadores(idToName, leafIds), refreshAulas(idToName)]);
    }
  };

  const deleteDisciplina = async (id: string) => {
    await run(supabase.from("disciplinas").delete().eq("id", id));
    const { idToName, leafIds } = await refreshDisciplinas();
    await Promise.all([refreshAlunos(idToName, leafIds), refreshExplicadores(idToName, leafIds), refreshAulas(idToName)]);
  };

  // ── Alunos ──────────────────────────────────────────────────────────────────
  const createAluno = async (data: AlunoInput): Promise<Aluno | null> => {
    const cid = ensureCentro();
    const { data: row, error } = await supabase.from("alunos").insert({
      centro_id: cid,
      nome: data.nome,
      email: data.email || null,
      telefone: data.telefone || null,
      escola: data.escola || null,
      morada: data.morada || null,
      ano_letivo: data.anoLetivo || null,
      estado: data.estado ?? "ativo",
      data_inscricao: data.dataInscricao ?? new Date().toISOString().slice(0, 10),
      valor_hora: data.valorHora ?? null,
      explicador_user_id: data.explicadorId || null,
      encarregado_nome: data.encarregado.nome || null,
      encarregado_email: data.encarregado.email || null,
      encarregado_telefone: data.encarregado.telefone || null,
      encarregado_nif: data.nifEncarregado || null,
      desconto: data.desconto ?? 0,
    }).select().single();
    if (error) throw error;
    const ids = (data.disciplinas ?? []).map(discIdFor).filter(Boolean) as string[];
    if (ids.length) {
      await run(supabase.from("alunos_disciplinas").insert(
        ids.map(d => ({ aluno_id: row.id, disciplina_id: d, explicador_id: data.disciplinaExplicadores?.[d] ?? null }))
      ));
    }
    await refreshAlunos();
    return row as any;
  };

  const updateAluno = async (id: string, patch: Partial<Aluno>) => {
    const updates: Record<string, unknown> = {};
    if (patch.nome !== undefined) updates.nome = patch.nome;
    if (patch.email !== undefined) updates.email = patch.email || null;
    if (patch.telefone !== undefined) updates.telefone = patch.telefone || null;
    if (patch.escola !== undefined) updates.escola = patch.escola || null;
    if (patch.morada !== undefined) updates.morada = patch.morada || null;
    if (patch.anoLetivo !== undefined) updates.ano_letivo = patch.anoLetivo || null;
    if (patch.estado !== undefined) updates.estado = patch.estado;
    if (patch.valorHora !== undefined) updates.valor_hora = patch.valorHora ?? null;
    if (patch.explicadorId !== undefined) updates.explicador_user_id = patch.explicadorId || null;
    if (patch.encarregado) {
      updates.encarregado_nome = patch.encarregado.nome || null;
      updates.encarregado_email = patch.encarregado.email || null;
      updates.encarregado_telefone = patch.encarregado.telefone || null;
    }
    if (patch.nifEncarregado !== undefined) updates.encarregado_nif = patch.nifEncarregado || null;
    if (patch.desconto !== undefined) updates.desconto = patch.desconto ?? 0;
    if (Object.keys(updates).length) await run(supabase.from("alunos").update(updates).eq("id", id));
    if (patch.disciplinas) {
      // Reescreve a junção; aplica o tutor por-disciplina se fornecido.
      await run(supabase.from("alunos_disciplinas").delete().eq("aluno_id", id));
      const ids = patch.disciplinas.map(discIdFor).filter(Boolean) as string[];
      if (ids.length) await run(supabase.from("alunos_disciplinas").insert(
        ids.map(d => ({ aluno_id: id, disciplina_id: d, explicador_id: patch.disciplinaExplicadores?.[d] ?? null }))
      ));
    } else if (patch.disciplinaExplicadores) {
      // Só mudou o tutor por-disciplina, sem mexer no conjunto de disciplinas.
      for (const [discId, expId] of Object.entries(patch.disciplinaExplicadores)) {
        await run(supabase.from("alunos_disciplinas").update({ explicador_id: expId ?? null }).eq("aluno_id", id).eq("disciplina_id", discId));
      }
    }
    await refreshAlunos();
  };

  const deleteAluno = async (id: string) => {
    await run(supabase.from("alunos").delete().eq("id", id));
    // Aulas referenciam o aluno (aula_alunos) — recarregar ambos.
    await Promise.all([refreshAlunos(), refreshAulas()]);
  };

  const updateAlunoEstado = async (id: string, novoEstado: Aluno["estado"]) => {
    await run(supabase.from("alunos").update({ estado: novoEstado }).eq("id", id));
    await refreshAlunos();
  };

  // Importação em lote (Excel/CSV). Resolve cada nome de disciplina do ficheiro:
  // 1) folha existente com esse nome; 2) categoria existente → folha
  // "Categoria – Xº Ano" (criada se faltar, herdando preços de um irmão);
  // 3) nada → cria categoria + folha. Alunos e associações inserem-se em lote
  // (2 round-trips) em vez de um createAluno por linha.
  const importAlunos = async (rows: ImportAlunoRow[]): Promise<{ alunosCriados: number; disciplinasCriadas: number }> => {
    const cid = ensureCentro();
    // Snapshot local que vai crescendo com as disciplinas criadas na importação,
    // para linhas seguintes reutilizarem em vez de duplicar.
    const discs = [...disciplinas];
    let disciplinasCriadas = 0;

    // Normaliza para comparação: espaços colapsados, travessões unificados,
    // minúsculas ("Matemática - 9º ano" ≡ "Matemática – 9º Ano").
    const norm = (s: string) => s.trim().replace(/\s+/g, " ").replace(/[-–—]/g, "-").toLowerCase();

    const insertDisciplina = async (row: { nome: string; parent_id: string | null; preco_hora_individual: number; preco_hora_grupo: number }) => {
      const { data, error } = await supabase.from("disciplinas")
        .insert({ centro_id: cid, ...row })
        .select("id, nome, parent_id, preco_hora_individual, preco_hora_grupo")
        .single();
      if (error) throw error;
      discs.push({
        id: data.id, nome: data.nome, corHsl: null,
        precoHoraIndividual: Number(data.preco_hora_individual ?? 0),
        precoHoraGrupo: Number(data.preco_hora_grupo ?? 0),
        escaloesPrecoIndividual: [], parentId: data.parent_id ?? null,
      });
      disciplinasCriadas++;
      return data.id as string;
    };

    const resolveDisciplina = async (raw: string, ano: number | null): Promise<string> => {
      const key = norm(raw);
      // Folha existente (tem pai) com o mesmo nome.
      const folha = discs.find(d => d.parentId != null && norm(d.nome) === key);
      if (folha) return folha.id;
      // Categoria existente → folha por ano (ou Geral).
      const cat = discs.find(d => d.parentId == null && norm(d.nome) === key);
      if (cat) {
        const nomeFolha = ano ? `${cat.nome} – ${ano}º Ano` : `${cat.nome} – Geral`;
        const existente = discs.find(d => d.parentId === cat.id && norm(d.nome) === norm(nomeFolha));
        if (existente) return existente.id;
        const irmao = discs.find(d => d.parentId === cat.id);
        return insertDisciplina({
          nome: nomeFolha, parent_id: cat.id,
          preco_hora_individual: irmao?.precoHoraIndividual ?? 15,
          preco_hora_grupo: irmao?.precoHoraGrupo ?? 10,
        });
      }
      // Nome desconhecido → categoria nova + folha.
      const catId = await insertDisciplina({ nome: raw.trim(), parent_id: null, preco_hora_individual: 0, preco_hora_grupo: 0 });
      const nomeFolha = ano ? `${raw.trim()} – ${ano}º Ano` : `${raw.trim()} – Geral`;
      return insertDisciplina({ nome: nomeFolha, parent_id: catId, preco_hora_individual: 15, preco_hora_grupo: 10 });
    };

    // Resolve disciplinas sequencialmente (a cache local depende da ordem).
    const discIdsPorLinha: string[][] = [];
    for (const r of rows) {
      const ids: string[] = [];
      for (const nomeCru of r.disciplinas) {
        if (!nomeCru.trim()) continue;
        const id = await resolveDisciplina(nomeCru, r.anoLetivo);
        if (!ids.includes(id)) ids.push(id);
      }
      discIdsPorLinha.push(ids);
    }

    const hoje = new Date().toISOString().slice(0, 10);
    const { data: created, error } = await supabase.from("alunos").insert(rows.map(r => ({
      centro_id: cid,
      nome: r.nome.trim(),
      email: r.email?.trim() || null,
      telefone: r.telefone?.trim() || null,
      escola: r.escola?.trim() || null,
      ano_letivo: r.anoLetivo,
      estado: "ativo",
      data_inscricao: hoje,
      encarregado_nome: r.encarregadoNome?.trim() || null,
      encarregado_email: r.encarregadoEmail?.trim() || null,
      encarregado_telefone: r.encarregadoTelefone?.trim() || null,
    }))).select("id");
    if (error) throw error;

    // PostgREST devolve as linhas pela ordem de inserção → mapeamento por índice.
    const adRows: { aluno_id: string; disciplina_id: string; explicador_id: null }[] = [];
    (created ?? []).forEach((c, i) => {
      (discIdsPorLinha[i] ?? []).forEach(d => adRows.push({ aluno_id: c.id, disciplina_id: d, explicador_id: null }));
    });
    if (adRows.length) await run(supabase.from("alunos_disciplinas").insert(adRows));

    const { idToName, leafIds } = await refreshDisciplinas();
    await refreshAlunos(idToName, leafIds);
    return { alunosCriados: (created ?? []).length, disciplinasCriadas };
  };

  // ── Explicadores ─────────────────────────────────────────────────────────────
  const createExplicador = async (data: ExplicadorInput): Promise<Explicador | null> => {
    const cid = ensureCentro();
    const tempPassword = data.password ?? Math.random().toString(36).slice(2) + "Aa1!";
    const { data: fnData, error: fnErr } = await supabase.functions.invoke("create-explicador", {
      body: { email: data.email, password: tempPassword, nome: data.nome, centro_id: cid },
    });
    if (fnErr || !fnData?.user_id) {
      // O supabase-js não expõe o corpo da resposta em fnErr.message (fica só
      // "Edge Function returned a non-2xx status code"). A mensagem real do
      // backend ({ error: "..." }) vem no Response em fnErr.context — extrai-a
      // para que o toast mostre o motivo concreto (ex: email já existente).
      const msg = await extractFnError(fnErr, fnData);
      throw new Error(msg);
    }
    const newUserId = fnData.user_id as string;
    await run(supabase.from("professor_perfis").upsert({
      user_id: newUserId, centro_id: cid,
      telefone: data.telefone || null,
      valor_hora: data.valorHora,
      percentagem_receita: data.percentagemReceita ?? null,
      habilitacoes: data.habilitacoes || null,
      iban: data.iban || null,
      nif: data.nif || null,
      estado: data.estado ?? "ativo",
    }, { onConflict: "user_id" }));
    const ids = (data.disciplinas ?? []).map(discIdFor).filter(Boolean) as string[];
    if (ids.length) await run(supabase.from("professor_disciplinas").insert(
      ids.map(d => ({ professor_user_id: newUserId, disciplina_id: d, valor_hora: data.disciplinaValores?.[d] ?? null }))
    ));
    await refreshExplicadores();
    return null;
  };

  const updateExplicador = async (id: string, patch: Partial<Explicador>) => {
    const usersUpd: Record<string, unknown> = {};
    if (patch.nome !== undefined) usersUpd.nome = patch.nome;
    if (patch.email !== undefined) usersUpd.email = patch.email;
    if (Object.keys(usersUpd).length) await run(supabase.from("users").update(usersUpd).eq("id", id));
    const perfUpd: Record<string, unknown> = {};
    if (patch.telefone !== undefined) perfUpd.telefone = patch.telefone || null;
    if (patch.valorHora !== undefined) perfUpd.valor_hora = patch.valorHora;
    if (patch.percentagemReceita !== undefined) perfUpd.percentagem_receita = patch.percentagemReceita ?? null;
    if (patch.habilitacoes !== undefined) perfUpd.habilitacoes = patch.habilitacoes || null;
    if (patch.iban !== undefined) perfUpd.iban = patch.iban || null;
    if (patch.nif !== undefined) perfUpd.nif = patch.nif || null;
    if (patch.estado !== undefined) perfUpd.estado = patch.estado;
    if (Object.keys(perfUpd).length) await run(supabase.from("professor_perfis").update(perfUpd).eq("user_id", id));
    if (patch.disciplinas) {
      // Reescreve a junção; aplica o valor/hora por-disciplina se fornecido.
      await run(supabase.from("professor_disciplinas").delete().eq("professor_user_id", id));
      const ids = patch.disciplinas.map(discIdFor).filter(Boolean) as string[];
      if (ids.length) await run(supabase.from("professor_disciplinas").insert(
        ids.map(d => ({ professor_user_id: id, disciplina_id: d, valor_hora: patch.disciplinaValores?.[d] ?? null }))
      ));
    } else if (patch.disciplinaValores) {
      // Só mudaram os valores por-disciplina, sem mexer no conjunto de disciplinas.
      for (const [discId, valor] of Object.entries(patch.disciplinaValores)) {
        await run(supabase.from("professor_disciplinas").update({ valor_hora: valor ?? null }).eq("professor_user_id", id).eq("disciplina_id", discId));
      }
    }
    await refreshExplicadores();
  };

  const deleteExplicador = async (id: string) => {
    await run(supabase.from("users").delete().eq("id", id));
    // Aulas referenciam o explicador (aula_professores) — recarregar ambos.
    await Promise.all([refreshExplicadores(), refreshAulas()]);
  };

  // A conta auth do explicador já existe (criada no createExplicador). "Convidar"
  // gera um link de recovery para ele definir a própria password — não cria conta.
  // Devolve o link para o admin copiar (o SMTP de produção não está garantido).
  const inviteExplicador = async (explicadorId: string, redirectTo: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("invite-explicador", {
      body: { explicador_id: explicadorId, redirect_to: redirectTo },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    await refreshExplicadores();
    return data.link as string;
  };

  const inviteAssistente = async (nome: string, email: string): Promise<string> => {
    const redirectTo = `${window.location.origin}/set-password`;
    const { data, error } = await supabase.functions.invoke("create-assistente", {
      body: { nome, email, redirect_to: redirectTo },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    await refreshAssistentes();
    return data.link as string;
  };

  const removeAssistente = async (id: string): Promise<void> => {
    const { data, error } = await supabase.functions.invoke("remove-assistente", {
      body: { user_id: id },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    await refreshAssistentes();
  };

  // ── Salas ────────────────────────────────────────────────────────────────────
  const createSala = async (data: SalaInput): Promise<Sala | null> => {
    const cid = ensureCentro();
    const { data: row, error } = await supabase.from("salas").insert({ centro_id: cid, nome: data.nome }).select().single();
    if (error) throw error;
    await refreshSalas();
    return { id: row.id, nome: row.nome };
  };

  const updateSala = async (id: string, patch: Partial<Sala>) => {
    if (patch.nome !== undefined) await run(supabase.from("salas").update({ nome: patch.nome }).eq("id", id));
    await refreshSalas();
  };

  const deleteSala = async (id: string) => {
    await run(supabase.from("salas").delete().eq("id", id));
    // Aulas referenciam a sala — recarregar ambos.
    await Promise.all([refreshSalas(), refreshAulas()]);
  };

  // ── Aulas ────────────────────────────────────────────────────────────────────
  const createAulas = async (entries: AulaInput[]) => {
    const cid = ensureCentro();
    if (!entries.length) return;
    const rows = entries.map(e => ({
      centro_id: cid,
      sala_id: e.salaId || null,
      disciplina_id: discIdFor(e.disciplina),
      data: e.data,
      hora_inicio: e.horaInicio,
      hora_fim: e.horaFim,
      tipo: e.tipo,
      estado: e.estado ?? "agendada",
      recorrencia: e.recorrencia ?? "unica",
      notas: e.notas ?? null,
      is_reposicao: e.isReposicao ?? false,
      horario_id: e.horarioId ?? null,
    }));
    const { data: created, error } = await supabase.from("aulas").insert(rows).select("id");
    if (error || !created) throw error ?? new Error("aulas: insert retornou sem dados");
    const apRows: Record<string, unknown>[] = [];
    const aaRows: Record<string, unknown>[] = [];
    created.forEach((c, i) => {
      const e = entries[i];
      if (e.explicadorId) apRows.push({ aula_id: c.id, professor_user_id: e.explicadorId });
      e.alunoIds.forEach(aid => aaRows.push({ aula_id: c.id, aluno_id: aid, presenca: null }));
    });
    if (apRows.length) await run(supabase.from("aula_professores").insert(apRows));
    if (aaRows.length) await run(supabase.from("aula_alunos").insert(aaRows));
    await refreshAulas();
  };

  const updateAula = async (id: string, patch: Partial<Aula>) => {
    const upd: Record<string, unknown> = {};
    if (patch.salaId !== undefined) upd.sala_id = patch.salaId || null;
    if (patch.disciplina !== undefined) upd.disciplina_id = discIdFor(patch.disciplina);
    if (patch.data !== undefined) upd.data = patch.data;
    if (patch.horaInicio !== undefined) upd.hora_inicio = patch.horaInicio;
    if (patch.horaFim !== undefined) upd.hora_fim = patch.horaFim;
    if (patch.tipo !== undefined) upd.tipo = patch.tipo;
    if (patch.estado !== undefined) upd.estado = patch.estado;
    if (patch.recorrencia !== undefined) upd.recorrencia = patch.recorrencia;
    if (patch.notas !== undefined) upd.notas = patch.notas || null;
    if (Object.keys(upd).length) await run(supabase.from("aulas").update(upd).eq("id", id));
    if (patch.explicadorId !== undefined) {
      await run(supabase.from("aula_professores").delete().eq("aula_id", id));
      if (patch.explicadorId) await run(supabase.from("aula_professores").insert({ aula_id: id, professor_user_id: patch.explicadorId }));
    }
    if (patch.alunoIds !== undefined) {
      await run(supabase.from("aula_alunos").delete().eq("aula_id", id));
      if (patch.alunoIds.length) await run(supabase.from("aula_alunos").insert(patch.alunoIds.map(aid => ({ aula_id: id, aluno_id: aid, presenca: null }))));
    }
    await refreshAulas();
  };

  const cancelAula = async (id: string) => {
    await run(supabase.from("aulas").update({ estado: "cancelada" }).eq("id", id));
    await refreshAulas();
  };

  const setPresenca = async (
    aulaId: string,
    alunoId: string,
    presenca: Presenca,
    extra?: { reposicaoEstado?: ReposicaoEstado; cobrarFalta?: boolean | null }
  ) => {
    // A metadata (reposição / decisão de cobrança) só faz sentido com uma falta.
    // Ao limpar a presença (null) ou marcar presente, repõe ambos a null para
    // não deixar decisões órfãs de uma falta anterior.
    const aula = aulas.find(a => a.id === aulaId);
    const prevPresenca: Presenca = aula?.presencas[alunoId] ?? null;
    const prevInfo: PresencaInfo = aula?.presencaInfo[alunoId] ?? { reposicaoEstado: null, cobrarFalta: null };

    const nextInfo: PresencaInfo = presenca == null || presenca === "presente"
      ? { reposicaoEstado: null, cobrarFalta: null }
      : {
          reposicaoEstado: extra?.reposicaoEstado ?? null,
          cobrarFalta: extra?.cobrarFalta ?? null,
        };

    // Otimista: aplica já na UI; se o gravar falhar, reverte e propaga o erro.
    setAulas(prev => prev.map(a => a.id === aulaId
      ? { ...a, presencas: { ...a.presencas, [alunoId]: presenca }, presencaInfo: { ...a.presencaInfo, [alunoId]: nextInfo } }
      : a));
    const { error } = await supabase
      .from("aula_alunos")
      .update({ presenca, reposicao_estado: nextInfo.reposicaoEstado, cobrar_falta: nextInfo.cobrarFalta })
      .eq("aula_id", aulaId)
      .eq("aluno_id", alunoId);
    if (error) {
      setAulas(prev => prev.map(a => a.id === aulaId
        ? { ...a, presencas: { ...a.presencas, [alunoId]: prevPresenca }, presencaInfo: { ...a.presencaInfo, [alunoId]: prevInfo } }
        : a));
      throw error;
    }
  };

  // Marca a falta justificada original como reposição agendada (sai das pendências
  // do Dashboard). Chamado ao criar com sucesso a aula de reposição.
  const marcarReposicaoAgendada = async (aulaId: string, alunoId: string) => {
    const prevInfo: PresencaInfo = aulas.find(a => a.id === aulaId)?.presencaInfo[alunoId]
      ?? { reposicaoEstado: null, cobrarFalta: null };
    setAulas(prev => prev.map(a => a.id === aulaId
      ? { ...a, presencaInfo: { ...a.presencaInfo, [alunoId]: { ...prevInfo, reposicaoEstado: "agendada" } } }
      : a));
    const { error } = await supabase
      .from("aula_alunos")
      .update({ reposicao_estado: "agendada" })
      .eq("aula_id", aulaId)
      .eq("aluno_id", alunoId);
    if (error) {
      setAulas(prev => prev.map(a => a.id === aulaId
        ? { ...a, presencaInfo: { ...a.presencaInfo, [alunoId]: prevInfo } }
        : a));
      throw error;
    }
  };

  // ── Horários Base (Gerador de Horários Recorrentes) ──────────────────────────
  // One-Way Sync: o calendário é submisso ao perfil. Gravar/alterar um horário
  // base recalcula as aulas FUTURAS (apaga as agendadas geradas por este horário
  // a partir de hoje e cria as novas). As aulas passadas/realizadas e as aulas
  // avulsas (horario_id null) ficam intactas. Apagar uma aula isolada no
  // calendário não afeta o horário base (não há sync inverso).
  const localTodayStr = () => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  };

  // Apaga as aulas futuras (>= hoje) ainda agendadas geradas por este horário.
  // estado='agendada' protege presenças já registadas (realizadas) e não
  // ressuscita canceladas.
  const apagarAulasFuturasDoHorario = async (horarioId: string) => {
    await run(supabase.from("aulas").delete()
      .eq("horario_id", horarioId)
      .eq("estado", "agendada")
      .gte("data", localTodayStr()));
  };

  // Cria as aulas futuras a partir dos slots do horário, ligadas via horario_id.
  const materializarAulasDoHorario = async (horario: { id: string; input: AlunoHorarioInput }) => {
    const { id, input } = horario;
    const genStart = input.dataInicio;
    const geradas = gerarAulasDoHorario(input.slots, genStart, input.dataFim, input.duracaoMin);
    if (!geradas.length) return;
    // Aulas cuja data já passou nascem "realizada"; as de hoje/futuro mantêm o
    // default ("agendada" via createAulas).
    const hoje = localTodayStr();
    await createAulas(geradas.map(g => ({
      tipo: input.tipo,
      disciplina: input.disciplina,
      alunoIds: [input.alunoId],
      explicadorId: input.explicadorId ?? "",
      salaId: input.salaId ?? "",
      data: g.data,
      horaInicio: g.horaInicio,
      horaFim: g.horaFim,
      recorrencia: "semanal",
      isReposicao: false,
      presencaInfo: {},
      horarioId: id,
      estado: g.data < hoje ? "realizada" : undefined,
    })));
  };

  const saveAlunoHorario = async (input: AlunoHorarioInput, existingId?: string) => {
    const cid = ensureCentro();
    const disciplinaId = discIdFor(input.disciplina);
    if (!disciplinaId) throw new Error("Disciplina inválida");
    const header = {
      centro_id: cid,
      aluno_id: input.alunoId,
      disciplina_id: disciplinaId,
      professor_user_id: input.explicadorId || null,
      sala_id: input.salaId || null,
      tipo: input.tipo,
      duracao_min: input.duracaoMin,
      ano_letivo_inteiro: input.anoLetivoInteiro,
      data_inicio: input.dataInicio,
      data_fim: input.dataFim,
    };

    let horarioId = existingId ?? "";
    if (existingId) {
      await run(supabase.from("aluno_horarios").update(header).eq("id", existingId));
      await run(supabase.from("aluno_horario_slots").delete().eq("horario_id", existingId));
      // Recalcular: remove as aulas futuras antigas antes de regenerar.
      await apagarAulasFuturasDoHorario(existingId);
    } else {
      const { data: row, error } = await supabase.from("aluno_horarios").insert(header).select("id").single();
      if (error || !row) throw error ?? new Error("Falha ao criar horário base");
      horarioId = row.id;
    }

    if (input.slots.length) {
      await run(supabase.from("aluno_horario_slots").insert(
        input.slots.map(s => ({ horario_id: horarioId, dia_semana: s.diaSemana, hora_inicio: s.horaInicio }))
      ));
    }

    await materializarAulasDoHorario({ id: horarioId, input });
    // materializar pode não correr refreshAulas (geração vazia) → garantir aqui.
    await Promise.all([refreshAlunoHorarios(), refreshAulas()]);
  };

  const deleteAlunoHorario = async (id: string) => {
    await apagarAulasFuturasDoHorario(id);
    await run(supabase.from("aluno_horarios").delete().eq("id", id));
    await Promise.all([refreshAlunoHorarios(), refreshAulas()]);
  };

  return (
    <DataContext.Provider value={{
      disciplinas, alunos, explicadores, salas, aulas, assistentes, centroConfig, loading, refresh,
      alunoHorarios, saveAlunoHorario, deleteAlunoHorario,
      updateCentroConfig,
      createDisciplina, updateDisciplina, deleteDisciplina,
      createAluno, updateAluno, deleteAluno, updateAlunoEstado, importAlunos,
      createExplicador, updateExplicador, deleteExplicador, inviteExplicador,
      inviteAssistente, removeAssistente,
      createSala, updateSala, deleteSala,
      createAulas, updateAula, cancelAula, setPresenca, marcarReposicaoAgendada,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
