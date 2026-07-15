import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type Row = { id: string; nome: string; documento: string | null; email_contato: string | null; telefone_contato: string | null; ativo: boolean };

export const Route = createFileRoute("/_authenticated/admin/empresas")({
  ssr: false,
  component: EmpresasPage,
});

function EmpresasPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Row | null>(null);
  const [form, setForm] = useState({ nome: "", documento: "", email_contato: "", telefone_contato: "" });

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("empresas_clientes").select("*").order("nome");
    if (error) toast.error(error.message);
    setRows((data as Row[]) ?? []); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() { setEdit(null); setForm({ nome: "", documento: "", email_contato: "", telefone_contato: "" }); setOpen(true); }
  function openEdit(r: Row) { setEdit(r); setForm({ nome: r.nome, documento: r.documento ?? "", email_contato: r.email_contato ?? "", telefone_contato: r.telefone_contato ?? "" }); setOpen(true); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload = { nome: form.nome, documento: form.documento || null, email_contato: form.email_contato || null, telefone_contato: form.telefone_contato || null };
    const { error } = edit
      ? await supabase.from("empresas_clientes").update(payload).eq("id", edit.id)
      : await supabase.from("empresas_clientes").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(edit ? "Empresa atualizada." : "Empresa criada.");
    setOpen(false); load();
  }

  async function toggle(r: Row) {
    const { error } = await supabase.from("empresas_clientes").update({ ativo: !r.ativo }).eq("id", r.id);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Empresas clientes</h1>
          <p className="text-sm text-muted-foreground">Agências, OTAs e clientes B2B.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew}>Nova empresa</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{edit ? "Editar empresa" : "Nova empresa"}</DialogTitle></DialogHeader>
            <form onSubmit={save} className="space-y-3">
              <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
              <div><Label>Documento (CNPJ)</Label><Input value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} /></div>
              <div><Label>E-mail de contato</Label><Input type="email" value={form.email_contato} onChange={(e) => setForm({ ...form, email_contato: e.target.value })} /></div>
              <div><Label>Telefone</Label><Input value={form.telefone_contato} onChange={(e) => setForm({ ...form, telefone_contato: e.target.value })} /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded border bg-background">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Nome</TableHead><TableHead>Documento</TableHead><TableHead>E-mail</TableHead><TableHead>Telefone</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Carregando…</TableCell></TableRow>
              : rows.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Nenhuma empresa cadastrada.</TableCell></TableRow>
              : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nome}</TableCell>
                  <TableCell>{r.documento ?? "—"}</TableCell>
                  <TableCell>{r.email_contato ?? "—"}</TableCell>
                  <TableCell>{r.telefone_contato ?? "—"}</TableCell>
                  <TableCell>{r.ativo ? "Ativa" : "Inativa"}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(r)}>Editar</Button>
                    <Button size="sm" variant="ghost" onClick={() => toggle(r)}>{r.ativo ? "Inativar" : "Ativar"}</Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}