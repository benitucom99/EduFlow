import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  Aluno, Explicador, Sala, Aula, Presenca,
} from "@/data/mockData";

// ── Tipos auxiliares (input das mutações) ──────────────────────────────────
export type AlunoInput = Omit<Aluno, "id" | "estado" | "dataInscricao"> & { estado?: Aluno["estado"]; dataInscricao?: string };
export type ExplicadorInput = Omit<Explicador, "id" | "estado"> & { estado?: Explicador["estado"]; password?: string };
export type SalaInput = Omit<Sala, "id">;
export type AulaInput = Omit<Aula, "id" | "estado" | "presencas"> & { estado?: Aula["estado"] };

interface DataContextType {
  alunos: Aluno[];
  explicadores: Explicador[];
  salas: Sala[];
  aulas: Aula[];
  loading: boolean;
  refresh: () => Promise<void>;

  // Mutators
  createAluno: (data: AlunoInput) => Promise<Aluno | null>;
  updateAluno: (id: string, patch: Partial<Aluno>) => Promise<void>;
  deleteAluno: (id: string) => Promise<void>;
  toggleAlunoEstado: (id: string) => Promise<void>;

  createExplicador: (data: ExplicadorInput) => Promise<Explicador | null>;
  updateExplicador: (id: string, patch: Partial<Explicador>) => Promise<void>;
  deleteExplicador: (id: string) => Promise<void>;

  createSala: (data: SalaInput) => Promise<Sala | null>;
  updateSala: (id: string, patch: Partial<Sala>) => Promise<void>;

  createAulas: (entries: AulaInput[]) => Promise<void>;
  updateAula: (id: string, patch: Partial<Aula>) => Promise<void>;
  cancelAula: (id: string) => Promise<void>;
  setPresenca: (aulaId: string, alunoId: string, presenca: Presenca) => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

// ── Helpers de mapeamento DB → tipos da app ────────────────────────────────
type DiscIdNameMap = Map<string, string>; // id → nome

async function loadDisciplinas(centroId: string) {
  const { data, error } = await supabase
    .from("disciplinas")
    .select("id, nome")
    .eq("centro_id", centroId);
  if (error) throw error;
  const map: DiscIdNameMap = new Map();
  const nameToId = new Map<string, string>();
  (data ?? []).forEach((d) => {
    map.set(d.id, d.nome);
    nameToId.set(d.nome, d.id);
  });
  return { idToName: map, nameToId };
}

async function loadAlunos(centroId: string, discIdToName: DiscIdNameMap): Promise<Aluno[]> {
  const { data, error } = await supabase
    .from("alunos")
    .select("id, nome, email, telefone, escola, ano_letivo, estado, data_inscricao, valor_hora, explicador_user_id, encarregado_nome, encarregado_email, encarregado_telefone, encarregado_nif, alunos_disciplinas(disciplina_id)")
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
    encarregado: {
      nome: r.encarregado_nome ?? "",
      email: r.encarregado_email ?? "",
      telefone: r.encarregado_telefone ?? "",
    },
    estado: r.estado,
    dataInscricao: r.data_inscricao,
    valorHora: r.valor_hora != null ? Number(r.valor_hora) : undefined,
    explicadorId: r.explicador_user_id ?? undefined,
    nifEncarregado: r.encarregado_nif ?? undefined,
  }));
}

async function loadExplicadores(centroId: string, discIdToName: DiscIdNameMap): Promise<Explicador[]> {
  const { data, error } = await supabase
    .from("professor_perfis")
    .select("user_id, telefone, valor_hora, habilitacoes, iban, nif, estado, users!inner(nome, email), professor_disciplinas(disciplina_id), disponibilidades(dia_semana, hora_inicio, hora_fim)")
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
    disponibilidade: (r.disponibilidades ?? []).map((d: any) => ({
      diaSemana: d.dia_semana,
      horaInicio: d.hora_inicio?.slice(0, 5) ?? "",
      horaFim: d.hora_fim?.slice(0, 5) ?? "",
    })),
  }));
}

