import { useState, useMemo } from "react";
import { useData } from "@/contexts/DataContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Receipt, Wallet, TrendingUp, CalendarIcon, ChevronDown, ChevronUp, Download, FileText } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, startOfQuarter } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  formatCurrency, formatDuration, parseDurationHours,
  calcularCobrancaAlunos, calcularPagamentoExplicadores,
  exportCobrancaDetalhada, exportCobrancaResumo,
  exportPagamentoDetalhado, exportPagamentoResumo,
  type ResumoAluno, type ResumoExplicador,
} from "@/lib/faturacao";

type SortKey = string;
type SortDir = "asc" | "desc";

function PresencaBadge({ presenca }: { presenca: string | null }) {
  if (presenca === "presente") return <Badge className="bg-green-600/20 text-green-400 border-green-600/30">✅ Presente</Badge>;
  if (presenca === "falta_justificada") return <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30">⚠️ Falta Just.</Badge>;
  if (presenca === "falta_injustificada") return <Badge className="bg-red-600/20 text-red-400 border-red-600/30">❌ Falta Injust.</Badge>;
  return <Badge variant="outline" className="text-muted-foreground">— Não registada</Badge>;
}

function AvatarIniciais({ nome, className }: { nome: string; className?: string }) {
  const iniciais = nome.split(" ").map(n => n[0]).join("").slice(0, 2);
  return (
    <div className={cn("h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0", className)}>
      {iniciais}
    </div>
  );
}

function DisciplinaBadge({ disciplina, colorMap }: { disciplina: string; colorMap: Map<string, string> }) {
  const color = colorMap.get(disciplina) || "#6366f1";
  return (
    <Badge style={{ backgroundColor: `${color}20`, color, borderColor: `${color}40` }} className="border">
      {disciplina}
    </Badge>
  );
}

