import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ConfiguracoesCentroPage() {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [centroNome, setCentroNome] = useState("");
  const [centroMorada, setCentroMorada] = useState("");
  const [centroNif, setCentroNif] = useState("");
  const [centroEmail, setCentroEmail] = useState("");
  const [centroTelefone, setCentroTelefone] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile?.centro_id) return;
    setLoading(true);
    supabase
      .from("centros")
      .select("nome, morada, nif, email, telefone")
      .eq("id", profile.centro_id)
      .single()
      .then(({ data }) => {
        if (data) {
          setCentroNome((data as any).nome ?? "");
          setCentroMorada((data as any).morada ?? "");
          setCentroNif((data as any).nif ?? "");
          setCentroEmail((data as any).email ?? "");
          setCentroTelefone((data as any).telefone ?? "");
        }
      })
      .finally(() => setLoading(false));
  }, [profile?.centro_id]);

  const handleSave = async () => {
    if (!profile?.centro_id || !centroNome.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("centros")
        .update({
          nome: centroNome.trim(),
          morada: centroMorada.trim() || null,
          nif: centroNif.trim() || null,
          email: centroEmail.trim() || null,
          telefone: centroTelefone.trim() || null,
        })
        .eq("id", profile.centro_id);
      if (error) throw error;
      await refreshProfile();
      toast({ title: "Centro guardado" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/configuracoes")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Configurações
        </Button>
      </div>

      <h1 className="text-2xl font-bold">Detalhes do Centro</h1>

      <Card>
        <CardHeader>
          <CardTitle>Informações do Centro</CardTitle>
          <CardDescription>Dados públicos e de contacto do centro de explicações</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Nome do centro *</Label>
                <Input value={centroNome} onChange={e => setCentroNome(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Morada</Label>
                <Input value={centroMorada} onChange={e => setCentroMorada(e.target.value)} placeholder="Rua, número, localidade" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>NIF</Label>
                  <Input
                    value={centroNif}
                    onChange={e => setCentroNif(e.target.value.replace(/\D/g, "").slice(0, 9))}
                    placeholder="123456789"
                    maxLength={9}
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={centroTelefone} onChange={e => setCentroTelefone(e.target.value)} placeholder="+351 912 345 678" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email de contacto</Label>
                <Input type="email" value={centroEmail} onChange={e => setCentroEmail(e.target.value)} placeholder="geral@centro.pt" />
              </div>
              <Button onClick={handleSave} disabled={saving || !centroNome.trim()}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Guardar
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
