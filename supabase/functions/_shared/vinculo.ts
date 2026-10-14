// ══════════════════════════════════════════════════════════════════════════
// Vínculo aluno ↔ personal por NOME + CPF + E-MAIL, e transferência entre
// personais (Fase 4.1).
// ══════════════════════════════════════════════════════════════════════════
// Este arquivo é LÓGICA PURA: não importa nada de fora e recebe o acesso ao
// banco por "deps" injetadas — assim roda igual no Deno (Edge Function) e no
// Node (testes em tests/vinculo.test.mts). A cola com o Supabase fica em
// _shared/vinculo-db.ts.
//
// Regras (decididas com o Milton em 05/10/2026):
//  - Identidade = CPF. Nome e e-mail precisam bater junto com o CPF para o
//    sistema considerar "o mesmo aluno". O e-mail é o único dado que muda, e
//    só por ação autenticada (aluno logado ou o próprio personal) — nunca por
//    um cadastro novo, senão duplicaria o aluno.
//  - CPF novo → aluno novo, vinculado e pronto.
//  - Mesmo personal → reconhece e atualiza (histórico, treinos e id ficam).
//  - Outro personal → conflito: cancelar ou pedir transferência.
//  - Pedido do aluno: prazo de 30 dias; passou, transfere sozinho SEM treinos.
//    O personal atual só pode antecipar (e escolhe manter ou não o treino).
//  - Pedido iniciado pelo personal novo no cadastro manual: espera o aluno
//    confirmar; os 30 dias só contam a partir da confirmação.

export const PRAZO_DIAS = 30;

// ── Normalização ────────────────────────────────────────────────────────────

export function soDigitos(s: unknown): string {
  return typeof s === 'string' ? s.replace(/\D/g, '') : '';
}

