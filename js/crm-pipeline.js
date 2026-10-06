// ══════════════════════════════════════════════════════════════════════════
// CRM — PIPELINE (KANBAN POR CATEGORIA) (extraído do FitCPX Flow)
// ══════════════════════════════════════════════════════════════════════════
// Simplificação: reordenação de colunas por botões ↑/↓ (poMove), sem
// HTML5 drag-and-drop (poDragStart/poDragOver/poDrop do Flow) — mesmo
// resultado final com bem menos código e sem os problemas de D&D em touch.
// Sem pipeline específica do Dashboard (o Lite não tem uma tela de dashboard
// do CRM — Auto já tem a sua própria em js/dashboard.js).

function buildPipeCard(m, ctx, al, actionDone, actionUndo){
  const t0=m.tasks[0];
  const blocked=isTaskBlocked(t0);
  const dl=dateLabelOf(t0);
  const allDone=m.tasks.every(t=>t.done);
  const mod=DB.modalidades.find(md=>md.id===al.crm?.modId);
  const fluxoSrcs=(!t0.manual)?m.tasks.map(t=>{
    const af=(al.crm?.fluxos||[]).find(af=>af.tasks&&af.tasks.includes(t.id));
    return af?DB.fluxos.find(f=>f.id===af.id):null;
  }).filter(Boolean):[];
  const uniqFluxos=[...new Map(fluxoSrcs.map(f=>[f.id,f])).values()];
  const clientLine = ctx!=='aluno' ? `<button class="pcard-cli" onclick="navAlunoCrm(${al.id})">${escHTML(displayName(al))}</button>` : '';
  const modLine = t0.manual ? `<div class="pcard-sub"><i class=ph-note-pencil></i>Entrada manual</div>` : (mod?`<div class="pcard-sub">${icHTML(mod.icon)}${escHTML(mod.nome)}</div>`:'');
  const fluxoLine = uniqFluxos.length ? `<div class="pcard-sub">${uniqFluxos.map(f=>icHTML(f.icon||'ph-gear')+' '+escHTML(f.nome)).join(', ')}</div>` : '';
  let actionBtn;
  if(blocked) actionBtn=`<span class="badge badge-gray"><i class=ph-lock></i></span>`;
  else if(allDone) actionBtn=`<button class="icon-btn" onclick="${actionUndo}" title="Reabrir" aria-label="Reabrir"><i class=ph-arrow-u-up-left></i></button>`;
  else actionBtn=`<button class="btn btn-primary btn-xs" onclick="${actionDone}">${t0.tipo==='prazo'?'<i class=ph-check></i>Feito':'<i class=ph-eye></i>Visto'}</button>`;
  const waBtn=`<button class="icon-btn" onclick="openWA(${al.id})" title="WhatsApp" aria-label="WhatsApp"><i class=ph-chat-circle-text></i></button>`;
  const reschedBtn=(!allDone&&!blocked)?`<button class="icon-btn" onclick="event.stopPropagation();openReschedule('${m.tasks.map(t=>t.id).join(',')}')" title="Reagendar" aria-label="Reagendar"><i class=ph-calendar-blank></i></button>`:'';
  return `<div class="pcard${allDone?' done':''}">
    ${clientLine}${modLine}${fluxoLine}
    <div class="pcard-title">${escHTML(m.titulo)}</div>
    <div class="pcard-foot">
      <span class="due due-${dl.cls||'ok'}">${dl.text}</span>
      <div class="pcard-act">${reschedBtn}${waBtn}${actionBtn}</div>
    </div>
  </div>`;
}
const _pipeColFilters={};
function getPipeColFilter(cat){ return _pipeColFilters[cat]||{urgent:false,sortDir:'asc'}; }
function togglePipeColUrgent(cat){ const f=getPipeColFilter(cat); _pipeColFilters[cat]={...f,urgent:!f.urgent}; renderPipelineCRM(); }
function togglePipeColSort(cat){ const f=getPipeColFilter(cat); _pipeColFilters[cat]={...f,sortDir:f.sortDir==='asc'?'desc':'asc'}; renderPipelineCRM(); }

