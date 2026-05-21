import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";

export default function AppHeader({ breadcrumb }: { breadcrumb?: string }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{user?.centro}</span>
        {breadcrumb && (
          <>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-medium">{breadcrumb}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                {user?.nome.split(" ").map(n => n[0]).join("")}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium">{user?.nome}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate("/configuracoes")}>O meu perfil</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { logout(); navigate("/login"); }}>Sair</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
