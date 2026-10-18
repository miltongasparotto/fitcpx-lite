// ══════════════════════════════════════════════════════════════════════════
// CRM — TEMPLATES E ENVIO DE WHATSAPP (extraído do FitCPX Flow)
// ══════════════════════════════════════════════════════════════════════════
// Envio continua sendo só o deep link wa.me — nada de API paga. O número do
// aluno vem de student.perfil.whatsapp (não duplicamos campo em student.crm).
// Simplificação: sem o studio de edição com busca/categorias em accordion do
// Flow — lista simples de templates com editar/excluir/enviar, e no modal de
// envio um <select> agrupado por categoria no lugar do dropdown com busca.

// Variáveis do personal e do studio, iguais para qualquer aluno: {studio}, {personal}, {whatsappStudio} vêm de
// Configurações > Marca; {cref} vem de Configurações > Perfil.
function waVarsStudio(txt){
  const c = (typeof DB !== 'undefined' && DB.config) || {};
  return String(txt || '')
    .replace(/{studio}/g, c.studioName || 'Studio')
    .replace(/{personal}/g, c.personalName || '')
    .replace(/{cref}/g, c.cref || '')
    .replace(/{whatsappStudio}/g, c.whatsapp || '');
}

function replaceVars(msg, al){
  const mod=DB.modalidades.find(m=>m.id===al.crm?.modId);
  const firstName=alunoNomeMsg(al);
  const firstAf=(al.crm?.fluxos||[])[0];
  const dias=firstAf?diffDays(todayStr(), firstAf.triggerDate):0;
  return waVarsStudio((msg||'')
    .replace(/{nome}/g, firstName)
    .replace(/{nomeCompleto}/g, alunoNome(al))
    .replace(/{modalidade}/g, mod?mod.nome:'')
    .replace(/{dias}/g, Math.abs(dias)));
}

/* ── CRUD DE TEMPLATES ───────────────────────────────────────────────────── */
let _waEditId=null;
function waStudioNew(){ _waEditId=null; renderWhatsappCRM(); }
function waStudioEdit(id){ _waEditId=id; renderWhatsappCRM(); }
function delWATpl(id){
  crmConfirm('Excluir este template?', ()=>{
    const t=DB.waTpls.find(x=>x.id===id);
    if(t&&t.sys){ if(!DB.waSysApagados) DB.waSysApagados={}; DB.waSysApagados[t.sys]=true; }   // modelo de fábrica apagado não volta
    DB.waTpls=DB.waTpls.filter(x=>x.id!==id); crmSave(); renderWhatsappCRM(); crmToast('Template excluído','info');
  });
}
function saveWATpl(){
  const nome=$('wt-nome').value.trim();
  const msg=$('wt-msg').value.trim();
  if(!nome||!msg){ crmToast('Preencha nome e mensagem','err'); return; }
  const cat=$('wt-cat').value?Number($('wt-cat').value):null;
  const evento=$('wt-evento')?$('wt-evento').value:'';
  if(_waEditId){
    const t=DB.waTpls.find(x=>x.id===_waEditId);
    if(t) Object.assign(t,{nome,msg,cat,evento});
    crmToast('Template atualizado');
  } else {
    DB.waTpls.push({id:novoId(), nome, msg, cat, evento});
    crmToast('Template criado');
  }
  crmSave(); _waEditId=null; renderWhatsappCRM();
}
function insertWAVar(v){
  const ta=$('wt-msg'); if(!ta) return;
  const s=ta.selectionStart, e=ta.selectionEnd;
  ta.value=ta.value.slice(0,s)+v+ta.value.slice(e);
  ta.selectionStart=ta.selectionEnd=s+v.length; ta.focus();
}
// Mesma coisa, mas para a textarea do modal de ENVIO (#wa-msg) — não confundir
// com insertWAVar(), que edita o template no editor da tela WhatsApp (#wt-msg).
function insertWAVarSend(v){
  const ta=$('wa-msg'); if(!ta) return;
  const s=ta.selectionStart, e=ta.selectionEnd;
  ta.value=ta.value.slice(0,s)+v+ta.value.slice(e);
  ta.selectionStart=ta.selectionEnd=s+v.length; ta.focus();
}

