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
const DASH_PRAZO_PADRAO_SEMANAS = 12;

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
      venc.setDate(venc.getDate() + DASH_PRAZO_PADRAO_SEMANAS * 7);
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

  const bucket = dias < 0 ? 'vencido' : dias <= 7 ? 'proximo' : dias <= 14 ? 'agendar' : 'ok';
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

// ── Tela ──────────────────────────────────────────────────────────────────
// Painel único, fundido com o CRM de prazos trazido do FitCPX Flow (ver
// ESTRATEGIA-MERGE.md). Ordem: saudação → banner de tarefa CRM vencida →
// faixa de números (treino + CRM) → onboarding (some quando concluído) →
// duas colunas (pendência de treino | tarefas do CRM) → pipeline por
// categoria → ações rápidas. Cada bloco lê sua própria fonte (students[]
// para treino, DB.tasks para CRM) sem inventar estado paralelo.
// Visual: classes .dash-* / .kpi* em css/app.css (nada de estilo inline aqui).

const _DASH_SECOES = [
  { chave:'vencido',     titulo:'Treino vencido',        icone:'ph-warning-circle', cor:'var(--red)',
    chip:'badge-red',   vazio:'Nenhum treino vencido.' },
  { chave:'proximo',     titulo:'Vence esta semana',     icone:'ph-clock',          cor:'var(--amber)',
    chip:'badge-amber', vazio:'Nada vencendo nos próximos 7 dias.' },
  { chave:'agendar',     titulo:'Agendar reavaliação',   icone:'ph-calendar-check', cor:'var(--amber)',
    chip:'badge-amber', vazio:'Nada para agendar nas próximas 2 semanas.' },
  { chave:'sem-treino',  titulo:'Sem treino',            icone:'ph-barbell',        cor:'var(--blue)',
    chip:'badge-blue',  vazio:'Todo aluno tem treino.' },
  { chave:'sem-data',    titulo:'Treino sem data',       icone:'ph-question',       cor:'var(--text3)',
    chip:'badge-gray',  vazio:'' },
];

// Etiqueta curta do prazo, no lado direito da linha.
function _dashChip(c, sec){
  let txt = '';
  if(c.bucket === 'vencido')       txt = 'há ' + Math.abs(c.dias) + ' d';
  else if(c.bucket === 'proximo' || c.bucket === 'agendar') txt = c.dias === 0 ? 'hoje' : 'em ' + c.dias + ' d';
  else if(c.bucket === 'sem-treino') txt = c.temAvaliacao ? 'avaliado' : 'avaliar';
  else txt = 'conferir';
  return '<span class="badge ' + sec.chip + '">' + txt + '</span>';
}

function _dashLinhaAluno(c, sec){
  return '<div onclick="dashAbrirAluno(' + c.id + ')" class="dash-linha" role="button" tabindex="0">' +
      '<span class="dash-nome">' + escHTML(c.nome) + '</span>' +
      '<span class="dash-det">' + escHTML(c.detalhe) + '</span>' +
      _dashChip(c, sec) +
      '<i class="ph-caret-right dash-go"></i>' +
    '</div>';
}

function dashAbrirAluno(id){
  if(typeof selectStudent === 'function') selectStudent(id);
}

function dashIrPara(chave){
  const alvo = document.getElementById('dash-sec-' + chave);
  if(alvo) alvo.scrollIntoView({ behavior:'smooth', block:'start' });
}

// Fonte CRM disponível? (js/crm-store.js carrega antes de dashboard.js, mas
// o check protege contra chamada precoce/erro de carga.)
function _dashTemCrm(){ return typeof DB !== 'undefined' && Array.isArray(DB.tasks); }

function _dashSaudacao(){
  const studio = (_dashTemCrm() && DB.config && DB.config.studioName) || 'FitCPX Lite';
  const personalRaw = (_dashTemCrm() && DB.config && DB.config.personalName) || '';
  const personal = personalRaw ? ', ' + personalRaw.split(' ')[0] : '';
  return '<p class="dash-hello">Olá' + escHTML(personal) + '. Aqui está o que precisa de atenção em <strong>' + escHTML(studio) + '</strong>.</p>';
}

