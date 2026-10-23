// Cola entre a lógica pura (vinculo.ts) e o Supabase. Só Edge Functions usam
// isto (service_role). Tabelas: supabase/sql/vinculo-cpf.sql.
import {
  type DepsDecisao, type DepsExec, type Identidade, type Transferencia,
  decidirCadastro, mascaraCpf, normalizaNome, normalizaEmail, processarPrazos, situacaoDoStudent, soDigitos,
} from './vinculo.ts';
import { loadStudents, saveStudents, novoId } from './students.ts';
import { acharNoArquivo } from './alunos-merge.ts';

// Arquivadas do personal (app_data.key='arquivo'): excluir e arquivar nunca apagam de verdade, o aluno fica ali.
export async function carregarArquivo(admin: any, trainerId: string): Promise<any[]> {
  const { data, error } = await admin.from('app_data').select('data').eq('user_id', trainerId).eq('key', 'arquivo').maybeSingle();
  if (error) throw error;
  return Array.isArray(data?.data) ? data.data : [];
}

export function pepperCpf(): string {
  const p = Deno.env.get('CPF_PEPPER');
  if (!p || p.length < 16) throw new Error('Configuração incompleta: defina o secret CPF_PEPPER (mínimo 16 caracteres) nas Edge Functions.');
  return p;
}

export function depsDecisao(
  admin: any,
  studentDaConta?: () => Promise<{ trainerId: string; studentId: number } | null>,
  legadosRecusados?: () => Promise<number[]>,
): DepsDecisao {
  return {
    identidadePorCpf: async (hash) => {
      const { data, error } = await admin.from('alunos_identidade').select('*').eq('cpf_hash', hash).maybeSingle();
      if (error) throw error;
      return (data as Identidade) || null;
    },
    identidadePorConta: async (userId) => {
      const { data, error } = await admin.from('alunos_identidade').select('*').eq('aluno_user_id', userId).maybeSingle();
      if (error) throw error;
      return (data as Identidade) || null;
    },
    legadoNoPersonal: async (trainerId, nomeNorm, emailNorm) => {
      // 1) o registro que já está ligado a esta conta (aluno antigo que o personal liberou
      //    com "definir senha") tem prioridade, mesmo que o nome esteja escrito diferente;
      if (studentDaConta) {
        const proprio = await studentDaConta();
        if (proprio && proprio.trainerId === trainerId) return proprio.studentId;
      }
      // 2) aluno antigo do personal, ainda sem CPF, que bate em nome + e-mail. O e-mail NÃO é
      //    confirmado, então isto só gera um PEDIDO que o personal aprova (vinculos_pendentes);
      //    quem o personal já recusou para esta conta não casa de novo (vira aluno novo).
      const recusados = legadosRecusados ? await legadosRecusados() : [];
      const { students } = await loadStudents(admin, trainerId);
      const achado = students.find((s: any) =>
        !soDigitos(s?.perfil?.cpf) && s?.perfil?.email && !recusados.includes(s?.id) &&
        normalizaNome(s.perfil.nome) === nomeNorm && normalizaEmail(s.perfil.email) === emailNorm);
      return achado ? achado.id : null;
    },
    // Situação do aluno no personal ATUAL: pela lista dele; se não está lá, pelas Arquivadas; senão inexistente.
    situacaoDoAluno: async (ident) => {
      const { students } = await loadStudents(admin, ident.trainer_user_id);
      const s = students.find((x: any) =>
        (ident.student_id != null && x?.id === ident.student_id) || (ident.aluno_user_id && x?.perfil?.alunoUserId === ident.aluno_user_id));
      if (s) return situacaoDoStudent(s);
      const arq = await carregarArquivo(admin, ident.trainer_user_id);
      const ref = { email: ident.email_norm || '', nome: ident.nome_norm, studentId: ident.student_id };
      return acharNoArquivo(arq, ref) ? 'arquivado' : 'inexistente';
    },
  };
}

export function depsExec(admin: any): DepsExec {
  return {
    carregarStudents: (t) => loadStudents(admin, t),
    salvarStudents: (t, s) => saveStudents(admin, t, s),
    moverAcesso: async (alunoUserId, trainerNovo) => {
      const { data } = await admin.from('alunos_acesso').select('id').eq('aluno_user_id', alunoUserId).maybeSingle();
      if (data) {
        const { error } = await admin.from('alunos_acesso').update({ trainer_user_id: trainerNovo, status: 'ativo' }).eq('aluno_user_id', alunoUserId);
        if (error) throw error;
      } else {
        const { error } = await admin.from('alunos_acesso').insert({ trainer_user_id: trainerNovo, aluno_user_id: alunoUserId, status: 'ativo' });
        if (error) throw error;
      }
    },
    atualizarIdentidade: async (id, patch) => {
      const { error } = await admin.from('alunos_identidade').update(patch).eq('id', id);
      if (error) throw error;
    },
    atualizarTransferencia: async (id, patch) => {
      const { error } = await admin.from('transferencias_vinculo').update(patch).eq('id', id);
      if (error) throw error;
    },
    novoId,
  };
}

