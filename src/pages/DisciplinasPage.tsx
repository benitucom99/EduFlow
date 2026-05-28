import { useState, useEffect } from "react";
import { useData } from "@/contexts/DataContext";
import { Disciplina } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, BookOpen, ChevronRight, Layers, FolderTree } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { childrenOf, isCategoria, topLevel } from "@/lib/disciplinas";

const FALLBACK_COLOR = "#6366f1";

export default function DisciplinasPage() {
  const { disciplinas, createDisciplina, updateDisciplina, deleteDisciplina } = useData();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Disciplina | null>(null);
  const [createParent, setCreateParent] = useState<Disciplina | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Disciplina | null>(null);

  const categorias = topLevel(disciplinas);
  const drawerDisc = drawerId ? disciplinas.find(d => d.id === drawerId) ?? null : null;
  const drawerFilhos = drawerId ? childrenOf(disciplinas, drawerId) : [];

  const openCreateTop = () => { setEditing(null); setCreateParent(null); setModalOpen(true); };
  const openCreateSub = (parent: Disciplina) => { setEditing(null); setCreateParent(parent); setModalOpen(true); };
  const openEdit = (disc: Disciplina) => { setEditing(disc); setCreateParent(null); setModalOpen(true); };

  const handleSave = async (data: any) => {
    try {
      if (editing) {
        await updateDisciplina(editing.id, data);
        toast({ title: "Disciplina atualizada" });
      } else {
        await createDisciplina(data);
        toast({ title: createParent ? "Sub-disciplina criada" : "Disciplina criada" });
      }
      setModalOpen(false);
    } catch {
      toast({ title: "Erro ao guardar disciplina", description: "Tenta novamente.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDisciplina(deleteTarget.id);
      toast({ title: "Disciplina eliminada" });
      if (drawerId === deleteTarget.id) setDrawerId(null);
    } catch {
      toast({ title: "Erro ao eliminar disciplina", description: "Tenta novamente.", variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Disciplinas <span className="text-muted-foreground font-normal text-lg">({categorias.length})</span></h1>
        <Button onClick={openCreateTop}><Plus className="h-4 w-4" /> Nova Disciplina</Button>
      </div>

      {categorias.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma disciplina criada. Crie a primeira disciplina para começar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {categorias.map(disc => {
            const cor = disc.corHsl || FALLBACK_COLOR;
            const filhos = childrenOf(disciplinas, disc.id);
            const categoria = filhos.length > 0;
            return (
              <button
                key={disc.id}
                onClick={() => setDrawerId(disc.id)}
                className="group relative text-left rounded-2xl border border-border bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="h-1.5 w-full" style={{ backgroundColor: cor }} />
                <div className="p-5 flex flex-col gap-3 aspect-square justify-between">
                  <div className="flex items-start justify-between">
                    <div
                      className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `color-mix(in srgb, ${cor} 15%, transparent)`, color: cor }}
                    >
                      {categoria ? <FolderTree className="h-6 w-6" /> : <BookOpen className="h-6 w-6" />}
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(disc)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(disc)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div>
                    <p className="font-bold font-heading text-lg leading-tight line-clamp-2">{disc.nome}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {categoria
                        ? `${filhos.length} sub-disciplina${filhos.length === 1 ? "" : "s"}`
                        : `${disc.precoHoraIndividual.toFixed(0)}€ indiv · ${disc.precoHoraGrupo.toFixed(0)}€ grupo`}
                    </p>
                  </div>
                  <div className="flex items-center justify-end text-muted-foreground">
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Drawer: sub-disciplinas / preços ─────────────────────────── */}
      <Sheet open={!!drawerId} onOpenChange={open => { if (!open) setDrawerId(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col gap-0">
          <SheetHeader className="px-6 py-5 border-b shrink-0">
            <SheetTitle className="flex items-center gap-3 text-xl font-heading">
              {drawerDisc?.corHsl && <span className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: drawerDisc.corHsl }} />}
              {drawerDisc?.nome}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {drawerDisc && (drawerFilhos.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Layers className="h-4 w-4" /> Sub-disciplinas
                  </p>
                  <Button size="sm" variant="outline" onClick={() => openCreateSub(drawerDisc)}>
                    <Plus className="h-4 w-4 mr-1" /> Nova
                  </Button>
                </div>
                <div className="space-y-2">
                  {drawerFilhos.map(f => (
                    <div key={f.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                      {f.corHsl && <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: f.corHsl }} />}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{f.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {f.precoHoraIndividual.toFixed(2)}€ individual · {f.precoHoraGrupo.toFixed(2)}€ grupo
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(f)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(f)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  As taxas horárias são definidas em cada sub-disciplina. A disciplina-pai serve apenas para agrupar.
                </p>
              </>
            ) : (
              <>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm font-medium text-muted-foreground mb-3">Taxas horárias</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-2xl font-bold text-primary">{drawerDisc.precoHoraIndividual.toFixed(2)}€</p>
                      <p className="text-xs text-muted-foreground">Individual /h</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">{drawerDisc.precoHoraGrupo.toFixed(2)}€</p>
                      <p className="text-xs text-muted-foreground">Grupo /h</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => openEdit(drawerDisc)}>
                    <Pencil className="h-4 w-4 mr-1" /> Editar preços
                  </Button>
                </div>
                <div className="rounded-lg border border-dashed border-border p-4">
                  <p className="text-sm font-medium mb-1">Adicionar sub-disciplinas</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Ao criar sub-disciplinas (ex: "12º ano"), as taxas passam a ser definidas em cada uma e o preço acima deixa de ser usado.
                  </p>
                  <Button size="sm" onClick={() => openCreateSub(drawerDisc)}>
                    <Plus className="h-4 w-4 mr-1" /> Nova sub-disciplina
                  </Button>
                </div>
              </>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <DisciplinaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        disciplina={editing}
        parent={createParent}
        isCategoriaTarget={editing ? isCategoria(disciplinas, editing.id) : false}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar disciplina?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que quer eliminar <strong>{deleteTarget?.nome}</strong>?
              {deleteTarget && isCategoria(disciplinas, deleteTarget.id) && (
                <> Todas as sub-disciplinas serão também eliminadas.</>
              )} Esta ação não pode ser revertida.
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

function DisciplinaModal({ open, onClose, disciplina, parent, isCategoriaTarget, onSave }: {
  open: boolean;
  onClose: () => void;
  disciplina: Disciplina | null;
  parent: Disciplina | null;
  isCategoriaTarget: boolean;
  onSave: (data: any) => void;
}) {
  const [nome, setNome] = useState("");
  const [precoIndividual, setPrecoIndividual] = useState("20");
  const [precoGrupo, setPrecoGrupo] = useState("15");
  const [corHsl, setCorHsl] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Preços só fazem sentido em folhas. Uma categoria (em edição) não os mostra.
  const showPrices = !(disciplina && isCategoriaTarget);

  useEffect(() => {
    if (open) {
      setNome(disciplina?.nome || "");
      setPrecoIndividual(String(disciplina?.precoHoraIndividual ?? 20));
      setPrecoGrupo(String(disciplina?.precoHoraGrupo ?? 15));
      setCorHsl(disciplina?.corHsl || (parent?.corHsl ?? ""));
      setErrors({});
    }
  }, [open, disciplina, parent]);

  const title = disciplina
    ? (isCategoriaTarget ? "Editar Categoria" : "Editar Disciplina")
    : (parent ? "Nova Sub-disciplina" : "Nova Disciplina");

  const handleSave = () => {
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = "Obrigatório";
    const ind = parseFloat(precoIndividual);
    const grp = parseFloat(precoGrupo);
    if (showPrices) {
      if (isNaN(ind) || ind < 0) e.precoInd = "Valor inválido";
      if (isNaN(grp) || grp < 0) e.precoGrp = "Valor inválido";
    }
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    const data: any = { nome: nome.trim(), corHsl: corHsl || null };
    if (showPrices) { data.precoHoraIndividual = ind; data.precoHoraGrupo = grp; }
    if (!disciplina) data.parentId = parent?.id ?? null;
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {parent && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <FolderTree className="h-3.5 w-3.5" /> Em <strong>{parent.nome}</strong>
            </p>
          )}
          <div>
            <Label>Nome *</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder={parent ? "Ex: 12º ano" : "Ex: Matemática"} />
            {errors.nome && <p className="text-xs text-destructive mt-1">{errors.nome}</p>}
          </div>
          {showPrices ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Individual /h (€)</Label>
                <Input type="number" min={0} step={0.5} value={precoIndividual} onChange={e => setPrecoIndividual(e.target.value)} placeholder="20.00" />
                {errors.precoInd && <p className="text-xs text-destructive mt-1">{errors.precoInd}</p>}
              </div>
              <div>
                <Label>Grupo /h (€)</Label>
                <Input type="number" min={0} step={0.5} value={precoGrupo} onChange={e => setPrecoGrupo(e.target.value)} placeholder="15.00" />
                {errors.precoGrp && <p className="text-xs text-destructive mt-1">{errors.precoGrp}</p>}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground rounded-md bg-muted/40 p-3">
              Esta é uma categoria com sub-disciplinas. As taxas horárias são definidas em cada sub-disciplina.
            </p>
          )}
          <div>
            <Label>Cor (opcional)</Label>
            <div className="flex items-center gap-2 mt-1">
              <input type="color" value={corHsl || FALLBACK_COLOR} onChange={e => setCorHsl(e.target.value)} className="h-9 w-16 rounded border cursor-pointer" />
              <span className="text-sm text-muted-foreground">{corHsl || "Nenhuma cor definida"}</span>
              {corHsl && <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setCorHsl("")}>Remover</Button>}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