function _dashBannerCrm(){
  if(!_dashTemCrm()) return '';
  const hoje = todayStr();
  const vencidas = DB.tasks.filter(t => taskVisible(t) && !t.done && diffDays(liveDate(t), hoje) < 0);
  if(!vencidas.length) return '';
  return '<div class="dash-banner">' +
    '<i class="ph-siren"></i>' +
    '<span>' + vencidas.length + ' tarefa' + (vencidas.length===1?'':'s') + ' do CRM vencida' + (vencidas.length===1?'':'s') + '. Ação necessária.</span>' +
    '<button class="btn btn-primary btn-sm" onclick="navGo(\'agenda\')">Resolver agora</button>' +
    '</div>';
}

function _dashKpi(icone, label, valor, tom, onclick){
  const cls = valor === 0 ? 'is-zero' : (tom ? 'is-' + tom : '');
  return '<button class="kpi" onclick="' + onclick + '">' +
    '<span class="kpi-label"><i class="' + icone + '"></i>' + label + '</span>' +
    '<span class="kpi-num ' + cls + '">' + valor + '</span>' +
    '</button>';
}

function _dashStatsBar(g){
  const total = (typeof students !== 'undefined') ? students.length : 0;
  const ativos = (typeof students !== 'undefined')
    ? students.filter(s => {
        const crm = s.crm || {};
        return !crm.archived && crm.status !== 'pausado' && crm.status !== 'inativo';
      }).length
    : total;
  const treinoVencido = g.vencido.length;

  let crmVencidas = 0, crmHojeUrg = 0;
  if(_dashTemCrm()){
    const hoje = todayStr();
    crmVencidas = DB.tasks.filter(t => taskVisible(t) && !t.done && diffDays(liveDate(t), hoje) < 0).length;
    crmHojeUrg = DB.tasks.filter(t => {
      if(!taskVisible(t) || t.done) return false;
      const d = diffDays(liveDate(t), hoje);
      return d === 0 || (d > 0 && d <= taskUrgDays(t) && t.tipo === 'prazo');
    }).length;
  }

  return '<div class="kpis">' +
    _dashKpi('ph-users', 'Alunos ativos', ativos, '', "navGo('alunos')") +
    _dashKpi('ph-warning-circle', 'Treino vencido', treinoVencido, 'red', "dashIrPara('vencido')") +
    _dashKpi('ph-alarm', 'Tarefas CRM vencidas', crmVencidas, 'red', "navGo('agenda')") +
    _dashKpi('ph-push-pin', 'Hoje e urgentes', crmHojeUrg, 'amber', "navGo('agenda')") +
    '</div>';
}

function _dashOnboarding(){
  if(!_dashTemCrm()) return '';
  const hasConfig = !!(DB.config && (DB.config.personalName || (DB.config.studioName && DB.config.studioName !== 'FitCPX Lite')));
  const hasFluxo = DB.fluxos.filter(f => !f.archived).length > 0;
  const lista = (typeof students !== 'undefined') ? students : [];
  const hasCrmAluno = lista.some(s => s.crm && s.crm.fluxos && s.crm.fluxos.length);

  const steps = [
    { done:hasConfig,   titulo:'Configure seu perfil',          sub:'Nome do personal, do estúdio, WhatsApp e prazo de urgência padrão.',                onclick:"navGo('config')" },
    { done:hasFluxo,    titulo:'Crie um fluxo de trabalho',     sub:'Defina etapas e prazos: o fluxo gera as tarefas automaticamente.',                   onclick:"navGo('fluxos')" },
    { done:hasCrmAluno, titulo:'Vincule um fluxo a um aluno',   sub:'Na ficha do aluno, associe uma modalidade ou fluxo para as tarefas começarem a nascer.', onclick:"navGo('alunos')" },
    { done:hasCrmAluno, titulo:'Acompanhe pelo Pipeline',       sub:'Veja todos os alunos por categoria de prazo e mova entre etapas.',                   onclick:"navGo('pipeline')" },
  ];
  if(steps.every(s => s.done)) return '';

  const itens = steps.map((s, i) => {
    const num = s.done ? '<i class="ph-check"></i>' : (i + 1);
    return '<div class="dash-step' + (s.done ? ' done' : '') + '">' +
      '<span class="dash-step-n">' + num + '</span>' +
      '<div style="flex:1;min-width:0">' +
        '<div class="dash-step-t">' + escHTML(s.titulo) + '</div>' +
        (s.done ? '' : '<div class="dash-step-s">' + escHTML(s.sub) + '</div>') +
      '</div>' +
      (s.done ? '' : '<button class="btn btn-ghost btn-sm" onclick="' + s.onclick + '">Abrir</button>') +
      '</div>';
  }).join('');

  return '<div class="dash-steps"><div class="dash-steps-h">Primeiros passos</div>' + itens + '</div>';
}