async function loadSalas(centroId: string): Promise<Sala[]> {
  const { data, error } = await supabase
    .from("salas")
    .select("id, nome, capacidade, equipamentos, estado")
    .eq("centro_id", centroId)
    .order("nome");
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    nome: r.nome,
    capacidade: r.capacidade,
    equipamentos: r.equipamentos ?? [],
    estado: r.estado,
  }));
}

async function loadAulas(centroId: string, discIdToName: DiscIdNameMap): Promise<Aula[]> {
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
    const explicadorId = (r.aula_professores ?? [])[0]?.professor_user_id ?? "";
    return {
      id: r.id,
      alunoIds,
      explicadorId,
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

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { profile, isAuthenticated } = useAuth();
  const centroId = profile?.centro_id ?? null;

  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [explicadores, setExplicadores] = useState<Explicador[]>([]);
  const [salas, setSalas] = useState<Sala[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [loading, setLoading] = useState(false);
  const [discMaps, setDiscMaps] = useState<{ idToName: DiscIdNameMap; nameToId: Map<string, string> }>({ idToName: new Map(), nameToId: new Map() });

  const refresh = useCallback(async () => {
    if (!centroId) {
      setAlunos([]); setExplicadores([]); setSalas([]); setAulas([]);
      return;
    }
    setLoading(true);
    try {
      const maps = await loadDisciplinas(centroId);
      setDiscMaps(maps);
      const [al, ex, sa, au] = await Promise.all([
        loadAlunos(centroId, maps.idToName),
        loadExplicadores(centroId, maps.idToName),
        loadSalas(centroId),
        loadAulas(centroId, maps.idToName),
      ]);
      setAlunos(al);
      setExplicadores(ex);
      setSalas(sa);
      setAulas(au);
    } catch (e) {
      console.error("Data refresh failed", e);
    } finally {
      setLoading(false);
    }
  }, [centroId]);

  useEffect(() => {
    if (isAuthenticated && centroId) {
      refresh();
    } else {
      setAlunos([]); setExplicadores([]); setSalas([]); setAulas([]);
    }
  }, [isAuthenticated, centroId, refresh]);

  // ── Mutações ────────────────────────────────────────────────────────────
  const ensureCentro = () => {
    if (!centroId) throw new Error("Sem centro ativo");
    return centroId;
  };

  const discIdFor = (nome: string): string | null => discMaps.nameToId.get(nome) ?? null;

  // Aluno
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
    }).select().single();
    if (error) { console.error(error); return null; }
    // disciplinas N:M
    const ids = (data.disciplinas ?? []).map(discIdFor).filter(Boolean) as string[];
    if (ids.length) {
      await supabase.from("alunos_disciplinas").insert(ids.map(d => ({ aluno_id: row.id, disciplina_id: d })));
    }
    await refresh();
    return row as any;
  };

  const updateAluno = async (id: string, patch: Partial<Aluno>) => {
    const updates: any = {};
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

    if (Object.keys(updates).length) {
      const { error } = await supabase.from("alunos").update(updates).eq("id", id);
      if (error) console.error(error);
    }
    if (patch.disciplinas) {
      await supabase.from("alunos_disciplinas").delete().eq("aluno_id", id);
      const ids = patch.disciplinas.map(discIdFor).filter(Boolean) as string[];
      if (ids.length) {
        await supabase.from("alunos_disciplinas").insert(ids.map(d => ({ aluno_id: id, disciplina_id: d })));
      }
    }
    await refresh();
  };

  const deleteAluno = async (id: string) => {
    const { error } = await supabase.from("alunos").delete().eq("id", id);
    if (error) console.error(error);
    await refresh();
  };

  const toggleAlunoEstado = async (id: string) => {
    const a = alunos.find(x => x.id === id);
    if (!a) return;
    const novo = a.estado === "ativo" ? "inativo" : "ativo";
    const { error } = await supabase.from("alunos").update({ estado: novo }).eq("id", id);
    if (error) console.error(error);
    await refresh();
  };

  // Explicador — cria user via Auth admin? Não: signUp normal requer email/password.
  // No MVP, novos centros só têm o admin; explicadores criados ficam apenas como
  // professor_perfis ligados a um user existente. Para simplificar agora, criamos
  // um user via signUp com password gerada (não usada para login até flow de invite).
  const createExplicador = async (data: ExplicadorInput): Promise<Explicador | null> => {
    const cid = ensureCentro();
    // Tentativa de criar via signUp para obter um auth.users id. Como o cliente
    // anon não pode criar utilizadores sem confirmar email/sair da sessão, usamos
    // uma estratégia pragmática: criar a linha em users sem ligar auth (TEMP).
    // Esta linha cria public.users diretamente — o FK para auth.users vai falhar.
    // Por isso, ao adicionar explicador requeremos password para signUp.
    const tempPassword = data.password ?? Math.random().toString(36).slice(2) + "Aa1!";
    // Guardar sessão atual antes de signUp (signUp logaria o novo user)
    const { data: sess } = await supabase.auth.getSession();
    const { data: signed, error: suErr } = await supabase.auth.signUp({
      email: data.email,
      password: tempPassword,
      options: { data: { nome: data.nome } },
    });
    if (suErr || !signed.user) {
      console.error("signUp explicador failed", suErr);
      return null;
    }
    const newUserId = signed.user.id;
    // restaurar sessão do admin
    if (sess.session) {
      await supabase.auth.setSession({ access_token: sess.session.access_token, refresh_token: sess.session.refresh_token });
    }
    // setar centro + role (RPC só permite se ainda for null)
    await supabase.from("users").update({ centro_id: cid, role: "explicador" }).eq("id", newUserId);

    // criar perfil
    const { error: perfErr } = await supabase.from("professor_perfis").insert({
      user_id: newUserId,
      centro_id: cid,
      telefone: data.telefone || null,
      valor_hora: data.valorHora,
      habilitacoes: data.habilitacoes || null,
      iban: data.iban || null,
      nif: data.nif || null,
      estado: data.estado ?? "ativo",
    });
    if (perfErr) console.error(perfErr);

    // disciplinas
    const ids = (data.disciplinas ?? []).map(discIdFor).filter(Boolean) as string[];
    if (ids.length) {
      await supabase.from("professor_disciplinas").insert(ids.map(d => ({ professor_user_id: newUserId, disciplina_id: d })));
    }
    // disponibilidades
    if (data.disponibilidade?.length) {
      await supabase.from("disponibilidades").insert(data.disponibilidade.map(d => ({
        professor_user_id: newUserId,
        dia_semana: d.diaSemana,
        hora_inicio: d.horaInicio,
        hora_fim: d.horaFim,
      })));
    }
    await refresh();
    return null;
  };

  const updateExplicador = async (id: string, patch: Partial<Explicador>) => {
    const usersUpd: any = {};
    if (patch.nome !== undefined) usersUpd.nome = patch.nome;
    if (patch.email !== undefined) usersUpd.email = patch.email;
    if (Object.keys(usersUpd).length) {
      await supabase.from("users").update(usersUpd).eq("id", id);
    }
    const perfUpd: any = {};
    if (patch.telefone !== undefined) perfUpd.telefone = patch.telefone || null;
    if (patch.valorHora !== undefined) perfUpd.valor_hora = patch.valorHora;
    if (patch.habilitacoes !== undefined) perfUpd.habilitacoes = patch.habilitacoes || null;
    if (patch.iban !== undefined) perfUpd.iban = patch.iban || null;
    if (patch.nif !== undefined) perfUpd.nif = patch.nif || null;
    if (patch.estado !== undefined) perfUpd.estado = patch.estado;
    if (Object.keys(perfUpd).length) {
      await supabase.from("professor_perfis").update(perfUpd).eq("user_id", id);
    }
    if (patch.disciplinas) {
      await supabase.from("professor_disciplinas").delete().eq("professor_user_id", id);
      const ids = patch.disciplinas.map(discIdFor).filter(Boolean) as string[];
      if (ids.length) {
        await supabase.from("professor_disciplinas").insert(ids.map(d => ({ professor_user_id: id, disciplina_id: d })));
      }
    }
    if (patch.disponibilidade) {
      await supabase.from("disponibilidades").delete().eq("professor_user_id", id);
      if (patch.disponibilidade.length) {
        await supabase.from("disponibilidades").insert(patch.disponibilidade.map(d => ({
          professor_user_id: id,
          dia_semana: d.diaSemana,
          hora_inicio: d.horaInicio,
          hora_fim: d.horaFim,
        })));
      }
    }
    await refresh();
  };

  const deleteExplicador = async (id: string) => {
    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) console.error(error);
    await refresh();
  };

  // Sala
  const createSala = async (data: SalaInput): Promise<Sala | null> => {
    const cid = ensureCentro();
    const { data: row, error } = await supabase.from("salas").insert({
      centro_id: cid,
      nome: data.nome,
      capacidade: data.capacidade,
      equipamentos: data.equipamentos ?? [],
      estado: data.estado ?? "disponível",
    }).select().single();
    if (error) { console.error(error); return null; }
    await refresh();
    return row as any;
  };

  const updateSala = async (id: string, patch: Partial<Sala>) => {
    const upd: any = {};
    if (patch.nome !== undefined) upd.nome = patch.nome;
    if (patch.capacidade !== undefined) upd.capacidade = patch.capacidade;
    if (patch.equipamentos !== undefined) upd.equipamentos = patch.equipamentos;
    if (patch.estado !== undefined) upd.estado = patch.estado;
    if (Object.keys(upd).length) {
      await supabase.from("salas").update(upd).eq("id", id);
    }
    await refresh();
  };

  // Aulas
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
    if (error || !created) { console.error(error); return; }
    // aula_professores + aula_alunos
    const apRows: any[] = [];
    const aaRows: any[] = [];
    created.forEach((c, i) => {
      const e = entries[i];
      if (e.explicadorId) apRows.push({ aula_id: c.id, professor_user_id: e.explicadorId });
      e.alunoIds.forEach(aid => aaRows.push({ aula_id: c.id, aluno_id: aid, presenca: null }));
    });
    if (apRows.length) await supabase.from("aula_professores").insert(apRows);
    if (aaRows.length) await supabase.from("aula_alunos").insert(aaRows);
    await refresh();
  };

  const updateAula = async (id: string, patch: Partial<Aula>) => {
    const upd: any = {};
    if (patch.salaId !== undefined) upd.sala_id = patch.salaId || null;
    if (patch.disciplina !== undefined) upd.disciplina_id = discIdFor(patch.disciplina);
    if (patch.data !== undefined) upd.data = patch.data;
    if (patch.horaInicio !== undefined) upd.hora_inicio = patch.horaInicio;
    if (patch.horaFim !== undefined) upd.hora_fim = patch.horaFim;
    if (patch.tipo !== undefined) upd.tipo = patch.tipo;
    if (patch.estado !== undefined) upd.estado = patch.estado;
    if (patch.recorrencia !== undefined) upd.recorrencia = patch.recorrencia;
    if (patch.notas !== undefined) upd.notas = patch.notas || null;
    if (Object.keys(upd).length) {
      await supabase.from("aulas").update(upd).eq("id", id);
    }
    if (patch.explicadorId !== undefined) {
      await supabase.from("aula_professores").delete().eq("aula_id", id);
      if (patch.explicadorId) {
        await supabase.from("aula_professores").insert({ aula_id: id, professor_user_id: patch.explicadorId });
      }
    }
    if (patch.alunoIds !== undefined) {
      await supabase.from("aula_alunos").delete().eq("aula_id", id);
      if (patch.alunoIds.length) {
        await supabase.from("aula_alunos").insert(patch.alunoIds.map(aid => ({ aula_id: id, aluno_id: aid, presenca: null })));
      }
    }
    await refresh();
  };

  const cancelAula = async (id: string) => {
    await supabase.from("aulas").update({ estado: "cancelada" }).eq("id", id);
    await refresh();
  };

  const setPresenca = async (aulaId: string, alunoId: string, presenca: Presenca) => {
    await supabase.from("aula_alunos").update({ presenca }).eq("aula_id", aulaId).eq("aluno_id", alunoId);
    // Atualização otimista local para feedback imediato
    setAulas(prev => prev.map(a => a.id === aulaId
      ? { ...a, presencas: { ...a.presencas, [alunoId]: presenca } }
      : a));
  };

  return (
    <DataContext.Provider value={{
      alunos, explicadores, salas, aulas, loading, refresh,
      createAluno, updateAluno, deleteAluno, toggleAlunoEstado,
      createExplicador, updateExplicador, deleteExplicador,
      createSala, updateSala,
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