let crmPipelineView='kanban'; // 'kanban' | 'lista'
function renderPipelineCRM(){
  const el=$('screen-pipeline-body'); if(!el) return;
  const tabsHtml=`<div class="seg" style="margin-bottom:16px">
    <button class="seg-btn${crmPipelineView==='kanban'?' active':''}" onclick="crmPipelineView='kanban';renderPipelineCRM()"><i class=ph-kanban></i>Kanban</button>
    <button class="seg-btn${crmPipelineView==='lista'?' active':''}" onclick="crmPipelineView='lista';renderPipelineCRM()"><i class=ph-list-bullets></i>Lista de clientes</button>
  </div>`;
  if(crmPipelineView==='lista'){ el.innerHTML = tabsHtml + alunoListAreaHTML(); return; }
  el.innerHTML = tabsHtml + '<div id="pipeline-kanban-area"></div>';
  _renderPipelineKanban();
}
function _renderPipelineKanban(){
  const el=$('pipeline-kanban-area'); if(!el) return;
  const today=todayStr(); const catDefs=getCatDefs();
  const pausedIds=new Set(students.filter(a=>a.crm?.archived||a.crm?.status==='pausado'||a.crm?.status==='inativo').map(a=>a.id));
  const allVisible=DB.tasks.filter(t=>!pausedIds.has(t.alunoId)&&(!t.done||(t.done&&t.doneDate===today)));
  const defaultOrder=catDefs.map(c=>c.id);
  const pipeOrder=(DB.pipeOrder&&DB.pipeOrder.length)?DB.pipeOrder:defaultOrder;
  const usedCats=[...new Set(allVisible.map(t=>t.cat))];
  const orderedCats=[...pipeOrder.filter(id=>usedCats.includes(id)), ...usedCats.filter(id=>!pipeOrder.includes(id))];

  const cols=orderedCats.map(cat=>{
    const def=catDefs.find(c=>c.id===cat)||{label:catLabel(cat),icon:catIcon(cat),color:'#6b7280'};
    const colFilter=getPipeColFilter(cat);
    let tasks=allVisible.filter(t=>t.cat===cat);
    if(colFilter.urgent) tasks=tasks.filter(t=>!t.done&&(diffDays(liveDate(t),today)<0||(diffDays(liveDate(t),today)<=taskUrgDays(t)&&t.tipo==='prazo')));
    tasks=tasks.sort((a,b)=>colFilter.sortDir==='asc'?liveDate(a).localeCompare(liveDate(b)):liveDate(b).localeCompare(liveDate(a)));
    const pendingCnt=tasks.filter(t=>!t.done).length;
    const overdueCnt=tasks.filter(t=>!t.done&&diffDays(liveDate(t),today)<0).length;
    const byAluno={};
    tasks.forEach(t=>{ (byAluno[t.alunoId]=byAluno[t.alunoId]||[]).push(t); });
    const cards=Object.entries(byAluno).map(([alunoId,aTasks])=>{
      const al=findAluno(Number(alunoId)); if(!al) return '';
      return mergeTasks(aTasks).map(m=>{
        const ids=m.tasks.map(t=>t.id).join(',');
        return buildPipeCard(m,'global',al,`toggleTaskDoneMany('${ids}')`,`toggleTaskDoneMany('${ids}')`);
      }).join('');
    }).join('');
    return `<div class="pipe-col">
      <div class="pipe-col-h">
        <span class="pipe-col-t"><span style="color:${def.color}">${icHTML(def.icon)}</span>${escHTML(def.label)}</span>
        <div class="pipe-col-tools">
          ${overdueCnt>0?`<span class="pipe-late"><i class=ph-warning></i>${overdueCnt}</span>`:''}
          <span class="badge badge-gray">${pendingCnt}</span>
          <button class="icon-btn" onclick="togglePipeColSort(${cat})" title="Ordenar" aria-label="Ordenar"><i class="${colFilter.sortDir==='asc'?'ph-sort-ascending':'ph-sort-descending'}"></i></button>
          <button class="icon-btn${colFilter.urgent?' on':''}" onclick="togglePipeColUrgent(${cat})" title="Só urgentes" aria-label="Só urgentes"><i class=ph-siren></i></button>
        </div>
      </div>
      <div class="pipe-col-b tall">
        ${cards||`<div class="pipe-empty">${colFilter.urgent?'Sem urgentes':'Sem pendências'}</div>`}
      </div>
    </div>`;
  }).join('');

  el.innerHTML = `<div class="dash-h">
      <div class="page-sub" style="margin:0">Tarefas por categoria de prazo</div>
      <button class="btn btn-ghost btn-sm" onclick="openGlobalPipeOrderModal()"><i class=ph-arrows-down-up></i>Ordem das colunas</button>
    </div>
    <div class="pipe-scroll">${cols||'<div class="empty" style="flex:1"><i class=ph-kanban></i><div class="empty-title">Sem tarefas pendentes</div><div class="empty-text">As tarefas nascem dos fluxos vinculados aos alunos.</div></div>'}</div>`;
}

