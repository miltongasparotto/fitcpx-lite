// Cola das Edge Functions (trainer-transferencia, aluno-api, transferencia-cron) rodando em Node
// contra um Supabase falso em memória. A lógica de decisão já é testada em vinculo.test.mts;
// aqui o alvo é a "cola": encadeamento das consultas, quem pode o quê, ordem das gravações.
//   node --test tests/trainer-transferencia.test.mts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

// ── Supabase falso ──────────────────────────────────────────────────────────
type Row = Record<string, any>;
const db: Record<string, Row[]> = {};
const users: Record<string, { id: string; email: string; password?: string; app_metadata?: any; user_metadata?: any }> = {};
const tokens: Record<string, string> = {};
const tabela = (n: string) => (db[n] ||= []);
const resetar = () => { for (const k of Object.keys(db)) delete db[k]; for (const k of Object.keys(users)) delete users[k]; for (const k of Object.keys(tokens)) delete tokens[k]; };

class Q {
  modo = 'select'; payload: any = null; filtros: ((r: Row) => boolean)[] = []; lim = Infinity; devolve = false;
  t: string;
  constructor(t: string) { this.t = t; }
  select() { if (this.modo !== 'select') this.devolve = true; return this; }
  insert(p: any) { this.modo = 'insert'; this.payload = p; return this; }
  update(p: any) { this.modo = 'update'; this.payload = p; return this; }
  upsert(p: any) { this.modo = 'upsert'; this.payload = p; return this; }
  eq(c: string, v: any) { this.filtros.push((r) => r[c] === v); return this; }
  in(c: string, vs: any[]) { this.filtros.push((r) => vs.includes(r[c])); return this; }
  is(c: string, v: any) { this.filtros.push((r) => (r[c] ?? null) === v); return this; }
  lte(c: string, v: any) { this.filtros.push((r) => r[c] != null && r[c] <= v); return this; }
  or(s: string) {
    const ps = s.split(',').map((x) => x.split('.'));
    this.filtros.push((r) => ps.some(([c, , v]) => r[c] === v)); return this;
  }
  order() { return this; }
  limit(n: number) { this.lim = n; return this; }
  private exec(): { data: any; error: any } {
    const tb = tabela(this.t);
    if (this.modo === 'insert') {
      const linhas = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((p) => ({ id: randomUUID(), criado_em: new Date().toISOString(), ...p }));
      if (this.t === 'transferencias_vinculo') {
        for (const l of linhas) if (['aguardando_aluno', 'pendente'].includes(l.status) && tb.some((r) => r.identidade_id === l.identidade_id && ['aguardando_aluno', 'pendente'].includes(r.status))) return { data: null, error: { message: 'duplicate key value (uma aberta por identidade)' } };
      }
      if (this.t === 'alunos_identidade') for (const l of linhas) if (tb.some((r) => r.cpf_hash === l.cpf_hash)) return { data: null, error: { message: 'duplicate key cpf_hash' } };
      tb.push(...linhas);
      return { data: this.devolve ? linhas : null, error: null };
    }
    if (this.modo === 'upsert') {
      for (const p of Array.isArray(this.payload) ? this.payload : [this.payload]) {
        const i = tb.findIndex((r) => r.user_id === p.user_id && r.key === p.key);
        if (i >= 0) tb[i] = { ...tb[i], ...structuredClone(p) }; else tb.push(structuredClone(p));
      }
      return { data: null, error: null };
    }
    const alvo = tb.filter((r) => this.filtros.every((f) => f(r)));
    if (this.modo === 'update') { alvo.forEach((r) => Object.assign(r, structuredClone(this.payload))); return { data: this.devolve ? alvo : null, error: null }; }
    return { data: structuredClone(alvo.slice(0, this.lim)), error: null };
  }
  maybeSingle() { const r = this.exec(); return Promise.resolve({ data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data, error: r.error }); }
  single() { const r = this.exec(); const d = Array.isArray(r.data) ? r.data[0] : r.data; return Promise.resolve({ data: d ?? null, error: r.error || (d ? null : { message: 'sem linha' }) }); }
  then(res: any, rej: any) { return Promise.resolve(this.exec()).then(res, rej); }
}

const admin = {
  from: (t: string) => new Q(t),
  auth: {
    signInWithPassword: async ({ email, password }: any) => { const u = Object.values(users).find((x) => x.email === email && x.password === password); return u ? { data: { user: u }, error: null } : { data: null, error: { message: 'Invalid login credentials' } }; },
    getUser: async (jwt: string) => { const u = users[tokens[jwt]]; return u ? { data: { user: u }, error: null } : { data: null, error: { message: 'jwt' } }; },
    admin: {
      getUserById: async (id: string) => (users[id] ? { data: { user: users[id] }, error: null } : { data: null, error: { message: 'not found' } }),
      listUsers: async () => ({ data: { users: Object.values(users) }, error: null }),
      createUser: async ({ email, password, app_metadata, user_metadata }: any) => {
        if (Object.values(users).some((u) => u.email === email)) return { data: null, error: { message: 'already registered' } };
        const id = randomUUID(); users[id] = { id, email, password, app_metadata: app_metadata || {}, user_metadata: user_metadata || {} }; return { data: { user: users[id] }, error: null };
      },
      updateUserById: async (id: string, p: any) => {
        if (p.email && Object.values(users).some((u) => u.email === p.email && u.id !== id)) return { error: { message: 'already registered' } };
        Object.assign(users[id], p.email ? { email: p.email } : {}, p.password ? { password: p.password } : {}, p.app_metadata ? { app_metadata: { ...(users[id].app_metadata || {}), ...p.app_metadata } } : {}, p.user_metadata ? { user_metadata: { ...(users[id].user_metadata || {}), ...p.user_metadata } } : {}); return { error: null };
      },
    },
  },
};

