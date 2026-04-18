import { useState } from "react";
import { useInscricoes, type Inscricao, type InscricaoEstado } from "@/contexts/InscricoesContext";
import { useData } from "@/contexts/DataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Mail, Phone, School, Calendar, Inbox, Check, X, ExternalLink, Code } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

function estadoBadge(estado: InscricaoEstado) {
  if (estado === "pendente") return <Badge className="bg-warning/15 text-warning border-warning/30">Pendente</Badge>;
  if (estado === "aprovada") return <Badge className="bg-success/15 text-success border-success/30">Aprovada</Badge>;
  return <Badge className="bg-destructive/15 text-destructive border-destructive/30">Rejeitada</Badge>;
}

export default function InscricoesPage() {
  const { inscricoes, updateEstado, remove } = useInscricoes();
  const { setAlunos } = useData();
  const { toast } = useToast();
  const [embedOpen, setEmbedOpen] = useState(false);
  const [detail, setDetail] = useState<Inscricao | null>(null);

  const filtered = (estado: InscricaoEstado | "todas") =>
    estado === "todas" ? inscricoes : inscricoes.filter(i => i.estado === estado);

  const aprovar = (i: Inscricao) => {
    setAlunos(prev => [
      ...prev,
      {
        id: `a-${Date.now()}`,
        nome: i.nomeAluno,
        email: i.emailAluno,
        telefone: i.telefoneAluno,
        escola: i.escola,
        anoLetivo: i.anoLetivo,
        disciplinas: i.disciplinas,
        encarregado: { nome: i.nomeEncarregado, email: i.emailEncarregado, telefone: i.telefoneEncarregado },
        estado: "ativo",
        dataInscricao: i.criadoEm.split("T")[0],
        nifEncarregado: i.nifEncarregado,
      },
    ]);
    updateEstado(i.id, "aprovada");
    setDetail(null);
    toast({ title: "Inscrição aprovada", description: `${i.nomeAluno} foi adicionado(a) aos alunos.` });
  };

  const publicUrl = `${window.location.origin}/inscricao`;
  const embedSnippet = `<iframe src="${publicUrl}" width="100%" height="900" style="border:0" title="Inscrição"></iframe>`;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Inscrições</h1>
          <p className="text-muted-foreground">Pré-inscrições recebidas via website</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="/inscricao" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" /> Abrir formulário
            </a>
          </Button>
          <Button variant="outline" onClick={() => setEmbedOpen(true)}>
            <Code className="h-4 w-4 mr-2" /> Integrar no site
          </Button>
        </div>
      </div>

      <Tabs defaultValue="pendente">
        <TabsList>
          <TabsTrigger value="pendente">Pendentes ({filtered("pendente").length})</TabsTrigger>
          <TabsTrigger value="aprovada">Aprovadas ({filtered("aprovada").length})</TabsTrigger>
          <TabsTrigger value="rejeitada">Rejeitadas ({filtered("rejeitada").length})</TabsTrigger>
          <TabsTrigger value="todas">Todas ({inscricoes.length})</TabsTrigger>
        </TabsList>

        {(["pendente", "aprovada", "rejeitada", "todas"] as const).map(tab => (
          <TabsContent key={tab} value={tab} className="space-y-3 mt-4">
            {filtered(tab).length === 0 ? (
              <Card><CardContent className="py-16 text-center">
                <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Sem inscrições.</p>
              </CardContent></Card>
            ) : filtered(tab).map(i => (
              <Card key={i.id} className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setDetail(i)}>
                <CardContent className="p-4 flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{i.nomeAluno}</p>
                      {estadoBadge(i.estado)}
                      <Badge variant="outline" className="text-[10px]">{i.origem === "site" ? "Website" : "Manual"}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {i.escola || "—"} · {i.anoLetivo}º ano · {i.disciplinas.length} disciplina(s)
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(i.criadoEm), "dd MMM yyyy HH:mm", { locale: pt })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>

      {/* Detail */}
      <Dialog open={!!detail} onOpenChange={(v) => { if (!v) setDetail(null); }}>
        <DialogContent className="max-w-lg">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {detail.nomeAluno} {estadoBadge(detail.estado)}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2"><Mail className="h-3 w-3 text-muted-foreground" /> {detail.emailAluno || "—"}</div>
                  <div className="flex items-center gap-2"><Phone className="h-3 w-3 text-muted-foreground" /> {detail.telefoneAluno || "—"}</div>
                  <div className="flex items-center gap-2"><School className="h-3 w-3 text-muted-foreground" /> {detail.escola || "—"}</div>
                  <div className="flex items-center gap-2"><Calendar className="h-3 w-3 text-muted-foreground" /> {detail.anoLetivo}º ano</div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Disciplinas</p>
                  <div className="flex flex-wrap gap-1">
                    {detail.disciplinas.map(d => <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>)}
                  </div>
                </div>
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground mb-1">Encarregado</p>
                  <p className="font-medium">{detail.nomeEncarregado}</p>
                  <p className="text-xs text-muted-foreground">{detail.emailEncarregado} · {detail.telefoneEncarregado}</p>
                  {detail.nifEncarregado && <p className="text-xs text-muted-foreground">NIF: {detail.nifEncarregado}</p>}
                </div>
                {detail.mensagem && (
                  <div className="border-t pt-3">
                    <p className="text-xs text-muted-foreground mb-1">Mensagem</p>
                    <p className="text-sm">{detail.mensagem}</p>
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2">
                {detail.estado === "pendente" && (
                  <>
                    <Button variant="outline" onClick={() => { updateEstado(detail.id, "rejeitada"); setDetail(null); toast({ title: "Inscrição rejeitada" }); }}>
                      <X className="h-4 w-4 mr-1" /> Rejeitar
                    </Button>
                    <Button onClick={() => aprovar(detail)}>
                      <Check className="h-4 w-4 mr-1" /> Aprovar e criar aluno
                    </Button>
                  </>
                )}
                {detail.estado !== "pendente" && (
                  <Button variant="destructive" onClick={() => { remove(detail.id); setDetail(null); }}>
                    Eliminar
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Embed snippet */}
      <Dialog open={embedOpen} onOpenChange={setEmbedOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Integrar no website</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">Link público:</p>
            <code className="block bg-muted p-2 rounded text-xs break-all">{publicUrl}</code>
            <p className="text-muted-foreground mt-3">Snippet para incorporar (iframe):</p>
            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">{embedSnippet}</pre>
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(embedSnippet); toast({ title: "Copiado!" }); }}>
              Copiar snippet
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
