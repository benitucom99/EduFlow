import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarPlus, Clock, BookOpen, User, X, GraduationCap } from "lucide-react";
import { format, parseISO, isAfter, startOfDay } from "date-fns";
import { pt } from "date-fns/locale";
import MarcarAulaModal from "@/components/portal/MarcarAulaModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function PortalPage() {
  const { user } = useAuth();
  const { alunos, aulas, cancelAula, explicadores } = useData();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAlunoId, setSelectedAlunoId] = useState<string | null>(null);
  const [cancelAulaId, setCancelAulaId] = useState<string | null>(null);

  const educandos = alunos.filter(a => user?.alunoIds?.includes(a.id));
  const today = startOfDay(new Date());

  const openMarcar = (alunoId: string) => {
    setSelectedAlunoId(alunoId);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Olá, {user?.nome}!</h1>
        <p className="text-muted-foreground">Gerencie as aulas dos seus educandos</p>
      </div>

      {educandos.map(aluno => {
        const proximasAulas = aulas
          .filter(a => a.alunoIds.includes(aluno.id) && a.estado === "agendada" && isAfter(parseISO(a.data), today))
          .sort((a, b) => a.data.localeCompare(b.data) || a.horaInicio.localeCompare(b.horaInicio))
          .slice(0, 5);

        const explicadorAtribuido = explicadores.find(e => e.id === aluno.explicadorId);

        return (
          <Card key={aluno.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  {aluno.nome}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{aluno.escola} — {aluno.anoLetivo}º ano</p>
                {explicadorAtribuido && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                    <GraduationCap className="h-3.5 w-3.5" />
                    Explicador: <span className="font-medium text-foreground">{explicadorAtribuido.nome}</span>
                  </p>
                )}
              </div>
              <Button onClick={() => openMarcar(aluno.id)}>
                <CalendarPlus className="mr-2 h-4 w-4" /> Marcar Aula
              </Button>
            </CardHeader>
            <CardContent>
              <div className="mb-2 flex flex-wrap gap-1">
                {aluno.disciplinas.map(d => (
                  <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
                ))}
              </div>

              {proximasAulas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem aulas agendadas.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Próximas aulas:</p>
                  {proximasAulas.map(aula => {
                    const exp = explicadores.find(e => e.id === aula.explicadorId);
                    return (
                      <div key={aula.id} className="flex items-center gap-3 rounded-md border p-3 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {format(parseISO(aula.data), "EEE, d MMM", { locale: pt })}
                        </span>
                        <span>{aula.horaInicio}–{aula.horaFim}</span>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" /> {aula.disciplina}
                        </Badge>
                        {exp && <span className="text-muted-foreground">com {exp.nome}</span>}
                        <Badge variant={aula.tipo === "individual" ? "default" : "secondary"} className="ml-auto text-xs">
                          {aula.tipo}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setCancelAulaId(aula.id)}
                          title="Cancelar aula"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <MarcarAulaModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        preSelectedAlunoId={selectedAlunoId}
        educandoIds={user?.alunoIds || []}
      />

      <AlertDialog open={!!cancelAulaId} onOpenChange={(open) => { if (!open) setCancelAulaId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar aula?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const aula = aulas.find(a => a.id === cancelAulaId);
                if (!aula) return "Tem a certeza que deseja cancelar esta aula?";
                const exp = explicadores.find(e => e.id === aula.explicadorId);
                return `Tem a certeza que deseja cancelar a aula de ${aula.disciplina} no dia ${format(parseISO(aula.data), "d 'de' MMMM", { locale: pt })} às ${aula.horaInicio}${exp ? ` com ${exp.nome}` : ""}? Esta ação não pode ser revertida.`;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter aula</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (cancelAulaId) await cancelAula(cancelAulaId);
                toast({ title: "Aula cancelada", description: "A aula foi cancelada com sucesso." });
                setCancelAulaId(null);
              }}
            >
              Cancelar aula
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
