import { useEffect, useMemo, useState } from "react";
import { useData } from "@/contexts/DataContext";
import { folhasAgrupadas } from "@/lib/disciplinas";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, X } from "lucide-react";

// Filtros do calendário. `explicadorId`/`salaId` vazios = "todos"; arrays vazios = sem filtro.
export interface CalFilters {
  alunoIds: string[];
  disciplinas: string[]; // nomes das folhas/sub-disciplinas (coerente com aula.disciplina)
  explicadorId: string;
  salaId: string;
}

export const FILTROS_VAZIOS: CalFilters = { alunoIds: [], disciplinas: [], explicadorId: "", salaId: "" };

/** Nº de grupos de filtro com seleção (para o badge do botão "Filtros"). */
export function contarFiltrosAtivos(f: CalFilters): number {
  return (f.alunoIds.length ? 1 : 0) + (f.disciplinas.length ? 1 : 0) + (f.explicadorId ? 1 : 0) + (f.salaId ? 1 : 0);
}

/**
 * Painel lateral (Sheet) de filtros do calendário. Mantém um rascunho local que só é
 * comunicado ao pai via `onAplicar` ao clicar em "Aplicar Filtros" — fechar sem aplicar
 * descarta as alterações. Abre apenas quando `open` passa a true (controlado pelo pai).
 */
export function CalendarioFiltros({
  open, onOpenChange, valor, onAplicar, isExplicador,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  valor: CalFilters;
  onAplicar: (f: CalFilters) => void;
  isExplicador: boolean;
}) {
  const { alunos, explicadores, salas, disciplinas } = useData();

  const alunosAtivos = useMemo(() => alunos.filter(a => a.estado === "ativo"), [alunos]);
  const grupos = useMemo(() => folhasAgrupadas(disciplinas), [disciplinas]);
  const alunoNome = (id: string) => alunos.find(a => a.id === id)?.nome ?? "—";

  // Rascunho — ressincroniza com os filtros aplicados sempre que o painel abre.
  const [draft, setDraft] = useState<CalFilters>(valor);
  const [alunoOpen, setAlunoOpen] = useState(false);
  useEffect(() => {
    if (open) setDraft(valor);
  }, [open, valor]);

  const toggleAluno = (id: string) =>
    setDraft(d => ({ ...d, alunoIds: d.alunoIds.includes(id) ? d.alunoIds.filter(x => x !== id) : [...d.alunoIds, id] }));

  const toggleDisc = (nome: string) =>
    setDraft(d => ({ ...d, disciplinas: d.disciplinas.includes(nome) ? d.disciplinas.filter(x => x !== nome) : [...d.disciplinas, nome] }));

  const toggleGrupo = (folhaNomes: string[], allSel: boolean) =>
    setDraft(d => ({
      ...d,
      disciplinas: allSel
        ? d.disciplinas.filter(n => !folhaNomes.includes(n))
        : Array.from(new Set([...d.disciplinas, ...folhaNomes])),
    }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle>Filtros</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-6">
            {/* ── Aluno (multi) ───────────────────────────────────────── */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aluno</Label>
              {draft.alunoIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {draft.alunoIds.map(id => (
                    <Badge key={id} variant="secondary" className="gap-1 pr-1">
                      {alunoNome(id)}
                      <button type="button" onClick={() => toggleAluno(id)} className="rounded-sm hover:bg-muted-foreground/20">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <Popover open={alunoOpen} onOpenChange={setAlunoOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={alunoOpen} className="w-full justify-between font-normal">
                    <span className="text-muted-foreground">Procurar aluno...</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Procurar aluno..." />
                    <CommandList className="max-h-56">
                      <CommandEmpty>Nenhum aluno encontrado.</CommandEmpty>
                      <CommandGroup>
                        {alunosAtivos.map(a => {
                          const sel = draft.alunoIds.includes(a.id);
                          return (
                            <CommandItem key={a.id} value={a.nome} onSelect={() => toggleAluno(a.id)}>
                              <Check className={cn("mr-2 h-4 w-4", sel ? "opacity-100" : "opacity-0")} />
                              {a.nome}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* ── Explicador (single, escondido para o próprio explicador) ── */}
            {!isExplicador && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Explicador</Label>
                <Select
                  value={draft.explicadorId || "todos"}
                  onValueChange={v => setDraft(d => ({ ...d, explicadorId: v === "todos" ? "" : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Selecionar explicador..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os explicadores</SelectItem>
                    {explicadores.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* ── Disciplinas (multi, acordeão por categoria) ─────────── */}
            {grupos.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Disciplinas</Label>
                <Accordion type="multiple" className="border rounded-md divide-y">
                  {grupos.map(g => {
                    const folhaNomes = g.folhas.map(f => f.nome);
                    const selCount = folhaNomes.filter(n => draft.disciplinas.includes(n)).length;
                    const allSel = selCount === folhaNomes.length;
                    return (
                      <AccordionItem key={g.categoriaNome} value={g.categoriaNome} className="border-b-0 px-3">
                        <AccordionTrigger className="py-3 hover:no-underline">
                          <span className="flex items-center gap-2">
                            {g.categoriaNome}
                            {selCount > 0 && <Badge variant="secondary" className="h-5 px-1.5">{selCount}</Badge>}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="pb-3">
                          <div className="flex flex-wrap gap-1.5">
                            {g.folhas.map(f => {
                              const sel = draft.disciplinas.includes(f.nome);
                              return (
                                <button
                                  key={f.id}
                                  type="button"
                                  onClick={() => toggleDisc(f.nome)}
                                  className={cn(
                                    "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                                    sel
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "bg-background hover:bg-muted border-border",
                                  )}
                                >
                                  {f.nome}
                                </button>
                              );
                            })}
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleGrupo(folhaNomes, allSel)}
                            className="mt-2 text-xs text-primary hover:underline"
                          >
                            {allSel ? "Limpar" : "Selecionar todas"}
                          </button>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            )}

            {/* ── Sala / Espaço (single) ──────────────────────────────── */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sala / Espaço</Label>
              <Select
                value={draft.salaId || "todas"}
                onValueChange={v => setDraft(d => ({ ...d, salaId: v === "todas" ? "" : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Todas as salas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as salas</SelectItem>
                  {salas.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="px-6 py-4 border-t flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button className="w-full" onClick={() => onAplicar(draft)}>Aplicar Filtros</Button>
          <Button variant="ghost" className="w-full" onClick={() => setDraft(FILTROS_VAZIOS)}>Limpar Tudo</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