// ── Consultas ───────────────────────────────────────────────────────────────

export async function nomeDoPersonal(admin: any, trainerId: string): Promise<string> {
  const { data } = await admin.from('personal_links').select('nome_exibicao').eq('trainer_user_id', trainerId).maybeSingle();
  return (data?.nome_exibicao || '').trim() || 'outro personal';
}

export async function transferenciaAbertaDaIdentidade(admin: any, identidadeId: string): Promise<Transferencia | null> {
  const { data, error } = await admin.from('transferencias_vinculo').select('*')
    .eq('identidade_id', identidadeId).in('status', ['aguardando_aluno', 'pendente']).maybeSingle();
  if (error) throw error;
  return (data as Transferencia) || null;
}

export async function transferenciaAbertaDoAluno(admin: any, alunoUserId: string): Promise<Transferencia | null> {
  const { data, error } = await admin.from('transferencias_vinculo').select('*')
    .eq('aluno_user_id', alunoUserId).in('status', ['aguardando_aluno', 'pendente'])
    .order('criado_em', { ascending: false }).limit(1);
  if (error) throw error;
  return (data && data[0]) || null;
}

// Executa os prazos vencidos. Sem filtro = todos (cron). Com filtro = só os que
// envolvem aquela pessoa (cada abertura de painel/portal faz isso de graça).
export async function processarPrazosVencidos(admin: any, filtro?: { trainerId?: string; alunoUserId?: string }): Promise<string[]> {
  let q = admin.from('transferencias_vinculo').select('*').eq('status', 'pendente').lte('prazo_em', new Date().toISOString()).limit(50);
  if (filtro?.alunoUserId) q = q.eq('aluno_user_id', filtro.alunoUserId);
  if (filtro?.trainerId) q = q.or(`trainer_atual_id.eq.${filtro.trainerId},trainer_novo_id.eq.${filtro.trainerId}`);
  const { data, error } = await q;
  if (error) throw error;
  if (!data || !data.length) return [];
  return processarPrazos(depsExec(admin), data as Transferencia[]);
}

// Campos do cadastro (já limpos) → registro do aluno no JSON do personal.
export function aplicarCadastro(s: any, c: {
  nome: string; cpf: string; nascimento: string; sexo: string; whatsapp: string; profissao: string;
  email: string; alunoUserId: string; identidadeId: string;
}) {
  s.perfil = s.perfil || {};
  s.perfil.nome = c.nome || s.perfil.nome || '';
  s.perfil.cpf = c.cpf;
  // Cadastro mínimo (nome + CPF) não apaga dados pessoais que já existem.
  s.perfil.nascimento = c.nascimento || s.perfil.nascimento || ''; s.perfil.sexo = c.sexo || s.perfil.sexo || '';
  s.perfil.whatsapp = c.whatsapp || s.perfil.whatsapp || ''; s.perfil.profissao = c.profissao || s.perfil.profissao || '';
  s.perfil.email = c.email; s.perfil.alunoUserId = c.alunoUserId; s.perfil.identidadeId = c.identidadeId;
  s.perfil.portalStatus = s.perfil.portalStatus || 'ativo';
  return s;
}

// ── Pedido de acesso de aluno antigo: o personal aprova ─────────────────────
// Tabela: supabase/sql/vinculos-pendentes.sql (só service_role).

export interface Pendente {
  id: string; trainer_user_id: string; student_id: number; aluno_user_id: string;
  email: string; perfil: any; cpf_mascarado: string; status: 'pendente' | 'aprovado' | 'recusado'; criado_em: string;
}

export async function pendenteAbertoDoAluno(admin: any, alunoUserId: string): Promise<Pendente | null> {
  const { data, error } = await admin.from('vinculos_pendentes').select('*')
    .eq('aluno_user_id', alunoUserId).eq('status', 'pendente').maybeSingle();
  if (error) throw error;
  return (data as Pendente) || null;
}

export async function legadosRecusadosDaConta(admin: any, alunoUserId: string): Promise<number[]> {
  const { data, error } = await admin.from('vinculos_pendentes').select('student_id')
    .eq('aluno_user_id', alunoUserId).eq('status', 'recusado');
  if (error) throw error;
  return ((data || []) as any[]).map((r) => Number(r.student_id));
}

