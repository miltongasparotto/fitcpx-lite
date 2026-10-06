// ══════════════════════════════════════════════════════════════════════════
// CRM — MOTOR DE FLUXOS + TAREFAS AUTOMÁTICAS + MODALIDADES (do FitCPX Flow)
// ══════════════════════════════════════════════════════════════════════════
// alunoId em tasks/fluxos é sempre student.id (numérico). Onde o Flow usava
// DB.alunos.find(...), aqui usamos findAluno()/students. Onde usava
// al.fluxos[], usamos ensureCrm(al).fluxos[] (student.crm.fluxos).

/* ── MOTOR DE CÁLCULO DE DATAS ──────────────────────────────────────────── */
function computeChainDate(taskId, alunoId, _depth=0){
  if(_depth>10) return todayStr();
  const t=DB.tasks.find(x=>x.id===taskId); if(!t) return todayStr();
  if(t.manual) return t.data||todayStr();
  if(t.isTrigger) return t.data||todayStr();
  if(t.over) return t.over;
  const al=findAluno(alunoId); if(!al) return t.data||todayStr();
  const crm=ensureCrm(al);
  const af=crm.fluxos.find(af=>af.tasks&&af.tasks.includes(taskId)); if(!af) return t.data||todayStr();
  const fl=DB.fluxos.find(f=>f.id===af.id); if(!fl) return t.data||todayStr();
  const step=fl.steps.find(s=>t.stepId&&t.stepId.startsWith(s.id+'_fl')); if(!step) return t.data||todayStr();

  if(step.refId==='trigger'){
    const trigTask=af.tasks && DB.tasks.find(x=>af.tasks.includes(x.id)&&x.isTrigger);
    const base=(trigTask&&trigTask.done&&trigTask.doneDate)?trigTask.doneDate:af.triggerDate;
    return addDays(base, step.dias);
  }
  const parentStep=fl.steps.find(s=>s.id===step.refId); if(!parentStep) return t.data||todayStr();
  const parentTaskId=af.tasks && af.tasks.find(tid=>{ const pt=DB.tasks.find(x=>x.id===tid); return pt&&pt.stepId&&pt.stepId.startsWith(parentStep.id+'_fl'); });
  if(!parentTaskId) return addDays(af.triggerDate, step.dias);
  const parentTask=DB.tasks.find(x=>x.id===parentTaskId); if(!parentTask) return addDays(af.triggerDate, step.dias);
  const parentBase=(parentTask.done&&parentTask.doneDate)?parentTask.doneDate:computeChainDate(parentTaskId, alunoId, _depth+1);
  return addDays(parentBase, step.dias);
}

function isTaskBlocked(task){
  if(task.done||task.manual||task.isTrigger) return false;
  const al=findAluno(task.alunoId); if(!al) return false;
  const crm=ensureCrm(al);
  const af=crm.fluxos.find(af=>af.tasks&&af.tasks.includes(task.id)); if(!af) return false;
  const fl=DB.fluxos.find(f=>f.id===af.id); if(!fl) return false;
  const step=fl.steps.find(s=>task.stepId&&task.stepId.startsWith(s.id+'_fl')); if(!step) return false;
  if(step.refId==='trigger'){
    const trigTask=af.tasks && DB.tasks.find(x=>af.tasks.includes(x.id)&&x.isTrigger);
    return !!(trigTask&&!trigTask.done);
  }
  const parentStep=fl.steps.find(s=>s.id===step.refId); if(!parentStep) return false;
  const parentTaskId=af.tasks && af.tasks.find(tid=>{ const pt=DB.tasks.find(x=>x.id===tid); return pt&&pt.stepId&&pt.stepId.startsWith(parentStep.id+'_fl'); });
  if(!parentTaskId) return false;
  const parentTask=DB.tasks.find(x=>x.id===parentTaskId);
  return !!(parentTask&&!parentTask.done);
}

