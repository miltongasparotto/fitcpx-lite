// Testes da lógica de vínculo por Nome + CPF + E-mail e da transferência (Fase 4.1).
// Rodar: node --test tests/vinculo.test.mts   (Node 22.18+ / 24, sem dependências)
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cpfValido, normalizaNome, nomesCompativeis, mascaraEmail, mascaraCpf, hashCpf, decidirCadastro,
  novaTransferencia, executarTransferencia, processarPrazos, PRAZO_DIAS,
  type Identidade, type DepsDecisao, type DepsExec, type Transferencia,
} from '../supabase/functions/_shared/vinculo.ts';

const PEPPER = 'pepper-de-teste';
const CPF_A = '529.982.247-25';   // válido
const CPF_B = '111.444.777-35';   // válido
const T1 = 'trainer-1', T2 = 'trainer-2';

// ── Fake de banco ───────────────────────────────────────────────────────────
function mundo() {
  const idents: Identidade[] = [];
  const legados: { trainer: string; nome: string; email: string; studentId: number }[] = [];
  const deps: DepsDecisao = {
    identidadePorCpf: async (h) => idents.find((i) => i.cpf_hash === h) || null,
    identidadePorConta: async (u) => idents.find((i) => i.aluno_user_id === u) || null,
    legadoNoPersonal: async (t, n, e) => legados.find((l) => l.trainer === t && normalizaNome(l.nome) === n && l.email === e)?.studentId ?? null,
  };
  return { idents, legados, deps };
}
async function ident(p: Partial<Identidade> & { cpf: string }): Promise<Identidade> {
  return {
    id: 'id-' + Math.random().toString(36).slice(2, 8), cpf_hash: await hashCpf(p.cpf, PEPPER), nome_norm: 'maria souza',
    email_norm: 'maria@x.com', trainer_user_id: T1, aluno_user_id: null, student_id: 10, ...p,
  } as Identidade;
}

test('cpfValido', () => {
  assert.equal(cpfValido(CPF_A), true);
  assert.equal(cpfValido('52998224725'), true);
  assert.equal(cpfValido('529.982.247-26'), false);
  assert.equal(cpfValido('111.111.111-11'), false);
  assert.equal(cpfValido(''), false);
  assert.equal(cpfValido(null), false);
});

test('nomes: acento, caixa, primeiro+último', () => {
  assert.equal(normalizaNome('  JOÃO  da Silva '), 'joao da silva');
  assert.ok(nomesCompativeis('Maria Souza', 'maria  SOUZA'));
  assert.ok(nomesCompativeis('Ana Maria Silva', 'Ana Silva'));
  assert.ok(!nomesCompativeis('Ana Silva', 'Bia Silva'));
  assert.ok(!nomesCompativeis('Ana', 'Ana'.repeat(0)));
  assert.equal(mascaraEmail('maria@gmail.com'), 'm***@gmail.com');
  assert.equal(mascaraCpf('52998224725'), '***.982.***-25');
});

test('hash do CPF: estável, depende do pepper e ignora pontuação', async () => {
  const a = await hashCpf('529.982.247-25', PEPPER), b = await hashCpf('52998224725', PEPPER);
  assert.equal(a, b);
  assert.notEqual(a, await hashCpf('52998224725', 'outro'));
  assert.equal(a.length, 64);
});

test('CPF inválido', async () => {
  const w = mundo();
  const d = await decidirCadastro({ ator: 'aluno', cpf: '123', nome: 'X Y', email: 'a@b.c', trainerAlvo: T1 }, w.deps, PEPPER);
  assert.equal(d.tipo, 'cpf-invalido');
});

test('aluno totalmente novo → novo', async () => {
  const w = mundo();
  const d = await decidirCadastro({ ator: 'aluno', cpf: CPF_A, nome: 'Maria Souza', email: 'maria@x.com', trainerAlvo: T1, contaId: 'u1' }, w.deps, PEPPER);
  assert.equal(d.tipo, 'novo');
});

