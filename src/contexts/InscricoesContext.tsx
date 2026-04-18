import React, { createContext, useContext, useState } from "react";

export type InscricaoEstado = "pendente" | "aprovada" | "rejeitada";

export interface Inscricao {
  id: string;
  nomeAluno: string;
  emailAluno: string;
  telefoneAluno: string;
  escola: string;
  anoLetivo: number;
  disciplinas: string[];
  nomeEncarregado: string;
  emailEncarregado: string;
  telefoneEncarregado: string;
  nifEncarregado?: string;
  mensagem?: string;
  origem: "site" | "manual";
  estado: InscricaoEstado;
  criadoEm: string;
}

interface Ctx {
  inscricoes: Inscricao[];
  addInscricao: (data: Omit<Inscricao, "id" | "estado" | "criadoEm">) => void;
  updateEstado: (id: string, estado: InscricaoEstado) => void;
  remove: (id: string) => void;
}

const InscricoesContext = createContext<Ctx | null>(null);

const initial: Inscricao[] = [
  {
    id: "i1",
    nomeAluno: "Mariana Costa",
    emailAluno: "mariana.c@email.com",
    telefoneAluno: "912000111",
    escola: "Escola Secundária D. Pedro V",
    anoLetivo: 10,
    disciplinas: ["Matemática", "Física e Química"],
    nomeEncarregado: "Joana Costa",
    emailEncarregado: "joana.c@email.com",
    telefoneEncarregado: "962000111",
    nifEncarregado: "212345678",
    mensagem: "Preferência por horário pós-escolar.",
    origem: "site",
    estado: "pendente",
    criadoEm: new Date(Date.now() - 86400000).toISOString(),
  },
];

export function InscricoesProvider({ children }: { children: React.ReactNode }) {
  const [inscricoes, setInscricoes] = useState<Inscricao[]>(initial);

  const addInscricao: Ctx["addInscricao"] = (data) => {
    setInscricoes(prev => [
      { ...data, id: `i-${Date.now()}`, estado: "pendente", criadoEm: new Date().toISOString() },
      ...prev,
    ]);
  };

  const updateEstado: Ctx["updateEstado"] = (id, estado) => {
    setInscricoes(prev => prev.map(i => i.id === id ? { ...i, estado } : i));
  };

  const remove: Ctx["remove"] = (id) => {
    setInscricoes(prev => prev.filter(i => i.id !== id));
  };

  return (
    <InscricoesContext.Provider value={{ inscricoes, addInscricao, updateEstado, remove }}>
      {children}
    </InscricoesContext.Provider>
  );
}

export function useInscricoes() {
  const ctx = useContext(InscricoesContext);
  if (!ctx) throw new Error("useInscricoes must be used within InscricoesProvider");
  return ctx;
}
