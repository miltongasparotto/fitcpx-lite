// Telefone com código do país: botão do código (bandeira + código; abre uma lista com busca) + campo do número.
// Usado pelo painel e pelo portal do aluno. Depende de js/paises.js e css/telefone.css.
//
// Guardado SEMPRE com o código: "+55 (11) 98765-4321" (Brasil, com máscara) ou "+351 912 345 678" (outro país).
// O WhatsApp precisa do código para abrir a conversa de aluno de outro país. Número antigo, sem código,
// é lido com o código padrão (Configurações > Marca; sem configuração, +55) e passa a ser guardado com ele no próximo Salvar.
//
// Marcação (foneHTML monta isso; no HTML fixo, repetir):
//   <div class="fx-tel">
//     <button type="button" class="fx-tel-ddi" id="X-ddi" data-ddi="55" onclick="foneAbrir(this)">…</button>
//     <input class="fx-tel-num" id="X" oninput="foneDigitou(this)[;callback]">
//   </div>
// Mudou o país: foneEscolher() dispara "input" no campo do número, e o oninput dele (máscara + callback) roda.

function foneDdiPadrao(){
  const c = (typeof waDdiPadrao === 'function') ? waDdiPadrao() : '55';
  return String(c).replace(/\D/g, '') || '55';
}
// (11) 99999-0000 ou (11) 9999-0000
function foneMascaraBR(s){
  const d = String(s || '').replace(/\D/g, '').slice(0, 11);
  if(d.length <= 2) return d ? '(' + d : '';
  const corte = d.length > 10 ? 7 : 6;
  return '(' + d.slice(0, 2) + ') ' + d.slice(2, corte) + (d.length > corte ? '-' + d.slice(corte) : '');
}
// Qualquer forma guardada -> { ddi:'55', num:'(11) 98765-4321' }
function foneParse(v){
  v = String(v || '').trim();
  const pad = foneDdiPadrao();
  if(!v) return { ddi: pad, num: '' };
  if(v.charAt(0) === '+'){
    const resto = v.slice(1);
    if(resto.startsWith(pad)) return { ddi: pad, num: resto.slice(pad.length).trim() };
    const m = v.match(/^\+(\d{1,3})\s*(.*)$/);
    return m ? { ddi: m[1], num: m[2] } : { ddi: pad, num: v };
  }
  const d = v.replace(/\D/g, '');
  if(pad === '55' && d.startsWith('55') && d.length > 11) return { ddi: pad, num: d.slice(2) };
  return { ddi: pad, num: v };
}
// código + número -> valor guardado
function foneMontar(ddi, num){
  num = String(num || '').trim();
  ddi = String(ddi || '').replace(/\D/g, '') || foneDdiPadrao();
  if(!num) return '';
  return ddi === '55' ? '+55 ' + foneMascaraBR(num) : '+' + ddi + ' ' + num;
}
// para mostrar na tela: sempre com o código
function foneExibir(v){ const p = foneParse(v); return foneMontar(p.ddi, p.num); }
// número inteiro o bastante para uso (Brasil: DDD + 8 ou 9 dígitos)
function foneCompleto(v){
  const p = foneParse(v), n = p.num.replace(/\D/g, '').length;
  return p.ddi === '55' ? n >= 10 : n >= 5;
}

