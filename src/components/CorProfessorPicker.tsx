import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const FALLBACK_COLOR = "#6366f1";

/**
 * Color picker para a cor do professor — usada para pintar os blocos das aulas
 * no calendário. Valor vazio = sem cor definida (o calendário cai numa paleta
 * automática por índice).
 */
export function CorProfessorPicker({ value, onChange }: {
  value: string;
  onChange: (cor: string) => void;
}) {
  return (
    <div>
      <Label>Cor no calendário</Label>
      <div className="flex items-center gap-2 mt-1">
        <input
          type="color"
          value={value || FALLBACK_COLOR}
          onChange={e => onChange(e.target.value)}
          className="h-9 w-16 rounded border cursor-pointer"
        />
        <span className="text-sm text-muted-foreground">{value || "Cor automática"}</span>
        {value && (
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => onChange("")}>
            Remover
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-1">As aulas deste professor aparecem com esta cor no calendário.</p>
    </div>
  );
}
