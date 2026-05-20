import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function OnboardingPage() {
  const { profile, refreshProfile, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [centroNome, setCentroNome] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!centroNome.trim()) return;
    setLoading(true);
    const { error } = await supabase.rpc("create_centro_for_new_admin", { p_centro_nome: centroNome });
    setLoading(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    await refreshProfile();
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent via-background to-muted p-4">
      <div className="w-full max-w-[420px] bg-card rounded-xl shadow-lg border border-border p-8">
        <h1 className="text-lg font-heading font-semibold mb-1">Bem-vindo{profile?.nome ? `, ${profile.nome}` : ""}</h1>
        <p className="text-sm text-muted-foreground mb-6">Termine a criação da sua conta indicando o nome do centro.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="centro">Nome do centro</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="centro" value={centroNome} onChange={e => setCentroNome(e.target.value)} className="pl-10" autoFocus />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Continuar
          </Button>
          <button type="button" onClick={() => { logout(); navigate("/login"); }} className="w-full text-sm text-muted-foreground hover:underline">
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}
