import { useState, useMemo } from "react";
import { useData } from "@/contexts/DataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Check, AlertTriangle, X, Calendar } from "lucide-react";
import { format, parseISO, isToday, subDays } from "date-fns";
import { pt } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Presenca, disciplinaHslColors } from "@/data/mockData";

export default function PresencasPage() {
  const { aulas, setAulas, alunos, explicadores, salas } = useData();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [expFilter, setExpFilter] = useState("todos");
  const [discFilter, setDiscFilter] = useState("todas");
  const [motivos, setMotivos] = useState<Record<string, string>>({});

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

  const historico = useMemo(() => {
    return aulas
      .filter(a => a.estado === "realizada" && Object.values(a.presencas).some(p => p !== null))
      .sort((a, b) => b.data.localeCompare(a.data))
      .slice(0, 30);
  }, [aulas]);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Registo de Presenças</h1>

      <div className="flex flex-wrap gap-3 items-center">
        <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-[180px]" />
        <Select value={expFilter} onValueChange={setExpFilter}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Explicador" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem>{explicadores.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent></Select>
        <Select value={discFilter} onValueChange={setDiscFilter}><SelectTrigger className="w-[160px]"><SelectValue placeholder="Disciplina" /></SelectTrigger><SelectContent><SelectItem value="todas">Todas</SelectItem>{["Matemática", "Português", "Inglês", "Física e Química", "Biologia e Geologia", "Economia"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
      </div>

      {/* Summary */}
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

      <Tabs defaultValue="hoje">
        <TabsList><TabsTrigger value="hoje">Aulas do Dia</TabsTrigger><TabsTrigger value="historico">Histórico</TabsTrigger></TabsList>

        <TabsContent value="hoje" className="space-y-4">
          {aulasDodia.length === 0 ? (
            <Card><CardContent className="py-16 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Sem aulas para esta data</p>
            </CardContent></Card>
          ) : aulasDodia.map(aula => {
            const exp = explicadores.find(e => e.id === aula.explicadorId);
            const sala = salas.find(s => s.id === aula.salaId);
            const allMarked = aula.alunoIds.every(id => aula.presencas[id] !== null && aula.presencas[id] !== undefined);
            return (
              <Card key={aula.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-sans font-medium tabular-nums">{aula.horaInicio} - {aula.horaFim}</span>
                      <Badge style={{ backgroundColor: `${disciplinaHslColors[aula.disciplina]}20`, color: disciplinaHslColors[aula.disciplina], border: "none" }}>{aula.disciplina}</Badge>
                      <span className="text-sm text-muted-foreground">{sala?.nome}</span>
                    </div>
                    <Badge variant={allMarked ? "default" : "secondary"} className={allMarked ? "bg-success text-success-foreground" : ""}>
                      {allMarked ? "Registadas ✓" : "Pendente"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{exp?.nome} · {aula.tipo === "grupo" ? "Grupo" : "Individual"}</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {aula.alunoIds.map(alunoId => {
                    const al = alunos.find(a => a.id === alunoId);
                    const p = aula.presencas[alunoId];
                    const bgMap: Record<string, string> = { presente: "bg-success/5", falta_justificada: "bg-warning/5", falta_injustificada: "bg-destructive/5" };
                    return (
                      <div key={alunoId} className={`flex items-center justify-between p-3 rounded-lg ${p ? bgMap[p] || "bg-muted/30" : "bg-muted/30"}`}>
                        <span className="text-sm font-medium">{al?.nome}</span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => updatePresenca(aula.id, alunoId, "presente")} className={`p-2 rounded-lg transition-colors ${p === "presente" ? "bg-success text-success-foreground" : "bg-muted hover:bg-muted/80"}`}><Check className="h-4 w-4" /></button>
                          <button onClick={() => updatePresenca(aula.id, alunoId, "falta_justificada")} className={`p-2 rounded-lg transition-colors ${p === "falta_justificada" ? "bg-warning text-warning-foreground" : "bg-muted hover:bg-muted/80"}`}><AlertTriangle className="h-4 w-4" /></button>
                          <button onClick={() => updatePresenca(aula.id, alunoId, "falta_injustificada")} className={`p-2 rounded-lg transition-colors ${p === "falta_injustificada" ? "bg-destructive text-destructive-foreground" : "bg-muted hover:bg-muted/80"}`}><X className="h-4 w-4" /></button>
                        </div>
                      </div>
                    );
                  })}
                  <Button size="sm" className="mt-2" onClick={() => toast({ title: "Presenças guardadas" })}>Guardar Presenças</Button>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="historico">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data</TableHead><TableHead>Hora</TableHead><TableHead>Aluno</TableHead><TableHead>Disciplina</TableHead><TableHead>Explicador</TableHead><TableHead>Presença</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {historico.flatMap(aula => aula.alunoIds.map(alunoId => {
                  const al = alunos.find(a => a.id === alunoId);
                  const exp = explicadores.find(e => e.id === aula.explicadorId);
                  const p = aula.presencas[alunoId];
                  const pLabel: Record<string, string> = { presente: "Presente", falta_justificada: "F. Justificada", falta_injustificada: "F. Injustificada" };
                  const pColor: Record<string, string> = { presente: "bg-success/10 text-success", falta_justificada: "bg-warning/10 text-warning", falta_injustificada: "bg-destructive/10 text-destructive" };
                  return (
                    <TableRow key={`${aula.id}-${alunoId}`}>
                      <TableCell className="text-sm">{aula.data}</TableCell>
                      <TableCell className="text-sm">{aula.horaInicio}</TableCell>
                      <TableCell className="text-sm">{al?.nome}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{aula.disciplina}</Badge></TableCell>
                      <TableCell className="text-sm">{exp?.nome}</TableCell>
                      <TableCell>{p ? <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pColor[p]}`}>{pLabel[p]}</span> : "—"}</TableCell>
                    </TableRow>
                  );
                })).slice(0, 30)}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
