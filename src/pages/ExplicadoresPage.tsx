import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Eye, Pencil, LayoutGrid, LayoutList, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Explicador, disciplinas, Disponibilidade } from "@/data/mockData";

const DIAS_SEMANA = [
  { label: "D", full: "Domingo", day: 0 },
  { label: "S", full: "Segunda", day: 1 },
  { label: "T", full: "Terça", day: 2 },
  { label: "Q", full: "Quarta", day: 3 },
  { label: "Q", full: "Quinta", day: 4 },
  { label: "S", full: "Sexta", day: 5 },
  { label: "S", full: "Sábado", day: 6 },
];

export default function ExplicadoresPage() {
  const { explicadores, setExplicadores } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [discFilter, setDiscFilter] = useState("todas");
  const [estadoFilter, setEstadoFilter] = useState("todos");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Explicador | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Explicador | null>(null);

  const filtered = useMemo(() => {
    return explicadores.filter(e => {
      if (search && !e.nome.toLowerCase().includes(search.toLowerCase())) return false;
      if (discFilter !== "todas" && !e.disciplinas.includes(discFilter)) return false;
      if (estadoFilter !== "todos" && e.estado !== estadoFilter) return false;
      return true;
    });
  }, [explicadores, search, discFilter, estadoFilter]);

  const handleDelete = () => {
    if (!deleteTarget) return;
    setExplicadores(prev => prev.filter(e => e.id !== deleteTarget.id));
    toast({ title: "Explicador eliminado" });
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Explicadores <span className="text-muted-foreground font-normal text-lg">({filtered.length})</span></h1>
        <div className="flex gap-2">
          <Button variant={viewMode === "table" ? "default" : "outline"} size="icon" onClick={() => setViewMode("table")}><LayoutList className="h-4 w-4" /></Button>
          <Button variant={viewMode === "cards" ? "default" : "outline"} size="icon" onClick={() => setViewMode("cards")}><LayoutGrid className="h-4 w-4" /></Button>
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}><Plus className="h-4 w-4" /> Adicionar Explicador</Button>
        </div>
      </div>

      <Card><CardContent className="p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Pesquisar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={discFilter} onValueChange={setDiscFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Disciplina" /></SelectTrigger>
          <SelectContent><SelectItem value="todas">Todas</SelectItem>{disciplinas.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="ativo">Ativo</SelectItem><SelectItem value="inativo">Inativo</SelectItem></SelectContent>
        </Select>
      </CardContent></Card>

      {viewMode === "table" ? (
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Disciplinas</TableHead>
              <TableHead>Valor/Hora</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map(exp => (
                <TableRow key={exp.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-accent-foreground">{exp.nome.split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
                      <div><p className="font-medium text-sm">{exp.nome}</p><p className="text-xs text-muted-foreground">{exp.email}</p></div>
                    </div>
                  </TableCell>
                  <TableCell><div className="flex gap-1 flex-wrap">{exp.disciplinas.map(d => <Badge key={d} variant="secondary" className="text-[10px]">{d}</Badge>)}</div></TableCell>
                  <TableCell className="font-medium">{exp.valorHora}€</TableCell>
                  <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${exp.estado === "ativo" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{exp.estado}</span></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/explicadores/${exp.id}`)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(exp); setModalOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(exp)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(exp => (
            <Card key={exp.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center text-lg font-bold text-accent-foreground">{exp.nome.split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
                  <div>
                    <p className="font-semibold">{exp.nome}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${exp.estado === "ativo" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{exp.estado}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">{exp.disciplinas.map(d => <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>)}</div>
                <p className="text-2xl font-bold text-primary mb-4">{exp.valorHora}€<span className="text-sm font-normal text-muted-foreground">/hora</span></p>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => navigate(`/explicadores/${exp.id}`)}>Ver perfil</Button>
                  <Button variant="outline" size="icon" onClick={() => { setEditing(exp); setModalOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(exp)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ExplicadorModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        explicador={editing}
        onSave={(data) => {
          if (editing) {
            setExplicadores(prev => prev.map(e => e.id === editing.id ? { ...e, ...data } : e));
            toast({ title: "Explicador atualizado" });
          } else {
            setExplicadores(prev => [...prev, { ...data, id: `e${Date.now()}`, estado: "ativo" as const }]);
            toast({ title: "Explicador adicionado" });
          }
          setModalOpen(false);
        }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar explicador?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que quer eliminar <strong>{deleteTarget?.nome}</strong>? Esta ação não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ExplicadorModal({ open, onClose, explicador, onSave }: {
  open: boolean;
  onClose: () => void;
  explicador: Explicador | null;
  onSave: (data: any) => void;
}) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [valorHora, setValorHora] = useState("15");
  const [selectedDisc, setSelectedDisc] = useState<string[]>([]);
  const [disp, setDisp] = useState<Disponibilidade[]>([]);
  const [iban, setIban] = useState("");
  const [nif, setNif] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setNome(explicador?.nome || "");
      setEmail(explicador?.email || "");
      setTelefone(explicador?.telefone || "");
      setValorHora(String(explicador?.valorHora || 15));
      setSelectedDisc(explicador?.disciplinas || []);
      setDisp(explicador?.disponibilidade || []);
      setIban(explicador?.iban || "");
      setNif(explicador?.nif || "");
      setErrors({});
    }
  }, [open, explicador]);

  const activeDays = useMemo(() => [...new Set(disp.map(d => d.diaSemana))].sort((a, b) => a - b), [disp]);

  const toggleDay = (day: number) => {
    if (activeDays.includes(day)) {
      setDisp(prev => prev.filter(d => d.diaSemana !== day));
    } else {
      setDisp(prev => [...prev, { diaSemana: day, horaInicio: "09:00", horaFim: "13:00" }]);
    }
  };

  const addBloco = (day: number) => {
    setDisp(prev => [...prev, { diaSemana: day, horaInicio: "14:00", horaFim: "18:00" }]);
  };

  const removeBloco = (day: number, idx: number) => {
    let count = 0;
    setDisp(prev => prev.filter(d => {
      if (d.diaSemana !== day) return true;
      return count++ !== idx;
    }));
  };

  const updateBloco = (day: number, idx: number, field: "horaInicio" | "horaFim", value: string) => {
    let count = 0;
    setDisp(prev => prev.map(d => {
      if (d.diaSemana !== day) return d;
      const i = count++;
      return i === idx ? { ...d, [field]: value } : d;
    }));
  };

  const handleSave = () => {
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = "Obrigatório";
    if (selectedDisc.length === 0) e.disc = "Selecione pelo menos 1";
    if (nif && !/^\d{9}$/.test(nif)) e.nif = "NIF deve ter 9 dígitos";
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    onSave({
      nome, email, telefone,
      habilitacoes: explicador?.habilitacoes || "",
      valorHora: parseFloat(valorHora),
      disciplinas: selectedDisc,
      disponibilidade: disp,
      iban: iban || undefined,
      nif: nif || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{explicador ? "Editar Explicador" : "Adicionar Explicador"}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="dados">
          <TabsList className="w-full">
            <TabsTrigger value="dados" className="flex-1">Dados</TabsTrigger>
            <TabsTrigger value="financeiro" className="flex-1">Financeiro</TabsTrigger>
            <TabsTrigger value="disponibilidade" className="flex-1">Disponibilidade</TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-4 mt-4">
            <div>
              <Label>Nome *</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} />
              {errors.nome && <p className="text-xs text-destructive mt-1">{errors.nome}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input value={email} onChange={e => setEmail(e.target.value)} /></div>
              <div><Label>Telefone</Label><Input value={telefone} onChange={e => setTelefone(e.target.value)} /></div>
            </div>
            <div>
              <Label>Valor/Hora (€)</Label>
              <Input type="number" value={valorHora} onChange={e => setValorHora(e.target.value)} />
            </div>
            <div>
              <Label>Disciplinas *</Label>
              {errors.disc && <p className="text-xs text-destructive">{errors.disc}</p>}
              <div className="grid grid-cols-2 gap-2 mt-2">
                {disciplinas.map(d => (
                  <div key={d} className="flex items-center gap-2">
                    <Checkbox checked={selectedDisc.includes(d)} onCheckedChange={c => setSelectedDisc(prev => c ? [...prev, d] : prev.filter(x => x !== d))} />
                    <span className="text-sm">{d}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="financeiro" className="space-y-4 mt-4">
            <div>
              <Label>IBAN</Label>
              <Input value={iban} onChange={e => setIban(e.target.value.toUpperCase())} placeholder="PT50..." maxLength={25} />
            </div>
            <div>
              <Label>NIF</Label>
              <Input
                value={nif}
                onChange={e => setNif(e.target.value.replace(/\D/g, "").slice(0, 9))}
                placeholder="123456789"
                maxLength={9}
                inputMode="numeric"
              />
              {errors.nif && <p className="text-xs text-destructive mt-1">{errors.nif}</p>}
            </div>
          </TabsContent>

          <TabsContent value="disponibilidade" className="mt-4 space-y-4">
            {/* Step 1: day selection */}
            <div>
              <p className="text-sm font-medium mb-3">Seleciona os dias disponíveis</p>
              <div className="flex gap-2 flex-wrap">
                {DIAS_SEMANA.map(({ label, full, day }) => {
                  const active = activeDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      title={full}
                      onClick={() => toggleDay(day)}
                      className={`h-9 w-9 rounded-full text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring
                        ${active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: time blocks per selected day */}
            {activeDays.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Blocos de horário</p>
                {activeDays.map(day => {
                  const dayName = DIAS_SEMANA.find(d => d.day === day)?.full ?? "";
                  const blocos = disp.filter(d => d.diaSemana === day);
                  return (
                    <div key={day} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-primary">{dayName}</span>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => addBloco(day)}>
                          + Bloco
                        </Button>
                      </div>
                      {blocos.map((b, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={b.horaInicio}
                            className="w-28"
                            onChange={e => updateBloco(day, idx, "horaInicio", e.target.value)}
                          />
                          <span className="text-sm text-muted-foreground">—</span>
                          <Input
                            type="time"
                            value={b.horaFim}
                            className="w-28"
                            onChange={e => updateBloco(day, idx, "horaFim", e.target.value)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                            onClick={() => removeBloco(day, idx)}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            {activeDays.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Seleciona pelo menos um dia para configurar os horários.
              </p>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
