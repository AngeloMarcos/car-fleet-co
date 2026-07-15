import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/")({
  ssr: false,
  component: () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do dia. Métricas detalhadas chegam na Etapa 2.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm">Fundação instalada</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Schema completo aplicado: user_roles, empresas, canais, categorias, fornecedores, pedidos, histórico + máquina de estados.
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Próximo passo</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Cadastre pelo menos uma categoria de veículo e um motorista em Motoristas, depois avance para a Etapa 2.
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Papéis</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Admins veem tudo; motoristas só veem os próprios pedidos (via RLS).
          </CardContent>
        </Card>
      </div>
    </div>
  ),
});