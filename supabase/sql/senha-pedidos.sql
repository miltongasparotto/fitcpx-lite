-- ══════════════════════════════════════════════════════════════════════════
-- "Esqueci minha senha" do aluno → tarefa urgente no CRM do personal
-- ══════════════════════════════════════════════════════════════════════════
-- Rodar UMA vez no SQL Editor (depois de vinculo-cpf.sql). Idempotente.
-- Ordem de deploy:
--   1) rodar este SQL
--   2) publicar as Edge Functions:
--        npx supabase functions deploy esqueci-senha --no-verify-jwt
--        npx supabase functions deploy trainer-transferencia
--        npx supabase functions deploy aluno-api
--   3) publicar painel e portal
--
-- O aluno esquecido não consegue entrar, então a função esqueci-senha é pública (sem JWT) e é
-- a ÚNICA que grava aqui. O personal só LÊ os pedidos do próprio aluno; o painel transforma
-- cada pedido aberto numa tarefa urgente. Quando o personal redefine a senha (função
-- trainer-transferencia, ação definir-senha) o pedido passa para 'atendido'.

create table if not exists senha_pedidos (
  id uuid primary key default gen_random_uuid(),
  trainer_user_id uuid not null references auth.users(id) on delete cascade,
  aluno_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'aberto' check (status in ('aberto','atendido')),
  criado_em timestamptz not null default now(),
  atendido_em timestamptz
);
-- Só um pedido aberto por aluno (apertar o botão várias vezes não cria tarefa repetida).
create unique index if not exists senha_pedidos_um_aberto on senha_pedidos (aluno_user_id) where status = 'aberto';
create index if not exists senha_pedidos_trainer_idx on senha_pedidos (trainer_user_id, status);

alter table senha_pedidos enable row level security;

drop policy if exists "personal_ve_pedidos_de_senha" on senha_pedidos;
create policy "personal_ve_pedidos_de_senha" on senha_pedidos
  for select to authenticated using (trainer_user_id = auth.uid());

revoke all on senha_pedidos from anon, authenticated;
grant select on senha_pedidos to authenticated;

-- Conferência (como authenticated de um personal): select * from senha_pedidos;  → só os dele.
-- Como anon: select * from senha_pedidos;  → permission denied.
