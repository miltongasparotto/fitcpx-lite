// ══════════════════════════════════════════════════════════════════════════
// WHATSAPP — FILA "A ENVIAR" (envio manual; o sistema avisa, o personal envia)
// ══════════════════════════════════════════════════════════════════════════
// Detecta os eventos do sistema e lista a mensagem pronta de cada um. Nada é
// enviado sozinho: "Abrir WhatsApp" abre o wa.me com o texto preenchido e marca
// o aviso como enviado.
//
// Modelo de dados — não existe uma lista "fila" salva. Os avisos pendentes são
// CALCULADOS a cada consulta a partir do estado atual (tarefas, treinos, alunos).
// O que fica gravado em DB.waFeitas é só o que o personal já tratou:
//   { '<evento>:<alunoId>:<ref>': { s:'enviada'|'dispensada', em:<ms>, ev, n, d } }
// Por isso um aviso some sozinho quando deixa de valer (tarefa concluída, treino
// renovado) e nunca aparece duas vezes para o mesmo fato.
//
// Regras da v1 (decididas com o personal):
//   - o aviso aparece quando o dia vira (hora local), com antecedência 0;
//   - nada que JÁ estava vencido ou atrasado quando o recurso foi ligado entra na
//     fila (DB.waBase = dia da primeira consulta; só conta o que acontece depois);
//   - cada evento usa o modelo da tela WhatsApp que tem aquele `evento`; sem modelo
//     com o evento, o aviso está desligado (ver js/mensagens-wa.js).
// O envio automático (Evolution API) é a fase seguinte: documentos/EVOLUTION-WHATSAPP.md.
// Este arquivo carrega depois de dashboard.js e mensagens-wa.js.

const WA_ORDEM_EVENTOS = ['tarefa','treinoVencido','treinoVencendo','cobranca','renovacao','reativar','boasVindas','aniversario'];
function _waRotulo(ev){ return ev === 'tarefa' ? 'Tarefa do fluxo' : (WA_EVENTOS[ev] || ev); }