const stub = pathToFileURL(new URL('./_stub-supabase.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')).href;
registerHooks({ resolve(spec, ctx, next) { return spec.startsWith('https://esm.sh/') ? { url: stub, shortCircuit: true } : next(spec, ctx); } });
(globalThis as any).__admin = admin;
let handler: (r: Request) => Promise<Response>, handlerCron: (r: Request) => Promise<Response>, handlerAluno: (r: Request) => Promise<Response>, handlerEsqueci: (r: Request) => Promise<Response>, handlerLink: (r: Request) => Promise<Response>;
const envs: Record<string, string> = { CPF_PEPPER: 'pepper-de-teste-com-mais-de-16-chars', CRON_SECRET: 'cron-secret-de-teste-0123456789', SUPABASE_URL: 'http://x', SUPABASE_SERVICE_ROLE_KEY: 'k' };
(globalThis as any).Deno = { env: { get: (k: string) => envs[k] }, serve: (h: any) => { (globalThis as any).__ultimo = h; } };
await import('../supabase/functions/trainer-transferencia/index.ts'); handler = (globalThis as any).__ultimo;
await import('../supabase/functions/transferencia-cron/index.ts'); handlerCron = (globalThis as any).__ultimo;
await import('../supabase/functions/aluno-api/index.ts'); handlerAluno = (globalThis as any).__ultimo;
await import('../supabase/functions/esqueci-senha/index.ts'); handlerEsqueci = (globalThis as any).__ultimo;
await import('../supabase/functions/redefinir-senha-link/index.ts'); handlerLink = (globalThis as any).__ultimo;

// ── Utilidades ──────────────────────────────────────────────────────────────
const CPF = '52998224725';
function usuario(email: string, nome?: string) { const id = randomUUID(); users[id] = { id, email }; tokens['tok-' + email] = id; void nome; return id; }
async function chamar(h: typeof handler, email: string, corpo: any) {
  const r = await h(new Request('http://x', { method: 'POST', headers: { Authorization: 'Bearer tok-' + email, 'content-type': 'application/json' }, body: JSON.stringify(corpo) }));
  return { http: r.status, ...(await r.json()) } as any;
}
const personal = (e: string, c: any) => chamar(handler, e, c);
const aluno = (e: string, c: any) => chamar(handlerAluno, e, c);
const blob = (uid: string) => (tabela('app_data').find((r) => r.user_id === uid && r.key === 'students')?.data || []) as any[];
function semeiaPersonal(email: string, nome: string, alunos: any[] = []) {
  const id = usuario(email);
  tabela('personal_links').push({ trainer_user_id: id, codigo: 'COD' + nome.slice(0, 3).toUpperCase() + 'XXXXXX', nome_exibicao: nome });
  tabela('app_data').push({ user_id: id, key: 'students', data: alunos });
  return id;
}
const novoAluno = (id: number, perfil: any, extra: any = {}) => ({ id, perfil, anamnese: {}, treinos: [], avaliacoesAntro: [], ...extra });

// ── Testes ──────────────────────────────────────────────────────────────────

test('registrar-aluno: guarda só o hash do CPF e responde ok', async () => {
  resetar();
  const A = semeiaPersonal('a@x.com', 'Ana', [novoAluno(1, { nome: 'Carla Souza', email: 'carla@x.com' })]);
  const r = await personal('a@x.com', { acao: 'registrar-aluno', studentId: 1, nome: 'Carla Souza', cpf: '529.982.247-25', email: 'carla@x.com' });
  assert.equal(r.status, 'ok');
  const ids = tabela('alunos_identidade');
  assert.equal(ids.length, 1);
  assert.equal(ids[0].trainer_user_id, A);
  assert.ok(!JSON.stringify(ids[0]).includes(CPF), 'CPF em claro na tabela central');
  assert.match(ids[0].cpf_hash, /^[0-9a-f]{64}$/);
  // de novo, mesmos dados: atualiza o mesmo registro, não duplica
  const r2 = await personal('a@x.com', { acao: 'registrar-aluno', studentId: 1, nome: 'Carla Souza', cpf: CPF, email: 'carla@x.com' });
  assert.equal(r2.status, 'ok'); assert.equal(tabela('alunos_identidade').length, 1);
});

test('registrar-aluno: CPF inválido, aluno de outro personal e rejeição sem login', async () => {
  resetar();
  semeiaPersonal('a@x.com', 'Ana', [novoAluno(1, { nome: 'Carla' })]);
  assert.equal((await personal('a@x.com', { acao: 'registrar-aluno', studentId: 1, nome: 'Carla', cpf: '11111111111', email: '' })).status, 'cpf-invalido');
  const sem = await handler(new Request('http://x', { method: 'POST', body: '{}' }));
  assert.equal(sem.status, 401);
  assert.equal((await personal('a@x.com', { acao: 'registrar-aluno', studentId: 999, nome: 'X', cpf: CPF, email: '' })).http, 400);
});

test('conflito -> solicitar-troca (personal novo) -> lista dos dois lados -> trava no cadastro', async () => {
  resetar();
  const A = semeiaPersonal('a@x.com', 'Ana Costa', [novoAluno(10, { nome: 'Carla Souza', email: 'carla@x.com' }, { treinos: [{ id: 1 }] })]);
  const B = semeiaPersonal('b@x.com', 'Bruno Lima', [novoAluno(20, { nome: 'Carla Souza', email: 'carla@x.com' })]);
  assert.equal((await personal('a@x.com', { acao: 'registrar-aluno', studentId: 10, nome: 'Carla Souza', cpf: CPF, email: 'carla@x.com' })).status, 'ok');

  const c = await personal('b@x.com', { acao: 'registrar-aluno', studentId: 20, nome: 'Carla Souza', cpf: CPF, email: 'carla@x.com' });
  assert.equal(c.status, 'conflito'); assert.equal(c.personalNome, 'Ana Costa');
  // e-mail diferente: não revela que é o mesmo aluno, só pede o mesmo e-mail
  const d = await personal('b@x.com', { acao: 'registrar-aluno', studentId: 20, nome: 'Carla Souza', cpf: CPF, email: 'outro@x.com' });
  assert.equal(d.status, 'email-diferente');
  // nome diferente: divergência
  assert.equal((await personal('b@x.com', { acao: 'registrar-aluno', studentId: 20, nome: 'Fulana Qualquer', cpf: CPF, email: 'carla@x.com' })).status, 'divergencia');

  const s = await personal('b@x.com', { acao: 'solicitar-troca', studentId: 20, nome: 'Carla Souza', cpf: CPF, email: 'carla@x.com' });
  assert.equal(s.status, 'ok'); assert.equal(s.esperaAluno, true); assert.equal(s.alunoTemConta, false);
  const t = tabela('transferencias_vinculo')[0];
  assert.equal(t.status, 'aguardando_aluno'); assert.equal(t.prazo_em ?? null, null);
  assert.equal(t.trainer_atual_id, A); assert.equal(t.trainer_novo_id, B);
  // segundo pedido do mesmo personal: devolve o mesmo
  assert.equal((await personal('b@x.com', { acao: 'solicitar-troca', studentId: 20, nome: 'Carla Souza', cpf: CPF, email: 'carla@x.com' })).status, 'ja-solicitado');

  const la = await personal('a@x.com', { acao: 'listar' });
  assert.equal(la.saindo.length, 1); assert.equal(la.saindo[0].studentId, 10); assert.equal(la.saindo[0].outroNome, 'Bruno Lima');
  assert.ok(!JSON.stringify(la).includes(CPF), 'listar vazou CPF');
  const lb = await personal('b@x.com', { acao: 'listar' });
  assert.equal(lb.chegando.length, 1); assert.equal(lb.chegando[0].rascunhoId, 20); assert.equal(lb.chegando[0].outroNome, 'Ana Costa');

  // cadastro travado nos dois lados
  assert.equal((await personal('a@x.com', { acao: 'registrar-aluno', studentId: 10, nome: 'Carla Souza', cpf: CPF, email: 'carla@x.com' })).status, 'travado');
  assert.equal((await personal('a@x.com', { acao: 'alterar-email-aluno', studentId: 10, novoEmail: 'n@x.com' })).http, 400);
});

