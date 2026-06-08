import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function DefinicoesBasicasPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { centroConfig, updateCentroConfig } = useData();
  const { toast } = useToast();
  const allowed = profile?.role === "admin" || profile?.role === "rececionista";

  // Estado local do formulário, sincronizado a partir da config carregada.
  const [cobrarFalta, setCobrarFalta] = useState(centroConfig.cobrarFaltaInjustificada);
  const [pagarFalta, setPagarFalta] = useState(centroConfig.pagarFaltaInjustificada);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCobrarFalta(centroConfig.cobrarFaltaInjustificada);
    setPagarFalta(centroConfig.pagarFaltaInjustificada);
  }, [centroConfig.cobrarFaltaInjustificada, centroConfig.pagarFaltaInjustificada]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateCentroConfig({
        cobrarFaltaInjustificada: cobrarFalta,
        pagarFaltaInjustificada: pagarFalta,
      });
      toast({ title: "Definições guardadas" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!allowed) return <Navigate to="/configuracoes" replace />;

  const dirty =
    cobrarFalta !== centroConfig.cobrarFaltaInjustificada ||
    pagarFalta !== centroConfig.pagarFaltaInjustificada;

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/configuracoes")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Configurações
        </Button>
      </div>

      <h1 className="text-2xl font-bold">Definições Básicas</h1>

      <Card>
        <CardHeader>
          <CardTitle>Faltas Injustificadas</CardTitle>
          <CardDescription>
            Defina como as faltas injustificadas afetam a faturação do seu centro.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="cobrar-falta">Cobrar faltas injustificadas aos alunos</Label>
              <p className="text-sm text-muted-foreground">
                Quando ativo, uma falta injustificada é cobrada ao aluno como se a aula tivesse sido dada.
              </p>
            </div>
            <Switch
              id="cobrar-falta"
              checked={cobrarFalta}
              onCheckedChange={setCobrarFalta}
              className="mt-1 shrink-0"
            />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="pagar-falta">Pagar faltas injustificadas aos explicadores</Label>
              <p className="text-sm text-muted-foreground">
                Quando ativo, o explicador é pago por uma aula em que o aluno teve falta injustificada.
              </p>
            </div>
            <Switch
              id="pagar-falta"
              checked={pagarFalta}
              onCheckedChange={setPagarFalta}
              className="mt-1 shrink-0"
            />
          </div>

          <Button onClick={handleSave} disabled={saving || !dirty}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Guardar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
