// ══════════════════════════════════════════════════════════════════════════
// DASHBOARD — tela de abertura
// ══════════════════════════════════════════════════════════════════════════
// Responde uma pergunta só: quem precisa de atenção hoje.
//
// Regra de corte (fechada com o Milton em 2026-09-03): o prazo é o do PRÓPRIO
// treino — cada treino aprovado guarda `prazoSemanas` e `dataVencimento`, e o
// getStatusVencimento() (treinos-store.js) já classifica em vencido/proximo/
// agendar/ok. A dash só LÊ isso; não inventa prazo paralelo.
//
// Avaliação NÃO tem prazo próprio de propósito: a avaliação é pré-condição
// para criar treino, então treino em dia implica avaliação em dia. Um corte
// separado só criaria duas verdades para a mesma coisa. O único caso em que a
// avaliação aparece sozinha é o aluno SEM treino nenhum — aí importa saber se
// ele já pode ser prescrito ou se ainda falta avaliar. Isso é estado, não data.
//
// Zero dependência nova: usa students, getUltimoTreino, getStatusVencimento,
// selectStudent e os tokens de CSS que já existem.

// Treino aprovado antes do campo `prazoSemanas` existir não tem
// `dataVencimento`. Nesse caso assume o padrão do sistema (12 semanas) contado
// da aprovação — mesmo número que aprovarRascunho() usa como default.
// (Configurações > Regras e prazos: validadeSemanas, janelaProximo, janelaAgendar, diasAlunoNovo.)
function _dashCfg(chave, padrao){ return (typeof cfgNum === 'function') ? cfgNum(chave, padrao) : padrao; }

function _dashParseBR(str){
  if(!str || typeof str !== 'string') return null;
  const p = str.split('/').map(Number);
  if(p.length !== 3 || !p[0] || !p[1] || !p[2]) return null;
  const d = new Date(p[2], p[1]-1, p[0]);
  return isNaN(+d) ? null : d;
}

function _dashDiasAte(data){
  if(!data) return null;
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const alvo = new Date(data); alvo.setHours(0,0,0,0);
  return Math.round((alvo - hoje) / 86400000);
}

function _dashFmt(data){
  return data ? data.toLocaleDateString('pt-BR') : '—';
}

// Última avaliação do aluno: a lista de snapshots manda; anamnese é fallback.
function _dashUltimaAvaliacao(s){
  const avs = s.avaliacoesAntro || [];
  const bruta = (avs.length ? avs[avs.length-1].data_avaliacao : null)
             || (s.anamnese || {}).data_avaliacao
             || null;
  if(!bruta) return null;
  // avaliacoesAntro vem do <input type="date"> → ISO (yyyy-mm-dd);
  // dado antigo pode estar em BR (dd/mm/yyyy).
  const d = bruta.includes('/') ? _dashParseBR(bruta) : new Date(bruta + 'T00:00:00');
  return (d && !isNaN(+d)) ? d : null;
}

// Classifica UM aluno. Devolve sempre o mesmo formato, para a tela não precisar
// saber de onde veio a data.
function dashClassificarAluno(s){
  const nome = (s.perfil || {}).nome || 'Sem nome';
  const ultAval = _dashUltimaAvaliacao(s);
  const treino = (typeof getUltimoTreino === 'function') ? getUltimoTreino(s) : {};
  const temTreino = !!treino.aprovado;

  if(!temTreino){
    return {
      id: s.id, nome, bucket: 'sem-treino',
      temAvaliacao: !!ultAval,
      ultAval,
      detalhe: ultAval
        ? 'Avaliado em ' + _dashFmt(ultAval) + ', pronto para prescrever'
        : 'Sem avaliação. Avaliar antes de prescrever',
      ordem: ultAval ? 1 : 0,   // quem nem foi avaliado vem primeiro
    };
  }

  // Prazo do próprio treino (fonte de verdade).
  let st = (typeof getStatusVencimento === 'function') ? getStatusVencimento(treino) : null;
  let venc = st ? _dashParseBR(st.dataVencimento) : null;
  let dias = st ? st.diasRestantes : null;

  // Treino antigo, sem dataVencimento: deriva do padrão de 12 semanas.
  if(!st){
    const aprov = _dashParseBR(treino.dataAprovacao)
               || (treino.id ? new Date(treino.id) : null);
    if(aprov){
      venc = new Date(aprov);
      venc.setDate(venc.getDate() + _dashCfg('validadeSemanas', 12) * 7);
      dias = _dashDiasAte(venc);
    }
  }

  if(dias === null){
    return {
      id: s.id, nome, bucket: 'sem-data', ultAval, treino,
      detalhe: 'Treino aprovado sem data. Conferir o cadastro',
      ordem: 0,
    };
  }

  const jProx = _dashCfg('janelaProximo', 7), jAgend = Math.max(_dashCfg('janelaAgendar', 14), jProx);
  const bucket = dias < 0 ? 'vencido' : dias <= jProx ? 'proximo' : dias <= jAgend ? 'agendar' : 'ok';
  const detalhe = dias < 0
    ? 'Venceu em ' + _dashFmt(venc)
    : 'Vence em ' + _dashFmt(venc);

  return { id: s.id, nome, bucket, dias, venc, ultAval, treino, detalhe, ordem: dias };
}

function dashLevantarPendencias(){
  const lista = (typeof students !== 'undefined' && Array.isArray(students)) ? students : [];
  const grupos = { vencido:[], proximo:[], agendar:[], 'sem-treino':[], 'sem-data':[], ok:[] };
  lista.forEach(s => {
    const c = dashClassificarAluno(s);
    (grupos[c.bucket] || grupos.ok).push(c);
  });
  Object.keys(grupos).forEach(k => grupos[k].sort((a,b) => (a.ordem||0) - (b.ordem||0)));
  return grupos;
}