test('antecipar: só o personal ATUAL; com treinos leva tudo; rascunho do novo some', async () => {
  resetar();
  const A = semeiaPersonal('a@x.com', 'Ana', [novoAluno(10, { nome: 'Carla Souza', email: 'carla@x.com' }, { treinos: [{ id: 1 }], avaliacoesAntro: [{ id: 5 }] })]);
  const B = semeiaPersonal('b@x.com', 'Bruno', [novoAluno(20, { nome: 'Carla Souza', email: 'carla@x.com' })]);
  semeiaPersonal('c@x.com', 'Caio');
  await personal('a@x.com', { acao: 'registrar-aluno', studentId: 10, nome: 'Carla Souza', cpf: CPF, email: 'carla@x.com' });
  await personal('b@x.com', { acao: 'solicitar-troca', studentId: 20, nome: 'Carla Souza', cpf: CPF, email: 'carla@x.com' });
  const id = tabela('transferencias_vinculo')[0].id;

  assert.equal((await personal('b@x.com', { acao: 'antecipar', id, manterTreinos: true })).http, 400, 'o novo não pode liberar');
  assert.equal((await personal('c@x.com', { acao: 'antecipar', id, manterTreinos: true })).http, 400, 'terceiro não pode');
  assert.equal((await personal('a@x.com', { acao: 'antecipar', id: 'nao-uuid', manterTreinos: true })).http, 400);

  assert.equal((await personal('a@x.com', { acao: 'antecipar', id, manterTreinos: true })).status, 'ok');
  assert.equal(blob(A).length, 0);
  const nb = blob(B);
  assert.equal(nb.length, 1, 'rascunho tem que sair, só o aluno de verdade fica');
  assert.equal(nb[0].treinos.length, 1); assert.equal(nb[0].avaliacoesAntro.length, 1);
  assert.equal(tabela('alunos_identidade')[0].trainer_user_id, B);
  assert.equal(tabela('transferencias_vinculo')[0].status, 'concluida');
  assert.equal((await personal('a@x.com', { acao: 'antecipar', id, manterTreinos: true })).http, 400, 'não resolve duas vezes');
});

test('antecipar sem treinos: zera treinos e prescrição, mantém avaliações', async () => {
  resetar();
  semeiaPersonal('a@x.com', 'Ana', [novoAluno(10, { nome: 'Carla Souza', email: 'carla@x.com' }, { treinos: [{ id: 1 }], prescricao: { x: 1 }, avaliacoesAntro: [{ id: 5 }] })]);
  const B = semeiaPersonal('b@x.com', 'Bruno', [novoAluno(20, { nome: 'Carla Souza', email: 'carla@x.com' })]);
  await personal('a@x.com', { acao: 'registrar-aluno', studentId: 10, nome: 'Carla Souza', cpf: CPF, email: 'carla@x.com' });
  await personal('b@x.com', { acao: 'solicitar-troca', studentId: 20, nome: 'Carla Souza', cpf: CPF, email: 'carla@x.com' });
  await personal('a@x.com', { acao: 'antecipar', id: tabela('transferencias_vinculo')[0].id, manterTreinos: false });
  const a = blob(B)[0];
  assert.deepEqual(a.treinos, []); assert.deepEqual(a.prescricao, {}); assert.equal(a.avaliacoesAntro.length, 1);
  assert.equal(a.perfil.transferidoDe.comTreinos, false);
});

test('cancelar: só o personal novo que abriu, só antes de o aluno confirmar', async () => {
  resetar();
  semeiaPersonal('a@x.com', 'Ana', [novoAluno(10, { nome: 'Carla Souza', email: 'carla@x.com' })]);
  semeiaPersonal('b@x.com', 'Bruno', [novoAluno(20, { nome: 'Carla Souza', email: 'carla@x.com' })]);
  await personal('a@x.com', { acao: 'registrar-aluno', studentId: 10, nome: 'Carla Souza', cpf: CPF, email: 'carla@x.com' });
  await personal('b@x.com', { acao: 'solicitar-troca', studentId: 20, nome: 'Carla Souza', cpf: CPF, email: 'carla@x.com' });
  const id = tabela('transferencias_vinculo')[0].id;
  assert.equal((await personal('a@x.com', { acao: 'cancelar', id })).http, 400);
  assert.equal((await personal('b@x.com', { acao: 'cancelar', id })).status, 'ok');
  assert.equal(tabela('transferencias_vinculo')[0].status, 'cancelada');
  // destravou
  assert.equal((await personal('a@x.com', { acao: 'registrar-aluno', studentId: 10, nome: 'Carla Souza', cpf: CPF, email: 'carla@x.com' })).status, 'ok');
});

