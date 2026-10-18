// ══════════════════════════════════════════════════════════════════════════
// aluno-api — escreve direto no aluno de verdade (students[] do trainer)
// ══════════════════════════════════════════════════════════════════════════
// Chamada pelo app do aluno (aluno/js/aluno-app.js) com o JWT do próprio
// aluno. Roda com a service_role key (só aqui, nunca no cliente) porque
// students[] é um blob por trainer protegido por RLS que o aluno (conta
// Supabase separada) não teria permissão de tocar direto.
//
// VÍNCULO (Fase 4.1, 05/10/2026): o aluno é reconhecido por NOME + CPF + E-MAIL
// (regras em _shared/vinculo.ts). O link do personal (?c=CODIGO) só diz PARA QUEM
// ele quer se cadastrar; quem decide é o CPF. Nada de vínculo automático por e-mail.
//
// SEGURANÇA: o aluno é fonte não confiável. Tudo que ele manda é tipado/limitado
// (limpaTexto/limpaNumero) antes de ir pro blob do trainer; o código do link é
// resolvido aqui com service_role; o caminho de foto precisa estar na pasta dele.
import { corsHeaders } from '../_shared/cors.ts';
import { senhaAtualConfere } from '../_shared/contas.ts';
import {
  getAdminClient, getCallerUser, novoId, criadorDeIds, loadStudents, saveStudents,
  findStudentByAlunoUserId, jsonResponse,
  calcularNivelTreino, limpaTexto, limpaNumero, limpaDataISO, UUID_RE,
} from '../_shared/students.ts';
import {
  decidirCadastro, normalizaEmail, normalizaNome, novaTransferencia, soDigitos,
  type Decisao, type Identidade, type Transferencia, hashCpf,
} from '../_shared/vinculo.ts';
import {
  pepperCpf, depsDecisao, nomeDoPersonal, transferenciaAbertaDoAluno,
  transferenciaAbertaDaIdentidade, processarPrazosVencidos, aplicarCadastro, snapshotCadastro,
  pendenteAbertoDoAluno, legadosRecusadosDaConta, registrarPendente,
} from '../_shared/vinculo-db.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = getAdminClient();
  const caller = await getCallerUser(admin, req);
  if (!caller) return jsonResponse({ error: 'Não autenticado.' }, 401, corsHeaders);

  let body: any = {};
  try { body = await req.json(); } catch { /* corpo vazio é válido pra algumas ações */ }
  const acao = body?.acao;
  const codigo = typeof body.codigo === 'string' ? body.codigo : null;

  try {
    if (acao === 'resolver-vinculo') return jsonResponse(await resolverVinculo(admin, caller, codigo), 200, corsHeaders);
    if (acao === 'dados-pessoais') return jsonResponse(await gravarDadosPessoais(admin, caller, body.dados || {}), 200, corsHeaders);
    if (acao === 'cadastro') return jsonResponse(await gravarCadastro(admin, caller, body.perfil || {}, codigo), 200, corsHeaders);
    if (acao === 'solicitar-troca') return jsonResponse(await solicitarTroca(admin, caller, body.perfil || {}, codigo), 200, corsHeaders);
    if (acao === 'confirmar-troca') return jsonResponse(await confirmarTroca(admin, caller), 200, corsHeaders);
    if (acao === 'cancelar-troca') return jsonResponse(await cancelarTroca(admin, caller), 200, corsHeaders);
    if (acao === 'status-vinculo') return jsonResponse(await statusVinculo(admin, caller), 200, corsHeaders);
    if (acao === 'alterar-email') return jsonResponse(await alterarEmail(admin, caller, body), 200, corsHeaders);
    if (acao === 'alterar-senha') return jsonResponse(await alterarSenha(admin, caller, body), 200, corsHeaders);
    if (acao === 'trocar-senha-obrigatoria') return jsonResponse(await trocarSenhaObrigatoria(admin, caller, body.novaSenha), 200, corsHeaders);
    if (acao === 'cancelar-cadastro') return jsonResponse(await cancelarCadastro(admin, caller), 200, corsHeaders);
    if (acao === 'anamnese') return jsonResponse(await gravarAnamnese(admin, caller, body.anamnese || {}), 200, corsHeaders);
    if (acao === 'avaliacao') return jsonResponse(await gravarAvaliacao(admin, caller, body.medidas || {}, Array.isArray(body.fotos) ? body.fotos : []), 200, corsHeaders);
    return jsonResponse({ error: 'Ação desconhecida.' }, 400, corsHeaders);
  } catch (e) {
    // Detalhe só no log da função; o cliente recebe mensagem genérica.
    console.error('aluno-api erro:', e);
    const msg = e instanceof ErroUsuario ? e.message : 'Não foi possível concluir. Tente de novo em instantes.';
    return jsonResponse({ error: msg }, e instanceof ErroUsuario ? 400 : 500, corsHeaders);
  }
});

