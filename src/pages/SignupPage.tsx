import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Building2, User, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [centroNome, setCentroNome] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!centroNome.trim() || !nome.trim() || !/\S+@\S+\.\S+/.test(email) || password.length < 6) {
      toast({ title: "Verifique os campos", description: "Todos obrigatórios; password ≥ 6 caracteres", variant: "destructive" });
      return;
    }
    setLoading(true);
    const res = await signUp({ nome, email, password, centroNome });
    setLoading(false);
    if (res.ok) {
      navigate("/dashboard");
    } else {
      toast({ title: "Não foi possível criar a conta", description: res.error, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent via-background to-muted p-4">
      <div className="w-full max-w-[460px] bg-card rounded-xl shadow-lg border border-border p-8 animate-fade-in">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-3">
            <GraduationCap className="h-10 w-10 text-primary" />
            <span className="text-2xl font-bold text-primary">EduFlow</span>
          </div>
          <h1 className="text-lg font-heading font-semibold">Criar conta de centro</h1>
          <p className="text-muted-foreground text-sm mt-1">Comece a gerir o seu centro em minutos</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="centro">Nome do centro</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="centro" value={centroNome} onChange={e => setCentroNome(e.target.value)} className="pl-10" placeholder="Ex: EduFlow Porto" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nome">Seu nome</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="nome" value={nome} onChange={e => setNome(e.target.value)} className="pl-10" placeholder="Nome do responsável" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" placeholder="email@exemplo.pt" />
            </div>
          </div>
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

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar conta
          </Button>
        </form>

        <p className="text-sm text-muted-foreground text-center mt-6">
          Já tem conta? <Link to="/login" className="text-secondary hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
