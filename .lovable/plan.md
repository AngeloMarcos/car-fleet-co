## Visão geral

MVP de despachante B2B de transfers, substituindo o "Sou Motorista". Dois papéis (Admin/Despachante e Motorista), schema portável para Postgres self-hosted no futuro, RLS nativa, lógica de estados em função SQL, vouchers em PDF client-side. Sem integrações externas nem notificações automáticas nesta fase — mas o schema já reserva os campos.

**Stack:** Lovable Cloud (Supabase) durante o dev, usando apenas recursos padrão do Postgres + Supabase Auth (isolado do domínio via `user_id`). TanStack Start + React no frontend. Sem Edge Functions, sem Supabase Storage.

## Etapas de entrega

Vou dividir em 4 etapas e parar ao final de cada uma para você validar antes de seguir.

### Etapa 1 — Fundação: schema + auth + roles (PARAR AQUI para revisão)

**Habilitar Lovable Cloud** (necessário para ter Postgres + Auth).

**Migrations SQL** (uma migration por mudança lógica, versionadas — reaproveitáveis no VPS):

1. `001_enum_e_helpers` — cria tipo `app_role` (`admin`, `motorista`) e função trigger genérica `set_updated_at()`.
2. `002_user_roles` — tabela `user_roles(user_id, role)` + função `has_role(uuid, app_role) SECURITY DEFINER` (padrão anti-recursão em RLS).
3. `003_categorias_veiculo`
4. `004_empresas_clientes`
5. `005_canais_venda`
6. `006_fornecedores` (com FK opcional `user_id → auth.users`)
7. `007_pedidos` — inclui todos os campos listados, `id BIGSERIAL`, CHECK constraints para `direcao` e `status`, `data_alteracao` via trigger.
8. `008_pedidos_historico` — auditoria.
9. `009_indices` — índices em `fornecedor_id`, `status`, `data_hora_encontro`, `empresa_cliente_id`, `canal_venda_id`, composto `(status, data_hora_encontro)`.
10. `010_fn_transicionar_status` — função SQL `fn_transicionar_status(pedido_id, novo_status, ator)` que valida a matriz de transições, faz UPDATE e insere em `pedidos_historico` atomicamente. Toda mudança de status no app passa por essa função.
11. `011_grants_e_rls` — GRANTs para `authenticated`/`service_role` em cada tabela + `ENABLE RLS` + policies:
    - Admin: `has_role(auth.uid(), 'admin')` → tudo em todas as tabelas.
    - Motorista: SELECT em `pedidos` onde `fornecedor_id = (SELECT id FROM fornecedores WHERE user_id = auth.uid())`; UPDATE restrito aos campos `observacao_motorista` e transições via função (WITH CHECK).
    - Cadastros auxiliares (empresas, canais, categorias, fornecedores): SELECT para motorista apenas do necessário (ex.: própria linha em `fornecedores`); escrita só admin.

**Auth & redirecionamento:**
- Login por e-mail/senha via Supabase Auth (sem tela pública de signup).
- Após login, ler `user_roles` e redirecionar para `/admin` ou `/motorista`.
- Rotas protegidas via layout `_authenticated/` gerenciado pela integração; gates adicionais `_authenticated/_admin` e `_authenticated/_motorista` usando `has_role`.

**Criação de motoristas:** tela admin que chama uma server function (`createServerFn` com `requireSupabaseAuth` + checagem de admin) que usa `supabaseAdmin` para `auth.admin.createUser` e insere linhas em `user_roles` e `fornecedores` (linkando `user_id`).

### Etapa 2 — Painel Admin

- **Cadastros auxiliares (CRUD):** empresas_clientes, canais_venda, categorias_veiculo, fornecedores (com opção "gerar acesso" que cria o user).
- **Pedidos — listagem** com filtros: código interno, `codigo_reserva_canal`, canal, tipo de data (atividade=`data_hora_encontro` / emissão=`data_emissao` / alteração=`data_alteracao`), intervalo de datas, status (multi), empresa, fornecedor, direção IN/OUT, nome do passageiro, cidade. Paginação server-side.
- **Pedidos — criar/editar** manualmente (form completo).
- **Ação atribuir/reatribuir motorista:** lista de fornecedores ativos, sugere primeiro os com `cidade_atuacao = pedido.cidade_atendimento` mas permite escolher qualquer um.
- **Ação mudar status:** chama `fn_transicionar_status`; UI oferece apenas transições válidas.
- **Exportar CSV** client-side da listagem filtrada.
- **Dashboard:** contagens por status, pedidos de hoje, pedidos sem motorista.

### Etapa 3 — Portal do Motorista

- **Dashboard mobile-first:** duas seções — "Hoje" e "Próximos 7 dias" — cards com botão "Ver".
- **Pesquisar pedidos:** mesma UI de filtros (subset relevante), sempre limitado por RLS aos pedidos do próprio motorista.
- **Detalhe do pedido:**
  - Aceitar corrida (transição via `fn_transicionar_status`).
  - Marcar em atendimento / finalizada / no-show pax / no-show driver.
  - Campo `observacao_motorista` editável.
  - Imprimir voucher (CSS print) + gerar PDF client-side (`jspdf` + `jspdf-autotable`) com dados do pedido.
- **Perfil:** nome, e-mail, troca de senha (`supabase.auth.updateUser`).

### Etapa 4 — Polimento

- Histórico de status visível na tela do pedido (admin).
- Validações de formulário coerentes com CHECKs do banco.
- Empty states, loading states, mensagens de erro amigáveis.
- SEO/head metadata das rotas principais.

## Detalhes técnicos

- **Portabilidade:** todo SQL escrito em Postgres padrão. `auth.uid()` é a única referência ao schema auth do Supabase; para trocar de provedor no VPS, basta reimplementar `auth.uid()` (ou substituir por um parâmetro de sessão) — o domínio não muda. RLS, funções `SECURITY DEFINER`, triggers e CHECKs são todos nativos do Postgres.
- **Sem Edge Functions:** toda lógica servidor vive em `createServerFn` (TanStack Start). No VPS, essas viram endpoints Node/Express diretos.
- **Sem Storage:** vouchers gerados no browser com `jspdf` a partir dos dados do pedido.
- **Máquina de estados centralizada no banco:** `fn_transicionar_status` é a única forma de mudar status; RLS revoga `UPDATE` direto na coluna `status` para não-admins (motoristas passam via RPC). Isso garante que o `pedidos_historico` nunca fique inconsistente.
- **IDs:** `pedidos.id` é `BIGSERIAL` (numérico sequencial exibido ao usuário, como o legado). Todo o resto usa `uuid` para portabilidade e evitar colisões futuras.
- **Trigger `data_alteracao`:** função `set_updated_at()` reaproveitada em todas as tabelas com `updated_at`; `pedidos` tem trigger adicional para `data_alteracao` (idêntico, nome diferente para manter semântica do legado).

## Perguntas rápidas antes de começar

Nenhuma bloqueante — spec está clara. Vou assumir:
- E-mail do primeiro admin: você cria via tela de auth padrão e eu deixo uma migration/instrução para promovê-lo inserindo em `user_roles`.
- Idioma da UI: português (BR).
- Se algo diferente, me avise antes de eu começar a Etapa 1.

Ao final da Etapa 1 eu paro e mostro o schema aplicado + login funcionando com os dois papéis, como você pediu.