// ── Painel v2 (08/10/2026) ────────────────────────────────────────────────
// Modelo "Foco por área" (documentos/design-handoff/PAINEL-ESPECIFICACAO.md).
// Cada pendência aparece em UM lugar só:
//   ciclo de treino -> Avaliação e treino · pagamento/contrato -> Financeiro
//   agenda e tarefas avulsas (sem fluxo) -> Hoje
// Classificação do treino segue sendo dashClassificarAluno() (acima): o Painel
// só LÊ os prazos que já existem. Layout dos 3 tamanhos: css/painel.css.
// Pagamentos/contratos e "Treinar aluno" entram por js/adapters.js.

const DASH_ETAPAS = [['todos','Todos'], ['avaliar','Avaliar'], ['prescrever','Prescrever'], ['vencendo','Vencendo'], ['vencido','Vencido']];
const DASH_ETAPA_ROTULO = { avaliar:'Avaliar', prescrever:'Prescrever', vencendo:'Vencendo', vencido:'Vencido', conferir:'Conferir' };

window._dashArea  = window._dashArea  || 'ciclo';
window._dashEtapa = window._dashEtapa || 'todos';

function _dashTemCrm(){ return typeof DB !== 'undefined' && Array.isArray(DB.tasks); }
function _dashLS(k, v){
  try{ if(v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); }catch(e){}
  return null;
}
function _dashAlunoAtivo(s){
  const c = s.crm || {};
  return !c.archived && c.status !== 'pausado' && c.status !== 'inativo';
}
function _dashPrimeiroNome(){
  const n = (_dashTemCrm() && DB.config && DB.config.personalName) || '';
  return n.trim().split(/\s+/)[0] || '';
}
function _dashSaudacao(){
  const h = new Date().getHours();
  const base = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const nome = _dashPrimeiroNome();
  return nome ? base + ', ' + nome : base;
}
function _dashDataExtenso(){
  const t = new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}
function _dashIniciais(nome){
  const p = String(nome || '').split(/\s+/).filter(w => w.length > 2).slice(0, 2);
  return (p.map(w => w[0]).join('') || String(nome || '?')[0] || '?').toUpperCase();
}
function _dashFmtCurto(d){
  return d ? d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' }) : '';
}
function _dashFmtISO(iso){ return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : ''; }
function _dashMoney(v){ return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 }); }
function _dashDias(n, passado){
  n = Math.abs(n);
  if(n === 0) return 'hoje';
  return (passado ? 'há ' : 'em ') + n + (n === 1 ? ' dia' : ' dias');
}
function _dashModalidade(s){
  const m = String((s.perfil || {}).modalidade || '').toLowerCase();
  return (m === 'online' || m === 'hibrido' || m === 'híbrido') ? 'Consultoria' : 'Presencial';
}

// Data (AAAA-MM-DD) da etapa do fluxo do aluno marcada com a função `papel`
// ('prescricao' | 'reavaliacao'). Null se o aluno não tem fluxo com essa etapa
// ou se a tarefa dela já foi concluída. O campo `papel` é gravado em crm-fluxos.js.
function _dashDataFuncao(s, papel){
  if(!_dashTemCrm() || !s.crm || !Array.isArray(s.crm.fluxos)) return null;
  let melhor = null;
  s.crm.fluxos.forEach(af => {
    const fl = DB.fluxos.find(f => f.id === af.id); if(!fl) return;
    const etapa = (fl.steps || []).find(st => st.papel === papel); if(!etapa) return;
    const tid = (af.tasks || []).find(id => {
      const t = DB.tasks.find(x => x.id === id);
      return t && t.stepId && t.stepId.startsWith(etapa.id + '_fl');
    });
    const t = DB.tasks.find(x => x.id === tid);
    if(!t || t.done) return;
    const d = liveDate(t);
    if(d && (!melhor || d < melhor)) melhor = d;
  });
  return melhor;
}

function _dashLinhaCiclo(s, c){
  const hoje = todayStr();
  const mod = _dashModalidade(s);
  const o = { id:s.id, nome:c.nome, ini:_dashIniciais(c.nome), mod, etapa:'conferir', tom:'gray', tag:'', status:'',
              aval:'Pendente', avalSub:'sem registro', trTxt:'Não prescrito', trSub:'aguarda avaliação', pct:0, ord:5, dias:0 };

  if(c.ultAval){
    const d = _dashDiasAte(c.ultAval);
    o.aval = _dashFmtCurto(c.ultAval);
    o.avalSub = _dashDias(d, true);
  }
  // Reavaliação marcada no fluxo: aparece como subtexto da avaliação.
  const reav = _dashDataFuncao(s, 'reavaliacao');
  if(reav && c.ultAval) o.avalSub += ' · reavaliar ' + _dashFmtISO(reav);

  const tr = c.treino;
  if(tr && c.venc){
    o.trTxt = 'vence ' + _dashFmtCurto(c.venc);
    const ap = _dashParseBR(tr.dataAprovacao);
    o.trSub = ap ? 'prescrito ' + _dashFmtCurto(ap) : '';
    if(ap){
      const total = c.venc - ap, feito = new Date() - ap;
      o.pct = total > 0 ? Math.max(0, Math.min(100, Math.round(feito / total * 100))) : 100;
    }
  } else if(tr){ o.trTxt = 'Sem data'; o.trSub = 'conferir cadastro'; }

  if(c.bucket === 'vencido'){
    o.etapa = 'vencido'; o.tom = 'red'; o.ord = 0; o.dias = c.dias; o.pct = 100;
    o.tag = Math.abs(c.dias) + (Math.abs(c.dias) === 1 ? ' dia' : ' dias');
    o.status = 'Treino vencido ' + _dashDias(c.dias, true) + ' · reavaliar';
  } else if(c.bucket === 'proximo' || c.bucket === 'agendar'){
    o.etapa = 'vencendo'; o.tom = 'amber'; o.ord = 3; o.dias = c.dias;
    o.tag = c.dias === 0 ? 'hoje' : c.dias + (c.dias === 1 ? ' dia' : ' dias');
    o.status = 'Treino vence ' + (c.dias === 0 ? 'hoje' : _dashDias(c.dias, false));
  } else if(c.bucket === 'sem-treino' && !c.temAvaliacao){
    o.etapa = 'avaliar'; o.tom = 'blue'; o.ord = 4;
    const criado = s.id > 1e12 ? Math.round((Date.now() - s.id) / 86400000) : null;
    o.tag = (criado !== null && criado <= _dashCfg('diasAlunoNovo', 14)) ? 'novo' : 'pendente';
    o.status = 'Sem avaliação' + (criado !== null ? ' · aluno ' + _dashDias(criado, true) : '');
  } else if(c.bucket === 'sem-treino'){
    o.etapa = 'prescrever'; o.tom = 'amber'; o.ord = 2;
    const prazo = _dashDataFuncao(s, 'prescricao');
    if(prazo){
      const d = diffDays(prazo, hoje);
      o.dias = d;
      o.trSub = 'prescrever até ' + _dashFmtISO(prazo);
      if(d < 0){ o.tom = 'red'; o.ord = 1; o.tag = 'atrasada'; o.status = 'Prescrição atrasada ' + _dashDias(d, true); }
      else { o.tag = d === 0 ? 'hoje' : d + (d === 1 ? ' dia' : ' dias'); o.status = 'Prescrever até ' + _dashFmtISO(prazo); }
    } else {
      o.tag = c.ultAval ? 'avaliado ' + _dashDias(_dashDiasAte(c.ultAval), true) : '';
      o.status = 'Avaliado em ' + _dashFmt(c.ultAval) + ', pronto para prescrever';
    }
  } else if(c.bucket === 'sem-data'){
    o.tag = 'conferir'; o.status = c.detalhe;
  } else return null;   // em dia
  return o;
}

