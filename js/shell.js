// ══════════════════════════════════════════════════════════════════════════
// SHELL — menu lateral responsivo, ferramentas do cabeçalho (tema, sino)
// ══════════════════════════════════════════════════════════════════════════
// Três layouts (CSS em css/painel.css decide; este arquivo só liga o que o CSS
// não faz sozinho):
//   notebook >= 1200px : menu lateral completo (248px)
//   tablet 768-1199px  : menu em ícones (76px) + gaveta pelo botão do topo
//   celular < 768px    : barra superior + gaveta pelo botão do menu
// A navegação (navGo, ids, onclick) é a mesma nos três.

const SHELL_BP_DESK = 1200, SHELL_BP_TAB = 768;
function shellModo(){
  const w = window.innerWidth;
  return w >= SHELL_BP_DESK ? 'desk' : w >= SHELL_BP_TAB ? 'tab' : 'mob';
}

// ── Menu ────────────────────────────────────────────────────────────────
// Tooltip e rótulo de acessibilidade dos itens (no menu em ícones o texto some).
function shellRotularMenu(){
  document.querySelectorAll('.sidebar-item').forEach(it => {
    const t = it.querySelector('span:not(.sb-count):not(.sb-pill):not(.sb-alert)');
    if(t && !it.title){ it.title = t.textContent.trim(); it.setAttribute('aria-label', it.title); }
  });
}

// No menu em ícones, "Treino" abre a gaveta já expandida (os subitens não cabem).
(function(){
  if(typeof toggleNavTreino !== 'function') return;
  const orig = toggleNavTreino;
  window.toggleNavTreino = function(){
    const app = document.getElementById('app-root');
    if(shellModo() === 'tab' && app && !app.classList.contains('nav-open')){
      toggleNavMobile(true);
      const sub = document.getElementById('nav-treino-sub'), hdr = document.getElementById('nav-treino-hdr');
      if(sub){ sub.style.display = 'block'; if(hdr) hdr.classList.add('open'); }
      return;
    }
    orig();
  };
})();

// ── Ferramentas do cabeçalho: tema (lua) e sino ────────────────────────────
function shellFerramentasHTML(){
  const escuro = document.documentElement.classList.contains('dark');
  return '<div class="ph-tools">' +
    '<button class="icon-btn" type="button" data-tema-btn onclick="toggleTema()" aria-label="Alternar modo escuro" title="Alternar modo escuro"><i class=' + (escuro ? 'ph-sun' : 'ph-moon') + '></i></button>' +
    '<button class="icon-btn sino-btn" type="button" onclick="shellToggleSino(event)" aria-label="Notificações" title="Notificações"><i class=ph-bell></i><span class="sino-dot"></span></button>' +
    '</div>';
}

function shellInjetarFerramentas(){
  document.querySelectorAll('#main-area .page-header, #main-area .page-head').forEach(h => {
    if(h.classList.contains('has-ph-tools') || h.closest('#screen-dashboard')) return;
    h.classList.add('has-ph-tools');
    const acoes = h.querySelector('.page-header-actions');
    if(acoes) acoes.insertAdjacentHTML('beforeend', shellFerramentasHTML());
    else h.insertAdjacentHTML('beforeend', shellFerramentasHTML());
  });
  shellAtualizarSino();
}

document.addEventListener('DOMContentLoaded', () => {
  new MutationObserver(() => {
    const escuro = document.documentElement.classList.contains('dark');
    document.querySelectorAll('[data-tema-btn] i').forEach(i => { i.className = escuro ? 'ph-sun' : 'ph-moon'; });
  }).observe(document.documentElement, { attributes:true, attributeFilter:['class'] });
  shellRotularMenu();
  shellInjetarFerramentas();
});

