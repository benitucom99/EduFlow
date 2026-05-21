import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ConfiguracoesPage() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [nome, setNome] = useState(profile?.nome ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [centroNome, setCentroNome] = useState(profile?.centro ?? "");
  const [savingCentro, setSavingCentro] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSavingProfile(true);
    try {
      const updates: Record<string, string> = {};
      if (nome.trim() !== profile.nome) updates.nome = nome.trim();
      if (email.trim() !== profile.email) updates.email = email.trim();

      if (Object.keys(updates).length) {
        const { error } = await supabase.from("users").update(updates).eq("id", profile.id);
        if (error) throw error;
        if (updates.email) {
          const { error: authErr } = await supabase.auth.updateUser({ email: updates.email });
          if (authErr) throw authErr;
        }
        await refreshProfile();
      }
      toast({ title: "Perfil guardado" });
    } catch (e: any) {
      toast({ title: "Erro ao guardar perfil", description: e.message, variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveCentro = async () => {
    if (!profile?.centro_id) return;
    setSavingCentro(true);
    try {
      const { error } = await supabase
        .from("centros")
        .update({ nome: centroNome.trim() })
        .eq("id", profile.centro_id);
      if (error) throw error;
      await refreshProfile();
      toast({ title: "Centro guardado" });
    } catch (e: any) {
      toast({ title: "Erro ao guardar centro", description: e.message, variant: "destructive" });
    } finally {
      setSavingCentro(false);
    }
  };

  const handleSavePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "A palavra-passe deve ter mínimo 6 caracteres", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "As palavras-passe não coincidem", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Palavra-passe alterada com sucesso" });
    } catch (e: any) {
      toast({ title: "Erro ao alterar palavra-passe", description: e.message, variant: "destructive" });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="text-2xl font-bold">Configurações</h1>

      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cfg-nome">Nome</Label>
            <Input id="cfg-nome" value={nome} onChange={e => setNome(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cfg-email">Email</Label>
            <Input id="cfg-email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <Button onClick={handleSaveProfile} disabled={savingProfile}>
            {savingProfile && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Guardar perfil
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Centro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cfg-centro">Nome do centro</Label>
            <Input id="cfg-centro" value={centroNome} onChange={e => setCentroNome(e.target.value)} />
          </div>
          <Button onClick={handleSaveCentro} disabled={savingCentro}>
            {savingCentro && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Guardar centro
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Segurança</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cfg-new-pw">Nova palavra-passe</Label>
            <Input
              id="cfg-new-pw"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cfg-confirm-pw">Confirmar palavra-passe</Label>
            <Input
              id="cfg-confirm-pw"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button onClick={handleSavePassword} disabled={savingPassword}>
            {savingPassword && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Alterar palavra-passe
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
