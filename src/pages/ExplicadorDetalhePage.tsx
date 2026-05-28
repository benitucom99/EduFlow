import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useData, Explicador } from "@/contexts/DataContext";
import { Card, CardContent } from "@/components/ui/card";
import { DiscBadge } from "@/components/DiscBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Mail, Phone, GraduationCap, Pencil, Landmark, CreditCard, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { folhasAgrupadas } from "@/lib/disciplinas";
import { parseDurationHours } from "@/lib/faturacao";

export default function ExplicadorDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { explicadores, updateExplicador, inviteExplicador, aulas, disciplinas, centroConfig } = useData();
  const { toast } = useToast();
  const exp = explicadores.find(e => e.id === id);
  const [editOpen, setEditOpen] = useState(false);
  const [inviting, setInviting] = useState(false);

  const handleInvite = async () => {
    if (!exp) return;
    setInviting(true);
    try {
      await inviteExplicador(exp.id, `${window.location.origin}/set-password`);
      toast({ title: "Convite enviado", description: `Email enviado para ${exp.email}.` });
    } catch (e) {
      toast({ title: "Erro ao enviar convite", description: e instanceof Error ? e.message : "Tenta novamente.", variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  const stats = useMemo(() => {
    const aulasExp = aulas.filter(a => a.explicadorId === id && a.estado !== "cancelada");
    const alunosAtivos = new Set(aulasExp.flatMap(a => a.alunoIds)).size;
    const discByNome = new Map(disciplinas.map(d => [d.nome, d]));
    let valorEstimado = 0;
    for (const aula of aulasExp) {
      const duracao = parseDurationHours(aula.horaInicio, aula.horaFim);
      let valorHora = exp?.valorHora ?? 0;
      if (centroConfig.modoPagamentoProfessor === "por_disciplina" && exp?.disciplinaValores) {
        const disc = discByNome.get(aula.disciplina);
        if (disc) {
          const vd = exp.disciplinaValores[disc.id];
          if (vd != null) valorHora = vd;
        }
      }
      valorEstimado += duracao * valorHora;
    }
    return { esteMes: aulasExp.length, alunosAtivos, valorEstimado };
  }, [aulas, id, exp, disciplinas, centroConfig]);

  if (!exp) return <div className="p-6">Explicador não encontrado</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/explicadores")}><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Button>
        <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4 mr-2" /> Editar</Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="text-center">
              <div className="h-20 w-20 mx-auto rounded-full bg-accent flex items-center justify-center text-2xl font-bold text-accent-foreground mb-3">{exp.nome.split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
              <h2 className="text-xl font-bold">{exp.nome}</h2>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${exp.estado === "ativo" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{exp.estado}</span>
              <p className="text-3xl font-bold text-primary mt-3">
                {centroConfig.modoPagamentoProfessor === "por_disciplina"
                  ? <span className="text-base font-normal text-muted-foreground">valor por disciplina</span>
                  : <>{exp.valorHora}€<span className="text-sm font-normal text-muted-foreground">/hora</span></>}
              </p>
            </div>
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-3 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /> {exp.email}</div>
              <div className="flex items-center gap-3 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /> {exp.telefone}</div>
              <div className="flex items-center gap-3 text-sm"><GraduationCap className="h-4 w-4 text-muted-foreground" /> {exp.habilitacoes}</div>
            </div>
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">Disciplinas leccionadas</p>
              <div className="flex flex-wrap gap-1">{exp.disciplinas.map(d => <DiscBadge key={d} nome={d} />)}</div>
            </div>
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">Dados Financeiros</p>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span>{exp.nif ? `NIF: ${exp.nif}` : "NIF: —"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Landmark className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{exp.iban ? `IBAN: ${exp.iban}` : "IBAN: —"}</span>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">Acesso à Plataforma</p>
              {exp.acessoAtivadoEm ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">Acesso ativo</span>
              ) : exp.conviteEnviadoEm ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
                  Convite pendente · {new Date(exp.conviteEnviadoEm).toLocaleDateString("pt-PT")}
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">Não convidado</span>
              )}
              {!exp.acessoAtivadoEm && (
                <Button variant="outline" size="sm" className="w-full mt-3" onClick={handleInvite} disabled={inviting}>
                  <Send className="h-4 w-4 mr-2" />
                  {inviting ? "A enviar…" : exp.conviteEnviadoEm ? "Reenviar convite" : "Enviar acesso"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        <div className="lg:col-span-2">
          <Tabs defaultValue="estatisticas">
            <TabsList><TabsTrigger value="estatisticas">Estatísticas</TabsTrigger><TabsTrigger value="aulas">Aulas Recentes</TabsTrigger></TabsList>
            <TabsContent value="aulas">
              <Card><CardContent className="p-6">
                {aulas.filter(a => a.explicadorId === id).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sem aulas registadas.</p>
                ) : (
                  <div className="space-y-2">
                    {aulas.filter(a => a.explicadorId === id).sort((a, b) => b.data.localeCompare(a.data)).slice(0, 10).map(a => (
                      <div key={a.id} className="flex items-center justify-between text-sm border-b border-border/50 pb-2">
                        <span className="text-muted-foreground">{a.data.split("-").reverse().join("/")}</span>
                        <span className="font-medium">{a.disciplina}</span>
                        <span>{a.horaInicio} – {a.horaFim}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${a.estado === "realizada" ? "bg-success/10 text-success" : a.estado === "cancelada" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>{a.estado}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent></Card>
            </TabsContent>
            <TabsContent value="estatisticas">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: "Aulas Realizadas", value: stats.esteMes },
                  { label: "Alunos Ativos", value: stats.alunosAtivos },
                  { label: "Valor Estimado", value: `${stats.valorEstimado.toFixed(2)}€` },
                ].map(s => (
                  <Card key={s.label}><CardContent className="p-6 text-center"><p className="text-3xl font-bold">{s.value}</p><p className="text-sm text-muted-foreground mt-1">{s.label}</p></CardContent></Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <EditExplicadorModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        explicador={exp}
        onSave={async (data) => {
          try {
            await updateExplicador(exp.id, data);
            toast({ title: "Explicador atualizado" });
            setEditOpen(false);
          } catch {
            toast({ title: "Erro ao guardar explicador", description: "Tenta novamente.", variant: "destructive" });
          }
        }}
      />
    </div>
  );
}

function EditExplicadorModal({ open, onClose, explicador, onSave }: {
  open: boolean;
  onClose: () => void;
  explicador: Explicador;
  onSave: (data: any) => void;
}) {
  const { disciplinas, centroConfig } = useData();
  const modoPag = centroConfig.modoPagamentoProfessor;
  const grupos = folhasAgrupadas(disciplinas);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [habilitacoes, setHabilitacoes] = useState("");
  const [valorHora, setValorHora] = useState("15");
  const [selectedDisc, setSelectedDisc] = useState<string[]>([]);
  const [disciplinaValores, setDisciplinaValores] = useState<Record<string, number>>({});
  const [iban, setIban] = useState("");
  const [nif, setNif] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setNome(explicador.nome);
      setEmail(explicador.email);
      setTelefone(explicador.telefone);
      setHabilitacoes(explicador.habilitacoes);
      setValorHora(String(explicador.valorHora));
      setSelectedDisc(explicador.disciplinas);
      setDisciplinaValores(explicador.disciplinaValores ?? {});
      setIban(explicador.iban || "");
      setNif(explicador.nif || "");
      setErrors({});
    }
  }, [open, explicador]);

  const handleSave = () => {
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = "Obrigatório";
    if (selectedDisc.length === 0) e.disc = "Selecione pelo menos 1";
    if (nif && !/^\d{9}$/.test(nif)) e.nif = "NIF deve ter 9 dígitos";
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    onSave({
      nome, email, telefone, habilitacoes,
      valorHora: parseFloat(valorHora),
      disciplinas: selectedDisc,
      disciplinaValores,
      iban: iban || undefined,
      nif: nif || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Editar Explicador</DialogTitle></DialogHeader>
        <Tabs defaultValue="dados">
          <TabsList className="w-full">
            <TabsTrigger value="dados" className="flex-1">Dados</TabsTrigger>
            <TabsTrigger value="financeiro" className="flex-1">Financeiro</TabsTrigger>
          </TabsList>
          <TabsContent value="dados" className="space-y-4 mt-4">
            <div><Label>Nome *</Label><Input value={nome} onChange={e => setNome(e.target.value)} />{errors.nome && <p className="text-xs text-destructive mt-1">{errors.nome}</p>}</div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input value={email} onChange={e => setEmail(e.target.value)} /></div>
              <div><Label>Telefone</Label><Input value={telefone} onChange={e => setTelefone(e.target.value)} /></div>
            </div>
            <div><Label>Habilitações</Label><Textarea value={habilitacoes} onChange={e => setHabilitacoes(e.target.value)} /></div>
            {modoPag === "base" && (
              <div><Label>Valor/Hora (€)</Label><Input type="number" value={valorHora} onChange={e => setValorHora(e.target.value)} /></div>
            )}
            <div>
              <Label>Disciplinas leccionadas *</Label>
              {modoPag === "por_disciplina" && (
                <p className="text-xs text-muted-foreground mt-0.5">Define o valor/hora por disciplina à direita de cada seleção.</p>
              )}
              {errors.disc && <p className="text-xs text-destructive">{errors.disc}</p>}
              {grupos.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-2">Ainda não há disciplinas. Crie disciplinas primeiro.</p>
              ) : (
                <div className="space-y-3 mt-2">
                  {grupos.map((g, gi) => (
                    <div key={g.categoriaNome ?? `__sem__${gi}`} className="space-y-1.5">
                      {g.categoriaNome && <p className="text-xs font-medium text-muted-foreground">{g.categoriaNome}</p>}
                      <div className={modoPag === "por_disciplina" ? "space-y-1.5" : "grid grid-cols-2 gap-2"}>
                        {g.folhas.map(f => (
                          <div key={f.id} className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedDisc.includes(f.nome)}
                              onCheckedChange={c => setSelectedDisc(prev => c ? [...prev, f.nome] : prev.filter(x => x !== f.nome))}
                            />
                            <span className="flex-1 text-sm">{f.nome}</span>
                            {modoPag === "por_disciplina" && selectedDisc.includes(f.nome) && (
                              <Input
                                type="number"
                                min="0"
                                step="0.5"
                                placeholder="€/h"
                                className="w-20 h-7 text-xs"
                                value={disciplinaValores[f.id] ?? ""}
                                onChange={e => {
                                  const v = e.target.value;
                                  setDisciplinaValores(prev => ({
                                    ...prev,
                                    [f.id]: v === "" ? 0 : parseFloat(v),
                                  }));
                                }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="financeiro" className="space-y-4 mt-4">
            <div>
              <Label>IBAN</Label>
              <Input value={iban} onChange={e => setIban(e.target.value.toUpperCase())} placeholder="PT50..." maxLength={25} />
            </div>
            <div>
              <Label>NIF</Label>
              <Input
                value={nif}
                onChange={e => setNif(e.target.value.replace(/\D/g, "").slice(0, 9))}
                placeholder="123456789"
                maxLength={9}
                inputMode="numeric"
              />
              {errors.nif && <p className="text-xs text-destructive mt-1">{errors.nif}</p>}
            </div>
          </TabsContent>
        </Tabs>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
