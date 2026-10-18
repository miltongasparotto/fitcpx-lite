// Os 5 layouts do painel (regra do projeto, ver documentos/LAYOUTS.md):
//   notebook 1440x900 · MacBook 1280x800 (menu em ícones) · ultrawide 2560x1200 · tablet 834x1112 · celular 390x844
// Percorre todas as telas e abas e confere, em cada layout: sem erro de JS, sem rolagem horizontal,
// nada fora da tela, o menu certo para cada tamanho e a largura máxima do conteúdo no ultrawide.
// Rodar: servidor em 5178 e, em C:/Users/junio/.claude/skills/playwright-skill:  node run.js <este arquivo>
// SHOTS_DIR=pasta salva uma captura de cada tela em cada layout.
const { chromium } = require('playwright');
const BASE = 'http://localhost:5178';
const OUT = process.env.SHOTS_DIR || '';
const LAYOUTS = [['notebook', 1440, 900], ['macbook', 1280, 800], ['ultrawide', 2560, 1200], ['tablet', 834, 1112], ['celular', 390, 844]];
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
  ['ficha-info', "selectStudent(students[0].id);switchTab('info')"], ['ficha-cadastro', "switchTab('perfil')"], ['ficha-anamnese', "switchTab('anamnese')"],
  ['ficha-prescricao', "switchTab('prescricao')"], ['ficha-evolucao', "switchTab('evolucao')"],
  // formulários em página própria (anamnese, avaliação, treino): sem o cartão do aluno, só a linha de identificação
  ['ficha-form-anamnese', "switchTab('anamnese');switchSubtab('anamnese-hist');anamNova()"], ['ficha-form-avaliacao', "switchTab('anamnese');switchSubtab('anamnese-antro');antroNovaAvaliacao()"],
  ['ficha-form-treino', "switchTab('prescricao');treinosAdicionar()"], ['ficha-treino-distribuicao', 'goStep(2)'],
  ['ficha-treino-exercicios', 'montarFichaModelo()'], ['ficha-treino-aprovacao', 'aprovarTreinoMotor()'],
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
    if (nome === 'tablet' || nome === 'macbook') chk(L('menu em ícones de 76px, sem barra superior'), m.visivel && m.w === 76 && !m.barra, JSON.stringify(m));
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
        if (passo === 'alunos' || passo.startsWith('ficha-')) {
          const aw = await page.evaluate(() => { const e = [...document.querySelectorAll('.fx, .fx-cad, #screen-alunos .main-scroll>.content')].find(x => x.offsetParent !== null); return e ? Math.round(e.getBoundingClientRect().width) : 0; });
          chk(L(`${passo}: tela do aluno limitada a 1680px (não ocupa a tela toda)`), aw > 800 && aw <= 1680, String(aw));
        }
      }
      if (nome === 'macbook' && (passo === 'alunos' || passo.startsWith('ficha-'))) {
        const mw = await page.evaluate(() => { const e = [...document.querySelectorAll('.fx, .fx-cad, #screen-alunos .main-scroll>.content')].find(x => x.offsetParent !== null); return e ? Math.round(e.getBoundingClientRect().width) : 0; });
        chk(L(`${passo}: com o menu recolhido a tela do aluno passa de 1100px`), mw >= 1100, String(mw));
      }
      if (OUT) await page.screenshot({ path: `${OUT}/${nome}-${passo}.png` });
    }

    // Cabeçalho do Painel: instalar, modo escuro, sino e avatar (nessa ordem); no celular ficam na barra superior + menu da conta
    await page.evaluate("navGo('dashboard');dashTrocarArea('ciclo')");
    await page.waitForTimeout(300);
    if (nome === 'celular') {
      chk(L('barra do celular tem sino e avatar'), await page.evaluate(() => { const v = e => e && e.offsetParent !== null && e.getBoundingClientRect().right <= innerWidth; return v(document.querySelector('.mobile-bar .sino-btn')) && v(document.getElementById('mb-avatar')); }));
      await page.click('#mb-avatar'); await page.waitForTimeout(300);
      chk(L('menu da conta (celular): Modo escuro, Instalar, Configurações, Sair'), await page.evaluate(() => { const p = document.getElementById('conta-pop'); if (!p) return false; const t = [...p.querySelectorAll('.sino-item')].filter(e => e.offsetParent).map(e => e.innerText.trim()); return ['Modo escuro', 'Instalar aplicativo', 'Configurações', 'Sair'].every(x => t.includes(x)); }));
      await page.keyboard.press('Escape');
    } else {
      chk(L('cabeçalho: instalar, tema, sino e avatar nessa ordem, visíveis'), await page.evaluate(() => {
        const t = document.querySelector('.dp-head .ph-tools'); if (!t) return false;
        const k = [...t.children]; const ord = k.map(e => e.hasAttribute('data-instalar') ? 'i' : e.hasAttribute('data-tema-btn') ? 't' : e.classList.contains('sino-btn') ? 's' : e.hasAttribute('data-avatar') ? 'a' : '?').join('');
        return ord === 'itsa' && k.every(e => { const r = e.getBoundingClientRect(); return r.width > 20 && r.right <= innerWidth && r.top >= 0; });
      }));
      await page.click('.dp-head [data-avatar]'); await page.waitForTimeout(300);
      chk(L('menu da conta (avatar): Configurações e Sair; tema e instalar só no celular'), await page.evaluate(() => { const p = document.getElementById('conta-pop'); if (!p) return false; const t = [...p.querySelectorAll('.sino-item')].filter(e => e.offsetParent).map(e => e.innerText.trim()); return t.includes('Configurações') && t.includes('Sair') && !t.includes('Modo escuro'); }));
      await page.keyboard.press('Escape');
    }
    chk(L('menu lateral sem login/instalar/modo escuro no rodapé'), await page.evaluate(() => !document.querySelector('.sidebar #btn-tema, .sidebar #btn-instalar, .sidebar .sb-user')));
    // Painel: larguras iguais, altura fixa, nada atrás dos cartões, abas sem rolagem
    const pn = await page.evaluate(() => {
      const R = e => e.getBoundingClientRect(), over = [...document.querySelectorAll('.dp-over > *')], p = R(document.getElementById('dp-main')), sd = R(document.querySelector('.dp-side'));
      const seg = document.querySelector('.dp-seg'), ov = getComputedStyle(document.querySelector('.dp-segs')).overflowX;
      let vaza = 0; document.querySelectorAll('#dp-main .dp-c-acoes .dp-btn').forEach(b => { if (R(b).right > p.right - 1) vaza++; });
      return { span3: R(over[2]).right - R(over[0]).left, pw: p.width, hojeW: R(over[3]).width, sw: sd.width, pb: p.bottom, sb: sd.bottom, vaza, segOk: seg.scrollWidth <= seg.clientWidth + 1 && ov !== 'auto' && ov !== 'scroll', cabe: p.bottom <= innerHeight + 1 };
    });
    chk(L('abas do painel (Todos/Avaliar/...) sem barra de rolagem'), pn.segOk, JSON.stringify(pn));
    chk(L('botões de ação das linhas dentro do painel'), pn.vaza === 0, JSON.stringify(pn));
    if (nome === 'notebook' || nome === 'macbook' || nome === 'ultrawide') {
      chk(L('painel principal tem a largura dos 3 cartões de cima'), Math.abs(pn.span3 - pn.pw) <= 2, JSON.stringify(pn));
      chk(L('coluna lateral tem a largura do cartão Hoje'), Math.abs(pn.hojeW - pn.sw) <= 2, JSON.stringify(pn));
      chk(L('painel e coluna lateral terminam na mesma altura'), Math.abs(pn.pb - pn.sb) <= 2, JSON.stringify(pn));
    }
    // Acordeão lateral: Primeiros passos aberto (tutorial incompleto), Mensagens recolhida, Atividades sempre aberta
    chk(L('acordeão: passos aberto, mensagens recolhida, atividades aberta'), await page.evaluate(() => { const o = id => document.querySelector('.dp-acc[data-acc="' + id + '"]'); return o('passos').classList.contains('open') && !o('msg').classList.contains('open') && o('ativ').classList.contains('open'); }));
    chk(L('sem erros de página'), errs.length === 0, errs.join(' | '));
    await ctx.close();
  }
  // Notebook em larguras intermediárias (o layout quebrava entre 1200 e 1460px): nada sobreposto, nada fora do painel
  for (const w of [1200, 1280, 1366, 1536]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 800 } }), page = await ctx.newPage();
    await boot(page); await page.evaluate("navGo('dashboard')"); await page.waitForTimeout(300);
    const m = await page.evaluate(() => {
      const R = e => e.getBoundingClientRect(), p = R(document.getElementById('dp-main')), sd = R(document.querySelector('.dp-side'));
      let vaza = 0; document.querySelectorAll('#dp-main .dp-c-acoes .dp-btn').forEach(b => { if (R(b).right > p.right - 1) vaza++; });
      const rowOv = [...document.querySelectorAll('#dp-main .dp-row')].some(r => r.scrollWidth > r.clientWidth + 1);
      const head = R(document.querySelector('.dp-hello h2')).height < 40;
      return { vaza, rowOv, semSobrepor: p.right <= sd.left + 1, head, cabe: p.bottom <= innerHeight + 1, hscroll: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    chk('notebook ' + w + ': botões de ação ficam dentro do painel', m.vaza === 0 && !m.rowOv, JSON.stringify(m));
    chk('notebook ' + w + ': painel não invade a coluna lateral', m.semSobrepor, JSON.stringify(m));
    chk('notebook ' + w + ': saudação em uma linha e sem rolagem lateral', m.head && !m.hscroll, JSON.stringify(m));
    chk('notebook ' + w + ': painel termina dentro da tela', m.cabe, JSON.stringify(m));
    await ctx.close();
  }
  await browser.close();
  console.log('PASS ' + ok.length + '  FAIL ' + bad.length);
  bad.forEach(b => console.log('  FAIL ' + b));
  process.exit(bad.length ? 1 : 0);
})();
