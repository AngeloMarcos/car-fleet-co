import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/admin/categorias")({
  ssr: false,
  component: () => (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Categorias de veículo</h1>
      <p className="text-sm text-muted-foreground">CRUD chega na Etapa 2.</p>
    </div>
  ),
});