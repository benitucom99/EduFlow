import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useData, MomentoPagamento } from "@/contexts/DataContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [anoLetivoInicio, setAnoLetivoInicio] = useState(centroConfig.anoLetivoInicio ?? "");
  const [anoLetivoFim, setAnoLetivoFim] = useState(centroConfig.anoLetivoFim ?? "");
  const [saving, setSaving] = useState(false);
  const [savingAnoLetivo, setSavingAnoLetivo] = useState(false);

  useEffect(() => {
    setMomento(centroConfig.momentoPagamento);
  }, [centroConfig.momentoPagamento]);

  useEffect(() => {
    setAnoLetivoInicio(centroConfig.anoLetivoInicio ?? "");
    setAnoLetivoFim(centroConfig.anoLetivoFim ?? "");
  }, [centroConfig.anoLetivoInicio, centroConfig.anoLetivoFim]);

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

  const handleSaveAnoLetivo = async () => {
    setSavingAnoLetivo(true);
    try {
      await updateCentroConfig({ anoLetivoInicio: anoLetivoInicio || undefined, anoLetivoFim: anoLetivoFim || undefined });
      toast({ title: "Ano letivo guardado" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSavingAnoLetivo(false);
    }
  };

  if (!allowed) return <Navigate to="/configuracoes" replace />;

  const dirty = momento !== centroConfig.momentoPagamento;
  const dirtyAnoLetivo = anoLetivoInicio !== (centroConfig.anoLetivoInicio ?? "") || anoLetivoFim !== (centroConfig.anoLetivoFim ?? "");

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

      <Card>
        <CardHeader>
          <CardTitle>Ano Letivo</CardTitle>
          <CardDescription>
            Define o período do ano letivo do centro. Esta configuração é usada como default no gerador de horários recorrentes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="al-inicio">Início do Ano Letivo</Label>
              <Input
                id="al-inicio"
                type="date"
                value={anoLetivoInicio}
                onChange={e => setAnoLetivoInicio(e.target.value)}
              />
              {!anoLetivoInicio && (
                <p className="text-xs text-muted-foreground">Não configurado — será usado o default (até 31 de Julho).</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="al-fim">Fim do Ano Letivo</Label>
              <Input
                id="al-fim"
                type="date"
                value={anoLetivoFim}
                onChange={e => setAnoLetivoFim(e.target.value)}
                min={anoLetivoInicio || undefined}
              />
              {!anoLetivoFim && (
                <p className="text-xs text-muted-foreground">Não configurado — será usado o default (até 31 de Julho).</p>
              )}
            </div>
          </div>

          <Button onClick={handleSaveAnoLetivo} disabled={savingAnoLetivo || !dirtyAnoLetivo}>
            {savingAnoLetivo && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Guardar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