test('aluno antigo sem CPF do mesmo personal → legado (nome + e-mail)', async () => {
  const w = mundo(); w.legados.push({ trainer: T1, nome: 'Maria Souza', email: 'maria@x.com', studentId: 77 });
  const d = await decidirCadastro({ ator: 'aluno', cpf: CPF_A, nome: 'maria souza', email: 'MARIA@x.com', trainerAlvo: T1, contaId: 'u1' }, w.deps, PEPPER);
  assert.deepEqual({ t: d.tipo, s: (d as any).studentId }, { t: 'legado', s: 77 });
  // e-mail diferente não casa o legado: vira aluno novo (duplicidade possível, personal resolve)
  const d2 = await decidirCadastro({ ator: 'aluno', cpf: CPF_A, nome: 'Maria Souza', email: 'outro@x.com', trainerAlvo: T1, contaId: 'u1' }, w.deps, PEPPER);
  assert.equal(d2.tipo, 'novo');
  // legado de OUTRO personal não é tocado
  const d3 = await decidirCadastro({ ator: 'aluno', cpf: CPF_A, nome: 'Maria Souza', email: 'maria@x.com', trainerAlvo: T2, contaId: 'u1' }, w.deps, PEPPER);
  assert.equal(d3.tipo, 'novo');
});

test('mesmo personal, mesma conta, refazendo cadastro → atualizar', async () => {
  const w = mundo(); w.idents.push(await ident({ cpf: CPF_A, aluno_user_id: 'u1' }));
  const d = await decidirCadastro({ ator: 'aluno', cpf: CPF_A, nome: 'Maria Souza', email: 'maria@x.com', trainerAlvo: T1, contaId: 'u1' }, w.deps, PEPPER);
  assert.equal(d.tipo, 'atualizar');
});

test('mesmo personal, cadastro manual sem conta → vincular-conta', async () => {
  const w = mundo(); w.idents.push(await ident({ cpf: CPF_A, aluno_user_id: null }));
  const d = await decidirCadastro({ ator: 'aluno', cpf: CPF_A, nome: 'Maria Souza', email: 'maria@x.com', trainerAlvo: T1, contaId: 'u9' }, w.deps, PEPPER);
  assert.equal(d.tipo, 'vincular-conta');
});

test('cadastro manual sem e-mail no registro: aluno do mesmo personal vincula; de outro personal diverge', async () => {
  const w = mundo(); w.idents.push(await ident({ cpf: CPF_A, email_norm: null }));
  const mesmo = await decidirCadastro({ ator: 'aluno', cpf: CPF_A, nome: 'Maria Souza', email: 'maria@x.com', trainerAlvo: T1, contaId: 'u9' }, w.deps, PEPPER);
  assert.equal(mesmo.tipo, 'vincular-conta');
  const outro = await decidirCadastro({ ator: 'aluno', cpf: CPF_A, nome: 'Maria Souza', email: 'maria@x.com', trainerAlvo: T2, contaId: 'u9' }, w.deps, PEPPER);
  assert.equal(outro.tipo, 'divergencia');
});

test('CPF existe com outro nome → divergência (sem revelar nada)', async () => {
  const w = mundo(); w.idents.push(await ident({ cpf: CPF_A }));
  for (const trainerAlvo of [T1, T2]) {
    const d = await decidirCadastro({ ator: 'aluno', cpf: CPF_A, nome: 'Joana Pereira', email: 'maria@x.com', trainerAlvo, contaId: 'u1' }, w.deps, PEPPER);
    assert.deepEqual(d, { tipo: 'divergencia' });
  }
});

test('nome + CPF batem mas e-mail é outro → e-mail-diferente (não duplica, não sobrescreve)', async () => {
  const w = mundo(); w.idents.push(await ident({ cpf: CPF_A, aluno_user_id: 'u1' }));
  for (const trainerAlvo of [T1, T2]) {
    const d = await decidirCadastro({ ator: 'aluno', cpf: CPF_A, nome: 'Maria Souza', email: 'nova@y.com', trainerAlvo, contaId: 'u2' }, w.deps, PEPPER);
    assert.deepEqual(d, { tipo: 'email-diferente', emailMascarado: 'm***@x.com' });
  }
});

