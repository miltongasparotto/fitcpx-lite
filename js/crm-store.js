// ══════════════════════════════════════════════════════════════════════════
// CRM — ESTADO GLOBAL + PERSISTÊNCIA (extraído do FitCPX Flow)
// ══════════════════════════════════════════════════════════════════════════
// Este arquivo TEM que carregar depois de js/ids.js (usa novoId()/lsKey()) e
// antes dos demais módulos js/crm-*.js (todos leem/gravam em `DB`).
//
// Diferenças propositais em relação ao Flow original (ver ESTRATEGIA-MERGE.md,
// seção 6):
//   - DB.alunos NÃO existe aqui. O cadastro "aluno" do CRM é o mesmo `student`
//     do Auto (js/avaliacao.js) — os campos que no Flow ficavam soltos em
//     DB.alunos[i] (status, cor, fluxos vinculados, modId, obs, apelido,
//     photoUrl) ficam em `student.crm{}`. `alunoId` em tasks/fluxos é sempre
//     `student.id` (numérico, novoId()).
//   - DB.theme não existe — o tema já é global do Auto (classe `.dark` em
//     <html>, ver integracao-google.js).
//   - Nada de Google Drive/OAuth. crmSave() só grava local + chama o hook
//     crmAgendarSyncSupabase() (implementado depois, em supabase-auth.js) e
//     supaAutoSave() (já existe — re-sincroniza `students`, que agora carrega
//     student.crm junto).
//   - Todo id novo (task, fluxo, modalidade, template WhatsApp, categoria)
//     usa novoId() — nunca os *IdSeq do Flow.

let DB = _crmDefaults();

// ── Datas ────────────────────────────────────────────────────────────────
// Datas locais (AAAA-MM-DD). Antes usavam toISOString() (UTC): depois das 21h em Brasília o "hoje"
// já virava o dia seguinte. O dia agora vira à meia-noite do horário local.
function _isoLocal(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function todayStr(){ return _isoLocal(new Date()); }
function addDays(s,n){ const d=new Date(s+'T12:00:00'); d.setDate(d.getDate()+n); return _isoLocal(d); }
function diffDays(a,b){ return Math.round((new Date(a+'T12:00:00')-new Date(b+'T12:00:00'))/86400000); }
function fmtDate(s){ if(!s) return ''; const d=new Date(s+'T12:00:00'); return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}); }
function fmtDateShort(s){ if(!s) return ''; const d=new Date(s+'T12:00:00'); return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}); }
function initials(n){ return (n||'').split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase()||'?'; }
function addMinHHMM(hhmm,min){
  if(!hhmm) return '';
  const p=hhmm.split(':'); const tot=(+p[0])*60+(+p[1])+min;
  const nh=Math.floor(((tot%1440)+1440)%1440/60), nm=((tot%60)+60)%60;
  return String(nh).padStart(2,'0')+':'+String(nm).padStart(2,'0');
}

const CAT_PALETTE = ['#8b5cf6','#3b82f6','#00b37e','#f97316','#f59e0b','#ef4444','#14b8a6','#ec4899','#6366f1','#84cc16'];

// ── Ponte com `students` (Auto) ────────────────────────────────────────────
// Decisão de arquitetura (ESTRATEGIA-MERGE.md §6.3): não existe DB.alunos.
// O "aluno" do CRM É o `student` do Auto; os campos que no Flow ficavam soltos
// em DB.alunos[i] moram em student.crm{}. Estes helpers são usados por todos
// os módulos js/crm-*.js — ficam aqui (o primeiro módulo do CRM a carregar)
// para não depender de ordem entre os demais.
function ensureCrm(s){
  if(!s) return null;
  if(!s.crm) s.crm = { status:'lead', statusSince:todayStr(), cor:'#3b82f6', fluxos:[] };
  if(!s.crm.fluxos) s.crm.fluxos = [];
  if(!s.crm.status) s.crm.status = 'lead';
  return s.crm;
}
function alunoNome(s){ return s?.perfil?.nome || '(sem nome)'; }
function alunoTel(s){ return s?.perfil?.whatsapp || ''; }
function findAluno(id){ return students.find(s=>s.id===id); }