function computeDate(alunoId, stepId, fluxo){
  const al=findAluno(alunoId); if(!al) return todayStr();
  const step=fluxo.steps.find(s=>s.id===stepId); if(!step) return todayStr();
  if(step.refId==='trigger') return addDays(al.crm?.triggerDate||todayStr(), step.dias);
  const refStep=fluxo.steps.find(s=>s.id===step.refId); if(!refStep) return addDays(al.crm?.triggerDate||todayStr(), step.dias);
  const refTask=DB.tasks.find(t=>t.alunoId===alunoId&&t.stepId===refStep.id&&!t.manual);
  if(!refTask) return addDays(al.crm?.triggerDate||todayStr(), step.dias);
  const refBase=(refTask.done&&refTask.doneDate)?refTask.doneDate:computeDate(alunoId, refStep.id, fluxo);
  return addDays(refBase, step.dias);
}
function getComputedDate(task){
  if(task.manual) return task.data;
  const al=findAluno(task.alunoId); if(!al) return task.data;
  const crm=ensureCrm(al);
  const af=crm.fluxos.find(af=>af.tasks&&af.tasks.includes(task.id));
  if(af) return computeChainDate(task.id, task.alunoId);
  return task.data;
}
function liveDate(task){ return task.manual ? task.data : (getComputedDate(task)||task.data||todayStr()); }

function regenAllTasks(){
  DB.tasks = DB.tasks.filter(t=>t.manual);
  students.forEach(al=>genTasksForAluno(al));
  crmSave();
}
function genTasksForAluno(al){
  const crm=ensureCrm(al);
  crm.fluxos.forEach(af=>{
    const existing=(af.tasks||[]).filter(id=>DB.tasks.find(t=>t.id===id));
    if(existing.length){ af.tasks=existing; return; }
    const fl=DB.fluxos.find(f=>f.id===af.id); if(!fl) return;
    const triggerDate=af.triggerDate||todayStr();
    const newTasks=[];
    const trigCat=fl.triggerCat||(getCatDefs()[0]?.id);
    const trigTask={id:novoId(), alunoId:al.id, stepId:'trigger_fl'+fl.id+'_'+novoId(), titulo:fl.trigger||'Avaliação', cat:trigCat, tipo:'prazo', data:triggerDate, done:false, doneDate:null, manual:false, obs:'', fluxoRef:fl.id, isTrigger:true};
    DB.tasks.push(trigTask); newTasks.push(trigTask.id);
    fl.steps.forEach(step=>{
      const stepTitle=step.nome||(()=>{ const c=getCatDefs().find(x=>x.id===step.cat); return c?`${c.label}`:'Tarefa'; })();
      const t={id:novoId(), alunoId:al.id, stepId:step.id+'_fl'+fl.id+'_'+novoId(), titulo:stepTitle, cat:step.cat, tipo:step.tipo, data:addDays(triggerDate, step.dias), done:false, doneDate:null, manual:false, obs:'', fluxoRef:fl.id};
      DB.tasks.push(t); newTasks.push(t.id);
    });
    af.tasks=newTasks;
  });
}

/* ── FLUXOS: CRUD ────────────────────────────────────────────────────────── */
let editingFluxoId=null, editingSteps=[], fluxoSearch='';

