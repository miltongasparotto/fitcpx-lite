// ══════════════════════════════════════════════════════════════════════════
// PORTAL DO ALUNO — app do aluno (Fase 4)
// ══════════════════════════════════════════════════════════════════════════
// App de verdade (abas: Início/Anamnese/Avaliações/Treinos), não wizard. Auth
// própria, tabelas Supabase próprias com RLS (supabase/sql/onboarding-aluno.sql).
// Nada aqui escreve direto no aluno do painel do trainer (students[]) — tudo
// fica em avaliacoes_pendentes até o trainer revisar e importar
// (js/onboarding-personal.js).
//
// v2 — SEM fila de aprovação. Cadastro/anamnese/avaliação chamam a Edge
// Function `aluno-api` (supabase/functions/aluno-api), que grava DIRETO no
// aluno de verdade (students[] do trainer) porque roda com service_role —
// o cliente aqui (conta Supabase separada da do trainer) nunca teria RLS
// pra tocar nesse blob. A mesma chamada grava uma cópia em
// avaliacoes_pendentes só como rastro/histórico (e é dali que este app relê
// o próprio histórico, já que não pode ler o blob do trainer de volta).

// ── Constantes compartilhadas com o painel do trainer (mesmas chaves, pra
// importar ser um merge direto sem tradução de campo) ───────────────────────
const OBJETIVOS = [
  {code:"Hip",label:"Hipertrofia"},{code:"Forca",label:"Força Máxima"},{code:"Emagr",label:"Emagrecimento"},
  {code:"Comp",label:"Composição Corporal"},{code:"Resist",label:"Resistência Muscular"},{code:"CardioR",label:"Cond. Cardiorrespiratório"},
  {code:"Func",label:"Funcional / Mobilidade"},{code:"Saude",label:"Saúde Geral"},{code:"Esport",label:"Performance Esportiva"},
  {code:"Reab",label:"Reabilitação / Pós-lesão"},{code:"Envelhec",label:"Envelhecimento Ativo"},
];

// Mesma lista/chaves de js/biblioteca-exercicios.js (EQUIP_LISTA) — o motor
// de prescrição do trainer filtra exercício por essas chaves exatas.
const EQUIP_LISTA = [
  {chave:'AbdominalMaquina', nome:"Abdominal Maquina"},
  {chave:'Anilha', nome:"Anilha"},
  {chave:'Apolete', nome:"Apolete"},
  {chave:'BancoArticulado', nome:"Banco Articulado"},
  {chave:'BancoDeDesenvolvimento', nome:"Banco de Desenvolvimento"},
  {chave:'BancoDeclinado', nome:"Banco Declinado"},
  {chave:'BancoInclinado', nome:"Banco Inclinado"},
  {chave:'BancoReto', nome:"Banco Reto"},
  {chave:'BancoRomano', nome:"Banco Romano"},
  {chave:'BancoScott', nome:"Banco Scott"},
  {chave:'BarraAustraliana', nome:"Barra Australiana"},
  {chave:'BarraCurta', nome:"Barra Curta"},
  {chave:'BarraFixa', nome:"Barra Fixa"},
  {chave:'BarraLonga', nome:"Barra Longa"},
  {chave:'BarraReta', nome:"Barra Reta"},
  {chave:'BarrasParalelas', nome:"Barras Paralelas"},
  {chave:'Bastao', nome:"Bastao"},
  {chave:'BicicletaErgometrica', nome:"Bicicleta Ergometrica"},
  {chave:'BolaDeLiberacao', nome:"Bola de Liberacao"},
  {chave:'CadeiraAbdutora', nome:"Cadeira Abdutora"},
  {chave:'CadeiraAdutora', nome:"Cadeira Adutora"},
  {chave:'CadeiraExtensora', nome:"Cadeira Extensora"},
  {chave:'CadeiraFlexora', nome:"Cadeira Flexora"},
  {chave:'CaixaDeSalto', nome:"Caixa de Salto"},
  {chave:'Caneleira', nome:"Caneleira"},
  {chave:'Colchonete', nome:"Colchonete"},
  {chave:'Cone', nome:"Cone"},
  {chave:'CrossOver', nome:"Cross Over"},
  {chave:'EscadaIndor', nome:"Escada Indor"},
  {chave:'Espaldar', nome:"Espaldar"},
  {chave:'Esteira', nome:"Esteira"},
  {chave:'FitaDeSuspensao', nome:"Fita de Suspensao"},
  {chave:'FlexorEmPe', nome:"Flexor em Pe"},
  {chave:'FoamRoller', nome:"Foam Roller"},
  {chave:'GaiolaDeElevacaoPelvica', nome:"Gaiola de Elevacao Pelvica"},
  {chave:'Graviton', nome:"Graviton"},
  {chave:'HackDeAgachamento', nome:"Hack de Agachamento"},
  {chave:'Halter', nome:"Halter"},
  {chave:'Kettlebell', nome:"Kettlebell"},
  {chave:'LegPress45', nome:"Leg Press 45º"},
  {chave:'MesaFlexora', nome:"Mesa Flexora"},
  {chave:'MiniBand', nome:"Mini Band"},
  {chave:'MiniFoamRoller', nome:"Mini Foam Roller"},
  {chave:'MonoCrossOver', nome:"Mono Cross Over"},
  {chave:'MaquinaParaCoice', nome:"Maquina para Coice"},
  {chave:'MaquinaParaElevacaoPelvica', nome:"Maquina para Elevacao Pelvica"},
  {chave:'PanturrilhaSentada', nome:"Panturrilha Sentada"},
  {chave:'PesoCorporal', nome:"Peso Corporal"},
  {chave:'PistolaDeLiberacao', nome:"Pistola de Liberacao"},
  {chave:'PulldownMaquina', nome:"Pulldown Maquina"},
  {chave:'PuxadaAlta', nome:"Puxada Alta"},
  {chave:'PuxadorMaquina', nome:"Puxador Maquina"},
  {chave:'RemadaBaixa', nome:"Remada Baixa"},
  {chave:'RemadaCavalo', nome:"Remada Cavalo"},
  {chave:'RemadaGuiado', nome:"Remada Guiado"},
  {chave:'RemadaMaquina', nome:"Remada Maquina"},
  {chave:'ScottMaquina', nome:"Scott Maquina"},
  {chave:'Smith', nome:"Smith"},
  {chave:'Step', nome:"Step"},
  {chave:'SuperBand', nome:"Super Band"},
  {chave:'SupinoDeclinadoMaquina', nome:"Supino Declinado Maquina"},
  {chave:'SupinoInclinadoMaquina', nome:"Supino Inclinado Maquina"},
  {chave:'SupinoRetoMaquina', nome:"Supino Reto Maquina"},
  {chave:'SuporteArticuladoParaBarra', nome:"Suporte Articulado para Barra"},
  {chave:'TheraBand', nome:"Thera Band"},
  {chave:'TricepsTestaMaquina', nome:"Triceps Testa Maquina"},
  {chave:'TubeBand', nome:"Tube Band"},
  {chave:'Voador', nome:"Voador"},
];

