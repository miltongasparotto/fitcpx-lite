// ══════════════════════════════════════════════════════════════════════════
// CRM — CATEGORIAS DE PRAZO (extraído do FitCPX Flow)
// ══════════════════════════════════════════════════════════════════════════
// Categorias classificam ETAPAS/TAREFAS do CRM (Avaliação, Treino,
// Monitoramento, Reavaliação, Renovação + customizadas). Não confundir com
// ARQ_LABEL/ARQ_TIPO_POR_COLECAO do Auto, que classificam arquivos salvos.
//
// Simplificação em relação ao Flow: sem LEGACY_CAT_MAP (não existe dado
// legado pra migrar no Lite — o CRM nasce zerado) e sem seletor de ícone via
// dropdown de emojis (campo de texto simples, mesma função).

function seedPresetCats(){
  if(!DB.customCats) DB.customCats=[];
  if(!DB.deletedCats) DB.deletedCats=[];
  if(!(DB.customCats.length || DB.deletedCats.length)){   // ainda não semeado
    const presets=[
      {label:'Avaliação',     icon:'ph-clipboard-text', color:'#8b5cf6'},
      {label:'Treino',        icon:'ph-barbell', color:'#3b82f6'},
      {label:'Monitoramento', icon:'ph-chart-bar', color:'#00b37e'},
      {label:'Reavaliação',   icon:'ph-magnifying-glass', color:'#f97316'},
      {label:'Renovação',     icon:'ph-arrows-clockwise', color:'#f59e0b'},
    ];
    presets.forEach(ps=>{ DB.customCats.push({id:novoId(), ...ps}); });
    crmSave();
  }
  // Fluxos de fábrica dependem das categorias acima (js/crm-fluxos.js).
  if(typeof seedKitFluxos==='function') seedKitFluxos();
}

function getCatDefs(){
  if(!DB.customCats) DB.customCats=[];
  if(!DB.deletedCats) DB.deletedCats=[];
  DB.customCats.forEach(c=>{ c.color = corSegura(c.color); });   // cor entra em atributo style
  return DB.customCats.filter(c=>!c.archived);
}
function resolveCatId(cat){ return cat; } // sem migração legada — mantido por compat de nome
function catLabel(cat){ const d=getCatDefs().find(c=>c.id===cat)||DB.customCats.find(c=>c.id===cat); return d?d.label:'—'; }
function catIcon(cat){ const d=getCatDefs().find(c=>c.id===cat)||DB.customCats.find(c=>c.id===cat); return d?d.icon:'ph-clipboard-text'; }
function catColor(cat){ const d=getCatDefs().find(c=>c.id===cat)||DB.customCats.find(c=>c.id===cat); return d?corSegura(d.color):'#6b7280'; }
function catTagStyle(cat){ const c=catColor(cat); return `background:${c}1a;color:${c};`; }
function catDuracao(cat){ const c=getCatDefs().find(x=>x.id===cat); return (c&&c.duracao>0)?c.duracao:0; }
// urgDays()/catUrgDays() ficam em js/crm-tarefas.js (dependem de DB.config).

// ── CRUD ────────────────────────────────────────────────────────────────
function initCatForm(cat){
  $('cat-id').value = cat?cat.id:'';
  $('cat-label').value = cat?cat.label:'';
  icPickerSet('cat-icon', cat?cat.icon:'ph-clipboard-text');
  $('cat-color').value = cat?cat.color:CAT_PALETTE[DB.customCats.length%CAT_PALETTE.length];
  $('cat-urgdays').value = cat&&cat.urgDays>0?cat.urgDays:'';
  $('cat-duracao').value = cat&&cat.duracao>0?cat.duracao:'';
  $('m-crm-cat-ttl').textContent = cat?'Editar Categoria':'Nova Categoria';
}
function editCat(id){ initCatForm(DB.customCats.find(c=>c.id===id)); crmOpenModal('m-crm-cat'); }
function saveCat(){
  const label=$('cat-label').value.trim();
  if(!label){ crmToast('Preencha o nome da categoria','err'); return; }
  const id=$('cat-id').value?Number($('cat-id').value):null;
  const icon=$('cat-icon').value.trim()||'ph-clipboard-text';
  const color=$('cat-color').value||'#8b5cf6';
  const urgDaysVal=parseInt($('cat-urgdays').value||'',10);
  const duracaoVal=parseInt($('cat-duracao').value||'',10);
  const data={ label, icon, color };
  if(urgDaysVal>0) data.urgDays=urgDaysVal; else data.urgDays=undefined;
  if(duracaoVal>0) data.duracao=duracaoVal; else data.duracao=undefined;
  if(id){
    const c=DB.customCats.find(x=>x.id===id);
    if(c) Object.assign(c,data);
    crmToast('Categoria atualizada');
  } else {
    DB.customCats.push({id:novoId(), ...data});
    crmToast('Categoria criada');
  }
  crmSave(); crmCloseModal('m-crm-cat'); renderFluxosCRM();
}
function moveCat(id,dir){
  const active=getCatDefs(); const idx=active.findIndex(c=>c.id===id); const tgt=active[idx+dir]; if(!tgt) return;
  const i=DB.customCats.findIndex(c=>c.id===id), j=DB.customCats.findIndex(c=>c.id===tgt.id);
  [DB.customCats[i],DB.customCats[j]]=[DB.customCats[j],DB.customCats[i]];
  crmSave(); renderFluxosCRM();
}
function deleteCatSafe(id){
  const inUse = DB.tasks.some(t=>t.cat===id) || DB.fluxos.some(f=>f.steps.some(s=>s.cat===id)||f.triggerCat===id);
  const cat=DB.customCats.find(c=>c.id===id);
  const label=cat?cat.label:'';
  const msg = inUse
    ? `A categoria "${label}" está em uso por tarefas/fluxos. Arquivar mesmo assim? (deixa de aparecer para novas etapas, mas tarefas existentes continuam.)`
    : `Arquivar a categoria "${label}"?`;
  crmConfirm(msg, ()=>{
    if(cat){ cat.archived=true; }
    crmSave(); renderFluxosCRM(); crmToast('Categoria arquivada','info');
  });
}
function restoreCat(id){ const c=DB.customCats.find(x=>x.id===id); if(c) delete c.archived; crmSave(); renderFluxosCRM(); crmToast('Categoria restaurada'); }
function deleteCatPermanent(id){
  const inUse = DB.tasks.some(t=>t.cat===id) || DB.fluxos.some(f=>f.steps.some(s=>s.cat===id)||f.triggerCat===id);
  if(inUse){ crmToast('Categoria ainda em uso por tarefas/fluxos — não é possível excluir definitivamente.','err'); return; }
  crmConfirm('Excluir definitivamente esta categoria? Não pode ser desfeito.', ()=>{
    DB.customCats=DB.customCats.filter(c=>c.id!==id);
    DB.deletedCats.push(id);
    crmSave(); renderFluxosCRM(); crmToast('Categoria excluída','info');
  });
}
let _crmArqCatsOpen=false;
function toggleArqCats(){ _crmArqCatsOpen=!_crmArqCatsOpen; renderFluxosCRM(); }

