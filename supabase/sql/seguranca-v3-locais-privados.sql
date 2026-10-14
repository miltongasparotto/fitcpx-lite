-- seguranca-v3: aluno não enxerga local de treino PRIVADO de outro aluno.
-- Antes: a policy só filtrava por trainer, então qualquer aluno do personal lia
-- nome/cidade/obs/equipamentos de todos os locais (inclusive "Casa" de outros).
-- Agora: só locais compartilhados ou os que o próprio aluno tem vínculo.
-- Rodar no SQL Editor do Supabase (idempotente).
-- Depende do portal novo: aluno-app.js cria o local com id gerado no cliente e
-- sem .select() (o insert não precisa ler a linha de volta).

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
