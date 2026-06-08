import { useEffect, useMemo, useState } from "react";
import { useData, Aluno, AlunoHorario, AlunoHorarioSlot } from "@/contexts/DataContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, AlertTriangle, CalendarClock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { DIAS_SEMANA, fimAnoLetivo, gerarAulasDoHorario } from "@/lib/horarios";

const DURACOES = [
  { value: 30, label: "30 min" },
  { value: 60, label: "1h" },
  { value: 90, label: "1h30" },
  { value: 120, label: "2h" },
  { value: 150, label: "2h30" },
  { value: 180, label: "3h" },
];

function hojeStr() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

export function HorarioGeradorModal({ open, onClose, aluno, horario }: {
  open: boolean;
  onClose: () => void;
  aluno: Aluno;
  horario?: AlunoHorario | null;
}) {
  const { disciplinas, explicadores, salas, saveAlunoHorario, deleteAlunoHorario } = useData();
  const { toast } = useToast();

  // Disciplinas que o aluno frequenta (id → nome), com o tutor por-disciplina.
  const disciplinasDoAluno = useMemo(() => {
    const mapa = aluno.disciplinaExplicadores ?? {};
    return Object.keys(mapa)
      .map(id => ({ id, nome: disciplinas.find(d => d.id === id)?.nome ?? "", tutor: mapa[id] ?? null }))
      .filter(d => d.nome);
  }, [aluno, disciplinas]);

  const explicadoresAtivos = explicadores.filter(e => e.estado === "ativo");

  const [disciplinaId, setDisciplinaId] = useState("");
  const [explicadorId, setExplicadorId] = useState<string>("none");
  const [salaId, setSalaId] = useState<string>("none");
  const [duracaoMin, setDuracaoMin] = useState(60);
  const [slots, setSlots] = useState<AlunoHorarioSlot[]>([]);
  const [anoLetivoInteiro, setAnoLetivoInteiro] = useState(true);
  const [dataInicio, setDataInicio] = useState(hojeStr());
  const [dataFim, setDataFim] = useState("");
  const [erro, setErro] = useState("");
  const [saving, setSaving] = useState(false);

  // Inicializa os campos ao abrir (criar vs editar).
  useEffect(() => {
    if (!open) return;
    setErro("");
    if (horario) {
      setDisciplinaId(horario.disciplinaId);
      setExplicadorId(horario.explicadorId ?? "none");
      setSalaId(horario.salaId ?? "none");
      setDuracaoMin(horario.duracaoMin);
      setSlots(horario.slots.map(s => ({ ...s })));
      setAnoLetivoInteiro(horario.anoLetivoInteiro);
      setDataInicio(horario.dataInicio);
      setDataFim(horario.dataFim);
    } else {
      const first = disciplinasDoAluno[0];
      setDisciplinaId(first?.id ?? "");
      setExplicadorId(first?.tutor ?? "none");
      setSalaId("none");
      setDuracaoMin(60);
      setSlots([{ diaSemana: 1, horaInicio: "17:00" }]);
      setAnoLetivoInteiro(true);
      setDataInicio(hojeStr());
      setDataFim("");
    }
  }, [open, horario, disciplinasDoAluno]);

  // Com "ano letivo inteiro" ligado, a data fim é o fim do ano letivo (fim de Julho).
  const dataFimEfetiva = anoLetivoInteiro && dataInicio
    ? format(fimAnoLetivo(parseISO(dataInicio)), "yyyy-MM-dd")
    : dataFim;

  // Ao escolher disciplina, sugere o tutor por-disciplina do aluno.
  const onDisciplinaChange = (id: string) => {
    setDisciplinaId(id);
    const d = disciplinasDoAluno.find(x => x.id === id);
    if (d?.tutor) setExplicadorId(d.tutor);
  };

  const addSlot = () => setSlots(prev => [...prev, { diaSemana: 1, horaInicio: "17:00" }]);
  const removeSlot = (i: number) => setSlots(prev => prev.filter((_, idx) => idx !== i));
  const updateSlot = (i: number, patch: Partial<AlunoHorarioSlot>) =>
    setSlots(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s));

  // Pré-visualização do nº de aulas que serão criadas (a partir de hoje).
  const previewCount = useMemo(() => {
    if (!slots.length || !dataInicio || !dataFimEfetiva) return 0;
    const genStart = dataInicio > hojeStr() ? dataInicio : hojeStr();
    if (genStart > dataFimEfetiva) return 0;
    return gerarAulasDoHorario(slots, genStart, dataFimEfetiva, duracaoMin).length;
  }, [slots, dataInicio, dataFimEfetiva, duracaoMin]);

  const handleSubmit = async () => {
    const disc = disciplinas.find(d => d.id === disciplinaId);
    if (!disc) { setErro("Escolhe uma disciplina."); return; }
    if (!slots.length) { setErro("Adiciona pelo menos um dia/hora ao horário."); return; }
    if (!dataInicio) { setErro("Define a data de início."); return; }
    if (!dataFimEfetiva || dataFimEfetiva < dataInicio) { setErro("A data de fim tem de ser posterior ao início."); return; }
    setErro("");
    setSaving(true);
    try {
      await saveAlunoHorario({
        alunoId: aluno.id,
        disciplina: disc.nome,
        explicadorId: explicadorId === "none" ? null : explicadorId,
        salaId: salaId === "none" ? null : salaId,
        tipo: "individual",
        duracaoMin,
        anoLetivoInteiro,
        dataInicio,
        dataFim: dataFimEfetiva,
        slots,
      }, horario?.id);
      toast({ title: horario ? "Horário atualizado" : "Horário criado", description: `${previewCount} aula(s) sincronizada(s) no calendário.` });
      onClose();
    } catch (e) {
      toast({ title: "Erro ao guardar horário", description: "Verifica os dados e tenta novamente.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!horario) return;
    setSaving(true);
    try {
      await deleteAlunoHorario(horario.id);
      toast({ title: "Horário removido", description: "As aulas futuras associadas foram apagadas." });
      onClose();
    } catch {
      toast({ title: "Erro ao remover horário", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            {horario ? "Editar Horário Recorrente" : "Configurar Horário Recorrente"}
          </DialogTitle>
          <DialogDescription>{aluno.nome}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Disciplina + Explicador */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Disciplina *</Label>
              {disciplinasDoAluno.length === 0 ? (
                <p className="text-xs text-muted-foreground mt-2">
                  Este aluno não tem disciplinas. Adiciona disciplinas frequentadas primeiro.
                </p>
              ) : (
                <Select value={disciplinaId} onValueChange={onDisciplinaChange}>
                  <SelectTrigger><SelectValue placeholder="Disciplina" /></SelectTrigger>
                  <SelectContent>
                    {disciplinasDoAluno.map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label>Explicador</Label>
              <Select value={explicadorId} onValueChange={setExplicadorId}>
                <SelectTrigger><SelectValue placeholder="Explicador" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem professor</SelectItem>
                  {explicadoresAtivos.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sala + Duração */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Sala</Label>
              <Select value={salaId} onValueChange={setSalaId}>
                <SelectTrigger><SelectValue placeholder="Sala" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">A definir</SelectItem>
                  {salas.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Duração</Label>
              <Select value={String(duracaoMin)} onValueChange={v => setDuracaoMin(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURACOES.map(d => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Construtor semanal */}
          <div>
            <Label>Dias e horas</Label>
            <div className="mt-2 space-y-2">
              {slots.map((slot, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select value={String(slot.diaSemana)} onValueChange={v => updateSlot(i, { diaSemana: Number(v) })}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DIAS_SEMANA.map(d => <SelectItem key={d.valor} value={String(d.valor)}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    type="time"
                    value={slot.horaInicio}
                    onChange={e => updateSlot(i, { horaInicio: e.target.value })}
                    className="w-28"
                  />
                  <Button
                    type="button" variant="ghost" size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeSlot(i)}
                    disabled={slots.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="border-dashed" onClick={addSlot}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar dia/hora
              </Button>
            </div>
          </div>

          {/* Período */}
          <div className="space-y-3 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="ano-letivo"
                checked={anoLetivoInteiro}
                onCheckedChange={v => setAnoLetivoInteiro(v === true)}
              />
              <Label htmlFor="ano-letivo" className="cursor-pointer font-normal">Gerar para o ano letivo inteiro?</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Início</Label>
                <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Fim</Label>
                <Input
                  type="date"
                  value={dataFimEfetiva}
                  onChange={e => setDataFim(e.target.value)}
                  disabled={anoLetivoInteiro}
                  min={dataInicio}
                />
              </div>
            </div>
            {anoLetivoInteiro && dataFimEfetiva && (
              <p className="text-xs text-muted-foreground">
                Fim do ano letivo: {format(parseISO(dataFimEfetiva), "d 'de' MMMM 'de' yyyy", { locale: pt })}.
              </p>
            )}
          </div>

          {/* Aviso de consentimento */}
          <Alert variant="destructive" className="border-warning/40 bg-warning/5 text-foreground">
            <AlertTriangle className="h-4 w-4 !text-warning" />
            <AlertDescription className="text-sm">
              Atenção: Confirmar esta ação irá criar ou alterar automaticamente dezenas de aulas no calendário!
              {previewCount > 0 && <> Serão sincronizadas <strong>{previewCount} aula(s)</strong> futuras.</>}
            </AlertDescription>
          </Alert>

          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </div>

        <div className="flex items-center justify-between gap-3 mt-2">
          {horario ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="text-destructive hover:text-destructive" disabled={saving}>
                  <Trash2 className="h-4 w-4 mr-1" /> Remover
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover este horário base?</AlertDialogTitle>
                  <AlertDialogDescription>
                    As aulas futuras agendadas geradas por este horário serão apagadas do calendário. As aulas já
                    realizadas e as criadas manualmente não são afetadas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Remover
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : <span />}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saving || disciplinasDoAluno.length === 0}>
              {saving ? "A guardar..." : "Confirmar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
