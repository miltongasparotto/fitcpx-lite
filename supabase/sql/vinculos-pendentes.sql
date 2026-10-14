-- vinculos-pendentes: aluno ANTIGO (cadastrado à mão pelo personal, sem CPF) que pede
-- acesso pelo link do personal. Antes o sistema ligava a conta ao registro só porque
-- nome + e-mail batiam; como o e-mail não é confirmado, qualquer um que soubesse esses
-- dois dados tomava o cadastro. Agora o pedido fica AQUI até o PERSONAL aprovar no painel.
--
-- Só as Edge Functions (service_role) leem e gravam: RLS ligada e SEM policy, então
-- o navegador não enxerga nada daqui. `perfil` guarda o que o aluno digitou (nome, CPF…)
-- só até a decisão. Rodar no SQL Editor do Supabase (idempotente).

create table if not exists vinculos_pendentes (
  id uuid primary key default gen_random_uuid(),
  trainer_user_id uuid not null references auth.users(id) on delete cascade,
  student_id bigint not null,
  aluno_user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  perfil jsonb not null default '{}'::jsonb,
  cpf_mascarado text not null default '',
  status text not null default 'pendente' check (status in ('pendente','aprovado','recusado')),
  criado_em timestamptz not null default now(),
  resolvido_em timestamptz
);

-- Um pedido aberto por conta.
create unique index if not exists vinculos_pendentes_um_aberto
  on vinculos_pendentes (aluno_user_id) where status = 'pendente';
create index if not exists vinculos_pendentes_trainer on vinculos_pendentes (trainer_user_id, status);

alter table vinculos_pendentes enable row level security;
revoke all on vinculos_pendentes from anon, authenticated;