function _foneEsc(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
function _foneEl(id){ return document.getElementById(id); }
function _fonePlaceholder(ddi){ return ddi === '55' ? '(00) 00000-0000' : 'Número com DDD'; }
function _foneBtnConteudo(ddi, iso){
  const p = paisPorDdi(ddi, iso);
  return '<span class="fx-flag" aria-hidden="true">' + (p ? paisBandeira(p[0]) : '') + '</span><span class="fx-ddi-n">+' + _foneEsc(ddi) + '</span><i class="ph-caret-down" aria-hidden="true"></i>';
}
function _fonePintaBtn(btn, ddi, iso){
  const p = paisPorDdi(ddi, iso);
  btn.dataset.ddi = ddi;
  btn.dataset.iso = p ? p[0] : '';
  btn.innerHTML = _foneBtnConteudo(ddi, iso);
  btn.setAttribute('aria-label', 'Código do país: ' + (p ? p[1] + ' ' : '') + '+' + ddi + '. Tocar para trocar.');
}

function foneHTML(id, valor, o){
  o = o || {};
  const p = foneParse(valor), on = o.on ? ';' + o.on : '';
  const num = p.ddi === '55' ? foneMascaraBR(p.num) : p.num;
  const pais = paisPorDdi(p.ddi);
  return '<div class="fx-tel"><button type="button" class="fx-tel-ddi" id="' + id + '-ddi" data-ddi="' + _foneEsc(p.ddi) + '" data-iso="' + (pais ? pais[0] : '') +
    '" aria-haspopup="dialog" aria-expanded="false" aria-label="Código do país: ' + (pais ? _foneEsc(pais[1]) + ' ' : '') + '+' + _foneEsc(p.ddi) + '. Tocar para trocar." onclick="foneAbrir(this)">' + _foneBtnConteudo(p.ddi) + '</button>' +
    '<input type="text" class="fx-tel-num" id="' + id + '" value="' + _foneEsc(num) + '" inputmode="tel" placeholder="' + _fonePlaceholder(p.ddi) + '" autocomplete="tel-national" oninput="foneDigitou(this)' + on + '"></div>';
}
function foneCarregar(id, valor){
  const n = _foneEl(id), b = _foneEl(id + '-ddi'); if(!n || !b) return;
  const p = foneParse(valor);
  _fonePintaBtn(b, p.ddi);
  n.value = p.ddi === '55' ? foneMascaraBR(p.num) : p.num;
  n.placeholder = _fonePlaceholder(p.ddi);
}
// valor guardado do campo ('' se o número está vazio)
function foneLer(id){
  const n = _foneEl(id), b = _foneEl(id + '-ddi'); if(!n) return '';
  return foneMontar(b ? b.dataset.ddi : '', n.value);
}
// oninput do número: máscara conforme o código
function foneDigitou(el){
  const w = el.closest('.fx-tel'); if(!w) return;
  const b = w.querySelector('.fx-tel-ddi'), ddi = b ? b.dataset.ddi : '';
  el.value = ddi === '55' ? foneMascaraBR(el.value) : el.value.replace(/[^\d\s().-]/g, '').slice(0, 20);
  el.placeholder = _fonePlaceholder(ddi);
}
// troca o país do campo (clique na lista ou código de teste)
function foneEscolher(id, ddi, iso){
  const n = _foneEl(id), b = _foneEl(id + '-ddi'); if(!n || !b) return;
  ddi = String(ddi || '').replace(/\D/g, ''); if(!ddi) return;
  _fonePintaBtn(b, ddi, iso);
  const espelho = b.dataset.espelho && _foneEl(b.dataset.espelho);   // campo escondido que guarda só o código (Marca)
  if(espelho) espelho.value = ddi;
  n.dispatchEvent(new Event('input', { bubbles: true }));            // roda a máscara e o callback do campo
}

// ── Lista de países (abre ao tocar no código) ────────────────────────────────
let _fonePop = null;   // { raiz, fundo, busca, lista, btn }
const _foneSemAcento = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
let _fonePaisesOrd = null;
function _fonePaises(){
  if(!_fonePaisesOrd){
    const [br, ...resto] = PAISES_DDI;
    _fonePaisesOrd = [br].concat(resto.slice().sort((a, b) => a[1].localeCompare(b[1], 'pt-BR')));
  }
  return _fonePaisesOrd;
}
function _foneMontaPop(){
  if(_fonePop) return _fonePop;
  const fundo = document.createElement('div'); fundo.className = 'fone-fundo'; fundo.hidden = true;
  const raiz = document.createElement('div'); raiz.className = 'fone-pop'; raiz.hidden = true;
  raiz.setAttribute('role', 'dialog'); raiz.setAttribute('aria-label', 'Escolher o país do telefone');
  const caixa = document.createElement('div'); caixa.className = 'fone-busca';
  const lupa = document.createElement('i'); lupa.className = 'ph-magnifying-glass'; lupa.setAttribute('aria-hidden', 'true');
  const busca = document.createElement('input'); busca.type = 'search'; busca.placeholder = 'Buscar país ou código';
  busca.setAttribute('aria-label', 'Buscar país ou código'); busca.autocomplete = 'off'; busca.spellcheck = false;
  caixa.appendChild(lupa); caixa.appendChild(busca);
  const lista = document.createElement('div'); lista.className = 'fone-lista'; lista.setAttribute('role', 'listbox');
  raiz.appendChild(caixa); raiz.appendChild(lista);
  document.body.appendChild(fundo); document.body.appendChild(raiz);
  _fonePop = { raiz, fundo, busca, lista, btn: null };
  fundo.addEventListener('mousedown', foneFechar);
  busca.addEventListener('input', () => _foneRender(busca.value));
  busca.addEventListener('keydown', e => {
    const its = [...lista.querySelectorAll('.fone-it')]; if(!its.length && e.key !== 'Escape') return;
    let i = its.findIndex(x => x.classList.contains('on'));
    if(e.key === 'ArrowDown'){ e.preventDefault(); i = Math.min(its.length - 1, i + 1); }
    else if(e.key === 'ArrowUp'){ e.preventDefault(); i = Math.max(0, i - 1); }
    else if(e.key === 'Enter'){ e.preventDefault(); if(its[Math.max(i, 0)]) its[Math.max(i, 0)].click(); return; }
    else if(e.key === 'Escape'){ e.preventDefault(); foneFechar(true); return; }
    else return;
    its.forEach(x => x.classList.remove('on')); if(its[i]){ its[i].classList.add('on'); its[i].scrollIntoView({ block: 'nearest' }); }
  });
  lista.addEventListener('click', e => {
    const it = e.target.closest('.fone-it'); if(!it || !_fonePop.btn) return;
    const b = _fonePop.btn, id = b.id.replace(/-ddi$/, '');
    foneFechar(true);
    foneEscolher(id, it.dataset.ddi, it.dataset.iso);
    const n = _foneEl(id); if(n) n.focus();
  });
  return _fonePop;
}
function _foneRender(q){
  const { lista, btn } = _fonePop;
  const t = _foneSemAcento(q).trim(), dig = t.replace(/\D/g, '');
  const atual = btn ? btn.dataset.ddi : '', atualIso = btn ? btn.dataset.iso : '';
  const itens = _fonePaises().filter(p => !t || _foneSemAcento(p[1]).includes(t) || (dig && p[2].startsWith(dig)) || _foneSemAcento(p[0]) === t);
  lista.textContent = '';
  if(!itens.length){
    const v = document.createElement('div'); v.className = 'fone-vazio'; v.textContent = 'Nenhum país encontrado'; lista.appendChild(v); return;
  }
  itens.forEach((p, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'fone-it'; b.setAttribute('role', 'option');
    b.dataset.iso = p[0]; b.dataset.ddi = p[2];
    const sel = p[2] === atual && (!atualIso || p[0] === atualIso || !PAISES_DDI.some(x => x[2] === atual && x[0] === atualIso));
    b.setAttribute('aria-selected', sel ? 'true' : 'false');
    if(sel) b.classList.add('sel');
    const f = document.createElement('span'); f.className = 'fx-flag'; f.setAttribute('aria-hidden', 'true'); f.textContent = paisBandeira(p[0]);
    const n = document.createElement('span'); n.className = 'fone-it-n'; n.textContent = p[1];
    const c = document.createElement('span'); c.className = 'fone-it-c'; c.textContent = '+' + p[2];
    b.appendChild(f); b.appendChild(n); b.appendChild(c); lista.appendChild(b);
  });
  const ativo = lista.querySelector('.fone-it.sel') || lista.querySelector('.fone-it');
  if(ativo){ ativo.classList.add('on'); if(!t) ativo.scrollIntoView({ block: 'center' }); }
}
function foneAbrir(btn){
  const pop = _foneMontaPop();
  if(!pop.raiz.hidden && pop.btn === btn){ foneFechar(true); return; }
  pop.btn = btn; pop.busca.value = '';
  pop.fundo.hidden = false; pop.raiz.hidden = false;
  btn.setAttribute('aria-expanded', 'true');
  _foneRender('');
  // desktop e tablet: embaixo do botão (ou em cima, se faltar espaço); celular: folha de baixo (CSS)
  if(!window.matchMedia('(max-width:767px)').matches){
    const r = btn.getBoundingClientRect(), h = Math.min(360, pop.raiz.offsetHeight || 360);
    const abaixo = r.bottom + 6 + h <= window.innerHeight || r.top < h + 12;
    pop.raiz.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 336)) + 'px';
    pop.raiz.style.top = (abaixo ? r.bottom + 6 : Math.max(8, r.top - h - 6)) + 'px';
  } else { pop.raiz.style.left = ''; pop.raiz.style.top = ''; }
  pop.busca.focus({ preventScroll: true });
}
function foneFechar(devolverFoco){
  if(!_fonePop || _fonePop.raiz.hidden) return;
  const b = _fonePop.btn;
  _fonePop.raiz.hidden = true; _fonePop.fundo.hidden = true;
  if(b){ b.setAttribute('aria-expanded', 'false'); if(devolverFoco === true) b.focus(); }
}
document.addEventListener('keydown', e => { if(e.key === 'Escape') foneFechar(true); });
