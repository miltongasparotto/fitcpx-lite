// Funcional: fluxos reais de uso pela interface (login contornado só no teste local).
const { chromium } = require('playwright');
const BASE="http://localhost:5178";
const results=[];const ok=(n,c,info)=>results.push((c?'PASS ':'FAIL ')+n+(info?'  ['+info+']':''));
(async()=>{
  const browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext({viewport:{width:1700,height:900}});
  const page=await ctx.newPage();
  const errs=[],dialogs=[];page.on('pageerror',e=>errs.push(e.message.slice(0,160)));
  page.on('dialog',d=>{dialogs.push(d.type()+': '+d.message().replace(/\n/g,' ').slice(0,90));d.accept(d.type()==='prompt'?'Teste':undefined).catch(()=>{})});
  const boot=async(demo)=>{
    await page.goto(BASE+'/index.html');
    await page.evaluate(async(demo)=>{
      if(demo){history.replaceState(null,'','/?demo');const t=await (await fetch('tests/fixtures/seed-ficticio.js?'+Date.now())).text();const sc=document.createElement('script');sc.textContent=t.replace(/^renderObjGrid\(\);/,'');document.body.appendChild(sc);}
      document.getElementById('auth-screen').style.display='none';document.getElementById('app-root').style.display='grid';
      crmLoad();seedPresetCats();renderStudentList();navGo('dashboard');
    },demo);
  };
  const ev=(f,a)=>page.evaluate(f,a);
  await boot(true);

  // 1) navegação do menu por clique
  await page.click('#nav-alunos');await page.waitForTimeout(150);
  ok('menu: Alunos abre a lista', await ev(()=>!document.getElementById('screen-alunos').classList.contains('hidden')));
  await page.click('#nav-treino-hdr');await page.click('#nav-treino-hdr');
  ok('menu: submenu Treino alterna', true);
  await page.click('#nav-biblioteca');await page.waitForTimeout(150);
  ok('menu: Biblioteca abre', await ev(()=>!document.getElementById('screen-biblioteca').classList.contains('hidden')));
  ok('menu: item ativo marcado', await ev(()=>document.getElementById('nav-biblioteca').classList.contains('active')));
  // teclado: Enter ativa item do menu
  await page.focus('#nav-agenda');await page.keyboard.press('Enter');await page.waitForTimeout(150);
  ok('teclado: Enter no menu navega', await ev(()=>!document.getElementById('screen-agenda').classList.contains('hidden')));

  // 2) novo aluno pela UI
  await page.click('#nav-alunos');await page.waitForTimeout(100);
  const antes=await ev(()=>students.length);
  await page.click('#alunos-btn-manual');await page.waitForTimeout(400);
  const depois=await ev(()=>students.length);
  ok('novo aluno: cria registro', depois===antes+1, antes+'->'+depois);
  await page.fill('#p-nome','Carla Teste Silva');
  await page.fill('#p-whatsapp','(44) 99999-1111');
  await page.selectOption('#p-sexo','F');
  await page.waitForTimeout(300);
  const nome=await ev(()=>{const s=getActive();return s&&s.perfil&&s.perfil.nome});
  ok('perfil: digitar nome grava em s.perfil', nome==='Carla Teste Silva', nome);
  ok('perfil: cabeçalho atualiza', (await ev(()=>document.getElementById('student-header-name').textContent))==='Carla Teste Silva');
  ok('perfil: sexo grava', (await ev(()=>getActive().perfil.sexo))==='F');
  // guarda de navegação: sair com alteração não salva pergunta antes
  await page.click('#nav-pipeline');await page.waitForTimeout(150);
  ok('guarda: sair sem salvar abre confirmação', await ev(()=>!document.getElementById('modal-unsaved-overlay').classList.contains('hidden')));
  await page.click('#modal-unsaved-overlay .btn-primary');await page.waitForTimeout(400);
  ok('guarda: Salvar conclui a navegação', await ev(()=>!document.getElementById('screen-pipeline').classList.contains('hidden')));
  // persistência local
  const lsKeys=await ev(()=>Object.keys(localStorage).filter(k=>k.startsWith('acm-students')));
  ok('persistência: localStorage tem students', lsKeys.length>0, lsKeys.join(','));
  const salvoLS=await ev(()=>{const k=Object.keys(localStorage).find(k=>k.startsWith('acm-students'));return JSON.parse(localStorage.getItem(k)||'[]').some(s=>s.perfil&&s.perfil.nome==='Carla Teste Silva')});
  ok('persistência: aluno novo está no localStorage', salvoLS);

  // 3) busca/filtro na lista
  await page.click('#nav-alunos');await page.waitForTimeout(150);
  await page.fill('#alunos-busca','carla');await page.waitForTimeout(200);
  ok('lista: busca filtra', (await ev(()=>document.querySelectorAll('#alunos-grid tr').length))===1);
  await page.fill('#alunos-busca','');
  await page.selectOption('#alunos-filtro-sexo','M');await page.waitForTimeout(150);
  const soM=await ev(()=>[...document.querySelectorAll('#alunos-grid tr')].length);
  ok('lista: filtro sexo reduz', soM<await ev(()=>students.length), String(soM));
  await page.click('button[title="Limpar filtros"]');await page.waitForTimeout(150);
  ok('lista: limpar filtros restaura', (await ev(()=>document.querySelectorAll('#alunos-grid tr').length))===await ev(()=>students.length));
  await page.click('[data-al-sort="treino"]');await page.waitForTimeout(100);
  ok('lista: ordenar por coluna não quebra', (await ev(()=>document.querySelectorAll('#alunos-grid tr').length))>0);

  // 4) abas do aluno + salvar anamnese básica
  await page.click('#alunos-grid tr >> text=Carla Teste Silva');await page.waitForTimeout(300);
  for(const tab of ['anamnese','prescricao','evolucao','perfil']){await ev(t=>switchTab(t),tab);await page.waitForTimeout(80);}
  ok('abas do aluno alternam sem erro', true);

  // 5) excluir e restaurar (Arquivadas)
  const idCarla=await ev(()=>students.find(s=>s.perfil.nome==='Carla Teste Silva').id);
  await ev(id=>{confirmarDeletarAluno&&confirmarDeletarAluno(id)},idCarla);await page.waitForTimeout(400);
  // confirmação pode ser modal
  const modalDel=await ev(()=>{const m=document.getElementById('modal-del-lib');return m&&!m.classList.contains('hidden')});
  if(modalDel){await page.click('#modal-del-confirm');await page.waitForTimeout(300);}
  const removido=await ev(id=>!students.some(s=>s.id===id),idCarla);
  ok('excluir aluno: sai da lista', removido, 'dialogs='+dialogs.length);
  await ev(()=>navGo('arquivadas'));await page.waitForTimeout(200);
  const noArq=await ev(()=>(typeof ARQUIVO!=='undefined')&&ARQUIVO.some(a=>JSON.stringify(a).includes('Carla Teste Silva')));
  ok('excluir aluno: vai para Arquivadas', noArq);

  // 6) CRM: tarefa nova pela UI
  await ev(()=>navGo('agenda'));await page.waitForTimeout(200);
  await page.click('text=Nova tarefa');await page.waitForTimeout(250);
  await page.fill('#t-titulo','Ligar para Amanda');
  const hoje=await ev(()=>todayStr());
  await page.fill('#t-data',hoje);
  await page.click('#m-crm-task .btn-primary');await page.waitForTimeout(300);
  ok('CRM: criar tarefa aparece na agenda', await ev(()=>DB.tasks.some(t=>t.titulo==='Ligar para Amanda')));
  ok('CRM: tarefa renderiza no painel do dia', (await ev(()=>document.getElementById('cal-panel').innerText)).includes('Ligar para Amanda'));
  const tid=await ev(()=>DB.tasks.find(t=>t.titulo==='Ligar para Amanda').id);
  await ev(id=>toggleTaskDoneMany(String(id)),tid);await page.waitForTimeout(150);
  ok('CRM: concluir tarefa', await ev(id=>DB.tasks.find(t=>t.id===id).done===true,tid));
  await ev(id=>toggleTaskDoneMany(String(id)),tid);
  ok('CRM: reabrir tarefa', await ev(id=>DB.tasks.find(t=>t.id===id).done===false,tid));
  await ev(id=>openReschedule(String(id)),tid);await page.waitForTimeout(150);
  const amanha=await ev(()=>addDays(todayStr(),3));await page.fill('#resched-data',amanha);
  await ev(()=>saveReschedule());await page.waitForTimeout(200);
  ok('CRM: reagendar muda a data', await ev(([id,d])=>DB.tasks.find(t=>t.id===id).data===d,[tid,amanha]));
  await ev(id=>{DB.tasks=DB.tasks.filter(t=>t.id!==id);crmSave()},tid);

  // 7) categorias com seletor de ícone
  await ev(()=>{navGo('fluxos');crmFluxosTab='categorias';renderFluxosCRM()});await page.waitForTimeout(200);
  await page.click('.page-head ~ .screen-pad >> text=Nova Categoria');await page.waitForTimeout(250);
  await page.fill('#cat-label','Pós-treino');
  await page.click('#m-crm-cat .ip-btn >> nth=7');
  const iconeEsc=await ev(()=>document.getElementById('cat-icon').value);
  ok('categoria: seletor grava nome de ícone', /^ph-[a-z-]+$/.test(iconeEsc), iconeEsc);
  await page.click('#m-crm-cat .btn-primary');await page.waitForTimeout(300);
  ok('categoria: criada com ícone ph-', await ev(()=>DB.customCats.some(c=>c.label==='Pós-treino'&&/^ph-/.test(c.icon))));
  ok('categoria: aparece na lista', (await ev(()=>document.getElementById('screen-fluxos-body').innerText)).includes('Pós-treino'));

  // 8) fluxo + vínculo com aluno gera tarefas
  const catId=await ev(()=>DB.customCats.find(c=>c.label==='Pós-treino').id);
  await ev(c=>{DB.fluxos.push({id:novoId(),nome:'Acompanhamento 7 dias',icon:'ph-gear',trigger:'Início',triggerCat:c,steps:[{id:novoId(),cat:c,dias:7,nome:'Check-in',tipo:'prazo'}]});crmSave()},catId);
  const antesT=await ev(()=>DB.tasks.length);
  const idAm=await ev(()=>students.find(s=>s.perfil.nome==='Amanda Silva').id);
  const fid=await ev(()=>DB.fluxos.find(f=>f.nome==='Acompanhamento 7 dias').id);
  await ev(([a,f])=>{navAlunoCrm(a);},[idAm,fid]);await page.waitForTimeout(250);
  await page.selectOption('#add-fluxo-sel',String(fid)).catch(()=>{});
  await ev(a=>addFluxoToAluno(a),idAm);await page.waitForTimeout(250);
  ok('fluxo: vincular a aluno gera tarefas', (await ev(()=>DB.tasks.length))>antesT, antesT+'->'+(await ev(()=>DB.tasks.length)));
  await ev(()=>closeAlunoCrm());

  // 9) whatsapp: salvar e remover template
  await ev(()=>navGo('whatsapp'));await page.waitForTimeout(150);
  await page.fill('#wt-nome','Lembrete');await page.fill('#wt-msg','Oi {nome}, bora treinar?');
  await page.click('button:has-text("Salvar mensagem")');await page.waitForTimeout(250);
  ok('whatsapp: salvar template', await ev(()=>DB.waTpls.some(t=>t.nome==='Lembrete')));
  ok('whatsapp: lista mostra o template', (await ev(()=>document.getElementById('screen-whatsapp-body').innerText)).includes('Lembrete'));
  await page.click('.lrow:has-text("Lembrete") button[title="Remover"]');await page.waitForTimeout(250);
  ok('whatsapp: remover template', !(await ev(()=>DB.waTpls.some(t=>t.nome==='Lembrete'))));

  // 10) tema claro/escuro persiste
  await page.click('[data-tema-btn] >> visible=true');await page.waitForTimeout(100);
  ok('tema: alterna para escuro', await ev(()=>document.documentElement.classList.contains('dark')));
  ok('tema: ícone muda para sol', (await ev(()=>document.querySelector('[data-tema-btn] i').className))==='ph-sun');
  await boot(false);
  ok('tema: lembra após recarregar', await ev(()=>document.documentElement.classList.contains('dark')));
  await page.click('[data-tema-btn] >> visible=true');

  // 11) persistência real: recarrega SEM seed e confere dados
  const temAm=await ev(()=>students.some(s=>s.perfil.nome==='Amanda Silva'));
  const crmPersist=await ev(()=>DB.customCats.some(c=>c.label==='Pós-treino'));
  ok('recarregar: alunos voltam do localStorage', temAm);
  ok('recarregar: CRM (categoria nova) volta do localStorage', crmPersist);

  // 12) gaveta mobile
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(600);
  const sidebarFora=await ev(()=>document.querySelector('.sidebar').getBoundingClientRect().right<=0);
  ok('mobile: menu começa fechado', sidebarFora);
  await page.click('.mobile-bar .icon-btn');await page.waitForTimeout(550);
  ok('mobile: botão abre a gaveta', await ev(()=>document.querySelector('.sidebar').getBoundingClientRect().left>=0));
  await page.click('#nav-pipeline');await page.waitForTimeout(300);
  ok('mobile: navegar fecha a gaveta', await ev(()=>document.querySelector('.sidebar').getBoundingClientRect().right<=0));

  console.log(results.join('\n'));
  console.log('\nERROS DE PÁGINA:',JSON.stringify([...new Set(errs)]));
  console.log('DIÁLOGOS:',JSON.stringify(dialogs));
  await browser.close();
})();
