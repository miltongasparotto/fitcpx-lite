// Fumaça ponta a ponta: percorre telas, abas, modais; procura erros de JS, ícone vazado como texto e rolagem horizontal.
const { chromium } = require('playwright');
const BASE = 'http://localhost:5178';
async function boot(page){
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.evaluate(async () => {
    history.replaceState(null, '', '/?demo');
    const t = await (await fetch('tests/fixtures/seed-ficticio.js?' + Date.now())).text();
    const sc = document.createElement('script'); sc.textContent = t.replace(/^renderObjGrid\(\);/, ''); document.body.appendChild(sc);
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-root').style.display = 'grid';
    crmLoad(); seedPresetCats();
    const cats = getCatDefs(), today = todayStr(), ids = students.map(s => s.id); DB.tasks = [];
    ids.forEach((id, i) => DB.tasks.push({ id: 2000 + i, alunoId: id, titulo: 'Tarefa ' + i, cat: cats[i % cats.length].id, tipo: i % 2 ? 'prazo' : 'notif', data: addDays(today, i - 2), hora: '', done: false, doneDate: null, manual: true }));
    renderStudentList();
  });
}
(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = [];
  try {
    for (const [W, H] of [[1440, 900], [390, 844]]) {
      const ctx = await browser.newContext({ viewport: { width: W, height: H } });
      const page = await ctx.newPage();
      const errs = [];
      page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
      page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 160)); });
      page.on('dialog', d => d.dismiss().catch(() => {}));
      await boot(page);
      const steps = [];
      const screens = ['dashboard','alunos','locais','biblioteca','distribuicao','periodizacao','exercicios','arquivadas','agenda','pipeline','whatsapp','fluxos','portal-aluno','config'];
      for (const s of screens) steps.push(['nav ' + s, `navGo('${s}')`]);
      steps.push(['pipeline lista', "navGo('pipeline');crmPipelineView='lista';renderPipelineCRM()"]);
      steps.push(['fluxos fluxos', "navGo('fluxos');crmFluxosTab='fluxos';renderFluxosCRM()"]);
      steps.push(['fluxos modalidades', "crmFluxosTab='modalidades';renderFluxosCRM()"]);
      for (const i of [0, 1, 4]) {
        steps.push(['aluno ' + i, `selectStudent(students[${i}].id)`]);
        for (const tab of ['perfil', 'anamnese', 'prescricao', 'evolucao']) steps.push([`aluno ${i} ${tab}`, `switchTab('${tab}')`]);
        for (const st of ['anamnese-hist', 'anamnese-antro', 'anamnese-meta']) steps.push([`aluno ${i} sub ${st}`, `switchTab('anamnese');switchSubtab('${st}')`]);
      }
      steps.push(['wizard prescricao', "selectStudent(students[0].id);switchTab('prescricao');treinosAdicionar()"]);
      steps.push(['crm cliente', `navAlunoCrm(students[0].id)`]);
      for (const m of ['m-crm-task','m-crm-cat','m-crm-fluxo','m-crm-mod','m-crm-wa','m-crm-aluno']) steps.push(['modal ' + m, `crmCloseModal('m-crm-task');closeAlunoCrm&&closeAlunoCrm();crmOpenModal('${m}')`]);
      for (const [name, code] of steps) {
        await page.evaluate(code).catch(e => errs.push('EVAL ' + name + ': ' + String(e).slice(0, 140)));
        await page.waitForTimeout(120);
        const r = await page.evaluate(() => {
          const bad = [];
          document.querySelectorAll('body *').forEach(el => {
            if (el.children.length === 0 && /<i class|&lt;i class|class=ph-|class=sd-/.test(el.textContent || '')) bad.push('TEXT ' + el.tagName + ':' + (el.textContent || '').slice(0, 50));
            for (const a of el.attributes) if (/<i class|class=ph-|class=sd-/.test(a.value)) bad.push('ATTR ' + el.tagName + ' ' + a.name);
          });
          const main = document.getElementById('main-area');
          const over = document.documentElement.scrollWidth > innerWidth + 1;
          return { bad, over };
        });
        if (r.bad.length) report.push(`${W} ${name}: LEAK ${r.bad.slice(0, 3).join(' | ')}`);
        if (r.over) report.push(`${W} ${name}: ROLAGEM HORIZONTAL`);
      }
      report.push(`${W}: ${errs.length} erros ${JSON.stringify([...new Set(errs)].slice(0, 6))}`);
      await ctx.close();
    }
  } finally { await browser.close(); }
  console.log(report.join('\n'));
})();
