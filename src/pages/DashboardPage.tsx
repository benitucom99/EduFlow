import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, Wallet, CheckCircle2, CalendarDays, UserRound, MapPin } from "lucide-react";
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

      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-bold">Horário de Hoje</CardTitle>
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pt-0">
          {aulasHoje.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Sem aulas agendadas para hoje</p>
          ) : (
            <div className="divide-y divide-border">
              {aulasHoje.map(aula => {
                const exp = explicadores.find(e => e.id === aula.explicadorId);
                const sala = salas.find(s => s.id === aula.salaId);
                return (
                  <div key={aula.id} className="flex items-center gap-4 py-3">
                    <span className="text-sm font-bold text-primary font-mono w-12 shrink-0">
                      {aula.horaInicio}
                    </span>
                    <div className="border-l-[3px] border-primary pl-3 flex-1 min-w-0">
                      <p className="text-sm font-bold font-heading truncate">{aula.disciplina}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <UserRound className="h-3 w-3 shrink-0" />
                          {exp?.nome ?? "—"}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {sala?.nome ?? "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-4 pt-3 border-t border-border">
            <Button variant="outline" className="w-full font-medium" asChild>
              <Link to="/calendario">Ver Calendário Completo</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
