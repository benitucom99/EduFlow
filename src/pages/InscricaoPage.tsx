import { useState } from "react";
import { z } from "zod";
import { useInscricoes } from "@/contexts/InscricoesContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, CheckCircle2 } from "lucide-react";
import { disciplinas } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  nomeAluno: z.string().trim().min(2, "Nome muito curto").max(100),
  emailAluno: z.string().trim().email("Email inválido").max(255).or(z.literal("")),
  telefoneAluno: z.string().trim().max(20).optional().or(z.literal("")),
  escola: z.string().trim().max(120).optional().or(z.literal("")),
  anoLetivo: z.number().int().min(1).max(12),
  disciplinas: z.array(z.string()).min(1, "Selecione pelo menos 1 disciplina"),
  nomeEncarregado: z.string().trim().min(2, "Obrigatório").max(100),
  emailEncarregado: z.string().trim().email("Email inválido").max(255),
  telefoneEncarregado: z.string().trim().min(6, "Obrigatório").max(20),
  nifEncarregado: z.string().trim().regex(/^\d{9}$/, "NIF deve ter 9 dígitos").optional().or(z.literal("")),
  mensagem: z.string().trim().max(1000).optional().or(z.literal("")),
});

export default function InscricaoPage() {
  const { addInscricao } = useInscricoes();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    nomeAluno: "", emailAluno: "", telefoneAluno: "", escola: "",
    anoLetivo: "10", disciplinas: [] as string[],
    nomeEncarregado: "", emailEncarregado: "", telefoneEncarregado: "",
    nifEncarregado: "", mensagem: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      ...form,
      anoLetivo: parseInt(form.anoLetivo),
    });
    if (!parsed.success) {
      const e: Record<string, string> = {};
      parsed.error.issues.forEach(i => { e[i.path[0] as string] = i.message; });
      setErrors(e);
      return;
    }
    setErrors({});
    addInscricao({
      nomeAluno: parsed.data.nomeAluno,
      emailAluno: parsed.data.emailAluno || "",
      telefoneAluno: parsed.data.telefoneAluno || "",
      escola: parsed.data.escola || "",
      anoLetivo: parsed.data.anoLetivo,
      disciplinas: parsed.data.disciplinas,
      nomeEncarregado: parsed.data.nomeEncarregado,
      emailEncarregado: parsed.data.emailEncarregado,
      telefoneEncarregado: parsed.data.telefoneEncarregado,
      nifEncarregado: parsed.data.nifEncarregado || undefined,
      mensagem: parsed.data.mensagem || undefined,
      origem: "site",
    });
    setSubmitted(true);
    toast({ title: "Inscrição enviada", description: "Entraremos em contacto em breve." });
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
            <h1 className="text-2xl font-bold">Inscrição enviada!</h1>
            <p className="text-muted-foreground">
              Recebemos a sua pré-inscrição. A nossa equipa entrará em contacto consigo em breve.
            </p>
            <Button onClick={() => { setSubmitted(false); setForm({ ...form, nomeAluno: "", disciplinas: [] }); }}>
              Nova inscrição
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">ExplicaCenter</span>
          </div>
          <h1 className="text-3xl font-bold">Pré-inscrição</h1>
          <p className="text-muted-foreground mt-2">
            Preencha o formulário e entraremos em contacto para confirmar a inscrição.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dados do Aluno</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nome completo *</Label>
                <Input value={form.nomeAluno} onChange={e => setForm(f => ({ ...f, nomeAluno: e.target.value }))} maxLength={100} />
                {errors.nomeAluno && <p className="text-xs text-destructive mt-1">{errors.nomeAluno}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Email do aluno</Label>
                  <Input type="email" value={form.emailAluno} onChange={e => setForm(f => ({ ...f, emailAluno: e.target.value }))} maxLength={255} />
                  {errors.emailAluno && <p className="text-xs text-destructive mt-1">{errors.emailAluno}</p>}
                </div>
                <div>
                  <Label>Telefone do aluno</Label>
                  <Input value={form.telefoneAluno} onChange={e => setForm(f => ({ ...f, telefoneAluno: e.target.value }))} maxLength={20} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Escola</Label>
                  <Input value={form.escola} onChange={e => setForm(f => ({ ...f, escola: e.target.value }))} maxLength={120} />
                </div>
                <div>
                  <Label>Ano escolar *</Label>
                  <Select value={form.anoLetivo} onValueChange={v => setForm(f => ({ ...f, anoLetivo: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[5, 6, 7, 8, 9, 10, 11, 12].map(a => <SelectItem key={a} value={String(a)}>{a}º ano</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Disciplinas pretendidas *</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {disciplinas.map(d => (
                    <label key={d} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={form.disciplinas.includes(d)}
                        onCheckedChange={checked => setForm(f => ({
                          ...f,
                          disciplinas: checked ? [...f.disciplinas, d] : f.disciplinas.filter(x => x !== d),
                        }))}
                      />
                      <span className="text-sm">{d}</span>
                    </label>
                  ))}
                </div>
                {errors.disciplinas && <p className="text-xs text-destructive mt-1">{errors.disciplinas}</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg">Encarregado de Educação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input value={form.nomeEncarregado} onChange={e => setForm(f => ({ ...f, nomeEncarregado: e.target.value }))} maxLength={100} />
                {errors.nomeEncarregado && <p className="text-xs text-destructive mt-1">{errors.nomeEncarregado}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Email *</Label>
                  <Input type="email" value={form.emailEncarregado} onChange={e => setForm(f => ({ ...f, emailEncarregado: e.target.value }))} maxLength={255} />
                  {errors.emailEncarregado && <p className="text-xs text-destructive mt-1">{errors.emailEncarregado}</p>}
                </div>
                <div>
                  <Label>Telefone *</Label>
                  <Input value={form.telefoneEncarregado} onChange={e => setForm(f => ({ ...f, telefoneEncarregado: e.target.value }))} maxLength={20} />
                  {errors.telefoneEncarregado && <p className="text-xs text-destructive mt-1">{errors.telefoneEncarregado}</p>}
                </div>
              </div>
              <div>
                <Label>NIF (opcional)</Label>
                <Input
                  value={form.nifEncarregado}
                  onChange={e => setForm(f => ({ ...f, nifEncarregado: e.target.value.replace(/\D/g, "").slice(0, 9) }))}
                  placeholder="123456789"
                  inputMode="numeric"
                  maxLength={9}
                />
                {errors.nifEncarregado && <p className="text-xs text-destructive mt-1">{errors.nifEncarregado}</p>}
              </div>
              <div>
                <Label>Mensagem (opcional)</Label>
                <Textarea
                  value={form.mensagem}
                  onChange={e => setForm(f => ({ ...f, mensagem: e.target.value }))}
                  maxLength={1000}
                  placeholder="Horários preferidos, observações..."
                />
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 flex justify-end">
            <Button type="submit" size="lg">Enviar inscrição</Button>
          </div>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Para integrar este formulário no website, basta apontar para <code className="bg-muted px-1 py-0.5 rounded">/inscricao</code>.
        </p>
      </div>
    </div>
  );
}
