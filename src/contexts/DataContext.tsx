import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

// ── Types ─────────────────────────────────────────────────────────────────────
export type Presenca = "presente" | "falta_justificada" | "falta_injustificada" | null;

export interface Disciplina {
  id: string;
  nome: string;
  corHsl: string | null;
  precoHoraIndividual: number;
  precoHoraGrupo: number;
}

export interface Aluno {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  escola: string;
  anoLetivo: number;
  disciplinas: string[];
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
  habilitacoes: string;
  estado: "ativo" | "inativo";
  iban?: string;
  nif?: string;
  conviteEnviadoEm?: string | null;
  acessoAtivadoEm?: string | null;
}

export interface Sala {
  id: string;
  nome: string;
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
  notas?: string;
  recorrencia: string;
}

// ── Input types ───────────────────────────────────────────────────────────────
export type DisciplinaInput = Omit<Disciplina, "id" | "precoHoraIndividual" | "precoHoraGrupo"> & {
  precoHoraIndividual?: number;
  precoHoraGrupo?: number;
};
export type AlunoInput = Omit<Aluno, "id" | "estado" | "dataInscricao"> & { estado?: Aluno["estado"]; dataInscricao?: string };
export type ExplicadorInput = Omit<Explicador, "id" | "estado"> & { estado?: Explicador["estado"]; password?: string };
export type SalaInput = Pick<Sala, "nome">;
export type AulaInput = Omit<Aula, "id" | "estado" | "presencas"> & { estado?: Aula["estado"] };

interface DataContextType {
  disciplinas: Disciplina[];
  alunos: Aluno[];
  explicadores: Explicador[];
  salas: Sala[];
  aulas: Aula[];
  loading: boolean;
  refresh: () => Promise<void>;

  createDisciplina: (data: DisciplinaInput) => Promise<Disciplina | null>;
  updateDisciplina: (id: string, patch: Partial<DisciplinaInput>) => Promise<void>;
  deleteDisciplina: (id: string) => Promise<void>;

  createAluno: (data: AlunoInput) => Promise<Aluno | null>;
  updateAluno: (id: string, patch: Partial<Aluno>) => Promise<void>;
  deleteAluno: (id: string) => Promise<void>;
  updateAlunoEstado: (id: string, novoEstado: Aluno["estado"]) => Promise<void>;

  createExplicador: (data: ExplicadorInput) => Promise<Explicador | null>;
  updateExplicador: (id: string, patch: Partial<Explicador>) => Promise<void>;
  deleteExplicador: (id: string) => Promise<void>;
  inviteExplicador: (explicadorId: string, redirectTo: string) => Promise<void>;

  createSala: (data: SalaInput) => Promise<Sala | null>;
  updateSala: (id: string, patch: Partial<Sala>) => Promise<void>;
  deleteSala: (id: string) => Promise<void>;

  createAulas: (entries: AulaInput[]) => Promise<void>;
  updateAula: (id: string, patch: Partial<Aula>) => Promise<void>;
  cancelAula: (id: string) => Promise<void>;
  setPresenca: (aulaId: string, alunoId: string, presenca: Presenca) => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

// ── Loaders ───────────────────────────────────────────────────────────────────
async function loadDisciplinas(centroId: string) {
  const { data, error } = await supabase
    .from("disciplinas")
    .select("id, nome, cor_hsl, preco_hora_individual, preco_hora_grupo")
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
    };
  });
  const idToName = new Map<string, string>();
  const nameToId = new Map<string, string>();
  discs.forEach(d => { idToName.set(d.id, d.nome); nameToId.set(d.nome, d.id); });
  return { discs, idToName, nameToId };
}

async function loadAlunos(centroId: string, discIdToName: Map<string, string>): Promise<Aluno[]> {
  const { data, error } = await supabase
    .from("alunos")
    .select("id, nome, email, telefone, escola, ano_letivo, estado, data_inscricao, valor_hora, explicador_user_id, encarregado_nome, encarregado_email, encarregado_telefone, encarregado_nif, desconto, alunos_disciplinas(disciplina_id)")
    .eq("centro_id", centroId)
    .order("nome");
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    nome: r.nome,
    email: r.email ?? "",
    telefone: r.telefone ?? "",
    escola: r.escola ?? "",
    anoLetivo: r.ano_letivo ?? 0,
    disciplinas: (r.alunos_disciplinas ?? []).map((ad: any) => discIdToName.get(ad.disciplina_id) ?? "").filter(Boolean),
    encarregado: { nome: r.encarregado_nome ?? "", email: r.encarregado_email ?? "", telefone: r.encarregado_telefone ?? "" },
    estado: r.estado,
    dataInscricao: r.data_inscricao,
    valorHora: r.valor_hora != null ? Number(r.valor_hora) : undefined,
    explicadorId: r.explicador_user_id ?? undefined,
    nifEncarregado: r.encarregado_nif ?? undefined,
    desconto: r.desconto ?? 0,
  }));
}

