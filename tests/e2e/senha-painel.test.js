// Painel do personal: pedido de "esqueci minha senha" vira tarefa urgente; redefinir senha (automática ou
// escolhida) e mensagem pronta para o WhatsApp. Nuvem simulada (nenhuma chamada real). Dados 100% fictícios.
const { chromium } = require('playwright');
const BASE = 'http://localhost:5178';
const SHOTS = process.env.SHOTS_DIR || '';
const results = []; const ok = (n, c, info) => results.push((c ? 'PASS ' : 'FAIL ') + n + (info ? '  [' + info + ']' : ''));
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const JSON_H = { ...CORS, 'content-type': 'application/json' };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  page.on('dialog', d => d.accept().catch(() => {}));
  let pedidos = [];
  await ctx.route('**/*.supabase.co/**', r => {
    const u = r.request().url();
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 200, headers: CORS, body: '' });
    if (u.includes('/rest/v1/senha_pedidos')) return r.fulfill({ status: 200, headers: JSON_H, body: JSON.stringify(pedidos) });
    return r.fulfill({ status: 200, headers: JSON_H, body: '[]' });
  });
  await page.goto(BASE + '/index.html');
  await page.evaluate(async () => {
    history.replaceState(null, '', '/?demo');
    const t = await (await fetch('tests/fixtures/seed-ficticio.js?' + Date.now())).text();
    const sc = document.createElement('script'); sc.textContent = t.replace(/^renderObjGrid\(\);/, ''); document.body.appendChild(sc);
    document.getElementById('auth-screen').style.display = 'none'; document.getElementById('app-root').style.display = 'grid';
    crmLoad(); seedPresetCats(); renderStudentList(); navGo('dashboard');
    window.__calls = []; window.__resp = {};
    _supaUser = { id: 'trainer-1', email: 'p@x.com' };
    Object.defineProperty(supa, 'functions', { value: { invoke: async (nome, { body }) => { window.__calls.push({ nome, body }); const r = window.__resp[body.acao]; const v = typeof r === 'function' ? r(body) : r; return { data: v === undefined ? { status: 'ok' } : v, error: null }; } } });
    // aluno de teste com conta no portal e WhatsApp
    const s = students[0]; s.perfil.alunoUserId = 'u-amanda'; s.perfil.email = 'amanda@teste.com'; s.perfil.whatsapp = '(44) 99999-1111'; s.perfil.portalStatus = 'ativo';
    window.__aluno = s.id;
    window.__abertos = []; window.open = (url) => { window.__abertos.push(url); return null; };
  });
  const ev = (f, a) => page.evaluate(f, a);

  // ── pedido → tarefa urgente ──
  pedidos = [{ id: 'ped-1', aluno_user_id: 'u-amanda', criado_em: new Date().toISOString() }];
  await ev(() => sincronizarPedidosSenha());
  const t1 = await ev(() => DB.tasks.filter(t => t.acao === 'senha').map(t => ({ ...t, catLabel: catLabel(t.cat), alunoId: t.alunoId })));
  ok('pedido vira UMA tarefa de redefinir senha', t1.length === 1 && t1[0].titulo === 'Redefinir senha' && t1[0].pedidoSenhaId === 'ped-1');
  ok('tarefa na categoria Urgente, com prazo e ligada ao aluno', t1[0].catLabel === 'Urgente' && t1[0].tipo === 'prazo' && t1[0].alunoId === (await ev(() => window.__aluno)));
  ok('categorias padrão continuam existindo (Urgente só foi acrescentada)', await ev(() => ['Avaliação', 'Treino', 'Monitoramento', 'Reavaliação', 'Renovação', 'Urgente'].every(n => getCatDefs().some(c => c.label === n))));
  await ev(() => sincronizarPedidosSenha());
  ok('sincronizar de novo não duplica a tarefa', (await ev(() => DB.tasks.filter(t => t.acao === 'senha').length)) === 1);
  ok('contagem de urgentes no menu sobe', (await ev(() => urgentCount())) >= 1);

  // ── a tarefa mostra só o botão que abre o fluxo ──
  await ev(() => navGo('agenda')); await page.waitForTimeout(400);
  const card = page.locator('#screen-agenda .tcard', { hasText: 'Redefinir senha' }).first();
  ok('agenda mostra a tarefa "Redefinir senha" com o nome do aluno', await card.isVisible() && (await card.textContent()).includes(await ev(() => alunoNome(students[0]))));
  const botoes = await card.locator('button').allTextContents();
  ok('tarefa tem só o botão "Redefinir senha" (sem Visto, WhatsApp, reagendar, editar)', botoes.length === 1 && botoes[0].includes('Redefinir senha'), JSON.stringify(botoes));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/painel-tarefa-senha.png' });
  await card.locator('button').click(); await page.waitForTimeout(300);
  ok('clicar já abre o fluxo de redefinição', await page.isVisible('#m-reset-senha .modal-title') && (await page.textContent('#rs-aluno')).includes('amanda@teste.com'));
  ok('fluxo abre no modo "enviar link", sem campo de senha', await page.isChecked('input[name=rs-modo][value=link]') && !(await page.isVisible('#rs-manual-wrap')));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/painel-redefinir-1.png' });

  // ── link (vem da tarefa): gera o link, abre o WhatsApp sozinho, nenhuma senha sai ──
  ok('da tarefa: abre no modo "link" e o botão diz "Gerar link e enviar no WhatsApp"', await page.isChecked('input[name=rs-modo][value=link]') && (await page.textContent('#rs-btn')).includes('Gerar link e enviar no WhatsApp'));
  ok('da tarefa: explica que o link vale 24 horas e é de uso único', /24 horas/.test(await page.textContent('#rs-dica-link')) && /só funciona uma vez/.test(await page.textContent('#rs-dica-link')));
  await ev(() => { window.__resp['gerar-link-senha'] = () => ({ status: 'ok', token: 'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT', expiraEm: new Date(Date.now() + 86400000).toISOString() }); });
  pedidos = [];
  await page.click('#rs-btn'); await page.waitForTimeout(500);
  const c1 = await ev(() => window.__calls.filter(c => c.body.acao === 'gerar-link-senha').pop());
  ok('link: pede o link à função com o e-mail do aluno', c1 && c1.nome === 'trainer-transferencia' && c1.body.email === 'amanda@teste.com', JSON.stringify(c1));
  ok('link: nenhuma troca de senha foi feita (a senha atual continua valendo)', (await ev(() => window.__calls.filter(c => c.body.acao === 'definir-senha').length)) === 0);
  const url = await page.inputValue('#rs-link');
  ok('link: aponta para o portal com ?r=<token>', /\/aluno\/\?r=TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT$/.test(url), url);
  const msg = await page.inputValue('#rs-msg');
  ok('mensagem: traz o link, diz que vale 24 horas e uma vez, e onde trocar depois', msg.includes(url) && msg.includes('24 horas') && msg.includes('só funciona uma vez') && /"Conta".*topo.*"Sair"/s.test(msg), msg.replace(/\n/g, ' | '));
  ok('mensagem: sem senha e sem e-mail', !/@/.test(msg) && !/senha temporária/i.test(msg), msg.slice(0, 80));
  const abertos1 = await ev(() => window.__abertos.slice());
  ok('link: o WhatsApp do aluno abre sozinho com a mensagem pronta', abertos1.length === 1 && abertos1[0].startsWith('https://wa.me/5544999991111?text=') && decodeURIComponent(abertos1[0]).includes('?r=TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT'), abertos1[0] && abertos1[0].slice(0, 60));
  ok('tarefa é concluída sozinha depois de gerar o link', await ev(() => DB.tasks.filter(t => t.acao === 'senha').every(t => t.done)));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/painel-redefinir-2.png' });
  await page.click('#rs-enviar'); await page.waitForTimeout(150);
  ok('"Abrir WhatsApp" abre outra vez', (await ev(() => window.__abertos.length)) === 2);
  ok('aviso de processamento fechou depois da chamada', await ev(() => !document.querySelector('.carregando').classList.contains('on')));
  await ev(() => crmCloseModal('m-reset-senha'));

  // ── escolhida pelo personal (Perfil): só altera, nada é enviado ──
  await ev(() => abrirRedefinirSenha(window.__aluno));
  ok('do Perfil: abre direto no modo "escolher a senha"', await page.isChecked('input[name=rs-modo][value=manual]') && await page.isVisible('#rs-manual-wrap'));
  ok('do Perfil: botão diz "Salvar nova senha" e a dica avisa que nada é enviado', (await page.textContent('#rs-btn')).includes('Salvar nova senha') && (await page.textContent('#rs-dica-manual')).includes('Nenhuma mensagem é enviada'));
  if (SHOTS) await page.screenshot({ path: SHOTS + '/painel-redefinir-manual.png' });
  await page.fill('#rs-senha', '123'); await page.click('#rs-btn'); await page.waitForTimeout(200);
  ok('manual: senha curta é barrada sem chamar o servidor', (await page.textContent('#rs-erro')).includes('6 caracteres') && (await ev(() => window.__calls.filter(c => c.body.acao === 'definir-senha').length)) === 0);
  await ev(() => { window.__resp['definir-senha'] = () => ({ status: 'ok', alunoUserId: 'u-amanda' }); });
  await page.fill('#rs-senha', 'Escolhida9'); await page.click('#rs-btn'); await page.waitForTimeout(400);
  const c2 = await ev(() => window.__calls.filter(c => c.body.acao === 'definir-senha').pop());
  ok('manual: envia a senha digitada', c2.body.novaSenha === 'Escolhida9');
  ok('manual: mostra "Senha alterada. Nenhuma mensagem foi enviada" e a senha', await page.isVisible('#rs-passo3') && (await page.textContent('#rs-passo3')).includes('Nenhuma mensagem foi enviada') && (await page.inputValue('#rs-novasenha')) === 'Escolhida9');
  ok('manual: não monta mensagem nem abre o WhatsApp', !(await page.isVisible('#rs-passo2')) && (await ev(() => window.__abertos.length)) === 2);
  await ev(() => crmCloseModal('m-reset-senha'));

  // ── escolhida pela tarefa do CRM: também só altera e fecha a tarefa ──
  pedidos = [{ id: 'ped-3', aluno_user_id: 'u-amanda', criado_em: new Date().toISOString() }];
  await ev(() => sincronizarPedidosSenha());
  const tid = await ev(() => DB.tasks.find(t => t.acao === 'senha' && !t.done).id);
  await ev((t) => abrirRedefinirSenha(window.__aluno, t), tid);
  ok('da tarefa: abre em "link", mas dá para trocar para "escolher a senha"', await page.isChecked('input[name=rs-modo][value=link]'));
  await ev(() => { const m = document.querySelector('input[name=rs-modo][value=manual]'); m.checked = true; rsModo(); });
  await page.fill('#rs-senha', 'OutraSenha7'); await page.click('#rs-btn'); await page.waitForTimeout(400);
  ok('da tarefa + manual: só altera (sem mensagem) e conclui a tarefa', await page.isVisible('#rs-passo3') && (await ev(() => window.__abertos.length)) === 2 && (await ev(() => DB.tasks.filter(t => t.acao === 'senha' && !t.done).length)) === 0);
  await ev(() => crmCloseModal('m-reset-senha'));

  // ── aluno sem WhatsApp (link): não abre nada, só copiar ──
  await ev(() => { students[0].perfil.whatsapp = ''; abrirRedefinirSenha(window.__aluno, null); const m = document.querySelector('input[name=rs-modo][value=link]'); m.checked = true; rsModo(); });
  await page.click('#rs-btn'); await page.waitForTimeout(400);
  ok('sem WhatsApp: não abre nada, botão desativado e aviso para copiar', await page.isDisabled('#rs-enviar') && await page.isVisible('#rs-sem-zap') && (await ev(() => window.__abertos.length)) === 2);
  await ev(() => crmCloseModal('m-reset-senha'));

  // ── pedido atendido em outro aparelho fecha a tarefa que sobrou ──
  await ev(() => { students[0].perfil.whatsapp = '(44) 99999-1111'; });
  pedidos = [{ id: 'ped-2', aluno_user_id: 'u-amanda', criado_em: new Date().toISOString() }];
  await ev(() => sincronizarPedidosSenha());
  ok('novo pedido cria nova tarefa aberta', (await ev(() => DB.tasks.filter(t => t.acao === 'senha' && !t.done).length)) === 1);
  pedidos = [];
  await ev(() => sincronizarPedidosSenha());
  ok('pedido que deixou de estar aberto (atendido em outro lugar) fecha a tarefa', (await ev(() => DB.tasks.filter(t => t.acao === 'senha' && !t.done).length)) === 0);

  // ── pedido de aluno que não é deste personal é ignorado; sem a tabela, não quebra ──
  pedidos = [{ id: 'ped-9', aluno_user_id: 'u-desconhecido', criado_em: new Date().toISOString() }];
  await ev(() => sincronizarPedidosSenha());
  ok('pedido de aluno que não está na lista é ignorado', (await ev(() => DB.tasks.filter(t => t.pedidoSenhaId === 'ped-9').length)) === 0);
  pedidos = { message: 'relation "senha_pedidos" does not exist' };
  await ev(() => sincronizarPedidosSenha());
  ok('sem a tabela (SQL ainda não rodado) o painel segue normal', true);

  // ── perfil: botão agora é "Redefinir senha" e usa o mesmo fluxo ──
  ok('Perfil: botão "Redefinir senha" existe e usa o mesmo fluxo', await ev(() => { const b = document.getElementById('p-portal-reset-btn'); return !!b && b.textContent.includes('Redefinir senha') && b.getAttribute('onclick') === 'alunoResetarSenha()' && typeof alunoResetarSenha === 'function'; }));
  ok('painel: sem pageerror', errs.length === 0, errs.join(' | '));

  await browser.close();
  console.log(results.join('\n'));
  console.log('\n' + results.filter(r => r.startsWith('FAIL')).length + ' FAIL de ' + results.length);
})().catch(e => { console.log(results.join('\n')); console.error('ERRO', e.message); process.exit(1); });