test('responder-novo: recusar encerra; aceitar marca o aceite', async () => {
  resetar();
  semeiaPersonal('a@x.com', 'Ana', [novoAluno(10, { nome: 'Carla Souza', email: 'carla@x.com' })]);
  const B = semeiaPersonal('b@x.com', 'Bruno');
  const ident = { id: randomUUID(), cpf_hash: 'h', nome_norm: 'carla souza', email_norm: 'carla@x.com', trainer_user_id: 'x', aluno_user_id: null, student_id: 10 };
  tabela('alunos_identidade').push(ident);
  tabela('transferencias_vinculo').push({ id: randomUUID(), identidade_id: ident.id, trainer_atual_id: 'x', trainer_novo_id: B, student_id: 10, aluno_user_id: null, iniciado_por: 'aluno', status: 'pendente', prazo_em: new Date(Date.now() + 86400000).toISOString(), snapshot: { nome: 'Carla' } });
  const id = tabela('transferencias_vinculo')[0].id;
  assert.equal((await personal('a@x.com', { acao: 'responder-novo', id, aceitar: true })).http, 400);
  assert.equal((await personal('b@x.com', { acao: 'responder-novo', id, aceitar: true })).status, 'ok');
  assert.ok(tabela('transferencias_vinculo')[0].aceite_novo_em);
  assert.equal((await personal('b@x.com', { acao: 'responder-novo', id, aceitar: false })).status, 'ok');
  assert.equal(tabela('transferencias_vinculo')[0].status, 'cancelada');
});

test('listar executa prazo vencido (sem treinos) e avisa quantas', async () => {
  resetar();
  const A = semeiaPersonal('a@x.com', 'Ana', [novoAluno(10, { nome: 'Carla Souza', email: 'carla@x.com' }, { treinos: [{ id: 1 }] })]);
  const B = semeiaPersonal('b@x.com', 'Bruno');
  const ident = { id: randomUUID(), cpf_hash: 'h', nome_norm: 'carla souza', email_norm: 'carla@x.com', trainer_user_id: A, aluno_user_id: null, student_id: 10 };
  tabela('alunos_identidade').push(ident);
  const mk = (dias: number) => ({ id: randomUUID(), identidade_id: ident.id, trainer_atual_id: A, trainer_novo_id: B, student_id: 10, aluno_user_id: null, iniciado_por: 'aluno', status: 'pendente', prazo_em: new Date(Date.now() + dias * 86400000).toISOString(), snapshot: { nome: 'Carla' } });
  tabela('transferencias_vinculo').push(mk(5));
  let l = await personal('a@x.com', { acao: 'listar' });
  assert.equal(l.executadas, 0); assert.equal(l.saindo.length, 1); assert.equal(blob(A).length, 1);
  tabela('transferencias_vinculo')[0].prazo_em = new Date(Date.now() - 1000).toISOString();
  l = await personal('a@x.com', { acao: 'listar' });
  assert.equal(l.executadas, 1); assert.equal(l.saindo.length, 0);
  assert.equal(blob(A).length, 0); assert.equal(blob(B).length, 1); assert.deepEqual(blob(B)[0].treinos, []);
});

test('definir-senha: cria conta do aluno do próprio personal; recusa e-mail de outro personal ou de personal', async () => {
  resetar();
  const A = semeiaPersonal('a@x.com', 'Ana', [novoAluno(10, { nome: 'Carla', email: 'carla@x.com' }), novoAluno(11, { nome: 'Pedro', email: 'b@x.com' }), novoAluno(12, { nome: 'Dani', email: 'dani@x.com' })]);
  semeiaPersonal('b@x.com', 'Bruno');                                   // b@x.com é conta de personal
  const outroAluno = usuario('dani@x.com');                              // dani já é aluna de OUTRO personal
  tabela('alunos_acesso').push({ trainer_user_id: 'outro-trainer', aluno_user_id: outroAluno, status: 'ativo' });

  assert.equal((await personal('a@x.com', { acao: 'definir-senha', email: 'carla@x.com', novaSenha: '123456' })).status, 'ok');
  const conta = Object.values(users).find((u) => u.email === 'carla@x.com')!;
  assert.equal(conta.password, '123456');
  assert.deepEqual(tabela('alunos_acesso').filter((r) => r.aluno_user_id === conta.id).map((r) => r.trainer_user_id), [A]);
  assert.equal(blob(A).find((s) => s.id === 10).perfil.alunoUserId, conta.id);
  // reset da própria aluna
  assert.equal((await personal('a@x.com', { acao: 'definir-senha', email: 'carla@x.com', novaSenha: 'nova-senha' })).status, 'ok');
  assert.equal(users[conta.id].password, 'nova-senha');

  assert.equal((await personal('a@x.com', { acao: 'definir-senha', email: 'b@x.com', novaSenha: '123456' })).http, 400, 'conta de personal');
  assert.equal(users[tokens['tok-b@x.com']].password, undefined);
  assert.equal((await personal('a@x.com', { acao: 'definir-senha', email: 'dani@x.com', novaSenha: '123456' })).http, 400, 'aluno de outro personal');
  assert.equal((await personal('a@x.com', { acao: 'definir-senha', email: 'ninguem@x.com', novaSenha: '123456' })).http, 400, 'e-mail fora do cadastro');
  assert.equal((await personal('a@x.com', { acao: 'definir-senha', email: 'carla@x.com', novaSenha: '123' })).http, 400, 'senha curta');
});

test('alterar-email-aluno: só aluno com conta e do próprio personal; atualiza login, índice e blob', async () => {
  resetar();
  const A = semeiaPersonal('a@x.com', 'Ana', [novoAluno(10, { nome: 'Carla', email: 'carla@x.com' }), novoAluno(11, { nome: 'Sem Conta', email: 's@x.com' })]);
  const contaId = usuario('carla@x.com'); blob(A)[0].perfil.alunoUserId = contaId;
  tabela('alunos_acesso').push({ trainer_user_id: A, aluno_user_id: contaId, status: 'ativo' });
  tabela('alunos_identidade').push({ id: randomUUID(), cpf_hash: 'h', nome_norm: 'carla', email_norm: 'carla@x.com', trainer_user_id: A, aluno_user_id: contaId, student_id: 10 });
  usuario('ocupado@x.com');
  assert.equal((await personal('a@x.com', { acao: 'alterar-email-aluno', studentId: 10, novoEmail: 'ocupado@x.com' })).status, 'email-em-uso');
  assert.equal((await personal('a@x.com', { acao: 'alterar-email-aluno', studentId: 10, novoEmail: 'invalido' })).http, 400);
  assert.equal((await personal('a@x.com', { acao: 'alterar-email-aluno', studentId: 11, novoEmail: 'n@x.com' })).http, 400, 'sem conta');
  assert.equal((await personal('a@x.com', { acao: 'alterar-email-aluno', studentId: 10, novoEmail: 'Novo@X.com' })).status, 'ok');
  assert.equal(users[contaId].email, 'novo@x.com');
  assert.equal(tabela('alunos_identidade')[0].email_norm, 'novo@x.com');
  assert.equal(blob(A)[0].perfil.email, 'novo@x.com');
});

