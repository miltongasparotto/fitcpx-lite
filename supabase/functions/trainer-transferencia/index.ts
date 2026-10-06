// ══════════════════════════════════════════════════════════════════════════
// trainer-transferencia — ações do PERSONAL que precisam de privilégio de admin
// ══════════════════════════════════════════════════════════════════════════
// Chamada com o JWT do personal. Ações:
//   registrar-aluno       cadastro manual: confere nome + CPF + e-mail no índice central
//   solicitar-troca       aluno já é de outro personal: abre o pedido (personal novo)
//   antecipar             personal ATUAL libera agora (escolhe manter ou não o treino)
//   responder-novo        personal NOVO aceita ou recusa receber o aluno
//   cancelar              personal novo desiste do pedido que abriu
//   listar                pedidos que saem / chegam (e roda os prazos vencidos)
//   alterar-email-aluno   troca o e-mail de login de um aluno que já tem conta
//   definir-senha         cria a conta do aluno (ou reseta a senha) pelo e-mail
//   definir-nome          nome que aparece pros outros ("vinculado ao personal X")
//
// Regras: ver _shared/vinculo.ts. Segurança (revisão 05/10/2026):
//  - definir-senha nunca troca senha de conta que não seja aluno DESTE personal;
//  - só o personal ATUAL antecipa; o prazo de 30 dias é de quem pediu (aluno);
//  - nada aqui é "recusar": o aluno não fica preso (passou o prazo, transfere).
import { corsHeaders } from '../_shared/cors.ts';
import { getAdminClient, getCallerUser, loadStudents, saveStudents, garantirStudentNoBlob, jsonResponse, limpaTexto, UUID_RE } from '../_shared/students.ts';
import {
  decidirCadastro, executarTransferencia, normalizaEmail, normalizaNome, novaTransferencia, soDigitos, hashCpf,
  transferenciaAberta, type Identidade, type Transferencia,
} from '../_shared/vinculo.ts';
import {
  pepperCpf, depsDecisao, depsExec, nomeDoPersonal, transferenciaAbertaDaIdentidade,
  processarPrazosVencidos, snapshotCadastro,
} from '../_shared/vinculo-db.ts';

class ErroUsuario extends Error {}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = getAdminClient();
  const caller = await getCallerUser(admin, req);
  if (!caller) return jsonResponse({ error: 'Não autenticado.' }, 401, corsHeaders);

  let body: any = {};
  try { body = await req.json(); } catch { /* noop */ }

  try {
    const a = body?.acao;
    if (a === 'registrar-aluno') return jsonResponse(await registrarAluno(admin, caller, body), 200, corsHeaders);
    if (a === 'solicitar-troca') return jsonResponse(await solicitarTroca(admin, caller, body), 200, corsHeaders);
    if (a === 'antecipar') return jsonResponse(await antecipar(admin, caller, body.id, !!body.manterTreinos), 200, corsHeaders);
    if (a === 'responder-novo') return jsonResponse(await responderNovo(admin, caller, body.id, !!body.aceitar), 200, corsHeaders);
    if (a === 'cancelar') return jsonResponse(await cancelar(admin, caller, body.id), 200, corsHeaders);
    if (a === 'listar') return jsonResponse(await listar(admin, caller), 200, corsHeaders);
    if (a === 'alterar-email-aluno') return jsonResponse(await alterarEmailAluno(admin, caller, body.studentId, body.novoEmail), 200, corsHeaders);
    if (a === 'definir-senha') return jsonResponse(await definirSenha(admin, caller, body.email, body.novaSenha), 200, corsHeaders);
    if (a === 'definir-nome') return jsonResponse(await definirNome(admin, caller, body.nome), 200, corsHeaders);
    return jsonResponse({ error: 'Ação desconhecida.' }, 400, corsHeaders);
  } catch (e) {
    console.error('trainer-transferencia erro:', e);
    const msg = e instanceof ErroUsuario ? e.message : 'Não foi possível concluir. Tente de novo em instantes.';
    return jsonResponse({ error: msg }, e instanceof ErroUsuario ? 400 : 500, corsHeaders);
  }
});

// ── Utilidades ──────────────────────────────────────────────────────────────

