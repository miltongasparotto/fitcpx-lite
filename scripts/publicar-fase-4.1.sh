#!/usr/bin/env bash
# Publica secrets e Edge Functions da Fase 4.1. NÃO contém segredo.
# Uso:  bash scripts/publicar-fase-4.1.sh /caminho/segredos-fase-4.1.env [--sem-cron]
# O .env tem duas linhas: CPF_PEPPER=... e CRON_SECRET=... (fica FORA do repo).
# Pré-requisito: supabase/sql/seguranca-v2.sql e supabase/sql/vinculo-cpf.sql já rodados no SQL Editor.
set -euo pipefail
ENV_FILE="${1:?informe o arquivo .env com CPF_PEPPER e CRON_SECRET}"
COM_CRON=1; [ "${2:-}" = "--sem-cron" ] && COM_CRON=0
cd "$(dirname "$0")/.."

grep -q '^CPF_PEPPER=.\{16,\}' "$ENV_FILE" || { echo "CPF_PEPPER ausente ou curto (mínimo 16)"; exit 1; }
npx supabase secrets set --env-file "$ENV_FILE"

npx supabase functions deploy aluno-api
npx supabase functions deploy trainer-transferencia
if [ "$COM_CRON" = 1 ]; then
  npx supabase functions deploy transferencia-cron --no-verify-jwt
fi
echo "Funções publicadas. Falta: agendar o cron (SQL) e publicar o front."
