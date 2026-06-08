import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import { InscricoesProvider } from "@/contexts/InscricoesContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import SetPasswordPage from "@/pages/SetPasswordPage";
import OnboardingPage from "@/pages/OnboardingPage";
import DashboardPage from "@/pages/DashboardPage";
import AlunosPage from "@/pages/AlunosPage";
import AlunoDetalhePage from "@/pages/AlunoDetalhePage";
import ExplicadoresPage from "@/pages/ExplicadoresPage";
import ExplicadorDetalhePage from "@/pages/ExplicadorDetalhePage";
import SalasPage from "@/pages/SalasPage";
import CalendarioPage from "@/pages/CalendarioPage";
import PresencasPage from "@/pages/PresencasPage";
import ConfiguracoesPage from "@/pages/ConfiguracoesPage";
import ConfiguracoesPerfilPage from "@/pages/ConfiguracoesPerfilPage";
import ConfiguracoesCentroPage from "@/pages/ConfiguracoesCentroPage";
import DefinicoesBasicasPage from "@/pages/DefinicoesBasicasPage";
import ConfiguracoesPersonalizacaoPage from "@/pages/ConfiguracoesPersonalizacaoPage";
import FaturacaoPage from "@/pages/FaturacaoPage";
import NotFound from "@/pages/NotFound";
import DisciplinasPage from "@/pages/DisciplinasPage";
import DisciplinaDetalhePage from "@/pages/DisciplinaDetalhePage";

// NOTE: The following pages are intentionally not routed (feature disabled),
// but their source files are preserved for future re-enablement:
// - src/pages/GestaoAlunoPage.tsx
// - src/pages/InscricaoPage.tsx
// - src/pages/InscricoesPage.tsx
// - src/pages/portal/* (Portal do Encarregado)

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <DataProvider>
          <InscricoesProvider>
            <Toaster />
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/set-password" element={<SetPasswordPage />} />
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  {/* admin only */}
                  <Route element={<ProtectedRoute allowedRoles={["admin"]}><Outlet /></ProtectedRoute>}>
                    <Route path="/disciplinas" element={<DisciplinasPage />} />
                    <Route path="/disciplinas/:id" element={<DisciplinaDetalhePage />} />
                    <Route path="/faturacao" element={<FaturacaoPage />} />
                    <Route path="/configuracoes/centro" element={<ConfiguracoesCentroPage />} />
                    <Route path="/configuracoes/personalizacao" element={<ConfiguracoesPersonalizacaoPage />} />
                  </Route>
                  {/* admin + rececionista */}
                  <Route element={<ProtectedRoute allowedRoles={["admin", "rececionista"]}><Outlet /></ProtectedRoute>}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/configuracoes/definicoes" element={<DefinicoesBasicasPage />} />
                    <Route path="/alunos" element={<AlunosPage />} />
                    <Route path="/alunos/:id" element={<AlunoDetalhePage />} />
                    <Route path="/explicadores" element={<ExplicadoresPage />} />
                    <Route path="/explicadores/:id" element={<ExplicadorDetalhePage />} />
                    <Route path="/salas" element={<SalasPage />} />
                  </Route>
                  {/* all roles */}
                  <Route path="/calendario" element={<CalendarioPage />} />
                  <Route path="/presencas" element={<PresencasPage />} />
                  <Route path="/configuracoes" element={<ConfiguracoesPage />} />
                  <Route path="/configuracoes/perfil" element={<ConfiguracoesPerfilPage />} />
                  {/* Disabled routes — redirect to dashboard */}
                  <Route path="/gestao-aluno" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/inscricoes" element={<Navigate to="/dashboard" replace />} />
                </Route>
                {/* Disabled public routes */}
                <Route path="/inscricao" element={<Navigate to="/login" replace />} />
                <Route path="/portal/*" element={<Navigate to="/login" replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </InscricoesProvider>
        </DataProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