function dashLinhasCiclo(){
  const lista = (typeof students !== 'undefined' && Array.isArray(students)) ? students : [];
  const out = [];
  lista.forEach(s => {
    if(!_dashAlunoAtivo(s)) return;
    const o = _dashLinhaCiclo(s, dashClassificarAluno(s));
    if(o) out.push(o);
  });
  out.sort((a, b) => (a.ord - b.ord) || (a.dias - b.dias) || a.nome.localeCompare(b.nome, 'pt-BR'));
  return out;
}

// Saúde: ativos agora e variação líquida em 30 dias (entradas - saídas).
// Entrada = aluno cadastrado nos últimos 30 dias. Saída = aluno desativado
// (pausado/inativo) nos últimos 30 dias. Arquivado/excluído não conta.
function dashSaude(){
  const lista = (typeof students !== 'undefined' && Array.isArray(students)) ? students : [];
  const corte = Date.now() - 30 * 86400000;
  let ativos = 0, entradas = 0, saidas = 0;
  lista.forEach(s => {
    const c = s.crm || {};
    if(c.archived) return;
    const desativado = c.status === 'pausado' || c.status === 'inativo';
    if(!desativado) ativos++;
    if(s.id > 1e12 && s.id >= corte && (s.perfil || {}).nome) entradas++;
    if(desativado && c.statusSince && new Date(c.statusSince + 'T12:00:00').getTime() >= corte) saidas++;
  });
  return { ativos, entradas, saidas, liquido: entradas - saidas };
}

function dashHoje(){
  const r = { agenda:[], tarefas:[] };
  if(!_dashTemCrm()) return r;
  const hoje = todayStr(), amanha = addDays(hoje, 1);
  const livres = DB.tasks.filter(t => taskVisible(t) && !t.fluxoRef);   // tarefas do ciclo (fluxo) ficam em Avaliação e treino
  const nomeDe = t => t.alunoId ? alunoNome(findAluno(t.alunoId)) : '';
  livres.filter(t => liveDate(t) === hoje && t.hora).sort((a, b) => String(a.hora).localeCompare(String(b.hora)))
    .forEach(t => r.agenda.push({ id:t.id, hora:t.hora, titulo:t.titulo, quem:nomeDe(t), done:!!t.done }));
  const ag = new Set(r.agenda.map(a => a.id));
  livres.filter(t => !t.done && !ag.has(t.id) && liveDate(t) <= amanha)
    .sort((a, b) => liveDate(a).localeCompare(liveDate(b)))
    .slice(0, 8)
    .forEach(t => {
      const d = diffDays(liveDate(t), hoje);
      r.tarefas.push({ id:t.id, titulo:t.titulo, quem:nomeDe(t),
        due: d < 0 ? 'atrasada ' + Math.abs(d) + 'd' : d === 0 ? 'hoje' : 'amanhã', tom: d < 0 ? 'red' : d === 0 ? 'amber' : 'gray' });
    });
  return r;
}

