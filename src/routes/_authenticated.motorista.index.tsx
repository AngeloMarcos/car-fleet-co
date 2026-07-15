import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/motorista/")({
  ssr: false,
  component: () => (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Meus pedidos</h1>
        <p className="text-sm text-muted-foreground">Dashboard chega na Etapa 3 — hoje e próximos 7 dias.</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm">Acesso ativo</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Seu login está funcionando. Quando um pedido for atribuído a você, ele aparece aqui.
        </CardContent>
      </Card>
    </div>
  ),
});