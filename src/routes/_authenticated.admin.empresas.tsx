import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/admin/empresas")({
  ssr: false,
  component: () => (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Empresas clientes</h1>
      <p className="text-sm text-muted-foreground">CRUD chega na Etapa 2.</p>
    </div>
  ),
});