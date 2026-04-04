import { useMemo } from "react";
import { useData } from "@/contexts/DataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CalendarDays, DoorOpen, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { format, isToday, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { evolucaoAlunos, disciplinaHslColors } from "@/data/mockData";

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

  const aulasPorDisciplina = useMemo(() => {
    const counts: Record<string, number> = {};
    aulas.forEach(a => { counts[a.disciplina] = (counts[a.disciplina] || 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value, fill: disciplinaHslColors[name] || "hsl(var(--primary))" }));
  }, [aulas]);

  const aulasHoje = useMemo(() => {
    return aulas
      .filter(a => {
        try { return isToday(parseISO(a.data)); } catch { return false; }
      })
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
      .slice(0, 5);
  }, [aulas]);

  const kpis = [
    { label: "Alunos Ativos", value: stats.ativos, icon: Users, change: "+12%", positive: true, color: "text-primary" },
    { label: "Aulas Esta Semana", value: stats.aulasEstaSemana, icon: CalendarDays, change: "+5%", positive: true, color: "text-secondary" },
    { label: "Taxa de Ocupação", value: `${stats.ocupacao}%`, icon: DoorOpen, change: "-3%", positive: false, color: "text-warning" },
    { label: "Receita Estimada", value: `${stats.receita}€`, icon: TrendingUp, change: "+8%", positive: true, color: "text-success" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-3xl font-bold mt-1">{kpi.value}</p>
                  <div className={`flex items-center gap-1 mt-1 text-xs ${kpi.positive ? "text-success" : "text-destructive"}`}>
                    {kpi.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {kpi.change} vs mês anterior
                  </div>
                </div>
                <div className={`h-12 w-12 rounded-lg bg-accent flex items-center justify-center ${kpi.color}`}>
                  <kpi.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Aulas por Disciplina</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={aulasPorDisciplina} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Evolução de Alunos Ativos</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={evolucaoAlunos}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="ativos" stroke="hsl(var(--secondary))" strokeWidth={2} dot={{ fill: "hsl(var(--secondary))" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        <Card>
          <CardHeader><CardTitle className="text-base">Ações Pendentes</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Pagamentos em atraso", count: 3, color: "bg-destructive" },
                { label: "Pré-inscrição por confirmar", count: 1, color: "bg-warning" },
                { label: "Aulas sem presença registada", count: 2, color: "bg-secondary" },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors">
                  <span className="text-sm">{item.label}</span>
                  <span className={`${item.color} text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full`}>{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
