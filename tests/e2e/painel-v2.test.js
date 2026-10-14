const { chromium } = require('playwright');
const BASE = 'http://localhost:5178';
const OUT = process.env.SHOTS_DIR || require('os').tmpdir() + '/fitcpx-shots';
require('fs').mkdirSync(OUT, { recursive: true });
async function boot(page) {
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.evaluate(async () => {
    history.replaceState(null, '', '/?demo');
    const t = await (await fetch('tests/fixtures/seed-ficticio.js?' + Date.now())).text();
    const sc = document.createElement('script'); sc.textContent = t.replace(/^renderObjGrid\(\);/, ''); document.body.appendChild(sc);
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-root').style.display = 'grid';
    crmLoad(); seedPresetCats();
    DB.config.personalName = 'Milton Teste';
    const cats = getCatDefs(), today = todayStr(), ids = students.map(s => s.id); DB.tasks = [];
    ids.forEach((id, i) => DB.tasks.push({ id: 2000 + i, alunoId: id, titulo: 'Tarefa ' + i, cat: cats[i % cats.length].id, tipo: 'notif', data: today, hora: '10:30', done: false, doneDate: null, manual: true }));
    DB.tasks.push({ id: 2999, alunoId: ids[0], titulo: 'Follow-up aula', cat: cats[0].id, tipo: 'notif', data: today, hora: '', done: false, doneDate: null, manual: true });
    renderStudentList();
  });
}
const ok = [], bad = [];
const chk = (n, c, extra) => (c ? ok : bad).push(n + (c ? '' : ' :: ' + (extra || '')));
(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const [W, H] of [[1440, 900], [834, 1112], [390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 160)); });
    page.on('dialog', d => d.dismiss().catch(() => {}));
    await boot(page);
    await page.evaluate("navGo('dashboard')"); await page.waitForTimeout(300);
    // menus
    await page.evaluate("dashToggleMenu('novo')"); await page.waitForTimeout(400);
    chk(`${W} menu novo abre`, await page.evaluate(() => !!document.querySelector('.dp-actwrap.open')));
    chk(`${W} menu novo visível`, await page.evaluate(() => { const m = document.querySelector('.dp-actwrap.open .dp-menu'); return m && getComputedStyle(m).visibility === 'visible' && getComputedStyle(m).opacity === '1'; }));
    await page.screenshot({ path: `${OUT}/m-${W}-menu.png` });
    await page.evaluate("dashFecharMenus()"); await page.waitForTimeout(350);
    chk(`${W} menu fecha`, await page.evaluate(() => !document.querySelector('.dp-actwrap.open')));
    // areas
    await page.evaluate("dashTrocarArea('hoje')"); await page.waitForTimeout(500);
    chk(`${W} area hoje`, await page.evaluate(() => document.querySelector('#dp-main').textContent.includes('Follow-up aula') && document.querySelector('#dp-main').textContent.includes('Tarefa 0')));
    await page.screenshot({ path: `${OUT}/m-${W}-hoje.png` });
    // financeiro com dados simulados
    await page.evaluate(() => {
      FinanceiroAdapter.disponivel = true;
      const hoje = todayStr();
      let pag = [{ id: 9001, alunoId: students[0].id, nome: 'Amanda Silva', valor: 379, descricao: 'Mensalidade', vencimento: addDays(hoje, -5) }];
      FinanceiroAdapter.listarPagamentosVencidos = () => pag;
      FinanceiroAdapter.listarContratos = () => [{ id: 9101, alunoId: students[0].id, nome: 'Amanda Silva', plano: 'Trimestral', fim: addDays(hoje, 6) }, { id: 9102, alunoId: students[0].id, nome: 'Amanda Silva', plano: 'Mensal', fim: addDays(hoje, -3) }];
      FinanceiroAdapter.marcarRecebido = async id => { pag = pag.filter(p => p.id !== id); return true; };
      renderDashboard(); dashTrocarArea('fin');
    });
    await page.waitForTimeout(500);
    chk(`${W} fin lista`, await page.evaluate(() => document.querySelector('#dp-main').textContent.includes('R$ 379,00') && document.querySelector('#dp-main').textContent.includes('Renovar') && document.querySelector('#dp-main').textContent.includes('Ajustar')));
    chk(`${W} badge financeiro`, await page.evaluate(() => { financeiroAtualizarBadge(); return document.getElementById('nav-financeiro-badge').textContent === '3'; }));
    await page.screenshot({ path: `${OUT}/m-${W}-fin.png` });
    await page.evaluate("dashReceber(9001)"); await page.waitForTimeout(900);
    chk(`${W} receber remove + atividade`, await page.evaluate(() => !document.querySelector('[data-pag="9001"]') && DB.atividades && DB.atividades[0].what === 'Pagamento recebido'));
    // sino
    await page.evaluate("renderDashboard()");
    const sino = await page.evaluate(() => { const b = [...document.querySelectorAll('.sino-btn')].find(x => x.offsetParent); if (b) b.click(); return !!b; });
    await page.waitForTimeout(350);
    chk(`${W} sino abre`, await page.evaluate(() => !!document.getElementById('sino-pop')));
    await page.screenshot({ path: `${OUT}/m-${W}-sino.png` });
    await page.evaluate("shellFecharSino()");
    // gaveta
    if (W < 1200) {
      await page.evaluate("toggleNavMobile(true)"); await page.waitForTimeout(450);
      chk(`${W} gaveta aberta`, await page.evaluate(() => { const s = document.querySelector('.sidebar'); return s.getBoundingClientRect().width > 250 && s.getBoundingClientRect().left >= -1; }));
      await page.screenshot({ path: `${OUT}/m-${W}-gaveta.png` });
      await page.evaluate("navGo('agenda')"); await page.waitForTimeout(400);
      chk(`${W} gaveta fecha ao navegar`, await page.evaluate(() => !document.getElementById('app-root').classList.contains('nav-open')));
    }
    // ficha do aluno + prescrição
    await page.evaluate("selectStudent(students[0].id)"); await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/m-${W}-ficha.png` });
    await page.evaluate("switchTab('prescricao')"); await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/m-${W}-presc.png` });
    // fluxo modal
    await page.evaluate("navGo('fluxos');editFluxo(null)"); await page.waitForTimeout(400);
    chk(`${W} fluxo campo função`, await page.evaluate(() => document.getElementById('fl-steps-list').textContent.includes('Função no Painel')));
    await page.screenshot({ path: `${OUT}/m-${W}-fluxo.png` });
    // dark
    await page.evaluate("crmCloseModal('m-crm-fluxo');navGo('dashboard');toggleTema()"); await page.waitForTimeout(400);
    chk(`${W} dark`, await page.evaluate(() => document.documentElement.classList.contains('dark')));
    await page.screenshot({ path: `${OUT}/m-${W}-dark.png` });
    chk(`${W} sem erros`, errs.length === 0, JSON.stringify([...new Set(errs)].slice(0, 5)));
    await ctx.close();
  }
  await browser.close();
  console.log('OK', ok.length, '\nFALHAS', bad.length, '\n' + bad.join('\n'));
})();