class ErroUsuario extends Error {}

// ── Utilidades ──────────────────────────────────────────────────────────────

async function trainerPorCodigo(admin: any, codigo: string): Promise<string | null> {
  const c = (codigo || '').trim();
  if (!/^[A-Za-z0-9]{6,32}$/.test(c)) return null;
  const { data, error } = await admin.from('personal_links').select('trainer_user_id').eq('codigo', c).maybeSingle();
  if (error) throw error;
  return data?.trainer_user_id || null;
}

async function acessoDoAluno(admin: any, alunoUserId: string) {
  const { data, error } = await admin.from('alunos_acesso').select('*').eq('aluno_user_id', alunoUserId).maybeSingle();
  if (error) throw error;
  return data || null;
}

async function identidadeDaConta(admin: any, alunoUserId: string) {
  const { data, error } = await admin.from('alunos_identidade').select('id').eq('aluno_user_id', alunoUserId).maybeSingle();
  if (error) throw error;
  return data || null;
}

// Cadastro vindo do app: tudo tipado e limitado.
function limparPerfil(p: any) {
  p = (p && typeof p === 'object') ? p : {};
  const zap = typeof p.whatsapp === 'string' ? p.whatsapp.replace(/[^\d()+\-\s]/g, '').slice(0, 25) : '';
  return {
    nome: limpaTexto(p.nome, 120),
    cpf: soDigitos(p.cpf).slice(0, 11),
    nascimento: limpaDataISO(p.nascimento),
    sexo: p.sexo === 'M' || p.sexo === 'F' ? p.sexo : '',
    whatsapp: zap,
    profissao: limpaTexto(p.profissao, 120),
  };
}

// Dados pessoais que liberam o app: nascimento, sexo e WhatsApp (profissão é opcional).
function dadosPessoaisDe(s: any) {
  const p = s?.perfil || {};
  return {
    nascimento: typeof p.nascimento === 'string' ? p.nascimento : '',
    sexo: p.sexo === 'M' || p.sexo === 'F' ? p.sexo : '',
    whatsapp: typeof p.whatsapp === 'string' ? p.whatsapp : '',
    profissao: typeof p.profissao === 'string' ? p.profissao : '',
  };
}
function dadosPessoaisCompletos(d: { nascimento: string; sexo: string; whatsapp: string }) {
  return !!(d.nascimento && d.sexo && d.whatsapp.replace(/\D/g, '').length >= 10);
}

// O próprio aluno completa os dados pessoais (sem redigitar o CPF).
async function gravarDadosPessoais(admin: any, caller: any, bruto: any) {
  const trainerId = await _trainerDoAluno(admin, caller.id);
  const p = limparPerfil(bruto);
  if (!p.nascimento) throw new ErroUsuario('Informe uma data de nascimento válida.');
  if (!p.sexo) throw new ErroUsuario('Informe o sexo.');
  if (p.whatsapp.replace(/\D/g, '').length < 10) throw new ErroUsuario('Informe um WhatsApp válido, com DDD.');
  const { students } = await loadStudents(admin, trainerId);
  const s = findStudentByAlunoUserId(students, caller.id);
  if (!s) throw new ErroUsuario('Seu cadastro não foi encontrado. Fale com seu personal.');
  s.perfil.nascimento = p.nascimento; s.perfil.sexo = p.sexo;
  s.perfil.whatsapp = p.whatsapp; s.perfil.profissao = p.profissao;
  await saveStudents(admin, trainerId, students);
  const dp = dadosPessoaisDe(s);
  return { status: 'ok', dadosPessoais: dp, dadosCompletos: dadosPessoaisCompletos(dp) };
}

// Registro do aluno nesta conta (se existir em algum personal que já a vinculou).
async function studentDaConta(admin: any, alunoUserId: string, trainerId: string | null) {
  if (!trainerId) return null;
  const { students } = await loadStudents(admin, trainerId);
  const s = findStudentByAlunoUserId(students, alunoUserId);
  return s ? { trainerId, studentId: s.id as number } : null;
}

async function decidir(admin: any, caller: any, perfil: ReturnType<typeof limparPerfil>, trainerAlvo: string, trainerDoAcesso: string | null): Promise<Decisao> {
  return decidirCadastro(
    { ator: 'aluno', cpf: perfil.cpf, nome: perfil.nome, email: caller.email, trainerAlvo, contaId: caller.id },
    depsDecisao(admin, () => studentDaConta(admin, caller.id, trainerDoAcesso), () => legadosRecusadosDaConta(admin, caller.id)),
    pepperCpf(),
  );
}

async function inserirAcesso(admin: any, trainerId: string, alunoUserId: string) {
  const { error } = await admin.from('alunos_acesso').insert({ trainer_user_id: trainerId, aluno_user_id: alunoUserId, status: 'ativo' });
  if (error && (error as any).code !== '23505') throw error;   // 23505 = já existe (corrida)
}

