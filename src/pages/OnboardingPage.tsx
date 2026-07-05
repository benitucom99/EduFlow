import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Loader2, Plus, GraduationCap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

// ── Template do currículo português ──────────────────────────────────────────
// Cada categoria traz os anos típicos em que é lecionada (7º–12º, o intervalo
// suportado no perfil do aluno). Ao confirmar, cria-se a categoria (topo, sem
// preço) e uma sub-disciplina por ano: "Matemática – 9º Ano". Categorias sem
// anos (ex: Apoio ao Estudo) geram uma única sub "– Geral".
const ANOS_APP = [7, 8, 9, 10, 11, 12];
const TEMPLATE_CURRICULO: { nome: string; anos: number[] }[] = [
  { nome: "Matemática", anos: [7, 8, 9, 10, 11, 12] },
  { nome: "Português", anos: [7, 8, 9, 10, 11, 12] },
  { nome: "Físico-Química", anos: [7, 8, 9, 10, 11] },
  { nome: "Inglês", anos: [7, 8, 9, 10, 11, 12] },
  { nome: "Ciências Naturais", anos: [7, 8, 9] },
  { nome: "Biologia e Geologia", anos: [10, 11] },
  { nome: "História", anos: [7, 8, 9, 10, 11, 12] },
  { nome: "Geografia", anos: [7, 8, 9, 10, 11] },
  { nome: "Filosofia", anos: [10, 11] },
  { nome: "Economia", anos: [10, 11] },
  { nome: "Geometria Descritiva", anos: [10, 11] },
  { nome: "Francês", anos: [7, 8, 9] },
  { nome: "Apoio ao Estudo", anos: [] },
];

const PRECO_DEFAULT_INDIVIDUAL = "15";
const PRECO_DEFAULT_GRUPO = "10";

type CategoriaSel = {
  anos: Set<number>;
  /** Anos que a categoria oferece nos chips (template ou todos, se custom). */
  anosDisponiveis: number[];
  precoIndividual: string;
  precoGrupo: string;
};

// Aceita vírgula decimal (pt) ou ponto — igual ao DisciplinaModal.
const parseNum = (v: string) => parseFloat(String(v).replace(",", "."));

