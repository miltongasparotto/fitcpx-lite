// ══════════════════════════════════════════════════════════════════════════
// CRM — CLIENTES (parte que vive dentro de `students`, ver js/crm-store.js)
// ══════════════════════════════════════════════════════════════════════════
// Não existe lista paralela de "alunos do CRM": todo aluno é um item de
// `students` (js/avaliacao.js). Os campos do CRM (status, cor, fluxos
// vinculados, modalidade, observação, apelido, foto, histórico) ficam em
// `student.crm{}` (ver ensureCrm() em js/crm-store.js). alunoId em
// tasks/fluxos é sempre student.id.
//
// Decisão de integração: não existe nav item próprio de "Clientes CRM" (só
// os 5 pedidos: agenda/pipeline/whatsapp/fluxos/config). A lista com filtros
// de CRM fica como uma aba dentro da tela Pipeline ("📋 Lista"), e o detalhe
// do cliente (renderAlunoPage) abre como um overlay de tela cheia disparado
// de qualquer card/linha que referencie o cliente (navAlunoCrm). Isso evita
// mexer na tela "Alunos" já existente do Auto, que serve outro propósito
// (cadastro de ficha de treino) e é central pro resto do app.

let currentAlunoCrmId=null;

function displayName(al){
  if(!al) return '';
  if(al.crm?.apelido && al.crm.apelido.trim()) return al.crm.apelido.trim();
  const p=alunoNome(al).trim().split(/\s+/).filter(Boolean);
  if(p.length<=1) return p[0]||'';
  return p[0]+' '+p[p.length-1];
}
function alunoActiveForTasks(al){ return !!al && !al.crm?.archived && al.crm?.status!=='pausado' && al.crm?.status!=='inativo'; }
function needsReview(al){
  if(!al || al.crm?.archived) return false;
  const s=al.crm?.status;
  if(s!=='pausado'&&s!=='inativo') return false;
  return !!al.crm?.statusSince && diffDays(todayStr(), al.crm.statusSince)>=cfgNum('diasRevisao',30);
}

