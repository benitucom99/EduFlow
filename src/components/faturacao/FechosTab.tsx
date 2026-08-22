import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useData, FechoLinha, FechoMensal, MetodoPagamento } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/faturacao";
import { gerarAvisoCobranca, labelPeriodo } from "@/lib/avisoCobranca";
import { format } from "date-fns";
import { FileText, Loader2, Trash2, Wallet } from "lucide-react";

const METODOS: { value: MetodoPagamento; label: string }[] = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "transferencia", label: "Transferência" },
  { value: "mbway", label: "MB Way" },
  { value: "outro", label: "Outro" },
];

function EstadoPagamentoBadge({ linha }: { linha: FechoLinha }) {
  if (linha.estadoPagamento === "pago") return <Badge className="bg-green-600/20 text-green-500 border-green-600/30">Pago</Badge>;
  if (linha.estadoPagamento === "parcial") return <Badge className="bg-yellow-600/20 text-yellow-500 border-yellow-600/30">Parcial</Badge>;
  return <Badge className="bg-red-600/20 text-red-500 border-red-600/30">Pendente</Badge>;
}

// Aceita vírgula decimal (pt) ou ponto.
const parseNum = (v: string) => parseFloat(String(v).replace(",", "."));

function LinhasTable({ linhas, titulo, onRegistar, onAviso }: {
  linhas: FechoLinha[];
  titulo: string;
  onRegistar: (l: FechoLinha) => void;
  onAviso?: (l: FechoLinha) => void;
}) {
  if (linhas.length === 0) return null;
  const total = linhas.reduce((s, l) => s + l.valor, 0);
  const pago = linhas.reduce((s, l) => s + l.valorPago, 0);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">{titulo}</h3>
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatCurrency(pago)} de {formatCurrency(total)} liquidados
        </span>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 px-3 font-medium">Nome</th>
              <th className="py-2 px-3 font-medium text-right">Valor</th>
              <th className="py-2 px-3 font-medium text-right">Pago</th>
              <th className="py-2 px-3 font-medium">Estado</th>
              <th className="py-2 px-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {linhas.map(l => (
              <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                <td className="py-2 px-3 font-medium">{l.entidadeNome}</td>
                <td className="py-2 px-3 text-right tabular-nums">{formatCurrency(l.valor)}</td>
                <td className="py-2 px-3 text-right tabular-nums">{l.valorPago > 0 ? formatCurrency(l.valorPago) : "—"}</td>
                <td className="py-2 px-3"><EstadoPagamentoBadge linha={l} /></td>
                <td className="py-2 px-3">
                  <div className="flex items-center justify-end gap-1">
                    {onAviso && (
                      <Button variant="ghost" size="sm" title="Aviso de cobrança (PDF)" onClick={() => onAviso(l)}>
                        <FileText className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => onRegistar(l)}>
                      {l.estadoPagamento === "pago" ? "Editar" : "Registar pagamento"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function FechosTab() {
  const { fechos, registarPagamentoFecho, eliminarFecho } = useData();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [registar, setRegistar] = useState<{ fecho: FechoMensal; linha: FechoLinha } | null>(null);
  const [valorPago, setValorPago] = useState("");
  const [metodo, setMetodo] = useState<MetodoPagamento>("transferencia");
  const [pagoEm, setPagoEm] = useState("");
  const [saving, setSaving] = useState(false);
  const [apagarId, setApagarId] = useState<string | null>(null);

  const abrirRegistar = (fecho: FechoMensal, linha: FechoLinha) => {
    setRegistar({ fecho, linha });
    // Default: liquidar o que falta (caso mais comum é pagar tudo de uma vez).
    setValorPago(String(linha.valor - linha.valorPago > 0 ? linha.valor : linha.valorPago).replace(".", ","));
    setMetodo(linha.metodo ?? "transferencia");
    setPagoEm(linha.pagoEm ?? format(new Date(), "yyyy-MM-dd"));
  };

  const guardarPagamento = async () => {
    if (!registar) return;
    const v = parseNum(valorPago);
    if (isNaN(v) || v < 0) {
      toast({ title: "Valor inválido", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await registarPagamentoFecho(registar.linha.id, { valorPago: v, metodo, pagoEm: pagoEm || null });
      toast({ title: "Pagamento registado" });
      setRegistar(null);
    } catch {
      toast({ title: "Erro ao registar pagamento", description: "Tenta novamente.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const confirmarApagar = async () => {
    if (!apagarId) return;
    try {
      await eliminarFecho(apagarId);
      toast({ title: "Fecho eliminado", description: "Podes voltar a fechar o período com os valores atuais." });
    } catch {
      toast({ title: "Erro ao eliminar fecho", variant: "destructive" });
    } finally {
      setApagarId(null);
    }
  };

  const aviso = (fecho: FechoMensal, linha: FechoLinha) => {
    const ok = gerarAvisoCobranca({ centroNome: profile?.centro ?? "", periodo: fecho.periodo, linha });
    if (!ok) toast({ title: "Pop-up bloqueado", description: "Permite pop-ups deste site para gerar o PDF.", variant: "destructive" });
  };

  if (fechos.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-muted-foreground space-y-1">
          <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="font-medium text-foreground">Ainda não há meses fechados</p>
          <p className="text-sm">Usa o botão "Fechar mês" para congelar os valores do período e começar a registar pagamentos.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {fechos.map(f => {
        const cobrancas = f.linhas.filter(l => l.tipo === "cobranca");
        const pagamentos = f.linhas.filter(l => l.tipo === "pagamento");
        const porCobrar = cobrancas.reduce((s, l) => s + Math.max(0, l.valor - l.valorPago), 0);
        return (
          <Card key={f.id}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-heading font-bold text-lg">{labelPeriodo(f.periodo)}</h2>
                  <p className="text-xs text-muted-foreground">
                    Fechado a {format(new Date(f.criadoEm), "dd/MM/yyyy")} · {f.dataInicio.split("-").reverse().join("/")} — {f.dataFim.split("-").reverse().join("/")}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Por cobrar</p>
                    <p className={`font-bold tabular-nums ${porCobrar > 0 ? "text-red-500" : "text-green-500"}`}>{formatCurrency(porCobrar)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Cobrança / Pagamento</p>
                    <p className="font-medium tabular-nums text-sm">{formatCurrency(f.totalCobrar)} / {formatCurrency(f.totalPagar)}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" title="Eliminar fecho" onClick={() => setApagarId(f.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <LinhasTable
                linhas={cobrancas}
                titulo="Cobrança a alunos"
                onRegistar={l => abrirRegistar(f, l)}
                onAviso={l => aviso(f, l)}
              />
              <LinhasTable
                linhas={pagamentos}
                titulo="Pagamento a professores"
                onRegistar={l => abrirRegistar(f, l)}
              />
            </CardContent>
          </Card>
        );
      })}

      {/* Dialog Registar Pagamento */}
      <Dialog open={!!registar} onOpenChange={open => { if (!open && !saving) setRegistar(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registar pagamento</DialogTitle>
            <DialogDescription>
              {registar && <>{registar.linha.entidadeNome} · {labelPeriodo(registar.fecho.periodo)} · total {formatCurrency(registar.linha.valor)}</>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor pago (€)</Label>
                <Input type="text" inputMode="decimal" value={valorPago} onChange={e => setValorPago(e.target.value)} autoFocus />
              </div>
              <div>
                <Label>Data</Label>
                <Input type="date" value={pagoEm} onChange={e => setPagoEm(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Método</Label>
              <Select value={metodo} onValueChange={v => setMetodo(v as MetodoPagamento)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METODOS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Pagamento parcial? Indica só o valor recebido — a linha fica "Parcial" até atingir o total.
            </p>
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="outline" onClick={() => setRegistar(null)} disabled={saving}>Cancelar</Button>
            <Button onClick={guardarPagamento} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminação de fecho */}
      <AlertDialog open={!!apagarId} onOpenChange={open => { if (!open) setApagarId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar este fecho?</AlertDialogTitle>
            <AlertDialogDescription>
              Os registos de pagamento deste período são apagados. Os cálculos da Faturação não são afetados — podes fechar o período de novo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmarApagar}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