test('conta que já tem um CPF não pode cadastrar outro CPF', async () => {
  const w = mundo(); w.idents.push(await ident({ cpf: CPF_A, aluno_user_id: 'u1' }));
  const d = await decidirCadastro({ ator: 'aluno', cpf: CPF_B, nome: 'Maria Souza', email: 'maria@x.com', trainerAlvo: T1, contaId: 'u1' }, w.deps, PEPPER);
  assert.equal(d.tipo, 'cpf-nao-confere');
});

test('aluno de outro personal, 3 dados batem → conflito', async () => {
  const w = mundo(); w.idents.push(await ident({ cpf: CPF_A, aluno_user_id: 'u1', trainer_user_id: T1 }));
  const d = await decidirCadastro({ ator: 'aluno', cpf: CPF_A, nome: 'Maria Souza', email: 'maria@x.com', trainerAlvo: T2, contaId: 'u1' }, w.deps, PEPPER);
  assert.equal(d.tipo, 'conflito');
  assert.equal((d as any).identidade.trainer_user_id, T1);
});

test('personal cadastrando: novo / duplicado / mesmo registro / conflito', async () => {
  const w = mundo();
  const base = { ator: 'personal' as const, cpf: CPF_A, nome: 'Maria Souza', email: 'maria@x.com', trainerAlvo: T1 };
  assert.equal((await decidirCadastro({ ...base, studentIdAtual: 10 }, w.deps, PEPPER)).tipo, 'novo');
  w.idents.push(await ident({ cpf: CPF_A, student_id: 10 }));
  assert.equal((await decidirCadastro({ ...base, studentIdAtual: 10 }, w.deps, PEPPER)).tipo, 'atualizar');
  assert.equal((await decidirCadastro({ ...base, studentIdAtual: 99 }, w.deps, PEPPER)).tipo, 'duplicado-no-personal');
  assert.equal((await decidirCadastro({ ...base, trainerAlvo: T2, studentIdAtual: 5 }, w.deps, PEPPER)).tipo, 'conflito');
  // personal de outro lado com e-mail errado: não conflita, avisa
  const errado = await decidirCadastro({ ...base, trainerAlvo: T2, email: 'x@y.com', studentIdAtual: 5 }, w.deps, PEPPER);
  assert.equal(errado.tipo, 'email-diferente');
});

test('personal corrige e-mail de aluno que ainda não tem conta; com conta, não', async () => {
  const w = mundo(); w.idents.push(await ident({ cpf: CPF_A, student_id: 10, aluno_user_id: null }));
  const base = { ator: 'personal' as const, cpf: CPF_A, nome: 'Maria Souza', email: 'novo@x.com', trainerAlvo: T1, studentIdAtual: 10 };
  assert.equal((await decidirCadastro(base, w.deps, PEPPER)).tipo, 'atualizar');
  w.idents[0].aluno_user_id = 'u1';
  assert.equal((await decidirCadastro(base, w.deps, PEPPER)).tipo, 'email-diferente');
});

// ── Transferência ───────────────────────────────────────────────────────────

