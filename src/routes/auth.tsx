import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { promoteToAdmin } from "@/lib/motoristas.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Entrar — Central de Transfers" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const promote = useServerFn(promoteToAdmin);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [tab, setTab] = useState<"login" | "bootstrap">("login");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setLoading(false);
    if (error) setErr(error.message);
    else navigate({ to: "/", replace: true });
  }

  async function handleBootstrap(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    setLoading(true);
    try {
      // 1) Sign up if needed
      const { error: signUpErr } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { emailRedirectTo: window.location.origin },
      });
      if (signUpErr && !/already/i.test(signUpErr.message)) throw signUpErr;
      // 2) Sign in
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (signInErr) throw signInErr;
      // 3) Try promoting to admin (works only if there are zero admins yet)
      await promote({ data: { email } });
      setInfo("Você foi promovido a admin. Redirecionando…");
      setTimeout(() => navigate({ to: "/", replace: true }), 800);
    } catch (e: any) {
      setErr(e?.message ?? "Erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Central de Transfers</CardTitle>
          <CardDescription>Acesso interno — despachantes e motoristas parceiros.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="bootstrap">Primeiro admin</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="mt-4 space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="senha">Senha</Label>
                  <Input id="senha" type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
                </div>
                {err && <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Entrando…" : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="bootstrap">
              <form onSubmit={handleBootstrap} className="mt-4 space-y-4">
                <Alert>
                  <AlertDescription className="text-xs">
                    Use apenas na primeira configuração do sistema. Cria uma conta e promove a admin — só funciona se ainda não existir nenhum admin.
                  </AlertDescription>
                </Alert>
                <div className="space-y-1">
                  <Label htmlFor="bs-email">E-mail do admin</Label>
                  <Input id="bs-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="bs-senha">Senha (mín. 8)</Label>
                  <Input id="bs-senha" type="password" required minLength={8} value={senha} onChange={(e) => setSenha(e.target.value)} />
                </div>
                {err && <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert>}
                {info && <Alert><AlertDescription>{info}</AlertDescription></Alert>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Criando…" : "Criar e promover"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );
}