/* ── LISTA + FILTROS ─────────────────────────────────────────────────────── */
let alunoSearch='', alunoFilters={}, alunoSort={field:'nome',dir:'asc'};
function clearAlunoFilters(){ alunoFilters={}; alunoSearch=''; renderPipelineCRM(); }
function alunoSortVal(a,field){
  if(field==='modId'){ const m=DB.modalidades.find(x=>x.id===a.crm?.modId); return m?m.nome.toLowerCase():'zzzz'; }
  if(field==='status') return ({lead:'0',ativo:'1',pausado:'2',inativo:'3',bloqueado:'4'})[situacaoDe(a)]||'1';
  if(field==='proximo'){ const nt=getAlunoTasks(a.id).filter(t=>!t.done).sort((x,y)=>liveDate(x).localeCompare(liveDate(y)))[0]; return nt?liveDate(nt):'99999999'; }
  return alunoNome(a).toLowerCase();
}
function getFilteredAlunos(){
  const today=todayStr();
  let list=students.filter(a=>!a.crm?.archived);
  if(alunoSearch){
    const q=alunoSearch.toLowerCase();
    list=list.filter(a=>alunoNome(a).toLowerCase().includes(q)||(a.crm?.apelido||'').toLowerCase().includes(q)||alunoTel(a).includes(alunoSearch));
  }
  if(alunoFilters.modId) list=list.filter(a=>a.crm?.modId===alunoFilters.modId);
  if(alunoFilters.status) list=list.filter(a=>situacaoDe(a)===alunoFilters.status);
  if(alunoFilters.review) list=list.filter(a=>needsReview(a));
  const field=alunoSort.field||'nome', dir=alunoSort.dir||'asc';
  list.sort((a,b)=>{ const va=alunoSortVal(a,field), vb=alunoSortVal(b,field); return dir==='asc'?va.localeCompare(vb):vb.localeCompare(va); });
  return list;
}
function alunoRowHTML(al){
  const today=todayStr();
  const next=getAlunoTasks(al.id).filter(t=>!t.done).sort((a,b)=>liveDate(a).localeCompare(liveDate(b)))[0];
  const mod=DB.modalidades.find(m=>m.id===al.crm?.modId);
  const status=situacaoDe(al);
  const stMap={lead:['var(--blue)','<i class=sd-blue></i> Lead'],ativo:['var(--accent)','<i class=sd-green></i> Ativo'],pausado:['var(--yellow)','<i class=sd-amber></i> Pausado'],inativo:['var(--text3)','<i class=sd-gray></i> Inativo'],bloqueado:['var(--red)','<i class=sd-red></i> Bloqueado']};
  const st=stMap[status]||stMap.ativo;
  const reviewChip=needsReview(al)?` <span class="badge badge-amber"><i class=ph-alarm></i> revisar</span>`:'';
  let nextHtml='<span style="color:var(--text3)">—</span>';
  if(next){
    const diff=diffDays(liveDate(next),today);
    nextHtml = diff<0?`<span style="color:var(--red);font-weight:700"><i class=ph-warning></i> ${Math.abs(diff)}d atraso</span>`:diff===0?`<span style="color:var(--amber);font-weight:700"><i class=ph-push-pin></i> Hoje</span>`:`Em ${diff}d`;
  }
  return `<tr style="cursor:pointer" onclick="navAlunoCrm(${al.id})">
    <td style="padding:8px 10px;display:flex;align-items:center;gap:8px">
      <div style="width:30px;height:30px;border-radius:50%;background:${corSegura(al.crm?.cor,'#3b82f6')};color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">${initials(alunoNome(al))}</div>
      <div><div style="font-size:13px;font-weight:600">${escHTML(alunoNome(al))}</div><div style="font-size:12px;color:var(--text3)">${escHTML(alunoTel(al))}</div></div>
    </td>
    <td style="font-size:12px">${mod?icHTML(mod.icon)+' '+escHTML(mod.nome):'<span style="color:var(--text3)">—</span>'}</td>
    <td style="font-size:12px">${nextHtml}</td>
    <td style="font-size:12px;color:${st[0]};font-weight:600">${st[1]}${reviewChip}</td>
    <td onclick="event.stopPropagation()" style="text-align:right;padding-right:8px">
      <button class="btn btn-ghost btn-sm" onclick="archiveAlunoCrm(${al.id})" title="Arquivar no CRM"><i class=ph-archive></i></button>
    </td>
  </tr>`;
}
function alunoListAreaHTML(){
  const list=getFilteredAlunos();
  const stLbls={lead:'Lead',ativo:'Ativo',pausado:'Pausado',inativo:'Inativo',bloqueado:'Bloqueado'};
  const usedStatuses=['lead','ativo','pausado','inativo','bloqueado'].filter(s=>students.some(a=>!a.crm?.archived&&situacaoDe(a)===s));
  const reviewCount=students.filter(a=>needsReview(a)).length;
  const banner = reviewCount ? `<div class="badge badge-amber" style="margin-bottom:10px;cursor:pointer;padding:6px 10px" onclick="alunoFilters={review:1};renderPipelineCRM()"><i class=ph-alarm></i> ${reviewCount} cliente(s) pausado(s)/inativo(s) há +30 dias — revisar</div>` : '';
  const sortBtn=(field,label)=>{ const active=alunoSort.field===field; const nextDir=active&&alunoSort.dir==='asc'?'desc':'asc'; return `<span style="cursor:pointer;font-weight:700" onclick="alunoSort={field:'${field}',dir:'${nextDir}'};renderPipelineCRM()">${label}${active?(alunoSort.dir==='asc'?' ↑':' ↓'):''}</span>`; };
  const statusFilter=`<select onchange="alunoFilters.status=this.value||undefined;renderPipelineCRM()" style="font-size:12px;padding:3px 6px"><option value="">Todos status</option>${usedStatuses.map(s=>`<option value="${s}"${alunoFilters.status===s?' selected':''}>${stLbls[s]}</option>`).join('')}</select>`;
  return `${banner}
  <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
    <input type="text" placeholder="Buscar por nome ou telefone..." value="${escHTML(alunoSearch)}" oninput="alunoSearch=this.value;renderPipelineCRM()" style="flex:1;max-width:320px">
    ${statusFilter}
    <span class="badge badge-gray">${list.length} cliente(s)</span>
    <button class="btn btn-primary btn-sm" onclick="initAlunoForm(null);crmOpenModal('m-crm-aluno')"><i class=ph-plus></i> Novo Cliente</button>
  </div>
  <div class="card" style="padding:0;overflow:hidden">
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr style="text-align:left;border-bottom:1px solid var(--border)">
        <th style="padding:8px 10px">${sortBtn('nome','Cliente')}</th>
        <th style="padding:8px 10px">${sortBtn('modId','Modalidade')}</th>
        <th style="padding:8px 10px">${sortBtn('proximo','Próxima Ação')}</th>
        <th style="padding:8px 10px">${sortBtn('status','Status')}</th>
        <th></th>
      </tr></thead>
      <tbody>${list.length?list.map(alunoRowHTML).join(''):`<tr><td colspan="5"><div class="empty"><i class=ph-users></i><div class="empty-title">Nenhum cliente encontrado</div></div></td></tr>`}</tbody>
    </table>
  </div>`;
}

