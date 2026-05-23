import { useState, useEffect } from "react";
import { useData } from "@/contexts/DataContext";
import { Sala } from "@/contexts/DataContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, DoorOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isToday, parseISO } from "date-fns";

export default function SalasPage() {
  const { salas, createSala, updateSala, deleteSala, aulas } = useData();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Sala | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Sala | null>(null);

  const getAulasHoje = (salaId: string) =>
    aulas.filter(a => {
      try { return a.salaId === salaId && isToday(parseISO(a.data)) && a.estado !== "cancelada"; } catch { return false; }
    });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSala(deleteTarget.id);
      toast({ title: "Sala eliminada" });
    } catch {
      toast({ title: "Erro ao eliminar sala", description: "Tenta novamente.", variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Salas <span className="text-muted-foreground font-normal text-lg">({salas.length})</span></h1>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus className="h-4 w-4" /> Nova Sala
        </Button>
      </div>

      {salas.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <DoorOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma sala criada. Crie a primeira sala para começar.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sala</TableHead>
                  <TableHead>Aulas Hoje</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salas.map(sala => {
                  const aulasHoje = getAulasHoje(sala.id);
                  return (
                    <TableRow key={sala.id}>
                      <TableCell className="font-medium">{sala.nome}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {aulasHoje.length > 0 ? `${aulasHoje.length} aula(s)` : "Sem aulas"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(sala); setModalOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(sala)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <SalaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        sala={editing}
        onSave={async (data) => {
          try {
            if (editing) {
              await updateSala(editing.id, data);
              toast({ title: "Sala atualizada" });
            } else {
              await createSala(data);
              toast({ title: "Sala criada" });
            }
            setModalOpen(false);
          } catch {
            toast({ title: "Erro ao guardar sala", description: "Tenta novamente.", variant: "destructive" });
          }
        }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar sala?</AlertDialogTitle>
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

function SalaModal({ open, onClose, sala, onSave }: {
  open: boolean;
  onClose: () => void;
  sala: Sala | null;
  onSave: (data: any) => void;
}) {
  const [nome, setNome] = useState("");

  useEffect(() => {
    if (open) setNome(sala?.nome || "");
  }, [open, sala]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{sala ? "Editar Sala" : "Nova Sala"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Nome *</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Sala A" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => { if (!nome.trim()) return; onSave({ nome: nome.trim() }); }}>Guardar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
