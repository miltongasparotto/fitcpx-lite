// ══════════════════════════════════════════════════════════════════════════
// CRM — TAREFAS E AGENDA (extraído do FitCPX Flow)
// ══════════════════════════════════════════════════════════════════════════
// 3 visualizações: lista por filtro (hoje/7d/30d/um dia), calendário mensal
// e o painel do dia (mesmo componente, filtro 'dia'). Simplificação: sem o
// formulário inline de "nova tarefa"/"atribuir fluxo" dentro da agenda — usa
// o modal m-crm-task (saveTask) e a seção "Adicionar fluxo" já existente na
// página do aluno (js/crm-alunos.js), evitando duplicar UI.

function urgDays(){ return DB.config.urgencyDays||3; }
function catUrgDays(catId){ const cat=getCatDefs().find(c=>c.id===catId); return (cat&&cat.urgDays>0)?cat.urgDays:urgDays(); }
function taskUrgDays(task){ if(task.urgDays>0) return task.urgDays; return catUrgDays(task.cat); }

function taskVisible(t){ if(!t.alunoId) return true; return alunoActiveForTasks(findAluno(t.alunoId)); }

function urgencyOf(task){
  if(task.done) return 'done';
  if(isTaskBlocked(task)) return 'blocked';
  const diff=diffDays(liveDate(task), todayStr());
  if(diff<0) return 'urgent';
  if(diff===0) return 'today';
  if(task.tipo==='prazo'&&diff<=taskUrgDays(task)) return 'near';
  return 'future';
}
function dateLabelOf(task){
  if(task.done) return {cls:'', text:'Concluída em '+fmtDate(task.doneDate||todayStr())};
  const d=liveDate(task); const diff=diffDays(d, todayStr()); const abs=fmtDate(d);
  if(isTaskBlocked(task)) return {cls:'urgent', text:`<i class=ph-lock></i> Aguarda etapa anterior`};
  if(diff<0) return {cls:'urgent', text:`Vencida há ${Math.abs(diff)}d`};
  if(diff===0) return {cls:'today', text:'Hoje'};
  if(diff===1) return {cls:'ok', text:'Amanhã'};
  if(diff<=taskUrgDays(task)&&task.tipo==='prazo') return {cls:'near', text:`Prazo em ${diff}d`};
  return {cls:'ok', text:abs};
}

function markTaskDone(taskId,isDone){ const t=DB.tasks.find(x=>x.id===taskId); if(!t) return; t.done=isDone; t.doneDate=isDone?todayStr():null; crmSave(); }
function getAlunoTasks(id){ return DB.tasks.filter(t=>t.alunoId===id); }
function pendingCount(){ return DB.tasks.filter(t=>taskVisible(t)&&!t.done&&diffDays(liveDate(t),todayStr())<=0&&!isTaskBlocked(t)).length; }
function urgentCount(){ return DB.tasks.filter(t=>{ const d=diffDays(liveDate(t),todayStr()); return taskVisible(t)&&!t.done&&!isTaskBlocked(t)&&(d<0||(d<=taskUrgDays(t)&&t.tipo==='prazo')); }).length; }
function todayCount(){ return DB.tasks.filter(t=>taskVisible(t)&&!t.done&&liveDate(t)===todayStr()&&!isTaskBlocked(t)).length; }
function waCount(){ return DB.tasks.filter(t=>taskVisible(t)&&!t.done&&!isTaskBlocked(t)&&diffDays(liveDate(t),todayStr())<=0).length; }
function updateBadges(){
  const set=(id,v)=>{ const el=$(id); if(el){ el.textContent=v; el.style.display=v?'':'none'; } };
  set('nav-agenda-badge', urgentCount());
}

function guessWAKey(task){ return ''; } // sem chaves fixas de automação no Lite — template é escolhido manualmente

/* ── MERGE (agrupa tarefas iguais geradas por múltiplos fluxos) ─────────── */
function mergeTasks(tasks){
  const groups={};
  tasks.forEach(t=>{
    const key=(t.alunoId||'')+'|'+t.titulo.trim().toLowerCase()+'|'+t.cat+'|'+liveDate(t)+'|'+(t.hora||'');
    (groups[key]=groups[key]||[]).push(t);
  });
  return Object.values(groups).map(grp=>{
    if(grp.length===1) return {tasks:grp, merged:false, mergedCount:1, ...grp[0], data:liveDate(grp[0])};
    const base=grp[0];
    return {tasks:grp, merged:true, mergedCount:grp.length, titulo:base.titulo, cat:base.cat, data:liveDate(base), tipo:base.tipo, hora:base.hora, alunoId:base.alunoId, done:grp.every(t=>t.done), id:grp.map(t=>t.id).join(',')};
  });
}
function mergeAgendaTasks(tasks){ return mergeTasks(tasks); }

