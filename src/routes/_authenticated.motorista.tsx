import { createFileRoute, Outlet, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyRole } from "@/lib/auth.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/motorista")({
  ssr: false,
  component: MotoristaLayout,
});

function MotoristaLayout() {
  const navigate = useNavigate();
  const router = useRouter();
  const fetchRole = useServerFn(getMyRole);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    fetchRole().then(({ role }) => {
      if (role !== "motorista") {
        navigate({ to: role === "admin" ? "/admin" : "/auth", replace: true });
      } else setOk(true);
    });
  }, [fetchRole, navigate]);

  async function logout() {
    await supabase.auth.signOut();
    router.invalidate();
    navigate({ to: "/auth", replace: true });
  }

  if (!ok) return <div className="p-8 text-sm text-muted-foreground">Verificando acesso…</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h1 className="text-sm font-semibold">Central de Transfers</h1>
          <p className="text-xs text-muted-foreground">Portal do Motorista</p>
        </div>
        <Button variant="ghost" size="sm" onClick={logout}><LogOut size={14} className="mr-2" />Sair</Button>
      </header>
      <main className="p-4"><Outlet /></main>
    </div>
  );
}