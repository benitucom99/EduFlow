import { format, parse } from "date-fns";
import { pt } from "date-fns/locale";
import { FechoLinha } from "@/contexts/DataContext";
import { formatCurrency, formatDuration } from "@/lib/faturacao";

// "2026-07" → "Julho de 2026"
export function labelPeriodo(periodo: string): string {
  try {
    const d = parse(periodo + "-01", "yyyy-MM-dd", new Date());
    const s = format(d, "MMMM 'de' yyyy", { locale: pt });
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch {
    return periodo;
  }
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function labelPresenca(presenca: string | null, cobrar: boolean): string {
  const base =
    presenca === "presente" ? "Presente"
    : presenca === "falta_justificada" ? "Falta justificada"
    : presenca === "falta_injustificada" ? "Falta injustificada"
    : "Não registada";
  return cobrar ? base : `${base} (não cobrado)`;
}

// Abre uma janela de impressão com o extrato do mês de uma linha de fecho.
// Não é uma fatura fiscal — é um aviso/extrato para enviar ao encarregado.
export function gerarAvisoCobranca(args: { centroNome: string; periodo: string; linha: FechoLinha }) {
  const { centroNome, periodo, linha } = args;
  const rows = linha.detalhe.map(a => `
    <tr>
      <td>${esc(a.data.split("-").reverse().join("/"))}</td>
      <td>${esc(a.horaInicio)}–${esc(a.horaFim)}</td>
      <td>${esc(a.disciplina)}</td>
      <td>${esc(formatDuration(a.duracao))}</td>
      <td class="num">${a.cobrar ? esc(formatCurrency(a.precoPorHora)) : "—"}</td>
      <td class="num${a.cobrar ? "" : " off"}">${esc(formatCurrency(a.valor))}</td>
      <td>${esc(labelPresenca(a.presenca, a.cobrar))}</td>
    </tr>`).join("");

  const emFalta = Math.max(0, linha.valor - linha.valorPago);
  const html = `<!doctype html>
<html lang="pt">
<head>
<meta charset="utf-8">
<title>Aviso de Cobrança — ${esc(linha.entidadeNome)} — ${esc(labelPeriodo(periodo))}</title>
<style>
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: #1a1a1a; margin: 40px; }
  h1 { font-size: 20px; margin: 0 0 2px; }
  h2 { font-size: 15px; font-weight: 600; margin: 24px 0 4px; }
  .muted { color: #666; font-size: 13px; margin: 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
  th { text-align: left; border-bottom: 2px solid #1a1a1a; padding: 6px 8px; font-size: 12px; text-transform: uppercase; letter-spacing: .03em; }
  td { border-bottom: 1px solid #ddd; padding: 6px 8px; }
  .num { text-align: right; white-space: nowrap; }
  .off { color: #999; text-decoration: line-through; }
  tfoot td { border-bottom: none; border-top: 2px solid #1a1a1a; font-weight: 700; padding-top: 10px; }
  .estado { margin-top: 16px; font-size: 13px; }
  .estado strong { font-size: 15px; }
  footer { margin-top: 40px; font-size: 11px; color: #999; }
  @media print { body { margin: 16mm; } }
</style>
</head>
<body>
  <h1>${esc(centroNome)}</h1>
  <p class="muted">Aviso de cobrança — ${esc(labelPeriodo(periodo))}</p>
  <h2>${esc(linha.entidadeNome)}</h2>
  <table>
    <thead>
      <tr><th>Data</th><th>Hora</th><th>Disciplina</th><th>Duração</th><th>Preço/h</th><th>Valor</th><th>Presença</th></tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr><td colspan="5" style="text-align:right">Total do período:</td><td class="num">${esc(formatCurrency(linha.valor))}</td><td></td></tr>
    </tfoot>
  </table>
  <p class="estado">
    ${linha.valorPago > 0 ? `Pago: <strong>${esc(formatCurrency(linha.valorPago))}</strong> · ` : ""}
    Em falta: <strong>${esc(formatCurrency(emFalta))}</strong>
  </p>
  <footer>Documento informativo emitido por ${esc(centroNome)} via EduFlow. Não serve como fatura ou recibo fiscal.</footer>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  return true;
}