/* ── CRUD ────────────────────────────────────────────────────────────────── */
let _editingTaskId=null;
function initTaskForm(date, forAlunoId){
  _editingTaskId=null;
  $('m-crm-task-ttl').textContent='Nova Tarefa';
  $('t-titulo').value=''; $('t-obs').value=''; $('t-urgdays').value='';
  $('t-data').value=date||todayStr(); $('t-hora').value='';
  const wrap=$('t-aluno-wrap');
  if(wrap) wrap.style.display = forAlunoId ? 'none' : '';
  $('t-aluno').dataset.forced = forAlunoId || '';
  if(!forAlunoId){
    $('t-aluno').innerHTML='<option value="">— Sem cliente —</option>'+students.map(a=>`<option value="${a.id}">${escHTML(alunoNome(a))}</option>`).join('');
  }
  $('t-cat').innerHTML=getCatDefs().map(c=>`<option value="${c.id}">${escHTML(c.label)}</option>`).join('');
  $('t-tipo').value='notif';
}
function openManualTaskForAluno(id){ crmOpenModal('m-crm-task'); initTaskForm(todayStr(), id); }
function openEditManualTask(taskId){
  const t=DB.tasks.find(x=>x.id===taskId); if(!t||!t.manual) return;
  _editingTaskId=taskId;
  $('m-crm-task-ttl').textContent='Editar Tarefa';
  $('t-titulo').value=t.titulo||''; $('t-obs').value=t.obs||''; $('t-urgdays').value=t.urgDays>0?t.urgDays:'';
  $('t-data').value=t.data||todayStr(); $('t-hora').value=t.hora||'';
  const wrap=$('t-aluno-wrap'); if(wrap) wrap.style.display='none';
  $('t-cat').innerHTML=getCatDefs().map(c=>`<option value="${c.id}"${t.cat===c.id?' selected':''}>${escHTML(c.label)}</option>`).join('');
  $('t-tipo').value=t.tipo||'notif';
  crmOpenModal('m-crm-task');
}
function saveTask(){
  const tituloRaw=$('t-titulo').value.trim();
  const data=$('t-data').value;
  if(!data){ crmToast('Preencha a data','err'); return; }
  const catVal=Number($('t-cat').value);
  const catLbl=getCatDefs().find(c=>c.id===catVal)?.label||'Tarefa';
  const titulo=tituloRaw||catLbl;
  const urgDaysVal=parseInt($('t-urgdays').value||'',10);
  const horaVal=$('t-hora').value||'';
  const tipo=$('t-tipo').value;
  const obs=$('t-obs').value.trim();
  if(_editingTaskId){
    const t=DB.tasks.find(x=>x.id===_editingTaskId); if(!t) return;
    Object.assign(t,{titulo,cat:catVal,tipo,data,hora:horaVal,obs});
    if(urgDaysVal>0) t.urgDays=urgDaysVal; else delete t.urgDays;
    crmToast('Tarefa atualizada');
  } else {
    const wrap=$('t-aluno-wrap');
    const forced=$('t-aluno').dataset.forced;
    const alunoId = forced ? Number(forced) : (wrap&&wrap.style.display!=='none' ? ($('t-aluno').value?Number($('t-aluno').value):null) : null);
    DB.tasks.push({id:novoId(), alunoId, titulo, cat:catVal, tipo, data, hora:horaVal, done:false, doneDate:null, manual:true, obs, ...(urgDaysVal>0?{urgDays:urgDaysVal}:{})});
    crmToast('Tarefa criada');
  }
  crmSave(); crmCloseModal('m-crm-task'); updateBadges();
  _crmRefreshCurrentScreen();
}
function deleteTask(id){
  const t=DB.tasks.find(x=>x.id===id);
  crmConfirm(`Remover a tarefa "${t?.titulo||'esta tarefa'}"? Não pode ser desfeito.`, ()=>{
    DB.tasks=DB.tasks.filter(x=>x.id!==id); crmSave(); updateBadges(); _crmRefreshCurrentScreen(); crmToast('Tarefa removida','info');
  });
}
function toggleTaskDone(id){
  const t=DB.tasks.find(x=>x.id===id); if(!t) return;
  markTaskDone(id, !t.done); updateBadges(); _crmRefreshCurrentScreen();
}
function toggleTaskDoneMany(ids){
  const idList=String(ids).split(',').map(Number);
  const first=DB.tasks.find(x=>x.id===idList[0]); const newDone=first?!first.done:true;
  idList.forEach(id=>markTaskDone(id,newDone));
  crmSave(); updateBadges(); _crmRefreshCurrentScreen();
}
function rescheduleTask(id,newDate,newHora){
  const t=DB.tasks.find(x=>x.id===id); if(!t) return;
  t.hora=newHora||'';
  if(t.manual){ t.data=newDate; }
  else if(t.isTrigger){
    const al=findAluno(t.alunoId); const crm=al&&ensureCrm(al);
    const af=crm&&crm.fluxos.find(af=>af.tasks&&af.tasks.includes(id));
    if(af) af.triggerDate=newDate;
    t.data=newDate;
  } else { t.over=newDate; }
}
let _reschedIds=[];
function openReschedule(ids){
  _reschedIds=String(ids).split(',').map(Number);
  const t=DB.tasks.find(x=>x.id===_reschedIds[0]); if(!t) return;
  $('resched-data').value=liveDate(t); $('resched-hora').value=t.hora||'';
  const al=findAluno(t.alunoId);
  $('resched-sub').textContent=t.titulo+(al?' — '+displayName(al):'');
  crmOpenModal('m-crm-resched');
}
function saveReschedule(){
  const newDate=$('resched-data').value;
  if(!newDate){ crmToast('Informe a data','err'); return; }
  const newHora=$('resched-hora').value;
  _reschedIds.forEach(id=>rescheduleTask(id,newDate,newHora));
  crmSave(); crmCloseModal('m-crm-resched'); updateBadges(); _crmRefreshCurrentScreen(); crmToast('Reagendado!');
}

