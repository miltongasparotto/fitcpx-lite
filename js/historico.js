// ══════════════════════════════════════════════════════════════════════════
// HISTÓRICO DA FICHA (17/10/2026)
// Anamnese, avaliação antropométrica e treino são registros que se repetem no tempo:
// cada preenchimento vira uma LINHA NOVA e as anteriores ficam no histórico.
//  - Listas em linhas (classes .hx-* em css/app.css), com a mais recente marcada como "atual".
//  - Formulário em página própria (#fx-form), como o Cadastro: sem o cartão do aluno, só uma
//    linha de identificação (nome, idade e nível) e Cancelar / Salvar fixos no fim.
//  - Anamnese: s.anamneses[] (um registro por preenchimento). s.anamnese continua existindo e
//    espelha o registro mais recente, porque a prescrição, a triagem e o portal leem dali.
//    A avaliação antropométrica (s.avaliacoesAntro) e os treinos (s.treinos) já eram listas.
// Dados e cálculo ficam em avaliacao.js / treinos-store.js; aqui só a tela e o histórico da anamnese.
// ══════════════════════════════════════════════════════════════════════════

// ── helpers ──────────────────────────────────────────────────────────────
const HX_MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const HX_NIVEL = {Inic:'Iniciante', Inte:'Intermediário', Avan:'Avançado'};
function hxNum(v){ const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isNaN(n) ? null : n; }
function hxFmt(n, casas){ return n == null ? '—' : n.toFixed(casas == null ? 1 : casas).replace('.', ','); }
function hxSinal(n){ return (n > 0 ? '+' : n < 0 ? '−' : '') + hxFmt(Math.abs(n)); }
function hxIsoHoje(){ return typeof todayStr === 'function' ? todayStr() : _isoLocal(new Date()); }
function hxDataCel(d, atual){
  if(!d) return '<div class="hx-c"><div class="hx-main">—</div></div>';
  return '<div class="hx-c"><div class="hx-main">' + _alFmt(d) + '</div><div class="hx-sub2">' + _alHa(d)
    + (atual ? ' · <b class="hx-atual">atual</b>' : '') + '</div></div>';
}
function hxOrigem(o){ return '<span class="badge badge-gray">' + (o === 'aluno' ? 'Aluno' : 'Personal') + '</span>'; }
function hxVazio(icone, titulo, texto){
  return '<div class="empty hx-vazio"><i class=' + icone + '></i><div class="empty-title">' + titulo + '</div><div class="empty-text">' + texto + '</div></div>';
}
function hxContagens(s){
  const n = {'anamnese-hist': anamLista(s).length, 'anamnese-antro': (s.avaliacoesAntro || []).length};
  const rot = {'anamnese-hist': 'Anamnese', 'anamnese-antro': 'Antropométrica'};
  Object.keys(n).forEach(k => {
    const el = $('subtab-' + k); if(!el) return;
    el.innerHTML = rot[k] + (n[k] ? '<span class="sn">' + n[k] + '</span>' : '');
  });
}

// ── página do formulário ─────────────────────────────────────────────────
let _fxFormModo = null;          // 'anamnese' | 'antro' | 'treino' enquanto a página está aberta
const _FXF_MODOS = ['anamnese', 'antro', 'treino'];

function fxFormId(s){
  const p = s.perfil || {}, nome = p.nome || 'Aluno';
  const set = (id, fn) => { const el = $(id); if(el) fn(el); };
  set('fxf-nome', el => { el.textContent = nome; });
  set('fxf-voltar', el => { el.textContent = nome; });
  set('fxf-av', el => { _fxAvatarPinta(el, s); el.className = 'fx-av fx-st-' + _fxStatus(s).key; });
  set('fxf-info', el => {
    const idade = _fxIdade(p.nascimento), niv = _alNivel(s);
    el.innerHTML = (idade !== null ? '<span class="sep">·</span><span class="t">' + idade + ' anos</span>' : '')
      + (niv ? '<span class="sep">·</span><span class="t">' + escHTML(niv) + '</span>' : '');
  });
}

