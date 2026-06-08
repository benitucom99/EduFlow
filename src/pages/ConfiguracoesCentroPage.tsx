import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Loader2, ArrowLeft, UserPlus, Copy, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useData, ModoPagamentoProfessor } from "@/contexts/DataContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function ConfiguracoesCentroPage() {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const { centroConfig, updateCentroConfig, assistentes, inviteAssistente } = useData();
  const { toast } = useToast();
  const isAdmin = profile?.role === "admin";
  const allowed = isAdmin || profile?.role === "rececionista";

  // ── Centro form state ─────────────────────────────────────────────────────
  const [centroNome, setCentroNome] = useState("");
  const [centroMorada, setCentroMorada] = useState("");
  const [centroNif, setCentroNif] = useState("");
  const [centroEmail, setCentroEmail] = useState("");
  const [centroTelefone, setCentroTelefone] = useState("");
  const [modoPagamento, setModoPagamento] = useState<ModoPagamentoProfessor>("base");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Invite dialog state ───────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState<"form" | "success">("form");
  const [invNome, setInvNome] = useState("");
  const [invEmail, setInvEmail] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!allowed || !profile?.centro_id) return;
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
  }, [allowed, profile?.centro_id]);

  useEffect(() => {
    setModoPagamento(centroConfig.modoPagamentoProfessor);
  }, [centroConfig.modoPagamentoProfessor]);

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
      await updateCentroConfig({ modoPagamentoProfessor: modoPagamento });
      await refreshProfile();
      toast({ title: "Centro guardado" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const openDialog = () => {
    setInvNome("");
    setInvEmail("");
    setGeneratedLink("");
    setStep("form");
    setCopied(false);
    setDialogOpen(true);
  };

  const handleInvite = async () => {
    if (!invNome.trim() || !invEmail.trim()) return;
    setSubmitting(true);
    try {
      const link = await inviteAssistente(invNome.trim(), invEmail.trim());
      setGeneratedLink(link);
      setStep("success");
    } catch (e: any) {
      toast({ title: "Erro ao criar assistente", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!allowed) return <Navigate to="/configuracoes" replace />;

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
              <div className="space-y-2">
                <Label>Modo de pagamento dos Explicadores</Label>
                <Select value={modoPagamento} onValueChange={(v) => setModoPagamento(v as ModoPagamentoProfessor)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="base">Valor/hora base (igual para todas as disciplinas)</SelectItem>
                    <SelectItem value="por_disciplina">Por disciplina (valor/hora diferente por disciplina)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave} disabled={saving || !centroNome.trim()}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Guardar
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Equipa — apenas admin pode convidar */}
      {isAdmin && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Equipa Administrativa</CardTitle>
              <CardDescription>Assistentes com acesso à plataforma</CardDescription>
            </div>
            <Button size="sm" onClick={openDialog} className="shrink-0">
              <UserPlus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </CardHeader>
          <CardContent>
            {assistentes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Ainda não há assistentes administrativos.
              </p>
            ) : (
              <div className="divide-y">
                {assistentes.map(a => (
                  <div key={a.id} className="flex items-center gap-3 py-3">
                    <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-bold shrink-0 text-accent-foreground">
                      {a.nome?.split(" ").map(n => n[0]).join("").slice(0, 2) || "U"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{a.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">{a.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog de convite */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) setDialogOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Assistente Administrativo</DialogTitle>
            <DialogDescription>
              {step === "form"
                ? "Preencha os dados. Será gerado um link de acesso para partilhar diretamente."
                : "Link de acesso gerado com sucesso."}
            </DialogDescription>
          </DialogHeader>

          {step === "form" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inv-nome">Nome</Label>
                <Input
                  id="inv-nome"
                  value={invNome}
                  onChange={e => setInvNome(e.target.value)}
                  placeholder="Ana Silva"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-email">Email</Label>
                <Input
                  id="inv-email"
                  type="email"
                  value={invEmail}
                  onChange={e => setInvEmail(e.target.value)}
                  placeholder="ana@centro.pt"
                  disabled={submitting}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Copie este link e envie ao seu assistente. Ele só terá de abrir e escolher a sua palavra-passe.
              </p>
              <div className="flex gap-2">
                <Input
                  value={generatedLink}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button variant="outline" size="icon" onClick={handleCopy} title="Copiar link">
                  {copied
                    ? <Check className="h-4 w-4 text-green-600" />
                    : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            {step === "form" ? (
              <>
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleInvite}
                  disabled={submitting || !invNome.trim() || !invEmail.trim()}
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Gerar Link
                </Button>
              </>
            ) : (
              <Button onClick={() => setDialogOpen(false)}>Fechar</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
