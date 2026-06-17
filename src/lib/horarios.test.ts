import { describe, it, expect } from "vitest";
import { isoDiaSemana, fimAnoLetivo, horaFimDe, gerarAulasDoHorario } from "@/lib/horarios";
import { parseISO } from "date-fns";

describe("isoDiaSemana", () => {
  it("converte domingo (getDay=0) para 7 e mantém os restantes", () => {
    expect(isoDiaSemana(parseISO("2026-06-08"))).toBe(1); // segunda
    expect(isoDiaSemana(parseISO("2026-06-13"))).toBe(6); // sábado
    expect(isoDiaSemana(parseISO("2026-06-14"))).toBe(7); // domingo
  });
});

describe("fimAnoLetivo", () => {
  it("antes de Agosto → 31 Jul do mesmo ano", () => {
    expect(fimAnoLetivo(parseISO("2026-06-08"))).toEqual(new Date(2026, 6, 31));
    expect(fimAnoLetivo(parseISO("2026-01-15"))).toEqual(new Date(2026, 6, 31));
  });
  it("de Agosto em diante → 31 Jul do ano seguinte", () => {
    expect(fimAnoLetivo(parseISO("2026-09-01"))).toEqual(new Date(2027, 6, 31));
    expect(fimAnoLetivo(parseISO("2026-12-31"))).toEqual(new Date(2027, 6, 31));
  });
  it("usa configFim quando fornecido, ignorando o cálculo default", () => {
    expect(fimAnoLetivo(parseISO("2026-06-08"), "2026-07-15")).toEqual(parseISO("2026-07-15"));
    expect(fimAnoLetivo(parseISO("2026-09-01"), "2027-06-30")).toEqual(parseISO("2027-06-30"));
  });
  it("ignora configFim undefined e usa o fallback", () => {
    expect(fimAnoLetivo(parseISO("2026-06-08"), undefined)).toEqual(new Date(2026, 6, 31));
  });
});

describe("horaFimDe", () => {
  it("soma a duração à hora de início", () => {
    expect(horaFimDe("17:00", 60)).toBe("18:00");
    expect(horaFimDe("17:30", 90)).toBe("19:00");
    expect(horaFimDe("09:15", 45)).toBe("10:00");
  });
});

describe("gerarAulasDoHorario", () => {
  it("expande um slot semanal em todas as ocorrências do intervalo", () => {
    // Segundas-feiras entre 8 e 30 de Junho de 2026: 8, 15, 22, 29.
    const aulas = gerarAulasDoHorario([{ diaSemana: 1, horaInicio: "17:00" }], "2026-06-08", "2026-06-30", 60);
    expect(aulas.map(a => a.data)).toEqual(["2026-06-08", "2026-06-15", "2026-06-22", "2026-06-29"]);
    expect(aulas[0]).toMatchObject({ horaInicio: "17:00", horaFim: "18:00" });
  });

  it("combina vários slots e ordena por data e hora", () => {
    const aulas = gerarAulasDoHorario(
      [{ diaSemana: 3, horaInicio: "18:00" }, { diaSemana: 1, horaInicio: "17:00" }],
      "2026-06-08", "2026-06-14", 60
    );
    expect(aulas.map(a => `${a.data} ${a.horaInicio}`)).toEqual([
      "2026-06-08 17:00", // segunda
      "2026-06-10 18:00", // quarta
    ]);
  });

  it("inclui os limites do intervalo e devolve vazio sem slots", () => {
    const umDia = gerarAulasDoHorario([{ diaSemana: 1, horaInicio: "10:00" }], "2026-06-08", "2026-06-08", 60);
    expect(umDia).toHaveLength(1);
    expect(gerarAulasDoHorario([], "2026-06-08", "2026-12-31", 60)).toEqual([]);
  });
});
