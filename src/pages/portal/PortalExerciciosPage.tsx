import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, User, BookOpen, Calendar } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface Material {
  id: string;
  titulo: string;
  tipo: "resumo" | "ficha";
  disciplina: string;
  explicadorId: string;
  alunoIds: string[];
  dataUpload: string;
  descricao?: string;
}

const mockMateriais: Material[] = [
  { id: "m1", titulo: "Resumo - Funções Quadráticas", tipo: "resumo", disciplina: "Matemática", explicadorId: "e1", alunoIds: ["a1", "a6", "a9"], dataUpload: "2026-04-05", descricao: "Resumo teórico sobre funções quadráticas, vértice e propriedades." },
  { id: "m2", titulo: "Ficha de Exercícios - Derivadas", tipo: "ficha", disciplina: "Matemática", explicadorId: "e1", alunoIds: ["a1", "a6"], dataUpload: "2026-04-07", descricao: "20 exercícios sobre regras de derivação." },
  { id: "m3", titulo: "Resumo - Dinâmica e Forças", tipo: "resumo", disciplina: "Física e Química", explicadorId: "e1", alunoIds: ["a1"], dataUpload: "2026-04-03", descricao: "Leis de Newton e aplicações práticas." },
  { id: "m4", titulo: "Ficha - Leis de Newton", tipo: "ficha", disciplina: "Física e Química", explicadorId: "e4", alunoIds: ["a1", "a8"], dataUpload: "2026-04-08", descricao: "Exercícios de aplicação das 3 leis de Newton." },
  { id: "m5", titulo: "Resumo - Os Lusíadas", tipo: "resumo", disciplina: "Português", explicadorId: "e2", alunoIds: ["a3", "a4", "a9"], dataUpload: "2026-04-02", descricao: "Análise dos episódios centrais d'Os Lusíadas." },
  { id: "m6", titulo: "Ficha - Análise de texto narrativo", tipo: "ficha", disciplina: "Português", explicadorId: "e2", alunoIds: ["a3"], dataUpload: "2026-04-06", descricao: "Exercícios de compreensão e interpretação textual." },
  { id: "m7", titulo: "Resumo - Present Perfect vs Past Simple", tipo: "resumo", disciplina: "Inglês", explicadorId: "e3", alunoIds: ["a4", "a7"], dataUpload: "2026-04-04", descricao: "Diferenças de uso e exemplos práticos." },
  { id: "m8", titulo: "Ficha - Reading Comprehension", tipo: "ficha", disciplina: "Inglês", explicadorId: "e3", alunoIds: ["a7"], dataUpload: "2026-04-09", descricao: "Textos com perguntas de interpretação em inglês." },
  { id: "m9", titulo: "Resumo - Genética Mendeliana", tipo: "resumo", disciplina: "Biologia e Geologia", explicadorId: "e4", alunoIds: ["a2", "a8"], dataUpload: "2026-04-01", descricao: "Leis de Mendel e cruzamentos genéticos." },
  { id: "m10", titulo: "Ficha - Hereditariedade", tipo: "ficha", disciplina: "Biologia e Geologia", explicadorId: "e4", alunoIds: ["a2"], dataUpload: "2026-04-06", descricao: "Problemas de genética e árvores genealógicas." },
];

export default function PortalExerciciosPage() {
  const { user } = useAuth();
  const { alunos, explicadores } = useData();
  const [tab, setTab] = useState("todos");

  const educandoIds = user?.alunoIds || [];
  const educandos = alunos.filter(a => educandoIds.includes(a.id));

  const materiais = mockMateriais
    .filter(m => m.alunoIds.some(id => educandoIds.includes(id)))
    .sort((a, b) => b.dataUpload.localeCompare(a.dataUpload));

  const resumos = materiais.filter(m => m.tipo === "resumo");
  const fichas = materiais.filter(m => m.tipo === "ficha");

  const displayed = tab === "resumos" ? resumos : tab === "fichas" ? fichas : materiais;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Materiais e Exercícios</h1>
        <p className="text-muted-foreground">Resumos e fichas disponibilizados pelos professores</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="todos">Todos ({materiais.length})</TabsTrigger>
          <TabsTrigger value="resumos">Resumos ({resumos.length})</TabsTrigger>
          <TabsTrigger value="fichas">Fichas ({fichas.length})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {displayed.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Sem materiais disponíveis.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {displayed.map(mat => {
                const exp = explicadores.find(e => e.id === mat.explicadorId);
                const matAlunos = educandos.filter(a => mat.alunoIds.includes(a.id));

                return (
                  <Card key={mat.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          {mat.titulo}
                        </CardTitle>
                        <Badge variant={mat.tipo === "resumo" ? "default" : "secondary"} className="shrink-0 text-xs">
                          {mat.tipo === "resumo" ? "Resumo" : "Ficha"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {mat.descricao && (
                        <p className="text-sm text-muted-foreground">{mat.descricao}</p>
                      )}
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" /> {mat.disciplina}
                        </span>
                        {exp && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" /> {exp.nome}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(mat.dataUpload), "d MMM yyyy", { locale: pt })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                          {matAlunos.map(a => (
                            <Badge key={a.id} variant="outline" className="text-xs">{a.nome?.split(" ")[0] || "?"}</Badge>
                          ))}
                        </div>
                        <Button variant="outline" size="sm">
                          <Download className="mr-1 h-3 w-3" /> Abrir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
