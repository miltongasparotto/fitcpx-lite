// Ficha do aluno (15/10/2026): cartão principal, Informações pessoais, menu de status e página de Cadastro.
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
    crmLoad(); seedPresetCats();
    renderStudentList();
  });
}
const vis = (page, id) => page.evaluate(i => { const e = document.getElementById(i); return !!e && !e.classList.contains('hidden') && getComputedStyle(e).display !== 'none'; }, id);
const txt = (page, sel) => page.evaluate(s => (document.querySelector(s) || {}).textContent || '', sel);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 160)); });
  let aceitar = true; const dialogos = [];
  page.on('dialog', d => { dialogos.push(d.message()); (aceitar ? d.accept() : d.dismiss()).catch(() => {}); });
  await page.route('https://viacep.com.br/ws/**', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify(r.request().url().includes('99999999') ? { erro: true } : { cep: '01310-100', logradouro: 'Avenida Paulista', bairro: 'Bela Vista', localidade: 'São Paulo', uf: 'SP' }) }));
  await boot(page);

  // ── abre a ficha: Informações pessoais é a aba inicial ──
  await page.evaluate(() => selectStudent(students[0].id));
  await page.waitForTimeout(200);
  chk('abre em Informações pessoais', await vis(page, 'panel-info') && !(await vis(page, 'panel-perfil')));
  chk('aba ativa: Informações pessoais', (await txt(page, '#fx-ficha .dp-seg-b.on')).includes('Informações pessoais'));
  chk('cartão principal: nome', (await txt(page, '#student-header-name')) === 'Amanda Silva');
  chk('cartão principal: iniciais', (await txt(page, '#fx-av')) === 'AS');
  chk('cartão principal: sexo e idade', /Feminino/.test(await txt(page, '#student-badges')) && /\d+ anos/.test(await txt(page, '#student-badges')));
  chk('cartão principal: datas de avaliação e treino', /\d{2}\/\d{2}\/\d{4}/.test(await txt(page, '#fx-aval-d')) && /dias|hoje|ontem/.test(await txt(page, '#fx-aval-h')) && /\d{2}\/\d{2}\/\d{4}/.test(await txt(page, '#fx-trn-d')));
  chk('Informações: bloco Contato e bloco Dados pessoais', (await txt(page, '#fx-blk-contato')).includes('Contato') && (await txt(page, '#fx-blk-pessoal')).includes('Dados pessoais'));
  chk('Informações: CPF ausente aparece como Não informado', (await txt(page, '#fx-blk-pessoal')).includes('Não informado'));

  // ── menu de status: só a situação (Lead, Ativo, Inativo, Bloqueado) ──
  await page.click('#fx-st-btn');
  chk('menu de status abre', await page.evaluate(() => document.getElementById('fx-st-wrap').classList.contains('open')));
  const itens = await page.$$eval('#fx-st-menu .fx-mn-it', els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
  chk('menu: Lead, Ativo, Pausado, Inativo e Bloqueado (sem grupo de acesso ao portal)', itens.length === 5 && ['Lead', 'Ativo', 'Pausado', 'Inativo', 'Bloqueado'].every((n, i) => (itens[i] || '').startsWith(n)) && !(await txt(page, '#fx-st-menu')).includes('Acesso ao portal'), itens.join('|'));
  chk('menu: nenhum item desligado', await page.evaluate(() => [...document.querySelectorAll('#fx-st-menu .fx-mn-it')].every(b => !b.disabled)));
  chk('menu: cada situação com uma cor (azul, verde, âmbar, cinza, vermelho)', await page.evaluate(() => [...document.querySelectorAll('#fx-st-menu .fx-mn-it > i:first-child')].map(i => i.className).join() === 'sd-blue,sd-green,sd-amber,sd-gray,sd-red'));
  await page.keyboard.press('Escape');
  chk('Esc fecha o menu', !(await page.evaluate(() => document.getElementById('fx-st-wrap').classList.contains('open'))));

  const status = () => page.evaluate(() => ({ st: ensureCrm(students[0]).status, chip: document.getElementById('fx-status-chip').textContent.trim(), ring: document.getElementById('fx-av').className, cls: document.getElementById('fx-status-chip').className }));
  const escolher = async nome => { await page.click('#fx-st-btn'); await page.click(`#fx-st-menu .fx-mn-it:has-text("${nome}")`); await page.waitForTimeout(120); };

  aceitar = false; await escolher('Inativo');
  chk('Inativo: confirmação recusada não muda nada', (await status()).st !== 'inativo' && dialogos.some(m => /inativo/i.test(m)));
  aceitar = true; await escolher('Inativo');
  let r = await status();
  chk('Inativo: grava s.crm.status', r.st === 'inativo');
  chk('Inativo: selo cinza e anel do avatar', r.chip === 'Inativo' && /badge-gray/.test(r.cls) && /fx-st-inativo/.test(r.ring), JSON.stringify(r));
  chk('Inativo: histórico registrado', await page.evaluate(() => (DB.historico[String(students[0].id)] || []).some(h => h.tipo === 'status' && /Inativo/.test(h.texto))));
  chk('Inativo: lista de alunos usa a situação Inativo', await page.evaluate(() => _alStatus(students[0]) === 'inativo'));
  chk('Inativo: sai das tarefas', await page.evaluate(() => alunoActiveForTasks(students[0]) === false));
  await escolher('Ativo'); r = await status();
  chk('Ativo: volta ao normal (selo verde)', r.st === 'ativo' && r.chip === 'Ativo' && /badge-green/.test(r.cls));
  await escolher('Lead'); r = await status();
  chk('Lead: selo azul, anel azul e lista em Lead', r.st === 'lead' && r.chip === 'Lead' && /badge-blue/.test(r.cls) && /fx-st-lead/.test(r.ring) && await page.evaluate(() => _alStatus(students[0]) === 'lead'));
  chk('Lead continua nas tarefas', await page.evaluate(() => alunoActiveForTasks(students[0]) === true));
  await escolher('Ativo');
  chk('status persiste no armazenamento local', await page.evaluate(() => { const a = JSON.parse(localStorage.getItem(lsKey('acm-students'))); const x = a.find(q => q.id === students[0].id); return !!x && !!x.crm && x.crm.status === 'ativo'; }));

  // ── Bloqueado: trava o acesso ao portal no servidor (simulado) ──
  await page.evaluate(() => {
    window.__srv = []; window.__srvErro = null;
    window.__fromAnt = supa.from; window.__userAnt = _supaUser;
    supa.from = t => t !== 'alunos_acesso' ? ({ upsert: () => Promise.resolve({ error: null }), select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) }) : ({ update: v => ({ eq: () => ({ eq: () => { window.__srv.push([t, v.status]); return Promise.resolve({ error: window.__srvErro }); } }) }) });
    _supaUser = { id: 'trainer-1' };
    const s = students[0]; s.perfil.email = 'amanda@exemplo.com'; s.perfil.alunoUserId = 'u-1'; updateHeader(s);
  });
  chk('Bloqueado: o item mostra a nota "Mostra a tela de acesso bloqueado" quando há conta', await page.evaluate(() => document.querySelector('#fx-st-menu .fx-mn-it[data-k=bloqueado] small').textContent.includes('Mostra a tela')));
  aceitar = false; await escolher('Bloqueado');
  chk('Bloqueado: confirmação recusada não muda nem chama o servidor', (await status()).st !== 'bloqueado' && (await page.evaluate(() => window.__srv.length)) === 0);
  aceitar = true; await escolher('Bloqueado'); r = await status();
  chk('Bloqueado: grava a situação, selo vermelho e anel vermelho', r.st === 'bloqueado' && r.chip === 'Bloqueado' && /badge-red/.test(r.cls) && /fx-st-bloq/.test(r.ring), JSON.stringify(r));
  chk('Bloqueado: avisa o servidor (alunos_acesso = bloqueado) e guarda o acesso bloqueado', await page.evaluate(() => JSON.stringify(window.__srv) === '[["alunos_acesso","bloqueado"]]' && students[0].perfil.portalStatus === 'bloqueado' && students[0].perfil.bloqueioAplicado === true));
  chk('Bloqueado: lista usa Bloqueado e o bloco Contato mostra o portal Bloqueado', await page.evaluate(() => _alStatus(students[0]) === 'bloq') && (await txt(page, '#fx-blk-contato')).includes('Bloqueado'));
  await escolher('Ativo'); r = await status();
  chk('Bloqueado → Ativo: libera o acesso no servidor', r.st === 'ativo' && (await page.evaluate(() => JSON.stringify(window.__srv) === '[["alunos_acesso","bloqueado"],["alunos_acesso","ativo"]]' && students[0].perfil.portalStatus === 'ativo')));
  await page.evaluate(() => { window.__srvErro = { message: 'falhou de propósito' }; });
  await escolher('Bloqueado');
  chk('Erro do servidor: a situação não muda e o personal é avisado', (await status()).st === 'ativo' && dialogos.some(m => /Erro ao atualizar o acesso/.test(m)));
  await page.evaluate(() => { window.__srvErro = null; });
  // sem conta no portal: grava a intenção e aplica quando a conta existir
  await page.evaluate(() => { window.__srv.length = 0; const s = students[0]; delete s.perfil.alunoUserId; delete s.perfil.portalStatus; updateHeader(s); });
  chk('Bloqueado sem conta: o item avisa que vale quando o aluno criar a conta', await page.evaluate(() => document.querySelector('#fx-st-menu .fx-mn-it[data-k=bloqueado] small').textContent.includes('criar a conta')));
  await escolher('Bloqueado');
  chk('Bloqueado sem conta: não chama o servidor e fica marcado como pendente de aplicar', (await status()).st === 'bloqueado' && (await page.evaluate(() => window.__srv.length === 0 && students[0].perfil.bloqueioAplicado === false)));
  await page.evaluate(async () => { students[0].perfil.alunoUserId = 'u-1'; await reconciliarBloqueiosPortal(); });
  chk('Aluno cria a conta depois: o bloqueio entra no servidor uma vez', await page.evaluate(() => JSON.stringify(window.__srv) === '[["alunos_acesso","bloqueado"]]' && students[0].perfil.bloqueioAplicado === true));
  await page.evaluate(async () => { await reconciliarBloqueiosPortal(); });
  chk('Reconciliar de novo não repete a chamada', (await page.evaluate(() => window.__srv.length)) === 1);
  await escolher('Ativo');
  await page.evaluate(() => { supa.from = window.__fromAnt; _supaUser = window.__userAnt; const s = students[0]; delete s.perfil.alunoUserId; s.perfil.portalStatus = 'ativo'; renderPortalStatusBadge(s); updateHeader(s); });

  // ── avisos do sistema (Novo, Pendente, Transferência): selos ao lado da situação, que não mudam a situação ──
  chk('Sem aviso: nenhum selo ao lado da situação', await page.evaluate(() => document.getElementById('fx-alertas').children.length === 0));
  await page.evaluate(() => { const s = students[0]; s.perfil.novoCadastro = true; s.perfil.alunoUserId = 'u-1'; s.perfil.whatsapp = ''; updateHeader(s); });
  chk('Avisos Novo e Pendente aparecem com ícone e a situação continua Ativa', await page.evaluate(() => { const c = document.getElementById('fx-alertas'); return !!c.querySelector('.al-aviso-novo .ph-sparkle') && !!c.querySelector('.al-aviso-pendente .ph-warning-circle') && document.getElementById('fx-status-chip').textContent.trim() === 'Ativo'; }));
  chk('Avisos são só leitura da situação: o menu continua com as 5 opções', await page.evaluate(() => document.querySelectorAll('#fx-st-menu .fx-mn-it').length === 5));
  await page.evaluate(() => { const t = window.alunoTravado; window.__tAnt = t; window.alunoTravado = () => true; updateHeader(students[0]); });
  chk('Aviso Transferência aparece junto e o selo da situação segue Ativo (não vira Transferência)', await page.evaluate(() => !!document.querySelector('#fx-alertas .al-aviso-transf') && document.getElementById('fx-status-chip').textContent.trim() === 'Ativo' && document.querySelector('#fx-alertas .al-aviso-transf').tagName === 'SPAN'));
  await page.evaluate(() => { window.alunoTravado = window.__tAnt; updateHeader(students[0]); });
  await page.click('#fx-alertas .al-aviso-pendente'); await page.waitForTimeout(150);
  chk('Aviso Pendente leva ao Cadastro para completar', await vis(page, 'fx-cadastro'));
  await page.evaluate(() => { _formDirty = false; switchTab('info'); });
  await page.click('#fx-alertas .al-aviso-novo'); await page.waitForTimeout(150);
  chk('Aviso Novo marca o aluno como visto e some', await page.evaluate(() => !students[0].perfil.novoCadastro && !document.querySelector('#fx-alertas .al-aviso-novo')));
  await page.evaluate(() => { const s = students[0]; delete s.perfil.alunoUserId; s.perfil.whatsapp = '+55 (11) 98765-4321'; updateHeader(s); });

  // ── migração da situação e padrões ──
  chk('Migração: pausado continua Pausado; acesso bloqueado vira Bloqueado; lead com conta, avaliação ou treino vira Ativo; lead de verdade fica Lead; roda uma vez', await page.evaluate(() => {
    const mk = (crm, perfil, extra) => Object.assign({ id: 1, perfil: Object.assign({ nome: 'X' }, perfil || {}), crm }, extra || {});
    const a = mk({ status: 'pausado' }), b = mk({ status: 'ativo' }, { portalStatus: 'bloqueado' }), c = mk({ status: 'lead' }, { alunoUserId: 'u' }), d = mk({ status: 'lead' }), e = mk({ status: 'lead' }, {}, { avaliacoesAntro: [{ data_avaliacao: '2026-01-01' }] });
    [a, b, c, d, e].forEach(_migrarSituacao);
    const ok = a.crm.status === 'pausado' && b.crm.status === 'bloqueado' && b.perfil.bloqueioAplicado === true && c.crm.status === 'ativo' && d.crm.status === 'lead' && e.crm.status === 'ativo' && [a, b, c, d, e].every(x => x.crm.sit2 === 1);
    d.crm.status = 'lead'; d.perfil.alunoUserId = 'u'; _migrarSituacao(d);   // já migrado: não mexe mais
    return ok && d.crm.status === 'lead';
  }));
  chk('situacaoDe: Pausado é situação própria; sem situação conta como ativo; aluno novo nasce Ativo', await page.evaluate(() => situacaoDe({ crm: { status: 'pausado' } }) === 'pausado' && situacaoDe({ crm: { status: 'inativo' } }) === 'inativo' && situacaoDe({}) === 'ativo' && situacaoDe({ perfil: { portalStatus: 'bloqueado' } }) === 'bloqueado' && ensureCrm({}).status === 'ativo'));
  chk('Tela do cliente no CRM usa as mesmas 5 situações (com Pausado)', await page.evaluate(() => { navAlunoCrm(students[0].id); const t = [...document.querySelectorAll('#screen-aluno-crm select option, #screen-aluno-crm option')].map(o => o.textContent).join('|'); closeAlunoCrm(); return /Lead/.test(t) && /Pausado/.test(t) && /Bloqueado/.test(t); }));

  // ── Editar perfil abre a página de Cadastro, com todos os campos ──
  await page.click('#fx-editar');
  await page.waitForTimeout(100);
  chk('Editar perfil: abre a página Cadastro', await vis(page, 'fx-cadastro') && !(await vis(page, 'fx-ficha')) && await vis(page, 'panel-perfil'));
  const ids = ['p-apelido', 'p-nome', 'p-nascimento', 'p-sexo', 'p-modalidade', 'p-nivel-ro', 'p-profissao', 'p-cpf', 'p-whatsapp', 'p-email', 'p-cep', 'p-rua', 'p-numero', 'p-complemento', 'p-bairro', 'p-cidade', 'p-uf'];
  chk('Cadastro: todos os campos existem', await page.evaluate(l => l.every(i => document.getElementById(i)), ids));
  chk('Cadastro: quatro cartões, um embaixo do outro (mesma largura, sem lado a lado)', await page.evaluate(() => {
    const c = [...document.querySelectorAll('#panel-perfil > .fx-sec')]; if (c.length !== 4) return false;
    const l = c.map(e => Math.round(e.getBoundingClientRect().left)), t = c.map(e => e.getBoundingClientRect().top);
    return l.every(x => x === l[0]) && t.every((x, i) => i === 0 || x > t[i - 1]);
  }));
  // ── cartões do Cadastro: Perfil, Dados pessoais, Contato, Endereço ──
  chk('Cadastro: títulos dos cartões na ordem Perfil, Dados pessoais, Contato, Endereço', await page.evaluate(() => [...document.querySelectorAll('#panel-perfil > .fx-sec h3')].map(h => h.textContent).join('|') === 'Perfil|Dados pessoais|Contato|Endereço'));
  chk('Cadastro: cartão Perfil só tem foto, atendimento, nível e profissão', await page.evaluate(() => { const c = document.querySelector('#panel-perfil > .fx-sec'); const ids = [...c.querySelectorAll('input,select')].map(e => e.id).filter(Boolean); return ids.join() === 'p-modalidade,p-nivel-ro,p-profissao' && !!c.querySelector('#fx-cad-av'); }));
  chk('Cadastro: cartão Dados pessoais tem nome, apelido, nascimento, sexo e CPF (nessa ordem)', await page.evaluate(() => { const c = document.querySelectorAll('#panel-perfil > .fx-sec')[1]; return [...c.querySelectorAll('input,select')].map(e => e.id).filter(i => i && i !== 'p-cpf-msg').join() === 'p-nome,p-apelido,p-nascimento,p-sexo,p-cpf'; }));
  chk('Cadastro: sem legendas (nenhum subtítulo, selo de "onde aparece" nem texto de ajuda além da mensagem do CPF)', await page.evaluate(() => !document.querySelector('#fx-cadastro .dp-ph p') && !document.querySelector('#fx-cadastro .fx-onde') && !document.querySelector('#fx-cadastro .page-subtitle') && !document.querySelector('#panel-perfil .field-sub')));
  chk('Cadastro: rótulo do e-mail traz "(login no portal)" ao lado do nome', await page.evaluate(() => { const l = document.querySelector('label[for=p-email]'); return !!l && l.textContent.replace(/\s+/g, ' ').trim() === 'E-mail (login no portal)'; }));
  chk('Cadastro: Perfil sem rótulo "Foto"; foto à esquerda dos campos e botões ao lado dela', await page.evaluate(() => { const c = document.querySelector('#panel-perfil .fx-perfil'); const R = e => e.getBoundingClientRect(); const av = R(document.getElementById('fx-cad-av')), bt = R(document.getElementById('fx-cad-foto-btn')), at = R(document.getElementById('p-modalidade')); return !c.querySelector('.p-foto label') && av.right <= bt.left && bt.right <= at.left && av.width >= 130; }));
  chk('Cadastro: Atendimento e Nível na mesma linha; Profissão embaixo', await page.evaluate(() => { const R = id => document.getElementById(id).getBoundingClientRect(); const a = R('p-modalidade'), n = R('p-nivel-ro'), p = R('p-profissao'); return Math.abs(a.top - n.top) < 3 && p.top > a.bottom && p.left <= a.left + 2; }));
  chk('Cadastro: foto com a altura das duas linhas de campos (diferença até 6 px)', await page.evaluate(() => { const R = id => document.getElementById(id).getBoundingClientRect(); const av = R('fx-cad-av'), at = R('p-modalidade'), p = R('p-profissao'); return Math.abs((av.bottom - av.top) - (p.bottom - (at.top - 20))) <= 6; }));
  chk('Cadastro: Redefinir senha ao lado do e-mail (mesma linha), desligado sem e-mail', await page.evaluate(() => { const R = id => document.getElementById(id).getBoundingClientRect(); const e = R('p-email'), b = R('p-email-senha-btn'); const s = students[0]; const antes = s.perfil.email; s.perfil.email = ''; renderPortalStatusBadge(s); const off = document.getElementById('p-email-senha-btn').disabled; s.perfil.email = antes || 'a@b.com'; renderPortalStatusBadge(s); const on = !document.getElementById('p-email-senha-btn').disabled; s.perfil.email = antes; renderPortalStatusBadge(s); return Math.abs(e.top - b.top) < 12 && b.left >= e.right && off && on && document.getElementById('p-email-senha-btn').getAttribute('onclick') === 'alunoResetarSenha()'; }));
  chk('Cadastro: Cancelar e Salvar só no fim da página, fixos (visíveis sem rolar) e sem botões no topo', await page.evaluate(() => { const sv = document.querySelector('#panel-perfil .fx-salvar'), r = sv.getBoundingClientRect(); return getComputedStyle(sv).position === 'sticky' && r.bottom <= innerHeight + 1 && r.top > innerHeight / 2 && !document.querySelector('#fx-cadastro .fx-ph .btn') && document.querySelectorAll('#fx-cadastro .fx-salvar .btn').length === 2; }));
  // ── apelido: nome das mensagens ──
  await page.fill('#p-nome', 'Amanda Cristina Silva');
  await page.evaluate(() => { const s = students[0]; if(s.crm) s.crm.apelido = ''; });
  chk('Apelido vazio: a mensagem usa o primeiro nome', await page.evaluate(() => alunoNomeMsg(students[0]) === 'Amanda' && replaceVars('Olá {nome}!', students[0]) === 'Olá Amanda!'));
  await page.fill('#p-apelido', '  Mandy   Silva  ');
  chk('Apelido: grava em s.crm.apelido sem espaços sobrando', await page.evaluate(() => students[0].crm.apelido === 'Mandy Silva'));
  chk('Apelido: a mensagem usa o apelido', await page.evaluate(() => replaceVars('Olá {nome}! ({nomeCompleto})', students[0]) === 'Olá Mandy Silva! (Amanda Cristina Silva)'));
  chk('Apelido: a mensagem de senha e o Olá do WhatsApp usam o apelido', await page.evaluate(() => _rsMensagem(students[0], 'https://x').startsWith('Olá, Mandy Silva!') && alunoNomeMsg(students[0]) === 'Mandy Silva'));
  await page.fill('#p-apelido', '');
  chk('Apelido apagado: volta ao primeiro nome', await page.evaluate(() => alunoNomeMsg(students[0]) === 'Amanda'));
  await page.fill('#p-apelido', 'Mandy');
  chk('Apelido: o mesmo campo do cadastro de cliente (CRM)', await page.evaluate(() => { initAlunoForm(students[0]); const v = document.getElementById('f-apelido').value; crmCloseModal('m-crm-aluno'); return v === 'Mandy'; }));
  chk('Cadastro: nível é só leitura', await page.evaluate(() => document.getElementById('p-nivel-ro').readOnly));
  await page.fill('#p-cep', '01310100'); await page.waitForTimeout(400);
  chk('CEP preenche rua, bairro, cidade e UF sozinho', await page.evaluate(() => ['p-rua', 'p-bairro', 'p-cidade', 'p-uf'].map(i => document.getElementById(i).value).join('|') === 'Avenida Paulista|Bela Vista|São Paulo|SP'));
  chk('CEP: foco vai para o número', await page.evaluate(() => document.activeElement.id === 'p-numero'));
  chk('CEP: endereço entra no perfil', await page.evaluate(() => students[0].perfil.rua === 'Avenida Paulista' && students[0].perfil.uf === 'SP'));
  await page.fill('#p-cep', '99999999'); await page.waitForTimeout(400);
  chk('CEP inexistente: avisa e deixa os campos livres', await page.evaluate(() => document.getElementById('p-rua').value === 'Avenida Paulista') && await page.evaluate(() => !!document.querySelector('#crm-toasts, .crm-toast')));
  await page.fill('#p-cep', '01310100'); await page.waitForTimeout(400);
  await page.fill('#p-rua', 'Av. Teste'); await page.fill('#p-numero', '10');
  await page.fill('#p-bairro', 'Centro'); await page.fill('#p-cidade', 'Curitiba'); await page.fill('#p-uf', 'pr');
  chk('WhatsApp: código do país +55 editável, já preenchido', await page.evaluate(() => { const d = document.getElementById('p-whatsapp-ddi'); return d.tagName === 'BUTTON' && d.dataset.ddi === '55' && d.textContent.includes('+55'); }));
  await page.fill('#p-whatsapp', '11987654321');
  chk('WhatsApp +55: máscara (11) 98765-4321', (await page.inputValue('#p-whatsapp')) === '(11) 98765-4321');
  chk('WhatsApp +55: guarda COM o código: +55 (11) 98765-4321', await page.evaluate(() => students[0].perfil.whatsapp === '+55 (11) 98765-4321'));
  // lista de países: bandeira, nome, código e busca
  await page.click('#p-whatsapp-ddi');
  chk('Lista de países abre ao tocar no código', await page.evaluate(() => { const p = document.querySelector('.fone-pop'); return !!p && !p.hidden && document.getElementById('p-whatsapp-ddi').getAttribute('aria-expanded') === 'true'; }));
  chk('Lista: mais de 200 países, Brasil primeiro e marcado', await page.evaluate(() => { const l = [...document.querySelectorAll('.fone-it')]; return l.length > 200 && l[0].textContent.includes('Brasil') && l[0].classList.contains('sel'); }));
  chk('Lista: cada país tem bandeira, nome e código', await page.evaluate(() => { const i = document.querySelector('.fone-it'); return !!i.querySelector('.fx-flag').textContent && i.querySelector('.fone-it-n').textContent === 'Brasil' && i.querySelector('.fone-it-c').textContent === '+55'; }));
  chk('Lista: campo de busca com o foco', await page.evaluate(() => document.activeElement === document.querySelector('.fone-busca input')));
  await page.fill('.fone-busca input', 'portu');
  chk('Busca por nome (sem acento e parcial): Portugal', await page.evaluate(() => { const l = [...document.querySelectorAll('.fone-it-n')].map(e => e.textContent); return l.length === 1 && l[0] === 'Portugal'; }));
  await page.fill('.fone-busca input', 'ARGEN');
  chk('Busca ignora maiúsculas', await page.evaluate(() => [...document.querySelectorAll('.fone-it-n')].map(e => e.textContent).join() === 'Argentina'));
  await page.fill('.fone-busca input', '351');
  chk('Busca pelo código: +351 é Portugal', await page.evaluate(() => [...document.querySelectorAll('.fone-it')].some(i => i.dataset.ddi === '351' && i.textContent.includes('Portugal'))));
  await page.fill('.fone-busca input', '+34');
  chk('Busca com + e código: Espanha', await page.evaluate(() => [...document.querySelectorAll('.fone-it-n')].some(e => e.textContent === 'Espanha')));
  await page.fill('.fone-busca input', 'zzzz');
  chk('Busca sem resultado avisa', (await txt(page, '.fone-vazio')).includes('Nenhum país'));
  await page.fill('.fone-busca input', 'portu');
  await page.keyboard.press('Enter');
  chk('Enter escolhe: código vira +351 e a lista fecha', await page.evaluate(() => document.getElementById('p-whatsapp-ddi').dataset.ddi === '351' && document.querySelector('.fone-pop').hidden && document.getElementById('p-whatsapp-ddi').textContent.includes('+351')));
  chk('Escolher o país guarda o número com o novo código', await page.evaluate(() => students[0].perfil.whatsapp === '+351 (11) 98765-4321' || students[0].perfil.whatsapp.startsWith('+351 ')));
  await page.click('#p-whatsapp-ddi'); await page.fill('.fone-busca input', 'estados');
  await page.click('.fone-it');
  chk('Clique escolhe: Estados Unidos (+1)', await page.evaluate(() => document.getElementById('p-whatsapp-ddi').dataset.ddi === '1' && document.getElementById('p-whatsapp-ddi').dataset.iso === 'US'));
  await page.click('#p-whatsapp-ddi'); await page.keyboard.press('Escape');
  chk('Esc fecha a lista', await page.evaluate(() => document.querySelector('.fone-pop').hidden));
  await page.evaluate(() => foneEscolher('p-whatsapp', '55', 'BR'));
  await page.fill('#p-whatsapp', '11987654321');
  await page.evaluate(() => foneEscolher('p-whatsapp', '351', 'PT')); await page.fill('#p-whatsapp', '912 345 678');
  chk('WhatsApp outro país: código vira +351 e o número fica como digitado', await page.evaluate(() => document.getElementById('p-whatsapp-ddi').dataset.ddi === '351') && (await page.inputValue('#p-whatsapp')) === '912 345 678');
  chk('WhatsApp outro país: guarda +351 912 345 678', await page.evaluate(() => students[0].perfil.whatsapp === '+351 912 345 678'));
  chk('WhatsApp outro país: link do wa.me sem somar o 55', await page.evaluate(() => waLinkPara(students[0], '').startsWith('https://wa.me/351912345678?')));
  chk('WhatsApp outro país: envio da senha usa o número completo', await page.evaluate(() => _rsTelefone(students[0]) === '351912345678'));
  await page.evaluate(() => foneEscolher('p-whatsapp', '55', 'BR')); await page.fill('#p-whatsapp', '11987654321');
  chk('WhatsApp: voltando para +55 a máscara brasileira volta', (await page.inputValue('#p-whatsapp')) === '(11) 98765-4321' && await page.evaluate(() => students[0].perfil.whatsapp === '+55 (11) 98765-4321'));
  chk('WhatsApp +55: link do wa.me com 55', await page.evaluate(() => waLinkPara(students[0], '').startsWith('https://wa.me/5511987654321?')));
  chk('Telefone: número antigo sem código é lido com +55', await page.evaluate(() => { foneCarregar('p-whatsapp', '(44) 99979-2792'); return document.getElementById('p-whatsapp-ddi').dataset.ddi === '55' && document.getElementById('p-whatsapp').value === '(44) 99979-2792' && foneExibir('(44) 99979-2792') === '+55 (44) 99979-2792'; }));
  chk('Telefone: número antigo com +55 e espaços normaliza', await page.evaluate(() => { foneCarregar('p-whatsapp', '+55 44 99979-2792'); return document.getElementById('p-whatsapp').value === '(44) 99979-2792' && foneLer('p-whatsapp') === '+55 (44) 99979-2792'; }));
  await page.evaluate(() => foneCarregar('p-whatsapp', '+55 (11) 98765-4321'));
  await page.fill('#p-cpf', '52998224725'); await page.fill('#p-email', 'amanda@exemplo.com');
  chk('máscara do CEP e UF em maiúsculas', (await page.inputValue('#p-cep')) === '01310-100' && (await page.inputValue('#p-uf')) === 'PR');
  await page.click('#fx-cadastro .fx-salvar .btn-primary');
  await page.waitForTimeout(150);
  chk('Salvar: volta para Informações pessoais', await vis(page, 'fx-ficha') && await vis(page, 'panel-info'));
  chk('Salvar: grava endereço no perfil', await page.evaluate(() => { const p = students[0].perfil; return p.cep === '01310-100' && p.rua === 'Av. Teste' && p.uf === 'PR' && p.cidade === 'Curitiba'; }));
  chk('Informações: endereço e CPF mascarado', (await txt(page, '#fx-blk-pessoal')).includes('Av. Teste, 10') && (await txt(page, '#fx-blk-pessoal')).includes('***.***.***-25'));
  chk('Informações: mostra o apelido', (await txt(page, '#fx-blk-pessoal')).includes('Mandy'));
  chk('Informações: WhatsApp com +55', (await txt(page, '#fx-blk-contato')).includes('+55 (11) 98765-4321'));
  chk('Cadastro: cartões Acesso ao portal e Vínculo legado foram removidos', await page.evaluate(() => !document.getElementById('p-portal-status-btn') && !document.getElementById('p-cod-aluno-legado') && !/Vínculo com o FitCpx|Acesso ao Portal do Aluno/.test(document.getElementById('panel-perfil').textContent)));
  chk('Informações: sem Cód. FitCpx legado', !(await txt(page, '#fx-blk-pessoal')).includes('FitCpx legado'));
  chk('Cadastro: e-mail trava com conta no portal (mesmo sem o cartão de acesso)', await page.evaluate(() => { const s = students[0]; s.perfil.alunoUserId = 'u-9'; renderPortalStatusBadge(s); const r = document.getElementById('p-email').readOnly && !document.getElementById('p-email-alterar-btn').classList.contains('hidden'); s.perfil.alunoUserId = undefined; renderPortalStatusBadge(s); return r && !document.getElementById('p-email').readOnly; }));
  chk('dado legado codAlunoLegado é preservado ao salvar', await page.evaluate(() => { students[0].perfil.codAlunoLegado = '412'; onPerfilChange(); return students[0].perfil.codAlunoLegado === '412'; }));
  chk('Cartão principal mostra o e-mail', (await txt(page, '#fx-mail')).includes('amanda@exemplo.com'));
  chk('Informações: e-mail e botões de contato', (await txt(page, '#fx-blk-contato')).includes('amanda@exemplo.com') && !!(await page.$('#fx-blk-contato a[href^="mailto:"]')));

  // ── outros campos de telefone: modal Novo Cliente (CRM) e Configurações > Perfil ──
  chk('Modal Novo Cliente: telefone com código do país editável', await page.evaluate(() => { initAlunoForm(null); crmOpenModal('m-crm-aluno'); const d = document.getElementById('f-tel-ddi'); return d && d.dataset.ddi === '55' && document.getElementById('f-tel').classList.contains('fx-tel-num'); }));
  await page.fill('#f-tel', '21999998888');
  chk('Modal Novo Cliente: máscara e leitura com código', (await page.inputValue('#f-tel')) === '(21) 99999-8888' && await page.evaluate(() => foneLer('f-tel') === '+55 (21) 99999-8888'));
  await page.evaluate(() => foneEscolher('f-tel', '1', 'US')); await page.fill('#f-tel', '415 555 0132');
  chk('Modal Novo Cliente: outro país guarda +1 415 555 0132', await page.evaluate(() => foneLer('f-tel') === '+1 415 555 0132'));
  await page.evaluate(() => { crmCloseModal('m-crm-aluno'); _formDirty = false; navGo('config'); _cfgAba('perfil'); });
  await page.waitForTimeout(150);
  chk('Configurações > Perfil: telefone pessoal com código do país editável', await page.evaluate(() => { const d = document.getElementById('cfg-tel-pf-ddi'); return d && d.dataset.ddi === '55'; }));
  await page.fill('#cfg-tel-pf', '11987654321'); await page.evaluate(() => cfgSalvarPerfil()); await page.waitForTimeout(100);
  chk('Configurações > Perfil: telefone pessoal guardado com +55', await page.evaluate(() => DB.config.telefonePessoal === '+55 (11) 98765-4321'));
  await page.evaluate(() => foneEscolher('cfg-tel-pf', '351', 'PT')); await page.fill('#cfg-tel-pf', '912 345 678'); await page.evaluate(() => cfgSalvarPerfil()); await page.waitForTimeout(100);
  chk('Configurações > Perfil: telefone de outro país', await page.evaluate(() => DB.config.telefonePessoal === '+351 912 345 678'));
  await page.evaluate(() => { _formDirty = false; navGo('alunos'); selectStudent(students[0].id); });
  await page.waitForTimeout(200);

  // ── foto do aluno ──
  const enviar = (nome, tipo, w, h, origem) => page.evaluate(async ([nome, tipo, w, h, origem]) => {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d');
    g.fillStyle = '#c0705a'; g.fillRect(0, 0, w, h); g.fillStyle = '#2b3a55'; g.fillRect(0, h / 2, w, h / 2);
    const blob = nome.endsWith('.txt') ? new Blob(['nao sou imagem'], { type: 'text/plain' }) : await new Promise(r => cv.toBlob(r, tipo));
    const f = new File([blob], nome, { type: nome.endsWith('.txt') ? 'text/plain' : tipo });
    const dt = new DataTransfer(); dt.items.add(f);
    const inp = document.getElementById('fx-foto-input'); inp.dataset.origem = origem; inp.files = dt.files; inp.dispatchEvent(new Event('change'));
  }, [nome, tipo, w, h, origem]);
  chk('Foto: avatar e câmera são botões que abrem o seletor de arquivo', await page.evaluate(() => document.getElementById('fx-av').tagName === 'BUTTON' && !!document.querySelector('.fx-cam') && document.getElementById('fx-foto-input').type === 'file' && /jpeg/.test(document.getElementById('fx-foto-input').accept)));
  chk('Foto: sem foto o avatar mostra as iniciais', (await txt(page, '#fx-av')) === 'AS' || (await txt(page, '#fx-av')).length <= 2);
  await page.evaluate(() => { _formDirty = false; switchTab('info'); });
  await enviar('retrato.png', 'image/png', 600, 800, 'ficha'); await page.waitForTimeout(500);
  chk('Foto: enviada pelo cartão vira JPEG quadrado pequeno em s.perfil.foto', await page.evaluate(() => { const f = students[0].perfil.foto; return fxFotoOk(f) && f.length < 60000; }));
  chk('Foto: aparece no cartão principal', await page.evaluate(() => { const i = document.querySelector('#fx-av img'); return !!i && i.src.startsWith('data:image/jpeg') && i.naturalWidth === 256 && i.naturalHeight === 256; }));
  chk('Foto: gravada na hora (cartão)', await page.evaluate(() => fxFotoOk(JSON.parse(localStorage.getItem(lsKey('acm-students'))).find(s => s.id === students[0].id).perfil.foto)));
  chk('Foto: aparece na lista de alunos', await page.evaluate(() => { renderScreenAlunos(); return !!document.querySelector('#alunos-grid .al-av img'); }));
  chk('Foto: dados do perfil continuam (WhatsApp preservado)', await page.evaluate(() => /^\+/.test(students[0].perfil.whatsapp || '+')));
  await page.evaluate(() => switchTab('perfil')); await page.waitForTimeout(150);
  chk('Foto: Cadastro mostra a miniatura e os botões Trocar e Remover', await page.evaluate(() => !!document.querySelector('#fx-cad-av img') && document.querySelector('#fx-cad-foto-btn span').textContent === 'Trocar foto' && !document.getElementById('fx-cad-foto-rm').classList.contains('hidden')));
  await page.evaluate(() => { _formDirty = false; });
  await page.click('#fx-cad-foto-rm'); await page.waitForTimeout(100);
  chk('Foto: Remover tira a foto e volta às iniciais', await page.evaluate(() => !students[0].perfil.foto && !document.querySelector('#fx-cad-av img') && document.getElementById('fx-cad-foto-btn').textContent.includes('Adicionar') && document.getElementById('fx-cad-foto-rm').classList.contains('hidden')));
  chk('Foto: remover dentro do Cadastro só grava no Salvar', await page.evaluate(() => fxFotoOk(JSON.parse(localStorage.getItem(lsKey('acm-students'))).find(s => s.id === students[0].id).perfil.foto)));
  await page.click('#fx-cadastro .fx-salvar .btn-ghost'); await page.waitForTimeout(200);
  chk('Foto: Cancelar desfaz a remoção', await page.evaluate(() => fxFotoOk(students[0].perfil.foto)));
  await page.evaluate(() => switchTab('perfil')); await page.waitForTimeout(100);
  await enviar('paisagem.jpg', 'image/jpeg', 900, 500, 'cad'); await page.waitForTimeout(400);
  chk('Foto: trocar pelo Cadastro (paisagem vira quadrado)', await page.evaluate(() => { const i = document.querySelector('#fx-cad-av img'); return !!i && i.naturalWidth === 256 && i.naturalHeight === 256; }));
  await page.click('#fx-cadastro .fx-salvar .btn-primary'); await page.waitForTimeout(200);
  chk('Foto: Salvar grava a foto nova', await page.evaluate(() => fxFotoOk(JSON.parse(localStorage.getItem(lsKey('acm-students'))).find(s => s.id === students[0].id).perfil.foto)));
  const antes = await page.evaluate(() => students[0].perfil.foto);
  await page.evaluate(() => switchTab('info'));
  await enviar('nota.txt', 'text/plain', 10, 10, 'ficha'); await page.waitForTimeout(200);
  chk('Foto: arquivo que não é imagem é recusado e a foto continua', await page.evaluate(a => students[0].perfil.foto === a, antes));
  await enviar('desenho.svg.png', 'image/gif', 10, 10, 'ficha'); await page.waitForTimeout(200);
  chk('Foto: tipo fora de JPG, PNG e WebP é recusado', await page.evaluate(a => students[0].perfil.foto === a, antes));
  chk('Foto: dado de foto fora do padrão nunca vira imagem (sem XSS)', await page.evaluate(() => { const p = students[0].perfil, ant = p.foto; p.foto = 'data:image/jpeg;base64,AAAA" onerror="window.__x=1'; updateHeader(students[0]); const r = !document.querySelector('#fx-av img') && !fxFotoOk(p.foto) && !_alAvatarInner(students[0], 'Ana').includes('onerror'); p.foto = ant; updateHeader(students[0]); return r; }));
  chk('Foto: aluno em transferência não troca a foto', await page.evaluate(() => { const o = window.alunoTravado; window.alunoTravado = () => true; let msg = ''; const oa = window.alert; window.alert = m => { msg = m; }; fxFotoEscolher('ficha'); window.alert = oa; window.alunoTravado = o; return /transferência/.test(msg); }));

  // ── Cancelar descarta o que foi digitado ──
  await page.click('#fx-editar'); await page.fill('#p-profissao', 'Mudei e cancelei');
  await page.click('#fx-cadastro .fx-salvar .btn-ghost');
  await page.waitForTimeout(150);
  chk('Cancelar: volta e não grava', await vis(page, 'fx-ficha') && await page.evaluate(() => students[0].perfil.profissao !== 'Mudei e cancelei'));
  chk('Cancelar: formulário recarregado', (await page.inputValue('#p-profissao')) !== 'Mudei e cancelei');

  // ── abas do cartão e atalhos antigos ──
  for (const t of ['anamnese', 'prescricao', 'evolucao', 'info']) {
    await page.evaluate(n => switchTab(n), t); await page.waitForTimeout(60);
    chk('aba ' + t + ' abre', await vis(page, 'panel-' + t) && await vis(page, 'fx-ficha'));
  }
  chk('título do cartão acompanha a aba', (await txt(page, '#fx-panel-t')) === 'Informações pessoais');
  await page.evaluate(() => switchTab('perfil')); await page.waitForTimeout(60);
  chk('switchTab("perfil") ainda abre o cadastro (atalho de CPF)', await vis(page, 'fx-cadastro'));
  await page.evaluate(() => switchTab('info'));

  // ── tablet e celular: ficha (Informações) e Cadastro ──
  await page.evaluate(() => { _formDirty = false; Object.keys(localStorage).filter(k => k.includes('acm-draft')).forEach(k => localStorage.removeItem(k)); navGo('alunos'); window._skipDraftModal = true; selectStudent(students[0].id); const p = students[0].perfil; Object.assign(p, { email: 'amanda@exemplo.com', whatsapp: '+55 (11) 98765-4321', rua: 'Rua A', numero: '1', bairro: 'Centro', cidade: 'Curitiba', uf: 'PR', cep: '80000-000' }); updateHeader(students[0]); });
  const semRolagemH = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll('#student-view *')].every(e => { const r = e.getBoundingClientRect(); const v = r.width > 0 && getComputedStyle(e).visibility !== 'hidden'; return !v || r.right <= innerWidth + 1 || !!e.closest('.dp-seg, .fone-pop, .dp-menu, [hidden], .hidden'); }));
  for (const [nome, w, h] of [['tablet em pé', 834, 1112], ['tablet deitado', 1024, 768], ['celular', 390, 844]]) {
    await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(250);
    await page.evaluate(() => switchTab('info')); await page.waitForTimeout(150);
    chk(nome + ': Informações sem rolagem horizontal nem elemento fora da tela', await semRolagemH());
    const g = await page.evaluate(() => {
      const r = id => { const e = document.getElementById(id); const b = e.getBoundingClientRect(); return { t: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), vis: b.width > 0 }; };
      const tabs = [...document.querySelectorAll('#fx-ficha .fx-panel .dp-seg-b')].map(b => b.getBoundingClientRect().width > 0 ? b.innerText.trim() : null);
      const titulo = document.querySelector('#fx-ficha .fx-panel .dp-ph > div:first-child');
      return { ed: r('fx-editar'), st: r('fx-st-btn'), ar: r('fx-arquivar'), tabs, tituloVisivel: getComputedStyle(titulo).display !== 'none',
        blocos: [...document.querySelectorAll('#fx-ficha .fx-blk')].map(b => Math.round(b.getBoundingClientRect().left)) };
    });
    chk(nome + ': botões do cartão com 44 px de altura (toque)', g.ed.h >= 44 && g.st.h >= 44 && g.ar.h >= 44, JSON.stringify(g));
    if (w < 600) {
      chk('celular: Editar perfil, Status e Arquivar na mesma linha', g.ed.t === g.st.t && g.st.t === g.ar.t, JSON.stringify(g));
      chk('celular: Arquivar só com o ícone (44 px)', g.ar.w === 44);
      chk('celular: aba inicial curta ("Dados") e título do cartão escondido', g.tabs[0] === 'Dados' && !g.tituloVisivel, JSON.stringify(g.tabs));
      chk('celular: blocos Contato e Dados pessoais em coluna', g.blocos[0] === g.blocos[1]);
      chk('celular: botão Abrir WhatsApp em largura total do bloco', await page.evaluate(() => { const f = document.querySelector('#fx-blk-contato .fx-foot'), b = f.firstElementChild; return Math.abs(b.getBoundingClientRect().width - f.getBoundingClientRect().width) < 2; }));
    } else {
      chk(nome + ': título do cartão e aba inicial por extenso', g.tituloVisivel && g.tabs[0] === 'Informações pessoais', JSON.stringify(g.tabs));
      chk(nome + ': botões do cartão em uma linha, Arquivar com texto', g.ed.t === g.st.t && g.st.t === g.ar.t && g.ar.w > 100);
    }
    if (w === 1024) chk('tablet deitado: blocos lado a lado', g.blocos[0] !== g.blocos[1]);
    if (w === 834) chk('tablet em pé: blocos em coluna', g.blocos[0] === g.blocos[1]);
    chk(nome + ': ações do bloco Contato cabem sem sair do bloco', await page.evaluate(() => { const bl = document.getElementById('fx-blk-contato').getBoundingClientRect(); return [...document.querySelectorAll('#fx-blk-contato .fx-foot .btn')].every(b => { const r = b.getBoundingClientRect(); return r.left >= bl.left - 1 && r.right <= bl.right + 1; }); }));

    await page.evaluate(() => switchTab('perfil')); await page.waitForTimeout(200);
    chk(nome + ': Cadastro sem rolagem horizontal nem elemento fora da tela', await semRolagemH());
    const c = await page.evaluate(() => {
      const L = id => Math.round(document.getElementById(id).getBoundingClientRect().left), W = id => Math.round(document.getElementById(id).getBoundingClientRect().width);
      const sv = document.querySelector('#panel-perfil .fx-salvar'), r = sv.getBoundingClientRect();
      return { sexoNasc: L('p-sexo') !== L('p-nascimento'), cepRua: L('p-cep') !== L('p-rua'), numComp: L('p-numero') !== L('p-complemento'), cep: W('p-cep'), rua: W('p-rua'),
        salvarNaTela: r.bottom <= innerHeight + 1 && r.top >= 0, topoBotoes: !!document.querySelector('#fx-cadastro .fx-ph-b') && getComputedStyle(document.querySelector('#fx-cadastro .fx-ph-b')).display !== 'none' };
    });
    chk(nome + ': Cadastro com Cancelar e Salvar colados no fim da tela (sticky)', c.salvarNaTela, JSON.stringify(c));
    if (w < 600) {
      chk('celular: Cadastro em uma coluna (nascimento e sexo um embaixo do outro, CEP e Rua em linhas separadas)', !c.sexoNasc && !c.cepRua, JSON.stringify(c));
      chk('celular: Número e Complemento dividem a linha', c.numComp);
      chk('celular: Perfil com a foto em linha própria, Atendimento e Nível lado a lado, Profissão embaixo', await page.evaluate(() => { const R = id => document.getElementById(id).getBoundingClientRect(); const f = R('fx-cad-av'), a = R('p-modalidade'), n = R('p-nivel-ro'), p = R('p-profissao'); return a.top >= f.bottom && Math.abs(a.top - n.top) < 4 && a.left < n.left && p.top > n.bottom; }));
      chk('celular: botões do topo do Cadastro escondidos (os do fim bastam)', !c.topoBotoes);
    } else if (w === 834) {
      chk('tablet em pé: Cadastro com dois campos por linha e CEP ao lado da Rua', c.sexoNasc && c.cepRua && c.rua > c.cep, JSON.stringify(c));
    } else {
      chk('tablet deitado: Cadastro em grade larga (CEP ao lado da Rua)', c.cepRua);
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(200);
  await page.evaluate(() => { _formDirty = false; switchTab('info'); });

  // ── Arquivar ──
  await page.evaluate(() => { window._ant = students.length; });
  await page.click('#fx-arquivar'); await page.waitForTimeout(150);
  chk('Arquivar: confirma e sai da lista', await page.evaluate(() => students.length === window._ant - 1) && dialogos.some(m => /Arquivadas/.test(m)));

  // ── aluno novo (Cadastro manual) abre direto no formulário ──
  await page.evaluate(() => { navGo('alunos'); abrirNovoAluno(); });
  await page.waitForTimeout(400);
  chk('Cadastro manual abre direto na página Cadastro', await vis(page, 'fx-cadastro'));
  await page.evaluate(() => navGo('alunos'));
  await page.waitForTimeout(200);

  chk('sem erro de JS', errs.length === 0, errs.slice(0, 3).join(' || '));
  console.log('PASS ' + ok.length + '  FAIL ' + bad.length);
  bad.forEach(b => console.log('  FAIL ' + b));
  await browser.close();
  process.exit(bad.length ? 1 : 0);
})();