/* ── FORMULÁRIO ─────────────────────────────────────────────────────────── */
let editingAlunoCrmId=null;
function initAlunoForm(al){
  editingAlunoCrmId = al?al.id:null;
  $('m-crm-aluno-ttl').textContent = al?'Editar Cliente':'Novo Cliente';
  $('f-nome').value = al?alunoNome(al):'';
  foneCarregar('f-tel', al?alunoTel(al):'');
  $('f-apelido').value = al?.crm?.apelido||'';
  $('f-obs').value = al?.crm?.obs||'';
}
function saveAluno(){
  const nome=$('f-nome').value.trim();
  const tel=foneLer('f-tel');   // guardado com o código do país: +55 (11) 98765-4321
  if(!nome||!tel){ crmToast('Preencha nome e WhatsApp','err'); return; }
  const apelido=$('f-apelido').value.trim();
  const obs=$('f-obs').value.trim();
  const colors=['#3b82f6','#ef4444','#8b5cf6','#f59e0b','#10b981','#ec4899','#06b6d4'];
  if(editingAlunoCrmId){
    const al=findAluno(editingAlunoCrmId); if(!al){ crmToast('Cliente não encontrado','err'); return; }
    al.perfil = al.perfil||{}; al.perfil.nome=nome; al.perfil.whatsapp=tel;
    const crm=ensureCrm(al); crm.apelido=apelido; crm.obs=obs;
    addHistory(al.id,'aluno_edit','Dados atualizados','');
    crmToast('Cliente atualizado');
  } else {
    const al={ id:novoId(), perfil:{nome,whatsapp:tel}, anamnese:{}, prescricao:{}, reavaliacao:null,
      crm:{ status:'lead', sit2:1, statusSince:todayStr(), cor:colors[students.length%colors.length], apelido, obs, fluxos:[] } };
    students.push(al);
    if(typeof renderStudentList==='function') renderStudentList();
    crmToast('Cliente cadastrado! Configure o fluxo na página do cliente.');
    crmCloseModal('m-crm-aluno'); crmSave();
    navAlunoCrm(al.id);
    return;
  }
  crmSave(); crmCloseModal('m-crm-aluno'); renderPipelineCRM();
  if(currentAlunoCrmId===editingAlunoCrmId) navAlunoCrm(editingAlunoCrmId);
}
function archiveAlunoCrm(id){
  const al=findAluno(id); if(!al) return;
  const crm=ensureCrm(al);
  crm.archived=!crm.archived;
  crmSave(); renderPipelineCRM();
  crmToast(crm.archived?'Cliente arquivado no CRM':'Cliente reativado no CRM');
}

