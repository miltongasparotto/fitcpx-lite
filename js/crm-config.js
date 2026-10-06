// ══════════════════════════════════════════════════════════════════════════
// CRM — CONFIGURAÇÕES (extraído do FitCPX Flow, minimizado)
// ══════════════════════════════════════════════════════════════════════════
// Decisão da seção 6.8 da estratégia: por ora só o necessário pro CRM
// funcionar (studioName, personalName, whatsapp do studio, urgencyDays).
// Nada de tema (o Auto já tem o seu, classe `.dark` em <html>) nem backup
// local (o Auto já tem exportar/importar JSON em js/integracao-google.js).

function renderConfigCRM(){
  const el=$('screen-config-body'); if(!el) return;
  const c=DB.config;
  el.innerHTML = `<div class="card" style="max-width:480px">
    <div class="card-title"><i class=ph-wrench></i> Configurações do CRM</div>
    <div class="field"><label>Nome do Studio</label><input id="cfg-studio" type="text" value="${escHTML(c.studioName||'')}" placeholder="Ex: Studio Movimento"></div>
    <div class="field"><label>Seu nome</label><input id="cfg-name" type="text" value="${escHTML(c.personalName||'')}" placeholder="Ex: João Silva"></div>
    <div class="field"><label>WhatsApp do Studio</label><input id="cfg-wa" type="text" value="${escHTML(c.whatsapp||'')}" placeholder="(11) 99999-0000"></div>
    <div class="field"><label>Alerta de prazo próximo (dias de antecedência)</label>
      <select id="cfg-urgdays">${[1,2,3,5,7].map(n=>`<option value="${n}"${(c.urgencyDays||3)===n?' selected':''}>${n} dia(s) antes</option>`).join('')}</select>
    </div>
    <div class="btn-row" style="justify-content:flex-start">
      <button class="btn btn-primary" onclick="saveConfigCRM()"><i class=ph-check-circle></i> Salvar</button>
      <span id="cfg-saved-at" style="font-size:12px;color:var(--text3);align-self:center">${c._savedAt?'Salvo às '+c._savedAt:''}</span>
    </div>
  </div>
  <div class="card" style="max-width:480px;margin-top:14px">
    <div class="card-title"><i class=ph-wrench></i> Manutenção</div>
    <div style="font-size:12px;color:var(--text2);margin-bottom:10px">Reconstrói do zero as tarefas automáticas (fluxos) de <strong>todos</strong> os clientes. <i class=ph-warning></i> Isso apaga o "concluído" de tarefas automáticas já marcadas como feitas em todo o CRM — só tarefas manuais (as criadas avulsas, sem fluxo) não são afetadas. Use só se o CRM estiver com dado quebrado.</div>
    <button class="btn btn-danger" onclick="crmRegenAllTasksUI()"><i class=ph-arrows-clockwise></i> Recalcular tarefas dos fluxos (todos os clientes)</button>
  </div>`;
}
function crmRegenAllTasksUI(){
  crmConfirm('Isso vai apagar o "concluído" de TODAS as tarefas automáticas de TODOS os clientes e recriá-las do zero (mesmas datas). Tarefas manuais não são afetadas. Confirma?', ()=>{
    regenAllTasks();
    renderConfigCRM();
    updateBadges();
    crmToast('Tarefas dos fluxos recalculadas');
  });
}
function saveConfigCRM(){
  DB.config.studioName=$('cfg-studio').value.trim()||'FitCPX Lite';
  DB.config.personalName=$('cfg-name').value.trim();
  DB.config.whatsapp=$('cfg-wa').value.trim();
  DB.config.urgencyDays=+$('cfg-urgdays').value;
  DB.config._savedAt=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  crmSave();
  const el=$('cfg-saved-at'); if(el) el.textContent='Salvo às '+DB.config._savedAt;
  crmToast('Configurações salvas!');
}
