import { Settings } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Configurações</h1>
      <Card>
        <CardContent className="py-16 text-center">
          <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium">Página de configurações</p>
          <p className="text-muted-foreground mt-1">Funcionalidade disponível em breve</p>
        </CardContent>
      </Card>
    </div>
  );
}