function renderSetupCategorias(){
  const catDefs=getCatDefs();
  const arq=DB.customCats.filter(c=>c.archived);
  const rows=catDefs.map((cat,idx)=>`
    <div class="lrow">
      <div class="lrow-mv">
        <button class="icon-btn" onclick="moveCat(${cat.id},-1)" ${idx===0?'disabled':''} aria-label="Subir"><i class=ph-caret-up></i></button>
        <button class="icon-btn" onclick="moveCat(${cat.id},1)" ${idx===catDefs.length-1?'disabled':''} aria-label="Descer"><i class=ph-caret-down></i></button>
      </div>
      <span class="lrow-ic" style="color:${cat.color}">${icHTML(cat.icon)}</span>
      <div class="lrow-t">${escHTML(cat.label)}
        ${cat.urgDays>0?`<span class="badge badge-blue" style="margin-left:8px"><i class=ph-lightning></i>${cat.urgDays}d</span>`:''}
        ${cat.duracao>0?`<span class="badge badge-gray" style="margin-left:4px"><i class=ph-clock></i>${cat.duracao}min</span>`:''}
      </div>
      <button class="btn btn-ghost btn-sm" onclick="editCat(${cat.id})"><i class=ph-pencil-simple></i>Editar</button>
      <button class="icon-btn" onclick="deleteCatSafe(${cat.id})" title="Arquivar" aria-label="Arquivar"><i class=ph-archive></i></button>
    </div>`).join('');
  const arqSection = arq.length ? `
    <div style="margin-top:10px;border-top:1px solid var(--border);padding-top:10px">
      <button class="btn btn-ghost btn-sm" onclick="toggleArqCats()"><i class=ph-archive></i>${arq.length} arquivada${arq.length===1?'':'s'}: ${_crmArqCatsOpen?'ocultar':'ver'}</button>
      ${_crmArqCatsOpen?arq.map(c=>`<div style="display:flex;align-items:center;gap:10px;padding:7px 10px;margin-top:6px;border:1px dashed var(--border);border-radius:var(--radius);opacity:.7">
        <span style="font-size:16px">${icHTML(c.icon||'ph-clipboard-text')}</span>
        <div style="flex:1;font-size:13px">${escHTML(c.label)}</div>
        <button class="btn btn-ghost btn-sm" onclick="restoreCat(${c.id})"><i class=ph-recycle></i> Restaurar</button>
        <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="deleteCatPermanent(${c.id})"><i class=ph-trash></i>Excluir</button>
      </div>`).join(''):''}
    </div>` : '';
  return `<div class="card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div class="card-title" style="margin:0"><i class=ph-tag></i> Categorias de Tarefas (${catDefs.length})</div>
      <button class="btn btn-primary btn-sm" onclick="initCatForm(null);crmOpenModal('m-crm-cat')"><i class=ph-plus></i> Nova Categoria</button>
    </div>
    ${rows || '<div class="empty"><i class=ph-tag></i><div class="empty-title">Nenhuma categoria</div><div class="empty-text">Crie a primeira para organizar as tarefas.</div></div>'}
    ${arqSection}
  </div>`;
}