// Últimas atividades: eventos que o sistema já guarda (aluno novo, treino
// aprovado, avaliação, tarefa concluída) + o que o próprio Painel registra
// (DB.atividades, ex.: pagamento recebido).
function dashAtividades(){
  const ev = [];
  const corte = Date.now() - 30 * 86400000;
  const lista = (typeof students !== 'undefined' && Array.isArray(students)) ? students : [];
  lista.forEach(s => {
    const nome = (s.perfil || {}).nome; if(!nome) return;
    if(s.id > 1e12 && s.id >= corte) ev.push({ ts:s.id, ic:'ph-user-plus', nome, what:'Novo aluno cadastrado', exato:true });
    (s.treinos || []).forEach(t => {
      if(typeof TREINOS_STATUS === 'undefined' || t.status !== TREINOS_STATUS.APROVADO) return;
      const d = _dashParseBR(t.dataAprovacao);
      if(d && d.getTime() >= corte) ev.push({ ts:d.getTime() + 43200000, ic:'ph-barbell', nome, what:'Treino prescrito' });
    });
    (s.avaliacoesAntro || []).forEach(a => {
      if(!a.data_avaliacao) return;
      const d = a.data_avaliacao.includes('/') ? _dashParseBR(a.data_avaliacao) : new Date(a.data_avaliacao + 'T12:00:00');
      if(d && !isNaN(+d) && d.getTime() >= corte) ev.push({ ts:d.getTime(), ic:'ph-clipboard-text', nome, what:'Avaliação registrada' });
    });
  });
  if(_dashTemCrm()){
    DB.tasks.filter(t => t.done && t.doneDate && t.alunoId).forEach(t => {
      const d = new Date(t.doneDate + 'T12:00:00');
      if(d.getTime() >= corte) ev.push({ ts:d.getTime(), ic:'ph-check-circle', nome:alunoNome(findAluno(t.alunoId)), what:'Concluído: ' + t.titulo });
    });
    (DB.atividades || []).forEach(a => ev.push({ ts:a.ts, ic:a.ic, nome:a.nome, what:a.what, exato:true, novo:Date.now() - a.ts < 120000 }));
  }
  ev.sort((a, b) => b.ts - a.ts);
  return ev.slice(0, 6).map(e => {
    const d = new Date(e.ts), h0 = new Date(); h0.setHours(0, 0, 0, 0);
    const dias = Math.round((h0 - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
    let quando = dias <= 0 ? (e.exato ? d.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }) : 'hoje')
               : dias === 1 ? 'ontem' : _dashFmtCurto(d);
    if(e.novo) quando = 'agora';
    return Object.assign({}, e, { quando });
  });
}
function dashRegistrarAtividade(ic, nome, what){
  if(!_dashTemCrm()) return;
  DB.atividades = DB.atividades || [];
  DB.atividades.unshift({ ts:Date.now(), ic, nome, what });
  DB.atividades = DB.atividades.slice(0, 50);
  if(typeof crmSave === 'function') crmSave();
}

function _dashPassos(){
  if(!_dashTemCrm()) return [];
  const hasConfig = !!(DB.config && (DB.config.personalName || (DB.config.studioName && DB.config.studioName !== 'FitCPX Lite')));
  const hasFluxo = DB.fluxos.filter(f => !f.archived).length > 0;
  const lista = (typeof students !== 'undefined') ? students : [];
  const hasVinculo = lista.some(s => s.crm && s.crm.fluxos && s.crm.fluxos.length);
  const hasPortal = _dashLS('fitcpx-portal-divulgado') === '1';
  return [
    { ic:'ph-user-circle',  t:'Configure seu perfil',          s:'Nome, estúdio e WhatsApp',   done:hasConfig,  go:"navGo('config')" },
    { ic:'ph-flow-arrow',   t:'Crie um fluxo de trabalho',     s:'Etapas, prazos e avisos',    done:hasFluxo,   go:"navGo('fluxos')" },
    { ic:'ph-link',         t:'Vincule um fluxo a um aluno',   s:'As tarefas começam a nascer', done:hasVinculo, go:"navGo('alunos')" },
    { ic:'ph-device-mobile', t:'Divulgue o Portal do Aluno',   s:'Envie o link de acesso',     done:hasPortal,  go:"dashToggleMenu('portal')" },
  ];
}

// ── Ações rápidas ─────────────────────────────────────────────────────────
const DASH_ACOES = [
  { id:'novo', label:'Novo aluno', curto:'Novo aluno', ic:'ph-user-plus', primaria:true, itens:[
      { ic:'ph-pencil-simple-line', t:'Cadastro manual', s:'Preencher os dados agora',               fn:'dashNovoManual()' },
      { ic:'ph-paper-plane-tilt',   t:'Cadastro online', s:'Copiar o link para o aluno preencher',    fn:'dashCopiarLinkCadastro()' } ] },
  { id:'treinar', label:'Treinar aluno', curto:'Treinar', ic:'ph-barbell',        fn:'TreinarAdapter.abrir()' },
  { id:'agenda',  label:'Agenda',        curto:'Agenda',  ic:'ph-calendar-blank', fn:"navGo('agenda')" },
  { id:'portal', label:'Portal do Aluno', curto:'Portal', ic:'ph-device-mobile', itens:[
      { ic:'ph-arrow-square-out', t:'Abrir portal',        s:'Abre o portal em nova aba',      fn:'dashPortalAbrir()' },
      { ic:'ph-copy',             t:'Copiar link',         s:'Para colar onde quiser',          fn:'dashPortalCopiar()' },
      { ic:'ph-whatsapp-logo',    t:'Enviar por WhatsApp', s:'Abre com mensagem pronta',        fn:'dashPortalWhatsApp()' } ] },
];

function _dashAcaoHTML(a, tile){
  const cls = (tile ? 'dp-tile' : 'dp-act') + (a.primaria ? ' is-primary' : '');
  const click = a.itens ? "dashToggleMenu('" + a.id + "')" : "dashFecharMenus();" + a.fn;
  const menu = a.itens ? '<div class="dp-menu" role="menu" data-menu-id="' + a.id + '">' +
      '<div class="dp-sheet-h"><span class="dp-grip"></span><b>' + a.label + '</b></div>' +
      a.itens.map(it => '<button type="button" class="dp-menu-it" role="menuitem" onclick="dashFecharMenus();' + it.fn + '">' +
        '<span class="dp-menu-ic"><i class=' + it.ic + '></i></span>' +
        '<span class="dp-menu-tx"><b>' + it.t + '</b><small>' + it.s + '</small></span></button>').join('') +
    '</div>' : '';
  return '<div class="dp-actwrap" data-menu="1" data-act="' + a.id + '">' +
    '<button type="button" class="' + cls + '" onclick="' + click + '"' + (a.itens ? ' aria-haspopup="menu"' : '') + '>' +
      '<i class=' + a.ic + '></i><span class="dp-act-l">' + (tile ? a.curto : a.label) + '</span>' +
      (a.itens && !tile ? '<i class="ph-caret-down dp-chev"></i>' : '') + '</button>' + menu + '</div>';
}

