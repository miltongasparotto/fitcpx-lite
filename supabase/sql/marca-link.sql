-- Marca do personal no Portal do Aluno: nome do app, cor, ícone, nome do studio, LOGO e FOTO.
-- Rodar no SQL Editor do Supabase. É seguro rodar de novo (tudo é idempotente): quem já rodou a versão
-- anterior (sem logo e foto) roda este de novo e fica completo.
-- Sem rodar, o painel funciona e a cor vale só nele; o portal do aluno segue com a marca padrão do FitCPX
-- e o painel avisa em Configurações > Marca.
--
-- Os dados ficam nas mesmas linhas de personal_links (a tabela continua fechada para leitura pública).
-- O personal grava a própria linha pela política que já existe (trainer_gerencia_proprio_link); as CHECKs
-- abaixo impedem lixo, marcação HTML ou URL de fora, mesmo se alguém chamar a API direto.
-- O que sai para o público é só o resultado das duas funções no fim.
-- Imagens: bucket público "marca" (o portal abre sem login), uma pasta por personal (<id do usuário>/),
-- só PNG, JPEG e WebP (nunca SVG, que pode carregar script), até 200 KB por arquivo.

-- ── Colunas ──────────────────────────────────────────────────────────────────
alter table personal_links add column if not exists marca_nome_app text;
alter table personal_links add column if not exists marca_cor      text;
alter table personal_links add column if not exists marca_icone    text;
alter table personal_links add column if not exists marca_studio   text;
alter table personal_links add column if not exists marca_logo_url text;
alter table personal_links add column if not exists foto_url       text;

alter table personal_links drop constraint if exists personal_links_marca_nome_app_ck;
alter table personal_links add  constraint personal_links_marca_nome_app_ck
  check (marca_nome_app is null or (char_length(marca_nome_app) between 1 and 40 and marca_nome_app !~ '[<>]'));

alter table personal_links drop constraint if exists personal_links_marca_cor_ck;
alter table personal_links add  constraint personal_links_marca_cor_ck
  check (marca_cor is null or marca_cor ~ '^#[0-9a-fA-F]{6}$');

alter table personal_links drop constraint if exists personal_links_marca_icone_ck;
alter table personal_links add  constraint personal_links_marca_icone_ck
  check (marca_icone is null or marca_icone ~ '^ph-[a-z0-9-]{1,40}$');

alter table personal_links drop constraint if exists personal_links_marca_studio_ck;
alter table personal_links add  constraint personal_links_marca_studio_ck
  check (marca_studio is null or (char_length(marca_studio) between 1 and 60 and marca_studio !~ '[<>]'));

-- A URL da imagem só pode apontar para a pasta do próprio personal, dentro do bucket "marca" deste projeto.
alter table personal_links drop constraint if exists personal_links_marca_logo_url_ck;
alter table personal_links add  constraint personal_links_marca_logo_url_ck
  check (marca_logo_url is null or marca_logo_url ~ ('^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/marca/' || trainer_user_id::text || '/logo-[a-z0-9]{6,32}\.(webp|png)$'));

alter table personal_links drop constraint if exists personal_links_foto_url_ck;
alter table personal_links add  constraint personal_links_foto_url_ck
  check (foto_url is null or foto_url ~ ('^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/marca/' || trainer_user_id::text || '/foto-[a-z0-9]{6,32}\.(webp|png)$'));

-- ── Bucket de imagens ────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('marca', 'marca', true, 204800, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do update
  set public = true, file_size_limit = 204800, allowed_mime_types = array['image/webp', 'image/png', 'image/jpeg'];

-- Leitura pública das imagens é feita pelo endereço público do bucket. As políticas abaixo valem para
-- gravar, trocar, listar e apagar: cada personal só mexe na pasta com o próprio id.
drop policy if exists "marca_personal_insere" on storage.objects;
create policy "marca_personal_insere" on storage.objects for insert to authenticated
  with check (bucket_id = 'marca' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "marca_personal_atualiza" on storage.objects;
create policy "marca_personal_atualiza" on storage.objects for update to authenticated
  using (bucket_id = 'marca' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'marca' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "marca_personal_apaga" on storage.objects;
create policy "marca_personal_apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'marca' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "marca_personal_lista" on storage.objects;
create policy "marca_personal_lista" on storage.objects for select to authenticated
  using (bucket_id = 'marca' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── Funções públicas ─────────────────────────────────────────────────────────
-- Tela de login/cadastro do portal (aluno ainda sem sessão): marca do personal do código exato do link.
create or replace function marca_do_link(p_codigo text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'nome_app', marca_nome_app,
    'cor',      marca_cor,
    'icone',    marca_icone,
    'studio',   marca_studio,
    'logo_url', marca_logo_url,
    'foto_url', foto_url,
    'personal', nullif(btrim(nome_exibicao), '')
  )
  from personal_links
  where codigo = p_codigo and length(p_codigo) between 6 and 32
  limit 1;
$$;
revoke all on function marca_do_link(text) from public;
grant execute on function marca_do_link(text) to anon, authenticated;

-- Aluno já logado que abriu o portal por um link sem código: marca do personal ao qual ele está vinculado.
create or replace function marca_do_aluno()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'nome_app', p.marca_nome_app,
    'cor',      p.marca_cor,
    'icone',    p.marca_icone,
    'studio',   p.marca_studio,
    'logo_url', p.marca_logo_url,
    'foto_url', p.foto_url,
    'personal', nullif(btrim(p.nome_exibicao), '')
  )
  from alunos_acesso a
  join personal_links p on p.trainer_user_id = a.trainer_user_id
  where a.aluno_user_id = auth.uid()
  limit 1;
$$;
revoke all on function marca_do_aluno() from public, anon;
grant execute on function marca_do_aluno() to authenticated;

-- Conferência:
--   select marca_do_link('SEUCODIGO');   → json com nome_app, cor, icone, studio, logo_url, foto_url, personal
--   select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'marca';
--   (como aluno logado) select marca_do_aluno();