/* ── ENVIO ───────────────────────────────────────────────────────────────── */
let curWA={alunoId:null, msg:''};
function _buildWATplOptions(selectedId){
  const catDefs=getCatDefs();
  let html='<option value="">Digitar mensagem livre</option>';
  const groups={};
  DB.waTpls.forEach(t=>{ const g=t.cat||'__geral__'; (groups[g]=groups[g]||[]).push(t); });
  [...catDefs.map(c=>c.id),'__geral__'].filter(g=>groups[g]).forEach(g=>{
    const cat=catDefs.find(c=>c.id===g);
    html+=`<optgroup label="${cat?escHTML(cat.label):'Geral'}">`;
    groups[g].forEach(t=>{ html+=`<option value="${t.id}"${selectedId===t.id?' selected':''}>${escHTML(t.nome)}</option>`; });
    html+='</optgroup>';
  });
  return html;
}
function setupWA(al, msg, tplId){
  curWA={alunoId:al.id, msg};
  $('wa-name').textContent=alunoNome(al);
  $('wa-phone').textContent=alunoTel(al)||'Sem telefone';
  $('wa-tpl-sel').innerHTML=_buildWATplOptions(tplId||null);
  $('wa-msg').value=msg;
  $('wa-ddi').innerHTML=crmDdiOptions(waDdiPadrao());   // padrão = DDI do studio (Configurações > Marca)
  crmOpenModal('m-crm-wa');
}
function openWA(alunoId){
  const al=findAluno(alunoId); if(!al) return;
  const favTpl=DB.waTpls.find(t=>t.fav) || null;
  const msg = favTpl ? replaceVars(favTpl.msg, al) : `Olá ${alunoNomeMsg(al)}! Tudo bem?`;
  setupWA(al, msg, favTpl?favTpl.id:null);
}
function openWAForAluno(alunoId){
  const al=findAluno(alunoId); if(!al) return;
  setupWA(al, `Olá ${alunoNomeMsg(al)}! Tudo bem?`, null);
}
function selectWATpl(){
  const sel=$('wa-tpl-sel'); const id=sel.value?Number(sel.value):null;
  const al=findAluno(curWA.alunoId); if(!al) return;
  if(!id) return; // livre — mantém o que está digitado
  const tpl=DB.waTpls.find(t=>t.id===id); if(!tpl) return;
  $('wa-msg').value=replaceVars(tpl.msg, al);
}
const CRM_DDI_LIST=[
  {code:'55',flag:'🇧🇷',name:'Brasil'},{code:'351',flag:'🇵🇹',name:'Portugal'},
  {code:'1',flag:'🇺🇸',name:'EUA/Canadá'},{code:'34',flag:'🇪🇸',name:'Espanha'},
  {code:'54',flag:'🇦🇷',name:'Argentina'},{code:'598',flag:'🇺🇾',name:'Uruguai'},
  {code:'595',flag:'🇵🇾',name:'Paraguai'},{code:'56',flag:'🇨🇱',name:'Chile'},
  {code:'57',flag:'🇨🇴',name:'Colômbia'},{code:'52',flag:'🇲🇽',name:'México'},
  {code:'39',flag:'🇮🇹',name:'Itália'},{code:'33',flag:'🇫🇷',name:'França'},
  {code:'49',flag:'🇩🇪',name:'Alemanha'},{code:'44',flag:'🇬🇧',name:'Reino Unido'},
];
function crmDdiOptions(sel){
  return CRM_DDI_LIST.map(c=>'<option value="'+c.code+'"'+(c.code===sel?' selected':'')+'>'+c.flag+' +'+c.code+' '+escHTML(c.name)+'</option>').join('');
}
function doSendWA(){
  const msg=$('wa-msg').value;
  const ddi=$('wa-ddi').value||waDdiPadrao();
  const fone=waFoneInternacional(alunoTel(findAluno(curWA.alunoId)), ddi);   // número com "+código" ignora o código do seletor
  if(!fone){ crmToast('Número de telefone não cadastrado','err'); return; }
  window.open(`https://wa.me/${fone}?text=${encodeURIComponent(msg)}`,'_blank');
  crmCloseModal('m-crm-wa'); crmToast('WhatsApp aberto!');
}

