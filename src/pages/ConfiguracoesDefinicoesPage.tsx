import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useData, MomentoPagamento } from "@/contexts/DataContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ConfiguracoesDefinicoesPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { centroConfig, updateCentroConfig } = useData();
  const { toast } = useToast();
  const allowed = profile?.role === "admin" || profile?.role === "rececionista";

  const [momento, setMomento] = useState<MomentoPagamento>(centroConfig.momentoPagamento);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMomento(centroConfig.momentoPagamento);
  }, [centroConfig.momentoPagamento]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateCentroConfig({ momentoPagamento: momento });
      toast({ title: "Definições guardadas" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!allowed) return <Navigate to="/configuracoes" replace />;

  const dirty = momento !== centroConfig.momentoPagamento;

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/configuracoes")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Configurações
        </Button>
      </div>

      <h1 className="text-2xl font-bold">Definições Gerais</h1>

      <Card>
        <CardHeader>
          <CardTitle>Modelo de faturação</CardTitle>
          <CardDescription>
            Define quando as aulas são cobradas aos alunos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup value={momento} onValueChange={v => setMomento(v as MomentoPagamento)} className="gap-4">
            <label htmlFor="m-fim" className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-accent/40 transition-colors">
              <RadioGroupItem value="fim" id="m-fim" className="mt-0.5" />
              <div className="space-y-1">
                <Label htmlFor="m-fim" className="cursor-pointer font-medium">Pagamento no fim do mês</Label>
                <p className="text-sm text-muted-foreground">
                  Cobra à hora, conforme as aulas efetivamente dadas (presenças). Faltas e aulas futuras não são cobradas.
                </p>
              </div>
            </label>
            <label htmlFor="m-inicio" className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-accent/40 transition-colors">
              <RadioGroupItem value="inicio" id="m-inicio" className="mt-0.5" />
              <div className="space-y-1">
                <Label htmlFor="m-inicio" className="cursor-pointer font-medium">Pagamento no início do mês</Label>
                <p className="text-sm text-muted-foreground">
                  Mensalidade antecipada: cobra as aulas agendadas do mês e as faltas justificadas (já pagas). As reposições não acrescem custo ao aluno.
                </p>
              </div>
            </label>
          </RadioGroup>

          <Button onClick={handleSave} disabled={saving || !dirty}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Guardar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
