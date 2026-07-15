import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(8),
  telefone: z.string().optional().default(""),
  cidade_atuacao: z.string().min(1),
  regiao_atuacao: z.string().optional().default(""),
  categoria_veiculo_id: z.string().uuid().nullable().optional(),
  observacoes_internas: z.string().optional().default(""),
});

export const createMotorista = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createSchema.parse(data))
  .handler(async ({ data, context }) => {
    // Verify admin
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!roles?.some((r) => r.role === "admin")) {
      throw new Error("Apenas admins podem criar motoristas.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Create auth user
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.senha,
      email_confirm: true,
      user_metadata: { nome: data.nome },
    });
    if (createErr || !created.user) {
      throw new Error(`Falha ao criar usuário: ${createErr?.message ?? "erro"}`);
    }

    const userId = created.user.id;

    // Assign motorista role
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "motorista" });
    if (roleErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(`Falha ao atribuir papel: ${roleErr.message}`);
    }

    // Create fornecedor row
    const { data: fornecedor, error: fornErr } = await supabaseAdmin
      .from("fornecedores")
      .insert({
        user_id: userId,
        nome: data.nome,
        email: data.email,
        telefone: data.telefone || null,
        cidade_atuacao: data.cidade_atuacao,
        regiao_atuacao: data.regiao_atuacao || null,
        categoria_veiculo_id: data.categoria_veiculo_id || null,
        observacoes_internas: data.observacoes_internas || null,
      })
      .select()
      .single();
    if (fornErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(`Falha ao criar fornecedor: ${fornErr.message}`);
    }

    return { userId, fornecedor };
  });

export const promoteToAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ email: z.string().email() }).parse(data))
  .handler(async ({ data, context }) => {
    // Only allow if caller is already admin OR if there are no admins yet (bootstrap).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");

    const { data: myRoles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const isAdmin = myRoles?.some((r) => r.role === "admin");

    if (!isAdmin && (count ?? 0) > 0) {
      throw new Error("Apenas admins podem promover outros usuários.");
    }

    // Find target user by email
    const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listErr) throw new Error(listErr.message);
    const target = list.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
    if (!target) throw new Error("Usuário não encontrado. Faça login pelo menos uma vez com esse e-mail primeiro.");

    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: target.id, role: "admin" }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);

    return { ok: true, userId: target.id };
  });