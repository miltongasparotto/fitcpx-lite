-- ══════════════════════════════════════════════════════════════════════════
-- PORTAL DO ALUNO (Fase 4) — schema + RLS
-- ══════════════════════════════════════════════════════════════════════════
-- Rodar manualmente no SQL Editor do Supabase (este agente não tem acesso ao
-- banco). Idempotente: pode rodar de novo sem duplicar nada.
--
-- Por que tabelas novas, fora do app_data (blob JSON do trainer)?
-- Hoje TODO aluno vive dentro de um único JSON (`app_data.key='students'`),
-- dono = o trainer logado. RLS não dá pra abrir esse blob pro aluno sem
-- expor todos os alunos daquele trainer. Estas tabelas dão ao aluno um lugar
-- pra logar/gravar local de treino/fotos com RLS própria; a escrita real em
-- `students[]` (cadastro, anamnese, avaliação) é feita pela Edge Function
-- supabase/functions/aluno-api, que roda com service_role e por isso pode
-- tocar no blob do trainer certo — sem fila de aprovação manual (v2).

-- ── 1) LINK DE CADASTRO DO PERSONAL ────────────────────────────────────────
-- Um código fixo por trainer. Qualquer pessoa que se cadastrar usando este
-- código vira aluno dele automaticamente (aluno/?c=<codigo>).
create table if not exists personal_links (
  trainer_user_id uuid primary key references auth.users(id) on delete cascade,
  codigo text not null unique,
  criado_em timestamptz not null default now()
);

alter table personal_links enable row level security;

drop policy if exists "trainer_gerencia_proprio_link" on personal_links;
create policy "trainer_gerencia_proprio_link" on personal_links
  for all to authenticated
  using (trainer_user_id = auth.uid())
  with check (trainer_user_id = auth.uid());

-- Necessário pro aluno resolver o código ANTES de ter conta (tela de
-- cadastro só com ?c=). Não é dado sensível (só o par código→trainer_id).
drop policy if exists "qualquer_um_resolve_codigo" on personal_links;
create policy "qualquer_um_resolve_codigo" on personal_links
  for select to anon, authenticated
  using (true);

-- ── 2) VÍNCULO ALUNO ↔ TRAINER + STATUS DE ACESSO ─────────────────────────
-- Nasce 'ativo' ao se cadastrar. Trainer bloqueia/libera manualmente
-- (js/onboarding-personal.js → alunoTogglePortalStatus). Aluno bloqueado
-- continua logando, só cai numa tela de aviso (sem logout forçado).
create table if not exists alunos_acesso (
  id uuid primary key default gen_random_uuid(),
  trainer_user_id uuid not null references auth.users(id) on delete cascade,
  aluno_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'ativo' check (status in ('ativo','bloqueado')),
  criado_em timestamptz not null default now(),
  -- UNIQUE só no aluno (não no par trainer+aluno): garante em nível de banco
  -- que um aluno nunca fica vinculado a dois trainers ao mesmo tempo. Trocar
  -- de trainer é um UPDATE nesta mesma linha (ver supabase/functions/trainer-transferencia),
  -- nunca um INSERT de uma segunda linha.
  unique (aluno_user_id)
);

alter table alunos_acesso enable row level security;

drop policy if exists "trainer_gerencia_alunos_acesso" on alunos_acesso;
create policy "trainer_gerencia_alunos_acesso" on alunos_acesso
  for all to authenticated
  using (trainer_user_id = auth.uid())
  with check (trainer_user_id = auth.uid());

drop policy if exists "aluno_ve_propria_linha_acesso" on alunos_acesso;
create policy "aluno_ve_propria_linha_acesso" on alunos_acesso
  for select to authenticated
  using (aluno_user_id = auth.uid());

-- Aluno NUNCA insere/atualiza a própria linha direto — só a Edge Function
-- aluno-api (service_role) cria/move esse vínculo. É ela que garante, num só
-- lugar, que o aluno nunca fica em dois trainers ao mesmo tempo (checa
-- conflito antes de vincular a um trainer novo). Sem policy de insert pro
-- aluno aqui de propósito.