function renderFluxos(){
  const q=fluxoSearch.toLowerCase();
  const ativos=DB.fluxos.filter(f=>!f.archived&&(!q||f.nome.toLowerCase().includes(q)));
  const arquivados=DB.fluxos.filter(f=>f.archived&&(!q||f.nome.toLowerCase().includes(q)));
  if(!DB.fluxos.length) return `<div class="empty"><i class=ph-flow-arrow></i><div class="empty-title">Nenhum fluxo criado</div><div class="empty-text">Um fluxo define etapas e prazos e gera as tarefas sozinho.</div></div>`;

  const card=(f,isArq)=>{
    const alCount=students.filter(a=>(a.crm?.fluxos||[]).some(af=>af.id===f.id)).length;
    const ativosAll=DB.fluxos.filter(x=>!x.archived);
    const aIdx=ativosAll.findIndex(fl=>fl.id===f.id);
    const btns=isArq
      ? `<button class="btn btn-ghost btn-sm" onclick="restoreFluxo(${f.id})"><i class=ph-recycle></i> Restaurar</button><button class="btn btn-ghost btn-sm btn-del" onclick="deleteFluxoPermanent(${f.id})"><i class=ph-trash></i> Excluir</button>`
      : `<button class="btn btn-ghost btn-sm" onclick="editFluxo(${f.id})"><i class=ph-pencil-simple></i> Editar</button><button class="btn btn-ghost btn-sm" onclick="dupFluxo(${f.id})"><i class=ph-clipboard-text></i> Duplicar</button><button class="btn btn-ghost btn-sm" onclick="delFluxo(${f.id})"><i class=ph-archive></i> Arquivar</button>`;
    const moveBtns=isArq?'':`<div style="display:flex;flex-direction:column;gap:1px">
        <button class="icon-btn" style="width:24px;height:20px" onclick="moveFluxo(${f.id},-1)" aria-label="Subir" ${aIdx===0?'disabled':''}><i class=ph-caret-up></i></button>
        <button class="icon-btn" style="width:24px;height:20px" onclick="moveFluxo(${f.id},1)" aria-label="Descer" ${aIdx===ativosAll.length-1?'disabled':''}><i class=ph-caret-down></i></button>
      </div>`;
    const stepsPreview=f.steps.map(s=>{
      const cat=getCatDefs().find(x=>x.id===s.cat);
      const label=s.nome||(cat?cat.label:'Etapa');
      return `<span class="badge badge-gray" title="${s.dias}d">${icHTML(cat?.icon||'ph-clipboard-text')} ${escHTML(label)} · ${s.dias}d</span>`;
    }).join(' ');
    return `<div class="card" style="padding:12px 14px;${isArq?'opacity:.7;border-style:dashed':''}">
      <div style="display:flex;align-items:center;gap:10px">
        ${moveBtns}
        <span style="font-size:20px">${icHTML(f.icon||'ph-gear')}</span>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:14px">${escHTML(f.nome)} <span class="badge badge-gray">${alCount} cliente(s)</span> ${isArq?'<span class="badge badge-amber">Arquivado</span>':''}</div>
          <div style="font-size:12px;color:var(--text2);margin-top:2px"><i class=ph-target></i> ${escHTML(f.trigger)} → ${stepsPreview}</div>
        </div>
        <div style="display:flex;gap:5px;flex-shrink:0">${btns}</div>
      </div>
    </div>`;
  };
  let html=ativos.map(f=>card(f,false)).join('');
  if(!ativos.length&&q) html='<div class="empty"><i class=ph-magnifying-glass></i><div class="empty-title">Nenhum fluxo encontrado</div></div>';
  if(arquivados.length) html+=`<div style="margin-top:14px"><button class="btn btn-ghost btn-sm" onclick="toggleFluxosArq()"><i class=ph-archive></i> ${arquivados.length} arquivado(s) — ${_crmArqFluxosOpen?'ocultar':'ver'}</button></div>${_crmArqFluxosOpen?arquivados.map(f=>card(f,true)).join(''):''}`;
  return `<div style="margin-bottom:10px"><input type="text" placeholder="Buscar fluxo..." value="${escHTML(fluxoSearch)}" oninput="fluxoSearch=this.value;renderFluxosCRM()" style="max-width:320px"></div>${html}`;
}
let _crmArqFluxosOpen=false;
function toggleFluxosArq(){ _crmArqFluxosOpen=!_crmArqFluxosOpen; renderFluxosCRM(); }