function SortHeader({ label, sortKey, currentSort, currentDir, onSort }: {
  label: string; sortKey: string; currentSort: string; currentDir: SortDir; onSort: (key: string) => void;
}) {
  return (
    <th className="text-left p-3 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none" onClick={() => onSort(sortKey)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {currentSort === sortKey && (currentDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </span>
    </th>
  );
}

export default function FaturacaoPage() {
  const { aulas, alunos, explicadores, disciplinas } = useData();
  const discColorMap = new Map(disciplinas.map(d => [d.nome, d.corHsl || "#6366f1"]));
  const now = new Date();
  const [dataInicio, setDataInicio] = useState<Date>(startOfMonth(now));
  const [dataFim, setDataFim] = useState<Date>(endOfMonth(now));
  const [presetAtivo, setPresetAtivo] = useState("este_mes");
  const [expandedAluno, setExpandedAluno] = useState<string | null>(null);
  const [expandedExp, setExpandedExp] = useState<string | null>(null);
  const [sortAluno, setSortAluno] = useState<{ key: SortKey; dir: SortDir }>({ key: "nome", dir: "asc" });
  const [sortExp, setSortExp] = useState<{ key: SortKey; dir: SortDir }>({ key: "nome", dir: "asc" });

  const periodoStr = format(dataInicio, "yyyy-MM");
  const di = format(dataInicio, "yyyy-MM-dd");
  const df = format(dataFim, "yyyy-MM-dd");

  const resumoAlunos = useMemo(() => calcularCobrancaAlunos(aulas, alunos, disciplinas, di, df), [aulas, alunos, disciplinas, di, df]);
  const resumoExplicadores = useMemo(() => calcularPagamentoExplicadores(aulas, explicadores, di, df), [aulas, explicadores, di, df]);

  const totalCobrar = useMemo(() => resumoAlunos.reduce((s, r) => s + r.valorTotal, 0), [resumoAlunos]);
  const totalPagar = useMemo(() => resumoExplicadores.reduce((s, r) => s + r.totalPagar, 0), [resumoExplicadores]);
  const margem = totalCobrar - totalPagar;
  const margemPct = totalCobrar > 0 ? (margem / totalCobrar) * 100 : 0;

  function setPreset(preset: string) {
    setPresetAtivo(preset);
    if (preset === "este_mes") { setDataInicio(startOfMonth(now)); setDataFim(endOfMonth(now)); }
    else if (preset === "mes_anterior") { const m = subMonths(now, 1); setDataInicio(startOfMonth(m)); setDataFim(endOfMonth(m)); }
    else if (preset === "trimestre") { setDataInicio(startOfQuarter(now)); setDataFim(endOfMonth(now)); }
  }

  function sortedAlunos(): ResumoAluno[] {
    const list = [...resumoAlunos];
    const { key, dir } = sortAluno;
    list.sort((a, b) => {
      let cmp = 0;
      if (key === "nome") cmp = a.aluno.nome.localeCompare(b.aluno.nome);
      else if (key === "aulas") cmp = a.aulasRealizadas - b.aulasRealizadas;
      else if (key === "valor") cmp = a.valorTotal - b.valorTotal;
      else if (key === "horas") cmp = a.horasTotais - b.horasTotais;
      return dir === "asc" ? cmp : -cmp;
    });
    return list;
  }

  function sortedExplicadores(): ResumoExplicador[] {
    const list = [...resumoExplicadores];
    const { key, dir } = sortExp;
    list.sort((a, b) => {
      let cmp = 0;
      if (key === "nome") cmp = a.explicador.nome.localeCompare(b.explicador.nome);
      else if (key === "aulas") cmp = a.aulasRealizadas - b.aulasRealizadas;
      else if (key === "valor") cmp = a.totalPagar - b.totalPagar;
      else if (key === "horas") cmp = a.horasTotais - b.horasTotais;
      return dir === "asc" ? cmp : -cmp;
    });
    return list;
  }

  function toggleSortAluno(key: string) {
    setSortAluno(prev => ({ key, dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc" }));
  }
  function toggleSortExp(key: string) {
    setSortExp(prev => ({ key, dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc" }));
  }

  const alunoMap = useMemo(() => new Map(alunos.map(a => [a.id, a])), [alunos]);
  const expMap = useMemo(() => new Map(explicadores.map(e => [e.id, e])), [explicadores]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Faturação</h1>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {[
            { id: "este_mes", label: "Este mês" },
            { id: "mes_anterior", label: "Mês anterior" },
            { id: "trimestre", label: "Este trimestre" },
            { id: "custom", label: "Personalizado" },
          ].map(p => (
            <Button
              key={p.id}
              variant={presetAtivo === p.id ? "default" : "outline"}
              size="sm"
              onClick={() => { if (p.id !== "custom") setPreset(p.id); else setPresetAtivo("custom"); }}
            >
              {p.label}
            </Button>
          ))}
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {format(dataInicio, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dataInicio} onSelect={d => { if (d) { setDataInicio(d); setPresetAtivo("custom"); } }} className="p-3 pointer-events-auto" locale={pt} />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground text-sm">—</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {format(dataFim, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dataFim} onSelect={d => { if (d) { setDataFim(d); setPresetAtivo("custom"); } }} className="p-3 pointer-events-auto" locale={pt} />
              </PopoverContent>
            </Popover>
          </div>
          <Button size="sm" onClick={() => window.print()}>
            <Download className="h-4 w-4 mr-1" /> Exportar PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center"><Receipt className="h-6 w-6 text-green-500" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Total a Cobrar</p>
              <p className="text-2xl font-bold text-green-500">{formatCurrency(totalCobrar)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center"><Wallet className="h-6 w-6 text-blue-500" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Total a Pagar a Explicadores</p>
              <p className="text-2xl font-bold text-blue-500">{formatCurrency(totalPagar)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"><TrendingUp className="h-6 w-6 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Margem Estimada</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(margem)} <span className="text-sm font-normal">({margemPct.toFixed(1)}%)</span></p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="cobranca" className="space-y-4">
        <TabsList className="print:hidden">
          <TabsTrigger value="cobranca">Cobrança a Alunos</TabsTrigger>
          <TabsTrigger value="pagamento">Pagamento a Explicadores</TabsTrigger>
        </TabsList>

        {/* TAB 1 — Cobrança */}
        <TabsContent value="cobranca" className="space-y-4">
          <div className="flex gap-2 justify-end flex-wrap print:hidden">
            <Button variant="outline" size="sm" onClick={() => { exportCobrancaDetalhada(resumoAlunos, explicadores, periodoStr); toast.success("Ficheiro exportado com sucesso"); }}>
              <Download className="h-4 w-4 mr-1" /> Exportar Cobrança (CSV)
            </Button>
            <Button variant="outline" size="sm" onClick={() => { exportCobrancaResumo(resumoAlunos, periodoStr); toast.success("Ficheiro exportado com sucesso"); }}>
              <FileText className="h-4 w-4 mr-1" /> Exportar Resumo (CSV)
            </Button>
            <Button size="sm" onClick={() => { toast.success("Rascunho de fatura gerado com sucesso", { description: `${resumoAlunos.length} fatura(s) em rascunho criada(s) para o período ${format(dataInicio, "dd/MM")} - ${format(dataFim, "dd/MM/yyyy")}.` }); }}>
              <FileText className="h-4 w-4 mr-1" /> Gerar Rascunho
            </Button>
          </div>

          {resumoAlunos.length === 0 ? (
            <Card><CardContent className="p-10 text-center text-muted-foreground">Sem aulas realizadas no período selecionado</CardContent></Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <SortHeader label="Aluno" sortKey="nome" currentSort={sortAluno.key} currentDir={sortAluno.dir} onSort={toggleSortAluno} />
                      <th className="text-left p-3 text-sm font-medium text-muted-foreground">Encarregado</th>
                      <SortHeader label="Aulas Realizadas" sortKey="aulas" currentSort={sortAluno.key} currentDir={sortAluno.dir} onSort={toggleSortAluno} />
                      <SortHeader label="Horas Totais" sortKey="horas" currentSort={sortAluno.key} currentDir={sortAluno.dir} onSort={toggleSortAluno} />
                      <SortHeader label="Valor Total" sortKey="valor" currentSort={sortAluno.key} currentDir={sortAluno.dir} onSort={toggleSortAluno} />
                      <th className="text-left p-3 text-sm font-medium text-muted-foreground print:hidden">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAlunos().map((r, idx) => (
                      <>
                        <tr key={r.aluno.id} className={cn("border-b border-border/50 hover:bg-muted/30 transition-colors", idx % 2 === 1 && "bg-muted/10")}>
                          <td className="p-3"><div className="flex items-center gap-2"><AvatarIniciais nome={r.aluno.nome} /><span className="font-medium">{r.aluno.nome}</span></div></td>
                          <td className="p-3 text-sm text-muted-foreground">{r.aluno.encarregado.nome}</td>
                          <td className="p-3 text-sm">{r.aulasRealizadas}</td>
                          <td className="p-3 text-sm">{formatDuration(r.horasTotais)}</td>
                          <td className="p-3 font-semibold">{formatCurrency(r.valorTotal)}</td>
                          <td className="p-3 print:hidden">
                            <Button variant="ghost" size="sm" onClick={() => setExpandedAluno(expandedAluno === r.aluno.id ? null : r.aluno.id)}>
                              {expandedAluno === r.aluno.id ? "Fechar" : "Ver Detalhe"}
                              {expandedAluno === r.aluno.id ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                            </Button>
                          </td>
                        </tr>
                        {expandedAluno === r.aluno.id && (
                          <tr key={`${r.aluno.id}-detail`}>
                            <td colSpan={6} className="p-0">
                              <div className="bg-muted/20 p-4 border-b border-border">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-border/50">
                                      <th className="text-left p-2 text-muted-foreground">Data</th>
                                      <th className="text-left p-2 text-muted-foreground">Hora</th>
                                      <th className="text-left p-2 text-muted-foreground">Disciplina</th>
                                      <th className="text-left p-2 text-muted-foreground">Tipo</th>
                                      <th className="text-left p-2 text-muted-foreground">Explicador</th>
                                      <th className="text-left p-2 text-muted-foreground">Duração</th>
                                      <th className="text-left p-2 text-muted-foreground">Preço/Hora</th>
                                      <th className="text-left p-2 text-muted-foreground">Valor</th>
                                      <th className="text-left p-2 text-muted-foreground">Presença</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {r.aulas.map((a, i) => {
                                      const exp = expMap.get(a.aula.explicadorId);
                                      return (
                                        <tr key={i} className={cn("border-b border-border/30", i % 2 === 1 && "bg-muted/10")}>
                                          <td className="p-2">{a.aula.data.split("-").reverse().join("/")}</td>
                                          <td className="p-2">{a.aula.horaInicio} - {a.aula.horaFim}</td>
                                          <td className="p-2"><DisciplinaBadge disciplina={a.aula.disciplina} colorMap={discColorMap} /></td>
                                          <td className="p-2">{a.aula.tipo === "individual" ? "Individual" : "Grupo"}</td>
                                          <td className="p-2">{exp?.nome ?? "—"}</td>
                                          <td className="p-2">{formatDuration(a.duracao)}</td>
                                          <td className={cn("p-2", !a.cobrar && "text-muted-foreground line-through")}>{formatCurrency(a.precoPorHora)}</td>
                                          <td className={cn("p-2", !a.cobrar && "text-muted-foreground line-through")}>
                                            {formatCurrency(a.valorSessao)}
                                            {!a.cobrar && <span className="text-xs text-muted-foreground ml-1">(não cobrado)</span>}
                                          </td>
                                          <td className="p-2"><PresencaBadge presenca={a.presenca} /></td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                  <tfoot>
                                    <tr className="bg-muted/30 font-bold">
                                      <td colSpan={7} className="p-2 text-right">TOTAL A COBRAR:</td>
                                      <td className="p-2">{formatCurrency(r.valorTotal)}</td>
                                      <td />
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/40 font-bold border-t-2 border-border">
                      <td colSpan={4} className="p-3 text-right">TOTAL GERAL:</td>
                      <td className="p-3">{formatCurrency(totalCobrar)}</td>
                      <td className="print:hidden" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* TAB 2 — Pagamento */}
        <TabsContent value="pagamento" className="space-y-4">
          <div className="flex gap-2 justify-end print:hidden">
            <Button variant="outline" size="sm" onClick={() => { exportPagamentoDetalhado(resumoExplicadores, alunos, periodoStr); toast.success("Ficheiro exportado com sucesso"); }}>
              <Download className="h-4 w-4 mr-1" /> Exportar Pagamentos (CSV)
            </Button>
            <Button variant="outline" size="sm" onClick={() => { exportPagamentoResumo(resumoExplicadores, periodoStr); toast.success("Ficheiro exportado com sucesso"); }}>
              <FileText className="h-4 w-4 mr-1" /> Exportar Resumo (CSV)
            </Button>
          </div>

          {resumoExplicadores.length === 0 ? (
            <Card><CardContent className="p-10 text-center text-muted-foreground">Sem aulas realizadas no período selecionado</CardContent></Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <SortHeader label="Explicador" sortKey="nome" currentSort={sortExp.key} currentDir={sortExp.dir} onSort={toggleSortExp} />
                      <th className="text-left p-3 text-sm font-medium text-muted-foreground">Disciplinas</th>
                      <SortHeader label="Aulas Realizadas" sortKey="aulas" currentSort={sortExp.key} currentDir={sortExp.dir} onSort={toggleSortExp} />
                      <SortHeader label="Horas Totais" sortKey="horas" currentSort={sortExp.key} currentDir={sortExp.dir} onSort={toggleSortExp} />
                      <th className="text-left p-3 text-sm font-medium text-muted-foreground">Valor/Hora</th>
                      <SortHeader label="Total a Pagar" sortKey="valor" currentSort={sortExp.key} currentDir={sortExp.dir} onSort={toggleSortExp} />
                      <th className="text-left p-3 text-sm font-medium text-muted-foreground print:hidden">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedExplicadores().map((r, idx) => (
                      <>
                        <tr key={r.explicador.id} className={cn("border-b border-border/50 hover:bg-muted/30 transition-colors", idx % 2 === 1 && "bg-muted/10")}>
                          <td className="p-3"><div className="flex items-center gap-2"><AvatarIniciais nome={r.explicador.nome} /><span className="font-medium">{r.explicador.nome}</span></div></td>
                          <td className="p-3"><div className="flex flex-wrap gap-1">{r.disciplinasLecionadas.map(d => <DisciplinaBadge key={d} disciplina={d} colorMap={discColorMap} />)}</div></td>
                          <td className="p-3 text-sm">{r.aulasRealizadas}</td>
                          <td className="p-3 text-sm">{formatDuration(r.horasTotais)}</td>
                          <td className="p-3 text-sm">{formatCurrency(r.explicador.valorHora)}</td>
                          <td className="p-3 font-semibold">{formatCurrency(r.totalPagar)}</td>
                          <td className="p-3 print:hidden">
                            <Button variant="ghost" size="sm" onClick={() => setExpandedExp(expandedExp === r.explicador.id ? null : r.explicador.id)}>
                              {expandedExp === r.explicador.id ? "Fechar" : "Ver Detalhe"}
                              {expandedExp === r.explicador.id ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                            </Button>
                          </td>
                        </tr>
                        {expandedExp === r.explicador.id && (
                          <tr key={`${r.explicador.id}-detail`}>
                            <td colSpan={7} className="p-0">
                              <div className="bg-muted/20 p-4 border-b border-border">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-border/50">
                                      <th className="text-left p-2 text-muted-foreground">Data</th>
                                      <th className="text-left p-2 text-muted-foreground">Hora</th>
                                      <th className="text-left p-2 text-muted-foreground">Disciplina</th>
                                      <th className="text-left p-2 text-muted-foreground">Aluno(s)</th>
                                      <th className="text-left p-2 text-muted-foreground">Tipo</th>
                                      <th className="text-left p-2 text-muted-foreground">Duração</th>
                                      <th className="text-left p-2 text-muted-foreground">Valor/hora</th>
                                      <th className="text-left p-2 text-muted-foreground">Valor sessão</th>
                                      <th className="text-left p-2 text-muted-foreground">Presença</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {r.aulas.map((a, i) => {
                                      const alunoNomes = a.aula.alunoIds.map(id => alunoMap.get(id)?.nome ?? id).join(", ");
                                      return (
                                        <tr key={i} className={cn("border-b border-border/30", i % 2 === 1 && "bg-muted/10")}>
                                          <td className="p-2">{a.aula.data.split("-").reverse().join("/")}</td>
                                          <td className="p-2">{a.aula.horaInicio} - {a.aula.horaFim}</td>
                                          <td className="p-2"><DisciplinaBadge disciplina={a.aula.disciplina} colorMap={discColorMap} /></td>
                                          <td className="p-2">{alunoNomes}</td>
                                          <td className="p-2">{a.aula.tipo === "individual" ? "Individual" : "Grupo"}</td>
                                          <td className="p-2">{formatDuration(a.duracao)}</td>
                                          <td className={cn("p-2", !a.contabilizado && "text-muted-foreground line-through")}>{formatCurrency(a.valorHora)}</td>
                                          <td className={cn("p-2", !a.contabilizado && "text-muted-foreground line-through")}>
                                            {formatCurrency(a.valorSessao)}
                                            {!a.contabilizado && <span className="text-xs text-muted-foreground ml-1">(aluno faltou — não contabilizado)</span>}
                                          </td>
                                          <td className="p-2">{a.alunosPresentes ? <Badge className="bg-green-600/20 text-green-400 border-green-600/30">Presente</Badge> : <Badge className="bg-red-600/20 text-red-400 border-red-600/30">Falta</Badge>}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                  <tfoot>
                                    <tr className="bg-muted/30 font-bold">
                                      <td colSpan={7} className="p-2 text-right">TOTAL A PAGAR:</td>
                                      <td className="p-2">{formatCurrency(r.totalPagar)}</td>
                                      <td />
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/40 font-bold border-t-2 border-border">
                      <td colSpan={5} className="p-3 text-right">TOTAL GERAL A PAGAR:</td>
                      <td className="p-3">{formatCurrency(totalPagar)}</td>
                      <td className="print:hidden" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
