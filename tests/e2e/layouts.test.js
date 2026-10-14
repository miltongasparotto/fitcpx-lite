// Os 4 layouts do painel (regra do projeto, ver documentos/LAYOUTS.md):
//   notebook 1440x900 · ultrawide 2560x1200 · tablet 834x1112 · celular 390x844
// Percorre todas as telas e abas e confere, em cada layout: sem erro de JS, sem rolagem horizontal,
// nada fora da tela, o menu certo para cada tamanho e a largura máxima do conteúdo no ultrawide.
// Rodar: servidor em 5178 e, em C:/Users/junio/.claude/skills/playwright-skill:  node run.js <este arquivo>
// SHOTS_DIR=pasta salva uma captura de cada tela em cada layout.
const { chromium } = require('playwright');
const BASE = 'http://localhost:5178';
const OUT = process.env.SHOTS_DIR || '';
const LAYOUTS = [['notebook', 1440, 900], ['ultrawide', 2560, 1200], ['tablet', 834, 1112], ['celular', 390, 844]];
const ok = [], bad = [];
const chk = (n, c, extra) => (c ? ok : bad).push(n + (c ? '' : ' :: ' + (extra || '')));

async function boot(page) {
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.evaluate(async () => {
    history.replaceState(null, '', '/?demo');
    const t = await (await fetch('tests/fixtures/seed-ficticio.js?' + Date.now())).text();
    const sc = document.createElement('script'); sc.textContent = t.replace(/^renderObjGrid\(\);/, ''); document.body.appendChild(sc);
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-root').style.display = 'grid';
    crmLoad(); seedPresetCats();
    const cats = getCatDefs(), today = todayStr(), ids = students.map(s => s.id); DB.tasks = [];
    ids.forEach((id, i) => DB.tasks.push({ id: 2000 + i, alunoId: id, titulo: 'Tarefa ' + i, cat: cats[i % cats.length].id, tipo: i % 2 ? 'prazo' : 'notif', data: addDays(today, i - 2), hora: '10:30', done: false, doneDate: null, manual: true }));
    renderStudentList();
  });
}

// Telas e estados percorridos (nome, código que abre).
const PASSOS = [
  ['painel', "navGo('dashboard')"], ['painel-hoje', "navGo('dashboard');dashTrocarArea('hoje')"], ['painel-financeiro', "navGo('dashboard');dashTrocarArea('fin')"],
  ['alunos', "navGo('alunos')"], ['agenda', "navGo('agenda')"],
  ['pipeline', "navGo('pipeline');crmPipelineView='kanban';renderPipelineCRM()"], ['pipeline-lista', "navGo('pipeline');crmPipelineView='lista';renderPipelineCRM()"],
  ['financeiro', "navGo('financeiro')"], ['whatsapp-modelos', "navGo('whatsapp');waIrParaAba('modelos')"], ['whatsapp-enviar', "navGo('whatsapp');waIrParaAba('enviar')"],
  ['treinar', "navGo('treinar')"], ['locais', "navGo('locais')"], ['biblioteca', "navGo('biblioteca')"], ['distribuicao', "navGo('distribuicao')"],
  ['periodizacao', "navGo('periodizacao')"], ['exercicios', "navGo('exercicios')"], ['arquivadas', "navGo('arquivadas')"],
  ['fluxos-categorias', "navGo('fluxos');crmFluxosTab='categorias';renderFluxosCRM()"], ['fluxos-fluxos', "navGo('fluxos');crmFluxosTab='fluxos';renderFluxosCRM()"],
  ['fluxos-modalidades', "navGo('fluxos');crmFluxosTab='modalidades';renderFluxosCRM()"],
  ['portal-aluno', "navGo('portal-aluno')"],
  ['config-perfil', "navGo('config');_cfgAba('perfil')"], ['config-marca', "navGo('config');_cfgAba('marca')"], ['config-regras', "navGo('config');_cfgAba('regras')"],
  ['ficha-perfil', "selectStudent(students[0].id);switchTab('perfil')"], ['ficha-anamnese', "switchTab('anamnese')"],
  ['ficha-prescricao', "switchTab('prescricao')"], ['ficha-evolucao', "switchTab('evolucao')"],
];

