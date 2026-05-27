import { useState, useEffect } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ConfiguracoesPage() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();

  const isCentroRole = profile?.role === "admin" || profile?.role === "rececionista";

  // --- Perfil ---
  const [nome, setNome] = useState(profile?.nome ?? "");
  const [cargo, setCargo] = useState(profile?.cargo ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  // --- Password ---
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // --- Centro ---
  const [centroNome, setCentroNome] = useState("");
  const [centroMorada, setCentroMorada] = useState("");
  const [centroNif, setCentroNif] = useState("");
  const [centroEmail, setCentroEmail] = useState("");
  const [centroTelefone, setCentroTelefone] = useState("");
  const [savingCentro, setSavingCentro] = useState(false);
  const [loadingCentro, setLoadingCentro] = useState(false);

  useEffect(() => {
    setNome(profile?.nome ?? "");
    setCargo(profile?.cargo ?? "");
  }, [profile]);

  useEffect(() => {
    if (!isCentroRole || !profile?.centro_id) return;
    setLoadingCentro(true);
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
      .finally(() => setLoadingCentro(false));
  }, [isCentroRole, profile?.centro_id]);

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({ nome: nome.trim(), cargo: cargo.trim() || null })
        .eq("id", profile.id);
      if (error) throw error;
      await refreshProfile();
      toast({ title: "Perfil guardado" });
    } catch (e: any) {
      toast({ title: "Erro ao guardar perfil", description: e.message, variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Mínimo 6 caracteres", variant: "destructive" });
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
      toast({ title: "Palavra-passe alterada" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveCentro = async () => {
    if (!profile?.centro_id || !centroNome.trim()) return;
    setSavingCentro(true);
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
      setSavingCentro(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="text-2xl font-bold">Configurações</h1>

      <Tabs defaultValue="perfil">
        <TabsList>
          <TabsTrigger value="perfil">O Meu Perfil</TabsTrigger>
          {isCentroRole && <TabsTrigger value="centro">Centro</TabsTrigger>}
        </TabsList>

        {/* ---- PERFIL ---- */}
        <TabsContent value="perfil" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={nome} onChange={e => setNome(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Input value={cargo} onChange={e => setCargo(e.target.value)} placeholder="ex: Director Pedagógico" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={profile?.email ?? ""} readOnly className="bg-muted text-muted-foreground cursor-not-allowed" />
                <p className="text-xs text-muted-foreground">Para alterar o email, contacte o suporte.</p>
              </div>
              <Button onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Guardar
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Segurança</CardTitle>
              <CardDescription>Altere a sua palavra-passe de acesso</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nova palavra-passe</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="space-y-2">
                <Label>Confirmar palavra-passe</Label>
                <Input
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

          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Eliminar conta</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Para eliminar a sua conta contacte o administrador do centro ou o suporte da plataforma.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- CENTRO ---- */}
        {isCentroRole && (
          <TabsContent value="centro" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Detalhes do Centro</CardTitle>
                <CardDescription>Informações e contactos do centro de explicações</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingCentro ? (
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
                    <Button onClick={handleSaveCentro} disabled={savingCentro || !centroNome.trim()}>
                      {savingCentro && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Guardar
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
