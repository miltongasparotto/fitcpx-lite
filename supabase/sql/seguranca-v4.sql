-- seguranca-v4 (auditoria de 23/10/2026): limites no texto que o personal grava direto em personal_links.
-- Rodar no SQL Editor do Supabase DEPOIS de marca-link.sql (idempotente).
--
-- O que corrige:
--  nome_exibicao (nome do personal mostrado na tela pública de cadastro e nos avisos de transferência)
--  era a única coluna de personal_links sem CHECK. A policy trainer_gerencia_proprio_link deixa o personal
--  gravar a própria linha direto pela API, sem passar pela Edge Function que higieniza o texto, então ele
--  podia guardar HTML/script ali. As telas já escapam o valor, mas o banco passa a recusar de qualquer forma.
--  `not valid`: não reprova linha antiga, só as gravações novas.

alter table personal_links drop constraint if exists personal_links_nome_exibicao_ck;
alter table personal_links add  constraint personal_links_nome_exibicao_ck
  check (nome_exibicao is null or (char_length(nome_exibicao) <= 80 and nome_exibicao !~ '[<>]')) not valid;

-- O código do link precisa respeitar o mesmo formato que as funções aceitam (6 a 32 letras e números).
alter table personal_links drop constraint if exists personal_links_codigo_ck;
alter table personal_links add  constraint personal_links_codigo_ck
  check (codigo ~ '^[A-Za-z0-9]{6,32}$') not valid;

-- Conferência: update personal_links set nome_exibicao = '<img src=x>' where trainer_user_id = auth.uid();  → deve falhar.