// ── Sino: lista curta do que precisa de atenção (mesmas fontes do Painel) ──
function shellSinoItens(){
  const itens = [];
  try{
    const g = dashLevantarPendencias();
    if(g.vencido.length)  itens.push({ ic:'ph-warning-circle', tom:'red',   n:g.vencido.length,  t:g.vencido.length === 1 ? 'treino vencido' : 'treinos vencidos', go:"navGo('dashboard')" });
    const vencendo = g.proximo.length + g.agendar.length;
    if(vencendo)          itens.push({ ic:'ph-clock',          tom:'amber', n:vencendo,           t:vencendo === 1 ? 'treino vencendo' : 'treinos vencendo',        go:"navGo('dashboard')" });
    if(g['sem-treino'].length) itens.push({ ic:'ph-barbell',   tom:'blue',  n:g['sem-treino'].length, t:g['sem-treino'].length === 1 ? 'aluno sem treino' : 'alunos sem treino', go:"navGo('dashboard')" });
  }catch(e){}
  try{
    if(typeof DB !== 'undefined' && Array.isArray(DB.tasks)){
      const hoje = todayStr();
      const atras = DB.tasks.filter(t => taskVisible(t) && !t.done && diffDays(liveDate(t), hoje) < 0).length;
      if(atras) itens.push({ ic:'ph-alarm', tom:'red', n:atras, t:atras === 1 ? 'tarefa atrasada' : 'tarefas atrasadas', go:"navGo('agenda')" });
    }
  }catch(e){}
  try{
    if(typeof waPendentes === 'function'){
      const n = waPendentes().length;
      if(n) itens.push({ ic:'ph-whatsapp-logo', tom:'green', n, t:n === 1 ? 'mensagem a enviar' : 'mensagens a enviar', go:'waAbrirFila()' });
    }
  }catch(e){}
  try{
    if(typeof FinanceiroAdapter !== 'undefined' && FinanceiroAdapter.disponivel){
      const p = FinanceiroAdapter.listarPagamentosVencidos().length;
      if(p) itens.push({ ic:'ph-money', tom:'red', n:p, t:p === 1 ? 'pagamento vencido' : 'pagamentos vencidos', go:"navGo('dashboard')" });
    }
  }catch(e){}
  return itens;
}

function shellAtualizarSino(){
  const tem = shellSinoItens().length > 0;
  document.querySelectorAll('.sino-dot').forEach(d => { d.style.display = tem ? '' : 'none'; });
  const av = document.getElementById('supa-user-avatar'), mb = document.getElementById('mb-avatar');
  if(av && mb) mb.textContent = av.textContent || '';
}

function shellFecharSino(){
  const p = document.getElementById('sino-pop'); if(p) p.remove();
  const b = document.getElementById('sino-bk'); if(b) b.remove();
}
function shellToggleSino(ev){
  if(ev) ev.stopPropagation();
  if(document.getElementById('sino-pop')){ shellFecharSino(); return; }
  const itens = shellSinoItens();
  const corpo = itens.length
    ? itens.map(i => '<div class="sino-item" role="button" tabindex="0" onclick="shellFecharSino();' + i.go + '">' +
        '<span class="sino-ic tom-' + i.tom + '"><i class=' + i.ic + '></i></span>' +
        '<span class="sino-t"><b>' + i.n + '</b> ' + i.t + '</span><i class=ph-caret-right></i></div>').join('')
    : '<div class="sino-vazio"><i class=ph-check-circle></i>Tudo em dia</div>';
  const bk = document.createElement('div');
  bk.id = 'sino-bk'; bk.className = 'sino-bk'; bk.onclick = shellFecharSino;
  const pop = document.createElement('div');
  pop.id = 'sino-pop'; pop.className = 'sino-pop';
  pop.innerHTML = '<div class="sino-h">Notificações</div>' + corpo;
  document.body.appendChild(bk);
  document.body.appendChild(pop);
  const alvo = ev && (ev.currentTarget || ev.target);
  if(alvo && alvo.getBoundingClientRect && shellModo() !== 'mob'){
    const r = alvo.getBoundingClientRect();
    pop.style.top = (r.bottom + 8) + 'px';
    pop.style.right = Math.max(12, window.innerWidth - r.right) + 'px';
  }
  requestAnimationFrame(() => pop.classList.add('on'));
}

// ── Teclado e redimensionamento ─────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if(e.key !== 'Escape') return;
  shellFecharSino();
  if(typeof toggleNavMobile === 'function') toggleNavMobile(false);
  if(typeof dashFecharMenus === 'function') dashFecharMenus();
});
window.addEventListener('resize', () => {
  if(shellModo() === 'desk' && typeof toggleNavMobile === 'function') toggleNavMobile(false);
  shellFecharSino();
});

// O updateBadges() do CRM só cuida da Agenda; o selo do Financeiro e o sino pegam carona.
(function(){
  if(typeof updateBadges !== 'function') return;
  const orig = updateBadges;
  window.updateBadges = function(){
    orig();
    try{ financeiroAtualizarBadge(); }catch(e){}
    try{ waAtualizarBadge(); }catch(e){}
    try{ shellAtualizarSino(); }catch(e){}
  };
})();
