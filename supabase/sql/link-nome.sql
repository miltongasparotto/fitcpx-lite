-- Nome do personal na tela de cadastro por link (Portal do Aluno).
-- Rodar UMA vez no SQL Editor do Supabase. Sem isto o cadastro funciona, só mostra "seu personal" no lugar do nome.
--
-- Devolve apenas o "nome para os alunos" (personal_links.nome_exibicao) do código exato do link.
-- Esse nome o próprio personal escolheu mostrar aos alunos; nenhum outro dado sai daqui e a
-- tabela personal_links continua fechada para leitura pública.

create or replace function nome_do_link(p_codigo text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(btrim(nome_exibicao), '') from personal_links
  where codigo = p_codigo and length(p_codigo) between 6 and 32
  limit 1;
$$;
revoke all on function nome_do_link(text) from public;
grant execute on function nome_do_link(text) to anon, authenticated;

-- Conferência: select nome_do_link('SEUCODIGO');  → devolve o nome (ou null se ainda não preencheu).
