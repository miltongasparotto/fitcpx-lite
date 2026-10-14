-- seguranca-v3: aluno não enxerga local de treino PRIVADO de outro aluno.
-- Antes: a policy só filtrava por trainer, então qualquer aluno do personal lia
-- nome/cidade/obs/equipamentos de todos os locais (inclusive "Casa" de outros).
-- Agora: só locais compartilhados ou os que o próprio aluno tem vínculo.
-- Rodar no SQL Editor do Supabase DEPOIS de onboarding-aluno.sql e seguranca-v2.sql (idempotente).
--
-- ATENÇÃO (revisão 14/10/2026, 2ª versão): as duas policies abaixo NÃO podem se consultar por
-- subselect. A de leitura de locais_treino lendo locais_treino_alunos, junto com as de
-- locais_treino_alunos lendo locais_treino, dá "42P17 infinite recursion detected in policy".
-- Por isso cada lado usa uma função SECURITY DEFINER (roda sem RLS, devolve só verdadeiro/falso).
--
-- Depende do portal novo: aluno-app.js cria o local com id gerado no cliente e
-- sem .select() (o insert não precisa ler a linha de volta).

-- 1) "este aluno tem vínculo com este local?" sem passar pela RLS de locais_treino_alunos
create or replace function public.aluno_vinculado_ao_local(p_local uuid, p_aluno uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.locais_treino_alunos v where v.local_id = p_local and v.aluno_user_id = p_aluno);
$$;
revoke all on function public.aluno_vinculado_ao_local(uuid, uuid) from public;
grant execute on function public.aluno_vinculado_ao_local(uuid, uuid) to authenticated;

-- 2) "este local é deste personal?" sem passar pela RLS de locais_treino
create or replace function public.local_do_trainer(p_local uuid, p_trainer uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.locais_treino l where l.id = p_local and l.trainer_user_id = p_trainer);
$$;
revoke all on function public.local_do_trainer(uuid, uuid) from public;
grant execute on function public.local_do_trainer(uuid, uuid) to authenticated;

-- 3) Quem pode LER local (aluno): do próprio personal E (compartilhado OU vinculado a ele)
drop policy if exists "aluno_ve_locais_do_seu_trainer" on locais_treino;
create policy "aluno_ve_locais_do_seu_trainer" on locais_treino
  for select to authenticated
  using (
    exists (select 1 from alunos_acesso aa where aa.aluno_user_id = auth.uid() and aa.trainer_user_id = locais_treino.trainer_user_id)
    and (
      compartilhado
      or public.aluno_vinculado_ao_local(locais_treino.id, auth.uid())
    )
  );

-- 4) Quem pode vincular local (aluno): só ele mesmo, só com o próprio personal, só local desse personal
drop policy if exists "aluno_propoe_vinculo_local" on locais_treino_alunos;
create policy "aluno_propoe_vinculo_local" on locais_treino_alunos
  for insert to authenticated
  with check (
    aluno_user_id = auth.uid()
    and exists (select 1 from alunos_acesso aa where aa.aluno_user_id = auth.uid() and aa.trainer_user_id = locais_treino_alunos.trainer_user_id)
    and public.local_do_trainer(locais_treino_alunos.local_id, locais_treino_alunos.trainer_user_id)
  );

-- 5) O personal também insere vínculo (trainer_gerencia_vinculos_local, seguranca-v2) com um subselect em
-- locais_treino; troca pelo mesmo helper para não reabrir o ciclo.
drop policy if exists "trainer_gerencia_vinculos_local" on locais_treino_alunos;
create policy "trainer_gerencia_vinculos_local" on locais_treino_alunos
  for all to authenticated
  using (trainer_user_id = auth.uid())
  with check (
    trainer_user_id = auth.uid()
    and exists (select 1 from alunos_acesso aa where aa.aluno_user_id = locais_treino_alunos.aluno_user_id and aa.trainer_user_id = auth.uid())
    and public.local_do_trainer(locais_treino_alunos.local_id, auth.uid())
  );
