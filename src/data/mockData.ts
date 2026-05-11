import { addDays, subDays, setHours, setMinutes, startOfWeek, format } from "date-fns";

export type UserRole = "admin" | "rececionista" | "explicador" | "encarregado";

export interface MockUser {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  centro: string;
  alunoIds?: string[];
}

export const mockUsers: MockUser[] = [
  { id: "u1", nome: "Ana Silva", email: "admin@eduflow.pt", role: "admin", centro: "EduFlow Lisboa" },
  { id: "u2", nome: "Maria Santos", email: "recepcao@eduflow.pt", role: "rececionista", centro: "EduFlow Lisboa" },
  { id: "u3", nome: "João Ferreira", email: "explicador@eduflow.pt", role: "explicador", centro: "EduFlow Lisboa" },
  { id: "u4", nome: "Carla Martins", email: "carla.m@email.com", role: "encarregado", centro: "EduFlow Lisboa", alunoIds: ["a1"] },
  { id: "u5", nome: "Rui Costa", email: "rui.c@email.com", role: "encarregado", centro: "EduFlow Lisboa", alunoIds: ["a2"] },
  { id: "u6", nome: "Ana Ferreira", email: "ana.f@email.com", role: "encarregado", centro: "EduFlow Lisboa", alunoIds: ["a3"] },
];

export const mockPasswords: Record<string, string> = {
  "admin@eduflow.pt": "admin123",
  "recepcao@eduflow.pt": "recepcao123",
  "explicador@eduflow.pt": "explicador123",
  "carla.m@email.com": "encarregado123",
  "rui.c@email.com": "encarregado123",
  "ana.f@email.com": "encarregado123",
};

export interface Encarregado {
  nome: string;
  email: string;
  telefone: string;
}

export type EstadoAluno = "ativo" | "inativo" | "pre-inscrito";

export interface Aluno {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  escola: string;
  anoLetivo: number;
  disciplinas: string[];
  encarregado: Encarregado;
  estado: EstadoAluno;
  dataInscricao: string;
  valorHora?: number;
  explicadorId?: string;
  nifEncarregado?: string;
}

export const disciplinas = [
  "Matemática", "Português", "Inglês", "Física e Química",
  "Biologia e Geologia", "Economia", "Geometria Descritiva", "História"
];

export const disciplinaColors: Record<string, string> = {
  "Matemática": "bg-discipline-math",
  "Português": "bg-discipline-portuguese",
  "Inglês": "bg-discipline-english",
  "Física e Química": "bg-discipline-physics",
  "Biologia e Geologia": "bg-discipline-biology",
  "Economia": "bg-discipline-economics",
  "Geometria Descritiva": "bg-discipline-geometry",
  "História": "bg-discipline-history",
};

export const disciplinaHslColors: Record<string, string> = {
  "Matemática": "hsl(221, 83%, 53%)",
  "Português": "hsl(142, 71%, 45%)",
  "Inglês": "hsl(262, 83%, 58%)",
  "Física e Química": "hsl(25, 95%, 53%)",
  "Biologia e Geologia": "hsl(142, 76%, 36%)",
  "Economia": "hsl(346, 77%, 50%)",
  "Geometria Descritiva": "hsl(199, 89%, 48%)",
  "História": "hsl(32, 95%, 44%)",
};

