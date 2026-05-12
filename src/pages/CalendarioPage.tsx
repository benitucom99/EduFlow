import { useState, useMemo, useEffect } from "react";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Plus, AlertTriangle, UserRound, MapPin, Clock, Users } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { addDays, startOfWeek, format, isToday, addWeeks, subWeeks, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { disciplinas, Aula } from "@/data/mockData";

// ─── Layout constants ────────────────────────────────────────────────────────
const HOUR_HEIGHT = 64; // px per hour
const START_HOUR = 8;
const END_HOUR = 20;
const TOTAL_HOURS = END_HOUR - START_HOUR;

const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => i + START_HOUR);

// ─── Professor pastel palette ─────────────────────────────────────────────────
const PROFESSOR_COLORS = [
  { bg: "#DBEAFE", text: "#1E40AF", border: "#3B82F6" }, // blue
  { bg: "#D1FAE5", text: "#065F46", border: "#10B981" }, // mint
  { bg: "#EDE9FE", text: "#5B21B6", border: "#8B5CF6" }, // lilac
  { bg: "#FEE2E2", text: "#991B1B", border: "#EF4444" }, // peach
  { bg: "#FEF3C7", text: "#92400E", border: "#F59E0B" }, // amber
  { bg: "#FCE7F3", text: "#9D174D", border: "#EC4899" }, // pink
];

/** Cor estável por professor: mesmo ID/nome → mesma cor (ciclo modular). */
function getProfPalette(expId: string, allExplicadores: { id: string }[]) {
  const idx = allExplicadores.findIndex(e => e.id === expId);
  return PROFESSOR_COLORS[(idx < 0 ? 0 : idx) % PROFESSOR_COLORS.length];
}

// ─── Overlap layout ───────────────────────────────────────────────────────────
function timeToMin(t: string) {
  const [h, m] = (t || "00:00").split(":").map(Number);
  return h * 60 + m;
}