function lerEntrada(b: any) {
  return {
    studentId: Number.isFinite(Number(b?.studentId)) ? Number(b.studentId) : null,
    nome: limpaTexto(b?.nome, 120),
    cpf: soDigitos(b?.cpf).slice(0, 11),
    email: normalizaEmail(b?.email),
    whatsapp: limpaTexto(b?.whatsapp, 25),
  };
}

async function acharStudent(admin: any, trainerId: string, studentId: number | null) {
  if (studentId == null) return null;
  const { students } = await loadStudents(admin, trainerId);
  return students.find((s: any) => s?.id === studentId) || null;
}

async function transferenciaPorId(admin: any, id: unknown): Promise<Transferencia> {
  if (typeof id !== 'string' || !UUID_RE.test(id)) throw new ErroUsuario('Pedido inválido.');
  const { data, error } = await admin.from('transferencias_vinculo').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) throw new ErroUsuario('Pedido não encontrado.');
  return data as Transferencia;
}

// O aluno (do personal ATUAL) com pedido em aberto fica só pra visualização.
async function pedidoAbertoDoStudent(admin: any, trainerId: string, studentId: number): Promise<Transferencia | null> {
  const { data, error } = await admin.from('transferencias_vinculo').select('*')
    .eq('trainer_atual_id', trainerId).eq('student_id', studentId).in('status', ['aguardando_aluno', 'pendente']).limit(1);
  if (error) throw error;
  return (data && data[0]) || null;
}

// ── Cadastro manual: confere no índice central ──────────────────────────────

async function registrarAluno(admin: any, caller: any, b: any) {
  const e = lerEntrada(b);
  if (e.studentId == null) throw new ErroUsuario('Aluno inválido.');
  if (!e.nome) throw new ErroUsuario('Informe o nome do aluno.');
  const s = await acharStudent(admin, caller.id, e.studentId);
  if (!s) throw new ErroUsuario('Aluno não encontrado na sua lista.');
  if (await pedidoAbertoDoStudent(admin, caller.id, e.studentId)) return { status: 'travado' };

  const pepper = pepperCpf();
  const deps = depsDecisao(admin);
  const d = await decidirCadastro({ ator: 'personal', cpf: e.cpf, nome: e.nome, email: e.email, trainerAlvo: caller.id, studentIdAtual: e.studentId }, deps, pepper);

  // O aluno já tem conta com OUTRO CPF registrado? CPF não muda depois de vinculado.
  const contaId: string | null = s.perfil?.alunoUserId || null;
  if (contaId) {
    const idConta = await deps.identidadePorConta(contaId);
    if (idConta && 'hash' in d && d.hash !== idConta.cpf_hash) return { status: 'cpf-nao-confere' };
    if (idConta && d.tipo === 'novo') return { status: 'cpf-nao-confere' };
  }

  switch (d.tipo) {
    case 'cpf-invalido': return { status: 'cpf-invalido' };
    case 'cpf-nao-confere': return { status: 'cpf-nao-confere' };
    case 'divergencia': return { status: 'divergencia' };
    case 'email-diferente': return { status: 'email-diferente', emailMascarado: d.emailMascarado };
    case 'duplicado-no-personal': {
      const outro = await acharStudent(admin, caller.id, d.identidade.student_id);
      return { status: 'duplicado', nomeOutroAluno: outro?.perfil?.nome || 'outro aluno' };
    }
    case 'conflito': {
      const aberta = await transferenciaAbertaDaIdentidade(admin, d.identidade.id);
      return { status: 'conflito', personalNome: await nomeDoPersonal(admin, d.identidade.trainer_user_id), jaHaPedido: !!aberta };
    }
    case 'novo': {
      // Erro de digitação do CPF antes de existir conta: troca o CPF da identidade que já era deste registro.
      const antiga = s.perfil?.identidadeId ? (await admin.from('alunos_identidade').select('*').eq('id', s.perfil.identidadeId).maybeSingle()).data as Identidade | null : null;
      if (antiga && !antiga.aluno_user_id) {
        const { error } = await admin.from('alunos_identidade').update({
          cpf_hash: d.hash, nome_norm: normalizaNome(e.nome), email_norm: e.email || null, atualizado_em: new Date().toISOString(),
        }).eq('id', antiga.id);
        if (error) throw error;
        return { status: 'ok', identidadeId: antiga.id };
      }
      const { data, error } = await admin.from('alunos_identidade').insert({
        cpf_hash: d.hash, nome_norm: normalizaNome(e.nome), email_norm: e.email || null,
        trainer_user_id: caller.id, aluno_user_id: contaId, student_id: e.studentId,
      }).select('id').single();
      if (error) throw error;
      return { status: 'ok', identidadeId: data.id };
    }
    case 'atualizar': {
      const ident = d.identidade;
      const patch: Record<string, unknown> = { nome_norm: normalizaNome(e.nome), atualizado_em: new Date().toISOString() };
      if (!ident.aluno_user_id) patch.email_norm = e.email || null;   // com conta, e-mail só pela ação própria
      const { error } = await admin.from('alunos_identidade').update(patch).eq('id', ident.id);
      if (error) throw error;
      return { status: 'ok', identidadeId: ident.id };
    }
    default: return { status: 'divergencia' };
  }
}