export const initialAlunos: Aluno[] = [
  { id: "a1", nome: "Pedro Martins", email: "pedro.m@email.com", telefone: "912345678", escola: "Escola Secundária D. Pedro V", anoLetivo: 10, disciplinas: ["Matemática", "Física e Química"], encarregado: { nome: "Carla Martins", email: "carla.m@email.com", telefone: "961234567" }, estado: "ativo", dataInscricao: "2024-09-15", valorHora: 20, explicadorId: "e1", nifEncarregado: "123456789" },
  { id: "a2", nome: "Sofia Costa", email: "sofia.c@email.com", telefone: "913456789", escola: "Colégio Moderno", anoLetivo: 11, disciplinas: ["Matemática", "Biologia e Geologia"], encarregado: { nome: "Rui Costa", email: "rui.c@email.com", telefone: "962345678" }, estado: "ativo", dataInscricao: "2024-09-20", valorHora: 22, explicadorId: "e4", nifEncarregado: "234567890" },
  { id: "a3", nome: "Tiago Ferreira", email: "tiago.f@email.com", telefone: "914567890", escola: "Escola Secundária Camões", anoLetivo: 12, disciplinas: ["Português", "História"], encarregado: { nome: "Ana Ferreira", email: "ana.f@email.com", telefone: "963456789" }, estado: "ativo", dataInscricao: "2024-10-01", valorHora: 18, explicadorId: "e2", nifEncarregado: "345678901" },
  { id: "a4", nome: "Inês Santos", email: "ines.s@email.com", telefone: "915678901", escola: "Liceu Francês", anoLetivo: 9, disciplinas: ["Inglês", "Português"], encarregado: { nome: "Miguel Santos", email: "miguel.s@email.com", telefone: "964567890" }, estado: "ativo", dataInscricao: "2024-09-10", valorHora: 18, explicadorId: "e3", nifEncarregado: "456789012" },
  { id: "a5", nome: "Diogo Oliveira", email: "diogo.o@email.com", telefone: "916789012", escola: "Escola Secundária D. Pedro V", anoLetivo: 10, disciplinas: ["Matemática", "Economia"], encarregado: { nome: "Teresa Oliveira", email: "teresa.o@email.com", telefone: "965678901" }, estado: "ativo", dataInscricao: "2024-10-15", valorHora: 25, explicadorId: "e5", nifEncarregado: "567890123" },
  { id: "a6", nome: "Mariana Rodrigues", email: "mariana.r@email.com", telefone: "917890123", escola: "Colégio Moderno", anoLetivo: 11, disciplinas: ["Geometria Descritiva", "Matemática"], encarregado: { nome: "Paulo Rodrigues", email: "paulo.r@email.com", telefone: "966789012" }, estado: "ativo", dataInscricao: "2024-09-25", valorHora: 22, explicadorId: "e1", nifEncarregado: "678901234" },
  { id: "a7", nome: "André Pereira", email: "andre.p@email.com", telefone: "918901234", escola: "Escola Secundária Camões", anoLetivo: 8, disciplinas: ["Inglês"], encarregado: { nome: "Luísa Pereira", email: "luisa.p@email.com", telefone: "967890123" }, estado: "ativo", dataInscricao: "2024-11-01", valorHora: 15, explicadorId: "e3", nifEncarregado: "789012345" },
  { id: "a8", nome: "Beatriz Almeida", email: "beatriz.a@email.com", telefone: "919012345", escola: "Colégio São João de Brito", anoLetivo: 12, disciplinas: ["Biologia e Geologia", "Física e Química"], encarregado: { nome: "João Almeida", email: "joao.a@email.com", telefone: "968901234" }, estado: "ativo", dataInscricao: "2024-10-20", valorHora: 22, explicadorId: "e4", nifEncarregado: "890123456" },
  { id: "a9", nome: "Lucas Sousa", email: "lucas.s@email.com", telefone: "920123456", escola: "Escola Secundária D. Pedro V", anoLetivo: 7, disciplinas: ["Matemática", "Português"], encarregado: { nome: "Sandra Sousa", email: "sandra.s@email.com", telefone: "969012345" }, estado: "ativo", dataInscricao: "2024-09-05", valorHora: 18, explicadorId: "e1", nifEncarregado: "901234567" },
  { id: "a10", nome: "Carolina Lima", email: "carolina.l@email.com", telefone: "921234567", escola: "Liceu Francês", anoLetivo: 10, disciplinas: ["Economia", "Inglês"], encarregado: { nome: "Fernando Lima", email: "fernando.l@email.com", telefone: "970123456" }, estado: "inativo", dataInscricao: "2024-03-15", valorHora: 18, explicadorId: "e5", nifEncarregado: "012345678" },
  { id: "a11", nome: "Rafael Nunes", email: "rafael.n@email.com", telefone: "922345678", escola: "Colégio Moderno", anoLetivo: 11, disciplinas: ["História", "Português"], encarregado: { nome: "Isabel Nunes", email: "isabel.n@email.com", telefone: "971234567" }, estado: "inativo", dataInscricao: "2024-02-10", valorHora: 18, explicadorId: "e2", nifEncarregado: "112345678" },
  { id: "a12", nome: "Leonor Mendes", email: "leonor.m@email.com", telefone: "923456789", escola: "Escola Secundária Camões", anoLetivo: 9, disciplinas: ["Matemática", "Inglês"], encarregado: { nome: "Carlos Mendes", email: "carlos.m@email.com", telefone: "972345678" }, estado: "pre-inscrito", dataInscricao: "2025-01-05", valorHora: 20, nifEncarregado: "223456789" },
];

