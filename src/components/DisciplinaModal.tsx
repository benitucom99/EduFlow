import { useState, useEffect } from "react";
import { Disciplina, EscalaoPreco } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FolderTree, Plus, Trash2 } from "lucide-react";

const FALLBACK_COLOR = "#6366f1";

// Linha de escalão em edição (strings para inputs controlados).
type EscalaoDraft = { duracaoMin: string; precoHora: string };

export function DisciplinaModal({ open, onClose, disciplina, parent, onSave }: {
  open: boolean;
  onClose: () => void;
  /** Disciplina a editar, ou null ao criar. */
  disciplina: Disciplina | null;
  /** Categoria-pai ao criar uma sub-disciplina; null ao criar uma categoria de topo. */
  parent: Disciplina | null;
  onSave: (data: { nome: string; corHsl: string | null; precoHoraIndividual?: number; precoHoraGrupo?: number; escaloesPrecoIndividual?: EscalaoPreco[]; parentId?: string | null }) => void;
}) {
  const [nome, setNome] = useState("");
  const [precoIndividual, setPrecoIndividual] = useState("20");
  const [precoGrupo, setPrecoGrupo] = useState("15");
  const [escaloes, setEscaloes] = useState<EscalaoDraft[]>([]);
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
      setEscaloes((disciplina?.escaloesPrecoIndividual ?? []).map(e => ({
        duracaoMin: String(e.duracaoMin),
        precoHora: String(e.precoHora),
      })));
      setCorHsl(disciplina?.corHsl || (parent?.corHsl ?? ""));
      setErrors({});
    }
  }, [open, disciplina, parent]);

  const title = disciplina
    ? (isCategoria ? "Editar Categoria" : "Editar Sub-disciplina")
    : (parent ? "Nova Sub-disciplina" : "Nova Disciplina");

  const addEscalao = () => setEscaloes(prev => [...prev, { duracaoMin: "", precoHora: "" }]);
  const removeEscalao = (i: number) => setEscaloes(prev => prev.filter((_, idx) => idx !== i));
  const updateEscalao = (i: number, campo: keyof EscalaoDraft, val: string) =>
    setEscaloes(prev => prev.map((e, idx) => idx === i ? { ...e, [campo]: val } : e));

  // Aceita vírgula decimal (pt) ou ponto. parseFloat só entende ponto, por isso
  // normaliza antes (ex.: "19,75" → 19.75).
  const parseNum = (v: string) => parseFloat(String(v).replace(",", "."));

  const handleSave = () => {
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = "Obrigatório";
    const ind = parseNum(precoIndividual);
    const grp = parseNum(precoGrupo);
    let escaloesParsed: EscalaoPreco[] = [];
    if (showPrices) {
      if (isNaN(ind) || ind < 0) e.precoInd = "Valor inválido";
      if (isNaN(grp) || grp < 0) e.precoGrp = "Valor inválido";
      // Valida cada escalão preenchido; linhas totalmente vazias são ignoradas.
      escaloes.forEach((esc, i) => {
        const temAlgo = esc.duracaoMin.trim() !== "" || esc.precoHora.trim() !== "";
        if (!temAlgo) return;
        const dm = parseNum(esc.duracaoMin);
        const ph = parseNum(esc.precoHora);
        if (isNaN(dm) || dm <= 0) e[`esc_${i}_dur`] = "Inválido";
        if (isNaN(ph) || ph < 0) e[`esc_${i}_preco`] = "Inválido";
        if (!isNaN(dm) && dm > 0 && !isNaN(ph) && ph >= 0) escaloesParsed.push({ duracaoMin: dm, precoHora: ph });
      });
    }
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    escaloesParsed.sort((a, b) => a.duracaoMin - b.duracaoMin);
    const data: { nome: string; corHsl: string | null; precoHoraIndividual?: number; precoHoraGrupo?: number; escaloesPrecoIndividual?: EscalaoPreco[]; parentId?: string | null } = {
      nome: nome.trim(),
      corHsl: corHsl || null,
    };
    if (showPrices) {
      data.precoHoraIndividual = ind;
      data.precoHoraGrupo = grp;
      data.escaloesPrecoIndividual = escaloesParsed;
    }
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
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Individual /h (€)</Label>
                  <Input type="text" inputMode="decimal" value={precoIndividual} onChange={e => setPrecoIndividual(e.target.value)} placeholder="20,00" />
                  {errors.precoInd && <p className="text-xs text-destructive mt-1">{errors.precoInd}</p>}
                </div>
                <div>
                  <Label>Grupo /h (€)</Label>
                  <Input type="text" inputMode="decimal" value={precoGrupo} onChange={e => setPrecoGrupo(e.target.value)} placeholder="15,00" />
                  {errors.precoGrp && <p className="text-xs text-destructive mt-1">{errors.precoGrp}</p>}
                </div>
              </div>

              {/* Preços por duração (descontos por volume) — só aulas individuais. */}
              {escaloes.length === 0 ? (
                <Button type="button" variant="outline" size="sm" className="w-full" onClick={addEscalao}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar Preço por Duração
                </Button>
              ) : (
                <div className="space-y-2 rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">
                    Preço/hora individual reduzido para aulas mais longas (aplica-se a toda a aula).
                  </p>
                  {escaloes.map((esc, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">A partir de</span>
                      <Input
                        type="text" inputMode="decimal" value={esc.duracaoMin}
                        onChange={e => updateEscalao(i, "duracaoMin", e.target.value)}
                        placeholder="2" className="w-16 h-8"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">h =</span>
                      <Input
                        type="text" inputMode="decimal" value={esc.precoHora}
                        onChange={e => updateEscalao(i, "precoHora", e.target.value)}
                        placeholder="17,75" className="w-20 h-8"
                      />
                      <span className="text-xs text-muted-foreground">€/h</span>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeEscalao(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {escaloes.some((_, i) => errors[`esc_${i}_dur`] || errors[`esc_${i}_preco`]) && (
                    <p className="text-xs text-destructive">Verifica os valores das regras (duração &gt; 0, preço ≥ 0).</p>
                  )}
                  <Button type="button" variant="ghost" size="sm" className="text-xs h-7" onClick={addEscalao}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar regra
                  </Button>
                </div>
              )}
            </>
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