function dashToggleMenu(id){
  const dp = document.querySelector('.dp'); if(!dp) return;
  const w = Array.from(document.querySelectorAll('.dp-actwrap[data-act="' + id + '"]')).find(x => x.offsetParent !== null); if(!w) return;
  const abre = !w.classList.contains('open');
  dashFecharMenus();
  if(abre){ w.classList.add('open'); dp.classList.add('menu-open'); }
}
function dashFecharMenus(){
  document.querySelectorAll('.dp-actwrap.open').forEach(w => w.classList.remove('open'));
  const dp = document.querySelector('.dp'); if(dp) dp.classList.remove('menu-open');
}
document.addEventListener('mousedown', e => {
  if(e.target.closest && !e.target.closest('[data-menu]')) dashFecharMenus();
});

// ── Ações: novo aluno e portal ──────────────────────────────────────────────
function dashNovoManual(){
  if(typeof abrirNovoAluno === 'function') abrirNovoAluno(); else navGo('alunos');
}
async function _dashCopiar(texto){
  try{ await navigator.clipboard.writeText(texto); return true; }
  catch(e){
    const ta = document.createElement('textarea'); ta.value = texto; ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select();
    let ok = false; try{ ok = document.execCommand('copy'); }catch(_){}
    ta.remove(); return ok;
  }
}
async function _dashGarantirCodigo(){
  if(typeof _portalLinkCodigo !== 'undefined' && _portalLinkCodigo) return _portalLinkCodigo;
  if(typeof supa === 'undefined' || typeof _supaUser === 'undefined' || !_supaUser) return null;
  const { data } = await supa.from('personal_links').select('codigo').eq('trainer_user_id', _supaUser.id).maybeSingle();
  _portalLinkCodigo = data && data.codigo || null;
  return _portalLinkCodigo;
}
async function dashLinkCadastro(){
  return Carregando.durante('Preparando o link...', async () => {
    let cod = await _dashGarantirCodigo();
    if(!cod && typeof gerarPortalLink === 'function'){ await gerarPortalLink(); cod = _portalLinkCodigo; }
    return cod ? _portalUrlCadastro() : null;
  });
}
function _dashMarcarPortal(){ _dashLS('fitcpx-portal-divulgado', '1'); }
async function dashCopiarLinkCadastro(){
  const url = await dashLinkCadastro();
  if(!url){ crmToast('Não foi possível gerar o link agora', 'err'); return; }
  const ok = await _dashCopiar(url);
  _dashMarcarPortal();
  crmToast(ok ? 'Link de cadastro copiado' : 'Copie o link: ' + url);
}
function dashPortalAbrir(){ _dashMarcarPortal(); abrirAppAluno('acesso'); crmToast('Portal aberto em nova aba'); }
async function dashPortalCopiar(){
  const ok = await _dashCopiar(_portalUrlAcesso());
  _dashMarcarPortal();
  crmToast(ok ? 'Link do portal copiado' : 'Copie o link: ' + _portalUrlAcesso());
}
function dashPortalWhatsApp(){
  _dashMarcarPortal();
  abrirWhatsApp('portal', null, { link:_portalUrlAcesso() });
  crmToast('WhatsApp Web aberto com o link');
}

// ── Ações das linhas ───────────────────────────────────────────────────────
function dashAbrirAluno(id){
  if(typeof selectStudent === 'function') selectStudent(id);
}
function dashPrescrever(id){
  dashAbrirAluno(id);
  setTimeout(() => { if(typeof switchTab === 'function') switchTab('prescricao'); }, 0);
}
function dashMensagem(id, tipo){ abrirWhatsApp(tipo, id); }
function dashTrocarArea(k){
  if(k === window._dashArea) return;
  window._dashArea = k;
  document.querySelectorAll('.dp-stat').forEach(b => b.classList.toggle('on', b.dataset.area === k));
  _dashRenderPainel(true);
}
function dashTrocarEtapa(k){ window._dashEtapa = k; _dashRenderPainel(false); }
function dashAbrirAgenda(){ navGo('agenda'); }
function dashTarefa(id){
  if(typeof toggleTaskDone !== 'function') return;
  const t = DB.tasks.find(x => x.id === id), vaiConcluir = t && !t.done;
  toggleTaskDone(id);
  if(vaiConcluir) crmToast('Tarefa concluída');
  renderDashboard();
}
function dashDispensarBoasVindas(){ _dashLS('fitcpx-dash-welcome-off', '1'); renderDashboard(); }
function dashCobrar(id){
  const p = FinanceiroAdapter.listarPagamentosVencidos().find(x => x.id === id); if(!p) return;
  abrirWhatsApp('cobranca', p.alunoId, { valor:_dashMoney(p.valor), vencimento:_dashFmtISO(p.vencimento) });
}
async function dashReceber(id){
  const p = FinanceiroAdapter.listarPagamentosVencidos().find(x => x.id === id); if(!p) return;
  const ok = await Carregando.durante('Registrando o pagamento...', () => FinanceiroAdapter.marcarRecebido(id));
  if(!ok){ crmToast('Não foi possível registrar o pagamento', 'err'); return; }
  const el = document.querySelector('[data-pag="' + id + '"]');
  if(el) el.classList.add('saindo');
  setTimeout(() => {
    dashRegistrarAtividade('ph-money', p.nome, 'Pagamento recebido');
    renderDashboard();
    crmToast('Pagamento de ' + String(p.nome).split(' ')[0] + ' marcado como recebido');
  }, 340);
}
function dashRenovar(id){
  const c = FinanceiroAdapter.listarContratos().find(x => x.id === id); if(!c) return;
  abrirWhatsApp('renovacao', c.alunoId, { plano:c.plano || '', vencimento:_dashFmtISO(c.fim) });
}
function dashAjustar(id){ FinanceiroAdapter.abrirContrato(id); }

// ── Renderização ──────────────────────────────────────────────────────────
function _dashChipHTML(tom, txt){ return '<span class="dp-chip tom-' + tom + '">' + escHTML(txt) + '</span>'; }
function _dashAvatar(ini, tom){ return '<span class="dp-av' + (tom ? ' tom-' + tom : '') + '">' + escHTML(ini) + '</span>'; }