async function criarIdentidade(admin: any, p: { hash: string; nome: string; email: string; trainerId: string; alunoUserId: string | null; studentId: number | null }): Promise<Identidade> {
  const { data, error } = await admin.from('alunos_identidade').insert({
    cpf_hash: p.hash, nome_norm: normalizaNome(p.nome), email_norm: normalizaEmail(p.email),
    trainer_user_id: p.trainerId, aluno_user_id: p.alunoUserId, student_id: p.studentId,
  }).select('*').single();
  if (error) throw error;
  return data as Identidade;
}

async function registrarRastro(admin: any, trainerId: string, alunoId: string, tipo: string, dados: any) {
  const { error } = await admin.from('avaliacoes_pendentes').insert({
    trainer_user_id: trainerId, aluno_user_id: alunoId, tipo, status: 'aplicado', dados,
  });
  if (error) console.error('Falha ao registrar rastro (' + tipo + '):', error);
}

function infoTransferencia(t: Transferencia | null, nomeNovo: string, nomeAtual: string) {
  if (!t) return null;
  return {
    id: t.id, status: t.status, iniciadoPor: t.iniciado_por, criadoEm: t.criado_em,
    prazoEm: t.prazo_em, paraNome: nomeNovo, deNome: nomeAtual,
  };
}

// ── Vínculo no login ─────────────────────────────────────────────────────────

async function resolverVinculo(admin: any, caller: any, codigo: string | null) {
  await processarPrazosVencidos(admin, { alunoUserId: caller.id }).catch((e) => console.error('prazos:', e));

  const acesso = await acessoDoAluno(admin, caller.id);
  if (!acesso) {
    // Pediu acesso como aluno antigo e o personal ainda não respondeu.
    const pend = await pendenteAbertoDoAluno(admin, caller.id);
    if (pend) return { status: 'aguardando-aprovacao', personalNome: await nomeDoPersonal(admin, pend.trainer_user_id) };
    if (!codigo) return { status: 'desconhecido' };
    const alvo = await trainerPorCodigo(admin, codigo);
    if (!alvo) return { status: 'codigo-invalido' };
    // Ainda sem vínculo: o app pede nome + CPF (a ação 'cadastro' é quem vincula).
    return { status: 'precisa-cadastro', personalNome: await nomeDoPersonal(admin, alvo) };
  }
  if (acesso.status === 'bloqueado') return { status: 'bloqueado' };

  const { students } = await loadStudents(admin, acesso.trainer_user_id);
  const s = findStudentByAlunoUserId(students, caller.id);
  // Cadastro (nome + CPF) é o que vincula; dados pessoais completos só liberam as abas do app.
  const completo = soDigitos(s?.perfil?.cpf).length === 11;
  const dp = dadosPessoaisDe(s);
  // Entrou pelo link de OUTRO personal: o app reabre o cadastro, e a ação 'cadastro' decide
  // (CPF já vinculado ao personal atual => oferece pedir transferência).
  const trainerLink = codigo ? await trainerPorCodigo(admin, codigo) : null;
  const outro = trainerLink && trainerLink !== acesso.trainer_user_id;
  return {
    status: 'ok', trainerId: acesso.trainer_user_id, cadastroCompleto: completo,
    dadosPessoais: dp, dadosCompletos: dadosPessoaisCompletos(dp),
    nome: s?.perfil?.nome || '', personalNome: await nomeDoPersonal(admin, acesso.trainer_user_id),
    cpfRegistrado: soDigitos(s?.perfil?.cpf).length === 11,
    ...(outro ? { outroPersonalNome: await nomeDoPersonal(admin, trainerLink) } : {}),
  };
}

// ── Cadastro (nome + CPF + e-mail) ──────────────────────────────────────────

async function gravarCadastro(admin: any, caller: any, perfilBruto: any, codigo: string | null) {
  const perfil = limparPerfil(perfilBruto);
  if (!perfil.nome) throw new ErroUsuario('Informe seu nome completo.');

  const acesso = await acessoDoAluno(admin, caller.id);
  if (acesso?.status === 'bloqueado') return { status: 'bloqueado' };
  const trainerLink = codigo ? await trainerPorCodigo(admin, codigo) : null;
  if (codigo && !trainerLink) return { status: 'codigo-invalido' };
  let trainerAlvo = trainerLink || acesso?.trainer_user_id || null;
  // Conta antiga (liberada pelo personal, ainda sem identidade): completa o cadastro com o
  // personal ATUAL antes de qualquer pedido de troca.
  if (acesso && trainerLink && trainerLink !== acesso.trainer_user_id && !(await identidadeDaConta(admin, caller.id))) trainerAlvo = acesso.trainer_user_id;
  if (!trainerAlvo) return { status: 'desconhecido' };

  const d = await decidir(admin, caller, perfil, trainerAlvo, acesso?.trainer_user_id || null);
  return aplicarDecisao(admin, caller, perfil, trainerAlvo, d);
}