/* ── STATUS / HISTÓRICO ────────────────────────────────────────────────── */
function addHistory(alunoId, tipo, texto, sub){
  if(!DB.historico) DB.historico={};
  const key=String(alunoId);
  (DB.historico[key]=DB.historico[key]||[]).unshift({tipo, texto, sub, data:new Date().toISOString()});
}
async function setAlunoStatus(id,status){
  const al=findAluno(id); if(!al) return;
  await alunoSetSituacao(al,status);   // mesma regra da ficha: Bloqueado trava o acesso ao portal
  navAlunoCrm(id);
}
function changeAlunoColor(id,color){ const al=findAluno(id); if(!al) return; ensureCrm(al).cor=color; crmSave(); navAlunoCrm(id); }
function changeAlunoMod(id,modId){
  const al=findAluno(id); if(!al) return;
  const crm=ensureCrm(al);
  crm.modId = modId ? Number(modId) : null;
  if(modId && (crm.status||'lead')==='lead'){ crm.status='ativo'; crm.statusSince=todayStr(); addHistory(id,'status','Ativado','Vinculado a uma modalidade'); }
  crmSave(); navAlunoCrm(id); crmToast('Modalidade atualizada');
}

/* ── FLUXOS DO ALUNO ────────────────────────────────────────────────────── */
function addFluxoToAluno(id){
  const sel=$('add-fluxo-sel'), datEl=$('add-fluxo-date');
  if(!sel||!datEl) return;
  const fluxoId=sel.value?Number(sel.value):null;
  const triggerDate=datEl.value;
  if(!fluxoId){ crmToast('Selecione um fluxo','err'); return; }
  if(!triggerDate){ crmToast('Informe a data de início','err'); return; }
  const al=findAluno(id); const fl=DB.fluxos.find(f=>f.id===fluxoId);
  if(!al||!fl) return;
  const crm=ensureCrm(al);
  if(crm.fluxos.find(af=>af.id===fluxoId)){ crmToast('Fluxo já atribuído a este cliente','err'); return; }
  const newTasks=[];
  const trigCat=fl.triggerCat||getCatDefs()[0]?.id;
  const trigTask={id:novoId(), alunoId:al.id, stepId:'trigger_fl'+fluxoId+'_'+novoId(), titulo:fl.trigger||'Avaliação', cat:trigCat, tipo:'prazo', data:triggerDate, done:false, doneDate:null, manual:false, obs:'', fluxoRef:fluxoId, isTrigger:true};
  DB.tasks.push(trigTask); newTasks.push(trigTask.id);
  fl.steps.forEach(step=>{
    const stepTitle=step.nome||(getCatDefs().find(x=>x.id===step.cat)?.label)||'Tarefa';
    const t={id:novoId(), alunoId:al.id, stepId:step.id+'_fl'+fluxoId+'_'+novoId(), titulo:stepTitle, cat:step.cat, tipo:step.tipo, data:addDays(triggerDate,step.dias), done:false, doneDate:null, manual:false, obs:'', fluxoRef:fluxoId};
    DB.tasks.push(t); newTasks.push(t.id);
  });
  crm.fluxos.push({id:fluxoId, triggerDate, tasks:newTasks});
  addHistory(id,'flow_changed','Fluxo adicionado: '+fl.nome,'Data início: '+triggerDate);
  crmSave(); updateBadges(); navAlunoCrm(id); crmToast('Fluxo "'+fl.nome+'" adicionado!');
}
function removeFluxoFromAluno(id,idx){
  const al=findAluno(id); const crm=al&&ensureCrm(al); if(!crm||!crm.fluxos[idx]) return;
  const af=crm.fluxos[idx]; const fl=DB.fluxos.find(f=>f.id===af.id);
  crmConfirm(`Remover o fluxo "${fl?.nome}" e todas as suas tarefas deste cliente?`, ()=>{
    if(af.tasks) DB.tasks=DB.tasks.filter(t=>!af.tasks.includes(t.id));
    crm.fluxos.splice(idx,1);
    crmSave(); updateBadges(); navAlunoCrm(id); crmToast('Fluxo removido','info');
  });
}
function changeFluxoDate(id,idx,newDate){
  const al=findAluno(id); const crm=al&&ensureCrm(al); if(!crm||!crm.fluxos[idx]) return;
  const af=crm.fluxos[idx]; const fl=DB.fluxos.find(f=>f.id===af.id); if(!fl) return;
  af.triggerDate=newDate;
  (af.tasks||[]).forEach(tid=>{
    const t=DB.tasks.find(x=>x.id===tid); if(!t||t.done) return;
    if(t.isTrigger){ t.data=newDate; return; }
    const step=fl.steps.find(s=>t.stepId&&t.stepId.startsWith(s.id+'_fl'));
    if(step&&step.refId==='trigger') t.data=addDays(newDate, step.dias);
  });
  addHistory(id,'flow_changed','Data início: '+fl.nome,'Nova: '+newDate);
  crmSave(); updateBadges(); navAlunoCrm(id); crmToast('Data atualizada! Cadeia recalculada.');
}
function uploadAlunoPhoto(event,alunoId){
  const file=event.target.files[0]; if(!file) return;
  if(file.size>2*1024*1024){ crmToast('Foto muito grande. Máximo 2MB.','err'); event.target.value=''; return; }
  const reader=new FileReader();
  reader.onload=e=>{ const al=findAluno(alunoId); if(!al) return; ensureCrm(al).photoUrl=e.target.result; crmSave(); navAlunoCrm(alunoId); crmToast('Foto atualizada!'); };
  reader.readAsDataURL(file);
}