function _dashAcoesLinha(o){
  const cons = o.mod === 'Consultoria';
  const tipoMsg = cons ? 'pedirDados' : (o.etapa === 'prescrever' ? 'mensagem' : 'avaliacao');
  const primaria = o.etapa === 'prescrever' ? 'prescrever' : (cons ? 'msg' : 'agenda');
  const defs = [
    { k:'msg',        l:cons ? 'Pedir dados' : 'Mensagem', ic:'ph-whatsapp-logo', fn:'dashMensagem(' + o.id + ",'" + tipoMsg + "')" },
    { k:'agenda',     l:'Agenda',     ic:'ph-calendar-plus', fn:'dashAbrirAgenda()' },
    { k:'prescrever', l:'Prescrever', ic:'ph-barbell',       fn:'dashPrescrever(' + o.id + ')' },
  ];
  defs.sort((a, b) => (b.k === primaria) - (a.k === primaria));
  return defs.map(a => a.k === primaria
    ? '<button type="button" class="dp-btn is-primary" onclick="' + a.fn + '"><i class=' + a.ic + '></i><span>' + a.l + '</span></button>'
    : '<button type="button" class="dp-btn is-icon" title="' + a.l + '" aria-label="' + a.l + ' ' + escHTML(o.nome) + '" onclick="' + a.fn + '"><i class=' + a.ic + '></i><span class="dp-btn-l">' + a.l + '</span></button>'
  ).join('');
}

function _dashLinhaHTML(o){
  const barTom = o.tom === 'red' ? 'red' : o.tom === 'amber' ? 'amber' : 'green';
  return '<div class="dp-row">' +
    '<div class="dp-c-aluno">' + _dashAvatar(o.ini) +
      '<div class="dp-who"><div class="dp-nome">' + escHTML(o.nome) + '</div>' +
      '<div class="dp-sub dp-mod">' + o.mod + '</div><div class="dp-sub dp-status tom-' + o.tom + '-t">' + escHTML(o.status) + '</div></div></div>' +
    '<div class="dp-c-sit">' + _dashChipHTML(o.tom, DASH_ETAPA_ROTULO[o.etapa]) + (o.tag ? '<span class="dp-tag tom-' + o.tom + '-t">' + escHTML(o.tag) + '</span>' : '') + '</div>' +
    '<div class="dp-c-dados">' +
      '<div class="dp-c-mod"><div class="dp-k">Modalidade</div><div class="dp-v">' + o.mod + '</div></div>' +
      '<div class="dp-c-aval"><div class="dp-k">Avaliação</div><div class="dp-v">' + escHTML(o.aval) + '</div><div class="dp-s">' + escHTML(o.avalSub) + '</div></div>' +
      '<div class="dp-c-treino"><div class="dp-k">Treino</div><div class="dp-v">' + escHTML(o.trTxt) + '</div><div class="dp-s">' + escHTML(o.trSub) + '</div>' +
        '<div class="dp-bar"><i class="bar-' + barTom + '" style="width:' + o.pct + '%"></i></div></div>' +
    '</div>' +
    '<div class="dp-c-acoes">' + _dashAcoesLinha(o) + '</div>' +
  '</div>';
}

function _dashPainelCiclo(D){
  const rows = D.rows.filter(r => window._dashEtapa === 'todos' || r.etapa === window._dashEtapa);
  const cont = k => k === 'todos' ? D.rows.length : D.rows.filter(r => r.etapa === k).length;
  const abas = DASH_ETAPAS.map(([k, l]) =>
    '<button type="button" class="dp-seg-b' + (window._dashEtapa === k ? ' on' : '') + '" onclick="dashTrocarEtapa(\'' + k + '\')">' + l + '<span>' + cont(k) + '</span></button>').join('');
  const corpo = rows.length
    ? '<div class="dp-thead"><span>Aluno</span><span>Avaliação</span><span>Treino</span><span>Situação</span><span></span></div>' + rows.map(_dashLinhaHTML).join('')
    : '<div class="dp-vazio"><i class=ph-check-circle></i>Tudo em dia</div>';
  return '<div class="dp-ph"><div><h3>Avaliação e treino</h3><p>Prazos definidos em cada fluxo</p></div>' +
    '<div class="dp-segs"><div class="dp-seg">' + abas + '</div></div></div>' + corpo;
}

