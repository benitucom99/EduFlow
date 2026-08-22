import { useRef, useState } from "react";
import { useData, ImportAlunoRow } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Download, FileSpreadsheet, Loader2, Upload, AlertTriangle, CheckCircle2 } from "lucide-react";

// Colunas do modelo. O reconhecimento dos cabeçalhos é tolerante (minúsculas,
// sem acentos), por isso "EMAIL", "e-mail" ou "Email" funcionam.
const COLUNAS_MODELO = [
  "Nome", "Ano", "Disciplinas", "Telefone", "Email", "Escola",
  "Nome do Encarregado", "Telefone do Encarregado", "Email do Encarregado",
];
const LINHA_EXEMPLO = [
  "Maria Silva", "9", "Matemática; Físico-Química", "912345678", "maria@email.pt", "Escola Secundária X",
  "Ana Silva", "919876543", "ana@email.pt",
];

// Linha do preview: dados interpretados + erro (bloqueia) ou aviso (importa na mesma).
type PreviewRow = { linha: number; dados: ImportAlunoRow; erro?: string; aviso?: string };

const semAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const normHeader = (s: string) => semAcentos(String(s)).toLowerCase().replace(/[^a-z ]/g, "").trim();

// Mapeia cabeçalhos reconhecidos → campo. Cabeçalhos desconhecidos são ignorados.
function campoDoHeader(h: string): keyof ImportAlunoRow | "ano" | null {
  const n = normHeader(h);
  if (n === "nome" || n === "nome do aluno" || n === "aluno") return "nome";
  if (n === "ano" || n === "ano escolar" || n === "ano letivo") return "ano";
  if (n === "disciplinas" || n === "disciplina") return "disciplinas";
  if (n === "telefone" || n === "telemovel" || n === "contacto") return "telefone";
  if (n === "email" || n === "e mail" || n === "mail") return "email";
  if (n === "escola") return "escola";
  if (n.includes("nome") && n.includes("encarregado")) return "encarregadoNome";
  if ((n.includes("telefone") || n.includes("telemovel")) && n.includes("encarregado")) return "encarregadoTelefone";
  if ((n.includes("email") || n.includes("mail")) && n.includes("encarregado")) return "encarregadoEmail";
  return null;
}

// "9", "9º", "9º ano" → 9; fora de 7-12 (ou não numérico) → null.
function parseAno(v: string): { ano: number | null; invalido: boolean } {
  const t = String(v).trim();
  if (!t) return { ano: null, invalido: false };
  const m = t.match(/^(\d{1,2})/);
  const n = m ? parseInt(m[1], 10) : NaN;
  if (isNaN(n)) return { ano: null, invalido: true };
  if (n < 7 || n > 12) return { ano: null, invalido: true };
  return { ano: n, invalido: false };
}

// Parser CSV mínimo com suporte a aspas ("a;b" numa célula) e separador ; ou ,.
function parseCsv(text: string): string[][] {
  const firstLine = text.slice(0, text.indexOf("\n") === -1 ? text.length : text.indexOf("\n"));
  const sep = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [], cell = "", inQuotes = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === sep) {
      row.push(cell); cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some(c => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some(c => c.trim() !== "")) rows.push(row);
  return rows;
}

