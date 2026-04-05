import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useData } from "@/contexts/DataContext";
import { useMemo } from "react";
import { parseISO, isBefore, subDays, format } from "date-fns";
import { pt } from "date-fns/locale";

interface AcoesPendentesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: "pagamentos" | "pre-inscricao" | "presencas" | null;
}

export default function AcoesPendentesSheet({ open, onOpenChange, tipo }: AcoesPendentesSheetProps) {
  const { alunos, aulas, explicadores, salas } = useData();

  const content = useMemo(() => {
    if (!tipo) return { title: "", description: "", items: [] as any[] };

    if (tipo === "pagamentos") {
      // Simulate overdue payments: pick 3 active students
      const alunosAtivos = alunos.filter(a => a.estado === "ativo").slice(0, 3);
      return {
        title: "Pagamentos em Atraso",
        description: "Alunos com faturas pendentes que requerem atenção.",
        items: alunosAtivos.map((a, i) => ({
          id: a.id,
          nome: a.nome,
          detalhe: `${a.disciplinas.join(", ")}`,
          valor: `${(i + 1) * 40}€`,
          dias: `${(i + 1) * 7} dias em atraso`,
          encarregado: a.encarregado.nome,
          contacto: a.encarregado.telefone,
        })),
      };
    }

    if (tipo === "pre-inscricao") {
      const preInscritos = alunos.filter(a => a.estado === "pre-inscrito");
      return {
        title: "Pré-inscrições por Confirmar",
        description: "Alunos em fase de pré-inscrição aguardando confirmação.",
        items: preInscritos.map(a => ({
          id: a.id,
          nome: a.nome,
          detalhe: `${a.escola} · ${a.anoLetivo}º ano`,
          disciplinas: a.disciplinas.join(", "),
          encarregado: a.encarregado.nome,
          contacto: a.encarregado.telefone,
          data: format(parseISO(a.dataInscricao), "d MMM yyyy", { locale: pt }),
        })),
      };
    }

    if (tipo === "presencas") {
      // Classes that were "realizada" but have null presences
      const semPresenca = aulas
        .filter(a => a.estado === "realizada")
        .filter(a => Object.values(a.presencas).some(p => p === null) || Object.keys(a.presencas).length === 0)
        .slice(0, 5);

      // If no real nulls, just pick recent realized classes
      const items = semPresenca.length > 0 ? semPresenca : aulas.filter(a => a.estado === "realizada").slice(0, 2);

      return {
        title: "Aulas sem Presença Registada",
        description: "Aulas realizadas que ainda não têm registo de presença completo.",
        items: items.map(aula => {
          const exp = explicadores.find(e => e.id === aula.explicadorId);
          const sala = salas.find(s => s.id === aula.salaId);
          const nomes = aula.alunoIds.map(aid => alunos.find(a => a.id === aid)?.nome || aid);
          return {
            id: aula.id,
            data: format(parseISO(aula.data), "d MMM yyyy", { locale: pt }),
            horario: `${aula.horaInicio} - ${aula.horaFim}`,
            disciplina: aula.disciplina,
            explicador: exp?.nome || "",
            sala: sala?.nome || "",
            alunos: nomes,
          };
        }),
      };
    }

    return { title: "", description: "", items: [] };
  }, [tipo, alunos, aulas, explicadores, salas]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{content.title}</SheetTitle>
          <SheetDescription>{content.description}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {tipo === "pagamentos" &&
            content.items.map((item: any) => (
              <div key={item.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{item.nome}</span>
                  <Badge variant="destructive" className="text-xs">{item.valor}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{item.detalhe}</p>
                <p className="text-xs text-destructive font-medium">{item.dias}</p>
                <div className="border-t pt-2 mt-2">
                  <p className="text-xs text-muted-foreground">Encarregado: {item.encarregado}</p>
                  <p className="text-xs text-muted-foreground">Tel: {item.contacto}</p>
                </div>
              </div>
            ))}

          {tipo === "pre-inscricao" &&
            content.items.map((item: any) => (
              <div key={item.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{item.nome}</span>
                  <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">Pendente</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{item.detalhe}</p>
                <p className="text-xs text-muted-foreground">Disciplinas: {item.disciplinas}</p>
                <p className="text-xs text-muted-foreground">Pedido em: {item.data}</p>
                <div className="border-t pt-2 mt-2">
                  <p className="text-xs text-muted-foreground">Encarregado: {item.encarregado}</p>
                  <p className="text-xs text-muted-foreground">Tel: {item.contacto}</p>
                </div>
              </div>
            ))}

          {tipo === "presencas" &&
            content.items.map((item: any) => (
              <div key={item.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{item.disciplina}</span>
                  <Badge variant="secondary" className="text-xs">{item.data}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{item.horario} · {item.sala}</p>
                <p className="text-xs text-muted-foreground">Explicador: {item.explicador}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {item.alunos.map((nome: string) => (
                    <Badge key={nome} variant="outline" className="text-xs">{nome}</Badge>
                  ))}
                </div>
              </div>
            ))}

          {content.items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Sem itens pendentes</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
