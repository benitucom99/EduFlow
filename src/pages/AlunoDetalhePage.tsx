import { useParams, useNavigate } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DiscBadge } from "@/components/DiscBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Mail, Phone, School, Calendar, MapPin, CalendarClock, Plus, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { AlunoHorario } from "@/contexts/DataContext";
import { HorarioGeradorModal } from "@/components/HorarioGeradorModal";
import { diaSemanaCurto } from "@/lib/horarios";

const presencaBadge = (p: string | null) => {
  if (p === "presente") return <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">Presente</span>;
  if (p === "falta_justificada") return <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning font-medium">F. Justificada</span>;
  if (p === "falta_injustificada") return <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">F. Injustificada</span>;
  return <span className="text-xs text-muted-foreground">—</span>;
};

export default function AlunoDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { alunos, aulas, explicadores, disciplinas, alunoHorarios } = useData();
  const aluno = alunos.find(a => a.id === id);

  const horariosDoAluno = useMemo(
    () => alunoHorarios.filter(h => h.alunoId === id),
    [alunoHorarios, id]
  );
  const [horarioModal, setHorarioModal] = useState<{ open: boolean; horario: AlunoHorario | null }>({ open: false, horario: null });

  const aulasDoAluno = useMemo(() => {
    return aulas
      .filter(a => a.alunoIds.includes(id!) && a.estado !== "cancelada")
      .sort((a, b) => b.data.localeCompare(a.data));
  }, [aulas, id]);

  const stats = useMemo(() => {
    const total = aulasDoAluno.length;
    const presentes = aulasDoAluno.filter(a => a.presencas[id!] === "presente").length;
    const fj = aulasDoAluno.filter(a => a.presencas[id!] === "falta_justificada").length;
    const fi = aulasDoAluno.filter(a => a.presencas[id!] === "falta_injustificada").length;
    // Taxa calculada sobre aulas com presença registada — exclui as ainda por realizar.
    const comPresenca = presentes + fj + fi;
    return { total, presentes, fj, fi, taxa: comPresenca > 0 ? Math.round((presentes / comPresenca) * 100) : 0 };
  }, [aulasDoAluno, id]);

  if (!aluno) return <div className="p-6">Aluno não encontrado</div>;

  const estadoMap: Record<string, string> = { ativo: "bg-success text-success-foreground", inativo: "bg-muted text-muted-foreground", "pre-inscrito": "bg-warning text-warning-foreground" };

  return (
    <div className="space-y-6 animate-fade-in">
      <Button variant="ghost" onClick={() => navigate("/alunos")}><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <Card className="lg:col-span-1">
          <CardContent className="p-6 space-y-4">
            <div className="text-center">
              <div className="h-20 w-20 mx-auto rounded-full bg-accent flex items-center justify-center text-2xl font-bold text-accent-foreground mb-3">
                {aluno.nome?.split(" ").map(n => n[0]).join("").slice(0, 2) || "U"}
              </div>
              <h2 className="text-xl font-bold">{aluno.nome}</h2>
              <div className="flex justify-center gap-2 mt-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoMap[aluno.estado]}`}>{aluno.estado}</span>
                <Badge variant="outline">{aluno.anoLetivo}º ano escolar</Badge>
              </div>
            </div>
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-3 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /> {aluno.email}</div>
              <div className="flex items-center gap-3 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /> {aluno.telefone}</div>
              <div className="flex items-center gap-3 text-sm"><School className="h-4 w-4 text-muted-foreground" /> {aluno.escola}</div>
              {aluno.morada && <div className="flex items-center gap-3 text-sm"><MapPin className="h-4 w-4 text-muted-foreground shrink-0" /> {aluno.morada}</div>}
              <div className="flex items-center gap-3 text-sm"><Calendar className="h-4 w-4 text-muted-foreground" /> {aluno.dataInscricao}</div>
            </div>
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">Disciplinas</p>
              {(() => {
                const entries = Object.entries(aluno.disciplinaExplicadores ?? {});
                if (entries.length === 0) {
                  return <div className="flex flex-wrap gap-1">{aluno.disciplinas.map(d => <DiscBadge key={d} nome={d} />)}</div>;
                }
                return (
                  <div className="space-y-2">
                    {entries.map(([discId, expId]) => {
                      const nome = disciplinas.find(d => d.id === discId)?.nome;
                      if (!nome) return null;
                      const tutor = expId ? explicadores.find(e => e.id === expId)?.nome : null;
                      return (
                        <div key={discId} className="flex items-center justify-between gap-2">
                          <DiscBadge nome={nome} />
                          <span className="text-xs text-muted-foreground truncate">{tutor ?? "Sem professor"}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">Encarregado de Educação</p>
              <p className="text-sm font-medium">{aluno.encarregado.nome}</p>
              <p className="text-xs text-muted-foreground">{aluno.encarregado.email}</p>
              <p className="text-xs text-muted-foreground">{aluno.encarregado.telefone}</p>
              {aluno.nifEncarregado && <p className="text-xs text-muted-foreground">NIF: {aluno.nifEncarregado}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="aulas">
            <TabsList>
              <TabsTrigger value="aulas">Aulas</TabsTrigger>
              <TabsTrigger value="presencas">Presenças</TabsTrigger>
              <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
            </TabsList>
            <TabsContent value="aulas" className="space-y-4">
              {/* Horários Base configurados — o calendário é submisso a estes */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-primary" /> Horários Base
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setHorarioModal({ open: true, horario: null })}>
                    <Plus className="h-4 w-4 mr-1" /> Novo horário
                  </Button>
                </CardHeader>
                <CardContent className="pt-0">
                  {horariosDoAluno.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      Sem horários recorrentes configurados. Cria um para gerar as aulas automaticamente no calendário.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {horariosDoAluno.map(h => {
                        const exp = h.explicadorId ? explicadores.find(e => e.id === h.explicadorId)?.nome : null;
                        return (
                          <div key={h.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">{h.disciplina}</Badge>
                                <span className="text-xs text-muted-foreground">{exp ?? "Sem professor"} · {h.duracaoMin} min</span>
                              </div>
                              <p className="text-sm mt-1.5 font-medium">
                                {h.slots.length === 0
                                  ? "Sem dias definidos"
                                  : h.slots.map(s => `${diaSemanaCurto(s.diaSemana)} ${s.horaInicio}`).join(" · ")}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {h.anoLetivoInteiro ? "Ano letivo inteiro" : "Período personalizado"} · até {h.dataFim}
                              </p>
                            </div>
                            <Button
                              size="icon" variant="ghost" className="h-8 w-8 shrink-0"
                              onClick={() => setHorarioModal({ open: true, horario: h })}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Disciplina</TableHead>
                        <TableHead>Explicador</TableHead>
                        <TableHead>Presença</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aulasDoAluno.slice(0, 15).map(aula => {
                        const exp = explicadores.find(e => e.id === aula.explicadorId);
                        return (
                          <TableRow key={aula.id}>
                            <TableCell className="text-sm">{aula.data} {aula.horaInicio}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{aula.disciplina}</Badge></TableCell>
                            <TableCell className="text-sm">{exp?.nome}</TableCell>
                            <TableCell>{presencaBadge(aula.presencas[aluno.id])}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="presencas">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                {[
                  { label: "Total Aulas", value: stats.total },
                  { label: "Taxa Presença", value: `${stats.taxa}%` },
                  { label: "F. Justificadas", value: stats.fj },
                  { label: "F. Injustificadas", value: stats.fi },
                ].map(s => (
                  <Card key={s.label}><CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </CardContent></Card>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="financeiro">
              <Card><CardContent className="py-16 text-center">
                <p className="text-muted-foreground">Módulo de faturação disponível em breve</p>
              </CardContent></Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <HorarioGeradorModal
        open={horarioModal.open}
        onClose={() => setHorarioModal({ open: false, horario: null })}
        aluno={aluno}
        horario={horarioModal.horario}
      />
    </div>
  );
}