async function aplicarDecisao(admin: any, caller: any, perfil: ReturnType<typeof limparPerfil>, trainerAlvo: string, d: Decisao) {
  switch (d.tipo) {
    case 'cpf-invalido': return { status: 'cpf-invalido' };
    case 'cpf-nao-confere': return { status: 'cpf-nao-confere' };
    case 'divergencia': return { status: 'divergencia' };
    case 'email-diferente': return { status: 'email-diferente', emailMascarado: d.emailMascarado };
    case 'duplicado-no-personal': return { status: 'divergencia' };

    case 'conflito': {
      const aberta = await transferenciaAbertaDaIdentidade(admin, d.identidade.id);
      return {
        status: 'conflito', personalNome: await nomeDoPersonal(admin, d.identidade.trainer_user_id),
        jaHaPedido: !!aberta, pedidoParaOutro: !!aberta && aberta.trainer_novo_id !== trainerAlvo,
      };
    }

    case 'novo': {
      const ident = await criarIdentidade(admin, { hash: d.hash, nome: perfil.nome, email: caller.email, trainerId: trainerAlvo, alunoUserId: caller.id, studentId: null });
      const { students, todosIds } = await loadStudents(admin, trainerAlvo);
      const s = { id: novoId(todosIds), perfil: {} as any, anamnese: {}, treinos: [], avaliacoesAntro: [], reavaliacao: null };
      aplicarCadastro(s, { ...perfil, email: caller.email, alunoUserId: caller.id, identidadeId: ident.id });
      s.perfil.novoCadastro = true;
      students.push(s);
      await saveStudents(admin, trainerAlvo, students);
      await admin.from('alunos_identidade').update({ student_id: s.id }).eq('id', ident.id);
      await inserirAcesso(admin, trainerAlvo, caller.id);
      await registrarRastro(admin, trainerAlvo, caller.id, 'cadastro_inicial', { perfil: { ...perfil, cpf: undefined } });
      return { status: 'ok', tipo: 'novo' };
    }

    case 'legado': {
      // Aluno antigo do personal (sem CPF) que bate em nome + e-mail. O e-mail não é confirmado:
      // NADA é ligado nem sobrescrito aqui. Vira um pedido que o personal aprova no painel
      // (trainer-transferencia, ação 'responder-pendente').
      await registrarPendente(admin, { trainerId: trainerAlvo, studentId: d.studentId, alunoUserId: caller.id, email: caller.email, perfil });
      return { status: 'aguardando-aprovacao', personalNome: await nomeDoPersonal(admin, trainerAlvo) };
    }

    case 'vincular-conta': {
      // Cadastro manual do personal, sem conta ainda: a conta passa a ser dele.
      const ident = d.identidade;
      const { students, todosIds } = await loadStudents(admin, trainerAlvo);
      let s = students.find((x: any) => x.id === ident.student_id) || findStudentByAlunoUserId(students, caller.id);
      if (!s) { s = { id: novoId(todosIds), perfil: {}, anamnese: {}, treinos: [], avaliacoesAntro: [], reavaliacao: null }; students.push(s); }
      aplicarCadastro(s, { ...perfil, email: caller.email, alunoUserId: caller.id, identidadeId: ident.id });
      s.perfil.novoCadastro = true;   // "acesso novo": o personal vê o aviso na lista
      await saveStudents(admin, trainerAlvo, students);
      await admin.from('alunos_identidade').update({ aluno_user_id: caller.id, email_norm: normalizaEmail(caller.email), student_id: s.id, atualizado_em: new Date().toISOString() }).eq('id', ident.id);
      await inserirAcesso(admin, trainerAlvo, caller.id);
      await registrarRastro(admin, trainerAlvo, caller.id, 'cadastro_inicial', { perfil: { ...perfil, cpf: undefined } });
      return { status: 'ok', tipo: 'atualizado' };
    }

    case 'atualizar': {
      const ident = d.identidade;
      const { students, todosIds } = await loadStudents(admin, trainerAlvo);
      let s = students.find((x: any) => x.id === ident.student_id) || findStudentByAlunoUserId(students, caller.id);
      if (!s) { s = { id: novoId(todosIds), perfil: {}, anamnese: {}, treinos: [], avaliacoesAntro: [], reavaliacao: null }; students.push(s); }
      aplicarCadastro(s, { ...perfil, email: caller.email, alunoUserId: caller.id, identidadeId: ident.id });
      await saveStudents(admin, trainerAlvo, students);
      await admin.from('alunos_identidade').update({ nome_norm: normalizaNome(perfil.nome), student_id: s.id, atualizado_em: new Date().toISOString() }).eq('id', ident.id);
      await inserirAcesso(admin, trainerAlvo, caller.id);
      await registrarRastro(admin, trainerAlvo, caller.id, 'cadastro_inicial', { perfil: { ...perfil, cpf: undefined } });
      return { status: 'ok', tipo: 'atualizado' };
    }
  }
}