function _waLocalIso(d){
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function _waListaAlunos(){ return (typeof students !== 'undefined' && Array.isArray(students)) ? students : []; }
function _waAtivo(al){ return typeof alunoActiveForTasks === 'function' ? alunoActiveForTasks(al) : !(al.crm && al.crm.archived); }

// Todos os fatos que PODEM gerar aviso agora, ainda sem filtrar por data nem por "já tratado".
function waCandidatos(){
  const hoje = todayStr();
  const lista = _waListaAlunos();
  const out = [], vistos = new Set();
  const push = (evento, al, ref, T, tpl, detalhe, extra, estrito) => {
    if(!tpl || !al || !T) return;
    const chave = evento + ':' + al.id + ':' + String(ref).replace(/[^\w-]/g, '');
    if(vistos.has(chave)) return;
    vistos.add(chave);
    out.push({ chave, evento, alunoId:al.id, T, tplId:tpl.id, detalhe, extra:extra || {}, estrito:!!estrito });
  };

  // 1) Tarefa de fluxo cuja etapa tem um modelo de WhatsApp ligado.
  if(Array.isArray(DB.tasks)) lista.forEach(al => {
    if(!_waAtivo(al)) return;
    ((al.crm && al.crm.fluxos) || []).forEach(af => {
      const fl = DB.fluxos.find(f => f.id === af.id); if(!fl) return;
      (af.tasks || []).forEach(tid => {
        const t = DB.tasks.find(x => x.id === tid);
        if(!t || t.done || t.isTrigger || t.manual) return;
        const etapa = (fl.steps || []).find(s => t.stepId && t.stepId.startsWith(s.id + '_fl'));
        if(!etapa || !etapa.waTpl) return;
        const tpl = DB.waTpls.find(x => x.id === etapa.waTpl); if(!tpl) return;
        if(isTaskBlocked(t)) return;
        const T = liveDate(t);
        push('tarefa', al, t.id, T, tpl, t.titulo, { vencimento:fmtDate(T) });
      });
    });
  });

  // 2) Treino perto de vencer / vencido (mesma classificação do Painel).
  if(typeof dashClassificarAluno === 'function') lista.forEach(al => {
    if(!_waAtivo(al)) return;
    const c = dashClassificarAluno(al);
    if(!c.venc || c.dias == null) return;
    const vIso = _waLocalIso(c.venc), venc = fmtDate(vIso);
    const jProx = cfgNum('janelaProximo', 7);
    if(c.dias < 0) push('treinoVencido', al, vIso, addDays(vIso, 1), waModeloDoEvento('treinoVencido'), 'Venceu em ' + venc, { vencimento:venc }, true);
    else if(c.dias <= jProx) push('treinoVencendo', al, vIso, addDays(vIso, -jProx), waModeloDoEvento('treinoVencendo'), 'Vence em ' + venc, { vencimento:venc });
  });

  // 3) Aluno novo (cadastrado há no máximo `diasAlunoNovo` dias).
  lista.forEach(al => {
    if(!_waAtivo(al) || !(al.id > 1e12) || !(al.perfil && al.perfil.nome)) return;
    const T = _waLocalIso(new Date(al.id));
    if(diffDays(hoje, T) > cfgNum('diasAlunoNovo', 14)) return;
    push('boasVindas', al, 'novo', T, waModeloDoEvento('boasVindas'), 'Cadastrado em ' + fmtDate(T));
  });

  // 4) Aluno pausado/inativo há `diasRevisao` dias ou mais.
  lista.forEach(al => {
    if(typeof needsReview !== 'function' || !needsReview(al)) return;
    const desde = al.crm.statusSince;
    push('reativar', al, desde, addDays(desde, cfgNum('diasRevisao', 30)), waModeloDoEvento('reativar'),
      (al.crm.status === 'inativo' ? 'Inativo' : 'Pausado') + ' desde ' + fmtDate(desde));
  });

  // 5) Aniversário (neste ano).
  lista.forEach(al => {
    if(!_waAtivo(al)) return;
    let n = al.perfil && al.perfil.nascimento; if(!n) return;
    if(n.includes('/')){ const p = n.split('/'); if(p.length === 3) n = p[2] + '-' + p[1].padStart(2, '0') + '-' + p[0].padStart(2, '0'); }
    const m = /^\d{4}-(\d{2})-(\d{2})/.exec(n); if(!m) return;
    const ano = hoje.slice(0, 4);
    push('aniversario', al, ano, ano + '-' + m[1] + '-' + m[2], waModeloDoEvento('aniversario'), 'Aniversário em ' + m[2] + '/' + m[1]);
  });

  // 6) Cobrança e renovação: ficam dormentes até o Financeiro existir (js/adapters.js).
  try{
    if(typeof FinanceiroAdapter !== 'undefined' && FinanceiroAdapter.disponivel){
      FinanceiroAdapter.listarPagamentosVencidos().forEach(p => {
        const al = findAluno(p.alunoId); if(!al) return;
        const venc = fmtDate(p.vencimento);
        const valor = (typeof _dashMoney === 'function') ? _dashMoney(p.valor) : 'R$ ' + Number(p.valor || 0).toFixed(2).replace('.', ',');
        push('cobranca', al, p.id, addDays(p.vencimento, 1), waModeloDoEvento('cobranca'), 'Venceu em ' + venc, { valor, vencimento:venc }, true);
      });
      FinanceiroAdapter.listarContratos().forEach(c => {
        const al = findAluno(c.alunoId); if(!al || c.fim < hoje) return;
        const venc = fmtDate(c.fim);
        push('renovacao', al, c.id, addDays(c.fim, -7), waModeloDoEvento('renovacao'), 'Vence em ' + venc, { plano:c.plano || '', vencimento:venc });
      });
    }
  }catch(e){}
  return out;
}

// Avisos pendentes agora: aconteceram depois da linha de base, já chegaram (T <= hoje) e ainda não foram tratados.
function waPendentes(){
  if(typeof DB === 'undefined' || !DB.waFeitas) return [];
  const hoje = todayStr();
  // A linha de base só nasce em memória: gravar aqui apagaria o CRM salvo se esta consulta rodar antes do
  // carregamento da conta (o sino consulta a fila no início). Ela vai para o disco e para a nuvem junto
  // do próximo salvamento normal do CRM.
  if(!DB.waBase) DB.waBase = hoje;
  const base = DB.waBase;
  const ordem = ev => { const i = WA_ORDEM_EVENTOS.indexOf(ev); return i < 0 ? 99 : i; };
  return waCandidatos()
    .filter(c => (c.estrito ? c.T > base : c.T >= base) && c.T <= hoje && !DB.waFeitas[c.chave])
    .sort((a, b) => (ordem(a.evento) - ordem(b.evento)) || a.T.localeCompare(b.T));
}

// ── Ações ───────────────────────────────────────────────────────────────────
function waItemTexto(it){
  const tpl = DB.waTpls.find(t => t.id === it.tplId), al = findAluno(it.alunoId);
  return (tpl && al) ? waTextoDeModelo(tpl.msg, al, it.extra) : '';
}
function _waMarcar(it, status){
  DB.waFeitas[it.chave] = { s:status, em:Date.now(), ev:it.evento, n:alunoNome(findAluno(it.alunoId)), d:it.detalhe };
  const corte = Date.now() - 400 * 86400000;   // limpeza: nada tratado há mais de 400 dias precisa ser lembrado
  Object.keys(DB.waFeitas).forEach(k => { if((DB.waFeitas[k].em || 0) < corte) delete DB.waFeitas[k]; });
}
function waAbrirItem(chave){
  const it = waPendentes().find(x => x.chave === chave);
  if(!it){ crmToast('Este aviso não está mais pendente', 'info'); waAtualizarTelas(); return; }
  const url = waLinkPara(findAluno(it.alunoId), waItemTexto(it));
  if(!url){ crmToast('Número de telefone não cadastrado', 'err'); return; }
  window.open(url, '_blank', 'noopener');
  _waMarcar(it, 'enviada'); crmSave(); waAtualizarTelas();
}
function waDispensar(chave){
  const it = waPendentes().find(x => x.chave === chave); if(!it) return;
  _waMarcar(it, 'dispensada'); crmSave(); waAtualizarTelas();
}
function waDispensarEvento(evento){
  crmConfirm('Dispensar todos os avisos de "' + _waRotulo(evento) + '" que estão na fila?', () => {
    waPendentes().filter(x => x.evento === evento).forEach(it => _waMarcar(it, 'dispensada'));
    crmSave(); waAtualizarTelas();
  });
}
function waReabrir(chave){
  delete DB.waFeitas[chave]; crmSave(); waAtualizarTelas();
}

// Atualiza selo do menu, sino e a tela que estiver aberta.
function waAtualizarTelas(){
  if(typeof updateBadges === 'function') updateBadges();
  const visivel = id => { const e = document.getElementById(id); return !!e && !e.classList.contains('hidden'); };
  if(visivel('screen-whatsapp') && typeof renderWhatsappCRM === 'function') renderWhatsappCRM();
  else if(visivel('screen-dashboard') && typeof renderDashboard === 'function') renderDashboard();
}

function waAtualizarBadge(){
  const el = document.getElementById('nav-whatsapp-badge'); if(!el) return;
  let n = 0; try{ n = waPendentes().length; }catch(e){}
  el.textContent = n > 99 ? '99+' : String(n);
  el.style.display = n ? '' : 'none';
}

// Atalho do sino, do menu e do Painel: abre a tela WhatsApp já na aba A enviar.
function waAbrirFila(){ _waTab = 'enviar'; navGo('whatsapp'); }

// ── Tela "A enviar" ─────────────────────────────────────────────────────────
function _waLinhaItem(it){
  const al = findAluno(it.alunoId);
  const tel = !!(al && alunoTel(al) && String(alunoTel(al)).replace(/\D/g, ''));
  return '<div class="lrow">' +
    '<div style="flex:1;min-width:0">' +
      '<div class="lrow-t">' + escHTML(alunoNome(al)) + ' <span class="badge badge-gray">' + escHTML(it.detalhe || '') + '</span></div>' +
      '<div class="lrow-sub">' + escHTML(waItemTexto(it)) + '</div>' +
    '</div>' +
    '<div style="display:flex;gap:6px;flex-shrink:0;align-items:center">' +
      (tel
        ? '<button class="btn btn-primary btn-sm" onclick="waAbrirItem(\'' + it.chave + '\')"><i class=ph-whatsapp-logo></i>Abrir WhatsApp</button>'
        : '<span class="badge badge-amber" title="Cadastre o WhatsApp do aluno"><i class=ph-warning></i>Sem telefone</span>') +
      '<button class="icon-btn" onclick="waDispensar(\'' + it.chave + '\')" title="Dispensar" aria-label="Dispensar"><i class=ph-x></i></button>' +
    '</div></div>';
}

function waRenderFila(){
  const itens = waPendentes();
  const grupos = {};
  itens.forEach(i => (grupos[i.evento] = grupos[i.evento] || []).push(i));
  const blocos = WA_ORDEM_EVENTOS.filter(ev => grupos[ev]).map(ev =>
    '<div class="card" style="margin-bottom:14px">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;flex-wrap:wrap">' +
        '<div class="card-title" style="margin:0">' + escHTML(_waRotulo(ev)) + ' <span class="badge badge-gray">' + grupos[ev].length + '</span></div>' +
        (grupos[ev].length > 1 ? '<button class="btn btn-ghost btn-sm" onclick="waDispensarEvento(\'' + ev + '\')">Dispensar todas</button>' : '') +
      '</div>' + grupos[ev].map(_waLinhaItem).join('') +
    '</div>').join('');

  const vazio = '<div class="card"><div class="empty"><i class=ph-check-circle></i>' +
    '<div class="empty-title">Nada para enviar agora</div>' +
    '<div class="empty-text">Quando o dia virar e algum aviso chegar (tarefa com mensagem, treino vencendo ou vencido, aluno novo, aniversário), ele aparece aqui com o texto pronto.</div></div></div>';

  const feitas = Object.keys(DB.waFeitas || {}).map(k => Object.assign({ chave:k }, DB.waFeitas[k]))
    .sort((a, b) => (b.em || 0) - (a.em || 0)).slice(0, 15);
  const hist = feitas.length
    ? '<details class="card" style="margin-top:6px"><summary style="cursor:pointer;font-weight:600">Tratadas recentemente (' + feitas.length + ')</summary><div style="margin-top:10px">' +
      feitas.map(f => '<div class="lrow"><div style="flex:1;min-width:0"><div class="lrow-t">' + escHTML(f.n || '') +
        ' <span class="badge ' + (f.s === 'enviada' ? 'badge-green' : 'badge-gray') + '">' + (f.s === 'enviada' ? 'Enviada' : 'Dispensada') + '</span></div>' +
        '<div class="lrow-sub">' + escHTML(_waRotulo(f.ev)) + (f.d ? ' · ' + escHTML(f.d) : '') + ' · ' + new Date(f.em).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }) + '</div></div>' +
        '<button class="btn btn-ghost btn-sm" onclick="waReabrir(\'' + f.chave + '\')"><i class=ph-arrow-u-up-left></i>Reabrir</button></div>').join('') +
      '</div></details>'
    : '';

  const aviso = '<div class="alert alert-blue" style="margin-bottom:14px"><i class=ph-info></i><span>Os avisos chegam quando o dia vira e valem só para o que acontece a partir de ' +
    escHTML(DB.waBase ? fmtDate(DB.waBase) : 'hoje') + '. O que já estava vencido antes não entra. Cada aviso usa o modelo da aba Modelos que tem o evento correspondente.</span></div>';

  return aviso + (blocos || vazio) + hist;
}

// ── Virada do dia ───────────────────────────────────────────────────────────
// O painel aberto atravessa a meia-noite (hora local): ao virar, os avisos novos entram sem recarregar.
let _waDiaVisto = null;
function waConferirVirada(){
  const h = todayStr();
  if(_waDiaVisto && _waDiaVisto !== h){ _waDiaVisto = h; waAtualizarTelas(); }
  _waDiaVisto = h;
}
setInterval(waConferirVirada, 60000);
document.addEventListener('visibilitychange', () => { if(!document.hidden) waConferirVirada(); });
waConferirVirada();
