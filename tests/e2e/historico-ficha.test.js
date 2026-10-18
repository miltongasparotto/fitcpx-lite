// Histórico da ficha (17/10/2026): anamnese, avaliação antropométrica e treino em linhas novas + formulário em página própria.
// Dados 100% fictícios (seed da Amanda Silva). Rodar: servidor em 5178 e, em C:/Users/junio/.claude/skills/playwright-skill:  node run.js <este arquivo>
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
  });
}
const vis = (page, id) => page.evaluate(i => { const e = document.getElementById(i); return !!e && !e.classList.contains('hidden') && getComputedStyle(e).display !== 'none'; }, id);
const txt = (page, sel) => page.evaluate(s => (document.querySelector(s) || {}).textContent || '', sel);
const n = (page, sel) => page.evaluate(s => document.querySelectorAll(s).length, sel);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 160)); });
  let aceitar = true;
  page.on('dialog', d => { (aceitar ? d.accept() : d.dismiss()).catch(() => {}); });
  await boot(page);
  await page.evaluate(() => { selectStudent(students[0].id); switchTab('anamnese'); });
  await page.waitForTimeout(300);

  // ── migração: a anamnese que já existia vira o primeiro registro ──
  const mig = await page.evaluate(() => students[0].anamneses.map(r => ({ d: r.data, o: r.origem, f: r.frequencia })));
  chk('migração: 1 registro de anamnese, com data e origem', mig.length === 1 && /^\d{4}-\d{2}-\d{2}$/.test(mig[0].d) && mig[0].o === 'personal' && mig[0].f === '4x', JSON.stringify(mig));
  chk('migração é idempotente', await page.evaluate(() => { anamMigrar(students[0]); anamMigrar(students[0]); return students[0].anamneses.length; }) === 1);
  chk('lista de anamnese: 1 linha, marcada como atual', (await n(page, '#anam-lista-tabela .hx-tr')) === 1 && (await n(page, '#anam-lista-tabela .hx-tr.atual')) === 1);
  chk('subaba mostra a contagem', /Anamnese\s*1/.test(await txt(page, '#subtab-anamnese-hist')) && /Antropométrica\s*2/.test(await txt(page, '#subtab-anamnese-antro')));
  chk('lista de anamnese: colunas Data, Objetivo, Frequência, Nível, Restrições, Origem', (await txt(page, '#anam-lista-view .hx-th')).replace(/\s+/g, '') === 'DataObjetivoFrequênciaNívelRestriçõesOrigem');
  chk('lista: formulário não aparece na ficha', !(await vis(page, 'fx-form')) && (await vis(page, 'fx-ficha')));

  // ── nova anamnese: página própria, sem o cartão do aluno, com a linha de identificação ──
  await page.evaluate(() => anamNova());
  await page.waitForTimeout(200);
  chk('nova anamnese: abre a página do formulário e esconde a ficha', (await vis(page, 'fx-form')) && !(await vis(page, 'fx-ficha')) && !(await vis(page, 'fx-cadastro')));
  chk('nova anamnese: cartão principal do aluno não aparece', await page.evaluate(() => { const e = document.querySelector('.fx-id'); return !e || e.offsetParent === null; }));
  chk('linha de identificação: nome, idade e nível', /Amanda Silva\s*·\s*\d+ anos\s*·\s*(Iniciante|Intermediário|Avançado)/.test((await txt(page, '#fxf-id')).replace(/\s+/g, ' ')), await txt(page, '#fxf-id'));
  chk('linha de identificação em uma linha só (altura baixa)', await page.evaluate(() => document.getElementById('fxf-id').offsetHeight < 70));
  chk('título da página: Nova anamnese', (await txt(page, '#fxf-titulo')) === 'Nova anamnese');
  chk('botão voltar mostra o nome do aluno', (await txt(page, '#fxf-voltar')) === 'Amanda Silva');
  chk('cartões separados por assunto', (await page.$$eval('#fxf-anamnese .fx-sec h3', e => e.map(x => x.textContent))).join('|') === 'Dados da anamnese|Objetivo e rotina|Histórico de treino|Saúde');
  chk('Cancelar e Salvar no fim da página', (await txt(page, '#fxf-anamnese .fx-salvar')).replace(/\s+/g, ' ').includes('Cancelar') && (await txt(page, '#fxf-anamnese .fx-salvar')).includes('Salvar anamnese'));
  const hoje = await page.evaluate(() => todayStr());
  chk('data nasce com hoje (data local)', (await page.inputValue('#a-data-anamnese')) === hoje);
  chk('copiar respostas: vem a anamnese mais recente e a opção em branco', await page.evaluate(() => { const o = [...document.querySelectorAll('#a-copiar option')].map(x => x.textContent); return o.length === 2 && /mais recente/.test(o[0]) && o[1] === 'Começar em branco'; }));
  chk('respostas copiadas: frequência 4x', (await page.inputValue('#a-frequencia')) === '4x');
  await page.selectOption('#a-frequencia', '6x');
  await page.selectOption('#a-objetivo-ef', 'Hip');
  chk('digitar marca alteração não salva', await page.evaluate(() => _formDirty === true));
  await page.evaluate(() => anamSalvar());
  await page.waitForTimeout(250);
  chk('salvar: volta para a ficha', (await vis(page, 'fx-ficha')) && !(await vis(page, 'fx-form')));
  const apos = await page.evaluate(() => ({ n: students[0].anamneses.length, freq: students[0].anamnese.frequencia, obj: students[0].anamnese.objetivo_ef, ant: anamOrdenadas(students[0]).map(r => r.frequencia) }));
  chk('salvar: nova linha, a anterior continua', apos.n === 2 && apos.ant.join() === '6x,4x', JSON.stringify(apos));
  chk('s.anamnese espelha a mais recente (prescrição lê dali)', apos.freq === '6x' && apos.obj === 'Hip');
  chk('lista: 2 linhas, a nova é a atual e vem primeiro', (await n(page, '#anam-lista-tabela .hx-tr')) === 2 && (await txt(page, '#anam-lista-tabela .hx-tr.atual .hx-main')).startsWith(hoje.split('-').reverse().join('/')));
  chk('lista: objetivo e frequência da nova linha', /Hipertrofia/.test(await txt(page, '#anam-lista-tabela .hx-tr.atual')) && /6x/.test(await txt(page, '#anam-lista-tabela .hx-tr.atual')));
  chk('subaba: contagem 2', /Anamnese\s*2/.test(await txt(page, '#subtab-anamnese-hist')));
  chk('dashboard e cartão leem a data da avaliação mais recente', await page.evaluate(() => { const d = _alAval(students[0]); return !!d && _alFmt(d) === document.getElementById('fx-aval-d').textContent; }));

  // ── abrir um registro antigo: carrega as respostas dele; Cancelar não muda nada ──
  await page.evaluate(() => anamAbrir(anamOrdenadas(students[0])[1].id));
  await page.waitForTimeout(150);
  chk('abrir antigo: respostas dele (4x), sem a caixa de copiar', (await page.inputValue('#a-frequencia')) === '4x' && !(await vis(page, 'anam-copiar-box')));
  chk('abrir antigo: título com a data', /^Anamnese de \d{2}\/\d{2}\/\d{4}$/.test(await txt(page, '#fxf-titulo')));
  await page.selectOption('#a-frequencia', '2x');
  await page.evaluate(() => anamCancelar());
  await page.waitForTimeout(250);
  chk('Cancelar: nada muda e o histórico continua', await page.evaluate(() => students[0].anamnese.frequencia === '6x' && anamOrdenadas(students[0]).map(r => r.frequencia).join() === '6x,4x'));
  chk('Cancelar: volta para a ficha', (await vis(page, 'fx-ficha')) && !(await vis(page, 'fx-form')));

  // ── editar o antigo e salvar: a ficha segue espelhando o mais recente ──
  await page.evaluate(() => anamAbrir(anamOrdenadas(students[0])[1].id));
  await page.selectOption('#a-frequencia', '2x');
  await page.evaluate(() => anamSalvar());
  await page.waitForTimeout(200);
  chk('editar o antigo: só ele muda; s.anamnese continua a mais recente', await page.evaluate(() => students[0].anamnese.frequencia === '6x' && anamOrdenadas(students[0]).map(r => r.frequencia).join() === '6x,2x'));

  // ── botão voltar com alteração pergunta antes ──
  await page.evaluate(() => anamNova());
  await page.selectOption('#a-frequencia', '5x');
  await page.evaluate(() => fxFormVoltar());
  chk('voltar com alteração: pergunta se quer salvar', await vis(page, 'modal-unsaved-overlay'));
  await page.evaluate(() => _unsavedSair());
  await page.waitForTimeout(250);
  chk('sair sem salvar: descarta e volta', (await vis(page, 'fx-ficha')) && await page.evaluate(() => students[0].anamnese.frequencia === '6x' && students[0].anamneses.length === 2));

  // ── excluir vai para Arquivadas e dá para restaurar ──
  await page.evaluate(() => anamExcluir(anamOrdenadas(students[0])[0].id));
  await page.waitForTimeout(150);
  chk('excluir: sai da lista, vai para Arquivadas e a ficha espelha a anterior', await page.evaluate(() => students[0].anamneses.length === 1 && students[0].anamnese.frequencia === '2x' && ARQUIVO.some(e => e.tipo === 'anamnese' && !e.restauradoEm)));
  chk('Arquivadas: rótulo com data em dia/mês/ano', await page.evaluate(() => /^Anamnese de \d{2}\/\d{2}\/\d{4}$/.test(ARQUIVO.filter(e => e.tipo === 'anamnese').pop().rotulo)));
  const rest = await page.evaluate(() => restaurarItem(ARQUIVO.filter(e => e.tipo === 'anamnese' && !e.restauradoEm).pop().arqId));
  chk('restaurar: volta para a lista e a ficha volta a espelhar a mais recente', rest.ok && await page.evaluate(() => students[0].anamneses.length === 2 && students[0].anamnese.frequencia === '6x'));

  // ── anamnese enviada pelo aluno direto em s.anamnese (aluno-api antiga) vira registro do aluno ──
  const port = await page.evaluate(() => { const s = students[0]; s.perfil.alunoUserId = 'u-ficticio'; s.anamnese.frequencia = '3x'; s.anamnese.tempo = '2–4 anos'; normalizarAlunoPortal(s); anamMigrar(s); const o = anamOrdenadas(s)[0]; const r = { n: s.anamneses.length, o: o.origem, f: o.frequencia }; delete s.perfil.alunoUserId; return r; });
  chk('portal gravou em s.anamnese: vira registro "Aluno" novo, uma vez só', port.n === 3 && port.o === 'aluno' && port.f === '3x', JSON.stringify(port));
  await page.evaluate(() => { students[0].anamneses = anamOrdenadas(students[0]).slice(1); anamAplicarAtual(students[0]); renderAnamLista(); });

  // ── antropometria: nova linha, variação em relação à anterior, espelho na mais recente ──
  await page.evaluate(() => switchSubtab('anamnese-antro'));
  await page.waitForTimeout(150);
  chk('antropometria: lista em linhas (2 registros do seed)', (await n(page, '#antro-lista-tabela .hx-tr')) === 2 && (await n(page, '#antro-lista-tabela .hx-tr.atual')) === 1);
  chk('antropometria: a mais antiga mostra "primeira avaliação"', /primeira avaliação/.test(await txt(page, '#antro-lista-tabela .hx-tr:last-child')));
  chk('antropometria: a mais recente mostra variação com seta', (await n(page, '#antro-lista-tabela .hx-tr.atual .hx-d i')) >= 2);
  await page.evaluate(() => antroNovaAvaliacao());
  await page.waitForTimeout(200);
  chk('nova avaliação: página própria com a linha de identificação', (await vis(page, 'fx-form')) && !(await vis(page, 'fx-ficha')) && /Amanda Silva/.test(await txt(page, '#fxf-id')) && (await txt(page, '#fxf-titulo')) === 'Nova avaliação');
  chk('nova avaliação: abrir o formulário não conta como alteração', await page.evaluate(() => _formDirty === false));
  chk('nova avaliação: cartões separados por assunto', (await page.$$eval('#fxf-antro .fx-sec h3', e => e.map(x => x.textContent))).join('|') === 'Dados da avaliação|Medidas básicas|Composição corporal|Circunferências (cm)|Observações');
  await page.fill('#a-altura', '165'); await page.fill('#a-peso', '70');
  await page.fill('#a-mgorda', '20'); await page.keyboard.press('Tab');
  await page.fill('#a-mmuscular', '30'); await page.keyboard.press('Tab');
  await page.waitForTimeout(450);
  await page.evaluate(() => antroSalvarAvaliacao());
  await page.waitForTimeout(500);
  chk('salvar avaliação: volta para a lista com 3 linhas, a nova é a atual', (await vis(page, 'fx-ficha')) && (await n(page, '#antro-lista-tabela .hx-tr')) === 3 && /70,0 kg/.test(await txt(page, '#antro-lista-tabela .hx-tr.atual')));
  chk('salvar avaliação: s.anamnese espelha a mais recente e não é apagada por blur', await page.evaluate(() => students[0].anamnese.peso === '70' && String(students[0].anamnese.data_avaliacao) === todayStr()));
  await page.evaluate(() => { antroNovaAvaliacao(); document.getElementById('a-peso').value = '99'; });
  await page.evaluate(() => antroCancelar());
  await page.waitForTimeout(300);
  chk('cancelar avaliação: nada é gravado', await page.evaluate(() => students[0].avaliacoesAntro.length === 3 && students[0].anamnese.peso === '70') && (await vis(page, 'fx-ficha')));
  chk('cancelar avaliação: formulário limpo para a próxima', (await page.inputValue('#a-peso')) === '');

  // ── treino: lista em linhas e página própria ──
  await page.evaluate(() => switchTab('prescricao'));
  await page.waitForTimeout(200);
  chk('treinos: lista em linhas, o aprovado mais recente fica destacado', (await n(page, '#treinos-lista-tabela .hx-tr')) === 2 && (await n(page, '#treinos-lista-tabela .hx-tr.atual')) === 1);
  chk('treinos: colunas Treino, Vigência, Objetivo, Frequência, Status', (await txt(page, '#treinos-lista-view .hx-th')).replace(/\s+/g, '') === 'TreinoVigênciaObjetivoFrequênciaStatus');
  chk('treinos: nome pela data de aprovação', /^Treino de [a-zç]+ de \d{4}$/.test(await txt(page, '#treinos-lista-tabela .hx-tr.atual .hx-main')));
  await page.evaluate(() => treinosAdicionar());
  await page.waitForTimeout(300);
  chk('novo treino: página própria, sem o cartão do aluno e com a linha de identificação', (await vis(page, 'fx-form')) && !(await vis(page, 'fx-ficha')) && (await vis(page, 'fxf-treino')) && /Amanda Silva/.test(await txt(page, '#fxf-id')) && (await txt(page, '#fxf-titulo')) === 'Novo treino');
  chk('novo treino: passos 1 a 4 e botão Próximo na página', (await n(page, '#fxf-treino .steps .step')) === 4 && await vis(page, 'btn-step1-next'));
  await page.evaluate(() => fxFormVoltar());
  await page.waitForTimeout(300);
  chk('novo treino: voltar leva à lista com o rascunho', (await vis(page, 'fx-ficha')) && !(await vis(page, 'fx-form')) && (await n(page, '#treinos-lista-tabela .hx-tr')) === 3 && /Rascunho/.test(await txt(page, '#treinos-lista-tabela')));
  await page.evaluate(() => { const t = students[0].treinos.find(x => x.status === 'aprovado'); treinosAbrirAprovado(t.id); });
  await page.waitForTimeout(400);
  chk('abrir treino aprovado: página própria com o nome do treino no título', (await vis(page, 'fx-form')) && /^Treino de /.test(await txt(page, '#fxf-titulo')));
  await page.evaluate(() => fxFormVoltar());
  await page.waitForTimeout(300);

  // ── trocar de aluno ou de aba com formulário aberto fecha a página ──
  await page.evaluate(() => { switchTab('anamnese'); anamNova(); });
  await page.evaluate(() => switchTabForcado('info'));
  chk('trocar de aba com formulário aberto: a ficha volta e o formulário fecha', (await vis(page, 'fx-ficha')) && !(await vis(page, 'fx-form')) && await page.evaluate(() => _fxFormModo === null));

  // ── 4 layouts: sem rolagem horizontal, formulário e listas cabem ──
  const sizes = [['notebook', 1440, 900], ['ultrawide', 2560, 1300], ['tablet', 834, 1112], ['celular', 390, 844]];
  for (const [nome, w, h] of sizes) {
    await page.setViewportSize({ width: w, height: h });
    await page.evaluate(() => { switchTabForcado('anamnese'); switchSubtab('anamnese-hist'); });
    await page.waitForTimeout(200);
    const lista = async (rot, fn) => {
      await page.evaluate(fn); await page.waitForTimeout(250);
      chk(`${nome}: ${rot} sem rolagem horizontal`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      chk(`${nome}: ${rot} sem conteúdo cortado nas linhas`, await page.evaluate(() => [...document.querySelectorAll('.hx-tr')].filter(r => r.offsetParent).every(r => r.scrollWidth <= r.clientWidth + 1)));
    };
    await lista('lista de anamnese', () => { switchSubtab('anamnese-hist'); });
    await lista('lista de antropometria', () => { switchSubtab('anamnese-antro'); });
    await lista('lista de treinos', () => { switchTab('prescricao'); });
    for (const [rot, fn, id] of [['formulário de anamnese', () => { switchTab('anamnese'); switchSubtab('anamnese-hist'); anamNova(); }, 'fxf-anamnese'],
                                 ['formulário de avaliação', () => { anamCancelar(); switchSubtab('anamnese-antro'); antroNovaAvaliacao(); }, 'fxf-antro'],
                                 ['formulário de treino', () => { antroCancelar(); switchTab('prescricao'); treinosAdicionar(); }, 'fxf-treino']]) {
      await page.evaluate(fn); await page.waitForTimeout(300);
      chk(`${nome}: ${rot} aberto`, await vis(page, id));
      chk(`${nome}: ${rot} sem rolagem horizontal`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.getElementById('fx-form').scrollWidth <= document.getElementById('fx-form').clientWidth + 1));
      chk(`${nome}: ${rot} com a linha de identificação visível`, await page.evaluate(() => { const r = document.getElementById('fxf-id').getBoundingClientRect(); return r.width > 150 && r.height > 20 && r.height < 70 && r.right <= innerWidth + 1; }));
    }
    await page.evaluate(() => { fxFormVoltar(); });
    await page.waitForTimeout(250);
    if (await vis(page, 'fx-form')) await page.evaluate(() => { _formDirty = false; fxFormFechar(); });
  }
  await page.setViewportSize({ width: 1440, height: 900 });

  chk('sem erro de JS na página', errs.length === 0, errs.join(' | '));
  console.log('PASS ' + ok.length + '  FAIL ' + bad.length);
  bad.forEach(b => console.log('FAIL ' + b));
  await browser.close();
  process.exit(bad.length ? 1 : 0);
})();
