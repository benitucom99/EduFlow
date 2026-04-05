import { useParams, useNavigate } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Mail, Phone, School, Calendar } from "lucide-react";
import { useMemo } from "react";

const presencaBadge = (p: string | null) => {
  if (p === "presente") return <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">Presente</span>;
  if (p === "falta_justificada") return <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning font-medium">F. Justificada</span>;
  if (p === "falta_injustificada") return <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">F. Injustificada</span>;
  return <span className="text-xs text-muted-foreground">—</span>;
};

export default function AlunoDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { alunos, aulas, explicadores } = useData();
  const aluno = alunos.find(a => a.id === id);
  const explicadorAtribuido = explicadores.find(e => e.id === aluno?.explicadorId);

  const aulasDoAluno = useMemo(() => {
    return aulas.filter(a => a.alunoIds.includes(id!)).sort((a, b) => b.data.localeCompare(a.data));
  }, [aulas, id]);

  const stats = useMemo(() => {
    const total = aulasDoAluno.filter(a => a.estado === "realizada").length;
    const presentes = aulasDoAluno.filter(a => a.presencas[id!] === "presente").length;
    const fj = aulasDoAluno.filter(a => a.presencas[id!] === "falta_justificada").length;
    const fi = aulasDoAluno.filter(a => a.presencas[id!] === "falta_injustificada").length;
    return { total, presentes, fj, fi, taxa: total > 0 ? Math.round((presentes / total) * 100) : 0 };
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
                {aluno.nome.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </div>
              <h2 className="text-xl font-bold">{aluno.nome}</h2>
              <div className="flex justify-center gap-2 mt-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoMap[aluno.estado]}`}>{aluno.estado}</span>
                <Badge variant="outline">{aluno.anoLetivo}º ano escolar</Badge>
              </div>
              {aluno.valorHora != null && (
                <p className="text-sm text-muted-foreground mt-1">Valor/Hora: <span className="font-medium text-foreground">{aluno.valorHora}€</span></p>
              )}
            </div>
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-3 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /> {aluno.email}</div>
              <div className="flex items-center gap-3 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /> {aluno.telefone}</div>
              <div className="flex items-center gap-3 text-sm"><School className="h-4 w-4 text-muted-foreground" /> {aluno.escola}</div>
              <div className="flex items-center gap-3 text-sm"><Calendar className="h-4 w-4 text-muted-foreground" /> {aluno.dataInscricao}</div>
            </div>
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">Disciplinas</p>
              <div className="flex flex-wrap gap-1">
                {aluno.disciplinas.map(d => <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>)}
              </div>
            </div>
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">Encarregado de Educação</p>
              <p className="text-sm font-medium">{aluno.encarregado.nome}</p>
              <p className="text-xs text-muted-foreground">{aluno.encarregado.email}</p>
              <p className="text-xs text-muted-foreground">{aluno.encarregado.telefone}</p>
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
            <TabsContent value="aulas">
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
    </div>
  );
}