test('definir-nome cria/atualiza o nome que outros personals veem', async () => {
  resetar();
  const A = usuario('a@x.com');
  assert.equal((await personal('a@x.com', { acao: 'definir-nome', nome: '  Ana Costa  ' })).status, 'ok');
  assert.equal(tabela('personal_links').find((r) => r.trainer_user_id === A)!.nome_exibicao, 'Ana Costa');
  assert.equal((await personal('a@x.com', { acao: 'definir-nome', nome: 'Ana C.' })).status, 'ok');
  assert.equal(tabela('personal_links').length, 1);
  assert.equal((await personal('a@x.com', { acao: 'definir-nome', nome: '' })).http, 400);
});

test('cron: recusa sem o segredo; com ele executa prazos vencidos', async () => {
  resetar();
  const A = semeiaPersonal('a@x.com', 'Ana', [novoAluno(10, { nome: 'Carla', email: 'c@x.com' })]);
  const B = semeiaPersonal('b@x.com', 'Bruno');
  tabela('alunos_identidade').push({ id: 'i1', cpf_hash: 'h', nome_norm: 'carla', email_norm: 'c@x.com', trainer_user_id: A, aluno_user_id: null, student_id: 10 });
  tabela('transferencias_vinculo').push({ id: randomUUID(), identidade_id: 'i1', trainer_atual_id: A, trainer_novo_id: B, student_id: 10, aluno_user_id: null, iniciado_por: 'aluno', status: 'pendente', prazo_em: new Date(Date.now() - 1000).toISOString(), snapshot: {} });
  assert.equal((await handlerCron(new Request('http://x', { method: 'POST' }))).status, 401);
  assert.equal((await handlerCron(new Request('http://x', { method: 'POST', headers: { 'x-cron-secret': 'errado-errado-errado-1234' } }))).status, 401);
  const r = await handlerCron(new Request('http://x', { method: 'POST', headers: { 'x-cron-secret': envs.CRON_SECRET } }));
  assert.equal(r.status, 200); assert.equal((await r.json()).executadas, 1);
  assert.equal(blob(B).length, 1);
});

test('aluno-api: link novo cria aluno; mesmo CPF por outro personal vira conflito e pedido de troca (30 dias, acesso mantido)', async () => {
  resetar();
  const A = semeiaPersonal('a@x.com', 'Ana Costa');
  const B = semeiaPersonal('b@x.com', 'Bruno Lima');
  const codA = tabela('personal_links').find((r) => r.trainer_user_id === A)!.codigo;
  const codB = tabela('personal_links').find((r) => r.trainer_user_id === B)!.codigo;
  tabela('alunos_acesso');
  // RPC resolver_codigo é do navegador; a função usa a tabela direto
  const al = usuario('carla@x.com');
  const perfil = { nome: 'Carla Souza', cpf: CPF, nascimento: '1990-05-20', sexo: 'F', whatsapp: '(44) 99999-1111', profissao: 'Professora' };

  assert.equal((await aluno('carla@x.com', { acao: 'resolver-vinculo', codigo: codA })).status, 'precisa-cadastro');
  assert.equal((await aluno('carla@x.com', { acao: 'cadastro', codigo: codA, perfil: { ...perfil, cpf: '123' } })).status, 'cpf-invalido');
  const ok = await aluno('carla@x.com', { acao: 'cadastro', codigo: codA, perfil });
  assert.equal(ok.status, 'ok'); assert.equal(ok.tipo, 'novo');
  assert.equal(blob(A).length, 1); assert.equal(blob(A)[0].perfil.novoCadastro, true);
  assert.equal((await aluno('carla@x.com', { acao: 'resolver-vinculo', codigo: null })).status, 'ok');

  // refazer o cadastro com o mesmo personal: só atualiza
  const again = await aluno('carla@x.com', { acao: 'cadastro', codigo: codA, perfil: { ...perfil, profissao: 'Médica' } });
  assert.equal(again.tipo, 'atualizado'); assert.equal(blob(A).length, 1); assert.equal(blob(A)[0].perfil.profissao, 'Médica');

  // abre o link do OUTRO personal logado
  const rv = await aluno('carla@x.com', { acao: 'resolver-vinculo', codigo: codB });
  assert.equal(rv.status, 'ok'); assert.equal(rv.outroPersonalNome, 'Bruno Lima');
  const cf = await aluno('carla@x.com', { acao: 'cadastro', codigo: codB, perfil });
  assert.equal(cf.status, 'conflito'); assert.equal(cf.personalNome, 'Ana Costa'); assert.equal(cf.jaHaPedido, false);
  assert.equal(blob(B).length, 0, 'conflito não grava nada no novo personal');

  const tr = await aluno('carla@x.com', { acao: 'solicitar-troca', codigo: codB, perfil });
  assert.equal(tr.status, 'troca-solicitada'); assert.equal(tr.deNome, 'Ana Costa'); assert.equal(tr.paraNome, 'Bruno Lima');
  const t = tabela('transferencias_vinculo')[0];
  assert.equal(t.status, 'pendente');
  const dias = (Date.parse(t.prazo_em) - Date.now()) / 86400000;
  assert.ok(dias > 29.9 && dias < 30.1, 'prazo de 30 dias: ' + dias);
  // acesso e treino continuam com o personal atual
  assert.equal(tabela('alunos_acesso').find((r) => r.aluno_user_id === al)!.trainer_user_id, A);
  const st = await aluno('carla@x.com', { acao: 'status-vinculo' });
  assert.equal(st.personalNome, 'Ana Costa'); assert.equal(st.transferencia.paraNome, 'Bruno Lima');
  // do lado do Personal A: aluno com Transferência (travado), personal B vê chegando
  assert.equal((await personal('a@x.com', { acao: 'listar' })).saindo.length, 1);
  assert.equal((await personal('b@x.com', { acao: 'listar' })).chegando.length, 1);
  assert.equal((await aluno('carla@x.com', { acao: 'solicitar-troca', codigo: codB, perfil })).status, 'troca-solicitada', 'repetir devolve o mesmo pedido, sem duplicar');
  assert.equal(tabela('transferencias_vinculo').length, 1);

  // aluno cancela e fica tudo como estava
  assert.equal((await aluno('carla@x.com', { acao: 'cancelar-troca' })).status, 'ok');
  assert.equal(tabela('transferencias_vinculo')[0].status, 'cancelada');
  assert.equal((await personal('a@x.com', { acao: 'listar' })).saindo.length, 0);
});

