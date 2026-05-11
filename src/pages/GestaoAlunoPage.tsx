import { useState, useMemo } from "react";
import { useData } from "@/contexts/DataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Check, AlertTriangle, X, Calendar, Clock, TrendingUp, TrendingDown, Minus, Search } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Presenca, disciplinaHslColors } from "@/data/mockData";

interface NotaAluno { alunoId: string; disciplina: string; periodo: string; nota: number; }

const mockNotas: NotaAluno[] = [
  { alunoId: "a1", disciplina: "Matemática", periodo: "1º Período", nota: 12 },
  { alunoId: "a1", disciplina: "Matemática", periodo: "2º Período", nota: 14 },
  { alunoId: "a1", disciplina: "Matemática", periodo: "3º Período", nota: 16 },
  { alunoId: "a1", disciplina: "Física e Química", periodo: "1º Período", nota: 13 },
  { alunoId: "a1", disciplina: "Física e Química", periodo: "2º Período", nota: 14 },
  { alunoId: "a2", disciplina: "Matemática", periodo: "1º Período", nota: 15 },
  { alunoId: "a2", disciplina: "Matemática", periodo: "2º Período", nota: 16 },
  { alunoId: "a2", disciplina: "Biologia e Geologia", periodo: "1º Período", nota: 14 },
  { alunoId: "a3", disciplina: "Português", periodo: "1º Período", nota: 11 },
  { alunoId: "a3", disciplina: "Português", periodo: "2º Período", nota: 13 },
];
const periodos = ["1º Período", "2º Período", "3º Período"];

interface Atraso { alunoId: string; aulaId: string; minutos: number; }

function notaColor(n: number) {
  if (n >= 16) return "text-success";
  if (n >= 14) return "text-primary";
  if (n >= 10) return "text-warning";
  return "text-destructive";
}