function editFluxo(id){
  editingFluxoId=id; const f=id?DB.fluxos.find(x=>x.id===id):null;
  $('m-crm-fluxo-ttl').textContent=f?'Editar Fluxo':'Novo Fluxo';
  $('fl-nome').value=f?f.nome:''; icPickerSet('fl-icon', f?f.icon:'ph-gear');
  $('fl-desc').value=f?f.desc:''; $('fl-trigger-nome').value=f?f.trigger:'';
  const tc=$('fl-trigger-cat');
  tc.innerHTML=getCatDefs().map(c=>`<option value="${c.id}"${f&&f.triggerCat===c.id?' selected':''}>${escHTML(c.label)}</option>`).join('');
  editingSteps=f?JSON.parse(JSON.stringify(f.steps)):[{id:novoId(),nomeCustom:'',nome:'',dias:7,refId:'trigger',tipo:'prazo',cat:getCatDefs()[0]?.id}];
  renderStepsList();
  crmOpenModal('m-crm-fluxo');
}
function renderStepsList(){
  const list=$('fl-steps-list'); if(!list) return;
  const allCatDefs=getCatDefs();
  const trigNome=$('fl-trigger-nome')?.value || 'Gatilho';
  list.innerHTML = editingSteps.map((s,i)=>{
    const refOpts=[{id:'trigger',label:`Gatilho: ${trigNome}`}, ...editingSteps.slice(0,i).map((ps,pi)=>{
      const pcat=allCatDefs.find(c=>c.id===ps.cat);
      return {id:ps.id, label:`↳ ${ps.nomeCustom||pcat?.label||('Etapa '+(pi+1))}`};
    })];
    const catOpts=allCatDefs.map(c=>`<option value="${c.id}"${s.cat===c.id?' selected':''}>${escHTML(c.label)}</option>`).join('');
    const refOptsHtml=refOpts.map(r=>`<option value="${r.id}"${r.id===s.refId?' selected':''}>${escHTML(r.label)}</option>`).join('');
    return `<div style="border:1px solid var(--border);border-radius:var(--radius);padding:10px;margin-bottom:8px;background:var(--bg2)">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
        <span style="font-weight:700;font-size:12px;color:var(--text3)">Etapa ${i+1}</span>
        <div style="flex:1"></div>
        <button class="icon-btn" style="width:24px;height:20px" onclick="moveStep(${i},-1)" aria-label="Subir" ${i===0?'disabled':''}><i class=ph-caret-up></i></button>
        <button class="icon-btn" style="width:24px;height:20px" onclick="moveStep(${i},1)" aria-label="Descer" ${i===editingSteps.length-1?'disabled':''}><i class=ph-caret-down></i></button>
        ${editingSteps.length>1?`<button class="icon-btn danger" onclick="removeStep(${i})" title="Remover etapa" aria-label="Remover etapa"><i class=ph-trash></i></button>`:''}
      </div>
      <input type="text" placeholder="Nome personalizado (opcional)" value="${escHTML(s.nomeCustom||'')}" oninput="updStep(${i},'nomeCustom',this.value)" style="margin-bottom:6px">
      <div style="display:grid;grid-template-columns:1.4fr 1fr .8fr 1.2fr;gap:6px">
        <select onchange="updStep(${i},'cat',this.value);renderStepsList()">${catOpts}</select>
        <select onchange="updStep(${i},'tipo',this.value)">
          <option value="notif"${s.tipo==='notif'?' selected':''}>Notificação</option>
          <option value="prazo"${s.tipo==='prazo'?' selected':''}>Com Prazo</option>
        </select>
        <input type="number" min="0" value="${s.dias}" onchange="updStep(${i},'dias',+this.value)" title="dias após referência">
        <select onchange="updStep(${i},'refId',this.value);renderStepsList()">${refOptsHtml}</select>
      </div>
    </div>`;
  }).join('') + `<button class="btn btn-ghost btn-sm" onclick="addFluxoStep()"><i class=ph-plus></i> Adicionar Etapa</button>`;
}
function updStep(i,field,val){ if(editingSteps[i]) editingSteps[i][field]=val; }
function addFluxoStep(){ editingSteps.push({id:novoId(),nomeCustom:'',nome:'',dias:7,refId:'trigger',tipo:'notif',cat:getCatDefs()[0]?.id}); renderStepsList(); }
function removeStep(i){ editingSteps.splice(i,1); renderStepsList(); }
function moveStep(i,dir){ const j=i+dir; if(j<0||j>=editingSteps.length) return; [editingSteps[i],editingSteps[j]]=[editingSteps[j],editingSteps[i]]; renderStepsList(); }

