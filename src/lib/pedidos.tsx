import { supabase } from "@/integrations/supabase/client";

export type PedidoStatus =
  | "pendente_liberacao"
  | "venda_cancelada"
  | "liberada_rede"
  | "motorista_atribuido"
  | "aguardando_aceite_rede"
  | "aceita_motorista"
  | "em_atendimento"
  | "corrida_finalizada"
  | "no_show_driver"
  | "no_show_pax";

export type PedidoDirecao = "IN" | "OUT";

export const STATUS_LABEL: Record<PedidoStatus, string> = {
  pendente_liberacao: "Pendente liberação",
  venda_cancelada: "Venda cancelada",
  liberada_rede: "Liberada para rede",
  motorista_atribuido: "Motorista atribuído",
  aguardando_aceite_rede: "Aguardando aceite",
  aceita_motorista: "Aceita pelo motorista",
  em_atendimento: "Em atendimento",
  corrida_finalizada: "Finalizada",
  no_show_driver: "No-show motorista",
  no_show_pax: "No-show passageiro",
};

export const STATUS_TONE: Record<PedidoStatus, string> = {
  pendente_liberacao: "bg-amber-100 text-amber-900",
  venda_cancelada: "bg-neutral-200 text-neutral-700",
  liberada_rede: "bg-blue-100 text-blue-900",
  motorista_atribuido: "bg-indigo-100 text-indigo-900",
  aguardando_aceite_rede: "bg-orange-100 text-orange-900",
  aceita_motorista: "bg-emerald-100 text-emerald-900",
  em_atendimento: "bg-violet-100 text-violet-900",
  corrida_finalizada: "bg-green-100 text-green-900",
  no_show_driver: "bg-red-100 text-red-900",
  no_show_pax: "bg-red-100 text-red-900",
};

export const STATUS_OPTIONS: PedidoStatus[] = [
  "pendente_liberacao",
  "liberada_rede",
  "motorista_atribuido",
  "aguardando_aceite_rede",
  "aceita_motorista",
  "em_atendimento",
  "corrida_finalizada",
  "no_show_driver",
  "no_show_pax",
  "venda_cancelada",
];

/** Retorna transições permitidas a partir do status atual, dado o papel. */
export function transicoesPermitidas(
  atual: PedidoStatus,
  role: "admin" | "motorista",
): PedidoStatus[] {
  const out: PedidoStatus[] = [];
  const isAdmin = role === "admin";
  if (isAdmin && !["corrida_finalizada", "no_show_driver", "no_show_pax"].includes(atual))
    out.push("venda_cancelada");
  if (isAdmin && atual === "pendente_liberacao") out.push("liberada_rede");
  if (isAdmin && atual === "liberada_rede") out.push("motorista_atribuido", "aguardando_aceite_rede");
  if (["motorista_atribuido", "aguardando_aceite_rede"].includes(atual)) out.push("aceita_motorista");
  if (atual === "aceita_motorista") out.push("em_atendimento");
  if (atual === "em_atendimento") out.push("corrida_finalizada", "no_show_driver", "no_show_pax");
  return out;
}

export async function transicionarStatus(pedidoId: number, novo: PedidoStatus) {
  const { data, error } = await supabase.rpc("fn_transicionar_status", {
    _pedido_id: pedidoId,
    _novo_status: novo,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function atribuirMotorista(pedidoId: number, fornecedorId: string) {
  const { data, error } = await supabase.rpc("fn_atribuir_motorista", {
    _pedido_id: pedidoId,
    _fornecedor_id: fornecedorId,
  });
  if (error) throw new Error(error.message);
  return data;
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function StatusBadge({ status }: { status: PedidoStatus }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_TONE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}