// ── Pedido de troca iniciado pelo personal NOVO ─────────────────────────────

async function solicitarTroca(admin: any, caller: any, b: any) {
  const e = lerEntrada(b);
  if (e.studentId == null || !e.nome) throw new ErroUsuario('Dados incompletos.');
  const draft = await acharStudent(admin, caller.id, e.studentId);
  if (!draft) throw new ErroUsuario('Aluno não encontrado na sua lista.');

  const d = await decidirCadastro({ ator: 'personal', cpf: e.cpf, nome: e.nome, email: e.email, trainerAlvo: caller.id, studentIdAtual: e.studentId }, depsDecisao(admin), pepperCpf());
  if (d.tipo !== 'conflito') throw new ErroUsuario('Os dados mudaram. Refaça o cadastro do aluno.');
  const ident = d.identidade;

  const aberta = await transferenciaAbertaDaIdentidade(admin, ident.id);
  if (aberta) {
    if (aberta.trainer_novo_id === caller.id) return { status: 'ja-solicitado', id: aberta.id };
    return { status: 'ja-ha-pedido', paraNome: await nomeDoPersonal(admin, aberta.trainer_novo_id) };
  }

  const nova = novaTransferencia({
    identidade: ident, trainerNovo: caller.id, iniciadoPor: 'personal', alunoUserId: ident.aluno_user_id,
    snapshot: snapshotCadastro(
      { nome: e.nome, cpf: e.cpf, nascimento: draft.perfil?.nascimento, sexo: draft.perfil?.sexo, whatsapp: e.whatsapp || draft.perfil?.whatsapp, profissao: draft.perfil?.profissao, email: e.email },
      { draftStudentId: e.studentId },
    ),
  });
  const { data, error } = await admin.from('transferencias_vinculo').insert(nova).select('*').single();
  if (error) throw error;
  return {
    status: 'ok', id: data.id, deNome: await nomeDoPersonal(admin, ident.trainer_user_id),
    esperaAluno: true, alunoTemConta: !!ident.aluno_user_id,
  };
}

// ── Resoluções ──────────────────────────────────────────────────────────────

async function antecipar(admin: any, caller: any, id: unknown, manterTreinos: boolean) {
  const t = await transferenciaPorId(admin, id);
  if (t.trainer_atual_id !== caller.id) throw new ErroUsuario('Esse pedido não é de um aluno seu.');
  if (!transferenciaAberta(t)) throw new ErroUsuario('Esse pedido já foi resolvido.');
  await executarTransferencia(depsExec(admin), t, manterTreinos, 'antecipada');
  return { status: 'ok' };
}

async function responderNovo(admin: any, caller: any, id: unknown, aceitar: boolean) {
  const t = await transferenciaPorId(admin, id);
  if (t.trainer_novo_id !== caller.id) throw new ErroUsuario('Esse pedido não é para você.');
  if (!transferenciaAberta(t)) throw new ErroUsuario('Esse pedido já foi resolvido.');
  const patch = aceitar
    ? { aceite_novo_em: new Date().toISOString() }
    : { status: 'cancelada', motivo_fim: 'recusada_novo', concluida_em: new Date().toISOString() };
  const { error } = await admin.from('transferencias_vinculo').update(patch).eq('id', t.id);
  if (error) throw error;
  return { status: 'ok' };
}

