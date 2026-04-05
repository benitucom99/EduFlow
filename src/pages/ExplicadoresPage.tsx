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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Eye, Pencil, LayoutGrid, LayoutList } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Explicador, disciplinas, Disponibilidade } from "@/data/mockData";

const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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

  const filtered = useMemo(() => {
    return explicadores.filter(e => {
      if (search && !e.nome.toLowerCase().includes(search.toLowerCase())) return false;
      if (discFilter !== "todas" && !e.disciplinas.includes(discFilter)) return false;
      if (estadoFilter !== "todos" && e.estado !== estadoFilter) return false;
      return true;
    });
  }, [explicadores, search, discFilter, estadoFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Explicadores <span className="text-muted-foreground font-normal text-lg">({filtered.length})</span></h1>
        <div className="flex gap-2">
          <Button variant={viewMode === "table" ? "default" : "outline"} size="icon" onClick={() => setViewMode("table")}><LayoutList className="h-4 w-4" /></Button>
          <Button variant={viewMode === "cards" ? "default" : "outline"} size="icon" onClick={() => setViewMode("cards")}><LayoutGrid className="h-4 w-4" /></Button>
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}><Plus className="h-4 w-4" /> Novo Explicador</Button>
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ExplicadorModal open={modalOpen} onClose={() => setModalOpen(false)} explicador={editing} onSave={(data) => {
        if (editing) {
          setExplicadores(prev => prev.map(e => e.id === editing.id ? { ...e, ...data } : e));
          toast({ title: "Explicador atualizado" });
        } else {
          setExplicadores(prev => [...prev, { ...data, id: `e${Date.now()}`, estado: "ativo" as const }]);
          toast({ title: "Explicador criado" });
        }
        setModalOpen(false);
      }} />
    </div>
  );
}

function ExplicadorModal({ open, onClose, explicador, onSave }: { open: boolean; onClose: () => void; explicador: Explicador | null; onSave: (data: any) => void }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [habilitacoes, setHabilitacoes] = useState("");
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
      setHabilitacoes(explicador?.habilitacoes || "");
      setValorHora(String(explicador?.valorHora || 15));
      setSelectedDisc(explicador?.disciplinas || []);
      setDisp(explicador?.disponibilidade || []);
      setIban(explicador?.iban || "");
      setNif(explicador?.nif || "");
      setErrors({});
    }
  }, [open, explicador]);

  const handleSave = () => {
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = "Obrigatório";
    if (selectedDisc.length === 0) e.disc = "Selecione pelo menos 1";
    if (nif && !/^\d{9}$/.test(nif)) e.nif = "NIF deve ter 9 dígitos";
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    onSave({
      nome, email, telefone, habilitacoes,
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
        <DialogHeader><DialogTitle>{explicador ? "Editar Explicador" : "Novo Explicador"}</DialogTitle></DialogHeader>
        <Tabs defaultValue="dados">
          <TabsList className="w-full">
            <TabsTrigger value="dados" className="flex-1">Dados</TabsTrigger>
            <TabsTrigger value="financeiro" className="flex-1">Financeiro</TabsTrigger>
            <TabsTrigger value="disponibilidade" className="flex-1">Disponibilidade</TabsTrigger>
          </TabsList>
          <TabsContent value="dados" className="space-y-4 mt-4">
            <div><Label>Nome *</Label><Input value={nome} onChange={e => setNome(e.target.value)} />{errors.nome && <p className="text-xs text-destructive mt-1">{errors.nome}</p>}</div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input value={email} onChange={e => setEmail(e.target.value)} /></div>
              <div><Label>Telefone</Label><Input value={telefone} onChange={e => setTelefone(e.target.value)} /></div>
            </div>
            <div><Label>Habilitações</Label><Textarea value={habilitacoes} onChange={e => setHabilitacoes(e.target.value)} /></div>
            <div><Label>Valor/Hora (€)</Label><Input type="number" value={valorHora} onChange={e => setValorHora(e.target.value)} /></div>
            <div><Label>Disciplinas *</Label>{errors.disc && <p className="text-xs text-destructive">{errors.disc}</p>}
              <div className="grid grid-cols-2 gap-2 mt-2">{disciplinas.map(d => (
                <div key={d} className="flex items-center gap-2"><Checkbox checked={selectedDisc.includes(d)} onCheckedChange={c => setSelectedDisc(prev => c ? [...prev, d] : prev.filter(x => x !== d))} /><span className="text-sm">{d}</span></div>
              ))}</div>
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
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 9);
                  setNif(v);
                }}
                placeholder="123456789"
                maxLength={9}
                inputMode="numeric"
              />
              {errors.nif && <p className="text-xs text-destructive mt-1">{errors.nif}</p>}
            </div>
          </TabsContent>
          <TabsContent value="disponibilidade" className="mt-4">
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(day => {
                const dayDisps = disp.filter(d => d.diaSemana === day);
                return (
                  <div key={day} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{dias[day]}</span>
                      <Button variant="ghost" size="sm" onClick={() => setDisp(prev => [...prev, { diaSemana: day, horaInicio: "09:00", horaFim: "13:00" }])}>+ Bloco</Button>
                    </div>
                    {dayDisps.map((d, idx) => (
                      <div key={idx} className="flex items-center gap-2 mb-1">
                        <Input type="time" value={d.horaInicio} className="w-28" onChange={e => {
                          setDisp(prev => prev.map((dd, i) => dd.diaSemana === day && i === prev.filter(x => x.diaSemana === day).indexOf(d) ? { ...dd, horaInicio: e.target.value } : dd));
                        }} />
                        <span className="text-sm">—</span>
                        <Input type="time" value={d.horaFim} className="w-28" onChange={e => {
                          setDisp(prev => prev.map((dd, i) => dd.diaSemana === day && i === prev.filter(x => x.diaSemana === day).indexOf(d) ? { ...dd, horaFim: e.target.value } : dd));
                        }} />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                          const dayDispsLocal = disp.filter(x => x.diaSemana === day);
                          const removeIdx = dayDispsLocal.indexOf(d);
                          let count = 0;
                          setDisp(prev => prev.filter((x) => {
                            if (x.diaSemana === day) { if (count === removeIdx) { count++; return false; } count++; }
                            return true;
                          }));
                        }}>×</Button>
                      </div>
                    ))}
                    {dayDisps.length === 0 && <p className="text-xs text-muted-foreground">Sem disponibilidade</p>}
                  </div>
                );
              })}
            </div>
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