// Elementos visíveis que passam do limite direito da janela (fora de contêiner rolável de propósito).
const FORA = () => {
  const iw = window.innerWidth, achados = [];
  document.querySelectorAll('body *').forEach(el => {
    if (el.closest('.sidebar, .nav-scrim, .sino-pop, .modal-overlay, #crm-toasts, .carregando, [hidden], .hidden, .dp-menu, .dp-backdrop, svg, .tbl-wrap, .pipe-board, .pipe-wrap, .dp-segs, .seg, .cal-scroll')) return;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    // se algum ancestral rola na horizontal de propósito, ignora
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX; if ((o === 'auto' || o === 'scroll') && p.scrollWidth > p.clientWidth) return;
    }
    if (r.right > iw + 2) achados.push((el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0]) + ' ' + Math.round(r.right));
  });
  return achados.slice(0, 5);
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const [nome, W, H] of LAYOUTS) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: nome === 'tablet' || nome === 'celular', isMobile: nome === 'celular' });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 160)); });
    page.on('dialog', d => d.dismiss().catch(() => {}));
    await boot(page);
    const L = n => `${nome} ${n}`;

    // menu de cada layout
    const m = await page.evaluate(() => {
      const sb = document.querySelector('.sidebar'), r = sb.getBoundingClientRect(), mb = document.querySelector('.mobile-bar');
      return { w: Math.round(r.width), visivel: getComputedStyle(sb).visibility !== 'hidden' && r.right > 0, barra: !!mb && getComputedStyle(mb).display !== 'none' };
    });
    if (nome === 'notebook') chk(L('menu completo de 248px'), m.visivel && m.w === 248 && !m.barra, JSON.stringify(m));
    if (nome === 'ultrawide') chk(L('menu completo de 272px'), m.visivel && m.w === 272 && !m.barra, JSON.stringify(m));
    if (nome === 'tablet') chk(L('menu em ícones de 76px, sem barra superior'), m.visivel && m.w === 76 && !m.barra, JSON.stringify(m));
    if (nome === 'celular') chk(L('menu escondido e barra superior visível'), !m.visivel && m.barra, JSON.stringify(m));

    for (const [passo, codigo] of PASSOS) {
      let erro = '';
      try { await page.evaluate(codigo); } catch (e) { erro = e.message.slice(0, 120); }
      await page.waitForTimeout(220);
      const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, texto: (document.querySelector('.main-scroll:not(.hidden), #student-view:not(.hidden)') || document.body).innerText.trim().length }));
      chk(L(`${passo}: abre sem erro`), !erro, erro);
      chk(L(`${passo}: sem rolagem horizontal`), r.sw <= r.iw + 1, `${r.sw}>${r.iw}`);
      chk(L(`${passo}: tem conteúdo`), r.texto > 20, String(r.texto));
      const fora = await page.evaluate(FORA);
      chk(L(`${passo}: nada fora da tela`), fora.length === 0, fora.join(', '));
      if (nome === 'ultrawide') {
        const lw = await page.evaluate(() => { const e = document.querySelector('.main-scroll:not(.hidden) .screen-pad, .main-scroll:not(.hidden) .dp'); return e ? Math.round(e.getBoundingClientRect().width) : 0; });
        chk(L(`${passo}: conteúdo limitado a 2480px`), lw <= 2480, String(lw));
      }
      if (OUT) await page.screenshot({ path: `${OUT}/${nome}-${passo}.png` });
    }

    // Instalar aplicativo: botão no menu (painel)
    await page.evaluate("navGo('dashboard')");
    if (nome === 'celular') await page.evaluate("toggleNavMobile(true)");
    await page.waitForTimeout(300);
    chk(L('botão Instalar aplicativo existe e é clicável'), await page.evaluate(() => { const b = document.getElementById('btn-instalar'); if (!b || b.hidden) return false; const r = b.getBoundingClientRect(); return r.width > 20 && r.height > 20; }));
    chk(L('sem erros de página'), errs.length === 0, errs.join(' | '));
    await ctx.close();
  }
  await browser.close();
  console.log('PASS ' + ok.length + '  FAIL ' + bad.length);
  bad.forEach(b => console.log('  FAIL ' + b));
  process.exit(bad.length ? 1 : 0);
})();
