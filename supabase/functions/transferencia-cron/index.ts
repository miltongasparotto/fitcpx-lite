// Roda os prazos de 30 dias vencidos (transferência automática, sem treinos).
// Chamada por agendador (pg_cron + pg_net, ver supabase/sql/vinculo-cpf.sql) com o
// header x-cron-secret: <CRON_SECRET>. Sem o secret configurado, recusa tudo.
// Publicar com: supabase functions deploy transferencia-cron --no-verify-jwt
// O painel e o portal também executam os prazos de quem abre a tela; este cron
// só garante que a transferência acontece mesmo se ninguém abrir o app.
import { getAdminClient, jsonResponse } from '../_shared/students.ts';
import { processarPrazosVencidos } from '../_shared/vinculo-db.ts';

function igual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req: Request) => {
  const segredo = Deno.env.get('CRON_SECRET') || '';
  const dado = req.headers.get('x-cron-secret') || '';
  if (segredo.length < 16 || !igual(dado, segredo)) return jsonResponse({ error: 'Não autorizado.' }, 401);
  try {
    const feitas = await processarPrazosVencidos(getAdminClient());
    return jsonResponse({ status: 'ok', executadas: feitas.length });
  } catch (e) {
    console.error('transferencia-cron erro:', e);
    return jsonResponse({ error: 'Falha ao processar.' }, 500);
  }
});
