import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar, { SidebarBody } from "@/components/AppSidebar";
import AppHeader from "@/components/AppHeader";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Fecha o drawer ao passar para largura de desktop (evita overlay preso).
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = (e: MediaQueryListEvent) => { if (e.matches) setMobileOpen(false); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar fixa — apenas desktop (lg+) */}
      <div className="hidden lg:block print:hidden">
        <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      {/* Drawer — apenas mobile/tablet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-60 p-0 bg-sidebar text-sidebar-foreground border-sidebar-border lg:hidden"
        >
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <SidebarBody
            collapsed={false}
            onToggle={() => {}}
            onNavigate={() => setMobileOpen(false)}
            showCollapseToggle={false}
          />
        </SheetContent>
      </Sheet>

      <div className={cn("transition-all duration-300 print:ml-0", collapsed ? "lg:ml-16" : "lg:ml-60")}>
        <div className="print:hidden">
          <AppHeader onMenuClick={() => setMobileOpen(true)} />
        </div>
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
