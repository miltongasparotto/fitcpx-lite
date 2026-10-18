// Prescrição de treino no celular e no tablet (18/10/2026): 4 passos, barra fixa, volume em lista, exercício em cartão, acordeões.
// Notebook e ultrawide não mudam (conferido aqui também). Dados 100% fictícios (seed da Amanda Silva).
// Rodar: servidor em 5178 e, em C:/Users/junio/.claude/skills/playwright-skill:  node run.js <este arquivo>
const { chromium } = require('playwright');
const BASE = 'http://localhost:5178';
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
    crmLoad(); seedPresetCats(); renderStudentList();
    selectStudent(students[0].id); switchTab('prescricao'); treinosAdicionar();
  });
}
const vis = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); return !!e && e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden'; }, sel);
const txt = (page, sel) => page.evaluate(s => (document.querySelector(s) || {}).textContent || '', sel);
const dentro = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.left >= -1 && r.right <= innerWidth + 1; }, sel);
const semRolagemH = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.getElementById('fx-form').scrollWidth <= document.getElementById('fx-form').clientWidth + 1);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const errs = [];
  for (const [nome, w, h, movel] of [['celular', 390, 844, true], ['tablet', 834, 1112, true], ['notebook', 1440, 900, false], ['macbook', 1280, 800, false], ['ultrawide', 2560, 1300, false]]) {
    const L = t => nome + ': ' + t;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1000 });
    const page = await ctx.newPage();
    page.on('pageerror', e => errs.push(nome + ' PAGEERROR ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(nome + ' CONSOLE ' + m.text().slice(0, 160)); });
    page.on('dialog', d => d.accept().catch(() => {}));
    if(process.env.SUPA_LOCAL) await page.route(/cdn.jsdelivr.net/, r => r.fulfill({status:200, contentType:'application/javascript', path:process.env.SUPA_LOCAL}));   // só para rodar com a rede lenta
    await boot(page);
    await page.waitForTimeout(300);

    // ── passo 1 ──
    chk(L('passo 1: cabeçalho de passos'), movel ? (await vis(page, '#pr-passos')) && (await txt(page, '#pr-passo-n')) === 'Passo 1 de 4' : (await vis(page, '.steps')) && !(await vis(page, '#pr-passos')));
    if (movel) {
      chk(L('passo 1: grupos em cartões'), (await page.$$eval('#fxf-treino .pr-card', e => e.filter(x => x.offsetParent).length)) === 5);
      chk(L('passo 1: texto de apoio do notebook escondido'), !(await vis(page, '#presc-step1 .pr-so-desk')));
      chk(L('passo 1: barra fixa com Próximo dentro da tela'), await dentro(page, '#presc-step1 .pr-barra-fixa') && (await txt(page, '#presc-step1 .pr-barra-fixa')).includes('Próximo'));
      chk(L('passo 1: campos de 40 px ou mais para o toque'), await page.evaluate(() => [...document.querySelectorAll('#presc-step1 select')].filter(e => e.offsetParent).every(e => e.getBoundingClientRect().height >= 38)));
    } else {
      chk(L('passo 1: sem cartões nem barra fixa (como antes)'), (await page.evaluate(() => getComputedStyle(document.querySelector('#presc-step1 .pr-card')).boxShadow)) === 'none' && (await page.evaluate(() => getComputedStyle(document.querySelector('#presc-step1 .pr-barra-fixa')).position)) !== 'sticky');
    }
    chk(L('passo 1: sem rolagem horizontal'), await semRolagemH(page));

    // ── passo 2 ──
    await page.evaluate(() => goStep(2)); await page.waitForTimeout(350);
    chk(L('passo 2: cabeçalho diz Passo 2 de 4'), (await txt(page, '#pr-passo-n')) === 'Passo 2 de 4' && (await txt(page, '#pr-passo-nome')) === 'Distribuição');
    chk(L('passo 2: 12 grupos na lista'), (await page.$$eval('#vol-tbody tr', e => e.length)) === 12);
    if (movel) {
      chk(L('passo 2: cabeçalho da tabela escondido'), !(await vis(page, '#vol-tabela thead')));
      chk(L('passo 2: cada grupo mostra faixa de séries e situação'), await page.evaluate(() => { const r = document.querySelector('#vol-tbody tr'); return /\d+–\d+ séries por semana/.test(r.querySelector('.vol-res').textContent) && r.querySelector('.vol-chip').textContent.trim().length > 2; }));
      const minVisivel = await page.evaluate(() => { const i = document.getElementById('inp-Peitoral-semMin') || document.querySelector('#vol-tbody tr input'); return i && i.offsetParent !== null; });
      if (nome === 'celular') {
        chk(L('passo 2: contadores escondidos até abrir a linha'), !minVisivel);
        await page.click('#vol-tbody tr:first-child td:nth-child(2)'); await page.waitForTimeout(200);
        chk(L('passo 2: tocar na linha abre mín e máx com contadores de 40 px'), await page.evaluate(() => { const r = document.querySelector('#vol-tbody tr.aberta'); if (!r) return false; const st = [...r.querySelectorAll('.vol-st')].filter(e => e.offsetParent); return st.length >= 2 && st.every(e => e.getBoundingClientRect().height >= 38); }));
        const antes = await page.evaluate(() => document.querySelector('#vol-tbody tr.aberta .vol-res').textContent);
        await page.click('#vol-tbody tr.aberta .vol-st:first-of-type button:last-child'); await page.waitForTimeout(150);
        chk(L('passo 2: + no mínimo atualiza o resumo da linha'), await page.evaluate(a => document.querySelector('#vol-tbody tr.aberta .vol-res').textContent !== a, antes));
        await page.click('#vol-tbody tr.aberta td:nth-child(2)'); await page.waitForTimeout(150);
        chk(L('passo 2: tocar de novo fecha'), (await page.$$eval('#vol-tbody tr.aberta', e => e.length)) === 0);
      } else {
        chk(L('passo 2: mínimo e máximo à vista em cada linha'), minVisivel && await page.evaluate(() => document.querySelectorAll('#vol-tbody tr:first-child .vol-st').length >= 2 && [...document.querySelectorAll('#vol-tbody tr:first-child .vol-st')].slice(0, 2).every(e => e.offsetParent)));
      }
      chk(L('passo 2: modelos de divisão como cartões de escolha'), (await page.$$eval('#divisao-opcoes .dv-card', e => e.length)) >= 2 && await page.evaluate(() => document.querySelectorAll('#divisao-opcoes .dv-card.sel').length === 1));
      chk(L('passo 2: barra fixa com voltar e Exercícios'), await dentro(page, '#s3-vd-btnrow') && (await txt(page, '#s3-vd-btnrow')).includes('Exercícios'));
    } else {
      chk(L('passo 2: tabela completa como antes'), (await vis(page, '#vol-tabela thead')) && !(await vis(page, '#vol-tbody .vol-res')));
    }
    chk(L('passo 2: sem rolagem horizontal'), await semRolagemH(page));

    // ── passo 3 ──
    await page.evaluate(() => montarFichaModelo()); await page.waitForTimeout(500);
    chk(L('passo 3: cabeçalho diz Passo 3 de 4'), (await txt(page, '#pr-passo-n')) === 'Passo 3 de 4');
    const nEx = await page.$$eval('#cards-treino .excv2-row', e => e.length);
    chk(L('passo 3: exercícios montados'), nEx >= 3, String(nEx));
    if (movel) {
      chk(L('passo 3: abas das sessões com a contagem de séries'), (await page.$$eval('#ficha-tabs .ft-tab', e => e.length)) >= 2 && /\d+s/.test(await txt(page, '#ficha-tabs .ft-tab')));
      chk(L('passo 3: nome do exercício inteiro à vista (sem corte)'), await page.evaluate(() => [...document.querySelectorAll('#cards-treino .excv2-namebtn .nm')].every(n => n.scrollWidth <= n.clientWidth + 1 && n.getBoundingClientRect().width > 80)));
      chk(L('passo 3: Séries, Reps e Intervalo com contadores de 40 px ou mais'), await page.evaluate(() => { const c = [...document.querySelectorAll('#cards-treino .excv2-pctrl')]; return c.length >= 9 && c.every(e => e.getBoundingClientRect().height >= 40 && e.getBoundingClientRect().width >= 90); }));
      chk(L('passo 3: tudo do cartão dentro da tela'), await page.evaluate(() => [...document.querySelectorAll('#cards-treino .excv2-row *')].filter(e => e.offsetParent).every(e => e.getBoundingClientRect().right <= innerWidth + 1)));
      chk(L('passo 3: setas de ordem saem; mover vai para o menu ⋮'), !(await vis(page, '#cards-treino .excv2-arrows')) && await page.evaluate(() => { const m = document.querySelectorAll('#cards-treino .excv2-omenu')[1]; return !!m && /Subir/.test(m.textContent) && /Descer/.test(m.textContent); }));
      // + em Séries muda o dado
      const ser0 = await page.evaluate(() => _s3.fichaObj.treinos[0].exercicios[0].series);
      await page.click('#cards-treino .excv2-row:first-child .excv2-pg:first-child .excv2-pm.pl'); await page.waitForTimeout(150);
      chk(L('passo 3: + em Séries altera o exercício'), await page.evaluate(a => +_s3.fichaObj.treinos[0].exercicios[0].series === a + 1, +ser0));
      // acordeões começam fechados
      chk(L('passo 3: aquecimento e volume semanal começam recolhidos com resumo'), (await page.$$eval('#ficha-treinos-content .pr-acc-aq:not(.aberto), #preview-vol-semanal .pr-acc-vol:not(.aberto)', e => e.length)) === 2 && /\d+ séries/.test(await txt(page, '#preview-vol-semanal .pr-acc-h')));
      await page.click('#preview-vol-semanal .pr-acc-h'); await page.waitForTimeout(150);
      chk(L('passo 3: tocar abre o volume semanal'), (await vis(page, '#preview-vol-semanal table')) && await dentro(page, '#preview-vol-semanal .pr-acc-b'));
      chk(L('passo 3: barra fixa com Regerar e Aprovar treino'), (await txt(page, '#s3-ficha .pr-barra-fixa')).includes('Aprovar treino') && await dentro(page, '#s3-ficha .pr-barra-fixa'));
    } else {
      chk(L('passo 3: linha única por exercício, com setas (como antes)'), (await vis(page, '#cards-treino .excv2-arrows')) && !(await vis(page, '#ficha-treinos-content .pr-acc-h')));
      chk(L('passo 3: Séries, Reps e Intervalo na mesma linha do nome (como antes)'), await page.evaluate(() => { const r = document.querySelector('#cards-treino .excv2-row'); const nb = r.querySelector('.excv2-nameblock').getBoundingClientRect(), pg = [...r.querySelectorAll('.excv2-pg')].map(e => e.getBoundingClientRect()); return pg.length === 3 && pg.every(b => Math.abs(b.top - pg[0].top) < 4) && pg[0].left > nb.right - 2 && r.getBoundingClientRect().height < 80; }));
    }
    chk(L('passo 3: sem rolagem horizontal'), await semRolagemH(page));

    // ── passo 4 ──
    await page.evaluate(() => aprovarTreinoMotor()); await page.waitForTimeout(600);
    chk(L('passo 4: cabeçalho diz Passo 4 de 4'), (await txt(page, '#pr-passo-n')) === 'Passo 4 de 4');
    if (movel) {
      chk(L('passo 4: sessões em acordeão, só a primeira aberta'), (await page.$$eval('#ficha-aprovada .pr-acc-apv', e => e.length)) >= 2 && (await page.$$eval('#ficha-aprovada .pr-acc-apv.aberto', e => e.length)) === 1);
      await page.click('#ficha-aprovada .pr-acc-apv:not(.aberto) .pr-acc-h'); await page.waitForTimeout(150);
      chk(L('passo 4: tocar abre outra sessão'), (await page.$$eval('#ficha-aprovada .pr-acc-apv.aberto', e => e.length)) === 2);
      chk(L('passo 4: barra fixa com FitCpx e Salvar na Biblioteca dentro da tela'), await dentro(page, '#presc-step4 .pr-barra-fixa') && await page.evaluate(() => [...document.querySelectorAll('#presc-step4 .pr-barra-fixa .btn')].filter(e => e.offsetParent).every(e => e.getBoundingClientRect().right <= innerWidth + 1)));
      chk(L('passo 4: Nova prescrição fora da barra'), (await vis(page, '#presc-step4 .pr-nova-m')) && !(await vis(page, '#presc-step4 .pr-barra-fixa .pr-so-desk')));
      chk(L('passo 4: ficha sem rolagem interna'), await page.evaluate(() => getComputedStyle(document.getElementById('ficha-aprovada')).overflowY !== 'auto'));
    } else {
      chk(L('passo 4: ficha completa como antes'), (await vis(page, '#ficha-aprovada .pr-apv-t')) && !(await vis(page, '#ficha-aprovada .pr-acc-h')));
    }
    chk(L('passo 4: sem rolagem horizontal'), await semRolagemH(page));
    await ctx.close();
  }

  chk('sem erro de JS na página', errs.length === 0, errs.join(' | '));
  console.log('PASS ' + ok.length + '  FAIL ' + bad.length);
  bad.forEach(b => console.log('FAIL ' + b));
  await browser.close();
  process.exit(bad.length ? 1 : 0);
})();
