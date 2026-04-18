import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { disciplinaHslColors } from "@/data/mockData";
import {
  getServicos, setServicos, subscribeServicos,
  type Servico, type PriceTier,
} from "@/lib/servicos";

interface FormState {
  nome: string;
  precoBase: string;
  tiersIndividual: { minClasses: string; precoHora: string }[];
  tiersGrupo: { minClasses: string; precoHora: string }[];
}

const emptyForm = (): FormState => ({
  nome: "",
  precoBase: "",
  tiersIndividual: [{ minClasses: "1", precoHora: "" }],
  tiersGrupo: [{ minClasses: "1", precoHora: "" }],
});

function tiersFromForm(rows: { minClasses: string; precoHora: string }[]): PriceTier[] {
  return rows
    .map(r => ({ minClasses: parseInt(r.minClasses) || 0, precoHora: parseFloat(r.precoHora) || 0 }))
    .filter(t => t.minClasses > 0)
    .sort((a, b) => a.minClasses - b.minClasses);
}

function tiersToForm(tiers: PriceTier[]): { minClasses: string; precoHora: string }[] {
  if (tiers.length === 0) return [{ minClasses: "1", precoHora: "" }];
  return tiers.map(t => ({ minClasses: String(t.minClasses), precoHora: String(t.precoHora) }));
}

function TierEditor({
  label, rows, onChange,
}: {
  label: string;
  rows: { minClasses: string; precoHora: string }[];
  onChange: (rows: { minClasses: string; precoHora: string }[]) => void;
}) {
  const update = (idx: number, patch: Partial<{ minClasses: string; precoHora: string }>) => {
    onChange(rows.map((r, i) => i === idx ? { ...r, ...patch } : r));
  };
  const add = () => onChange([...rows, { minClasses: "", precoHora: "" }]);
  const remove = (idx: number) => onChange(rows.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-end gap-2">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">A partir de (aulas)</Label>
              <Input
                type="number" min="1" value={r.minClasses}
                onChange={e => update(i, { minClasses: e.target.value })}
                placeholder="1"
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">€/h</Label>
              <Input
                type="number" min="0" step="0.5" value={r.precoHora}
                onChange={e => update(i, { precoHora: e.target.value })}
                placeholder="20"
              />
            </div>
            <Button
              variant="ghost" size="icon" type="button"
              className="text-destructive"
              onClick={() => remove(i)}
              disabled={rows.length === 1}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" type="button" onClick={add}>
        <Plus className="h-3 w-3 mr-1" /> Adicionar escalão
      </Button>
    </div>
  );
}

export default function ServicosPage() {
  const { toast } = useToast();
  const [, force] = useState(0);
  useEffect(() => subscribeServicos(() => force(x => x + 1)), []);
  const servicos = getServicos();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (s: Servico) => {
    setEditingId(s.id);
    setForm({
      nome: s.nome,
      precoBase: String(s.precoBase),
      tiersIndividual: tiersToForm(s.tiersIndividual),
      tiersGrupo: tiersToForm(s.tiersGrupo),
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.nome.trim()) return;
    const data: Servico = {
      id: editingId ?? `d-${Date.now()}`,
      nome: form.nome.trim(),
      precoBase: parseFloat(form.precoBase) || 0,
      tiersIndividual: tiersFromForm(form.tiersIndividual),
      tiersGrupo: tiersFromForm(form.tiersGrupo),
    };
    if (editingId) {
      setServicos(servicos.map(s => s.id === editingId ? data : s));
      toast({ title: "Disciplina atualizada" });
    } else {
      setServicos([...servicos, data]);
      toast({ title: "Disciplina adicionada" });
    }
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    setServicos(servicos.filter(s => s.id !== deleteId));
    setDeleteId(null);
    toast({ title: "Disciplina removida" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Serviços</h1>
          <p className="text-muted-foreground">
            Gerir disciplinas e preços por escalão (€/h varia consoante o nº de aulas do aluno)
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar Disciplina
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {servicos.map(s => {
          const color = disciplinaHslColors[s.nome] || "hsl(0,0%,50%)";
          return (
            <Card key={s.id} className="hover:border-primary/30 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                  <CardTitle className="text-base">{s.nome}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(s.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Layers className="h-3 w-3" /> Individual
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {s.tiersIndividual.map((t, i) => (
                      <Badge key={i} variant="secondary" className="text-xs font-normal">
                        ≥{t.minClasses}: {t.precoHora}€/h
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <Layers className="h-3 w-3" /> Grupo
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {s.tiersGrupo.map((t, i) => (
                      <Badge key={i} variant="outline" className="text-xs font-normal">
                        ≥{t.minClasses}: {t.precoHora}€/h
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Disciplina" : "Nova Disciplina"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Disciplina</Label>
                <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Matemática" />
              </div>
              <div className="space-y-2">
                <Label>Preço base (€/h)</Label>
                <Input
                  type="number" min="0" step="0.5"
                  value={form.precoBase}
                  onChange={e => setForm(f => ({ ...f, precoBase: e.target.value }))}
                  placeholder="20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t">
              <TierEditor
                label="Escalões — Individual"
                rows={form.tiersIndividual}
                onChange={rows => setForm(f => ({ ...f, tiersIndividual: rows }))}
              />
              <TierEditor
                label="Escalões — Grupo"
                rows={form.tiersGrupo}
                onChange={rows => setForm(f => ({ ...f, tiersGrupo: rows }))}
              />
            </div>

            <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-md">
              💡 Cada escalão aplica-se quando o aluno frequenta pelo menos esse número de aulas
              dessa disciplina/tipo. Ex: <strong>≥2: 20€/h</strong> e <strong>≥6: 15€/h</strong> →
              um aluno com 6 aulas/mês paga 15€/h.
            </p>
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