function saveFluxo(){
  const nome=$('fl-nome').value.trim();
  if(!nome){ crmToast('Preencha o nome do fluxo','err'); return; }
  const triggerCat=$('fl-trigger-cat').value?Number($('fl-trigger-cat').value):getCatDefs()[0]?.id;
  const triggerRaw=$('fl-trigger-nome').value.trim();
  const trigger=triggerRaw || (getCatDefs().find(c=>c.id===triggerCat)?.label) || nome;
  editingSteps.forEach(s=>{ s.nome = s.nomeCustom || (getCatDefs().find(c=>c.id===s.cat)?.label) || 'Etapa'; });
  const icon=$('fl-icon').value.trim()||'ph-gear'; const desc=$('fl-desc').value.trim();
  if(editingFluxoId){
    const f=DB.fluxos.find(x=>x.id===editingFluxoId);
    Object.assign(f,{nome,icon,desc,trigger,triggerCat,steps:editingSteps});
    // Recalcula datas pendentes vinculadas ao gatilho (cadeia recalcula sozinha via liveDate)
    students.forEach(al=>{
      const crm=ensureCrm(al);
      const af=crm.fluxos.find(af=>af.id===editingFluxoId); if(!af||!af.tasks) return;
      af.tasks.forEach(tid=>{
        const t=DB.tasks.find(x=>x.id===tid); if(!t||t.done) return;
        if(t.isTrigger){ t.titulo=trigger; t.cat=triggerCat; return; }
        const step=editingSteps.find(s=>t.stepId&&t.stepId.startsWith(s.id+'_fl'));
        if(step&&step.refId==='trigger') t.data=addDays(af.triggerDate, step.dias);
      });
    });
    crmToast('Fluxo atualizado — datas recalculadas');
  } else {
    DB.fluxos.push({id:novoId(), nome, icon, desc, trigger, triggerCat, steps:editingSteps});
    crmToast('Fluxo criado');
  }
  crmSave(); crmCloseModal('m-crm-fluxo'); renderFluxosCRM();
}
function moveFluxo(id,dir){
  const ativos=DB.fluxos.filter(f=>!f.archived); const aIdx=ativos.findIndex(f=>f.id===id); const tgt=ativos[aIdx+dir]; if(!tgt) return;
  const i=DB.fluxos.findIndex(f=>f.id===id), j=DB.fluxos.findIndex(f=>f.id===tgt.id);
  [DB.fluxos[i],DB.fluxos[j]]=[DB.fluxos[j],DB.fluxos[i]]; crmSave(); renderFluxosCRM();
}
function dupFluxo(id){
  const f=DB.fluxos.find(x=>x.id===id); if(!f) return;
  const nf=JSON.parse(JSON.stringify(f)); nf.id=novoId(); nf.nome+=' (cópia)'; delete nf.archived;
  const idMap={}; nf.steps.forEach(s=>{ const newId=novoId(); idMap[s.id]=newId; s.id=newId; });
  nf.steps.forEach(s=>{ if(s.refId!=='trigger') s.refId=idMap[s.refId]||s.refId; });
  DB.fluxos.push(nf); crmSave(); renderFluxosCRM(); crmToast('Fluxo duplicado');
}
function delFluxo(id){
  const f=DB.fluxos.find(x=>x.id===id);
  const vinc=students.filter(a=>(a.crm?.fluxos||[]).some(af=>af.id===id));
  if(vinc.length){ crmToast(`Não é possível arquivar: ${vinc.map(a=>alunoNome(a)).join(', ')} usam este fluxo.`,'err'); return; }
  crmConfirm(`Arquivar o fluxo "${f?.nome}"? Pode ser restaurado depois.`, ()=>{
    if(f){ f.archived=true; } crmSave(); renderFluxosCRM(); crmToast('Fluxo arquivado','info');
  });
}
function restoreFluxo(id){ const f=DB.fluxos.find(x=>x.id===id); if(f) delete f.archived; crmSave(); renderFluxosCRM(); crmToast('Fluxo restaurado'); }
function deleteFluxoPermanent(id){
  crmConfirm('Excluir definitivamente este fluxo? Não pode ser desfeito.', ()=>{
    DB.fluxos=DB.fluxos.filter(x=>x.id!==id); crmSave(); renderFluxosCRM(); crmToast('Fluxo excluído','info');
  });
}

