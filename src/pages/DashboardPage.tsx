import { useMemo } from "react";
import { useData } from "@/contexts/DataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CalendarDays, DoorOpen, TrendingUp } from "lucide-react";
import { isToday, parseISO } from "date-fns";

export default function DashboardPage() {
  const { alunos, aulas, explicadores, salas } = useData();

  const stats = useMemo(() => {
    const ativos = alunos.filter(a => a.estado === "ativo").length;
    const aulasEstaSemana = aulas.filter(a => a.estado !== "cancelada").length;
    const salasDisp = salas.filter(s => s.estado === "disponível").length;
    const ocupacao = salasDisp > 0 ? Math.round((aulasEstaSemana / (salasDisp * 5 * 8)) * 100) : 0;
    const receita = aulas
      .filter(a => a.estado !== "cancelada")
      .reduce((sum, a) => {
        const exp = explicadores.find(e => e.id === a.explicadorId);
        return sum + (exp?.valorHora || 0);
      }, 0);
    return { ativos, aulasEstaSemana, ocupacao: Math.min(ocupacao, 100), receita };
  }, [alunos, aulas, explicadores, salas]);

  const aulasHoje = useMemo(() => {
    return aulas
      .filter(a => {
        try { return isToday(parseISO(a.data)); } catch { return false; }
      })
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
      .slice(0, 5);
  }, [aulas]);

  const kpis = [
    { label: "Alunos Ativos", value: stats.ativos, icon: Users, color: "text-primary" },
    { label: "Aulas Esta Semana", value: stats.aulasEstaSemana, icon: CalendarDays, color: "text-secondary" },
    { label: "Taxa de Ocupação", value: `${stats.ocupacao}%`, icon: DoorOpen, color: "text-warning" },
    { label: "Receita Estimada", value: `${stats.receita}€`, icon: TrendingUp, color: "text-success" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-3xl font-bold mt-1">{kpi.value}</p>
                </div>
                <div className={`h-12 w-12 rounded-lg bg-accent flex items-center justify-center ${kpi.color}`}>
                  <kpi.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Próximas Aulas Hoje</CardTitle></CardHeader>
        <CardContent>
          {aulasHoje.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Sem aulas agendadas para hoje</p>
          ) : (
            <div className="space-y-3">
              {aulasHoje.map(aula => {
                const aluno = alunos.find(a => a.id === aula.alunoIds[0]);
                const exp = explicadores.find(e => e.id === aula.explicadorId);
                const sala = salas.find(s => s.id === aula.salaId);
                return (
                  <div key={aula.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono font-medium">{aula.horaInicio}</span>
                      <div>
                        <p className="text-sm font-medium">{aula.tipo === "grupo" ? `Grupo (${aula.alunoIds.length})` : aluno?.nome}</p>
                        <p className="text-xs text-muted-foreground">{exp?.nome} · {sala?.nome}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">{aula.disciplina}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
