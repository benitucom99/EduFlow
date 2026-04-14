import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, User } from "lucide-react";

interface NotaAluno {
  alunoId: string;
  disciplina: string;
  periodo: string;
  nota: number;
}

// Mock grade data
const mockNotas: NotaAluno[] = [
  { alunoId: "a1", disciplina: "Matemática", periodo: "1º Período", nota: 12 },
  { alunoId: "a1", disciplina: "Matemática", periodo: "2º Período", nota: 14 },
  { alunoId: "a1", disciplina: "Matemática", periodo: "3º Período", nota: 16 },
  { alunoId: "a1", disciplina: "Física e Química", periodo: "1º Período", nota: 13 },
  { alunoId: "a1", disciplina: "Física e Química", periodo: "2º Período", nota: 14 },
  { alunoId: "a1", disciplina: "Física e Química", periodo: "3º Período", nota: 15 },
  { alunoId: "a2", disciplina: "Matemática", periodo: "1º Período", nota: 15 },
  { alunoId: "a2", disciplina: "Matemática", periodo: "2º Período", nota: 16 },
  { alunoId: "a2", disciplina: "Matemática", periodo: "3º Período", nota: 17 },
  { alunoId: "a2", disciplina: "Biologia e Geologia", periodo: "1º Período", nota: 14 },
  { alunoId: "a2", disciplina: "Biologia e Geologia", periodo: "2º Período", nota: 13 },
  { alunoId: "a2", disciplina: "Biologia e Geologia", periodo: "3º Período", nota: 15 },
  { alunoId: "a3", disciplina: "Português", periodo: "1º Período", nota: 11 },
  { alunoId: "a3", disciplina: "Português", periodo: "2º Período", nota: 13 },
  { alunoId: "a3", disciplina: "Português", periodo: "3º Período", nota: 14 },
  { alunoId: "a3", disciplina: "História", periodo: "1º Período", nota: 13 },
  { alunoId: "a3", disciplina: "História", periodo: "2º Período", nota: 14 },
  { alunoId: "a3", disciplina: "História", periodo: "3º Período", nota: 16 },
];

const periodos = ["1º Período", "2º Período", "3º Período"];

function TrendIcon({ current, previous }: { current: number; previous: number }) {
  if (current > previous) return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (current < previous) return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function getNotaColor(nota: number) {
  if (nota >= 16) return "text-green-500";
  if (nota >= 14) return "text-blue-500";
  if (nota >= 10) return "text-yellow-500";
  return "text-red-500";
}

export default function PortalEvolucaoPage() {
  const { user } = useAuth();
  const { alunos } = useData();

  const educandos = alunos.filter(a => user?.alunoIds?.includes(a.id));

  const notasByAluno = useMemo(() => {
    const map = new Map<string, Map<string, NotaAluno[]>>();
    for (const nota of mockNotas) {
      if (!educandos.some(e => e.id === nota.alunoId)) continue;
      if (!map.has(nota.alunoId)) map.set(nota.alunoId, new Map());
      const discMap = map.get(nota.alunoId)!;
      if (!discMap.has(nota.disciplina)) discMap.set(nota.disciplina, []);
      discMap.get(nota.disciplina)!.push(nota);
    }
    return map;
  }, [educandos]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Evolução</h1>
        <p className="text-muted-foreground">Acompanhe o progresso de notas dos seus educandos</p>
      </div>

      {educandos.map(aluno => {
        const discMap = notasByAluno.get(aluno.id);
        const disciplinas = discMap ? Array.from(discMap.keys()) : [];

        return (
          <Card key={aluno.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                {aluno.nome}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{aluno.escola} — {aluno.anoLetivo}º ano</p>
            </CardHeader>
            <CardContent>
              {disciplinas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem notas registadas.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-3 font-medium text-muted-foreground">Disciplina</th>
                        {periodos.map(p => (
                          <th key={p} className="text-center p-3 font-medium text-muted-foreground">{p}</th>
                        ))}
                        <th className="text-center p-3 font-medium text-muted-foreground">Tendência</th>
                      </tr>
                    </thead>
                    <tbody>
                      {disciplinas.map(disc => {
                        const notas = discMap!.get(disc)!;
                        const notasByPeriodo = new Map(notas.map(n => [n.periodo, n.nota]));
                        const values = periodos.map(p => notasByPeriodo.get(p));
                        const validValues = values.filter((v): v is number => v !== undefined);
                        const last = validValues[validValues.length - 1];
                        const prev = validValues.length >= 2 ? validValues[validValues.length - 2] : last;

                        return (
                          <tr key={disc} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="p-3">
                              <Badge variant="outline">{disc}</Badge>
                            </td>
                            {periodos.map(p => {
                              const nota = notasByPeriodo.get(p);
                              return (
                                <td key={p} className="text-center p-3">
                                  {nota !== undefined ? (
                                    <span className={`font-bold text-lg ${getNotaColor(nota)}`}>{nota}</span>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="text-center p-3">
                              {validValues.length >= 2 && (
                                <div className="flex items-center justify-center gap-1">
                                  <TrendIcon current={last} previous={prev} />
                                  <span className={`text-xs font-medium ${last > prev ? "text-green-500" : last < prev ? "text-red-500" : "text-muted-foreground"}`}>
                                    {last > prev ? `+${last - prev}` : last < prev ? `${last - prev}` : "="}
                                  </span>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