/* ── MODALIDADES: CRUD ──────────────────────────────────────────────────── */
let editModId=null, editModFluxos=[];
function getModFluxoFav(m){ if(m.fluxos&&m.fluxos.length){ const fav=m.fluxos.find(x=>x.fav)||m.fluxos[0]; return fav.id; } return null; }

function renderModalidades(){
  const ativas=DB.modalidades.filter(m=>!m.archived);
  const arquivadas=DB.modalidades.filter(m=>m.archived);
  if(!ativas.length&&!arquivadas.length) return `<div class="empty"><i class=ph-barbell></i><div class="empty-title">Nenhuma modalidade criada</div></div>`;
  const row=(m,isArq)=>{
    const chips=(m.fluxos||[]).map(mf=>{ const fl=DB.fluxos.find(f=>f.id===mf.id); return fl?`<span class="badge badge-gray">${icHTML(fl.icon||'ph-gear')} ${escHTML(fl.nome)}${mf.fav?' '+'<i class=ph-star></i>':''}</span>`:''; }).join(' ');
    const idx=ativas.findIndex(x=>x.id===m.id);
    const btns=isArq
      ?`<button class="btn btn-ghost btn-sm" onclick="restoreMod(${m.id})"><i class=ph-recycle></i> Restaurar</button><button class="btn btn-ghost btn-sm btn-del" onclick="deleteModPermanent(${m.id})"><i class=ph-trash></i> Excluir</button>`
      :`<button class="btn btn-ghost btn-sm" onclick="editMod(${m.id})"><i class=ph-pencil-simple></i> Editar</button><button class="btn btn-ghost btn-sm" onclick="archiveMod(${m.id})"><i class=ph-archive></i> Arquivar</button>`;
    const moveBtns=isArq?'':`<div style="display:flex;flex-direction:column;gap:1px">
      <button class="icon-btn" style="width:24px;height:20px" onclick="moveMod(${m.id},-1)" aria-label="Subir" ${idx===0?'disabled':''}><i class=ph-caret-up></i></button>
      <button class="icon-btn" style="width:24px;height:20px" onclick="moveMod(${m.id},1)" aria-label="Descer" ${idx===ativas.length-1?'disabled':''}><i class=ph-caret-down></i></button>
    </div>`;
    return `<div class="card" style="padding:12px 14px;${isArq?'opacity:.7;border-style:dashed':''}">
      <div style="display:flex;align-items:center;gap:10px">
        ${moveBtns}
        <span style="font-size:20px">${icHTML(m.icon||'ph-barbell')}</span>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:14px">${escHTML(m.nome)} ${isArq?'<span class="badge badge-amber">Arquivada</span>':''}</div>
          <div style="font-size:12px;color:var(--text2);margin-top:2px">${m.desc?escHTML(m.desc)+' · ':''}${chips||'sem fluxo vinculado'}</div>
        </div>
        <div style="display:flex;gap:5px;flex-shrink:0">${btns}</div>
      </div>
    </div>`;
  };
  let html=ativas.map(m=>row(m,false)).join('') || '<div style="color:var(--text3);padding:16px 0">Nenhuma modalidade ativa.</div>';
  if(arquivadas.length) html+=`<div style="margin-top:14px"><button class="btn btn-ghost btn-sm" onclick="toggleModsArq()"><i class=ph-archive></i> ${arquivadas.length} arquivada(s) — ${_crmArqModsOpen?'ocultar':'ver'}</button></div>${_crmArqModsOpen?arquivadas.map(m=>row(m,true)).join(''):''}`;
  return html;
}
let _crmArqModsOpen=false;
function toggleModsArq(){ _crmArqModsOpen=!_crmArqModsOpen; renderFluxosCRM(); }

