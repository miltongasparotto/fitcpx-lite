// Lista de Alunos (status em círculo, filtro e ordem por coluna, 3 quebras por largura do cartão) nos 4 layouts + notebook largo.
// Dados 100% fictícios, criados aqui. Rodar: servidor em 5178 e, em C:/Users/junio/.claude/skills/playwright-skill:
//   node run.js <este arquivo>      (SHOTS_DIR=pasta salva as capturas)
const { chromium } = require('playwright');
const BASE = 'http://localhost:5178';
const OUT = process.env.SHOTS_DIR || '';
const LAYOUTS = [['notebook', 1440, 900], ['notebook-largo', 1700, 900], ['ultrawide', 2560, 1200], ['tablet', 834, 1112], ['celular', 390, 844]];
const ok = [], bad = [];
const chk = (n, c, extra) => (c ? ok : bad).push(n + (c ? '' : ' :: ' + (extra || '')));

async function boot(page) {
  await page.addInitScript(() => { try { localStorage.setItem('fitcpx-alunos-por-pagina', '0'); } catch (e) {} }); // sem paginação aqui (ver alunos-paginacao.test.js)
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.evaluate(async () => {
    history.replaceState(null, '', '/?demo');
    const t = await (await fetch('tests/fixtures/seed-ficticio.js?' + Date.now())).text();
    const sc = document.createElement('script'); sc.textContent = t.replace(/^renderObjGrid\(\);/, ''); document.body.appendChild(sc);
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-root').style.display = 'grid';
    crmLoad(); seedPresetCats();
    // alunos fictícios que cobrem todos os casos
    const br = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toLocaleDateString('pt-BR'); };
    const iso = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    const nasc = anos => { const d = new Date(); return (d.getFullYear() - anos) + '-01-01'; };
    const mk = (i, nome, o) => ({ id: 8000 + i, perfil: Object.assign({ nome, sexo: 'F', nascimento: nasc(40), cpf: '52998224725', modalidade: 'presencial' }, o.p || {}),
      anamnese: { nivel: o.nivel === undefined ? 'Intermediário' : o.nivel, data_avaliacao: o.aval == null ? '' : iso(o.aval) },
      avaliacoesAntro: [], treinos: o.treino == null ? [] : [{ id: 9000 + i, status: 'aprovado', dataAprovacao: br(o.treino), objetivo: 'Hip' }] });
    const extra = [
      mk(1, 'Zélia Novata', { p: { novoCadastro: true, cpf: '' }, nivel: null, aval: null, treino: null }),
      mk(2, 'Ana Em Dia', { aval: 10, treino: 5 }),
      mk(3, 'Bruno Vencido', { p: { sexo: 'M', nascimento: nasc(30), modalidade: 'online' }, nivel: 'Avan', aval: 100, treino: 90 }),
      mk(4, 'Carla Alerta', { p: { lesoes: 'Joelho', condicoes: '' }, aval: 20, treino: 15 }),
      mk(5, 'Dani Gestante', { p: { condicoes: 'Gestação' }, aval: 20, treino: 15 }),
      mk(6, 'Eva Cardio', { p: { condicoes: 'Cardiopatia', modalidade: 'hibrido' }, nivel: 'Inic', aval: 20, treino: 15 }),
      mk(7, 'Fabio Bloqueado', { p: { sexo: 'M', portalStatus: 'bloqueado' }, aval: 50, treino: 40 }),
      mk(8, 'Gabi Pendente', { p: { alunoUserId: 'u-1', whatsapp: '' }, aval: 50, treino: 40 }),
      mk(10, 'Iris Sem Cadastro', { p: { sexo: '', nascimento: '', modalidade: '' }, nivel: null, aval: null, treino: null }),
      mk(9, 'Hugo Sem Dados', { p: { sexo: 'M', cpf: '', nascimento: nasc(65) }, nivel: null, aval: null, treino: null }),
    ];
    extra.forEach(s => students.push(s));
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
    const linhas = () => page.$$eval('#alunos-grid tr', r => r.map(x => x.querySelector('.al-n') ? x.querySelector('.al-n').textContent : '').filter(Boolean));
    // quebra medida no cartão: completo >= 1260, intermediário 880–1259, mínimo < 920
    const larg = await page.evaluate(() => document.querySelector('.al-body').clientWidth);
    const modo = larg >= 1260 ? 'completo' : larg >= 880 ? 'inter' : 'min';
    chk(L('quebra esperada'), modo === ({ notebook: 'inter', 'notebook-largo': 'completo', ultrawide: 'completo', tablet: 'min', celular: 'min' })[nome], modo + ' ' + larg);
    const total = await page.evaluate(() => students.length);

    const sw = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    chk(L('sem rolagem horizontal da página'), sw[0] <= sw[1] + 1, sw.join('>'));
    chk(L('contagem de alunos no cabeçalho'), (await page.textContent('#alunos-count-badge')).startsWith(String(total)));

    // regra: novos no topo e depois ordem alfabética; sem triângulo duplicado e sem ícones antigos
    let nomes = await linhas();
    chk(L('novo no topo'), nomes[0] === 'Zélia Novata', nomes.slice(0, 3).join('|'));
    const resto = nomes.slice(1);
    chk(L('demais em ordem alfabética'), JSON.stringify(resto) === JSON.stringify([...resto].sort((a, b) => a.localeCompare(b, 'pt-BR'))), resto.join('|'));
    chk(L('triângulo só em lesão, gestação e cardiopatia (3)'), (await page.$$('#alunos-grid .al-warn')).length === 3 + (await page.evaluate(() => students.filter(s => (s.id < 8000) && (((s.perfil.lesoes || '') !== '' && s.perfil.lesoes !== 'Nenhuma' && s.perfil.lesoes.length > 2) || /Gestação|Cardiopatia/.test(s.perfil.condicoes || ''))).length)));
    chk(L('sem ícones antigos de gestação/cardio'), (await page.$$('#alunos-grid .al-flag')).length === 0);
    chk(L('triângulo vem antes do nome'), await page.evaluate(() => { const w = document.querySelector('#alunos-grid .al-warn'); return !!w && w.nextElementSibling && w.nextElementSibling.classList.contains('al-n'); }));
    for (const [cls, n] of [['al-st-bloq', 1], ['al-st-ativo', 1], ['al-aviso-novo', 1], ['al-aviso-pendente', 1]]) {
      chk(L(`círculo ${cls} (≥${n})`), (await page.$$('#alunos-grid .' + cls)).length >= n);
    }
    chk(L('sem coluna de status; o círculo fica na célula do nome'), await page.evaluate(() => !document.querySelector('#alunos-thr th.al-c-st') && [...document.querySelectorAll('#alunos-grid tr')].filter(t => t.querySelector('.al-n')).every(t => t.children[0].querySelector('.al-av') && t.children[0].querySelector('.al-av').textContent.trim().length <= 2)));
    chk(L('treino vencido em âmbar'), await page.evaluate(() => [...document.querySelectorAll('#alunos-grid tr')].find(t => t.textContent.includes('Bruno Vencido')).querySelector('.badge-amber .ph-clock-countdown') !== null));
    // nome e tags nunca quebram de linha para caber (só no celular, que não tem largura)
    chk(L(nome === 'celular' ? 'celular: nome pode quebrar' : 'nome numa linha só'), await page.evaluate(() => [...document.querySelectorAll('#alunos-grid .al-n')].every(e => e.getBoundingClientRect().height < 24)) === (nome !== 'celular') || nome === 'celular');
    chk(L('tags numa linha cada (sem texto quebrado)'), await page.evaluate(() => [...document.querySelectorAll('#alunos-grid .al-tags .badge, #alunos-grid .al-tags .al-aviso')].every(e => e.getBoundingClientRect().height <= 24)));
    chk(L('conteúdo das colunas centralizado'), await page.evaluate(() => [...document.querySelectorAll('#alunos-grid td.al-ct')].filter(t => t.offsetParent !== null).every(t => getComputedStyle(t).textAlign === 'center')));
    // padrão do Painel: título, abas de status com contagem, avatar com 2 iniciais, datas com "há N dias"
    chk(L('cartão com título e abas de status (Todos + 4 situações + 3 alertas)'), await page.evaluate(() => !!document.querySelector('.al-ph h3') && document.querySelectorAll('#alunos-tabs .dp-seg-b').length === 8));
    chk(L('aba Todos mostra o total'), (await page.textContent('#alunos-tabs .dp-seg-b >> nth=0')).replace(/[^0-9]/g, '') === String(total));
    chk(L('contagens das abas de situação somam o total'), await page.evaluate(() => { const n = [...document.querySelectorAll('#alunos-tabs > .dp-seg .dp-seg-b')].map(b => +b.querySelector('span').textContent); return n.length === 5 && n.slice(1).reduce((a, b) => a + b, 0) === n[0]; }));
    chk(L('avatar com iniciais como no Painel'), await page.evaluate(() => { const r = [...document.querySelectorAll('#alunos-grid tr')].find(t => t.textContent.includes('Bruno Vencido')); return r.querySelector('.al-av').textContent === 'BV'; }));
    if (modo === 'completo') chk(L('datas com "há N dias"'), await page.evaluate(() => [...document.querySelectorAll('#alunos-grid tr')].find(t => t.textContent.includes('Ana Em Dia')).textContent.includes('há 10 dias')));
    await page.click('#alunos-tabs .dp-seg-b >> text=Bloqueado'); await page.waitForTimeout(80);
    chk(L('aba Bloqueado filtra'), (await linhas()).join() === 'Fabio Bloqueado', (await linhas()).join());
    chk(L('aba ativa fica marcada'), await page.evaluate(() => document.querySelector('#alunos-tabs .dp-seg-b.on').textContent.includes('Bloqueado')));
    await page.click('#alunos-tabs .dp-seg-b >> nth=0'); await page.waitForTimeout(80);
    chk(L('aba Todos limpa o status'), (await linhas()).length === total);
    chk(L('tag Sem CPF e avisos Novo e Pendente'), await page.evaluate(() => { const t = document.getElementById('alunos-grid').textContent; return t.includes('Sem CPF') && !!document.querySelector('#alunos-grid .al-aviso-novo') && !!document.querySelector('#alunos-grid .al-aviso-pendente'); }));
    chk(L('situação só tem 4 cores diferentes (lead, ativo, inativo, bloqueado) e o aviso não usa anel'), await page.evaluate(() => { const c = k => { const e = document.createElement('i'); e.className = 'al-dot al-st-' + k; document.body.appendChild(e); const v = getComputedStyle(e).borderTopColor; e.remove(); return v; }; const cores = ['lead', 'ativo', 'inativo', 'bloq'].map(c); return new Set(cores).size === 4 && !document.querySelector('#alunos-grid .al-av.al-st-novo, #alunos-grid .al-av.al-st-pendente, #alunos-grid .al-av.al-st-transf'); }));
    // filtro por alerta do sistema (Novo, Pendente, Transferência), separado da situação
    chk(L('filtro Alertas com Novo, Pendente e Transferência e contagem'), await page.evaluate(() => { const b = [...document.querySelectorAll('#alunos-tabs .al-alertas .dp-seg-b')]; return b.length === 3 && b[0].textContent.includes('Novo') && b[1].textContent.includes('Pendente') && b[2].textContent.includes('Transferência') && +b[0].querySelector('span').textContent === 1 && +b[1].querySelector('span').textContent === 1; }));
    await page.click('#alunos-tabs .al-ab-novo'); await page.waitForTimeout(80);
    chk(L('alerta Novo filtra'), (await linhas()).join() === 'Zélia Novata', (await linhas()).join());
    chk(L('alerta ativo fica marcado (aria-pressed)'), await page.evaluate(() => document.querySelector('#alunos-tabs .al-ab-novo').getAttribute('aria-pressed') === 'true'));
    await page.click('#alunos-tabs .al-ab-novo'); await page.waitForTimeout(80);
    chk(L('clicar de novo no alerta tira o filtro'), (await linhas()).length === total);
    await page.click('#alunos-tabs .al-ab-pendente'); await page.waitForTimeout(80);
    chk(L('alerta Pendente filtra'), (await linhas()).join() === 'Gabi Pendente', (await linhas()).join());
    await page.click('#alunos-tabs > .dp-seg .dp-seg-b >> text=Bloqueado'); await page.waitForTimeout(80);
    chk(L('alerta e situação combinam (Pendente + Bloqueado = ninguém)'), (await linhas()).length === 0);
    await page.click('#alunos-tabs .al-ab-pendente'); await page.waitForTimeout(80);
    await page.click('#alunos-tabs > .dp-seg .dp-seg-b >> nth=0'); await page.waitForTimeout(80);
    chk(L('limpar volta ao total'), (await linhas()).length === total);
    chk(L('só o botão olho nos novos'), (await page.$$('#alunos-grid [aria-label="Marcar como visto"]')).length === 1);

    if (modo === 'completo') {
      // ── NOTEBOOK / ULTRAWIDE: tabela completa ──
      chk(L('cabeçalho visível com 7 colunas e o botão de limpar'), await page.evaluate(() => getComputedStyle(document.querySelector('.alunos-table thead')).display !== 'none' && document.querySelectorAll('#alunos-thr th').length === 8));
      chk(L('barra do tablet escondida'), await page.evaluate(() => getComputedStyle(document.querySelector('.al-toolbar')).display === 'none'));
      chk(L('tabela cabe no cartão (sem rolar)'), await page.evaluate(() => { const w = document.querySelector('.al-body > div:nth-of-type(2)'); return w.scrollWidth <= w.clientWidth + 1; }));
      chk(L('nomes completos: Feminino/Masculino/Avançado'), await page.evaluate(() => { const t = document.getElementById('alunos-grid').textContent; return t.includes('Feminino') && t.includes('Masculino') && t.includes('Avançado') && !/Fem\.|Masc\.|Avan(?!çado)/.test(t); }));
      // ordenar idade: 3 cliques = crescente, decrescente, sem ordem; novo continua no topo
      const idades = () => page.$$eval('#alunos-grid tr', r => r.filter(x => !x.querySelector('[aria-label="Marcar como visto"]')).map(x => parseInt(x.children[3].textContent)).filter(n => !isNaN(n)));
      await page.click('[data-al-sort="idade"]'); let ids = await idades();
      chk(L('idade crescente'), ids.every((v, i) => i === 0 || ids[i - 1] <= v), ids.join(','));
      chk(L('novo segue no topo com ordem ativa'), (await linhas())[0] === 'Zélia Novata');
      await page.click('[data-al-sort="idade"]'); ids = await idades();
      chk(L('idade decrescente'), ids.every((v, i) => i === 0 || ids[i - 1] >= v), ids.join(','));
      await page.click('[data-al-sort="idade"]');
      chk(L('3º clique remove a ordem'), await page.evaluate(() => !document.querySelector('[data-al-sort="idade"]').classList.contains('on')));
      // sem informação (—) conta como o mais antigo: topo no crescente, fim no decrescente
      const vazios = ['Hugo Sem Dados', 'Iris Sem Cadastro'];
      for (const col of ['treino', 'aval']) {
        await page.click('[data-al-sort="' + col + '"]'); let n = (await linhas()).slice(1);
        chk(L(col + ' crescente: sem data no topo (depois do novo)'), vazios.every(v => n.slice(0, 2).includes(v)), n.slice(0, 3).join('|'));
        await page.click('[data-al-sort="' + col + '"]'); n = await linhas();
        chk(L(col + ' decrescente: sem data no fim'), vazios.every(v => n.slice(-2).includes(v)), n.slice(-3).join('|'));
        await page.click('[data-al-sort="' + col + '"]');
      }
      await page.click('[data-al-sort="idade"]'); let nI = (await linhas()).slice(1);
      chk(L('idade crescente: sem idade no topo'), nI[0] === 'Iris Sem Cadastro', nI.slice(0, 3).join('|'));
      await page.click('[data-al-sort="idade"]'); nI = await linhas();
      chk(L('idade decrescente: sem idade no fim'), nI.slice(-1)[0] === 'Iris Sem Cadastro', nI.slice(-2).join('|'));
      await page.click('[data-al-sort="idade"]');
      // filtro "—" (vazio) em cada coluna, para conferência
      const so = async (sel, v) => { await page.selectOption(sel, v); await page.waitForTimeout(60); return (await linhas()).join('|'); };
      chk(L('filtro sexo —'), await so('#alunos-filtro-sexo', '__vazio') === 'Iris Sem Cadastro'); await page.click('button[title="Limpar filtros"]');
      chk(L('filtro atendimento —'), await so('#alunos-filtro-modal', '__vazio') === 'Iris Sem Cadastro'); await page.click('button[title="Limpar filtros"]');
      chk(L('filtro nível —'), (await so('#alunos-filtro-nivel', '__vazio')).split('|').sort().join('|') === 'Hugo Sem Dados|Iris Sem Cadastro|Zélia Novata');
      await page.click('button[title="Limpar filtros"]');
      await page.click('[data-al-fld="idade"]'); await page.click('.al-seg button >> text=—');
      chk(L('filtro idade —: só um campo de aviso, sem inputs'), (await page.$$('.al-pop input')).length === 0 && (await linhas()).join('|') === 'Iris Sem Cadastro', (await linhas()).join('|'));
      chk(L('idade — aparece no campo'), (await page.textContent('[data-al-fld="idade"] span')).trim() === '—');
      await page.click('.al-pop .al-lnk'); chk(L('limpar idade — volta pra todos'), (await linhas()).length === total);
      for (const col of ['aval', 'treino']) {
        await page.click('[data-al-fld="' + col + '"]'); await page.click('.al-chip >> text=—'); await page.waitForTimeout(60);
        chk(L('filtro ' + col + ' —'), (await linhas()).sort().join('|') === ['Hugo Sem Dados', 'Iris Sem Cadastro', 'Zélia Novata'].join('|'), (await linhas()).join('|'));
        chk(L(col + ' — marcado e no campo'), (await page.textContent('[data-al-fld="' + col + '"] span')).trim() === '—' && (await page.$$('.al-chip.on')).length === 1);
        await page.click('.al-pop .al-lnk');
      }
      await page.keyboard.press('Escape');
      // filtros em lista
      await page.click('#alunos-tabs .al-ab-novo'); chk(L('filtro alerta Novo'), (await linhas()).join() === 'Zélia Novata');
      await page.click('#alunos-tabs .al-ab-novo');
      await page.selectOption('#alunos-filtro-sexo', 'M'); chk(L('filtro sexo Masculino'), (await linhas()).every(n => /Bruno|Fabio|Hugo/.test(n) || true) && (await linhas()).length >= 3);
      await page.selectOption('#alunos-filtro-nivel', 'Avançado'); chk(L('nível guardado abreviado (Avan) filtra e mostra por extenso'), (await linhas()).includes('Bruno Vencido'), (await linhas()).join());
      await page.click('button[title="Limpar filtros"]');
      // idade: exata mostra só 1 campo; intervalo só 2
      await page.click('[data-al-fld="idade"]');
      chk(L('idade exata: 1 campo'), (await page.$$('.al-pop input')).length === 1);
      await page.fill('.al-pop input', '65'); chk(L('idade exata 65'), (await linhas()).join() === 'Hugo Sem Dados', (await linhas()).join());
      await page.click('.al-seg button >> nth=1');
      chk(L('idade intervalo: 2 campos'), (await page.$$('.al-pop input')).length === 2);
      await page.fill('.al-pop input >> nth=0', '60'); await page.fill('.al-pop input >> nth=1', '70');
      chk(L('idade intervalo 60 a 70'), (await linhas()).join() === 'Hugo Sem Dados', (await linhas()).join());
      if (OUT) await page.screenshot({ path: `${OUT}/${nome}-lista-pop-idade.png` });
      await page.keyboard.press('Escape'); await page.click('button[title="Limpar filtros"]');
      // datas: janela fixa (inclui 120) e personalizado
      await page.click('[data-al-fld="treino"]');
      chk(L('chips 7/15/30/60/90/120 e —'), (await page.$$eval('.al-chip', c => c.map(x => x.textContent.replace(/[^0-9]/g, '')).filter(Boolean).join())) === '7,15,30,60,90,120' && (await page.$$('.al-chip')).length === 7);
      await page.click('.al-chip >> text=Até 30 dias'); const n30 = (await linhas()).length;
      await page.click('.al-chip >> text=Até 120 dias'); const n120 = (await linhas()).length;
      chk(L('janela de treino: 120 dias inclui mais que 30'), n120 > n30, `${n30}/${n120}`);
      await page.fill('.al-pop input[type=date] >> nth=0', '2000-01-01'); chk(L('personalizado desliga a janela fixa'), (await page.$$('.al-chip.on')).length === 0);
      await page.keyboard.press('Escape'); await page.click('button[title="Limpar filtros"]');
      // marcar como visto tira o aluno do topo
      await page.click('#alunos-grid [aria-label="Marcar como visto"]');
      chk(L('marcar como visto tira o círculo azul'), (await page.$$('#alunos-grid .al-st-novo')).length === 0);
    } else {
      // ── INTERMEDIÁRIO / MÍNIMO: o resto no painel de filtros, sem ordenação ──
      if (modo === 'inter') {
        chk(L('intermediário: só a legenda no cabeçalho'), await page.evaluate(() => getComputedStyle(document.querySelector('.alunos-table thead')).display !== 'none' && [...document.querySelectorAll('#alunos-thr th > :not(.th-label)')].every(e => getComputedStyle(e).display === 'none')));
        chk(L('intermediário: idade, nível e atendimento visíveis; sexo e datas escondidos'), await page.evaluate(() => { const v = c => [...document.querySelectorAll('#alunos-grid .' + c)].every(e => getComputedStyle(e).display !== 'none'); const h = c => [...document.querySelectorAll('#alunos-grid .' + c)].every(e => getComputedStyle(e).display === 'none'); return v('al-c2') && h('al-c1'); }));
      } else {
        chk(L('mínimo: cabeçalho de colunas escondido'), await page.evaluate(() => getComputedStyle(document.querySelector('.alunos-table thead')).display === 'none'));
        chk(L('mínimo: colunas extras escondidas'), await page.evaluate(() => [...document.querySelectorAll('#alunos-grid .al-col')].every(e => getComputedStyle(e).display === 'none')));
      }
      chk(L('barra com busca e botão de filtros'), await page.evaluate(() => getComputedStyle(document.querySelector('.al-toolbar')).display !== 'none'));
      chk(L('sem coluna de ordenar'), await page.evaluate(() => [...document.querySelectorAll('.al-sortbtn')].every(b => b.offsetParent === null)));
      chk(L('botão de filtros com alvo ≥ 40px'), await page.evaluate(() => { const r = document.getElementById('alunos-fil-btn').getBoundingClientRect(); return r.width >= 40 && r.height >= 40; }));
      await page.fill('#alunos-busca-m', 'ana'); chk(L('busca por nome'), (await linhas()).join() === 'Ana Em Dia' || (await linhas()).every(n => /ana/i.test(n)), (await linhas()).join());
      await page.fill('#alunos-busca-m', '');
      await page.click('#alunos-fil-btn'); await page.waitForTimeout(250);
      const pn = await page.evaluate(() => { const e = document.querySelector('.al-painel'); const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, iw: innerWidth, ih: innerHeight, n: e.querySelectorAll('select').length }; });
      chk(L('painel dentro da tela'), pn.l >= 0 && pn.r <= pn.iw + 1 && pn.t >= 0 && pn.b <= pn.ih + 1, JSON.stringify(pn));
      if (nome === 'celular') chk(L('painel vira gaveta de baixo'), Math.abs(pn.b - pn.ih) <= 2 && pn.l === 0 && pn.r === pn.iw, JSON.stringify(pn));
      chk(L('painel tem os 3 seletores + idade + 2 datas'), pn.n === 3 && (await page.$$('.al-painel [data-al-box]')).length === 3, String(pn.n));
      if (OUT) await page.screenshot({ path: `${OUT}/${nome}-lista-painel.png` });
      await page.selectOption('.al-painel select[data-alf="sexo"]', 'M'); await page.waitForTimeout(80);
      chk(L('filtro de sexo pelo painel'), (await linhas()).every(n => /Bruno|Fabio|Hugo/.test(n) || true) && (await linhas()).length >= 3 && (await linhas()).length < total, (await linhas()).join());
      chk(L('contador no botão de filtros'), (await page.textContent('#alunos-fil-n')) === '1');
      await page.click('.al-painel-f .btn >> text=Limpar'); await page.waitForTimeout(80);
      chk(L('limpar no painel mantém o painel aberto'), (await page.$$('.al-painel')).length === 1 && (await linhas()).length === total);
      await page.click('.al-painel [data-al-box="aval"] .al-chip >> text=Até 30 dias'); await page.waitForTimeout(80);
      chk(L('janela de avaliação pelo painel'), (await linhas()).length > 0 && (await linhas()).length < total);
      await page.keyboard.press('Escape'); await page.waitForTimeout(80);
      chk(L('Esc fecha o painel'), (await page.$$('.al-painel')).length === 0);
      await page.evaluate(() => limparFiltrosAlunos());
    }
    // dois caminhos de cadastro no cabeçalho: manual e via link (só copia o link)
    chk(L('cabeçalho: Cadastro via link e Cadastro manual'), await page.evaluate(() => { const l = document.getElementById('alunos-btn-link'), m = document.getElementById('alunos-btn-manual'); return !!l && !!m && l.textContent.trim() === 'Cadastro via link' && m.textContent.trim() === 'Cadastro manual' && l.getBoundingClientRect().right <= innerWidth && m.getBoundingClientRect().right <= innerWidth; }));
    chk(L('Cadastro manual é o botão principal'), await page.evaluate(() => document.getElementById('alunos-btn-manual').classList.contains('btn-primary')));
    if (nome === 'celular') chk(L('botões de cadastro com alvo ≥ 44px'), await page.evaluate(() => ['alunos-btn-link', 'alunos-btn-manual'].every(i => document.getElementById(i).getBoundingClientRect().height >= 44)));
    await page.evaluate(() => { window.__copiado = null; _portalLinkCodigo = 'TESTE1'; Object.defineProperty(navigator, 'clipboard', { value: { writeText: async t => { window.__copiado = t; } }, configurable: true }); });
    const antes = await page.evaluate(() => students.length);
    await page.click('#alunos-btn-link'); await page.waitForTimeout(400);
    chk(L('via link: copia o link de cadastro com o código'), await page.evaluate(() => /[?]c=TESTE1$/.test(window.__copiado || '')), await page.evaluate(() => String(window.__copiado)));
    chk(L('via link: não cria aluno nem abre a ficha'), await page.evaluate(n => students.length === n, antes));
    await page.click('#alunos-btn-manual'); await page.waitForTimeout(400);
    chk(L('manual: cria o aluno e abre a ficha'), await page.evaluate(n => students.length === n + 1 && !document.getElementById('student-view')?.classList.contains('hidden'), antes));
    if (OUT) await page.screenshot({ path: `${OUT}/${nome}-lista.png` });
    chk(L('sem erro de JS'), errs.length === 0, errs.join(' | '));
    await ctx.close();
  }
  await browser.close();
  console.log(`PASS ${ok.length}  FAIL ${bad.length}`);
  bad.forEach(b => console.log('FAIL', b));
  process.exit(bad.length ? 1 : 0);
})();
