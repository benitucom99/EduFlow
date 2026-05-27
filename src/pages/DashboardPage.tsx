import { useMemo, useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, Wallet, CheckCircle2, CalendarDays, UserRound, MapPin } from "lucide-react";

import { isToday, isTomorrow, parseISO, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { calcularCobrancaAlunos } from "@/lib/faturacao";

function relativeDay(dateStr: string): string {
  try {
    const d = parseISO(dateStr);
    if (isToday(d)) return "Hoje";
    if (isTomorrow(d)) return "Amanhã";
    const days = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    return days[d.getDay()];
  } catch { return dateStr; }
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { alunos, aulas, explicadores, salas, disciplinas } = useData();

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const stats = useMemo(() => {
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const ativos = alunos.filter(a => a.estado === "ativo").length;
    const aulasEstaSemana = aulas.filter(a => {
      if (a.estado === "cancelada") return false;
      try {
        const d = parseISO(a.data);
        return isWithinInterval(d, { start: weekStart, end: weekEnd });
      } catch { return false; }
    }).length;

    const aulasDoMes = aulas.filter(a => {
      if (a.estado === "cancelada") return false;
      try {
        const d = parseISO(a.data);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      } catch { return false; }
    });

    // Taxa de assiduidade: presentes / total de registos de presença preenchidos.
    let totalPresencas = 0;
    let totalPresente = 0;
    for (const aula of aulasDoMes) {
      for (const p of Object.values(aula.presencas)) {
        if (p !== null) {
          totalPresencas++;
          if (p === "presente") totalPresente++;
        }
      }
    }
    const assiduidade = totalPresencas > 0 ? Math.round((totalPresente / totalPresencas) * 100) : 0;

    // Receita mensal: mesma lógica da faturação (presenças "presente" × preço/hora
    // × duração × (1 - desconto)). Reutiliza a lib para bater certo com a página Faturação.
    const mm = String(currentMonth + 1).padStart(2, "0");
    const receita = calcularCobrancaAlunos(
      aulas, alunos, disciplinas,
      `${currentYear}-${mm}-01`, `${currentYear}-${mm}-31`,
    ).reduce((s, r) => s + r.valorTotal, 0);

    return { ativos, aulasEstaSemana, receita, assiduidade };
  }, [alunos, aulas, disciplinas, now]);

  const proximasAulas = useMemo(() => {
    return aulas
      .filter(a => {
        if (a.estado === "cancelada") return false;
        try {
          const [h, m] = a.horaFim.split(":").map(Number);
          const fim = parseISO(a.data);
          fim.setHours(h, m, 0, 0);
          return fim > now;
        } catch { return false; }
      })
      .sort((a, b) => {
        const diff = a.data.localeCompare(b.data);
        return diff !== 0 ? diff : a.horaInicio.localeCompare(b.horaInicio);
      })
      .slice(0, 5);
  }, [aulas, now]);

  const formatReceita = (v: number) =>
    v >= 1000 ? `${(v / 1000).toFixed(1)}k €` : `${Math.round(v)} €`;

  const kpis = [
    { label: "Total de Alunos", value: stats.ativos.toLocaleString("pt-PT"), icon: Users, iconBg: "bg-slate-100", iconColor: "text-slate-600" },
    { label: "Aulas Esta Semana", value: stats.aulasEstaSemana, icon: BookOpen, iconBg: "bg-amber-100", iconColor: "text-amber-500" },
    { label: "Receita Mensal", value: formatReceita(stats.receita), icon: Wallet, iconBg: "bg-emerald-100", iconColor: "text-emerald-500" },
    { label: "Taxa de Assiduidade", value: `${stats.assiduidade}%`, icon: CheckCircle2, iconBg: "bg-violet-100", iconColor: "text-violet-500" },
  ];

  // Explicadores não têm Dashboard — entram diretamente no calendário.
  if (user?.role === "explicador") return <Navigate to="/calendario" replace />;

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
          <CardTitle className="text-base font-bold">Próximas Aulas</CardTitle>
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pt-0">
          {proximasAulas.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Sem aulas futuras agendadas</p>
          ) : (
            <div className="divide-y divide-border">
              {proximasAulas.map(aula => {
                const exp = explicadores.find(e => e.id === aula.explicadorId);
                const sala = salas.find(s => s.id === aula.salaId);
                return (
                  <div key={aula.id} className="flex items-center gap-4 py-3">
                    <div className="shrink-0 w-24">
                      <p className="text-xs text-muted-foreground">{relativeDay(aula.data)}</p>
                      <p className="text-sm font-bold text-primary font-sans tabular-nums">{aula.horaInicio}</p>
                    </div>
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