async function loadExplicadores(centroId: string, discIdToName: Map<string, string>): Promise<Explicador[]> {
  const { data, error } = await supabase
    .from("professor_perfis")
    .select("user_id, telefone, valor_hora, habilitacoes, iban, nif, estado, convite_enviado_em, acesso_ativado_em, users!inner(nome, email), professor_disciplinas(disciplina_id)")
    .eq("centro_id", centroId);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.user_id,
    nome: r.users?.nome ?? "",
    email: r.users?.email ?? "",
    telefone: r.telefone ?? "",
    disciplinas: (r.professor_disciplinas ?? []).map((pd: any) => discIdToName.get(pd.disciplina_id) ?? "").filter(Boolean),
    valorHora: Number(r.valor_hora ?? 0),
    habilitacoes: r.habilitacoes ?? "",
    estado: r.estado,
    iban: r.iban ?? undefined,
    nif: r.nif ?? undefined,
    conviteEnviadoEm: r.convite_enviado_em ?? null,
    acessoAtivadoEm: r.acesso_ativado_em ?? null,
  }));
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
    .select("id, sala_id, disciplina_id, data, hora_inicio, hora_fim, tipo, estado, recorrencia, notas, aula_alunos(aluno_id, presenca), aula_professores(professor_user_id)")
    .eq("centro_id", centroId)
    .order("data");
  if (error) throw error;
  return (data ?? []).map((r: any) => {
    const presencas: Record<string, Presenca> = {};
    const alunoIds: string[] = [];
    (r.aula_alunos ?? []).forEach((aa: any) => {
      alunoIds.push(aa.aluno_id);
      presencas[aa.aluno_id] = aa.presenca ?? null;
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
      notas: r.notas ?? undefined,
      recorrencia: r.recorrencia,
    };
  });
}