test('aluno-api: personal já cadastrou (manual) e o aluno completa pelo link: vincula a conta, não duplica', async () => {
  resetar();
  const A = semeiaPersonal('a@x.com', 'Ana', [novoAluno(10, { nome: 'Carla Souza', email: 'carla@x.com' })]);
  const cod = tabela('personal_links')[0].codigo;
  await personal('a@x.com', { acao: 'registrar-aluno', studentId: 10, nome: 'Carla Souza', cpf: CPF, email: 'carla@x.com' });
  usuario('carla@x.com');
  const r = await aluno('carla@x.com', { acao: 'cadastro', codigo: cod, perfil: { nome: 'Carla Souza', cpf: CPF, nascimento: '1990-05-20', sexo: 'F', whatsapp: '', profissao: '' } });
  assert.equal(r.status, 'ok');
  assert.equal(blob(A).length, 1); assert.equal(blob(A)[0].id, 10);
  assert.ok(blob(A)[0].perfil.alunoUserId);
  // e-mail diferente do que o personal cadastrou: bloqueia
  usuario('outra@x.com');
  const e = await aluno('outra@x.com', { acao: 'cadastro', codigo: cod, perfil: { nome: 'Carla Souza', cpf: CPF, nascimento: '1990-05-20' } });
  assert.notEqual(e.status, 'ok'); assert.equal(blob(A).length, 1);
});

test('aluno-api: aluno antigo sem CPF completa o cadastro pelo link (legado), sem duplicar', async () => {
  resetar();
  const A = semeiaPersonal('a@x.com', 'Ana', [novoAluno(10, { nome: 'Carla Souza', email: 'carla@x.com' })]);
  const cod = tabela('personal_links')[0].codigo;
  usuario('carla@x.com');
  const r = await aluno('carla@x.com', { acao: 'cadastro', codigo: cod, perfil: { nome: 'Carla Souza', cpf: CPF, nascimento: '1990-05-20' } });
  assert.equal(r.status, 'ok'); assert.equal(r.tipo, 'atualizado');
  assert.equal(blob(A).length, 1); assert.equal(blob(A)[0].perfil.cpf, CPF);
  assert.equal(tabela('alunos_identidade').length, 1);
});

// ── Esqueci a senha, redefinição pelo personal, troca de senha e e-mail pelo aluno ──────────
const esqueci = async (email: any, ip = '1.1.1.1') => {
  const r = await handlerEsqueci(new Request('http://x', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip }, body: JSON.stringify({ email }) }));
  return { http: r.status, ...(await r.json()) } as any;
};
function semeiaAlunoComConta(A: string, email: string, senha: string, extra: any = {}) {
  const id = usuario(email); users[id].password = senha; users[id].app_metadata = {}; users[id].user_metadata = {};
  tabela('alunos_acesso').push({ trainer_user_id: A, aluno_user_id: id, status: extra.status || 'ativo' });
  return id;
}

test('esqueci-senha: cria UM pedido para o personal do aluno; repetir não duplica; e-mail desconhecido e bloqueado respondem claro', async () => {
  resetar();
  const A = semeiaPersonal('a@x.com', 'Ana', [novoAluno(10, { nome: 'Carla', email: 'carla@x.com' })]);
  const carla = semeiaAlunoComConta(A, 'carla@x.com', 'senhaantiga');
  const r = await esqueci(' Carla@X.com ');
  assert.equal(r.status, 'ok');
  assert.deepEqual(tabela('senha_pedidos').map((p) => [p.trainer_user_id, p.aluno_user_id, p.status]), [[A, carla, 'aberto']]);
  assert.equal((await esqueci('carla@x.com')).status, 'ok');
  assert.equal(tabela('senha_pedidos').length, 1, 'não duplica pedido aberto');
  assert.equal(users[carla].password, 'senhaantiga', 'esqueci-senha NÃO troca senha');

  assert.equal((await esqueci('ninguem@x.com')).status, 'nao-encontrado');
  assert.equal((await esqueci('a@x.com')).status, 'nao-encontrado', 'conta de personal não gera pedido');
  assert.equal((await esqueci('texto-sem-arroba')).status, 'email-invalido');
  semeiaAlunoComConta(A, 'bloq@x.com', 'x12345', { status: 'bloqueado' });
  assert.equal((await esqueci('bloq@x.com')).status, 'bloqueado');
  assert.equal(tabela('senha_pedidos').length, 1);
});

test('esqueci-senha: freio por origem depois de várias tentativas', async () => {
  resetar();
  let ultimo = '';
  for (let i = 0; i < 12; i++) ultimo = (await esqueci('nao' + i + '@x.com', '9.9.9.9')).status;
  assert.equal(ultimo, 'muitas-tentativas');
  assert.equal((await esqueci('nao@x.com', '8.8.8.8')).status, 'nao-encontrado', 'outra origem não é afetada');
});

test('definir-senha: sem senha digitada o servidor gera uma forte, marca troca obrigatória e atende o pedido', async () => {
  resetar();
  const A = semeiaPersonal('a@x.com', 'Ana', [novoAluno(10, { nome: 'Carla', email: 'carla@x.com' })]);
  const carla = semeiaAlunoComConta(A, 'carla@x.com', 'senhaantiga');
  blob(A)[0].perfil.alunoUserId = carla;
  await esqueci('carla@x.com');
  const r = await personal('a@x.com', { acao: 'definir-senha', email: 'carla@x.com' });
  assert.equal(r.status, 'ok');
  assert.match(r.senhaGerada, /^[A-HJ-NP-Za-km-z2-9]{10}$/, 'sem 0 O 1 l I');
  assert.match(r.senhaGerada, /[A-Z]/); assert.match(r.senhaGerada, /[a-z]/); assert.match(r.senhaGerada, /[0-9]/);
  assert.equal(users[carla].password, r.senhaGerada);
  assert.equal(users[carla].app_metadata.trocar_senha, true);
  assert.equal(tabela('senha_pedidos')[0].status, 'atendido');
  assert.ok(tabela('senha_pedidos')[0].atendido_em);
  const outra = await personal('a@x.com', { acao: 'definir-senha', email: 'carla@x.com', novaSenha: '  Escolhida9 ' });
  assert.equal(outra.status, 'ok'); assert.equal(outra.senhaGerada, undefined, 'senha digitada não volta como gerada');
  assert.equal(users[carla].password, 'Escolhida9');
  assert.equal(users[carla].app_metadata.trocar_senha, false, 'senha escolhida pelo personal (aluno presente) não obriga a troca e limpa a marca anterior');
  assert.notEqual(r.senhaGerada, (await personal('a@x.com', { acao: 'definir-senha', email: 'carla@x.com' })).senhaGerada, 'cada geração é diferente');
});

