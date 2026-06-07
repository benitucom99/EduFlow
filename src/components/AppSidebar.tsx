import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Users, GraduationCap, DoorOpen, CalendarDays,
  ClipboardCheck, Receipt, Settings, LogOut, ChevronLeft, ChevronRight,
  BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "rececionista"] },
  { path: "/alunos", label: "Alunos", icon: Users, roles: ["admin", "rececionista"] },
  { path: "/explicadores", label: "Explicadores", icon: GraduationCap, roles: ["admin", "rececionista"] },
  { path: "/disciplinas", label: "Disciplinas", icon: BookOpen, roles: ["admin"] },
  { path: "/salas", label: "Salas", icon: DoorOpen, roles: ["admin", "rececionista"] },
  { path: "/calendario", label: "Calendário", icon: CalendarDays, roles: ["admin", "rececionista", "explicador"] },
  { path: "/presencas", label: "Presenças", icon: ClipboardCheck, roles: ["admin", "rececionista", "explicador"] },
  { path: "/faturacao", label: "Faturação", icon: Receipt, roles: ["admin"] },
  { path: "/configuracoes", label: "Configurações", icon: Settings, roles: ["admin", "rececionista", "explicador"] },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  /** Chamado ao clicar num link — usado pelo drawer mobile para fechar. */
  onNavigate?: () => void;
  /** Esconde o botão de recolher (não faz sentido no drawer mobile). */
  showCollapseToggle?: boolean;
}

/** Conteúdo interno da sidebar, partilhado entre a versão fixa (desktop) e o drawer (mobile). */
export function SidebarBody({ collapsed, onToggle, onNavigate, showCollapseToggle = true }: SidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const visibleItems = navItems.filter(item => user && item.roles.includes(user.role));

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 h-12 border-b border-sidebar-border">
        <GraduationCap className="h-5 w-5 shrink-0" />
        {!collapsed && <span className="font-bold text-base tracking-tight">EduFlow</span>}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto scrollbar-thin">
        {visibleItems.map(item => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = item.icon;
          const link = (
            <Link
              to={item.path}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.path} delayDuration={0}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          }
          return <div key={item.path}>{link}</div>;
        })}
      </nav>

      {/* User & Collapse */}
      <div className="border-t border-sidebar-border p-2 space-y-1.5">
        {user && (
          <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
            <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold shrink-0">
              {user.nome.split(" ").map(n => n[0]).join("")}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.nome}</p>
                <p className="text-xs text-sidebar-muted truncate capitalize">{user.role}</p>
              </div>
            )}
          </div>
        )}
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
          </Button>
          {showCollapseToggle && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50 ml-auto"
              onClick={onToggle}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Sidebar fixa para desktop (lg+). Em mobile usa-se o drawer no AppLayout. */
export default function AppSidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside className={cn(
      "fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground transition-all duration-300",
      collapsed ? "w-14" : "w-56"
    )}>
      <SidebarBody collapsed={collapsed} onToggle={onToggle} />
    </aside>
  );
}