function _crmRefreshCurrentScreen(){
  if(document.getElementById('screen-agenda') && !document.getElementById('screen-agenda').classList.contains('hidden')) renderAgendaCRM();
  else if(document.getElementById('screen-pipeline') && !document.getElementById('screen-pipeline').classList.contains('hidden')) renderPipelineCRM();
  else if(document.getElementById('screen-dashboard') && !document.getElementById('screen-dashboard').classList.contains('hidden') && typeof renderDashboard==='function') renderDashboard();
  const alEl=$('screen-aluno-crm');
  if(alEl && !alEl.classList.contains('hidden') && typeof currentAlunoCrmId!=='undefined' && currentAlunoCrmId!=null) navAlunoCrm(currentAlunoCrmId);
}

/* ── CARD DE TAREFA (usado na lista e no painel do dia) ─────────────────── */
function taskCardHTML(m){
  const t0=m.tasks?m.tasks[0]:m;
  const ids=(m.tasks||[t0]).map(t=>t.id).join(',');
  const allDone=(m.tasks||[t0]).every(t=>t.done);
  const dl=dateLabelOf(t0); const blocked=isTaskBlocked(t0);
  const al=findAluno(t0.alunoId);
  const clientBit=al?`<span class="tcard-cli">${escHTML(displayName(al))}</span>`:'';
  const horaTag=t0.hora?`<span class="badge badge-gray"><i class=ph-clock></i>${t0.hora}</span>`:'';
  const ehSenha = t0.acao === 'senha';   // pedido de "esqueci minha senha": o botão já abre o fluxo de redefinição
  const abrirSenha = `abrirRedefinirSenha(${t0.alunoId},${t0.id})`;
  const actionBtn = ehSenha
    ? (allDone ? '' : `<button class="btn btn-primary btn-sm" onclick="${abrirSenha}"><i class=ph-key></i>Redefinir senha</button>`)
    : blocked
    ? `<span class="badge badge-gray" title="Aguardando etapa anterior"><i class=ph-lock></i></span>`
    : allDone
      ? `<button class="btn btn-ghost btn-sm" onclick="toggleTaskDoneMany('${ids}')"><i class=ph-arrow-u-up-left></i>Reabrir</button>`
      : `<button class="btn btn-primary btn-sm" onclick="toggleTaskDoneMany('${ids}')">${t0.tipo==='prazo'?'<i class=ph-check></i>Feito':'<i class=ph-eye></i>Visto'}</button>`;
  const waBtn = (al && !ehSenha) ? `<button class="icon-btn" onclick="openWA(${al.id})" title="WhatsApp" aria-label="WhatsApp"><i class=ph-chat-circle-text></i></button>` : '';
  const reschedBtn = (!allDone&&!blocked&&!ehSenha) ? `<button class="icon-btn" onclick="openReschedule('${ids}')" title="Reagendar" aria-label="Reagendar"><i class=ph-calendar-blank></i></button>` : '';
  const editDelBtn = (t0.manual && !ehSenha) ? `<button class="icon-btn" onclick="openEditManualTask(${t0.id})" title="Editar" aria-label="Editar"><i class=ph-pencil-simple></i></button><button class="icon-btn" onclick="deleteTask(${t0.id})" title="Remover" aria-label="Remover"><i class=ph-trash></i></button>` : '';
  return `<div class="tcard${allDone?' done':''}">
    <div class="tcard-main"${(ehSenha&&!allDone)?` role="button" tabindex="0" style="cursor:pointer" onclick="${abrirSenha}"`:''}>
      <div class="tcard-title">${escHTML(t0.titulo)}${clientBit}</div>
      <div class="tcard-meta">
        <span class="badge badge-gray"><span style="color:${catColor(t0.cat)};display:inline-flex">${icHTML(catIcon(t0.cat))}</span>${escHTML(catLabel(t0.cat))}</span>
        <span class="badge ${t0.tipo==='prazo'?'badge-amber':'badge-gray'}">${t0.tipo==='prazo'?'<i class=ph-alarm></i>Prazo':'<i class=ph-push-pin></i>Aviso'}</span>
        ${horaTag}
        <span class="due due-${dl.cls||'ok'}">${dl.text}</span>
      </div>
    </div>
    <div class="tcard-act">${reschedBtn}${actionBtn}${waBtn}${editDelBtn}</div>
  </div>`;
}
function renderAgendaList(tasks){
  if(!tasks.length) return `<div class="empty"><i class=ph-calendar-check></i><div class="empty-title">Nada agendado neste período</div></div>`;
  return tasks.map(taskCardHTML).join('');
}
/* ── FILTROS DA AGENDA ──────────────────────────────────────────────────── */
let _calListFilter='hoje', calMonth=new Date().getMonth(), calYear=new Date().getFullYear(), calSel=todayStr();