-- ── 3) RASTRO DOS ENVIOS DO ALUNO (auditoria — não é mais fila de aprovação) ──
-- Desde a v2 do Portal do Aluno, cadastro/anamnese/avaliação gravam DIRETO no
-- aluno de verdade via supabase/functions/aluno-api (service_role) — sem
-- clique manual do trainer. Esta tabela vira só histórico/rastro de cada
-- envio bruto ("o que o aluno mandou e quando"), gravada pela própria
-- Edge Function junto com a escrita real. status='aplicado' é o valor normal
-- agora; 'enviado'/'revisado' ficam pra compatibilidade com registros antigos.
create table if not exists avaliacoes_pendentes (
  id uuid primary key default gen_random_uuid(),
  trainer_user_id uuid not null references auth.users(id) on delete cascade,
  aluno_user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('cadastro_inicial','anamnese','avaliacao')),
  status text not null default 'aplicado' check (status in ('rascunho','enviado','revisado','aplicado')),
  dados jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table avaliacoes_pendentes enable row level security;

-- Só leitura pra aluno (o próprio histórico) e trainer (histórico dos seus
-- alunos) — quem grava é sempre a Edge Function via service_role.
drop policy if exists "aluno_gerencia_proprias_avaliacoes" on avaliacoes_pendentes;
drop policy if exists "aluno_ve_proprio_historico" on avaliacoes_pendentes;
create policy "aluno_ve_proprio_historico" on avaliacoes_pendentes
  for select to authenticated
  using (aluno_user_id = auth.uid());

drop policy if exists "trainer_ve_avaliacoes_dos_alunos" on avaliacoes_pendentes;
create policy "trainer_ve_avaliacoes_dos_alunos" on avaliacoes_pendentes
  for select to authenticated
  using (trainer_user_id = auth.uid());

drop policy if exists "trainer_marca_avaliacao_revisada" on avaliacoes_pendentes;

-- ── 4) FOTOS DE CADA AVALIAÇÃO ──────────────────────────────────────────────
create table if not exists avaliacoes_fotos (
  id uuid primary key default gen_random_uuid(),
  avaliacao_id uuid not null references avaliacoes_pendentes(id) on delete cascade,
  tipo text not null check (tipo in ('frente','lado','costas')),
  path text not null,
  created_at timestamptz not null default now()
);

alter table avaliacoes_fotos enable row level security;

drop policy if exists "aluno_gerencia_proprias_fotos" on avaliacoes_fotos;
create policy "aluno_gerencia_proprias_fotos" on avaliacoes_fotos
  for all to authenticated
  using (exists (select 1 from avaliacoes_pendentes ap where ap.id = avaliacoes_fotos.avaliacao_id and ap.aluno_user_id = auth.uid()))
  with check (exists (select 1 from avaliacoes_pendentes ap where ap.id = avaliacoes_fotos.avaliacao_id and ap.aluno_user_id = auth.uid()));

drop policy if exists "trainer_ve_fotos_dos_alunos" on avaliacoes_fotos;
create policy "trainer_ve_fotos_dos_alunos" on avaliacoes_fotos
  for select to authenticated
  using (exists (select 1 from avaliacoes_pendentes ap where ap.id = avaliacoes_fotos.avaliacao_id and ap.trainer_user_id = auth.uid()));

-- ── 5) LOCAIS DE TREINO DOS ALUNOS (com região, pesquisável) ──────────────
-- Independente de LIBS.locais (locais do próprio personal, client-side).
-- `equipamentos` usa as mesmas chaves de EQUIP_LISTA (js/biblioteca-exercicios.js)
-- pra já funcionar com o filtro do motor de prescrição sem tradução.
create table if not exists locais_treino (
  id uuid primary key default gen_random_uuid(),
  trainer_user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  cidade text,
  estado text,
  pais text,
  tipo text,
  equipamentos jsonb not null default '[]'::jsonb,
  obs text,
  criado_por text not null default 'aluno' check (criado_por in ('personal','aluno')),
  -- Nunca controla se o DONO pode usar o local (ele já pode, é o que ele
  -- preencheu) — só se esse local aparece na BUSCA de outros alunos do
  -- mesmo trainer. Chamava "revisado" antes; renomeado pra não sugerir que
  -- o local ficava "bloqueado" até alguém aprovar.
  compartilhado boolean not null default false,
  criado_em timestamptz not null default now()
);

alter table locais_treino enable row level security;

