import { useData } from "@/contexts/DataContext";
import { DiscBadge } from "@/components/DiscBadge";
import { folhasAgrupadasFiltradas } from "@/lib/disciplinas";

/**
 * Sub-disciplinas agrupadas pela categoria-pai: o nome da categoria aparece como
 * título e as folhas (sub-disciplinas) como badges por baixo. Vista detalhada
 * usada nos perfis (aluno/explicador), para se perceber a que disciplina cada
 * sub-disciplina pertence.
 */
export function DiscAgrupadas({ folhaNomes, className = "" }: { folhaNomes: string[]; className?: string }) {
  const { disciplinas } = useData();
  const grupos = folhasAgrupadasFiltradas(disciplinas, folhaNomes);

  if (grupos.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem disciplinas associadas.</p>;
  }

  return (
    <div className={`space-y-2.5 ${className}`}>
      {grupos.map((g, gi) => (
        <div key={g.categoriaNome || `__sem__${gi}`}>
          {g.categoriaNome && (
            <p className="text-xs font-medium text-muted-foreground mb-1">{g.categoriaNome}</p>
          )}
          <div className="flex flex-wrap gap-1">
            {g.folhas.map(f => <DiscBadge key={f.id} nome={f.nome} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
