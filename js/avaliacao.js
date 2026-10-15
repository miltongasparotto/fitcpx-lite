// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const OBJETIVOS = [
  {code:"Hip",label:"Hipertrofia",icon:"<i class=ph-hand-fist></i>"},
  {code:"Forca",label:"Força Máxima",icon:"<i class=ph-barbell></i>"},
  {code:"Emagr",label:"Emagrecimento",icon:"<i class=ph-fire></i>"},
  {code:"Comp",label:"Composição Corporal",icon:"<i class=ph-scales></i>"},
  {code:"Resist",label:"Resistência Muscular",icon:"<i class=ph-arrows-clockwise></i>"},
  {code:"CardioR",label:"Cond. Cardiorrespiratório",icon:"<i class=ph-heart></i>"},
  {code:"Func",label:"Funcional / Mobilidade",icon:"<i class=ph-person-arms-spread></i>"},
  {code:"Saude",label:"Saúde Geral",icon:"<i class=ph-plant></i>"},
  {code:"Esport",label:"Performance Esportiva",icon:"<i class=ph-trophy></i>"},
  {code:"Reab",label:"Reabilitação / Pós-lesão",icon:"<i class=ph-stethoscope></i>"},
  {code:"Envelhec",label:"Envelhecimento Ativo",icon:"<i class=ph-star-four></i>"},
];

const MODELOS = {
  Hip:{Inic:"LP",Inte:"DUP",Avan:"CON (M) / DUP (F)"},
  Forca:{Inic:"LP",Inte:"DUP",Avan:"CON (M) / BLO (F)"},
  Emagr:{Inic:"LP",Inte:"DUP",Avan:"DUP"},
  Comp:{Inic:"LP",Inte:"DUP",Avan:"BLO (M) / DUP (F)"},
  Resist:{Inic:"LPR",Inte:"LPR",Avan:"LPR"},
  CardioR:{Inic:"LPR",Inte:"LPR",Avan:"LPR"},
  Func:{Inic:"LP",Inte:"DUP",Avan:"DUP"},
  Saude:{Inic:"LP",Inte:"LP",Avan:"LP"},
  Esport:{Inic:"LP",Inte:"BLO",Avan:"BLO"},
  Reab:{Inic:"LP",Inte:"LP",Avan:"LP"},
  Envelhec:{Inic:"LP",Inte:"LP",Avan:"LP"},
};

// Variáveis de referência por objetivo
const VARIAVEIS_REF = {
  Hip:    {series:"10–20 séries/músculo/sem",reps:"6–20 reps",intensidade:"60–85% 1RM / RPE 6–8",intervalo:"60–120s",tut:"2-1-2 a 3-1-3"},
  Forca:  {series:"10–16 séries/músculo/sem",reps:"1–5 reps",intensidade:"80–95% 1RM / RPE 8–9",intervalo:"180–300s",tut:"explosivo concêntrico"},
  Emagr:  {series:"12–20 séries/músculo/sem",reps:"10–20 reps",intensidade:"50–75% 1RM / RPE 6–8",intervalo:"30–60s",tut:"2-0-2"},
  Comp:   {series:"12–20 séries/músculo/sem",reps:"8–15 reps",intensidade:"60–80% 1RM / RPE 6–8",intervalo:"45–90s",tut:"2-1-2"},
  Resist: {series:"12–20 séries/músculo/sem",reps:"15–30+ reps",intensidade:"40–60% 1RM / RPE 5–7",intervalo:"30–45s",tut:"controlado"},
  CardioR:{series:"—",reps:"—",intensidade:"60–90% FCmáx",intervalo:"Protocolo HIIT/contínuo",tut:"—"},
  Func:   {series:"8–15 séries/músculo/sem",reps:"8–15 reps",intensidade:"40–65% 1RM / RPE 5–7",intervalo:"60–90s",tut:"amplitude total"},
  Saude:  {series:"8–15 séries/músculo/sem",reps:"10–15 reps",intensidade:"50–70% 1RM / RPE 5–7",intervalo:"60–90s",tut:"2-1-2"},
  Esport: {series:"10–20 séries/músculo/sem",reps:"3–10 reps",intensidade:"70–90% 1RM / RPE 7–9",intervalo:"120–240s",tut:"específico por modalidade"},
  Reab:   {series:"6–12 séries/músculo/sem",reps:"10–20 reps",intensidade:"20–50% 1RM / RPE 3–6",intervalo:"90–120s",tut:"lento, ênfase excêntrica"},
  Envelhec:{series:"8–15 séries/músculo/sem",reps:"8–15 reps",intensidade:"40–65% 1RM / RPE 5–7",intervalo:"90–120s",tut:"lento e controlado"},
};

// Templates de estrutura
const TEMPLATES = {
  'treino-a': `## TREINO A — [foco muscular]
| # | Exercício | Séries | Reps | %1RM/Carga | Intervalo | Método |
|---|-----------|--------|------|------------|-----------|--------|
| 1 |           | 4      |      |            | 90s       | Séries retas |
| 2 |           | 3      |      |            | 90s       |        |
| 3 |           | 3      |      |            | 60s       |        |
| 4 |           | 3      |      |            | 60s       |        |
| 5 |           | 3      |      |            | 60s       |        |

`,
  'treino-b': `## TREINO B — [foco muscular]
| # | Exercício | Séries | Reps | %1RM/Carga | Intervalo | Método |
|---|-----------|--------|------|------------|-----------|--------|
| 1 |           | 4      |      |            | 90s       | Séries retas |
| 2 |           | 3      |      |            | 90s       |        |
| 3 |           | 3      |      |            | 60s       |        |
| 4 |           | 3      |      |            | 60s       |        |
| 5 |           | 3      |      |            | 60s       |        |

`,
  'progressao': `## PROGRESSÃO SEMANAL
| Semana | Foco        | Volume   | Intensidade   | Ajuste |
|--------|-------------|----------|---------------|--------|
| 1      | Adaptação   | Baixo    | Moderada      | Carga conservadora, ênfase na técnica |
| 2      | Desenvolvimento | Moderado | Moderada  | +carga ou +rep conforme tolerância |
| 3      | Sobrecarga  | Alto     | Mod-Alta      | Progressão aplicada |
| 4      | Deload      | Baixo    | Moderada      | −40% volume, manter intensidade relativa |

`,
  'treino-c': `## TREINO C — [foco muscular]
| # | Exercício | Séries | Reps | %1RM/Carga | Intervalo | Método |
|---|-----------|--------|------|------------|-----------|--------|
| 1 |           | 4      |      |            | 90s       | Séries retas |
| 2 |           | 3      |      |            | 90s       |        |
| 3 |           | 3      |      |            | 60s       |        |
| 4 |           | 3      |      |            | 60s       |        |
| 5 |           | 3      |      |            | 60s       |        |

`,
  'deload': `## SEMANA DE DELOAD (sem. 4)
- Volume: −40–50% em relação à semana anterior
- Intensidade: manter cargas — apenas reduzir séries
- Objetivo: recuperação ativa sem perda de adaptação
- Indicador: se DOMS ainda presente na sem. 4 → deload mais conservador

`,
  'raciocinio': `## RACIOCÍNIO DO PROTOCOLO
Por que este protocolo para este aluno neste momento:

Exercícios principais escolhidos por:

Progressão planejada:

Pontos de atenção:

`,
};

// ─── STATE ────────────────────────────────────────────────────────────────────

let students = [];
let activeId  = null;
let currentStep = 1;
let selectedObj = "";

// ─── UTILS ────────────────────────────────────────────────────────────────────

const $ = id => document.getElementById(id);
const show = id => $(id).classList.remove('hidden');
const hide = id => $(id).classList.add('hidden');
const toggle = (id, cond) => cond ? show(id) : hide(id);
const val = id => $(id) ? $(id).value : '';
const setVal = (id, v) => { if($(id)) $(id).value = v || ''; };
const getActive = () => students.find(s => s.id === activeId);

// ─── AUTOSAVE GENÉRICO (evita perda de dados ao trocar de aba/tela/fechar) ────
// Registra um listener por delegação de evento (input/change) na raiz de um
// formulário/modal — cobre inclusive campos adicionados dinamicamente depois
// (linhas de mesociclo, cargas de acompanhamento etc.), sem precisar de
// oninput/onchange manual em cada input. Debounced pra não gravar a cada tecla.
// coletarFn() lê o formulário e retorna os dados prontos (ou null/undefined se
// não há dados suficientes ainda — nesse caso não grava nada). gravarFn(dado)
// persiste de fato (localStorage/saveLibs/saveStudent).
function attachAutosave(containerId, coletarFn, gravarFn, debounceMs){
  const el = document.getElementById(containerId);
  if(!el) return;
  let timer = null;
  const rodar = () => {
    clearTimeout(timer);
    const alunoNaHoraDoDigitar = activeId;
    timer = setTimeout(() => {
      // Se o aluno ativo mudou entre o digitar e o disparo do timer (trocou de
      // aluno na lista antes do debounce terminar), o dado coletado agora
      // pertence ao aluno anterior — gravar aqui contaminaria o aluno atual.
      if(activeId !== alunoNaHoraDoDigitar) return;
      try{
        const dado = coletarFn();
        if(dado) gravarFn(dado);
      }catch(e){ console.error('Autosave falhou em #'+containerId+':', e); }
    }, debounceMs || 400);
  };
  el.addEventListener('input', rodar, true);
  el.addEventListener('change', rodar, true);
}

// ─── MODAL ────────────────────────────────────────────────────────────────────

function showModal(){ abrirNovoAluno(); } // legado — redireciona
function closeModal(){ hide('modal-overlay'); }
function confirmNewStudent(){ abrirNovoAluno(); } // legado

function abrirNovoAluno(){
  hide('modal-overlay');
  const s = { id:novoId(), perfil:{nome:''}, anamnese:{}, prescricao:{}, reavaliacao:null };
  students.push(s);
  renderStudentList();
  _formDirty = false;
  window._skipDraftModal = true; // student novo sem versão salva — sem modal de recuperação
  selectStudent(s.id);
  // Marca como não salvo imediatamente (novo aluno ainda não foi ao acm-students)
  setTimeout(()=>{ _formDirty = true; _saveDraft(); }, 250);
}

// ─── STUDENT LIST ─────────────────────────────────────────────────────────────

function renderStudentList(){
  const sc=$('student-count'); if(sc) sc.textContent=students.length;
  const nc=$('nav-count-alunos'); if(nc) nc.textContent=students.length;
  const ns=$('no-students'); if(ns) ns.style.display=students.length?'none':'block';
  // Update badge in screen-alunos
  const cb=$('alunos-count-badge'); if(cb) cb.textContent=students.length+' aluno'+(students.length!==1?'s':'');
  // Sidebar compat: student-list hidden, no-op
  renderScreenAlunos();
}

// ─── SCREEN ALUNOS — grid com busca, filtros e ordenação ─────────────────────

const OBJ_LABEL_MAP = {
  Hip:'Hipertrofia',Forca:'Força',Emagr:'Emagrecimento',Comp:'Composição',
  Resist:'Resistência',CardioR:'Cardio',Func:'Funcional',Saude:'Saúde',
  Esport:'Esportivo',Reab:'Reabilitação',Envelhec:'Envelhecimento',
};

function _calcIdadeNum(nasc){
  if(!nasc) return null;
  const [d,m,y] = nasc.includes('/')?nasc.split('/'):nasc.split('-').reverse();
  const dt = new Date(+y, +m-1, +d);
  if(isNaN(dt)) return null;
  const hoje = new Date();
  let age = hoje.getFullYear()-dt.getFullYear();
  if(hoje.getMonth()<dt.getMonth()||(hoje.getMonth()===dt.getMonth()&&hoje.getDate()<dt.getDate())) age--;
  return age;
}

function _modalLabel(m){
  return {presencial:'Presencial',online:'Online',hibrido:'Híbrido'}[m?.toLowerCase()]||m||'—';
}

function _nivelColor(n){
  return {Iniciante:'badge-green',Intermediário:'badge-amber',Avançado:'badge-red'}[n]||'badge-gray';
}

// ─── Lista de Alunos: status (abas + anel do avatar), filtros por coluna, ordenação e layout ───────
// 3 quebras pela largura do cartão (container query em css/app.css):
//   >= 1260px: tabela completa, com seta de ordenar e filtro em cada coluna.
//   880–1259px: nome (com avatar), idade, nível e atendimento; filtros no painel, sem ordenação.
//   < 880px: só o nome (com avatar e pendências); filtros no painel, sem ordenação.
// O status aparece na borda colorida do avatar e nas abas do cartão (filtro); não tem coluna própria.
// Regra fixa: alunos novos no topo e, dentro de cada grupo, ordem alfabética (a coluna clicada vem antes do nome).
const ALUNOS_TREINO_VENCIDO_DIAS = 56; // ciclo de 8 semanas
const ALUNOS_COMPLETO_PX = 1260;       // largura do cartão abaixo da qual a lista perde o cabeçalho com ordenar/filtro (igual ao @container do app.css)

const _alVazio = ()=>({busca:'',status:'',sexo:'',nivel:'',modal:'',
  idade:{modo:'exata',a:'',b:''}, aval:{preset:'',de:'',ate:''}, treino:{preset:'',de:'',ate:''}});
let _alF = _alVazio();
let _alunosSortCol = null;
let _alunosSortDir = 1; // 1=crescente, -1=decrescente

// Paginação: mostra 10 por vez (padrão), 20, 30 ou tudo (n=0). A escolha fica lembrada neste navegador.
const _AL_POR_PAG = [10,20,30,0];
const _AL_PAG_LS = 'fitcpx-alunos-por-pagina';
const _alPag = {n:(()=>{ try{ const v=parseInt(localStorage.getItem(_AL_PAG_LS),10); if(_AL_POR_PAG.includes(v)) return v; }catch(e){} return 10; })(), pg:1, sig:''};

const _AL_STATUS = {novo:'Novo',ativo:'Ativo',pendente:'Pendente',transf:'Transferência',bloq:'Bloqueado'};
const _AL_SEL = {
  sexo:{lab:'Sexo',id:'alunos-filtro-sexo',opts:[['','Todos'],['F','Feminino'],['M','Masculino'],['__vazio','—']]},
  nivel:{lab:'Nível',id:'alunos-filtro-nivel',opts:[['','Todos'],['Iniciante','Iniciante'],['Intermediário','Intermediário'],['Avançado','Avançado'],['__vazio','—']]},
  modal:{lab:'Atendimento',id:'alunos-filtro-modal',opts:[['','Todos'],['presencial','Presencial'],['online','Online'],['hibrido','Híbrido'],['__vazio','—']]},
};
// Colunas do cabeçalho: tipo sel = lista de opções; idade/data = botão que abre o filtro.
const _AL_COLS = [
  {k:'nome',lab:'Nome',tipo:'busca',w:450},
  {k:'sexo',lab:'Sexo',tipo:'sel',w:104,cls:'al-col al-c1 al-ct'},
  {k:'idade',lab:'Idade',tipo:'idade',w:104,cls:'al-col al-c2 al-ct'},
  {k:'nivel',lab:'Nível',tipo:'sel',w:122,cls:'al-col al-c2 al-ct'},
  {k:'modal',lab:'Atendimento',tipo:'sel',w:116,cls:'al-col al-c2 al-ct'},
  {k:'aval',lab:'Última avaliação',tipo:'data',w:134,cls:'al-col al-c1 al-ct'},
  {k:'treino',lab:'Último treino',tipo:'data',w:132,cls:'al-col al-c1 al-ct'},
];

