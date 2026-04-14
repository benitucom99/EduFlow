import { useState, useMemo } from "react";
import { useData } from "@/contexts/DataContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Plus, AlertTriangle } from "lucide-react";
import { addDays, subDays, startOfWeek, format, parseISO, isToday, addWeeks, subWeeks, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isSameDay } from "date-fns";
import { pt } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { disciplinas, disciplinaHslColors, Aula } from "@/data/mockData";

const hours = Array.from({ length: 26 }, (_, i) => {
  const h = Math.floor(i / 2) + 8;
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

export default function CalendarioPage() {
  const { aulas, setAulas, alunos, explicadores, salas } = useData();
  const { toast } = useToast();
  const [view, setView] = useState<"dia" | "semana" | "mes">("semana");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expFilter, setExpFilter] = useState("todos");
  const [salaFilter, setSalaFilter] = useState("todas");
  const [discFilter, setDiscFilter] = useState("todas");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAula, setEditingAula] = useState<Aula | null>(null);
  const [diaGroupBy, setDiaGroupBy] = useState<"sala" | "professor">("sala");
  const [detailAula, setDetailAula] = useState<Aula | null>(null);

  const navigate = (dir: number) => {
    if (view === "semana") setCurrentDate(d => dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1));
    else if (view === "dia") setCurrentDate(d => addDays(d, dir));
    else setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + dir, 1));
  };

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  const filteredAulas = useMemo(() => {
    return aulas.filter(a => {
      if (a.estado === "cancelada") return false;
      if (expFilter !== "todos" && a.explicadorId !== expFilter) return false;
      if (salaFilter !== "todas" && a.salaId !== salaFilter) return false;
      if (discFilter !== "todas" && a.disciplina !== discFilter) return false;
      return true;
    });
  }, [aulas, expFilter, salaFilter, discFilter]);

  const getAulasForDate = (dateStr: string) => filteredAulas.filter(a => a.data === dateStr);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Calendário</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Hoje</Button>
          <Button variant="outline" size="icon" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" /></Button>
          <span className="text-sm font-medium min-w-[180px] text-center">
            {view === "mes" ? format(currentDate, "MMMM yyyy", { locale: pt }) : view === "semana" ? `${format(weekDays[0], "dd/MM")} — ${format(weekDays[4], "dd/MM/yyyy")}` : format(currentDate, "EEEE, dd MMMM yyyy", { locale: pt })}
          </span>
          <div className="flex border rounded-lg overflow-hidden">
            {(["dia", "semana", "mes"] as const).map(v => (
              <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 text-xs font-medium capitalize ${view === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{v}</button>
            ))}
          </div>
          <Select value={expFilter} onValueChange={setExpFilter}><SelectTrigger className="w-[140px]"><SelectValue placeholder="Explicador" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem>{explicadores.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent></Select>
          <Select value={salaFilter} onValueChange={setSalaFilter}><SelectTrigger className="w-[120px]"><SelectValue placeholder="Sala" /></SelectTrigger><SelectContent><SelectItem value="todas">Todas</SelectItem>{salas.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent></Select>
          <Button onClick={() => { setEditingAula(null); setModalOpen(true); }}><Plus className="h-4 w-4" /> Nova Aula</Button>
        </div>
      </div>

      {view === "semana" && (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Header */}
              <div className="grid grid-cols-[60px_repeat(5,1fr)] border-b">
                <div className="p-2" />
                {weekDays.map(d => (
                  <div key={d.toISOString()} className={`p-2 text-center text-sm font-medium border-l ${isToday(d) ? "bg-primary/5" : ""}`}>
                    {format(d, "EEE dd/MM", { locale: pt })}
                  </div>
                ))}
              </div>
              {/* Time slots */}
              {Array.from({ length: 13 }, (_, i) => i + 8).map(hour => (
                <div key={hour} className="grid grid-cols-[60px_repeat(5,1fr)] border-b min-h-[50px]">
                  <div className="p-1 text-xs text-muted-foreground text-right pr-2 pt-1">{String(hour).padStart(2, "0")}:00</div>
                  {weekDays.map(d => {
                    const dateStr = format(d, "yyyy-MM-dd");
                    const dayAulas = getAulasForDate(dateStr).filter(a => a.horaInicio === `${String(hour).padStart(2, "0")}:00`);
                    return (
                      <div key={d.toISOString()} className={`border-l p-0.5 ${isToday(d) ? "bg-primary/5" : ""}`}>
                        {dayAulas.map(aula => {
                          const al = alunos.find(a => a.id === aula.alunoIds[0]);
                          const exp = explicadores.find(e => e.id === aula.explicadorId);
                          return (
                            <Tooltip key={aula.id}>
                              <TooltipTrigger asChild>
                                <div
                                  className="rounded p-1 text-[10px] leading-tight cursor-pointer hover:opacity-80 mb-0.5"
                                  style={{ backgroundColor: `${disciplinaHslColors[aula.disciplina] || "hsl(var(--primary))"}20`, borderLeft: `3px solid ${disciplinaHslColors[aula.disciplina] || "hsl(var(--primary))"}` }}
                                  onClick={() => { setEditingAula(aula); setModalOpen(true); }}
                                >
                                  <p className="font-medium truncate">{aula.tipo === "grupo" ? `Grupo (${aula.alunoIds.length})` : al?.nome}</p>
                                  <p className="truncate text-muted-foreground">{aula.disciplina}</p>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{aula.horaInicio}–{aula.horaFim} · {aula.disciplina}</p>
                                <p>{exp?.nome} · {salas.find(s => s.id === aula.salaId)?.nome}</p>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {view === "dia" && (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <div className="flex items-center gap-2 p-3 border-b">
              <span className="text-sm font-medium">Agrupar por:</span>
              <div className="flex border rounded-lg overflow-hidden">
                <button onClick={() => setDiaGroupBy("sala")} className={`px-3 py-1 text-xs font-medium ${diaGroupBy === "sala" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>Sala</button>
                <button onClick={() => setDiaGroupBy("professor")} className={`px-3 py-1 text-xs font-medium ${diaGroupBy === "professor" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>Professor</button>
              </div>
            </div>
            <div className="min-w-[500px]">
              {diaGroupBy === "sala" ? (() => {
                const cols = salas.filter(s => s.estado === "disponível");
                return (<>
                  <div className="grid border-b" style={{ gridTemplateColumns: `60px repeat(${cols.length}, 1fr)` }}>
                    <div className="p-2" />
                    {cols.map(s => <div key={s.id} className="p-2 text-center text-sm font-medium border-l">{s.nome}</div>)}
                  </div>
                  {Array.from({ length: 13 }, (_, i) => i + 8).map(hour => (
                    <div key={hour} className="grid border-b min-h-[50px]" style={{ gridTemplateColumns: `60px repeat(${cols.length}, 1fr)` }}>
                      <div className="p-1 text-xs text-muted-foreground text-right pr-2 pt-1">{String(hour).padStart(2, "0")}:00</div>
                      {cols.map(sala => {
                        const dateStr = format(currentDate, "yyyy-MM-dd");
                        const dayAulas = getAulasForDate(dateStr).filter(a => a.salaId === sala.id && a.horaInicio === `${String(hour).padStart(2, "0")}:00`);
                        return (
                          <div key={sala.id} className="border-l p-0.5">
                            {dayAulas.map(aula => {
                              const al = alunos.find(a => a.id === aula.alunoIds[0]);
                              return (
                                <div key={aula.id} className="rounded p-1 text-[10px] cursor-pointer hover:opacity-80" style={{ backgroundColor: `${disciplinaHslColors[aula.disciplina]}20`, borderLeft: `3px solid ${disciplinaHslColors[aula.disciplina]}` }} onClick={() => { setEditingAula(aula); setModalOpen(true); }}>
                                  <p className="font-medium truncate">{al?.nome}</p>
                                  <p className="truncate text-muted-foreground">{aula.disciplina}</p>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </>);
              })() : (() => {
                const cols = explicadores.filter(e => e.estado === "ativo");
                return (<>
                  <div className="grid border-b" style={{ gridTemplateColumns: `60px repeat(${cols.length}, 1fr)` }}>
                    <div className="p-2" />
                    {cols.map(e => <div key={e.id} className="p-2 text-center text-sm font-medium border-l">{e.nome}</div>)}
                  </div>
                  {Array.from({ length: 13 }, (_, i) => i + 8).map(hour => (
                    <div key={hour} className="grid border-b min-h-[50px]" style={{ gridTemplateColumns: `60px repeat(${cols.length}, 1fr)` }}>
                      <div className="p-1 text-xs text-muted-foreground text-right pr-2 pt-1">{String(hour).padStart(2, "0")}:00</div>
                      {cols.map(exp => {
                        const dateStr = format(currentDate, "yyyy-MM-dd");
                        const dayAulas = getAulasForDate(dateStr).filter(a => a.explicadorId === exp.id && a.horaInicio === `${String(hour).padStart(2, "0")}:00`);
                        return (
                          <div key={exp.id} className="border-l p-0.5">
                            {dayAulas.map(aula => {
                              const al = alunos.find(a => a.id === aula.alunoIds[0]);
                              const sala = salas.find(s => s.id === aula.salaId);
                              return (
                                <div key={aula.id} className="rounded p-1 text-[10px] cursor-pointer hover:opacity-80" style={{ backgroundColor: `${disciplinaHslColors[aula.disciplina]}20`, borderLeft: `3px solid ${disciplinaHslColors[aula.disciplina]}` }} onClick={() => { setEditingAula(aula); setModalOpen(true); }}>
                                  <p className="font-medium truncate">{al?.nome}</p>
                                  <p className="truncate text-muted-foreground">{aula.disciplina} · {sala?.nome}</p>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </>);
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {view === "mes" && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-1">
              {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(d => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground p-2">{d}</div>
              ))}
              {(() => {
                const monthStart = startOfMonth(currentDate);
                const monthEnd = endOfMonth(currentDate);
                const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
                const startPadding = (getDay(monthStart) + 6) % 7;
                const cells = [...Array(startPadding).fill(null), ...allDays];
                return cells.map((day, i) => {
                  if (!day) return <div key={`pad-${i}`} />;
                  const dateStr = format(day, "yyyy-MM-dd");
                  const count = getAulasForDate(dateStr).length;
                  return (
                    <div key={dateStr} className={`p-2 text-center rounded cursor-pointer hover:bg-muted ${isToday(day) ? "bg-primary/10 font-bold" : ""}`} onClick={() => { setCurrentDate(day); setView("dia"); }}>
                      <p className="text-sm">{format(day, "d")}</p>
                      {count > 0 && <Badge variant="secondary" className="text-[10px] mt-1">{count}</Badge>}
                    </div>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* New/Edit Lesson Modal */}
      <AulaModal open={modalOpen} onClose={() => { setModalOpen(false); setEditingAula(null); }} aula={editingAula} onSave={(data) => {
        if (editingAula) {
          setAulas(prev => prev.map(a => a.id === editingAula.id ? { ...a, ...data } : a));
          toast({ title: "Aula atualizada" });
        } else {
          setAulas(prev => [...prev, { ...data, id: `aula${Date.now()}`, estado: "agendada" as const, presencas: {} }]);
          toast({ title: "Aula agendada com sucesso" });
        }
        setModalOpen(false); setEditingAula(null);
      }} onCancel={editingAula ? () => {
        setAulas(prev => prev.map(a => a.id === editingAula.id ? { ...a, estado: "cancelada" as const } : a));
        toast({ title: "Aula cancelada" }); setModalOpen(false); setEditingAula(null);
      } : undefined} />
    </div>
  );
}

function AulaModal({ open, onClose, aula, onSave, onCancel }: { open: boolean; onClose: () => void; aula: Aula | null; onSave: (data: any) => void; onCancel?: () => void }) {
  const { alunos, explicadores, salas, aulas } = useData();
  const [tipo, setTipo] = useState<"individual" | "grupo">(aula?.tipo || "individual");
  const [disciplina, setDisciplina] = useState(aula?.disciplina || "");
  const [alunoIds, setAlunoIds] = useState<string[]>(aula?.alunoIds || []);
  const [explicadorId, setExplicadorId] = useState(aula?.explicadorId || "");
  const [salaId, setSalaId] = useState(aula?.salaId || "");
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
      setSalaId(aula?.salaId || "");
      setData(aula?.data || format(new Date(), "yyyy-MM-dd"));
      setHoraInicio(aula?.horaInicio || "09:00");
      setNotas(aula?.notas || "");
    }
  });

  const expsFiltrados = disciplina ? explicadores.filter(e => e.disciplinas.includes(disciplina) && e.estado === "ativo") : explicadores.filter(e => e.estado === "ativo");
  const salasFiltradas = salas.filter(s => s.estado === "disponível" && (tipo === "individual" || s.capacidade >= alunoIds.length));

  // Conflict checks
  const conflicts: string[] = [];
  if (explicadorId && data && horaInicio) {
    const existing = aulas.find(a => a.id !== aula?.id && a.explicadorId === explicadorId && a.data === data && a.horaInicio === horaInicio && a.estado !== "cancelada");
    if (existing) {
      const al = alunos.find(a => a.id === existing.alunoIds[0]);
      conflicts.push(`⚠️ O explicador já tem aula neste horário (${existing.horaInicio} com ${al?.nome})`);
    }
  }
  if (salaId && data && horaInicio) {
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
    if (!disciplina || alunoIds.length === 0 || !explicadorId || !salaId) return;
    onSave({ tipo, disciplina, alunoIds, explicadorId, salaId, data, horaInicio, horaFim: endHour(), recorrencia, notas });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{aula ? "Editar Aula" : "Nova Aula"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Tipo</Label>
            <RadioGroup value={tipo} onValueChange={v => setTipo(v as any)} className="flex gap-4 mt-2">
              <div className="flex items-center gap-2"><RadioGroupItem value="individual" id="ind" /><Label htmlFor="ind">Individual</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="grupo" id="grp" /><Label htmlFor="grp">Grupo</Label></div>
            </RadioGroup>
          </div>
          <div>
            <Label>Disciplina *</Label>
            <Select value={disciplina} onValueChange={setDisciplina}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{disciplinas.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className={tipo === "grupo" ? "sm:col-span-2" : ""}>
            <Label>Aluno(s) *</Label>
            {tipo === "individual" ? (
              <Select value={alunoIds[0] || ""} onValueChange={v => setAlunoIds([v])}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{alunos.filter(a => a.estado === "ativo").map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}</SelectContent></Select>
            ) : (
              <div className="grid grid-cols-2 gap-1 mt-2 max-h-32 overflow-y-auto">{alunos.filter(a => a.estado === "ativo").map(a => (
                <div key={a.id} className="flex items-center gap-2"><Checkbox checked={alunoIds.includes(a.id)} onCheckedChange={c => setAlunoIds(prev => c ? [...prev, a.id] : prev.filter(x => x !== a.id))} /><span className="text-sm">{a.nome}</span></div>
              ))}</div>
            )}
          </div>
          <div>
            <Label>Explicador *</Label>
            <Select value={explicadorId} onValueChange={setExplicadorId}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{expsFiltrados.map(e => <SelectItem key={e.id} value={e.id}>{e.nome} ({e.valorHora}€/h)</SelectItem>)}</SelectContent></Select>
          </div>
          <div>
            <Label>Sala *</Label>
            <Select value={salaId} onValueChange={setSalaId}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{salasFiltradas.map(s => <SelectItem key={s.id} value={s.id}>{s.nome} (cap. {s.capacidade})</SelectItem>)}</SelectContent></Select>
          </div>
          <div><Label>Data</Label><Input type="date" value={data} onChange={e => setData(e.target.value)} /></div>
          <div><Label>Hora Início</Label>
            <Select value={horaInicio} onValueChange={setHoraInicio}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
          </div>
          <div><Label>Duração</Label>
            <Select value={duracao} onValueChange={setDuracao}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
              <SelectItem value="30">30 min</SelectItem><SelectItem value="60">1 hora</SelectItem><SelectItem value="90">1h30</SelectItem><SelectItem value="120">2 horas</SelectItem>
            </SelectContent></Select>
          </div>
          <div><Label>Recorrência</Label>
            <Select value={recorrencia} onValueChange={setRecorrencia}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
              <SelectItem value="unica">Única</SelectItem><SelectItem value="semanal">Semanal</SelectItem><SelectItem value="quinzenal">Quinzenal</SelectItem>
            </SelectContent></Select>
          </div>
          <div className="sm:col-span-2"><Label>Notas</Label><Textarea value={notas} onChange={e => setNotas(e.target.value)} /></div>
        </div>

        {conflicts.length > 0 && (
          <div className="mt-4 space-y-2">{conflicts.map((c, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded"><AlertTriangle className="h-4 w-4 shrink-0" /> {c}</div>
          ))}</div>
        )}

        <div className="flex justify-between mt-4">
          <div>{onCancel && <Button variant="destructive" onClick={onCancel}>Cancelar Aula</Button>}</div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Fechar</Button>
            <Button onClick={handleSave} disabled={conflicts.length > 0 || !disciplina || alunoIds.length === 0}>Guardar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
