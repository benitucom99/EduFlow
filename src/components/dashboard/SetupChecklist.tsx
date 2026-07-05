import { Link } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Rocket } from "lucide-react";

// Guia de primeiros passos: substitui o "deserto" do dashboard vazio por um
// caminho claro até à primeira aula. Desaparece sozinho quando tudo está feito.
// Mostrado apenas ao admin (é quem pode configurar disciplinas).
export default function SetupChecklist() {
  const { disciplinas, explicadores, alunos, aulas } = useData();

  const passos = [
    {
      done: disciplinas.some(d => d.parentId != null),
      titulo: "Criar disciplinas",
      descricao: "As disciplinas e preços que o centro oferece",
      href: "/disciplinas",
    },
    {
      done: explicadores.length > 0,
      titulo: "Adicionar professores",
      descricao: "A equipa que dá as aulas",
      href: "/explicadores",
    },
    {
      done: alunos.length > 0,
      titulo: "Inscrever alunos",
      descricao: "Os alunos e as disciplinas que frequentam",
      href: "/alunos",
    },
    {
      done: aulas.length > 0,
      titulo: "Marcar a primeira aula",
      descricao: "Com horário recorrente, o ano letivo preenche-se sozinho",
      href: "/calendario",
    },
  ];

  const feitos = passos.filter(p => p.done).length;
  if (feitos === passos.length) return null;

  return (
    <Card className="rounded-2xl shadow-sm border-primary/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Primeiros passos
          </CardTitle>
          <span className="text-sm text-muted-foreground tabular-nums">{feitos} de {passos.length}</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(feitos / passos.length) * 100}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="divide-y divide-border">
          {passos.map(p => (
            <div key={p.titulo} className="flex items-center gap-3 py-2.5">
              {p.done
                ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                : <Circle className="h-5 w-5 shrink-0 text-muted-foreground/40" />}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${p.done ? "text-muted-foreground line-through" : ""}`}>{p.titulo}</p>
                {!p.done && <p className="text-xs text-muted-foreground truncate">{p.descricao}</p>}
              </div>
              {!p.done && (
                <Button size="sm" variant="outline" asChild>
                  <Link to={p.href}>Começar</Link>
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