// ── Troca de personal ────────────────────────────────────────────────────────

// O aluno viu a tela de conflito e escolheu "Solicitar troca". Reaplica a mesma
// decisão no servidor (não confia no que o app diz) e só segue se for conflito.
async function solicitarTroca(admin: any, caller: any, perfilBruto: any, codigo: string | null) {
  const perfil = limparPerfil(perfilBruto);
  if (!perfil.nome) throw new ErroUsuario('Informe seu nome completo.');
  let trainerNovo = codigo ? await trainerPorCodigo(admin, codigo) : null;
  if (!trainerNovo) return { status: 'codigo-invalido' };
  const acesso = await acessoDoAluno(admin, caller.id);
  if (acesso && trainerNovo !== acesso.trainer_user_id && !(await identidadeDaConta(admin, caller.id))) trainerNovo = acesso.trainer_user_id;

  const d = await decidir(admin, caller, perfil, trainerNovo, acesso?.trainer_user_id || null);
  if (d.tipo !== 'conflito') return aplicarDecisao(admin, caller, perfil, trainerNovo, d);
  const ident = d.identidade;
  const trainerAtual = ident.trainer_user_id;

  const aberta = await transferenciaAbertaDaIdentidade(admin, ident.id);
  if (aberta && aberta.trainer_novo_id !== trainerNovo) {
    return { status: 'ja-ha-pedido', paraNome: await nomeDoPersonal(admin, aberta.trainer_novo_id) };
  }

  // Salva o cadastro NA HORA, no registro que ele já tem com o personal atual
  // (o personal atual fica só visualizando até acabar). O acesso continua normal.
  const { students, todosIds } = await loadStudents(admin, trainerAtual);
  let s = students.find((x: any) => x.id === ident.student_id) || findStudentByAlunoUserId(students, caller.id);
  if (!s) { s = { id: novoId(todosIds), perfil: {}, anamnese: {}, treinos: [], avaliacoesAntro: [], reavaliacao: null }; students.push(s); }
  aplicarCadastro(s, { ...perfil, email: caller.email, alunoUserId: caller.id, identidadeId: ident.id });
  await saveStudents(admin, trainerAtual, students);
  await inserirAcesso(admin, trainerAtual, caller.id);
  await admin.from('alunos_identidade').update({ aluno_user_id: caller.id, email_norm: normalizaEmail(caller.email), student_id: s.id, atualizado_em: new Date().toISOString() }).eq('id', ident.id);
  const identAtual: Identidade = { ...ident, student_id: s.id, aluno_user_id: caller.id };

  let t: Transferencia;
  if (aberta) {
    // Pedido do personal novo esperando o aluno: confirmar começa os 30 dias.
    // Já confirmado antes (clique repetido, tentativa de novo): devolve o mesmo pedido sem mexer no prazo.
    t = aberta.status === 'aguardando_aluno' ? await confirmarAberta(admin, aberta) : aberta;
  } else {
    const nova = novaTransferencia({
      identidade: identAtual, trainerNovo, iniciadoPor: 'aluno', alunoUserId: caller.id,
      snapshot: snapshotCadastro({ ...perfil, email: caller.email }),
    });
    const { data, error } = await admin.from('transferencias_vinculo').insert(nova).select('*').single();
    if (error) throw error;
    t = data as Transferencia;
  }
  await registrarRastro(admin, trainerAtual, caller.id, 'cadastro_inicial', { perfil: { ...perfil, cpf: undefined }, troca: t.id });
  return {
    status: 'troca-solicitada', prazoEm: t.prazo_em,
    deNome: await nomeDoPersonal(admin, trainerAtual), paraNome: await nomeDoPersonal(admin, trainerNovo),
  };
}

async function confirmarAberta(admin: any, t: Transferencia): Promise<Transferencia> {
  const agora = new Date();
  const prazo = new Date(agora.getTime() + 30 * 86400000).toISOString();
  const { data, error } = await admin.from('transferencias_vinculo')
    .update({ status: 'pendente', confirmado_aluno_em: agora.toISOString(), prazo_em: prazo, aluno_user_id: t.aluno_user_id })
    .eq('id', t.id).eq('status', 'aguardando_aluno').select('*').single();
  if (error) throw error;
  return data as Transferencia;
}

// Pedido que o personal NOVO abriu no cadastro manual: o aluno confirma no portal.
async function confirmarTroca(admin: any, caller: any) {
  const t = await transferenciaAbertaDoAluno(admin, caller.id);
  if (!t || t.status !== 'aguardando_aluno') throw new ErroUsuario('Não há pedido esperando a sua confirmação.');
  const ok = await confirmarAberta(admin, { ...t, aluno_user_id: caller.id });
  return { status: 'ok', prazoEm: ok.prazo_em };
}

