import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import { InscricoesProvider } from "@/contexts/InscricoesContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import AlunosPage from "@/pages/AlunosPage";
import AlunoDetalhePage from "@/pages/AlunoDetalhePage";
import ExplicadoresPage from "@/pages/ExplicadoresPage";
import ExplicadorDetalhePage from "@/pages/ExplicadorDetalhePage";
import SalasPage from "@/pages/SalasPage";
import CalendarioPage from "@/pages/CalendarioPage";
import GestaoAlunoPage from "@/pages/GestaoAlunoPage";
import ConfiguracoesPage from "@/pages/ConfiguracoesPage";
import FaturacaoPage from "@/pages/FaturacaoPage";
import NotFound from "@/pages/NotFound";
import PortalLoginPage from "@/pages/portal/PortalLoginPage";
import PortalPage from "@/pages/portal/PortalPage";
import PortalExerciciosPage from "@/pages/portal/PortalExerciciosPage";
import PortalEvolucaoPage from "@/pages/portal/PortalEvolucaoPage";
import PortalLayout from "@/components/portal/PortalLayout";
import PortalProtectedRoute from "@/components/portal/PortalProtectedRoute";
import ServicosPage from "@/pages/ServicosPage";
import InscricaoPage from "@/pages/InscricaoPage";
import InscricoesPage from "@/pages/InscricoesPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <DataProvider>
          <InscricoesProvider>
            <Toaster />
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/inscricao" element={<InscricaoPage />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/alunos" element={<AlunosPage />} />
                  <Route path="/alunos/:id" element={<AlunoDetalhePage />} />
                  <Route path="/explicadores" element={<ExplicadoresPage />} />
                  <Route path="/explicadores/:id" element={<ExplicadorDetalhePage />} />
                  <Route path="/servicos" element={<ServicosPage />} />
                  <Route path="/salas" element={<SalasPage />} />
                  <Route path="/calendario" element={<CalendarioPage />} />
                  <Route path="/gestao-aluno" element={<GestaoAlunoPage />} />
                  {/* Backwards-compat: old /presencas route redirects */}
                  <Route path="/presencas" element={<Navigate to="/gestao-aluno" replace />} />
                  <Route path="/inscricoes" element={<InscricoesPage />} />
                  <Route path="/configuracoes" element={<ConfiguracoesPage />} />
                  <Route path="/faturacao" element={<FaturacaoPage />} />
                </Route>
                <Route path="/portal/login" element={<PortalLoginPage />} />
                <Route element={<PortalProtectedRoute><PortalLayout /></PortalProtectedRoute>}>
                  <Route path="/portal" element={<PortalPage />} />
                  <Route path="/portal/exercicios" element={<PortalExerciciosPage />} />
                  <Route path="/portal/evolucao" element={<PortalEvolucaoPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </InscricoesProvider>
        </DataProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
