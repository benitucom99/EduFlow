import { useAuth } from "@/contexts/AuthContext";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
        <Badge variant="outline" className="text-[10px] ml-2 border-secondary text-secondary">Beta</Badge>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">3</span>
        </Button>
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
            <DropdownMenuItem disabled>O meu perfil</DropdownMenuItem>
            <DropdownMenuItem disabled>Alternar centro</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { logout(); navigate("/login"); }}>Sair</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