// ── Estado ──────────────────────────────────────────────────────────────────
let _alunoTrainerId = null;    // trainer_user_id resolvido do ?c= (via RPC resolver_codigo)
let _alunoNomeCadastro = '';   // nome digitado no cadastro (não vem de auth.users)
let _alunoCadastroBasico = {}; // último dados.perfil enviado (nascimento/sexo/whatsapp/profissao)

let _localEscolha = null; // {modo:'existente', localId, nome, cidade, estado, pais}
let _localModo = null;    // 'academia' | 'casa' — quando o aluno está criando um local novo

let _avalFotos = {}; // { frente:{blob}, lado:{blob}, costas:{blob} } — da avaliação em edição

const TABS_APP = ['inicio','anamnese','avaliacoes','treinos'];

// ── AUTENTICAÇÃO ─────────────────────────────────────────────────────────────
// Fluxo: tela-entrada (já é aluno? / sou novo) → login por e-mail+senha OU
// cadastro por nome+e-mail+senha. Sem e-mail de verificação em nenhum ponto —
// senha nasce no cadastro; reset é o personal definindo uma nova pelo painel
// (Edge Function trainer-transferencia, ação 'definir-senha') e repassando
// por fora (WhatsApp etc.); depois disso o aluno pode trocar a própria senha
// em "Minhas informações" (aba Conta, dentro do app).

let _emailAtual = ''; // e-mail em uso nesta tentativa de login

