-- ══════════════════════════════════════════════════════════════════════════
-- SEGURANÇA v2 — correções de RLS/grants (revisão de 04/10/2026)
-- ══════════════════════════════════════════════════════════════════════════
-- Rodar DEPOIS de supabase/sql/onboarding-aluno.sql, no SQL Editor do Supabase.
-- Idempotente. ORDEM DE DEPLOY (importante, senão o portal quebra):
--   1) rodar este SQL (cria a função resolver_codigo e fecha a leitura pública)
--   2) publicar as Edge Functions aluno-api e trainer-transferencia
--   3) publicar o painel e o portal (aluno/js/aluno-app.js já chama a RPC)
--
-- O que corrige:
--  A) personal_links era legível por qualquer pessoa (listava todos os códigos
--     e todos os ids de personal). Agora só o dono lê; o portal resolve o
--     código exato pela função resolver_codigo().
--  B) trainer podia INSERIR em alunos_acesso e em solicitacoes_transferencia
--     (política "for all"), e editar trainer_novo_id/aluno_user_id: dava pra
--     fabricar uma "solicitação" e empurrar aluno para o blob de outro personal.
--     Agora o trainer só lê/atualiza status; quem cria é a Edge Function.
--  C) aluno podia vincular local de OUTRO personal e gravar path de foto
--     fora da própria pasta.
--  D) limites de tamanho nos textos que o aluno grava + limites do bucket.

-- ── A) personal_links ───────────────────────────────────────────────────────
drop policy if exists "qualquer_um_resolve_codigo" on personal_links;

create or replace function resolver_codigo(p_codigo text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select trainer_user_id from personal_links
  where codigo = p_codigo and length(p_codigo) between 6 and 32
  limit 1;
$$;
revoke all on function resolver_codigo(text) from public;
grant execute on function resolver_codigo(text) to anon, authenticated;

-- ── B) alunos_acesso: trainer lê, atualiza só o status, remove; NÃO insere ──
drop policy if exists "trainer_gerencia_alunos_acesso" on alunos_acesso;

create policy "trainer_ve_alunos_acesso" on alunos_acesso
  for select to authenticated using (trainer_user_id = auth.uid());
create policy "trainer_atualiza_alunos_acesso" on alunos_acesso
  for update to authenticated
  using (trainer_user_id = auth.uid()) with check (trainer_user_id = auth.uid());
create policy "trainer_remove_alunos_acesso" on alunos_acesso
  for delete to authenticated using (trainer_user_id = auth.uid());

revoke insert, update on alunos_acesso from authenticated;
grant update (status) on alunos_acesso to authenticated;

-- ── B) solicitacoes_transferencia: trainer atual lê e atualiza só o status ──
drop policy if exists "trainer_atual_ve_e_resolve" on solicitacoes_transferencia;

create policy "trainer_atual_ve_solicitacoes" on solicitacoes_transferencia
  for select to authenticated using (trainer_atual_id = auth.uid());
create policy "trainer_atual_resolve_solicitacoes" on solicitacoes_transferencia
  for update to authenticated
  using (trainer_atual_id = auth.uid()) with check (trainer_atual_id = auth.uid());

revoke insert, update, delete on solicitacoes_transferencia from authenticated;
grant update (status, resolvido_em) on solicitacoes_transferencia to authenticated;

-- ── B) vínculos de local: trainer não cria vínculo com aluno arbitrário ─────
drop policy if exists "trainer_gerencia_vinculos_local" on locais_treino_alunos;
create policy "trainer_gerencia_vinculos_local" on locais_treino_alunos
  for all to authenticated
  using (trainer_user_id = auth.uid())
  with check (
    trainer_user_id = auth.uid()
    and exists (select 1 from alunos_acesso aa where aa.aluno_user_id = locais_treino_alunos.aluno_user_id and aa.trainer_user_id = auth.uid())
    and exists (select 1 from locais_treino l where l.id = locais_treino_alunos.local_id and l.trainer_user_id = auth.uid())
  );

-- ── C) aluno só vincula local do próprio personal ───────────────────────────
drop policy if exists "aluno_propoe_vinculo_local" on locais_treino_alunos;
create policy "aluno_propoe_vinculo_local" on locais_treino_alunos
  for insert to authenticated
  with check (
    aluno_user_id = auth.uid()
    and exists (select 1 from alunos_acesso aa where aa.aluno_user_id = auth.uid() and aa.trainer_user_id = locais_treino_alunos.trainer_user_id)
    and exists (select 1 from locais_treino l where l.id = locais_treino_alunos.local_id and l.trainer_user_id = locais_treino_alunos.trainer_user_id)
  );

-- ── C) foto: o caminho tem que ficar na pasta do próprio aluno ──────────────
drop policy if exists "aluno_gerencia_proprias_fotos" on avaliacoes_fotos;
create policy "aluno_gerencia_proprias_fotos" on avaliacoes_fotos
  for all to authenticated
  using (exists (select 1 from avaliacoes_pendentes ap where ap.id = avaliacoes_fotos.avaliacao_id and ap.aluno_user_id = auth.uid()))
  with check (
    path like auth.uid()::text || '/%' and path not like '%..%'
    and exists (select 1 from avaliacoes_pendentes ap where ap.id = avaliacoes_fotos.avaliacao_id and ap.aluno_user_id = auth.uid())
  );

-- ── D) limites de tamanho (o aluno grava direto em locais_treino) ───────────
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'locais_treino_tamanhos_ck') then
    alter table locais_treino add constraint locais_treino_tamanhos_ck check (
      char_length(nome) <= 120
      and (cidade is null or char_length(cidade) <= 80)
      and (estado is null or char_length(estado) <= 40)
      and (pais   is null or char_length(pais)   <= 60)
      and (tipo   is null or char_length(tipo)   <= 60)
      and (obs    is null or char_length(obs)    <= 500)
      and jsonb_typeof(equipamentos) = 'array'
      and jsonb_array_length(equipamentos) <= 120
    ) not valid;   -- not valid: não reprova linhas antigas, só as novas
  end if;
end $$;

-- Foto de avaliação: só imagem e no máximo 5 MB.
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg','image/png','image/webp']
 where id = 'avaliacoes-fotos';

-- ── Para conferir depois de rodar ───────────────────────────────────────────
--   select policyname, cmd, roles from pg_policies where tablename in
--     ('personal_links','alunos_acesso','solicitacoes_transferencia','locais_treino_alunos','avaliacoes_fotos');
--   -- como anon: select * from personal_links;  → deve voltar 0 linhas
--   -- como anon: select resolver_codigo('SEUCODIGO');  → devolve o uuid
