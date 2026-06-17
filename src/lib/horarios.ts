// Helpers puros do Gerador de Horários Recorrentes (Horários Base do aluno).
// Mantidos sem dependências de React/Supabase para serem testáveis isoladamente.
import { addDays, format, getDay, parseISO } from "date-fns";

// Slot do construtor semanal: dia (ISO 1=segunda..7=domingo) + hora de início.
export interface HorarioSlot {
  diaSemana: number;
  horaInicio: string; // "HH:mm"
}

// Dias da semana em ISO (1=segunda..7=domingo), para UI e geração.
export const DIAS_SEMANA: { valor: number; label: string; curto: string }[] = [
  { valor: 1, label: "Segunda-feira", curto: "Seg" },
  { valor: 2, label: "Terça-feira", curto: "Ter" },
  { valor: 3, label: "Quarta-feira", curto: "Qua" },
  { valor: 4, label: "Quinta-feira", curto: "Qui" },
  { valor: 5, label: "Sexta-feira", curto: "Sex" },
  { valor: 6, label: "Sábado", curto: "Sáb" },
  { valor: 7, label: "Domingo", curto: "Dom" },
];

export function diaSemanaCurto(dia: number): string {
  return DIAS_SEMANA.find(d => d.valor === dia)?.curto ?? "?";
}

// date-fns getDay devolve 0=domingo..6=sábado; converte para ISO 1=seg..7=dom.
export function isoDiaSemana(date: Date): number {
  const d = getDay(date);
  return d === 0 ? 7 : d;
}

// Fim do ano letivo a partir de uma data (default do gerador): final de Julho.
// Antes de Agosto → 31 Jul do mesmo ano; Ago-Dez → 31 Jul do ano seguinte.
// Se configFim (yyyy-MM-dd) estiver definido, usa-o em vez do cálculo default.
export function fimAnoLetivo(from: Date, configFim?: string): Date {
  if (configFim) return parseISO(configFim);
  const month = from.getMonth(); // 0=Jan..11=Dez; Julho=6
  const year = from.getFullYear();
  return month <= 6 ? new Date(year, 6, 31) : new Date(year + 1, 6, 31);
}

// hora_fim = hora_inicio + duracaoMin (formato "HH:mm", sem rollover de dia).
export function horaFimDe(horaInicio: string, duracaoMin: number): string {
  const [h, m] = horaInicio.split(":").map(Number);
  const total = h * 60 + m + duracaoMin;
  const hh = Math.floor(total / 60) % 24;
  return `${String(hh).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export interface AulaGerada {
  data: string; // yyyy-MM-dd
  horaInicio: string;
  horaFim: string;
}

// Expande os slots semanais em datas concretas no intervalo [dataInicio, dataFim]
// (ambos inclusivos, yyyy-MM-dd). Ordenadas por data e hora.
export function gerarAulasDoHorario(
  slots: HorarioSlot[],
  dataInicio: string,
  dataFim: string,
  duracaoMin: number
): AulaGerada[] {
  if (!slots.length) return [];
  const fim = parseISO(dataFim);
  const out: AulaGerada[] = [];
  let cursor = parseISO(dataInicio);
  while (cursor <= fim) {
    const iso = isoDiaSemana(cursor);
    for (const slot of slots) {
      if (slot.diaSemana === iso) {
        out.push({
          data: format(cursor, "yyyy-MM-dd"),
          horaInicio: slot.horaInicio,
          horaFim: horaFimDe(slot.horaInicio, duracaoMin),
        });
      }
    }
    cursor = addDays(cursor, 1);
  }
  return out.sort((a, b) => a.data.localeCompare(b.data) || a.horaInicio.localeCompare(b.horaInicio));
}
