// ══════════════════════════════════════════════════════════════════════════
// MENSAGENS DE WHATSAPP DO PAINEL — modelos editáveis + link wa.me
// ══════════════════════════════════════════════════════════════════════════
// Fase 1 (atual): abre o WhatsApp com o texto pronto (`https://wa.me/<tel>?text=`).
// Fase 2 (futuro, documentos/EVOLUTION-WHATSAPP.md): trocar só o destino do envio
// (waLinkPara / abrirWhatsApp) pela integração automática. Os modelos e as
// regras da fila (js/wa-regras.js) não mudam.
//
// Os modelos moram em DB.waTpls (os mesmos da tela WhatsApp, editáveis lá).
// Os modelos de fábrica levam a marca `sys` para serem reencontrados mesmo
// depois de renomeados. Um modelo com `evento` preenchido é o texto usado pela
// fila "A enviar" quando aquele evento acontece (ex.: treino vencido).
// Evento vazio = só envio manual. Apagar um modelo de fábrica não o recria
// (DB.waSysApagados); para desligar um aviso, basta escolher "Nenhum" no modelo.

const WA_MODELOS_PADRAO = {
  cobranca:       { nome:'Cobrança',              evento:'cobranca',       msg:'Olá {nome}! Tudo bem? Passando para lembrar que o pagamento de {valor} venceu em {vencimento}. Qualquer dúvida, é só me chamar.' },
  renovacao:      { nome:'Renovação de contrato', evento:'renovacao',      msg:'Olá {nome}! Seu plano {plano} vence em {vencimento}. Vamos renovar? Me avise e eu preparo tudo.' },
  avaliacao:      { nome:'Agendar avaliação',     evento:'',               msg:'Olá {nome}! Vamos agendar sua avaliação física? Me diga os melhores dias e horários para você.' },
  pedirDados:     { nome:'Pedir dados',           evento:'',               msg:'Olá {nome}! Para montar seu próximo treino, preciso dos seus dados atualizados: peso, medidas e fotos. Pode me enviar?' },
  mensagem:       { nome:'Mensagem',              evento:'',               msg:'Olá {nome}! Tudo bem?' },
  portal:         { nome:'Portal do Aluno',       evento:'',               msg:'Olá! Este é o link do Portal do Aluno: {link}' },
  treinoVencendo: { nome:'Treino perto de vencer', evento:'treinoVencendo', msg:'Olá {nome}! Seu treino vence em {vencimento}. Vamos marcar a reavaliação para atualizar seu treino? Me diga os melhores dias e horários.' },
  treinoVencido:  { nome:'Treino vencido',        evento:'treinoVencido',  msg:'Olá {nome}! Seu treino venceu em {vencimento}. Vamos fazer a reavaliação e montar o próximo? Me diga os melhores dias e horários.' },
  boasVindas:     { nome:'Boas-vindas',           evento:'boasVindas',     msg:'Olá {nome}! Seja bem-vindo(a) ao {studio}! Sou {personal} e vou acompanhar o seu treino. Qualquer dúvida, é só me chamar.' },
  reativar:       { nome:'Reativar aluno',        evento:'reativar',       msg:'Olá {nome}! Faz um tempo que não nos falamos. Como você está? Quer retomar os treinos? Estou à disposição.' },
  aniversario:    { nome:'Aniversário',           evento:'aniversario',    msg:'Olá {nome}! Feliz aniversário! Que o seu novo ciclo venha com muita saúde e conquistas. Um abraço, {personal}.' },
  acomp7:         { nome:'Acompanhamento 7 dias',  evento:'',              msg:'Olá {nome}! Uma semana de treino! Como está sendo? Conseguiu seguir o programa?' },
  acomp15:        { nome:'Acompanhamento 15 dias', evento:'',              msg:'Olá {nome}! 15 dias de treino! Percebeu alguma evolução em disposição, postura ou peso?' },
  acomp30:        { nome:'Acompanhamento 30 dias', evento:'',              msg:'Olá {nome}! 1 mês de treino! Vamos conversar sobre os resultados e ajustar o que for preciso?' },
  reaval60:       { nome:'Reavaliação 60 dias',    evento:'',              msg:'Olá {nome}! Já são 60 dias de treino. Hora de uma nova avaliação para atualizar o seu treino. Quando você pode?' },
};

// Eventos que a fila "A enviar" sabe detectar (js/wa-regras.js). A tarefa de fluxo
// não aparece aqui: ela é ligada a um modelo dentro de cada etapa do fluxo.
const WA_EVENTOS = {
  treinoVencendo: 'Treino perto de vencer',
  treinoVencido:  'Treino vencido',
  boasVindas:     'Aluno novo',
  reativar:       'Aluno parado (reativar)',
  aniversario:    'Aniversário',
  cobranca:       'Cobrança em atraso',
  renovacao:      'Contrato perto de vencer',
};

const WA_MODELOS_SEMENTE = ['cobranca','renovacao','avaliacao','pedirDados','treinoVencendo','treinoVencido',
  'boasVindas','reativar','aniversario','acomp7','acomp15','acomp30','reaval60'];

