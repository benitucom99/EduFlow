import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type FontSize = "small" | "medium" | "large";

const SIZES: { key: FontSize; label: string; description: string; previewClass: string }[] = [
  { key: "small",  label: "Pequena", description: "Mais compacto, mais conteúdo visível", previewClass: "text-xs" },
  { key: "medium", label: "Média",   description: "Tamanho padrão, equilibrado",          previewClass: "text-sm" },
  { key: "large",  label: "Grande",  description: "Maior legibilidade, menos conteúdo",   previewClass: "text-base" },
];

function applyFontSize(size: FontSize) {
  document.documentElement.classList.remove("font-small", "font-medium", "font-large");
  document.documentElement.classList.add(`font-${size}`);
  localStorage.setItem("eduflow_font_size", size);
}

export default function ConfiguracoesPersonalizacaoPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selected, setSelected] = useState<FontSize>(
    () => (localStorage.getItem("eduflow_font_size") as FontSize) ?? "medium"
  );

  const handleSelect = (size: FontSize) => {
    setSelected(size);
    applyFontSize(size);
    toast({ title: "Tamanho de letra atualizado" });
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/configuracoes")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Configurações
        </Button>
      </div>

      <h1 className="text-2xl font-bold">Personalização</h1>

      <Card>
        <CardHeader>
          <CardTitle>Tamanho de letra</CardTitle>
          <CardDescription>Escolha o tamanho que torna a leitura mais confortável</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {SIZES.map(s => (
            <button
              key={s.key}
              onClick={() => handleSelect(s.key)}
              className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-colors text-left ${
                selected === s.key
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-accent/40"
              }`}
            >
              <div className="flex-1">
                <p className={`font-medium ${s.previewClass}`}>{s.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                <p className={`mt-2 text-muted-foreground ${s.previewClass}`}>
                  O rato roeu a rolha da garrafa.
                </p>
              </div>
              {selected === s.key && (
                <Check className="h-4 w-4 text-primary shrink-0" />
              )}
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