function bancoTransf() {
  const blobs: Record<string, any[]> = {
    [T1]: [{ id: 10, perfil: { nome: 'Maria Souza', alunoUserId: 'u1', cpf: '52998224725' }, treinos: [{ id: 1 }], prescricao: { x: 1 }, avaliacoesAntro: [{ id: 5 }], anamnese: { nivel: 'Inte' } }, { id: 11, perfil: { nome: 'Outro' }, treinos: [] }],
    [T2]: [{ id: 3, perfil: { nome: 'Do T2' } }],
  };
  const log: string[] = [];
  const estado = { acesso: { u1: T1 } as Record<string, string>, ident: {} as any, transf: {} as any };
  const deps: DepsExec = {
    carregarStudents: async (t) => ({ students: structuredClone(blobs[t]), todosIds: blobs[t].map((s) => s.id) }),
    salvarStudents: async (t, s) => { blobs[t] = s; log.push('salvou ' + t); },
    moverAcesso: async (u, t) => { estado.acesso[u] = t; log.push('acesso'); },
    atualizarIdentidade: async (_id, p) => { estado.ident = p; },
    atualizarTransferencia: async (_id, p) => { estado.transf = p; },
    novoId: (ex) => Math.max(0, ...ex) + 1,
  };
  return { blobs, log, estado, deps };
}
const ident1 = (): Identidade => ({ id: 'I1', cpf_hash: 'h', nome_norm: 'maria souza', email_norm: 'maria@x.com', trainer_user_id: T1, aluno_user_id: 'u1', student_id: 10 });
const mk = (extra: Partial<Transferencia> = {}): Transferencia => ({ id: 'T', ...novaTransferencia({ identidade: ident1(), trainerNovo: T2, iniciadoPor: 'aluno', alunoUserId: 'u1', snapshot: { nome: 'Maria' } }), ...extra }) as Transferencia;

test('pedido do aluno: pendente com prazo de 30 dias; do personal: espera o aluno', () => {
  const agora = new Date('2026-10-05T12:00:00Z');
  const a = novaTransferencia({ identidade: ident1(), trainerNovo: T2, iniciadoPor: 'aluno', alunoUserId: 'u1', snapshot: {}, agora });
  assert.equal(a.status, 'pendente');
  assert.equal(a.prazo_em, new Date(agora.getTime() + PRAZO_DIAS * 86400000).toISOString());
  const p = novaTransferencia({ identidade: ident1(), trainerNovo: T2, iniciadoPor: 'personal', alunoUserId: 'u1', snapshot: {}, agora });
  assert.equal(p.status, 'aguardando_aluno');
  assert.equal(p.prazo_em, null);
});

test('antecipar COM treinos: leva tudo, sai do antigo, acesso e identidade migram', async () => {
  const b = bancoTransf();
  const r = await executarTransferencia(b.deps, mk(), true, 'antecipada');
  assert.ok(!b.blobs[T1].some((s) => s.id === 10), 'saiu do antigo');
  assert.equal(b.blobs[T1].length, 1, 'outro aluno do antigo intacto');
  const novo = b.blobs[T2].find((s) => s.id === r.novoStudentId);
  assert.equal(novo.treinos.length, 1);
  assert.equal(novo.avaliacoesAntro.length, 1);
  assert.equal(novo.perfil.novoCadastro, true);
  assert.equal(novo.perfil.transferidoDe.comTreinos, true);
  assert.equal(r.novoStudentId, 4, 'id novo, sem colidir com o 3 do destino');
  assert.equal(b.estado.acesso.u1, T2);
  assert.equal(b.estado.ident.trainer_user_id, T2);
  assert.equal(b.estado.ident.student_id, 4);
  assert.equal(b.estado.transf.status, 'concluida');
  assert.equal(b.estado.transf.motivo_fim, 'antecipada');
  assert.deepEqual(b.log.slice(0, 2), ['salvou ' + T2, 'salvou ' + T1], 'destino grava antes da origem');
});

test('antecipar SEM treinos: histórico de avaliações e anamnese vão, treino não', async () => {
  const b = bancoTransf();
  const r = await executarTransferencia(b.deps, mk(), false, 'antecipada');
  const novo = b.blobs[T2].find((s) => s.id === r.novoStudentId);
  assert.deepEqual(novo.treinos, []);
  assert.deepEqual(novo.prescricao, {});
  assert.equal(novo.avaliacoesAntro.length, 1);
  assert.equal(novo.anamnese.nivel, 'Inte');
});

test('transferência resolvida não roda de novo', async () => {
  const b = bancoTransf();
  await assert.rejects(() => executarTransferencia(b.deps, mk({ status: 'concluida' }), true, 'antecipada'), /já resolvida/);
  await assert.rejects(() => executarTransferencia(b.deps, mk({ status: 'cancelada' }), true, 'antecipada'), /já resolvida/);
});