export default function GestaoAlunoPage() {
  const { aulas, setAulas, alunos, explicadores, salas } = useData();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [expFilter, setExpFilter] = useState("todos");
  const [discFilter, setDiscFilter] = useState("todas");
  const [alunoSearch, setAlunoSearch] = useState("");
  const [selectedAlunoId, setSelectedAlunoId] = useState<string | null>(null);
  const [atrasos, setAtrasos] = useState<Atraso[]>([]);

  // ----- PRESENÇAS -----
  const aulasDodia = useMemo(() => {
    return aulas
      .filter(a => a.data === selectedDate && a.estado !== "cancelada")
      .filter(a => expFilter === "todos" || a.explicadorId === expFilter)
      .filter(a => discFilter === "todas" || a.disciplina === discFilter)
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  }, [aulas, selectedDate, expFilter, discFilter]);

  const resumo = useMemo(() => {
    const total = aulasDodia.length;
    const registadas = aulasDodia.filter(a => Object.values(a.presencas).some(p => p !== null)).length;
    const todosAlunos = aulasDodia.flatMap(a => a.alunoIds);
    const presentes = aulasDodia.reduce((sum, a) => sum + a.alunoIds.filter(id => a.presencas[id] === "presente").length, 0);
    const fi = aulasDodia.reduce((sum, a) => sum + a.alunoIds.filter(id => a.presencas[id] === "falta_injustificada").length, 0);
    return { total, registadas, taxa: todosAlunos.length > 0 ? Math.round((presentes / todosAlunos.length) * 100) : 0, fi };
  }, [aulasDodia]);

  const updatePresenca = (aulaId: string, alunoId: string, presenca: Presenca) => {
    setAulas(prev => prev.map(a => a.id === aulaId ? { ...a, presencas: { ...a.presencas, [alunoId]: presenca } } : a));
  };

  const setAtraso = (aulaId: string, alunoId: string, minutos: number) => {
    setAtrasos(prev => {
      const filtered = prev.filter(a => !(a.aulaId === aulaId && a.alunoId === alunoId));
      return minutos > 0 ? [...filtered, { aulaId, alunoId, minutos }] : filtered;
    });
  };

  const getAtraso = (aulaId: string, alunoId: string) =>
    atrasos.find(a => a.aulaId === aulaId && a.alunoId === alunoId)?.minutos ?? 0;

  // ----- NOTAS / EVOLUÇÃO -----
  const alunosFiltrados = alunos.filter(a =>
    a.nome.toLowerCase().includes(alunoSearch.toLowerCase())
  );
  const selectedAluno = alunos.find(a => a.id === selectedAlunoId);

  const notasDoAluno = useMemo(() => {
    if (!selectedAlunoId) return new Map<string, Map<string, number>>();
    const map = new Map<string, Map<string, number>>();
    for (const n of mockNotas.filter(n => n.alunoId === selectedAlunoId)) {
      if (!map.has(n.disciplina)) map.set(n.disciplina, new Map());
      map.get(n.disciplina)!.set(n.periodo, n.nota);
    }
    return map;
  }, [selectedAlunoId]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Gestão do Aluno</h1>
        <p className="text-muted-foreground text-sm">Presenças, atrasos e evolução das notas</p>
      </div>

      <Tabs defaultValue="presencas">
        <TabsList>
          <TabsTrigger value="presencas">Presenças</TabsTrigger>
          <TabsTrigger value="atrasos">Atrasos</TabsTrigger>
          <TabsTrigger value="notas">Evolução de Notas</TabsTrigger>
        </TabsList>

        {/* PRESENÇAS */}
        <TabsContent value="presencas" className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-[180px]" />
            <Select value={expFilter} onValueChange={setExpFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Explicador" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {explicadores.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={discFilter} onValueChange={setDiscFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Disciplina" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {["Matemática", "Português", "Inglês", "Física e Química", "Biologia e Geologia", "Economia"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{resumo.total}</p><p className="text-xs text-muted-foreground">Total aulas</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{resumo.registadas}/{resumo.total}</p>
              <Progress value={resumo.total > 0 ? (resumo.registadas / resumo.total) * 100 : 0} className="mt-2 h-1.5" />
              <p className="text-xs text-muted-foreground mt-1">Registadas</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{resumo.taxa}%</p><p className="text-xs text-muted-foreground">Taxa presença</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className={`text-2xl font-bold ${resumo.fi > 0 ? "text-destructive" : ""}`}>{resumo.fi}</p><p className="text-xs text-muted-foreground">F. Injustificadas</p></CardContent></Card>
          </div>

          {aulasDodia.length === 0 ? (
            <Card><CardContent className="py-16 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Sem aulas para esta data</p>
            </CardContent></Card>
          ) : aulasDodia.map(aula => {
            const exp = explicadores.find(e => e.id === aula.explicadorId);
            const sala = salas.find(s => s.id === aula.salaId);
            return (
              <Card key={aula.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-sans font-medium tabular-nums">{aula.horaInicio} - {aula.horaFim}</span>
                      <Badge style={{ backgroundColor: `${disciplinaHslColors[aula.disciplina]}20`, color: disciplinaHslColors[aula.disciplina], border: "none" }}>{aula.disciplina}</Badge>
                      <span className="text-sm text-muted-foreground">{sala?.nome}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{exp?.nome} · {aula.tipo === "grupo" ? "Grupo" : "Individual"}</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {aula.alunoIds.map(alunoId => {
                    const al = alunos.find(a => a.id === alunoId);
                    const p = aula.presencas[alunoId];
                    const bgMap: Record<string, string> = { presente: "bg-success/5", falta_justificada: "bg-warning/5", falta_injustificada: "bg-destructive/5" };
                    return (
                      <div key={alunoId} className={`flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg ${p ? bgMap[p] || "bg-muted/30" : "bg-muted/30"}`}>
                        <span className="text-sm font-medium flex-1 min-w-[140px]">{al?.nome}</span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => updatePresenca(aula.id, alunoId, "presente")} className={`p-2 rounded-lg transition-colors ${p === "presente" ? "bg-success text-success-foreground" : "bg-muted hover:bg-muted/80"}`}><Check className="h-4 w-4" /></button>
                          <button onClick={() => updatePresenca(aula.id, alunoId, "falta_justificada")} className={`p-2 rounded-lg transition-colors ${p === "falta_justificada" ? "bg-warning text-warning-foreground" : "bg-muted hover:bg-muted/80"}`}><AlertTriangle className="h-4 w-4" /></button>
                          <button onClick={() => updatePresenca(aula.id, alunoId, "falta_injustificada")} className={`p-2 rounded-lg transition-colors ${p === "falta_injustificada" ? "bg-destructive text-destructive-foreground" : "bg-muted hover:bg-muted/80"}`}><X className="h-4 w-4" /></button>
                          <div className="flex items-center gap-1 ml-2 pl-2 border-l">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <Input
                              type="number" min="0" max="180"
                              value={getAtraso(aula.id, alunoId) || ""}
                              onChange={e => setAtraso(aula.id, alunoId, parseInt(e.target.value) || 0)}
                              placeholder="0"
                              className="w-16 h-8 text-xs"
                            />
                            <span className="text-xs text-muted-foreground">min</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <Button size="sm" className="mt-2" onClick={() => toast({ title: "Registo guardado" })}>Guardar</Button>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* ATRASOS */}
        <TabsContent value="atrasos">
          <Card>
            <CardHeader><CardTitle className="text-base">Atrasos registados</CardTitle></CardHeader>
            <CardContent className="p-0">
              {atrasos.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">Sem atrasos registados ainda. Use o campo "min" no separador Presenças para registar atrasos.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Aluno</TableHead><TableHead>Data</TableHead><TableHead>Disciplina</TableHead><TableHead>Atraso</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {atrasos.map(a => {
                      const aula = aulas.find(x => x.id === a.aulaId);
                      const al = alunos.find(x => x.id === a.alunoId);
                      return (
                        <TableRow key={`${a.aulaId}-${a.alunoId}`}>
                          <TableCell className="text-sm">{al?.nome}</TableCell>
                          <TableCell className="text-sm">{aula?.data} {aula?.horaInicio}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{aula?.disciplina}</Badge></TableCell>
                          <TableCell><Badge className="bg-warning/15 text-warning border-warning/30">{a.minutos} min</Badge></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* NOTAS */}
        <TabsContent value="notas" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Selecionar aluno</CardTitle>
                <div className="relative mt-2">
                  <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar..."
                    value={alunoSearch}
                    onChange={e => setAlunoSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0 max-h-[500px] overflow-y-auto">
                {alunosFiltrados.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAlunoId(a.id)}
                    className={`w-full text-left px-4 py-2 text-sm border-b hover:bg-muted/50 transition-colors ${selectedAlunoId === a.id ? "bg-muted" : ""}`}
                  >
                    <p className="font-medium">{a.nome}</p>
                    <p className="text-xs text-muted-foreground">{a.anoLetivo}º ano · {a.escola}</p>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">
                  {selectedAluno ? `Evolução — ${selectedAluno.nome}` : "Selecione um aluno"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedAluno ? (
                  <p className="text-sm text-muted-foreground">Escolha um aluno na lista para ver as notas.</p>
                ) : notasDoAluno.size === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem notas registadas para este aluno.</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Disciplina</TableHead>
                      {periodos.map(p => <TableHead key={p} className="text-center">{p}</TableHead>)}
                      <TableHead className="text-center">Tendência</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {Array.from(notasDoAluno.entries()).map(([disc, mp]) => {
                        const values = periodos.map(p => mp.get(p));
                        const valid = values.filter((v): v is number => v !== undefined);
                        const last = valid[valid.length - 1];
                        const prev = valid.length >= 2 ? valid[valid.length - 2] : last;
                        return (
                          <TableRow key={disc}>
                            <TableCell><Badge variant="outline" className="text-xs">{disc}</Badge></TableCell>
                            {periodos.map(p => {
                              const n = mp.get(p);
                              return (
                                <TableCell key={p} className="text-center">
                                  {n !== undefined ? <span className={`font-bold text-lg ${notaColor(n)}`}>{n}</span> : <span className="text-muted-foreground">—</span>}
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-center">
                              {valid.length >= 2 && (
                                <span className="inline-flex items-center gap-1 text-xs">
                                  {last > prev ? <TrendingUp className="h-3 w-3 text-success" /> :
                                    last < prev ? <TrendingDown className="h-3 w-3 text-destructive" /> :
                                      <Minus className="h-3 w-3 text-muted-foreground" />}
                                  {last > prev ? `+${last - prev}` : last < prev ? `${last - prev}` : "="}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
