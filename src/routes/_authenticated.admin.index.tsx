import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUS_LABEL, StatusBadge, formatDateTime, type PedidoStatus } from "@/lib/pedidos";

export const Route = createFileRoute("/_authenticated/admin/")({
  ssr: false,
  component: Dashboard,
});

function Dashboard() {
  const [porStatus, setPorStatus] = useState<Record<string, number>>({});
  const [hoje, setHoje] = useState<any[]>([]);
  const [semMot, setSemMot] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: all } = await supabase.from("pedidos").select("status");
      const counts: Record<string, number> = {};
      (all ?? []).forEach((r: any) => { counts[r.status] = (counts[r.status] ?? 0) + 1; });
      setPorStatus(counts);

      const start = new Date(); start.setHours(0,0,0,0);
      const end = new Date(); end.setHours(23,59,59,999);
      const { data: h } = await supabase.from("pedidos").select("id,passageiro_nome,cidade_atendimento,data_hora_encontro,status,direcao")
        .gte("data_hora_encontro", start.toISOString()).lte("data_hora_encontro", end.toISOString()).order("data_hora_encontro");
      setHoje(h ?? []);

      const { data: sm } = await supabase.from("pedidos").select("id,passageiro_nome,cidade_atendimento,data_hora_encontro,status")
        .is("fornecedor_id", null).order("data_hora_encontro", { ascending: false }).limit(20);
      setSemMot(sm ?? []);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão operacional em tempo real.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        {(Object.keys(STATUS_LABEL) as PedidoStatus[]).map((s) => (
          <Card key={s}>
            <CardHeader className="pb-2"><CardTitle className="text-xs font-normal text-muted-foreground">{STATUS_LABEL[s]}</CardTitle></CardHeader>
            <CardContent className="pt-0"><div className="text-2xl font-semibold">{porStatus[s] ?? 0}</div></CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Pedidos de hoje</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {hoje.length === 0 ? <div className="text-muted-foreground">Nenhum pedido para hoje.</div>
              : <ul className="divide-y">{hoje.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2">
                  <Link to="/admin/pedidos/$id" params={{ id: String(p.id) }} className="underline">
                    {formatDateTime(p.data_hora_encontro)} · {p.cidade_atendimento} · {p.passageiro_nome} · {p.direcao}
                  </Link>
                  <StatusBadge status={p.status} />
                </li>
              ))}</ul>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Sem motorista atribuído</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {semMot.length === 0 ? <div className="text-muted-foreground">Todos os pedidos têm motorista.</div>
              : <ul className="divide-y">{semMot.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2">
                  <Link to="/admin/pedidos/$id" params={{ id: String(p.id) }} className="underline">
                    #{p.id} · {formatDateTime(p.data_hora_encontro)} · {p.cidade_atendimento} · {p.passageiro_nome}
                  </Link>
                  <StatusBadge status={p.status} />
                </li>
              ))}</ul>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}