test('aluno que sumiu da lista do antigo: erro claro, nada gravado', async () => {
  const b = bancoTransf(); b.blobs[T1] = [];
  await assert.rejects(() => executarTransferencia(b.deps, mk(), true, 'antecipada'), /não encontrado/);
  assert.equal(b.log.length, 0);
});

test('prazo: vencida transfere SEM treinos; ainda no prazo, aguardando_aluno e já concluída ficam quietas', async () => {
  const b = bancoTransf();
  const agora = new Date('2026-11-10T00:00:00Z');
  const vencida = mk({ id: 'V', status: 'pendente', prazo_em: '2026-11-01T00:00:00Z' });
  const noPrazo = mk({ id: 'N', status: 'pendente', prazo_em: '2026-11-20T00:00:00Z' });
  const esperando = mk({ id: 'E', status: 'aguardando_aluno', prazo_em: null });
  const feitas = await processarPrazos(b.deps, [noPrazo, esperando, vencida], agora);
  assert.deepEqual(feitas, ['V']);
  const movido = b.blobs[T2].find((s) => s.perfil.nome === 'Maria Souza');
  assert.deepEqual(movido.treinos, []);
  assert.equal(b.estado.transf.motivo_fim, 'prazo');
});

test('prazo: falha de uma não derruba as outras', async () => {
  const b = bancoTransf();
  const sumida = mk({ id: 'S', status: 'pendente', prazo_em: '2020-01-01T00:00:00Z', student_id: 999, aluno_user_id: 'nao-existe' });
  const boa = mk({ id: 'B', status: 'pendente', prazo_em: '2020-01-01T00:00:00Z' });
  const feitas = await processarPrazos(b.deps, [sumida, boa], new Date('2026-01-01T00:00:00Z'));
  assert.deepEqual(feitas, ['B']);
});

test('pedido do cadastro manual: o rascunho do personal novo sai quando o aluno de verdade chega', async () => {
  const b = bancoTransf();
  b.blobs[T2].push({ id: 50, perfil: { nome: 'Maria Souza (rascunho)' }, treinos: [] });
  const t = mk({ snapshot: { draftStudentId: 50 } });
  const r = await executarTransferencia(b.deps, t, true, 'antecipada');
  assert.ok(!b.blobs[T2].some((s) => s.id === 50), 'rascunho removido');
  assert.ok(b.blobs[T2].some((s) => s.id === r.novoStudentId), 'aluno real entrou');
  assert.equal(b.blobs[T2].length, 2);
});

test('rascunho que já tem treino NÃO é apagado', async () => {
  const b = bancoTransf();
  b.blobs[T2].push({ id: 50, perfil: { nome: 'Maria' }, treinos: [{ id: 1 }] });
  await executarTransferencia(b.deps, mk({ snapshot: { draftStudentId: 50 } }), true, 'antecipada');
  assert.ok(b.blobs[T2].some((s) => s.id === 50));
});

// ── Situação do aluno no personal atual (18/10/2026) ────────────────────────

test('outro personal: aluno do link + situação livre = transferir-automatico; continua dele = conflito', async () => {
  const w = mundo(); w.idents.push(await ident({ cpf: CPF_A }));
  const base = { ator: 'aluno' as const, cpf: CPF_A, nome: 'Maria Souza', email: 'maria@x.com', trainerAlvo: T2, contaId: 'u9' };
  for (const sit of ['inativo', 'arquivado', 'inexistente'] as const) {
    const d = await decidirCadastro(base, { ...w.deps, situacaoDoAluno: async () => sit }, PEPPER);
    assert.equal(d.tipo, 'transferir-automatico', sit); assert.equal((d as any).situacao, sit);
  }
  for (const sit of ['lead', 'ativo', 'pausado', 'bloqueado'] as const) {
    const d = await decidirCadastro(base, { ...w.deps, situacaoDoAluno: async () => sit }, PEPPER);
    assert.deepEqual({ t: d.tipo, livre: (d as any).livre }, { t: 'conflito', livre: undefined }, sit);
  }
  // sem a dependência, vale o caminho antigo (pedido com prazo)
  assert.equal((await decidirCadastro(base, w.deps, PEPPER)).tipo, 'conflito');
});

