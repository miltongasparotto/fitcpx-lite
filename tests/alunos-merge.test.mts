// Aluno duplicado e cadastro antigo: regras puras de supabase/functions/_shared/alunos-merge.ts
//   node --test tests/alunos-merge.test.mts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mesmoAluno, acharDuplicados, unirAlunos, consolidarAluno, acharRegistroSemConta, acharNoArquivo,
} from '../supabase/functions/_shared/alunos-merge.ts';
import { situacaoDoStudent, livreParaTransferir } from '../supabase/functions/_shared/vinculo.ts';

const CPF = '52998224725';
const al = (id: number, perfil: any, extra: any = {}) => ({ id, perfil, anamnese: {}, treinos: [], avaliacoesAntro: [], ...extra });

test('mesmoAluno: CPF igual vale; CPF diferente nunca; sem CPF exige e-mail e nome compatíveis', () => {
  assert.equal(mesmoAluno(al(1, { cpf: CPF }), al(2, { cpf: '529.982.247-25' })), true);
  assert.equal(mesmoAluno(al(1, { cpf: CPF, email: 'a@x.com', nome: 'Ana Souza' }), al(2, { cpf: '11144477735', email: 'a@x.com', nome: 'Ana Souza' })), false, 'e-mail igual com CPF diferente = outra pessoa');
  assert.equal(mesmoAluno(al(1, { cpf: CPF, email: 'a@x.com', nome: 'Ana Souza' }), al(2, { email: 'A@X.com ', nome: 'Ana Maria Souza' })), true);
  assert.equal(mesmoAluno(al(1, { email: 'a@x.com', nome: 'Ana Souza' }), al(2, { email: 'a@x.com', nome: 'Bruno Lima' })), false, 'casal que divide e-mail');
  assert.equal(mesmoAluno(al(1, { nome: 'Ana Souza' }), al(2, { nome: 'Ana Souza' })), false, 'só o nome não basta');
  assert.equal(mesmoAluno(al(1, { cpf: CPF, alunoUserId: 'u1' }), al(2, { cpf: CPF, alunoUserId: 'u2' })), false, 'duas contas nunca se unem');
});

test('unirAlunos: o que a base tem manda; o duplicado só completa o vazio', () => {
  const base = al(1, { nome: 'Carla Souza', cpf: CPF, email: 'c@x.com', alunoUserId: 'u1', nascimento: '' }, { anamnese: { objetivo: 'Hip' } });
  const extra = al(2, { nome: 'Carla S.', cpf: CPF, nascimento: '1990-05-20', sexo: 'F', whatsapp: '(44) 99999-1111', alunoUserId: 'u9', portalStatus: 'bloqueado', transferidoDe: { x: 1 } },
    { anamnese: { objetivo: 'Emagr', nivel: 'Inte' }, treinos: [{ id: 7 }], avaliacoesAntro: [{ id: 3, data_avaliacao: '2026-01-01' }, { id: 4, data_avaliacao: '2026-03-01' }], crm: { status: 'ativo' } });
  const r = unirAlunos(base, extra);
  assert.equal(base.perfil.nome, 'Carla Souza');
  assert.equal(base.perfil.nascimento, '1990-05-20'); assert.equal(base.perfil.sexo, 'F'); assert.equal(base.perfil.whatsapp, '(44) 99999-1111');
  assert.equal(base.perfil.alunoUserId, 'u1', 'conta da base não é trocada');
  assert.equal(base.perfil.portalStatus, undefined); assert.equal(base.perfil.transferidoDe, undefined);
  assert.equal(base.anamnese.objetivo, 'Hip'); assert.equal(base.anamnese.nivel, 'Inte');
  assert.deepEqual(base.treinos.map((t: any) => t.id), [7]);
  assert.deepEqual(base.avaliacoesAntro.map((a: any) => a.id), [4, 3], 'avaliações juntas, mais nova primeiro');
  assert.equal(base.crm.status, 'ativo');
  assert.ok(r.camposPreenchidos.includes('nascimento'));
});