// Lança o erro do Supabase se a operação falhar. As mutações UPDATE/DELETE/INSERT
// que não usam .select() ignoravam o erro silenciosamente — daí este wrapper.
async function run(query: PromiseLike<{ error: unknown }>): Promise<void> {
  const { error } = await query;
  if (error) throw error;
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
  const [loading, setLoading] = useState(false);
  const [discMaps, setDiscMaps] = useState<{ idToName: Map<string, string>; nameToId: Map<string, string> }>({ idToName: new Map(), nameToId: new Map() });

  const refresh = useCallback(async () => {
    if (!centroId) {
      setDisciplinas([]); setAlunos([]); setExplicadores([]); setSalas([]); setAulas([]);
      return;
    }
    setLoading(true);
    try {
      const { discs, idToName, nameToId } = await loadDisciplinas(centroId);
      setDisciplinas(discs);
      setDiscMaps({ idToName, nameToId });
      const [al, ex, sa, au] = await Promise.all([
        loadAlunos(centroId, idToName),
        loadExplicadores(centroId, idToName),
        loadSalas(centroId),
        loadAulas(centroId, idToName),
      ]);
      setAlunos(al); setExplicadores(ex); setSalas(sa); setAulas(au);
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
    else { setDisciplinas([]); setAlunos([]); setExplicadores([]); setSalas([]); setAulas([]); }
  }, [isAuthenticated, centroId, refresh]);

  // ── Refreshes granulares ──────────────────────────────────────────────────────
  // Cada mutação recarrega apenas a(s) entidade(s) que mexeu, em vez de refazer
  // o download das 5 tabelas. refreshDisciplinas devolve o novo mapa id→nome,
  // porque os nomes de disciplina ficam embebidos em alunos/explicadores/aulas.
  const refreshDisciplinas = async (): Promise<Map<string, string>> => {
    if (!centroId) return new Map();
    const { discs, idToName, nameToId } = await loadDisciplinas(centroId);
    setDisciplinas(discs);
    setDiscMaps({ idToName, nameToId });
    return idToName;
  };
  const refreshAlunos = async (idToName: Map<string, string> = discMaps.idToName) => {
    if (!centroId) return;
    setAlunos(await loadAlunos(centroId, idToName));
  };
  const refreshExplicadores = async (idToName: Map<string, string> = discMaps.idToName) => {
    if (!centroId) return;
    setExplicadores(await loadExplicadores(centroId, idToName));
  };
  const refreshSalas = async () => {
    if (!centroId) return;
    setSalas(await loadSalas(centroId));
  };
  const refreshAulas = async (idToName: Map<string, string> = discMaps.idToName) => {
    if (!centroId) return;
    setAulas(await loadAulas(centroId, idToName));
  };

  const ensureCentro = () => {
    if (!centroId) throw new Error("Sem centro ativo");
    return centroId;
  };
  const discIdFor = (nome: string) => discMaps.nameToId.get(nome) ?? null;

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
    }).select().single();
    if (error) throw error;
    await refreshDisciplinas();
    const ind = Number(row.preco_hora_individual ?? 0);
    return {
      id: row.id, nome: row.nome, corHsl: row.cor_hsl ?? null,
      precoHoraIndividual: ind,
      precoHoraGrupo: Number(row.preco_hora_grupo ?? 0),
    };
  };

  const updateDisciplina = async (id: string, patch: Partial<DisciplinaInput>) => {
    const upd: Record<string, unknown> = {};
    if (patch.nome !== undefined) upd.nome = patch.nome;
    if (patch.corHsl !== undefined) upd.cor_hsl = patch.corHsl || null;
    if (patch.precoHoraIndividual !== undefined) upd.preco_hora_individual = patch.precoHoraIndividual;
    if (patch.precoHoraGrupo !== undefined) upd.preco_hora_grupo = patch.precoHoraGrupo;
    if (Object.keys(upd).length) await run(supabase.from("disciplinas").update(upd).eq("id", id));
    const idToName = await refreshDisciplinas();
    // Renomear afeta os nomes de disciplina embebidos noutras entidades.
    if (patch.nome !== undefined) {
      await Promise.all([refreshAlunos(idToName), refreshExplicadores(idToName), refreshAulas(idToName)]);
    }
  };

  const deleteDisciplina = async (id: string) => {
    await run(supabase.from("disciplinas").delete().eq("id", id));
    const idToName = await refreshDisciplinas();
    await Promise.all([refreshAlunos(idToName), refreshExplicadores(idToName), refreshAulas(idToName)]);
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
      ano_letivo: data.anoLetivo || null,
      estado: data.estado ?? "ativo",
      data_inscricao: data.dataInscricao ?? new Date().toISOString().slice(0, 10),
      valor_hora: data.valorHora ?? null,
      explicador_user_id: data.explicadorId || null,
      encarregado_nome: data.encarregado.nome,
      encarregado_email: data.encarregado.email || null,
      encarregado_telefone: data.encarregado.telefone || null,
      encarregado_nif: data.nifEncarregado || null,
      desconto: data.desconto ?? 0,
    }).select().single();
    if (error) throw error;
    const ids = (data.disciplinas ?? []).map(discIdFor).filter(Boolean) as string[];
    if (ids.length) await run(supabase.from("alunos_disciplinas").insert(ids.map(d => ({ aluno_id: row.id, disciplina_id: d }))));
    await refreshAlunos();
    return row as any;
  };

  const updateAluno = async (id: string, patch: Partial<Aluno>) => {
    const updates: Record<string, unknown> = {};
    if (patch.nome !== undefined) updates.nome = patch.nome;
    if (patch.email !== undefined) updates.email = patch.email || null;
    if (patch.telefone !== undefined) updates.telefone = patch.telefone || null;
    if (patch.escola !== undefined) updates.escola = patch.escola || null;
    if (patch.anoLetivo !== undefined) updates.ano_letivo = patch.anoLetivo || null;
    if (patch.estado !== undefined) updates.estado = patch.estado;
    if (patch.valorHora !== undefined) updates.valor_hora = patch.valorHora ?? null;
    if (patch.explicadorId !== undefined) updates.explicador_user_id = patch.explicadorId || null;
    if (patch.encarregado) {
      updates.encarregado_nome = patch.encarregado.nome;
      updates.encarregado_email = patch.encarregado.email || null;
      updates.encarregado_telefone = patch.encarregado.telefone || null;
    }
    if (patch.nifEncarregado !== undefined) updates.encarregado_nif = patch.nifEncarregado || null;
    if (patch.desconto !== undefined) updates.desconto = patch.desconto ?? 0;
    if (Object.keys(updates).length) await run(supabase.from("alunos").update(updates).eq("id", id));
    if (patch.disciplinas) {
      await run(supabase.from("alunos_disciplinas").delete().eq("aluno_id", id));
      const ids = patch.disciplinas.map(discIdFor).filter(Boolean) as string[];
      if (ids.length) await run(supabase.from("alunos_disciplinas").insert(ids.map(d => ({ aluno_id: id, disciplina_id: d }))));
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

  // ── Explicadores ─────────────────────────────────────────────────────────────
  const createExplicador = async (data: ExplicadorInput): Promise<Explicador | null> => {
    const cid = ensureCentro();
    const tempPassword = data.password ?? Math.random().toString(36).slice(2) + "Aa1!";
    const { data: fnData, error: fnErr } = await supabase.functions.invoke("create-explicador", {
      body: { email: data.email, password: tempPassword, nome: data.nome, centro_id: cid },
    });
    if (fnErr || !fnData?.user_id) throw fnErr ?? new Error("create-explicador: " + JSON.stringify(fnData));
    const newUserId = fnData.user_id as string;
    await run(supabase.from("professor_perfis").insert({
      user_id: newUserId, centro_id: cid,
      telefone: data.telefone || null,
      valor_hora: data.valorHora,
      habilitacoes: data.habilitacoes || null,
      iban: data.iban || null,
      nif: data.nif || null,
      estado: data.estado ?? "ativo",
    }));
    const ids = (data.disciplinas ?? []).map(discIdFor).filter(Boolean) as string[];
    if (ids.length) await run(supabase.from("professor_disciplinas").insert(ids.map(d => ({ professor_user_id: newUserId, disciplina_id: d }))));
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
    if (patch.habilitacoes !== undefined) perfUpd.habilitacoes = patch.habilitacoes || null;
    if (patch.iban !== undefined) perfUpd.iban = patch.iban || null;
    if (patch.nif !== undefined) perfUpd.nif = patch.nif || null;
    if (patch.estado !== undefined) perfUpd.estado = patch.estado;
    if (Object.keys(perfUpd).length) await run(supabase.from("professor_perfis").update(perfUpd).eq("user_id", id));
    if (patch.disciplinas) {
      await run(supabase.from("professor_disciplinas").delete().eq("professor_user_id", id));
      const ids = patch.disciplinas.map(discIdFor).filter(Boolean) as string[];
      if (ids.length) await run(supabase.from("professor_disciplinas").insert(ids.map(d => ({ professor_user_id: id, disciplina_id: d }))));
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
  const inviteExplicador = async (explicadorId: string, redirectTo: string): Promise<void> => {
    const { data, error } = await supabase.functions.invoke("invite-explicador", {
      body: { explicador_id: explicadorId, redirect_to: redirectTo },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    await refreshExplicadores();
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

  const setPresenca = async (aulaId: string, alunoId: string, presenca: Presenca) => {
    // Otimista: aplica já na UI; se o gravar falhar, reverte e propaga o erro.
    const prevPresenca: Presenca = aulas.find(a => a.id === aulaId)?.presencas[alunoId] ?? null;
    setAulas(prev => prev.map(a => a.id === aulaId
      ? { ...a, presencas: { ...a.presencas, [alunoId]: presenca } }
      : a));
    const { error } = await supabase.from("aula_alunos").update({ presenca }).eq("aula_id", aulaId).eq("aluno_id", alunoId);
    if (error) {
      setAulas(prev => prev.map(a => a.id === aulaId
        ? { ...a, presencas: { ...a.presencas, [alunoId]: prevPresenca } }
        : a));
      throw error;
    }
  };

  return (
    <DataContext.Provider value={{
      disciplinas, alunos, explicadores, salas, aulas, loading, refresh,
      createDisciplina, updateDisciplina, deleteDisciplina,
      createAluno, updateAluno, deleteAluno, updateAlunoEstado,
      createExplicador, updateExplicador, deleteExplicador, inviteExplicador,
      createSala, updateSala, deleteSala,
      createAulas, updateAula, cancelAula, setPresenca,
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
