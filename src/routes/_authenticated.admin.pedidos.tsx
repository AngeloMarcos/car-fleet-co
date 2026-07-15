import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/admin/pedidos")({
  ssr: false,
  component: () => <Placeholder titulo="Pedidos" />,
});
function Placeholder({ titulo }: { titulo: string }) {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">{titulo}</h1>
      <p className="text-sm text-muted-foreground">Tela completa chega na Etapa 2.</p>
    </div>
  );
}