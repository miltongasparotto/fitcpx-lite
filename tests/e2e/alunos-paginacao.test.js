// Paginação da lista de Alunos (10 por padrão; 20, 30 ou tudo) nos 4 layouts. Dados 100% fictícios.
// Rodar: servidor em 5178 e, em C:/Users/junio/.claude/skills/playwright-skill:  node run.js <este arquivo>
const { chromium } = require('playwright');
const BASE = 'http://localhost:5178';
const OUT = process.env.SHOTS_DIR || '';
const LAYOUTS = [['notebook', 1440, 900], ['ultrawide', 2560, 1200], ['tablet', 834, 1112], ['celular', 390, 844]];
const ok = [], bad = [];
const chk = (n, c, extra) => (c ? ok : bad).push(n + (c ? '' : ' :: ' + (extra || '')));

async function boot(page) {
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.evaluate(async () => {
    try { localStorage.removeItem('fitcpx-alunos-por-pagina'); } catch (e) {}
    history.replaceState(null, '', '/?demo');
    const t = await (await fetch('tests/fixtures/seed-ficticio.js?' + Date.now())).text();
    const sc = document.createElement('script'); sc.textContent = t.replace(/^renderObjGrid\(\);/, ''); document.body.appendChild(sc);
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-root').style.display = 'grid';
    crmLoad(); seedPresetCats();
    // 33 alunos no total (Amanda do seed + 32), 2 deles novos
    for (let i = 1; i <= 32; i++) {
      const n = 'Aluno ' + String(i).padStart(2, '0');
      students.push({ id: 8000 + i, perfil: { nome: n, sexo: i % 2 ? 'F' : 'M', nascimento: '1985-01-01', cpf: '52998224725', modalidade: 'online', novoCadastro: i > 30 ? true : undefined }, anamnese: { nivel: 'Inte' }, avaliacoesAntro: [], treinos: [] });
    }
    renderStudentList(); navGo('alunos');
  });
  await page.waitForTimeout(300);
}

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
    const rows = () => page.$$eval('#alunos-grid tr', r => r.filter(x => x.querySelector('.al-n')).length);
    const nomes = () => page.$$eval('#alunos-grid .al-n', e => e.map(x => x.textContent));
    const info = () => page.textContent('.al-pag-info');
    const pag = () => page.textContent('.al-pag-nav span');
    const prev = () => page.$('.al-pag-nav .icon-btn >> nth=0');
    const next = () => page.$('.al-pag-nav .icon-btn >> nth=1');

    chk(L('33 alunos no total'), await page.evaluate(() => students.length) === 33);
    chk(L('padrão: 10 linhas'), await rows() === 10, String(await rows()));
    chk(L('rodapé: Mostrando 1 a 10 de 33'), (await info()).trim() === 'Mostrando 1 a 10 de 33 alunos', await info());
    chk(L('opção 10 marcada, na ordem 10, 20, 30, Tudo'), await page.evaluate(() => { const b = [...document.querySelectorAll('.al-pag .dp-seg-b')]; return b.map(x => x.textContent).join() === '10,20,30,Tudo' && b[0].classList.contains('on'); }));
    chk(L('página 1 de 4'), (await pag()).trim() === '1 de 4');
    chk(L('anterior desabilitado na 1ª página'), await (await prev()).isDisabled());
    chk(L('novos no topo da página 1'), (await nomes()).slice(0, 2).join() === 'Aluno 31,Aluno 32', (await nomes()).slice(0, 3).join());

    await (await next()).click(); await page.waitForTimeout(80);
    chk(L('próxima: 11 a 20'), (await info()).includes('11 a 20') && await rows() === 10 && (await pag()).trim() === '2 de 4', await info());
    chk(L('página 2 não repete a 1'), !(await nomes()).includes('Aluno 31'));
    await (await prev()).click(); await page.waitForTimeout(80);
    chk(L('anterior volta pra página 1'), (await pag()).trim() === '1 de 4');
    for (let i = 0; i < 3; i++) { await (await next()).click(); await page.waitForTimeout(60); }
    chk(L('última página tem 3 alunos (31 a 33)'), await rows() === 3 && (await info()).includes('31 a 33'), await info());
    chk(L('próxima desabilitado na última página'), await (await next()).isDisabled());

    // por página
    await page.click('.al-pag .dp-seg-b >> text=20'); await page.waitForTimeout(80);
    chk(L('20 por página: 20 linhas, volta à página 1'), await rows() === 20 && (await pag()).trim() === '1 de 2');
    await page.click('.al-pag .dp-seg-b >> text=30'); await page.waitForTimeout(80);
    chk(L('30 por página: 30 linhas'), await rows() === 30 && (await pag()).trim() === '1 de 2');
    await page.click('.al-pag .dp-seg-b >> text=Tudo'); await page.waitForTimeout(80);
    chk(L('Tudo: 33 linhas e sem botões de página'), await rows() === 33 && (await page.$$('.al-pag-nav')).length === 0);
    chk(L('Tudo: informa 1 a 33 de 33'), (await info()).includes('1 a 33 de 33'), await info());
    // a escolha fica lembrada
    await page.reload({ waitUntil: 'load' });
    await page.evaluate(async () => {
      history.replaceState(null, '', '/?demo');
      const t = await (await fetch('tests/fixtures/seed-ficticio.js?' + Date.now())).text();
      const sc = document.createElement('script'); sc.textContent = t.replace(/^renderObjGrid\(\);/, ''); document.body.appendChild(sc);
      document.getElementById('auth-screen').style.display = 'none'; document.getElementById('app-root').style.display = 'grid';
      crmLoad(); seedPresetCats();
      for (let i = 1; i <= 32; i++) students.push({ id: 8000 + i, perfil: { nome: 'Aluno ' + String(i).padStart(2, '0'), sexo: 'F', nascimento: '1985-01-01', cpf: '52998224725', novoCadastro: i > 30 ? true : undefined }, anamnese: { nivel: 'Inte' }, avaliacoesAntro: [], treinos: [] });
      renderStudentList(); navGo('alunos');
    });
    await page.waitForTimeout(250);
    chk(L('escolha "Tudo" lembrada ao recarregar'), await rows() === 33, String(await rows()));
    await page.click('.al-pag .dp-seg-b >> text=10'); await page.waitForTimeout(80);

    // filtro volta pra página 1 e o rodapé acompanha o resultado
    await (await next()).click(); await page.waitForTimeout(60);
    await page.click('#alunos-tabs .al-ab-novo'); await page.waitForTimeout(100);
    chk(L('filtro: 2 resultados, rodapé "1 a 2 de 2", sem botões de página'), await rows() === 2 && (await info()).includes('1 a 2 de 2') && (await page.$$('.al-pag-nav')).length === 0, await info());
    await page.click('#alunos-tabs .al-ab-novo'); await page.waitForTimeout(100);
    chk(L('limpar filtro: volta à página 1 de 4'), (await pag()).trim() === '1 de 4');
    // ordenar (só no notebook completo) volta pra página 1
    if (nome === 'ultrawide') {
      await (await next()).click(); await page.waitForTimeout(60);
      await page.click('[data-al-sort="idade"]'); await page.waitForTimeout(80);
      chk(L('ordenar volta pra página 1'), (await pag()).trim() === '1 de 4');
    }
    // layout
    const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, b: [...document.querySelectorAll('.al-pag-nav .icon-btn')].map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }) }));
    chk(L('sem rolagem horizontal'), m.sw <= m.iw + 1, m.sw + '>' + m.iw);
    if (nome === 'tablet' || nome === 'celular') chk(L('botões de página com alvo ≥ 44px'), m.b.length === 2 && m.b.every(x => x[0] >= 44 && x[1] >= 44), JSON.stringify(m.b));
    chk(L('rodapé dentro da tela'), await page.evaluate(() => { const r = document.getElementById('alunos-pag').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1; }));
    // poucos alunos: sem rodapé
    await page.evaluate(() => { students.splice(10); renderScreenAlunos(); });
    chk(L('10 alunos ou menos: sem rodapé de paginação'), await page.evaluate(() => document.getElementById('alunos-pag').hidden));
    if (OUT) await page.screenshot({ path: `${OUT}/${nome}-paginacao.png` });
    chk(L('sem erro de JS'), errs.length === 0, errs.join(' | '));
    await ctx.close();
  }
  // Altura da tela: a página não rola; só a lista rola, e só quando as linhas não cabem
  for (const [rot, W, H, cabe] of [['tela alta (1440x1250)', 1440, 1250, true], ['tela baixa (1440x640)', 1440, 640, false], ['tablet (834x1112)', 834, 1112, true]]) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: W < 1000 });
    const page = await ctx.newPage();
    page.on('dialog', d => d.dismiss().catch(() => {}));
    await boot(page);
    const medir = () => page.evaluate(() => { const sc = document.querySelector('.al-scroll'), ms = document.querySelector('#screen-alunos .main-scroll'), pg = document.getElementById('alunos-pag').getBoundingClientRect(); return { pagina: document.documentElement.scrollHeight - innerHeight, main: ms.scrollHeight - ms.clientHeight, lista: sc.scrollHeight - sc.clientHeight, rodapeVisivel: pg.top >= 0 && pg.bottom <= innerHeight + 1 }; });
    let m = await medir();
    chk(rot + ': a página não rola', m.pagina <= 1 && m.main <= 1, JSON.stringify(m));
    chk(rot + ': rodapé de paginação visível sem rolar', m.rodapeVisivel, JSON.stringify(m));
    chk(rot + (cabe ? ': os 10 alunos cabem, a lista não rola' : ': não cabem, a lista rola por dentro'), cabe ? m.lista <= 1 : m.lista > 1, JSON.stringify(m));
    // Tudo (33): rola só a lista e o cabeçalho das colunas fica fixo
    await page.click('.al-pag .dp-seg-b >> text=Tudo'); await page.waitForTimeout(100);
    m = await medir();
    chk(rot + ' com Tudo: a página não rola e só a lista rola', m.pagina <= 1 && m.main <= 1 && m.lista > 1, JSON.stringify(m));
    chk(rot + ' com Tudo: rodapé continua visível', m.rodapeVisivel);
    await page.evaluate(() => { document.querySelector('.al-scroll').scrollTop = 300; });
    chk(rot + ' com Tudo: cabeçalho das colunas fica fixo ao rolar', await page.evaluate(() => { const c = document.querySelector('.al-scroll').getBoundingClientRect().top, th = document.querySelector('.alunos-table thead th')?.getBoundingClientRect().top; return th === undefined || Math.abs(th - c) <= 2 || getComputedStyle(document.querySelector('.alunos-table thead')).display === 'none'; }));
    await ctx.close();
  }
  await browser.close();
  console.log(`PASS ${ok.length}  FAIL ${bad.length}`);
  bad.forEach(b => console.log('FAIL', b));
  process.exit(bad.length ? 1 : 0);
})();