// ── Persistência local + hook de sync (Supabase implementado à parte) ─────
function crmSave(){
  try{ lsSet('crm', DB); }catch(e){}
  if(typeof crmAgendarSyncSupabase==='function') crmAgendarSyncSupabase();
  // students carrega student.crm{} embutido — reaproveita o autosave já
  // existente do Auto para não duplicar o pipeline de sync.
  if(typeof supaAutoSave==='function') supaAutoSave();
}

// Configurações do personal (aba Configurações). Cada chave tem um motor que a lê:
//   perfil  -> variáveis {studio} {personal} {cref} {whatsappStudio} das mensagens; saudação do Painel
//   regras  -> urgencyDays (tarefas), janelaProximo/janelaAgendar/validadeSemanas (treino),
//              diasRevisao (pausado/inativo), diasAlunoNovo (Painel e fila de mensagens)
//   marca   -> cor do sistema (css/tokens.css via js/marca.js) e nome/cor/ícone do portal do aluno
function _cfgPadrao(){
  return {
    studioName:'FitCPX Lite', personalName:'', cref:'', whatsapp:'',
    waCountryCode:'55', waCountryFlag:'🇧🇷', waCountryName:'Brasil',
    email:'', instagram:'', cidade:'', endereco:'', bio:'',
    urgencyDays:3, janelaProximo:7, janelaAgendar:14, validadeSemanas:12, diasRevisao:30, diasAlunoNovo:14,
    marca:{ nomeApp:'', cor:'#3dbb6e', icone:'ph-barbell', logoUrl:'' }, fotoUrl:'',
  };
}
function _crmDefaults(){
  return {
    tasks:[], fluxos:[], modalidades:[], waTpls:[], customCats:[], deletedCats:[],
    pipeOrder:[], dashPipeOrder:[], historico:{},
    waFeitas:{}, waBase:null,   // fila "a enviar" (js/wa-regras.js): só guarda o que já foi tratado
    config:_cfgPadrao(),
  };
}
// Número positivo da configuração, ou o padrão. Seguro de chamar antes do DB existir.
function cfgNum(chave, padrao){
  try{ const v = Number(DB.config[chave]); return v > 0 ? v : padrao; }catch(e){ return padrao; }
}
// Validade padrão do treino no formato do seletor da prescrição ('8sem' | '12sem' | '16sem').
function cfgValidadePadrao(){
  const n = cfgNum('validadeSemanas', 12);
  return [8,12,16].includes(n) ? n+'sem' : '12sem';
}
// Normaliza DB depois de qualquer carga (local ou nuvem): garante chaves
// default, semeia o contador de ids com o que veio carregado (nunca reaproveita
// número) e persiste local. Chamada tanto por crmLoad() quanto por
// crmAplicarDadosNuvem() (js/supabase-auth.js) para não duplicar a lógica.
// Cor vinda de dado salvo (nuvem/importação) entra em atributo style: só hex ou var(--token).
function corSegura(c, padrao){
  c = (typeof c==='string') ? c.trim() : '';
  return (/^#[0-9a-fA-F]{3,8}$/.test(c) || /^var\(--[a-z0-9-]+\)$/.test(c)) ? c : (padrao || '#6b7280');
}

function _crmNormalizar(){
  const cfgBase = _cfgPadrao();
  DB.config = Object.assign(cfgBase, DB.config || {});
  DB.config.marca = Object.assign(cfgBase.marca, (DB.config.marca && typeof DB.config.marca==='object') ? DB.config.marca : {});
  ['urgencyDays','janelaProximo','janelaAgendar','validadeSemanas','diasRevisao','diasAlunoNovo'].forEach(k=>{
    if(!(Number(DB.config[k]) > 0)) DB.config[k] = _cfgPadrao()[k];
  });
  if(typeof marcaEhPadrao === 'function' && marcaEhPadrao(DB.config.marca.cor)) DB.config.marca.cor = MARCA_COR_PADRAO;   // quem salvou "Verde" antes de 14/10 (#22c55e) passa ao novo padrão
  // URL de imagem vinda de dado salvo entra em <img src>: só vale a do bucket de marca deste projeto.
  if(typeof marcaUrlImagemOk === 'function'){
    if(!marcaUrlImagemOk(DB.config.marca.logoUrl)) DB.config.marca.logoUrl = '';
    if(!marcaUrlImagemOk(DB.config.fotoUrl)) DB.config.fotoUrl = '';
  }
  if(!DB.waFeitas || typeof DB.waFeitas !== 'object') DB.waFeitas = {};
  (DB.customCats||[]).forEach(c=>{ c.color = corSegura(c.color); });
  semearIds(DB.tasks, DB.fluxos, DB.modalidades, DB.waTpls, DB.customCats);
  DB.fluxos.forEach(f=>semearIds(f.steps||[]));
  lsSet('crm', DB);
  if(typeof marcaAplicarConfig==='function') marcaAplicarConfig();   // cor e nome do studio da conta que acabou de carregar
}

function crmLoad(){
  const loaded = lsGet('crm', null);
  if(loaded && typeof loaded === 'object') DB = Object.assign(_crmDefaults(), loaded);
  _crmNormalizar();
}

// Chamada por supaCarregarDados() (js/supabase-auth.js) quando a linha 'crm'
// existe na nuvem — Supabase é fonte de verdade quando tem dados, mesmo
// padrão de students/arquivo. Se cloudData for null (usuário novo, nuvem
// ainda sem linha 'crm'), mantém o que crmLoad() já carregou do local.
function crmAplicarDadosNuvem(cloudData){
  if(cloudData && typeof cloudData==='object') DB = Object.assign(_crmDefaults(), cloudData);
  _crmNormalizar();
}

// ── UI utilitária mínima (toasts + modais próprios do CRM) ────────────────
// Nomes próprios (crmOpenModal/crmCloseModal) para não colidir com
// closeModal() do Auto (js/avaliacao.js), que já existe sem parâmetro e
// fecha o modal "Novo Aluno" do shell.
function crmToast(msg, tipo){
  let wrap = $('crm-toasts');
  if(!wrap){
    wrap = document.createElement('div');
    wrap.id = 'crm-toasts';
    wrap.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:5000;display:flex;flex-direction:column;gap:8px';
    document.body.appendChild(wrap);
  }
  const el = document.createElement('div');
  el.className = 'toast' + (tipo==='err' ? ' err' : '');
  el.textContent = (typeof semIcone==='function') ? semIcone(msg) : msg;
  wrap.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .3s'; setTimeout(()=>el.remove(),300); }, 3200);
}

function crmOpenModal(id){ const el=$(id); if(el) el.classList.remove('hidden'); }
function crmCloseModal(id){ const el=$(id); if(el) el.classList.add('hidden'); }

// Confirmação simples (substitui o modal m-confirm do Flow — ver relatório
// final sobre simplificações). msg aceita texto simples (sem HTML).
function crmConfirm(msg, onYes){ if(confirm(msg)) onYes(); }

// ── Seletor de ícone dos modais (categoria / fluxo / modalidade) ─────────────
const IC_PICKER = ["clipboard-text","barbell","chart-bar","magnifying-glass","arrows-clockwise","calendar-check","chat-circle-text","target","heartbeat","fire","lightning","star","flag","bell","phone","envelope-simple","camera","ruler","scales","trophy","bowl-food","person-simple-run","note-pencil","gear","tag","users","handshake","receipt"];
function icPickerRender(inputId){
  const inp = document.getElementById(inputId); if(!inp) return;
  const box = inp.parentElement.querySelector('.icon-picker'); if(!box) return;
  const cur = icNome(inp.value);
  box.innerHTML = IC_PICKER.map(n => '<button type="button" class="ip-btn'+(cur==='ph-'+n?' on':'')+'" onclick="icPickerSet(\''+inputId+'\',\'ph-'+n+'\')" aria-label="'+n+'"><i class=ph-'+n+'></i></button>').join('');
}
function icPickerSet(inputId, val){
  const inp = document.getElementById(inputId); if(!inp) return;
  inp.value = icNome(val) || '';
  icPickerRender(inputId);
}

// ── Ícones de categoria / fluxo / modalidade ────────────────────────────────
// O ícone é dado do usuário (campo "ícone" dos modais). Valor novo = nome de ícone
// ("ph-barbell"). Dados antigos guardam um emoji: vira o ícone equivalente na hora de
// exibir, sem mexer no que está salvo. Emoji fora do mapa aparece como texto.
const ICON_LEGADO = {"⚠":"ph-warning","📋":"ph-clipboard-text","✅":"ph-check-circle","🔒":"ph-lock","▶":"ph-play","📌":"ph-push-pin","⚙":"ph-gear","✏":"ph-pencil-simple","🔄":"ph-arrows-clockwise","⭐":"ph-star","➕":"ph-plus","🏋":"ph-barbell","💡":"ph-lightbulb","🗑":"ph-trash","💬":"ph-chat-circle-text","❌":"ph-x-circle","⚡":"ph-lightning","📅":"ph-calendar-blank","📚":"ph-books","💪":"ph-hand-fist","📊":"ph-chart-bar","ℹ":"ph-info","📦":"ph-package","🔍":"ph-magnifying-glass","🚫":"ph-prohibit","⏰":"ph-alarm","🔥":"ph-fire","👤":"ph-user","📍":"ph-map-pin","📱":"ph-device-mobile","↕":"ph-arrows-down-up","🎯":"ph-target","🏷":"ph-tag","↩":"ph-arrow-u-up-left","👁":"ph-eye","💾":"ph-floppy-disk","🛠":"ph-wrench","🕐":"ph-clock","⏸":"ph-pause","🗓":"ph-calendar-dots","🔗":"ph-link","📈":"ph-trend-up","🔧":"ph-wrench","🌐":"ph-globe","📷":"ph-camera","🚨":"ph-siren","♻":"ph-recycle","⏱":"ph-timer","🌙":"ph-moon","🩺":"ph-stethoscope","🗂":"ph-folders","🗄":"ph-archive","📤":"ph-upload-simple","❤":"ph-heart","🆕":"ph-plus-circle","📖":"ph-book-open","☀":"ph-sun","📝":"ph-note-pencil","📆":"ph-calendar","🦴":"ph-bone","☁":"ph-cloud","🥗":"ph-bowl-food","🔑":"ph-key","🚧":"ph-traffic-cone","🏠":"ph-house","📏":"ph-ruler","⚖":"ph-scales","🤸":"ph-person-arms-spread","🌿":"ph-plant","🏆":"ph-trophy","🌟":"ph-star-four","🏢":"ph-buildings","💻":"ph-laptop","🔀":"ph-shuffle","🤰":"ph-baby","🩹":"ph-bandaids","🔎":"ph-magnifying-glass","📄":"ph-file-text","🖨":"ph-printer","✍":"ph-pen-nib","✨":"ph-sparkle","👋":"ph-hand-waving","👥":"ph-users","🎉":"ph-confetti","↔":"ph-arrows-left-right","〰":"ph-wave-sine","🧱":"ph-wall","🔓":"ph-lock-open","✓":"ph-check","✔":"ph-check","✕":"ph-x","✗":"ph-x","✖":"ph-x","🎁":"ph-gift","🔔":"ph-bell","📞":"ph-phone","📧":"ph-envelope-simple","✉":"ph-envelope-simple","⬆":"ph-arrow-up","⬇":"ph-arrow-down","⏳":"ph-hourglass","🔁":"ph-repeat","🧾":"ph-receipt","📎":"ph-paperclip","🏃":"ph-person-simple-run","🧘":"ph-person-simple-tai-chi"};
function icNome(v){
  v = (v==null ? "" : String(v)).trim().replace(/️/g,"");
  if(/^ph-[a-z0-9-]+$/.test(v)) return v;
  return ICON_LEGADO[v] || "";
}
function icHTML(v){
  const n = icNome(v);
  if(n) return "<i class="+n+"></i>";
  return (typeof escHTML==="function") ? escHTML(v==null?"":v) : String(v==null?"":v);
}
