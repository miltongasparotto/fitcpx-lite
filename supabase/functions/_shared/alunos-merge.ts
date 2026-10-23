// ══════════════════════════════════════════════════════════════════════════
// Aluno duplicado e cadastro antigo (18/10/2026)
// ══════════════════════════════════════════════════════════════════════════
// LÓGICA PURA (roda no Deno e nos testes em Node). Mesma regra de js/unir-alunos.js no painel: mudar nos dois.
//
// Por que existe: o mesmo aluno pode ficar duas vezes na lista de um personal, por exemplo quando ele
// cadastrou o aluno à mão e o aluno chegou depois pelo portal ou por uma transferência (o registro
// do portal só tem nome, CPF e e-mail, e o cadastro manual tem o resto). O portal lê o registro que
// tem a conta; se ele estiver vazio, o aluno vê "preencha seus dados" mesmo com o painel todo preenchido.
//
// Regra de "mesmo aluno":
//  - CPFs presentes nos dois: iguais = mesmo aluno; diferentes = pessoas diferentes (mesmo com e-mail igual).
//  - Sem CPF num dos lados: mesmo e-mail E nomes compatíveis (e-mail sozinho não basta: casal que divide e-mail).
//  - Duas contas diferentes nunca se unem.
import { nomesCompativeis, normalizaEmail, soDigitos } from './vinculo.ts';

const vazio = (v: unknown) => v === undefined || v === null || v === '';

export function mesmoAluno(a: any, b: any): boolean {
  const pa = a?.perfil || {}, pb = b?.perfil || {};
  if (pa.alunoUserId && pb.alunoUserId && pa.alunoUserId !== pb.alunoUserId) return false;
  const ca = soDigitos(pa.cpf), cb = soDigitos(pb.cpf);
  if (ca.length === 11 && cb.length === 11) return ca === cb;
  const ea = normalizaEmail(pa.email), eb = normalizaEmail(pb.email);
  return !!ea && ea === eb && nomesCompativeis(pa.nome, pb.nome);
}

// `excluirIds`: registros que não podem ser unidos (ex.: o personal recusou ligar aquele cadastro a esta conta).
export function acharDuplicados(students: any[], s: any, excluirIds: number[] = []): any[] {
  return students.filter((x) => x && x !== s && x.id !== s?.id && !excluirIds.includes(x.id) && mesmoAluno(x, s));
}

// Campos do perfil que nunca vêm do registro duplicado: dizem respeito a quem FICA.
const PERFIL_NAO_COPIA = new Set(['alunoUserId', 'identidadeId', 'portalStatus', 'novoCadastro', 'transferidoDe', 'onboardingConcluido', 'arquivoAntigo']);

function juntarLista(base: any[] | undefined, extra: any[] | undefined): any[] {
  const out = Array.isArray(base) ? base.slice() : [];
  const ids = new Set(out.map((x) => String(x?.id)));
  for (const x of Array.isArray(extra) ? extra : []) {
    if (x && x.id != null && ids.has(String(x.id))) continue;
    out.push(x);
    if (x && x.id != null) ids.add(String(x.id));
  }
  return out;
}

// Junta `extra` em `base` (o que fica). O que `base` já tem manda; `extra` só completa o que está vazio.
export function unirAlunos(base: any, extra: any): { camposPreenchidos: string[] } {
  const preenchidos: string[] = [];
  base.perfil = base.perfil || {};
  for (const [k, v] of Object.entries(extra?.perfil || {})) {
    if (PERFIL_NAO_COPIA.has(k)) continue;
    if (vazio(base.perfil[k]) && !vazio(v)) { base.perfil[k] = v; preenchidos.push(k); }
  }
  // CRM embutido (apelido, situação etc.): só completa o que a base não tem.
  if (extra?.crm) {
    base.crm = base.crm || {};
    for (const [k, v] of Object.entries(extra.crm)) if (base.crm[k] === undefined && v !== undefined) base.crm[k] = v;
  }
  base.anamnese = base.anamnese || {};
  for (const [k, v] of Object.entries(extra?.anamnese || {})) if (vazio(base.anamnese[k]) && !vazio(v)) base.anamnese[k] = v;
  if (extra?.anamneses?.length || base.anamneses) base.anamneses = juntarLista(base.anamneses, extra?.anamneses);
  base.avaliacoesAntro = juntarLista(base.avaliacoesAntro, extra?.avaliacoesAntro)
    .sort((x: any, y: any) => String(y?.data_avaliacao || '').localeCompare(String(x?.data_avaliacao || '')));
  base.treinos = juntarLista(base.treinos, extra?.treinos);
  const pEx = extra?.prescricao;
  if ((!base.prescricao || !Object.keys(base.prescricao).length) && pEx && Object.keys(pEx).length) base.prescricao = pEx;
  if (Array.isArray(extra?.historicoExercicios)) base.historicoExercicios = [...new Set([...(base.historicoExercicios || []), ...extra.historicoExercicios])];
  if (!base.reavaliacao && extra?.reavaliacao) base.reavaliacao = extra.reavaliacao;
  // Qualquer outra chave que só o duplicado tem (ex.: ultimaFaseVolSessao) é preservada.
  for (const [k, v] of Object.entries(extra || {})) if (!(k in base) && v !== undefined) base[k] = v;
  return { camposPreenchidos: preenchidos };
}

// Une em `s` todos os duplicados achados na lista e tira os duplicados dela. Devolve os ids removidos.
export function consolidarAluno(students: any[], s: any, excluirIds: number[] = []): number[] {
  const removidos: number[] = [];
  for (const d of acharDuplicados(students, s, excluirIds)) {
    unirAlunos(s, d);
    const i = students.indexOf(d);
    if (i >= 0) { students.splice(i, 1); removidos.push(d.id); }
  }
  return removidos;
}

// Procura, na lista do personal, o registro SEM conta que já é este aluno (para ligar a conta nele em vez de criar um vazio).
export function acharRegistroSemConta(students: any[], ref: { cpf?: string; email?: string; nome?: string }): any | null {
  const alvo = { perfil: { cpf: ref.cpf, email: ref.email, nome: ref.nome } };
  return students.find((x) => x && !x.perfil?.alunoUserId && mesmoAluno(x, alvo)) || null;
}

// ── Cadastro antigo nas Arquivadas ───────────────────────────────────────────
// Envelope de js/arquivo-store.js: { arqId, tipo:'aluno', rotulo, dados:<aluno inteiro>, excluidoEm, idOriginal, restauradoEm }.
export function acharNoArquivo(arquivo: any[], ref: { cpf?: string; email?: string; nome?: string; studentId?: number | null }): any | null {
  const alvo = { perfil: { cpf: ref.cpf, email: ref.email, nome: ref.nome } };
  const achados = (Array.isArray(arquivo) ? arquivo : []).filter((e) => e && e.tipo === 'aluno' && !e.restauradoEm && !e.unidoEm && e.dados &&
    ((ref.studentId != null && e.idOriginal === ref.studentId) || mesmoAluno(e.dados, alvo)));
  achados.sort((a, b) => String(b.excluidoEm || '').localeCompare(String(a.excluidoEm || '')));
  return achados[0] || null;
}