async function cancelar(admin: any, caller: any, id: unknown) {
  const t = await transferenciaPorId(admin, id);
  if (t.trainer_novo_id !== caller.id || t.iniciado_por !== 'personal') throw new ErroUsuario('Só quem abriu o pedido pode cancelar.');
  if (t.status !== 'aguardando_aluno') throw new ErroUsuario('O aluno já confirmou; só ele pode cancelar agora.');
  const { error } = await admin.from('transferencias_vinculo')
    .update({ status: 'cancelada', motivo_fim: 'cancelada_novo', concluida_em: new Date().toISOString() }).eq('id', t.id);
  if (error) throw error;
  return { status: 'ok' };
}

async function listar(admin: any, caller: any) {
  const executadas = await processarPrazosVencidos(admin, { trainerId: caller.id }).catch((e) => { console.error('prazos:', e); return [] as string[]; });
  const { data, error } = await admin.from('transferencias_vinculo').select('*')
    .or(`trainer_atual_id.eq.${caller.id},trainer_novo_id.eq.${caller.id}`)
    .in('status', ['aguardando_aluno', 'pendente']).order('criado_em', { ascending: false }).limit(200);
  if (error) throw error;
  const nomes = new Map<string, string>();
  const nome = async (id: string) => { if (!nomes.has(id)) nomes.set(id, await nomeDoPersonal(admin, id)); return nomes.get(id)!; };
  const saindo: any[] = [], chegando: any[] = [];
  for (const t of (data || []) as Transferencia[]) {
    const snap: any = t.snapshot || {};
    const base = {
      id: t.id, status: t.status, iniciadoPor: t.iniciado_por, criadoEm: t.criado_em, prazoEm: t.prazo_em,
      studentId: t.student_id, rascunhoId: snap.draftStudentId ?? null, nomeAluno: snap.nome || '', cpfMascarado: snap.cpfMascarado || '',
      whatsapp: snap.whatsapp || '', email: snap.email || '', nascimento: snap.nascimento || '', sexo: snap.sexo || '', profissao: snap.profissao || '',
      aceiteNovoEm: (t as any).aceite_novo_em || null, alunoTemConta: !!t.aluno_user_id,
    };
    if (t.trainer_atual_id === caller.id) saindo.push({ ...base, outroNome: await nome(t.trainer_novo_id) });
    else chegando.push({ ...base, outroNome: await nome(t.trainer_atual_id) });
  }
  return { status: 'ok', saindo, chegando, executadas: executadas.length };
}

// ── E-mail de login do aluno (trocado pelo personal) ────────────────────────

async function alterarEmailAluno(admin: any, caller: any, studentIdBruto: unknown, novoEmailBruto: unknown) {
  const studentId = Number(studentIdBruto);
  const novo = normalizaEmail(novoEmailBruto);
  if (!Number.isFinite(studentId)) throw new ErroUsuario('Aluno inválido.');
  if (!novo || novo.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(novo)) throw new ErroUsuario('E-mail inválido.');

  const { students } = await loadStudents(admin, caller.id);
  const s = students.find((x: any) => x?.id === studentId);
  if (!s) throw new ErroUsuario('Aluno não encontrado na sua lista.');
  if (await pedidoAbertoDoStudent(admin, caller.id, studentId)) throw new ErroUsuario('Há uma transferência em andamento: o cadastro está só pra visualização.');
  const contaId: string | null = s.perfil?.alunoUserId || null;
  if (!contaId) throw new ErroUsuario('Esse aluno ainda não tem acesso. Basta editar o e-mail no Perfil.');

  const { data: acesso } = await admin.from('alunos_acesso').select('trainer_user_id').eq('aluno_user_id', contaId).maybeSingle();
  if (!acesso || acesso.trainer_user_id !== caller.id) throw new ErroUsuario('Esse aluno não é seu.');

  const { error } = await admin.auth.admin.updateUserById(contaId, { email: novo, email_confirm: true });
  if (error) {
    if (/already|registered|exists|duplicate/i.test(error.message || '')) return { status: 'email-em-uso' };
    throw error;
  }
  await admin.from('alunos_identidade').update({ email_norm: novo, atualizado_em: new Date().toISOString() }).eq('aluno_user_id', contaId);
  s.perfil.email = novo;
  await saveStudents(admin, caller.id, students);
  return { status: 'ok' };
}

// ── Senha ───────────────────────────────────────────────────────────────────

