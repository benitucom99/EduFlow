export function DiscBadge({ nome, className = "" }: { nome: string; className?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground ${className}`}>
      {nome}
    </span>
  );
}
