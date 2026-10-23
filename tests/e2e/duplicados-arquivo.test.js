// Aluno duplicado e cadastro antigo (18/10/2026): alertas Duplicado e Cadastro antigo na lista, avisos na ficha,
// Unir cadastros, Importar dados antigos, aviso ao salvar o Cadastro e aviso das transferências automáticas.
// Dados 100% fictícios. Rodar: servidor em 5178 e, em C:/Users/junio/.claude/skills/playwright-skill:  node run.js <este arquivo>
const { chromium } = require('playwright');
const BASE = 'http://localhost:5178';
const ok = [], bad = [];
const chk = (n, c, extra) => (c ? ok : bad).push(n + (c ? '' : ' :: ' + (extra || '')));
const CPF = '52998224725';

async function boot(page) {
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.evaluate(async () => {
    history.replaceState(null, '', '/?demo');
    const t = await (await fetch('tests/fixtures/seed-ficticio.js?' + Date.now())).text();
    const sc = document.createElement('script'); sc.textContent = t.replace(/^renderObjGrid\(\);/, ''); document.body.appendChild(sc);
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-root').style.display = 'grid';
    crmLoad(); seedPresetCats();
    renderStudentList();
  });
}
const vis = (page, id) => page.evaluate(i => { const e = document.getElementById(i); return !!e && !e.classList.contains('hidden') && getComputedStyle(e).display !== 'none'; }, id);
const txt = (page, sel) => page.evaluate(s => (document.querySelector(s) || {}).textContent || '', sel);
const ids = page => page.evaluate(() => students.map(s => s.id + ':' + s.perfil.nome));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 160)); });
  const dialogos = [];
  page.on('dialog', d => { dialogos.push(d.message()); d.accept().catch(() => {}); });
  await boot(page);

  // ── cenário: Carla duplicada (cadastro manual completo + registro do portal, sem dados) e Dora arquivada ──
  await page.evaluate((CPF) => {
    const mk = (id, perfil, extra) => Object.assign({ id, perfil, anamnese: {}, avaliacoesAntro: [], treinos: [], crm: { status: 'ativo', sit2: 1, fluxos: [], statusSince: todayStr() } }, extra || {});
    students.push(mk(7001, { nome: 'Carla Souza', cpf: CPF, email: 'carla@x.com', nascimento: '1990-05-20', sexo: 'F', whatsapp: '(44) 99999-1111', profissao: 'Professora' },
      { anamnese: { objetivo: 'Emagr', nivel: 'Inte' }, avaliacoesAntro: [{ id: 1, data_avaliacao: '2026-03-01', peso: '70', altura: '165' }] }));
    students.push(mk(7002, { nome: 'Carla Souza', cpf: CPF, email: 'carla@x.com', alunoUserId: 'conta-carla', portalStatus: 'ativo' }));
    students.push(mk(7003, { nome: 'Dora Lima', cpf: '11144477735', email: 'dora@x.com' }));
    students.push(mk(7004, { nome: 'Carlos Souza', email: 'carla@x.com' }));   // mesmo e-mail, outro nome: NÃO é duplicado
    const velho = mk(6001, { nome: 'Dora Lima', cpf: '11144477735', email: 'dora@x.com', nascimento: '1985-02-02', sexo: 'F', whatsapp: '(11) 98888-7777' },
      { anamnese: { objetivo: 'Hip', nivel: 'Avan' }, avaliacoesAntro: [{ id: 9, data_avaliacao: '2025-01-10', peso: '60', altura: '160' }], treinos: [{ id: 5, status: 'aprovado' }] });
    ARQUIVO.push({ arqId: 'arq-dora', tipo: 'aluno', rotulo: 'Dora Lima', dados: velho, excluidoEm: '2026-06-01T12:00:00.000Z', idOriginal: 6001, restauradoEm: null, restauradoComoId: null });
    window._salvos = 0; window.supaAutoSave = () => { window._salvos++; };
    renderStudentList();
  }, CPF);

  // ── alertas na lista ──
  const alertas = await page.evaluate(() => Object.fromEntries(students.filter(s => [7001, 7002, 7003, 7004].includes(s.id)).map(s => [s.id, _alAlertas(s)])));
  chk('Carla (manual) e Carla (portal) aparecem como Duplicado', alertas[7001].includes('duplicado') && alertas[7002].includes('duplicado'), JSON.stringify(alertas));
  chk('mesmo e-mail com outro nome NÃO é duplicado', !alertas[7004].includes('duplicado'), JSON.stringify(alertas[7004]));
  chk('Dora na lista, com Dora nas Arquivadas: Cadastro antigo', alertas[7003].includes('antigo') && !alertas[7003].includes('duplicado'), JSON.stringify(alertas[7003]));
  chk('aluno sem relação não ganha os alertas', await page.evaluate(() => !_alAlertas(students[0]).includes('duplicado') && !_alAlertas(students[0]).includes('antigo')));
  await page.evaluate(() => navGo('alunos')); await page.waitForTimeout(250);
  const tabs = await page.$$eval('#alunos-tabs .al-alertas .dp-seg-b', b => b.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  chk('filtro de alertas ganhou Duplicado (2) e Cadastro antigo (1)', tabs.length === 5 && /Duplicado\s*2/.test(tabs[3]) && /Cadastro antigo\s*1/.test(tabs[4]), tabs.join('|'));
  await page.click('#alunos-tabs .al-ab-duplicado'); await page.waitForTimeout(80);
  const filtrados = await page.$$eval('#alunos-grid .al-n', e => e.map(x => x.textContent.trim()));
  chk('filtro Duplicado mostra só as duas Carlas', filtrados.length === 2 && filtrados.every(n => n.startsWith('Carla Souza')), filtrados.join('|'));
  await page.click('#alunos-tabs .al-ab-duplicado'); await page.waitForTimeout(80);

  // ── ficha da Carla: aviso e Unir cadastros ──
  await page.evaluate(() => { selectStudent(7002); switchTab('info'); });
  await page.waitForTimeout(200);
  chk('ficha: aviso Possível duplicado com o botão', await vis(page, 'aluno-dup-banner') && (await txt(page, '#aluno-dup-banner')).includes('Possível duplicado') && (await txt(page, '#aluno-dup-banner')).includes('Unir cadastros'));
  chk('ficha: selo Duplicado ao lado da situação', (await txt(page, '#fx-alertas')).includes('Duplicado'));
  await page.click('#aluno-dup-banner button');
  await page.waitForTimeout(500);
  chk('Unir pediu confirmação explicando o que acontece', dialogos.some(d => /Unir 2 cadastros/.test(d) && /Arquivadas/.test(d)), dialogos.join(' | ').slice(0, 200));
  const depois = await ids(page);
  chk('ficou um cadastro só da Carla (o que tem a conta)', depois.filter(x => x.includes('Carla Souza')).join() === '7002:Carla Souza', depois.join());
  const carla = await page.evaluate(() => { const s = students.find(x => x.id === 7002); return { nasc: s.perfil.nascimento, sexo: s.perfil.sexo, zap: s.perfil.whatsapp, prof: s.perfil.profissao, conta: s.perfil.alunoUserId, obj: s.anamnese.objetivo, avals: s.avaliacoesAntro.length }; });
  chk('dados do cadastro manual completaram o do portal', carla.nasc === '1990-05-20' && carla.sexo === 'F' && carla.zap === '(44) 99999-1111' && carla.prof === 'Professora' && carla.obj === 'Emagr' && carla.avals === 1, JSON.stringify(carla));
  chk('a conta do portal continua no cadastro que ficou', carla.conta === 'conta-carla');
  chk('o cadastro que saiu foi para as Arquivadas, marcado como unido', await page.evaluate(() => ARQUIVO.some(e => e.tipo === 'aluno' && e.idOriginal === 7001 && e.unidoEm)));
  chk('o cadastro unido arquivado NÃO vira "cadastro antigo" da Carla', await page.evaluate(() => !_alAlertas(students.find(x => x.id === 7002)).includes('antigo')));
  chk('depois de unir, o aviso some e salvou na nuvem', !(await vis(page, 'aluno-dup-banner')) && await page.evaluate(() => window._salvos > 0));

  // ── Dora: Importar dados antigos ──
  await page.evaluate(() => { selectStudent(7003); switchTab('info'); });
  await page.waitForTimeout(200);
  chk('ficha: aviso Cadastro antigo encontrado com o botão', await vis(page, 'aluno-dup-banner') && (await txt(page, '#aluno-dup-banner')).includes('Cadastro antigo encontrado') && (await txt(page, '#aluno-dup-banner')).includes('Importar dados antigos'));
  chk('o aviso cita a data em que foi arquivado', (await txt(page, '#aluno-dup-banner')).includes('01/06/2026'));
  await page.click('#aluno-dup-banner button');
  await page.waitForTimeout(500);
  chk('Importar pediu confirmação com a contagem do que vem', dialogos.some(d => /Importar os dados antigos de "Dora Lima"/.test(d) && /1 avaliação/.test(d) && /1 treino/.test(d)), dialogos.slice(-1)[0]);
  const dora = await page.evaluate(() => { const s = students.find(x => x.id === 7003); return { nasc: s.perfil.nascimento, zap: s.perfil.whatsapp, email: s.perfil.email, obj: s.anamnese.objetivo, avals: s.avaliacoesAntro.length, treinos: s.treinos.length, env: ARQUIVO.find(e => e.arqId === 'arq-dora') }; });
  chk('dados antigos preencheram o cadastro (e o e-mail atual não mudou)', dora.nasc === '1985-02-02' && dora.zap === '(11) 98888-7777' && dora.email === 'dora@x.com' && dora.obj === 'Hip' && dora.avals === 1 && dora.treinos === 1, JSON.stringify(dora).slice(0, 200));
  chk('o arquivo marca como restaurado para o aluno', !!dora.env.restauradoEm && dora.env.restauradoComoId === 7003);
  chk('depois de importar, o aviso some e o alerta também', !(await vis(page, 'aluno-dup-banner')) && await page.evaluate(() => !_alAlertas(students.find(x => x.id === 7003)).includes('antigo')));

  // ── aviso ao salvar o Cadastro: aluno novo com CPF de um Arquivado ──
  await page.evaluate(() => {
    const velho = { id: 6002, perfil: { nome: 'Eva Prado', cpf: '39053344705', email: 'eva@x.com', nascimento: '1992-09-09' }, anamnese: {}, avaliacoesAntro: [], treinos: [] };
    ARQUIVO.push({ arqId: 'arq-eva', tipo: 'aluno', rotulo: 'Eva Prado', dados: velho, excluidoEm: '2026-05-05T12:00:00.000Z', idOriginal: 6002, restauradoEm: null, restauradoComoId: null });
    students.push({ id: 7005, perfil: { nome: 'Eva Prado', cpf: '39053344705', email: 'eva@x.com' }, anamnese: {}, avaliacoesAntro: [], treinos: [], crm: { status: 'ativo', sit2: 1, fluxos: [] } });
    _uaCache = null;
  });
  const avisou = await page.evaluate(() => { const s = students.find(x => x.id === 7005); const a = uaAvisarArquivoAntigo(s), b = uaAvisarArquivoAntigo(s); return [a, b]; });
  chk('ao salvar o Cadastro com CPF de um Arquivado abre o aviso, uma vez só', avisou[0] === true && avisou[1] === false, JSON.stringify(avisou));
  chk('o aviso é o modal com Importar dados antigos e Continuar sem importar', await page.evaluate(() => { const o = document.getElementById('modal-vinculo-overlay'); return !o.classList.contains('hidden') && /Cadastro antigo encontrado/.test(o.textContent) && /Importar dados antigos/.test(o.textContent) && /Continuar sem importar/.test(o.textContent); }));
  await page.evaluate(() => _fecharVinculo());

  // ── transferências automáticas: aviso e texto ──
  const textos = await page.evaluate(() => [
    _textoAutomatica({ sentido: 'saiu', situacaoAnterior: 'inativo', outroNome: 'Bruno Lima', quando: '2026-10-18T14:00:00Z' }),
    _textoAutomatica({ sentido: 'chegou', situacaoAnterior: 'arquivado', outroNome: 'Ana Costa', quando: '2026-10-18T14:00:00Z' }),
  ]);
  chk('texto do personal que perdeu o aluno', /inativo com você/.test(textos[0]) && /Bruno Lima/.test(textos[0]) && /automática/.test(textos[0]), textos[0]);
  chk('texto do personal que recebeu o aluno', /arquivado com <b>Ana Costa/.test(textos[1]) && /sem os treinos antigos/.test(textos[1]), textos[1]);
  await page.evaluate(() => { localStorage.removeItem(lsKey('transf-auto-vistas')); window._tc = 0; window.supaCarregarDados = async () => { window._tc++; }; _transf = { saindo: [], chegando: [], pendentes: [], automaticas: [{ id: 'a1', nomeAluno: 'Carla Souza', sentido: 'saiu', situacaoAnterior: 'inativo', outroNome: 'Bruno Lima', quando: '2026-10-18T14:00:00Z' }] }; });
  await page.evaluate(() => avisarTransferenciasAutomaticas());
  await page.evaluate(() => avisarTransferenciasAutomaticas());
  chk('aviso de transferência automática: recarrega a lista uma vez e só avisa uma vez', await page.evaluate(() => window._tc === 1 && _autoVistas().join() === 'a1'));
  await page.evaluate(() => { const w = document.createElement('div'); w.id = 'tmp-wrap'; document.body.appendChild(w); renderPortalTransferencias(w, ''); });
  chk('lista de transferências mostra a seção das automáticas', await page.evaluate(() => /Transferências automáticas/.test(document.getElementById('tmp-wrap').textContent) && /Saiu/.test(document.getElementById('tmp-wrap').textContent)));

  // ── situação Pausado volta como própria ──
  chk('Pausado é situação própria e fica fora das tarefas', await page.evaluate(() => situacaoDe({ crm: { status: 'pausado' } }) === 'pausado' && !alunoActiveForTasks({ crm: { status: 'pausado' } })));

  chk('sem erro de JavaScript', errs.length === 0, errs.slice(0, 3).join(' | '));
  console.log('PASS ' + ok.length + '  FAIL ' + bad.length);
  bad.forEach(b => console.log('  FAIL ' + b));
  await browser.close();
  process.exit(bad.length ? 1 : 0);
})();
