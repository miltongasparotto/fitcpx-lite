-- seguranca-v3: aluno não enxerga local de treino PRIVADO de outro aluno.
-- Antes: a policy só filtrava por trainer, então qualquer aluno do personal lia
-- nome/cidade/obs/equipamentos de todos os locais (inclusive "Casa" de outros).
-- Agora: só locais compartilhados ou os que o próprio aluno tem vínculo.
-- Rodar no SQL Editor do Supabase DEPOIS de onboarding-aluno.sql e seguranca-v2.sql (idempotente).
--
-- Depende do portal novo: aluno-app.js cria o local com id gerado no cliente e
-- sem .select() (o insert não precisa ler a linha de volta).

-- 1) Quem pode LER local (aluno)
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

-- 2) Conferir "este local é deste personal" SEM passar pela policy acima.
-- A policy de INSERT em locais_treino_alunos (aluno_propoe_vinculo_local) fazia um
-- `exists (select ... from locais_treino ...)`; esse subselect roda com a RLS do aluno e,
-- com a policy nova, não enxerga o local privado que ele acabou de criar (ainda sem vínculo):
-- o vínculo falharia. A função devolve só verdadeiro/falso, sem expor nenhuma coluna do local.
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

drop policy if exists "aluno_propoe_vinculo_local" on locais_treino_alunos;
create policy "aluno_propoe_vinculo_local" on locais_treino_alunos
  for insert to authenticated
  with check (
    aluno_user_id = auth.uid()
    and exists (select 1 from alunos_acesso aa where aa.aluno_user_id = auth.uid() and aa.trainer_user_id = locais_treino_alunos.trainer_user_id)
    and public.local_do_trainer(locais_treino_alunos.local_id, locais_treino_alunos.trainer_user_id)
  );