async function cancelarTroca(admin: any, caller: any) {
  const t = await transferenciaAbertaDoAluno(admin, caller.id);
  if (!t) throw new ErroUsuario('Não há pedido de troca em andamento.');
  const { error } = await admin.from('transferencias_vinculo')
    .update({ status: 'cancelada', motivo_fim: 'cancelada_aluno', concluida_em: new Date().toISOString() }).eq('id', t.id);
  if (error) throw error;
  return { status: 'ok' };
}

async function statusVinculo(admin: any, caller: any) {
  await processarPrazosVencidos(admin, { alunoUserId: caller.id }).catch((e) => console.error('prazos:', e));
  const acesso = await acessoDoAluno(admin, caller.id);
  if (!acesso) return { status: 'sem-vinculo' };
  const t = await transferenciaAbertaDoAluno(admin, caller.id);
  const atual = await nomeDoPersonal(admin, acesso.trainer_user_id);
  return {
    status: 'ok', personalNome: atual,
    transferencia: t ? infoTransferencia(t, await nomeDoPersonal(admin, t.trainer_novo_id), await nomeDoPersonal(admin, t.trainer_atual_id)) : null,
  };
}

// ── E-mail de login: o único dado que muda, e só pelo próprio aluno logado ──

// Exige o e-mail atual E a senha atual (não há confirmação por e-mail: sem isto, quem pegasse o
// celular desbloqueado trocaria o login). Quem pede é sempre o dono da conta logada.
async function alterarEmail(admin: any, caller: any, b: any) {
  const novo = normalizaEmail(b?.novoEmail);
  if (!novo || novo.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(novo)) throw new ErroUsuario('E-mail inválido.');
  if (normalizaEmail(b?.emailAtual) !== normalizaEmail(caller.email)) return { status: 'email-atual-nao-confere' };
  if (!(await senhaAtualConfere(caller.email, b?.senhaAtual))) return { status: 'senha-incorreta' };
  if (novo === normalizaEmail(caller.email)) throw new ErroUsuario('O novo e-mail é igual ao atual.');

  const { error } = await admin.auth.admin.updateUserById(caller.id, { email: novo, email_confirm: true });
  if (error) {
    if (/already|registered|exists|duplicate/i.test(error.message || '')) return { status: 'email-em-uso' };
    throw error;
  }
  const acesso = await acessoDoAluno(admin, caller.id);
  await admin.from('alunos_identidade').update({ email_norm: novo, atualizado_em: new Date().toISOString() }).eq('aluno_user_id', caller.id);
  if (acesso) {
    const { students } = await loadStudents(admin, acesso.trainer_user_id);
    const s = findStudentByAlunoUserId(students, caller.id);
    if (s) { s.perfil.email = novo; await saveStudents(admin, acesso.trainer_user_id, students); }
  }
  return { status: 'ok' };
}

// ── Senha: troca pelo aluno (senha atual + nova) e troca obrigatória após redefinição ──

function validaSenhaNova(v: unknown): string {
  if (typeof v !== 'string' || v.length < 6 || v.length > 72) throw new ErroUsuario('A nova senha precisa ter entre 6 e 72 caracteres.');
  return v;
}

async function alterarSenha(admin: any, caller: any, b: any) {
  const nova = validaSenhaNova(b?.novaSenha);
  if (!(await senhaAtualConfere(caller.email, b?.senhaAtual))) return { status: 'senha-incorreta' };
  if (nova === b.senhaAtual) throw new ErroUsuario('A nova senha precisa ser diferente da atual.');
  const { error } = await admin.auth.admin.updateUserById(caller.id, { password: nova, app_metadata: { ...(caller.app_metadata || {}), trocar_senha: false } });
  if (error) throw error;
  return { status: 'ok' };
}

// Depois que o personal redefine a senha, a conta fica com trocar_senha=true: o aluno entra com a
// senha temporária e só passa daí criando a própria (sem pedir a temporária de novo: ele acabou de usá-la).
async function trocarSenhaObrigatoria(admin: any, caller: any, novaSenha: unknown) {
  if (caller.app_metadata?.trocar_senha !== true) throw new ErroUsuario('Não há troca de senha pendente.');
  const nova = validaSenhaNova(novaSenha);
  const { error } = await admin.auth.admin.updateUserById(caller.id, { password: nova, app_metadata: { ...(caller.app_metadata || {}), trocar_senha: false } });
  if (error) throw error;
  return { status: 'ok' };
}

// Desistiu de tudo: só apaga a conta se ela ainda não tem vínculo nem identidade.
async function cancelarCadastro(admin: any, caller: any) {
  if (await acessoDoAluno(admin, caller.id)) throw new ErroUsuario('Sua conta já está vinculada. Fale com seu personal.');
  const { data } = await admin.from('alunos_identidade').select('id').eq('aluno_user_id', caller.id).maybeSingle();
  if (data) throw new ErroUsuario('Sua conta já está vinculada. Fale com seu personal.');
  const { error } = await admin.auth.admin.deleteUser(caller.id);
  if (error) throw error;
  return { status: 'ok' };
}