// ── dados de cada aluno ──────────────────────────────────────────────────
function _alDia(s){ // texto de data -> Date local à meia-noite (nunca UTC), ou null
  if(!s || s==='—') return null;
  let m=String(s).match(/^(\d{4})-(\d{2})-(\d{2})/); if(m) return new Date(+m[1],+m[2]-1,+m[3]);
  m=String(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if(m) return new Date(+m[3],+m[2]-1,+m[1]);
  return null;
}
function _alFmt(d){ return d ? String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear() : ''; }
function _alHoje(){ const h=new Date(); return new Date(h.getFullYear(),h.getMonth(),h.getDate()); }
function _alDiasAtras(n){ const h=_alHoje(); return new Date(h.getFullYear(),h.getMonth(),h.getDate()-n); }
function _alIni(nome){ // mesmas iniciais do Painel (_dashIniciais)
  if(typeof _dashIniciais==='function') return _dashIniciais(nome);
  return (String(nome||'?').trim().charAt(0)||'?').toUpperCase();
}
function _alHa(d){
  const n=Math.round((_alHoje()-d)/864e5);
  return n<=0 ? 'hoje' : n===1 ? 'ontem' : 'há '+n+' dias';
}
function _alAval(s){
  const avs=s.avaliacoesAntro||[];
  return _alDia((avs.length?avs[avs.length-1].data_avaliacao:null)||(s.anamnese||{}).data_avaliacao);
}
function _alTreino(s){
  const pr=getUltimoTreino(s); if(!pr.aprovado) return null;
  const d=_alDia(pr.dataAprovacao); if(d) return d;
  if(!pr.id) return null;
  const x=new Date(pr.id); return isNaN(x) ? null : new Date(x.getFullYear(),x.getMonth(),x.getDate());
}
// O nível é guardado abreviado (Inic/Inte/Avan); a lista mostra e filtra pelo nome completo
const _AL_NIVEL = {Inic:'Iniciante',Inte:'Intermediário',Avan:'Avançado'};
function _alNivel(s){ const n=(s.anamnese||{}).nivel||''; return _AL_NIVEL[n]||n; }
function _alDadosPendentes(s){
  const p=s.perfil||{};
  return !!(p.alunoUserId && !(p.nascimento && p.sexo && String(p.whatsapp||'').replace(/\D/g,'').length>=10));
}
// Status (prioridade): transferência > novo > bloqueado > pendente > ativo
function _alStatus(s){
  const p=s.perfil||{};
  if(typeof alunoTravado==='function' && alunoTravado(s)) return 'transf';
  if(p.novoCadastro) return 'novo';
  if(p.portalStatus==='bloqueado') return 'bloq';
  if(_alDadosPendentes(s)) return 'pendente';
  return 'ativo';
}
// Alerta de saúde (o detalhe aparece no Perfil e na prescrição): lesão, gestação ou cardiopatia
function _alAtencao(s){
  const p=s.perfil||{};
  return !!((p.lesoes && p.lesoes!=='Nenhuma' && p.lesoes.length>2) || (p.condicoes||'').includes('Gestação') || (p.condicoes||'').includes('Cardiopatia'));
}

// ── estado dos filtros ───────────────────────────────────────────────────
// "vazio" (—) = aluno sem a informação; é um filtro como os outros
const _AL_VAZIO = '__vazio';
const _alIdadeAtiva = f => f.modo==='vazio' || (f.modo==='exata' ? f.a!=='' : (f.a!==''||f.b!==''));
const _alDataAtiva = f => !!f.preset || f.de!=='' || f.ate!=='';
function _alAtivo(k){ return k==='idade' ? _alIdadeAtiva(_alF.idade) : _alDataAtiva(_alF[k]); }
function _alQtdFiltros(){
  return ['sexo','nivel','modal'].filter(k=>_alF[k]).length + (_alIdadeAtiva(_alF.idade)?1:0) + (_alDataAtiva(_alF.aval)?1:0) + (_alDataAtiva(_alF.treino)?1:0);
}
function _alDataOk(d,f){
  if(!_alDataAtiva(f)) return true;
  if(f.preset==='vazio') return !d;
  if(!d) return false;
  if(f.preset) return d>=_alDiasAtras(+f.preset) && d<=_alHoje();
  if(f.de){ const x=_alDia(f.de); if(x && d<x) return false; }
  if(f.ate){ const x=_alDia(f.ate); if(x && d>x) return false; }
  return true;
}
function _alResumo(k){
  if(k==='idade'){
    const f=_alF.idade; if(!_alIdadeAtiva(f)) return 'Todas';
    if(f.modo==='vazio') return '—';
    if(f.modo==='exata') return f.a+' anos';
    return f.a!==''&&f.b!=='' ? `${f.a} a ${f.b} anos` : f.a!=='' ? `${f.a}+ anos` : `até ${f.b} anos`;
  }
  const f=_alF[k]; if(!_alDataAtiva(f)) return 'Todas';
  if(f.preset==='vazio') return '—';
  if(f.preset) return 'Até '+f.preset+' dias';
  const p=v=>v?v.split('-').reverse().slice(0,2).join('/'):'…';
  return p(f.de)+' a '+p(f.ate);
}
function alunosSetFiltro(k,v){ _alF[k]=v; renderScreenAlunos(); }

// Cada coluna ordena do menor ao maior e de volta; o 3º clique tira a ordem
function sortAlunos(col){
  if(_alunosSortCol!==col){ _alunosSortCol=col; _alunosSortDir=1; }
  else if(_alunosSortDir===1) _alunosSortDir=-1;
  else { _alunosSortCol=null; _alunosSortDir=1; }
  renderScreenAlunos();
}

// ── layout: compacto quando o cartão é estreito ──────────────────────────
function _alCompacto(){
  const c=document.querySelector('.al-body');
  return !!c && c.clientWidth>0 && c.clientWidth<ALUNOS_COMPLETO_PX;
}
let _alCompactoAnt=null, _alObs=null;
function _alObserva(){
  const c=document.querySelector('.al-body'); if(_alObs || !c || typeof ResizeObserver==='undefined') return;
  _alObs=new ResizeObserver(()=>{
    if(!c.clientWidth) return;
    const x=_alCompacto(); if(x===_alCompactoAnt) return;
    _alCompactoAnt=x; alunosFecharPop(); renderScreenAlunos();
  });
  _alObs.observe(c);
}

// ── cabeçalho (legenda + seta de ordenar, e o filtro logo abaixo) ────────
function _alSelHTML(k,comId){
  const c=_AL_SEL[k];
  return `<select ${comId?`id="${c.id}" `:''}data-alf="${k}" onchange="alunosSetFiltro('${k}',this.value)" aria-label="Filtrar por ${c.lab}">${c.opts.map(o=>`<option value="${o[0]}">${o[1]}</option>`).join('')}</select>`;
}
function _alMontaCabecalho(){
  const tr=$('alunos-thr'); if(!tr || tr.children.length) return;
  tr.innerHTML=_AL_COLS.map(c=>{
    const ord = c.k==='nome' ? '' : `<button type="button" class="al-sortbtn" data-al-sort="${c.k}" onclick="sortAlunos('${c.k}')" title="${c.tipo==='sel'?'Ordenar de A a Z e de Z a A':'Ordenar do menor ao maior e do maior ao menor'}" aria-label="Ordenar por ${c.lab}"><i class=ph-arrows-down-up></i></button>`;
    let ctl;
    if(c.tipo==='busca') ctl=`<div class="th-search"><i class=ph-magnifying-glass></i><input id="alunos-busca" data-al-busca placeholder="Buscar aluno" oninput="alunosSetFiltro('busca',this.value)" autocomplete="off"></div>`;
    else if(c.tipo==='sel') ctl=_alSelHTML(c.k,true);
    else ctl=`<button type="button" class="al-fld" data-al-fld="${c.k}" onclick="alunosAbrirPop(this,'${c.k}')" aria-haspopup="dialog"><span></span><i class=ph-caret-down></i></button>`;
    return `<th class="${c.cls||''}" style="min-width:${c.w}px"><div class="th-label">${c.lab}${ord}</div>${ctl}</th>`;
  }).join('')+`<th class="al-th-ac"><button class="icon-btn" onclick="limparFiltrosAlunos()" title="Limpar filtros" aria-label="Limpar filtros"><i class=ph-funnel-x></i></button></th>`;
}
function _alAbas(){
  const el=$('alunos-tabs'); if(!el) return;
  const cont={}; students.forEach(s=>{ const k=_alStatus(s); cont[k]=(cont[k]||0)+1; });
  const abas=[['','Todos',students.length]].concat(Object.keys(_AL_STATUS).map(k=>[k,_AL_STATUS[k],cont[k]||0]));
  el.innerHTML='<div class="dp-seg" role="group" aria-label="Filtrar por status">'+abas.map(a=>
    '<button type="button" class="dp-seg-b'+(_alF.status===a[0]?' on':'')+'" onclick="alunosSetFiltro(\'status\',\''+a[0]+'\')">'
    +(a[0]?'<i class="al-dot al-st-'+a[0]+'"></i>':'')+a[1]+'<span>'+a[2]+'</span></button>').join('')+'</div>';
}
function _alSync(){
  document.querySelectorAll('[data-alf]').forEach(el=>{ const k=el.dataset.alf; el.value=_alF[k]; el.classList.toggle('active',!!_alF[k]); });
  document.querySelectorAll('[data-al-busca]').forEach(el=>{ if(el.value!==_alF.busca) el.value=_alF.busca; });
  document.querySelectorAll('[data-al-fld]').forEach(b=>{ const k=b.dataset.alFld; b.classList.toggle('active',_alAtivo(k)); b.querySelector('span').textContent=_alResumo(k); });
  document.querySelectorAll('[data-al-sort]').forEach(b=>{
    const on=_alunosSortCol===b.dataset.alSort;
    b.classList.toggle('on',on);
    b.innerHTML=on ? (_alunosSortDir===1?'<i class=ph-arrow-up></i>':'<i class=ph-arrow-down></i>') : '<i class=ph-arrows-down-up></i>';
  });
  const n=_alQtdFiltros(), fn=$('alunos-fil-n'), fb=$('alunos-fil-btn');
  if(fn) fn.textContent=n||'';
  if(fb) fb.classList.toggle('active',n>0);
}

// ── filtros de idade e de datas (janela do popover no notebook e do painel no tablet/celular) ──
function _alBoxHTML(k){
  if(k==='idade'){
    const f=_alF.idade, ex=f.modo==='exata', vz=f.modo==='vazio';
    return `<div class="al-seg al-seg3" role="group" aria-label="Tipo de filtro de idade">
        <button type="button" class="${ex?'on':''}" onclick="alunosIdadeModo('exata',this)">Idade exata</button>
        <button type="button" class="${f.modo==='int'?'on':''}" onclick="alunosIdadeModo('int',this)">Intervalo</button>
        <button type="button" class="${vz?'on':''}" onclick="alunosIdadeModo('vazio',this)" title="Sem data de nascimento">—</button></div>`
      +(vz ? `<div class="al-sub-t">Alunos sem idade (sem data de nascimento)</div>` : ex ? `<label class="al-lab">Idade (em anos)<input type="number" inputmode="numeric" min="0" max="120" value="${escHTML(f.a)}" placeholder="Ex.: 35" oninput="alunosIdadeVal('a',this.value)"></label>`
           : `<div class="al-row2"><label class="al-lab">De (anos)<input type="number" inputmode="numeric" min="0" max="120" value="${escHTML(f.a)}" placeholder="Ex.: 30" oninput="alunosIdadeVal('a',this.value)"></label>
              <label class="al-lab">Até (anos)<input type="number" inputmode="numeric" min="0" max="120" value="${escHTML(f.b)}" placeholder="Ex.: 45" oninput="alunosIdadeVal('b',this.value)"></label></div>`);
  }
  const f=_alF[k];
  return `<div class="al-chips">${[7,15,30,60,90,120].map(n=>`<button type="button" class="al-chip${f.preset==n?' on':''}" onclick="alunosDataPreset('${k}',${n},this)">Até ${n} dias</button>`).join('')}<button type="button" class="al-chip${f.preset==='vazio'?' on':''}" onclick="alunosDataPreset('${k}','vazio',this)" title="Sem data">—</button></div>
    <div class="al-sub-t">Ou intervalo personalizado</div>
    <div class="al-row2"><label class="al-lab">Do dia<input type="date" value="${escHTML(f.de)}" oninput="alunosDataCustom('${k}','de',this.value,this)"></label>
    <label class="al-lab">Ao dia<input type="date" value="${escHTML(f.ate)}" oninput="alunosDataCustom('${k}','ate',this.value,this)"></label></div>`;
}
function _alRefazBox(el){ const box=el.closest('[data-al-box]'); if(box) box.innerHTML=_alBoxHTML(box.dataset.alBox); return box; }
function alunosIdadeModo(m,el){ _alF.idade={modo:m,a:'',b:''}; const box=_alRefazBox(el); const i=box&&box.querySelector('input'); if(i) i.focus(); renderScreenAlunos(); }
function alunosIdadeVal(c,v){ _alF.idade[c]=v; renderScreenAlunos(); }
function alunosDataPreset(k,n,el){ _alF[k]={preset:String(n),de:'',ate:''}; _alRefazBox(el); renderScreenAlunos(); }
function alunosDataCustom(k,c,v,el){
  _alF[k].preset=''; _alF[k][c]=v;
  const box=el.closest('[data-al-box]'); if(box) box.querySelectorAll('.al-chip').forEach(b=>b.classList.remove('on'));
  renderScreenAlunos();
}
function alunosLimparCampo(k){
  _alF[k] = k==='idade' ? {modo:_alF.idade.modo==='vazio'?'exata':_alF.idade.modo,a:'',b:''} : {preset:'',de:'',ate:''};
  document.querySelectorAll(`[data-al-box="${k}"]`).forEach(b=>{ b.innerHTML=_alBoxHTML(k); });
  if($('alunos-painel')===null) alunosFecharPop();
  renderScreenAlunos();
}

// ── popover (notebook) e painel de filtros (tablet/celular) ──────────────
let _alPop=null, _alFoco=null;
function alunosFecharPop(){
  if(_alPop){ _alPop.remove(); _alPop=null; }
  const p=$('alunos-painel'); if(p) p.remove();
  if(_alFoco && document.contains(_alFoco)) _alFoco.focus({preventScroll:true});
  _alFoco=null;
}
function alunosAbrirPop(btn,k){
  const aberto=_alPop && _alPop.dataset.k===k;
  alunosFecharPop(); if(aberto) return;
  _alFoco=btn;
  const p=document.createElement('div');
  p.className='al-pop'; p.dataset.k=k; p.setAttribute('role','dialog');
  const tit={idade:'Filtrar por idade',aval:'Última avaliação: janela fixa',treino:'Último treino: janela fixa'}[k];
  p.setAttribute('aria-label',tit);
  p.innerHTML=`<div class="al-pop-t">${tit}</div><div data-al-box="${k}">${_alBoxHTML(k)}</div>
    <div class="al-pop-foot"><button type="button" class="al-lnk" onclick="alunosLimparCampo('${k}')">Limpar</button><button type="button" class="btn btn-primary btn-sm" onclick="alunosFecharPop()">Aplicar</button></div>`;
  document.body.appendChild(p); _alPop=p;
  const r=btn.getBoundingClientRect(), w=p.offsetWidth;
  p.style.left=Math.max(8,Math.min(r.left,innerWidth-w-8))+'px';
  let top=r.bottom+6; if(top+p.offsetHeight>innerHeight-8) top=Math.max(8,r.top-p.offsetHeight-6);
  p.style.top=top+'px';
  const i=p.querySelector('input'); if(i) i.focus({preventScroll:true});
}
function alunosAbrirPainel(btn){
  const ja=$('alunos-painel'); alunosFecharPop(); if(ja) return;
  _alFoco=btn;
  const bg=document.createElement('div'); bg.id='alunos-painel'; bg.className='al-painel-bg';
  bg.addEventListener('mousedown',e=>{ if(e.target===bg) alunosFecharPop(); });
  const sec=(t,h)=>`<div class="al-grp"><div class="al-grp-t">${t}</div>${h}</div>`;
  bg.innerHTML=`<div class="al-painel" role="dialog" aria-modal="true" aria-label="Filtros dos alunos">
    <div class="al-painel-h"><b>Filtros</b><button class="icon-btn" type="button" onclick="alunosFecharPop()" aria-label="Fechar"><i class=ph-x></i></button></div>
    <div class="al-painel-b">
      ${sec('Sexo',_alSelHTML('sexo'))}
      ${sec('Idade',`<div data-al-box="idade">${_alBoxHTML('idade')}</div>`)}
      ${sec('Nível',_alSelHTML('nivel'))}${sec('Atendimento',_alSelHTML('modal'))}
      ${sec('Última avaliação',`<div data-al-box="aval">${_alBoxHTML('aval')}</div>`)}
      ${sec('Último treino',`<div data-al-box="treino">${_alBoxHTML('treino')}</div>`)}
    </div>
    <div class="al-painel-f"><button class="btn" type="button" onclick="limparFiltrosAlunos(true)">Limpar</button><button class="btn btn-primary" type="button" onclick="alunosFecharPop()">Ver alunos</button></div></div>`;
  document.body.appendChild(bg);
  const r=btn.getBoundingClientRect(), pn=bg.firstElementChild;
  pn.style.setProperty('--al-top',(r.bottom+6)+'px');
  pn.style.setProperty('--al-right',Math.max(8,innerWidth-r.right)+'px');
  _alSync();
}
document.addEventListener('mousedown',e=>{ if(_alPop && !_alPop.contains(e.target) && !e.target.closest('[data-al-fld]')) alunosFecharPop(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape' && (_alPop||$('alunos-painel'))) alunosFecharPop(); });

// ── lista ────────────────────────────────────────────────────────────────
function renderScreenAlunos(){
  const grid=$('alunos-grid');
  const empty=$('alunos-empty');
  if(!grid) return;
  _alMontaCabecalho(); _alObserva();
  const compacto=_alCompacto(); _alCompactoAnt=compacto;

  const busca=_alF.busca.toLowerCase().trim();
  const fi=_alF.idade;
  let lista = students.filter(s=>{
    const p=s.perfil||{}, a=s.anamnese||{};
    if(busca && !matchTokens(busca, p.nome||'', _alNivel(s), getUltimoTreino(s).objetivo||'')) return false;
    if(_alF.status && _alStatus(s)!==_alF.status) return false;
    if(_alF.sexo===_AL_VAZIO){ if(p.sexo) return false; } else if(_alF.sexo && p.sexo!==_alF.sexo) return false;
    if(_alF.nivel===_AL_VAZIO){ if(_alNivel(s)) return false; } else if(_alF.nivel && _alNivel(s)!==_alF.nivel) return false;
    if(_alF.modal===_AL_VAZIO){ if(p.modalidade) return false; } else if(_alF.modal && !(p.modalidade||'').toLowerCase().includes(_alF.modal)) return false;
    if(_alIdadeAtiva(fi)){
      const id=_calcIdadeNum(p.nascimento);
      if(fi.modo==='vazio'){ if(id!==null) return false; }
      else if(id===null) return false;
      else if(fi.modo==='exata'){ if(id!==+fi.a) return false; }
      else { if(fi.a!=='' && id<+fi.a) return false; if(fi.b!=='' && id>+fi.b) return false; }
    }
    return _alDataOk(_alAval(s),_alF.aval) && _alDataOk(_alTreino(s),_alF.treino);
  });

  // Ordem: aluno novo no topo > coluna clicada (só no notebook) > alfabética. Sem informação (—) conta como o mais antigo/menor:
  // fica no topo na ordem crescente e no fim na decrescente.
  const val=(s,k)=>{
    const p=s.perfil||{};
    if(k==='sexo') return p.sexo||'';
    if(k==='idade'){ const i=_calcIdadeNum(p.nascimento); return i===null ? -1 : i; }
    if(k==='nivel') return ({Iniciante:1,Intermediário:2,Avançado:3})[_alNivel(s)]||0;
    if(k==='modal') return p.modalidade ? _modalLabel(p.modalidade) : '';
    if(k==='aval'){ const d=_alAval(s); return d ? +d : 0; }
    if(k==='treino'){ const d=_alTreino(s); return d ? +d : 0; }
    return 0;
  };
  const col = compacto ? null : _alunosSortCol;
  lista = [...lista].sort((a,b)=>{
    const na=!!(a.perfil||{}).novoCadastro, nb=!!(b.perfil||{}).novoCadastro;
    if(na!==nb) return na ? -1 : 1;
    if(col){
      const va=val(a,col), vb=val(b,col);
      const c = typeof va==='string' ? va.localeCompare(vb,'pt-BR') : va-vb;
      if(c) return c*_alunosSortDir;
    }
    return ((a.perfil||{}).nome||'').localeCompare((b.perfil||{}).nome||'','pt-BR');
  });

  // Paginação: volta pra página 1 quando filtro ou ordem mudam
  const sig=JSON.stringify([_alF,_alunosSortCol,_alunosSortDir]);
  if(sig!==_alPag.sig){ _alPag.sig=sig; _alPag.pg=1; }
  const pp=_alPag.n, paginas=pp ? Math.max(1,Math.ceil(lista.length/pp)) : 1;
  _alPag.pg=Math.min(Math.max(1,_alPag.pg),paginas);
  const ini=pp ? (_alPag.pg-1)*pp : 0;
  const visiveis=pp ? lista.slice(ini,ini+pp) : lista;

  const cb=$('alunos-count-badge');
  if(cb) cb.textContent=(lista.length===students.length ? students.length : lista.length+' de '+students.length)+' aluno'+(students.length!==1?'s':'');

  grid.innerHTML='';
  if(empty) empty.classList.toggle('hidden', lista.length>0 || students.length>0);

  const hoje=_alHoje();
  visiveis.forEach(s=>{
    const p=s.perfil||{}, a=s.anamnese||{};
    const tr=document.createElement('tr');
    const st=_alStatus(s), idade=_calcIdadeNum(p.nascimento), modal=p.modalidade||'', nivel=_alNivel(s);
    const dAval=_alAval(s), dTreino=_alTreino(s);
    const dash='<span class="al-dash">—</span>';
    const nome=p.nome||'—';
    const venc = dTreino && Math.round((hoje-dTreino)/864e5) > ALUNOS_TREINO_VENCIDO_DIAS;
    const treino = !dTreino ? dash
      : venc ? `<span class="badge badge-amber" title="Treino com mais de ${ALUNOS_TREINO_VENCIDO_DIAS} dias: ciclo de 8 semanas vencido"><i class=ph-clock-countdown></i>${_alFmt(dTreino)}</span>`
             : `<span class="badge badge-green"><i class=ph-check></i>${_alFmt(dTreino)}</span>`;
    const semCpf = String(p.cpf||'').replace(/\D/g,'').length!==11;
    const tags = (semCpf?'<span class="badge badge-gray" title="Sem CPF: mande o link de cadastro pro aluno preencher"><i class=ph-identification-card></i>Sem CPF</span>':'')
               + (_alDadosPendentes(s)?'<span class="badge badge-amber" title="Aluno com app bloqueado: faltam nascimento, sexo ou WhatsApp. Complete no Perfil ou espere o aluno preencher."><i class=ph-lock></i>Dados pendentes</span>':'');
    const travado = typeof alunoTravado==='function' && alunoTravado(s);

    tr.innerHTML=`
      <td>
        <div class="al-nome">
          <span class="al-av al-st-${st}" title="${_AL_STATUS[st]}" aria-label="Status: ${_AL_STATUS[st]}">${escHTML(_alIni(nome))}</span>
          <span class="al-id">${_alAtencao(s)?'<span class="al-warn" title="Alerta de saúde: veja os detalhes no Perfil do aluno"><i class=ph-warning></i></span>':''}<span class="al-n">${escHTML(nome)}</span></span>
          <span class="al-tags">${tags}</span>
        </div>
      </td>
      <td class="al-sexo al-col al-c1 al-ct">${p.sexo?(p.sexo==='M'?'Masculino':'Feminino'):dash}</td>
      <td class="al-sexo al-col al-c2 al-ct">${idade!==null?idade+' anos':dash}</td>
      <td class="al-col al-c2 al-ct">${nivel?`<span class="badge ${_nivelColor(nivel)}">${escHTML(nivel)}</span>`:dash}</td>
      <td class="al-col al-c2 al-ct">${modal?`<span class="badge badge-gray">${escHTML(_modalLabel(modal))}</span>`:dash}</td>
      <td class="al-data al-col al-c1 al-ct">${dAval?`<div class="dp-v">${_alFmt(dAval)}</div><div class="dp-s">${_alHa(dAval)}</div>`:dash}</td>
      <td class="al-data al-col al-c1 al-ct">${treino}${dTreino?`<div class="dp-s">${_alHa(dTreino)}</div>`:''}</td>
      <td class="al-acoes">
        ${p.novoCadastro?`<button class="icon-btn" onclick="event.stopPropagation();marcarAlunoComoVisto(${s.id})" title="Marcar como visto" aria-label="Marcar como visto"><i class=ph-eye></i></button>`:''}
        <button class="icon-btn" onclick="event.stopPropagation();confirmarDeletarAluno(${s.id})" title="Remover aluno" aria-label="Remover aluno" ${travado?'disabled':''}><i class=ph-trash></i></button>
      </td>
    `;
    tr.onclick = ()=>selectStudent(s.id);
    grid.appendChild(tr);
  });

  if(!lista.length && students.length>0){
    const tr=document.createElement('tr');
    tr.innerHTML=`<td colspan="8"><div class="empty"><i class=ph-magnifying-glass></i><div class="empty-title">Nenhum aluno corresponde aos filtros</div><button class="btn btn-ghost btn-sm" onclick="limparFiltrosAlunos()">Limpar filtros</button></div></td>`;
    grid.appendChild(tr);
    if(empty) empty.classList.add('hidden');
  }
  _alAbas(); _alPagina(lista.length,ini,visiveis.length,paginas); _alSync();
}

function _alPagina(total,ini,qtd,paginas){
  const el=$('alunos-pag'); if(!el) return;
  // sem o que paginar (10 alunos ou menos no total) o rodapé não aparece
  el.hidden = students.length<=_AL_POR_PAG[0] || !total;
  if(el.hidden) return;
  const pp=_alPag.n, pg=_alPag.pg;
  el.innerHTML=
    '<span class="al-pag-info">Mostrando '+(ini+1)+' a '+(ini+qtd)+' de '+total+' aluno'+(total!==1?'s':'')+'</span>'
    +'<div class="al-pag-ctl"><span class="al-pag-l">Por página</span>'
    +'<div class="dp-seg" role="group" aria-label="Alunos por página">'+_AL_POR_PAG.map(n=>
      '<button type="button" class="dp-seg-b'+(pp===n?' on':'')+'" onclick="alunosPorPagina('+n+')">'+(n||'Tudo')+'</button>').join('')+'</div>'
    +(paginas>1
      ? '<div class="al-pag-nav"><button type="button" class="icon-btn" onclick="alunosPagina(-1)" aria-label="Página anterior" title="Página anterior"'+(pg<=1?' disabled':'')+'><i class=ph-caret-left></i></button>'
        +'<span aria-live="polite">'+pg+' de '+paginas+'</span>'
        +'<button type="button" class="icon-btn" onclick="alunosPagina(1)" aria-label="Próxima página" title="Próxima página"'+(pg>=paginas?' disabled':'')+'><i class=ph-caret-right></i></button></div>'
      : '')
    +'</div>';
}
function alunosPagina(d){
  _alPag.pg+=d; renderScreenAlunos();
  const sc=document.querySelector('#screen-alunos .main-scroll'); if(sc) sc.scrollTo({top:0});
}
function alunosPorPagina(n){
  _alPag.n=n; _alPag.pg=1;
  try{ localStorage.setItem(_AL_PAG_LS,String(n)); }catch(e){}
  renderScreenAlunos();
}

function marcarAlunoComoVisto(id){
  const s = students.find(x=>x.id===id); if(!s || !s.perfil) return;
  delete s.perfil.novoCadastro;
  try{ localStorage.setItem(lsKey('acm-students'), JSON.stringify(students)); }catch(e){}
  if(typeof supaAutoSave==='function') supaAutoSave();
  renderScreenAlunos();
}

function limparFiltrosAlunos(manterPainel){
  _alF=_alVazio();
  _alunosSortCol=null; _alunosSortDir=1;
  if(manterPainel===true && $('alunos-painel')){
    document.querySelectorAll('#alunos-painel [data-al-box]').forEach(b=>{ b.innerHTML=_alBoxHTML(b.dataset.alBox); });
  } else alunosFecharPop();
  renderScreenAlunos();
}

function confirmarDeletarAluno(id){
  const s=students.find(x=>x.id===id); if(!s) return;
  if(typeof alunoTravado==='function' && alunoTravado(s)){ alert('Cadastro em transferência: só visualização. Não dá pra remover agora.'); return; }
  if(!confirmarExclusao('aluno', s.perfil?.nome||'—')) return;
  // O aluno vai inteiro para o Arquivo — avaliações e treinos moram dentro do
  // próprio objeto, então voltam junto se ele for restaurado. As tarefas do
  // CRM (js/crm-store.js), porém, moram fora do aluno, em DB.tasks — sem levar
  // uma cópia junto pro envelope, elas ficavam órfãs pra sempre (restaurarItem
  // sempre gera id novo, então nunca mais reconectavam ao aluno restaurado).
  if(typeof DB!=='undefined' && Array.isArray(DB.tasks)){
    s._crmTasksBackup = DB.tasks.filter(t=>t.alunoId===s.id);
  }
  arquivarItem('aluno', s, { ownerId: s.id, ownerNome: s.perfil?.nome });
  if(typeof DB!=='undefined' && Array.isArray(DB.tasks)){
    DB.tasks = DB.tasks.filter(t=>t.alunoId!==s.id);
    delete s._crmTasksBackup;
    if(typeof crmSave==='function') crmSave();
  }
  students = students.filter(x=>x.id!==id);
  if(activeId===id){
    activeId=null;
    // Return to alunos list if we were viewing the deleted student
    NAV_SCREENS.forEach(sid=>{ const el=$(sid); if(el) el.classList.add('hidden'); });
    show('screen-alunos');
  }
  // Não usa saveStudent() aqui: se o aluno excluído era o ativo, activeId fica null e
  // getActive() retornaria undefined, abortando o save sem persistir a exclusão.
  try{ localStorage.setItem(lsKey('acm-students'), JSON.stringify(students)); }catch(e){}
  supaAutoSave();
  renderScreenAlunos();
}

function abrirSalvarBibliotecaDeAluno(id){
  // Select the student and open the save modal
  const prev = activeId;
  activeId = id;
  abrirSalvarBiblioteca();
  // Restore if no prescription
  const s=students.find(x=>x.id===id);
  if(!s || !getUltimoTreino(s).aprovado) activeId=prev;
}



// ─── DRAFT / DIRTY TRACKING ──────────────────────────────────────────────────
let _formDirty  = false;
let _pendingNavFn = null;

let _loadingData = false;
function _markDirty(){ if(_loadingData) return; _formDirty = true; }
function _clearDirty(){ _formDirty = false; try{ const k=lsKey('acm-draft-'+(activeId||'_')); localStorage.removeItem(k); localStorage.removeItem(k.replace('acm-draft-','acm-draft-nav-')); }catch(e){} }

function _saveDraft(){
  const s=getActive(); if(!s) return;
  try{
    localStorage.setItem(lsKey('acm-draft-'+(activeId||'_')), JSON.stringify(s));
    // Also save current tab/subtab so recovery can restore navigation
    let tab='perfil';
    for(const t of ['perfil','anamnese','prescricao','evolucao']){
      if(document.getElementById('tab-'+t)?.classList.contains('active')){ tab=t; break; }
    }
    let subtab='anamnese-hist';
    const _SUBTABS=['anamnese-hist','anamnese-antro','anamnese-meta'];
    for(const t of _SUBTABS){
      if(document.getElementById('subtab-'+t)?.classList.contains('active')){ subtab=t; break; }
    }
    localStorage.setItem(lsKey('acm-draft-nav-'+(activeId||'_')), JSON.stringify({tab,subtab,antroEditId:(typeof _antroEditId!=='undefined'?_antroEditId:null)}));
  }catch(e){}
}

function _revertStudent(){
  try{
    const saved=JSON.parse(localStorage.getItem(lsKey('acm-students'))||'[]');
    const snap=saved.find(s=>s.id===activeId);
    if(snap){ const idx=students.findIndex(s=>s.id===activeId); if(idx>=0) students[idx]=snap; }
  }catch(e){}
}

function _saveCurrentContext(){
  const tabPerf=$('tab-perfil')?.classList.contains('active');
  const tabAnam=$('tab-anamnese')?.classList.contains('active');
  const tabPresc=$('tab-prescricao')?.classList.contains('active');
  if(tabPerf && typeof salvarPerfil==='function'){ salvarPerfil(); return; }
  if(tabAnam){
    if(!$('subpanel-anamnese-antro')?.classList.contains('hidden') && typeof antroSalvarAvaliacao==='function'){ antroSalvarAvaliacao(); return; }
    if(!$('subpanel-anamnese-meta')?.classList.contains('hidden') && typeof salvarMeta==='function'){ salvarMeta(); return; }
    if(typeof salvarAnamnese==='function'){ salvarAnamnese(); return; }
  }
  if(tabPresc && typeof salvarEstadoPrescricao==='function'){ salvarEstadoPrescricao(); return; }
  saveStudent();
}

function _guardNav(navFn){
  if(!_formDirty){ navFn(); return; }
  _pendingNavFn = navFn;
  const el=document.getElementById('modal-unsaved-overlay');
  if(el) el.classList.remove('hidden');
}

function _unsavedSair(){
  const el=document.getElementById('modal-unsaved-overlay');
  if(el) el.classList.add('hidden');
  _revertStudent();
  _clearDirty();
  // Refresh form so UI reflects reverted data
  const s=getActive(); if(s) loadStudentData(s);
  const fn=_pendingNavFn; _pendingNavFn=null;
  if(fn) fn();
}

function salvarPerfil(){
  const _s = getActive();
  if(_s && typeof alunoTravado==='function' && alunoTravado(_s)) return;   // em transferência: só visualização
  if(typeof onPerfilChange==='function') onPerfilChange();
  if(typeof saveStudent==='function') saveStudent();
  // Nome + CPF + e-mail conferidos no índice central (evita duplicar aluno de outro personal)
  if(_s && typeof registrarAlunoNuvem==='function') registrarAlunoNuvem(_s);
}
function salvarAnamnese(){
  if(typeof onAnamneseChange==='function') onAnamneseChange();
  if(typeof saveStudent==='function') saveStudent();
}

function _unsavedSalvar(){
  const el=document.getElementById('modal-unsaved-overlay');
  if(el) el.classList.add('hidden');
  _saveCurrentContext();
  _clearDirty();
  const fn=_pendingNavFn; _pendingNavFn=null;
  if(fn) fn();
}

function _showDraftRecoveryModal(id, draftKey){
  const overlay = document.getElementById('modal-draft-recovery-overlay');
  if(overlay){ overlay.classList.remove('hidden'); }
  window._draftRecoveryKey = draftKey;
  window._draftRecoveryId  = id;
}

function _draftRecoveryIgnorar(){
  const overlay = document.getElementById('modal-draft-recovery-overlay');
  if(overlay) overlay.classList.add('hidden');
  // Force dirty=false FIRST so no guard or beforeunload fires
  _formDirty = false;
  try{
    const saved = JSON.parse(localStorage.getItem(lsKey('acm-students'))||'[]');
    const snap  = saved.find(s=>s.id===window._draftRecoveryId);
    if(snap){ const i2=students.findIndex(s=>s.id===window._draftRecoveryId); if(i2>=0) students[i2]=snap; }
    // Remove draft by both possible keys
    localStorage.removeItem(window._draftRecoveryKey);
    localStorage.removeItem(lsKey('acm-draft-' + activeId));
  }catch(e){}
  _formDirty = false; // ensure stays false
  loadStudentData(getActive());
}

function _draftRecoveryVer(){
  const overlay = document.getElementById('modal-draft-recovery-overlay');
  if(overlay) overlay.classList.add('hidden');
  // Data already merged into students[] and loaded by selectStudent.
  // Just mark dirty so the guard activates on next navigation.
  _formDirty = true;
}

window.addEventListener('beforeunload', ()=>{
  if(_formDirty){
    try{
      // Sync antro form fields → s.avaliacoesAntro if antro form is open
      const antroFv = document.getElementById('antro-form-view');
      if(antroFv && antroFv.style.display !== 'none' && typeof autosalvarAvaliacaoAtual==='function'){
        autosalvarAvaliacaoAtual();
      }
      // Sync anamnese-hist fields → s.anamnese if that panel is active
      if(typeof onAnamneseChange==='function'){
        const panelAnam = document.getElementById('panel-anamnese');
        if(panelAnam && !panelAnam.classList.contains('hidden')) onAnamneseChange();
      }
      // Sync perfil fields → s.perfil if that panel is active
      if(typeof onPerfilChange==='function'){
        const panelPerf = document.getElementById('panel-perfil');
        if(panelPerf && !panelPerf.classList.contains('hidden')) onPerfilChange();
      }
    }catch(ex){}
    _saveDraft();
  }
});
// ─── FIM DRAFT / DIRTY ───────────────────────────────────────────────────────


// ─── DRAFT DETECTION ON APP LOAD ──────────────────────────────────────────────
function detectarDraftsNaoSalvos(){
  const drafts = [];
  try{
    for(let i=0; i<localStorage.length; i++){
      const key = localStorage.key(i);
      if(!key || !key.startsWith('acm-draft-') || key.includes('-nav-')) continue;
      // As chaves agora terminam em '::<user_id>'. Sem este filtro, o personal
      // logado veria os rascunhos pendentes da OUTRA conta do mesmo navegador.
      const sufixo = '::' + (getLsUser() || 'anon');
      if(!key.endsWith(sufixo)) continue;
      const rawId = key.replace('acm-draft-','').slice(0, -sufixo.length);
      const numId = isNaN(rawId) ? rawId : Number(rawId);
      const savedStudent = students.find(s=>s.id===numId || s.id===rawId);
      let student = savedStudent;
      const isOrphan = !savedStudent;
      if(!student){
        // Orphan draft = new student never saved to acm-students
        try{ const d=JSON.parse(localStorage.getItem(key)||'null'); if(d) student=d; }catch(e){}
      } else {
        // Draft exists for a saved student — compare; if identical, discard silently
        try{
          const draftData = JSON.parse(localStorage.getItem(key)||'null');
          if(draftData && JSON.stringify(draftData) === JSON.stringify(savedStudent)){
            localStorage.removeItem(key);
            continue;
          }
        }catch(e){}
      }
      if(student) drafts.push({key, student, orphan: isOrphan});
    }
  }catch(e){}
  if(!drafts.length) return;

  // Show blocking modal (prevents user from clicking other elements before deciding)
  let existing = document.getElementById('draft-pending-banner');
  if(existing) existing.remove();

  const names = drafts.map(d=>d.student.perfil?.nome||'Aluno sem nome').join(', ');
  const overlay = document.createElement('div');
  overlay.id = 'draft-pending-banner';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9998;display:flex;align-items:center;justify-content:center';
  overlay.innerHTML = `
    <div style="background:var(--bg2,#fff);border-radius:12px;padding:28px 32px;max-width:440px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,.3)">
      <div style="font-size:17px;font-weight:700;margin-bottom:10px"><i class=ph-warning></i> Alterações não salvas</div>
      <p style="color:var(--text2,#555);font-size:14px;margin-bottom:6px">Há alterações não salvas para:</p>
      <p style="font-weight:600;font-size:14px;margin-bottom:18px">${names}</p>
      <p style="color:var(--text3,#888);font-size:13px;margin-bottom:20px">Clique em <strong>Ver alterações</strong> para recuperar os dados, ou <strong>Ignorar</strong> para descartá-los.</p>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button onclick="_bannerIgnorarTodos()" class="btn btn-ghost" >Ignorar</button>
        <button onclick="_bannerVerAlteracoes()" class="btn btn-primary" ><i class=ph-eye></i> Ver alterações</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  window._pendingDrafts = drafts;
}

function _bannerIgnorarTodos(){
  const banner = document.getElementById('draft-pending-banner');
  if(banner) banner.remove();
  try{
    (window._pendingDrafts||[]).forEach(d=>localStorage.removeItem(d.key));
  }catch(e){}
  window._pendingDrafts = [];
}

function _bannerVerAlteracoes(){
  const banner = document.getElementById('draft-pending-banner');
  if(banner) banner.remove();
  const drafts = window._pendingDrafts||[];
  if(!drafts.length) return;
  const first = drafts[0];
  _formDirty = false;
  window._skipDraftModal = true;
  if(first.orphan){
    // New student never saved — load from draft directly into memory
    if(!students.find(s=>s.id===first.student.id)) students.push(first.student);
  }
  if(typeof selectStudent==='function') selectStudent(first.student.id);
  // Restore the tab they were editing before the refresh
  try{
    let navRaw = localStorage.getItem(lsKey('acm-draft-nav-'+first.student.id));
    if(!navRaw){
      // Try numeric id (id may be stored as number)
      const numId = Number(first.student.id);
      navRaw = localStorage.getItem(lsKey('acm-draft-nav-'+numId));
    }
    if(navRaw){
      const nav=JSON.parse(navRaw);
      if(nav.tab && nav.tab!=='perfil') switchTabForcado(nav.tab);
      if(nav.subtab && nav.tab==='anamnese'){
        _switchSubtabForcado(nav.subtab);
        // If antro form was open (editing or new eval in progress), reopen it
        if(nav.subtab==='anamnese-antro'){
          setTimeout(()=>{
            if(nav.antroEditId){
              // Was editing an existing evaluation — reopen in form view
              if(typeof antroEditarAvaliacao==='function') antroEditarAvaliacao(nav.antroEditId);
            } else {
              // Was creating a new evaluation — open new form if there's a partial entry
              const s2=getActive();
              if(s2 && s2.avaliacoesAntro && s2.avaliacoesAntro.length){
                const last=s2.avaliacoesAntro[s2.avaliacoesAntro.length-1];
                // Only auto-open if it looks like an unsaved partial (no required fields)
                if(!last.massa_gorda && !last.massa_muscular && typeof antroEditarAvaliacao==='function'){
                  antroEditarAvaliacao(last.id);
                }
              }
            }
          }, 200);
        }
      }
    }
  }catch(e){}
  // Delay dirty=true so it fires AFTER loadStudentData's 150ms timeout that clears it
  setTimeout(()=>{ _formDirty = true; }, 250);
}
// ─── FIM DRAFT DETECTION ─────────────────────────────────────────────────────

// ─── SELECT / LOAD STUDENT ────────────────────────────────────────────────────

function selectStudent(id){
  _formDirty = false; // reset flag only — do NOT delete draft for the incoming student
  activeId = id;
  // Check for unrestored draft from previous session
  const draftKey = lsKey('acm-draft-' + id);
  try{
    const draftRaw = localStorage.getItem(draftKey);
    if(draftRaw){
      const draft = JSON.parse(draftRaw);
      const idx2 = students.findIndex(s=>s.id===id);
      if(idx2>=0){
        // Se draft == dado salvo, é stale — descarta silenciosamente
        if(JSON.stringify(draft) === JSON.stringify(students[idx2])){
          try{ localStorage.removeItem(draftKey); }catch(e){}
        } else {
          // Merge draft over saved student
          students[idx2] = draft;
          // Show recovery modal after short delay (let UI render first)
          setTimeout(()=>{
            if(window._skipDraftModal){ window._skipDraftModal=false; _formDirty=true; return; }
            _showDraftRecoveryModal(id, draftKey);
          }, 300);
        }
      }
    }
  }catch(e){}
  // Hide all screens, show student-view
  NAV_SCREENS.forEach(sid=>{ const el=$(sid); if(el) el.classList.add('hidden'); });
  NAV_ITEMS.forEach(nid=>{ const el=$(nid); if(el) el.classList.remove('active'); });
  const sv=$('student-view');
  sv.classList.remove('hidden');
  sv.style.display='flex';
  loadStudentData(getActive());
  switchTabForcado('perfil');
  // Update sidebar nav active
  const nav=$('nav-alunos'); if(nav) nav.classList.add('active');
  renderStudentList();
}

function loadStudentData(s){
  _loadingData = true;
  const p=s.perfil, a=s.anamnese, pr=getUltimoTreino(s);

  // Perfil
  setVal('p-nome', p.nome||'');
  setVal('p-nascimento', p.nascimento||'');
  setVal('p-sexo', p.sexo||'');
  setVal('p-profissao', p.profissao||'');
  setVal('p-whatsapp', p.whatsapp||'');
  setVal('p-modalidade', p.modalidade||'');
  setVal('p-cod-aluno-legado', p.codAlunoLegado||'');
  setVal('p-email', p.email||'');
  setVal('p-cpf', typeof cpfFormatado==='function' ? cpfFormatado(p.cpf) : (p.cpf||''));
  const _cpfMsg = $('p-cpf-msg'); if(_cpfMsg) _cpfMsg.classList.add('hidden');
  setVal('p-liberacao', p.liberacao||'');
  if(typeof renderPortalStatusBadge==='function') renderPortalStatusBadge(s);
  if(typeof aplicarEstadoTransferencia==='function') aplicarEstadoTransferencia(s);
  carregarCondicoes(p.condicoes||'');
  carregarMedicamentos(p.medicamentos||'');
  const medDet = document.getElementById('p-medicamentos-detalhe');
  if(medDet) medDet.value = p.medicamentos_detalhe||'';
  carregarLesoes(p.lesoes||'');
  setVal('p-obs-clinicas', p.obs_clinicas||'');
  calcIdade();
  toggleFeminino();

  // Anamnese — campos base
  const anaBase = ['nivel','tempo','consistencia',
   'frequencia','duracao','horario','local',
   'gosta','preferencias','cirurgias',
   'lesoes_passadas','gestacao'];
  anaBase.forEach(k=>{ setVal('a-'+k.replace(/_/g,'-'), a[k]||''); });
  // Objetivos — backward compat: converte texto antigo para code
  const _OBJ_TEXT2CODE = {'Hipertrofia':'Hip','Emagrecimento':'Emagr','Força':'Forca','Saúde':'Saude','Reabilitação':'Reab',
    'Composição Corporal':'Comp','Resistência Muscular':'Resist','Cond. Cardiorrespiratório':'CardioR',
    'Funcional / Mobilidade':'Func','Performance Esportiva':'Esport','Envelhecimento Ativo':'Envelhec'};
  const _efCode = _OBJ_TEXT2CODE[a.objetivo_ef] || a.objetivo_ef || '';
  const _secCode = _OBJ_TEXT2CODE[a.objetivo_sec] || a.objetivo_sec || '';
  _initObjetivoAnamnese(_efCode, _secCode);
  _populateLocalSelect(a.local||'');
  carregarSintomas(a.sintomas||'');
  _exPickerLoad(a.gosta_ex||'', a.evitar_ex||'');
  renderTextoAlunoExercicios(a);

  // Antropométrica
  const anaAntro = ['peso','altura','gordura','mgorda','mmuscular','mmuscular-pct','osso','osso-pct','residual','residual-pct',
   'cintura','quadril','abdomen','ombro','data-avaliacao',
   'braco-d','braco-e','braco-d-cont','braco-e-cont',
   'coxa-d','coxa-e','pant-d','pant-e'];
  anaAntro.forEach(k=>{ setVal('a-'+k, a[k.replace(/-/g,'_')]||''); });
  setVal('a-obs-antro', a.obs_antro||'');
  calcIMC(); calcRCQ(); calcComp();
  renderMeta();
  Object.keys(PARES_ASSIM).forEach(par=>calcAssimetria(par));
  // Avaliações antropométricas salvas (histórico) — garante array e volta pra tela de lista
  if(!s.avaliacoesAntro) s.avaliacoesAntro = [];
  _antroEditId = null;
  antroMostrarLista();

  // Funcional — FMS
  renderFMSRows();
  const fmsIds = ['ohsa','slsq','hurdle','lunge','shoulder','aslr','rotary'];
  fmsIds.forEach(k=>{
    setVal('fms-'+k, a['fms_'+k]||'');
    carregarFMSFlags(k, a['fms_'+k+'_flag']||'');
  });
  setVal('fms-push', a.fms_push||''); setVal('fms-pull', a.fms_pull||'');
  setVal('a-prancha', a.prancha||'');
  setVal('a-prancha-lat-d', a.prancha_lat_d||'');
  setVal('a-prancha-lat-e', a.prancha_lat_e||'');
  setVal('a-equilibrio-d', a.equilibrio_d||'');
  setVal('a-equilibrio-e', a.equilibrio_e||'');
  setVal('a-tug', a.tug||''); setVal('a-sentar-levantar', a.sentar_levantar||'');
  setVal('a-obs-func', a.obs_func||'');
  calcFMSScore(); calcPranchaLat(); calcEquilibrio();

  // Força
  setVal('a-formula-1rm', a.formula_1rm||'brzycki');
  setVal('a-obs-forca', a.obs_forca||'');
  setVal('a-data-forca', a.data_forca||'');
  if(a.forca){
    a.forca.forEach((f,i)=>{
      const cs=document.querySelectorAll('.forca-carga');
      const rs=document.querySelectorAll('.forca-reps');
      const es=document.querySelectorAll('.forca-ex');
      if(es[i]&&f.ex) es[i].value=f.ex;
      if(cs[i]) cs[i].value=f.carga||'';
      if(rs[i]) rs[i].value=f.reps||'';
      if(f.carga&&f.reps) calc1RM(i);
    });
  }
  // Resistência
  const anaResist=['cooper','step-fc','flexao','abdominal-reps','squat-reps','grip-d','grip-e','obs-resist'];
  anaResist.forEach(k=>{ setVal('a-'+k, a[k.replace(/-/g,'_')]||''); });
  const fmod=document.getElementById('a-flexao-modificada');
  if(fmod) fmod.checked=a.flexao_modificada||false;
  calcVO2(); calcVO2Step(); calcStepClass(); calcPushupClass(); calcYMCAClass(); calcGripClass(); calcSquatClass();

  // Flexibilidade
  const sfEl=document.getElementById('a-sentar-alcançar');
  if(sfEl) sfEl.value=a.sentar_alcancar||'';
  setVal('a-sitreach-proto', a.sitreach_proto||'YMCA/ACSM');
  const warmEl=document.getElementById('a-sitreach-warmup');
  if(warmEl) warmEl.checked=a.sitreach_warmup||false;
  ['isquio-d','isquio-e','iliopsoas-d','iliopsoas-e',
   'dorsiflexao-d','dorsiflexao-e','mob-toracica-d','mob-toracica-e',
   'ombro-flex-d','ombro-flex-e','quadril-rot-d','quadril-rot-e'].forEach(k=>{
    setVal('a-'+k, a[k.replace(/-/g,'_')]||'');
  });
  setVal('a-obs-flex', a.obs_flex||'');
  renderGoniometria();
  carregarGoniometria(a);
  calcSitReach();
  calcFlexFlags();

  calcFCMax();
  switchSubtab('anamnese-hist');

  // Força (6RM)
  if(a.forca){
    a.forca.forEach((f,i)=>{
      const cs = document.querySelectorAll('.forca-carga');
      const rs = document.querySelectorAll('.forca-reps');
      if(cs[i]) cs[i].value = f.carga||'';
      if(rs[i]) rs[i].value = f.reps||'';
      if(f.carga&&f.reps) calc1RM(i);
    });
  }

  // Prescrição — abre na lista de treinos (js/treinos-store.js), não mais
  // direto num wizard único. selectedObj/pr-* só são preenchidos quando o
  // personal abre um treino específico (treinosContinuarRascunho/treinosAbrirAprovado).
  selectedObj = pr.objetivo||'';
  renderObjGrid();
  if(typeof treinosMostrarLista==='function') treinosMostrarLista();

  updateHeader(s);

  setTimeout(()=>{ _loadingData = false; _formDirty = false; }, 150);
}

// ─── HEADER ───────────────────────────────────────────────────────────────────

function updateHeader(s){
  const p=s.perfil, a=s.anamnese, pr=getUltimoTreino(s);
  $('student-header-name').textContent = p.nome||'Aluno';
  let b='';
  if(p.sexo) b+=`<span class="badge badge-blue">${escHTML(p.sexo)}</span>`;
  if(a.nivel) b+=`<span class="badge badge-amber">${escHTML(a.nivel)}</span>`;
  if(pr.objetivo) b+=`<span class="badge badge-green">${escHTML(pr.objetivo)}</span>`;
  if(pr.aprovado) b+=`<span class="badge badge-green"><i class=ph-check></i> Prescrito</span>`;
  $('student-badges').innerHTML = b;
}

// ─── CAMPOS AUSENTES DA TELA ─────────────────────────────────────────────────
// _v/_c leem o input; se ele não existe mais na tela devolvem _AUSENTE, e
// onPerfilChange/onAnamneseChange mantêm o valor já salvo (dado legado fica
// no arquivo do aluno, mas não aparece e não é gerado de novo).
const _AUSENTE = Symbol('campo-ausente');
function _v(id){ const el=document.getElementById(id); return el ? el.value : _AUSENTE; }
function _c(id){ const el=document.getElementById(id); return el ? !!el.checked : _AUSENTE; }

// ─── NÍVEL DE TREINAMENTO — fórmula objetiva ─────────────────────────────────
// Faixa pelo tempo de treino contínuo atual:
//   < 6 meses          → Iniciante
//   6 meses a 2 anos   → Intermediário
//   2 anos ou mais     → Avançado
// Consistência "irregular" rebaixa um nível (Avançado→Intermediário,
// Intermediário→Iniciante). Regular/Alta (ou não informada) mantém.
// Sem tempo informado → '' (não calcula). Mesma fórmula na Edge Function
// supabase/functions/_shared/students.ts — mudar nos dois lugares.
const _NIVEL_POR_TEMPO = {
  'Menos de 1 mês':0, '1–3 meses':0, '3–6 meses':0,
  '6–12 meses':1, '1–2 anos':1,
  '2–4 anos':2, 'Mais de 4 anos':2,
};
function calcularNivelTreino(tempo, consistencia){
  if(!(tempo in _NIVEL_POR_TEMPO)) return '';
  let n = _NIVEL_POR_TEMPO[tempo];
  if(consistencia === 'irregular') n = Math.max(0, n-1);
  return ['Inic','Inte','Avan'][n];
}

// ─── NORMALIZAÇÃO DE DADOS VINDOS DO PORTAL DO ALUNO ─────────────────────────
// Corrige no carregamento o que versões anteriores da aluno-api gravaram
// fora do lugar. Idempotente — pode rodar a cada abertura.
//  1. Saúde (condições, medicamentos, lesões, obs.) ia pra s.anamnese; painel,
//     alertas e motor leem s.perfil.
//  2. Avaliação do Portal gravava Gordura (%) na chave mgorda (kg).
//  3. Nível calculado de tempo + consistência.
const _CAMPOS_SAUDE_PERFIL = ['condicoes','medicamentos','medicamentos_detalhe','lesoes','obs_clinicas','liberacao'];
function normalizarAlunoPortal(s){
  if(!s || typeof s!=='object') return;
  s.perfil = s.perfil || {}; s.anamnese = s.anamnese || {};
  const p = s.perfil, a = s.anamnese;
  _CAMPOS_SAUDE_PERFIL.forEach(k=>{
    if(a[k] && !p[k]){ p[k] = a[k]; delete a[k]; }
  });
  const nivel = calcularNivelTreino(a.tempo, a.consistencia);
  if(nivel) a.nivel = nivel;
  (s.avaliacoesAntro||[]).forEach(r=>{
    if(r.responsavel!=='Portal do aluno') return;
    const peso = parseFloat(r.peso);
    if(r.mgorda && !r.gordura && peso){
      const pct = parseFloat(r.mgorda);
      r.gordura = String(pct);
      r.mgorda = (Math.round(peso*pct/10)/10).toFixed(1);
    }
    if(r.mmuscular && !r.mmuscular_pct && peso) r.mmuscular_pct = (Math.round(parseFloat(r.mmuscular)/peso*1000)/10).toFixed(1);
    const alt = parseFloat(r.altura);
    if(!r.imc && peso && alt) r.imc = (peso/Math.pow(alt/100,2)).toFixed(1);
  });
}
function normalizarAlunosPortal(lista){ (lista||[]).forEach(normalizarAlunoPortal); }

// Última avaliação antropométrica com peso+altura (histórico, inclui as
// enviadas pelo aluno). Usada pela Meta como "última avaliação".
function ultimaAvaliacaoAntro(s){
  return (s?.avaliacoesAntro||[])
    .filter(r=>parseFloat(r.peso) && parseFloat(r.altura))
    .sort((x,y)=>(y.data_avaliacao||'').localeCompare(x.data_avaliacao||''))[0] || null;
}

// ─── PERFIL CHANGE ────────────────────────────────────────────────────────────

function onPerfilChange(){
  const s=getActive(); if(!s)return;
  sincronizarCondicoes();
  sincronizarMedicamentos();
  sincronizarLesoes();
  const _antesP = s.perfil || {};
  const _novoP = {
    nome:_v('p-nome'), nascimento:_v('p-nascimento'), sexo:_v('p-sexo'),
    atividade:_v('p-atividade'), profissao:_v('p-profissao'),
    tempo_sentado:_v('p-tempo-sentado'),
    whatsapp:_v('p-whatsapp'), modalidade:_v('p-modalidade'),
    codAlunoLegado:_v('p-cod-aluno-legado'),
    email:_v('p-email'),
    cpf: (()=>{ const c=_v('p-cpf'); return c===_AUSENTE ? c : String(c).replace(/\D/g,'').slice(0,11); })(),
    liberacao:_v('p-liberacao'), condicoes:_v('p-condicoes'),
    medicamentos:_v('p-medicamentos'),
    medicamentos_detalhe:_v('p-medicamentos-detalhe'),
    lesoes:_v('p-lesoes'),
    obs_clinicas:_v('p-obs-clinicas'),
    menstrual:_v('p-menstrual'), contraceptivo:_v('p-contraceptivo'),
    // Portal do Aluno (Fase 4) — sem input no formulário de Perfil, vêm da
    // Edge Function aluno-api (aluno logando/gravando) ou de ações próprias
    // (js/onboarding-personal.js). Sem preservar aqui, esta função apaga
    // esses campos a cada "Salvar Perfil" — ela reconstrói s.perfil do zero
    // a partir só dos campos do form.
    alunoUserId: s.perfil.alunoUserId,
    portalStatus: s.perfil.portalStatus,
    novoCadastro: s.perfil.novoCadastro,
    onboardingConcluido: s.perfil.onboardingConcluido,
    onboardingConcluidoEm: s.perfil.onboardingConcluidoEm,
  };
  Object.keys(_novoP).forEach(k=>{
    if(_novoP[k] !== _AUSENTE) return;
    if(k in _antesP) _novoP[k] = _antesP[k]; else delete _novoP[k];
  });
  s.perfil = { ..._antesP, ..._novoP };

  $('student-header-name').textContent = s.perfil.nome||'Aluno';
  calcFCMax();
  renderStudentList();
  if(!_loadingData){ _markDirty(); _saveDraft(); }
}

// ── Flexibilidade ─────────────────────────────────────────────────────────────

const GONIO_BLOCOS = [
  { titulo:'Ombro', campos:[
    ['a-gon-ombro-flex','Flexão (0–180°)'],['a-gon-ombro-ext','Extensão (0–60°)'],
    ['a-gon-ombro-abd','Abdução (0–180°)'],['a-gon-ombro-ri','Rot. interna (0–70°)'],
    ['a-gon-ombro-re','Rot. externa (0–90°)'],
  ]},
  { titulo:'Quadril', campos:[
    ['a-gon-quadril-flex','Flexão (0–120°)'],['a-gon-quadril-ext','Extensão (0–30°)'],
    ['a-gon-quadril-abd','Abdução (0–45°)'],['a-gon-quadril-ri','Rot. interna (0–45°)'],
    ['a-gon-quadril-re','Rot. externa (0–45°)'],
  ]},
  { titulo:'Joelho / Tornozelo', campos:[
    ['a-gon-joelho-flex','Joelho flexão (0–135°)'],
    ['a-gon-torn-dors','Dorsiflexão (0–20°)'],['a-gon-torn-plant','Flex. plantar (0–50°)'],
  ]},
  { titulo:'Coluna toracolombar', campos:[
    ['a-gon-col-flex','Flexão (0–80°)'],['a-gon-col-ext','Extensão (0–25°)'],
    ['a-gon-col-lat','Incl. lateral (0–35°)'],['a-gon-col-rot','Rotação (0–45°)'],
  ]},
];

const inpS='background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:3px 5px;font-size:12px;text-align:center;width:100%';

// Limites de validação AAOS por campo de goniometria (min, max aceitável)
const GONIO_LIMITS = {
  'a-gon-ombro-flex':{min:0,max:200},'a-gon-ombro-ext':{min:0,max:80},
  'a-gon-ombro-abd':{min:0,max:200},'a-gon-ombro-ri':{min:0,max:90},
  'a-gon-ombro-re':{min:0,max:110},
  'a-gon-quadril-flex':{min:0,max:140},'a-gon-quadril-ext':{min:0,max:50},
  'a-gon-quadril-abd':{min:0,max:60},'a-gon-quadril-ri':{min:0,max:60},
  'a-gon-quadril-re':{min:0,max:60},
  'a-gon-joelho-flex':{min:0,max:150},'a-gon-torn-dors':{min:-10,max:30},
  'a-gon-torn-plant':{min:0,max:65},
  'a-gon-col-flex':{min:0,max:90},'a-gon-col-ext':{min:0,max:35},
  'a-gon-col-lat':{min:0,max:45},'a-gon-col-rot':{min:0,max:55},
};

function validarGonio(inputEl, id){
  const v=parseFloat(inputEl.value);
  const lim=GONIO_LIMITS[id];
  if(!lim||isNaN(v)) return;
  const fora=v<lim.min||v>lim.max;
  inputEl.style.borderColor=fora?'var(--red-line)':'';
  inputEl.title=fora?`Valor fora do intervalo esperado (${lim.min}–${lim.max}°)`:'';
}

function renderGoniometria(){
  const g=$('gonio-grid'); if(!g||g.children.length>0) return;
  GONIO_BLOCOS.forEach(bloco=>{
    const div=document.createElement('div');
    div.style.cssText='background:var(--bg4);border:1px solid var(--border);border-radius:var(--radius);padding:10px 12px';
    let html=`<div style="font-size:12px;color:var(--accent);font-variant-numeric:tabular-nums;margin-bottom:8px">${escHTML(bloco.titulo)}</div>`;
    html+=`<div style="display:grid;grid-template-columns:1fr 55px 55px;gap:4px;font-size:12px;color:var(--text3);margin-bottom:4px"><span>Movimento</span><span style="text-align:center">D°</span><span style="text-align:center">E°</span></div>`;
    bloco.campos.forEach(([id,label])=>{
      html+=`<div style="display:grid;grid-template-columns:1fr 55px 55px;gap:4px;align-items:center;margin-bottom:4px">
        <span style="font-size:12px;color:var(--text2)">${label}</span>
        <input type="number" id="${id}-d" oninput="onAnamneseChange();validarGonio(this,'${id}')" placeholder="—" style="${inpS}">
        <input type="number" id="${id}-e" oninput="onAnamneseChange();validarGonio(this,'${id}')" placeholder="—" style="${inpS}">
      </div>`;
    });
    div.innerHTML=html;
    g.appendChild(div);
  });
}

function calcSitReach(){
  const v=parseFloat(val('a-sentar-alcançar'));
  const el=$('a-sitreach-class'); if(!el) return;
  if(isNaN(v)){ el.value=''; return; }
  const sexo=val('p-sexo')||'M';
  const nasc=val('p-nascimento');
  const idade=nasc?(new Date().getFullYear()-new Date(nasc).getFullYear()):30;
  const normsM=[[18,25,24,16,9,1],[26,35,23,15,7,0],[36,45,21,13,5,-1],[46,55,19,11,3,-2],[56,65,17,9,2,-3],[66,99,16,8,1,-3]];
  const normsF=[[18,25,30,22,15,7],[26,35,29,21,13,5],[36,45,27,18,10,2],[46,55,25,16,8,0],[56,65,23,14,7,-1],[66,99,22,13,6,-2]];
  const norms=sexo==='F'?normsF:normsM;
  const row=norms.find(n=>idade>=n[0]&&idade<=n[1])||norms[0];
  const labels=['Excelente','Bom','Médio','Abaixo da média','Fraco'];
  const warmup=document.getElementById('a-sitreach-warmup')?.checked;
  const nota=warmup?' (c/ aquecimento)':'';
  for(let i=0;i<4;i++){ if(v>=row[i+2]){ el.value=labels[i]+nota; return; } }
  el.value='Fraco'+nota;
}

const FLEX_FLAGS_MAP = {
  isquio:{
    ids:['a-isquio-d','a-isquio-e'], flagId:'flag-isquio',
    msgs:{ Moderado:'→ Adaptar terra/stiff; evitar agachamento profundo sem mobilização prévia', Acentuado:'→ Evitar terra convencional; priorizar leg curl e variações com menor exigência de isquio', Dor:'→ Encaminhar FT antes de prescrever cadeia posterior' },
  },
  iliopsoas:{
    ids:['a-iliopsoas-d','a-iliopsoas-e'], flagId:'flag-iliopsoas',
    msgs:{ Moderado:'→ Incluir mobilização de flexores de quadril; cuidado com agachamento frontal', Acentuado:'→ Evitar agachamento frontal com barra; incluir extensão de quadril corretiva', Dor:'→ Encaminhar FT' },
  },
  dorsiflexao:{
    ids:['a-dorsiflexao-d','a-dorsiflexao-e'], flagId:'flag-dorsiflexao',
    msgs:{ Moderado:'→ Usar salto elevado no agachamento; evitar profundidade máxima', Acentuado:'→ Evitar agachamento profundo; usar box squat ou leg press', Dor:'→ Encaminhar FT' },
  },
  toracica:{
    ids:['a-mob-toracica-d','a-mob-toracica-e'], flagId:'flag-toracica',
    msgs:{ Moderado:'→ Adaptar overhead press; incluir mobilização torácica no aquecimento', Acentuado:'→ Evitar press acima da cabeça; priorizar desenvolvimento sentado com suporte', Dor:'→ Encaminhar FT' },
  },
  ombro:{
    ids:['a-ombro-flex-d','a-ombro-flex-e'], flagId:'flag-ombro',
    msgs:{ Moderado:'→ Adaptar pull-up e press; verificar lado mais limitado', Acentuado:'→ Evitar movimentos overhead no lado afetado; incluir mobilização de rotação externa', Dor:'→ Encaminhar FT antes de prescrever MMSS' },
  },
  'quadril-rot':{
    ids:['a-quadril-rot-d','a-quadril-rot-e'], flagId:'flag-quadril-rot',
    msgs:{ 'Rot.int. limitada':'→ Cautela em agachamento profundo; avaliar mobilização de rot. interna', 'Rot.ext. limitada':'→ Cautela em terra sumo e exercícios com pés abduzidos', 'Ambas limitadas':'→ Adaptar padrões de agachamento e terra; encaminhar FT para avaliação de quadril', Dor:'→ Encaminhar FT' },
  },
};

function calcFlexFlags(){
  const todosFlags=[];
  Object.entries(FLEX_FLAGS_MAP).forEach(([key,cfg])=>{
    const vals=cfg.ids.map(id=>document.getElementById(id)?.value||'');
    const pior=[...vals].sort((a,b)=>{
      const ord=['','Normal','Negativo','Leve','Moderado','Rot.int. limitada','Rot.ext. limitada','Ambas limitadas','Acentuado','Dor'];
      return ord.indexOf(b)-ord.indexOf(a);
    })[0];
    const flagEl=$(cfg.flagId);
    let msg='';
    if(pior && pior!=='Normal' && pior!=='Negativo' && pior!==''){
      msg=cfg.msgs[pior]||'→ Avaliar antes de prescrever o padrão';
      if(flagEl){ flagEl.textContent=msg; flagEl.style.color=pior==='Dor'?'var(--red)':'var(--text2)'; }
      todosFlags.push(msg);
    } else if(flagEl){ flagEl.textContent='—'; flagEl.style.color='var(--text3)'; }
  });
  const box=$('flex-flags'), txt=$('flex-flags-texto');
  if(box&&txt){ if(todosFlags.length){ box.style.display='block'; txt.innerHTML=[...new Set(todosFlags)].join('<br>'); } else box.style.display='none'; }
}

function carregarGoniometria(a){
  GONIO_BLOCOS.forEach(bloco=>{
    bloco.campos.forEach(([id])=>{
      const kd=id.replace(/-/g,'_')+'_d', ke=id.replace(/-/g,'_')+'_e';
      const ed=document.getElementById(id+'-d'), ee=document.getElementById(id+'-e');
      if(ed) ed.value=a[kd]||'';
      if(ee) ee.value=a[ke]||'';
    });
  });
}

function salvarGoniometria(obj){
  GONIO_BLOCOS.forEach(bloco=>{
    bloco.campos.forEach(([id])=>{
      const kd=id.replace(/-/g,'_')+'_d', ke=id.replace(/-/g,'_')+'_e';
      obj[kd]=val(id+'-d'); obj[ke]=val(id+'-e');
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// MOTOR DE TRIAGEM CLÍNICA
// ══════════════════════════════════════════════════════════════════════════════

const TRIAGEM_REGRAS = [
  // ── BLOQUEIOS ──────────────────────────────────────────────────────────────
  { tipo:'bloqueio', id:'sem-liberacao', icone:'<i class=ph-prohibit></i>',
    label:'Sem liberação médica para exercício',
    detalhe:'Aguardar liberação antes de prescrever. Registrar clearance no Perfil quando recebido.',
    condicao:(p)=>p.liberacao==='nao',
  },
  { tipo:'bloqueio', id:'sintomas-esforco', icone:'<i class=ph-prohibit></i>',
    label:'Sintomas de alerta ao esforço físico',
    detalhe:'Aluno relatou dor no peito, tontura, falta de ar, palpitações ou desmaio ao esforço. Exigir avaliação médica antes de prescrever.',
    condicao:(p,a)=>!!(a.sintomas && a.sintomas.split(' | ').some(v=>v && v!=='Nenhum')),
  },
  { tipo:'bloqueio', id:'dor-fms', icone:'<i class=ph-prohibit></i>',
    label:'Dor detectada em teste FMS (score 0)',
    detalhe:'Um ou mais padrões geraram dor. Encaminhar ao Fisioterapeuta antes de prescrever os padrões afetados.',
    condicao:(p,a)=>['fms_ohsa','fms_slsq','fms_hurdle','fms_lunge','fms_shoulder','fms_aslr','fms_rotary'].some(k=>a[k]==='0'),
  },
  { tipo:'bloqueio', id:'dor-flag-fms', icone:'<i class=ph-prohibit></i>',
    label:'Dor relatada em flag de movimento (FMS)',
    detalhe:'Compensação com dor registrada. Encaminhar ao Fisioterapeuta e evitar o padrão afetado.',
    condicao:(p,a)=>['fms_ohsa_flag','fms_slsq_flag','fms_hurdle_flag','fms_lunge_flag','fms_shoulder_flag','fms_aslr_flag','fms_rotary_flag'].some(k=>(a[k]||'').includes('Dor')),
  },
  { tipo:'bloqueio', id:'gestacao-sem-clearance', icone:'<i class=ph-prohibit></i>',
    label:'Gestante — protocolo específico obrigatório',
    detalhe:'Treino gestacional exige clearance obstétrico. Usar modelo LP adaptado. Evitar Valsalva, decúbito dorsal prolongado (2º/3º trimestre) e impacto alto.',
    condicao:(p,a)=>a.gestacao==='Gestante',
  },

  // ── ALERTAS ────────────────────────────────────────────────────────────────
  { tipo:'alerta', id:'hipertensao', icone:'<i class=ph-warning></i>',
    label:'Hipertensão arterial — FC-alvo afetada',
    detalhe:'Betabloqueadores reduzem a FC. Não usar FCmáx estimada como referência absoluta. Usar RPE. Monitorar pressão pré e pós-treino. Evitar Valsalva e isometria de alta intensidade.',
    condicao:(p)=>(p.condicoes||'').includes('Hipertensão'),
  },
  { tipo:'alerta', id:'antihipertensivo', icone:'<i class=ph-warning></i>',
    label:'Anti-hipertensivo em uso — FC-alvo não confiável',
    detalhe:'Betabloqueadores suprimem a resposta cronotrópica. Usar RPE (Borg) no lugar de % FCmáx como referência de intensidade.',
    condicao:(p)=>(p.medicamentos||'').includes('Anti-hipertensivos'),
  },
  { tipo:'alerta', id:'diabetes', icone:'<i class=ph-warning></i>',
    label:'Diabetes / hipoglicemiante — monitorar glicemia',
    detalhe:'Risco de hipoglicemia durante e após o treino. Verificar glicemia pré-treino. Ter fonte de carboidrato disponível. Ajustar horário da dose com o médico.',
    condicao:(p)=>(p.condicoes||'').includes('Diabetes')||(p.medicamentos||'').includes('Hipoglicemiantes')||(p.medicamentos||'').includes('Insulina'),
  },
  { tipo:'alerta', id:'cardiopatia', icone:'<i class=ph-warning></i>',
    label:'Cardiopatia — progressão conservadora obrigatória',
    detalhe:'Intensidade inicial baixa (RPE ≤5). Progressão semanal máxima de 5%. Monitorar sintomas (dor torácica, dispneia, tontura). Treino supervisionado obrigatório.',
    condicao:(p)=>(p.condicoes||'').includes('Cardiopatia'),
  },
  { tipo:'alerta', id:'corticoide', icone:'<i class=ph-warning></i>',
    label:'Corticosteroide em uso — catabolismo muscular',
    detalhe:'Corticoides sistêmicos aumentam catabolismo e retêm líquido. Volume semanal no limite inferior da MAV. Proteína dietética elevada (acionar NUT).',
    condicao:(p)=>(p.medicamentos||'').includes('Corticosteróides'),
  },
  { tipo:'alerta', id:'anticoagulante', icone:'<i class=ph-warning></i>',
    label:'Anticoagulante em uso — evitar risco de trauma',
    detalhe:'Evitar exercícios com alto risco de queda, colisão ou trauma. Progressão de carga conservadora. Supervisão direta em exercícios com barra livre.',
    condicao:(p)=>(p.medicamentos||'').includes('Anticoagulantes'),
  },
  { tipo:'alerta', id:'obesidade', icone:'<i class=ph-warning></i>',
    label:'IMC ≥ 30 — preferência por baixo impacto',
    detalhe:'Reduzir exercícios de alto impacto (corrida, saltos) no início. Priorizar cadeia fechada com controle de amplitude. Atenção a joelhos e tornozelos.',
    condicao:(p,a)=>{
      const peso=parseFloat(a.peso), alt=parseFloat(a.altura);
      if(!peso||!alt) return false;
      return peso/Math.pow(alt/100,2)>=30;
    },
  },
  { tipo:'alerta', id:'fms-risco', icone:'<i class=ph-warning></i>',
    label:'Score FMS ≤ 13 — fase corretiva recomendada',
    detalhe:'Score abaixo de 14 indica risco elevado de lesão (Cook et al. 2014). Recomendado: 2–4 semanas de fase corretiva com foco funcional antes de métodos avançados.',
    condicao:(p,a)=>{
      const ids=['fms_ohsa','fms_slsq','fms_hurdle','fms_lunge','fms_shoulder','fms_aslr','fms_rotary'];
      const scores=ids.map(k=>parseInt(a[k])||0);
      const validos=scores.filter(v=>v>0);
      if(validos.length<4) return false;
      return scores.reduce((s,v)=>s+v,0)<=13;
    },
  },
  { tipo:'alerta', id:'lesao-lombar', icone:'<i class=ph-warning></i>',
    label:'Lesão / dor lombar ativa',
    detalhe:'Evitar terra convencional, agachamento com barra e bom morning. Priorizar variações com suporte lombar e cadeia aberta. Consultar FT se dor persistente.',
    condicao:(p)=>(p.lesoes||'').includes('Lombar'),
  },
  { tipo:'alerta', id:'lesao-joelho', icone:'<i class=ph-warning></i>',
    label:'Lesão / dor em joelho ativo',
    detalhe:'Controlar amplitude em agachamento e leg press. Evitar impacto e cargas axiais pesadas. Priorizar cadeia aberta com progressão gradual.',
    condicao:(p)=>(p.lesoes||'').includes('Joelho'),
  },
  { tipo:'alerta', id:'lesao-ombro', icone:'<i class=ph-warning></i>',
    label:'Lesão / dor em ombro ativo',
    detalhe:'Evitar press acima da cabeça e puxada pronada ampla no lado afetado. Priorizar pegada neutra e amplitudes controladas. Consultar FT para clearance.',
    condicao:(p)=>(p.lesoes||'').includes('Ombro'),
  },
  { tipo:'alerta', id:'encurtamento-isquio', icone:'<i class=ph-warning></i>',
    label:'Encurtamento de isquiotibiais — terra convencional contraindicado',
    detalhe:'Substituir terra convencional por terra romeno ou stiff com halteres. Incluir mobilização de isquiotibiais no aquecimento.',
    condicao:(p,a)=>['Moderado','Acentuado'].some(v=>(a.isquio_d||'').includes(v)||(a.isquio_e||'').includes(v)),
  },
  { tipo:'alerta', id:'valgo-joelho', icone:'<i class=ph-warning></i>',
    label:'Valgo de joelho no FMS — agachamento com restrição',
    detalhe:'Evitar agachamento livre profundo no início. Priorizar box squat, leg press com controle e fortalecimento de glúteo médio e abdutores.',
    condicao:(p,a)=>(a.fms_slsq_flag||'').includes('Valgo')||(a.fms_ohsa_flag||'').includes('Valgo'),
  },
  { tipo:'alerta', id:'ombro-limitado', icone:'<i class=ph-warning></i>',
    label:'Mobilidade de ombro limitada (FMS)',
    detalhe:'Evitar press acima da cabeça no lado afetado. Trabalhar mobilização de rotação externa e torácica. Substituir desenvolvimento por variações neutras.',
    condicao:(p,a)=>['Limitação D','Limitação E','Limitação bilateral'].some(v=>(a.fms_shoulder_flag||'').includes(v)),
  },
  { tipo:'alerta', id:'pos-parto', icone:'<i class=ph-warning></i>',
    label:'Pós-parto (< 6 meses) — restrições específicas',
    detalhe:'Clearance médico recomendado. Atenção a diástase abdominal — evitar crunch e exercícios com aumento de pressão intra-abdominal. Progressão lenta.',
    condicao:(p,a)=>a.gestacao==='Pós-parto',
  },
  { tipo:'alerta', id:'envelhec', icone:'<i class=ph-warning></i>',
    label:'Faixa etária 50+ — ajustes de volume e intervalos',
    detalhe:'Iniciar no MEV. Intervalos no limite superior da faixa. Progressão de carga conservadora (< 5%/semana). Priorizar força e equilíbrio.',
    condicao:(p)=>{
      if(!p.nascimento) return false;
      return (new Date().getFullYear()-new Date(p.nascimento).getFullYear())>=50;
    },
  },

  // ── CONTEXTO ───────────────────────────────────────────────────────────────
  { tipo:'contexto', id:'objetivo-sec', icone:'<i class=ph-info></i>',
    label:'', labelFn:(p,a)=>`Objetivo secundário: ${a.objetivo_sec}`,
    detalhe:'Registrado na Avaliação — pode orientar seleção de exercícios complementares.',
    condicao:(p,a)=>!!(a.objetivo_sec&&a.objetivo_sec!=='Nenhum'),
  },
  { tipo:'contexto', id:'assimetria-circunf', icone:'<i class=ph-info></i>',
    label:'Assimetria de circunferência — priorizar unilateral',
    detalhe:'Diferença ≥ 1 cm entre membros D e E. Priorizar exercícios unilaterais ou com cargas independentes para equalizar.',
    condicao:(p,a)=>[['braco_d','braco_e'],['coxa_d','coxa_e'],['pant_d','pant_e']].some(([d,e])=>{
      const vd=parseFloat(a[d]),ve=parseFloat(a[e]); return vd&&ve&&Math.abs(vd-ve)>=1;
    }),
  },
  { tipo:'contexto', id:'assimetria-equilibrio', icone:'<i class=ph-info></i>',
    label:'Assimetria de equilíbrio (Δ ≥ 3s) — incluir estabilização unilateral',
    detalhe:'Diferença entre equilíbrio unipodal D e E. Incluir exercícios de estabilização pelo lado mais fraco.',
    condicao:(p,a)=>{ const d=parseFloat(a.equilibrio_d),e=parseFloat(a.equilibrio_e); return d&&e&&Math.abs(d-e)>=3; },
  },
  { tipo:'contexto', id:'assimetria-prancha', icone:'<i class=ph-info></i>',
    label:'Assimetria de prancha lateral (Δ > 10%) — incluir core antirotacional',
    detalhe:'Diferença de resistência de core lateral. Priorizar exercícios antirotacionais unilaterais.',
    condicao:(p,a)=>{ const d=parseFloat(a.prancha_lat_d),e=parseFloat(a.prancha_lat_e); return d&&e&&(Math.abs(d-e)/Math.max(d,e))>0.10; },
  },
  { tipo:'contexto', id:'assimetria-grip', icone:'<i class=ph-info></i>',
    label:'Assimetria de preensão (Δ ≥ 2 kg) — priorizar unilateral MMSS',
    detalhe:'Diferença de força de preensão entre mãos. Priorizar exercícios unilaterais de membros superiores.',
    condicao:(p,a)=>{ const d=parseFloat(a.grip_d),e=parseFloat(a.grip_e); return d&&e&&Math.abs(d-e)>=2; },
  },
  { tipo:'contexto', id:'tireoide', icone:'<i class=ph-info></i>',
    label:'Hipotireoidismo — metabolismo basal reduzido',
    detalhe:'Pode impactar resposta ao emagrecimento e recuperação. Acionar NUT para ajuste calórico. Progressão de volume mais gradual.',
    condicao:(p)=>(p.condicoes||'').includes('Hipotireoidismo'),
  },
  { tipo:'contexto', id:'sop', icone:'<i class=ph-info></i>',
    label:'SOP — benefício especial do treino de força',
    detalhe:'Responde bem ao treino de resistência (melhora da sensibilidade à insulina). Priorizar força composta. Acionar NUT.',
    condicao:(p)=>(p.condicoes||'').includes('SOP'),
  },
  { tipo:'contexto', id:'fibromialgia', icone:'<i class=ph-info></i>',
    label:'Fibromialgia — progressão muito gradual',
    detalhe:'Iniciar com volumes baixos (MEV). Evitar métodos de alta intensidade metabólica. Monitorar DOMS cuidadosamente.',
    condicao:(p)=>(p.condicoes||'').includes('Fibromialgia'),
  },
  { tipo:'contexto', id:'nut-recomendado', icone:'<i class=ph-info></i>',
    label:'Objetivo requer suporte nutricional — acionar NUT',
    detalhe:'Objetivos de emagrecimento e recomposição dependem criticamente do balanço calórico. Prescrição de treino sem conduta nutricional tem eficácia reduzida.',
    condicao:(p,a)=>['Emagrecimento','Composição corporal'].includes(a.objetivo_ef),
  },
  { tipo:'contexto', id:'vo2-baixo', icone:'<i class=ph-info></i>',
    label:'VO₂máx abaixo da média — incluir cardio como componente',
    detalhe:'Condicionamento cardiorrespiratório limitado. Considerar 1–2 sessões de cardio moderado por semana além do treino de força.',
    condicao:(p,a)=>{
      if(!a.cooper) return false;
      const vo2=(parseFloat(a.cooper)-504.9)/44.73;
      const sexo=p.sexo||'M';
      const idade=p.nascimento?(new Date().getFullYear()-new Date(p.nascimento).getFullYear()):30;
      const limF=[[18,35,29],[36,55,23],[56,99,17]];
      const limM=[[18,35,33],[36,55,28],[56,99,20]];
      const lim=sexo==='F'?limF:limM;
      const row=lim.find(n=>idade>=n[0]&&idade<=n[1]);
      return row?vo2<row[2]:false;
    },
  },
];

let _triagemAberta = false;

function toggleTriagemDetalhe(){
  _triagemAberta=!_triagemAberta;
  const det=$('triagem-detalhe'), btn=$('triagem-toggle-btn');
  if(det) det.style.display=_triagemAberta?'flex':'none';
  if(btn) btn.innerHTML=_triagemAberta?'fechar <i class=ph-caret-up></i>':'ver detalhes <i class=ph-caret-down></i>';
}

// ══════════════════════════════════════════════════════════════════════════════
// CAMADA 3 — FILTRO DE EXERCÍCIOS POR FLAGS CLÍNICAS
// Lê flags da avaliação → classifica cada exercício como
//   'ok' | 'prioritario' | 'bloqueado'
// ══════════════════════════════════════════════════════════════════════════════

// Utilitário: exercício tem essa indicação/contraindicação na lista (`ind`/`ci`
// agora são arrays de {id,nome} — reimportação de 2026-08-28).
const _temCi = (e, chave) => (e.ci||[]).some(c => c.chave === chave);

// Mapa: flag clínica → exercícios bloqueados por critério
// 'ci' = usa campo ci (lista, direto da planilha) | 'pad' = padrão de movimento (id/nome oficial da planilha)
// CHAVES DE FLAG CLINICA — identificadores internos (ASCII, sem acento, sem
// espaco). Nunca sao exibidos: quem aparece na tela e `motivo`. Produzidos por
// extrairFlagsClinicas() e consumidos por FLAGS_FILTRO / FLAGS_PRIORIDADE /
// FLAGS_TIPO_CADEIA — os tres precisam usar exatamente a mesma grafia.
const FLAGS_FILTRO = {
  // Lesões ativas
  'DoresNosJoelhos': {
    bloqueio: e => _temCi(e, 'DoresNosJoelhos'),
    motivo: 'Contraindicado: dor no joelho',
  },
  'DoresLombares': {
    bloqueio: e => _temCi(e, 'DoresLombares'),
    motivo: 'Contraindicado: dor lombar',
  },
  'DoresNosOmbros': {
    bloqueio: e => _temCi(e, 'DoresNosOmbros'),
    motivo: 'Contraindicado: dor no ombro',
  },
  'DoresNosCotovelos': {
    bloqueio: e => _temCi(e, 'DoresNosCotovelos'),
    motivo: 'Contraindicado: dor no cotovelo',
  },

  // Flags funcionais — FMS foi removido do sistema (confirmado 2026-08-28); o
  // campo `tr` (tags_restricao) também saiu do banco (nunca foi implementado
  // de fato). As regras abaixo continuam só pela parte baseada em nome.
  'EncurtamentoIsquiotibiais': {
    bloqueio: e => e.n.toLowerCase().includes('levantamento terra') && !e.n.toLowerCase().includes('romeno') && !e.n.toLowerCase().includes('stiff'),
    motivo: 'Encurtamento de isquiotibiais — terra convencional contraindicado',
  },
  'ValgoJoelho': {
    bloqueio: e => (e.pad?.chave === 'JoelhoBilateralSimetrico' && e.r?.chave !== 'Maquina' && !e.n.toLowerCase().includes('leg press') &&
                    !e.n.toLowerCase().includes('hack') && e.nv?.chave !== 'Iniciante' &&
                    e.n.toLowerCase().includes('barra') && e.n.toLowerCase().includes('agachamento')),
    motivo: 'Valgo de joelho — agachamento profundo com barra contraindicado',
  },
  'OmbroLimitadoD': {
    // `e.ovh` foi removido — overhead agora é detectado pelo Padrão de
    // Movimento oficial "Empurrar vertical" (decisão 2026-08-28, ponto 20).
    bloqueio: e => e.pad?.chave === 'EmpurrarVertical' && e.g.some(x=>x.chave === 'Deltoide') &&
                   (e.n.toLowerCase().includes('desenvolvimento') || e.n.toLowerCase().includes('arnold')),
    motivo: 'Ombro D limitado — press vertical contraindicado no lado afetado',
  },
  'OmbroLimitadoE': {
    bloqueio: e => e.pad?.chave === 'EmpurrarVertical' && e.g.some(x=>x.chave === 'Deltoide') &&
                   (e.n.toLowerCase().includes('desenvolvimento') || e.n.toLowerCase().includes('arnold')),
    motivo: 'Ombro E limitado — press vertical contraindicado no lado afetado',
  },
  'OmbroLimitadoBilateral': {
    bloqueio: e => e.pad?.chave === 'EmpurrarVertical' && e.g.some(x=>x.chave === 'Deltoide'),
    motivo: 'Ombro limitado bilateral — overhead contraindicado',
  },

  // IMC / impacto — `e.imp` foi removido (não existia na planilha oficial;
  // impacto articular por sobrepeso vira cálculo futuro combinando tipo de
  // exercício + avaliação do aluno, ainda não desenhado). Regra desativada
  // até esse cálculo existir — não bloqueia nada por enquanto.
  'BaixoImpacto': {
    bloqueio: e => false,
    motivo: 'Alto impacto — não recomendado com IMC ≥ 30',
  },

  // FMS Score baixo — campo `tr` removido; mantém só o corte por nível.
  'FmsScoreBaixo': {
    bloqueio: e => e.nv?.chave === 'Avancado',
    motivo: 'FMS ≤ 13 — exercícios avançados bloqueados na fase corretiva',
  },
};

// Prioridades: flags que sinalizam quais padrões PRIORIZAR
// Nomes de padrão (e.pad) e grupo (e.g) corrigidos para os valores REAIS do
// banco de 691 exercícios — os nomes anteriores ('hinge', 'unilateral_mmii',
// 'pull_h', 'curl', 'core', 'Gluteos' sem acento) não existem nos dados e
// faziam estas regras de proteção clínica nunca dispararem (ou dispararem
// só parcialmente). Confirmado por contagem real:
//   - Assimetria MMII: 3→21 exercícios encontrados após adicionar squat_uni/squat_asym/hip_hinge
//   - Core Assimétrico: 0→11 exercícios após corrigir 'core' para 'lateral_flex'
//   - Valgo Corretivo: 0→17 exercícios após corrigir 'Gluteos' para 'Glúteos'
// `uni` não é mais campo salvo — calculado do nome do exercício.
// `pad` trocou de código curto (squat/pull_v/...) pro nome oficial da
// planilha; de quebra corrige dois mapeamentos que estavam errados no banco
// antigo: "Puxar horizontal" (antes caía junto de pull_v) e "Quadril
// unilateral" (antes caía junto de rotation) entram nas listas certas agora.
// `uni` (flag binária) virou `lateralidade` — 3 categorias (2026-08-28):
// Bilateral / Bilateral com Carga Unilateral / Unilateral. Prioridade clínica
// de assimetria usa só "Unilateral" de fato (mesma lógica de
// _exercicioUnilateral em prescricao-motor.js).
// Correção de assimetria (2026-08-28): prioriza tanto Unilateral quanto
// Bilateral com Carga Unilateral — os dois permitem trabalhar um lado sem
// depender do outro (carga independente por lado), o que ajuda a corrigir
// assimetria. "Bilateral" puro não entra porque a carga é compartilhada.
const _isUniOuCU = e => ['Unilateral','BilateralCargaUnilateral'].includes(e.lateralidade?.chave);
const PADS_JOELHO_QUADRIL_ASSIMETRIA = ['JoelhoBilateralSimetrico','JoelhoUnilateral','JoelhoBilateralAssimetrico','QuadrilBilateral','QuadrilUnilateral'];
const PADS_EMPURRAR_PUXAR_ASSIMETRIA = ['EmpurrarHorizontal','EmpurrarVertical','PuxarHorizontal','PuxarVertical'];
const FLAGS_PRIORIDADE = {
  // MMII (membros inferiores) e MMSS (membros superiores) — segmentado como pedido.
  'AssimetriaMMII':   e => _isUniOuCU(e) && e.pad && PADS_JOELHO_QUADRIL_ASSIMETRIA.includes(e.pad.chave),
  'AssimetriaMMSS':   e => _isUniOuCU(e) && ((e.pad && PADS_EMPURRAR_PUXAR_ASSIMETRIA.includes(e.pad.chave)) || e.g.some(x=>x.chave === 'Biceps')),
  'CoreAssimetrico':  e => e.pad?.chave === 'FlexaoLateralDeTronco',
  'IsquioEncurtado':  e => e.g.some(x=>x.chave === 'Isquiossurais') && (e.r?.chave === 'Maquina' || e.n.toLowerCase().includes('cadeira flexora') || e.n.toLowerCase().includes('flexão de joelho')),
  'ValgoCorretivo':   e => e.g.some(x=>x.chave === 'Gluteos') && e.n.toLowerCase().includes('abdução'),
};

// Regra 2 (esboço 2026-08-26) — condição clínica do aluno → preferência de tipo
// de exercício e cadeia cinética. NÃO bloqueia nada (quem bloqueia é FLAGS_FILTRO,
// acima) — só prioriza, dentro do que já é seguro, o exercício mais adequado à
// condição. Reaproveita os mesmos nomes de flag de FLAGS_FILTRO/extrairFlagsClinicas.
// Ainda não é exaustivo (esboço funcional pra afinar depois de ver rodando).
// Cadeia cinética trocou de CCA/CCF/Complementar/Misto (código antigo, com
// mapeamento inconsistente) pro binário oficial da planilha: 'Aberta'/'Fechada'
// — CCF = Fechada, CCA = Aberta, por definição (2026-08-28).
// Valores são CHAVES do banco (ASCII, sem acento) — comparados contra
// e.tp[].chave / e.cad.chave em combinaComCondicao (prescricao-motor.js).
const FLAGS_TIPO_CADEIA = {
  'DoresNosJoelhos':   { cad: ['Fechada'], tp: ['Estabilidade','Mobilidade'] },
  'DoresLombares':      { cad: ['Fechada'], tp: ['Estabilidade'] },
  'DoresNosOmbros':    { cad: ['Aberta'],  tp: ['Estabilidade','Mobilidade'] },
  'DoresNosCotovelos': { cad: ['Fechada'], tp: [] },
  'BaixoImpacto':       { cad: [],          tp: ['Estabilidade','Aerobio'] },
  'FmsScoreBaixo':     { cad: ['Fechada'], tp: ['Estabilidade','Mobilidade'] },
};

// Agrega as preferências de tipo/cadeia de todas as flags clínicas ativas do
// aluno neste momento. Retorna sets vazios se não houver nenhuma flag relevante.
function preferenciasTipoCadeia(){
  const { bloqueios } = extrairFlagsClinicas();
  const cad = new Set(), tp = new Set();
  bloqueios.forEach(flag => {
    const pref = FLAGS_TIPO_CADEIA[flag];
    if(!pref) return;
    (pref.cad||[]).forEach(v=>cad.add(v));
    (pref.tp||[]).forEach(v=>tp.add(v));
  });
  return { cad, tp };
}

function extrairFlagsClinicas(){
  const s = getActive();
  if(!s?.anamnese) return { bloqueios:[], prioridades:[] };
  const p = s.perfil || {}, a = s.anamnese;
  const flags = [];

  // Lesões diretas do perfil
  if((p.lesoes||'').includes('Joelho'))    flags.push('DoresNosJoelhos');
  if((p.lesoes||'').includes('Lombar'))    flags.push('DoresLombares');
  if((p.lesoes||'').includes('Ombro'))     flags.push('DoresNosOmbros');
  if((p.lesoes||'').includes('Cotovelo'))  flags.push('DoresNosCotovelos');

  // Preferências de exercício (a-preferencias)
  const pref = a.preferencias || '';
  if(pref.includes('Joelhos'))  flags.push('DoresNosJoelhos');
  if(pref.includes('Lombares')) flags.push('DoresLombares');
  if(pref.includes('Ombros'))   flags.push('DoresNosOmbros');
  if(pref.includes('Cotovelos'))flags.push('DoresNosCotovelos');

  // FMS flags funcionais
  const isquio_d = a.isquio_d||'', isquio_e = a.isquio_e||'';
  if(['Moderado','Acentuado'].some(v => isquio_d.includes(v) || isquio_e.includes(v)))
    flags.push('EncurtamentoIsquiotibiais');

  const slsq_flag = a.fms_slsq_flag||'', ohsa_flag = a.fms_ohsa_flag||'';
  if(slsq_flag.includes('Valgo') || ohsa_flag.includes('Valgo'))
    flags.push('ValgoJoelho');

  const shFlag = a.fms_shoulder_flag||'';
  if(shFlag.includes('Limitação D'))        flags.push('OmbroLimitadoD');
  if(shFlag.includes('Limitação E'))        flags.push('OmbroLimitadoE');
  if(shFlag.includes('Limitação bilateral'))flags.push('OmbroLimitadoBilateral');
  if(shFlag.includes('Limitação D') || shFlag.includes('Limitação E') || shFlag.includes('bilateral'))
    flags.push('OmbroLimitado');

  // IMC
  const peso = parseFloat(a.peso), alt = parseFloat(a.altura);
  if(peso && alt && peso/Math.pow(alt/100,2) >= 30) flags.push('BaixoImpacto');

  // FMS score
  const fmsIds = ['fms_ohsa','fms_slsq','fms_hurdle','fms_lunge','fms_shoulder','fms_aslr','fms_rotary'];
  const scores = fmsIds.map(k=>parseInt(a[k])||0);
  const validos = scores.filter(v=>v>0);
  if(validos.length >= 4 && scores.reduce((s,v)=>s+v,0) <= 13)
    flags.push('FmsScoreBaixo');

  // Prioridades por assimetria
  const prioridades = [];
  const bracoD = parseFloat(a.braco_d), bracoE = parseFloat(a.braco_e);
  const coxaD  = parseFloat(a.coxa_d),  coxaE  = parseFloat(a.coxa_e);
  const eqD    = parseFloat(a.equilibrio_d), eqE = parseFloat(a.equilibrio_e);
  const pld    = parseFloat(a.prancha_lat_d), ple = parseFloat(a.prancha_lat_e);
  const grD    = parseFloat(a.grip_d), grE = parseFloat(a.grip_e);

  if(coxaD&&coxaE&&Math.abs(coxaD-coxaE)>=1)   prioridades.push('AssimetriaMMII');
  if(bracoD&&bracoE&&Math.abs(bracoD-bracoE)>=1) prioridades.push('AssimetriaMMSS');
  if(eqD&&eqE&&Math.abs(eqD-eqE)>=3)            prioridades.push('AssimetriaMMII');
  if(pld&&ple&&(Math.abs(pld-ple)/Math.max(pld,ple))>0.10) prioridades.push('CoreAssimetrico');
  if(grD&&grE&&Math.abs(grD-grE)>=2)            prioridades.push('AssimetriaMMSS');

  if(flags.includes('EncurtamentoIsquiotibiais')) prioridades.push('IsquioEncurtado');
  if(flags.includes('ValgoJoelho'))               prioridades.push('ValgoCorretivo');

  return { bloqueios: [...new Set(flags)], prioridades: [...new Set(prioridades)] };
}

// Retorna exercícios do grupo com status: 'ok' | 'prioritario' | 'bloqueado' | 'motivo'.
//
// `ctx` (2026-09-07) é o CORTE INICIAL — nível do aluno + resistências do local
// de treino. Sem ele esta função devolvia o banco inteiro do grupo, e a coluna
// "Filtro" do step 2 mostrava o mesmo número para todo nível e todo local,
// divergindo do pool que o motor realmente sorteia. Agora delega o corte pra
// poolBaseExercicios() (prescricao-motor.js), a mesma função que filtrarExerciciosFicha
// usa. `ctx` opcional pra não quebrar chamada antiga: sem ele, cai no
// comportamento anterior (só grupo).
function filtrarExercicios(grupo, ctx){
  const { bloqueios, prioridades } = extrairFlagsClinicas();
  // `grupo` vem de GRUPOS_MAPA ('Biceps', 'RetoAbdominal'). O banco agora
  // carrega o campo `chave` no mesmo formato ASCII — comparação direta, sem
  // normalização em runtime (refatoração de identificadores 2026-09-02).
  const pool = (ctx && typeof poolBaseExercicios === 'function')
    ? poolBaseExercicios(grupo, null, ctx.resist, ctx.nivel, ctx.lesoes)
    : DB_EXERCICIOS.filter(e => e.g.some(x => x.chave === grupo));

  return pool.map(e => {
    // Verificar bloqueios
    for(const flag of bloqueios){
      const regra = FLAGS_FILTRO[flag];
      if(regra?.bloqueio(e)){
        return { ...e, status:'bloqueado', motivo: regra.motivo };
      }
    }
    // Verificar prioridades
    for(const prio of prioridades){
      const fn = FLAGS_PRIORIDADE[prio];
      if(fn && fn(e)){
        return { ...e, status:'prioritario', motivo: prio };
      }
    }
    return { ...e, status:'ok', motivo:'' };
  });
}

function contarFiltros(grupo, ctx){
  const lista = filtrarExercicios(grupo, ctx);
  const ok        = lista.filter(e=>e.status==='ok').length;
  const prio      = lista.filter(e=>e.status==='prioritario').length;
  const bloqueado = lista.filter(e=>e.status==='bloqueado').length;
  return {
    total: lista.length,
    ok, prio, bloqueado,
    // `disponivel` = o que o motor pode de fato sortear (ok + prioritário).
    // Zero aqui significa grupo intreinável no nível/local escolhido.
    disponivel: ok + prio,
  };
}

function renderizarTriagem(){
  const s=getActive();
  const painel=$('triagem-painel');
  if(!painel) return;
  if(!s||!s.perfil||!s.anamnese){painel.style.display='none';return;}
  const p=s.perfil, a=s.anamnese;
  const bloqueios=[],alertas=[],contexto=[];

  TRIAGEM_REGRAS.forEach(r=>{
    try{
      if(!r.condicao(p,a)) return;
      const label=r.labelFn?r.labelFn(p,a):r.label;
      const item={...r,label};
      if(r.tipo==='bloqueio') bloqueios.push(item);
      else if(r.tipo==='alerta') alertas.push(item);
      else contexto.push(item);
    }catch(e){}
  });

  const total=bloqueios.length+alertas.length+contexto.length;
  if(total===0){painel.style.display='none';return;}
  painel.style.display='block';

  const partes=[];
  if(bloqueios.length) partes.push(`<span style="color:var(--red);font-weight:600">${bloqueios.length} bloqueio${bloqueios.length>1?'s':''}</span>`);
  if(alertas.length)   partes.push(`<span style="color:var(--amber);font-weight:600">${alertas.length} alerta${alertas.length>1?'s':''}</span>`);
  if(contexto.length)  partes.push(`<span style="color:var(--text2)">${contexto.length} contexto${contexto.length>1?'s':''}</span>`);

  const podePrescrever=bloqueios.length===0;
  const resumo=$('triagem-texto'), icone=$('triagem-icone');
  if(icone) icone.textContent=bloqueios.length?'':alertas.length?'':'';
  if(resumo) resumo.innerHTML=
    `<strong>${escHTML(p.nome||'Aluno')}</strong> — ${partes.join(' · ')} &nbsp;·&nbsp; `+
    (podePrescrever
      ?`<span style="color:var(--accent)"><i class=ph-check></i> Pode prescrever${alertas.length?' com restrições':''}</span>`
      :`<span style="color:var(--red)"><i class=ph-x></i> Resolver bloqueios antes de prosseguir</span>`);

  const renderLista=(itens,idLista,idWrap)=>{
    const wrap=$(idWrap), lista=$(idLista); if(!wrap||!lista) return;
    if(!itens.length){wrap.style.display='none';return;}
    wrap.style.display='block';
    lista.innerHTML=itens.map(item=>`
      <div style="padding:8px 12px;background:var(--bg3);border-radius:var(--radius);border-left:1px solid ${item.tipo==='bloqueio'?'var(--red)':item.tipo==='alerta'?'var(--amber)':'rgba(0,160,255,.5)'}">
        <div style="font-size:13px;color:var(--text);margin-bottom:3px">${item.icone} ${escHTML(item.label)}</div>
        <div style="font-size:12px;color:var(--text3);line-height:1.5">${item.detalhe}</div>
      </div>`).join('');
  };
  renderLista(bloqueios,'triagem-bloqueios-lista','triagem-bloqueios');
  renderLista(alertas,  'triagem-alertas-lista',  'triagem-alertas');
  renderLista(contexto, 'triagem-contexto-lista', 'triagem-contexto');
  if($('triagem-detalhe')) $('triagem-detalhe').style.display=_triagemAberta?'flex':'none';
}

const FMS_TESTES = [
  { id:'ohsa',     num:1, label:'Agachamento Overhead (OHSA)',      sub:'Tornozelo, joelho, quadril, core, ombro, torácica',
    opts:['Valgo de joelho','Inclinação excessiva de tronco','Calcâneos elevam (dorsiflexão limitada)','Braços caem à frente (mob. ombro/torácica)','Assimetria D/E','Dor — encaminhar FT'] },
  { id:'slsq',     num:2, label:'Agachamento Unipodal D/E',          sub:'Força unilateral MMII, equilíbrio dinâmico, estabilidade pélvica',
    opts:['Valgo de joelho','Queda lateral de pelve (Trendelenburg)','Rotação de tronco','Assimetria D>E','Assimetria E>D','Dor — encaminhar FT'] },
  { id:'hurdle',   num:3, label:'Passo sobre Barreira D/E',          sub:'Controle motor de pelve/core, assimetrias de marcha',
    opts:['Queda lateral de pelve','Compensação de joelho','Assimetria D/E','Dor — encaminhar FT'] },
  { id:'lunge',    num:4, label:'Afundo Linear D/E',                  sub:'Estabilidade joelho/tornozelo, mob. quadril, equilíbrio',
    opts:['Joelho anterior passa o pé','Rotação de tronco','Oscilação lateral','Assimetria D/E','Dor — encaminhar FT'] },
  { id:'shoulder', num:5, label:'Mobilidade de Ombro D/E',           sub:'Flex/abd/rot ext + ext/rot int. 3=punhos se tocam · 2=1 punho · 1=>1 punho',
    opts:['Limitação bilateral','Limitação lado Direito','Limitação lado Esquerdo','Dor no clearing test — encaminhar FT'] },
  { id:'aslr',     num:6, label:'Elevação Ativa da Perna D/E (ASLR)',sub:'Mob. isquiotibiais/panturrilha, estabilidade de core e pelve',
    opts:['Encurtamento isquiotibiais bilateral','Encurtamento isquiotibiais D','Encurtamento isquiotibiais E','Pelve se move (instabilidade de core)','Dor — encaminhar FT'] },
  { id:'rotary',   num:7, label:'Estabilidade Rotacional D/E',       sub:'Core multiplanar, coordenação pelve/cintura escapular',
    opts:['Só executa diagonal (braço D + perna E)','Rotação de tronco excessiva','Assimetria D/E','Dor no clearing test — encaminhar FT'] },
];

const FMS_FLAGS = {
  'ohsa':{
    'Valgo de joelho':                          '→ Evitar agachamento profundo; fortalecer glúteo médio e abdutores',
    'Inclinação excessiva de tronco':           '→ Trabalhar mob. torácica e flexores de quadril antes de cargas axiais',
    'Calcâneos elevam (dorsiflexão limitada)':  '→ Mob. de tornozelo limitada; evitar agachamento com barra inicial',
    'Braços caem à frente (mob. ombro/torácica)':'→ Limitação de ombro/torácica; evitar press acima da cabeça inicial',
    'Assimetria D/E':                           '→ Priorizar exercícios unilaterais para equalizar lados',
  },
  'slsq':{
    'Valgo de joelho':             '→ Fortalecer glúteo médio; priorizar variações unilaterais com controle',
    'Queda lateral de pelve (Trendelenburg)':'→ Fraqueza de glúteo médio; incluir abdução e estabilização pélvica',
    'Rotação de tronco':           '→ Déficit de controle de core; incluir estabilização antirotacional',
    'Assimetria D>E':              '→ Priorizar lado esquerdo em exercícios unilaterais',
    'Assimetria E>D':              '→ Priorizar lado direito em exercícios unilaterais',
  },
  'shoulder':{
    'Limitação bilateral':         '→ Evitar press acima da cabeça; trabalhar rotação externa e mob. torácica',
    'Limitação lado Direito':      '→ Incluir mobilização rotação externa D; evitar press D acima da cabeça',
    'Limitação lado Esquerdo':     '→ Incluir mobilização rotação externa E; evitar press E acima da cabeça',
  },
  'aslr':{
    'Encurtamento isquiotibiais bilateral':'→ Evitar terra convencional; priorizar variações com menor demanda de isquio',
    'Encurtamento isquiotibiais D':'→ Cautela em exercícios de cadeia posterior unilateral D',
    'Encurtamento isquiotibiais E':'→ Cautela em exercícios de cadeia posterior unilateral E',
    'Pelve se move (instabilidade de core)':'→ Fase inicial com foco em estabilização de core; evitar cargas axiais pesadas',
  },
  'rotary':{
    'Só executa diagonal (braço D + perna E)':'→ Core insuficiente para movimentos unilaterais; fase inicial com bilateral',
    'Rotação de tronco excessiva':            '→ Déficit de estabilidade de core; incluir exercícios antirotacionais',
    'Assimetria D/E':                         '→ Ajustar programação para equilibrar lados',
  },
};

const FMS_IDS = FMS_TESTES.map(t=>'fms-'+t.id);

function renderFMSRows(){
  const cont=$('fms-rows'); if(!cont) return;
  cont.innerHTML='';
  FMS_TESTES.forEach(t=>{
    const scoreId  = 'fms-'+t.id;
    const flagId   = 'fms-'+t.id+'-flag';
    const wrapId   = 'fms-'+t.id+'-wrap';
    const hiddenId = flagId; // o hidden já tem esse id

    const row=document.createElement('div');
    row.style.cssText='display:grid;grid-template-columns:1fr 70px 1fr;gap:8px;align-items:start;padding:8px 0;border-top:1px solid var(--border)';

    // Col 1 — label
    row.innerHTML=`
      <div>
        <div style="font-size:13px;color:var(--text)">${t.num}. ${escHTML(t.label)}</div>
        <div style="font-size:12px;color:var(--text3);margin-top:2px">${t.sub}</div>
      </div>
      <select id="${scoreId}" onchange="calcFMSScore();onAnamneseChange()" style="background:var(--bg4);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);padding:6px 8px;font-size:13px;text-align:center">
        <option value="">—</option>
        <option value="3">3</option><option value="2">2</option><option value="1">1</option><option value="0">0 </option>
      </select>
      <div>
        <div id="${wrapId}" style="background:var(--bg4);border:1px solid var(--border);border-radius:var(--radius);padding:6px 10px;display:flex;flex-wrap:wrap;gap:4px 12px">
          ${t.opts.map(o=>{
            const isDor=o.includes('Dor');
            return `<label style="display:flex;align-items:center;gap:5px;font-size:12px;color:${isDor?'var(--red)':'var(--text2)'};cursor:pointer;white-space:nowrap">
              <input type="checkbox" class="fms-flag-check" data-fms="${t.id}" value="${o}" onchange="onFMSFlagChange('${t.id}')"> ${o}
            </label>`;
          }).join('')}
        </div>
        <input type="hidden" id="${flagId}">
      </div>`;
    cont.appendChild(row);
  });
}

function onFMSFlagChange(testId){
  const checks=document.querySelectorAll(`.fms-flag-check[data-fms="${testId}"]:checked`);
  const vals=[...checks].map(c=>c.value);
  const hidden=document.getElementById('fms-'+testId+'-flag');
  if(hidden) hidden.value=vals.join(' | ');
  calcFMSScore(); onAnamneseChange();
}

function carregarFMSFlags(testId, valorSalvo){
  document.querySelectorAll(`.fms-flag-check[data-fms="${testId}"]`).forEach(c=>c.checked=false);
  if(!valorSalvo) return;
  valorSalvo.split(' | ').forEach(v=>{
    const c=document.querySelector(`.fms-flag-check[data-fms="${testId}"][value="${v}"]`);
    if(c) c.checked=true;
  });
  const hidden=document.getElementById('fms-'+testId+'-flag');
  if(hidden) hidden.value=valorSalvo;
}

function calcPranchaLat(){
  const d=parseFloat(val('a-prancha-lat-d')), e=parseFloat(val('a-prancha-lat-e'));
  const el=$('a-prancha-lat-delta'); if(!el) return;
  if(d&&e){
    const pct=Math.abs(d-e)/Math.max(d,e)*100;
    const flag=pct>10;
    const lado=d>e?'D>E':'E>D';
    el.value=`${pct.toFixed(0)}% (${lado})${flag?' ':''}`;
    el.style.color=flag?'var(--amber)':'var(--text2)';
  } else el.value='—';
}

function calcEquilibrio(){
  const d=parseFloat(val('a-equilibrio-d')), e=parseFloat(val('a-equilibrio-e'));
  const el=$('a-equilibrio-delta'); if(!el) return;
  if(d&&e){
    const diff=Math.abs(d-e);
    const pct=(diff/Math.max(d,e)*100).toFixed(0);
    const lado=d>e?'D>E':'E>D';
    const flag=diff>=3;
    el.value=`${diff.toFixed(0)}s Δ (${lado}) ${pct}%${flag?' ':''}`;
    el.style.color=flag?'var(--amber)':'var(--text2)';
  } else el.value='—';
}


function calcFMSScore(){
  let total=0, validos=0, temDor=false;
  FMS_IDS.forEach(id=>{
    const selEl=document.getElementById(id);
    const v=parseInt(selEl?.value);
    if(!isNaN(v)){
      total+=v; validos++;
      if(v===0){ temDor=true;
        if(selEl){ selEl.style.borderColor='var(--red-line)'; selEl.style.background='var(--red-dim)'; }
      } else if(selEl){ selEl.style.borderColor=''; selEl.style.background=''; }
    }
  });
  FMS_TESTES.forEach(t=>{
    const flagVal=document.getElementById('fms-'+t.id+'-flag')?.value||'';
    if(flagVal.includes('Dor')) temDor=true;
  });
  const el=$('fms-score-total'), lbl=$('fms-score-nivel');
  if(!el) return;
  if(validos===0){ el.textContent='—'; if(lbl) lbl.textContent=''; return; }
  el.textContent=total;
  if(lbl){
    if(temDor){ lbl.textContent='Dor detectada'; lbl.style.cssText='font-size:12px;padding:3px 10px;border-radius:6px;background:var(--red-dim);color:var(--red);border:1px solid var(--red-line)'; }
    else if(total>=17){ lbl.textContent='Excelente'; lbl.style.cssText='font-size:12px;padding:3px 10px;border-radius:6px;background:rgba(0,229,160,.1);color:var(--accent);border:1px solid rgba(0,229,160,.2)'; }
    else if(total>=14){ lbl.textContent='Bom'; lbl.style.cssText='font-size:12px;padding:3px 10px;border-radius:6px;background:var(--amber-dim);color:var(--amber);border:1px solid var(--amber-line)'; }
    else { lbl.textContent='Risco elevado'; lbl.style.cssText='font-size:12px;padding:3px 10px;border-radius:6px;background:var(--red-dim);color:var(--red);border:1px solid var(--red-line)'; }
  }
  const linhas=[];
  FMS_TESTES.forEach(t=>{
    const flagVal=document.getElementById('fms-'+t.id+'-flag')?.value||'';
    if(flagVal.includes('Dor')) linhas.push(`<strong style="color:var(--red)">Dor em ${escHTML(t.label)}</strong> → encaminhar Fisioterapeuta antes de prescrever o padrão`);
    if(FMS_FLAGS[t.id]&&flagVal){
      flagVal.split(' | ').forEach(v=>{
        if(FMS_FLAGS[t.id][v]) linhas.push(FMS_FLAGS[t.id][v]);
      });
    }
  });
  const box=$('func-flags'), txt=$('func-flags-texto');
  if(box&&txt){ if(linhas.length){ box.style.display='block'; txt.innerHTML=[...new Set(linhas)].join('<br>'); } else box.style.display='none'; }
}



const ATIVIDADES_MET = [
  {label:'Caminhada leve (< 4 km/h)',        met:2.5},
  {label:'Caminhada moderada (4–6 km/h)',    met:3.5},
  {label:'Caminhada rápida (> 6 km/h)',      met:4.5},
  {label:'Corrida leve (< 8 km/h)',          met:6.0},
  {label:'Corrida moderada (8–10 km/h)',     met:8.0},
  {label:'Corrida intensa (> 10 km/h)',      met:10.0},
  {label:'Ciclismo leve (< 16 km/h)',        met:4.0},
  {label:'Ciclismo moderado (16–22 km/h)',   met:6.0},
  {label:'Ciclismo intenso (> 22 km/h)',     met:10.0},
  {label:'Natação (ritmo leve)',             met:5.0},
  {label:'Natação (ritmo moderado)',         met:7.0},
  {label:'Natação (ritmo intenso)',          met:10.0},
  {label:'Futebol / futsal',                met:7.0},
  {label:'Basquete / vôlei',               met:6.0},
  {label:'Tênis (simples)',                 met:7.0},
  {label:'Artes marciais / luta',           met:10.0},
  {label:'Dança (social/zumba)',            met:5.0},
  {label:'Yoga / alongamento',             met:2.5},
  {label:'Pilates',                         met:3.0},
  {label:'CrossFit / HIIT',               met:12.0},
  {label:'Escalada / bouldering',          met:8.0},
  {label:'Skate / patins',                met:5.0},
  {label:'Atividade de trabalho (em pé, andando)', met:3.0},
  {label:'Trabalho físico pesado (construção, carga)', met:5.0},
  {label:'Jardinagem / tarefas domésticas', met:3.5},
];

let _extrasData = []; // [{atividade, met, minutos, dias}]

function addExtraAtividade(dados){
  const idx = _extrasData.length;
  const d = dados || {atividade:'', met:3.5, minutos:30, dias:3};
  _extrasData.push(d);
  renderExtraLinha(idx);
  calcExtras();
}

function renderExtraLinha(idx){
  const lista = $('extras-lista'); if(!lista) return;
  const d = _extrasData[idx];

  const row = document.createElement('div');
  row.id = 'extra-row-'+idx;
  row.style.cssText = 'display:grid;grid-template-columns:1fr 90px 80px auto;gap:8px;align-items:end';

  // Select atividade
  const selWrap = document.createElement('div');
  const sel = document.createElement('select');
  sel.style.cssText = 'width:100%;background:var(--bg4);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);padding:8px 10px;font-size:13px';
  const optDefault = document.createElement('option');
  optDefault.value=''; optDefault.textContent='Selecionar atividade';
  sel.appendChild(optDefault);
  ATIVIDADES_MET.forEach(a=>{
    const opt=document.createElement('option');
    opt.value=a.met; opt.textContent=a.label;
    if(d.met===a.met && d.atividade===a.label) opt.selected=true;
    sel.appendChild(opt);
  });
  sel.onchange=()=>{
    const chosen = ATIVIDADES_MET.find(a=>a.met==sel.value && sel.options[sel.selectedIndex]?.text===a.label)
                || ATIVIDADES_MET.find(a=>a.met==sel.value);
    _extrasData[idx].atividade = chosen ? chosen.label : '';
    _extrasData[idx].met = parseFloat(sel.value)||0;
    calcExtras(); onAnamneseChange();
  };
  selWrap.appendChild(sel);

  // Minutos
  const minWrap = document.createElement('div');
  const minInp = document.createElement('input');
  minInp.type='number'; minInp.min=5; minInp.max=480; minInp.value=d.minutos||30;
  minInp.placeholder='min/sessão';
  minInp.style.cssText='width:100%;background:var(--bg4);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);padding:8px 10px;font-size:13px';
  const minLabel=document.createElement('div');
  minLabel.textContent='min/sessão'; minLabel.style.cssText='font-size:12px;color:var(--text3);margin-bottom:4px';
  minInp.oninput=()=>{ _extrasData[idx].minutos=parseInt(minInp.value)||0; calcExtras(); onAnamneseChange(); };
  minWrap.appendChild(minLabel); minWrap.appendChild(minInp);

  // Dias/semana
  const diasWrap = document.createElement('div');
  const diasInp = document.createElement('input');
  diasInp.type='number'; diasInp.min=1; diasInp.max=7; diasInp.value=d.dias||3;
  diasInp.placeholder='dias/sem';
  diasInp.style.cssText='width:100%;background:var(--bg4);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);padding:8px 10px;font-size:13px';
  const diasLabel=document.createElement('div');
  diasLabel.textContent='dias/semana'; diasLabel.style.cssText='font-size:12px;color:var(--text3);margin-bottom:4px';
  diasInp.oninput=()=>{ _extrasData[idx].dias=parseInt(diasInp.value)||0; calcExtras(); onAnamneseChange(); };
  diasWrap.appendChild(diasLabel); diasWrap.appendChild(diasInp);

  // Botão remover
  const btn = document.createElement('button');
  btn.type='button'; btn.innerHTML='<i class=ph-x></i>';
  btn.style.cssText='background:transparent;border:1px solid var(--border);color:var(--text3);border-radius:6px;padding:8px 10px;cursor:pointer;font-size:13px;height:36px;align-self:end';
  btn.onclick=()=>{ _extrasData.splice(idx,1); renderTodasExtras(); calcExtras(); onAnamneseChange(); };

  row.appendChild(selWrap); row.appendChild(minWrap); row.appendChild(diasWrap); row.appendChild(btn);
  lista.appendChild(row);

  // Restaurar seleção do select (por label)
  if(d.atividade){
    for(let i=0;i<sel.options.length;i++){
      if(sel.options[i].text===d.atividade){ sel.selectedIndex=i; break; }
    }
  }
}

function renderTodasExtras(){
  const lista=$('extras-lista'); if(!lista) return;
  lista.innerHTML='';
  _extrasData.forEach((_,idx)=>renderExtraLinha(idx));
}

function calcExtras(){
  // Salva os dados no hidden — cálculo de gasto (MET×peso×horas) é feito no Relatório/NUT
  const hidden=$('a-extras');
  if(hidden) hidden.value=JSON.stringify(_extrasData);
}

// calcTMB_TDEE e calcVO2 disponíveis para uso futuro no Relatório/NUT
function calcTMB_TDEE(gastoExtraSemanal){
  const peso=parseFloat(val('a-peso'));
  const alt=parseFloat(val('a-altura'));
  const nascimento=val('p-nascimento');
  const sexo=val('p-sexo');
  if(!peso||!alt) return null;
  const idade = nascimento ? (new Date().getFullYear()-new Date(nascimento).getFullYear()) : 30;
  let tmb = sexo==='F'
    ? (10*peso)+(6.25*alt)-(5*idade)-161
    : (10*peso)+(6.25*alt)-(5*idade)+5;
  if(tmb<800) tmb=800;
  const freq=parseInt(val('a-frequencia'))||3;
  const faf = freq<=2?1.375:freq<=4?1.55:1.725;
  const tdee = Math.round(tmb*faf) + Math.round((gastoExtraSemanal||0)/7);
  return {tmb:Math.round(tmb), faf, tdee};
}

function carregarExtras(valorSalvo){
  _extrasData=[];
  const lista=$('extras-lista'); if(lista) lista.innerHTML='';
  const el=$('extras-gasto-total'); if(el) el.style.display='none';
  if(!valorSalvo) return;
  try{
    const arr=JSON.parse(valorSalvo);
    if(Array.isArray(arr)) arr.forEach(d=>addExtraAtividade(d));
  } catch(e){
    // compatibilidade com formato antigo (string)
    if(valorSalvo && valorSalvo!=='Nenhuma') addExtraAtividade({atividade:valorSalvo,met:3.5,minutos:30,dias:3});
  }
}


function onModalChange(){
  const checks = document.querySelectorAll('.modal-check');
  const nenhuma = document.querySelector('.modal-check[value="Nenhuma"]');
  // Se marcou Nenhuma, desmarca as demais
  const qualquer = [...checks].find(c => c.value !== 'Nenhuma' && c.checked);
  if(qualquer && nenhuma) nenhuma.checked = false;
  const hidden = document.getElementById('a-modalidades');
  const vals = [...document.querySelectorAll('.modal-check:checked')].map(c=>c.value);
  if(hidden) hidden.value = vals.join(' | ');
  onAnamneseChange();
}

function carregarModalidades(valorSalvo){
  document.querySelectorAll('.modal-check').forEach(c=>c.checked=false);
  if(!valorSalvo) return;
  valorSalvo.split(' | ').forEach(v=>{
    const c = document.querySelector(`.modal-check[value="${v}"]`);
    if(c) c.checked = true;
  });
  const hidden = document.getElementById('a-modalidades');
  if(hidden) hidden.value = valorSalvo;
}

// ── Checkboxes: Suplementos ──────────────────────────────────────────────────
function onSupleChange(el){
  if(el.value === 'Nenhuma' && el.checked){
    document.querySelectorAll('.suple-check').forEach(c=>{ if(c.value!=='Nenhuma') c.checked=false; });
  } else if(el.checked){
    const n = document.querySelector('.suple-check[value="Nenhuma"]');
    if(n) n.checked = false;
  }
  const vals = [...document.querySelectorAll('.suple-check:checked')].map(c=>c.value);
  const hidden = document.getElementById('a-suplementos');
  if(hidden) hidden.value = vals.join(' | ');
  onAnamneseChange();
}

function carregarSuplementos(valorSalvo){
  document.querySelectorAll('.suple-check').forEach(c=>c.checked=false);
  if(!valorSalvo) return;
  valorSalvo.split(' | ').forEach(v=>{
    const c = document.querySelector(`.suple-check[value="${v}"]`);
    if(c) c.checked = true;
  });
  const hidden = document.getElementById('a-suplementos');
  if(hidden) hidden.value = valorSalvo;
}


function onCondicaoChange(el){
  const checks = document.querySelectorAll('.cond-check');
  if(el.value === 'Nenhuma' && el.checked){
    checks.forEach(c => { if(c.value !== 'Nenhuma') c.checked = false; });
  } else if(el.checked) {
    const nenhuma = document.querySelector('.cond-check[value="Nenhuma"]');
    if(nenhuma) nenhuma.checked = false;
  }
  const outrosCheck = document.getElementById('cond-outros-check');
  const outrosInput = document.getElementById('p-condicoes-outros');
  if(outrosInput) outrosInput.style.display = (outrosCheck && outrosCheck.checked) ? 'block' : 'none';
  sincronizarCondicoes();
  onPerfilChange();
}

function sincronizarCondicoes(){
  const checks = document.querySelectorAll('.cond-check:checked');
  const vals = [...checks].map(c => c.value);
  const outros = document.getElementById('p-condicoes-outros')?.value?.trim();
  if(vals.includes('Outros') && outros) {
    const idx = vals.indexOf('Outros');
    vals[idx] = 'Outros: ' + outros;
  }
  const hidden = document.getElementById('p-condicoes');
  if(hidden) hidden.value = vals.length ? vals.join(' | ') : 'Nenhuma';
}

// ── Checkboxes: Medicamentos ─────────────────────────────────────────────────
function onMedChange(el){
  const checks = document.querySelectorAll('.med-check');
  if(el.value === 'Nenhum' && el.checked){
    checks.forEach(c => { if(c.value !== 'Nenhum') c.checked = false; });
  } else if(el.checked) {
    const nenhum = document.querySelector('.med-check[value="Nenhum"]');
    if(nenhum) nenhum.checked = false;
  }
  sincronizarMedicamentos();
  onPerfilChange();
}

function sincronizarMedicamentos(){
  const checks = document.querySelectorAll('.med-check:checked');
  const vals = [...checks].map(c => c.value);
  const hidden = document.getElementById('p-medicamentos');
  if(hidden) hidden.value = vals.length ? vals.join(' | ') : 'Nenhum';
}

// ── Carregar checkboxes ao abrir aluno ──────────────────────────────────────
function carregarCondicoes(valorSalvo){
  const checks = document.querySelectorAll('.cond-check');
  checks.forEach(c => c.checked = false);
  const outrosInput = document.getElementById('p-condicoes-outros');
  if(outrosInput){ outrosInput.value=''; outrosInput.style.display='none'; }
  if(!valorSalvo || valorSalvo === 'Nenhuma'){ 
    const n = document.querySelector('.cond-check[value="Nenhuma"]');
    if(n) n.checked = true;
    return;
  }
  valorSalvo.split(' | ').forEach(v => {
    if(v.startsWith('Outros: ')){
      const outrosCheck = document.getElementById('cond-outros-check');
      if(outrosCheck){ outrosCheck.checked = true; }
      if(outrosInput){ outrosInput.value = v.replace('Outros: ',''); outrosInput.style.display='block'; }
    } else {
      const c = document.querySelector(`.cond-check[value="${v}"]`);
      if(c) c.checked = true;
    }
  });
  const hidden = document.getElementById('p-condicoes');
  if(hidden) hidden.value = valorSalvo;
}

function carregarMedicamentos(valorSalvo){
  const checks = document.querySelectorAll('.med-check');
  checks.forEach(c => c.checked = false);
  const detalhe = document.getElementById('p-medicamentos-detalhe');
  if(!valorSalvo || valorSalvo === 'Nenhum'){
    const n = document.querySelector('.med-check[value="Nenhum"]');
    if(n) n.checked = true;
    return;
  }
  valorSalvo.split(' | ').forEach(v => {
    const c = document.querySelector(`.med-check[value="${v}"]`);
    if(c) c.checked = true;
  });
  const hidden = document.getElementById('p-medicamentos');
  if(hidden) hidden.value = valorSalvo;
}

function calcIdade(){
  const nasc=val('p-nascimento');
  const el=$('p-idade-label'); if(!el) return;
  if(!nasc){ el.textContent=''; return; }
  const idade=new Date().getFullYear()-new Date(nasc).getFullYear();
  el.textContent=idade>0?idade+' anos':'';
}

function toggleTrimestre(){
  const g=val('a-gestacao');
  const sel=$('a-trimestre');
  if(sel) sel.style.display=(g==='Gestante')?'block':'none';
}

// ── Checkboxes: Lesões ───────────────────────────────────────────────────────
function onLesaoChange(el){
  const checks=document.querySelectorAll('.lesao-check');
  if(el.value==='Nenhuma'&&el.checked){
    checks.forEach(c=>{ if(c.value!=='Nenhuma') c.checked=false; });
  } else if(el.checked){
    const n=document.querySelector('.lesao-check[value="Nenhuma"]');
    if(n) n.checked=false;
  }
  const outrosCheck=$('lesao-outros-check');
  const outrosInput=$('p-lesoes-outros');
  if(outrosInput) outrosInput.style.display=(outrosCheck&&outrosCheck.checked)?'block':'none';
  sincronizarLesoes();
  onPerfilChange();
}

function sincronizarLesoes(){
  const checks=document.querySelectorAll('.lesao-check:checked');
  const vals=[...checks].map(c=>c.value);
  const outros=$('p-lesoes-outros')?.value?.trim();
  if(vals.includes('Outros')&&outros){ vals[vals.indexOf('Outros')]='Outros: '+outros; }
  const hidden=$('p-lesoes');
  if(hidden) hidden.value=vals.length?vals.join(' | '):'Nenhuma';
}

function carregarLesoes(valorSalvo){
  document.querySelectorAll('.lesao-check').forEach(c=>c.checked=false);
  const outrosInput=$('p-lesoes-outros');
  if(outrosInput){ outrosInput.value=''; outrosInput.style.display='none'; }
  if(!valorSalvo||valorSalvo==='Nenhuma'){
    const n=document.querySelector('.lesao-check[value="Nenhuma"]');
    if(n) n.checked=true; return;
  }
  valorSalvo.split(' | ').forEach(v=>{
    if(v.startsWith('Outros: ')){
      const outrosCheck=$('lesao-outros-check');
      if(outrosCheck) outrosCheck.checked=true;
      if(outrosInput){ outrosInput.value=v.replace('Outros: ',''); outrosInput.style.display='block'; }
    } else {
      const c=document.querySelector(`.lesao-check[value="${v}"]`);
      if(c) c.checked=true;
    }
  });
  const hidden=$('p-lesoes');
  if(hidden) hidden.value=valorSalvo;
}

function toggleFeminino(){
  const isF = val('p-sexo')==='F';
  const fg = document.getElementById('field-gestacao');
  if(fg) fg.style.display = isF ? '' : 'none';
}

// ─── OBJETIVOS ANAMNESE ───────────────────────────────────────────────────────

function _initObjetivoAnamnese(valorEf, valorSec){
  const selEf  = document.getElementById('a-objetivo-ef');
  const selSec = document.getElementById('a-objetivo-sec');
  if(!selEf || !selSec) return;

  // Populate principal from OBJETIVOS
  selEf.innerHTML = '<option value="">Selecionar</option>' +
    OBJETIVOS.map(o=>`<option value="${o.code}">${escHTML(o.label)}</option>`).join('');
  selEf.value = valorEf || '';

  // Populate secondary excluding current primary
  _refreshObjetivoSec(valorEf, valorSec);
}

function _refreshObjetivoSec(valorEf, valorSec){
  const selSec = document.getElementById('a-objetivo-sec');
  if(!selSec) return;
  selSec.disabled = !valorEf;
  selSec.innerHTML = '<option value="">Nenhum</option>' +
    OBJETIVOS.filter(o=>o.code !== valorEf)
      .map(o=>`<option value="${o.code}">${escHTML(o.label)}</option>`).join('');
  if(valorSec && valorSec !== valorEf) selSec.value = valorSec;
}

function _onObjetivoEfChange(){
  const selEf  = document.getElementById('a-objetivo-ef');
  const selSec = document.getElementById('a-objetivo-sec');
  const novoEf = selEf ? selEf.value : '';
  const secAtual = selSec ? selSec.value : '';
  // Se secundário igual ao novo principal, limpa secundário
  if(secAtual === novoEf) { if(selSec) selSec.value=''; }
  _refreshObjetivoSec(novoEf, secAtual === novoEf ? '' : secAtual);
  onAnamneseChange();
}

function _onObjetivoSecChange(){
  onAnamneseChange();
}

// ─── LOCAL DE TREINO — popula com LIBS.locais ─────────────────────────────────

function _populateLocalSelect(valorSalvo){
  const sel = document.getElementById('a-local');
  if(!sel) return;
  const locaisCustom = (typeof LIBS !== 'undefined' && LIBS?.locais) ? LIBS.locais : [];
  // value = 'libs:ID', mesmo formato do #pr-local. Antes gravava o NOME do local
  // ('Academia XYZ'), que getResistPermitida() nao sabe resolver — a anamnese e a
  // prescricao falavam idiomas diferentes e o local escolhido na avaliacao nao
  // restringia nada. (2026-09-02)
  const sAt = getActive();
  const info = sAt?.anamnese?.local_info;
  const optAluno = (valorSalvo && String(valorSalvo).startsWith('aluno:') && info)
    ? `<option value="${escHTML(valorSalvo)}">${escHTML(info.nome||'Local do aluno')} (do aluno)</option>` : '';
  sel.innerHTML = '<option value="">Selecionar</option>' +
    locaisCustom.map(l=>`<option value="libs:${escHTML(l.id)}">${escHTML(l.nome||l.id)}</option>`).join('') + optAluno;
  if(valorSalvo){
    sel.value = valorSalvo;
    // Dado antigo guardava o nome — reaponta para o libs:ID correspondente.
    if(!sel.value && !String(valorSalvo).startsWith('libs:')){
      const achado = locaisCustom.find(l => (l.nome||'') === valorSalvo);
      if(achado) sel.value = 'libs:' + achado.id;
    }
  }
}

// Textos livres que o aluno escreveu no app (gosta / não gosta-evita).
// Só leitura — o personal transforma em preferidos/a evitar no picker.
// Não entram no motor.
function renderTextoAlunoExercicios(a){
  const box = document.getElementById('a-aluno-texto-exercicios'); if(!box) return;
  const gosta = (a.gosta_texto||'').trim(), evita = (a.evitar_texto||'').trim();
  if(!gosta && !evita){ box.style.display='none'; box.innerHTML=''; return; }
  box.style.display='';
  box.innerHTML = '<div style="font-size:12px;color:var(--text3);margin-bottom:4px"><i class=ph-device-mobile></i> O aluno escreveu no app:</div>'
    + (gosta ? `<div style="font-size:12px"><strong>Gosta:</strong> ${escHTML(gosta)}</div>` : '')
    + (evita ? `<div style="font-size:12px;margin-top:2px"><strong>Não gosta / evita:</strong> ${escHTML(evita)}</div>` : '');
}

// ─── EXERCISE PICKER — preferidos e a evitar ─────────────────────────────────

let _exPickerPref = []; // array de {id, nome}
let _exPickerEvit = []; // array de {id, nome}
let _exPickerBuscaAtiva = null; // 'pref' | 'evit'

function _exPickerBusca(tipo){
  const inpId = tipo==='pref' ? 'ex-pref-busca' : 'ex-evit-busca';
  const sugId = tipo==='pref' ? 'ex-pref-sugestoes' : 'ex-evit-sugestoes';
  const inp = document.getElementById(inpId);
  const sug = document.getElementById(sugId);
  if(!inp||!sug) return;
  const termo = inp.value.trim().toLowerCase();
  if(!termo){ sug.style.display='none'; return; }
  const db = (typeof DB_EXERCICIOS !== 'undefined') ? DB_EXERCICIOS : [];
  const atual = tipo==='pref' ? _exPickerPref : _exPickerEvit;
  const jaIds = new Set(atual.map(e=>e.id));
  const matches = db.filter(e=>!jaIds.has(e.id) && (e.n||'').toLowerCase().includes(termo)).slice(0,20);
  if(!matches.length){ sug.style.display='none'; return; }
  _exPickerBuscaAtiva = tipo;
  sug.style.display = 'block';
  sug.innerHTML = matches.map(e=>
    `<div onclick="_exPickerSelect('${tipo}',${e.id},'${(e.n||'').replace(/'/g,"\'")}')"
      style="padding:6px 10px;cursor:pointer;border-bottom:1px solid var(--border)"
      onmouseenter="this.style.background='var(--bg4)'" onmouseleave="this.style.background=''"
    >${e.n}</div>`
  ).join('');
}

function _exPickerSelect(tipo, id, nome){
  const arr = tipo==='pref' ? _exPickerPref : _exPickerEvit;
  if(!arr.find(e=>e.id===id)) arr.push({id, nome});
  _exPickerRenderTags(tipo);
  // clear search
  const inpId = tipo==='pref' ? 'ex-pref-busca' : 'ex-evit-busca';
  const sugId = tipo==='pref' ? 'ex-pref-sugestoes' : 'ex-evit-sugestoes';
  const inp = document.getElementById(inpId);
  const sug = document.getElementById(sugId);
  if(inp) inp.value='';
  if(sug) sug.style.display='none';
  _exPickerSyncHidden();
  onAnamneseChange();
}

function _exPickerAdd(tipo){
  // Adiciona o primeiro resultado da busca ativa
  const inpId = tipo==='pref' ? 'ex-pref-busca' : 'ex-evit-busca';
  const sugId = tipo==='pref' ? 'ex-pref-sugestoes' : 'ex-evit-sugestoes';
  const sug = document.getElementById(sugId);
  if(sug && sug.style.display!=='none'){
    const first = sug.querySelector('div');
    if(first){ first.click(); return; }
  }
  // Se não tem sugestão visível, abre buscando com o texto atual
  _exPickerBusca(tipo);
  const sug2 = document.getElementById(sugId);
  if(sug2) sug2.style.display = sug2.children.length ? 'block' : 'none';
}

function _exPickerRemove(tipo, id){
  if(tipo==='pref') _exPickerPref = _exPickerPref.filter(e=>e.id!==id);
  else              _exPickerEvit = _exPickerEvit.filter(e=>e.id!==id);
  _exPickerRenderTags(tipo);
  _exPickerSyncHidden();
  onAnamneseChange();
}

function _exPickerRenderTags(tipo){
  const arr = tipo==='pref' ? _exPickerPref : _exPickerEvit;
  const tagId = tipo==='pref' ? 'ex-pref-tags' : 'ex-evit-tags';
  const cor = tipo==='pref' ? 'var(--accent)' : 'var(--red)';
  const corDim = tipo==='pref' ? 'var(--accent-dim)' : 'var(--red-dim)';
  const el = document.getElementById(tagId);
  if(!el) return;
  el.innerHTML = arr.map(e=>
    `<span style="display:inline-flex;align-items:center;gap:4px;background:${corDim};border:1px solid ${cor};color:${cor};border-radius:6px;padding:2px 8px;font-size:12px;font-variant-numeric:tabular-nums;">
      ${e.nome}
      <span onclick="_exPickerRemove('${tipo}',${e.id})" style="cursor:pointer;font-size:13px;line-height:1;opacity:.7">×</span>
    </span>`
  ).join('');
}

function _exPickerSyncHidden(){
  const hPref = document.getElementById('a-gosta-ex');
  const hEvit = document.getElementById('a-evitar-ex');
  if(hPref) hPref.value = JSON.stringify(_exPickerPref);
  if(hEvit) hEvit.value = JSON.stringify(_exPickerEvit);
}

function _exPickerLoad(prefVal, evitVal){
  try{ _exPickerPref = prefVal ? JSON.parse(prefVal) : []; }catch(e){ _exPickerPref=[]; }
  try{ _exPickerEvit = evitVal ? JSON.parse(evitVal) : []; }catch(e){ _exPickerEvit=[]; }
  _exPickerRenderTags('pref');
  _exPickerRenderTags('evit');
  _exPickerSyncHidden();
}



// ─── ANAMNESE CHANGE ──────────────────────────────────────────────────────────

function onAnamneseChange(){
  const s=getActive(); if(!s)return;
  const forca=[];
  document.querySelectorAll('.forca-carga').forEach((el,i)=>{
    const rEl=document.querySelectorAll('.forca-reps')[i];
    forca.push({carga:el.value, reps:rEl?rEl.value:''});
  });
  const _antes = s.anamnese || {};
  const _novo = {
    // Anamnese
    nivel:_v('a-nivel'), tempo:_v('a-tempo'), consistencia:_v('a-consistencia'),
    modalidades:_v('a-modalidades'), extras:_v('a-extras'),
    sono:_v('a-sono'), estresse:_v('a-estresse'), alcool:_v('a-alcool'),
    suplementos:_v('a-suplementos'), pretreino:_v('a-pretreino'),
    objetivo_ef:_v('a-objetivo-ef'), objetivo_sec:_v('a-objetivo-sec'),
    // Bloco 1 — Histórico de Saúde (triagem)
    sintomas:_v('a-sintomas'), tabagismo:_v('a-tabagismo'),
    hist_familiar:_v('a-hist-familiar'), cirurgias:_v('a-cirurgias'),
    gestacao:_v('a-gestacao'), trimestre:_v('a-trimestre'),
    // Bloco 2 — Histórico de Experiência com Treino
    lesoes_passadas:_v('a-lesoes-passadas'), motivo_pausa:_v('a-motivo-pausa'),
    // Bloco 3 — Dados Atuais de Treino (chave pra prescrição, importado automaticamente)
    frequencia:_v('a-frequencia'), duracao:_v('a-duracao'),
    horario:_v('a-horario'), local:_v('a-local'),
    gosta:_v('a-gosta'), preferencias:_v('a-preferencias'),
    gosta_ex:_v('a-gosta-ex'), evitar_ex:_v('a-evitar-ex'),
    // Antropométrica
    peso:_v('a-peso'), altura:_v('a-altura'), data_avaliacao:_v('a-data-avaliacao'),
    gordura: (()=>{ const v=_v('a-gordura'); return v?parseFloat(v):'' })(),
    magra:_v('a-magra'), magra_pct:_v('a-magra-pct'),
    mgorda:_v('a-mgorda'), mmuscular:_v('a-mmuscular'), mmuscular_pct:_v('a-mmuscular-pct'),
    osso:_v('a-osso'), osso_pct:_v('a-osso-pct'),
    residual:_v('a-residual'), residual_pct:_v('a-residual-pct'),
    cintura:_v('a-cintura'), quadril:_v('a-quadril'), abdomen:_v('a-abdomen'), ombro:_v('a-ombro'),
    braco_d:_v('a-braco-d'), braco_e:_v('a-braco-e'),
    braco_d_cont:_v('a-braco-d-cont'), braco_e_cont:_v('a-braco-e-cont'),
    coxa_d:_v('a-coxa-d'), coxa_e:_v('a-coxa-e'),
    pant_d:_v('a-pant-d'), pant_e:_v('a-pant-e'),
    obs_antro:_v('a-obs-antro'), fc:_v('a-fc'),
    // Funcional
    fms_ohsa:_v('fms-ohsa'), fms_ohsa_flag:_v('fms-ohsa-flag'),
    fms_slsq:_v('fms-slsq'), fms_slsq_flag:_v('fms-slsq-flag'),
    fms_hurdle:_v('fms-hurdle'), fms_hurdle_flag:_v('fms-hurdle-flag'),
    fms_lunge:_v('fms-lunge'), fms_lunge_flag:_v('fms-lunge-flag'),
    fms_shoulder:_v('fms-shoulder'), fms_shoulder_flag:_v('fms-shoulder-flag'),
    fms_aslr:_v('fms-aslr'), fms_aslr_flag:_v('fms-aslr-flag'),
    fms_rotary:_v('fms-rotary'), fms_rotary_flag:_v('fms-rotary-flag'),
    fms_push:_v('fms-push'), fms_pull:_v('fms-pull'),
    prancha:_v('a-prancha'), prancha_lat_d:_v('a-prancha-lat-d'), prancha_lat_e:_v('a-prancha-lat-e'),
    equilibrio_d:_v('a-equilibrio-d'), equilibrio_e:_v('a-equilibrio-e'),
    tug:_v('a-tug'),
    sentar_levantar:_v('a-sentar-levantar'), obs_func:_v('a-obs-func'),
    // Força
    formula_1rm:_v('a-formula-1rm'), obs_forca:_v('a-obs-forca'), data_forca:_v('a-data-forca'),
    forca: (()=>{const arr=[];document.querySelectorAll('.forca-carga').forEach((el,i)=>{const rEl=document.querySelectorAll('.forca-reps')[i];const exEl=document.querySelectorAll('.forca-ex')[i];arr.push({ex:exEl?.value||'',carga:el.value,reps:rEl?rEl.value:''});});return arr;})(),
    // Resistência
    cooper:_v('a-cooper'), step_fc:_v('a-step-fc'),
    flexao:_v('a-flexao'), flexao_modificada:_c('a-flexao-modificada'),
    abdominal_reps:_v('a-abdominal-reps'),
    squat_reps:_v('a-squat-reps'), grip_d:_v('a-grip-d'), grip_e:_v('a-grip-e'),
    obs_resist:_v('a-obs-resist'),
    // Flexibilidade
    sentar_alcancar:_v('a-sentar-alcançar'), sitreach_proto:_v('a-sitreach-proto'),
    sitreach_warmup:_c('a-sitreach-warmup'),
    isquio_d:_v('a-isquio-d'), isquio_e:_v('a-isquio-e'),
    iliopsoas_d:_v('a-iliopsoas-d'), iliopsoas_e:_v('a-iliopsoas-e'),
    dorsiflexao_d:_v('a-dorsiflexao-d'), dorsiflexao_e:_v('a-dorsiflexao-e'),
    mob_toracica_d:_v('a-mob-toracica-d'), mob_toracica_e:_v('a-mob-toracica-e'),
    ombro_flex_d:_v('a-ombro-flex-d'), ombro_flex_e:_v('a-ombro-flex-e'),
    quadril_rot_d:_v('a-quadril-rot-d'), quadril_rot_e:_v('a-quadril-rot-e'),
    obs_flex:_v('a-obs-flex'),
  };
  // Campo sem input na tela (cortado em 2026-10-04 ou legado FMS/força/flex):
  // mantém o que já estava salvo, e não cria chave nova vazia.
  Object.keys(_novo).forEach(k=>{
    if(_novo[k] !== _AUSENTE) return;
    if(k in _antes) _novo[k] = _antes[k]; else delete _novo[k];
  });
  if(!document.querySelector('.forca-carga') && Array.isArray(_antes.forca)) _novo.forca = _antes.forca;
  s.anamnese = { ..._antes, ..._novo };
  // Nível: calculado de tempo + consistência (fórmula em calcularNivelTreino)
  const _nivelAuto = calcularNivelTreino(s.anamnese.tempo, s.anamnese.consistencia);
  if(_nivelAuto){ s.anamnese.nivel = _nivelAuto; setVal('a-nivel', _nivelAuto); }

  // Goniometria
  salvarGoniometria(s.anamnese);
  calcIMC(); calcRCQ();
  calcExtras();
  renderStudentList();
  if(!_loadingData){ _markDirty(); _saveDraft(); }
}

// ─── NOVOS CAMPOS DE TRIAGEM (Bloco 1 — Histórico de Saúde) ─────────────────
// Mesmo padrão de onCondicaoChange/onLesaoChange: "Nenhum" é exclusivo com
// as demais opções.
function onSintomaChange(el){
  const checks = document.querySelectorAll('.sintoma-check');
  if(el.value === 'Nenhum' && el.checked){
    checks.forEach(c => { if(c.value !== 'Nenhum') c.checked = false; });
  } else if(el.checked){
    const nenhum = document.querySelector('.sintoma-check[value="Nenhum"]');
    if(nenhum) nenhum.checked = false;
  }
  const hidden = $('a-sintomas');
  const vals = [...document.querySelectorAll('.sintoma-check:checked')].map(c=>c.value);
  if(hidden) hidden.value = vals.join(' | ');
  onAnamneseChange();
}

function carregarSintomas(valorSalvo){
  document.querySelectorAll('.sintoma-check').forEach(c=>c.checked=false);
  const hiddenS = document.getElementById('a-sintomas');
  if(!valorSalvo){
    const n=document.querySelector('.sintoma-check[value="Nenhum"]');
    if(n) n.checked=true;
    if(hiddenS) hiddenS.value='Nenhum';
    return;
  }
  valorSalvo.split(' | ').forEach(v=>{
    const el = document.querySelector(`.sintoma-check[value="${v}"]`);
    if(el) el.checked = true;
  });
  if(hiddenS) hiddenS.value = valorSalvo;
}

function onHistFamiliarChange(el){
  const checks = document.querySelectorAll('.histfam-check');
  if(el.value === 'Nenhum conhecido' && el.checked){
    checks.forEach(c => { if(c.value !== 'Nenhum conhecido') c.checked = false; });
  } else if(el.checked){
    const nenhum = document.querySelector('.histfam-check[value="Nenhum conhecido"]');
    if(nenhum) nenhum.checked = false;
  }
  const hidden = $('a-hist-familiar');
  const vals = [...document.querySelectorAll('.histfam-check:checked')].map(c=>c.value);
  if(hidden) hidden.value = vals.join(' | ');
  onAnamneseChange();
}

function carregarHistFamiliar(valorSalvo){
  document.querySelectorAll('.histfam-check').forEach(c=>c.checked=false);
  const hiddenH = document.getElementById('a-hist-familiar');
  if(!valorSalvo){
    const n=document.querySelector('.histfam-check[value="Nenhum conhecido"]');
    if(n) n.checked=true;
    if(hiddenH) hiddenH.value='Nenhum conhecido';
    return;
  }
  valorSalvo.split(' | ').forEach(v=>{
    const el = document.querySelector(`.histfam-check[value="${v}"]`);
    if(el) el.checked = true;
  });
  if(hiddenH) hiddenH.value = valorSalvo;
}

// ─── SUBABAS DA AVALIAÇÃO ────────────────────────────────────────────────────

const SUBTABS_AVAL = ['anamnese-hist','anamnese-antro','anamnese-meta'];

function _switchSubtabForcado(name){
  SUBTABS_AVAL.forEach(t=>{
    const panel = $('subpanel-'+t);
    const tab   = $('subtab-'+t);
    if(panel) toggle('subpanel-'+t, t===name);
    if(tab)   tab.classList.toggle('active', t===name);
  });
  if(name==='anamnese-antro'){ _antroEditId=null; antroMostrarLista(); }
  if(name==='anamnese-meta') renderMeta();
}
function switchSubtab(name){
  _guardNav(() => _switchSubtabForcado(name));
}

// ─── HISTÓRICO DE AVALIAÇÕES ANTROPOMÉTRICAS ───────────────────────────────────
// Cada avaliação salva vira um snapshot independente em s.avaliacoesAntro, além de
// continuar espelhando os valores mais recentes em s.anamnese (compatibilidade com
// os motores de cálculo — Meta, RCQ, prescrição — que sempre leem s.anamnese).
let _antroEditId = null;

const ANTRO_SNAPSHOT_IDS = ['a-data-avaliacao','a-peso','a-altura','a-mgorda','a-gordura',
  'a-mmuscular','a-mmuscular-pct','a-osso','a-osso-pct','a-ombro','a-cintura','a-abdomen','a-quadril',
  'a-braco-d','a-braco-e','a-braco-d-cont','a-braco-e-cont','a-coxa-d','a-coxa-e','a-pant-d','a-pant-e',
  'a-obs-antro','a-imc','a-imc-class','a-magra','a-magra-pct','a-residual','a-residual-pct','a-rcq','a-rcq-class'];

const ANTRO_CALCULADOS = ['a-imc','a-imc-class','a-magra','a-magra-pct','a-residual','a-residual-pct','a-rcq','a-rcq-class'];

function antroChaveDoId(id){ return id.replace(/^a-/,'').replace(/-/g,'_'); }

function antroSnapshotAtual(){
  const obj = {};
  ANTRO_SNAPSHOT_IDS.forEach(id => { obj[antroChaveDoId(id)] = val(id); });
  return obj;
}

function antroCarregarSnapshot(rec){
  ANTRO_SNAPSHOT_IDS.forEach(id => { setVal(id, rec[antroChaveDoId(id)] || ''); });
}

function antroLimparForm(){
  ANTRO_SNAPSHOT_IDS.forEach(id => {
    if(ANTRO_CALCULADOS.includes(id)) return; // calculados, não zera manualmente
    setVal(id,'');
  });
}

function formatarDataBR(iso){
  if(!iso) return '—';
  const partes = iso.split('-');
  if(partes.length!==3) return iso;
  const [y,m,d] = partes;
  return `${d}/${m}/${y}`;
}

function antroMostrarLista(){
  const lv=$('antro-lista-view'), fv=$('antro-form-view');
  if(lv) lv.style.display='block';
  if(fv) fv.style.display='none';
  renderAntroLista();
}

function antroMostrarForm(){
  const lv=$('antro-lista-view'), fv=$('antro-form-view');
  if(lv) lv.style.display='none';
  if(fv) fv.style.display='block';
}

function antroNovaAvaliacao(){
  const s=getActive(); if(!s) return;
  _antroEditId = null;
  antroLimparForm();
  setVal('a-data-avaliacao', _isoLocal(new Date()));   // data local (UTC virava o dia às 21h)
  calcIMC(); calcRCQ(); calcComp();
  Object.keys(PARES_ASSIM).forEach(par=>calcAssimetria(par));
  const titulo=$('antro-form-titulo'); if(titulo) titulo.textContent='Nova avaliação';
  antroMostrarForm();
}

function antroEditarAvaliacao(id){
  const s=getActive(); if(!s) return;
  const rec = (s.avaliacoesAntro||[]).find(r=>r.id===id);
  if(!rec) return;
  _antroEditId = id;
  antroCarregarSnapshot(rec);
  calcIMC(); calcRCQ(); calcComp();
  Object.keys(PARES_ASSIM).forEach(par=>calcAssimetria(par));
  const titulo=$('antro-form-titulo'); if(titulo) titulo.textContent='Editando avaliação de '+formatarDataBR(rec.data_avaliacao);
  antroMostrarForm();
}

function antroVoltarLista(){
  _antroEditId = null;
  antroMostrarLista();
}

function antroSalvarAvaliacao(){
  const s=getActive(); if(!s) return;
  if(!val('a-data-avaliacao')){ alert('Informe a data da avaliação.'); return; }
  if(!val('a-altura') || !val('a-peso')){ alert('Altura e Peso são obrigatórios.'); return; }
  if(!val('a-mgorda') || !val('a-mmuscular')){ alert('Massa Gorda e Massa Muscular são obrigatórias.'); return; }
  if(!s.avaliacoesAntro) s.avaliacoesAntro = [];
  const snap = antroSnapshotAtual();
  snap.responsavel = (typeof _supaUser!=='undefined' && _supaUser?.email) || 'Modo teste (local)';
  if(_antroEditId){
    const idx = s.avaliacoesAntro.findIndex(r=>r.id===_antroEditId);
    if(idx>=0) s.avaliacoesAntro[idx] = Object.assign({}, s.avaliacoesAntro[idx], snap);
    else { snap.id=_antroEditId; s.avaliacoesAntro.push(snap); }
  } else {
    snap.id = novoId();
    s.avaliacoesAntro.push(snap);
  }
  s.avaliacoesAntro.sort((a,b)=>(b.data_avaliacao||'').localeCompare(a.data_avaliacao||''));
  _antroEditId = null;
  onAnamneseChange(); // sincroniza s.anamnese com os campos atuais (mantém os motores de cálculo funcionando)
  saveStudent(); _clearDirty();
  antroLimparForm();
  setTimeout(()=>_clearDirty(), 500);
  antroMostrarLista();
}

// Autosave do formulário de avaliação (Nova/Editar) — grava um rascunho a cada
// edição, com o mesmo id da avaliação em edição (ou um novo id na primeira vez
// que Peso+Altura ficam preenchidos). Não substitui os requisitos de
// "💾 Salvar Avaliação" (que exige Gordura/Músculo também) — só garante que o
// que já foi digitado não se perca se o personal trocar de aba/tela antes de
// clicar em Salvar.
function autosalvarAvaliacaoAtual(){
  const s=getActive(); if(!s) return null;
  if(!val('a-peso') || !val('a-altura')) return null; // dados insuficientes pra identificar o registro
  if(!s.avaliacoesAntro) s.avaliacoesAntro = [];
  const snap = antroSnapshotAtual();
  snap.responsavel = (typeof _supaUser!=='undefined' && _supaUser?.email) || 'Modo teste (local)';
  if(!_antroEditId) _antroEditId = novoId();
  const idx = s.avaliacoesAntro.findIndex(r=>r.id===_antroEditId);
  if(idx>=0) s.avaliacoesAntro[idx] = Object.assign({}, s.avaliacoesAntro[idx], snap);
  else { snap.id=_antroEditId; s.avaliacoesAntro.push(snap); }
  return true;
}
attachAutosave('antro-form-view', autosalvarAvaliacaoAtual, () => { _markDirty(); _saveDraft(); });

function antroExcluirAvaliacao(id){
  const s=getActive(); if(!s) return;
  const av = (s.avaliacoesAntro||[]).find(r=>r.id===id); if(!av) return;
  if(!confirmarExclusao('avaliacao', rotuloDoItem('avaliacao', av))) return;
  arquivarItem('avaliacao', av, { ownerId: s.id, ownerNome: s.perfil?.nome });
  s.avaliacoesAntro = (s.avaliacoesAntro||[]).filter(r=>r.id!==id);
  saveStudent();
  renderAntroLista();
}

function renderAntroLista(){
  const s=getActive();
  const cont=$('antro-lista-tabela'); if(!cont) return;
  const lista = (s?.avaliacoesAntro||[]).slice().sort((a,b)=>(b.data_avaliacao||'').localeCompare(a.data_avaliacao||''));
  if(!lista.length){
    cont.innerHTML = `<div class="empty"><i class=ph-ruler></i><div class="empty-title">Nenhuma avaliação salva ainda</div><div class="empty-text">Use Adicionar avaliação para registrar a primeira.</div></div>`;
    return;
  }
  let html = `<div style="overflow-x:auto"><table class="tbl">
    <thead><tr>
      <th>Data</th><th>Responsável</th><th>Altura</th><th>Peso</th><th>Gordura</th><th>Músculo</th><th>IMC</th><th style="text-align:right">Ações</th>
    </tr></thead><tbody>`;
  lista.forEach(rec=>{
    const gordTxt = rec.mgorda ? `${rec.mgorda} kg${rec.gordura?` / ${rec.gordura}%`:''}` : '—';
    const muscTxt = rec.mmuscular ? `${rec.mmuscular} kg${rec.mmuscular_pct?` / ${rec.mmuscular_pct}%`:''}` : '—';
    html += `<tr>
      <td>${formatarDataBR(rec.data_avaliacao)}</td>
      <td class="al-data">${escHTML(rec.responsavel||'—')}</td>
      <td>${escHTML(rec.altura||'—')}</td>
      <td>${escHTML(rec.peso||'—')}</td>
      <td>${escHTML(gordTxt)}</td>
      <td>${escHTML(muscTxt)}</td>
      <td>${escHTML(rec.imc||'—')}</td>
      <td class="al-acoes">
        <button type="button" class="btn btn-ghost btn-xs" onclick="antroEditarAvaliacao(${rec.id})">Editar</button>
        <button type="button" class="icon-btn" onclick="antroExcluirAvaliacao(${rec.id})" title="Excluir avaliação" aria-label="Excluir avaliação"><i class=ph-trash></i></button>
      </td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  cont.innerHTML = html;
}


// ─── CÁLCULOS ─────────────────────────────────────────────────────────────────

function calcIMC(){
  const p=parseFloat(val('a-peso')), h=parseFloat(val('a-altura'))/100;
  const el=$('a-imc'), cls=$('a-imc-class');
  if(p&&h){
    const imc=p/(h*h);
    if(el) el.value=imc.toFixed(1);
    if(cls){
      if(imc<18.5)      cls.value='Abaixo do peso';
      else if(imc<25)   cls.value='Peso normal';
      else if(imc<30)   cls.value='Sobrepeso';
      else if(imc<35)   cls.value='Obesidade grau I';
      else if(imc<40)   cls.value='Obesidade grau II';
      else              cls.value='Obesidade grau III';
    }
  } else {
    if(el) el.value='';
    if(cls) cls.value='';
  }
}

// Campos de composição corporal com par kg/%. Chave = nome do campo, valor = ids dos inputs.
const MASSA_FIELDS = {
  mgorda:    {kg:'a-mgorda',     pct:'a-gordura'},
  mmuscular: {kg:'a-mmuscular',  pct:'a-mmuscular-pct'},
  osso:      {kg:'a-osso',       pct:'a-osso-pct'}
};

// Disparado pelo oninput de cada campo kg/% de Gordura, Muscular, Óssea.
// Converte só o par editado (kg->% ou %->kg) usando o peso atual, depois
// recalcula os campos derivados (Magra, Residual).
function onMassaInput(campo, unidade){
  const peso = parseFloat(val('a-peso'));
  const ids = MASSA_FIELDS[campo];
  if(ids && peso){
    const kgEl=$(ids.kg), pctEl=$(ids.pct);
    if(kgEl && pctEl){
      if(unidade==='kg'){
        const kg=parseFloat(kgEl.value);
        pctEl.value=(kg||kg===0)?((kg/peso)*100).toFixed(1):'';
      } else {
        const pct=parseFloat(pctEl.value);
        kgEl.value=(pct||pct===0)?((peso*pct/100)).toFixed(1):'';
      }
    }
  }
  calcComp();
  onAnamneseChange();
}

// Ao mudar o peso: re-sincroniza kg<->% de cada campo (kg manda quando os dois existem).
function syncPesoUnidades(){
  const peso=parseFloat(val('a-peso'));
  if(!peso) return;
  Object.values(MASSA_FIELDS).forEach(ids=>{
    const kgEl=$(ids.kg), pctEl=$(ids.pct);
    if(!kgEl||!pctEl) return;
    const kg=parseFloat(kgEl.value), pct=parseFloat(pctEl.value);
    if(kg||kg===0)      pctEl.value=((kg/peso)*100).toFixed(1);
    else if(pct||pct===0) kgEl.value=((peso*pct/100)).toFixed(1);
  });
}

// Trava/destrava Gordura, Muscular, Óssea (kg+%): só liberam depois do Peso informado,
// porque a conversão kg<->% depende do peso.
function toggleCompFieldsLock(){
  const peso = parseFloat(val('a-peso'));
  const liberado = !!peso;
  ['a-mgorda','a-gordura','a-mmuscular','a-mmuscular-pct','a-osso','a-osso-pct'].forEach(id=>{
    const el=$(id); if(el) el.disabled = !liberado;
  });
  const bloqueio=$('antro-comp-bloqueio');
  if(bloqueio) bloqueio.style.display = liberado ? 'none' : 'block';
}

function calcComp(){
  toggleCompFieldsLock();
  syncPesoUnidades();
  const peso=parseFloat(val('a-peso'));
  const mg=parseFloat(val('a-mgorda'));
  const mm=parseFloat(val('a-mmuscular'));
  const mo=parseFloat(val('a-osso'));
  const mEl=$('a-magra'), mPctEl=$('a-magra-pct');
  const rEl=$('a-residual'), rPctEl=$('a-residual-pct'), rLabelEl=$('a-residual-label');
  const alerta=$('antro-comp-alerta');

  // Massa magra = peso − gordura (automático)
  if(peso&&mg){
    const magra=(peso-mg);
    if(mEl) mEl.value=magra.toFixed(1);
    if(mPctEl) mPctEl.value=((magra/peso)*100).toFixed(1);
  } else {
    if(mEl) mEl.value='';
    if(mPctEl) mPctEl.value='';
  }

  // Massa residual: se Óssea informada, residual exclui ela (Peso−Gordura−Músculo−Óssea).
  // Se Óssea não informada, residual absorve ela (Peso−Gordura−Músculo) — campo variável.
  if(peso&&mg&&mm){
    let residual, label;
    if(mo||mo===0){
      residual = peso-mg-mm-mo;
      label = 'Massa Residual (sem óssea)';
    } else {
      residual = peso-mg-mm;
      label = 'Massa Residual + Óssea';
    }
    if(rEl) rEl.value=residual.toFixed(1);
    if(rPctEl) rPctEl.value=((residual/peso)*100).toFixed(1);
    if(rLabelEl) rLabelEl.textContent=label;
  } else {
    if(rEl) rEl.value='';
    if(rPctEl) rPctEl.value='';
    if(rLabelEl) rLabelEl.textContent='Massa Residual';
  }

  // Alerta de coerência: Gordura + Músculo não pode exceder o peso total
  if(alerta){
    if(peso&&mg&&mm&&(mg+mm)>peso){
      alerta.style.display='block';
      alerta.textContent=`Gordura (${mg}kg) + Músculo (${mm}kg) excede o peso total (${peso}kg). Verifique os valores.`;
    } else { alerta.style.display='none'; }
  }
}

function calcRCQ(){
  const c=parseFloat(val('a-cintura')), q=parseFloat(val('a-quadril'));
  const el=$('a-rcq'), cls=$('a-rcq-class');
  if(!el) return;
  if(c&&q){
    const rcq=c/q;
    el.value=rcq.toFixed(2);
    if(cls){
      const sexo=val('p-sexo');
      // Cutoffs OMS por sexo (risco cardiovascular associado à distribuição de gordura)
      if(sexo==='F'){
        if(rcq<0.80)      cls.value='Baixo risco';
        else if(rcq<0.85) cls.value='Risco moderado';
        else              cls.value='Alto risco';
      } else if(sexo==='M'){
        if(rcq<0.90)      cls.value='Baixo risco';
        else if(rcq<1.00) cls.value='Risco moderado';
        else              cls.value='Alto risco';
      } else {
        cls.value='Informe o sexo no Perfil';
      }
    }
  } else {
    el.value='';
    if(cls) cls.value='';
  }
}

// ─── META — COMPOSIÇÃO CORPORAL ────────────────────────────────────────────────
// Referências IMC e %Gordura por sexo/faixa etária/nível — fornecidas pelo Milton.
const REF_IMC = {
  M:{'18-59':{'saude-1':21,  'saude0':22.5,'saude+1':24,  'magro':22,  'atletico':24.5,'musculoso':26.5},
     '60+'  :{'saude-1':23,  'saude0':25,  'saude+1':26.5,'magro':23.5,'atletico':25.5,'musculoso':27}},
  F:{'18-59':{'saude-1':20,  'saude0':21.7,'saude+1':23.5,'magro':21,  'atletico':23,  'musculoso':26},
     '60+'  :{'saude-1':23,  'saude0':24.5,'saude+1':26,  'magro':22.5,'atletico':24,  'musculoso':25.5}}
};
const REF_GORDURA = {
  M:{'18-59':{'saude-1':13,'saude0':17,'saude+1':19,'magro':12,'atletico':10,'musculoso':8},
     '60+'  :{'saude-1':18,'saude0':22,'saude+1':24,'magro':17,'atletico':15,'musculoso':13}},
  F:{'18-59':{'saude-1':17,'saude0':21,'saude+1':23,'magro':16,'atletico':14,'musculoso':12},
     '60+'  :{'saude-1':23,'saude0':27,'saude+1':29,'magro':22,'atletico':20,'musculoso':18}}
};
const META_NIVEL_LABELS = {
  'saude-1':'Saúde Leve','saude0':'Saúde Padrão','saude+1':'Saúde Robusto',
  'magro':'Magro','atletico':'Atlético','musculoso':'Musculoso','personalizado':'Personalizado'
};

// Residual preditivo (Würch 1973) + Óssea preditiva (aproximação, sem diâmetro —
// não existe fórmula validada sem punho/fêmur na literatura). Testado contra dado
// real: erro médio ~15-27%, mais alto em pessoas com %muscular baixo. Usar só
// como fallback quando não há Músculo medido, e sempre para a Meta (alvo hipotético).
const WURCH_PCT_RESIDUAL_COMBINADO = { M:24.1, F:20.9 };
const OSSO_PCT_APROX = { M:15.0, F:12.0 };

function metaFaixaEtaria(){
  const s=getActive(); if(!s) return '18-59';
  const nasc=s.perfil?.nascimento;
  if(!nasc) return '18-59';
  const idade=new Date().getFullYear()-new Date(nasc).getFullYear();
  return idade>=60 ? '60+' : '18-59';
}

function metaSexo(){
  const s=getActive();
  return (s?.perfil?.sexo==='F') ? 'F' : 'M';
}

// Retorna { peso_base, altura_cm, gordura_pct_base, musculo_pct_base, musculoInformado, fonteLabel }
// ou { erro: 'texto' } quando falta dado obrigatório.
// Óssea/Residual NUNCA são digitados — vira sempre Residual = Peso - Gordura - Músculo.
// Se Músculo não vier (só possível na fonte manual), musculoInformado=false e o cálculo final
// estima Músculo pela fórmula preditiva (ver calcMetaFinal).
function metaFonteDados(){
  const s=getActive(); if(!s) return {erro:'Nenhum aluno selecionado.'};
  const fonte = document.querySelector('input[name="meta-fonte"]:checked')?.value || 'anterior';
  if(fonte==='manual'){
    const unidade = document.querySelector('input[name="meta-unidade"]:checked')?.value || 'pct';
    const altura_cm = parseFloat(val('meta-manual-altura'))||0;
    const peso_base = parseFloat(val('meta-manual-peso'))||0;
    const gRaw = val('meta-manual-gordura');
    const mRaw = val('meta-manual-musculo');
    if(!altura_cm) return {erro:'Preencha a Altura (obrigatório).'};
    if(!peso_base) return {erro:'Preencha o Peso (obrigatório).'};
    if(!gRaw) return {erro:'Preencha a Gordura (obrigatório).'};
    const gordura_pct_base = unidade==='kg' ? (parseFloat(gRaw)/peso_base)*100 : parseFloat(gRaw);
    const musculoInformado = !!mRaw;
    const musculo_pct_base = musculoInformado ? (unidade==='kg' ? (parseFloat(mRaw)/peso_base)*100 : parseFloat(mRaw)) : null;
    return {peso_base, altura_cm, gordura_pct_base, musculo_pct_base, musculoInformado, fonteLabel:'dados inseridos manualmente'};
  }
  // fonte = anterior (última avaliação salva na Avaliação) — trava dura, sem fallback.
  // Lê o histórico (inclui avaliações enviadas pelo aluno no Portal); sem
  // histórico, cai no que estiver na ficha da Avaliação (dado antigo).
  const a=ultimaAvaliacaoAntro(s)||s.anamnese||{};
  const peso_base = parseFloat(a.peso)||0;
  const altura_cm = parseFloat(a.altura)||0;
  if(!peso_base || !altura_cm) return {erro:'A última avaliação não tem Peso/Altura preenchidos. Complete na aba Avaliação.'};
  if(!a.mgorda && !a.gordura) return {erro:'A última avaliação não tem Gordura preenchida. Complete na aba Avaliação.'};
  if(!a.mmuscular) return {erro:'A última avaliação não tem Músculo preenchido. Complete na aba Avaliação antes de calcular a Meta.'};
  const gordura_pct_base = parseFloat(a.gordura)|| (peso_base && a.mgorda ? (parseFloat(a.mgorda)/peso_base)*100 : 0);
  const musculo_pct_base = (parseFloat(a.mmuscular)/peso_base)*100;
  return {peso_base, altura_cm, gordura_pct_base, musculo_pct_base, musculoInformado:true, fonteLabel:'última avaliação ('+(a.data_avaliacao||'sem data')+')'};
}

// Óssea+Residual preditos (Würch + aproximação óssea) — usados sempre para a META,
// e para o ATUAL apenas quando Músculo não foi informado (fallback, menos preciso).
function residualPreditoKg(peso, sexo){
  return (WURCH_PCT_RESIDUAL_COMBINADO[sexo]/100)*peso + (OSSO_PCT_APROX[sexo]/100)*peso;
}

function onMetaFonteChange(){
  const manual = document.querySelector('input[name="meta-fonte"]:checked')?.value==='manual';
  toggle('meta-manual-bloco', manual);
  esconderErroMeta();
  atualizarBadgeFonte();
  _autosaveMeta(); // autosave — evita perder a escolha de fonte ao trocar de aba
}

function _updateMetaLabels(){
  const kg = document.querySelector('input[name="meta-unidade"]:checked')?.value==='kg';
  $('meta-manual-musculo-label').textContent = kg?'Músculo (kg) — opcional':'Músculo (%) — opcional';
  $('meta-manual-gordura-label').innerHTML = kg?'<b>Gordura (kg) *</b>':'<b>Gordura (%) *</b>';
  atualizarBadgeFonte();
}
function onMetaManualChange(){
  _updateMetaLabels();
  _autosaveMeta(); // autosave — evita perder os dados manuais digitados ao trocar de aba
}

function atualizarBadgeFonte(){
  const el=$('meta-fonte-badge'); if(!el) return;
  const d=metaFonteDados();
  if(d.erro){ el.textContent=''; return; }
  const metodo = d.musculoInformado ? 'Residual = Peso − Gordura − Músculo (direto)' : 'Músculo não informado — Residual/Músculo por predição (Würch, menos preciso)';
  el.textContent = `Base: ${d.fonteLabel} · ${metodo}`;
}

function esconderErroMeta(){ toggle('meta-erro', false); }
function mostrarErroMeta(msg){
  const el=$('meta-erro'); if(!el) return;
  el.textContent = msg;
  toggle('meta-erro', true);
}

// Nível de meta selecionado no dropdown → preenche IMC/Peso/%Gordura de referência
function onMetaNivelChange(){
  const nivel = val('meta-nivel');
  if(!nivel || nivel==='personalizado'){ toggle('meta-personalizado-badge', nivel==='personalizado'); _autosaveMeta(); return; }
  toggle('meta-personalizado-badge', false);
  const sexo=metaSexo(), faixa=metaFaixaEtaria();
  const imc = REF_IMC[sexo][faixa][nivel];
  const gordura = REF_GORDURA[sexo][faixa][nivel];
  setVal('meta-imc', imc);
  setVal('meta-gordura-pct', gordura);
  recalcPesoDeImc();
  _autosaveMeta(); // autosave — evita perder o Nível/IMC/Peso/%Gordura ao trocar de aba
}

function alturaMetros(){
  const d=metaFonteDados();
  if(d?.altura_cm) return d.altura_cm/100;
  const s=getActive();
  const alt=parseFloat(s?.anamnese?.altura);
  return alt ? alt/100 : 0;
}

function recalcPesoDeImc(){
  const h=alturaMetros(), imc=parseFloat(val('meta-imc'));
  if(h&&imc) setVal('meta-peso', (imc*h*h).toFixed(1));
}

function recalcImcDePeso(){
  const h=alturaMetros(), peso=parseFloat(val('meta-peso'));
  if(h&&peso) setVal('meta-imc', (peso/(h*h)).toFixed(1));
}

// Editar Peso ou IMC manualmente vira "Personalizado", mas mantém os valores atuais
// (não reseta a referência que estava selecionada).
function onMetaPesoChange(){
  recalcImcDePeso();
  if(val('meta-nivel')!=='personalizado'){ setVal('meta-nivel','personalizado'); toggle('meta-personalizado-badge', true); }
  _autosaveMeta(); // autosave — evita perder o Peso alvo editado ao trocar de aba
}
function onMetaImcChange(){
  recalcPesoDeImc();
  if(val('meta-nivel')!=='personalizado'){ setVal('meta-nivel','personalizado'); toggle('meta-personalizado-badge', true); }
  _autosaveMeta(); // autosave — evita perder o IMC alvo editado ao trocar de aba
}
function onMetaGorduraChange(){
  if(val('meta-nivel')!=='personalizado'){ setVal('meta-nivel','personalizado'); toggle('meta-personalizado-badge', true); }
  _autosaveMeta(); // autosave — evita perder a %Gordura alvo editada ao trocar de aba
}

// Botão "Calcular" — valida obrigatórios e só então roda o cálculo final.
function calcularMeta(){
  esconderErroMeta();
  const d=metaFonteDados();
  if(d.erro){ mostrarErroMeta(d.erro); $('meta-tabela-body').innerHTML='<tr><td colspan="4" style="color:var(--text3);text-align:center">Corrija o campo indicado acima e clique em Calcular</td></tr>'; return; }
  const pesoMeta = parseFloat(val('meta-peso'));
  const gorduraPctMeta = parseFloat(val('meta-gordura-pct'));
  if(!val('meta-nivel')){ mostrarErroMeta('Selecione um Nível de meta antes de calcular.'); return; }
  if(!pesoMeta || !gorduraPctMeta){ mostrarErroMeta('Preencha IMC/Peso/%Gordura alvo antes de calcular.'); return; }
  calcMetaFinal(d, pesoMeta, gorduraPctMeta);
}

// Monta a tabela final Atual vs Meta vs Diferença.
// ATUAL: se Músculo foi informado -> Residual = Peso - Gordura - Músculo (direto, "fórmula base").
//        se Músculo NÃO foi informado (só na fonte manual) -> Residual/Músculo por predição (fallback).
// META: sempre por predição (Würch + óssea aproximada), pois é um alvo hipotético, não medido.
function calcMetaFinal(d, pesoMeta, gorduraPctMeta){
  const sexo=metaSexo();
  const residualMeta = residualPreditoKg(pesoMeta, sexo);
  const gorduraKgMeta = (gorduraPctMeta/100) * pesoMeta;
  const musculoKgMeta = pesoMeta - gorduraKgMeta - residualMeta;

  const pesoAtual = d.peso_base;
  const gorduraKgAtual = (d.gordura_pct_base/100) * pesoAtual;
  let musculoKgAtual, residualKgAtual, avisoEstimativa='';
  if(d.musculoInformado){
    musculoKgAtual = (d.musculo_pct_base/100) * pesoAtual;
    residualKgAtual = pesoAtual - gorduraKgAtual - musculoKgAtual;
  } else {
    residualKgAtual = residualPreditoKg(pesoAtual, sexo);
    musculoKgAtual = pesoAtual - gorduraKgAtual - residualKgAtual;
    avisoEstimativa = '<div style="margin-bottom:10px;padding:8px 12px;background:var(--amber-dim);border:1px solid var(--amber-line);border-radius:var(--radius);font-size:12px;color:var(--amber)"><i class=ph-warning></i> Músculo não informado — Atual estimado por predição (erro esperado ~15-27% em testes com dados reais). Prefira informar o Músculo medido sempre que possível.</div>';
  }

  const linha=(label,atual,meta,unidade)=>{
    const diff=meta-atual;
    const sinal=diff>0?'+':'';
    const cor=Math.abs(diff)<0.05?'var(--text3)':(diff>0?'var(--accent)':'var(--red)');
    return `<tr>
      <td>${label}</td>
      <td style="font-variant-numeric:tabular-nums;">${atual.toFixed(1)}${unidade}</td>
      <td style="font-variant-numeric:tabular-nums;font-weight:600">${meta.toFixed(1)}${unidade}</td>
      <td style="font-variant-numeric:tabular-nums;color:${cor}">${sinal}${diff.toFixed(1)}${unidade}</td>
    </tr>`;
  };

  const body=$('meta-tabela-body');
  body.innerHTML =
    linha('Peso', pesoAtual, pesoMeta, ' kg') +
    linha('Gordura', gorduraKgAtual, gorduraKgMeta, ' kg') +
    linha('Músculo', musculoKgAtual, musculoKgMeta, ' kg') +
    linha('Residual (óssea+residual)', residualKgAtual, residualMeta, ' kg');

  const avisoEl=$('meta-aviso-estimativa');
  if(avisoEl) avisoEl.remove();
  if(avisoEstimativa){
    const div=document.createElement('div');
    div.innerHTML=avisoEstimativa;
    const el=div.firstElementChild;
    if(el){
      // O id tem que ir no elemento QUE ENTRA no DOM. Antes era setado no `div`
      // descartado e inseria-se `div.firstChild` — sem id. Consequencia: a
      // limpeza acima nunca achava o aviso, entao ele ACUMULAVA a cada recalculo
      // e continuava na tela mesmo depois do personal informar o Musculo medido,
      // dizendo "Musculo nao informado" sobre um dado que era medido.
      el.id='meta-aviso-estimativa';
      body.closest('table').insertAdjacentElement('beforebegin', el);
    }
  }

  const deltas = {
    pesoAtual, pesoMeta, pesoDelta: pesoMeta-pesoAtual,
    gorduraKgAtual, gorduraKgMeta, gorduraDelta: gorduraKgMeta-gorduraKgAtual,
    musculoKgAtual, musculoKgMeta, musculoDelta: musculoKgMeta-musculoKgAtual,
    residualKgAtual, residualMeta, residualDelta: residualMeta-residualKgAtual,
    musculoInformado: d.musculoInformado,
  };
  renderCardDivergenciaMeta(deltas);
  return deltas;
}

// Card informativo (não bloqueia) — avisa quando a Meta definida vai numa direção
// contrária ao objetivo principal do aluno. Tolerância de equilíbrio: 3 kg.
function renderCardDivergenciaMeta(deltas){
  const card=$('meta-card-divergencia');
  if(!card) return;
  const TOL = 3;
  const obj = selectedObj;
  const gd = deltas.gorduraDelta, md = deltas.musculoDelta;
  const linhas = [];
  if(obj==='Hip' || obj==='Forca'){
    const nomeObj = obj==='Hip' ? 'Hipertrofia' : 'Força';
    if(md<=-TOL) linhas.push(`Meta indica perda de músculo (${md.toFixed(1)} kg) — objetivo é ${nomeObj}, o esperado seria manter ou ganhar músculo.`);
    if(gd>=TOL) linhas.push(`Meta indica ganho de gordura (+${gd.toFixed(1)} kg) — confirme se é intencional (fase de volume) para o objetivo atual.`);
  } else if(obj==='Emagr'){
    if(gd>-TOL) linhas.push(`Meta não indica redução relevante de gordura (${gd>=0?'+':''}${gd.toFixed(1)} kg) — objetivo é Emagrecimento.`);
    if(md<=-TOL) linhas.push(`Meta também indica perda de músculo (${md.toFixed(1)} kg) — considere preservar massa magra durante o emagrecimento.`);
  } else if(obj==='Saude'){
    if(Math.abs(gd)>=TOL) linhas.push(`Meta indica variação relevante de gordura (${gd>=0?'+':''}${gd.toFixed(1)} kg) para um objetivo de Saúde/Manutenção.`);
    if(Math.abs(md)>=TOL) linhas.push(`Meta indica variação relevante de músculo (${md>=0?'+':''}${md.toFixed(1)} kg) para um objetivo de Saúde/Manutenção.`);
  }
  // Reabilitação (Reab): sem checagem de direção — objetivo não é definido por composição corporal.
  if(!linhas.length){ card.style.display='none'; card.innerHTML=''; return; }
  card.style.display='block';
  card.innerHTML = `<div style="display:flex;gap:8px;align-items:flex-start"><span><i class=ph-info></i></span><div><strong>Meta x Objetivo:</strong><ul style="margin:4px 0 0;padding-left:18px">${linhas.map(x=>`<li>${x}</li>`).join('')}</ul></div></div>`;
}

function renderMeta(){
  const s=getActive(); if(!s) return;
  const m=s.meta||{};
  esconderErroMeta();
  const avisoEl=$('meta-aviso-estimativa'); if(avisoEl) avisoEl.remove();
  const cardDiv=$('meta-card-divergencia'); if(cardDiv){ cardDiv.style.display='none'; cardDiv.innerHTML=''; }
  // Fonte
  const fonteEl=document.querySelector(`input[name="meta-fonte"][value="${m.fonte||'anterior'}"]`);
  if(fonteEl) fonteEl.checked=true;
  toggle('meta-manual-bloco', (m.fonte==='manual'));
  setVal('meta-manual-altura', m.manual_altura||'');
  setVal('meta-manual-peso', m.manual_peso||'');
  setVal('meta-manual-musculo', m.manual_musculo||'');
  setVal('meta-manual-gordura', m.manual_gordura||'');
  const unidadeEl=document.querySelector(`input[name="meta-unidade"][value="${m.manual_unidade||'pct'}"]`);
  if(unidadeEl) unidadeEl.checked=true;
  _updateMetaLabels(); // ajusta labels kg/% (sem marcar dirty)
  // Nível/IMC/Peso/%Gordura
  setVal('meta-nivel', m.nivel||'');
  setVal('meta-imc', m.imc||'');
  setVal('meta-peso', m.peso||'');
  setVal('meta-gordura-pct', m.gordura_pct||'');
  toggle('meta-personalizado-badge', m.nivel==='personalizado');
  atualizarBadgeFonte();
  $('meta-tabela-body').innerHTML = '<tr><td colspan="4" style="color:var(--text3);text-align:center">Preencha os dados e clique em Calcular</td></tr>';
}

function _autosaveMeta(){
  const s=getActive(); if(!s) return;
  const val = id => (document.getElementById(id)||{}).value||'';
  s.meta = {
    fonte: (document.querySelector('input[name="meta-fonte"]:checked')||{}).value||'anterior',
    manual_unidade: (document.querySelector('input[name="meta-unidade"]:checked')||{}).value||'pct',
    manual_altura: val('meta-manual-altura'), manual_peso: val('meta-manual-peso'),
    manual_musculo: val('meta-manual-musculo'), manual_gordura: val('meta-manual-gordura'),
    nivel: val('meta-nivel'), imc: val('meta-imc'), peso: val('meta-peso'),
    gordura_pct: val('meta-gordura-pct'),
  };
  _markDirty(); _saveDraft();
}
function salvarMeta(){
  _autosaveMeta();
  saveStudent();
  _clearDirty();
}

// Pares: id base → [idD, idE, idDelta]
const PARES_ASSIM = {
  'braco-rel':  ['a-braco-d',      'a-braco-e',      'delta-braco-rel'],
  'braco-cont': ['a-braco-d-cont', 'a-braco-e-cont', 'delta-braco-cont'],
  'coxa':       ['a-coxa-d',       'a-coxa-e',       'delta-coxa'],
  'pant':       ['a-pant-d',       'a-pant-e',       'delta-pant'],
};

const LABELS_ASSIM = {
  'braco-rel':'Braço relaxado', 'braco-cont':'Braço contraído',
  'coxa':'Coxa', 'pant':'Panturrilha'
};

function calcAssimetria(par){
  const [idD, idE, idDelta] = PARES_ASSIM[par];
  const d=parseFloat(document.getElementById(idD)?.value);
  const e=parseFloat(document.getElementById(idE)?.value);
  const el=$(idDelta); if(!el) return;
  if(d&&e){
    const delta=(d-e);
    const abs=Math.abs(delta);
    const lado=delta>0?'D>E':'E>D';
    const flag=abs>=1;
    el.innerHTML=`<span style="color:${flag?'var(--amber)':'var(--accent)'}">${delta>0?'+':''}${delta.toFixed(1)} cm ${lado}</span>`;
  } else { el.textContent='—'; }
  atualizarFlagAssimetria();
  onAnamneseChange();
}

function atualizarFlagAssimetria(){
  const flags=[];
  Object.entries(PARES_ASSIM).forEach(([par,[idD,idE]])=>{
    const d=parseFloat(document.getElementById(idD)?.value);
    const e=parseFloat(document.getElementById(idE)?.value);
    if(d&&e&&Math.abs(d-e)>=1){
      const delta=(d-e);
      flags.push(`${LABELS_ASSIM[par]}: ${delta>0?'+':''}${delta.toFixed(1)} cm (${delta>0?'D>E':'E>D'})`);
    }
  });
  const box=$('antro-flag-assim');
  const txt=$('antro-flag-assim-texto');
  if(!box||!txt) return;
  if(flags.length){
    box.style.display='block';
    txt.innerHTML=flags.join('<br>');
  } else { box.style.display='none'; }
}

function calcFCMax(){
  const nasc=val('p-nascimento');
  const el=$('a-fcmax'); if(!el||!nasc) return;
  const idade=new Date().getFullYear()-new Date(nasc).getFullYear();
  if(idade>0) el.value=(220-idade)+' bpm';
}

const FORCA_REF = {
  // [exe_index]: {M:[exc,bom,med,abaixo], F:[exc,bom,med,abaixo]} — limites de força relativa (1RM/PC)
  0:{M:[2.00,1.75,1.50,1.25],F:[1.50,1.25,1.00,0.75]}, // Agachamento
  2:{M:[1.50,1.25,1.00,0.75],F:[1.00,0.80,0.65,0.50]}, // Supino
};
const FORCA_LABELS=['Excelente','Bom','Médio','Abaixo da média','Fraco'];

function classForça(i, fr, sexo){
  const ref=FORCA_REF[i]; if(!ref) return '';
  const limites=sexo==='F'?ref.F:ref.M;
  for(let j=0;j<limites.length;j++){ if(fr>=limites[j]) return FORCA_LABELS[j]; }
  return 'Fraco';
}

function calc1RM(i){
  const caEls=document.querySelectorAll('.forca-carga');
  const rpEls=document.querySelectorAll('.forca-reps');
  const c=parseFloat(caEls[i]?.value), r=parseFloat(rpEls[i]?.value);
  const out=$('1rm-'+i), rel=$('frel-'+i);
  if(c&&r&&r<=15){
    const formula=val('a-formula-1rm')||'brzycki';
    let rm;
    if(formula==='epley')      rm=c*(1+r/30);
    else if(formula==='mayhew') rm=100*c/(52.2+41.9*Math.exp(-0.055*r));
    else                        rm=c/(1.0278-0.0278*r);
    if(out) out.textContent=rm.toFixed(1)+' kg';
    const peso=parseFloat(val('a-peso'));
    if(rel&&peso){
      const fr=(rm/peso);
      const sexo=val('p-sexo')||'M';
      const cls=classForça(i,fr,sexo);
      rel.innerHTML=`<span>${fr.toFixed(2)}×PC</span>${cls?`<br><span style="color:var(--text3);font-size:12px">${cls}</span>`:''}`;
    } else if(rel) rel.textContent='—';
  } else {
    if(out) out.textContent='—';
    if(rel) rel.textContent='—';
  }
  // Verificar alerta reps>10
  const alertEl=$('forca-reps-alerta');
  if(alertEl){
    const anyHigh=[...document.querySelectorAll('.forca-reps')].some(el=>parseFloat(el.value)>10);
    alertEl.style.display=anyHigh?'block':'none';
  }
}

function recalcAll1RM(){
  for(let i=0;i<9;i++) calc1RM(i);
}

function calcVO2(){
  const dist=parseFloat(val('a-cooper'));
  const el=$('a-vo2max'), cls=$('a-vo2max-class');
  if(!el) return;
  if(!dist){ el.value=''; if(cls) cls.value=''; return; }
  const vo2=((dist-504.9)/44.73);
  el.value=vo2.toFixed(1)+' ml/kg/min';
  // Classificação por sexo/idade
  if(cls){
    const sexo=val('p-sexo')||'M';
    const nasc=val('p-nascimento');
    const idade=nasc?(new Date().getFullYear()-new Date(nasc).getFullYear()):30;
    cls.value=classVO2(vo2,sexo,idade);
  }
}

function classVO2(vo2,sexo,idade){
  // Normas ACSM 11th ed. — simplificadas em 2 faixas por legibilidade
  const norms=sexo==='F'?[
    [18,25, [56,'Superior'],[47,'Excelente'],[42,'Bom'],[37,'Regular'],[32,'Fraco'],[0,'Muito fraco']],
    [26,35, [52,'Superior'],[45,'Excelente'],[39,'Bom'],[34,'Regular'],[29,'Fraco'],[0,'Muito fraco']],
    [36,45, [45,'Superior'],[38,'Excelente'],[34,'Bom'],[28,'Regular'],[23,'Fraco'],[0,'Muito fraco']],
    [46,55, [40,'Superior'],[34,'Excelente'],[29,'Bom'],[25,'Regular'],[20,'Fraco'],[0,'Muito fraco']],
    [56,65, [37,'Superior'],[31,'Excelente'],[26,'Bom'],[21,'Regular'],[17,'Fraco'],[0,'Muito fraco']],
    [66,99, [32,'Superior'],[27,'Excelente'],[22,'Bom'],[18,'Regular'],[15,'Fraco'],[0,'Muito fraco']],
  ]:[
    [18,25, [60,'Superior'],[52,'Excelente'],[47,'Bom'],[42,'Regular'],[37,'Fraco'],[0,'Muito fraco']],
    [26,35, [56,'Superior'],[49,'Excelente'],[43,'Bom'],[38,'Regular'],[33,'Fraco'],[0,'Muito fraco']],
    [36,45, [51,'Superior'],[43,'Excelente'],[38,'Bom'],[33,'Regular'],[28,'Fraco'],[0,'Muito fraco']],
    [46,55, [45,'Superior'],[38,'Excelente'],[33,'Bom'],[28,'Regular'],[24,'Fraco'],[0,'Muito fraco']],
    [56,65, [41,'Superior'],[34,'Excelente'],[29,'Bom'],[24,'Regular'],[20,'Fraco'],[0,'Muito fraco']],
    [66,99, [37,'Superior'],[30,'Excelente'],[26,'Bom'],[22,'Regular'],[18,'Fraco'],[0,'Muito fraco']],
  ];
  const row=norms.find(n=>idade>=n[0]&&idade<=n[1]);
  if(!row) return '—';
  for(let i=2;i<row.length;i++){ if(vo2>=row[i][0]) return row[i][1]; }
  return 'Muito fraco';
}

function calcVO2Step(){
  // McArdle 1972: VO2max estimado via YMCA Step Test
  // VO2max (ml/kg/min) = 65.81 − (0.1847 × FC_1min)
  const fc=parseFloat(val('a-step-fc'));
  const el=$('a-vo2max-step'); if(!el) return;
  if(!fc){ el.value=''; return; }
  const vo2=(65.81-0.1847*fc).toFixed(1);
  el.value=vo2>0?vo2+' ml/kg/min':'—';
}

function calcStepClass(){
  const fc=parseFloat(val('a-step-fc'));
  const el=$('a-step-class'); if(!el) return;
  if(!fc){ el.value=''; return; }
  // Norma YMCA Step Test — adultos jovens (McArdle 1972)
  if(fc<70)       el.value='Excelente (<70 bpm)';
  else if(fc<=85) el.value='Bom (70–85 bpm)';
  else if(fc<=100)el.value='Regular (86–100 bpm)';
  else            el.value='Fraco (>100 bpm)';
}

function calcSquatClass(){
  const reps=parseFloat(val('a-squat-reps'));
  const el=$('a-squat-class'); if(!el) return;
  if(!reps){ el.value=''; return; }
  if(reps>35)       el.value='Excelente (>35 reps)';
  else if(reps>=25) el.value='Bom (25–35 reps)';
  else if(reps>=15) el.value='Regular (15–24 reps)';
  else              el.value='Fraco (<15 reps)';
}

function calcPushupClass(){
  const reps=parseFloat(val('a-flexao'));
  const el=$('a-flexao-class'); if(!el) return;
  if(!reps){ el.value=''; return; }
  const modificada=document.getElementById('a-flexao-modificada')?.checked;
  const sexo=val('p-sexo')||'M';
  const nasc=val('p-nascimento');
  const idade=nasc?(new Date().getFullYear()-new Date(nasc).getFullYear()):30;
  // Se posição modificada, usar normas femininas independente do sexo (menor exigência)
  const usarF = sexo==='F' || modificada;
  const normsM=[[18,25,36,29,22,17],[26,35,35,22,17,12],[36,45,30,22,15,10],[46,55,25,17,13,8],[56,65,21,13,10,6],[66,99,18,11,8,5]];
  const normsF=[[18,25,30,21,15,10],[26,35,29,20,13,8],[36,45,26,15,12,8],[46,55,21,13,10,5],[56,65,19,11,7,4],[66,99,17,11,5,2]];
  const norms=usarF?normsF:normsM;
  const row=norms.find(n=>idade>=n[0]&&idade<=n[1])||norms[0];
  const labels=['Excelente','Acima da média','Média','Abaixo da média','Fraco'];
  const sufixo=modificada?' (posição modificada)':'';
  for(let i=0;i<4;i++){ if(reps>=row[i+2]){ el.value=labels[i]+sufixo; return; } }
  el.value='Fraco'+sufixo;
}

function calcYMCAClass(){
  const reps=parseFloat(val('a-abdominal-reps'));
  const el=$('a-ymca-class'); if(!el) return;
  if(!reps){ el.value=''; return; }
  const sexo=val('p-sexo')||'M';
  // Kushnick et al. 2020 — médias: M=34, F=25; P75=M≥42, F≥33; P25=M≤25, F≤17
  if(sexo==='F'){
    if(reps>=33)     el.value='Excelente (≥P75)';
    else if(reps>=25) el.value='Bom (P50–P75)';
    else if(reps>=17) el.value='Regular (P25–P50)';
    else              el.value='Fraco (<P25)';
  } else {
    if(reps>=42)     el.value='Excelente (≥P75)';
    else if(reps>=34) el.value='Bom (P50–P75)';
    else if(reps>=25) el.value='Regular (P25–P50)';
    else              el.value='Fraco (<P25)';
  }
}

function calcGripClass(){
  const d=parseFloat(val('a-grip-d')), e=parseFloat(val('a-grip-e'));
  const el=$('a-grip-class'); if(!el) return;
  if(!d&&!e){ el.value=''; return; }
  const parts=[];
  if(d&&e){
    const delta=Math.abs(d-e).toFixed(1);
    const maior=d>e?'D':'E';
    if(parseFloat(delta)>=2) parts.push(`Δ ${delta}kg (${maior} dominant) `);
    else parts.push(`Δ ${delta}kg`);
  }
  // Classificação simplificada — Massy-Westropp 2011
  const sexo=val('p-sexo')||'M';
  const media=((d||0)+(e||0))/(d&&e?2:1);
  if(sexo==='F'){
    if(media>=33) parts.push('Excelente');
    else if(media>=27) parts.push('Normal');
    else if(media>=20) parts.push('Abaixo da média');
    else parts.push('Fraco');
  } else {
    if(media>=52) parts.push('Excelente');
    else if(media>=44) parts.push('Normal');
    else if(media>=36) parts.push('Abaixo da média');
    else parts.push('Fraco');
  }
  el.value=parts.join(' · ');
}



function calcDelta(curId, antId, outId, higherIsBetter){
  const cur=parseFloat($(curId)?.value);
  const antTxt=$(antId)?.textContent;
  const ant=parseFloat(antTxt);
  const out=$(outId);
  if(!isNaN(cur)&&!isNaN(ant)&&ant>0){
    const d=(cur-ant).toFixed(1);
    out.textContent=(d>0?'+':'')+d;
    const positive = higherIsBetter ? d>0 : d<0;
    out.style.color = positive?'var(--accent)':'var(--red)';
  }
}

// ─── TABS ─────────────────────────────────────────────────────────────────────

function switchTab(name){
  const abaAtualEhPrescricao = $('tab-prescricao')?.classList.contains('active');
  if(abaAtualEhPrescricao && name!=='prescricao' && typeof temEdicaoDivisaoNaoSalva==='function' && temEdicaoDivisaoNaoSalva()){
    confirmarSairEdicaoDivisao(() => switchTabForcado(name));
    return;
  }
  _guardNav(() => switchTabForcado(name));
}

function switchTabForcado(name){
  ['perfil','anamnese','prescricao','evolucao'].forEach(t=>{
    toggle('panel-'+t, t===name);
    $('tab-'+t).classList.toggle('active', t===name);
  });
  if(name==='prescricao'){
    checkPrescWarning();
    renderizarTriagem();
    // Garante que a lista de treinos esteja visível ao entrar na aba
    if(typeof treinosMostrarLista==='function') treinosMostrarLista();
  }
}

function checkPrescWarning(){
  const s=getActive(); if(!s)return;
  toggle('presc-warning', !(s.perfil.nome&&s.anamnese.nivel));
}

// ─── OBJETIVO GRID ────────────────────────────────────────────────────────────

function renderObjGrid(){
  // Auto-selecionar baseado no objetivo_ef da anamnese se não houver seleção
  if(!selectedObj){
    const s=getActive();
    if(s&&s.anamnese&&s.anamnese.objetivo_ef){
      // objetivo_ef now stores codes directly; text values = legacy backward compat
      const mapa={
        'Hipertrofia':'Hip','Emagrecimento':'Emagr','Força':'Forca','Saúde':'Saude','Reabilitação':'Reab',
        'Composição Corporal':'Comp','Resistência Muscular':'Resist','Cond. Cardiorrespiratório':'CardioR',
        'Funcional / Mobilidade':'Func','Performance Esportiva':'Esport','Envelhecimento Ativo':'Envelhec'
      };
      const ef = s.anamnese.objetivo_ef || '';
      selectedObj = OBJETIVOS.find(o=>o.code===ef) ? ef : (mapa[ef] || '');
    }
  }
  const sel=$('pr-objetivo-principal'); if(!sel) return;
  const valorAtual = selectedObj || sel.value;
  sel.innerHTML = '<option value="">Selecionar</option>' +
    OBJETIVOS.map(o=>`<option value="${o.code}">${escHTML(o.label)}</option>`).join('');
  sel.value = valorAtual || '';
  renderAnaliseAvaliacao();
}

// Chamado pelo <select> de Objetivo principal (substitui o antigo obj-grid de cards).
function onObjetivoPrincipalChange(valor){
  selectedObj = valor;
  renderAnaliseAvaliacao();
  checkStep1();
  // Objetivo filtra quais Modelos de Divisão aparecem na tela de Distribuição
  // (ex: não mostrar Full Body Metabólico pra quem escolheu Hipertrofia) —
  // se o personal já tinha passado por lá e voltou pra trocar o objetivo,
  // atualiza a lista com o novo filtro.
  if(typeof _s3!=='undefined' && _s3.divisaoOpcoes && _s3.divisaoOpcoes.length){
    const freq    = val('pr-frequencia') || '3x';
    const numDias = parseInt(freq) || 3;
    const obj     = selectedObj || 'Saude';
    _s3.divisaoOpcoes    = gerarDivisoesBalanceadas(numDias, obj);
    _s3._divNumDias      = numDias;
    _s3._divChaveGeracao = numDias + '|' + obj;
    _s3.divisaoIdx       = Math.min(_s3.divisaoIdx||0, _s3.divisaoOpcoes.length - 1);
    _s3._dcEditando      = undefined;
    if(typeof renderTelaDivisao==='function') renderTelaDivisao();
  }
}

// ── Análise avaliação → meta ────────────────────────────────────────────────
// Regras simples sobre dado que a anamnese já calcula (nada de IA, só
// cruzamento): sinaliza conflito entre objetivo escolhido e o que a avaliação
// mostra, e sugere um objetivo quando o aluno ainda não declarou nenhum.
function analisarMetaAvaliacao(){
  const s = getActive();
  if(!s?.anamnese) return null;
  const a = s.anamnese, p = s.perfil||{};
  const avisos = [];
  let sugestao = null;

  const peso = parseFloat(a.peso), mg = parseFloat(a.mgorda);
  let pctGordura = null;
  if(peso && mg) pctGordura = (mg/peso)*100;
  const sexo = p.sexo;
  const limiteAltoGordura = sexo==='F' ? 32 : 25;

  if(pctGordura!=null && pctGordura>=limiteAltoGordura && !['Emagr','Comp'].includes(selectedObj)){
    avisos.push(`% de gordura estimado (${pctGordura.toFixed(1)}%) está acima da faixa saudável — considere Emagrecimento ou Composição Corporal como objetivo principal.`);
  }

  const gestante = a.gestacao==='Gestante';
  if(gestante && !['Saude','Reab','Comp'].includes(selectedObj)){
    avisos.push('Aluna gestante — objetivos de alta intensidade (Força Máxima, Hipertrofia agressiva) não são recomendados sem liberação específica. Priorize Saúde/Manutenção.');
  }

  const temCondicao = (p.condicoes||'Nenhuma') !== 'Nenhuma';
  if(temCondicao && p.liberacao!=='sim'){
    avisos.push('Condição clínica registrada no perfil sem liberação médica confirmada — obtenha a liberação antes de prescrever.');
  }

  if(a.nivel==='Inic' && selectedObj==='Forca'){
    avisos.push('Nível Iniciante com objetivo Força Máxima — considere uma fase de adaptação (Hipertrofia/Saúde) antes de intensidades de 1–5 reps.');
  }

  const { bloqueios } = extrairFlagsClinicas();
  if(bloqueios.includes('BaixoImpacto') && ['Forca','Esport'].includes(selectedObj)){
    avisos.push('IMC ≥30 identificado na avaliação — objetivos de alto impacto/potência pedem cautela adicional na seleção de exercícios.');
  }
  if(bloqueios.includes('DoresLombares') && selectedObj==='Forca'){
    avisos.push('Dor lombar registrada — reforce técnica e considere adiar cargas máximas em padrões de dobradiça de quadril.');
  }

  // Sugestão só quando o aluno ainda não declarou nenhum objetivo na anamnese
  if(!a.objetivo_ef && !selectedObj){
    if(gestante) sugestao = 'Saude';
    else if(pctGordura!=null && pctGordura>=limiteAltoGordura) sugestao = 'Emagr';
  }

  return { avisos, sugestao, pctGordura };
}

function renderAnaliseAvaliacao(){
  const box = $('analise-avaliacao');
  if(!box) return;
  const s = getActive();
  if(!s?.anamnese){ box.classList.add('hidden'); return; }
  const r = analisarMetaAvaliacao();
  if(!r || (!r.avisos.length && !r.sugestao)){ box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  let html = '<div style="display:flex;gap:8px;align-items:flex-start"><span><i class=ph-magnifying-glass></i></span><div>';
  if(r.sugestao){
    const label = OBJETIVOS.find(o=>o.code===r.sugestao)?.label || r.sugestao;
    html += `<div style="margin-bottom:4px"><strong>Sugestão baseada na avaliação:</strong> ${label}</div>`;
  }
  if(r.avisos.length){
    html += `<ul style="margin:0;padding-left:18px">${r.avisos.map(x=>`<li>${x}</li>`).join('')}</ul>`;
  }
  html += '</div></div>';
  box.innerHTML = html;
}

function preencherStep1DaAnamnese(){
  const s=getActive(); if(!s)return;
  const a=s.anamnese||{};
  // Nível
  if(a.nivel && !val('pr-nivel')){
    setVal('pr-nivel', a.nivel);
    const el=$('nivel-origem'); if(el) el.textContent='importado da Avaliação';
  } else if(val('pr-nivel') && val('pr-nivel') === a.nivel){
    const el=$('nivel-origem'); if(el) el.textContent='da Avaliação';
  }
  // Frequência (Rotina Atual — agora na subaba Histórico de Treino, salva em anamnese)
  if(a.frequencia && !val('pr-frequencia')){
    setVal('pr-frequencia', a.frequencia);
    const el=$('freq-origem'); if(el) el.textContent='importado da Avaliação';
  } else if(val('pr-frequencia') && val('pr-frequencia') === a.frequencia){
    const el=$('freq-origem'); if(el) el.textContent='da Avaliação';
  }
  // Bloco 3 (Dados Atuais de Treino) — importado uma vez, editável só nesta
  // prescrição. Ajustar aqui NUNCA escreve de volta em s.anamnese: o aluno
  // pode ter dito "Emagrecimento" na Anamnese e o personal decidir prescrever
  // "Hipertrofia" — o treino responde à escolha feita aqui, a Anamnese do
  // aluno continua com o que ele relatou.

  // Popula locais personalizados do LIBS ANTES do setVal — assim as opções
  // libs:X já existem quando tentamos restaurar o valor salvo no treino.
  // O pr-local é intencionalmente excluído do forEach abaixo; populateLocalSelect
  // já cuida de selecionar o valor correto (do treino ativo ou da anamnese).
  if(typeof populateLocalSelect === 'function'){
    // Prioridade: valor salvo no treino em andamento (_treinoEditId) > anamnese
    const tLocal = (typeof _treinoEditId !== 'undefined' && _treinoEditId != null)
      ? (getTreinoPorId(s, _treinoEditId)?.local || '')
      : '';
    populateLocalSelect(tLocal || a.local || '');
  }

  ['pr-objetivo-sec','pr-duracao','pr-horario','pr-gosta','pr-evitar'].forEach(id=>{
    if(!val(id)){
      const key = {'pr-objetivo-sec':'objetivo_sec','pr-duracao':'duracao','pr-horario':'horario',
        'pr-gosta':'gosta','pr-evitar':'preferencias'}[id];
      setVal(id, a[key]||'');
    }
  });
  renderObjGrid();
  checkStep1();
}

function checkStep1(){
  const ok=selectedObj&&val('pr-nivel')&&val('pr-frequencia');
  $('btn-step1-next').disabled=!ok;
  if(typeof atualizarResumoConfigGeral==='function') atualizarResumoConfigGeral();
}

// Recalcula a tabela de Volume (e, se aplicável, a tela de Divisão) quando o
// personal troca Nível ou Frequência DEPOIS de já ter passado por essas telas —
// sem isso, a tabela ficava "presa" nos valores calculados para a seleção anterior.
function onNivelOuFrequenciaChange(){
  checkStep1();
  const jaTemVolume = _s3 && _s3.volPorGrupo && Object.keys(_s3.volPorGrupo).length > 0;
  if(!jaTemVolume) return;
  iniciarTelaVolume();
  // Volume e Divisão ficam juntos na mesma tela — recarrega as opções de
  // divisão com o novo volume/frequência. Mudança real de nível/frequência
  // invalida qualquer edição de divisão em andamento (a estrutura de sessões
  // pode nem ter o mesmo nº de dias mais).
  if(_s3.divisaoOpcoes && _s3.divisaoOpcoes.length){
    const freq    = val('pr-frequencia') || '3x';
    const numDias = parseInt(freq) || 3;
    const obj     = selectedObj || 'Saude';
    _s3.divisaoOpcoes    = gerarDivisoesBalanceadas(numDias, obj);
    _s3._divNumDias      = numDias;
    _s3._divChaveGeracao = numDias + '|' + obj;
    _s3.divisaoIdx       = Math.min(_s3.divisaoIdx||0, _s3.divisaoOpcoes.length - 1);
    _s3._dcEditando      = undefined;
    renderTelaDivisao();
  }
}

// ─── STEPS ────────────────────────────────────────────────────────────────────

function goStep(n, silent){
  currentStep=n;
  for(let i=1;i<=4;i++){
    toggle('presc-step'+i, i===n);
    const el=$('step-'+i);
    el.className='step'+(i===n?' active':i<n?' done':'');
    el.querySelector('.step-num').innerHTML=i<n?'<i class=ph-check></i>':String(i);
  }
  if(n===1&&!silent) preencherStep1DaAnamnese();
  if(n===2&&!silent) fillStep3();
}
