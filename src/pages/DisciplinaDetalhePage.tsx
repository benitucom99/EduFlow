import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { Disciplina } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, Pencil, Trash2, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { childrenOf } from "@/lib/disciplinas";
import { DisciplinaModal } from "@/components/DisciplinaModal";

export default function DisciplinaDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { disciplinas, createDisciplina, updateDisciplina, deleteDisciplina } = useData();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Disciplina | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Disciplina | null>(null);

  const categoria = disciplinas.find(d => d.id === id);
  const subs = id ? childrenOf(disciplinas, id) : [];

  if (!categoria) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Button variant="ghost" onClick={() => navigate("/disciplinas")}><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Button>
        <p className="p-6 text-muted-foreground">Disciplina não encontrada.</p>
      </div>
    );
  }

  const cor = categoria.corHsl || "#6366f1";

  const handleSave = async (data: any) => {
    try {
      if (editing) {
        await updateDisciplina(editing.id, data);
        toast({ title: "Sub-disciplina atualizada" });
      } else {
        await createDisciplina(data);
        toast({ title: "Sub-disciplina criada" });
      }
      setModalOpen(false);
    } catch {
      toast({ title: "Erro ao guardar sub-disciplina", description: "Tenta novamente.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDisciplina(deleteTarget.id);
      toast({ title: "Sub-disciplina eliminada" });
    } catch {
      toast({ title: "Erro ao eliminar", description: "Tenta novamente.", variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/disciplinas")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Disciplinas
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: cor }} />
          <div>
            <h1 className="text-2xl font-bold">{categoria.nome}</h1>
            <p className="text-sm text-muted-foreground">{subs.length} sub-disciplina{subs.length === 1 ? "" : "s"}</p>
          </div>
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus className="h-4 w-4" /> Nova Sub-disciplina
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {subs.length === 0 ? (
            <div className="py-16 text-center">
              <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Esta categoria ainda não tem sub-disciplinas.</p>
              <p className="text-sm text-muted-foreground mt-1">As taxas horárias e a inscrição de alunos são feitas nas sub-disciplinas.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sub-disciplina</TableHead>
                  <TableHead>Individual /h</TableHead>
                  <TableHead>Grupo /h</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subs.map(sub => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {sub.corHsl && <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: sub.corHsl }} />}
                        <span className="font-medium">{sub.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-primary">{sub.precoHoraIndividual.toFixed(2)} €</TableCell>
                    <TableCell className="font-semibold text-primary">{sub.precoHoraGrupo.toFixed(2)} €</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(sub); setModalOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(sub)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DisciplinaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        disciplina={editing}
        parent={editing ? null : categoria}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar sub-disciplina?</AlertDialogTitle>
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