export function cpfValido(cpf: unknown): boolean {
  const c = soDigitos(cpf);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const dv = (base: string, peso: number) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (peso - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(c.slice(0, 9), 10) === Number(c[9]) && dv(c.slice(0, 10), 11) === Number(c[10]);
}

export function normalizaNome(s: unknown): string {
  if (typeof s !== 'string') return '';
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function normalizaEmail(s: unknown): string {
  return typeof s === 'string' ? s.trim().toLowerCase() : '';
}

// Mesmo nome, ou mesmo primeiro e último nome ("Ana Maria Silva" = "Ana Silva").
// O CPF já bateu antes; isto só barra quem digitou o nome de outra pessoa.
export function nomesCompativeis(a: string, b: string): boolean {
  const x = normalizaNome(a), y = normalizaNome(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const tx = x.split(' '), ty = y.split(' ');
  return tx.length > 1 && ty.length > 1 && tx[0] === ty[0] && tx[tx.length - 1] === ty[ty.length - 1];
}

export function mascaraEmail(email: string): string {
  const [u, d] = normalizaEmail(email).split('@');
  if (!u || !d) return '';
  return u.slice(0, 1) + '***@' + d;
}

export function mascaraCpf(cpf: string): string {
  const c = soDigitos(cpf);
  return c.length === 11 ? '***.' + c.slice(3, 6) + '.***-' + c.slice(9) : '';
}

// HMAC-SHA256(pepper, só dígitos) em hex. O pepper é segredo da Edge Function
// (CPF_PEPPER): sem ele o índice de identidades não dá pra "reverter" por
// força bruta (CPF tem pouco espaço de busca).
export async function hashCpf(cpf: string, pepper: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(pepper), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(soDigitos(cpf)));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ── Decisão de cadastro ─────────────────────────────────────────────────────

export interface Identidade {
  id: string;
  cpf_hash: string;
  nome_norm: string;
  email_norm: string | null;
  trainer_user_id: string;
  aluno_user_id: string | null;
  student_id: number | null;
}

export interface DepsDecisao {
  identidadePorCpf(hash: string): Promise<Identidade | null>;
  identidadePorConta(userId: string): Promise<Identidade | null>;
  // Aluno antigo (sem CPF) do mesmo personal: casa por nome + e-mail. O e-mail não é confirmado,
  // então o casamento só gera um PEDIDO que o personal aprova (vinculos_pendentes), nunca liga sozinho.
  legadoNoPersonal(trainerId: string, nomeNorm: string, emailNorm: string): Promise<number | null>;
}

export interface EntradaCadastro {
  ator: 'aluno' | 'personal';
  cpf: string;
  nome: string;
  email: string;
  trainerAlvo: string;            // dono do link (aluno) ou quem está cadastrando (personal)
  contaId?: string | null;        // conta Supabase do aluno (ator = aluno)
  studentIdAtual?: number | null; // registro que o personal está editando (ator = personal)
}

export type Decisao =
  | { tipo: 'cpf-invalido' }
  | { tipo: 'cpf-nao-confere' }                                  // conta já tem outro CPF
  | { tipo: 'novo'; hash: string }
  | { tipo: 'legado'; hash: string; studentId: number }
  | { tipo: 'atualizar'; identidade: Identidade }
  | { tipo: 'vincular-conta'; identidade: Identidade }
  | { tipo: 'duplicado-no-personal'; identidade: Identidade }
  | { tipo: 'conflito'; identidade: Identidade }
  | { tipo: 'divergencia' }                                      // CPF existe, nome (ou dados) não batem
  | { tipo: 'email-diferente'; emailMascarado: string };         // CPF+nome batem, e-mail não

export async function decidirCadastro(e: EntradaCadastro, d: DepsDecisao, pepper: string): Promise<Decisao> {
  if (!cpfValido(e.cpf)) return { tipo: 'cpf-invalido' };
  const hash = await hashCpf(e.cpf, pepper);
  const email = normalizaEmail(e.email);

  const idConta = e.ator === 'aluno' && e.contaId ? await d.identidadePorConta(e.contaId) : null;
  if (idConta && idConta.cpf_hash !== hash) return { tipo: 'cpf-nao-confere' };

  const ident = await d.identidadePorCpf(hash);

  if (!ident) {
    if (e.ator === 'aluno') {
      const legado = await d.legadoNoPersonal(e.trainerAlvo, normalizaNome(e.nome), email);
      if (legado != null) return { tipo: 'legado', hash, studentId: legado };
    }
    return { tipo: 'novo', hash };
  }

  if (!nomesCompativeis(e.nome, ident.nome_norm)) return { tipo: 'divergencia' };

  const mesmoPersonal = ident.trainer_user_id === e.trainerAlvo;
  const editandoMesmoRegistro = e.ator === 'personal' && mesmoPersonal && ident.student_id != null && ident.student_id === e.studentIdAtual;

  // E-mail: o terceiro dado. Só pode estar "em branco" no cadastro do próprio
  // personal e enquanto ninguém criou acesso (nada pra confrontar).
  if (ident.email_norm && ident.email_norm !== email) {
    const personalCorrigindoSemConta = editandoMesmoRegistro && !ident.aluno_user_id;
    if (!personalCorrigindoSemConta) return { tipo: 'email-diferente', emailMascarado: mascaraEmail(ident.email_norm) };
  }

  if (mesmoPersonal) {
    if (e.ator === 'aluno') {
      if (!ident.aluno_user_id) return { tipo: 'vincular-conta', identidade: ident };
      if (ident.aluno_user_id === e.contaId) return { tipo: 'atualizar', identidade: ident };
      return { tipo: 'email-diferente', emailMascarado: mascaraEmail(ident.email_norm || '') };
    }
    return editandoMesmoRegistro ? { tipo: 'atualizar', identidade: ident } : { tipo: 'duplicado-no-personal', identidade: ident };
  }

  // Outro personal: os 3 dados precisam bater (e-mail em branco não vale).
  if (!ident.email_norm || !email) return { tipo: 'divergencia' };
  if (e.ator === 'aluno' && ident.aluno_user_id && ident.aluno_user_id !== e.contaId) {
    return { tipo: 'email-diferente', emailMascarado: mascaraEmail(ident.email_norm) };
  }
  return { tipo: 'conflito', identidade: ident };
}

// ── Transferência ───────────────────────────────────────────────────────────

export type StatusTransf = 'aguardando_aluno' | 'pendente' | 'concluida' | 'cancelada';

export interface Transferencia {
  id: string;
  identidade_id: string;
  aluno_user_id: string | null;
  trainer_atual_id: string;
  trainer_novo_id: string;
  student_id: number | null;
  iniciado_por: 'aluno' | 'personal';
  status: StatusTransf;
  manter_treinos: boolean | null;
  snapshot: Record<string, unknown>;
  criado_em: string;
  confirmado_aluno_em: string | null;
  prazo_em: string | null;
  concluida_em: string | null;
  motivo_fim: string | null;
}

export function prazoDe(base: Date): string {
  return new Date(base.getTime() + PRAZO_DIAS * 86400000).toISOString();
}

// Pedido nasce de que lado, e quando o relógio dos 30 dias começa.
export function novaTransferencia(p: {
  identidade: Identidade; trainerNovo: string; iniciadoPor: 'aluno' | 'personal';
  alunoUserId: string | null; snapshot: Record<string, unknown>; agora?: Date;
}): Omit<Transferencia, 'id'> {
  const agora = p.agora || new Date();
  const doAluno = p.iniciadoPor === 'aluno';
  return {
    identidade_id: p.identidade.id,
    aluno_user_id: p.alunoUserId,
    trainer_atual_id: p.identidade.trainer_user_id,
    trainer_novo_id: p.trainerNovo,
    student_id: p.identidade.student_id,
    iniciado_por: p.iniciadoPor,
    status: doAluno ? 'pendente' : 'aguardando_aluno',
    manter_treinos: null,
    snapshot: p.snapshot,
    criado_em: agora.toISOString(),
    confirmado_aluno_em: doAluno ? agora.toISOString() : null,
    prazo_em: doAluno ? prazoDe(agora) : null,
    concluida_em: null,
    motivo_fim: null,
  };
}

export function transferenciaAberta(t: Pick<Transferencia, 'status'>): boolean {
  return t.status === 'aguardando_aluno' || t.status === 'pendente';
}

export interface DepsExec {
  carregarStudents(trainerId: string): Promise<{ students: any[]; todosIds: number[] }>;
  salvarStudents(trainerId: string, students: any[]): Promise<void>;
  moverAcesso(alunoUserId: string, trainerNovo: string): Promise<void>;
  atualizarIdentidade(id: string, patch: Record<string, unknown>): Promise<void>;
  atualizarTransferencia(id: string, patch: Record<string, unknown>): Promise<void>;
  novoId(existentes: number[]): number;
}

function acharAluno(students: any[], t: Transferencia): number {
  return students.findIndex((s) =>
    (t.student_id != null && s?.id === t.student_id) ||
    (t.aluno_user_id && s?.perfil?.alunoUserId === t.aluno_user_id));
}

// Move o aluno inteiro (perfil, anamnese, avaliações, histórico) do personal
// atual pro novo. `manterTreinos=false` limpa treinos e prescrição.
export async function executarTransferencia(
  d: DepsExec, t: Transferencia, manterTreinos: boolean, motivo: 'antecipada' | 'prazo', agora = new Date(),
): Promise<{ novoStudentId: number }> {
  if (!transferenciaAberta(t)) throw new Error('Transferência já resolvida.');

  const origem = await d.carregarStudents(t.trainer_atual_id);
  const idx = acharAluno(origem.students, t);
  if (idx < 0) throw new Error('Aluno não encontrado na lista do personal atual.');
  const [aluno] = origem.students.splice(idx, 1);

  aluno.perfil = aluno.perfil || {};
  if (!manterTreinos) { aluno.treinos = []; aluno.prescricao = {}; }
  aluno.perfil.transferidoDe = { trainerId: t.trainer_atual_id, em: agora.toISOString(), comTreinos: manterTreinos };
  aluno.perfil.novoCadastro = true;   // vira o aviso "aluno novo" na lista do personal novo

  const destino = await d.carregarStudents(t.trainer_novo_id);
  aluno.id = d.novoId(destino.todosIds);
  // Se o personal novo abriu o pedido pelo cadastro manual, o rascunho que ele tinha
  // (sem treino) sai: o aluno de verdade entra no lugar, sem duplicar.
  const rascunho = typeof t.snapshot?.draftStudentId === 'number' ? t.snapshot.draftStudentId : null;
  if (rascunho != null) {
    const di = destino.students.findIndex((s: any) => s?.id === rascunho);
    if (di >= 0 && !((destino.students[di].treinos || []).length)) destino.students.splice(di, 1);
  }
  destino.students.push(aluno);

  // Primeiro entra no destino, depois sai da origem: se a segunda gravação
  // falhar o aluno existe nos dois (recuperável), nunca em nenhum.
  await d.salvarStudents(t.trainer_novo_id, destino.students);
  await d.salvarStudents(t.trainer_atual_id, origem.students);

  if (t.aluno_user_id) await d.moverAcesso(t.aluno_user_id, t.trainer_novo_id);
  await d.atualizarIdentidade(t.identidade_id, { trainer_user_id: t.trainer_novo_id, student_id: aluno.id, atualizado_em: agora.toISOString() });
  await d.atualizarTransferencia(t.id, {
    status: 'concluida', manter_treinos: manterTreinos, motivo_fim: motivo, concluida_em: agora.toISOString(),
  });
  return { novoStudentId: aluno.id };
}

// Roda as transferências cujo prazo venceu (sem treinos). Devolve os ids feitos.
export async function processarPrazos(d: DepsExec, abertas: Transferencia[], agora = new Date()): Promise<string[]> {
  const feitas: string[] = [];
  for (const t of abertas) {
    if (t.status !== 'pendente' || !t.prazo_em) continue;
    if (Date.parse(t.prazo_em) > agora.getTime()) continue;
    try { await executarTransferencia(d, t, false, 'prazo', agora); feitas.push(t.id); }
    catch (e) { console.error('prazo: falha ao transferir', t.id, e); }
  }
  return feitas;
}