function _dashPainelFin(D){
  const f = D.fin;
  if(!f.disponivel){
    return '<h3>Financeiro</h3><p class="dp-p">Controle manual: registre os recebimentos e acompanhe os contratos</p>' +
      '<div class="dp-2col"><div class="dp-box"><div class="dp-box-h"><b>Pagamentos vencidos</b></div>' +
      '<div class="dp-vazio dp-vazio-s"><i class=ph-hourglass></i>' + escHTML(FinanceiroAdapter.textoEmBreve) + '</div></div>' +
      '<div class="dp-box"><div class="dp-box-h"><b>Contratos</b></div><div class="dp-vazio dp-vazio-s"><i class=ph-hourglass></i>Vencimentos e renovações aparecem aqui.</div></div></div>';
  }
  const total = f.pag.reduce((s, p) => s + Number(p.valor || 0), 0);
  const hoje = todayStr();
  const pags = f.pag.length ? f.pag.map(p => {
    const d = diffDays(p.vencimento, hoje);
    return '<div class="dp-pag" data-pag="' + p.id + '"><div class="dp-pag-in">' + _dashAvatar(_dashIniciais(p.nome), 'red') +
      '<div class="dp-pag-b"><div class="dp-pag-t"><span>' + escHTML(p.nome) + '</span><b>' + _dashMoney(p.valor) + '</b></div>' +
      '<div class="dp-s">' + escHTML(p.descricao || 'Pagamento') + ' · venceu ' + _dashFmtISO(p.vencimento) + ' · <span class="tom-red-t">' + _dashDias(d, true) + '</span></div>' +
      '<div class="dp-pag-a"><button type="button" class="dp-btn" onclick="dashCobrar(' + p.id + ')"><i class=ph-whatsapp-logo></i><span>Enviar cobrança</span></button>' +
      '<button type="button" class="dp-btn is-primary" onclick="dashReceber(' + p.id + ')"><i class=ph-check></i><span>Marcar recebido</span></button></div></div></div></div>';
  }).join('') : '<div class="dp-vazio dp-vazio-s"><i class=ph-check-circle></i>Tudo recebido</div>';
  const cons = f.con.length ? f.con.map(c => {
    const d = diffDays(c.fim, hoje), venc = d < 0;
    return '<div class="dp-con"><div class="dp-con-b"><div class="dp-con-t"><span>' + escHTML(c.nome) + '</span>' + _dashChipHTML(venc ? 'red' : 'amber', venc ? 'vencido' : d + (d === 1 ? ' dia' : ' dias')) + '</div>' +
      '<div class="dp-s">' + escHTML(c.plano || 'Contrato') + ' · ' + (venc ? 'venceu ' : 'vence ') + _dashFmtISO(c.fim) + '</div></div>' +
      '<button type="button" class="dp-btn" onclick="' + (venc ? 'dashAjustar(' : 'dashRenovar(') + c.id + ')"><i class=' + (venc ? 'ph-pencil-simple-line' : 'ph-whatsapp-logo') + '></i><span>' + (venc ? 'Ajustar' : 'Renovar') + '</span></button></div>';
  }).join('') : '<div class="dp-vazio dp-vazio-s"><i class=ph-check-circle></i>Nenhum contrato pendente</div>';
  return '<h3>Financeiro</h3><p class="dp-p">Controle manual: registre os recebimentos e acompanhe os contratos</p>' +
    '<div class="dp-2col"><div class="dp-box is-danger"><div class="dp-box-h"><b>Pagamentos vencidos</b><b class="tom-red-t">' + _dashMoney(total) + '</b></div>' + pags + '</div>' +
    '<div class="dp-box"><div class="dp-box-h"><b>Contratos</b></div>' + cons + '</div></div>';
}

function _dashPainelHoje(D){
  const h = D.hoje;
  const prox = h.agenda.findIndex(a => !a.done);
  const ag = h.agenda.length ? h.agenda.map((a, i) =>
    '<div class="dp-ag' + (a.done ? ' done' : '') + '"><span class="dp-ag-h">' + escHTML(a.hora) + '</span>' +
    '<div class="dp-ag-b' + (i === prox ? ' now' : '') + '"><div class="dp-ag-t">' + escHTML(a.titulo) + '</div>' + (a.quem ? '<div class="dp-s">' + escHTML(a.quem) + '</div>' : '') + '</div>' +
    '<span class="dp-ag-l">' + (a.done ? 'concluída' : i === prox ? 'próxima' : '') + '</span></div>').join('')
    : '<div class="dp-vazio dp-vazio-s"><i class=ph-check-circle></i>Nada agendado para hoje</div>';
  const tar = h.tarefas.length ? h.tarefas.map(t =>
    '<div class="dp-tar" role="button" tabindex="0" onclick="dashTarefa(' + t.id + ')"><span class="dp-cb"><i class=ph-check></i></span>' +
    '<div class="dp-tar-b"><div class="dp-tar-t">' + escHTML(t.titulo) + '</div>' + (t.quem ? '<div class="dp-s">' + escHTML(t.quem) + '</div>' : '') + '</div>' +
    _dashChipHTML(t.tom, t.due) + '</div>').join('')
    : '<div class="dp-vazio dp-vazio-s"><i class=ph-check-circle></i>Nenhuma tarefa aberta</div>';
  return '<h3>Hoje</h3><p class="dp-p">Agenda do dia e tarefas soltas do CRM (o ciclo de treino tem área própria)</p>' +
    '<div class="dp-2col"><div class="dp-box"><div class="dp-box-h"><b>Agenda</b><a href="#" onclick="dashAbrirAgenda();return false">Abrir agenda</a></div>' + ag + '</div>' +
    '<div class="dp-box"><div class="dp-box-h"><b>Tarefas · ' + h.tarefas.length + ' abertas</b></div>' + tar + '</div></div>';
}

function _dashRenderPainel(animar){
  const el = document.getElementById('dp-main'); if(!el || !window._dashD) return;
  const D = window._dashD, a = window._dashArea;
  const html = a === 'fin' ? _dashPainelFin(D) : a === 'hoje' ? _dashPainelHoje(D) : _dashPainelCiclo(D);
  if(animar){
    el.classList.add('fade-out');
    requestAnimationFrame(() => requestAnimationFrame(() => { el.innerHTML = html; el.classList.remove('fade-out'); }));
  } else el.innerHTML = html;
}

function _dashStatHTML(k, ic, rotulo, curto, n, sub, tomN){
  return '<button type="button" class="dp-stat' + (window._dashArea === k ? ' on' : '') + '" data-area="' + k + '" onclick="dashTrocarArea(\'' + k + '\')">' +
    '<span class="dp-stat-l"><span class="dp-stat-ic"><i class=' + ic + '></i></span><span class="dp-l-full">' + rotulo + '</span><span class="dp-l-short">' + curto + '</span></span>' +
    '<span class="dp-stat-n' + (tomN ? ' tom-' + tomN + '-t' : '') + '">' + n + '</span><span class="dp-stat-s">' + sub + '</span></button>';
}

