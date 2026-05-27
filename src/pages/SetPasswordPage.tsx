import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { GraduationCap, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function SetPasswordPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // O link de recovery coloca os tokens no fragmento do URL; o supabase-js
    // deteta-os e dispara INITIAL_SESSION (sempre, com ou sem sessão) após
    // processar o URL. É o sinal fiável de que já podemos validar o acesso.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("A palavra-passe deve ter pelo menos 8 caracteres."); return; }
    if (password !== confirm) { setError("As palavras-passe não coincidem."); return; }
    setSaving(true);
    const { error: updErr } = await supabase.auth.updateUser({ password });
    if (updErr) { setError(updErr.message); setSaving(false); return; }
    // Marca o acesso como ativado (RPC só toca na própria linha).
    await supabase.rpc("mark_acesso_ativado");
    toast({ title: "Palavra-passe definida", description: "Já pode aceder à plataforma." });
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent via-background to-muted p-4">
      <div className="w-full max-w-[420px] bg-card rounded-xl shadow-lg border border-border p-8 animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <GraduationCap className="h-10 w-10 text-primary" />
            <span className="text-2xl font-bold text-primary">EduFlow</span>
          </div>
          <p className="text-muted-foreground text-sm">Defina a sua palavra-passe de acesso</p>
        </div>

        {!ready ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !hasSession ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Este link é inválido ou expirou. Peça um novo no login ("Esqueceu a palavra-passe?") ou ao administrador do centro.
            </p>
            <Link to="/login" className="text-sm text-secondary hover:underline">Ir para o login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Palavra-passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmar palavra-passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="confirm" type={showPassword ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)} className="pl-10" />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Definir palavra-passe e entrar
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