export interface Disponibilidade {
  diaSemana: number;
  horaInicio: string;
  horaFim: string;
}

export type EstadoExplicador = "ativo" | "inativo";

export interface Explicador {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  disciplinas: string[];
  valorHora: number;
  habilitacoes: string;
  estado: EstadoExplicador;
  disponibilidade: Disponibilidade[];
  iban?: string;
  nif?: string;
}

export const initialExplicadores: Explicador[] = [
  { id: "e1", nome: "João Ferreira", email: "joao.f@eduflow.pt", telefone: "931111111", disciplinas: ["Matemática", "Física e Química"], valorHora: 20, habilitacoes: "Mestrado em Engenharia Física", estado: "ativo", iban: "PT50000201231234567890154", nif: "211234567", disponibilidade: [{ diaSemana: 1, horaInicio: "09:00", horaFim: "13:00" }, { diaSemana: 1, horaInicio: "14:00", horaFim: "18:00" }, { diaSemana: 2, horaInicio: "09:00", horaFim: "13:00" }, { diaSemana: 3, horaInicio: "14:00", horaFim: "19:00" }, { diaSemana: 4, horaInicio: "09:00", horaFim: "13:00" }, { diaSemana: 5, horaInicio: "09:00", horaFim: "12:00" }] },
  { id: "e2", nome: "Maria Lopes", email: "maria.l@eduflow.pt", telefone: "932222222", disciplinas: ["Português", "História"], valorHora: 18, habilitacoes: "Licenciatura em Letras", estado: "ativo", iban: "PT50000201239876543210987", nif: "222345678", disponibilidade: [{ diaSemana: 1, horaInicio: "10:00", horaFim: "17:00" }, { diaSemana: 2, horaInicio: "10:00", horaFim: "17:00" }, { diaSemana: 3, horaInicio: "10:00", horaFim: "17:00" }, { diaSemana: 4, horaInicio: "10:00", horaFim: "17:00" }] },
  { id: "e3", nome: "Carlos Ribeiro", email: "carlos.r@eduflow.pt", telefone: "933333333", disciplinas: ["Inglês"], valorHora: 15, habilitacoes: "Cambridge Certificate C2, Licenciatura em Línguas", estado: "ativo", nif: "233456789", disponibilidade: [{ diaSemana: 1, horaInicio: "14:00", horaFim: "20:00" }, { diaSemana: 2, horaInicio: "14:00", horaFim: "20:00" }, { diaSemana: 3, horaInicio: "14:00", horaFim: "20:00" }, { diaSemana: 5, horaInicio: "09:00", horaFim: "13:00" }] },
  { id: "e4", nome: "Rita Gomes", email: "rita.g@eduflow.pt", telefone: "934444444", disciplinas: ["Biologia e Geologia", "Física e Química"], valorHora: 22, habilitacoes: "Doutoramento em Bioquímica", estado: "ativo", iban: "PT50000201231111222233344", nif: "244567890", disponibilidade: [{ diaSemana: 1, horaInicio: "08:00", horaFim: "12:00" }, { diaSemana: 2, horaInicio: "08:00", horaFim: "12:00" }, { diaSemana: 3, horaInicio: "08:00", horaFim: "12:00" }, { diaSemana: 4, horaInicio: "14:00", horaFim: "18:00" }, { diaSemana: 5, horaInicio: "14:00", horaFim: "18:00" }] },
  { id: "e5", nome: "Bruno Tavares", email: "bruno.t@eduflow.pt", telefone: "935555555", disciplinas: ["Economia", "Matemática"], valorHora: 25, habilitacoes: "Mestrado em Economia, MBA", estado: "ativo", iban: "PT50000201235555666677788", nif: "255678901", disponibilidade: [{ diaSemana: 2, horaInicio: "09:00", horaFim: "13:00" }, { diaSemana: 3, horaInicio: "09:00", horaFim: "13:00" }, { diaSemana: 4, horaInicio: "09:00", horaFim: "13:00" }, { diaSemana: 4, horaInicio: "14:00", horaFim: "17:00" }] },
  { id: "e6", nome: "Helena Dias", email: "helena.d@eduflow.pt", telefone: "936666666", disciplinas: ["Geometria Descritiva", "Matemática"], valorHora: 12, habilitacoes: "Licenciatura em Arquitetura", estado: "inativo", nif: "266789012", disponibilidade: [{ diaSemana: 1, horaInicio: "15:00", horaFim: "19:00" }, { diaSemana: 3, horaInicio: "15:00", horaFim: "19:00" }] },
];