function agendaSortCmp(a,b){
  if(+a.done!==+b.done) return +a.done-+b.done;
  const ka=liveDate(a.tasks?a.tasks[0]:a)+(a.hora?('_'+a.hora):'~');
  const kb=liveDate(b.tasks?b.tasks[0]:b)+(b.hora?('_'+b.hora):'~');
  return ka.localeCompare(kb);
}
function _crmAgendaTasks(filter){
  const today=todayStr(); let raw=[];
  if(filter==='dia') raw=DB.tasks.filter(t=>liveDate(t)===calSel);
  else if(filter==='hoje') raw=DB.tasks.filter(t=>{ if(t.done&&t.doneDate!==today) return false; return liveDate(t)===today; });
  else if(filter==='7d'){ const lim=addDays(today,7); raw=DB.tasks.filter(t=>!t.done&&liveDate(t)>today&&liveDate(t)<=lim); }
  else if(filter==='30d'){ const lim=addDays(today,30); raw=DB.tasks.filter(t=>!t.done&&liveDate(t)>today&&liveDate(t)<=lim); }
  return mergeAgendaTasks(raw.filter(taskVisible)).sort(agendaSortCmp);
}

function renderAgendaCRM(){
  const el=$('screen-agenda-body'); if(!el) return;
  el.innerHTML = renderAgendaCalendario();
  setTimeout(renderCalGrid,0);
  updateBadges();
}
function renderTarefas(){ return renderAgendaCalendario(); }