/* ── TELA ────────────────────────────────────────────────────────────────── */
let _waTab='modelos';   // 'modelos' | 'enviar'
function waIrParaAba(tab){ _waTab=tab; renderWhatsappCRM(); }
function renderWhatsappCRM(){
  const el=$('screen-whatsapp-body'); if(!el) return;
  if(typeof waGarantirModelos==='function') waGarantirModelos();
  const nFila = (typeof waPendentes==='function') ? waPendentes().length : 0;
  const tabsHtml = `<div class="seg" style="margin-bottom:16px">
    <button class="seg-btn${_waTab==='modelos'?' active':''}" onclick="waIrParaAba('modelos')"><i class=ph-chat-circle-text></i>Modelos</button>
    <button class="seg-btn${_waTab==='enviar'?' active':''}" onclick="waIrParaAba('enviar')"><i class=ph-paper-plane-tilt></i>A enviar<span class="seg-n">${nFila}</span></button>
  </div>`;
  if(_waTab==='enviar' && typeof waRenderFila==='function'){ el.innerHTML = tabsHtml + waRenderFila(); return; }
  const catDefs=getCatDefs();
  const editing=_waEditId?DB.waTpls.find(t=>t.id===_waEditId):null;
  const catOptions='<option value="">— Sem categoria —</option>'+catDefs.map(c=>`<option value="${c.id}"${editing&&editing.cat===c.id?' selected':''}>${escHTML(c.label)}</option>`).join('');

  const eventoOptions='<option value="">Nenhum (só envio manual)</option>'+Object.keys(WA_EVENTOS).map(k=>'<option value="'+k+'"'+(editing&&editing.evento===k?' selected':'')+'>'+escHTML(WA_EVENTOS[k])+'</option>').join('');

  const listHtml = DB.waTpls.length ? DB.waTpls.map(t=>{
    const cat=catDefs.find(c=>c.id===t.cat);
    return `<div class="lrow${_waEditId===t.id?' sel':''}">
      <div style="flex:1;min-width:0">
        <div class="lrow-t" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">${escHTML(t.nome)} ${t.evento&&WA_EVENTOS[t.evento]?`<span class="badge badge-blue"><i class=ph-bell></i>${escHTML(WA_EVENTOS[t.evento])}</span>`:''} ${cat?`<span class="badge badge-gray"><span style="color:${cat.color};display:inline-flex">${icHTML(cat.icon)}</span>${escHTML(cat.label)}</span>`:''}</div>
        <div class="lrow-sub">${escHTML(t.msg)}</div>
      </div>
      <div style="display:flex;gap:2px;flex-shrink:0">
        <button class="icon-btn" onclick="toggleWATplFav(${t.id})" title="Favoritar" aria-label="Favoritar" ${t.fav?'style="color:var(--amber)"':''}><i class=ph-star></i></button>
        <button class="icon-btn" onclick="waStudioEdit(${t.id})" title="Editar" aria-label="Editar"><i class=ph-pencil-simple></i></button>
        <button class="icon-btn" onclick="delWATpl(${t.id})" title="Remover" aria-label="Remover"><i class=ph-trash></i></button>
      </div>
    </div>`;
  }).join('') : `<div class="empty"><i class=ph-chat-circle-text></i><div class="empty-title">Nenhuma mensagem salva</div><div class="empty-text">Salve modelos com variáveis como {nome} e reaproveite no WhatsApp de cada cliente.</div></div>`;

  el.innerHTML = `<div class="wa-grid">
    <div class="card">
      <div class="card-title">Mensagens salvas <span class="badge badge-gray">${DB.waTpls.length}</span></div>
      ${listHtml}
    </div>
    <div class="card">
      <div class="card-title">${_waEditId?'Editando mensagem':'Nova mensagem'}</div>
      <div class="field"><label>Nome *</label><input id="wt-nome" type="text" value="${editing?escHTML(editing.nome):''}" placeholder="Ex: Acompanhamento 7 dias"></div>
      <div class="field"><label>Categoria</label><select id="wt-cat">${catOptions}</select></div>
      <div class="field"><label>Avisar quando</label><select id="wt-evento">${eventoOptions}</select>
        <div class="field-sub">O aviso entra na aba A enviar quando o evento acontece. "Nenhum" deixa só o envio manual.</div></div>
      <div class="field"><label>Mensagem *</label><textarea id="wt-msg" style="min-height:180px">${editing?escHTML(editing.msg):''}</textarea>
        <div class="field-sub">Variáveis (clique para inserir no texto):</div></div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:4px">
        <button class="tbtn" onclick="insertWAVar('{nome}')">{nome}</button>
        <button class="tbtn" onclick="insertWAVar('{nomeCompleto}')">{nomeCompleto}</button>
        <button class="tbtn" onclick="insertWAVar('{modalidade}')">{modalidade}</button>
        <button class="tbtn" onclick="insertWAVar('{studio}')">{studio}</button>
        <button class="tbtn" onclick="insertWAVar('{personal}')">{personal}</button>
        <button class="tbtn" onclick="insertWAVar('{vencimento}')">{vencimento}</button>
        <button class="tbtn" onclick="insertWAVar('{dias}')">{dias}</button>
      </div>
      <div class="btn-row">
        ${_waEditId?`<button class="btn btn-ghost" onclick="waStudioNew()">Cancelar edição</button>`:''}
        <button class="btn btn-primary" onclick="saveWATpl()"><i class=ph-floppy-disk></i>Salvar mensagem</button>
      </div>
    </div>
  </div>`;
}
function toggleWATplFav(id){
  const t=DB.waTpls.find(x=>x.id===id); if(!t) return;
  t.fav=!t.fav; crmSave(); renderWhatsappCRM();
}
