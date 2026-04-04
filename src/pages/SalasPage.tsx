import { useState, useMemo } from "react";
import { useData } from "@/contexts/DataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Users, Monitor, Tv, Presentation } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Sala } from "@/data/mockData";
import { format, isToday, parseISO } from "date-fns";

const equipIcons: Record<string, any> = { "quadro branco": Presentation, projetor: Tv, computador: Monitor, televisão: Tv };

export default function SalasPage() {
  const { salas, setSalas, aulas, alunos, explicadores } = useData();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Sala | null>(null);
  const [occModal, setOccModal] = useState<string | null>(null);

  const resumo = useMemo(() => {
    const total = salas.length;
    const disponiveis = salas.filter(s => s.estado === "disponível").length;
    const manutencao = total - disponiveis;
    const aulasHoje = aulas.filter(a => { try { return isToday(parseISO(a.data)); } catch { return false; } });
    const occupiedSlots = aulasHoje.length;
    const totalSlots = disponiveis * 12;
    const taxa = totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0;
    return { total, disponiveis, manutencao, taxa };
  }, [salas, aulas]);

  const getOcupacaoHoje = (salaId: string) => {
    const aulasHoje = aulas.filter(a => {
      try { return a.salaId === salaId && isToday(parseISO(a.data)) && a.estado !== "cancelada"; } catch { return false; }
    });
    return Math.round((aulasHoje.length / 12) * 100);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Salas <span className="text-muted-foreground font-normal text-lg">({salas.length})</span></h1>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }}><Plus className="h-4 w-4" /> Nova Sala</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: resumo.total },
          { label: "Disponíveis", value: resumo.disponiveis },
          { label: "Manutenção", value: resumo.manutencao },
          { label: "Ocupação Hoje", value: `${resumo.taxa}%` },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></CardContent></Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {salas.map(sala => {
          const occ = getOcupacaoHoje(sala.id);
          return (
            <Card key={sala.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">{sala.nome}</h3>
                  <Badge variant={sala.estado === "disponível" ? "default" : "secondary"} className={sala.estado === "disponível" ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"}>
                    {sala.estado === "disponível" ? "Disponível" : "Manutenção"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" /> Capacidade: {sala.capacidade} {sala.capacidade === 1 ? "lugar" : "lugares"}
                </div>
                <div className="flex flex-wrap gap-1">
                  {sala.equipamentos.map(eq => (
                    <Badge key={eq} variant="outline" className="text-xs capitalize">{eq}</Badge>
                  ))}
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Ocupação hoje</span><span>{occ}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${occ}%` }} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditing(sala); setModalOpen(true); }}>Editar</Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setOccModal(sala.id)}>Ver Ocupação</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create/Edit Modal */}
      <SalaModal open={modalOpen} onClose={() => setModalOpen(false)} sala={editing} onSave={(data) => {
        if (editing) {
          setSalas(prev => prev.map(s => s.id === editing.id ? { ...s, ...data } : s));
          toast({ title: "Sala atualizada" });
        } else {
          setSalas(prev => [...prev, { ...data, id: `s${Date.now()}` }]);
          toast({ title: "Sala criada" });
        }
        setModalOpen(false);
      }} />

      {/* Occupation Modal */}
      <Dialog open={!!occModal} onOpenChange={() => setOccModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Ocupação — {salas.find(s => s.id === occModal)?.nome}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-5 gap-2">
            {["Seg", "Ter", "Qua", "Qui", "Sex"].map((day, di) => (
              <div key={day}>
                <p className="text-xs font-medium text-center mb-2">{day}</p>
                {Array.from({ length: 13 }, (_, i) => i + 8).map(hour => {
                  const h = `${String(hour).padStart(2, "0")}:00`;
                  const aula = aulas.find(a => a.salaId === occModal && a.horaInicio === h);
                  return (
                    <div key={hour} className={`h-6 mb-0.5 rounded text-[9px] flex items-center justify-center ${aula ? "bg-primary/20 text-primary" : "bg-muted"}`}>
                      {aula ? aula.disciplina.slice(0, 4) : h}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SalaModal({ open, onClose, sala, onSave }: { open: boolean; onClose: () => void; sala: Sala | null; onSave: (data: any) => void }) {
  const [nome, setNome] = useState(sala?.nome || "");
  const [capacidade, setCapacidade] = useState(String(sala?.capacidade || "2"));
  const [equipamentos, setEquipamentos] = useState<string[]>(sala?.equipamentos || []);
  const [estado, setEstado] = useState<string>(sala?.estado || "disponível");

  useState(() => { if (open) { setNome(sala?.nome || ""); setCapacidade(String(sala?.capacidade || "2")); setEquipamentos(sala?.equipamentos || []); setEstado(sala?.estado || "disponível"); } });

  const allEquip = ["quadro branco", "projetor", "computador", "televisão"];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>{sala ? "Editar Sala" : "Nova Sala"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Nome *</Label><Input value={nome} onChange={e => setNome(e.target.value)} /></div>
          <div><Label>Capacidade</Label><Input type="number" min={1} max={20} value={capacidade} onChange={e => setCapacidade(e.target.value)} /></div>
          <div><Label>Equipamentos</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {allEquip.map(eq => (
                <div key={eq} className="flex items-center gap-2"><Checkbox checked={equipamentos.includes(eq)} onCheckedChange={c => setEquipamentos(prev => c ? [...prev, eq] : prev.filter(x => x !== eq))} /><span className="text-sm capitalize">{eq}</span></div>
              ))}
            </div>
          </div>
          <div><Label>Estado</Label>
            <Select value={estado} onValueChange={setEstado}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="disponível">Disponível</SelectItem><SelectItem value="manutenção">Manutenção</SelectItem></SelectContent></Select>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => { if (!nome.trim()) return; onSave({ nome, capacidade: parseInt(capacidade), equipamentos, estado }); }}>Guardar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