test('unirAlunos: não duplica itens de mesmo id', () => {
  const base = al(1, { cpf: CPF }, { avaliacoesAntro: [{ id: 3, data_avaliacao: '2026-01-01' }], treinos: [{ id: 1 }] });
  unirAlunos(base, al(2, { cpf: CPF }, { avaliacoesAntro: [{ id: 3, data_avaliacao: '2026-01-01' }], treinos: [{ id: 1 }, { id: 2 }] }));
  assert.equal(base.avaliacoesAntro.length, 1); assert.deepEqual(base.treinos.map((t: any) => t.id), [1, 2]);
});

test('consolidarAluno: remove o duplicado da lista, respeita ids excluídos e outra pessoa', () => {
  const s = al(1, { nome: 'Carla Souza', cpf: CPF, alunoUserId: 'u1' });
  const dup = al(2, { nome: 'Carla Souza', cpf: CPF, nascimento: '1990-05-20' });
  const outra = al(3, { nome: 'Carla Souza', cpf: '11144477735' });
  const recusado = al(4, { nome: 'Carla Souza', email: 'c@x.com' });
  s.perfil.email = 'c@x.com';
  const lista = [s, dup, outra, recusado];
  assert.deepEqual(acharDuplicados(lista, s, [4]).map((x) => x.id), [2]);
  assert.deepEqual(consolidarAluno(lista, s, [4]), [2]);
  assert.deepEqual(lista.map((x) => x.id), [1, 3, 4]);
  assert.equal(s.perfil.nascimento, '1990-05-20');
});

test('acharRegistroSemConta e acharNoArquivo', () => {
  const lista = [al(1, { nome: 'A', cpf: CPF, alunoUserId: 'u1' }), al(2, { nome: 'Carla Souza', email: 'c@x.com' })];
  assert.equal(acharRegistroSemConta(lista, { cpf: CPF, nome: 'A' }), null, 'registro com conta não serve');
  assert.equal(acharRegistroSemConta(lista, { email: 'C@x.com', nome: 'Carla Souza' })?.id, 2);

  const arq = [
    { arqId: 'a1', tipo: 'aluno', dados: al(10, { nome: 'Carla Souza', cpf: CPF, email: 'c@x.com' }), excluidoEm: '2026-05-01T00:00:00Z', idOriginal: 10 },
    { arqId: 'a2', tipo: 'aluno', dados: al(11, { nome: 'Carla Souza', cpf: CPF }), excluidoEm: '2026-08-01T00:00:00Z', idOriginal: 11 },
    { arqId: 'a3', tipo: 'aluno', dados: al(12, { nome: 'Carla Souza', cpf: CPF }), excluidoEm: '2026-09-01T00:00:00Z', idOriginal: 12, restauradoEm: '2026-09-02T00:00:00Z' },
    { arqId: 'a4', tipo: 'treino', dados: { cpf: CPF } },
  ];
  assert.equal(acharNoArquivo(arq, { cpf: CPF, nome: 'Carla Souza' })?.arqId, 'a2', 'o mais recente, sem os restaurados');
  assert.equal(acharNoArquivo(arq, { studentId: 10 })?.arqId, 'a1');
  assert.equal(acharNoArquivo(arq, { cpf: '11144477735', nome: 'Outra Pessoa' }), null);
  assert.equal(acharNoArquivo([], { cpf: CPF }), null);
});

test('situação do aluno: continua dele (lead, ativo, pausado, bloqueado) x livre (inativo, arquivado, inexistente)', () => {
  const sit = (crm: any, perfil: any = {}) => situacaoDoStudent({ crm, perfil });
  assert.equal(sit({ status: 'lead' }), 'lead');
  assert.equal(sit({}), 'ativo');
  assert.equal(sit({ status: 'pausado' }), 'pausado');
  assert.equal(sit({ status: 'bloqueado' }), 'bloqueado');
  assert.equal(sit({ status: 'ativo' }, { portalStatus: 'bloqueado' }), 'bloqueado');
  assert.equal(sit({ status: 'inativo' }), 'inativo');
  assert.equal(sit({ status: 'ativo', archived: true }), 'arquivado');
  for (const s of ['lead', 'ativo', 'pausado', 'bloqueado'] as const) assert.equal(livreParaTransferir(s), false, s);
  for (const s of ['inativo', 'arquivado', 'inexistente'] as const) assert.equal(livreParaTransferir(s), true, s);
});