function fxFormAbrir(modo, titulo){
  const s = getActive(); if(!s || !_FXF_MODOS.includes(modo)) return;
  _fxFormModo = modo;
  _FXF_MODOS.forEach(m => toggle('fxf-' + m, m === modo));
  const t = $('fxf-titulo'); if(t) t.textContent = titulo || '';
  fxFormId(s);
  toggle('fx-ficha', false); toggle('fx-cadastro', false); toggle('fx-form', true);
  if(typeof fxStatusClose === 'function') fxStatusClose();
  const sc = $('fxf-scroll'); if(sc) sc.scrollTop = 0;
  const v = $('fx-form'); if(v) v.scrollTop = 0;
}

// Fecha a página e volta para a ficha. modo opcional: só fecha se for aquela página (loadStudentData chama as listas sem saber).
function fxFormFechar(modo){
  if(_fxFormModo === null) return;
  if(modo && _fxFormModo !== modo) return;
  const s = getActive();
  _fxFormModo = null;
  _anamEditId = null;
  toggle('fx-form', false); toggle('fx-ficha', true);
  if(s){
    anamAplicarAtual(s);                       // a ficha sempre mostra o registro mais recente
    antroAplicarAtual(s);
    anamPreencherForm(s);
    renderAnamLista(); renderAntroLista();
    if(typeof renderTreinosLista === 'function') renderTreinosLista();
    updateHeader(s);
  }
}

// Botão "← nome do aluno" do topo: sai da página (pergunta se há alteração não salva)
function fxFormVoltar(){
  if(_fxFormModo === 'treino' && typeof confirmarSairEdicaoDivisao === 'function'){ confirmarSairEdicaoDivisao(treinosVoltarLista); return; }
  _guardNav(() => fxFormFechar());
}

// ── anamnese: histórico (s.anamneses[]) ──────────────────────────────────
// Campos do formulário de anamnese que ficam em s.anamnese e campos de saúde que ficam em s.perfil (compartilhados com NUT/FT).
const ANAM_CHAVES = ['tempo','consistencia','nivel','objetivo_ef','objetivo_sec','frequencia','duracao','horario','local','local_info',
  'gosta','preferencias','gosta_ex','evitar_ex','sintomas','gestacao','trimestre','lesoes_passadas','cirurgias','gosta_texto','evitar_texto'];
const ANAM_SAUDE = ['liberacao','condicoes','medicamentos','medicamentos_detalhe','lesoes','obs_clinicas'];
let _anamEditId = null;

const _anamVazio = v => v === undefined || v === null || v === '';
const _anamClone = v => (v && typeof v === 'object') ? JSON.parse(JSON.stringify(v)) : v;
function anamLista(s){ return (s && Array.isArray(s.anamneses)) ? s.anamneses : []; }
function anamOrdenadas(s){
  return anamLista(s).slice().sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')) || (b.id || 0) - (a.id || 0));
}
function anamSnapshot(s){
  const a = s.anamnese || {}, p = s.perfil || {}, r = {}, sa = {};
  ANAM_CHAVES.forEach(k => { if(!_anamVazio(a[k])) r[k] = _anamClone(a[k]); });
  ANAM_SAUDE.forEach(k => { if(!_anamVazio(p[k])) sa[k] = p[k]; });
  r.saude = sa;
  return r;
}
function anamIgual(a, b){
  const norm = o => JSON.stringify(ANAM_CHAVES.map(k => _anamVazio(o[k]) ? null : o[k]).concat(ANAM_SAUDE.map(k => _anamVazio((o.saude || {})[k]) ? null : o.saude[k])));
  return norm(a) === norm(b);
}
// Copia um registro para s.anamnese e s.perfil (é de lá que a prescrição e a triagem leem)
function anamAplicarRegistro(s, rec){
  s.anamnese = s.anamnese || {}; s.perfil = s.perfil || {};
  ANAM_CHAVES.forEach(k => { if(rec && !_anamVazio(rec[k])) s.anamnese[k] = _anamClone(rec[k]); else delete s.anamnese[k]; });
  ANAM_SAUDE.forEach(k => { const v = rec && rec.saude ? rec.saude[k] : undefined; if(!_anamVazio(v)) s.perfil[k] = v; else delete s.perfil[k]; });
  const nivel = calcularNivelTreino(s.anamnese.tempo, s.anamnese.consistencia);
  if(nivel) s.anamnese.nivel = nivel;
}
function anamAplicarAtual(s){
  const ult = anamOrdenadas(s)[0];
  if(ult) anamAplicarRegistro(s, ult);
}
// Data do primeiro registro de quem já tinha anamnese: a anamnese antiga não guardava data. Usa a primeira avaliação, senão o dia do cadastro.
function anamDataInicial(s){
  const avs = (s.avaliacoesAntro || []).map(r => r.data_avaliacao).filter(d => _alDia(d)).sort();
  if(avs.length) return avs[0];
  const c = new Date(s.id);
  if(!isNaN(c) && c.getFullYear() >= 2020 && c <= new Date()) return _isoLocal(c);
  return hxIsoHoje();
}
// Primeira vez: o que já existe em s.anamnese vira o primeiro registro. Depois: se o portal gravou direto em s.anamnese
// (versão antiga da aluno-api), o que mudou vira um registro novo do aluno. Idempotente.
function anamMigrar(s){
  if(!s || typeof s !== 'object') return;
  if(!Array.isArray(s.anamneses)) s.anamneses = [];
  const p = s.perfil || {};
  const snap = anamSnapshot(s);
  if(!ANAM_CHAVES.some(k => !_anamVazio(snap[k])) && !Object.keys(snap.saude).length) return;
  const ult = anamOrdenadas(s)[0];
  const doAluno = !!p.alunoUserId;
  if(!ult){
    s.anamneses.push(Object.assign({id: novoId(), data: anamDataInicial(s), origem: doAluno ? 'aluno' : 'personal', responsavel: '', migrada: true}, snap));
  } else if(doAluno && !anamIgual(snap, ult)){
    s.anamneses.push(Object.assign({id: novoId(), data: hxIsoHoje(), origem: 'aluno', responsavel: 'Portal do aluno'}, snap));
  }
}

