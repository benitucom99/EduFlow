import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { Disciplina } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, BookOpen, ChevronRight, FolderTree } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { childrenOf, topLevel } from "@/lib/disciplinas";
import { DisciplinaModal } from "@/components/DisciplinaModal";

const FALLBACK_COLOR = "#6366f1";

export default function DisciplinasPage() {
  const { disciplinas, createDisciplina, updateDisciplina, deleteDisciplina } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Disciplina | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Disciplina | null>(null);

  const categorias = topLevel(disciplinas);

  const handleSave = async (data: any) => {
    try {
      if (editing) {
        await updateDisciplina(editing.id, data);
        toast({ title: "Categoria atualizada" });
      } else {
        await createDisciplina(data);
        toast({ title: "Disciplina criada" });
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
        <Button onClick={() => { setEditing(null); setModalOpen(true); }}><Plus className="h-4 w-4" /> Nova Disciplina</Button>
      </div>

      {categorias.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma disciplina criada. Crie a primeira disciplina para começar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categorias.map(disc => {
            const cor = disc.corHsl || FALLBACK_COLOR;
            const nSubs = childrenOf(disciplinas, disc.id).length;
            return (
              <button
                key={disc.id}
                onClick={() => navigate(`/disciplinas/${disc.id}`)}
                className="group flex items-center gap-4 rounded-xl border border-border bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ borderLeft: `4px solid ${cor}` }}
              >
                <div
                  className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `color-mix(in srgb, ${cor} 15%, transparent)`, color: cor }}
                >
                  <FolderTree className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold font-heading leading-tight truncate">{disc.nome}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {nSubs} sub-disciplina{nSubs === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(disc); setModalOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(disc)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      <DisciplinaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        disciplina={editing}
        parent={null}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar disciplina?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que quer eliminar <strong>{deleteTarget?.nome}</strong>?
              {deleteTarget && childrenOf(disciplinas, deleteTarget.id).length > 0 && (
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