export type EstadoSala = "disponível" | "manutenção";

export interface Sala {
  id: string;
  nome: string;
  capacidade: number;
  equipamentos: string[];
  estado: EstadoSala;
}

export const initialSalas: Sala[] = [
  { id: "s1", nome: "Sala A", capacidade: 1, equipamentos: ["quadro branco"], estado: "disponível" },
  { id: "s2", nome: "Sala B", capacidade: 4, equipamentos: ["quadro branco", "projetor"], estado: "disponível" },
  { id: "s3", nome: "Sala C", capacidade: 6, equipamentos: ["quadro branco", "projetor", "computador"], estado: "disponível" },
  { id: "s4", nome: "Sala D", capacidade: 2, equipamentos: ["quadro branco"], estado: "disponível" },
  { id: "s5", nome: "Sala E", capacidade: 8, equipamentos: ["quadro branco", "projetor", "computador", "televisão"], estado: "manutenção" },
];

export type EstadoAula = "agendada" | "realizada" | "cancelada";
export type TipoAula = "individual" | "grupo";
export type Presenca = "presente" | "falta_justificada" | "falta_injustificada" | null;

export interface Aula {
  id: string;
  alunoIds: string[];
  explicadorId: string;
  salaId: string;
  disciplina: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  tipo: TipoAula;
  estado: EstadoAula;
  presencas: Record<string, Presenca>;
  notas?: string;
  recorrencia?: "unica" | "semanal" | "quinzenal";
}