async function acharUsuarioPorEmail(admin: any, email: string): Promise<any | null> {
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

async function ehContaDePersonal(admin: any, userId: string): Promise<boolean> {
  const { data, error } = await admin.from('app_data').select('key').eq('user_id', userId).limit(1);
  if (error) throw error;
  return !!(data && data.length);
}

// Cria (se não existir) ou reseta a senha do usuário desse e-mail e garante que
// ele fica vinculado a ESTE personal. Nunca mexe em conta de outro personal.
async function definirSenha(admin: any, caller: any, email: string, novaSenha: string) {
  email = normalizaEmail(email);
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ErroUsuario('E-mail inválido.');
  if (typeof novaSenha !== 'string' || novaSenha.length < 6 || novaSenha.length > 72) throw new ErroUsuario('A senha precisa ter entre 6 e 72 caracteres.');

  const { students } = await loadStudents(admin, caller.id);
  const aluno = students.find((s: any) => normalizaEmail(s?.perfil?.email) === email);
  if (!aluno) throw new ErroUsuario('Esse e-mail não está no cadastro de nenhum aluno seu. Salve o Perfil do aluno primeiro.');
  if (await pedidoAbertoDoStudent(admin, caller.id, aluno.id)) throw new ErroUsuario('Há uma transferência em andamento: o cadastro está só pra visualização.');

  const existente = await acharUsuarioPorEmail(admin, email);
  let alunoUserId: string;

  if (existente) {
    alunoUserId = existente.id;
    if (alunoUserId === caller.id) throw new ErroUsuario('Esse e-mail é o da sua própria conta.');
    const { data: acesso } = await admin.from('alunos_acesso').select('trainer_user_id').eq('aluno_user_id', alunoUserId).maybeSingle();
    if (acesso && acesso.trainer_user_id !== caller.id) throw new ErroUsuario('Esse e-mail já é de um aluno de outro personal.');
    if (!acesso && await ehContaDePersonal(admin, alunoUserId)) throw new ErroUsuario('Esse e-mail pertence a outra conta de personal.');
    const { error: eSenha } = await admin.auth.admin.updateUserById(alunoUserId, { password: novaSenha });
    if (eSenha) throw eSenha;
    if (!acesso) {
      const { error: eIns } = await admin.from('alunos_acesso').insert({ trainer_user_id: caller.id, aluno_user_id: alunoUserId, status: 'ativo' });
      if (eIns) throw eIns;
    }
  } else {
    const { data: criado, error: eCriar } = await admin.auth.admin.createUser({ email, password: novaSenha, email_confirm: true });
    if (eCriar) throw eCriar;
    alunoUserId = criado.user.id;
    const { error: eIns } = await admin.from('alunos_acesso').insert({ trainer_user_id: caller.id, aluno_user_id: alunoUserId, status: 'ativo' });
    if (eIns) throw eIns;
  }

  await garantirStudentNoBlob(admin, caller.id, { id: alunoUserId, email, user_metadata: {} }, false, true);
  // Se o aluno já está no índice (CPF registrado), a conta passa a constar nele.
  if (aluno.perfil?.identidadeId) {
    await admin.from('alunos_identidade').update({ aluno_user_id: alunoUserId, email_norm: email, atualizado_em: new Date().toISOString() })
      .eq('id', aluno.perfil.identidadeId).is('aluno_user_id', null);
  }
  return { status: 'ok', alunoUserId };
}

async function definirNome(admin: any, caller: any, nomeBruto: unknown) {
  const nome = limpaTexto(nomeBruto, 80);
  if (!nome) throw new ErroUsuario('Informe um nome.');
  const { data } = await admin.from('personal_links').select('trainer_user_id').eq('trainer_user_id', caller.id).maybeSingle();
  if (data) {
    const { error } = await admin.from('personal_links').update({ nome_exibicao: nome }).eq('trainer_user_id', caller.id);
    if (error) throw error;
  } else {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const buf = new Uint32Array(12); crypto.getRandomValues(buf);
    const codigo = Array.from(buf, (n) => chars[n % chars.length]).join('');
    const { error } = await admin.from('personal_links').insert({ trainer_user_id: caller.id, codigo, nome_exibicao: nome });
    if (error) throw error;
  }
  return { status: 'ok' };
}
