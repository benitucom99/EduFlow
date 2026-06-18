import { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Plus, AlertTriangle, UserRound, MapPin, Clock, Users, ChevronsUpDown, Check, Search, Trash2, Printer } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { addDays, startOfWeek, startOfMonth, format, isToday, addWeeks, subWeeks, addMonths, subMonths, isSameMonth, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { folhasAgrupadas } from "@/lib/disciplinas";
import { Aula } from "@/contexts/DataContext";

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

/**
 * Fim do ano letivo (30 de Junho) consoante a data inicial.
 *  - Set–Dez (mês ≥ 8): ano letivo termina em 30 de Junho do ano seguinte
 *  - Jan–Jun (mês ≤ 5): ano letivo termina em 30 de Junho do mesmo ano
 *  - Jul–Ago (interregno): assume o ano letivo que está prestes a começar → Jun do ano seguinte
 */
function getSchoolYearEnd(startDate: Date): Date {
  const month = startDate.getMonth();
  const year = startDate.getFullYear();
  if (month <= 5) return new Date(year, 5, 30);     // Jan-Jun → Jun mesmo ano
  return new Date(year + 1, 5, 30);                 // Jul-Dez → Jun ano seguinte
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
  const { aulas, createAulas, updateAula, cancelAula, alunos, explicadores, salas, disciplinas, marcarReposicaoAgendada } = useData();
  const discNames = disciplinas.map(d => d.nome);
  const { toast } = useToast();
  const { user } = useAuth();
  const location = useLocation();
  const routerNavigate = useNavigate();
  const isExplicador = user?.role === "explicador";
  // Reposição em curso (veio do Dashboard/pop-up): aluno a pré-selecionar e a
  // falta original a marcar como agendada ao guardar.
  const [reposicaoCtx, setReposicaoCtx] = useState<{ alunoId: string; aulaOriginalId: string } | null>(null);
  const [view, setView] = useState<"semana" | "dia" | "mes">("semana");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expFilter, setExpFilter] = useState("todos");
  const [salaFilter, setSalaFilter] = useState("todas");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAula, setEditingAula] = useState<Aula | null>(null);
  const [prefill, setPrefill] = useState<{ data: string; horaInicio: string } | null>(null);
  const [detailAula, setDetailAula] = useState<Aula | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Reposição vinda do Dashboard: abre o modal de Nova Aula com o aluno
  // pré-selecionado e a checkbox de reposição ligada. Consome o state e limpa-o
  // (replace) para não reabrir em re-renders/navegação para trás.
  useEffect(() => {
    const rep = (location.state as { reposicao?: { alunoId: string; aulaOriginalId: string } } | null)?.reposicao;
    if (!rep) return;
    setReposicaoCtx({ alunoId: rep.alunoId, aulaOriginalId: rep.aulaOriginalId });
    setEditingAula(null);
    setPrefill(null);
    setModalOpen(true);
    routerNavigate(location.pathname, { replace: true, state: null });
  }, [location, routerNavigate]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  // Semana completa: Seg→Dom (inclui fim de semana).
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const navigate = (dir: number) => {
    if (view === "semana") setCurrentDate(d => dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1));
    else if (view === "mes") setCurrentDate(d => dir > 0 ? addMonths(d, 1) : subMonths(d, 1));
    else setCurrentDate(d => addDays(d, dir));
  };

  const filteredAulas = useMemo(() => aulas.filter(a => {
    if (a.estado === "cancelada") return false;
    // Explicador só vê as próprias aulas.
    if (isExplicador && a.explicadorId !== user?.id) return false;
    if (expFilter !== "todos" && a.explicadorId !== expFilter) return false;
    if (salaFilter !== "todas" && a.salaId !== salaFilter) return false;
    return true;
  }), [aulas, expFilter, salaFilter, isExplicador, user?.id]);

  const getAulasForDate = (dateStr: string) => filteredAulas.filter(a => a.data === dateStr);

  // Current time position
  const nowMin = (now.getHours() - START_HOUR) * 60 + now.getMinutes();
  const nowTop = nowMin * (HOUR_HEIGHT / 60);
  const nowVisible = nowMin >= 0 && nowMin <= TOTAL_HOURS * 60;

  // View days
  const viewDays = view === "semana" ? weekDays : [currentDate];

  const dateLabel = view === "semana"
    ? `${format(weekDays[0], "d MMM", { locale: pt })} – ${format(weekDays[6], "d MMM yyyy", { locale: pt })}`
    : view === "mes"
    ? format(currentDate, "MMMM yyyy", { locale: pt })
    : format(currentDate, "EEEE, d MMMM yyyy", { locale: pt });

  const handleDayClick = (e: React.MouseEvent<HTMLDivElement>, dateStr: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minutesFromStart = (y / HOUR_HEIGHT) * 60;
    const totalMinutes = Math.round((START_HOUR * 60 + minutesFromStart) / 30) * 30;
    const h = Math.min(Math.max(Math.floor(totalMinutes / 60), START_HOUR), END_HOUR - 1);
    const m = totalMinutes % 60 < 30 ? 0 : 30;
    const horaInicio = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    setPrefill({ data: dateStr, horaInicio });
    setEditingAula(null);
    setModalOpen(true);
  };

  const handleCancelDetail = async () => {
    if (!detailAula) return;
    try {
      await cancelAula(detailAula.id);
      toast({ title: "Aula cancelada" });
    } catch {
      toast({ title: "Erro ao cancelar aula", description: "Tenta novamente.", variant: "destructive" });
    } finally {
      setConfirmCancel(false);
      setDetailAula(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in h-full print:h-auto">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Calendário</h1>
          <p className="text-sm text-muted-foreground capitalize">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap print:hidden">
          {/* Navigation */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" className="px-3" onClick={() => setCurrentDate(new Date())}>Hoje</Button>
            <Button variant="outline" size="icon" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>

          {/* View selector */}
          <div className="flex border rounded-lg overflow-hidden text-sm">
            {(["mes", "semana", "dia"] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 font-medium capitalize transition-colors ${view === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                {v === "mes" ? "Mês" : v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          {/* Filters */}
          {!isExplicador && (
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
          )}
          <Select value={salaFilter} onValueChange={setSalaFilter}>
            <SelectTrigger className="w-[110px] h-9"><SelectValue placeholder="Sala" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {salas.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
            </SelectContent>
          </Select>

          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> Exportar PDF
          </Button>

          <Button size="sm" onClick={() => { setEditingAula(null); setModalOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Nova Aula
          </Button>
        </div>
      </div>

      {/* ── Calendar grid ──────────────────────────────────────────── */}
      {view === "mes" ? (
        <MonthView
          currentDate={currentDate}
          filteredAulas={filteredAulas}
          explicadores={explicadores}
          alunos={alunos}
          onCellClick={(dateStr) => {
            setPrefill({ data: dateStr, horaInicio: "09:00" });
            setEditingAula(null);
            setModalOpen(true);
          }}
          onAulaClick={(aula) => setDetailAula(aula)}
        />
      ) : (
      <div className="flex flex-col border rounded-xl overflow-hidden bg-card shadow-sm flex-1 min-h-0 print:overflow-visible print:flex-none print:shadow-none">
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
        <div className="flex-1 overflow-y-auto print:overflow-visible">
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
                  onClick={e => handleDayClick(e, dateStr)}
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

                  {/* Draft card — visible while create modal is open */}
                  {prefill && prefill.data === dateStr && modalOpen && (() => {
                    const draftTop = (timeToMin(prefill.horaInicio) - START_HOUR * 60) * (HOUR_HEIGHT / 60);
                    const endMin = timeToMin(prefill.horaInicio) + 60;
                    const draftEnd = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
                    return (
                      <div
                        className="absolute rounded-lg px-2 py-1.5 border-2 border-dashed border-primary/60 bg-primary/10 pointer-events-none animate-pulse z-10 select-none overflow-hidden"
                        style={{ top: draftTop + 2, height: HOUR_HEIGHT - 3, left: 2, right: 2 }}
                      >
                        <p className="text-[9px] font-sans tabular-nums text-primary/70 leading-none">
                          {prefill.horaInicio} – {draftEnd}
                        </p>
                        <p className="text-[11px] font-bold font-heading text-primary leading-tight mt-0.5">
                          Nova Aula
                        </p>
                      </div>
                    );
                  })()}

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
                        onClick={e => { e.stopPropagation(); setDetailAula(aula); }}
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
      )}

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
                <div className="flex justify-between items-center gap-2 pt-2">
                  <div>
                    {detailAula.estado !== "cancelada" && (
                      <Button variant="destructive" onClick={() => setConfirmCancel(true)}>
                        <Trash2 className="h-4 w-4 mr-1" /> Cancelar Aula
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setDetailAula(null)}>Fechar</Button>
                    <Button onClick={() => { setEditingAula(detailAula); setModalOpen(true); setDetailAula(null); }}>Editar</Button>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Confirmação de cancelamento da aula ────────────────────── */}
      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar esta aula?</AlertDialogTitle>
            <AlertDialogDescription>
              Tens a certeza que queres cancelar esta aula? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelDetail} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Cancelar Aula
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── New/Edit Aula modal ────────────────────────────────────── */}
      <AulaModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingAula(null); setPrefill(null); setReposicaoCtx(null); }}
        aula={editingAula}
        prefill={prefill ?? undefined}
        reposicaoAlunoId={reposicaoCtx?.alunoId ?? null}
        onSave={async (aulasToCreate) => {
          try {
            if (editingAula) {
              await updateAula(editingAula.id, aulasToCreate[0]);
              toast({ title: "Aula atualizada" });
            } else {
              await createAulas(aulasToCreate);
              toast({
                title: aulasToCreate.length > 1 ? `${aulasToCreate.length} aulas agendadas` : "Aula agendada com sucesso",
              });
              // Se foi criada a partir de uma reposição pendente, marca a falta
              // original como agendada (sai do Dashboard). A aula já foi criada
              // com sucesso — se isto falhar, avisa mas não bloqueia.
              if (reposicaoCtx) {
                try {
                  await marcarReposicaoAgendada(reposicaoCtx.aulaOriginalId, reposicaoCtx.alunoId);
                } catch {
                  toast({ title: "Aula criada, mas a pendência não foi atualizada", description: "Atualiza a página e tenta marcar de novo.", variant: "destructive" });
                }
              }
            }
            setModalOpen(false); setEditingAula(null); setPrefill(null); setReposicaoCtx(null);
          } catch {
            toast({ title: "Erro ao guardar aula", description: "Tenta novamente.", variant: "destructive" });
          }
        }}
        onCancel={editingAula ? async () => {
          try {
            await cancelAula(editingAula.id);
            toast({ title: "Aula cancelada" }); setModalOpen(false); setEditingAula(null);
          } catch {
            toast({ title: "Erro ao cancelar aula", description: "Tenta novamente.", variant: "destructive" });
          }
        } : undefined}
      />
    </div>
  );
}

// ─── MonthView ────────────────────────────────────────────────────────────────
const MONTH_DAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function MonthView({ currentDate, filteredAulas, explicadores, alunos, onCellClick, onAulaClick }: {
  currentDate: Date;
  filteredAulas: Aula[];
  explicadores: { id: string }[];
  alunos: { id: string; nome: string }[];
  onCellClick: (dateStr: string) => void;
  onAulaClick: (aula: Aula) => void;
}) {
  const gridStart = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  // Dias cujas pílulas estão expandidas (mostram todas as aulas em vez de só 3).
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const toggleExpanded = (dateStr: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      next.has(dateStr) ? next.delete(dateStr) : next.add(dateStr);
      return next;
    });
  };

  const MAX_VISIBLE = 3;

  return (
    <div className="flex flex-col border rounded-xl overflow-hidden bg-card shadow-sm flex-1 min-h-0">
      {/* Week day headers */}
      <div className="grid grid-cols-7 border-b bg-card shrink-0">
        {MONTH_DAY_LABELS.map(d => (
          <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wide border-r last:border-r-0">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 flex-1 overflow-y-auto">
        {cells.map((day, i) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, currentDate);
          // Pílulas ordenadas por horaInicio crescente (de cima para baixo).
          const dayAulas = filteredAulas
            .filter(a => a.data === dateStr)
            .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
          const isExpanded = expandedDays.has(dateStr);
          const visible = isExpanded ? dayAulas : dayAulas.slice(0, MAX_VISIBLE);
          const overflow = dayAulas.length - MAX_VISIBLE;
          const today = isToday(day);
          const isLastRow = i >= 35;

          return (
            <div
              key={dateStr}
              className={cn(
                "min-h-[90px] border-b border-r p-1 cursor-pointer transition-colors select-none",
                i % 7 === 6 && "border-r-0",
                isLastRow && "border-b-0",
                !inMonth ? "bg-muted/20" : "hover:bg-muted/30"
              )}
              onClick={() => onCellClick(dateStr)}
            >
              <div className="mb-1">
                <span className={cn(
                  "text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full",
                  today && "bg-primary text-primary-foreground",
                  !today && inMonth && "text-foreground",
                  !today && !inMonth && "text-muted-foreground"
                )}>
                  {format(day, "d")}
                </span>
              </div>
              <div className="space-y-px">
                {visible.map(aula => {
                  const palette = getProfPalette(aula.explicadorId, explicadores);
                  // Primeiro nome do 1.º aluno (poupa espaço nas células compactas);
                  // em grupo, acrescenta +N com os restantes alunos.
                  const primeiroNome = alunos.find(a => a.id === aula.alunoIds[0])?.nome?.split(" ")[0] ?? "";
                  const extra = aula.alunoIds.length > 1 ? ` +${aula.alunoIds.length - 1}` : "";
                  const prefixoAluno = primeiroNome ? `${primeiroNome}${extra} · ` : "";
                  return (
                    <button
                      key={aula.id}
                      className="w-full text-left text-[10px] rounded px-1 py-px truncate font-medium leading-tight block"
                      style={{ backgroundColor: palette.bg, color: palette.text, borderLeft: `2px solid ${palette.border}` }}
                      onClick={e => { e.stopPropagation(); onAulaClick(aula); }}
                    >
                      {aula.horaInicio} {prefixoAluno}{aula.disciplina}
                    </button>
                  );
                })}
                {overflow > 0 && (
                  <button
                    className="w-full text-left text-[10px] font-medium text-primary hover:underline pl-1 py-px"
                    onClick={e => { e.stopPropagation(); toggleExpanded(dateStr); }}
                  >
                    {isExpanded ? "Mostrar menos" : `+${overflow} aula${overflow > 1 ? "s" : ""}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── AulaModal (unchanged logic) ─────────────────────────────────────────────
const horaOptions = Array.from({ length: 53 }, (_, i) => {
  const h = Math.floor(i / 4) + 8;
  const mins = (i % 4) * 15;
  const m = mins === 0 ? "00" : mins.toString();
  return `${String(h).padStart(2, "0")}:${m}`;
});

function AulaModal({ open, onClose, aula, prefill, reposicaoAlunoId, onSave, onCancel }: {
  open: boolean; onClose: () => void; aula: Aula | null;
  prefill?: { data: string; horaInicio: string };
  reposicaoAlunoId?: string | null;
  onSave: (aulas: any[]) => void; onCancel?: () => void;
}) {
  const { alunos, explicadores, salas, aulas, disciplinas } = useData();
  const { user } = useAuth();
  const isExplicador = user?.role === "explicador";
  const discGrupos = folhasAgrupadas(disciplinas);
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
  const [isReposicao, setIsReposicao] = useState(false);
  const [alunoPopoverOpen, setAlunoPopoverOpen] = useState(false);
  const [alunoSearch, setAlunoSearch] = useState("");

  useEffect(() => {
    if (open) {
      setTipo(aula?.tipo || "individual");
      setDisciplina(aula?.disciplina || "");
      // Reposição (vinda do Dashboard): pré-seleciona o aluno da falta original.
      setAlunoIds(aula?.alunoIds || (reposicaoAlunoId ? [reposicaoAlunoId] : []));
      setExplicadorId(aula?.explicadorId || (isExplicador ? user?.id ?? "" : ""));
      setSalaId(aula?.salaId || "auto");
      setData(aula?.data || prefill?.data || format(new Date(), "yyyy-MM-dd"));
      setHoraInicio(aula?.horaInicio || prefill?.horaInicio || "09:00");
      setNotas(aula?.notas || "");
      setIsReposicao(!!reposicaoAlunoId);
    }
  }, [open, aula, prefill, reposicaoAlunoId, isExplicador, user?.id]);

  // Ao criar uma aula, se o aluno tiver um professor atribuído a esta disciplina
  // na ficha dele, sugere-o automaticamente (o admin pode na mesma alterar).
  const primeiroAluno = alunoIds[0];
  useEffect(() => {
    if (!open || aula || isExplicador) return;
    if (!disciplina || !primeiroAluno) return;
    const leaf = disciplinas.find(d => d.nome === disciplina);
    if (!leaf) return;
    const al = alunos.find(a => a.id === primeiroAluno);
    const tutor = al?.disciplinaExplicadores?.[leaf.id];
    if (tutor) setExplicadorId(tutor);
  }, [open, aula, isExplicador, disciplina, primeiroAluno, disciplinas, alunos]);

  // Se a disciplina escolhida deixar de pertencer ao(s) aluno(s) selecionado(s)
  // (ex: trocou de aluno depois de escolher), limpa-a para não submeter algo inválido.
  useEffect(() => {
    if (!open || aula) return;
    if (!disciplina || alunoIds.length === 0) return;
    const permitidas = new Set(
      alunoIds.flatMap(id => alunos.find(a => a.id === id)?.disciplinas ?? [])
    );
    if (!permitidas.has(disciplina)) setDisciplina("");
  }, [open, aula, disciplina, alunoIds, alunos]);

  // Alunos selecionados (objetos completos), para filtrar disciplinas/explicadores.
  const alunosSelecionados = alunoIds.map(id => alunos.find(a => a.id === id)).filter(Boolean) as typeof alunos;

  // Disciplinas (nomes) que pelo menos um dos alunos selecionados frequenta.
  // União entre alunos: numa aula de grupo, mostra qualquer disciplina comum a
  // algum deles. Sem alunos selecionados → null = sem filtro (mostra todas).
  const disciplinasPermitidas = alunosSelecionados.length > 0
    ? new Set(alunosSelecionados.flatMap(a => a.disciplinas))
    : null;

  // Grupos de disciplina filtrados às permitidas pelo(s) aluno(s). Grupos que
  // ficam sem folhas são descartados.
  const discGruposFiltrados = disciplinasPermitidas
    ? discGrupos
        .map(g => ({ ...g, folhas: g.folhas.filter(f => disciplinasPermitidas.has(f.nome)) }))
        .filter(g => g.folhas.length > 0)
    : discGrupos;

  // Explicadores sugeridos para os alunos selecionados: quem é o tutor atribuído
  // a alguma disciplina do aluno (disciplinaExplicadores) OU quem dá ativamente
  // a disciplina já escolhida. Sem alunos → null = sem filtro por aluno.
  const explicadoresPorAluno = alunosSelecionados.length > 0
    ? new Set(
        alunosSelecionados.flatMap(a =>
          Object.values(a.disciplinaExplicadores ?? {}).filter((id): id is string => !!id)
        )
      )
    : null;

  const expsFiltrados = explicadores.filter(e => {
    if (e.estado !== "ativo") return false;
    // Filtro por disciplina escolhida (quem a leciona ativamente).
    if (disciplina && !e.disciplinas.includes(disciplina)) {
      // Permite ainda assim o tutor atribuído ao aluno para essa disciplina.
      if (!explicadoresPorAluno?.has(e.id)) return false;
    }
    // Filtro por aluno: se há alunos selecionados mas nenhuma disciplina ainda,
    // mostra os tutores atribuídos + quem dá alguma disciplina do aluno.
    if (!disciplina && explicadoresPorAluno) {
      const dáAlgumaDoAluno = disciplinasPermitidas
        ? e.disciplinas.some(d => disciplinasPermitidas.has(d))
        : false;
      if (!explicadoresPorAluno.has(e.id) && !dáAlgumaDoAluno) return false;
    }
    return true;
  });
  const salasFiltradas = salas;

  const autoSalaId = (() => {
    if (!data || !horaInicio) return "";
    const candidates = [...salasFiltradas].sort((a, b) => a.nome.localeCompare(b.nome));
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
    const base = {
      tipo, disciplina, alunoIds, explicadorId,
      salaId: resolvedSalaId, horaInicio, horaFim: endHour(), recorrencia, notas, isReposicao,
    };
    // Em edição ou aula única → só uma instância. Quinzenal / Ano letivo → várias.
    if (aula || recorrencia === "unica") {
      onSave([{ ...base, data }]);
      return;
    }
    const startDate = parseISO(data);
    const endDate = getSchoolYearEnd(startDate);
    const interval = recorrencia === "quinzenal" ? 14 : 7;
    const aulasToCreate: any[] = [];
    let current = startDate;
    while (current <= endDate) {
      aulasToCreate.push({ ...base, data: format(current, "yyyy-MM-dd") });
      current = addDays(current, interval);
    }
    onSave(aulasToCreate);
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
              {tipo === "individual" ? (() => {
                const selected = alunosAtivos.find(a => a.id === alunoIds[0]);
                return (
                  <Popover open={alunoPopoverOpen} onOpenChange={setAlunoPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={alunoPopoverOpen}
                        className="w-full justify-between font-normal"
                      >
                        <span className={selected ? "" : "text-muted-foreground"}>
                          {selected ? selected.nome : "Pesquisar aluno..."}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Pesquisar aluno..." />
                        <CommandList>
                          <CommandEmpty>Nenhum aluno encontrado.</CommandEmpty>
                          <CommandGroup>
                            {alunosAtivos.map(a => (
                              <CommandItem
                                key={a.id}
                                value={a.nome}
                                onSelect={() => {
                                  setAlunoIds([a.id]);
                                  setAlunoPopoverOpen(false);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", alunoIds[0] === a.id ? "opacity-100" : "opacity-0")} />
                                {a.nome}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                );
              })() : (() => {
                const filtered = alunosAtivos.filter(a =>
                  a.nome.toLowerCase().includes(alunoSearch.toLowerCase())
                );
                return (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Pesquisar aluno..."
                        value={alunoSearch}
                        onChange={e => setAlunoSearch(e.target.value)}
                        className="pl-9 h-9"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto border rounded-md p-2">
                      {filtered.length === 0 ? (
                        <p className="text-sm text-muted-foreground col-span-2 text-center py-2">
                          Nenhum aluno encontrado.
                        </p>
                      ) : filtered.map(a => (
                        <div key={a.id} className="flex items-center gap-2">
                          <Checkbox
                            checked={alunoIds.includes(a.id)}
                            onCheckedChange={c => setAlunoIds(prev => c ? [...prev, a.id] : prev.filter(x => x !== a.id))}
                          />
                          <span className="text-sm truncate">{a.nome}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Disciplina */}
            <div>
              <Label className="text-sm">Disciplina <span className="text-destructive">*</span></Label>
              <Select value={disciplina} onValueChange={setDisciplina}>
                <SelectTrigger><SelectValue placeholder="Selecionar disciplina" /></SelectTrigger>
                <SelectContent>
                  {discGruposFiltrados.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      {disciplinasPermitidas ? "Aluno(s) sem disciplinas associadas" : "Sem disciplinas"}
                    </div>
                  ) : discGruposFiltrados.map((g, gi) => (
                    <SelectGroup key={g.categoriaNome ?? `__sem__${gi}`}>
                      {g.categoriaNome && <SelectLabel>{g.categoriaNome}</SelectLabel>}
                      {g.folhas.map(f => <SelectItem key={f.id} value={f.nome}>{f.nome}</SelectItem>)}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Explicador */}
            <div>
              <Label className="text-sm">Explicador <span className="text-destructive">*</span></Label>
              {isExplicador ? (
                <Input
                  value={explicadores.find(e => e.id === (user?.id ?? ""))?.nome ?? "—"}
                  readOnly
                  disabled
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                />
              ) : (
                <Select value={explicadorId} onValueChange={setExplicadorId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar explicador" /></SelectTrigger>
                  <SelectContent>
                    {expsFiltrados.map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: getProfPalette(e.id, explicadores).border }} />
                          {e.nome}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Sala */}
            <div>
              <Label className="text-sm">Sala <span className="text-destructive">*</span></Label>
              <Select value={salaId} onValueChange={setSalaId}>
                <SelectTrigger><SelectValue placeholder="Selecionar sala" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automática{autoSalaNome ? ` (${autoSalaNome})` : ""}</SelectItem>
                  {salasFiltradas.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
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

            <div>
              <Label className="text-sm">Data</Label>
              <Input type="date" value={data} onChange={e => setData(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                    <SelectItem value="60">1h</SelectItem>
                    <SelectItem value="90">1h30</SelectItem>
                    <SelectItem value="120">2h</SelectItem>
                    <SelectItem value="150">2h30</SelectItem>
                    <SelectItem value="180">3h</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Recorrência: única | quinzenal | ano letivo */}
            <div>
              <Label className="text-sm">Recorrência</Label>
              <Select value={recorrencia} onValueChange={setRecorrencia}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unica">Única</SelectItem>
                  <SelectItem value="quinzenal">Quinzenal (a cada 2 semanas)</SelectItem>
                  <SelectItem value="ano_letivo">Ano letivo (semanal)</SelectItem>
                </SelectContent>
              </Select>
              {recorrencia !== "unica" && data && (() => {
                const start = parseISO(data);
                const end = getSchoolYearEnd(start);
                const interval = recorrencia === "quinzenal" ? 14 : 7;
                let count = 0;
                let current = start;
                while (current <= end) { count++; current = addDays(current, interval); }
                return (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Serão criadas <strong>{count} aulas</strong> até {format(end, "d 'de' MMMM 'de' yyyy", { locale: pt })}.
                  </p>
                );
              })()}
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

            {/* Reposição */}
            <div className="flex items-center gap-2">
              <Checkbox id="is-reposicao" checked={isReposicao} onCheckedChange={v => setIsReposicao(!!v)} />
              <Label htmlFor="is-reposicao" className="text-sm font-normal cursor-pointer">Esta aula é uma Reposição</Label>
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
            disabled={!disciplina || alunoIds.length === 0 || !explicadorId || !resolvedSalaId}
          >
            {aula ? "Guardar" : "Criar Aula"}
          </Button>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
