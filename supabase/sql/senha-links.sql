-- ══════════════════════════════════════════════════════════════════════════
-- Link de redefinição de senha (o personal envia; o aluno clica e cria a nova senha)
-- ══════════════════════════════════════════════════════════════════════════
-- Rodar UMA vez no SQL Editor (depois de senha-pedidos.sql). Idempotente.
-- Ordem de deploy:
--   1) rodar este SQL
--   2) npx supabase functions deploy redefinir-senha-link --no-verify-jwt
--      npx supabase functions deploy trainer-transferencia
--   3) publicar painel e portal
--
-- Como funciona: o personal gera o link no painel (trainer-transferencia, ação gerar-link-senha). A função
-- sorteia um token de 32 bytes, guarda SÓ o hash dele aqui e devolve o token uma vez, para virar
-- https://.../aluno/?r=<token>. O aluno abre o link, escolhe a nova senha e a função pública
-- redefinir-senha-link troca a senha e marca o link como usado. Vale 24 horas, uma vez só; gerar outro link
-- para o mesmo aluno cancela o anterior. Abrir o link (ou o WhatsApp mostrar a pré-visualização) NÃO gasta
-- o token: só o envio da nova senha gasta.
--
-- Ninguém lê nem escreve esta tabela pelo navegador: só as Edge Functions (service_role).

create table if not exists senha_links (
  id uuid primary key default gen_random_uuid(),
  aluno_user_id uuid not null references auth.users(id) on delete cascade,
  trainer_user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,                        -- sha256 do token (nunca o token)
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null,
  usado_em timestamptz                                    -- preenchido ao usar OU ao ser substituído por um link novo
);
create index if not exists senha_links_aluno_idx on senha_links (aluno_user_id) where usado_em is null;

alter table senha_links enable row level security;     -- sem nenhuma policy: ninguém acessa pelo navegador
revoke all on senha_links from anon, authenticated;

-- Conferência (como anon ou authenticated): select * from senha_links;  → permission denied.