// ── Anamnese (reenviável, edita o mesmo registro) ───────────────────────────

async function _trainerDoAluno(admin: any, alunoUserId: string): Promise<string> {
  const acesso = await acessoDoAluno(admin, alunoUserId);
  if (!acesso || acesso.status === 'bloqueado') throw new ErroUsuario('Aluno sem vínculo ativo.');
  return acesso.trainer_user_id;
}

const CAMPOS_ANAMNESE = [
  'sintomas', 'gestacao',
  'lesoes_passadas', 'cirurgias',              // Observações clínicas
  'tempo', 'consistencia',                     // → nível calculado
  'objetivo_ef', 'objetivo_sec', 'frequencia', 'duracao', 'horario',
  'gosta_texto', 'evitar_texto',               // texto livre, só leitura do personal
];
const CAMPOS_SAUDE_PERFIL = [
  'liberacao', 'condicoes', 'medicamentos', 'lesoes',
  'medicamentos_detalhe', 'obs_clinicas',      // Observações clínicas
];
// Campos de s.anamnese que cada registro do histórico guarda (mesma lista de ANAM_CHAVES em js/historico.js)
const CHAVES_REGISTRO_ANAMNESE = [
  'tempo', 'consistencia', 'nivel', 'objetivo_ef', 'objetivo_sec', 'frequencia', 'duracao', 'horario', 'local', 'local_info',
  'gosta', 'preferencias', 'gosta_ex', 'evitar_ex', 'sintomas', 'gestacao', 'trimestre', 'lesoes_passadas', 'cirurgias', 'gosta_texto', 'evitar_texto',
];
const CAMPOS_TEXTO_LONGO = new Set(['lesoes_passadas', 'cirurgias', 'gosta_texto', 'evitar_texto', 'medicamentos_detalhe', 'obs_clinicas']);

async function gravarAnamnese(admin: any, caller: any, anamnese: any) {
  const trainerId = await _trainerDoAluno(admin, caller.id);
  const { students, todosIds } = await loadStudents(admin, trainerId);
  let s = findStudentByAlunoUserId(students, caller.id);
  if (!s) {
    s = { id: novoId(todosIds), perfil: { email: caller.email, alunoUserId: caller.id, portalStatus: 'ativo' }, anamnese: {}, treinos: [], avaliacoesAntro: [], reavaliacao: null };
    students.push(s);
  }
  const a = (anamnese && typeof anamnese === 'object') ? anamnese : {};
  const limpoTudo: Record<string, string> = {};
  const lim = (k: string) => limpaTexto(a[k], CAMPOS_TEXTO_LONGO.has(k) ? 1500 : 300);
  for (const k of CAMPOS_ANAMNESE) if (k in a) { limpoTudo[k] = lim(k); s.anamnese[k] = limpoTudo[k]; }
  for (const k of CAMPOS_SAUDE_PERFIL) if (k in a) { limpoTudo[k] = lim(k); s.perfil[k] = limpoTudo[k]; }
  const nivel = calcularNivelTreino(s.anamnese.tempo, s.anamnese.consistencia);
  if (nivel && !s.anamnese.nivel_manual) s.anamnese.nivel = nivel;
  if (typeof a.local_aluno_id === 'string' && UUID_RE.test(a.local_aluno_id)) {
    const { data: loc } = await admin.from('locais_treino').select('id,nome,equipamentos,trainer_user_id').eq('id', a.local_aluno_id).maybeSingle();
    if (loc && loc.trainer_user_id === trainerId) {
      s.anamnese.local = 'aluno:' + loc.id;
      s.anamnese.local_info = {
        nome: limpaTexto(loc.nome, 120) || 'Local do aluno',
        equipamentos: Array.isArray(loc.equipamentos) ? loc.equipamentos.filter((x: unknown) => typeof x === 'string' && /^[A-Za-z0-9_\-]{1,60}$/.test(x)).slice(0, 120) : [],
      };
    }
  }
  // Histórico: cada envio do aluno é um registro da anamnese (s.anamneses); no mesmo dia o registro do aluno é atualizado.
  // s.anamnese continua espelhando o mais recente, que é de onde o painel e a prescrição leem.
  if (!Array.isArray(s.anamneses)) s.anamneses = [];
  const hoje = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);   // dia em Brasília
  const snap: Record<string, unknown> = {};
  for (const k of CHAVES_REGISTRO_ANAMNESE) if (s.anamnese[k] !== undefined && s.anamnese[k] !== null && s.anamnese[k] !== '') snap[k] = s.anamnese[k];
  const saude: Record<string, unknown> = {};
  for (const k of CAMPOS_SAUDE_PERFIL) if (s.perfil[k]) saude[k] = s.perfil[k];
  snap.saude = saude;
  const doDia = s.anamneses.find((r: any) => r.origem === 'aluno' && r.data === hoje);
  if (doDia) { for (const k of CHAVES_REGISTRO_ANAMNESE) delete doDia[k]; Object.assign(doDia, snap); }
  else s.anamneses.push({ id: novoId(todosIds), data: hoje, origem: 'aluno', responsavel: 'Portal do aluno', ...snap });
  await saveStudents(admin, trainerId, students);
  await registrarRastro(admin, trainerId, caller.id, 'anamnese', { anamnese: limpoTudo });
  return { status: 'ok' };
}