function layoutAulas(aulas: Aula[]) {
  const sorted = [...aulas].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  const colEnds: string[] = [];
  const placements: Array<{ aula: Aula; col: number }> = [];

  for (const aula of sorted) {
    let col = colEnds.findIndex(end => end <= aula.horaInicio);
    if (col === -1) col = colEnds.length;
    colEnds[col] = aula.horaFim || "23:59";
    placements.push({ aula, col });
  }

  const totalCols = Math.max(colEnds.length, 1);
  return placements.map(p => ({ ...p, totalCols }));
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CalendarioPage() {
  const { aulas, setAulas, alunos, explicadores, salas } = useData();
  const { toast } = useToast();
  const [view, setView] = useState<"semana" | "dia">("semana");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expFilter, setExpFilter] = useState("todos");
  const [salaFilter, setSalaFilter] = useState("todas");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAula, setEditingAula] = useState<Aula | null>(null);
  const [detailAula, setDetailAula] = useState<Aula | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  const navigate = (dir: number) => {
    if (view === "semana") setCurrentDate(d => dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1));
    else setCurrentDate(d => addDays(d, dir));
  };

  const filteredAulas = useMemo(() => aulas.filter(a => {
    if (a.estado === "cancelada") return false;
    if (expFilter !== "todos" && a.explicadorId !== expFilter) return false;
    if (salaFilter !== "todas" && a.salaId !== salaFilter) return false;
    return true;
  }), [aulas, expFilter, salaFilter]);

  const getAulasForDate = (dateStr: string) => filteredAulas.filter(a => a.data === dateStr);

  // Current time position
  const nowMin = (now.getHours() - START_HOUR) * 60 + now.getMinutes();
  const nowTop = nowMin * (HOUR_HEIGHT / 60);
  const nowVisible = nowMin >= 0 && nowMin <= TOTAL_HOURS * 60;

  // View days
  const viewDays = view === "semana" ? weekDays : [currentDate];

  const dateLabel = view === "semana"
    ? `${format(weekDays[0], "d MMM", { locale: pt })} – ${format(weekDays[4], "d MMM yyyy", { locale: pt })}`
    : format(currentDate, "EEEE, d MMMM yyyy", { locale: pt });

  return (
    <div className="flex flex-col gap-4 animate-fade-in h-full">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Calendário</h1>
          <p className="text-sm text-muted-foreground capitalize">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Navigation */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" className="px-3" onClick={() => setCurrentDate(new Date())}>Hoje</Button>
            <Button variant="outline" size="icon" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>

          {/* View selector */}
          <div className="flex border rounded-lg overflow-hidden text-sm">
            {(["semana", "dia"] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 font-medium capitalize transition-colors ${view === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          {/* Filters */}
          <Select value={expFilter} onValueChange={setExpFilter}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Explicador" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {explicadores.map(e => (
                <SelectItem key={e.id} value={e.id}>
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: getProfPalette(e.id, explicadores).border }} />
                    {e.nome}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={salaFilter} onValueChange={setSalaFilter}>
            <SelectTrigger className="w-[110px] h-9"><SelectValue placeholder="Sala" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {salas.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
            </SelectContent>
          </Select>

          <Button size="sm" onClick={() => { setEditingAula(null); setModalOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Nova Aula
          </Button>
        </div>
      </div>

      {/* ── Calendar grid ──────────────────────────────────────────── */}
      <div className="flex flex-col border rounded-xl overflow-hidden bg-card shadow-sm flex-1 min-h-0">
        {/* Day header row */}
        <div className="flex border-b bg-card shrink-0 z-10">
          <div className="w-14 shrink-0 border-r" />
          {viewDays.map(d => (
            <div
              key={d.toISOString()}
              className={`flex-1 py-2 text-center border-r last:border-r-0 ${isToday(d) ? "bg-primary/5" : ""}`}
            >
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {format(d, "EEE", { locale: pt })}
              </p>
              <p className={`text-lg font-bold mt-0.5 leading-none w-8 h-8 flex items-center justify-center rounded-full mx-auto ${isToday(d) ? "bg-primary text-primary-foreground" : ""}`}>
                {format(d, "d")}
              </p>
            </div>
          ))}
        </div>

        {/* Scrollable time grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex relative" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>

            {/* Time labels */}
            <div className="w-14 shrink-0 border-r relative">
              {hours.slice(0, -1).map((h, i) => (
                <div
                  key={h}
                  className="absolute right-2 text-[11px] text-muted-foreground leading-none"
                  style={{ top: i * HOUR_HEIGHT - 7 }}
                >
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {/* Day columns */}
            {viewDays.map(day => {
              const dateStr = format(day, "yyyy-MM-dd");
              const dayLayout = layoutAulas(getAulasForDate(dateStr));

              return (
                <div
                  key={dateStr}
                  className={`flex-1 relative border-r last:border-r-0 overflow-hidden ${isToday(day) ? "bg-primary/[0.02]" : ""}`}
                >
                  {/* Hour grid lines */}
                  {hours.map((h, i) => (
                    <div
                      key={h}
                      className="absolute w-full border-t border-border/40"
                      style={{ top: i * HOUR_HEIGHT }}
                    />
                  ))}
                  {/* Half-hour lines (lighter) */}
                  {hours.slice(0, -1).map((h, i) => (
                    <div
                      key={`half-${h}`}
                      className="absolute w-full border-t border-border/20"
                      style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                    />
                  ))}

                  {/* Current time line */}
                  {isToday(day) && nowVisible && (
                    <div
                      className="absolute w-full z-20 flex items-center pointer-events-none"
                      style={{ top: nowTop }}
                    >
                      <div className="h-3 w-3 rounded-full bg-red-500 -ml-1.5 shrink-0 shadow-sm" />
                      <div className="flex-1 h-[2px] bg-red-500" />
                    </div>
                  )}

                  {/* Aula cards */}
                  {dayLayout.map(({ aula, col, totalCols }) => {
                    const palette = getProfPalette(aula.explicadorId, explicadores);
                    const exp = explicadores.find(e => e.id === aula.explicadorId);
                    const aluno = alunos.find(a => a.id === aula.alunoIds[0]);
                    const sala = salas.find(s => s.id === aula.salaId);

                    const topPx = (timeToMin(aula.horaInicio) - START_HOUR * 60) * (HOUR_HEIGHT / 60);
                    const endMin = aula.horaFim ? timeToMin(aula.horaFim) : timeToMin(aula.horaInicio) + 60;
                    const heightPx = Math.max((endMin - timeToMin(aula.horaInicio)) * (HOUR_HEIGHT / 60) - 3, 22);
                    const colW = 100 / totalCols;
                    const leftPct = col * colW;

                    return (
                      <div
                        key={aula.id}
                        className="absolute rounded-lg px-2 py-1.5 cursor-pointer overflow-hidden shadow-sm hover:shadow-md hover:brightness-[0.97] transition-all z-10 select-none"
                        style={{
                          top: topPx + 2,
                          height: heightPx,
                          left: `calc(${leftPct}% + 2px)`,
                          width: `calc(${colW}% - 4px)`,
                          backgroundColor: palette.bg,
                          color: palette.text,
                          borderLeft: `3px solid ${palette.border}`,
                        }}
                        onClick={() => setDetailAula(aula)}
                      >
                        {/* Time */}
                        <div className="flex items-center gap-1 leading-none">
                          <Clock className="h-2.5 w-2.5 shrink-0 opacity-60" />
                          <span className="text-[9px] font-sans tabular-nums opacity-60">
                            {aula.horaInicio} – {aula.horaFim}
                          </span>
                        </div>

                        {/* Discipline — always visible */}
                        <p className="text-[11px] font-bold font-heading leading-tight mt-0.5 truncate">
                          {aula.disciplina}
                        </p>

                        {/* Student */}
                        {heightPx > 44 && (
                          <p className="text-[10px] truncate leading-tight opacity-80">
                            {aula.tipo === "grupo" ? `Grupo (${aula.alunoIds.length} alunos)` : aluno?.nome}
                          </p>
                        )}

                        {/* Footer: professor + room */}
                        {heightPx > 72 && (
                          <div
                            className="flex items-center justify-between mt-1 pt-1 gap-1"
                            style={{ borderTop: `1px solid ${palette.border}30` }}
                          >
                            <div className="flex items-center gap-0.5 min-w-0">
                              <UserRound className="h-2.5 w-2.5 shrink-0 opacity-60" />
                              <span className="text-[9px] truncate opacity-70">{exp?.nome}</span>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <MapPin className="h-2.5 w-2.5 shrink-0 opacity-60" />
                              <span className="text-[9px] opacity-70">{sala?.nome}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Aula detail dialog ─────────────────────────────────────── */}
      <Dialog open={!!detailAula} onOpenChange={() => setDetailAula(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Detalhes da Aula</DialogTitle></DialogHeader>
          {detailAula && (() => {
            const exp = explicadores.find(e => e.id === detailAula.explicadorId);
            const sala = salas.find(s => s.id === detailAula.salaId);
            const alunosList = detailAula.alunoIds.map(id => alunos.find(a => a.id === id)?.nome).filter(Boolean);
            const palette = getProfPalette(detailAula.explicadorId, explicadores);
            return (
              <div className="space-y-4">
                <div className="rounded-lg p-3" style={{ backgroundColor: palette.bg, color: palette.text, borderLeft: `4px solid ${palette.border}` }}>
                  <p className="font-bold text-lg font-heading">{detailAula.disciplina}</p>
                  <p className="text-sm opacity-90">{detailAula.horaInicio} – {detailAula.horaFim} · {format(parseISO(detailAula.data), "dd/MM/yyyy")}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div><p className="text-xs text-muted-foreground">Professor</p><p className="font-medium">{exp?.nome}</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div><p className="text-xs text-muted-foreground">Sala</p><p className="font-medium">{sala?.nome}</p></div>
                  </div>
                </div>
                <div className="text-sm">
                  <p className="text-xs text-muted-foreground mb-1">Aluno(s)</p>
                  <p className="font-medium">{alunosList.join(", ")}</p>
                </div>
                {detailAula.notas && (
                  <div className="text-sm">
                    <p className="text-xs text-muted-foreground mb-1">Notas</p>
                    <p>{detailAula.notas}</p>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setDetailAula(null)}>Fechar</Button>
                  <Button onClick={() => { setEditingAula(detailAula); setModalOpen(true); setDetailAula(null); }}>Editar</Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── New/Edit Aula modal ────────────────────────────────────── */}
      <AulaModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingAula(null); }}
        aula={editingAula}
        onSave={(data) => {
          if (editingAula) {
            setAulas(prev => prev.map(a => a.id === editingAula.id ? { ...a, ...data } : a));
            toast({ title: "Aula atualizada" });
          } else {
            setAulas(prev => [...prev, { ...data, id: `aula${Date.now()}`, estado: "agendada" as const, presencas: {} }]);
            toast({ title: "Aula agendada com sucesso" });
          }
          setModalOpen(false); setEditingAula(null);
        }}
        onCancel={editingAula ? () => {
          setAulas(prev => prev.map(a => a.id === editingAula.id ? { ...a, estado: "cancelada" as const } : a));
          toast({ title: "Aula cancelada" }); setModalOpen(false); setEditingAula(null);
        } : undefined}
      />
    </div>
  );
}

// ─── AulaModal (unchanged logic) ─────────────────────────────────────────────
const horaOptions = Array.from({ length: 26 }, (_, i) => {
  const h = Math.floor(i / 2) + 8;
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

function AulaModal({ open, onClose, aula, onSave, onCancel }: {
  open: boolean; onClose: () => void; aula: Aula | null;
  onSave: (data: any) => void; onCancel?: () => void;
}) {
  const { alunos, explicadores, salas, aulas } = useData();
  const [tipo, setTipo] = useState<"individual" | "grupo">(aula?.tipo || "individual");
  const [disciplina, setDisciplina] = useState(aula?.disciplina || "");
  const [alunoIds, setAlunoIds] = useState<string[]>(aula?.alunoIds || []);
  const [explicadorId, setExplicadorId] = useState(aula?.explicadorId || "");
  const [salaId, setSalaId] = useState(aula?.salaId || "auto");
  const [data, setData] = useState(aula?.data || format(new Date(), "yyyy-MM-dd"));
  const [horaInicio, setHoraInicio] = useState(aula?.horaInicio || "09:00");
  const [duracao, setDuracao] = useState("60");
  const [recorrencia, setRecorrencia] = useState<string>(aula?.recorrencia || "unica");
  const [notas, setNotas] = useState(aula?.notas || "");

  useState(() => {
    if (open) {
      setTipo(aula?.tipo || "individual");
      setDisciplina(aula?.disciplina || "");
      setAlunoIds(aula?.alunoIds || []);
      setExplicadorId(aula?.explicadorId || "");
      setSalaId(aula?.salaId || "auto");
      setData(aula?.data || format(new Date(), "yyyy-MM-dd"));
      setHoraInicio(aula?.horaInicio || "09:00");
      setNotas(aula?.notas || "");
    }
  });

  const expsFiltrados = disciplina
    ? explicadores.filter(e => e.disciplinas.includes(disciplina) && e.estado === "ativo")
    : explicadores.filter(e => e.estado === "ativo");
  const capacidadeMin = tipo === "individual" ? 1 : Math.max(alunoIds.length, 1);
  const salasFiltradas = salas.filter(s => s.estado === "disponível" && s.capacidade >= capacidadeMin);

  const autoSalaId = (() => {
    if (!data || !horaInicio) return "";
    const candidates = [...salasFiltradas].sort((a, b) => a.capacidade - b.capacidade);
    for (const s of candidates) {
      const ocupada = aulas.find(a => a.id !== aula?.id && a.salaId === s.id && a.data === data && a.horaInicio === horaInicio && a.estado !== "cancelada");
      if (!ocupada) return s.id;
    }
    return "";
  })();
  const resolvedSalaId = salaId === "auto" ? autoSalaId : salaId;
  const autoSalaNome = salas.find(s => s.id === autoSalaId)?.nome;

  const conflicts: string[] = [];
  if (explicadorId && data && horaInicio) {
    const existing = aulas.find(a => a.id !== aula?.id && a.explicadorId === explicadorId && a.data === data && a.horaInicio === horaInicio && a.estado !== "cancelada");
    if (existing) {
      const al = alunos.find(a => a.id === existing.alunoIds[0]);
      conflicts.push(`⚠️ O explicador já tem aula neste horário (${existing.horaInicio} com ${al?.nome})`);
    }
    const exp = explicadores.find(e => e.id === explicadorId);
    if (exp && exp.disponibilidade.length > 0) {
      const diaSemana = new Date(data + "T00:00:00").getDay() || 7;
      const corrigido = diaSemana === 7 ? 0 : diaSemana;
      const disponivel = exp.disponibilidade.some(d =>
        d.diaSemana === corrigido && horaInicio >= d.horaInicio && horaInicio < d.horaFim
      );
      if (!disponivel) conflicts.push(`⚠️ ${exp.nome} não tem disponibilidade marcada para este dia/horário`);
    }
  }
  if (salaId === "auto" && !autoSalaId && data && horaInicio) {
    conflicts.push(`⚠️ Sem salas disponíveis para este horário`);
  } else if (salaId !== "auto" && salaId && data && horaInicio) {
    const existing = aulas.find(a => a.id !== aula?.id && a.salaId === salaId && a.data === data && a.horaInicio === horaInicio && a.estado !== "cancelada");
    if (existing) conflicts.push(`⚠️ A sala já está ocupada neste horário`);
  }
  if (alunoIds.length > 0 && data && horaInicio) {
    alunoIds.forEach(aid => {
      const existing = aulas.find(a => a.id !== aula?.id && a.alunoIds.includes(aid) && a.data === data && a.horaInicio === horaInicio && a.estado !== "cancelada");
      if (existing) {
        const al = alunos.find(a => a.id === aid);
        conflicts.push(`⚠️ ${al?.nome} já tem aula neste horário`);
      }
    });
  }

  const endHour = () => {
    const [h, m] = horaInicio.split(":").map(Number);
    const totalMin = h * 60 + m + parseInt(duracao);
    return `${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;
  };

  const handleSave = () => {
    if (!disciplina || alunoIds.length === 0 || !explicadorId || !resolvedSalaId) return;
    onSave({ tipo, disciplina, alunoIds, explicadorId, salaId: resolvedSalaId, data, horaInicio, horaFim: endHour(), recorrencia, notas });
  };

  const alunosAtivos = alunos.filter(a => a.estado === "ativo");

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col gap-0">
        <SheetHeader className="px-6 py-5 border-b shrink-0">
          <SheetTitle className="text-xl font-heading">{aula ? "Editar Aula" : "Nova Aula"}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
          {/* ─── Detalhes da Aula ─────────────────────────────── */}
          <section className="space-y-4">
            <h3 className="text-base font-bold font-heading">Detalhes da Aula</h3>

            {/* Tipo (cartões visuais) */}
            <div>
              <Label className="text-sm mb-2 block">Tipo</Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "individual", label: "Individual", Icon: UserRound },
                  { value: "grupo", label: "Grupo", Icon: Users },
                ].map(({ value, label, Icon }) => {
                  const active = tipo === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTipo(value as any)}
                      className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors ${
                        active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <Icon className={`h-7 w-7 ${active ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.75} />
                      <span className={`text-sm font-medium ${active ? "text-primary" : "text-foreground"}`}>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Aluno(s) */}
            <div>
              <Label className="text-sm">Aluno(s) <span className="text-destructive">*</span></Label>
              {tipo === "individual" ? (
                <Select value={alunoIds[0] || ""} onValueChange={v => setAlunoIds([v])}>
                  <SelectTrigger><SelectValue placeholder="Selecionar aluno" /></SelectTrigger>
                  <SelectContent>
                    {alunosAtivos.map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <div className="grid grid-cols-2 gap-1 mt-2 max-h-40 overflow-y-auto border rounded-md p-2">
                  {alunosAtivos.map(a => (
                    <div key={a.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={alunoIds.includes(a.id)}
                        onCheckedChange={c => setAlunoIds(prev => c ? [...prev, a.id] : prev.filter(x => x !== a.id))}
                      />
                      <span className="text-sm">{a.nome}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Disciplina */}
            <div>
              <Label className="text-sm">Disciplina <span className="text-destructive">*</span></Label>
              <Select value={disciplina} onValueChange={setDisciplina}>
                <SelectTrigger><SelectValue placeholder="Selecionar disciplina" /></SelectTrigger>
                <SelectContent>{disciplinas.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Explicador */}
            <div>
              <Label className="text-sm">Explicador <span className="text-destructive">*</span></Label>
              <Select value={explicadorId} onValueChange={setExplicadorId}>
                <SelectTrigger><SelectValue placeholder="Selecionar explicador" /></SelectTrigger>
                <SelectContent>
                  {expsFiltrados.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: getProfPalette(e.id, explicadores).border }} />
                        {e.nome} ({e.valorHora}€/h)
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sala */}
            <div>
              <Label className="text-sm">Sala <span className="text-destructive">*</span></Label>
              <Select value={salaId} onValueChange={setSalaId}>
                <SelectTrigger><SelectValue placeholder="Selecionar sala" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automática{autoSalaNome ? ` (${autoSalaNome})` : ""}</SelectItem>
                  {salasFiltradas.map(s => <SelectItem key={s.id} value={s.id}>{s.nome} (cap. {s.capacidade})</SelectItem>)}
                </SelectContent>
              </Select>
              {salaId === "auto" && autoSalaNome && (
                <p className="text-xs text-muted-foreground mt-1">Sala atribuída: {autoSalaNome}</p>
              )}
            </div>
          </section>

          {/* ─── Agendamento ──────────────────────────────────── */}
          <section className="space-y-4 pt-6 border-t">
            <h3 className="text-base font-bold font-heading">Agendamento</h3>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-sm">Data</Label>
                <Input type="date" value={data} onChange={e => setData(e.target.value)} />
              </div>
              <div>
                <Label className="text-sm">Hora Início</Label>
                <Select value={horaInicio} onValueChange={setHoraInicio}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{horaOptions.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Duração</Label>
                <Select value={duracao} onValueChange={setDuracao}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="90">1h30</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Recorrência toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Recorrência</Label>
                <Switch
                  checked={recorrencia !== "unica"}
                  onCheckedChange={c => setRecorrencia(c ? "semanal" : "unica")}
                />
              </div>
              {recorrencia !== "unica" && (
                <Select value={recorrencia} onValueChange={setRecorrencia}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="quinzenal">Quinzenal</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </section>

          {/* ─── Informações Adicionais ───────────────────────── */}
          <section className="space-y-4 pt-6 border-t">
            <h3 className="text-base font-bold font-heading">Informações Adicionais</h3>

            <div>
              <Label className="text-sm">Notas</Label>
              <div className="relative">
                <Textarea
                  value={notas}
                  onChange={e => setNotas(e.target.value.slice(0, 500))}
                  rows={4}
                  className="resize-none pr-14"
                />
                <span className="absolute bottom-2 right-3 text-xs text-muted-foreground tabular-nums">
                  {notas.length}/500
                </span>
              </div>
            </div>
          </section>

          {/* Conflitos */}
          {conflicts.length > 0 && (
            <div className="space-y-2">
              {conflicts.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded-md">
                  <AlertTriangle className="h-4 w-4 shrink-0" /> {c}
                </div>
              ))}
            </div>
          )}

          {/* Cancelar Aula (modo edição) */}
          {onCancel && (
            <div className="pt-4 border-t">
              <Button variant="destructive" className="w-full" onClick={onCancel}>
                Cancelar Aula
              </Button>
            </div>
          )}
        </div>

        {/* ─── Footer ─────────────────────────────────────────── */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-muted/30 shrink-0">
          <Button
            onClick={handleSave}
            disabled={conflicts.length > 0 || !disciplina || alunoIds.length === 0 || !explicadorId}
          >
            {aula ? "Guardar" : "Criar Aula"}
          </Button>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
