-- ══════════════════════════════════════════════════════════════════════════
-- FASE 4.1 — Vínculo por NOME + CPF + E-MAIL e transferência entre personais
-- ══════════════════════════════════════════════════════════════════════════
-- Rodar DEPOIS de onboarding-aluno.sql e seguranca-v2.sql, no SQL Editor.
-- Idempotente. Ordem de deploy:
--   1) rodar este SQL
--   2) criar o secret CPF_PEPPER (Supabase → Edge Functions → Secrets), um texto
--      longo e aleatório. NÃO trocar depois: ele faz parte do hash dos CPFs.
--   3) publicar as Edge Functions aluno-api, trainer-transferencia e
--      transferencia-cron (esta é opcional, ver o fim do arquivo)
--   4) publicar painel e portal
--
-- Por que um índice central? Cada aluno vive dentro do JSON de UM personal e um
-- personal não enxerga o outro. Pra saber "esse CPF já é aluno de alguém?" precisa
-- de um lugar comum. Ele guarda só o HASH do CPF (HMAC com o pepper), nunca o CPF.
-- Ninguém (nem personal, nem aluno) escreve aqui direto: só as Edge Functions.

-- ── Nome do personal (aparece em "vinculado ao personal X") ────────────────
alter table personal_links add column if not exists nome_exibicao text;

-- ── Identidades ─────────────────────────────────────────────────────────────
create table if not exists alunos_identidade (
  id uuid primary key default gen_random_uuid(),
  cpf_hash text not null unique,
  nome_norm text not null,
  email_norm text,                                   -- e-mail de login (único dado que muda)
  trainer_user_id uuid not null references auth.users(id) on delete cascade,   -- personal atual
  aluno_user_id uuid unique references auth.users(id) on delete set null,      -- conta do aluno (se já tem)
  student_id bigint,                                  -- id do aluno dentro do JSON do personal
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists alunos_identidade_trainer_idx on alunos_identidade (trainer_user_id);

alter table alunos_identidade enable row level security;

drop policy if exists "personal_ve_identidades_dos_seus" on alunos_identidade;
create policy "personal_ve_identidades_dos_seus" on alunos_identidade
  for select to authenticated using (trainer_user_id = auth.uid());
drop policy if exists "aluno_ve_propria_identidade" on alunos_identidade;
create policy "aluno_ve_propria_identidade" on alunos_identidade
  for select to authenticated using (aluno_user_id = auth.uid());

revoke all on alunos_identidade from anon, authenticated;
grant select on alunos_identidade to authenticated;

-- ── Transferências ──────────────────────────────────────────────────────────
-- status: aguardando_aluno (pedido do personal novo, falta o aluno confirmar)
--         pendente         (relógio de 30 dias correndo)
--         concluida | cancelada
-- Só pode existir UM pedido aberto por aluno (índice parcial abaixo).
create table if not exists transferencias_vinculo (
  id uuid primary key default gen_random_uuid(),
  identidade_id uuid not null references alunos_identidade(id) on delete cascade,
  aluno_user_id uuid references auth.users(id) on delete set null,
  trainer_atual_id uuid not null references auth.users(id) on delete cascade,
  trainer_novo_id uuid not null references auth.users(id) on delete cascade,
  student_id bigint,
  iniciado_por text not null check (iniciado_por in ('aluno','personal')),
  status text not null check (status in ('aguardando_aluno','pendente','concluida','cancelada')),
  manter_treinos boolean,
  snapshot jsonb not null default '{}'::jsonb,       -- dados do cadastro que o personal novo pode ver
  aceite_novo_em timestamptz,                         -- personal novo "aceitou" o aluno
  criado_em timestamptz not null default now(),
  confirmado_aluno_em timestamptz,
  prazo_em timestamptz,                               -- confirmado_aluno_em + 30 dias
  concluida_em timestamptz,
  motivo_fim text check (motivo_fim is null or motivo_fim in ('antecipada','prazo','cancelada_aluno','cancelada_novo','recusada_novo')),
  check (trainer_atual_id <> trainer_novo_id)
);
create unique index if not exists transferencias_uma_aberta
  on transferencias_vinculo (identidade_id) where status in ('aguardando_aluno','pendente');
create index if not exists transferencias_atual_idx on transferencias_vinculo (trainer_atual_id, status);
create index if not exists transferencias_novo_idx  on transferencias_vinculo (trainer_novo_id, status);
create index if not exists transferencias_prazo_idx on transferencias_vinculo (prazo_em) where status = 'pendente';

alter table transferencias_vinculo enable row level security;

drop policy if exists "partes_veem_transferencia" on transferencias_vinculo;
create policy "partes_veem_transferencia" on transferencias_vinculo
  for select to authenticated
  using (trainer_atual_id = auth.uid() or trainer_novo_id = auth.uid() or aluno_user_id = auth.uid());

revoke all on transferencias_vinculo from anon, authenticated;
grant select on transferencias_vinculo to authenticated;

-- A tabela antiga (solicitacoes_transferencia) deixa de ser usada pelo app. Fica
-- aí, sem apagar nada, caso exista pedido antigo que você queira consultar.

-- ══════════════════════════════════════════════════════════════════════════
-- OPCIONAL — executar os prazos vencidos todo dia, sem ninguém abrir o app
-- ══════════════════════════════════════════════════════════════════════════
-- Sem isto o prazo é verificado quando alguém abre o painel ou o portal (já
-- funciona). Pra rodar sozinho: crie o secret CRON_SECRET, publique a função
-- transferencia-cron e agende (pg_cron + pg_net precisam estar habilitadas):
--
--   select cron.schedule('transferencias-prazo', '15 3 * * *', $$
--     select net.http_post(
--       url := 'https://SEU-PROJETO.supabase.co/functions/v1/transferencia-cron',
--       headers := jsonb_build_object('x-cron-secret', 'O_MESMO_VALOR_DO_SECRET', 'Content-Type', 'application/json'),
--       body := '{}'::jsonb);
--   $$);