export default function OnboardingPage() {
  const { profile, refreshProfile, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2>(1);
  const [centroNome, setCentroNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [centroId, setCentroId] = useState<string | null>(null);

  // Passo 2 — categorias selecionadas (mapa nome → config) + linhas custom.
  const [selecao, setSelecao] = useState<Map<string, CategoriaSel>>(new Map());
  const [customCategorias, setCustomCategorias] = useState<string[]>([]);
  const [novaCategoria, setNovaCategoria] = useState("");

  const handleCreateCentro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!centroNome.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("create_centro_for_new_admin", { p_centro_nome: centroNome });
    setLoading(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setCentroId(data as string);
    await refreshProfile();
    setStep(2);
  };

  const toggleCategoria = (nome: string, anosDisponiveis: number[]) => {
    setSelecao(prev => {
      const next = new Map(prev);
      if (next.has(nome)) {
        next.delete(nome);
      } else {
        next.set(nome, {
          anos: new Set(anosDisponiveis),
          anosDisponiveis,
          precoIndividual: PRECO_DEFAULT_INDIVIDUAL,
          precoGrupo: PRECO_DEFAULT_GRUPO,
        });
      }
      return next;
    });
  };

  const toggleAno = (nome: string, ano: number) => {
    setSelecao(prev => {
      const next = new Map(prev);
      const cat = next.get(nome);
      if (!cat) return prev;
      const anos = new Set(cat.anos);
      if (anos.has(ano)) anos.delete(ano); else anos.add(ano);
      next.set(nome, { ...cat, anos });
      return next;
    });
  };

  const setPreco = (nome: string, campo: "precoIndividual" | "precoGrupo", valor: string) => {
    setSelecao(prev => {
      const next = new Map(prev);
      const cat = next.get(nome);
      if (!cat) return prev;
      next.set(nome, { ...cat, [campo]: valor });
      return next;
    });
  };

  const addCustomCategoria = () => {
    const nome = novaCategoria.trim();
    if (!nome) return;
    const jaExiste = customCategorias.includes(nome) || TEMPLATE_CURRICULO.some(t => t.nome === nome);
    if (jaExiste) {
      toast({ title: "Disciplina repetida", description: `"${nome}" já está na lista.`, variant: "destructive" });
      return;
    }
    setCustomCategorias(prev => [...prev, nome]);
    // Custom entra selecionada, sem anos (sub única "Geral"); chips disponíveis para afinar.
    setSelecao(prev => {
      const next = new Map(prev);
      next.set(nome, {
        anos: new Set(),
        anosDisponiveis: ANOS_APP,
        precoIndividual: PRECO_DEFAULT_INDIVIDUAL,
        precoGrupo: PRECO_DEFAULT_GRUPO,
      });
      return next;
    });
    setNovaCategoria("");
  };

  // Total de sub-disciplinas que vão ser criadas (anos escolhidos, ou 1 "Geral").
  const totalSubs = [...selecao.values()].reduce((s, c) => s + Math.max(c.anos.size, 1), 0);

  const handleCreateDisciplinas = async () => {
    const cid = centroId ?? profile?.centro_id;
    if (!cid) {
      toast({ title: "Erro", description: "Centro não encontrado. Tenta novamente.", variant: "destructive" });
      return;
    }
    // Valida preços antes de inserir seja o que for.
    for (const [nome, cat] of selecao) {
      const ind = parseNum(cat.precoIndividual);
      const grp = parseNum(cat.precoGrupo);
      if (isNaN(ind) || ind < 0 || isNaN(grp) || grp < 0) {
        toast({ title: "Preço inválido", description: `Verifica os preços de "${nome}".`, variant: "destructive" });
        return;
      }
    }
    setLoading(true);
    try {
      // 1) Categorias (topo, sem preço) em lote.
      const nomes = [...selecao.keys()];
      const { data: parents, error: errParents } = await supabase
        .from("disciplinas")
        .insert(nomes.map(nome => ({ centro_id: cid, nome })))
        .select("id, nome");
      if (errParents) throw errParents;
      const parentIdByNome = new Map((parents ?? []).map((p: { id: string; nome: string }) => [p.nome, p.id]));

      // 2) Sub-disciplinas (folhas, com preço) em lote.
      const filhos: Record<string, unknown>[] = [];
      for (const [nome, cat] of selecao) {
        const parentId = parentIdByNome.get(nome);
        if (!parentId) continue;
        const ind = parseNum(cat.precoIndividual);
        const grp = parseNum(cat.precoGrupo);
        const anos = [...cat.anos].sort((a, b) => a - b);
        const subs = anos.length > 0 ? anos.map(a => `${nome} – ${a}º Ano`) : [`${nome} – Geral`];
        for (const subNome of subs) {
          filhos.push({
            centro_id: cid,
            nome: subNome,
            parent_id: parentId,
            preco_hora_individual: ind,
            preco_hora_grupo: grp,
          });
        }
      }
      if (filhos.length > 0) {
        const { error: errFilhos } = await supabase.from("disciplinas").insert(filhos);
        if (errFilhos) throw errFilhos;
      }
      toast({ title: "Disciplinas criadas", description: `${filhos.length} sub-disciplinas em ${nomes.length} categorias.` });
      // Reload completo: garante que o DataContext carrega as disciplinas novas.
      window.location.assign("/dashboard");
    } catch (err: unknown) {
      setLoading(false);
      const msg = err instanceof Error ? err.message : "Erro ao criar disciplinas.";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    }
  };

  // ── Passo 1 — nome do centro ────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent via-background to-muted p-4">
        <div className="w-full max-w-[420px] bg-card rounded-xl shadow-lg border border-border p-8">
          <h1 className="text-lg font-heading font-semibold mb-1">Bem-vindo{profile?.nome ? `, ${profile.nome}` : ""}</h1>
          <p className="text-sm text-muted-foreground mb-6">Termine a criação da sua conta indicando o nome do centro.</p>
          <form onSubmit={handleCreateCentro} className="space-y-4">
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

  // ── Passo 2 — disciplinas do currículo ─────────────────────────────────────
  const todasCategorias = [
    ...TEMPLATE_CURRICULO,
    ...customCategorias.map(nome => ({ nome, anos: [] as number[] })),
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent via-background to-muted p-4">
      <div className="w-full max-w-[640px] bg-card rounded-xl shadow-lg border border-border p-8 my-8">
        <div className="flex items-center gap-2 mb-1">
          <GraduationCap className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-heading font-semibold">Que disciplinas oferece?</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Selecione as disciplinas do seu centro — criamos tudo com preços que pode ajustar a qualquer momento em Disciplinas.
        </p>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
          {todasCategorias.map(cat => {
            const sel = selecao.get(cat.nome);
            const anosDisponiveis = sel?.anosDisponiveis ?? (cat.anos.length > 0 ? cat.anos : ANOS_APP);
            return (
              <div key={cat.nome} className={`rounded-lg border p-3 transition-colors ${sel ? "border-primary/40 bg-primary/5" : "border-border"}`}>
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox checked={!!sel} onCheckedChange={() => toggleCategoria(cat.nome, cat.anos)} />
                  <span className="text-sm font-medium flex-1">{cat.nome}</span>
                  {sel && (
                    <span className="text-xs text-muted-foreground">
                      {sel.anos.size > 0 ? `${sel.anos.size} ano${sel.anos.size > 1 ? "s" : ""}` : "Geral"}
                    </span>
                  )}
                </label>
                {sel && (
                  <div className="mt-3 pl-7 space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {anosDisponiveis.map(ano => (
                        <button
                          key={ano}
                          type="button"
                          onClick={() => toggleAno(cat.nome, ano)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                            sel.anos.has(ano)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted-foreground border-border hover:border-primary/50"
                          }`}
                        >
                          {ano}º
                        </button>
                      ))}
                      {sel.anos.size === 0 && (
                        <span className="text-xs text-muted-foreground self-center">Sem anos → cria "{cat.nome} – Geral"</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <Label className="text-xs whitespace-nowrap">Individual</Label>
                        <Input
                          type="text" inputMode="decimal" value={sel.precoIndividual}
                          onChange={e => setPreco(cat.nome, "precoIndividual", e.target.value)}
                          className="h-8 w-16 text-sm"
                        />
                        <span className="text-xs text-muted-foreground">€/h</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Label className="text-xs whitespace-nowrap">Grupo</Label>
                        <Input
                          type="text" inputMode="decimal" value={sel.precoGrupo}
                          onChange={e => setPreco(cat.nome, "precoGrupo", e.target.value)}
                          className="h-8 w-16 text-sm"
                        />
                        <span className="text-xs text-muted-foreground">€/h</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 mt-4">
          <Input
            placeholder="Outra disciplina (ex: Alemão)"
            value={novaCategoria}
            onChange={e => setNovaCategoria(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomCategoria(); } }}
            className="h-9"
          />
          <Button type="button" variant="outline" size="sm" onClick={addCustomCategoria} disabled={!novaCategoria.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>

        <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-border">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="text-sm text-muted-foreground hover:underline"
            disabled={loading}
          >
            Configurar mais tarde
          </button>
          <Button onClick={handleCreateDisciplinas} disabled={loading || selecao.size === 0}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar {totalSubs > 0 ? `${totalSubs} disciplinas` : "disciplinas"}
          </Button>
        </div>
      </div>
    </div>
  );
}
