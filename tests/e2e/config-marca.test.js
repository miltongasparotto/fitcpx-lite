// Configurações (Perfil · Marca · Regras), kit de fluxos, fila "A enviar" do WhatsApp e marca no portal do aluno.
// Nuvem simulada: nenhuma chamada real. Dados 100% fictícios.
// Rodar: servidor em 5178 e, em C:/Users/junio/.claude/skills/playwright-skill:  node run.js <este arquivo>
const { chromium } = require('playwright');
const BASE = 'http://localhost:5178';
const OUT = process.env.SHOTS_DIR || '';
const ok = [], bad = [];
const chk = (n, c, extra) => (c ? ok : bad).push(n + (c ? '' : ' :: ' + (extra || '')));
const shot = async (page, nome) => { if (OUT) await page.screenshot({ path: OUT + '/' + nome + '.png' }); };
const PNG1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const JSON_H = { ...CORS, 'content-type': 'application/json' };

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
const call = (page, expr) => page.evaluate(expr);

// ── Alunos de teste para a fila (fictícios) ────────────────────────────────
const montarCenario = () => {
  const hoje = todayStr(), BR = iso => new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR');
  const aluno = (id, nome, extra) => Object.assign({ id, perfil: { nome, whatsapp: '(11) 98888-' + String(id).slice(-4) }, crm: { status: 'ativo', statusSince: hoje, fluxos: [] }, treinos: [], avaliacoesAntro: [], _treinosMigrado: true }, extra || {});
  const treino = (aprov, venc) => [{ id: Date.now() - 5e9, status: 'aprovado', dataAprovacao: BR(aprov), prazoSemanas: '12sem', dataVencimento: BR(venc), treino: '' }];
  const A = aluno(9000000000001, 'Vera Vencida', { treinos: treino(addDays(hoje, -90), addDays(hoje, -1)) });             // venceu ontem
  const B = aluno(9000000000002, 'Vitor Vencendo', { treinos: treino(addDays(hoje, -79), addDays(hoje, 5)) });             // vence em 5 dias
  const C = aluno(9000000000003, 'Ana Aniversario'); C.perfil.nascimento = '1990-' + hoje.slice(5);                        // faz anos hoje
  const D = aluno(Date.now() - 86400000, 'Nina Nova');                                                                    // cadastrada ontem
  const E = aluno(9000000000005, 'Paulo Parado', { crm: { status: 'pausado', statusSince: addDays(hoje, -30), fluxos: [] } }); // pausado há 30 dias
  const F = aluno(9000000000006, 'Sem Telefone'); F.perfil.whatsapp = ''; F.perfil.nascimento = '1985-' + hoje.slice(5);
  const G = aluno(9000000000007, 'Gabi Fluxo');                                                                          // etapa de fluxo vence hoje
  return [A, B, C, D, E, F, G];
};