// Cria no CRM os modelos que ainda não existem (idempotente, nunca sobrescreve texto).
function waGarantirModelos(){
  if(typeof DB === 'undefined' || !Array.isArray(DB.waTpls)) return;
  if(!DB.waSysApagados || typeof DB.waSysApagados !== 'object') DB.waSysApagados = {};
  let mudou = false;
  WA_MODELOS_SEMENTE.forEach(chave => {
    const m = WA_MODELOS_PADRAO[chave];
    const ex = DB.waTpls.find(t => t.sys === chave);
    if(ex){
      if(ex.evento === undefined){ ex.evento = m.evento || ''; mudou = true; }   // modelo criado antes dos eventos existirem
      return;
    }
    if(DB.waSysApagados[chave]) return;
    DB.waTpls.push({ id:novoId(), nome:m.nome, msg:m.msg, cat:null, sys:chave, evento:m.evento || '' });
    mudou = true;
  });
  if(mudou && typeof crmSave === 'function') crmSave();
}

function waTextoModelo(tipo){
  const salvo = (typeof DB !== 'undefined' && Array.isArray(DB.waTpls)) ? DB.waTpls.find(t => t.sys === tipo) : null;
  return salvo ? salvo.msg : (WA_MODELOS_PADRAO[tipo] || WA_MODELOS_PADRAO.mensagem).msg;
}

// Modelo que a fila usa para um evento (o primeiro com aquele evento). Sem modelo = aviso desligado.
function waModeloDoEvento(evento){
  return (typeof DB !== 'undefined' && Array.isArray(DB.waTpls)) ? (DB.waTpls.find(t => t.evento === evento) || null) : null;
}

// Variáveis que dependem do evento (não do aluno nem do studio).
function waAplicarExtras(txt, extra){
  extra = extra || {};
  return String(txt || '')
    .replace(/{valor}/g, extra.valor || '')
    .replace(/{vencimento}/g, extra.vencimento || '')
    .replace(/{plano}/g, extra.plano || '')
    .replace(/{link}/g, extra.link || '');
}

// Texto final de um modelo para um aluno (ou sem aluno, ex.: link do portal).
function waTextoDeModelo(msg, aluno, extra){
  let txt = msg;
  if(aluno && typeof replaceVars === 'function') txt = replaceVars(txt, aluno);
  else {
    txt = (typeof waVarsStudio === 'function') ? waVarsStudio(txt) : txt;
    txt = txt.replace(/{nome}/g, (extra && extra.nome) || '');
  }
  return waAplicarExtras(txt, extra);
}

function _waMontarTexto(tipo, aluno, extra){
  return waTextoDeModelo(waTextoModelo(tipo), aluno, extra);
}

// DDI do studio (Configurações > Marca), usado quando o telefone do aluno vem sem código do país.
function waDdiPadrao(){
  return String((typeof DB !== 'undefined' && DB.config && DB.config.waCountryCode) || '55').replace(/\D/g, '') || '55';
}

// Telefone do aluno pronto para o wa.me (só dígitos, com código do país), ou '' se não tem.
// Número guardado com "+código" (aluno de outro país) vale como está; sem "+", entra o código escolhido ou o padrão do studio.
function waFoneInternacional(bruto, ddiEscolhido){
  bruto = String(bruto || '').trim();
  if(!bruto) return '';
  if(bruto.charAt(0) === '+') return bruto.replace(/[^0-9]/g, '');
  const ddi = ddiEscolhido || waDdiPadrao();
  let p = bruto.replace(/[^0-9]/g, '');
  if(!p) return '';
  if(ddi === '55' && p.startsWith('55') && p.length > 11) p = p.slice(2);   // mesma regra do envio da tela WhatsApp
  return ddi + p;
}

// URL do WhatsApp para um texto já pronto, ou null se o aluno não tem telefone.
// `aluno` pode ser null (ex.: link do portal: o contato é escolhido no WhatsApp).
function waLinkPara(aluno, texto){
  const t = encodeURIComponent(texto || '');
  if(!aluno) return 'https://wa.me/?text=' + t;
  const fone = waFoneInternacional(typeof alunoTel === 'function' ? alunoTel(aluno) : aluno.perfil?.whatsapp);
  if(!fone) return null;
  return 'https://wa.me/' + fone + '?text=' + t;
}

function buildWhatsAppLink(tipo, aluno, extra){
  return waLinkPara(aluno, _waMontarTexto(tipo, aluno, extra));
}

function abrirWhatsApp(tipo, alunoId, extra){
  waGarantirModelos();
  const aluno = alunoId != null ? (typeof findAluno === 'function' ? findAluno(alunoId) : null) : null;
  const url = buildWhatsAppLink(tipo, aluno, extra);
  if(!url){ if(typeof crmToast === 'function') crmToast('Número de telefone não cadastrado', 'err'); return false; }
  window.open(url, '_blank', 'noopener');
  return true;
}
