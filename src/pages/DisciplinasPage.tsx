import { useState, useEffect } from "react";
import { useData } from "@/contexts/DataContext";
import { Disciplina } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DisciplinasPage() {
  const { disciplinas, createDisciplina, updateDisciplina, deleteDisciplina } = useData();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Disciplina | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Disciplina | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteDisciplina(deleteTarget.id);
    toast({ title: "Disciplina eliminada" });
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Disciplinas <span className="text-muted-foreground font-normal text-lg">({disciplinas.length})</span></h1>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus className="h-4 w-4" /> Nova Disciplina
        </Button>
      </div>

      {disciplinas.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma disciplina criada. Crie a primeira disciplina para começar.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Disciplina</TableHead>
                  <TableHead>Preço por Aula</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disciplinas.map(disc => (
                  <TableRow key={disc.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {disc.corHsl && (
                          <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: disc.corHsl }} />
                        )}
                        <span className="font-medium">{disc.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      {disc.precoPorAula.toFixed(2)} €
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(disc); setModalOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(disc)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <DisciplinaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        disciplina={editing}
        onSave={async (data) => {
          if (editing) {
            await updateDisciplina(editing.id, data);
            toast({ title: "Disciplina atualizada" });
          } else {
            await createDisciplina(data);
            toast({ title: "Disciplina criada" });
          }
          setModalOpen(false);
        }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar disciplina?</AlertDialogTitle>
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

function DisciplinaModal({ open, onClose, disciplina, onSave }: {
  open: boolean;
  onClose: () => void;
  disciplina: Disciplina | null;
  onSave: (data: any) => void;
}) {
  const [nome, setNome] = useState("");
  const [precoPorAula, setPrecoPorAula] = useState("20");
  const [corHsl, setCorHsl] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setNome(disciplina?.nome || "");
      setPrecoPorAula(String(disciplina?.precoPorAula ?? 20));
      setCorHsl(disciplina?.corHsl || "");
      setErrors({});
    }
  }, [open, disciplina]);

  const handleSave = () => {
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = "Obrigatório";
    const preco = parseFloat(precoPorAula);
    if (isNaN(preco) || preco < 0) e.preco = "Valor inválido";
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    onSave({ nome: nome.trim(), precoPorAula: preco, corHsl: corHsl || null });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{disciplina ? "Editar Disciplina" : "Nova Disciplina"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Nome *</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Matemática" />
            {errors.nome && <p className="text-xs text-destructive mt-1">{errors.nome}</p>}
          </div>
          <div>
            <Label>Preço por Aula (€)</Label>
            <Input
              type="number"
              min={0}
              step={0.5}
              value={precoPorAula}
              onChange={e => setPrecoPorAula(e.target.value)}
              placeholder="20.00"
            />
            {errors.preco && <p className="text-xs text-destructive mt-1">{errors.preco}</p>}
          </div>
          <div>
            <Label>Cor (opcional)</Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={corHsl || "#6366f1"}
                onChange={e => setCorHsl(e.target.value)}
                className="h-9 w-16 rounded border cursor-pointer"
              />
              <span className="text-sm text-muted-foreground">{corHsl || "Nenhuma cor definida"}</span>
              {corHsl && (
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setCorHsl("")}>
                  Remover
                </Button>
              )}
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