(async () => {
  const browser = await chromium.launch({ headless: true });

  // ═══ PAINEL ═══════════════════════════════════════════════════════════════
  for (const [W, H] of [[1440, 900], [390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, timezoneId: 'America/Sao_Paulo' });
    const page = await ctx.newPage();
    // Nuvem simulada: grava o que o painel enviaria ao Storage e a personal_links.
    const nuvem = { subidas: [], apagados: [], patches: [] };
    const viacep = { falhar: false, consultas: [] };
    await ctx.route('**/viacep.com.br/**', route => {
      const cep = route.request().url().split('/ws/')[1].split('/')[0]; viacep.consultas.push(cep);
      if (viacep.falhar) return route.fulfill({ status: 500, headers: JSON_H, body: '{}' });
      if (cep === '01310100') return route.fulfill({ status: 200, headers: JSON_H, body: JSON.stringify({ cep: '01310-100', logradouro: 'Avenida Paulista', bairro: 'Bela Vista', localidade: 'São Paulo', uf: 'SP' }) });
      return route.fulfill({ status: 200, headers: JSON_H, body: '{"erro":true}' });
    });
    await ctx.route('**/*.supabase.co/**', async route => {
      const u = route.request().url(), m = route.request().method();
      if (m === 'OPTIONS') return route.fulfill({ status: 200, headers: CORS, body: '' });
      if (u.includes('/storage/v1/object/public/')) return route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'image/png' }, body: PNG1X1 });
      if (u.includes('/storage/v1/object/marca/') && m === 'POST') {
        const buf = route.request().postDataBuffer();
        nuvem.subidas.push({ caminho: decodeURIComponent(u.split('/storage/v1/object/marca/')[1]), bytes: buf ? buf.length : 0 });
        return route.fulfill({ status: 200, headers: JSON_H, body: '{"Key":"marca/x"}' });
      }
      if (u.includes('/storage/v1/object/marca') && m === 'DELETE') {
        let b = {}; try { b = JSON.parse(route.request().postData() || '{}'); } catch (e) {}
        nuvem.apagados.push(...(b.prefixes || []));
        return route.fulfill({ status: 200, headers: JSON_H, body: '[]' });
      }
      if (u.includes('/rest/v1/personal_links') && m === 'PATCH') {
        let b = {}; try { b = JSON.parse(route.request().postData() || '{}'); } catch (e) {}
        nuvem.patches.push(b);
        return route.fulfill({ status: 200, headers: JSON_H, body: '[{"trainer_user_id":"11111111-1111-1111-1111-111111111111"}]' });
      }
      return route.fulfill({ status: 200, headers: JSON_H, body: '[]' });
    });
    const errs = [];
    page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 160)); });
    page.on('dialog', d => d.accept().catch(() => {}));
    await boot(page);
    const P = n => `${W} ${n}`;

    // ── Kit de fluxos e modelos de fábrica ──
    chk(P('kit: 1 fluxo "Ciclo completo" com 5 etapas'), await call(page, `DB.fluxos.length===1 && DB.fluxos[0].nome==='Ciclo completo' && DB.fluxos[0].steps.length===5`));
    chk(P('kit: prazos 7/7/15/30/60'), await call(page, `JSON.stringify(DB.fluxos[0].steps.map(s=>s.dias))==='[7,7,15,30,60]'`));
    chk(P('kit: funções do Painel (prescrição e reavaliação)'), await call(page, `DB.fluxos[0].steps[0].papel==='prescricao' && DB.fluxos[0].steps[4].papel==='reavaliacao'`));
    chk(P('kit: acompanhamentos ligados a modelos de WhatsApp'), await call(page, `DB.fluxos[0].steps.slice(1).every(s=>DB.waTpls.find(t=>t.id===s.waTpl))`));
    chk(P('kit: não duplica ao semear de novo'), await call(page, `seedPresetCats(); seedKitFluxos(); DB.fluxos.length===1`));
    chk(P('modelos: 13 de fábrica criados com evento'), await call(page, `waGarantirModelos(); DB.waTpls.filter(t=>t.sys).length===13 && DB.waTpls.find(t=>t.sys==='aniversario').evento==='aniversario'`));
    chk(P('modelo de fábrica apagado não volta'), await call(page, `(()=>{ const t=DB.waTpls.find(x=>x.sys==='reativar'); DB.waSysApagados={reativar:true}; DB.waTpls=DB.waTpls.filter(x=>x!==t); waGarantirModelos(); const r=!DB.waTpls.find(x=>x.sys==='reativar'); DB.waSysApagados={}; waGarantirModelos(); return r && !!DB.waTpls.find(x=>x.sys==='reativar'); })()`));

    // ── Configurações: abas ──
    await call(page, `navGo('config')`); await page.waitForTimeout(250);
    chk(P('config: 3 abas'), await call(page, `document.querySelectorAll('#screen-config-body .seg-btn').length===3`));
    chk(P('config: não tem mais "Dados/backup" nem WhatsApp além do telefone'), await call(page, `!/Backup|Exportar|Importar/.test(document.getElementById('screen-config-body').textContent) && !document.querySelector('#screen-config-body #wt-msg')`));
    await shot(page, `cfg-${W}-perfil`);

    // Perfil: estrutura (cadastro da pessoa física; nada do que o aluno vê)
    chk(P('perfil: 3 seções (dados pessoais, contato, endereço)'), await call(page, `document.querySelectorAll('#screen-config-body .cfg-sec').length===3`));
    chk(P('perfil: não tem os campos da marca (nome de exibição, studio, WhatsApp, bio, foto)'), await call(page, `!document.getElementById('cfg-studio') && !document.getElementById('cfg-name') && !document.getElementById('cfg-wa') && !document.getElementById('cfg-bio') && !document.getElementById('cfg-file-foto')`));
    chk(P('perfil: CEP é o primeiro campo do endereço'), await call(page, `document.querySelector('.cfg-end input').id==='cfg-pf-cep' && document.querySelectorAll('.cfg-end input, .cfg-end select').length===7`));
    chk(P('perfil: campos explicam que não entram nas mensagens nem aparecem ao aluno'), await call(page, `['cfg-nome-completo','cfg-email-pf','cfg-tel-pf'].every(id=>/Não entra nas mensagens/.test(document.getElementById(id).closest('.field').textContent))`));
    chk(P('perfil: CREF cita a variável {cref}'), await call(page, `document.getElementById('cfg-cref').closest('.field').textContent.includes('{cref}')`));
    chk(P('perfil: UF é uma lista com os 27 estados'), await call(page, `document.querySelectorAll('#cfg-pf-uf option').length===28`));

    // Perfil: máscaras e validação
    chk(P('perfil: máscara de CEP e de telefone'), await call(page, `_cfgCepMask('01310100')==='01310-100' && _cfgTelMask('21988887777')==='(21) 98888-7777' && _cfgTelMask('2133334444')==='(21) 3333-4444' && _cfgTelMask('+351912345678')==='+351912345678'`));
    await call(page, `document.getElementById('cfg-email-pf').value='isso-nao-e-email'; cfgSalvarPerfil()`); await page.waitForTimeout(200);
    chk(P('perfil: e-mail inválido não salva'), await call(page, `DB.config.emailPessoal===''`));
    await call(page, `document.getElementById('cfg-email-pf').value=''; document.getElementById('cfg-tel-pf').value='123'; cfgSalvarPerfil()`); await page.waitForTimeout(200);
    chk(P('perfil: telefone curto não salva'), await call(page, `DB.config.telefonePessoal===''`));
    await call(page, `document.getElementById('cfg-tel-pf').value=''; document.getElementById('cfg-pf-cep').value='12345'; cfgSalvarPerfil()`); await page.waitForTimeout(200);
    chk(P('perfil: CEP incompleto não salva'), await call(page, `DB.config.enderecoPessoal.cep===''`) && await call(page, `!!document.querySelector('.toast.err')`));
    await call(page, `document.querySelectorAll('.toast').forEach(t=>t.remove()); document.getElementById('cfg-pf-cep').value=''`);

    // Perfil: CEP preenche o endereço (ViaCEP simulado)
    await call(page, `(()=>{ const e=document.getElementById('cfg-pf-cep'); e.value='01310100'; cfgCepDigitou('pf', e); })()`); await page.waitForTimeout(500);
    chk(P('cep: máscara aplicada e consulta feita só com o CEP'), await call(page, `document.getElementById('cfg-pf-cep').value==='01310-100'`) && viacep.consultas.join()==='01310100', viacep.consultas.join());
    chk(P('cep: preenche rua, bairro, cidade e UF e leva o foco ao número'), await call(page, `(g=>g('rua')==='Avenida Paulista'&&g('bairro')==='Bela Vista'&&g('cidade')==='São Paulo'&&g('uf')==='SP'&&document.activeElement.id==='cfg-pf-numero')(k=>document.getElementById('cfg-pf-'+k).value)`));
    await call(page, `document.querySelectorAll('.toast').forEach(t=>t.remove()); (()=>{ const e=document.getElementById('cfg-pf-cep'); e.value='99999999'; cfgCepDigitou('pf', e); })()`); await page.waitForTimeout(500);
    chk(P('cep: não encontrado avisa e deixa os campos como estavam'), await call(page, `[...document.querySelectorAll('.toast.err')].some(t=>/CEP não encontrado/.test(t.textContent)) && document.getElementById('cfg-pf-rua').value==='Avenida Paulista'`));
    viacep.falhar = true;
    await call(page, `document.querySelectorAll('.toast').forEach(t=>t.remove()); (()=>{ const e=document.getElementById('cfg-pf-cep'); e.value='01310200'; cfgCepDigitou('pf', e); })()`); await page.waitForTimeout(500);
    chk(P('cep: serviço fora do ar avisa, não trava a tela e os campos seguem editáveis'), await call(page, `[...document.querySelectorAll('.toast.err')].some(t=>/CEP não encontrado/.test(t.textContent)) && !document.getElementById('cfg-pf-rua').disabled && !document.documentElement.hasAttribute('aria-busy')`));
    viacep.falhar = false;

    // Perfil: salvar
    await call(page, `document.querySelectorAll('.toast').forEach(t=>t.remove())`);
    await call(page, `
      document.getElementById('cfg-nome-completo').value='Marina Souza Costa'; document.getElementById('cfg-cref').value='012345-G/SP';
      document.getElementById('cfg-email-pf').value='marina.pessoal@exemplo.com'; document.getElementById('cfg-tel-pf').value='(21) 97777-6666';
      document.getElementById('cfg-pf-cep').value='01310-100'; document.getElementById('cfg-pf-numero').value='1000'; document.getElementById('cfg-pf-complemento').value='Sala 5';
      cfgSalvarPerfil()`);
    await page.waitForTimeout(300);
    chk(P('perfil: campos gravados em DB.config'), await call(page, `(c=>c.nomeCompleto==='Marina Souza Costa'&&c.cref==='012345-G/SP'&&c.emailPessoal==='marina.pessoal@exemplo.com'&&c.telefonePessoal==='(21) 97777-6666'&&c.enderecoPessoal.cep==='01310-100'&&c.enderecoPessoal.rua==='Avenida Paulista'&&c.enderecoPessoal.numero==='1000'&&c.enderecoPessoal.complemento==='Sala 5'&&c.enderecoPessoal.cidade==='São Paulo'&&c.enderecoPessoal.uf==='SP')(DB.config)`));
    chk(P('perfil: sem aviso de erro'), await call(page, `!document.querySelector('.toast.err')`));
    chk(P('perfil: persiste no armazenamento local'), await call(page, `JSON.parse(localStorage.getItem(lsKey('crm'))).config.enderecoPessoal.numero==='1000'`));
    chk(P('perfil: não mexe na marca (nome de exibição e studio continuam vazios)'), await call(page, `DB.config.personalName==='' && DB.config.studioName==='FitCPX Lite'`));
    chk(P('perfil: CREF continua nas mensagens'), await call(page, `waTextoDeModelo('{cref}', null, {})==='012345-G/SP'`));
    await call(page, `renderConfigCRM()`);
    chk(P('perfil: reabrir mostra o salvo'), await call(page, `document.getElementById('cfg-nome-completo').value==='Marina Souza Costa' && document.getElementById('cfg-pf-uf').value==='SP' && document.getElementById('cfg-tel-pf').value==='(21) 97777-6666'`));

    // ── Marca ──
    await call(page, `_cfgAba('marca')`); await page.waitForTimeout(200);
    chk(P('marca: 10 cores prontas + cor livre + 24 ícones + vaga vazia da logo'), await call(page, `document.querySelectorAll('.mc-sw').length===10 && !!document.getElementById('cfg-cor-livre') && document.querySelectorAll('.mc-ic[data-ic]').length===24 && document.querySelectorAll('.mc-ic').length===25 && document.querySelector('.mc-icons').firstElementChild.matches('.mc-ic-logo.vazia')`));
    chk(P('marca: pré-visualização claro e escuro'), await call(page, `document.querySelectorAll('.mc-prev').length===2`));
    chk(P('marca: 4 seções (identidade, contato, endereço de atendimento, app)'), await call(page, `document.querySelectorAll('#screen-config-body .cfg-sec').length===4`));
    chk(P('marca: não tem os campos do Perfil'), await call(page, `!document.getElementById('cfg-nome-completo') && !document.getElementById('cfg-cref') && !document.getElementById('cfg-tel-pf') && !document.getElementById('cfg-email-pf')`));
    chk(P('marca: campos do aluno têm descrição'), await call(page, `(t=>t('cfg-name').includes('{personal}')&&t('cfg-studio').includes('{studio}')&&t('cfg-wa').includes('{whatsappStudio}')&&/Não tem variável/.test(t('cfg-email'))&&/Não tem variável/.test(t('cfg-insta')))(id=>document.getElementById(id).closest('.field').textContent)`));
    chk(P('marca: endereço de atendimento tem CEP primeiro'), await call(page, `document.querySelector('#cfg-st-cep')===document.querySelector('.cfg-end #cfg-st-cep') && !!document.getElementById('cfg-st-uf')`));
    await call(page, `document.getElementById('cfg-email').value='x'; cfgSalvarMarca()`); await page.waitForTimeout(200);
    chk(P('marca: e-mail inválido não salva'), await call(page, `DB.config.email==='' && DB.config.marca.cor==='#3dbb6e'`));
    await call(page, `document.getElementById('cfg-email').value=''; document.getElementById('cfg-wa').value='123'; cfgSalvarMarca()`); await page.waitForTimeout(200);
    chk(P('marca: WhatsApp curto não salva'), await call(page, `DB.config.whatsapp===''`));
    await call(page, `document.getElementById('cfg-wa').value=''; document.querySelectorAll('.toast').forEach(t=>t.remove()); cfgEnderecoCopiar()`);
    chk(P('marca: "Usar o endereço do Perfil" copia os campos'), await call(page, `document.getElementById('cfg-st-cep').value==='01310-100' && document.getElementById('cfg-st-numero').value==='1000' && document.getElementById('cfg-st-cidade').value==='São Paulo' && document.getElementById('cfg-st-uf').value==='SP'`));
    await call(page, `
      document.getElementById('cfg-studio').value='Studio Vida'; document.getElementById('cfg-name').value='Marina Costa'; document.getElementById('cfg-ddi').value='351';
      document.getElementById('cfg-wa').value='(21) 98888-7777'; document.getElementById('cfg-email').value='contato@studiovida.com'; document.getElementById('cfg-insta').value='@studiovida';
      document.getElementById('cfg-bio').value='Treino com ciência.'; document.getElementById('cfg-st-complemento').value='Loja 2'`);
    await call(page, `cfgMarcaCor('#3b82f6'); cfgMarcaIcone('ph-heartbeat'); cfgMarcaNome('Vida Fit')`); await page.waitForTimeout(150);
    chk(P('marca: rascunho não muda o sistema antes de salvar'), await call(page, `!document.getElementById('marca-vars')`));
    chk(P('marca: pré-visualização usa a cor escolhida'), await call(page, `getComputedStyle(document.querySelector('.mc-prev-mark')).backgroundColor===(h=>{const n=parseInt(h.slice(1),16);return 'rgb('+(n>>16)+', '+((n>>8)&255)+', '+(n&255)+')'})(marcaCalcular('#3b82f6').claro['--primary']) && document.querySelector('.mc-prev-nome, .mc-prev-topo b').textContent==='Vida Fit'`));
    await shot(page, `cfg-${W}-marca`);
    await call(page, `cfgSalvarMarca()`); await page.waitForTimeout(400);
    chk(P('marca: identidade, contato e endereço gravados em DB.config'), await call(page, `(c=>c.studioName==='Studio Vida'&&c.personalName==='Marina Costa'&&c.waCountryCode==='351'&&c.whatsapp==='(21) 98888-7777'&&c.email==='contato@studiovida.com'&&c.instagram==='@studiovida'&&c.bio==='Treino com ciência.'&&c.enderecoStudio.rua==='Avenida Paulista'&&c.enderecoStudio.complemento==='Loja 2'&&c.enderecoStudio.uf==='SP')(DB.config)`));
    chk(P('marca: sem aviso de erro (nuvem ausente)'), await call(page, `!document.querySelector('.toast.err')`));
    chk(P('marca: nome do studio na lateral'), await call(page, `[...document.querySelectorAll('.sb-role')].every(e=>e.textContent==='Studio Vida')`));
    chk(P('marca: variáveis nas mensagens'), await call(page, `waTextoDeModelo('{studio}|{personal}|{cref}|{whatsappStudio}', null, {})==='Studio Vida|Marina Costa|012345-G/SP|(21) 98888-7777'`));
    chk(P('marca: DDI do studio vira o padrão dos envios'), await call(page, `waLinkPara({perfil:{whatsapp:'(11) 91234-5678'}}, 'oi').startsWith('https://wa.me/351')`));
    chk(P('marca: o Perfil não foi alterado ao salvar a marca'), await call(page, `DB.config.nomeCompleto==='Marina Souza Costa' && DB.config.enderecoPessoal.numero==='1000'`));
    await call(page, `renderConfigCRM()`);
    chk(P('marca: reabrir mostra o salvo'), await call(page, `document.getElementById('cfg-studio').value==='Studio Vida' && document.getElementById('cfg-ddi').value==='351' && document.getElementById('cfg-st-uf').value==='SP'`));
    chk(P('marca: salvar aplica a cor ao sistema'), await call(page, `!!document.getElementById('marca-vars') && getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()===marcaCalcular('#3b82f6').claro['--primary']`));
    chk(P('marca: botão principal usa a cor'), await call(page, `(()=>{ const b=document.createElement('button'); b.className='btn btn-primary'; document.body.appendChild(b); const c=getComputedStyle(b).backgroundColor; b.remove(); return c===(h=>{const n=parseInt(h.slice(1),16);return 'rgb('+(n>>16)+', '+((n>>8)&255)+', '+(n&255)+')'})(marcaCalcular('#3b82f6').claro['--primary']); })()`));
    chk(P('marca: guardada em DB.config.marca'), await call(page, `(m=>m.nomeApp==='Vida Fit'&&m.cor==='#3b82f6'&&m.icone==='ph-heartbeat'&&m.usarLogo===false)(DB.config.marca)`));
    await call(page, `document.documentElement.classList.add('dark')`); await page.waitForTimeout(100);
    chk(P('marca: tema escuro recebe tons próprios'), await call(page, `getComputedStyle(document.documentElement).getPropertyValue('--primary-ink').trim()!==''&&getComputedStyle(document.documentElement).getPropertyValue('--primary-ink').trim()!=='#4ade80'`));
    await shot(page, `cfg-${W}-marca-escuro`);
    await call(page, `document.documentElement.classList.remove('dark')`);
    chk(P('marca: sobrevive a recarregar os dados (crmLoad)'), await call(page, `(()=>{ document.getElementById('marca-vars').remove(); crmLoad(); return !!document.getElementById('marca-vars'); })()`));
    await call(page, `_cfgAba('marca'); cfgMarcaCor('<script>'); cfgMarcaIcone('ph-nao-existe')`);
    chk(P('marca: cor e ícone inválidos são recusados'), await call(page, `_cfgMarca.cor==='#3b82f6' && _cfgMarca.icone==='ph-heartbeat'`));
    await call(page, `cfgMarcaRestaurar(); cfgSalvarMarca()`); await page.waitForTimeout(400);
    chk(P('marca: voltar ao padrão remove o estilo'), await call(page, `!document.getElementById('marca-vars') && DB.config.marca.cor==='#3dbb6e'`));

    // Migração: endereço e cidade antigos (texto solto do studio) viram o endereço de atendimento
    await call(page, `DB.config.enderecoStudio=_cfgEnderecoPadrao(); DB.config.endereco='Rua Velha, 5'; DB.config.cidade='Curitiba - PR'; crmSave(); crmLoad()`);
    chk(P('migração: endereço antigo vai para a Rua e "Cidade - UF" é separada'), await call(page, `(e=>e.rua==='Rua Velha, 5'&&e.cidade==='Curitiba'&&e.uf==='PR'&&DB.config.endereco===undefined&&DB.config.cidade===undefined)(DB.config.enderecoStudio)`));
    await call(page, `DB.config.enderecoStudio={rua:'<img src=x onerror=alert(1)>',cep:42,uf:'SP',extra:'x'}; crmSave(); crmLoad()`);
    chk(P('endereço vindo de dado salvo: só chaves conhecidas e texto'), await call(page, `(e=>e.rua.startsWith('<img')&&e.cep===''&&e.uf==='SP'&&e.extra===undefined&&Object.keys(e).length===7)(DB.config.enderecoStudio)`));
    await call(page, `DB.config.enderecoStudio=_cfgEnderecoPadrao(); crmSave()`);

    // ── Logo e foto (Storage simulado) ──
    if (W === 1440) {
      const UID = '11111111-1111-1111-1111-111111111111';
      const RE = (tipo) => new RegExp('^' + UID + '/' + tipo + '-[0-9a-f]{16}\\.(webp|png)$');
      await call(page, `_supaUser = { id:'${UID}', email:'p@teste.com' }`);
      const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 900; c.height = 300; const g = c.getContext('2d'); g.fillStyle = '#d33'; g.fillRect(0, 0, 900, 300); g.fillStyle = '#fff'; g.fillRect(100, 100, 700, 100); return c.toDataURL('image/png').split(',')[1]; });
      const enviar = async (id, nome, tipo, conteudo) => { await page.setInputFiles(id, { name: nome, mimeType: tipo, buffer: conteudo }); await page.waitForTimeout(900); };
      await call(page, `navGo('config'); _cfgAba('marca')`); await page.waitForTimeout(200);

      await enviar('#cfg-file-logo', 'logo.png', 'image/png', Buffer.from(png, 'base64'));
      chk('logo: um envio, na pasta do personal, nome com sufixo', nuvem.subidas.length === 1 && RE('logo').test(nuvem.subidas[0].caminho), JSON.stringify(nuvem.subidas));
      chk('logo: comprimida (até 200 KB)', nuvem.subidas[0] && nuvem.subidas[0].bytes <= 205000, String(nuvem.subidas[0] && nuvem.subidas[0].bytes));
      const url1 = await call(page, `DB.config.marca.logoUrl`);
      chk('logo: URL pública válida guardada no config', await call(page, `marcaUrlImagemOk(DB.config.marca.logoUrl) && DB.config.marca.logoUrl.endsWith('${nuvem.subidas[0] && nuvem.subidas[0].caminho}')`), url1);
      chk('logo: publicada em personal_links', nuvem.patches.length > 0 && nuvem.patches[nuvem.patches.length - 1].marca_logo_url === url1, JSON.stringify(nuvem.patches.slice(-1)));
      chk('logo: aparece na tela e na pré-visualização', await call(page, `!!document.querySelector('.mc-icons .mc-ic-logo.on img') && !document.querySelector('.mc-ic[data-ic].on') && !!document.querySelector('.mc-prev-mark.com-logo img') && DB.config.marca.usarLogo===true`));
      await shot(page, 'cfg-logo');

      await enviar('#cfg-file-logo', 'outra.png', 'image/png', Buffer.from(png, 'base64'));
      chk('logo: trocar apaga o arquivo anterior', nuvem.subidas.length === 2 && nuvem.apagados.includes(nuvem.subidas[0].caminho) && nuvem.subidas[1].caminho !== nuvem.subidas[0].caminho, JSON.stringify(nuvem.apagados));

      // logo é uma opção da grade: salvar a marca NÃO pode perder a logo (bug: sumia ao recarregar)
      await call(page, `cfgMarcaCor('#3b82f6'); cfgSalvarMarca()`); await page.waitForTimeout(400);
      const urlLogo = await call(page, `DB.config.marca.logoUrl`);
      chk('logo: salvar a marca mantém logoUrl e usarLogo', await call(page, `marcaUrlImagemOk(DB.config.marca.logoUrl) && DB.config.marca.usarLogo===true`), urlLogo);
      chk('logo: salvar a marca publica a logo (não null)', nuvem.patches[nuvem.patches.length - 1].marca_logo_url === urlLogo, JSON.stringify(nuvem.patches.slice(-1)));
      await call(page, `_cfgMarca=null; crmLoad(); renderConfigCRM()`); await page.waitForTimeout(200);
      chk('logo: depois de recarregar continua selecionada na grade', await call(page, `!!document.querySelector('.mc-ic-logo.on img') && DB.config.marca.logoUrl===${JSON.stringify(urlLogo)}`));
      await call(page, `cfgMarcaIcone('ph-fire'); cfgSalvarMarca()`); await page.waitForTimeout(400);
      chk('logo: escolher ícone desmarca a logo, guarda o arquivo e publica null', await call(page, `DB.config.marca.usarLogo===false && DB.config.marca.logoUrl===${JSON.stringify(urlLogo)} && !document.querySelector('.mc-ic-logo.on') && document.querySelector('.mc-ic[data-ic="ph-fire"]').classList.contains('on') && !document.querySelector('.mc-prev-mark.com-logo')`) && nuvem.patches[nuvem.patches.length - 1].marca_logo_url === null);
      await call(page, `cfgMarcaLogo(); cfgSalvarMarca()`); await page.waitForTimeout(400);
      chk('logo: clicar na vaga seleciona de novo e publica a URL', await call(page, `DB.config.marca.usarLogo===true && !!document.querySelector('.mc-ic-logo.on')`) && nuvem.patches[nuvem.patches.length - 1].marca_logo_url === urlLogo);

      await call(page, `document.querySelectorAll('.toast').forEach(t=>t.remove())`);
      await enviar('#cfg-file-logo', 'texto.png', 'image/png', Buffer.from('isto não é uma imagem, só texto disfarçado'));
      chk('envio recusa arquivo que não é imagem (mesmo com nome .png)', nuvem.subidas.length === 2 && await call(page, `[...document.querySelectorAll('.toast.err')].some(t=>/PNG, JPEG ou WebP/.test(t.textContent))`));
      await enviar('#cfg-file-logo', 'x.svg', 'image/svg+xml', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'));
      chk('envio recusa SVG', nuvem.subidas.length === 2);

      await call(page, `_cfgAba('marca')`); await page.waitForTimeout(200);
      await enviar('#cfg-file-foto', 'foto.png', 'image/png', Buffer.from(png, 'base64'));
      chk('foto: enviada como foto-... e guardada', nuvem.subidas.length === 3 && RE('foto').test(nuvem.subidas[2].caminho) && await call(page, `marcaUrlImagemOk(DB.config.fotoUrl)`), JSON.stringify(nuvem.subidas[2]));
      chk('foto: publicada em personal_links', nuvem.patches[nuvem.patches.length - 1].foto_url === await call(page, `DB.config.fotoUrl`));
      await shot(page, 'cfg-foto');

      await call(page, `_cfgAba('marca')`);
      await call(page, `cfgRemoverImagem('logo')`); await page.waitForTimeout(600);
      chk('logo: remover limpa, publica null e apaga o arquivo', await call(page, `DB.config.marca.logoUrl===''`) && nuvem.patches[nuvem.patches.length - 1].marca_logo_url === null && nuvem.apagados.includes(nuvem.subidas[1].caminho));

      await call(page, `DB.config.marca.logoUrl='https://evil.example/x.png'; DB.config.fotoUrl='javascript:alert(1)'; crmSave(); crmLoad();`);
      chk('URL de fora gravada no CRM é descartada ao carregar', await call(page, `DB.config.marca.logoUrl==='' && DB.config.fotoUrl===''`));
      await call(page, `_supaUser = null`);
      nuvem.patches.length = 0;
    }

    // ── Regras ──
    await call(page, `_cfgAba('regras')`); await page.waitForTimeout(200);
    await shot(page, `cfg-${W}-regras`);
    await call(page, `document.getElementById('cfg-jprox').value=20; document.getElementById('cfg-jagend').value=10; cfgSalvarRegras()`); await page.waitForTimeout(200);
    chk(P('regras: agendar menor que vencendo não salva'), await call(page, `DB.config.janelaProximo===7`));
    await call(page, `document.getElementById('cfg-urg').value=9; document.getElementById('cfg-jprox').value=12; document.getElementById('cfg-jagend').value=30; document.getElementById('cfg-valid').value='16'; document.getElementById('cfg-drev').value=45; document.getElementById('cfg-dnovo').value=21; cfgSalvarRegras()`); await page.waitForTimeout(200);
    chk(P('regras: salvas'), await call(page, `(c=>c.urgencyDays===9&&c.janelaProximo===12&&c.janelaAgendar===30&&c.validadeSemanas===16&&c.diasRevisao===45&&c.diasAlunoNovo===21)(DB.config)`));
    chk(P('regras: urgência lida pelo motor de tarefas'), await call(page, `urgDays()===9`));
    chk(P('regras: janela do treino lida pelo motor'), await call(page, `(()=>{ const BR=iso=>new Date(iso+'T12:00:00').toLocaleDateString('pt-BR'); const h=todayStr(); const st=getStatusVencimento({status:'aprovado',dataVencimento:BR(addDays(h,10))}); const st2=getStatusVencimento({status:'aprovado',dataVencimento:BR(addDays(h,25))}); return st.tier==='proximo' && st2.tier==='agendar'; })()`));
    chk(P('regras: validade padrão na prescrição'), await call(page, `cfgValidadePadrao()==='16sem'`));
    chk(P('regras: revisão de parados usa o prazo'), await call(page, `(()=>{ const a={crm:{status:'pausado',statusSince:addDays(todayStr(),-40)}}; const b={crm:{status:'pausado',statusSince:addDays(todayStr(),-50)}}; return !needsReview(a) && needsReview(b); })()`));
    await call(page, `DB.config.urgencyDays=3; DB.config.janelaProximo=7; DB.config.janelaAgendar=14; DB.config.validadeSemanas=12; DB.config.diasRevisao=30; DB.config.diasAlunoNovo=14; crmSave()`);

    // ── Fila "A enviar" ──
        await page.evaluate(`window.__mont = ${montarCenario.toString()}`);
    await call(page, `(()=>{ __mont().forEach(s=>students.push(s)); DB.waFeitas={}; DB.waBase=null; DB.tasks=[]; })()`);
    chk(P('fila: linha de base não puxa o que já estava vencido'), await call(page, `(()=>{ const nomes=waPendentes().map(i=>alunoNome(findAluno(i.alunoId))); return DB.waBase===todayStr() && !nomes.includes('Vera Vencida') && !nomes.includes('Vitor Vencendo') && !nomes.includes('Nina Nova'); })()`));
    // simula recurso ligado há 10 dias
    await call(page, `DB.waBase=addDays(todayStr(),-10)`);
    // tarefa de fluxo vencendo hoje para a Gabi (trigger e prescrição concluídos)
    await call(page, `(()=>{ const g=students.find(s=>s.id===9000000000007); const hoje=todayStr(); const fl=DB.fluxos[0]; g.crm.fluxos=[{id:fl.id,triggerDate:addDays(hoje,-7),tasks:[]}]; genTasksForAluno(g);
      const tk=g.crm.fluxos[0].tasks.map(id=>DB.tasks.find(t=>t.id===id)); tk[0].done=true; tk[0].doneDate=addDays(hoje,-7); const pres=tk.find(t=>t.stepId&&t.stepId.startsWith(fl.steps[0].id+'_fl')); pres.done=true; pres.doneDate=addDays(hoje,-7); })()`);
    const ev = await call(page, `JSON.stringify(waPendentes().map(i=>i.evento+':'+alunoNome(findAluno(i.alunoId))).sort())`);
    const esperado = ['aniversario:Ana Aniversario', 'aniversario:Sem Telefone', 'boasVindas:Nina Nova', 'reativar:Paulo Parado', 'tarefa:Gabi Fluxo', 'treinoVencendo:Vitor Vencendo', 'treinoVencido:Vera Vencida'];
    chk(P('fila: detecta os 6 eventos'), ev === JSON.stringify(esperado.slice().sort()), ev);
    chk(P('fila: tarefa de fluxo traz o título da etapa'), await call(page, `waPendentes().find(i=>i.evento==='tarefa').detalhe==='Acompanhamento 7 dias'`));
    chk(P('fila: texto usa o modelo e as variáveis'), await call(page, `waItemTexto(waPendentes().find(i=>i.evento==='treinoVencido')).includes('Vera')&&waItemTexto(waPendentes().find(i=>i.evento==='treinoVencido')).includes('venceu em')&&!/[{}]/.test(waItemTexto(waPendentes().find(i=>i.evento==='aniversario')))`));
    chk(P('fila: aniversário assina com o nome do personal'), await call(page, `waItemTexto(waPendentes().find(i=>i.evento==='aniversario')).includes('Marina Costa')`));
    chk(P('menu: selo com a contagem'), await call(page, `(()=>{ updateBadges(); const b=document.getElementById('nav-whatsapp-badge'); return b.textContent==='7' && b.style.display!=='none'; })()`));
    chk(P('sino: lista as mensagens a enviar'), await call(page, `shellSinoItens().some(i=>/mensagens a enviar/.test(i.t)&&i.n===7)`));
    await call(page, `navGo('dashboard')`); await page.waitForTimeout(400);
    chk(P('painel: card Mensagens a enviar abre sozinho, com a contagem e 3 avisos'), await call(page, `(()=>{ const m=document.querySelector('.dp-acc[data-acc="msg"]'), pa=document.querySelector('.dp-acc[data-acc="passos"]'); return !!m && m.classList.contains('open') && !pa.classList.contains('open') && m.querySelector('.dp-acc-n').textContent==='7' && m.querySelectorAll('.dp-msg').length===3 && /Ver todas as 7/.test(m.textContent); })()`));
    chk(P('painel: abrir Primeiros passos recolhe Mensagens (nunca os dois abertos)'), await call(page, `(()=>{ dashAcc('passos'); const m=document.querySelector('.dp-acc[data-acc="msg"]'), pa=document.querySelector('.dp-acc[data-acc="passos"]'), at=document.querySelector('.dp-acc[data-acc="ativ"]'); return pa.classList.contains('open') && !m.classList.contains('open') && at.classList.contains('open'); })()`));
    await shot(page, `painel-${W}-wa`);
    await call(page, `waAbrirFila()`); await page.waitForTimeout(400);
    chk(P('tela A enviar: abre na aba certa com os grupos'), await call(page, `_waTab==='enviar' && document.querySelectorAll('#screen-whatsapp-body .card .card-title').length>=5`));
    chk(P('tela A enviar: aluno sem telefone mostra aviso, sem botão'), await call(page, `(()=>{ const r=[...document.querySelectorAll('#screen-whatsapp-body .lrow')].find(x=>/Sem Telefone/.test(x.textContent)); return !!r && /Sem telefone/.test(r.textContent) && !r.querySelector('.btn-primary'); })()`));
    chk(P('tela A enviar: explica a regra da linha de base'), await call(page, `/O que já estava vencido antes não entra/.test(document.getElementById('screen-whatsapp-body').textContent)`));
    await shot(page, `wa-${W}-enviar`);
    // abrir WhatsApp → marca enviada
    await call(page, `window.__aberto=[]; window.open=(u)=>{window.__aberto.push(u)}`);
    const chaveVera = await call(page, `waPendentes().find(i=>i.evento==='treinoVencido').chave`);
    await call(page, `waAbrirItem('${chaveVera}')`); await page.waitForTimeout(200);
    chk(P('enviar: abre wa.me com o texto e o DDI do studio'), await call(page, `__aberto.length===1 && __aberto[0].startsWith('https://wa.me/351') && decodeURIComponent(__aberto[0]).includes('Vera')`));
    chk(P('enviar: some da fila e vira "enviada"'), await call(page, `!waPendentes().some(i=>i.chave==='${chaveVera}') && DB.waFeitas['${chaveVera}'].s==='enviada' && waPendentes().length===6`));
    chk(P('enviar: o selo desce'), await call(page, `document.getElementById('nav-whatsapp-badge').textContent==='6'`));
    chk(P('enviar: não reaparece em nova consulta'), await call(page, `(waPendentes(), waPendentes().length===6)`));
    await call(page, `waReabrir('${chaveVera}')`);
    chk(P('reabrir: volta para a fila'), await call(page, `waPendentes().length===7`));
    // dispensar
    const chaveAna = await call(page, `waPendentes().find(i=>i.evento==='aniversario'&&/Ana/.test(alunoNome(findAluno(i.alunoId)))).chave`);
    await call(page, `waDispensar('${chaveAna}')`);
    chk(P('dispensar: remove sem abrir o WhatsApp'), await call(page, `waPendentes().length===6 && __aberto.length===1 && DB.waFeitas['${chaveAna}'].s==='dispensada'`));
    // sem telefone: não marca
    const chaveSem = await call(page, `waPendentes().find(i=>/Sem Telefone/.test(alunoNome(findAluno(i.alunoId)))).chave`);
    await call(page, `waAbrirItem('${chaveSem}')`);
    chk(P('sem telefone: não abre e continua pendente'), await call(page, `__aberto.length===1 && waPendentes().some(i=>i.chave==='${chaveSem}')`));
    // evento desligado
    await call(page, `DB.waTpls.find(t=>t.sys==='treinoVencendo').evento=''`);
    chk(P('evento desligado no modelo some da fila'), await call(page, `!waPendentes().some(i=>i.evento==='treinoVencendo')`));
    await call(page, `DB.waTpls.find(t=>t.sys==='treinoVencendo').evento='treinoVencendo'`);
    // validade: deixa de valer
    await call(page, `(()=>{ const g=students.find(s=>s.id===9000000000007); const t=DB.tasks.find(x=>x.alunoId===g.id&&x.titulo==='Acompanhamento 7 dias'); t.done=true; t.doneDate=todayStr(); })()`);
    chk(P('validade: tarefa concluída sai da fila sozinha'), await call(page, `!waPendentes().some(i=>i.evento==='tarefa')`));
    await call(page, `(()=>{ const v=students.find(s=>s.id===9000000000001); const BR=iso=>new Date(iso+'T12:00:00').toLocaleDateString('pt-BR'); v.treinos[0].dataVencimento=BR(addDays(todayStr(),60)); })()`);
    chk(P('validade: treino renovado sai da fila sozinho'), await call(page, `!waPendentes().some(i=>i.evento==='treinoVencido')`));
    // dispensar todas
    await call(page, `waDispensarEvento('aniversario')`);
    chk(P('dispensar todas do evento'), await call(page, `!waPendentes().some(i=>i.evento==='aniversario')`));
    // editor de modelo: campo Avisar quando
    await call(page, `waIrParaAba('modelos')`); await page.waitForTimeout(250);
    chk(P('modelos: campo "Avisar quando" e variáveis novas'), await call(page, `!!document.getElementById('wt-evento') && document.getElementById('wt-evento').options.length===8 && /\\{personal\\}/.test(document.getElementById('screen-whatsapp-body').textContent)`));
    await call(page, `waStudioEdit(DB.waTpls.find(t=>t.sys==='aniversario').id)`); await page.waitForTimeout(200);
    chk(P('modelos: editar abre com o evento marcado'), await call(page, `document.getElementById('wt-evento').value==='aniversario'`));
    await call(page, `document.getElementById('wt-evento').value=''; saveWATpl()`);
    chk(P('modelos: salvar evento vazio desliga o aviso'), await call(page, `DB.waTpls.find(t=>t.sys==='aniversario').evento===''`));
    await shot(page, `wa-${W}-modelos`);

    // ── Etapa de fluxo ganhou o seletor de mensagem ──
    await call(page, `navGo('fluxos'); crmFluxosTab='fluxos'; renderFluxosCRM(); editFluxo(DB.fluxos[0].id)`); await page.waitForTimeout(250);
    chk(P('fluxo: cada etapa tem "Mensagem de WhatsApp"'), await call(page, `[...document.querySelectorAll('#fl-steps-list select')].filter(s=>/Mensagem de WhatsApp/.test(s.options[0].textContent)).length===5`));
    await shot(page, `fluxo-${W}`);

    // ── Rolagem horizontal ──
    for (const aba of ['perfil', 'marca', 'regras']) {
      await call(page, `navGo('config'); _cfgAba('${aba}')`); await page.waitForTimeout(150);
      chk(P(`config ${aba}: sem rolagem horizontal`), await call(page, `document.documentElement.scrollWidth<=window.innerWidth+1`));
    }
    chk(P('sem erros de página'), errs.length === 0, errs.join(' | '));
    await ctx.close();
  }

  // ═══ VIRADA DO DIA (relógio simulado) ═════════════════════════════════════
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, timezoneId: 'America/Sao_Paulo' });
    const page = await ctx.newPage();
    await page.clock.install({ time: new Date('2026-10-08T23:50:00-03:00') });
    page.on('dialog', d => d.accept().catch(() => {}));
    await boot(page);
    await page.evaluate(() => {
      students.length = 0; DB.waFeitas = {}; DB.waBase = null; DB.tasks = [];
      students.push({ id: 9000000000009, perfil: { nome: 'Aniv Amanha', whatsapp: '(11) 97777-6666', nascimento: '1991-10-09' }, crm: { status: 'ativo', statusSince: '2026-01-01', fluxos: [] }, treinos: [], avaliacoesAntro: [], _treinosMigrado: true });
      updateBadges();
    });
    await page.clock.pauseAt(new Date('2026-10-08T23:59:30-03:00'));
    const antes = await page.evaluate(() => ({ dia: todayStr(), n: waPendentes().length, badge: document.getElementById('nav-whatsapp-badge').style.display }));
    chk('virada: antes da meia-noite não há aviso', antes.dia === '2026-10-08' && antes.n === 0 && antes.badge === 'none', JSON.stringify(antes));
    await page.clock.fastForward(75000);
    await page.waitForTimeout(300);
    const depois = await page.evaluate(() => ({ dia: todayStr(), n: waPendentes().length, badge: document.getElementById('nav-whatsapp-badge').textContent }));
    chk('virada: ao virar o dia o aviso entra sem recarregar', depois.dia === '2026-10-09' && depois.n === 1 && depois.badge === '1', JSON.stringify(depois));
    await ctx.close();
  }

  // ═══ PORTAL DO ALUNO ═════════════════════════════════════════════════════
  async function portal(marca, url) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    page.errs = []; page.on('pageerror', e => page.errs.push(e.message.slice(0, 160)));
    page.rpcs = [];
    await ctx.route('**/*.supabase.co/**', async route => {
      const u = route.request().url();
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 200, headers: CORS, body: '' });
      if (u.includes('/rpc/resolver_codigo')) return route.fulfill({ status: 200, headers: JSON_H, body: '"11111111-1111-1111-1111-111111111111"' });
      if (u.includes('/rpc/nome_do_link')) return route.fulfill({ status: 200, headers: JSON_H, body: '"Marina Costa"' });
      if (u.includes('/storage/v1/object/public/')) return route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'image/png' }, body: PNG1X1 });
      if (u.includes('/rpc/marca_do_link')) { page.rpcs.push('link'); return route.fulfill({ status: 200, headers: JSON_H, body: JSON.stringify(marca) }); }
      if (u.includes('/rpc/marca_do_aluno')) { page.rpcs.push('aluno'); return route.fulfill({ status: 200, headers: JSON_H, body: JSON.stringify(marca) }); }
      if (u.includes('/auth/v1/')) return route.fulfill({ status: 200, headers: JSON_H, body: '{}' });
      return route.fulfill({ status: 200, headers: JSON_H, body: '[]' });
    });
    await page.goto(BASE + url, { waitUntil: 'load' }); await page.waitForTimeout(900);
    return { ctx, page };
  }
  const MARCA = { nome_app: 'Vida Fit', cor: '#8b5cf6', icone: 'ph-heartbeat', studio: 'Studio Vida', personal: 'Marina Costa' };
  {
    const { ctx, page } = await portal(MARCA, '/aluno/?p=ABCDEFGH');
    const t = await page.evaluate(() => ({
      logo: [...document.querySelectorAll('.topo-logo')].map(e => e.textContent), sub: [...document.querySelectorAll('.topo-sub')].map(e => e.textContent),
      ic: [...document.querySelectorAll('.topo-mark i')].map(e => e.className), titulo: document.title,
      cor: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(), esperado: marcaCalcular('#8b5cf6').claro['--primary'], manifest: document.querySelector('link[rel=manifest]').href.slice(0, 5),
      tela: [...document.querySelectorAll('.tela:not(.hidden)')].map(e => e.id),
    }));
    chk('portal ?p=: nome do app em todas as telas', t.logo.length >= 10 && t.logo.every(x => x === 'Vida Fit'), JSON.stringify(t.logo));
    chk('portal ?p=: subtítulo é o studio', t.sub.every(x => x === 'Studio Vida'));
    chk('portal ?p=: ícone da marca', t.ic.every(x => x === 'ph-heartbeat'));
    chk('portal ?p=: título da aba', t.titulo === 'Vida Fit | Portal do Aluno', t.titulo);
    chk('portal ?p=: cor aplicada (versão do tema claro, texto branco 4,5:1)', t.cor === t.esperado && t.cor !== '#8b5cf6', t.cor + ' / ' + t.esperado);
    chk('portal ?p=: manifest próprio (blob)', t.manifest === 'blob:');
    chk('portal ?p=: abre a tela de login', JSON.stringify(t.tela) === '["tela-login"]', JSON.stringify(t.tela));
    chk('portal ?p=: botão usa a cor da marca', await page.evaluate(() => { const b = document.querySelector('#tela-login .btn-primary'); return !!b && getComputedStyle(b).backgroundColor === (h=>{const n=parseInt(h.slice(1),16);return 'rgb('+(n>>16)+', '+((n>>8)&255)+', '+(n&255)+')'})(marcaCalcular('#8b5cf6').claro['--primary']); }));
    chk('portal ?p=: só a RPC pública do link foi chamada', page.rpcs.join() === 'link', page.rpcs.join());
    chk('portal ?p=: guarda a marca neste aparelho', await page.evaluate(() => !!localStorage.getItem('fitcpx-marca-portal')));
    if (OUT) await page.screenshot({ path: OUT + '/portal-marca-login.png' });
    chk('portal ?p=: sem erro de página', page.errs.length === 0, page.errs.join('|'));
    // sem código na próxima abertura: usa a marca guardada
    await page.goto(BASE + '/aluno/', { waitUntil: 'load' }); await page.waitForTimeout(600);
    chk('portal sem código: usa a marca guardada', await page.evaluate(() => document.querySelector('.topo-logo').textContent === 'Vida Fit'));
    await ctx.close();
  }
  {
    const { ctx, page } = await portal(MARCA, '/aluno/?c=ABCDEFGH');
    chk('portal ?c=: cadastro por link também recebe a marca', await page.evaluate(() => document.querySelector('.topo-logo').textContent === 'Vida Fit' && getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() === marcaCalcular('#8b5cf6').claro['--primary']));
    await ctx.close();
  }
  {
    const { ctx, page } = await portal({ nome_app: null, cor: null, icone: null, studio: null, personal: 'Marina Costa' }, '/aluno/?p=ABCDEFGH');
    const t = await page.evaluate(() => ({ logo: document.querySelector('.topo-logo').textContent, sub: document.querySelector('.topo-sub').textContent, estilo: !!document.getElementById('marca-vars'), titulo: document.title, ls: localStorage.getItem('fitcpx-marca-portal') }));
    chk('portal sem marca configurada: segue o padrão FitCPX', t.logo === 'FitCPX' && t.sub === 'Portal do Aluno' && !t.estilo && t.titulo === 'Portal do Aluno | FitCPX' && t.ls === null, JSON.stringify(t));
    await ctx.close();
  }
  {
    // O personal removeu a marca: o aparelho que guardava a antiga volta ao padrão
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await ctx.route('**/*.supabase.co/**', r => r.request().method() === 'OPTIONS' ? r.fulfill({ status: 200, headers: CORS, body: '' }) : (r.request().url().includes('/rpc/marca_do_link') ? r.fulfill({ status: 200, headers: JSON_H, body: JSON.stringify({ nome_app: null, cor: null, icone: null, studio: null, personal: null }) }) : r.fulfill({ status: 200, headers: JSON_H, body: r.request().url().includes('/rpc/resolver_codigo') ? '"11111111-1111-1111-1111-111111111111"' : '[]' })));
    await page.goto(BASE + '/aluno/', { waitUntil: 'load' });
    await page.evaluate(m => localStorage.setItem('fitcpx-marca-portal', JSON.stringify(m)), { nome_app: 'Antiga', cor: '#ef4444', icone: 'ph-fire', studio: 'Velho' });
    await page.goto(BASE + '/aluno/?p=ABCDEFGH', { waitUntil: 'load' }); await page.waitForTimeout(800);
    chk('portal: marca removida pelo personal limpa o aparelho', await page.evaluate(() => document.querySelector('.topo-logo').textContent === 'FitCPX' && !document.getElementById('marca-vars') && localStorage.getItem('fitcpx-marca-portal') === null));
    await ctx.close();
  }
  {
    // XSS: texto malicioso vindo do banco nunca vira elemento nem executa
    const evil = { nome_app: '<img src=x onerror=window.__x=1>Loja', cor: 'red;} body{display:none', icone: '"><script>window.__y=1</script>', studio: '<svg onload=window.__z=1>', personal: '', logo_url: 'https://evil.example/a.png', foto_url: 'javascript:alert(1)' };
    const { ctx, page } = await portal(evil, '/aluno/?p=ABCDEFGH');
    const r = await page.evaluate(() => ({ x: window.__x, y: window.__y, z: window.__z, imgs: document.querySelectorAll('.topo img, .topo svg').length, corpo: getComputedStyle(document.body).display, logo: document.querySelector('.topo-logo').textContent }));
    chk('portal XSS: nada executa e nenhum elemento é injetado', !r.x && !r.y && !r.z && r.imgs === 0 && r.corpo !== 'none', JSON.stringify(r));
    chk('portal XSS: logo e foto de endereço de fora são ignoradas', await page.evaluate(() => !document.querySelector('.topo-mark img') && !document.querySelector('#cad-av img') && !document.querySelector('#inicio-personal img')));
    chk('portal XSS: nome do app entra só como texto (sem <>)', !/[<>]/.test(r.logo), r.logo);
    await ctx.close();
  }
  {
    // logo e foto do personal (URLs do bucket "marca")
    const UID = '11111111-1111-1111-1111-111111111111';
    const base = 'https://subqjcnztqzprtpqqrlt.supabase.co/storage/v1/object/public/marca/' + UID + '/';
    const comImg = { ...MARCA, logo_url: base + 'logo-a1b2c3d4e5f6a7b8.webp', foto_url: base + 'foto-a1b2c3d4e5f6a7b8.webp' };
    const { ctx, page } = await portal(comImg, '/aluno/?c=ABCDEFGH');
    await page.waitForTimeout(500);
    const r = await page.evaluate(async () => {
      const marcas = [...document.querySelectorAll('.topo-mark')];
      const man = await (await fetch(document.querySelector('link[rel=manifest]').href)).json();
      const card = document.querySelector('#inicio-personal .personal-card');
      return { n: marcas.length, todasComLogo: marcas.every(m => m.classList.contains('com-logo') && m.querySelector('img') && m.querySelector('img').src.endsWith('/logo-a1b2c3d4e5f6a7b8.webp')),
        carregou: [...document.querySelectorAll('.topo-mark img')].every(i => i.complete && i.naturalWidth > 0),
        cad: document.querySelector('#cad-av img') && document.querySelector('#cad-av img').src.endsWith('/foto-a1b2c3d4e5f6a7b8.webp'),
        card: !!card && /Marina Costa/.test(card.textContent) && /Studio Vida/.test(card.textContent) && !!card.querySelector('img'),
        iconeManifest: man.icons.length === 2 && man.icons.every(i => i.src.startsWith('data:image/png')), apple: (document.querySelector('link[rel=apple-touch-icon]') || {}).href || '' };
    });
    chk('portal logo: no lugar do ícone em todas as telas', r.n >= 10 && r.todasComLogo && r.carregou, JSON.stringify(r));
    chk('portal foto: avatar do cadastro e cartão "Seu personal"', r.cad && r.card, JSON.stringify(r));
    chk('portal logo: ícone de instalação gerado a partir da logo', r.iconeManifest && r.apple.startsWith('data:image/png'), JSON.stringify(r));
    if (OUT) await page.screenshot({ path: OUT + '/portal-marca-logo.png' });
    chk('portal logo: sem erro de página', page.errs.length === 0, page.errs.join('|'));
    // removida pelo personal: volta ao ícone
    await page.evaluate(() => _mpResolver({ nome_app: null, cor: null, icone: null, studio: null, personal: 'Marina Costa', logo_url: null, foto_url: null }, 'ABCDEFGH'));
    chk('portal logo: removida volta ao ícone padrão e some a foto', await page.evaluate(() => !document.querySelector('.topo-mark img') && !!document.querySelector('.topo-mark i.ph-barbell') && !document.querySelector('#inicio-personal img')));
    await ctx.close();
  }
  {
    // aluno logado, link sem código: marca pelo vínculo
    const { ctx, page } = await portal(MARCA, '/aluno/');
    await page.evaluate(() => { _alunoCodigo = null; aoAutenticar({ id: 'u1', email: 'a@b.com', app_metadata: {}, user_metadata: {} }).catch(() => {}); });
    await page.waitForTimeout(700);
    chk('portal logado sem código: pede a marca pelo vínculo', page.rpcs.includes('aluno'), page.rpcs.join());
    await ctx.close();
  }

  await browser.close();
  console.log('PASS ' + ok.length + '  FAIL ' + bad.length);
  bad.forEach(b => console.log('  FAIL ' + b));
  process.exit(bad.length ? 1 : 0);
})();