function initModForm(m){
  editModId=m?m.id:null;
  $('m-crm-mod-ttl').textContent=m?'Editar Modalidade':'Nova Modalidade';
  $('mod-nome').value=m?m.nome:''; icPickerSet('mod-icon', m?m.icon:'ph-barbell'); $('mod-desc').value=m?m.desc:'';
  editModFluxos = m ? JSON.parse(JSON.stringify(m.fluxos||[])) : [];
  renderModFluxosList();
}
function renderModFluxosList(){
  const list=$('mod-fluxos-list'); if(!list) return;
  const available=DB.fluxos.filter(f=>!f.archived);
  const selected = editModFluxos.length ? editModFluxos.map((mf,i)=>{
    const fl=available.find(f=>f.id===mf.id)||DB.fluxos.find(f=>f.id===mf.id); if(!fl) return '';
    return `<div style="display:flex;align-items:center;gap:8px;padding:7px 9px;border:1px solid ${mf.fav?'var(--accent)':'var(--border)'};border-radius:var(--radius);margin-bottom:5px;background:${mf.fav?'var(--accent-dim)':'var(--bg2)'}">
      <span>${icHTML(fl.icon||'ph-gear')}</span><div style="flex:1;font-size:13px">${escHTML(fl.nome)}</div>
      <button class="btn btn-ghost btn-sm" onclick="setModFav(${i})" title="Padrão">${mf.fav?'<i class=ph-star></i> Padrão':'<i class=ph-star></i>'}</button>
      <button class="icon-btn danger" onclick="removeModFluxo(${i})" title="Remover" aria-label="Remover"><i class=ph-trash></i></button>
    </div>`;
  }).join('') : `<div style="color:var(--text3);font-size:13px;padding:8px 0">Nenhum fluxo vinculado.</div>`;
  const opts=available.filter(f=>!editModFluxos.some(mf=>mf.id===f.id));
  const picker = opts.length ? `<select onchange="if(this.value){confirmAddModFluxo(Number(this.value));this.value=''}">
      <option value="">Vincular fluxo...</option>
      ${opts.map(f=>`<option value="${f.id}">${escHTML(f.nome)}</option>`).join('')}
    </select>` : `<div style="font-size:12px;color:var(--text3)">Todos os fluxos já vinculados.</div>`;
  list.innerHTML = selected + picker;
}
function confirmAddModFluxo(fluxoId){ editModFluxos.push({id:fluxoId, fav:editModFluxos.length===0}); renderModFluxosList(); }
function removeModFluxo(i){ const wasFav=editModFluxos[i]?.fav; editModFluxos.splice(i,1); if(wasFav&&editModFluxos.length) editModFluxos[0].fav=true; renderModFluxosList(); }
function setModFav(i){ editModFluxos.forEach((mf,j)=>mf.fav=(j===i)); renderModFluxosList(); }
function editMod(id){ initModForm(DB.modalidades.find(m=>m.id===id)); crmOpenModal('m-crm-mod'); }
function saveModalidade(){
  const nome=$('mod-nome').value.trim();
  if(!nome){ crmToast('Preencha o nome','err'); return; }
  if(editModFluxos.length&&!editModFluxos.some(x=>x.fav)) editModFluxos[0].fav=true;
  const data={ nome, icon:$('mod-icon').value.trim()||'ph-barbell', desc:$('mod-desc').value.trim(), fluxos:JSON.parse(JSON.stringify(editModFluxos)) };
  if(editModId){ Object.assign(DB.modalidades.find(m=>m.id===editModId), data); crmToast('Modalidade atualizada'); }
  else { DB.modalidades.push({id:novoId(), ...data}); crmToast('Modalidade criada'); }
  crmSave(); crmCloseModal('m-crm-mod'); renderFluxosCRM();
}
function moveMod(id,dir){
  const ativas=DB.modalidades.filter(m=>!m.archived); const idx=ativas.findIndex(m=>m.id===id); const tgt=ativas[idx+dir]; if(!tgt) return;
  const i=DB.modalidades.findIndex(m=>m.id===id), j=DB.modalidades.findIndex(m=>m.id===tgt.id);
  [DB.modalidades[i],DB.modalidades[j]]=[DB.modalidades[j],DB.modalidades[i]]; crmSave(); renderFluxosCRM();
}
function archiveMod(id){
  const m=DB.modalidades.find(x=>x.id===id);
  const cnt=students.filter(a=>a.crm?.modId===id).length;
  if(cnt){ crmToast(`Modalidade em uso por ${cnt} cliente(s). Altere-os antes de arquivar.`,'err'); return; }
  crmConfirm(`Arquivar a modalidade "${m?.nome}"?`, ()=>{ if(m) m.archived=true; crmSave(); renderFluxosCRM(); crmToast('Modalidade arquivada','info'); });
}
function restoreMod(id){ const m=DB.modalidades.find(x=>x.id===id); if(m) delete m.archived; crmSave(); renderFluxosCRM(); crmToast('Modalidade restaurada'); }
function deleteModPermanent(id){
  const cnt=students.filter(a=>a.crm?.modId===id).length;
  if(cnt){ crmToast(`Modalidade em uso por ${cnt} cliente(s).`,'err'); return; }
  crmConfirm('Excluir definitivamente esta modalidade? Não pode ser desfeito.', ()=>{
    DB.modalidades=DB.modalidades.filter(x=>x.id!==id); crmSave(); renderFluxosCRM(); crmToast('Modalidade excluída','info');
  });
}