// Um pedido aberto por conta: repetir o cadastro só atualiza o que já está esperando.
export async function registrarPendente(admin: any, p: {
  trainerId: string; studentId: number; alunoUserId: string; email: string; perfil: Record<string, unknown>;
}): Promise<Pendente> {
  const linha = {
    trainer_user_id: p.trainerId, student_id: p.studentId, aluno_user_id: p.alunoUserId,
    email: normalizaEmail(p.email), perfil: p.perfil, cpf_mascarado: mascaraCpf(String(p.perfil.cpf || '')), status: 'pendente',
  };
  const aberto = await pendenteAbertoDoAluno(admin, p.alunoUserId);
  const q = aberto
    ? admin.from('vinculos_pendentes').update(linha).eq('id', aberto.id).select('*').single()
    : admin.from('vinculos_pendentes').insert(linha).select('*').single();
  const { data, error } = await q;
  if (error) throw error;
  return data as Pendente;
}

// Aprova (liga a conta ao registro antigo) ou recusa. Na aprovação reconfere tudo, porque
// passou tempo desde o pedido: se algo mudou devolve 'mudou' e não toca em nada.
export async function resolverPendente(admin: any, p: Pendente, aprovar: boolean): Promise<{ status: 'ok' | 'mudou' }> {
  const agora = new Date().toISOString();
  // Resolvido o pedido, o CPF digitado não precisa mais ficar guardado (só o mascarado, para o histórico).
  const fechar = async (status: 'aprovado' | 'recusado', linha: Pendente = p) => {
    const { error } = await admin.from('vinculos_pendentes')
      .update({ status, resolvido_em: agora, perfil: { ...(linha.perfil || {}), cpf: '' } }).eq('id', linha.id);
    if (error) throw error;
  };
  if (!aprovar) { await fechar('recusado'); return { status: 'ok' }; }

  const { data: u } = await admin.auth.admin.getUserById(p.aluno_user_id);
  const email = normalizaEmail(u?.user?.email);
  if (!email) return { status: 'mudou' };
  const { data: jaTem } = await admin.from('alunos_acesso').select('id').eq('aluno_user_id', p.aluno_user_id).maybeSingle();
  if (jaTem) return { status: 'mudou' };

  const perfil = p.perfil || {};
  const d = await decidirCadastro(
    { ator: 'aluno', cpf: perfil.cpf, nome: perfil.nome, email, trainerAlvo: p.trainer_user_id, contaId: p.aluno_user_id },
    depsDecisao(admin), pepperCpf(),
  );
  if (d.tipo !== 'legado' || d.studentId !== Number(p.student_id)) return { status: 'mudou' };

  const { students } = await loadStudents(admin, p.trainer_user_id);
  const s = students.find((x: any) => x?.id === d.studentId);
  if (!s) return { status: 'mudou' };

  const { data: ident, error: eIdent } = await admin.from('alunos_identidade').insert({
    cpf_hash: d.hash, nome_norm: normalizaNome(perfil.nome), email_norm: email,
    trainer_user_id: p.trainer_user_id, aluno_user_id: p.aluno_user_id, student_id: d.studentId,
  }).select('*').single();
  if (eIdent) throw eIdent;
  aplicarCadastro(s, { ...perfil, email, alunoUserId: p.aluno_user_id, identidadeId: ident.id });
  await saveStudents(admin, p.trainer_user_id, students);
  const { error: eAcesso } = await admin.from('alunos_acesso').insert({ trainer_user_id: p.trainer_user_id, aluno_user_id: p.aluno_user_id, status: 'ativo' });
  if (eAcesso && (eAcesso as any).code !== '23505') throw eAcesso;
  const { error: eRastro } = await admin.from('avaliacoes_pendentes').insert({
    trainer_user_id: p.trainer_user_id, aluno_user_id: p.aluno_user_id, tipo: 'cadastro_inicial', status: 'aplicado',
    dados: { perfil: { ...perfil, cpf: undefined } },
  });
  if (eRastro) console.error('Falha ao registrar rastro (cadastro_inicial):', eRastro);

  await fechar('aprovado');
  // Outras contas que pediram o mesmo registro ficam recusadas: só uma conta por aluno.
  const { data: outros } = await admin.from('vinculos_pendentes').select('*')
    .eq('trainer_user_id', p.trainer_user_id).eq('student_id', p.student_id).eq('status', 'pendente');
  for (const o of (outros || []) as Pendente[]) await fechar('recusado', o);
  return { status: 'ok' };
}

export function snapshotCadastro(c: { nome: string; cpf: string; nascimento?: string; sexo?: string; whatsapp?: string; profissao?: string; email: string }, extra: Record<string, unknown> = {}) {
  const d = soDigitos(c.cpf);
  return {
    nome: c.nome, cpfMascarado: d.length === 11 ? '***.' + d.slice(3, 6) + '.***-' + d.slice(9) : '',
    nascimento: c.nascimento || '', sexo: c.sexo || '', whatsapp: c.whatsapp || '', profissao: c.profissao || '',
    email: c.email, ...extra,
  };
}
