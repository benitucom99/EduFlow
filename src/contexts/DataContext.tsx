import React, { createContext, useContext, useState } from "react";
import { Aluno, Explicador, Sala, Aula, initialAlunos, initialExplicadores, initialSalas, initialAulas } from "@/data/mockData";

interface DataContextType {
  alunos: Aluno[];
  setAlunos: React.Dispatch<React.SetStateAction<Aluno[]>>;
  explicadores: Explicador[];
  setExplicadores: React.Dispatch<React.SetStateAction<Explicador[]>>;
  salas: Sala[];
  setSalas: React.Dispatch<React.SetStateAction<Sala[]>>;
  aulas: Aula[];
  setAulas: React.Dispatch<React.SetStateAction<Aula[]>>;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [alunos, setAlunos] = useState<Aluno[]>(initialAlunos);
  const [explicadores, setExplicadores] = useState<Explicador[]>(initialExplicadores);
  const [salas, setSalas] = useState<Sala[]>(initialSalas);
  const [aulas, setAulas] = useState<Aula[]>(initialAulas);

  return (
    <DataContext.Provider value={{ alunos, setAlunos, explicadores, setExplicadores, salas, setSalas, aulas, setAulas }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
