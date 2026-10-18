// Aluno novo ("Cadastro manual") que não é salvo não pode virar cadastro vazio na lista. Dados 100% fictícios.
// Rodar: servidor em 5178 e, em C:/Users/junio/.claude/skills/playwright-skill:  node run.js <este arquivo>
const { chromium } = require('playwright');
const BASE = 'http://localhost:5178';
const ok = [], bad = [];
const chk = (n, c, extra) => (c ? ok : bad).push(n + (c ? '' : ' :: ' + (extra || '')));

async function boot(page) {
  await page.addInitScript(() => { try { localStorage.setItem('fitcpx-alunos-por-pagina', '0'); } catch (e) {} });
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.evaluate(async () => {
    history.replaceState(null, '', '/?demo');
    const t = await (await fetch('tests/fixtures/seed-ficticio.js?' + Date.now())).text();
    const sc = document.createElement('script'); sc.textContent = t.replace(/^renderObjGrid\(\);/, ''); document.body.appendChild(sc);
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-root').style.display = 'grid';
    crmLoad(); seedPresetCats(); renderStudentList(); navGo('alunos');
  });
  await page.waitForTimeout(250);
}
const LS = page => page.evaluate(() => JSON.parse(localStorage.getItem(lsKey('acm-students')) || '[]').length);
const N = page => page.evaluate(() => students.length);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 160)); });
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await boot(page);
  const base = await N(page);

  // 1) abre o cadastro manual, não preenche nada e sai sem salvar
  await page.click('#alunos-btn-manual'); await page.waitForTimeout(500);
  chk('manual: aluno novo existe em memória e está marcado como não salvo', await N(page) === base + 1 && await page.evaluate(() => _novoSemSalvarId !== null));
  chk('o aluno novo recém-aberto conta como vazio (sem dado)', await page.evaluate(() => _alunoVazio(getActive())), await page.evaluate(() => JSON.stringify(getActive())));
  await page.click("button[onclick=\"navGo('alunos')\"]:visible >> nth=0"); await page.waitForTimeout(200);
  chk('sair mostra o aviso de alterações não salvas', await page.evaluate(() => !document.getElementById('modal-unsaved-overlay').classList.contains('hidden')));
  await page.click('#modal-unsaved-overlay >> text=Sair sem salvar'); await page.waitForTimeout(300);
  chk('Sair sem salvar: aluno vazio descartado', await N(page) === base, String(await N(page)));
  chk('Sair sem salvar: nada vazio gravado no navegador', await LS(page) <= base);
  chk('Sair sem salvar: lista sem linha "—"', await page.evaluate(() => ![...document.querySelectorAll('#alunos-grid .al-n')].some(e => e.textContent.trim() === '—')));
  chk('Sair sem salvar: contagem do menu e do título voltam', (await page.textContent('#nav-count-alunos')) === String(base) && (await page.textContent('#alunos-count-badge')).startsWith(String(base)));
  chk('Sair sem salvar: rascunho apagado', await page.evaluate(() => !Object.keys(localStorage).some(k => k.startsWith('acm-draft-'))));

  // 2) sai rápido (antes de o formulário marcar alteração): também descarta
  await page.click('#alunos-btn-manual'); await page.evaluate(() => navGo('alunos')); await page.waitForTimeout(400);
  chk('sair logo após abrir: sem aluno vazio', await N(page) === base, String(await N(page)));

  // 3) com alterações digitadas e Sair sem salvar: some também
  await page.click('#alunos-btn-manual'); await page.waitForTimeout(400);
  await page.fill('#p-nome', 'Teste Descartado'); await page.waitForTimeout(100);
  await page.evaluate(() => _markDirty());
  await page.click("button[onclick=\"navGo('alunos')\"]:visible >> nth=0"); await page.waitForTimeout(200);
  await page.click('#modal-unsaved-overlay >> text=Sair sem salvar'); await page.waitForTimeout(300);
  chk('digitou nome e saiu sem salvar: não fica cadastrado', await N(page) === base && await page.evaluate(() => !students.some(s => s.perfil.nome === 'Teste Descartado')));

  // 4) Salvar sem nome: não grava e pede o nome
  await page.click('#alunos-btn-manual'); await page.waitForTimeout(400);
  await page.evaluate(() => salvarPerfil()); await page.waitForTimeout(150);
  chk('Salvar sem nome: mostra o aviso e continua na ficha', await page.evaluate(() => /Informe o nome/.test(document.getElementById('crm-toasts')?.textContent || document.body.textContent)));
  chk('Salvar sem nome: não grava no navegador', await LS(page) <= base);
  chk('Salvar sem nome: segue marcado como não salvo', await page.evaluate(() => _novoSemSalvarId !== null));
  // "Salvar" do aviso de saída também não deixa sair sem nome
  await page.evaluate(() => { _markDirty(); navGo('alunos'); }); await page.waitForTimeout(150);
  await page.click('#modal-unsaved-overlay button.btn-primary'); await page.waitForTimeout(200);
  chk('Salvar do aviso sem nome: não sai da ficha', await page.evaluate(() => !document.getElementById('student-view')?.classList.contains('hidden') && _novoSemSalvarId !== null));
  chk('Salvar do aviso sem nome: aviso fechado', await page.evaluate(() => document.getElementById('modal-unsaved-overlay').classList.contains('hidden')));

  // 5) com nome: salva e vira cadastro de verdade
  await page.fill('#p-nome', 'Teste Salvo Fictício'); await page.waitForTimeout(100);
  await page.evaluate(() => salvarPerfil()); await page.waitForTimeout(250);
  chk('Salvar com nome: aluno gravado', await LS(page) === base + 1 && await page.evaluate(() => JSON.parse(localStorage.getItem(lsKey('acm-students'))).some(s => s.perfil.nome === 'Teste Salvo Fictício')));
  chk('Salvar com nome: deixa de ser "não salvo"', await page.evaluate(() => _novoSemSalvarId === null));
  await page.evaluate(() => navGo('alunos')); await page.waitForTimeout(250);
  chk('depois de salvo, sair mantém o aluno', await N(page) === base + 1 && await page.evaluate(() => [...document.querySelectorAll('#alunos-grid .al-n')].some(e => e.textContent === 'Teste Salvo Fictício')));

  // 6) aluno existente: Sair sem salvar continua revertendo, sem apagar
  await page.evaluate(() => selectStudent(students[0].id)); await page.waitForTimeout(300);
  await page.evaluate(() => { document.getElementById('p-nome').value = 'Nome Alterado'; _markDirty(); navGo('alunos'); }); await page.waitForTimeout(150);
  await page.click('#modal-unsaved-overlay >> text=Sair sem salvar'); await page.waitForTimeout(300);
  chk('aluno existente: continua na lista e sem a alteração', await N(page) === base + 1 && await page.evaluate(() => !students.some(s => s.perfil.nome === 'Nome Alterado')));

  // 7) limpeza de registros vazios antigos e de rascunho vazio
  chk('registro vazio antigo (com cartão padrão do CRM) também é vazio', await page.evaluate(() => { const g = { id: 5, perfil: { nome: '', condicoes: 'Nenhuma' }, anamnese: { sintomas: 'Nenhum', gosta_ex: '[]' }, prescricao: {}, reavaliacao: null, treinos: [], _treinosMigrado: true, avaliacoesAntro: [] }; ensureCrm(g); const a = _alunoVazio(g); g.crm.fluxos.push({ id: 1 }); return a && !_alunoVazio(g); }));
  chk('_alunoVazio: só o que não tem nenhum dado', await page.evaluate(() => _alunoVazio({ id: 1, perfil: { nome: '' }, anamnese: {}, prescricao: {}, reavaliacao: null }) && !_alunoVazio({ id: 1, perfil: { nome: 'A' }, anamnese: {} }) && !_alunoVazio({ id: 1, perfil: { nome: '' }, anamnese: { nivel: 'Inic' } }) && !_alunoVazio({ id: 1, perfil: { nome: '' }, treinos: [{ id: 1 }] })));
  await page.evaluate(() => { const g = { id: 123456, perfil: { nome: '' }, anamnese: {}, prescricao: {}, reavaliacao: null }; localStorage.setItem(lsKey('acm-draft-123456'), JSON.stringify(g)); detectarDraftsNaoSalvos(); });
  chk('rascunho vazio de aluno novo é descartado sem aviso', await page.evaluate(() => !document.getElementById('draft-pending-banner') && localStorage.getItem(lsKey('acm-draft-123456')) === null));

  chk('sem erro de JS', errs.length === 0, errs.join(' | '));
  await ctx.close(); await browser.close();
  console.log(`PASS ${ok.length}  FAIL ${bad.length}`);
  bad.forEach(b => console.log('FAIL', b));
  process.exit(bad.length ? 1 : 0);
})();
