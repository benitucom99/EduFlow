import { useState } from "react";
import { useData } from "@/contexts/DataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { disciplinaHslColors } from "@/data/mockData";

interface Disciplina {
  id: string;
  nome: string;
  precoIndividual: number;
  precoGrupo: number;
}

export default function ServicosPage() {
  const { toast } = useToast();

  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([
    { id: "d1", nome: "Matemática", precoIndividual: 20, precoGrupo: 12 },
    { id: "d2", nome: "Português", precoIndividual: 18, precoGrupo: 11 },
    { id: "d3", nome: "Inglês", precoIndividual: 18, precoGrupo: 11 },
    { id: "d4", nome: "Física e Química", precoIndividual: 22, precoGrupo: 13 },
    { id: "d5", nome: "Biologia e Geologia", precoIndividual: 20, precoGrupo: 12 },
    { id: "d6", nome: "Economia", precoIndividual: 18, precoGrupo: 11 },
    { id: "d7", nome: "Geometria Descritiva", precoIndividual: 22, precoGrupo: 13 },
    { id: "d8", nome: "História", precoIndividual: 18, precoGrupo: 11 },
  ]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", precoIndividual: "", precoGrupo: "" });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openNew = () => {
    setEditingId(null);
    setForm({ nome: "", precoIndividual: "", precoGrupo: "" });
    setModalOpen(true);
  };

  const openEdit = (d: Disciplina) => {
    setEditingId(d.id);
    setForm({ nome: d.nome, precoIndividual: String(d.precoIndividual), precoGrupo: String(d.precoGrupo) });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.nome.trim()) return;
    const precoInd = parseFloat(form.precoIndividual) || 0;
    const precoGrp = parseFloat(form.precoGrupo) || 0;

    if (editingId) {
      setDisciplinas(prev => prev.map(d => d.id === editingId ? { ...d, nome: form.nome.trim(), precoIndividual: precoInd, precoGrupo: precoGrp } : d));
      toast({ title: "Disciplina atualizada" });
    } else {
      setDisciplinas(prev => [...prev, { id: `d-${Date.now()}`, nome: form.nome.trim(), precoIndividual: precoInd, precoGrupo: precoGrp }]);
      toast({ title: "Disciplina adicionada" });
    }
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    setDisciplinas(prev => prev.filter(d => d.id !== deleteId));
    setDeleteId(null);
    toast({ title: "Disciplina removida" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Serviços</h1>
          <p className="text-muted-foreground">Gerir as disciplinas oferecidas pelo centro</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar Disciplina
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {disciplinas.map(d => {
          const color = disciplinaHslColors[d.nome] || "hsl(0,0%,50%)";
          return (
            <Card key={d.id} className="hover:border-primary/30 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                  <CardTitle className="text-base">{d.nome}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(d)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(d.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Individual: </span>
                    <span className="font-semibold">{d.precoIndividual}€/h</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Grupo: </span>
                    <span className="font-semibold">{d.precoGrupo}€/h</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Disciplina" : "Nova Disciplina"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Disciplina</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Matemática" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço Individual (€/h)</Label>
                <Input type="number" min="0" step="0.5" value={form.precoIndividual} onChange={e => setForm(f => ({ ...f, precoIndividual: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Preço Grupo (€/h)</Label>
                <Input type="number" min="0" step="0.5" value={form.precoGrupo} onChange={e => setForm(f => ({ ...f, precoGrupo: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.nome.trim()}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Disciplina?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Tem a certeza que deseja remover esta disciplina? Esta ação não pode ser revertida.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