// ── Avaliação (sempre um registro NOVO no histórico) ────────────────────────

function composicao(m: any) {
  const peso = parseFloat(String(m.peso).replace(',', '.')), alt = parseFloat(String(m.altura).replace(',', '.'));
  const um = (x: number) => (Math.round(x * 10) / 10).toFixed(1);
  const out: Record<string, string> = { gordura: '', mgorda: '', mmuscular: '', mmuscular_pct: '', osso: '', osso_pct: '' };
  if (peso && alt) out.imc = um(peso / Math.pow(alt / 100, 2));
  if (!m.temBioimpedancia) return out;
  const g = parseFloat(String(m.gordura).replace(',', '.')), mm = parseFloat(String(m.mmuscular).replace(',', '.')), os = parseFloat(String(m.osso).replace(',', '.'));
  if (g) { out.gordura = String(g); if (peso) out.mgorda = um(peso * g / 100); }
  if (mm) { out.mmuscular = String(mm); if (peso) out.mmuscular_pct = um(mm / peso * 100); }
  if (os) { out.osso = String(os); if (peso) out.osso_pct = um(os / peso * 100); }
  return out;
}

const TIPOS_FOTO = new Set(['frente', 'lado', 'costas']);

async function gravarAvaliacao(admin: any, caller: any, medidasBrutas: any, fotosBrutas: any[]) {
  const trainerId = await _trainerDoAluno(admin, caller.id);
  const { students, todosIds } = await loadStudents(admin, trainerId);
  const proximoId = criadorDeIds(todosIds);
  let s = findStudentByAlunoUserId(students, caller.id);
  if (!s) {
    s = { id: proximoId(), perfil: { email: caller.email, alunoUserId: caller.id, portalStatus: 'ativo' }, anamnese: {}, treinos: [], avaliacoesAntro: [], reavaliacao: null };
    students.push(s);
  }
  if (!Array.isArray(s.avaliacoesAntro)) s.avaliacoesAntro = [];

  const mb = (medidasBrutas && typeof medidasBrutas === 'object') ? medidasBrutas : {};
  const m: any = { temBioimpedancia: !!mb.temBioimpedancia, data_avaliacao: limpaDataISO(mb.data_avaliacao), obs_antro: limpaTexto(mb.obs_antro, 500) };
  for (const k of ['peso', 'altura', 'cintura', 'quadril', 'abdomen', 'ombro', 'braco_d', 'braco_e', 'coxa_d', 'coxa_e', 'pant_d', 'pant_e', 'gordura', 'mmuscular', 'osso']) m[k] = limpaNumero(mb[k]);

  const prefixo = caller.id + '/';
  const fotos = (fotosBrutas || []).slice(0, 3)
    .filter((f: any) => f && TIPOS_FOTO.has(f.tipo) && typeof f.path === 'string' && f.path.startsWith(prefixo) && /^[A-Za-z0-9._\-\/]{1,200}$/.test(f.path) && !f.path.includes('..'))
    .map((f: any) => ({ tipo: f.tipo, path: f.path }));

  const avaliacaoId = proximoId();
  s.avaliacoesAntro.push({
    id: avaliacaoId,
    data_avaliacao: m.data_avaliacao || new Date().toISOString().slice(0, 10),
    peso: m.peso, altura: m.altura,
    cintura: m.cintura, quadril: m.quadril, abdomen: m.abdomen, ombro: m.ombro,
    braco_d: m.braco_d, braco_e: m.braco_e,
    coxa_d: m.coxa_d, coxa_e: m.coxa_e, pant_d: m.pant_d, pant_e: m.pant_e,
    ...composicao(m),
    obs_antro: [m.obs_antro, '(enviado pelo aluno via Portal)'].filter(Boolean).join(' - '),
    responsavel: 'Portal do aluno',
    fotos,
  });
  s.avaliacoesAntro.sort((a: any, b: any) => (b.data_avaliacao || '').localeCompare(a.data_avaliacao || ''));
  await saveStudents(admin, trainerId, students);
  await registrarRastro(admin, trainerId, caller.id, 'avaliacao', { medidas: m, fotos });
  return { status: 'ok', avaliacaoId };
}
