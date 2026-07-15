import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { STATUS_LABEL, STATUS_OPTIONS, StatusBadge, formatDateTime, type PedidoStatus, type PedidoDirecao } from "@/lib/pedidos";

type Pedido = {
  id: number;
  codigo_reserva_canal: string | null;
  empresa_cliente_id: string | null;
  canal_venda_id: string | null;
  cidade_atendimento: string;
  hotel: string | null;
  data_hora_encontro: string;
  data_emissao: string;
  data_alteracao: string;
  direcao: PedidoDirecao;
  passageiro_nome: string;
  fornecedor_id: string | null;
  status: PedidoStatus;
  empresas_clientes: { nome: string } | null;
  canais_venda: { nome: string } | null;
  fornecedores: { nome: string } | null;
};

type Lookup = { id: string; nome: string };

export const Route = createFileRoute("/_authenticated/admin/pedidos")({
  ssr: false,
  component: PedidosPage,
});

function PedidosPage() {
  const [rows, setRows] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [empresas, setEmpresas] = useState<Lookup[]>([]);
  const [canais, setCanais] = useState<Lookup[]>([]);
  const [fornecedores, setFornecedores] = useState<(Lookup & { cidade_atuacao: string })[]>([]);
  const [categorias, setCategorias] = useState<Lookup[]>([]);

  const [f, setF] = useState({
    codigo: "", canal: "any", tipoData: "atividade" as "atividade" | "emissao" | "alteracao",
    de: "", ate: "", status: "any", empresa: "any", fornecedor: "any", direcao: "any", passageiro: "", cidade: "",
  });

  const [openNew, setOpenNew] = useState(false);

  async function loadLookups() {
    const [e, c, fo, ca] = await Promise.all([
      supabase.from("empresas_clientes").select("id,nome").eq("ativo", true).order("nome"),
      supabase.from("canais_venda").select("id,nome").eq("ativo", true).order("nome"),
      supabase.from("fornecedores").select("id,nome,cidade_atuacao").eq("ativo", true).order("nome"),
      supabase.from("categorias_veiculo").select("id,nome").eq("ativo", true).order("nome"),
    ]);
    setEmpresas((e.data as Lookup[]) ?? []);
    setCanais((c.data as Lookup[]) ?? []);
    setFornecedores((fo.data as any) ?? []);
    setCategorias((ca.data as Lookup[]) ?? []);
  }

  async function load() {
    setLoading(true);
    let q = supabase.from("pedidos").select(`
      id, codigo_reserva_canal, empresa_cliente_id, canal_venda_id, cidade_atendimento, hotel,
      data_hora_encontro, data_emissao, data_alteracao, direcao, passageiro_nome, fornecedor_id, status,
      empresas_clientes(nome), canais_venda(nome), fornecedores(nome)
    `).order("data_hora_encontro", { ascending: false }).limit(500);

    if (f.codigo) q = q.ilike("codigo_reserva_canal", `%${f.codigo}%`);
    if (f.canal !== "any") q = q.eq("canal_venda_id", f.canal);
    if (f.status !== "any") q = q.eq("status", f.status as PedidoStatus);
    if (f.empresa !== "any") q = q.eq("empresa_cliente_id", f.empresa);
    if (f.fornecedor !== "any") {
      if (f.fornecedor === "none") q = q.is("fornecedor_id", null);
      else q = q.eq("fornecedor_id", f.fornecedor);
    }
    if (f.direcao !== "any") q = q.eq("direcao", f.direcao as PedidoDirecao);
    if (f.passageiro) q = q.ilike("passageiro_nome", `%${f.passageiro}%`);
    if (f.cidade) q = q.ilike("cidade_atendimento", `%${f.cidade}%`);
    if (f.de || f.ate) {
      const col = f.tipoData === "atividade" ? "data_hora_encontro" : f.tipoData === "emissao" ? "data_emissao" : "data_alteracao";
      if (f.de) q = q.gte(col, new Date(f.de).toISOString());
      if (f.ate) { const d = new Date(f.ate); d.setHours(23,59,59,999); q = q.lte(col, d.toISOString()); }
    }

    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows((data as any) ?? []); setLoading(false);
  }

  useEffect(() => { loadLookups(); }, []);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  function exportCSV() {
    const header = ["id","codigo","canal","empresa","cidade","hotel","direcao","passageiro","data_encontro","status","motorista"];
    const lines = rows.map((r) => [
      r.id, r.codigo_reserva_canal ?? "", r.canais_venda?.nome ?? "", r.empresas_clientes?.nome ?? "",
      r.cidade_atendimento, r.hotel ?? "", r.direcao, r.passageiro_nome,
      new Date(r.data_hora_encontro).toISOString(), STATUS_LABEL[r.status], r.fornecedores?.nome ?? "",
    ]);
    const csv = [header, ...lines].map((row) => row.map((v) => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `pedidos-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const canFilter = useMemo(() => empresas.length + canais.length + fornecedores.length > 0, [empresas, canais, fornecedores]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Pedidos</h1>
          <p className="text-sm text-muted-foreground">Todas as corridas do sistema.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}>Exportar CSV</Button>
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild><Button>Novo pedido</Button></DialogTrigger>
            <NovoPedidoDialog empresas={empresas} canais={canais} categorias={categorias} onDone={() => { setOpenNew(false); load(); }} />
          </Dialog>
        </div>
      </div>

      <div className="rounded border bg-background p-4 grid gap-3 md:grid-cols-6 text-sm">
        <FilterInput label="Código" value={f.codigo} onChange={(v) => setF({ ...f, codigo: v })} />
        <FilterInput label="Passageiro" value={f.passageiro} onChange={(v) => setF({ ...f, passageiro: v })} />
        <FilterInput label="Cidade" value={f.cidade} onChange={(v) => setF({ ...f, cidade: v })} />
        <FilterSelect label="Direção" value={f.direcao} onChange={(v) => setF({ ...f, direcao: v })}
          options={[{ v: "any", l: "Todas" }, { v: "IN", l: "IN" }, { v: "OUT", l: "OUT" }]} />
        <FilterSelect label="Status" value={f.status} onChange={(v) => setF({ ...f, status: v })}
          options={[{ v: "any", l: "Todos" }, ...STATUS_OPTIONS.map(s => ({ v: s, l: STATUS_LABEL[s] }))]} />
        <FilterSelect label="Canal" value={f.canal} onChange={(v) => setF({ ...f, canal: v })}
          options={[{ v: "any", l: "Todos" }, ...canais.map(c => ({ v: c.id, l: c.nome }))]} />
        <FilterSelect label="Empresa" value={f.empresa} onChange={(v) => setF({ ...f, empresa: v })}
          options={[{ v: "any", l: "Todas" }, ...empresas.map(c => ({ v: c.id, l: c.nome }))]} />
        <FilterSelect label="Motorista" value={f.fornecedor} onChange={(v) => setF({ ...f, fornecedor: v })}
          options={[{ v: "any", l: "Todos" }, { v: "none", l: "Sem motorista" }, ...fornecedores.map(c => ({ v: c.id, l: c.nome }))]} />
        <FilterSelect label="Tipo de data" value={f.tipoData} onChange={(v) => setF({ ...f, tipoData: v as any })}
          options={[{ v: "atividade", l: "Atividade" }, { v: "emissao", l: "Emissão" }, { v: "alteracao", l: "Alteração" }]} />
        <FilterInput label="De" type="date" value={f.de} onChange={(v) => setF({ ...f, de: v })} />
        <FilterInput label="Até" type="date" value={f.ate} onChange={(v) => setF({ ...f, ate: v })} />
        <div className="flex items-end"><Button className="w-full" onClick={load} disabled={!canFilter && loading}>Filtrar</Button></div>
      </div>

      <div className="rounded border bg-background overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>#</TableHead><TableHead>Código</TableHead><TableHead>Data</TableHead>
            <TableHead>Cidade</TableHead><TableHead>Passageiro</TableHead><TableHead>Dir.</TableHead>
            <TableHead>Canal</TableHead><TableHead>Motorista</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={10} className="text-center text-sm text-muted-foreground">Carregando…</TableCell></TableRow>
              : rows.length === 0 ? <TableRow><TableCell colSpan={10} className="text-center text-sm text-muted-foreground">Nenhum pedido encontrado.</TableCell></TableRow>
              : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>{r.codigo_reserva_canal ?? "—"}</TableCell>
                  <TableCell>{formatDateTime(r.data_hora_encontro)}</TableCell>
                  <TableCell>{r.cidade_atendimento}</TableCell>
                  <TableCell className="max-w-40 truncate">{r.passageiro_nome}</TableCell>
                  <TableCell>{r.direcao}</TableCell>
                  <TableCell>{r.canais_venda?.nome ?? "—"}</TableCell>
                  <TableCell>{r.fornecedores?.nome ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-right"><Button asChild size="sm" variant="outline"><Link to="/admin/pedidos/$id" params={{ id: String(r.id) }}>Abrir</Link></Button></TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function FilterInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (<div className="space-y-1"><Label className="text-xs">{label}</Label><Input type={type} value={value} onChange={(e) => onChange(e.target.value)} /></div>);
}
function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (<div className="space-y-1"><Label className="text-xs">{label}</Label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>{options.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
    </Select>
  </div>);
}

function NovoPedidoDialog({ empresas, canais, categorias, onDone }: {
  empresas: Lookup[]; canais: Lookup[]; categorias: Lookup[]; onDone: () => void;
}) {
  const [form, setForm] = useState({
    codigo_reserva_canal: "", empresa_cliente_id: "", canal_venda_id: "",
    cidade_atendimento: "", hotel: "", data_hora_encontro: "", direcao: "IN" as PedidoDirecao,
    passageiro_nome: "", passageiro_telefone: "", ponto_partida: "", ponto_chegada: "",
    numero_voo: "", categoria_veiculo_id: "", observacoes_internas: "",
  });
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const payload: any = { ...form };
    ["empresa_cliente_id","canal_venda_id","categoria_veiculo_id","hotel","passageiro_telefone","ponto_partida","ponto_chegada","numero_voo","observacoes_internas","codigo_reserva_canal"]
      .forEach((k) => { if (!payload[k]) payload[k] = null; });
    payload.data_hora_encontro = new Date(form.data_hora_encontro).toISOString();
    const { error } = await supabase.from("pedidos").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Pedido criado."); onDone();
  }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>Novo pedido</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="grid grid-cols-2 gap-3 text-sm">
        <div><Label>Código reserva canal</Label><Input value={form.codigo_reserva_canal} onChange={(e) => setForm({ ...form, codigo_reserva_canal: e.target.value })} /></div>
        <div><Label>Passageiro *</Label><Input required value={form.passageiro_nome} onChange={(e) => setForm({ ...form, passageiro_nome: e.target.value })} /></div>
        <div><Label>Telefone passageiro</Label><Input value={form.passageiro_telefone} onChange={(e) => setForm({ ...form, passageiro_telefone: e.target.value })} /></div>
        <div><Label>Cidade *</Label><Input required value={form.cidade_atendimento} onChange={(e) => setForm({ ...form, cidade_atendimento: e.target.value })} /></div>
        <div><Label>Hotel</Label><Input value={form.hotel} onChange={(e) => setForm({ ...form, hotel: e.target.value })} /></div>
        <div><Label>Data/hora encontro *</Label><Input required type="datetime-local" value={form.data_hora_encontro} onChange={(e) => setForm({ ...form, data_hora_encontro: e.target.value })} /></div>
        <div><Label>Direção *</Label>
          <Select value={form.direcao} onValueChange={(v) => setForm({ ...form, direcao: v as PedidoDirecao })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="IN">IN (chegada)</SelectItem><SelectItem value="OUT">OUT (partida)</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>Nº voo</Label><Input value={form.numero_voo} onChange={(e) => setForm({ ...form, numero_voo: e.target.value })} /></div>
        <div><Label>Ponto partida</Label><Input value={form.ponto_partida} onChange={(e) => setForm({ ...form, ponto_partida: e.target.value })} /></div>
        <div><Label>Ponto chegada</Label><Input value={form.ponto_chegada} onChange={(e) => setForm({ ...form, ponto_chegada: e.target.value })} /></div>
        <div><Label>Empresa</Label>
          <Select value={form.empresa_cliente_id} onValueChange={(v) => setForm({ ...form, empresa_cliente_id: v })}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{empresas.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Canal</Label>
          <Select value={form.canal_venda_id} onValueChange={(v) => setForm({ ...form, canal_venda_id: v })}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{canais.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Categoria</Label>
          <Select value={form.categoria_veiculo_id} onValueChange={(v) => setForm({ ...form, categoria_veiculo_id: v })}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>{categorias.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="col-span-2"><Label>Observações internas</Label><Textarea value={form.observacoes_internas} onChange={(e) => setForm({ ...form, observacoes_internas: e.target.value })} /></div>
        <DialogFooter className="col-span-2"><Button type="submit" disabled={busy}>{busy ? "Salvando…" : "Criar pedido"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}