/* ── DETALHE DO CLIENTE (overlay de tela cheia) ──────────────────────────── */
function navAlunoCrm(id){
  const al=findAluno(id); if(!al) return;
  currentAlunoCrmId=id;
  const el=$('screen-aluno-crm'); if(!el) return;
  el.classList.remove('hidden');
  el.innerHTML = renderAlunoPage(id);
  updateBadges();
}
function closeAlunoCrm(){ const el=$('screen-aluno-crm'); if(el) el.classList.add('hidden'); currentAlunoCrmId=null; }

function renderAlunoPage(id){
  const al=findAluno(id); if(!al) return '';
  const crm=ensureCrm(al);
  const today=todayStr();
  const allTasks=getAlunoTasks(id);
  const pending=allTasks.filter(t=>!t.done);
  const done=allTasks.filter(t=>t.done);
  const urgentes=pending.filter(t=>diffDays(liveDate(t),today)<0).length;

  const statusCfg={lead:{color:'var(--blue)',lbl:'Lead',icon:'sd-blue'},ativo:{color:'var(--accent)',lbl:'Ativo',icon:'sd-green'},pausado:{color:'var(--yellow)',lbl:'Pausado',icon:'sd-amber'},inativo:{color:'var(--text3)',lbl:'Inativo',icon:'sd-gray'},bloqueado:{color:'var(--red)',lbl:'Bloqueado',icon:'sd-red'}};
  const st=situacaoDe(al); const sc=statusCfg[st]||statusCfg.ativo;
  const statusOptions=Object.entries(statusCfg).map(([k,v])=>`<option value="${k}"${k===st?' selected':''}>${v.lbl}</option>`).join('');

  const infoBox=`<div class="card">
    <div style="display:flex;gap:14px;align-items:flex-start">
      <div style="position:relative;flex-shrink:0">
        <div style="width:60px;height:60px;border-radius:50%;background:${corSegura(crm.cor,'#3b82f6')};overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#fff;cursor:pointer" onclick="document.getElementById('aluno-photo-input').click()">
          ${(crm.photoUrl && /^(data:image\/|https:\/\/|blob:)/i.test(crm.photoUrl))?`<img src="${escHTML(crm.photoUrl)}" style="width:100%;height:100%;object-fit:cover">`:initials(alunoNome(al))}
        </div>
        <input type="file" id="aluno-photo-input" accept="image/*" style="display:none" onchange="uploadAlunoPhoto(event,${id})">
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:16px;font-weight:800">${escHTML(alunoNome(al))}${crm.apelido?` <span style="font-weight:500;color:var(--text3);font-size:12px">(${escHTML(crm.apelido)})</span>`:''}</div>
        <select onchange="setAlunoStatus(${id},this.value)" style="margin-top:6px;font-size:12px;padding:2px 6px;color:${sc.color};font-weight:700;width:auto">${statusOptions}</select>
        ${urgentes>0?`<div style="margin-top:6px"><span class="badge badge-red"><i class=ph-siren></i> ${urgentes} vencida(s)</span></div>`:''}
        <div style="margin-top:8px;font-size:13px;color:var(--text2)">
          ${alunoTel(al)?`<i class=ph-device-mobile></i> ${escHTML(alunoTel(al))}<br>`:''}
        </div>
        ${crm.obs?`<div style="margin-top:8px;padding:8px;background:var(--bg4);border-radius:var(--radius);font-size:12px;color:var(--text2)">${escHTML(crm.obs)}</div>`:''}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:12px">
      <button class="btn btn-ghost btn-sm" style="justify-content:center" onclick="openWAForAluno(${id})"><i class=ph-chat-circle-text></i> WhatsApp</button>
      <button class="btn btn-ghost btn-sm" style="justify-content:center" onclick="initAlunoForm(findAluno(${id}));crmOpenModal('m-crm-aluno')"><i class=ph-pencil-simple></i> Editar</button>
      <button class="btn btn-ghost btn-sm" style="justify-content:center" onclick="openManualTaskForAluno(${id})"><i class=ph-plus></i> Tarefa</button>
    </div>
    <div style="margin-top:10px;font-size:12px;color:var(--text3)">${done.length}/${allTasks.length} tarefas concluídas</div>
  </div>`;

  const activeMods=DB.modalidades.filter(m=>!m.archived);
  const assignedFluxos=crm.fluxos||[];
  const allActiveFluxos=DB.fluxos.filter(f=>!f.archived);
  const availableFluxos=allActiveFluxos.filter(f=>!assignedFluxos.find(af=>af.id===f.id));

  const assignedCards=assignedFluxos.map((af,i)=>{
    const fl=DB.fluxos.find(f=>f.id===af.id); if(!fl) return '';
    const afTasks=allTasks.filter(t=>af.tasks&&af.tasks.includes(t.id));
    const afDone=afTasks.filter(t=>t.done).length, afTotal=afTasks.length;
    const pct=afTotal?Math.round(afDone/afTotal*100):0;
    return `<div style="border:1px solid var(--border);border-radius:var(--radius);padding:10px;margin-bottom:8px;background:var(--bg2)">
      <div style="display:flex;align-items:center;gap:8px">
        <span>${icHTML(fl.icon||'ph-gear')}</span>
        <div style="flex:1;font-size:13px;font-weight:700">${escHTML(fl.nome)}</div>
        <input type="date" value="${af.triggerDate}" onchange="changeFluxoDate(${id},${i},this.value)" style="font-size:12px;padding:2px 4px;width:120px">
        <button class="icon-btn danger" onclick="removeFluxoFromAluno(${id},${i})" title="Remover" aria-label="Remover"><i class=ph-x></i></button>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:6px">
        <div style="flex:1;height:5px;background:var(--bg4);border-radius:6px;overflow:hidden"><div style="height:100%;width:${pct}%;background:var(--accent)"></div></div>
        <span style="font-size:12px;color:var(--text3)">${afDone}/${afTotal}</span>
      </div>
    </div>`;
  }).join('');
  const addFluxoSection = availableFluxos.length ? `<div style="display:flex;gap:6px;margin-top:8px">
      <select id="add-fluxo-sel" style="flex:1">${availableFluxos.map(f=>`<option value="${f.id}">${escHTML(f.nome)}</option>`).join('')}</select>
      <input type="date" id="add-fluxo-date" value="${today}" style="width:130px">
      <button class="btn btn-primary btn-sm" onclick="addFluxoToAluno(${id})">Adicionar</button>
    </div>` : `<div style="font-size:12px;color:var(--text3)">Todos os fluxos já foram atribuídos.</div>`;

  const mfBox=`<div class="card">
    <div class="card-title"><i class=ph-tag></i> Modalidade &amp; Fluxos</div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
      <label style="font-size:13px;color:var(--text2);font-weight:600">Modalidade</label>
      <select onchange="changeAlunoMod(${id},this.value)" style="flex:1">
        <option value="">— Sem modalidade —</option>
        ${activeMods.map(m=>`<option value="${m.id}"${crm.modId===m.id?' selected':''}>${escHTML(m.nome)}</option>`).join('')}
      </select>
    </div>
    ${assignedCards || '<div style="font-size:13px;color:var(--text3);padding:6px 0">Nenhum fluxo atribuído.</div>'}
    <div style="border-top:1px solid var(--border);padding-top:10px;margin-top:4px">${addFluxoSection}</div>
  </div>`;

  const catDefs=getCatDefs();
  const presentCatIds=[...new Set(allTasks.map(t=>t.cat))];
  const order=crm.pipeOrder||catDefs.map(c=>c.id);
  const orderedCatIds=[...order.filter(cid=>presentCatIds.includes(cid)), ...presentCatIds.filter(cid=>!order.includes(cid))];
  const catCols=orderedCatIds.map(catId=>{
    const cat=catDefs.find(c=>c.id===catId)||{label:catLabel(catId),icon:catIcon(catId),color:'#6b7280'};
    const tasks=allTasks.filter(t=>t.cat===catId).sort((a,b)=>liveDate(a).localeCompare(liveDate(b)));
    const cards=mergeTasks(tasks).map(m=>{
      const ids=m.tasks.map(t=>t.id).join(',');
      return buildPipeCard(m,'aluno',al,`toggleTaskDoneMany('${ids}')`,`toggleTaskDoneMany('${ids}')`);
    }).join('');
    return `<div style="min-width:220px;max-width:250px;flex-shrink:0">
      <div style="border-top:3px solid ${cat.color};background:var(--bg2);border:1px solid var(--border);border-top-width:3px;border-top-color:${cat.color};border-radius:var(--radius) var(--radius) 0 0;padding:7px 9px;font-size:12px;font-weight:700;color:${cat.color}">${icHTML(cat.icon)} ${escHTML(cat.label)}</div>
      <div style="border:1px solid var(--border);border-top:none;border-radius:0 0 var(--radius) var(--radius);padding:7px;min-height:60px;background:var(--bg)">${cards||'<div style="color:var(--text3);font-size:12px;text-align:center;padding:8px"><i class=ph-check></i> Em dia</div>'}</div>
    </div>`;
  }).join('');

  return `<div style="padding:18px 24px;max-width:1200px;margin:0 auto">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
      <button class="btn btn-ghost btn-sm" onclick="closeAlunoCrm()"><i class=ph-arrow-left></i>Voltar</button>
      <div style="font-size:15px;font-weight:700">${escHTML(alunoNome(al))}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start">${infoBox}${mfBox}</div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin:16px 0 10px">
      <div style="font-size:14px;font-weight:700"><i class=ph-arrows-clockwise></i> Pipeline — por categoria</div>
      <button class="btn btn-ghost btn-sm" onclick="openPipeOrderModal(${id})"><i class=ph-arrows-down-up></i>Editar ordem</button>
    </div>
    <div style="display:flex;gap:12px;overflow-x:auto;padding-bottom:8px">${catCols||'<div class="empty"><i class=ph-kanban></i><div class="empty-title">Nenhuma tarefa ainda</div><div class="empty-text">Adicione um fluxo acima para gerar as tarefas.</div></div>'}</div>
  </div>`;
}
