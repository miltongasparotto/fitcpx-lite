// Portal do aluno: login único + cadastro por link (celular), com a nuvem simulada (nenhuma chamada real).
const { chromium } = require('playwright');
const BASE = 'http://localhost:5178';
const SHOTS = process.env.SHOTS_DIR || '';
const results = []; const ok = (n, c, info) => results.push((c ? 'PASS ' : 'FAIL ') + n + (info ? '  [' + info + ']' : ''));
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const JSON_H = { ...CORS, 'content-type': 'application/json' };
const UID = '33333333-3333-3333-3333-333333333333';

async function novaPagina(browser, { nomeLink = 'Rafael Souza', codigoValido = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const estado = { calls: [], respostas: {}, signups: 0, tokens: 0 };
  page.errs = []; page.on('pageerror', e => page.errs.push(e.message.slice(0, 160)));
  await ctx.route('**/*.supabase.co/**', async route => {
    const u = route.request().url(), m = route.request().method();
    if (m === 'OPTIONS') return route.fulfill({ status: 200, headers: CORS, body: '' });
    if (u.includes('/rpc/resolver_codigo')) return route.fulfill({ status: 200, headers: JSON_H, body: codigoValido ? '"11111111-1111-1111-1111-111111111111"' : 'null' });
    if (u.includes('/rpc/nome_do_link')) return route.fulfill({ status: 200, headers: JSON_H, body: JSON.stringify(nomeLink) });
    if (u.includes('/functions/v1/redefinir-senha-link')) {
      let b = {}; try { b = JSON.parse(route.request().postData() || '{}'); } catch (e) {}
      estado.link = (estado.link || []).concat([b]);
      const r = estado.respostaLink; const v = typeof r === 'function' ? r(b) : (r || { status: 'ok' });
      return route.fulfill({ status: 200, headers: JSON_H, body: JSON.stringify(v) });
    }
    if (u.includes('/functions/v1/esqueci-senha')) {
      let b = {}; try { b = JSON.parse(route.request().postData() || '{}'); } catch (e) {}
      estado.esqueci = (estado.esqueci || []).concat([b]);
      return route.fulfill({ status: 200, headers: JSON_H, body: JSON.stringify(estado.respostaEsqueci || { status: 'ok' }) });
    }
    if (u.includes('/functions/v1/aluno-api')) {
      let b = {}; try { b = JSON.parse(route.request().postData() || '{}'); } catch (e) {}
      estado.calls.push(b);
      const r = estado.respostas[b.acao]; const v = typeof r === 'function' ? r(b) : r;
      return route.fulfill({ status: 200, headers: JSON_H, body: JSON.stringify(v || { status: 'ok' }) });
    }
    if (u.includes('/auth/v1/signup') || u.includes('/auth/v1/token')) {
      let b = {}; try { b = JSON.parse(route.request().postData() || '{}'); } catch (e) {}
      if (u.includes('/signup')) { estado.signups++; estado.ultimoSignup = b; if (estado.atrasoSignup) await new Promise(r => setTimeout(r, estado.atrasoSignup)); } else { estado.tokens++; estado.ultimoLogin = b; }
      if (estado.loginRecusado && u.includes('/token')) return route.fulfill({ status: 400, headers: JSON_H, body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid login credentials' }) });
      const user = { id: UID, aud: 'authenticated', role: 'authenticated', email: b.email || 'x@y.com', user_metadata: b.data || {}, app_metadata: estado.appMeta || {}, created_at: new Date().toISOString() };
      return route.fulfill({ status: 200, headers: JSON_H, body: JSON.stringify({ access_token: 'tok', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'ref', user }) });
    }
    if (u.includes('/auth/v1/')) return route.fulfill({ status: 200, headers: JSON_H, body: '{}' });
    return route.fulfill({ status: 200, headers: JSON_H, body: '[]' });
  });
  page.estado = estado;
  page.telas = () => page.evaluate(() => [...document.querySelectorAll('.tela:not(.hidden),.app-shell:not(.hidden)')].map(e => e.id));
  return { ctx, page, estado };
}
const shot = async (page, nome) => { if (SHOTS) await page.screenshot({ path: SHOTS + '/' + nome + '.png' }); };

async function semLink(browser) {
  const { ctx, page } = await novaPagina(browser);
  await page.goto(BASE + '/aluno/'); await page.waitForTimeout(700);
  ok('sem link: abre só a tela de login', JSON.stringify(await page.telas()) === '["tela-login"]', JSON.stringify(await page.telas()));
  const txt = await page.textContent('#tela-login');
  ok('sem link: não existe "Já sou aluno / Sou aluno novo"', !/Sou aluno novo|Já sou aluno/i.test(txt));
  ok('sem link: login só tem e-mail e senha', await page.evaluate(() => ['login-email', 'login-senha'].every(i => document.getElementById(i)) && document.querySelectorAll('#tela-login input').length === 2));
  ok('sem link: orienta a usar o link do personal', /link de cadastro/.test(await page.textContent('#login-nota')) && await page.isVisible('#login-nota'));
  ok('sem link: sem botão "Criar minha conta"', !(await page.isVisible('#login-criar')));
  await shot(page, 'login-sem-link');
  // Enter envia o formulário
  page.estado.respostas['resolver-vinculo'] = { status: 'desconhecido' };
  await page.fill('#login-email', 'aluna@teste.com'); await page.fill('#login-senha', 'segredo1'); await page.press('#login-senha', 'Enter'); await page.waitForTimeout(500);
  ok('login: Enter envia e-mail e senha ao Supabase', page.estado.tokens === 1 && page.estado.ultimoLogin.email === 'aluna@teste.com');
  ok('login: chama resolver-vinculo depois de entrar', page.estado.calls.some(c => c.acao === 'resolver-vinculo'));
  ok('login: sem pageerror', page.errs.length === 0, page.errs.join(' | '));
  await ctx.close();
}

async function loginErrado(browser) {
  const { ctx, page, estado } = await novaPagina(browser);
  estado.loginRecusado = true;
  await page.goto(BASE + '/aluno/'); await page.waitForTimeout(600);
  await page.fill('#login-email', 'a@b.com'); await page.fill('#login-senha', 'errada'); await page.click('#login-btn'); await page.waitForTimeout(400);
  ok('login: senha errada mostra erro', (await page.textContent('#login-erro')).includes('incorretos'));
  await ctx.close();
}

async function comLink(browser) {
  const { ctx, page, estado } = await novaPagina(browser);
  await page.goto(BASE + '/aluno/?c=ABCDEFGHJK'); await page.waitForTimeout(800);
  ok('link: abre direto a tela de cadastro', JSON.stringify(await page.telas()) === '["tela-cadastro"]', JSON.stringify(await page.telas()));
  ok('link: mostra o nome do personal que enviou', (await page.textContent('#cad-personal')) === 'Rafael Souza');
  ok('link: avatar com a inicial', (await page.textContent('#cad-av')) === 'R');
  ok('link: campos iniciais (nome, CPF, e-mail, senha)', await page.evaluate(() => ['cad-nome', 'cad-cpf', 'cad-email', 'cad-senha'].every(i => document.getElementById(i))));
  ok('link: sem escolha "sou aluno novo"', !/Sou aluno novo|Já sou aluno/i.test(await page.textContent('#tela-cadastro')));
  // layout de celular
  const m = await page.evaluate(() => {
    const t = document.getElementById('tela-cadastro'); const b = document.getElementById('cad-btn').getBoundingClientRect();
    const ins = [...t.querySelectorAll('input')]; const fs = ins.map(i => parseFloat(getComputedStyle(i).fontSize));
    return { rolaH: document.documentElement.scrollWidth > innerWidth, btnBaixo: b.bottom, alt: innerHeight, btnAlt: b.height, fonteMin: Math.min(...fs), altInputs: Math.min(...ins.map(i => i.getBoundingClientRect().height)), btnVisivel: b.top >= 0 && b.bottom <= innerHeight };
  });
  ok('celular: sem rolagem horizontal', !m.rolaH);
  ok('celular: botão "Criar minha conta" visível sem rolar', m.btnVisivel, JSON.stringify(m));
  ok('celular: fonte dos campos ≥16px (iOS não dá zoom)', m.fonteMin >= 16, String(m.fonteMin));
  ok('celular: campos e botão com alvo de toque ≥44px', m.altInputs >= 44 && m.btnAlt >= 44, m.altInputs + '/' + m.btnAlt);
  const ac = await page.evaluate(() => ({ cpf: document.getElementById('cad-cpf').inputMode, mail: document.getElementById('cad-email').inputMode, nome: document.getElementById('cad-nome').autocomplete }));
  ok('celular: teclado numérico no CPF e de e-mail no e-mail', ac.cpf === 'numeric' && ac.mail === 'email' && ac.nome === 'name', JSON.stringify(ac));
  await shot(page, 'cadastro-link');

  // máscara e ver senha
  await page.fill('#cad-cpf', '52998224725');
  ok('cadastro: máscara do CPF', (await page.inputValue('#cad-cpf')) === '529.982.247-25');
  await page.click('.ver-senha[onclick*="cad-senha"]');
  ok('cadastro: botão mostrar senha', (await page.getAttribute('#cad-senha', 'type')) === 'text');
  await page.click('.ver-senha[onclick*="cad-senha"]');

  // validações (nada vai à rede)
  const limpa = async () => { await page.fill('#cad-nome', ''); await page.fill('#cad-cpf', ''); await page.fill('#cad-email', ''); await page.fill('#cad-senha', ''); };
  await limpa(); await page.click('#cad-btn');
  ok('validação: campos vazios', (await page.textContent('#cadastro-erro')).includes('Preencha'));
  await page.fill('#cad-nome', 'Aluna Teste'); await page.fill('#cad-cpf', '11111111111'); await page.fill('#cad-email', 'aluna@teste.com'); await page.fill('#cad-senha', 'abcdef');
  await page.click('#cad-btn');
  ok('validação: CPF inválido bloqueia antes de criar conta', (await page.textContent('#cadastro-erro')).includes('CPF inválido') && estado.signups === 0);
  await page.fill('#cad-cpf', '52998224725'); await page.fill('#cad-nome', 'Aluna'); await page.click('#cad-btn');
  ok('validação: pede nome e sobrenome', (await page.textContent('#cadastro-erro')).includes('sobrenome') && estado.signups === 0);
  await page.fill('#cad-nome', 'Aluna Teste'); await page.fill('#cad-email', 'sem-arroba'); await page.click('#cad-btn');
  ok('validação: e-mail inválido', (await page.textContent('#cadastro-erro')).includes('e-mail válido') && estado.signups === 0);
  await page.fill('#cad-email', 'aluna@teste.com'); await page.fill('#cad-senha', '123'); await page.click('#cad-btn');
  ok('validação: senha curta', (await page.textContent('#cadastro-erro')).includes('6 caracteres') && estado.signups === 0);
  await shot(page, 'cadastro-erro');

  // divergência: conta recém-criada é desfeita e o formulário continua
  estado.respostas['cadastro'] = { status: 'divergencia' };
  await page.fill('#cad-senha', 'abcdef'); await page.click('#cad-btn'); await page.waitForTimeout(600);
  ok('divergência: criou a conta e mandou nome+CPF+código', estado.signups === 1 && estado.calls.find(c => c.acao === 'cadastro')?.perfil?.cpf === '52998224725' && estado.calls.find(c => c.acao === 'cadastro')?.codigo === 'ABCDEFGHJK', JSON.stringify(estado.calls.find(c => c.acao === 'cadastro')));
  ok('divergência: cadastro só leva nome e CPF', JSON.stringify(Object.keys(estado.calls.find(c => c.acao === 'cadastro').perfil).sort()) === '["cpf","nome"]');
  ok('divergência: desfaz a conta nova (cancelar-cadastro)', estado.calls.some(c => c.acao === 'cancelar-cadastro'));
  ok('divergência: mensagem e continua no cadastro', (await page.textContent('#cadastro-erro')).includes('nome, CPF e e-mail') && JSON.stringify(await page.telas()) === '["tela-cadastro"]');

  // e-mail diferente
  estado.respostas['cadastro'] = { status: 'email-diferente', emailMascarado: 'a***@gmail.com' };
  await page.click('#cad-btn'); await page.waitForTimeout(500);
  ok('e-mail diferente: mostra e-mail mascarado', (await page.textContent('#cadastro-erro')).includes('a***@gmail.com'));

  // conflito: CPF vinculado a outro personal
  estado.respostas['cadastro'] = { status: 'conflito', personalNome: 'Marina Alves', jaHaPedido: false };
  await page.click('#cad-btn'); await page.waitForTimeout(500);
  ok('conflito: abre a tela de conflito (tratada à parte)', JSON.stringify(await page.telas()) === '["tela-conflito"]');
  ok('conflito: cita os dois personais', (await page.textContent('#conflito-corpo')).includes('Marina Alves') && (await page.textContent('#conflito-corpo')).includes('Rafael Souza'));
  await shot(page, 'conflito');
  await ctx.close();

  // sucesso
  const b = await novaPagina(browser);
  b.estado.respostas['cadastro'] = { status: 'ok', tipo: 'novo' };
  b.estado.respostas['resolver-vinculo'] = { status: 'ok', trainerId: 't', cadastroCompleto: true, dadosPessoais: {}, dadosCompletos: false, nome: 'Aluna Teste', personalNome: 'Rafael Souza' };
  await b.page.goto(BASE + '/aluno/?c=ABCDEFGHJK'); await b.page.waitForTimeout(700);
  await b.page.fill('#cad-nome', 'Aluna Teste'); await b.page.fill('#cad-cpf', '529.982.247-25'); await b.page.fill('#cad-email', 'aluna@teste.com'); await b.page.fill('#cad-senha', 'abcdef');
  b.estado.atrasoSignup = 1200;
  await b.page.press('#cad-senha', 'Enter'); await b.page.waitForTimeout(350);
  const ov = await b.page.evaluate(() => { const e = document.querySelector('.carregando'); const c = e && e.querySelector('.carregando-card'); return { on: !!e && e.classList.contains('on'), msg: e && e.querySelector('.carregando-msg').textContent, card: c && getComputedStyle(c).opacity, busy: document.documentElement.getAttribute('aria-busy') }; });
  ok('processando: aviso aparece ao enviar o cadastro', ov.on && ov.msg === 'Criando sua conta...' && Number(ov.card) > 0.5 && ov.busy === 'true', JSON.stringify(ov));
  await shot(b.page, 'processando');
  await b.page.mouse.click(195, 700); await b.page.mouse.click(195, 700); await b.page.keyboard.press('Enter');
  await b.page.waitForTimeout(1400);
  ok('processando: cliques repetidos não criam conta duas vezes', b.estado.signups === 1, 'signups=' + b.estado.signups);
  ok('processando: aviso some quando termina', await b.page.evaluate(() => !document.querySelector('.carregando').classList.contains('on') && !document.documentElement.hasAttribute('aria-busy')));
  await b.page.waitForTimeout(300);
  ok('sucesso: signUp com e-mail, senha e nome', b.estado.signups === 1 && b.estado.ultimoSignup.email === 'aluna@teste.com' && b.estado.ultimoSignup.data?.nome === 'Aluna Teste');
  ok('sucesso: entra direto no app (tela-app)', (await b.page.telas()).includes('tela-app'), JSON.stringify(await b.page.telas()));
  ok('sucesso: aviso de dados pessoais na Início', (await b.page.textContent('#inicio-dados')).includes('dados pessoais'));
  ok('sucesso: sem desfazer conta', !b.estado.calls.some(c => c.acao === 'cancelar-cadastro'));
  await shot(b.page, 'app-inicio');
  ok('sucesso: sem pageerror', b.page.errs.length === 0, b.page.errs.join(' | '));
  await b.ctx.close();
}

async function loginComLink(browser) {
  const { ctx, page } = await novaPagina(browser);
  await page.goto(BASE + '/aluno/?c=ABCDEFGHJK'); await page.waitForTimeout(700);
  await page.click('#tela-cadastro .link-btn'); await page.waitForTimeout(150);
  ok('link + "Entrar": abre login', JSON.stringify(await page.telas()) === '["tela-login"]');
  ok('link + "Entrar": oferece voltar para "Criar minha conta"', await page.isVisible('#login-criar'));
  await shot(page, 'login-com-link');
  await page.click('#login-criar .link-btn'); await page.waitForTimeout(150);
  ok('link: "Criar minha conta" volta ao cadastro', JSON.stringify(await page.telas()) === '["tela-cadastro"]');
  await ctx.close();
}

async function linkInvalidoESemNome(browser) {
  const a = await novaPagina(browser, { codigoValido: false });
  await a.page.goto(BASE + '/aluno/?c=INVALIDOXX'); await a.page.waitForTimeout(700);
  ok('link inválido: cai no login com aviso', JSON.stringify(await a.page.telas()) === '["tela-login"]' && (await a.page.textContent('#login-aviso')).includes('não é válido'));
  await a.ctx.close();
  const b = await novaPagina(browser, { nomeLink: null });
  await b.page.goto(BASE + '/aluno/?c=ABCDEFGHJK'); await b.page.waitForTimeout(700);
  ok('sem nome cadastrado: mostra "seu personal"', (await b.page.textContent('#cad-personal')) === 'seu personal');
  await b.ctx.close();
}

async function esqueciSenha(browser) {
  const { ctx, page, estado } = await novaPagina(browser);
  await page.goto(BASE + '/aluno/'); await page.waitForTimeout(600);
  ok('esqueci: link "Esqueci minha senha" no login', await page.isVisible('#tela-login >> text=Esqueci minha senha'));
  await page.fill('#login-email', 'aluna@teste.com');
  await page.click('#tela-login >> text=Esqueci minha senha'); await page.waitForTimeout(200);
  ok('esqueci: abre a tela própria com o e-mail já preenchido', JSON.stringify(await page.telas()) === '["tela-esqueci"]' && (await page.inputValue('#esqueci-email')) === 'aluna@teste.com');
  await shot(page, 'esqueci');
  // e-mail inválido não vai à rede
  await page.fill('#esqueci-email', 'sem-arroba'); await page.click('#esqueci-btn');
  ok('esqueci: e-mail inválido é barrado antes de enviar', (await page.textContent('#esqueci-erro')).includes('e-mail') && !estado.esqueci);
  // sucesso
  await page.fill('#esqueci-email', 'aluna@teste.com'); await page.press('#esqueci-email', 'Enter'); await page.waitForTimeout(500);
  ok('esqueci: envia o e-mail à função esqueci-senha', estado.esqueci && estado.esqueci.length === 1 && estado.esqueci[0].email === 'aluna@teste.com');
  ok('esqueci: avisa que o personal foi notificado', (await page.textContent('#esqueci-ok')).includes('Notificamos seu personal') && await page.isVisible('#esqueci-ok'));
  await shot(page, 'esqueci-ok');
  // e-mail não encontrado (decisão do produto: dizer claramente)
  estado.respostaEsqueci = { status: 'nao-encontrado' };
  await page.click('#esqueci-btn'); await page.waitForTimeout(400);
  ok('esqueci: e-mail não encontrado é dito claramente', (await page.textContent('#esqueci-erro')).includes('E-mail não encontrado') && !(await page.isVisible('#esqueci-ok')));
  estado.respostaEsqueci = { status: 'bloqueado' };
  await page.click('#esqueci-btn'); await page.waitForTimeout(400);
  ok('esqueci: acesso bloqueado', (await page.textContent('#esqueci-erro')).includes('bloqueado'));
  estado.respostaEsqueci = { status: 'muitas-tentativas' };
  await page.click('#esqueci-btn'); await page.waitForTimeout(400);
  ok('esqueci: muitas tentativas', (await page.textContent('#esqueci-erro')).includes('Muitas tentativas'));
  await page.click('#tela-esqueci >> text=Voltar para o login'); await page.waitForTimeout(150);
  ok('esqueci: voltar leva ao login', JSON.stringify(await page.telas()) === '["tela-login"]');
  ok('esqueci: sem pageerror', page.errs.length === 0, page.errs.join(' | '));
  await ctx.close();
}

async function trocaObrigatoria(browser) {
  const { ctx, page, estado } = await novaPagina(browser);
  estado.appMeta = { trocar_senha: true };
  estado.respostas['resolver-vinculo'] = { status: 'ok', trainerId: 't', cadastroCompleto: true, dadosPessoais: {}, dadosCompletos: true, nome: 'Aluna Teste', personalNome: 'Rafael Souza' };
  estado.respostas['trocar-senha-obrigatoria'] = () => { estado.appMeta = null; return { status: 'ok' }; };
  await page.goto(BASE + '/aluno/'); await page.waitForTimeout(600);
  await page.fill('#login-email', 'aluna@teste.com'); await page.fill('#login-senha', 'Temp0rar1a'); await page.click('#login-btn'); await page.waitForTimeout(600);
  ok('troca obrigatória: depois de entrar com a senha temporária pede a nova senha', JSON.stringify(await page.telas()) === '["tela-trocar-senha"]', JSON.stringify(await page.telas()));
  ok('troca obrigatória: não chamou resolver-vinculo ainda (não passa daqui)', !estado.calls.some(c => c.acao === 'resolver-vinculo'));
  await shot(page, 'troca-obrigatoria');
  await page.fill('#tp-nova', '123'); await page.fill('#tp-nova2', '123'); await page.click('#tp-btn');
  ok('troca obrigatória: senha curta', (await page.textContent('#tp-erro')).includes('6 caracteres'));
  await page.fill('#tp-nova', 'MinhaSenha9'); await page.fill('#tp-nova2', 'MinhaSenha8'); await page.click('#tp-btn');
  ok('troca obrigatória: senhas diferentes são barradas', (await page.textContent('#tp-erro')).includes('não são iguais') && !estado.calls.some(c => c.acao === 'trocar-senha-obrigatoria'));
  await page.fill('#tp-nova2', 'MinhaSenha9'); await page.press('#tp-nova2', 'Enter'); await page.waitForTimeout(900);
  const c = estado.calls.find(x => x.acao === 'trocar-senha-obrigatoria');
  ok('troca obrigatória: envia só a nova senha ao servidor', c && c.novaSenha === 'MinhaSenha9' && !('senhaAtual' in c), JSON.stringify(c));
  ok('troca obrigatória: depois segue para o app', (await page.telas()).includes('tela-app'), JSON.stringify(await page.telas()));
  ok('troca obrigatória: sem pageerror', page.errs.length === 0, page.errs.join(' | '));
  await ctx.close();
}

async function contaSenhaEmail(browser) {
  const { ctx, page, estado } = await novaPagina(browser);
  estado.respostas['resolver-vinculo'] = { status: 'ok', trainerId: 't', cadastroCompleto: true, dadosPessoais: {}, dadosCompletos: true, nome: 'Aluna Teste', personalNome: 'Rafael Souza' };
  await page.goto(BASE + '/aluno/'); await page.waitForTimeout(500);
  await page.evaluate(async () => { _alunoUser = { id: '33333333-3333-3333-3333-333333333333', email: 'aluna@teste.com', user_metadata: {}, app_metadata: {} }; await aoAutenticar(_alunoUser); });
  await page.waitForTimeout(400);
  ok('conta: botão Conta fica no topo ao lado de Sair', await page.evaluate(() => { const h = document.querySelector('#tela-app .app-header'); return h.textContent.includes('Conta') && h.textContent.includes('Sair'); }));
  await page.click('#tela-app .app-header >> text=Conta'); await page.waitForTimeout(200);
  ok('conta: abre a tela Minha conta', JSON.stringify(await page.telas()) === '["tela-conta"]');
  await shot(page, 'conta');
  const rola = await page.evaluate(() => { const t = document.getElementById('tela-conta'); return { sh: t.scrollHeight, ch: t.clientHeight, over: getComputedStyle(t).overflowY }; });
  ok('conta: tela rola no celular (formulário comprido)', rola.over === 'auto' && rola.sh >= rola.ch, JSON.stringify(rola));

  // senha: atual + nova duas vezes
  const senha = async (a, n, n2) => { await page.fill('#conta-senha-atual', a); await page.fill('#conta-senha-nova', n); await page.fill('#conta-senha-nova2', n2); await page.click('#conta-btn'); await page.waitForTimeout(300); };
  await senha('', 'novasenha1', 'novasenha1');
  ok('senha: pede a senha atual', (await page.textContent('#conta-erro')).includes('senha atual'));
  await senha('atual123', 'novasenha1', 'outradiferente');
  ok('senha: nova digitada duas vezes diferente é barrada', (await page.textContent('#conta-erro')).includes('não são iguais') && !estado.calls.some(c => c.acao === 'alterar-senha'));
  await senha('atual123', '123', '123');
  ok('senha: nova curta', (await page.textContent('#conta-erro')).includes('6 caracteres'));
  await senha('atual123', 'atual123', 'atual123');
  ok('senha: nova igual à atual', (await page.textContent('#conta-erro')).includes('diferente da atual'));
  estado.respostas['alterar-senha'] = { status: 'senha-incorreta' };
  await senha('errada123', 'novasenha1', 'novasenha1');
  ok('senha: senha atual errada (resposta do servidor)', (await page.textContent('#conta-erro')).includes('atual está incorreta'));
  estado.respostas['alterar-senha'] = { status: 'ok' };
  await senha('atual123', 'novasenha1', 'novasenha1');
  const cs = estado.calls.filter(c => c.acao === 'alterar-senha').pop();
  ok('senha: envia senha atual e nova ao servidor', cs && cs.senhaAtual === 'atual123' && cs.novaSenha === 'novasenha1' && !('novaSenha2' in cs), JSON.stringify(cs));
  ok('senha: mostra sucesso e limpa os campos', await page.isVisible('#conta-sucesso') && (await page.inputValue('#conta-senha-nova')) === '');

  // e-mail: e-mail atual + senha atual + novo duas vezes
  const mail = async (ea, sa, n, n2) => { await page.fill('#conta-email-atual', ea); await page.fill('#conta-email-senha', sa); await page.fill('#conta-email-novo', n); await page.fill('#conta-email-novo2', n2); await page.click('#conta-email-btn'); await page.waitForTimeout(300); };
  await mail('', 'atual123', 'novo@teste.com', 'novo@teste.com');
  ok('e-mail: pede o e-mail atual', (await page.textContent('#conta-email-erro')).includes('e-mail atual'));
  await mail('aluna@teste.com', '', 'novo@teste.com', 'novo@teste.com');
  ok('e-mail: pede a senha atual', (await page.textContent('#conta-email-erro')).includes('senha atual'));
  await mail('aluna@teste.com', 'atual123', 'novo@teste.com', 'novo@teste.co');
  ok('e-mail: novo digitado duas vezes diferente é barrado', (await page.textContent('#conta-email-erro')).includes('não são iguais') && !estado.calls.some(c => c.acao === 'alterar-email'));
  await mail('aluna@teste.com', 'atual123', 'invalido', 'invalido');
  ok('e-mail: novo e-mail inválido', (await page.textContent('#conta-email-erro')).includes('válido'));
  estado.respostas['alterar-email'] = { status: 'email-atual-nao-confere' };
  await mail('outro@teste.com', 'atual123', 'novo@teste.com', 'novo@teste.com');
  ok('e-mail: atual não confere (servidor)', (await page.textContent('#conta-email-erro')).includes('não confere'));
  estado.respostas['alterar-email'] = { status: 'senha-incorreta' };
  await mail('aluna@teste.com', 'errada', 'novo@teste.com', 'novo@teste.com');
  ok('e-mail: senha errada (servidor)', (await page.textContent('#conta-email-erro')).includes('atual está incorreta'));
  estado.respostas['alterar-email'] = { status: 'ok' };
  await mail('aluna@teste.com', 'atual123', 'novo@teste.com', 'NOVO@teste.com');
  const ce = estado.calls.filter(c => c.acao === 'alterar-email').pop();
  ok('e-mail: envia e-mail atual, senha atual e novo e-mail (maiúsculas não atrapalham a conferência)', ce && ce.emailAtual === 'aluna@teste.com' && ce.senhaAtual === 'atual123' && ce.novoEmail === 'novo@teste.com', JSON.stringify(ce));
  ok('e-mail: mostra sucesso', await page.isVisible('#conta-email-sucesso'));
  ok('conta: sem pageerror', page.errs.length === 0, page.errs.join(' | '));
  await ctx.close();
}


async function linkDeSenha(browser) {
  const T = 'Q'.repeat(43);
  const { ctx, page, estado } = await novaPagina(browser);
  estado.respostaLink = (b) => (b.acao === 'verificar' ? { status: 'ok' } : { status: 'ok', email: 'aluna@teste.com' });
  estado.respostas['resolver-vinculo'] = { status: 'ok', trainerId: 't', cadastroCompleto: true, dadosPessoais: {}, dadosCompletos: true, nome: 'Aluna Teste', personalNome: 'Rafael Souza' };
  await page.goto(BASE + '/aluno/?r=' + T); await page.waitForTimeout(800);
  ok('link de senha: abre direto a tela "Crie sua nova senha"', JSON.stringify(await page.telas()) === '["tela-link-senha"]', JSON.stringify(await page.telas()));
  ok('link de senha: confere o link no servidor ao abrir (sem gastar)', estado.link && estado.link[0].acao === 'verificar' && estado.link[0].token === T && estado.link.length === 1);
  ok('link de senha: o token sai da barra de endereço', !page.url().includes('?r=') && !page.url().includes(T), page.url());
  ok('link de senha: formulário visível, sem botão de login', await page.isVisible('#ls-form') && !(await page.isVisible('#ls-sair')));
  await shot(page, 'link-senha');
  await page.fill('#ls-nova', '123'); await page.fill('#ls-nova2', '123'); await page.click('#ls-btn');
  ok('link de senha: senha curta é barrada', (await page.textContent('#ls-erro')).includes('6 caracteres') && estado.link.length === 1);
  await page.fill('#ls-nova', 'MinhaSenha9'); await page.fill('#ls-nova2', 'MinhaSenha8'); await page.click('#ls-btn');
  ok('link de senha: senhas diferentes são barradas antes de enviar', (await page.textContent('#ls-erro')).includes('não são iguais') && estado.link.length === 1);
  await page.fill('#ls-nova2', 'MinhaSenha9'); await page.press('#ls-nova2', 'Enter'); await page.waitForTimeout(1000);
  const d = estado.link.find((x) => x.acao === 'definir');
  ok('link de senha: envia o token e a nova senha', d && d.token === T && d.novaSenha === 'MinhaSenha9', JSON.stringify(d));
  ok('link de senha: entra sozinho com o e-mail devolvido pelo servidor e a nova senha', estado.tokens === 1 && estado.ultimoLogin.email === 'aluna@teste.com' && estado.ultimoLogin.password === 'MinhaSenha9', JSON.stringify(estado.ultimoLogin));
  ok('link de senha: depois de criar a senha cai no app', (await page.telas()).includes('tela-app'), JSON.stringify(await page.telas()));
  ok('link de senha: sem pageerror', page.errs.length === 0, page.errs.join(' | '));
  await ctx.close();

  // link com problema: mensagem clara e saída para o login
  const casos = { invalido: 'não é válido', usado: 'já foi usado', expirado: 'expirou', bloqueado: 'bloqueado' };
  for (const [status, trecho] of Object.entries(casos)) {
    const p = await novaPagina(browser);
    p.estado.respostaLink = { status };
    await p.page.goto(BASE + '/aluno/?r=' + T); await p.page.waitForTimeout(700);
    ok('link ' + status + ': mostra a mensagem e esconde o formulário', (await p.page.textContent('#ls-erro')).includes(trecho) && !(await p.page.isVisible('#ls-form')) && await p.page.isVisible('#ls-sair'), (await p.page.textContent('#ls-erro')).slice(0, 60));
    if (status === 'expirado') {
      await shot(p.page, 'link-senha-expirado');
      await p.page.click('#ls-sair button'); await p.page.waitForTimeout(150);
      ok('link expirado: "Ir para o login" leva ao login', JSON.stringify(await p.page.telas()) === '["tela-login"]');
    }
    await p.ctx.close();
  }

  // expira enquanto o aluno digita: o envio recusa e orienta
  const q = await novaPagina(browser);
  q.estado.respostaLink = (b) => (b.acao === 'verificar' ? { status: 'ok' } : { status: 'expirado' });
  await q.page.goto(BASE + '/aluno/?r=' + T); await q.page.waitForTimeout(700);
  await q.page.fill('#ls-nova', 'MinhaSenha9'); await q.page.fill('#ls-nova2', 'MinhaSenha9'); await q.page.click('#ls-btn'); await q.page.waitForTimeout(600);
  ok('link que expira durante a digitação: avisa e oferece o login, sem entrar', (await q.page.textContent('#ls-erro')).includes('expirou') && !(await q.page.isVisible('#ls-form')) && q.estado.tokens === 0);
  await q.ctx.close();

  // token com lixo na URL não quebra a página
  const r = await novaPagina(browser);
  r.estado.respostaLink = { status: 'invalido' };
  await r.page.goto(BASE + '/aluno/?r=<script>alert(1)</script>'); await r.page.waitForTimeout(600);
  ok('token malformado: cai em "link inválido" sem erro de página', (await r.page.textContent('#ls-erro')).includes('não é válido') && r.page.errs.length === 0);
  await r.ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  for (const f of [semLink, loginErrado, comLink, loginComLink, linkInvalidoESemNome, esqueciSenha, trocaObrigatoria, contaSenhaEmail, linkDeSenha]) {
    try { await f(browser); } catch (e) { ok(f.name + ' (exceção)', false, String(e.message).split('\n')[0]); }
  }
  await browser.close();
  console.log(results.join('\n'));
  console.log('\n' + results.filter(r => r.startsWith('FAIL')).length + ' FAIL de ' + results.length);
})();
