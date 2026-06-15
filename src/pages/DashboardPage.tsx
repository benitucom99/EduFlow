import { useMemo, useState, useEffect } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useData, Presenca, ReposicaoEstado } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, BookOpen, Wallet, CheckCircle2, CalendarDays, UserRound, MapPin, RotateCcw } from "lucide-react";

import { isToday, isTomorrow, parseISO, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { calcularCobrancaAlunos } from "@/lib/faturacao";

// Linha de "Presenças em falta": aula/aluno por registar + dados para a tabela.
type FaltaPendente = {
  aulaId: string;
  alunoId: string;
  data: string;
  horaInicio: string;
  alunoNome: string;
  professor: string;
  disciplina: string;
};

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
  const { alunos, aulas, explicadores, salas, disciplinas, setPresenca } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Pop-up "Ver mais" (lista completa) e fluxo de registo de presença.
  const [verTodasFaltas, setVerTodasFaltas] = useState(false);
  const [registar, setRegistar] = useState<FaltaPendente | null>(null);
  const [pendingFalta, setPendingFalta] = useState<{ tipo: "justificada" | "injustificada" } | null>(null);

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

  // Faltas justificadas com reposição por agendar (reposicaoEstado === "pendente").
  const reposicoesPendentes = useMemo(() => {
    const alunoMap = new Map(alunos.map(a => [a.id, a.nome]));
    const lista: { aulaId: string; alunoId: string; data: string; alunoNome: string; disciplina: string }[] = [];
    for (const aula of aulas) {
      if (aula.estado === "cancelada") continue;
      for (const alunoId of aula.alunoIds) {
        if (aula.presencaInfo[alunoId]?.reposicaoEstado === "pendente") {
          lista.push({
            aulaId: aula.id,
            alunoId,
            data: aula.data,
            alunoNome: alunoMap.get(alunoId) ?? "—",
            disciplina: aula.disciplina,
          });
        }
      }
    }
    return lista.sort((a, b) => b.data.localeCompare(a.data));
  }, [aulas, alunos]);

  // Presenças por registar: aulas que JÁ terminaram mas têm alunos sem
  // presença marcada (presencas[alunoId] nulo/indefinido).
  const presencasEmFalta = useMemo<FaltaPendente[]>(() => {
    const alunoMap = new Map(alunos.map(a => [a.id, a.nome]));
    const profMap = new Map(explicadores.map(e => [e.id, e.nome]));
    const lista: FaltaPendente[] = [];
    for (const aula of aulas) {
      if (aula.estado === "cancelada") continue;
      let terminou = false;
      try {
        const [h, m] = aula.horaFim.split(":").map(Number);
        const fim = parseISO(aula.data);
        fim.setHours(h, m, 0, 0);
        terminou = fim < now;
      } catch { continue; }
      if (!terminou) continue;
      for (const alunoId of aula.alunoIds) {
        if (aula.presencas[alunoId] == null) {
          lista.push({
            aulaId: aula.id,
            alunoId,
            data: aula.data,
            horaInicio: aula.horaInicio,
            alunoNome: alunoMap.get(alunoId) ?? "—",
            professor: profMap.get(aula.explicadorId) ?? "—",
            disciplina: aula.disciplina,
          });
        }
      }
    }
    return lista.sort((a, b) => b.data.localeCompare(a.data) || a.horaInicio.localeCompare(b.horaInicio));
  }, [aulas, alunos, explicadores, now]);

  // ── Registo de presença a partir do Dashboard (mesma lógica da pág. Presenças) ─
  const updatePresenca = async (
    aulaId: string,
    alunoId: string,
    presenca: Presenca,
    extra?: { reposicaoEstado?: ReposicaoEstado; cobrarFalta?: boolean | null }
  ) => {
    try {
      await setPresenca(aulaId, alunoId, presenca, extra);
      toast({ title: "Presença registada" });
    } catch {
      toast({ title: "Erro ao registar presença", description: "A alteração foi revertida. Tenta novamente.", variant: "destructive" });
    }
  };

  // Presente grava direto e fecha; faltas abrem o pop-up de detalhe correspondente.
  const requestPresenca = (presenca: Presenca) => {
    if (!registar) return;
    if (presenca === "falta_justificada") {
      setPendingFalta({ tipo: "justificada" });
    } else if (presenca === "falta_injustificada") {
      setPendingFalta({ tipo: "injustificada" });
    } else {
      updatePresenca(registar.aulaId, registar.alunoId, presenca);
      setRegistar(null);
    }
  };

  const confirmReposicao = (estado: Exclude<ReposicaoEstado, null>, redirect: boolean) => {
    if (!registar) return;
    updatePresenca(registar.aulaId, registar.alunoId, "falta_justificada", { reposicaoEstado: estado });
    const aluno = registar;
    setPendingFalta(null);
    setRegistar(null);
    if (redirect) navigate("/calendario", { state: { reposicao: { alunoId: aluno.alunoId, aulaOriginalId: aluno.aulaId } } });
  };

  const confirmInjustificada = (cobrar: boolean) => {
    if (!registar) return;
    updatePresenca(registar.aulaId, registar.alunoId, "falta_injustificada", { cobrarFalta: cobrar });
    setPendingFalta(null);
    setRegistar(null);
  };

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

      {/* Reposições pendentes + presenças em falta (1/2 largura cada). */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-bold">Faltas justificadas - Aulas por repor</CardTitle>
            <RotateCcw className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            {reposicoesPendentes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem reposições pendentes</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Data original</th>
                      <th className="py-2 pr-3 font-medium">Aluno</th>
                      <th className="py-2 pr-3 font-medium">Disciplina</th>
                      <th className="py-2 font-medium text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {reposicoesPendentes.map(r => (
                      <tr key={`${r.aulaId}-${r.alunoId}`}>
                        <td className="py-2 pr-3 tabular-nums">{r.data.split("-").reverse().join("/")}</td>
                        <td className="py-2 pr-3 truncate max-w-[120px]">{r.alunoNome}</td>
                        <td className="py-2 pr-3 truncate max-w-[120px]">{r.disciplina}</td>
                        <td className="py-2 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate("/calendario", { state: { reposicao: { alunoId: r.alunoId, aulaOriginalId: r.aulaId } } })}
                          >
                            Marcar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-bold">Presenças em falta</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            {presencasEmFalta.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem presenças por registar</p>
            ) : (
              <>
                <FaltasTable rows={presencasEmFalta.slice(0, 5)} onRegistar={setRegistar} />
                {presencasEmFalta.length > 5 && (
                  <div className="mt-4 pt-3 border-t border-border">
                    <Button variant="outline" className="w-full font-medium" onClick={() => setVerTodasFaltas(true)}>
                      Ver mais ({presencasEmFalta.length})
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pop-up "Ver mais" — todas as presenças em falta */}
      <Dialog open={verTodasFaltas} onOpenChange={setVerTodasFaltas}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Presenças em falta ({presencasEmFalta.length})</DialogTitle>
            <DialogDescription>Aulas terminadas com presenças por registar.</DialogDescription>
          </DialogHeader>
          <FaltasTable rows={presencasEmFalta} onRegistar={setRegistar} />
        </DialogContent>
      </Dialog>

      {/* Pop-up Registar Presença — botões iguais à página Presenças */}
      <Dialog open={!!registar && !pendingFalta} onOpenChange={open => { if (!open) setRegistar(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registar presença</DialogTitle>
            <DialogDescription>
              {registar && (
                <>
                  {registar.alunoNome} · {registar.disciplina}
                  <br />
                  {registar.data.split("-").reverse().join("/")} às {registar.horaInicio} · {registar.professor}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Button variant="outline" className="border-success/30 bg-success/15 text-success hover:bg-success/25 justify-start" onClick={() => requestPresenca("presente")}>Presente</Button>
            <Button variant="outline" className="border-warning/30 bg-warning/15 text-warning hover:bg-warning/25 justify-start" onClick={() => requestPresenca("falta_justificada")}>Falta justificada</Button>
            <Button variant="outline" className="border-destructive/30 bg-destructive/15 text-destructive hover:bg-destructive/25 justify-start" onClick={() => requestPresenca("falta_injustificada")}>Falta injustificada</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pop-up Falta Justificada — agendar reposição? */}
      <Dialog open={pendingFalta?.tipo === "justificada"} onOpenChange={open => { if (!open) setPendingFalta(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Falta Justificada</DialogTitle>
            <DialogDescription>Deseja agendar aula de reposição?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="border-success/30 bg-success/15 text-success hover:bg-success/25" onClick={() => confirmReposicao("pendente", true)}>Sim</Button>
            <Button variant="outline" className="border-warning/30 bg-warning/15 text-warning hover:bg-warning/25" onClick={() => confirmReposicao("pendente", false)}>Pendente</Button>
            <Button variant="outline" className="border-destructive/30 bg-destructive/15 text-destructive hover:bg-destructive/25" onClick={() => confirmReposicao("nao", false)}>Não</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pop-up Falta Injustificada — cobrar ao aluno? */}
      <Dialog open={pendingFalta?.tipo === "injustificada"} onOpenChange={open => { if (!open) setPendingFalta(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Falta Injustificada</DialogTitle>
            <DialogDescription>Cobrar ao Aluno?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button autoFocus variant="outline" className="border-success/30 bg-success/15 text-success hover:bg-success/25" onClick={() => confirmInjustificada(true)}>Sim</Button>
            <Button variant="outline" className="border-destructive/30 bg-destructive/15 text-destructive hover:bg-destructive/25" onClick={() => confirmInjustificada(false)}>Não</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

// Tabela de presenças em falta: data – hora – aluno – professor – disciplina + ação.
// Reutilizada no card (limitada a 5) e no pop-up "Ver mais" (lista completa).
function FaltasTable({ rows, onRegistar }: { rows: FaltaPendente[]; onRegistar: (r: FaltaPendente) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Data</th>
            <th className="py-2 pr-3 font-medium">Hora</th>
            <th className="py-2 pr-3 font-medium">Aluno</th>
            <th className="py-2 pr-3 font-medium">Professor</th>
            <th className="py-2 pr-3 font-medium">Disciplina</th>
            <th className="py-2 font-medium text-right">Ação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map(p => (
            <tr key={`${p.aulaId}-${p.alunoId}`}>
              <td className="py-2 pr-3 tabular-nums">{p.data.split("-").reverse().join("/")}</td>
              <td className="py-2 pr-3 tabular-nums">{p.horaInicio}</td>
              <td className="py-2 pr-3 truncate max-w-[120px]">{p.alunoNome}</td>
              <td className="py-2 pr-3 truncate max-w-[120px]">{p.professor}</td>
              <td className="py-2 pr-3 truncate max-w-[120px]">{p.disciplina}</td>
              <td className="py-2 text-right">
                <Button size="sm" variant="outline" onClick={() => onRegistar(p)}>
                  Registar
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