// Preenche os campos do formulário (anamnese + saúde) a partir de s.anamnese e s.perfil
function anamPreencherForm(s){
  const p = s.perfil || {}, a = s.anamnese || {};
  setVal('p-liberacao', p.liberacao || '');
  carregarCondicoes(p.condicoes || '');
  carregarMedicamentos(p.medicamentos || '');
  setVal('p-medicamentos-detalhe', p.medicamentos_detalhe || '');
  carregarLesoes(p.lesoes || '');
  setVal('p-obs-clinicas', p.obs_clinicas || '');
  ['nivel','tempo','consistencia','frequencia','duracao','horario','local','gosta','preferencias','cirurgias','lesoes_passadas','gestacao']
    .forEach(k => setVal('a-' + k.replace(/_/g, '-'), a[k] || ''));
  const T2C = {'Hipertrofia':'Hip','Emagrecimento':'Emagr','Força':'Forca','Saúde':'Saude','Reabilitação':'Reab','Composição Corporal':'Comp',
    'Resistência Muscular':'Resist','Cond. Cardiorrespiratório':'CardioR','Funcional / Mobilidade':'Func','Performance Esportiva':'Esport','Envelhecimento Ativo':'Envelhec'};
  _initObjetivoAnamnese(T2C[a.objetivo_ef] || a.objetivo_ef || '', T2C[a.objetivo_sec] || a.objetivo_sec || '');
  _populateLocalSelect(a.local || '');
  carregarSintomas(a.sintomas || '');
  _exPickerLoad(a.gosta_ex || '', a.evitar_ex || '');
  renderTextoAlunoExercicios(a);
  toggleTrimestre();
}

function anamQuem(){ return (typeof _supaUser !== 'undefined' && _supaUser && _supaUser.email) || 'Modo teste (local)'; }
function _anamTravado(s){
  if(typeof alunoTravado === 'function' && alunoTravado(s)){ alert('Cadastro em transferência: só visualização.'); return true; }
  return false;
}
function _anamCopiarOpcoes(s, selecionado){
  const sel = $('a-copiar'); if(!sel) return;
  const ord = anamOrdenadas(s);
  sel.innerHTML = ord.map((r, i) => '<option value="' + r.id + '"' + (String(r.id) === String(selecionado) ? ' selected' : '') + '>'
    + _alFmt(_alDia(r.data)) + (i === 0 ? ' (mais recente)' : '') + '</option>').join('')
    + '<option value=""' + (selecionado === '' ? ' selected' : '') + '>Começar em branco</option>';
  toggle('anam-copiar-box', ord.length > 0);
}