function renderDashboard(){
  const el = document.getElementById('dash-conteudo'); if(!el) return;
  try{ waGarantirModelos(); }catch(e){}

  const rows = dashLinhasCiclo();
  const fin = { disponivel:!!FinanceiroAdapter.disponivel, pag:[], con:[] };
  if(fin.disponivel){ try{ fin.pag = FinanceiroAdapter.listarPagamentosVencidos(); fin.con = FinanceiroAdapter.listarContratos(); }catch(e){} }
  const D = window._dashD = { rows, fin, hoje:dashHoje(), saude:dashSaude() };
  const cont = k => rows.filter(r => r.etapa === k).length;
  const hojeN = D.hoje.agenda.length + D.hoje.tarefas.length;
  const sa = D.saude;

  const tendencia = sa.liquido > 0 ? ['ph-trend-up', '+' + sa.liquido] : sa.liquido < 0 ? ['ph-trend-down', '−' + Math.abs(sa.liquido)] : ['ph-equals', '0'];
  const saude = '<div class="dp-stat dp-saude"><span class="dp-stat-l"><span class="dp-stat-ic"><i class=ph-users></i></span><span>Alunos ativos</span></span>' +
    '<span class="dp-stat-n">' + sa.ativos + '<b class="' + (sa.liquido < 0 ? 'neg' : '') + '"><i class=' + tendencia[0] + '></i>' + tendencia[1] + ' em 30 dias</b></span>' +
    '<span class="dp-stat-s"><span class="pos">+' + sa.entradas + '</span> entradas<span class="sep">·</span><span class="neg">−' + sa.saidas + '</span> saídas</span></div>';

  const finN = fin.disponivel ? (window.innerWidth < 768 ? String(fin.pag.length + fin.con.length) : _dashMoney(fin.pag.reduce((s, p) => s + Number(p.valor || 0), 0))) : '—';
  const finSub = fin.disponivel ? fin.pag.length + ' pagamentos · ' + fin.con.length + ' contratos' : 'Em breve';
  const stats =
    _dashStatHTML('ciclo', 'ph-heartbeat', 'Avaliação e treino', 'Treino', rows.length, cont('avaliar') + ' avaliar · ' + cont('prescrever') + ' prescrever · ' + (cont('vencendo') + cont('vencido')) + ' treino') +
    _dashStatHTML('fin', 'ph-money', 'Financeiro', 'Financeiro', finN, finSub, fin.disponivel && fin.pag.length ? 'red' : '') +
    _dashStatHTML('hoje', 'ph-calendar-check', 'Hoje', 'Hoje', hojeN, D.hoje.agenda.length + ' agendamentos · ' + D.hoje.tarefas.length + ' tarefas');

  const passos = _dashPassos();
  const feitos = passos.filter(p => p.done).length;
  let lateral = '';
  if(passos.length && feitos < passos.length){
    lateral += '<div class="dp-card dp-passos"><div class="dp-card-h"><b>Primeiros passos</b><span>' + feitos + ' de ' + passos.length + '</span></div>' +
      '<div class="dp-prog"><i style="width:' + Math.round(feitos / passos.length * 100) + '%"></i></div>' +
      passos.map(p => '<div class="dp-passo' + (p.done ? ' done' : '') + '" role="button" tabindex="0"' + (p.done ? '' : ' onclick="' + p.go + '"') + '>' +
        '<span class="dp-passo-ic"><i class=' + (p.done ? 'ph-check-circle' : p.ic) + '></i></span>' +
        '<div class="dp-passo-b"><b>' + p.t + '</b><small>' + p.s + '</small></div><i class="ph-caret-right"></i></div>').join('') + '</div>';
  } else if(passos.length && _dashLS('fitcpx-dash-welcome-off') !== '1'){
    lateral += '<div class="dp-welcome"><div class="dp-welcome-h"><i class=ph-confetti></i><button type="button" onclick="dashDispensarBoasVindas()" aria-label="Dispensar"><i class=ph-x></i></button></div>' +
      '<b>Tudo configurado!</b><p>Seu espaço está pronto. Os fluxos já estão cuidando dos prazos por você.</p></div>';
  }
  let nWa = 0; try{ nWa = waPendentes().length; }catch(e){}
  if(nWa){
    lateral += '<div class="dp-card"><div class="dp-card-h"><b>Mensagens a enviar</b><span>' + nWa + '</span></div>' +
      '<div class="dp-passo" role="button" tabindex="0" onclick="waAbrirFila()"><span class="dp-passo-ic"><i class=ph-whatsapp-logo></i></span>' +
      '<div class="dp-passo-b"><b>' + nWa + (nWa === 1 ? ' mensagem pronta' : ' mensagens prontas') + '</b><small>Abra a fila e envie pelo WhatsApp</small></div><i class="ph-caret-right"></i></div></div>';
  }
  const ativ = dashAtividades();
  lateral +='<div class="dp-card dp-ativ"><div class="dp-card-h"><b>Últimas atividades</b></div>' +
    (ativ.length ? ativ.map(a => '<div class="dp-at' + (a.novo ? ' novo' : '') + '"><span class="dp-at-ic"><i class=' + a.ic + '></i></span>' +
      '<div class="dp-at-b"><b>' + escHTML(a.nome) + '</b><small>' + escHTML(a.what) + ' · ' + a.quando + '</small></div></div>').join('')
      : '<div class="dp-vazio dp-vazio-s"><i class=ph-clock></i>Nada por aqui ainda</div>') + '</div>';

  el.innerHTML = '<div class="dp">' +
    '<div class="dp-head"><div class="dp-hello"><h2>' + escHTML(_dashSaudacao()) + '</h2><p>' + _dashDataExtenso() + '</p></div>' +
      '<div class="dp-acts">' + DASH_ACOES.map(a => _dashAcaoHTML(a, false)).join('') + '</div>' + shellFerramentasHTML() + '</div>' +
    '<div class="dp-tiles">' + DASH_ACOES.map(a => _dashAcaoHTML(a, true)).join('') + '</div>' +
    '<div class="dp-over">' + saude + stats + '</div>' +
    '<div class="dp-grid"><section class="dp-panel" id="dp-main"></section><aside class="dp-side">' + lateral + '</aside></div>' +
    '<div class="dp-backdrop" onclick="dashFecharMenus()"></div></div>';

  _dashRenderPainel(false);
  try{ financeiroAtualizarBadge(); shellAtualizarSino(); }catch(e){}
}
