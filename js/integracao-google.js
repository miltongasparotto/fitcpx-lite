// ══════════════════════════════════════════════════════════════════════════
// UTILITÁRIOS DE UI + NAVEGAÇÃO — FitCPX Lite
// (arquivo mantém o nome legado "integracao-google.js"; a integração com o
//  Google Drive foi removida em 2026-08-27 — ver item 25 do doc de decisões.
//  setSyncStatus() segue usada pelo Supabase em js/supabase-auth.js.)
// ══════════════════════════════════════════════════════════════════════════

// Texto puro (diálogos nativos, toast, status) não renderiza HTML: tira o markup de ícone <i class=ph-x></i>.
function semIcone(s){ return typeof s==='string' ? s.replace(/<i class=(?:ph|sd)-[a-z0-9-]+><\/i>\s*/g,'') : s; }
(function(){
  ['alert','confirm','prompt'].forEach(n=>{ const o=window[n].bind(window); window[n]=(m,...r)=>o(semIcone(m),...r); });
})();

function setSyncStatus(msg, erro){
  const el = $('sync-status');
  if(!el){ if(erro && msg && typeof crmToast === 'function') crmToast(semIcone(msg), 'err'); return; }
  if(!msg){ el.style.display='none'; el.textContent=''; return; }
  el.style.display = 'block';
  el.style.color = erro ? 'var(--red)' : 'var(--text3)';
  el.textContent = semIcone(msg);
}