function anamNova(){
  const s = getActive(); if(!s || _anamTravado(s)) return;
  _anamEditId = null;
  const ult = anamOrdenadas(s)[0];
  anamAplicarRegistro(s, ult || null);          // sem registro nenhum, o formulário nasce em branco
  anamPreencherForm(s);
  _anamCopiarOpcoes(s, ult ? ult.id : '');
  setVal('a-data-anamnese', hxIsoHoje());
  setVal('a-origem-ro', 'Personal');
  fxFormAbrir('anamnese', 'Nova anamnese');
}
function anamCopiar(v){
  const s = getActive(); if(!s) return;
  const rec = v === '' ? null : anamLista(s).find(r => String(r.id) === String(v));
  anamAplicarRegistro(s, rec || null);
  anamPreencherForm(s);
  _markDirty();
}
function anamAbrir(id){
  const s = getActive(); if(!s) return;
  const rec = anamLista(s).find(r => String(r.id) === String(id)); if(!rec) return;
  _anamEditId = rec.id;
  anamAplicarRegistro(s, rec);
  anamPreencherForm(s);
  toggle('anam-copiar-box', false);
  setVal('a-data-anamnese', rec.data || hxIsoHoje());
  setVal('a-origem-ro', rec.origem === 'aluno' ? 'Aluno (portal)' : 'Personal');
  fxFormAbrir('anamnese', 'Anamnese de ' + _alFmt(_alDia(rec.data)));
}
function anamDataMudou(){ _markDirty(); }

function anamSalvar(){
  const s = getActive(); if(!s || _anamTravado(s)) return;
  const data = val('a-data-anamnese');
  if(!data){ alert('Informe a data da anamnese.'); const d = $('a-data-anamnese'); if(d) d.focus(); return; }
  onPerfilChange(); onAnamneseChange();         // junta o que está na tela em s.perfil e s.anamnese
  const snap = anamSnapshot(s);
  if(!Array.isArray(s.anamneses)) s.anamneses = [];
  const rec = _anamEditId != null ? s.anamneses.find(r => r.id === _anamEditId) : null;
  if(rec){
    ANAM_CHAVES.forEach(k => { delete rec[k]; });
    Object.assign(rec, snap, {data});
  } else {
    s.anamneses.push(Object.assign({id: novoId(), data, origem: 'personal', responsavel: anamQuem()}, snap));
  }
  anamAplicarAtual(s); antroAplicarAtual(s);
  _anamEditId = null;
  saveStudent(); _clearDirty();
  fxFormFechar('anamnese');
}
function anamCancelar(){
  const s = getActive(); if(!s) return;
  _formDirty = false;
  _revertStudent();
  const s2 = getActive(); if(s2) loadStudentData(s2);
  fxFormFechar('anamnese');
}
function anamExcluir(id){
  const s = getActive(); if(!s || _anamTravado(s)) return;
  const rec = anamLista(s).find(r => String(r.id) === String(id)); if(!rec) return;
  if(!confirmarExclusao('anamnese', rotuloDoItem('anamnese', rec))) return;
  arquivarItem('anamnese', rec, {ownerId: s.id, ownerNome: s.perfil && s.perfil.nome});
  s.anamneses = s.anamneses.filter(r => r.id !== rec.id);
  if(anamLista(s).length) anamAplicarAtual(s); else anamAplicarRegistro(s, null);   // sem registro nenhum, a ficha fica sem anamnese
  saveStudent();
  anamPreencherForm(s);
  renderAnamLista(); updateHeader(s); renderStudentList();
}

