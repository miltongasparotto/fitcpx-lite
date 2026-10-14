// Edge Function PÚBLICA (publicar com --no-verify-jwt): "esqueci minha senha" do aluno.
//
// O aluno esquecido não consegue entrar, então não há JWT. Esta função NÃO troca senha nenhuma
// e NÃO envia e-mail: ela só registra um pedido para o PERSONAL do aluno (tabela senha_pedidos,
// sql/senha-pedidos.sql). O painel do personal transforma o pedido numa tarefa urgente do CRM;
// quem redefine a senha é o personal (trainer-transferencia, ação definir-senha).
//
// Respostas (decisão do dono do produto: dizer claramente se o e-mail existe):
//   ok              pedido registrado (ou já havia um aberto)
//   nao-encontrado  e-mail sem conta de aluno
//   bloqueado       acesso do aluno bloqueado pelo personal
//   email-invalido  texto que não parece e-mail
//   muitas-tentativas  limite por origem (freio simples contra varredura de e-mails)
import { corsHeaders } from '../_shared/cors.ts';
import { getAdminClient, jsonResponse } from '../_shared/students.ts';
import { normalizaEmail } from '../_shared/vinculo.ts';
import { acharUsuarioPorEmail } from '../_shared/contas.ts';

// Freio por origem na memória da instância (zera quando a instância reinicia: é só um atrito).
const JANELA_MS = 10 * 60 * 1000, LIMITE = 8;
const tentativas = new Map<string, number[]>();
function passouDoLimite(chave: string): boolean {
  const agora = Date.now();
  const lista = (tentativas.get(chave) || []).filter((t) => agora - t < JANELA_MS);
  lista.push(agora); tentativas.set(chave, lista);
  if (tentativas.size > 5000) tentativas.clear();
  return lista.length > LIMITE;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Método não permitido.' }, 405, corsHeaders);

  let body: any = {};
  try { body = await req.json(); } catch { /* corpo vazio cai em email-invalido */ }
  const email = normalizaEmail(body?.email);
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonResponse({ status: 'email-invalido' }, 200, corsHeaders);

  const origem = (req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'sem-ip').split(',')[0].trim();
  if (passouDoLimite(origem)) return jsonResponse({ status: 'muitas-tentativas' }, 200, corsHeaders);

  try {
    const admin = getAdminClient();
    // 1) índice de identidades (aluno do vínculo por CPF); 2) busca direta pela conta (aluno antigo).
    let alunoId: string | null = null;
    const { data: ident } = await admin.from('alunos_identidade').select('aluno_user_id').eq('email_norm', email).maybeSingle();
    if (ident?.aluno_user_id) alunoId = ident.aluno_user_id;
    if (!alunoId) alunoId = (await acharUsuarioPorEmail(admin, email))?.id || null;
    if (!alunoId) return jsonResponse({ status: 'nao-encontrado' }, 200, corsHeaders);

    const { data: acesso } = await admin.from('alunos_acesso').select('trainer_user_id,status').eq('aluno_user_id', alunoId).maybeSingle();
    if (!acesso) return jsonResponse({ status: 'nao-encontrado' }, 200, corsHeaders);   // conta de personal ou sem vínculo
    if (acesso.status === 'bloqueado') return jsonResponse({ status: 'bloqueado' }, 200, corsHeaders);

    const { data: aberto } = await admin.from('senha_pedidos').select('id').eq('aluno_user_id', alunoId).eq('status', 'aberto').maybeSingle();
    if (!aberto) {
      const { error } = await admin.from('senha_pedidos').insert({ trainer_user_id: acesso.trainer_user_id, aluno_user_id: alunoId, status: 'aberto' });
      if (error && (error as any).code !== '23505') throw error;   // 23505 = corrida: já existe um aberto
    }
    return jsonResponse({ status: 'ok' }, 200, corsHeaders);
  } catch (e) {
    console.error('esqueci-senha erro:', e);
    return jsonResponse({ error: 'Não foi possível concluir. Tente de novo em instantes.' }, 500, corsHeaders);
  }
});