drop policy if exists "trainer_gerencia_locais_treino" on locais_treino;
create policy "trainer_gerencia_locais_treino" on locais_treino
  for all to authenticated
  using (trainer_user_id = auth.uid())
  with check (trainer_user_id = auth.uid());

-- Aluno só vê locais do PRÓPRIO trainer E só os compartilhados (pra buscar
-- academia já cadastrada por outro aluno do mesmo lugar) ou aqueles a que ele
-- mesmo está vinculado. Local privado de outro aluno ("Casa") nunca aparece.
drop policy if exists "aluno_ve_locais_do_seu_trainer" on locais_treino;
create policy "aluno_ve_locais_do_seu_trainer" on locais_treino
  for select to authenticated
  using (
    exists (select 1 from alunos_acesso aa where aa.aluno_user_id = auth.uid() and aa.trainer_user_id = locais_treino.trainer_user_id)
    and (
      compartilhado
      or exists (select 1 from locais_treino_alunos v where v.local_id = locais_treino.id and v.aluno_user_id = auth.uid())
    )
  );

-- Aluno pode criar um local novo (academia que não achou, ou "treino em
-- casa") — já disponível pra ELE na hora; `compartilhado` só decide se
-- aparece pra outros alunos buscarem depois.
drop policy if exists "aluno_cria_local_novo" on locais_treino;
create policy "aluno_cria_local_novo" on locais_treino
  for insert to authenticated
  with check (
    criado_por = 'aluno'
    and exists (select 1 from alunos_acesso aa where aa.aluno_user_id = auth.uid() and aa.trainer_user_id = locais_treino.trainer_user_id)
  );

-- ── 6) VÍNCULO N:N ALUNO ↔ LOCAL DE TREINO ─────────────────────────────────
-- Sem status de aprovação — o vínculo já vale assim que existe (é o próprio
-- aluno dizendo onde treina). Só serve pra saber quem treina em qual local.
create table if not exists locais_treino_alunos (
  id uuid primary key default gen_random_uuid(),
  local_id uuid not null references locais_treino(id) on delete cascade,
  aluno_user_id uuid not null references auth.users(id) on delete cascade,
  trainer_user_id uuid not null references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now(),
  unique (local_id, aluno_user_id)
);

alter table locais_treino_alunos enable row level security;

drop policy if exists "trainer_gerencia_vinculos_local" on locais_treino_alunos;
create policy "trainer_gerencia_vinculos_local" on locais_treino_alunos
  for all to authenticated
  using (trainer_user_id = auth.uid())
  with check (trainer_user_id = auth.uid());

drop policy if exists "aluno_ve_proprios_vinculos_local" on locais_treino_alunos;
create policy "aluno_ve_proprios_vinculos_local" on locais_treino_alunos
  for select to authenticated
  using (aluno_user_id = auth.uid());

drop policy if exists "aluno_propoe_vinculo_local" on locais_treino_alunos;
create policy "aluno_propoe_vinculo_local" on locais_treino_alunos
  for insert to authenticated
  with check (
    aluno_user_id = auth.uid()
    and exists (select 1 from alunos_acesso aa where aa.aluno_user_id = auth.uid() and aa.trainer_user_id = locais_treino_alunos.trainer_user_id)
  );

-- ── 7) STORAGE — bucket privado das fotos de avaliação ────────────────────
-- Path esperado: {alunoUserId}/{avaliacaoId}/{tipo}-{timestamp}.jpg
insert into storage.buckets (id, name, public)
  values ('avaliacoes-fotos', 'avaliacoes-fotos', false)
  on conflict (id) do nothing;

drop policy if exists "aluno_upload_propria_pasta" on storage.objects;
create policy "aluno_upload_propria_pasta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avaliacoes-fotos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "aluno_le_propria_pasta" on storage.objects;
create policy "aluno_le_propria_pasta" on storage.objects
  for select to authenticated
  using (bucket_id = 'avaliacoes-fotos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "trainer_le_fotos_dos_seus_alunos" on storage.objects;
create policy "trainer_le_fotos_dos_seus_alunos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avaliacoes-fotos'
    and exists (
      select 1 from alunos_acesso aa
      where aa.trainer_user_id = auth.uid()
        and aa.aluno_user_id::text = (storage.foldername(name))[1]
    )
  );

