import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, MoreHorizontal, Eye, Pencil, X, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Aluno, disciplinas } from "@/data/mockData";

const estadoBadge = (estado: string) => {
  const map: Record<string, string> = {
    ativo: "bg-success text-success-foreground",
    inativo: "bg-muted text-muted-foreground",
    "pre-inscrito": "bg-warning text-warning-foreground",
  };
  const labels: Record<string, string> = { ativo: "Ativo", inativo: "Inativo", "pre-inscrito": "Pré-inscrito" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[estado]}`}>{labels[estado]}</span>;
};

export default function AlunosPage() {
  const { alunos, setAlunos } = useData();
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

  const handleDelete = () => {
    if (deleteId) {
      setAlunos(prev => prev.filter(a => a.id !== deleteId));
      toast({ title: "Aluno eliminado com sucesso" });
      setDeleteId(null);
    }
  };

  const toggleEstado = (id: string) => {
    setAlunos(prev => prev.map(a => a.id === id ? { ...a, estado: a.estado === "ativo" ? "inativo" : "ativo" } : a));
    toast({ title: "Estado atualizado" });
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
              {disciplinas.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
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
                  <TableHead>Ano</TableHead>
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
                          <Badge key={d} variant="secondary" className="text-[10px]">{d}</Badge>
                        ))}
                        {aluno.disciplinas.length > 3 && <Badge variant="outline" className="text-[10px]">+{aluno.disciplinas.length - 3}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{aluno.encarregado.nome}</TableCell>
                    <TableCell>{estadoBadge(aluno.estado)}</TableCell>
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
                            <DropdownMenuItem onClick={() => toggleEstado(aluno.id)}>
                              {aluno.estado === "ativo" ? "Desativar" : "Ativar"}
                            </DropdownMenuItem>
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
      <AlunoModal open={modalOpen} onClose={() => setModalOpen(false)} aluno={editingAluno} onSave={(data) => {
        if (editingAluno) {
          setAlunos(prev => prev.map(a => a.id === editingAluno.id ? { ...a, ...data } : a));
          toast({ title: "Aluno atualizado com sucesso" });
        } else {
          const newAluno: Aluno = { ...data, id: `a${Date.now()}`, estado: "ativo", dataInscricao: new Date().toISOString().split("T")[0] };
          setAlunos(prev => [...prev, newAluno]);
          toast({ title: "Aluno criado com sucesso" });
        }
        setModalOpen(false);
      }} />

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

function AlunoModal({ open, onClose, aluno, onSave }: { open: boolean; onClose: () => void; aluno: Aluno | null; onSave: (data: any) => void }) {
  const [nome, setNome] = useState(aluno?.nome || "");
  const [email, setEmail] = useState(aluno?.email || "");
  const [telefone, setTelefone] = useState(aluno?.telefone || "");
  const [escola, setEscola] = useState(aluno?.escola || "");
  const [anoLetivo, setAnoLetivo] = useState(String(aluno?.anoLetivo || "10"));
  const [selectedDisc, setSelectedDisc] = useState<string[]>(aluno?.disciplinas || []);
  const [encNome, setEncNome] = useState(aluno?.encarregado?.nome || "");
  const [encEmail, setEncEmail] = useState(aluno?.encarregado?.email || "");
  const [encTelefone, setEncTelefone] = useState(aluno?.encarregado?.telefone || "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset when aluno changes
  useState(() => {
    if (open) {
      setNome(aluno?.nome || "");
      setEmail(aluno?.email || "");
      setTelefone(aluno?.telefone || "");
      setEscola(aluno?.escola || "");
      setAnoLetivo(String(aluno?.anoLetivo || "10"));
      setSelectedDisc(aluno?.disciplinas || []);
      setEncNome(aluno?.encarregado?.nome || "");
      setEncEmail(aluno?.encarregado?.email || "");
      setEncTelefone(aluno?.encarregado?.telefone || "");
      setErrors({});
    }
  });

  const handleSave = () => {
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = "Obrigatório";
    if (!encNome.trim()) e.encNome = "Obrigatório";
    if (!encEmail.trim()) e.encEmail = "Obrigatório";
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    onSave({
      nome, email, telefone, escola,
      anoLetivo: parseInt(anoLetivo),
      disciplinas: selectedDisc,
      encarregado: { nome: encNome, email: encEmail, telefone: encTelefone },
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
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Escola</Label><Input value={escola} onChange={e => setEscola(e.target.value)} /></div>
              <div>
                <Label>Ano Letivo</Label>
                <Select value={anoLetivo} onValueChange={setAnoLetivo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[7, 8, 9, 10, 11, 12].map(a => <SelectItem key={a} value={String(a)}>{a}º ano</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Disciplinas</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {disciplinas.map(d => (
                  <div key={d} className="flex items-center gap-2">
                    <Checkbox checked={selectedDisc.includes(d)} onCheckedChange={checked => {
                      setSelectedDisc(prev => checked ? [...prev, d] : prev.filter(x => x !== d));
                    }} />
                    <span className="text-sm">{d}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="encarregado" className="space-y-4 mt-4">
            <div>
              <Label>Nome *</Label>
              <Input value={encNome} onChange={e => setEncNome(e.target.value)} />
              {errors.encNome && <p className="text-xs text-destructive mt-1">{errors.encNome}</p>}
            </div>
            <div>
              <Label>Email *</Label>
              <Input value={encEmail} onChange={e => setEncEmail(e.target.value)} />
              {errors.encEmail && <p className="text-xs text-destructive mt-1">{errors.encEmail}</p>}
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={encTelefone} onChange={e => setEncTelefone(e.target.value)} />
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
