import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DiscBadge } from "@/components/DiscBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Plus, Search, MoreHorizontal, Eye, Pencil, Trash2, X, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Aluno } from "@/contexts/DataContext";
import { folhas, folhasAgrupadas } from "@/lib/disciplinas";

const ESTADO_CONFIG = {
  ativo: { label: "Ativo", dot: "bg-green-500", badge: "bg-success text-success-foreground" },
  "pre-inscrito": { label: "Pendente", dot: "bg-yellow-400", badge: "bg-warning text-warning-foreground" },
  inativo: { label: "Inativo", dot: "bg-gray-400", badge: "bg-muted text-muted-foreground" },
} as const;

type EstadoKey = keyof typeof ESTADO_CONFIG;

function EstadoBadge({ estado, alunoId, onMudar }: { estado: string; alunoId: string; onMudar: (id: string, novoEstado: EstadoKey) => void }) {
  const key: EstadoKey = (estado in ESTADO_CONFIG ? estado : "inativo") as EstadoKey;
  const config = ESTADO_CONFIG[key];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity select-none ${config.badge}`}
          onClick={e => e.stopPropagation()}
        >
          {config.label}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onClick={e => e.stopPropagation()}>
        {(Object.entries(ESTADO_CONFIG) as [EstadoKey, typeof ESTADO_CONFIG[EstadoKey]][]).map(([k, cfg]) => (
          <DropdownMenuItem key={k} className={k === key ? "font-semibold" : ""} onClick={e => { e.stopPropagation(); onMudar(alunoId, k); }}>
            <span className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
            {cfg.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AlunosPage() {
  const { alunos, disciplinas, createAluno, updateAluno, deleteAluno, updateAlunoEstado } = useData();
  const leafNames = folhas(disciplinas).map(d => d.nome);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("todos");
  const [anoFilter, setAnoFilter] = useState("todos");
  const [discFilter, setDiscFilter] = useState("todas");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAluno, setEditingAluno] = useState<Aluno | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    return alunos.filter(a => {
      if (search && !a.nome.toLowerCase().includes(search.toLowerCase()) && !a.email.toLowerCase().includes(search.toLowerCase()) && !a.escola.toLowerCase().includes(search.toLowerCase())) return false;
      if (estadoFilter !== "todos" && a.estado !== estadoFilter) return false;
      if (anoFilter !== "todos" && a.anoLetivo !== parseInt(anoFilter)) return false;
      if (discFilter !== "todas" && !a.disciplinas.includes(discFilter)) return false;
      return true;
    });
  }, [alunos, search, estadoFilter, anoFilter, discFilter]);

  const paged = filtered.slice(page * 10, (page + 1) * 10);
  const totalPages = Math.ceil(filtered.length / 10);

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await deleteAluno(deleteId);
        toast({ title: "Aluno eliminado com sucesso" });
      } catch {
        toast({ title: "Erro ao eliminar aluno", description: "Tenta novamente.", variant: "destructive" });
      } finally {
        setDeleteId(null);
      }
    }
  };

  const mudarEstado = async (id: string, novoEstado: EstadoKey) => {
    try {
      await updateAlunoEstado(id, novoEstado);
      toast({ title: "Estado atualizado" });
    } catch {
      toast({ title: "Erro ao atualizar estado", description: "Tenta novamente.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Alunos <span className="text-muted-foreground font-normal text-lg">({filtered.length})</span></h1>
        <Button onClick={() => { setEditingAluno(null); setModalOpen(true); }}>
          <Plus className="h-4 w-4" /> Novo Aluno
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Pesquisar por nome, email, escola..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={estadoFilter} onValueChange={setEstadoFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
              <SelectItem value="pre-inscrito">Pré-inscrito</SelectItem>
            </SelectContent>
          </Select>
          <Select value={anoFilter} onValueChange={setAnoFilter}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Ano" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {[7, 8, 9, 10, 11, 12].map(a => <SelectItem key={a} value={String(a)}>{a}º ano</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={discFilter} onValueChange={setDiscFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Disciplina" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {leafNames.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setEstadoFilter("todos"); setAnoFilter("todos"); setDiscFilter("todas"); }}>
            <X className="h-3 w-3 mr-1" /> Limpar
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum aluno encontrado. Tente ajustar os filtros ou criar um novo aluno.</p>
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Ano Escolar</TableHead>
                  <TableHead className="hidden md:table-cell">Disciplinas</TableHead>
                  <TableHead className="hidden lg:table-cell">Encarregado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map(aluno => (
                  <TableRow key={aluno.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/alunos/${aluno.id}`)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-accent-foreground">
                          {aluno.nome.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{aluno.nome}</p>
                          <p className="text-xs text-muted-foreground">{aluno.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{aluno.anoLetivo}º</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex gap-1 flex-wrap">
                        {aluno.disciplinas.slice(0, 3).map(d => (
                          <DiscBadge key={d} nome={d} className="text-[10px]" />
                        ))}
                        {aluno.disciplinas.length > 3 && <Badge variant="outline" className="text-[10px]">+{aluno.disciplinas.length - 3}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{aluno.encarregado.nome}</TableCell>
                    <TableCell><EstadoBadge estado={aluno.estado} alunoId={aluno.id} onMudar={mudarEstado} /></TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/alunos/${aluno.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingAluno(aluno); setModalOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(aluno.id)}>Eliminar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <p className="text-sm text-muted-foreground">Página {page + 1} de {totalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Seguinte</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <AlunoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        aluno={editingAluno}
        onSave={async (data) => {
          try {
            if (editingAluno) {
              await updateAluno(editingAluno.id, data);
              toast({ title: "Aluno atualizado com sucesso" });
            } else {
              await createAluno(data);
              toast({ title: "Aluno criado com sucesso" });
            }
            setModalOpen(false);
          } catch {
            toast({ title: "Erro ao guardar aluno", description: "Verifica os dados e tenta novamente.", variant: "destructive" });
          }
        }}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar aluno?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser revertida.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AlunoModal({ open, onClose, aluno, onSave }: {
  open: boolean;
  onClose: () => void;
  aluno: Aluno | null;
  onSave: (data: any) => void;
}) {
  const { disciplinas, explicadores } = useData();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [escola, setEscola] = useState("");
  const [morada, setMorada] = useState("");
  const [anoLetivo, setAnoLetivo] = useState("10");
  // Inscrição por-folha: ids selecionados + tutor por-disciplina (id da folha → id do explicador).
  const [selectedDiscIds, setSelectedDiscIds] = useState<string[]>([]);
  const [discTutores, setDiscTutores] = useState<Record<string, string>>({});
  const [encNome, setEncNome] = useState("");
  const [encEmail, setEncEmail] = useState("");
  const [encTelefone, setEncTelefone] = useState("");
  const [nifEncarregado, setNifEncarregado] = useState("");
  const [desconto, setDesconto] = useState("0");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [addKey, setAddKey] = useState(0);

  const grupos = folhasAgrupadas(disciplinas);
  const availableGrupos = grupos
    .map(g => ({ ...g, folhas: g.folhas.filter(f => !selectedDiscIds.includes(f.id)) }))
    .filter(g => g.folhas.length > 0);
  const explicadoresAtivos = explicadores.filter(e => e.estado === "ativo");

  // Reset all fields when modal opens or aluno changes
  useEffect(() => {
    if (open) {
      setNome(aluno?.nome || "");
      setEmail(aluno?.email || "");
      setTelefone(aluno?.telefone || "");
      setEscola(aluno?.escola || "");
      setMorada(aluno?.morada || "");
      setAnoLetivo(String(aluno?.anoLetivo || 10));
      // disciplinaExplicadores tem uma entrada por folha inscrita (valor null se sem tutor).
      const mapa = aluno?.disciplinaExplicadores ?? {};
      setSelectedDiscIds(Object.keys(mapa));
      setDiscTutores(Object.fromEntries(Object.entries(mapa).map(([k, v]) => [k, v ?? ""])));
      setEncNome(aluno?.encarregado?.nome || "");
      setEncEmail(aluno?.encarregado?.email || "");
      setEncTelefone(aluno?.encarregado?.telefone || "");
      setNifEncarregado(aluno?.nifEncarregado || "");
      setDesconto(String(aluno?.desconto ?? 0));
      setErrors({});
      setAddKey(0);
    }
  }, [open, aluno]);

  const toggleDisc = (id: string, checked: boolean) => {
    setSelectedDiscIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
    if (!checked) setDiscTutores(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  // Professores que lecionam esta folha (por nome); fallback a todos os ativos.
  const tutoresPara = (leafNome: string) => {
    const lecionam = explicadoresAtivos.filter(e => e.disciplinas.includes(leafNome));
    return lecionam.length > 0 ? lecionam : explicadoresAtivos;
  };

  const handleSave = () => {
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = "Obrigatório";
    if (nifEncarregado && !/^\d{9}$/.test(nifEncarregado)) e.nifEncarregado = "NIF deve ter 9 dígitos";
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const nomePorId = new Map(disciplinas.map(d => [d.id, d.nome]));
    const disciplinasNomes = selectedDiscIds.map(id => nomePorId.get(id)).filter(Boolean) as string[];
    const disciplinaExplicadores: Record<string, string | null> = {};
    selectedDiscIds.forEach(id => { disciplinaExplicadores[id] = discTutores[id] || null; });

    onSave({
      nome, email, telefone, escola, morada,
      anoLetivo: parseInt(anoLetivo),
      disciplinas: disciplinasNomes,
      disciplinaExplicadores,
      encarregado: { nome: encNome, email: encEmail, telefone: encTelefone },
      nifEncarregado: nifEncarregado || undefined,
      desconto: Math.min(100, Math.max(0, parseInt(desconto) || 0)),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{aluno ? "Editar Aluno" : "Novo Aluno"}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="pessoais">
          <TabsList className="w-full">
            <TabsTrigger value="pessoais" className="flex-1">Dados Pessoais</TabsTrigger>
            <TabsTrigger value="encarregado" className="flex-1">Encarregado</TabsTrigger>
          </TabsList>
          <TabsContent value="pessoais" className="space-y-4 mt-4">
            <div>
              <Label>Nome *</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} />
              {errors.nome && <p className="text-xs text-destructive mt-1">{errors.nome}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input value={email} onChange={e => setEmail(e.target.value)} /></div>
              <div><Label>Telefone</Label><Input value={telefone} onChange={e => setTelefone(e.target.value)} /></div>
            </div>
            <div><Label>Morada</Label><Input value={morada} onChange={e => setMorada(e.target.value)} placeholder="Rua, número, localidade" /></div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Escola</Label><Input value={escola} onChange={e => setEscola(e.target.value)} /></div>
              <div>
                <Label>Ano Escolar</Label>
                <Select value={anoLetivo} onValueChange={setAnoLetivo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[7, 8, 9, 10, 11, 12].map(a => <SelectItem key={a} value={String(a)}>{a}º ano</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Disciplinas Frequentadas */}
            <div>
              <Label>Disciplinas Frequentadas</Label>
              {grupos.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-2">Ainda não há disciplinas. Crie disciplinas primeiro.</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {selectedDiscIds.length > 0 && (
                    <div className="rounded-lg border border-border divide-y divide-border">
                      {selectedDiscIds.map(id => {
                        const disc = disciplinas.find(d => d.id === id);
                        if (!disc) return null;
                        const parentDisc = disc.parentId ? disciplinas.find(d => d.id === disc.parentId) : null;
                        const tutores = tutoresPara(disc.nome);
                        return (
                          <div key={id} className="flex items-center gap-2 px-3 py-2.5">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium leading-tight truncate">{disc.nome}</p>
                              {parentDisc && <p className="text-[11px] text-muted-foreground mt-0.5">{parentDisc.nome}</p>}
                            </div>
                            <Select
                              value={discTutores[id] || "none"}
                              onValueChange={v => setDiscTutores(prev => ({ ...prev, [id]: v === "none" ? "" : v }))}
                            >
                              <SelectTrigger className="w-36 h-8 text-xs shrink-0">
                                <SelectValue placeholder="Professor" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sem professor</SelectItem>
                                {tutores.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() => toggleDisc(id, false)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {availableGrupos.length > 0 && (
                    <Select key={addKey} onValueChange={id => { toggleDisc(id, true); setAddKey(k => k + 1); }}>
                      <SelectTrigger className="h-9 border-dashed">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Plus className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-sm">Adicionar disciplina...</span>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {availableGrupos.map((g, gi) => (
                          <SelectGroup key={g.categoriaNome ?? `__sem__${gi}`}>
                            {g.categoriaNome && (
                              <SelectLabel className="px-3 py-2 text-sm font-bold text-foreground">
                                {g.categoriaNome}
                              </SelectLabel>
                            )}
                            {g.folhas.map(f => (
                              <SelectItem key={f.id} value={f.id} className="text-muted-foreground">{f.nome}</SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {selectedDiscIds.length > 0 && availableGrupos.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-1">Todas as disciplinas disponíveis já foram adicionadas.</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label>Desconto (%)</Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={desconto}
                  onChange={e => setDesconto(e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="encarregado" className="space-y-4 mt-4">
            <div>
              <Label>Nome</Label>
              <Input value={encNome} onChange={e => setEncNome(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={encEmail} onChange={e => setEncEmail(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Telefone</Label>
                <Input value={encTelefone} onChange={e => setEncTelefone(e.target.value)} />
              </div>
              <div>
                <Label>NIF</Label>
                <Input
                  value={nifEncarregado}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 9);
                    setNifEncarregado(v);
                  }}
                  placeholder="123456789"
                  maxLength={9}
                  inputMode="numeric"
                />
                {errors.nifEncarregado && <p className="text-xs text-destructive mt-1">{errors.nifEncarregado}</p>}
              </div>
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
