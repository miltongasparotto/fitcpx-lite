// Cola entre a lógica pura (vinculo.ts) e o Supabase. Só Edge Functions usam
// isto (service_role). Tabelas: supabase/sql/vinculo-cpf.sql.
import {
  type DepsDecisao, type DepsExec, type Identidade, type Transferencia,
  normalizaNome, normalizaEmail, processarPrazos, soDigitos,
} from './vinculo.ts';
import { loadStudents, saveStudents, novoId } from './students.ts';

export function pepperCpf(): string {
  const p = Deno.env.get('CPF_PEPPER');
  if (!p || p.length < 16) throw new Error('Configuração incompleta: defina o secret CPF_PEPPER (mínimo 16 caracteres) nas Edge Functions.');
  return p;
}

export function depsDecisao(admin: any, studentDaConta?: () => Promise<{ trainerId: string; studentId: number } | null>): DepsDecisao {
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
      // 2) aluno antigo do personal, ainda sem CPF, que bate em nome + e-mail.
      const { students } = await loadStudents(admin, trainerId);
      const achado = students.find((s: any) =>
        !soDigitos(s?.perfil?.cpf) && s?.perfil?.email &&
        normalizaNome(s.perfil.nome) === nomeNorm && normalizaEmail(s.perfil.email) === emailNorm);
      return achado ? achado.id : null;
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
  s.perfil.nascimento = c.nascimento; s.perfil.sexo = c.sexo;
  s.perfil.whatsapp = c.whatsapp; s.perfil.profissao = c.profissao;
  s.perfil.email = c.email; s.perfil.alunoUserId = c.alunoUserId; s.perfil.identidadeId = c.identidadeId;
  s.perfil.portalStatus = s.perfil.portalStatus || 'ativo';
  return s;
}

export function snapshotCadastro(c: { nome: string; cpf: string; nascimento?: string; sexo?: string; whatsapp?: string; profissao?: string; email: string }, extra: Record<string, unknown> = {}) {
  const d = soDigitos(c.cpf);
  return {
    nome: c.nome, cpfMascarado: d.length === 11 ? '***.' + d.slice(3, 6) + '.***-' + d.slice(9) : '',
    nascimento: c.nascimento || '', sexo: c.sexo || '', whatsapp: c.whatsapp || '', profissao: c.profissao || '',
    email: c.email, ...extra,
  };
}