// ── anamnese: lista ──────────────────────────────────────────────────────
function anamObjLabel(c){ return !c ? '' : (typeof TREINOS_OBJ_LABEL !== 'undefined' && TREINOS_OBJ_LABEL[c]) || c; }
function anamRestricoes(rec){
  const sa = rec.saude || {}, itens = [];
  [sa.lesoes, sa.condicoes].forEach(txt => String(txt || '').split(' | ').forEach(x => {
    x = x.trim().replace(/^Outros: /, '');
    if(x && x !== 'Nenhuma' && x !== 'Nenhum' && itens.indexOf(x) < 0) itens.push(x);
  }));
  return itens;
}
function renderAnamLista(){
  const s = getActive(), cont = $('anam-lista-tabela'); if(!cont || !s) return;
  hxContagens(s);
  const lista = anamOrdenadas(s);
  if(!lista.length){
    cont.innerHTML = hxVazio('ph-clipboard-text', 'Nenhuma anamnese ainda', 'Use Nova anamnese para registrar a primeira.');
    return;
  }
  cont.innerHTML = lista.map((r, i) => {
    const obj = anamObjLabel(r.objetivo_ef), sec = anamObjLabel(r.objetivo_sec);
    const niv = HX_NIVEL[r.nivel] || r.nivel || '';
    const rs = anamRestricoes(r);
    const chips = rs.length
      ? rs.slice(0, 2).map(x => '<span class="badge badge-amber"><i class=ph-warning-circle></i>' + escHTML(x) + '</span>').join('')
        + (rs.length > 2 ? '<span class="badge badge-gray">+' + (rs.length - 2) + '</span>' : '')
      : '<span class="hx-sub2">Nenhuma</span>';
    return '<div class="hx-tr' + (i === 0 ? ' atual' : '') + '" onclick="anamAbrir(' + r.id + ')">'
      + hxDataCel(_alDia(r.data), i === 0)
      + '<div class="hx-r2">'
      +   '<div class="hx-c" data-l="Objetivo"><div class="hx-main">' + (obj ? escHTML(obj) : '—') + '</div>'
      +     (sec ? '<div class="hx-sub2">e ' + escHTML(sec.toLowerCase()) + '</div>' : '') + '</div>'
      +   '<div class="hx-c" data-l="Frequência"><div class="hx-v">' + (r.frequencia ? escHTML(r.frequencia) : '—') + '</div></div>'
      +   '<div class="hx-c" data-l="Nível">' + (niv ? '<span class="badge ' + _nivelColor(niv) + '">' + escHTML(niv) + '</span>' : '<span class="hx-sub2">—</span>') + '</div>'
      +   '<div class="hx-c hx-w" data-l="Restrições"><div class="hx-chips">' + chips + '</div></div>'
      +   '<div class="hx-c hx-lo" data-l="Origem">' + hxOrigem(r.origem) + '</div>'
      + '</div>'
      + '<div class="hx-acoes"><button type="button" class="btn btn-ghost btn-xs" onclick="event.stopPropagation();anamAbrir(' + r.id + ')">Abrir</button>'
      +   '<button type="button" class="icon-btn" onclick="event.stopPropagation();anamExcluir(' + r.id + ')" title="Excluir anamnese" aria-label="Excluir anamnese"><i class=ph-trash></i></button></div>'
      + '</div>';
  }).join('');
}

// ── antropometria: a lista ficou em avaliacao.js (renderAntroLista); aqui o espelho em s.anamnese ──
// Os motores de cálculo leem s.anamnese; ela sempre espelha a avaliação MAIS RECENTE (não a que acabou de ser editada).
function antroAplicarAtual(s){
  const lista = (s && s.avaliacoesAntro || []).slice().sort((a, b) => String(b.data_avaliacao || '').localeCompare(String(a.data_avaliacao || '')));
  const ult = lista[0]; if(!ult) return;
  s.anamnese = s.anamnese || {};
  ANTRO_SNAPSHOT_IDS.forEach(id => { const k = antroChaveDoId(id); s.anamnese[k] = ult[k] || ''; });
}

// ── acordeão da prescrição (17/10/2026): resumo em uma linha que abre o corpo no celular e no tablet; no notebook só o corpo aparece ──
const _prAccEstado = {};
function prAcc(icone, titulo, resumo, corpo, opt){
  opt = opt || {};
  const aberto = opt.key && opt.key in _prAccEstado ? _prAccEstado[opt.key] : !!opt.aberto;
  return '<div class="pr-acc' + (aberto ? ' aberto' : '') + (opt.cls ? ' ' + opt.cls : '') + '"' + (opt.key ? ' data-key="' + opt.key + '"' : '') + '>'
    + '<button type="button" class="pr-acc-h" onclick="prAccToggle(this)" aria-expanded="' + aberto + '"><i class=' + icone + '></i>'
    + '<span class="pr-acc-t"><b>' + titulo + '</b><span>' + resumo + '</span></span><i class="ph-caret-down pr-acc-c"></i></button>'
    + '<div class="pr-acc-b">' + corpo + '</div></div>';
}
function prAccToggle(btn){
  const a = btn.closest('.pr-acc'); if(!a) return;
  const on = a.classList.toggle('aberto');
  btn.setAttribute('aria-expanded', on);
  if(a.dataset.key) _prAccEstado[a.dataset.key] = on;
}
