import { useNavigate } from "react-router-dom";
import { ChevronRight, User, Building2, Paintbrush } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const items = [
  {
    key: "perfil",
    path: "/configuracoes/perfil",
    icon: User,
    title: "O Meu Perfil",
    description: "Faça a gestão da sua conta pessoal e credenciais de acesso",
    roles: ["admin", "rececionista", "explicador"],
  },
  {
    key: "centro",
    path: "/configuracoes/centro",
    icon: Building2,
    title: "Detalhes do Centro",
    description: "Atualize as informações públicas e de contacto do centro",
    roles: ["admin", "rececionista"],
  },
  {
    key: "personalizacao",
    path: "/configuracoes/personalizacao",
    icon: Paintbrush,
    title: "Personalização",
    description: "Ajuste o tamanho de letra da plataforma",
    roles: ["admin", "rececionista", "explicador"],
  },
];

export default function ConfiguracoesPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const visible = items.filter(item => profile?.role && item.roles.includes(profile.role));

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie as preferências da sua conta e os dados do centro.
        </p>
      </div>

      <div className="space-y-3">
        {visible.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors text-left"
            >
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
