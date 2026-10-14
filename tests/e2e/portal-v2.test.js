const { chromium } = require('playwright');
const OUT = process.env.SHOTS_DIR || require('os').tmpdir() + '/fitcpx-shots';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const rep = [];
  for (const [W, H, dark] of [[390, 844, false], [360, 740, false], [430, 932, true], [834, 1112, false]]) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, colorScheme: dark ? 'dark' : 'light' });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.route('**/*.supabase.co/**', r => r.abort());
    await page.goto('http://localhost:5178/aluno/', { waitUntil: 'load' });
    await page.waitForTimeout(500);
    const tag = (dark ? 'd' : 'l') + W;
    const shot = async n => { await page.waitForTimeout(250); await page.screenshot({ path: `${OUT}/p-${tag}-${n}.png` });
      const o = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1); if (o) rep.push(`${tag} ${n}: ROLAGEM HORIZONTAL`); };
    for (const t of ['tela-login', 'tela-cadastro', 'tela-conta']) { await page.evaluate(`irPara('${t}')`).catch(e => errs.push(String(e))); await shot(t); }
    await page.evaluate(() => {
      window._dadosCompletos = true; window._alunoCadastroBasico = { nome: 'Amanda Silva' }; window._alunoUser = { id: 'x', email: 'amanda@teste.com' };
      irPara('tela-app');
      document.getElementById('inicio-nome').textContent = 'Olá, Amanda Silva!';
      document.getElementById('inicio-status').innerHTML = `<div class="card"><strong>Dados pessoais</strong><div class="status-row"><span class="st">Completos</span><button class="btn btn-ghost btn-sm">Editar</button></div></div><div class="card"><strong>Anamnese</strong><div class="status-row"><span class="st">Preenchida</span><button class="btn btn-ghost btn-sm">Editar</button></div></div>${pagamentosResumoInicio()}`;
    });
    await shot('inicio');
    for (const t of ['treinos', 'agenda', 'pagamentos', 'anamnese']) { await page.evaluate(`mostrarTab('${t}')`).catch(e => errs.push(String(e))); await shot(t); }
    if (!dark) {
      await page.evaluate(() => { PortalAgenda.disponivel = true; PortalAgenda.listar = () => [{ id: 1, data: '2026-10-12', hora: '10:30', titulo: 'Avaliação física', local: 'Studio' }]; PortalPagamentos.disponivel = true; PortalPagamentos.listar = () => [{ id: 1, descricao: 'Mensalidade outubro', valor: 379, vencimento: '2026-10-05', status: 'atrasado' }]; mostrarTab('agenda'); });
      await shot('agenda-dados');
      await page.evaluate(() => mostrarTab('pagamentos')); await shot('pag-dados');
    }
    await page.evaluate(() => alunoToggleTema()); 
    rep.push(`${tag}: ${errs.length} erros ${JSON.stringify(errs.slice(0, 3))} tema=${await page.evaluate(() => document.documentElement.classList.contains('dark') + '/' + localStorage.getItem('fitcpx-aluno-tema'))}`);
    await ctx.close();
  }
  await browser.close();
  console.log(rep.join('\n'));
})();
