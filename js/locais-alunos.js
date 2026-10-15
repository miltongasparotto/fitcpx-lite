// ══════════════════════════════════════════════════════════════════════════
// LOCAIS DE ALUNOS — aba dentro da tela "Locais de Treino" (Fase 4)
// ══════════════════════════════════════════════════════════════════════════
// Diferente de LIBS.locais (locais do PRÓPRIO personal, client-side, usados
// direto no motor de prescrição): estes são locais que o ALUNO cadastrou pelo
// Portal (aluno/), com região (cidade/estado/país) pra busca — várias contas
// de alunos que treinam no mesmo lugar (ex: mesma academia via consultoria)
// apontam pro mesmo registro, sem duplicar equipamento. Tabelas Supabase
// próprias (locais_treino / locais_treino_alunos, RLS em supabase/sql/onboarding-aluno.sql),
// fora do blob app_data — o aluno não tem acesso ao LIBS do personal.
//
// Zero mudança no motor de prescrição: ambos os tipos de local guardam
// `equipamentos` como array de chaves do mesmo EQUIP_LISTA — quando o
// personal for prescrever, basta ele enxergar esta lista junto da de LIBS
// (isso é trabalho de outra fase, quando o motor ganhar o seletor unificado).

let _locaisAlunosData = []; // [{ local, vinculos:[{id,aluno_user_id}] }]

function switchLocaisTab(tab){
  toggle('locais-sub-meus', tab==='meus');
  toggle('locais-sub-alunos', tab==='alunos');
  const tMeus=$('locais-tab-meus'), tAlunos=$('locais-tab-alunos');
  if(tMeus) tMeus.classList.toggle('active', tab==='meus');
  if(tAlunos) tAlunos.classList.toggle('active', tab==='alunos');
  const actions = $('locais-header-actions');
  if(actions) actions.style.display = tab==='meus' ? '' : 'none';
  if(tab==='alunos') carregarLocaisAlunos();
}

async function carregarLocaisAlunos(){
  const grid = $('locais-alunos-grid'); if(!grid) return;
  if(!_supaUser){ grid.innerHTML = ''; return; }
  grid.innerHTML = '<div style="color:var(--text3);font-size:13px">Carregando...</div>';
  const [{ data:locais, error:e1 }, { data:vinculos, error:e2 }] = await Promise.all([
    supa.from('locais_treino').select('*').eq('trainer_user_id', _supaUser.id).order('nome'),
    supa.from('locais_treino_alunos').select('*').eq('trainer_user_id', _supaUser.id),
  ]);
  if(e1 || e2){ grid.innerHTML = '<div class="alert alert-amber">Erro ao carregar locais de alunos.</div>'; return; }
  _locaisAlunosData = (locais||[]).map(loc => ({
    local: loc,
    vinculos: (vinculos||[]).filter(v=>v.local_id===loc.id),
  }));
  renderLocaisAlunos();
}