test('aluno alterar-senha: exige a senha atual certa e senha nova válida e diferente', async () => {
  resetar();
  const A = semeiaPersonal('a@x.com', 'Ana', [novoAluno(10, { nome: 'Carla', email: 'carla@x.com' })]);
  const carla = semeiaAlunoComConta(A, 'carla@x.com', 'senhaantiga');
  assert.equal((await aluno('carla@x.com', { acao: 'alterar-senha', senhaAtual: 'errada', novaSenha: 'novasenha1' })).status, 'senha-incorreta');
  assert.equal(users[carla].password, 'senhaantiga');
  assert.equal((await aluno('carla@x.com', { acao: 'alterar-senha', senhaAtual: 'senhaantiga', novaSenha: '123' })).http, 400, 'curta');
  assert.equal((await aluno('carla@x.com', { acao: 'alterar-senha', senhaAtual: 'senhaantiga', novaSenha: 'senhaantiga' })).http, 400, 'igual à atual');
  assert.equal((await aluno('carla@x.com', { acao: 'alterar-senha', senhaAtual: 'senhaantiga', novaSenha: 'novasenha1' })).status, 'ok');
  assert.equal(users[carla].password, 'novasenha1');
});

test('aluno trocar-senha-obrigatoria: só vale com a marca do servidor e a limpa', async () => {
  resetar();
  const A = semeiaPersonal('a@x.com', 'Ana', [novoAluno(10, { nome: 'Carla', email: 'carla@x.com' })]);
  const carla = semeiaAlunoComConta(A, 'carla@x.com', 'temporaria1');
  assert.equal((await aluno('carla@x.com', { acao: 'trocar-senha-obrigatoria', novaSenha: 'minhasenha1' })).http, 400, 'sem marca não troca sem a senha atual');
  assert.equal(users[carla].password, 'temporaria1');
  users[carla].app_metadata = { trocar_senha: true };
  assert.equal((await aluno('carla@x.com', { acao: 'trocar-senha-obrigatoria', novaSenha: '123' })).http, 400, 'curta');
  assert.equal((await aluno('carla@x.com', { acao: 'trocar-senha-obrigatoria', novaSenha: 'minhasenha1' })).status, 'ok');
  assert.equal(users[carla].password, 'minhasenha1');
  assert.equal(users[carla].app_metadata.trocar_senha, false);
  assert.equal((await aluno('carla@x.com', { acao: 'trocar-senha-obrigatoria', novaSenha: 'outrasenha1' })).http, 400, 'marca já limpa');
});

test('aluno alterar-email: exige e-mail atual e senha atual certos; atualiza login, índice e blob', async () => {
  resetar();
  const A = semeiaPersonal('a@x.com', 'Ana', [novoAluno(10, { nome: 'Carla', email: 'carla@x.com' })]);
  const carla = semeiaAlunoComConta(A, 'carla@x.com', 'senhaantiga'); blob(A)[0].perfil.alunoUserId = carla;
  tabela('alunos_identidade').push({ id: randomUUID(), cpf_hash: 'h', nome_norm: 'carla', email_norm: 'carla@x.com', trainer_user_id: A, aluno_user_id: carla, student_id: 10 });
  usuario('ocupado@x.com');
  const base = { acao: 'alterar-email', emailAtual: 'carla@x.com', senhaAtual: 'senhaantiga' };
  assert.equal((await aluno('carla@x.com', { ...base, emailAtual: 'outro@x.com', novoEmail: 'n@x.com' })).status, 'email-atual-nao-confere');
  assert.equal((await aluno('carla@x.com', { ...base, senhaAtual: 'errada', novoEmail: 'n@x.com' })).status, 'senha-incorreta');
  assert.equal((await aluno('carla@x.com', { ...base, novoEmail: 'invalido' })).http, 400);
  assert.equal((await aluno('carla@x.com', { ...base, novoEmail: 'ocupado@x.com' })).status, 'email-em-uso');
  assert.equal((await aluno('carla@x.com', { acao: 'alterar-email', novoEmail: 'n@x.com' })).status, 'email-atual-nao-confere', 'chamada antiga sem os dois dados é recusada');
  assert.equal(users[carla].email, 'carla@x.com');
  assert.equal((await aluno('carla@x.com', { ...base, emailAtual: ' CARLA@x.com ', novoEmail: 'Novo@X.com' })).status, 'ok');
  assert.equal(users[carla].email, 'novo@x.com');
  assert.equal(tabela('alunos_identidade')[0].email_norm, 'novo@x.com');
  assert.equal(blob(A)[0].perfil.email, 'novo@x.com');
});

// ── Link de redefinição de senha (o personal gera, o aluno cria a nova senha sozinho) ───────
const link = async (corpo: any, ip = '3.3.3.3') => {
  const r = await handlerLink(new Request('http://x', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip }, body: JSON.stringify(corpo) }));
  return { http: r.status, ...(await r.json()) } as any;
};

