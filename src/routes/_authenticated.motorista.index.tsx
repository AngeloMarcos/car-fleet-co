import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, formatDateTime, type PedidoStatus, type PedidoDirecao } from "@/lib/pedidos";

type Row = {
  id: number; cidade_atendimento: string; hotel: string | null;
  data_hora_encontro: string; direcao: PedidoDirecao; status: PedidoStatus;
};

export const Route = createFileRoute("/_authenticated/motorista/")({
  ssr: false,
  component: MotoristaHome,
});

function MotoristaHome() {
  const [hoje, setHoje] = useState<Row[]>([]);
  const [semana, setSemana] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      const start = new Date(); start.setHours(0,0,0,0);
      const endHoje = new Date(); endHoje.setHours(23,59,59,999);
      const in7 = new Date(); in7.setDate(in7.getDate() + 7); in7.setHours(23,59,59,999);

      const cols = "id,cidade_atendimento,hotel,data_hora_encontro,direcao,status";
      const { data: h } = await supabase.from("pedidos").select(cols)
        .gte("data_hora_encontro", start.toISOString()).lte("data_hora_encontro", endHoje.toISOString())
        .order("data_hora_encontro");
      const { data: s } = await supabase.from("pedidos").select(cols)
        .gt("data_hora_encontro", endHoje.toISOString()).lte("data_hora_encontro", in7.toISOString())
        .order("data_hora_encontro");
      setHoje((h as Row[]) ?? []); setSemana((s as Row[]) ?? []);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PedidoList titulo="Pedidos de hoje" rows={hoje} vazio="Nenhuma corrida para hoje." />
      <PedidoList titulo="Próximos 7 dias" rows={semana} vazio="Nada agendado para os próximos 7 dias." />
    </div>
  );
}

function PedidoList({ titulo, rows, vazio }: { titulo: string; rows: Row[]; vazio: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">{titulo}</CardTitle></CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? <div className="p-4 text-sm text-muted-foreground">{vazio}</div>
          : <ul className="divide-y">{rows.map((r) => (
            <li key={r.id} className="p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">{formatDateTime(r.data_hora_encontro)} · {r.direcao}</div>
                <div className="text-sm font-medium truncate">{r.cidade_atendimento}{r.hotel ? ` · ${r.hotel}` : ""}</div>
                <div className="mt-1"><StatusBadge status={r.status} /></div>
              </div>
              <Link to="/motorista/pedidos/$id" params={{ id: String(r.id) }}
                className="rounded border px-3 py-1 text-sm hover:bg-accent">Ver</Link>
            </li>
          ))}</ul>}
      </CardContent>
    </Card>
  );
}