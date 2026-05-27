import { useData } from "@/contexts/DataContext";

export function DiscBadge({ nome, className = "" }: { nome: string; className?: string }) {
  const { disciplinas } = useData();
  const hsl = disciplinas.find(d => d.nome === nome)?.corHsl;

  if (!hsl) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground ${className}`}>
        {nome}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
      style={{
        backgroundColor: `color-mix(in srgb, ${hsl} 15%, transparent)`,
        color: hsl,
        border: `1px solid color-mix(in srgb, ${hsl} 30%, transparent)`,
      }}
    >
      {nome}
    </span>
  );
}