function _dashColunaTreino(g){
  const pend = g.vencido.length + g.proximo.length + g.agendar.length + g['sem-treino'].length + g['sem-data'].length;
  let html = '<div><div class="dash-h"><h3>Treino</h3></div>';

  if(pend === 0){
    html += '<div class="dash-ok"><i class="ph-check-circle"></i>Todos os treinos estão em dia.</div>';
  } else {
    _DASH_SECOES.forEach(sec => {
      const itens = g[sec.chave];
      if(!itens.length) return;
      html += '<div id="dash-sec-' + sec.chave + '" class="dash-sec">' +
        '<div class="dash-sec-h">' +
          '<i class="' + sec.icone + '" style="color:' + sec.cor + ';font-size:16px"></i>' +
          '<span>' + sec.titulo + '</span>' +
          '<span class="n">' + itens.length + '</span>' +
        '</div>' +
        '<div class="dash-list">' + itens.map(c => _dashLinhaAluno(c, sec)).join('') + '</div></div>';
    });
  }
  html += '</div>';
  return html;
}

function _dashColunaCrm(){
  if(!_dashTemCrm()) return '<div></div>';
  const hoje = todayStr();
  const allPending = DB.tasks.filter(t => taskVisible(t) && !t.done);
  const overdue = allPending.filter(t => diffDays(liveDate(t), hoje) < 0);
  const todayT = allPending.filter(t => liveDate(t) === hoje);
  const urgentT = allPending.filter(t => {
    const d = diffDays(liveDate(t), hoje);
    return d >= 0 && d <= taskUrgDays(t) && t.tipo === 'prazo';
  });

  const filtro = window._dashCrmFiltro || 'urgente';
  let lista;
  if(filtro === 'urgente'){
    lista = [...overdue, ...todayT, ...urgentT.filter(t => !todayT.find(x => x.id === t.id))];
  } else if(filtro === '7d'){
    lista = allPending.filter(t => { const d = diffDays(liveDate(t), hoje); return d > 0 && d <= 7; });
  } else if(filtro === '30d'){
    lista = allPending.filter(t => { const d = diffDays(liveDate(t), hoje); return d > 0 && d <= 30; });
  } else {
    lista = allPending;
  }
  lista = lista.sort((a, b) => liveDate(a).localeCompare(liveDate(b))).slice(0, 30);
  const merged = mergeTasks(lista);

  const filtros = [['urgente','Urgentes'], ['7d','7 dias'], ['30d','30 dias'], ['all','Todas']]
    .map(([v, l]) => '<button class="btn btn-xs ' + (filtro===v?'btn-primary':'btn-ghost') +
      '" onclick="window._dashCrmFiltro=\'' + v + '\';renderDashboard()">' + l + '</button>').join('');

  const corpo = merged.length ? merged.map(m => taskCardHTML(m)).join('') :
    '<div class="empty" style="padding:32px 16px"><i class="ph-check-circle"></i><div class="empty-title">Nada pendente neste filtro</div></div>';

  return '<div>' +
    '<div class="dash-h"><h3>Tarefas do CRM</h3><div style="display:flex;gap:4px">' + filtros + '</div></div>' +
    '<div style="max-height:520px;overflow-y:auto">' + corpo + '</div>' +
    '</div>';
}