/* ── ORDEM GLOBAL DA PIPELINE ────────────────────────────────────────────── */
let _globalPipeOrderTmp=[];
function openGlobalPipeOrderModal(){
  const catDefs=getCatDefs(); const defaultOrder=catDefs.map(c=>c.id);
  _globalPipeOrderTmp=[...(DB.pipeOrder&&DB.pipeOrder.length?DB.pipeOrder:defaultOrder)];
  defaultOrder.filter(id=>!_globalPipeOrderTmp.includes(id)).forEach(id=>_globalPipeOrderTmp.push(id));
  renderGlobalPipeOrderList(); crmOpenModal('m-crm-pipe-order');
}
function renderGlobalPipeOrderList(){
  const catDefs=getCatDefs(); const list=$('global-pipe-order-list'); if(!list) return;
  list.innerHTML=_globalPipeOrderTmp.map((cid,i)=>{
    const c=catDefs.find(x=>x.id===cid)||{label:catLabel(cid),icon:catIcon(cid)};
    return `<div class="order-row">
      <span class="order-ic">${icHTML(c.icon)}</span><span class="order-t">${escHTML(c.label)}</span>
      <button class="icon-btn" onclick="poMove(${i},-1)" ${i===0?'disabled':''} aria-label="Subir"><i class=ph-arrow-up></i></button>
      <button class="icon-btn" onclick="poMove(${i},1)" ${i===_globalPipeOrderTmp.length-1?'disabled':''} aria-label="Descer"><i class=ph-arrow-down></i></button>
    </div>`;
  }).join('');
}
function poMove(i,dir){
  const j=i+dir; if(j<0||j>=_globalPipeOrderTmp.length) return;
  [_globalPipeOrderTmp[i],_globalPipeOrderTmp[j]]=[_globalPipeOrderTmp[j],_globalPipeOrderTmp[i]];
  renderGlobalPipeOrderList();
}
function saveGlobalPipeOrder(){ DB.pipeOrder=[..._globalPipeOrderTmp]; crmSave(); crmCloseModal('m-crm-pipe-order'); renderPipelineCRM(); crmToast('Ordem salva'); }
function resetGlobalPipeOrder(){ _globalPipeOrderTmp=getCatDefs().map(c=>c.id); renderGlobalPipeOrderList(); }

/* ── ORDEM DA PIPELINE POR ALUNO (usada na página do aluno) ─────────────── */
let _pipeOrderAlunoId=null, _pipeOrderTmp=[];
function openPipeOrderModal(id){
  const al=findAluno(id); if(!al) return;
  const crm=ensureCrm(al);
  _pipeOrderAlunoId=id;
  const catDefs=getCatDefs(); const globalOrder=catDefs.map(c=>c.id);
  const presentCatIds=[...new Set(getAlunoTasks(id).map(t=>t.cat))];
  const curOrder=crm.pipeOrder||globalOrder;
  _pipeOrderTmp=[...curOrder.filter(cid=>presentCatIds.includes(cid)), ...presentCatIds.filter(cid=>!curOrder.includes(cid))];
  renderPipeOrderList(); crmOpenModal('m-crm-pipe-order-aluno');
}
function renderPipeOrderList(){
  const catDefs=getCatDefs(); const list=$('pipe-order-list'); if(!list) return;
  list.innerHTML=_pipeOrderTmp.map((cid,i)=>{
    const cat=catDefs.find(c=>c.id===cid)||{label:catLabel(cid),icon:catIcon(cid)};
    return `<div class="order-row">
      <span class="order-ic">${icHTML(cat.icon)}</span><span class="order-t">${escHTML(cat.label)}</span>
      <button class="icon-btn" onclick="poAlunoMove(${i},-1)" ${i===0?'disabled':''} aria-label="Subir"><i class=ph-arrow-up></i></button>
      <button class="icon-btn" onclick="poAlunoMove(${i},1)" ${i===_pipeOrderTmp.length-1?'disabled':''} aria-label="Descer"><i class=ph-arrow-down></i></button>
    </div>`;
  }).join('');
}
function poAlunoMove(i,dir){ const j=i+dir; if(j<0||j>=_pipeOrderTmp.length) return; [_pipeOrderTmp[i],_pipeOrderTmp[j]]=[_pipeOrderTmp[j],_pipeOrderTmp[i]]; renderPipeOrderList(); }
function savePipeOrder(){
  const al=findAluno(_pipeOrderAlunoId); if(!al) return;
  ensureCrm(al).pipeOrder=[..._pipeOrderTmp];
  crmSave(); crmCloseModal('m-crm-pipe-order-aluno'); navAlunoCrm(_pipeOrderAlunoId); crmToast('Ordem da pipeline salva');
}