function renderLocaisAlunos(){
  const grid = $('locais-alunos-grid'); if(!grid) return;
  const busca = ($('locais-alunos-busca')?.value || '').toLowerCase().trim();
  const lista = _locaisAlunosData.filter(({local})=>{
    if(!busca) return true;
    return [local.nome, local.cidade, local.estado, local.pais].some(v=>(v||'').toLowerCase().includes(busca));
  });
  grid.innerHTML = '';
  if(!lista.length){
    grid.innerHTML = '<div style="color:var(--text3);font-size:13px;padding:20px 0">Nenhum local de aluno encontrado.</div>';
    return;
  }
  lista.forEach(({local:loc, vinculos})=>{
    const nomes = vinculos.map(v => ((typeof students!=='undefined' && students.find(s=>s.perfil && s.perfil.alunoUserId===v.aluno_user_id)) || {perfil:{}}).perfil.nome || 'Aluno não importado ainda');
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <div>
          <div style="font-weight:600;font-size:14px;color:var(--text)">${escHTML(loc.nome)}</div>
          <div style="font-size:12px;color:var(--text3)">${escHTML(loc.cidade||'—')}, ${escHTML(loc.estado||'—')} — ${escHTML(loc.pais||'—')}</div>
          <div style="font-size:12px;color:var(--text3);margin-top:2px">${escHTML(loc.tipo||'')} · ${(loc.equipamentos||[]).length} equipamentos</div>
        </div>
        <span class="badge ${loc.compartilhado?'badge-blue':'badge-gray'}" style="font-size:12px;white-space:nowrap">${loc.compartilhado?'<i class=ph-globe></i> Compartilhado':'<i class=ph-lock></i> Só este aluno'}</span>
      </div>
      <div style="font-size:12px;color:var(--text2);margin-top:8px">
        ${nomes.length ? '<i class=ph-user></i> '+nomes.map(escHTML).join(', ') : '<span style="color:var(--text3)">Sem aluno vinculado</span>'}
      </div>
      <div class="btn-row" style="margin-top:10px;padding:0;justify-content:flex-start;gap:8px">
        <button class="btn btn-ghost btn-sm" onclick="abrirModalLocalAluno('${loc.id}')">Editar equipamentos</button>
        <button class="btn btn-ghost btn-sm" onclick="alternarCompartilhadoLocal('${loc.id}', ${!loc.compartilhado})">${loc.compartilhado?'Tornar só deste aluno':'Compartilhar com outros alunos'}</button>
      </div>`;
    grid.appendChild(card);
  });
}

async function alternarCompartilhadoLocal(id, compartilhado){
  const { error } = await supa.from('locais_treino').update({ compartilhado }).eq('id', id);
  if(error){ alert('Erro ao atualizar: '+error.message); return; }
  carregarLocaisAlunos();
}

function abrirModalLocalAluno(id){
  const item = _locaisAlunosData.find(x=>x.local.id===id); if(!item) return;
  const loc = item.local;
  $('local-aluno-edit-id').value = loc.id;
  $('local-aluno-nome').value = loc.nome||'';
  $('local-aluno-cidade').value = loc.cidade||'';
  $('local-aluno-estado').value = loc.estado||'';
  $('local-aluno-pais').value = loc.pais||'';
  $('local-aluno-tipo').value = loc.tipo||'Academia completa';
  $('local-aluno-obs').value = loc.obs||'';
  const wrap = $('local-aluno-equip-wrap'); wrap.innerHTML = '';
  EQUIP_LISTA.forEach(({chave, nome})=>{
    const checked = (loc.equipamentos||[]).includes(chave);
    const label = document.createElement('label');
    label.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text2);cursor:pointer';
    label.innerHTML = `<input type="checkbox" style="width:auto;flex-shrink:0" value="${chave}" ${checked?'checked':''}> ${nome}`;
    wrap.appendChild(label);
  });
  $('modal-local-aluno').classList.remove('hidden');
}

function fecharModalLocalAluno(){ $('modal-local-aluno').classList.add('hidden'); }

async function salvarLocalAluno(){
  const id = $('local-aluno-edit-id').value; if(!id) return;
  const equips = [...$('local-aluno-equip-wrap').querySelectorAll('input[type=checkbox]:checked')].map(cb=>cb.value);
  const patch = {
    nome: $('local-aluno-nome').value.trim() || 'Sem nome',
    cidade: $('local-aluno-cidade').value.trim(),
    estado: $('local-aluno-estado').value.trim(),
    pais: $('local-aluno-pais').value.trim(),
    tipo: $('local-aluno-tipo').value,
    equipamentos: equips,
    obs: $('local-aluno-obs').value.trim(),
  };
  const { error } = await supa.from('locais_treino').update(patch).eq('id', id);
  if(error){ alert('Erro ao salvar local: '+error.message); return; }
  fecharModalLocalAluno();
  carregarLocaisAlunos();
}