-- ── 8) MIGRAÇÃO — só necessário se você já rodou uma versão anterior deste
-- arquivo (antes do app do aluno virar abas em vez de wizard único). O
-- CREATE TABLE acima já sai correto num banco novo; isto só corrige o
-- check constraint de `tipo` num banco que já tinha a tabela sem 'anamnese'.
-- Idempotente: rodar de novo não dá erro.
do $$
declare
  nome_constraint text;
begin
  select conname into nome_constraint
  from pg_constraint
  where conrelid = 'avaliacoes_pendentes'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%tipo%';

  if nome_constraint is not null then
    execute format('alter table avaliacoes_pendentes drop constraint %I', nome_constraint);
  end if;

  alter table avaliacoes_pendentes
    add constraint avaliacoes_pendentes_tipo_check check (tipo in ('cadastro_inicial','anamnese','avaliacao'));
end $$;

-- ── 9) SOLICITAÇÕES DE TRANSFERÊNCIA ENTRE TRAINERS ────────────────────────
-- Um aluno nunca fica vinculado a dois trainers ao mesmo tempo (ver UNIQUE
-- em alunos_acesso). Se ele tentar entrar pelo link de outro trainer enquanto
-- já é aluno de alguém, a Edge Function aluno-api cria uma linha aqui em vez
-- de vincular direto — só o trainer ATUAL vê e aprova/recusa. Aprovar é
-- feito por supabase/functions/trainer-transferencia (mexe no blob de dois
-- trainers ao mesmo tempo, por isso precisa de service_role). Recusar é um
-- UPDATE simples, o trainer já é dono da linha via RLS.
create table if not exists solicitacoes_transferencia (
  id uuid primary key default gen_random_uuid(),
  aluno_user_id uuid not null references auth.users(id) on delete cascade,
  trainer_atual_id uuid not null references auth.users(id) on delete cascade,
  trainer_novo_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pendente' check (status in ('pendente','aprovada','recusada')),
  criado_em timestamptz not null default now(),
  resolvido_em timestamptz,
  unique (aluno_user_id)
);

alter table solicitacoes_transferencia enable row level security;

drop policy if exists "trainer_atual_ve_e_resolve" on solicitacoes_transferencia;
create policy "trainer_atual_ve_e_resolve" on solicitacoes_transferencia
  for all to authenticated
  using (trainer_atual_id = auth.uid())
  with check (trainer_atual_id = auth.uid());

drop policy if exists "aluno_ve_propria_solicitacao" on solicitacoes_transferencia;
create policy "aluno_ve_propria_solicitacao" on solicitacoes_transferencia
  for select to authenticated
  using (aluno_user_id = auth.uid());

-- ── 10) MIGRAÇÃO — v2 do Portal do Aluno (sem fila de aprovação) ──────────
-- Só necessário em banco que já tinha a v1 (com "Importar"/Recebidos).
-- Idempotente.
alter table avaliacoes_pendentes drop constraint if exists avaliacoes_pendentes_status_check;
alter table avaliacoes_pendentes add constraint avaliacoes_pendentes_status_check
  check (status in ('rascunho','enviado','revisado','aplicado'));

do $$
begin
  if exists (select 1 from information_schema.columns where table_name='locais_treino' and column_name='revisado') then
    alter table locais_treino rename column revisado to compartilhado;
  end if;
end $$;

alter table locais_treino_alunos drop column if exists status;

do $$
declare
  nome_constraint text;
begin
  select conname into nome_constraint
  from pg_constraint
  where conrelid = 'alunos_acesso'::regclass and contype = 'u';
  if nome_constraint is not null then
    execute format('alter table alunos_acesso drop constraint %I', nome_constraint);
  end if;
  -- Se sobrou mais de uma linha ativa pro mesmo aluno (não deveria acontecer,
  -- mas a UNIQUE antiga permitia), mantém só a mais recente antes de aplicar
  -- a constraint nova, senão o ADD CONSTRAINT falha.
  delete from alunos_acesso a using alunos_acesso b
    where a.aluno_user_id = b.aluno_user_id and a.criado_em < b.criado_em;
  alter table alunos_acesso add constraint alunos_acesso_aluno_user_id_key unique (aluno_user_id);
end $$;

drop policy if exists "aluno_insere_proprio_cadastro" on alunos_acesso;
