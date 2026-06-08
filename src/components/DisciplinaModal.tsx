import { useState, useEffect } from "react";
import { Disciplina } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FolderTree } from "lucide-react";

const FALLBACK_COLOR = "#6366f1";

export function DisciplinaModal({ open, onClose, disciplina, parent, onSave }: {
  open: boolean;
  onClose: () => void;
  /** Disciplina a editar, ou null ao criar. */
  disciplina: Disciplina | null;
  /** Categoria-pai ao criar uma sub-disciplina; null ao criar uma categoria de topo. */
  parent: Disciplina | null;
  onSave: (data: { nome: string; corHsl: string | null; precoHoraIndividual?: number; precoHoraGrupo?: number; parentId?: string | null }) => void;
}) {
  const [nome, setNome] = useState("");
  const [precoIndividual, setPrecoIndividual] = useState("20");
  const [precoGrupo, setPrecoGrupo] = useState("15");
  const [corHsl, setCorHsl] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Categoria = topo (sem pai). Folha = sub-disciplina (com pai). Só as folhas têm preço.
  const isCategoria = disciplina ? disciplina.parentId == null : parent == null;
  const showPrices = !isCategoria;

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
    ? (isCategoria ? "Editar Categoria" : "Editar Sub-disciplina")
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
    const data: { nome: string; corHsl: string | null; precoHoraIndividual?: number; precoHoraGrupo?: number; parentId?: string | null } = {
      nome: nome.trim(),
      corHsl: corHsl || null,
    };
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
              As categorias servem apenas para organizar. As taxas horárias são definidas em cada sub-disciplina.
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
