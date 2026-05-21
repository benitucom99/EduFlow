import { useState } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import AppHeader from "@/components/AppHeader";
import { cn } from "@/lib/utils";

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <div className="print:hidden">
        <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>
      <div className={cn("transition-all duration-300 print:ml-0", collapsed ? "ml-16" : "ml-60")}>
        <div className="print:hidden">
          <AppHeader />
        </div>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