test('gerar-link-senha: só aluno do próprio personal com conta; guarda só o hash; novo link cancela o anterior; atende o pedido', async () => {
  resetar();
  const A = semeiaPersonal('a@x.com', 'Ana', [novoAluno(10, { nome: 'Carla', email: 'carla@x.com' }), novoAluno(11, { nome: 'Sem Conta', email: 's@x.com' }), novoAluno(12, { nome: 'Dani', email: 'dani@x.com' })]);
  const carla = semeiaAlunoComConta(A, 'carla@x.com', 'senhaantiga');
  const outro = usuario('dani@x.com'); tabela('alunos_acesso').push({ trainer_user_id: 'outro-trainer', aluno_user_id: outro, status: 'ativo' });
  await esqueci('carla@x.com');
  const r = await personal('a@x.com', { acao: 'gerar-link-senha', email: 'carla@x.com' });
  assert.equal(r.status, 'ok');
  assert.match(r.token, /^[A-Za-z0-9_-]{43}$/);
  const linhas = tabela('senha_links');
  assert.equal(linhas.length, 1);
  assert.ok(!JSON.stringify(linhas).includes(r.token), 'o token nunca fica no banco, só o hash');
  assert.match(linhas[0].token_hash, /^[0-9a-f]{64}$/);
  const horas = (new Date(linhas[0].expira_em).getTime() - Date.now()) / 3600000;
  assert.ok(horas > 23.9 && horas <= 24.01, 'vale 24 horas: ' + horas);
  assert.equal(users[carla].password, 'senhaantiga', 'gerar o link não troca a senha');
  assert.equal(tabela('senha_pedidos')[0].status, 'atendido');

  const r2 = await personal('a@x.com', { acao: 'gerar-link-senha', email: 'carla@x.com' });
  assert.notEqual(r2.token, r.token);
  assert.equal(tabela('senha_links').filter((l) => !l.usado_em).length, 1, 'só o link novo continua valendo');
  assert.equal((await link({ acao: 'verificar', token: r.token })).status, 'usado', 'o link antigo foi cancelado');
  assert.equal((await link({ acao: 'verificar', token: r2.token })).status, 'ok');

  assert.equal((await personal('a@x.com', { acao: 'gerar-link-senha', email: 's@x.com' })).http, 400, 'sem conta no portal');
  assert.equal((await personal('a@x.com', { acao: 'gerar-link-senha', email: 'dani@x.com' })).http, 400, 'aluno de outro personal');
  assert.equal((await personal('a@x.com', { acao: 'gerar-link-senha', email: 'ninguem@x.com' })).http, 400, 'e-mail fora do cadastro');
  assert.equal((await personal('a@x.com', { acao: 'gerar-link-senha', email: 'invalido' })).http, 400);
  const sem = await handler(new Request('http://x', { method: 'POST', body: JSON.stringify({ acao: 'gerar-link-senha', email: 'carla@x.com' }) }));
  assert.equal(sem.status, 401, 'só personal logado gera link');
});

test('redefinir-senha-link: verificar não gasta; definir troca a senha uma única vez e devolve o e-mail; trata inválido, expirado e bloqueado', async () => {
  resetar();
  const A = semeiaPersonal('a@x.com', 'Ana', [novoAluno(10, { nome: 'Carla', email: 'carla@x.com' })]);
  const carla = semeiaAlunoComConta(A, 'carla@x.com', 'senhaantiga'); users[carla].app_metadata = { trocar_senha: true };
  const { token } = await personal('a@x.com', { acao: 'gerar-link-senha', email: 'carla@x.com' });

  assert.equal((await link({ acao: 'verificar', token })).status, 'ok');
  assert.equal((await link({ acao: 'verificar', token })).status, 'ok', 'abrir de novo (ou pré-visualização do WhatsApp) não gasta o link');
  assert.equal((await link({ acao: 'definir', token, novaSenha: '123' })).status, 'senha-invalida');
  assert.equal(users[carla].password, 'senhaantiga');
  assert.equal((await link({ acao: 'verificar', token })).status, 'ok', 'senha inválida não gasta o link');

  const r = await link({ acao: 'definir', token, novaSenha: 'NovaSenha9' });
  assert.equal(r.status, 'ok'); assert.equal(r.email, 'carla@x.com');
  assert.equal(users[carla].password, 'NovaSenha9');
  assert.equal(users[carla].app_metadata.trocar_senha, false);
  assert.equal((await link({ acao: 'definir', token, novaSenha: 'OutraSenha8' })).status, 'usado', 'uso único');
  assert.equal(users[carla].password, 'NovaSenha9');
  assert.equal((await link({ acao: 'verificar', token })).status, 'usado');

  assert.equal((await link({ acao: 'verificar', token: 'curto' })).status, 'invalido');
  assert.equal((await link({ acao: 'verificar', token: 'A'.repeat(43) })).status, 'invalido', 'formato certo, mas não existe');
  assert.equal((await link({ acao: 'verificar' })).status, 'invalido');
  assert.equal((await link({ acao: 'apagar', token })).http, 400, 'ação desconhecida');

  const t2 = (await personal('a@x.com', { acao: 'gerar-link-senha', email: 'carla@x.com' })).token;
  tabela('senha_links').find((l) => !l.usado_em)!.expira_em = new Date(Date.now() - 1000).toISOString();
  assert.equal((await link({ acao: 'verificar', token: t2 })).status, 'expirado');
  assert.equal((await link({ acao: 'definir', token: t2, novaSenha: 'QualquerSenha1' })).status, 'expirado');
  assert.equal(users[carla].password, 'NovaSenha9');

  const t3 = (await personal('a@x.com', { acao: 'gerar-link-senha', email: 'carla@x.com' })).token;
  tabela('alunos_acesso').find((r) => r.aluno_user_id === carla)!.status = 'bloqueado';
  assert.equal((await link({ acao: 'definir', token: t3, novaSenha: 'QualquerSenha1' })).status, 'bloqueado');
  assert.equal(users[carla].password, 'NovaSenha9');
});

test('redefinir-senha-link: dois envios ao mesmo tempo com o mesmo link, só um vale', async () => {
  resetar();
  const A = semeiaPersonal('a@x.com', 'Ana', [novoAluno(10, { nome: 'Carla', email: 'carla@x.com' })]);
  semeiaAlunoComConta(A, 'carla@x.com', 'senhaantiga');
  const { token } = await personal('a@x.com', { acao: 'gerar-link-senha', email: 'carla@x.com' });
  const [x, y] = await Promise.all([link({ acao: 'definir', token, novaSenha: 'SenhaDoPrimeiro1' }), link({ acao: 'definir', token, novaSenha: 'SenhaDoSegundo2' })]);
  assert.deepEqual([x.status, y.status].sort(), ['ok', 'usado']);
});

test('redefinir-senha-link: freio por origem contra chute de token', async () => {
  resetar();
  let ultimo = '';
  for (let i = 0; i < 25; i++) ultimo = (await link({ acao: 'verificar', token: 'B'.repeat(43) }, '7.7.7.7')).status;
  assert.equal(ultimo, 'muitas-tentativas');
  assert.equal((await link({ acao: 'verificar', token: 'B'.repeat(43) }, '6.6.6.6')).status, 'invalido', 'outra origem não é afetada');
});
