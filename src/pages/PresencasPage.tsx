import { useState, useMemo } from "react";
import { useData } from "@/contexts/DataContext";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { Presenca } from "@/contexts/DataContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function PresencasPage() {
  const { aulas, setPresenca, alunos, explicadores } = useData();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [expFilter, setExpFilter] = useState("todos");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const aulasDoDia = useMemo(() =>
    aulas
      .filter(a => a.data === selectedDate && a.estado !== "cancelada")
      .filter(a => expFilter === "todos" || a.explicadorId === expFilter)
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)),
    [aulas, selectedDate, expFilter]
  );

  const updatePresenca = async (aulaId: string, alunoId: string, presenca: Presenca) => {
    try {
      await setPresenca(aulaId, alunoId, presenca);
    } catch {
      toast({ title: "Erro ao registar presença", description: "A alteração foi revertida. Tenta novamente.", variant: "destructive" });
    }
  };

  const toggle = (aulaId: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(aulaId) ? next.delete(aulaId) : next.add(aulaId);
      return next;
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold">Presenças</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="pl-9 w-[180px] h-9"
            />
          </div>
          <Select value={expFilter} onValueChange={setExpFilter}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue placeholder="Todos os professores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os professores</SelectItem>
              {explicadores
                .filter(e => e.estado === "ativo")
                .map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lesson list */}
      <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
        {aulasDoDia.length === 0 ? (
          <div className="py-16 text-center">
            <CalendarDays className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Sem aulas para esta data.</p>
          </div>
        ) : (
          aulasDoDia.map((aula, idx) => {
            const exp = explicadores.find(e => e.id === aula.explicadorId);
            const isGroup = aula.tipo === "grupo";
            const isExpanded = expanded.has(aula.id);
            const marcadas = aula.alunoIds.filter(id => aula.presencas[id]).length;

            return (
              <div key={aula.id} className={idx > 0 ? "border-t" : ""}>
                {!isGroup ? (
                  /* Individual lesson — single row */
                  (() => {
                    const alunoId = aula.alunoIds[0];
                    const al = alunos.find(a => a.id === alunoId);
                    return (
                      <div className="flex items-center gap-4 px-4 py-3 hover:bg-muted/20 transition-colors flex-wrap sm:flex-nowrap">
                        <TimeCell hora={aula.horaInicio} fim={aula.horaFim} />
                        <div className="flex-1 min-w-0">
                          <p className="font-heading font-bold truncate">{al?.nome ?? "—"}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {aula.disciplina} · {exp?.nome}
                          </p>
                        </div>
                        <PresencaButtons
                          presenca={aula.presencas[alunoId]}
                          onChange={p => updatePresenca(aula.id, alunoId, p)}
                        />
                      </div>
                    );
                  })()
                ) : (
                  /* Group lesson — header + expandable students */
                  <>
                    <button
                      onClick={() => toggle(aula.id)}
                      className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted/20 transition-colors text-left"
                    >
                      <TimeCell hora={aula.horaInicio} fim={aula.horaFim} />
                      <div className="flex-1 min-w-0">
                        <p className="font-heading font-bold truncate">
                          Grupo ({aula.alunoIds.length} alunos)
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {aula.disciplina} · {exp?.nome}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {marcadas}/{aula.alunoIds.length}
                        </span>
                        {isExpanded
                          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        }
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="bg-muted/20 border-t">
                        {aula.alunoIds.map(alunoId => {
                          const al = alunos.find(a => a.id === alunoId);
                          return (
                            <div
                              key={alunoId}
                              className="flex items-center gap-4 px-4 py-2.5 pl-4 sm:pl-32 border-b last:border-b-0 border-border/50 flex-wrap sm:flex-nowrap"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{al?.nome ?? "—"}</p>
                              </div>
                              <PresencaButtons
                                presenca={aula.presencas[alunoId]}
                                onChange={p => updatePresenca(aula.id, alunoId, p)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function TimeCell({ hora, fim }: { hora: string; fim: string }) {
  return (
    <div className="w-24 shrink-0 text-sm tabular-nums text-muted-foreground font-medium">
      {hora} – {fim}
    </div>
  );
}

const BUTTON_BASE = "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const BUTTON_INACTIVE = "bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground";

function PresencaButtons({ presenca, onChange }: {
  presenca?: Presenca;
  onChange: (p: Presenca) => void;
}) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        type="button"
        onClick={() => onChange(presenca === "presente" ? null : "presente")}
        className={cn(BUTTON_BASE, presenca === "presente"
          ? "bg-success border-success text-success-foreground"
          : BUTTON_INACTIVE)}
      >
        Presente
      </button>
      <button
        type="button"
        onClick={() => onChange(presenca === "falta_justificada" ? null : "falta_justificada")}
        className={cn(BUTTON_BASE, presenca === "falta_justificada"
          ? "bg-warning border-warning text-warning-foreground"
          : BUTTON_INACTIVE)}
      >
        F. Just.
      </button>
      <button
        type="button"
        onClick={() => onChange(presenca === "falta_injustificada" ? null : "falta_injustificada")}
        className={cn(BUTTON_BASE, presenca === "falta_injustificada"
          ? "bg-destructive border-destructive text-destructive-foreground"
          : BUTTON_INACTIVE)}
      >
        F. Injust.
      </button>
    </div>
  );
}