function _calHeaderHTML(){
  const today=todayStr(); const f=_calListFilter;
  const filterBtns=[{id:'hoje',label:'Hoje'},{id:'7d',label:'7 dias'},{id:'30d',label:'30 dias'}]
    .map(b=>`<button class="seg-btn${f===b.id?' active':''}" onclick="_calListFilter='${b.id}';renderCalPanel()">${b.label}</button>`).join('');
  const panelTitle = f==='dia' ? fmtDate(calSel) : f==='hoje' ? 'Hoje, '+fmtDate(today) : f==='7d' ? 'Próximos 7 dias' : 'Próximos 30 dias';
  const dayNav = f==='dia'
    ? `<button class="icon-btn" onclick="calNavDay(-1)" aria-label="Dia anterior"><i class=ph-caret-left></i></button><h3 class="cal-title">${panelTitle}</h3><button class="icon-btn" onclick="calNavDay(1)" aria-label="Próximo dia"><i class=ph-caret-right></i></button>`
    : `<h3 class="cal-title">${panelTitle}</h3>`;
  return `<div class="cal-panel-h"><div class="cal-nav">${dayNav}</div><div class="seg">${filterBtns}</div></div>`;
}

function renderAgendaCalendario(){
  const tasks=_crmAgendaTasks(_calListFilter);
  return `<div class="cal-layout">
    <div class="card cal-card">
      <div class="cal-nav" style="justify-content:space-between;margin-bottom:12px">
        <button class="icon-btn" onclick="calPrev()" aria-label="Mês anterior"><i class=ph-caret-left></i></button>
        <h3 class="cal-title" id="cal-lbl"></h3>
        <button class="icon-btn" onclick="calNext()" aria-label="Próximo mês"><i class=ph-caret-right></i></button>
      </div>
      <div id="cal-grid" class="cal-grid">
        ${['D','S','T','Q','Q','S','S'].map(d=>`<div class="cal-dow">${d}</div>`).join('')}
      </div>
      <button class="btn btn-primary" style="width:100%;margin-top:16px" onclick="crmOpenModal('m-crm-task');initTaskForm(calSel)"><i class=ph-plus></i>Nova tarefa</button>
    </div>
    <div class="card cal-list" id="cal-panel">
      ${_calHeaderHTML()}
      <div>${renderAgendaList(tasks)}</div>
    </div>
  </div>`;
}
function renderCalPanel(){
  const panel=$('cal-panel'); if(!panel) return;
  const tasks=_crmAgendaTasks(_calListFilter);
  panel.innerHTML = _calHeaderHTML() + `<div>${renderAgendaList(tasks)}</div>`;
  renderCalGrid();
}
function renderCalGrid(){
  const grid=$('cal-grid'); if(!grid) return;
  const lbl=$('cal-lbl');
  if(lbl) lbl.textContent=new Date(calYear,calMonth,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'}).replace(/^\w/,c=>c.toUpperCase());
  grid.querySelectorAll('.crm-cal-day').forEach(e=>e.remove());
  const today=todayStr();
  const firstDay=new Date(calYear,calMonth,1).getDay();
  const dim=new Date(calYear,calMonth+1,0).getDate();
  const taskMap={};
  DB.tasks.forEach(t=>{ if(!taskVisible(t)) return; const d=liveDate(t); (taskMap[d]=taskMap[d]||[]).push(t); });
  for(let i=0;i<firstDay;i++){ const el=document.createElement('div'); el.className='crm-cal-day empty-day'; grid.appendChild(el); }
  for(let i=1;i<=dim;i++){
    const ds=`${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
    const el=document.createElement('button'); el.type='button';
    const isToday=ds===today, isSel=ds===calSel;
    el.className='crm-cal-day'+(isToday?' today':'')+(isSel?' sel':'');
    const ts=taskMap[ds]||[];
    const mark = ts.some(t=>!t.done&&diffDays(ds,today)<0) ? 'late' : ts.some(t=>!t.done) ? 'open' : '';
    el.innerHTML=`<span>${i}</span><i class="cal-mark ${mark}"></i>`;
    el.onclick=()=>{ calSel=ds; _calListFilter='dia'; renderCalGrid(); renderCalPanel(); };
    grid.appendChild(el);
  }
}
function calPrev(){ if(calMonth===0){calMonth=11;calYear--;} else calMonth--; renderCalGrid(); }
function calNext(){ if(calMonth===11){calMonth=0;calYear++;} else calMonth++; renderCalGrid(); }
function calNavDay(dir){
  calSel=addDays(calSel,dir);
  const [y,m]=calSel.split('-').map(Number);
  if(m-1!==calMonth||y!==calYear){ calMonth=m-1; calYear=y; }
  _calListFilter='dia'; renderCalPanel();
}