/* ── TELA "FLUXOS DE TRABALHO" — abas Categorias / Fluxos / Modalidades ─── */
let crmFluxosTab='categorias';
function renderFluxosCRM(){
  seedPresetCats();
  const el=$('screen-fluxos-body'); if(!el) return;
  const catDefs=getCatDefs(), fluxosAtivos=DB.fluxos.filter(f=>!f.archived), mods=DB.modalidades.filter(m=>!m.archived);
  const tabs=[
    {id:'categorias',icon:'ph-tag',label:'Categorias',n:catDefs.length},
    {id:'fluxos',icon:'ph-gear',label:'Fluxos',n:fluxosAtivos.length},
    {id:'modalidades',icon:'ph-barbell',label:'Modalidades',n:mods.length},
  ];
  const tabsHtml=tabs.map(t=>`<button class="seg-btn${crmFluxosTab===t.id?' active':''}" onclick="crmFluxosTab='${t.id}';renderFluxosCRM()">${icHTML(t.icon)}${t.label}<span class="seg-n">${t.n}</span></button>`).join('');
  const actionBtn = crmFluxosTab==='categorias' ? `<button class="btn btn-primary btn-sm" onclick="initCatForm(null);crmOpenModal('m-crm-cat')"><i class=ph-plus></i> Nova Categoria</button>`
    : crmFluxosTab==='fluxos' ? `<button class="btn btn-primary btn-sm" onclick="editFluxo(null)"><i class=ph-plus></i> Novo Fluxo</button>`
    : `<button class="btn btn-primary btn-sm" onclick="initModForm(null);crmOpenModal('m-crm-mod')"><i class=ph-plus></i> Nova Modalidade</button>`;
  const body = crmFluxosTab==='categorias' ? renderSetupCategorias()
    : crmFluxosTab==='fluxos' ? renderFluxos()
    : renderModalidades();
  el.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
      <div class="seg">${tabsHtml}</div>
      ${crmFluxosTab==='categorias'?'':actionBtn}
    </div>
    ${body}`;
}
