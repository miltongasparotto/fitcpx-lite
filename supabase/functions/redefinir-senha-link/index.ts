// Edge Function PÚBLICA (publicar com --no-verify-jwt): o aluno abre o link de redefinição que o
// personal enviou (aluno/?r=<token>) e cria a nova senha, sem estar logado.
//
// Segurança:
//  - o token tem 32 bytes aleatórios; no banco fica só o SHA-256 dele (sql/senha-links.sql);
//  - vale 24 horas e uma vez só; o "gasto" é atômico (update ... where usado_em is null): dois envios
//    simultâneos com o mesmo token não funcionam os dois;
//  - 'verificar' só olha: abrir o link (ou a pré-visualização do WhatsApp) não gasta o token;
//  - freio por origem contra chute de token e de senha.
// Ações: verificar {token}  →  ok | invalido | usado | expirado | bloqueado
//        definir {token, novaSenha}  →  ok (devolve o e-mail para o portal já entrar) | os mesmos erros | senha-invalida
import { corsHeaders } from '../_shared/cors.ts';
import { getAdminClient, jsonResponse } from '../_shared/students.ts';
import { hashToken } from '../_shared/contas.ts';

const JANELA_MS = 10 * 60 * 1000, LIMITE = 20;
const tentativas = new Map<string, number[]>();
function passouDoLimite(chave: string): boolean {
  const agora = Date.now();
  const lista = (tentativas.get(chave) || []).filter((t) => agora - t < JANELA_MS);
  lista.push(agora); tentativas.set(chave, lista);
  if (tentativas.size > 5000) tentativas.clear();
  return lista.length > LIMITE;
}

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Método não permitido.' }, 405, corsHeaders);

  let body: any = {};
  try { body = await req.json(); } catch { /* corpo vazio cai em invalido */ }
  const acao = body?.acao;
  const token = typeof body?.token === 'string' ? body.token : '';
  if (acao !== 'verificar' && acao !== 'definir') return jsonResponse({ error: 'Ação desconhecida.' }, 400, corsHeaders);

  // cf-connecting-ip é gravado pela borda (o cliente não forja); no x-forwarded-for o primeiro item pode vir do cliente, então vale o último.
  const origem = (req.headers.get('cf-connecting-ip') || (req.headers.get('x-forwarded-for') || '').split(',').pop()?.trim() || 'sem-ip').trim();
  if (passouDoLimite(origem)) return jsonResponse({ status: 'muitas-tentativas' }, 200, corsHeaders);
  if (!TOKEN_RE.test(token)) return jsonResponse({ status: 'invalido' }, 200, corsHeaders);

  try {
    const admin = getAdminClient();
    const { data: link } = await admin.from('senha_links').select('id,aluno_user_id,expira_em,usado_em').eq('token_hash', await hashToken(token)).maybeSingle();
    if (!link) return jsonResponse({ status: 'invalido' }, 200, corsHeaders);
    if (link.usado_em) return jsonResponse({ status: 'usado' }, 200, corsHeaders);
    if (new Date(link.expira_em).getTime() < Date.now()) return jsonResponse({ status: 'expirado' }, 200, corsHeaders);
    const { data: acesso } = await admin.from('alunos_acesso').select('status').eq('aluno_user_id', link.aluno_user_id).maybeSingle();
    if (!acesso || acesso.status === 'bloqueado') return jsonResponse({ status: 'bloqueado' }, 200, corsHeaders);

    if (acao === 'verificar') return jsonResponse({ status: 'ok' }, 200, corsHeaders);

    const nova = body?.novaSenha;
    if (typeof nova !== 'string' || nova.length < 6 || nova.length > 72) return jsonResponse({ status: 'senha-invalida' }, 200, corsHeaders);

    // Gasta o link ANTES de trocar a senha, de forma atômica: só um envio vence.
    const { data: gasto } = await admin.from('senha_links').update({ usado_em: new Date().toISOString() })
      .eq('id', link.id).is('usado_em', null).select('id');
    if (!gasto || !gasto.length) return jsonResponse({ status: 'usado' }, 200, corsHeaders);

    const { data: u, error: eU } = await admin.auth.admin.getUserById(link.aluno_user_id);
    if (eU || !u?.user) throw eU || new Error('conta não encontrada');
    const { error: eSenha } = await admin.auth.admin.updateUserById(link.aluno_user_id, {
      password: nova, app_metadata: { ...(u.user.app_metadata || {}), trocar_senha: false },
    });
    if (eSenha) {   // não conseguiu trocar: devolve o link ao aluno para tentar de novo
      await admin.from('senha_links').update({ usado_em: null }).eq('id', link.id);
      throw eSenha;
    }
    return jsonResponse({ status: 'ok', email: u.user.email }, 200, corsHeaders);
  } catch (e) {
    console.error('redefinir-senha-link erro:', e);
    return jsonResponse({ error: 'Não foi possível concluir. Tente de novo em instantes.' }, 500, corsHeaders);
  }
});