export function ImportAlunosModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { importAlunos } = useData();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const reset = () => { setPreview(null); setFileName(""); if (fileRef.current) fileRef.current.value = ""; };
  const handleClose = () => { if (!importing) { reset(); onClose(); } };

  const downloadModelo = async () => {
    const ExcelJS = await import("exceljs");
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Alunos");
    ws.addRow(COLUNAS_MODELO);
    ws.getRow(1).font = { bold: true };
    ws.addRow(LINHA_EXEMPLO);
    ws.columns.forEach((col, i) => { col.width = Math.max(14, COLUNAS_MODELO[i].length + 4); });
    const buf = await wb.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo_alunos.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Lê o ficheiro (xlsx ou csv) para uma matriz de strings.
  const lerFicheiro = async (file: File): Promise<string[][]> => {
    if (/\.csv$/i.test(file.name)) return parseCsv(await file.text());
    const ExcelJS = await import("exceljs");
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await file.arrayBuffer());
    const ws = wb.worksheets[0];
    if (!ws) return [];
    const rows: string[][] = [];
    ws.eachRow(row => {
      const cells: string[] = [];
      // row.values é 1-indexado; célula rica (hiperlink/fórmula) → texto simples.
      for (let c = 1; c <= row.cellCount; c++) {
        const v = row.getCell(c).value;
        if (v == null) cells.push("");
        else if (typeof v === "object" && "text" in v) cells.push(String((v as { text: unknown }).text ?? ""));
        else if (typeof v === "object" && "result" in v) cells.push(String((v as { result: unknown }).result ?? ""));
        else cells.push(String(v));
      }
      if (cells.some(c => c.trim() !== "")) rows.push(cells);
    });
    return rows;
  };

  const handleFile = async (file: File) => {
    setLoading(true);
    setFileName(file.name);
    try {
      const matriz = await lerFicheiro(file);
      if (matriz.length < 2) {
        toast({ title: "Ficheiro vazio", description: "O ficheiro não tem linhas de alunos abaixo do cabeçalho.", variant: "destructive" });
        reset();
        return;
      }
      const headers = matriz[0].map(campoDoHeader);
      if (!headers.includes("nome")) {
        toast({ title: "Cabeçalho em falta", description: 'A primeira linha precisa de uma coluna "Nome". Use o modelo.', variant: "destructive" });
        reset();
        return;
      }
      const linhas: PreviewRow[] = [];
      for (let i = 1; i < matriz.length; i++) {
        const raw = matriz[i];
        const get = (campo: string) => {
          const idx = headers.indexOf(campo as never);
          return idx === -1 ? "" : String(raw[idx] ?? "").trim();
        };
        // Ignora a linha de exemplo do modelo se vier intacta.
        if (get("nome") === LINHA_EXEMPLO[0] && get("email") === LINHA_EXEMPLO[4]) continue;
        const { ano, invalido } = parseAno(get("ano"));
        const dados: ImportAlunoRow = {
          nome: get("nome"),
          anoLetivo: ano,
          email: get("email"),
          telefone: get("telefone"),
          escola: get("escola"),
          disciplinas: get("disciplinas").split(/[;,]/).map(s => s.trim()).filter(Boolean),
          encarregadoNome: get("encarregadoNome"),
          encarregadoTelefone: get("encarregadoTelefone"),
          encarregadoEmail: get("encarregadoEmail"),
        };
        let erro: string | undefined;
        let aviso: string | undefined;
        if (!dados.nome) erro = "Nome em falta";
        else if (invalido) aviso = "Ano inválido (usa 7 a 12) — importado sem ano";
        else if (dados.email && !/^\S+@\S+\.\S+$/.test(dados.email)) aviso = "Email com formato estranho";
        linhas.push({ linha: i + 1, dados, erro, aviso });
      }
      if (linhas.length === 0) {
        toast({ title: "Sem alunos", description: "Não foram encontradas linhas válidas no ficheiro.", variant: "destructive" });
        reset();
        return;
      }
      setPreview(linhas);
    } catch {
      toast({ title: "Erro ao ler o ficheiro", description: "Confirma que é um .xlsx ou .csv válido.", variant: "destructive" });
      reset();
    } finally {
      setLoading(false);
    }
  };

  const validas = preview?.filter(r => !r.erro) ?? [];
  const comErro = preview?.filter(r => r.erro) ?? [];

  const handleImport = async () => {
    if (validas.length === 0) return;
    setImporting(true);
    try {
      const { alunosCriados, disciplinasCriadas } = await importAlunos(validas.map(r => r.dados));
      toast({
        title: `${alunosCriados} alunos importados`,
        description: disciplinasCriadas > 0 ? `${disciplinasCriadas} disciplinas novas criadas automaticamente.` : undefined,
      });
      reset();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Tenta novamente.";
      toast({ title: "Erro na importação", description: msg, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar alunos</DialogTitle>
          <DialogDescription>
            Descarregue o modelo, preencha um aluno por linha e carregue o ficheiro. Disciplinas que não existam são criadas automaticamente.
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-4">
            <Button variant="outline" className="w-full" onClick={downloadModelo}>
              <Download className="h-4 w-4 mr-2" /> Descarregar modelo Excel
            </Button>
            <button
              type="button"
              className="w-full rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors p-8 flex flex-col items-center gap-2 text-muted-foreground"
              onClick={() => fileRef.current?.click()}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-8 w-8 animate-spin" /> : <FileSpreadsheet className="h-8 w-8" />}
              <span className="text-sm font-medium text-foreground">{loading ? "A ler o ficheiro…" : "Escolher ficheiro (.xlsx ou .csv)"}</span>
              <span className="text-xs">Nome é obrigatório; tudo o resto é opcional</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground truncate">{fileName}</span>
              <div className="flex items-center gap-3 shrink-0">
                <span className="flex items-center gap-1 text-success"><CheckCircle2 className="h-4 w-4" /> {validas.length} válidos</span>
                {comErro.length > 0 && (
                  <span className="flex items-center gap-1 text-destructive"><AlertTriangle className="h-4 w-4" /> {comErro.length} com erro</span>
                )}
              </div>
            </div>
            <div className="rounded-md border overflow-x-auto max-h-[45vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 px-3 font-medium">#</th>
                    <th className="py-2 px-3 font-medium">Nome</th>
                    <th className="py-2 px-3 font-medium">Ano</th>
                    <th className="py-2 px-3 font-medium">Disciplinas</th>
                    <th className="py-2 px-3 font-medium">Contacto</th>
                    <th className="py-2 px-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {preview.map(r => (
                    <tr key={r.linha} className={r.erro ? "bg-destructive/5" : undefined}>
                      <td className="py-2 px-3 tabular-nums text-muted-foreground">{r.linha}</td>
                      <td className="py-2 px-3 font-medium">{r.dados.nome || <span className="text-muted-foreground italic">—</span>}</td>
                      <td className="py-2 px-3">{r.dados.anoLetivo ? `${r.dados.anoLetivo}º` : "—"}</td>
                      <td className="py-2 px-3 max-w-[220px] truncate">{r.dados.disciplinas.join(", ") || "—"}</td>
                      <td className="py-2 px-3 max-w-[160px] truncate">{r.dados.telefone || r.dados.email || "—"}</td>
                      <td className="py-2 px-3">
                        {r.erro
                          ? <span className="text-xs text-destructive font-medium">{r.erro}</span>
                          : r.aviso
                            ? <span className="text-xs text-warning font-medium">{r.aviso}</span>
                            : <span className="text-xs text-success font-medium">OK</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {comErro.length > 0 && (
              <p className="text-xs text-muted-foreground">
                As linhas com erro não são importadas — corrige-as no ficheiro e volta a carregar, ou importa só as válidas.
              </p>
            )}
            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" onClick={reset} disabled={importing}>Escolher outro ficheiro</Button>
              <Button onClick={handleImport} disabled={importing || validas.length === 0}>
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Importar {validas.length} aluno{validas.length !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
