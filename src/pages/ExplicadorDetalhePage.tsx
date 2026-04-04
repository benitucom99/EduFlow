import { useParams, useNavigate } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Mail, Phone, GraduationCap } from "lucide-react";
import { useMemo } from "react";

const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function ExplicadorDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { explicadores, aulas, alunos } = useData();
  const exp = explicadores.find(e => e.id === id);

  const stats = useMemo(() => {
    const aulasExp = aulas.filter(a => a.explicadorId === id);
    const esteMes = aulasExp.filter(a => a.estado !== "cancelada").length;
    const alunosAtivos = new Set(aulasExp.flatMap(a => a.alunoIds)).size;
    return { esteMes, alunosAtivos, valorEstimado: esteMes * (exp?.valorHora || 0) };
  }, [aulas, id, exp]);

  if (!exp) return <div className="p-6">Explicador não encontrado</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <Button variant="ghost" onClick={() => navigate("/explicadores")}><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Button>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="text-center">
              <div className="h-20 w-20 mx-auto rounded-full bg-accent flex items-center justify-center text-2xl font-bold text-accent-foreground mb-3">{exp.nome.split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
              <h2 className="text-xl font-bold">{exp.nome}</h2>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${exp.estado === "ativo" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{exp.estado}</span>
              <p className="text-3xl font-bold text-primary mt-3">{exp.valorHora}€<span className="text-sm font-normal text-muted-foreground">/hora</span></p>
            </div>
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-3 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /> {exp.email}</div>
              <div className="flex items-center gap-3 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /> {exp.telefone}</div>
              <div className="flex items-center gap-3 text-sm"><GraduationCap className="h-4 w-4 text-muted-foreground" /> {exp.habilitacoes}</div>
            </div>
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">Disciplinas</p>
              <div className="flex flex-wrap gap-1">{exp.disciplinas.map(d => <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>)}</div>
            </div>
          </CardContent>
        </Card>
        <div className="lg:col-span-2">
          <Tabs defaultValue="disponibilidade">
            <TabsList><TabsTrigger value="disponibilidade">Disponibilidade</TabsTrigger><TabsTrigger value="estatisticas">Estatísticas</TabsTrigger></TabsList>
            <TabsContent value="disponibilidade">
              <Card><CardContent className="p-6">
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map(day => {
                    const dayDisps = exp.disponibilidade.filter(d => d.diaSemana === day);
                    return (
                      <div key={day} className="text-center">
                        <p className="font-medium text-sm mb-2">{dias[day]}</p>
                        {dayDisps.length > 0 ? dayDisps.map((d, i) => (
                          <div key={i} className="bg-success/10 text-success rounded p-1.5 text-xs mb-1">{d.horaInicio}-{d.horaFim}</div>
                        )) : <div className="bg-muted rounded p-1.5 text-xs text-muted-foreground">—</div>}
                      </div>
                    );
                  })}
                </div>
              </CardContent></Card>
            </TabsContent>
            <TabsContent value="estatisticas">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: "Horas Este Mês", value: stats.esteMes },
                  { label: "Alunos Ativos", value: stats.alunosAtivos },
                  { label: "Valor Estimado", value: `${stats.valorEstimado}€` },
                ].map(s => (
                  <Card key={s.label}><CardContent className="p-6 text-center"><p className="text-3xl font-bold">{s.value}</p><p className="text-sm text-muted-foreground mt-1">{s.label}</p></CardContent></Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
