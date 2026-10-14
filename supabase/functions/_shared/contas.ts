// Contas (auth.users) usadas por mais de uma Edge Function: busca por e-mail, senha temporária
// gerada no servidor e conferência da senha atual. Nenhuma dado de aluno aqui.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function acharUsuarioPorEmail(admin: any, email: string): Promise<any | null> {
  let pagina = 1;
  while (pagina <= 50) {
    const { data: lista, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error) throw error;
    const achado = (lista?.users || []).find((u: any) => (u.email || '').toLowerCase() === email);
    if (achado) return achado;
    if (!lista?.users?.length || lista.users.length < 200) return null;
    pagina++;
  }
  return null;
}

// Senha temporária: 10 caracteres, sem os que se confundem (0/O, 1/l/I), com ao menos
// uma maiúscula, uma minúscula e um número. Sorteio criptográfico (nunca Math.random).
export function gerarSenhaTemporaria(): string {
  const maiusc = 'ABCDEFGHJKLMNPQRSTUVWXYZ', minusc = 'abcdefghijkmnopqrstuvwxyz', nums = '23456789';
  const todos = maiusc + minusc + nums;
  const sorteia = (conj: string) => { const b = new Uint32Array(1); crypto.getRandomValues(b); return conj[b[0] % conj.length]; };
  const out = [sorteia(maiusc), sorteia(minusc), sorteia(nums)];
  while (out.length < 10) out.push(sorteia(todos));
  for (let i = out.length - 1; i > 0; i--) {   // embaralha (Fisher-Yates) para a ordem não ser previsível
    const b = new Uint32Array(1); crypto.getRandomValues(b);
    const j = b[0] % (i + 1); [out[i], out[j]] = [out[j], out[i]];
  }
  return out.join('');
}

// Confere a senha ATUAL de quem está logado, tentando entrar com ela num cliente descartável
// (não grava sessão em lugar nenhum). O Supabase já limita tentativas de login por IP.
export async function senhaAtualConfere(email: string, senha: string): Promise<boolean> {
  if (!email || typeof senha !== 'string' || !senha) return false;
  const c: any = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await c.auth.signInWithPassword({ email, password: senha });
  return !error && !!data?.user;
}

// Token de link de redefinição: 32 bytes aleatórios em base64url (43 caracteres). No banco fica só o hash.
export function gerarTokenLink(): string {
  const b = new Uint8Array(32); crypto.getRandomValues(b);
  let bin = ''; for (const x of b) bin += String.fromCharCode(x);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export async function hashToken(token: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(d), (x) => x.toString(16).padStart(2, '0')).join('');
}
