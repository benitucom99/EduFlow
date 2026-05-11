import { useMemo } from "react";
import { useData } from "@/contexts/DataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, Wallet, CheckCircle2 } from "lucide-react";
import { isToday, parseISO } from "date-fns";

export default function DashboardPage() {
  const { alunos, aulas, explicadores, salas } = useData();

  const stats = useMemo(() => {
    const ativos = alunos.filter(a => a.estado === "ativo").length;
    const aulasAtivas = aulas.filter(a => a.estado !== "cancelada").length;
    const salasDisp = salas.filter(s => s.estado === "disponível").length;
    const ocupacao = salasDisp > 0 ? Math.round((aulasAtivas / (salasDisp * 5 * 8)) * 100) : 0;
    const receita = aulas
      .filter(a => a.estado !== "cancelada")
      .reduce((sum, a) => {
        const exp = explicadores.find(e => e.id === a.explicadorId);
        return sum + (exp?.valorHora || 0);
      }, 0);
    return { ativos, aulasAtivas, ocupacao: Math.min(ocupacao, 100), receita };
  }, [alunos, aulas, explicadores, salas]);

  const aulasHoje = useMemo(() => {
    return aulas
      .filter(a => {
        try { return isToday(parseISO(a.data)); } catch { return false; }
      })
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
      .slice(0, 5);
  }, [aulas]);

  const formatReceita = (v: number) =>
    v >= 1000 ? `${(v / 1000).toFixed(1)}k €` : `${v} €`;

  const kpis = [
    { label: "Total de Alunos", value: stats.ativos.toLocaleString("pt-PT"), icon: Users, iconBg: "bg-slate-100", iconColor: "text-slate-600" },
    { label: "Aulas Ativas", value: stats.aulasAtivas, icon: BookOpen, iconBg: "bg-amber-100", iconColor: "text-amber-500" },
    { label: "Receita Mensal", value: formatReceita(stats.receita), icon: Wallet, iconBg: "bg-emerald-100", iconColor: "text-emerald-500" },
    { label: "Taxa de Assiduidade", value: `${stats.ocupacao}%`, icon: CheckCircle2, iconBg: "bg-violet-100", iconColor: "text-violet-500" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <Card key={kpi.label} className="rounded-2xl shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground font-sans">{kpi.label}</p>
                  <p className="font-heading font-bold text-3xl mt-2 tracking-tight">{kpi.value}</p>
                </div>
                <div className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center ${kpi.iconBg} ${kpi.iconColor}`}>
                  <kpi.icon className="h-5 w-5" strokeWidth={2.25} />
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