function _dashPipelineResumo(){
  if(!_dashTemCrm()) return '';
  const catDefs = getCatDefs();
  const lista = (typeof students !== 'undefined') ? students : [];
  const pausedIds = new Set(lista.filter(a => a.crm && (a.crm.archived || a.crm.status === 'pausado' || a.crm.status === 'inativo')).map(a => a.id));
  const allVisible = DB.tasks.filter(t => !pausedIds.has(t.alunoId) && !t.done);

  const defaultOrder = catDefs.map(c => c.id);
  const pipeOrder = (DB.dashPipeOrder && DB.dashPipeOrder.length) ? DB.dashPipeOrder
                   : (DB.pipeOrder && DB.pipeOrder.length) ? DB.pipeOrder : defaultOrder;
  const usedCats = [...new Set(allVisible.map(t => t.cat))];
  const orderedCats = [...pipeOrder.filter(id => usedCats.includes(id)), ...usedCats.filter(id => !pipeOrder.includes(id))];

  const cols = orderedCats.map(cat => {
    const def = catDefs.find(c => c.id === cat) || { label:catLabel(cat), icon:catIcon(cat), color:'#6b7280' };
    const tasks = allVisible.filter(t => t.cat === cat).sort((a, b) => liveDate(a).localeCompare(liveDate(b)));
    if(!tasks.length) return '';
    const byAluno = {};
    tasks.forEach(t => { (byAluno[t.alunoId] = byAluno[t.alunoId] || []).push(t); });
    let idx = 0;
    const cards = Object.entries(byAluno).map(([alunoId, aTasks]) => {
      const al = findAluno(Number(alunoId)); if(!al) return '';
      return mergeTasks(aTasks).map(m => {
        const ids = m.tasks.map(t => t.id).join(',');
        const card = buildPipeCard(m, 'dash', al, "toggleTaskDoneMany('" + ids + "')", "toggleTaskDoneMany('" + ids + "')");
        return idx++ >= 3 ? '' : card;
      }).join('');
    }).join('');
    return '<div class="pipe-col">' +
      '<div class="pipe-col-h">' +
        '<span class="pipe-col-t"><span style="color:' + def.color + '">' + icHTML(def.icon) + '</span>' + escHTML(def.label) + '</span>' +
        '<span class="badge badge-gray">' + tasks.length + '</span>' +
      '</div>' +
      '<div class="pipe-col-b">' + cards + '</div></div>';
  }).join('');

  return '<div style="margin-top:32px">' +
    '<div class="dash-h"><h3>Pipeline por categoria</h3>' +
      '<button class="btn btn-ghost btn-sm" onclick="navGo(\'pipeline\')">Ver completo<i class="ph-arrow-right"></i></button>' +
    '</div>' +
    '<div class="pipe-scroll">' +
      (cols || '<div class="empty" style="padding:24px 16px;flex:1"><div class="empty-title">Sem tarefas pendentes</div></div>') +
    '</div></div>';
}

function _dashAcoesRapidas(){
  const novoAluno = (typeof abrirNovoAluno === 'function') ? 'abrirNovoAluno()' : "navGo('alunos')";
  return '<div class="dash-quick">' +
    '<button class="btn btn-primary" onclick="' + novoAluno + '"><i class="ph-plus"></i>Novo aluno</button>' +
    '<button class="btn btn-ghost" onclick="navGo(\'agenda\')"><i class="ph-calendar-blank"></i>Agenda</button>' +
    '<button class="btn btn-ghost" onclick="navGo(\'pipeline\')"><i class="ph-kanban"></i>Pipeline</button>' +
    '<button class="btn btn-ghost" onclick="navGo(\'fluxos\')"><i class="ph-flow-arrow"></i>Fluxos</button>' +
    '</div>';
}

function renderDashboard(){
  const el = document.getElementById('dash-conteudo');
  if(!el) return;

  if(typeof renderDashPortalLinks==='function') renderDashPortalLinks();

  const g = dashLevantarPendencias();

  let html = '';
  html += _dashSaudacao();
  html += _dashBannerCrm();
  html += _dashStatsBar(g);
  html += _dashOnboarding();

  html += '<div class="dash-grid">' +
    _dashColunaTreino(g) +
    _dashColunaCrm() +
    '</div>';

  html += _dashPipelineResumo();
  html += _dashAcoesRapidas();

  html += '<p class="dash-foot">' +
    'O prazo de treino é o de cada ficha (<span class="mono">prazoSemanas</span>, ' +
    'padrão ' + DASH_PRAZO_PADRAO_SEMANAS + ' semanas), definido na aprovação. ' +
    'O prazo de CRM é o da categoria ou fluxo vinculado ao aluno.' +
    '</p>';

  el.innerHTML = html;
}