function traduzErroAuth(msg){
  if(/already registered/i.test(msg)) return 'Esse e-mail já tem conta. Tente entrar.';
  if(/Password should be/i.test(msg)) return 'Senha muito curta (mínimo 6 caracteres).';
  if(/Invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
  return msg;
}
function _erroCadastro(msg){ show('cadastro-erro'); $('cadastro-erro').textContent = msg; }
function _erro(id, msg){ show(id); $(id).textContent = msg; }

function mostrarTelaNovo(){
  if(!_alunoTrainerId){ show('entrada-sem-codigo'); return; }
  hide('entrada-sem-codigo');
  hide('cadastro-erro');
  setVal('cad-nome',''); setVal('cad-email',''); setVal('cad-senha','');
  irPara('tela-cadastro');
}

function irParaSenha(){
  hide('login-email-erro');
  const email = val('login-email').trim();
  if(!email){ _erro('login-email-erro', 'Digite seu e-mail.'); return; }
  _emailAtual = email;
  $('login-senha-email').textContent = email;
  setVal('login-senha','');
  hide('login-senha-erro');
  irPara('tela-login-senha');
}

async function alunoEntrar(){
  hide('login-senha-erro');
  const senha = val('login-senha');
  if(!senha){ _erro('login-senha-erro', 'Digite sua senha.'); return; }
  const { data, error } = await supa.auth.signInWithPassword({ email: _emailAtual, password: senha });
  if(error){ _erro('login-senha-erro', 'E-mail ou senha incorretos.'); return; }
  await aoAutenticar(data.user);
}

async function alunoCadastrar(){
  hide('cadastro-erro');
  const nome = val('cad-nome').trim(), email = val('cad-email').trim(), senha = val('cad-senha');
  if(!nome || !email || !senha) return _erroCadastro('Preencha nome, e-mail e senha.');
  if(senha.length < 6) return _erroCadastro('Senha precisa de pelo menos 6 caracteres.');
  if(!_alunoTrainerId) return _erroCadastro('Link inválido ou expirado. Peça um novo link pro seu personal.');

  _alunoNomeCadastro = nome;
  const btn = $('cad-btn'); btn.disabled = true;
  const { data, error } = await supa.auth.signUp({ email, password: senha, options: { data: { nome } } });
  if(error){ btn.disabled = false; return _erroCadastro(traduzErroAuth(error.message)); }

  let user = data.user;
  if(!data.session){
    const r = await supa.auth.signInWithPassword({ email, password: senha });
    user = r.data?.user || user;
  }
  btn.disabled = false;
  if(!user) return _erroCadastro('Conta criada. Tente entrar na tela de login.');
  await aoAutenticar(user);
}

// ── MINHAS INFORMAÇÕES (troca de senha pelo próprio aluno) ──────────────────

function abrirTelaConta(){
  hide('conta-erro'); hide('conta-sucesso'); setVal('conta-senha','');
  $('conta-email').textContent = _alunoUser?.email || '';
  irPara('tela-conta');
}
function fecharTelaConta(){ irPara('tela-app'); }

async function alunoTrocarSenha(){
  hide('conta-erro'); hide('conta-sucesso');
  const senha = val('conta-senha');
  if(!senha || senha.length < 6){ _erro('conta-erro', 'Senha precisa de pelo menos 6 caracteres.'); return; }
  const btn = $('conta-btn'); btn.disabled = true;
  const { error } = await supa.auth.updateUser({ password: senha });
  btn.disabled = false;
  if(error){ _erro('conta-erro', error.message); return; }
  setVal('conta-senha','');
  show('conta-sucesso');
}

async function alunoTrocarEmail(){
  hide('conta-email-erro'); hide('conta-email-sucesso');
  const novo = val('conta-novo-email').trim();
  if(!novo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(novo)){ _erro('conta-email-erro', 'Digite um e-mail válido.'); return; }
  const btn = $('conta-email-btn'); btn.disabled = true;
  let r;
  try{ r = await chamarApi({ acao: 'alterar-email', novoEmail: novo }); }
  catch(e){ btn.disabled = false; _erro('conta-email-erro', e.message); return; }
  btn.disabled = false;
  if(r.status === 'email-em-uso'){ _erro('conta-email-erro', 'Esse e-mail já é usado por outra conta.'); return; }
  setVal('conta-novo-email', '');
  const { data } = await supa.auth.refreshSession();
  if(data?.user) _alunoUser = data.user;
  $('conta-email').textContent = _alunoUser?.email || novo;
  show('conta-email-sucesso');
}

async function alunoSair(){
  await supa.auth.signOut();
  location.reload();
}

// Chamado depois de QUALQUER autenticação bem-sucedida. Resolve o vínculo com o
// personal certo via Edge Function (só ela grava em alunos_acesso e no índice
// de identidades — ver supabase/sql/vinculo-cpf.sql).
let _alunoCadastroNovo = false;   // conta ainda sem vínculo (criada agora pelo link)
let _alunoPersonalAtual = '';     // nome do personal a que está vinculado hoje
let _alunoPersonalLink = '';      // nome do personal do link ?c= (quando é outro)
let _alunoConflito = null;        // última resposta 'conflito' da API

async function chamarApi(corpo){
  const { data, error } = await supa.functions.invoke('aluno-api', { body: corpo });
  if(error){
    let msg = error.message || String(error);
    try{ const j = await error.context?.json?.(); if(j?.error) msg = j.error; }catch(e){}
    throw new Error(msg);
  }
  return data || {};
}

function mascararCpf(el){
  const d = el.value.replace(/\D/g,'').slice(0,11);
  el.value = d.replace(/^(\d{3})(\d)/,'$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/,'$1.$2.$3').replace(/\.(\d{3})(\d)/,'.$1-$2');
}

async function aoAutenticar(user){
  _alunoUser = user;
  let data;
  try{ data = await chamarApi({ acao: 'resolver-vinculo', codigo: _alunoCodigo || null }); }
  catch(e){ mostrarAviso('Erro ao entrar: ' + e.message); return; }
  if(data.status === 'bloqueado'){ irPara('tela-bloqueado'); return; }
  if(data.status === 'codigo-invalido'){ mostrarAviso('Esse link de cadastro não é válido. Peça um link novo pro seu personal.'); return; }
  if(data.status === 'desconhecido'){ mostrarAviso('Não encontramos um cadastro com esse e-mail. Peça o link de cadastro pra quem vai te acompanhar.'); return; }

  _alunoCadastroNovo = data.status === 'precisa-cadastro';
  _alunoPersonalAtual = _alunoCadastroNovo ? '' : (data.personalNome || '');
  _alunoPersonalLink = _alunoCadastroNovo ? (data.personalNome || '') : (data.outroPersonalNome || '');
  _alunoAcesso = _alunoCadastroNovo ? null : { trainer_user_id: data.trainerId };
  _alunoCadastroBasico = { nome: data.nome || user.user_metadata?.nome || '' };

  // Pede (ou reconfere) nome + CPF quando: conta nova pelo link; aluno antigo sem CPF;
  // ou entrou pelo link de outro personal (pode virar pedido de transferência).
  if(_alunoCadastroNovo || !data.cadastroCompleto || data.outroPersonalNome){
    abrirCadastroBasico(data);
    return;
  }
  entrarNoApp();
}

function mostrarAviso(msg){
  $('aviso-corpo').textContent = msg;
  irPara('tela-aviso');
}

function abrirCadastroBasico(data){
  hide('cb-erro');
  const outro = !_alunoCadastroNovo && data?.outroPersonalNome;
  $('cb-titulo').textContent = outro ? 'Cadastro com ' + data.outroPersonalNome : (_alunoCadastroNovo ? 'Só mais um passo' : 'Complete seu cadastro');
  $('cb-hint').textContent = outro
    ? 'Você já é aluno de ' + (data.personalNome || 'outro personal') + '. Confirme seus dados: se o cadastro for reconhecido, você pode pedir a transferência.'
    : (_alunoCadastroNovo ? 'Dados básicos pra começar. Saúde, objetivo e medidas você preenche direto no app, quando quiser.'
      : 'Seu personal pede nome, CPF e data de nascimento pra manter seu cadastro atualizado.');
  setVal('cb-nome', _alunoCadastroBasico.nome || '');
  toggle('cb-desistir', _alunoCadastroNovo);
  irPara('tela-cadastro-basico');
}

function _perfilDoForm(){
  return {
    nome: val('cb-nome').trim(), cpf: val('cb-cpf').replace(/\D/g,''),
    nascimento: val('cb-nascimento'), sexo: val('cb-sexo'),
    whatsapp: val('cb-whatsapp'), profissao: val('cb-profissao'),
  };
}

const _MSG_CADASTRO = {
  'cpf-invalido': 'CPF inválido. Confira os números.',
  'cpf-nao-confere': 'Esta conta já está ligada a outro CPF. O CPF não muda depois do vínculo.',
  'divergencia': 'Esse CPF já tem cadastro, mas o nome ou o e-mail não batem. Confira os três dados (nome, CPF e e-mail).',
  'bloqueado': 'Seu acesso está bloqueado. Fale com seu personal.',
  'codigo-invalido': 'Esse link de cadastro não é mais válido. Peça um novo ao seu personal.',
  'desconhecido': 'Não encontramos o personal deste cadastro. Peça o link ao seu personal.',
};

async function salvarCadastroBasico(){
  hide('cb-erro');
  const perfil = _perfilDoForm();
  if(!perfil.nome) return _erro('cb-erro', 'Informe seu nome completo.');
  if(!perfil.cpf) return _erro('cb-erro', 'Informe seu CPF.');
  const btn = $('cb-btn'); btn.disabled = true;
  let r;
  try{ r = await chamarApi({ acao: 'cadastro', perfil, codigo: _alunoCodigo || null }); }
  catch(e){ btn.disabled = false; return _erro('cb-erro', e.message || 'Não foi possível salvar. Tente de novo.'); }
  btn.disabled = false;
  _alunoCadastroBasico = perfil;

  if(r.status === 'ok'){ await aoAutenticarSemCadastro(); return; }
  if(r.status === 'email-diferente'){
    return _erro('cb-erro', 'Esse CPF já está cadastrado com o e-mail ' + (r.emailMascarado || '') + '. Entre com esse e-mail, ou peça ao seu personal para corrigir.');
  }
  if(r.status === 'conflito'){
    if(r.jaHaPedido && !r.pedidoParaOutro){ await aoAutenticarSemCadastro(); return; }   // pedido deste mesmo link já existe
    _alunoConflito = r; abrirConflito(r); return;
  }
  _erro('cb-erro', _MSG_CADASTRO[r.status] || 'Não foi possível salvar o cadastro.');
}

// Depois de gravar o cadastro, relê o vínculo e entra no app.
async function aoAutenticarSemCadastro(){
  let data;
  try{ data = await chamarApi({ acao: 'resolver-vinculo', codigo: null }); }
  catch(e){ mostrarAviso('Erro ao entrar: ' + e.message); return; }
  if(data.status === 'bloqueado'){ irPara('tela-bloqueado'); return; }
  if(data.status !== 'ok'){ mostrarAviso('Cadastro salvo, mas não consegui abrir seu acesso. Entre de novo.'); return; }
  _alunoCadastroNovo = false;
  _alunoAcesso = { trainer_user_id: data.trainerId };
  _alunoPersonalAtual = data.personalNome || '';
  entrarNoApp();
}

// ── Conflito: o perfil já pertence a outro personal ─────────────────────────
function abrirConflito(r){
  const atual = escHTML(r.personalNome || 'outro personal');
  const novo = escHTML(_alunoPersonalLink || 'o personal do link');
  const corpo = r.jaHaPedido
    ? `Este perfil já está vinculado ao personal <b>${atual}</b> e já existe um pedido de transferência em andamento para outro personal. Corrija seus dados ou desista.`
    : `Este perfil já está vinculado ao personal <b>${atual}</b>.<br><br>Se você pedir a transferência para <b>${novo}</b>, continua com acesso normal e com seus treinos por até 30 dias. Depois disso a troca acontece sozinha, e os treinos de ${atual} não vêm junto, a menos que ${atual} escolha levar.`;
  $('conflito-corpo').innerHTML = corpo;
  toggle('conflito-trocar', !r.jaHaPedido);
    irPara('tela-conflito');
}

async function solicitarTroca(){
  const btn = $('conflito-trocar'); btn.disabled = true;
  let r;
  try{ r = await chamarApi({ acao: 'solicitar-troca', perfil: _perfilDoForm(), codigo: _alunoCodigo || null }); }
  catch(e){ btn.disabled = false; mostrarAviso(e.message || 'Não foi possível pedir a transferência.'); return; }
  btn.disabled = false;
  if(r.status === 'troca-solicitada'){ await aoAutenticarSemCadastro(); return; }
  if(r.status === 'ja-ha-pedido'){ mostrarAviso('Já existe um pedido de transferência seu para ' + (r.paraNome || 'outro personal') + '.'); return; }
  irPara('tela-cadastro-basico');
  _erro('cb-erro', _MSG_CADASTRO[r.status] || 'Não foi possível pedir a transferência.');
}

// Desistir de tudo: conta nova é apagada; quem já tem vínculo só volta pro app.
async function desistirDoCadastro(){
  if(!_alunoCadastroNovo){ entrarNoApp(); return; }
  if(!confirm('Desistir do cadastro? Sua conta será apagada e você precisará começar de novo.')) return;
  try{ await chamarApi({ acao: 'cancelar-cadastro' }); }
  catch(e){ mostrarAviso(e.message || 'Não foi possível cancelar.'); return; }
  await supa.auth.signOut();
  location.href = location.pathname;   // sem o ?c= na barra
}

function entrarNoApp(){
  irPara('tela-app');
  mostrarTab('inicio');
}

// ── BOOT ─────────────────────────────────────────────────────────────────────
(async function boot(){
  const params = new URLSearchParams(location.search);
  const codigo = params.get('c');
  if(codigo){
    // RPC security definer: resolve só o código exato (a tabela personal_links não é mais legível pelo público).
    const { data } = await supa.rpc('resolver_codigo', { p_codigo: codigo });
    if(data){ _alunoCodigo = codigo; _alunoTrainerId = data; }
  }
  const { data: sess } = await supa.auth.getSession();
  if(sess?.session?.user){ await aoAutenticar(sess.session.user); return; }
  irPara('tela-entrada');
})();

// ── NAVEGAÇÃO POR ABAS ───────────────────────────────────────────────────────

function mostrarTab(nome){
  TABS_APP.forEach(t=>{
    toggle('painel-'+t, t===nome);
    const b = $('tab-'+t); if(b) b.classList.toggle('active', t===nome);
  });
  if(nome === 'inicio') renderInicio();
  if(nome === 'anamnese') carregarAnamnese();
  if(nome === 'avaliacoes') avalMostrarLista();
}

// Situação do vínculo: com quem está hoje e se há pedido de troca em andamento.
async function renderTransferencia(){
  const box = $('inicio-transf'); if(!box) return;
  let r;
  try{ r = await chamarApi({ acao: 'status-vinculo' }); }catch(e){ box.innerHTML = ''; return; }
  if(r.status !== 'ok'){ box.innerHTML = ''; return; }
  const t = r.transferencia;
  if(!t){
    box.innerHTML = r.personalNome ? `<p class="hint" style="margin-bottom:12px">Seu personal: <b>${escHTML(r.personalNome)}</b></p>` : '';
    return;
  }
  const de = escHTML(t.deNome || r.personalNome || 'seu personal'), para = escHTML(t.paraNome || 'outro personal');
  const dt = t.prazoEm ? new Date(t.prazoEm).toLocaleDateString('pt-BR') : '';
  let corpo, acoes;
  if(t.status === 'aguardando_aluno'){
    corpo = `<b>${para}</b> pediu para ser seu personal. Hoje você é aluno de <b>${de}</b>. Confirme se é isso mesmo: a troca só começa depois da sua confirmação e leva até 30 dias.`;
    acoes = `<button class="btn btn-primary btn-sm" onclick="confirmarTroca()">Confirmar pedido</button><button class="btn btn-ghost btn-sm" onclick="cancelarTroca()">Não é isso, cancelar</button>`;
  } else {
    corpo = `Hoje você está vinculado a <b>${de}</b> e pediu para mudar para <b>${para}</b>. Seu acesso e seu treino continuam normais. A troca acontece até ${escHTML(dt)}, ou antes se ${de} liberar. Os treinos de ${de} só vão junto se ele escolher levar.`;
    acoes = `<button class="btn btn-ghost btn-sm" onclick="cancelarTroca()">Cancelar pedido</button>`;
  }
  box.innerHTML = `<div class="card" style="border-color:var(--amber-line);background:var(--amber-dim)"><strong><i class=ph-arrows-left-right></i> Transferência em andamento</strong><p style="margin:8px 0 12px;font-size:13px;color:var(--text2);line-height:1.5">${corpo}</p><div style="display:flex;gap:8px;flex-wrap:wrap">${acoes}</div></div>`;
}

async function confirmarTroca(){
  try{ await chamarApi({ acao: 'confirmar-troca' }); }catch(e){ alert(e.message); return; }
  renderTransferencia();
}
async function cancelarTroca(){
  if(!confirm('Cancelar o pedido de transferência? Você continua com seu personal atual.')) return;
  try{ await chamarApi({ acao: 'cancelar-troca' }); }catch(e){ alert(e.message); return; }
  renderTransferencia();
}

async function renderInicio(){
  $('inicio-nome').textContent = 'Olá, ' + (_alunoCadastroBasico.nome || _alunoUser.email) + '!';
  renderTransferencia();
  const [{ data: anam }, { data: avals }] = await Promise.all([
    supa.from('avaliacoes_pendentes').select('id').eq('aluno_user_id', _alunoUser.id).eq('tipo','anamnese').limit(1),
    supa.from('avaliacoes_pendentes').select('id,created_at').eq('aluno_user_id', _alunoUser.id).eq('tipo','avaliacao').order('created_at',{ascending:false}).limit(1),
  ]);
  const temAnamnese = !!(anam && anam.length);
  const ultimaAval = avals && avals[0];
  $('inicio-status').innerHTML = `
    <div class="card">
      <strong>Anamnese</strong>
      <div class="status-row">
        <span style="color:var(--text2);font-size:13px">${temAnamnese ? 'Preenchida' : 'Ainda não preenchida'}</span>
        <button class="btn btn-ghost btn-sm" onclick="mostrarTab('anamnese')">${temAnamnese ? 'Editar' : 'Preencher'}</button>
      </div>
    </div>
    <div class="card">
      <strong>Última avaliação</strong>
      <div class="status-row">
        <span style="color:var(--text2);font-size:13px">${ultimaAval ? new Date(ultimaAval.created_at).toLocaleDateString('pt-BR') : 'Nenhuma ainda'}</span>
        <button class="btn btn-ghost btn-sm" onclick="mostrarTab('avaliacoes')">${ultimaAval ? 'Ver' : 'Registrar'}</button>
      </div>
    </div>
    <div class="card">
      <strong>Treino</strong>
      <div class="status-row"><span style="color:var(--text2);font-size:13px">Nenhum treino ainda</span></div>
    </div>`;
}

// ── CHECKBOX GROUPS (mesmo padrão "valores | valores", ver js/avaliacao.js) ──

function coletarChk(className){
  return [...document.querySelectorAll('.'+className+':checked')].map(c=>c.value).join(' | ');
}
function carregarChk(className, valorSalvo){
  document.querySelectorAll('.'+className).forEach(c=>c.checked=false);
  (valorSalvo||'').split(' | ').filter(Boolean).forEach(v=>{
    const el = document.querySelector('.'+className+'[value="'+v+'"]'); if(el) el.checked = true;
  });
}

// ── ANAMNESE ─────────────────────────────────────────────────────────────────

function _popularObjetivos(){
  const ef = $('an-objetivo-ef'), sec = $('an-objetivo-sec');
  if(ef.options.length > 1) return; // já populado
  OBJETIVOS.forEach(o=>{
    const opt1 = document.createElement('option'); opt1.value=o.code; opt1.textContent=o.label; ef.appendChild(opt1);
    const opt2 = document.createElement('option'); opt2.value=o.code; opt2.textContent=o.label; sec.appendChild(opt2);
  });
}


async function carregarAnamnese(){
  hide('an-banner');
  _popularObjetivos();
  toggle('an-gestacao-wrap', _alunoCadastroBasico.sexo === 'F');

  _renderEquipCheckboxes('an-local-equip-wrap');

  const { data } = await supa.from('avaliacoes_pendentes')
    .select('dados').eq('aluno_user_id', _alunoUser.id).eq('tipo','anamnese')
    .order('created_at', { ascending:false }).limit(1);
  const a = (data && data[0] && data[0].dados.anamnese) || {};

  carregarChk('chk-sintomas', a.sintomas);
  setVal('an-gestacao', a.gestacao);
  setVal('an-liberacao', a.liberacao);
  setVal('an-cirurgias', a.cirurgias);
  carregarChk('chk-condicoes', a.condicoes);
  carregarChk('chk-medicamentos', a.medicamentos);
  setVal('an-medicamentos-detalhe', a.medicamentos_detalhe);
  carregarChk('chk-lesoes', a.lesoes);
  setVal('an-obs-clinicas', a.obs_clinicas);
  setVal('an-tempo', a.tempo); setVal('an-consistencia', a.consistencia);
  setVal('an-lesoes-passadas', a.lesoes_passadas);
  setVal('an-objetivo-ef', a.objetivo_ef); setVal('an-objetivo-sec', a.objetivo_sec);
  setVal('an-frequencia', a.frequencia); setVal('an-duracao', a.duracao); setVal('an-horario', a.horario);
  // gosta/preferencias = chaves da versão anterior do app
  setVal('an-gosta-texto', a.gosta_texto ?? a.gosta); setVal('an-evitar-texto', a.evitar_texto ?? a.preferencias);

  // Local de treino já vinculado (se houver)
  const { data: vinc } = await supa.from('locais_treino_alunos')
    .select('local_id, locais_treino(nome,cidade,estado,pais)')
    .eq('aluno_user_id', _alunoUser.id).order('criado_em',{ascending:false}).limit(1);
  if(vinc && vinc.length && vinc[0].locais_treino){
    const lt = vinc[0].locais_treino;
    _localEscolha = { modo:'existente', localId: vinc[0].local_id, nome: lt.nome, cidade: lt.cidade, estado: lt.estado, pais: lt.pais };
    _localModo = null;
  } else {
    _localEscolha = null;
  }
  renderLocalSelecionado();
}

function renderLocalSelecionado(){
  const wrap = $('an-local-selecionado');
  if(_localEscolha && _localEscolha.modo === 'existente'){
    wrap.innerHTML = `<div class="alert alert-green"><i class=ph-map-pin></i> Vinculado a: <strong>${escHTML(_localEscolha.nome)}</strong>${_localEscolha.cidade?' — '+escHTML(_localEscolha.cidade)+'/'+escHTML(_localEscolha.estado||''):''}</div>`;
  } else {
    wrap.innerHTML = '';
  }
}

async function salvarAnamnese(){
  // Só o que o sistema usa (decisão 2026-10-04). A aluno-api separa o que é
  // saúde (vai pro Perfil no painel) e calcula o nível por tempo + consistência.
  const anamnese = {
    // Triagem de saúde
    sintomas: coletarChk('chk-sintomas'), gestacao: val('an-gestacao'), liberacao: val('an-liberacao'),
    condicoes: coletarChk('chk-condicoes'), medicamentos: coletarChk('chk-medicamentos'),
    lesoes: coletarChk('chk-lesoes'),
    // Observações clínicas
    lesoes_passadas: val('an-lesoes-passadas'), cirurgias: val('an-cirurgias'),
    medicamentos_detalhe: val('an-medicamentos-detalhe'), obs_clinicas: val('an-obs-clinicas'),
    // Experiência → nível
    tempo: val('an-tempo'), consistencia: val('an-consistencia'),
    // Treino
    objetivo_ef: val('an-objetivo-ef'), objetivo_sec: val('an-objetivo-sec'),
    frequencia: val('an-frequencia'), duracao: val('an-duracao'), horario: val('an-horario'),
    gosta_texto: val('an-gosta-texto'), evitar_texto: val('an-evitar-texto'),
  };
  const localTreino = coletarLocalTreino('an-local');

  const btn = $('an-salvar-btn'); btn.disabled = true;
  try{
    if(localTreino){
      await vincularLocalTreino(localTreino);
      // id do local (existente ou recém-criado) → motor restringe equipamento
      const localId = localTreino.modo === 'existente' ? localTreino.localId : _localEscolha?.localId;
      if(localId) anamnese.local_aluno_id = localId;
    }
    const { error } = await supa.functions.invoke('aluno-api', { body: { acao: 'anamnese', anamnese } });
    if(error) throw error;
    show('an-banner');
    setTimeout(()=>hide('an-banner'), 3000);
  } catch(e){
    alert('Erro ao salvar anamnese: ' + (e.message||e));
  } finally {
    btn.disabled = false;
  }
}

// ── LOCAL DE TREINO (usado pela aba Anamnese) ───────────────────────────────

function _renderEquipCheckboxes(wrapId){
  const wrap = $(wrapId); if(!wrap || wrap.children.length) return;
  EQUIP_LISTA.forEach(({chave, nome})=>{
    const label = document.createElement('label');
    label.className = 'chk-label';
    label.innerHTML = `<input type="checkbox" class="chk-equip-local" value="${chave}"> ${nome}`;
    wrap.appendChild(label);
  });
}

async function buscarLocal(){
  const q = val('an-local-busca').toLowerCase().trim();
  const wrap = $('an-local-resultados');
  if(q.length < 2){ wrap.innerHTML = ''; return; }
  const { data, error } = await supa.from('locais_treino').select('id,nome,cidade,estado,pais,tipo').order('nome');
  if(error){ wrap.innerHTML = '<p class="hint">Erro ao buscar.</p>'; return; }
  const filtrados = (data||[]).filter(l => [l.nome,l.cidade,l.estado,l.pais].some(v => (v||'').toLowerCase().includes(q)));
  wrap.innerHTML = filtrados.length ? '' : '<p class="hint">Nenhum resultado — tente outro nome/cidade, ou cadastre um local novo abaixo.</p>';
  filtrados.forEach(l=>{
    const div = document.createElement('div');
    div.className = 'local-item' + (_localEscolha?.localId===l.id ? ' selected' : '');
    div.innerHTML = `<strong>${escHTML(l.nome)}</strong><br><span style="font-size:12px;color:var(--text3)">${escHTML(l.cidade||'—')}, ${escHTML(l.estado||'—')} · ${escHTML(l.tipo||'')}</span>`;
    div.onclick = ()=>{
      _localEscolha = { modo:'existente', localId:l.id, nome:l.nome, cidade:l.cidade, estado:l.estado, pais:l.pais };
      _localModo = null;
      hide('an-local-novo-wrap');
      wrap.querySelectorAll('.local-item').forEach(el=>el.classList.remove('selected'));
      div.classList.add('selected');
      renderLocalSelecionado();
    };
    wrap.appendChild(div);
  });
}

function novoLocal(modo){
  _localEscolha = null;
  _localModo = modo;
  renderLocalSelecionado();
  show('an-local-novo-wrap');
  _renderEquipCheckboxes('an-local-equip-wrap');
  if(modo === 'casa'){
    setVal('an-local-nome', 'Casa'); setVal('an-local-tipo', 'Home gym');
    hide('an-local-nome-wrap'); hide('an-local-regiao-wrap'); hide('an-local-pais-wrap'); hide('an-local-tipo-wrap');
  } else {
    show('an-local-nome-wrap'); show('an-local-regiao-wrap'); show('an-local-pais-wrap'); show('an-local-tipo-wrap');
  }
}

function coletarLocalTreino(prefixo){
  if(_localEscolha && _localEscolha.modo === 'existente') return _localEscolha;
  if(!_localModo) return null;
  const equipamentos = [...document.querySelectorAll('.chk-equip-local:checked')].map(c=>c.value);
  return {
    modo: _localModo,
    nome: _localModo==='casa' ? 'Casa' : (val(prefixo+'-nome')||'Sem nome'),
    cidade: _localModo==='casa' ? '' : val(prefixo+'-cidade'),
    estado: _localModo==='casa' ? '' : val(prefixo+'-estado'),
    pais: _localModo==='casa' ? '' : val(prefixo+'-pais'),
    tipo: val(prefixo+'-tipo') || (_localModo==='casa' ? 'Home gym' : 'Academia completa'),
    equipamentos,
    obs: val(prefixo+'-obs'),
  };
}

async function vincularLocalTreino(localTreino){
  if(localTreino.modo === 'existente'){
    await supa.from('locais_treino_alunos').upsert({
      local_id: localTreino.localId, aluno_user_id: _alunoUser.id,
      trainer_user_id: _alunoAcesso.trainer_user_id,
    }, { onConflict: 'local_id,aluno_user_id', ignoreDuplicates: true });
  } else {
    const { data: novoLocalRow, error } = await supa.from('locais_treino').insert({
      trainer_user_id: _alunoAcesso.trainer_user_id, nome: localTreino.nome,
      cidade: localTreino.cidade, estado: localTreino.estado, pais: localTreino.pais,
      tipo: localTreino.tipo, equipamentos: localTreino.equipamentos, obs: localTreino.obs,
      criado_por: 'aluno',
    }).select('id').single();
    if(error) throw error;
    await supa.from('locais_treino_alunos').insert({
      local_id: novoLocalRow.id, aluno_user_id: _alunoUser.id, trainer_user_id: _alunoAcesso.trainer_user_id,
    });
    _localEscolha = { modo:'existente', localId: novoLocalRow.id, nome: localTreino.nome, cidade: localTreino.cidade, estado: localTreino.estado, pais: localTreino.pais };
    _localModo = null;
    hide('an-local-novo-wrap');
    renderLocalSelecionado();
  }
}

// ── FOTOS (compressão client-side, reusada pela aba Avaliações) ────────────

function processarFotoInput(file, onReady){
  const reader = new FileReader();
  reader.onload = (e)=>{
    const img = new Image();
    img.onload = ()=>{
      const maxSide = 1600;
      let w = img.width, h = img.height;
      if(w >= h && w > maxSide){ h = Math.round(h*maxSide/w); w = maxSide; }
      else if(h > w && h > maxSide){ w = Math.round(w*maxSide/h); h = maxSide; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob)=>{
        if(!blob){ alert('Não consegui processar essa foto. Tente outra.'); return; }
        if(blob.size > 5*1024*1024){ alert('Foto muito grande mesmo depois de comprimir. Tente outra.'); return; }
        onReady(blob, canvas.toDataURL('image/jpeg', 0.8));
      }, 'image/jpeg', 0.8);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function avalFotoSelecionada(tipo){
  const file = $('av-foto-input-'+tipo).files[0]; if(!file) return;
  processarFotoInput(file, (blob, url)=>{
    _avalFotos[tipo] = { blob };
    $('av-foto-preview-'+tipo).innerHTML = `<img src="${url}">`;
  });
}

// ── AVALIAÇÕES ───────────────────────────────────────────────────────────────

function avalMostrarLista(){
  toggle('aval-lista-view', true);
  toggle('aval-form-view', false);
  carregarAvaliacoes();
}

function avalMostrarForm(){
  toggle('aval-lista-view', false);
  toggle('aval-form-view', true);
  hide('av-erro');
  _avalFotos = {};
  setVal('av-data', new Date().toISOString().slice(0,10));
  ['peso','altura','cintura','quadril','abdomen','ombro','braco-d','braco-e','coxa-d','coxa-e','pant-d','pant-e','gordura','mmuscular','osso','obs'].forEach(k=>setVal('av-'+k,''));
  $('av-tem-bioimpedancia').checked = false;
  hide('av-bioimpedancia-wrap');
  ['frente','lado','costas'].forEach(t=>{ const p=$('av-foto-preview-'+t); if(p) p.innerHTML='Tocar pra escolher a foto'; });
}

async function carregarAvaliacoes(){
  const wrap = $('aval-lista');
  wrap.innerHTML = '<p class="hint">Carregando...</p>';
  const { data, error } = await supa.from('avaliacoes_pendentes')
    .select('id,dados,status,created_at').eq('aluno_user_id', _alunoUser.id).eq('tipo','avaliacao')
    .order('created_at', { ascending:false });
  if(error){ wrap.innerHTML = '<p class="hint">Erro ao carregar.</p>'; return; }
  if(!data || !data.length){ wrap.innerHTML = '<p class="hint">Nenhuma avaliação registrada ainda.</p>'; return; }
  wrap.innerHTML = '';
  data.forEach(r=>{
    const m = r.dados?.medidas || {};
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <strong>${escHTML(m.data_avaliacao || new Date(r.created_at).toLocaleDateString('pt-BR'))}</strong><br>
      <span style="font-size:13px;color:var(--text2)">Peso: ${escHTML(m.peso||'—')} kg · Altura: ${escHTML(m.altura||'—')} cm</span>
      <div style="font-size:11px;color:var(--text3);margin-top:4px">${r.status==='revisado' ? '<i class=ph-check></i> Revisada pelo personal' : 'Aguardando revisão'}</div>`;
    wrap.appendChild(div);
  });
}

async function salvarAvaliacao(){
  hide('av-erro');
  if(!val('av-peso') || !val('av-altura')){
    show('av-erro'); $('av-erro').textContent = 'Peso e altura são obrigatórios.'; return;
  }
  const medidas = {
    data_avaliacao: val('av-data'), peso: val('av-peso'), altura: val('av-altura'),
    cintura: val('av-cintura'), quadril: val('av-quadril'), abdomen: val('av-abdomen'), ombro: val('av-ombro'),
    braco_d: val('av-braco-d'), braco_e: val('av-braco-e'),
    coxa_d: val('av-coxa-d'), coxa_e: val('av-coxa-e'), pant_d: val('av-pant-d'), pant_e: val('av-pant-e'),
    temBioimpedancia: !!$('av-tem-bioimpedancia').checked,
    gordura: val('av-gordura'), mmuscular: val('av-mmuscular'), osso: val('av-osso'),
    obs_antro: val('av-obs'),
  };
  const btn = $('aval-salvar-btn'); btn.disabled = true;
  try{
    const fotosMeta = [];
    for(const tipo of Object.keys(_avalFotos)){
      const path = `${_alunoUser.id}/${Date.now()}-${tipo}.jpg`;
      const { error: eUp } = await supa.storage.from('avaliacoes-fotos').upload(path, _avalFotos[tipo].blob, { contentType:'image/jpeg' });
      if(eUp) throw eUp;
      fotosMeta.push({ tipo, path });
    }
    const { error } = await supa.functions.invoke('aluno-api', { body: { acao: 'avaliacao', medidas, fotos: fotosMeta } });
    if(error) throw error;
    avalMostrarLista();
  } catch(e){
    show('av-erro'); $('av-erro').textContent = 'Erro ao salvar: ' + (e.message || e);
  } finally {
    btn.disabled = false;
  }
}
