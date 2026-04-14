import { useState, useMemo } from "react";
import { useData } from "@/contexts/DataContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Loader2, Users, Eye } from "lucide-react";
import { format, getDay, addWeeks } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { TipoAula, Aula } from "@/data/mockData";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  preSelectedAlunoId: string | null;
  educandoIds: string[];
}

export default function MarcarAulaModal({ open, onOpenChange, preSelectedAlunoId, educandoIds }: Props) {
  const { alunos, explicadores, salas, aulas, setAulas } = useData();
  const { toast } = useToast();

  const [alunoId, setAlunoId] = useState(preSelectedAlunoId || "");
  const [disciplina, setDisciplina] = useState("");
  const [tipo, setTipo] = useState<TipoAula>("individual");
  const [data, setData] = useState<Date | undefined>();
  const [slot, setSlot] = useState("");
  const [recorrencia, setRecorrencia] = useState<"unica" | "semanal" | "quinzenal" | "ano_letivo">("unica");
  const [saving, setSaving] = useState(false);
  const [showOtherTeachers, setShowOtherTeachers] = useState(false);

  const educandos = alunos.filter(a => educandoIds.includes(a.id));
  const selectedAluno = alunos.find(a => a.id === alunoId);
  const assignedExplicador = explicadores.find(e => e.id === selectedAluno?.explicadorId);

  const disciplinasDisponiveis = selectedAluno?.disciplinas || [];

  // Explicadores filtered by discipline + teacher mode
  const explicadoresDisponiveis = useMemo(() => {
    if (!disciplina) return [];
    const allForDisciplina = explicadores.filter(e => e.estado === "ativo" && e.disciplinas.includes(disciplina));

    if (!showOtherTeachers && assignedExplicador && allForDisciplina.some(e => e.id === assignedExplicador.id)) {
      return [assignedExplicador];
    }
    return allForDisciplina;
  }, [disciplina, explicadores, showOtherTeachers, assignedExplicador]);

  const salasDisponiveis = useMemo(() => {
    return salas.filter(s => s.estado === "disponível");
  }, [salas]);

  const slotsDisponiveis = useMemo(() => {
    if (!data || !disciplina || explicadoresDisponiveis.length === 0) return [];

    const diaSemana = getDay(data);
    const adjustedDay = diaSemana === 0 ? 7 : diaSemana;
    const dateStr = format(data, "yyyy-MM-dd");

    const slots: { hora: string; horaFim: string; explicadorId: string; salaId: string }[] = [];

    for (const exp of explicadoresDisponiveis) {
      const disponibilidadeDia = exp.disponibilidade.filter(d => d.diaSemana === adjustedDay);

      for (const disp of disponibilidadeDia) {
        let h = parseInt(disp.horaInicio.split(":")[0]);
        const hFim = parseInt(disp.horaFim.split(":")[0]);

        while (h < hFim) {
          const horaInicio = `${String(h).padStart(2, "0")}:00`;
          const horaFim = `${String(h + 1).padStart(2, "0")}:00`;

          const expOcupado = aulas.some(
            a => a.data === dateStr && a.explicadorId === exp.id && a.estado !== "cancelada" &&
              a.horaInicio < horaFim && a.horaFim > horaInicio
          );

          if (!expOcupado) {
            const salaLivre = salasDisponiveis.find(s => {
              const capacidadeOk = tipo === "individual" ? true : s.capacidade >= 2;
              const ocupada = aulas.some(
                a => a.data === dateStr && a.salaId === s.id && a.estado !== "cancelada" &&
                  a.horaInicio < horaFim && a.horaFim > horaInicio
              );
              return capacidadeOk && !ocupada;
            });

            if (salaLivre) {
              slots.push({ hora: horaInicio, horaFim, explicadorId: exp.id, salaId: salaLivre.id });
            }
          }
          h++;
        }
      }
    }

    const unique = new Map<string, typeof slots[0]>();
    slots.forEach(s => {
      const key = `${s.hora}-${s.explicadorId}`;
      if (!unique.has(key)) unique.set(key, s);
    });

    return Array.from(unique.values()).sort((a, b) => a.hora.localeCompare(b.hora));
  }, [data, disciplina, explicadoresDisponiveis, salasDisponiveis, aulas, tipo]);

  const resetForm = () => {
    setAlunoId(preSelectedAlunoId || "");
    setDisciplina("");
    setTipo("individual");
    setData(undefined);
    setSlot("");
    setRecorrencia("unica");
    setShowOtherTeachers(false);
  };

  const handleSubmit = () => {
    if (!alunoId || !disciplina || !data || !slot) return;

    const selectedSlot = slotsDisponiveis.find(s => `${s.hora}-${s.explicadorId}` === slot);
    if (!selectedSlot) return;

    setSaving(true);

    const dates: Date[] = [data];
    if (recorrencia === "semanal") {
      for (let i = 1; i <= 11; i++) dates.push(addWeeks(data, i));
    } else if (recorrencia === "quinzenal") {
      for (let i = 1; i <= 5; i++) dates.push(addWeeks(data, i * 2));
    } else if (recorrencia === "ano_letivo") {
      // Calculate weeks from selected date until end of school year (June 30)
      const schoolYearEnd = new Date(data.getMonth() >= 8 ? data.getFullYear() + 1 : data.getFullYear(), 5, 30);
      const msPerWeek = 7 * 24 * 60 * 60 * 1000;
      const weeksRemaining = Math.max(1, Math.floor((schoolYearEnd.getTime() - data.getTime()) / msPerWeek));
      for (let i = 1; i < weeksRemaining; i++) dates.push(addWeeks(data, i));
    }

    const newAulas: Aula[] = dates.map((d, i) => ({
      id: `portal-${Date.now()}-${i}`,
      alunoIds: [alunoId],
      explicadorId: selectedSlot.explicadorId,
      salaId: selectedSlot.salaId,
      disciplina,
      data: format(d, "yyyy-MM-dd"),
      horaInicio: selectedSlot.hora,
      horaFim: selectedSlot.horaFim,
      tipo,
      estado: "agendada" as const,
      presencas: {},
      recorrencia: recorrencia === "ano_letivo" ? "semanal" : recorrencia,
    }));

    setTimeout(() => {
      setAulas(prev => [...prev, ...newAulas]);
      setSaving(false);
      onOpenChange(false);
      resetForm();
      toast({
        title: "Aula marcada com sucesso!",
        description: `${newAulas.length} sessão(ões) de ${disciplina} agendada(s).`,
      });
    }, 500);
  };

  const selectedSlotInfo = slotsDisponiveis.find(s => `${s.hora}-${s.explicadorId}` === slot);
  const expName = selectedSlotInfo ? explicadores.find(e => e.id === selectedSlotInfo.explicadorId)?.nome : null;

  const recurrenceLabel: Record<string, string> = {
    unica: "",
    semanal: "12 sessões semanais",
    quinzenal: "6 sessões quinzenais",
    ano_letivo: "~36 sessões (ano letivo)",
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Marcar Nova Aula</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-1 scrollbar-thin">
          {educandos.length > 1 && (
            <div className="space-y-2">
              <Label>Educando</Label>
              <Select value={alunoId} onValueChange={v => { setAlunoId(v); setDisciplina(""); setSlot(""); setShowOtherTeachers(false); }}>
                <SelectTrigger><SelectValue placeholder="Selecione o educando" /></SelectTrigger>
                <SelectContent>
                  {educandos.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Assigned teacher info */}
          {alunoId && assignedExplicador && (
            <div className="rounded-md border bg-muted/50 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="text-muted-foreground">Explicador atribuído: </span>
                  <span className="font-medium">{assignedExplicador.nome}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => { setShowOtherTeachers(!showOtherTeachers); setSlot(""); }}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  {showOtherTeachers ? "Apenas o meu explicador" : "Ver outros explicadores"}
                </Button>
              </div>
              {showOtherTeachers && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  <Users className="h-3 w-3 inline mr-1" />
                  A mostrar horários de todos os explicadores disponíveis
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Disciplina</Label>
            {!alunoId ? (
              <p className="text-sm text-muted-foreground">Selecione primeiro o educando.</p>
            ) : disciplinasDisponiveis.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem disciplinas disponíveis.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {disciplinasDisponiveis.map(d => (
                  <Button
                    key={d}
                    type="button"
                    variant={disciplina === d ? "default" : "outline"}
                    size="sm"
                    onClick={() => { setDisciplina(d); setSlot(""); }}
                  >
                    {d}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Tipo de aula</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={tipo === "individual" ? "default" : "outline"}
                size="sm"
                onClick={() => { setTipo("individual"); setSlot(""); }}
              >
                Individual
              </Button>
              <Button
                type="button"
                variant={tipo === "grupo" ? "default" : "outline"}
                size="sm"
                onClick={() => { setTipo("grupo" as TipoAula); setSlot(""); }}
              >
                Grupo
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !data && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {data ? format(data, "PPP", { locale: pt }) : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={data}
                  onSelect={d => { setData(d); setSlot(""); }}
                  disabled={d => d < new Date() || getDay(d) === 0 || getDay(d) === 6}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {data && disciplina && (
            <div className="space-y-2">
              <Label>Horário disponível</Label>
              {slotsDisponiveis.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sem horários disponíveis neste dia.
                  {!showOtherTeachers && assignedExplicador && (
                    <Button
                      variant="link"
                      size="sm"
                      className="text-xs h-auto p-0 ml-1"
                      onClick={() => { setShowOtherTeachers(true); setSlot(""); }}
                    >
                      Ver outros explicadores?
                    </Button>
                  )}
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {slotsDisponiveis.map(s => {
                    const key = `${s.hora}-${s.explicadorId}`;
                    const exp = explicadores.find(e => e.id === s.explicadorId);
                    const isAssigned = exp?.id === assignedExplicador?.id;
                    return (
                      <Button
                        key={key}
                        variant={slot === key ? "default" : "outline"}
                        size="sm"
                        className="flex flex-col h-auto py-2"
                        onClick={() => setSlot(key)}
                      >
                        <span className="font-medium">{s.hora}–{s.horaFim}</span>
                        <span className="text-xs opacity-70">
                          {exp?.nome.split(" ")[0]}
                          {showOtherTeachers && isAssigned && " ★"}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Recorrência</Label>
            <Select value={recorrencia} onValueChange={v => setRecorrencia(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unica">Sessão única</SelectItem>
                <SelectItem value="semanal">Semanal (12 semanas)</SelectItem>
                <SelectItem value="quinzenal">Quinzenal (6 sessões)</SelectItem>
                <SelectItem value="ano_letivo">Ano letivo (~36 semanas)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedSlotInfo && expName && (
            <div className="rounded-md border bg-muted/50 p-3 text-sm">
              <p><strong>Resumo:</strong> {disciplina} — {tipo}</p>
              <p>Explicador: {expName}</p>
              <p>{data && format(data, "EEEE, d MMMM", { locale: pt })} às {selectedSlotInfo.hora}</p>
              {recorrencia !== "unica" && (
                <Badge variant="secondary" className="mt-1">
                  {recurrenceLabel[recorrencia]}
                </Badge>
              )}
            </div>
          )}

          <Button
            className="w-full"
            disabled={!alunoId || !disciplina || !data || !slot || saving}
            onClick={handleSubmit}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirmar Marcação
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