function generateAulas(): Aula[] {
  const today = new Date();
  const monday = startOfWeek(today, { weekStartsOn: 1 });
  const aulas: Aula[] = [];
  let id = 1;

  const slots = [
    { explicadorId: "e1", alunoIds: ["a1"], salaId: "s1", disciplina: "Matemática", tipo: "individual" as TipoAula },
    { explicadorId: "e1", alunoIds: ["a2"], salaId: "s1", disciplina: "Física e Química", tipo: "individual" as TipoAula },
    { explicadorId: "e2", alunoIds: ["a3"], salaId: "s4", disciplina: "Português", tipo: "individual" as TipoAula },
    { explicadorId: "e2", alunoIds: ["a4", "a9"], salaId: "s2", disciplina: "Português", tipo: "grupo" as TipoAula },
    { explicadorId: "e3", alunoIds: ["a4"], salaId: "s1", disciplina: "Inglês", tipo: "individual" as TipoAula },
    { explicadorId: "e3", alunoIds: ["a7"], salaId: "s4", disciplina: "Inglês", tipo: "individual" as TipoAula },
    { explicadorId: "e4", alunoIds: ["a8"], salaId: "s1", disciplina: "Biologia e Geologia", tipo: "individual" as TipoAula },
    { explicadorId: "e4", alunoIds: ["a2", "a8"], salaId: "s2", disciplina: "Biologia e Geologia", tipo: "grupo" as TipoAula },
    { explicadorId: "e5", alunoIds: ["a5"], salaId: "s1", disciplina: "Economia", tipo: "individual" as TipoAula },
    { explicadorId: "e5", alunoIds: ["a1", "a5", "a6"], salaId: "s3", disciplina: "Matemática", tipo: "grupo" as TipoAula },
    { explicadorId: "e1", alunoIds: ["a6"], salaId: "s4", disciplina: "Matemática", tipo: "individual" as TipoAula },
    { explicadorId: "e2", alunoIds: ["a3"], salaId: "s1", disciplina: "História", tipo: "individual" as TipoAula },
    { explicadorId: "e1", alunoIds: ["a9"], salaId: "s1", disciplina: "Matemática", tipo: "individual" as TipoAula },
    { explicadorId: "e4", alunoIds: ["a1"], salaId: "s4", disciplina: "Física e Química", tipo: "individual" as TipoAula },
    { explicadorId: "e3", alunoIds: ["a10"], salaId: "s1", disciplina: "Inglês", tipo: "individual" as TipoAula },
  ];

  const hours = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"];

  for (let week = 0; week < 2; week++) {
    for (let day = 0; day < 5; day++) {
      const date = addDays(monday, week * 7 + day);
      const dateStr = format(date, "yyyy-MM-dd");
      const slotsForDay = slots.filter((_, i) => (i + day) % 3 === 0 || (i + day) % 5 === 0).slice(0, 4);

      slotsForDay.forEach((slot, idx) => {
        const hour = hours[idx % hours.length];
        const endHour = `${String(parseInt(hour.split(":")[0]) + 1).padStart(2, "0")}:00`;
        const isPast = date < subDays(today, 0);
        const presencas: Record<string, Presenca> = {};
        
        if (isPast) {
          slot.alunoIds.forEach(aid => {
            const rand = Math.random();
            presencas[aid] = rand > 0.2 ? "presente" : rand > 0.1 ? "falta_justificada" : "falta_injustificada";
          });
        }

        aulas.push({
          id: `aula${id++}`,
          alunoIds: slot.alunoIds,
          explicadorId: slot.explicadorId,
          salaId: slot.salaId,
          disciplina: slot.disciplina,
          data: dateStr,
          horaInicio: hour,
          horaFim: endHour,
          tipo: slot.tipo,
          estado: isPast ? "realizada" : "agendada",
          presencas,
          recorrencia: "semanal",
        });
      });
    }
  }

  return aulas;
}

export const initialAulas = generateAulas();

export interface PrecoDisciplina {
  individual: number;
  grupo: number;
}

export const precosDisciplinas: Record<string, PrecoDisciplina> = {
  "Matemática": { individual: 20, grupo: 12 },
  "Português": { individual: 18, grupo: 11 },
  "Inglês": { individual: 18, grupo: 11 },
  "Física e Química": { individual: 22, grupo: 13 },
  "Biologia e Geologia": { individual: 20, grupo: 12 },
  "Economia": { individual: 18, grupo: 11 },
  "Geometria Descritiva": { individual: 22, grupo: 13 },
  "História": { individual: 18, grupo: 11 },
};

export const evolucaoAlunos = [
  { mes: "Set", ativos: 6 },
  { mes: "Out", ativos: 8 },
  { mes: "Nov", ativos: 9 },
  { mes: "Dez", ativos: 8 },
  { mes: "Jan", ativos: 9 },
  { mes: "Fev", ativos: 9 },
];