// BUGFIX 2026-08-27 (auditoria): sanitização de saída — nome de aluno, local
// de treino, biblioteca de treinos e periodização são texto livre digitado
// pelo usuário e eram inseridos direto via innerHTML/template literal sem
// escapar. Um valor tipo <img src=x onerror=...> ficava salvo e executava
// script assim que o card era renderizado (XSS armazenado). escHTML() sempre
// que o valor puder ter vindo de um campo de texto livre do usuário.
function escHTML(str){
  if(str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

// ── Exportar / Importar JSON local ───────────────────────────────────────────

function exportarJSON(){
  const dados = {
    students,
    activeId,
    versao: '1.3',
    exportadoEm: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(dados, null, 2)], {type:'application/json'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const data = new Date().toLocaleDateString('pt-BR').replace(/\//g,'-');
  a.href = url;
  a.download = `fitcpx-backup-${data}.json`;
  a.click();
  URL.revokeObjectURL(url);
  setSyncStatus('✓ Backup exportado', false);
  setTimeout(()=>setSyncStatus('',false), 3000);
}

function importarJSON(event){
  const file = event.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const dados = JSON.parse(e.target.result);
      if(!dados.students || !Array.isArray(dados.students)){
        alert('Arquivo inválido — não encontrei dados de alunos.'); return;
      }
      const qtd = dados.students.length;
      const conf = confirm(
        `Importar ${qtd} aluno(s) do backup?\n\nIsso vai SUBSTITUIR os dados atuais.`
      );
      if(!conf) return;
      students = dados.students;
      activeId = dados.activeId || (students[0]?.id ?? null);
      renderStudentList();
      if(activeId) loadStudentData(getActive());
      setSyncStatus(`✓ ${qtd} aluno(s) importado(s)`, false);
      setTimeout(()=>setSyncStatus('',false), 4000);
      // Mantém dados sincronizados com o Supabase após importar
      supaAutoSave();
    } catch(err){
      alert('Erro ao ler o arquivo: ' + err.message);
    }
  };
  reader.readAsText(file);
  event.target.value = ''; // reset input
}

// ══════════════════════════════════════════════════════════════════════════
// NAVEGAÇÃO LATERAL — telas de biblioteca
// ══════════════════════════════════════════════════════════════════════════

const NAV_SCREENS = ['welcome-screen','student-view','screen-dashboard','screen-alunos','screen-locais','screen-biblioteca','screen-distribuicao','screen-periodizacao','screen-exercicios','screen-arquivadas','screen-agenda','screen-pipeline','screen-whatsapp','screen-fluxos','screen-portal-aluno','screen-config','screen-treinar','screen-financeiro'];
const NAV_ITEMS   = ['nav-dashboard','nav-alunos','nav-locais','nav-biblioteca','nav-distribuicao','nav-periodizacao','nav-exercicios','nav-arquivadas','nav-agenda','nav-pipeline','nav-whatsapp','nav-fluxos','nav-portal-aluno','nav-config','nav-treinar','nav-financeiro'];

function noop(){}

function _navGoForcado(tela){
  // screen-aluno-crm é overlay de tela cheia (js/crm-alunos.js), fora do
  // NAV_SCREENS — sem fechar aqui, ele ficava por cima de qualquer tela nova
  // ao navegar pelo menu, dando a impressão de o app ter travado.
  if(typeof closeAlunoCrm==='function') closeAlunoCrm();
  if(typeof toggleNavMobile==='function') toggleNavMobile(false);
  NAV_SCREENS.forEach(id=>{ const el=$(id); if(el) el.classList.add('hidden'); });
  NAV_ITEMS.forEach(id=>{ const el=$(id); if(el) el.classList.remove('active'); });

  if(tela==='dashboard'){
    show('screen-dashboard');
    const dt=$('dash-data');
    if(dt) dt.textContent = new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'});
    if(typeof renderDashboard==='function') renderDashboard();
    const nav=$('nav-dashboard'); if(nav) nav.classList.add('active');
  } else if(tela==='alunos'){
    show('screen-alunos');
    renderScreenAlunos();
    const nav=$('nav-alunos'); if(nav) nav.classList.add('active');
  } else if(tela==='student-view'){
    // Direct navigation to student view (from alunos screen)
    const s=getActive();
    if(s){ show('student-view'); } else { navGo('alunos'); return; }
  } else {
    const screenId = 'screen-'+tela;
    show(screenId);
    const nav=$('nav-'+tela); if(nav) nav.classList.add('active');
    if(tela==='locais')       renderLocais();
    if(tela==='biblioteca')   renderBiblioteca();
    if(tela==='distribuicao') renderDistrib();
    if(tela==='periodizacao') renderPeriod();
    if(tela==='exercicios')   renderExercicios();
    if(tela==='arquivadas')   renderArquivadas();
    // CRM de prazos (extraído do FitCPX Flow — ver ESTRATEGIA-MERGE.md)
    if(tela==='agenda')       renderAgendaCRM();
    if(tela==='pipeline')     renderPipelineCRM();
    if(tela==='whatsapp')     renderWhatsappCRM();
    if(tela==='fluxos')       renderFluxosCRM();
    if(tela==='portal-aluno') renderPortalAluno();
    if(tela==='config')       { _cfgMarca=null; renderConfigCRM(); }
    if(tela==='treinar')      renderTreinar();
    if(tela==='financeiro')   renderFinanceiro();
  }
  if(typeof financeiroAtualizarBadge==='function') financeiroAtualizarBadge();
  if(typeof shellInjetarFerramentas==='function') shellInjetarFerramentas();
  const ms=document.querySelector('.main-scroll:not(.hidden)'); if(ms) ms.scrollTop=0;
}
function navGo(tela){
  if(typeof _guardNav==='function') _guardNav(()=>_navGoForcado(tela));
  else _navGoForcado(tela);
}

function toggleNavTreino(){
  const sub=$('nav-treino-sub'), hdr=$('nav-treino-hdr');
  if(!sub) return;
  const open = sub.style.display==='none'||sub.style.display==='';
  sub.style.display = open ? 'block' : 'none';
  if(hdr) hdr.classList.toggle('open', open);
}

// Celular: a sidebar vira gaveta.
function toggleNavMobile(force){
  const app=$('app-root'); if(!app) return;
  app.classList.toggle('nav-open', typeof force==='boolean' ? force : undefined);
}


// ══════════════════════════════════════════════════════════════════════════
// BANCO DE EXERCÍCIOS — tela Exercícios
// ══════════════════════════════════════════════════════════════════════════

const RES_LABEL = {PL:'Peso Livre',MA:'Máquina',CA:'Cabo',PC:'Peso Corporal',EL:'Elástico',SU:'Suspenso'};
const NV_LABEL  = {I:'Iniciante',M:'Intermediário',A:'Avançado'};
const NV_COLOR  = {I:'badge-green',M:'badge-amber',A:'badge-red'};

function initExerciciosScreen(){
  // Popular filtro de grupos
  const sel = $('ex-f-gp'); if(!sel || sel.options.length > 1) return;
  const grupos = [...new Set(VAULT_EX.map(e=>e.g||e.gp.split('|')[0].trim()))].sort();
  grupos.forEach(g=>{ const o=document.createElement('option'); o.value=g; o.textContent=g; sel.appendChild(o); });
  // Popular filtro de tipos (se existir)
  const selTp = $('ex-f-tp');
  if(selTp && selTp.options.length <= 1){
    const tipos = [...new Set(VAULT_EX.map(e=>e.tp).filter(Boolean))].sort();
    tipos.forEach(t=>{ const o=document.createElement('option'); o.value=t; o.textContent=t; selTp.appendChild(o); });
  }
  // Popular filtro de cadeia cinética (se existir)
  const selCad = $('ex-f-cad');
  if(selCad && selCad.options.length <= 1){
    ['CCF','CCA','Complementar','Misto'].forEach(c=>{
      const o=document.createElement('option'); o.value=c; o.textContent=c; selCad.appendChild(o);
    });
  }
}




// Teclado: itens clicáveis que não são <button> (menu, abas, linhas do painel) respondem a Enter e Espaço.
document.addEventListener('keydown', e=>{
  if(e.key!=='Enter' && e.key!==' ') return;
  const el=e.target;
  if(el && el.matches && el.matches('.sidebar-item,.tab,.subtab,.dash-linha,.obj-card')){ e.preventDefault(); el.click(); }
});


// Edge Function que responde 4xx/5xx: o texto útil vem no corpo ({error}), não em error.message.
async function msgErroFuncao(error){
  try{ const j = await error.context.json(); if(j && j.error) return j.error; }catch(e){}
  return (error && error.message) || String(error);
}