test('personal cadastrando: situação livre continua conflito (o aluno confirma), mas marcado livre', async () => {
  const w = mundo(); w.idents.push(await ident({ cpf: CPF_A }));
  const base = { ator: 'personal' as const, cpf: CPF_A, nome: 'Maria Souza', email: 'maria@x.com', trainerAlvo: T2, studentIdAtual: 20 };
  const d = await decidirCadastro(base, { ...w.deps, situacaoDoAluno: async () => 'inativo' }, PEPPER);
  assert.deepEqual({ t: d.tipo, livre: (d as any).livre }, { t: 'conflito', livre: true });
  const d2 = await decidirCadastro(base, { ...w.deps, situacaoDoAluno: async () => 'pausado' }, PEPPER);
  assert.equal((d2 as any).livre, undefined);
});

test('transferência automática: sem treinos, marca automatica e normaliza a situação', async () => {
  const b = bancoTransf();
  b.blobs[T1][0].crm = { status: 'inativo', archived: true };
  const r = await executarTransferencia(b.deps, mk(), false, 'antecipada', new Date('2026-10-18T12:00:00Z'), { automatica: { situacao: 'inativo' } });
  const novo = b.blobs[T2].find((s) => s.id === r.novoStudentId);
  assert.deepEqual(novo.treinos, []); assert.equal(novo.avaliacoesAntro.length, 1);
  assert.deepEqual({ a: novo.perfil.transferidoDe.automatica, s: novo.perfil.transferidoDe.situacao }, { a: true, s: 'inativo' });
  assert.equal(novo.crm.status, 'ativo'); assert.equal(novo.crm.archived, undefined); assert.equal(novo.crm.statusSince, '2026-10-18');
  assert.equal(b.estado.transf.snapshot.automatica, true); assert.equal(b.estado.transf.snapshot.situacaoAnterior, 'inativo');
});

test('transferência: aluno ausente da lista do antigo vira registro novo só com criarSeAusente; origem não é regravada', async () => {
  const b = bancoTransf();
  b.blobs[T1].splice(0, 1);   // arquivado/excluído: já não está na lista
  await assert.rejects(() => executarTransferencia(b.deps, mk(), false, 'antecipada'), /não encontrado/);
  b.log.length = 0;
  const r = await executarTransferencia(b.deps, mk(), false, 'antecipada', new Date(), {
    automatica: { situacao: 'arquivado' }, criarSeAusente: () => ({ id: 0, perfil: {}, anamnese: {}, treinos: [], avaliacoesAntro: [] }),
  });
  assert.ok(b.blobs[T2].some((s) => s.id === r.novoStudentId));
  assert.deepEqual(b.log.filter((l) => l.startsWith('salvou')), ['salvou ' + T2], 'origem não mudou, não grava');
});

test('transferência: cadastro manual do destino com o mesmo CPF é unido ao aluno que chega', async () => {
  const b = bancoTransf();
  b.blobs[T2].push({ id: 4, perfil: { nome: 'Maria Souza', cpf: '52998224725', nascimento: '1990-05-20', sexo: 'F' }, anamnese: { objetivo: 'Hip' }, treinos: [{ id: 99 }], avaliacoesAntro: [] });
  const r = await executarTransferencia(b.deps, mk(), true, 'antecipada');
  const lista = b.blobs[T2].filter((s) => s.perfil.cpf === '52998224725');
  assert.equal(lista.length, 1, 'um registro só');
  assert.equal(lista[0].id, r.novoStudentId);
  assert.equal(lista[0].perfil.nascimento, '1990-05-20'); assert.equal(lista[0].anamnese.nivel, 'Inte'); assert.equal(lista[0].anamnese.objetivo, 'Hip');
  assert.deepEqual(lista[0].treinos.map((t: any) => t.id).sort(), [1, 99]);
});
