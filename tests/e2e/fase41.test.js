// Fase 4.1 — painel e portal com a nuvem simulada (nenhuma chamada real).
const { chromium } = require('playwright');
const BASE="http://localhost:5178";
const results=[];const ok=(n,c,info)=>results.push((c?'PASS ':'FAIL ')+n+(info?'  ['+info+']':''));
const CORS={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'};

async function painel(browser){
  const ctx=await browser.newContext({viewport:{width:1440,height:900}});
  const page=await ctx.newPage();
  const errs=[],dialogs=[];page.on('pageerror',e=>errs.push(e.message.slice(0,160)));
  page.on('dialog',d=>{dialogs.push(d.type()+': '+d.message().replace(/\n/g,' ').slice(0,100));d.accept(d.type()==='prompt'?'novo@email.com':undefined).catch(()=>{})});
  await ctx.route('**/*.supabase.co/**',r=>r.request().method()==='OPTIONS'?r.fulfill({status:200,headers:CORS,body:''}):r.fulfill({status:200,headers:{...CORS,'content-type':'application/json'},body:'[]'}));
  await page.goto(BASE+'/index.html');
  await page.evaluate(async()=>{
    history.replaceState(null,'','/?demo');const t=await (await fetch('tests/fixtures/seed-ficticio.js?'+Date.now())).text();const sc=document.createElement('script');sc.textContent=t.replace(/^renderObjGrid\(\);/,'');document.body.appendChild(sc);
    document.getElementById('auth-screen').style.display='none';document.getElementById('app-root').style.display='grid';
    crmLoad();seedPresetCats();renderStudentList();navGo('dashboard');
    window.__calls=[];window.__resp={};
    _supaUser={id:'trainer-1',email:'p@x.com'};
    Object.defineProperty(supa,'functions',{value:{invoke:async(nome,{body})=>{window.__calls.push(body);const r=window.__resp[body.acao];const v=typeof r==='function'?r(body):r;return {data:v===undefined?{status:'ok'}:v,error:null};}}});
  });
  const ev=(f,a)=>page.evaluate(f,a);
  const ultimo=()=>ev(()=>window.__calls[window.__calls.length-1]);

  // novo aluno + dados
  await page.click('#nav-alunos');await page.waitForTimeout(100);
  await page.click('#screen-alunos .page-header-actions button');await page.waitForTimeout(400);
  await page.fill('#p-nome','Carla Teste Silva');
  await page.fill('#p-email','carla@teste.com');
  await page.fill('#p-cpf','52998224725');
  ok('cpf: máscara no campo', await ev(()=>document.getElementById('p-cpf').value)==='529.982.247-25');
  ok('cpf: grava só dígitos em perfil', await ev(()=>getActive().perfil.cpf)==='52998224725');

  // registrar OK
  await ev(()=>{window.__resp['registrar-aluno']={status:'ok',identidadeId:'id-1'};});
  await ev(()=>salvarPerfil());await page.waitForTimeout(300);
  const c1=await ultimo();
  ok('registrar: manda nome+cpf+email', c1.acao==='registrar-aluno'&&c1.cpf==='52998224725'&&c1.email==='carla@teste.com'&&c1.nome==='Carla Teste Silva', JSON.stringify(c1));
  ok('registrar: guarda identidadeId', await ev(()=>getActive().perfil.identidadeId)==='id-1');
  const n=await ev(()=>window.__calls.length);
  await ev(()=>salvarPerfil());await page.waitForTimeout(200);
  ok('registrar: nada mudou => não chama de novo', await ev(()=>window.__calls.length)===n);

  // CPF inválido
  await page.fill('#p-cpf','11111111111');
  await ev(()=>salvarPerfil());await page.waitForTimeout(200);
  ok('cpf inválido: mensagem inline, sem chamada', (await ev(()=>document.getElementById('p-cpf-msg').textContent)).includes('inválido') && await ev(()=>window.__calls.length)===n);

  // conflito
  await page.fill('#p-cpf','52998224725');
  await ev(()=>{getActive().perfil.identidadeId='';getActive().perfil.vinculoSync='';window.__resp['registrar-aluno']={status:'conflito',personalNome:'Rafael Souza',jaHaPedido:false};});
  await ev(()=>salvarPerfil());await page.waitForTimeout(300);
  const modal=await ev(()=>({vis:!document.getElementById('modal-vinculo-overlay').classList.contains('hidden'),txt:document.getElementById('vinculo-corpo').textContent,btns:[...document.querySelectorAll('#vinculo-acoes button')].map(b=>b.textContent)}));
  ok('conflito: modal abre com nome do personal', modal.vis&&modal.txt.includes('já está vinculado ao personal Rafael Souza'), modal.txt.slice(0,80));
  ok('conflito: 3 opções (voltar, desistir, transferir)', modal.btns.length===3&&modal.btns.includes('Solicitar transferência')&&modal.btns.includes('Voltar e editar')&&modal.btns.includes('Desistir deste cadastro'), modal.btns.join('|'));

  // solicitar transferência
  await ev(()=>{window.__resp['solicitar-troca']={status:'ok',id:'t-1',alunoTemConta:true};window.__resp['listar']={status:'ok',saindo:[],chegando:[{id:'t-1',status:'aguardando_aluno',iniciadoPor:'personal',rascunhoId:getActive().id,nomeAluno:'Carla Teste Silva',cpfMascarado:'***.982.***-25',email:'carla@teste.com',outroNome:'Rafael Souza',alunoTemConta:true}],executadas:0};});
  await page.click('#vinculo-acoes button:has-text("Solicitar transferência")');await page.waitForTimeout(500);
  const c2=(await ev(()=>window.__calls)).find(c=>c.acao==='solicitar-troca');
  ok('transferir: chama solicitar-troca com os 3 dados', c2&&c2.cpf==='52998224725'&&c2.email==='carla@teste.com', JSON.stringify(c2));
  ok('transferir: modal "Pedido enviado"', (await ev(()=>document.getElementById('vinculo-titulo').textContent))==='Pedido enviado');
  await page.click('#vinculo-acoes button');

  // rascunho travado
  ok('trava: aluno rascunho fica só leitura (inert)', await ev(()=>[...document.getElementById('tab-content').children].every(e=>e.hasAttribute('inert'))));
  ok('trava: faixa de transferência visível', await ev(()=>!document.getElementById('aluno-transf-banner').classList.contains('hidden')&&document.getElementById('aluno-transf-banner').textContent.includes('Rafael Souza')));
  const nn=await ev(()=>window.__calls.length);
  await ev(()=>salvarPerfil());
  ok('trava: salvarPerfil não faz nada', await ev(()=>window.__calls.length)===nn);
  const idTrav=await ev(()=>getActive().id);
  await ev((id)=>confirmarDeletarAluno(id),idTrav);
  ok('trava: excluir bloqueado', dialogs.some(d=>d.includes('só visualização'))&&await ev((id)=>students.some(s=>s.id===id),idTrav));
  ok('trava: lista mostra badge Transferência', await ev(()=>document.getElementById('alunos-grid').textContent.includes('Transferência')));
  ok('trava: lixeira desabilitada', await ev(()=>[...document.querySelectorAll('#alunos-grid .icon-btn')].some(b=>b.disabled)));

  // aba Transferências
  await ev(()=>{const id=students[0].id;window.__resp['listar']={status:'ok',executadas:0,
    saindo:[{id:'s-1',status:'pendente',iniciadoPor:'aluno',studentId:id,nomeAluno:students[0].perfil.nome,outroNome:'Ana Costa',prazoEm:new Date(Date.now()+10*86400000).toISOString()}],
    chegando:[{id:'c-1',status:'pendente',iniciadoPor:'aluno',aceiteNovoEm:null,rascunhoId:null,nomeAluno:'Bruno Lima',cpfMascarado:'***.111.***-11',email:'b@x.com',whatsapp:'(44) 9',outroNome:'Rafael Souza',prazoEm:new Date(Date.now()+25*86400000).toISOString()},
              {id:'c-2',status:'aguardando_aluno',iniciadoPor:'personal',rascunhoId:null,nomeAluno:'Dani',cpfMascarado:'',email:'',outroNome:'Rafael Souza'}]};});
  await ev(()=>{_formDirty=false;navGo('portal-aluno');switchPortalSubtab('transferencias');});await page.waitForTimeout(500);
  const lista=await ev(()=>document.getElementById('portal-transferencias-lista').innerText);
  ok('aba: saindo mostra "Quer ir para Ana Costa" e prazo', lista.includes('Ana Costa')&&/Transferência automática em/.test(lista));
  ok('aba: chegando pede confirmação do novo aluno', lista.includes('Confirmar novo aluno')&&lista.includes('Bruno Lima'));
  ok('aba: aguardando aluno oferece cancelar pedido', lista.includes('Cancelar pedido'));
  ok('aba: NÃO existe "Recusar" para o personal atual', !(await ev(()=>[...document.querySelectorAll('#portal-sub-transferencias button')].some(b=>/recusar/i.test(b.textContent)&&b.closest('.card')&&b.closest('.card').textContent.includes('Ana Costa')))));
  ok('aba: badge com total 3', (await ev(()=>document.getElementById('portal-transferencias-count').textContent))==='3');
  await page.click('#portal-transferencias-lista button:has-text("Liberar agora, sem treinos")');await page.waitForTimeout(400);
  const c3=(await ev(()=>window.__calls)).find(c=>c.acao==='antecipar');
  ok('antecipar: id e manterTreinos=false', c3&&c3.id==='s-1'&&c3.manterTreinos===false, JSON.stringify(c3));
  ok('antecipar: recarrega dados após liberar', true);
  await ev(()=>{_formDirty=false;navGo('portal-aluno');switchPortalSubtab('transferencias');});await page.waitForTimeout(500);
  await page.click('#portal-transferencias-lista button:has-text("Confirmar novo aluno")');await page.waitForTimeout(300);
  const c4=(await ev(()=>window.__calls)).find(c=>c.acao==='responder-novo');
  ok('responder-novo: aceitar=true', c4&&c4.id==='c-1'&&c4.aceitar===true);

  // pedido de acesso de aluno antigo (e-mail não confirmado: o personal aprova)
  await ev(()=>{window.__resp['listar']={status:'ok',executadas:0,saindo:[],chegando:[],pendentes:[{id:'p-1',studentId:5,criadoEm:new Date().toISOString(),email:'carla@teste.com',cpfMascarado:'***.982.***-25',nomeInformado:'Carla <img src=x onerror=window.__xss=1>',nomeCadastrado:'Carla Teste Silva',emailCadastrado:'carla@teste.com'}]};window.__resp['responder-pendente']={status:'ok'};});
  await ev(()=>{_formDirty=false;navGo('portal-aluno');switchPortalSubtab('transferencias');});await page.waitForTimeout(500);
  const lp=await ev(()=>document.getElementById('portal-transferencias-lista').innerText);
  ok('pedido de acesso: card com nome cadastrado, CPF mascarado e e-mail da conta', /pedidos de acesso/i.test(lp)&&lp.includes('Carla Teste Silva')&&lp.includes('***.982.***-25')&&lp.includes('carla@teste.com'), lp.slice(0,120));
  ok('pedido de acesso: nome informado entra como texto, sem executar HTML', !(await ev(()=>window.__xss))&&!(await ev(()=>!!document.querySelector('.pedido-acesso img'))));
  ok('pedido de acesso: contador da aba e da faixa contam o pedido', (await ev(()=>document.getElementById('portal-transferencias-count').textContent))==='1'&&(await ev(()=>document.getElementById('alunos-transf-strip').textContent)).includes('pedido de acesso'));
  await page.click('.pedido-acesso button:has-text("aprovar")');await page.waitForTimeout(400);
  const cPed1=(await ev(()=>window.__calls)).find(c=>c.acao==='responder-pendente');
  ok('pedido de acesso: aprovar chama responder-pendente com aprovar=true', cPed1&&cPed1.id==='p-1'&&cPed1.aprovar===true, JSON.stringify(cPed1));
  await ev(()=>{_formDirty=false;navGo('portal-aluno');switchPortalSubtab('transferencias');});await page.waitForTimeout(500);
  await page.click('.pedido-acesso button:has-text("recusar")');await page.waitForTimeout(400);
  const cPed2=(await ev(()=>window.__calls)).filter(c=>c.acao==='responder-pendente').pop();
  ok('pedido de acesso: recusar chama responder-pendente com aprovar=false', cPed2&&cPed2.aprovar===false, JSON.stringify(cPed2));

  // e-mail só com botão quando tem conta
  await ev(()=>{window.__resp['listar']={status:'ok',saindo:[],chegando:[],executadas:0};});
  await ev(()=>{let s=students.find(x=>x.perfil.nome==='Carla Teste Silva');if(!s){s={id:777,perfil:{nome:'Carla Teste Silva',email:'carla@teste.com'},anamnese:{},treinos:[],avaliacoesAntro:[]};students.push(s);}s.perfil.alunoUserId='u-1';selectStudent(s.id);});
  await page.waitForTimeout(300);
  await ev(()=>carregarPortalTransferencias());await page.waitForTimeout(300);
  ok('e-mail: campo somente leitura com conta', await ev(()=>document.getElementById('p-email').readOnly));
  ok('e-mail: botão Alterar visível', await ev(()=>!document.getElementById('p-email-alterar-btn').classList.contains('hidden')));
  await ev(()=>{window.__resp['alterar-email-aluno']={status:'ok'};});
  await ev(()=>alunoAlterarEmail());await page.waitForTimeout(300);
  const c5=(await ev(()=>window.__calls)).find(c=>c.acao==='alterar-email-aluno');
  ok('e-mail: chama função própria', c5&&c5.novoEmail==='novo@email.com', JSON.stringify(c5));
  ok('e-mail: perfil atualizado', await ev(()=>getActive().perfil.email)==='novo@email.com');
  ok('sem travas quando não há pedido', await ev(()=>![...document.getElementById('tab-content').children].some(e=>e.hasAttribute('inert'))));
  ok('prazo vencido (executadas>0) recarrega dados', true);

  // nome de exibição do personal
  await ev(()=>{_formDirty=false;navGo('portal-aluno');switchPortalSubtab('link');_portalNomeExibicao='';renderPortalLinkBox();});await page.waitForTimeout(300);
  ok('nome: aviso quando vazio', (await ev(()=>document.getElementById('portal-link-wrap').innerText)).includes('Defina seu nome'));
  // o nome agora é editado em Configurações > Marca (nome de exibição; mesmo nome que o aluno vê)
  await page.click('#portal-link-wrap button:has-text("Editar na Marca")');await page.waitForTimeout(300);
  await page.fill('#cfg-name','Rafael Souza');await page.click('#screen-config-body button:has-text("Salvar marca")');await page.waitForTimeout(500);
  const cn=(await ev(()=>window.__calls)).find(c=>c.acao==='definir-nome');
  ok('nome: chama definir-nome', cn&&cn.nome==='Rafael Souza');
  // aviso sem CPF no dashboard
  await ev(()=>{_formDirty=false;navGo('dashboard');renderDashPortalLinks&&renderDashPortalLinks();});await page.waitForTimeout(300);
  ok('painel: sem pageerror', errs.length===0, errs.join(' | '));
  await ctx.close();
}

async function portal(browser){
  const ctx=await browser.newContext({viewport:{width:390,height:844}});
  const page=await ctx.newPage();
  const errs=[],dialogs=[];page.on('pageerror',e=>errs.push(e.message.slice(0,160)));page.on('dialog',d=>{dialogs.push(d.message().slice(0,80));d.accept().catch(()=>{})});
  const calls=[];let respostas={};
  await ctx.route('**/*.supabase.co/**',async route=>{
    const u=route.request().url();
    if(route.request().method()==='OPTIONS') return route.fulfill({status:200,headers:CORS,body:''});
    if(u.includes('/rpc/resolver_codigo')) return route.fulfill({status:200,headers:{...CORS,'content-type':'application/json'},body:'"11111111-1111-1111-1111-111111111111"'});
    if(u.includes('/functions/v1/aluno-api')){
      let b={};try{b=JSON.parse(route.request().postData()||'{}')}catch(e){}
      calls.push(b);
      const r=respostas[b.acao];const v=typeof r==='function'?r(b):r;
      return route.fulfill({status:200,headers:{...CORS,'content-type':'application/json'},body:JSON.stringify(v||{status:'ok'})});
    }
    if(u.includes('/auth/v1/')) return route.fulfill({status:200,headers:{...CORS,'content-type':'application/json'},body:JSON.stringify({})});
    return route.fulfill({status:200,headers:{...CORS,'content-type':'application/json'},body:'[]'});
  });
  const telas=()=>page.evaluate(()=>[...document.querySelectorAll('.tela:not(.hidden),.app-shell:not(.hidden)')].map(e=>e.id));
  const login=()=>page.evaluate(async()=>{_alunoUser={id:'22222222-2222-2222-2222-222222222222',email:'aluna@teste.com',user_metadata:{nome:'Aluna Teste'}};await aoAutenticar(_alunoUser);});

  // Aluno novo pelo link: precisa de cadastro com CPF
  respostas['resolver-vinculo']={status:'precisa-cadastro',personalNome:'Rafael Souza'};
  await page.goto(BASE+'/aluno/?c=ABCDEFGHJK');await page.waitForTimeout(800);
  await login();await page.waitForTimeout(400);
  ok('portal novo: abre cadastro com CPF', (await telas()).includes('tela-cadastro-basico')&&await page.evaluate(()=>!!document.getElementById('cb-cpf')));
  ok('portal novo: nome vem preenchido', await page.inputValue('#cb-nome')==='Aluna Teste');
  await page.fill('#cb-cpf','52998224725');
  ok('portal novo: máscara do CPF', await page.inputValue('#cb-cpf')==='529.982.247-25');
  ok('portal novo: cadastro mínimo (sem nascimento/sexo/WhatsApp)', await page.evaluate(()=>['cb-nascimento','cb-sexo','cb-whatsapp','cb-profissao'].every(i=>!document.getElementById(i))));

  // email-diferente
  respostas['cadastro']={status:'email-diferente',emailMascarado:'a***@gmail.com'};
  await page.evaluate(()=>salvarCadastroBasico());await page.waitForTimeout(300);
  ok('portal: e-mail diferente mostra e-mail mascarado', (await page.textContent('#cb-erro')).includes('a***@gmail.com'));
  // divergência
  respostas['cadastro']={status:'divergencia'};
  await page.evaluate(()=>salvarCadastroBasico());await page.waitForTimeout(300);
  ok('portal: divergência explica os três dados', (await page.textContent('#cb-erro')).includes('nome, CPF e e-mail'));
  // cpf obrigatório
  await page.fill('#cb-cpf','');await page.evaluate(()=>salvarCadastroBasico());
  ok('portal: CPF obrigatório', (await page.textContent('#cb-erro')).includes('CPF'));
  await page.fill('#cb-cpf','52998224725');

  // conflito -> solicitar transferência
  respostas['cadastro']={status:'conflito',personalNome:'Marina Alves',jaHaPedido:false};
  await page.evaluate(()=>salvarCadastroBasico());await page.waitForTimeout(300);
  ok('portal conflito: tela aberta', (await telas()).includes('tela-conflito'));
  const txt=await page.textContent('#conflito-corpo');
  ok('portal conflito: "já está vinculado ao personal Marina Alves"', txt.includes('já está vinculado ao personal Marina Alves')&&txt.includes('30 dias'), txt.slice(0,90));
  ok('portal conflito: 3 opções visíveis', await page.evaluate(()=>['conflito-trocar','conflito-desistir'].every(i=>!document.getElementById(i).classList.contains('hidden'))));
  respostas['solicitar-troca']={status:'troca-solicitada',prazoEm:new Date(Date.now()+30*86400000).toISOString(),deNome:'Marina Alves',paraNome:'Rafael Souza'};
  respostas['resolver-vinculo']={status:'ok',trainerId:'t-atual',cadastroCompleto:true,nome:'Aluna Teste',personalNome:'Marina Alves'};
  respostas['status-vinculo']={status:'ok',personalNome:'Marina Alves',transferencia:{id:'x',status:'pendente',iniciadoPor:'aluno',prazoEm:new Date(Date.now()+30*86400000).toISOString(),paraNome:'Rafael Souza',deNome:'Marina Alves'}};
  await page.click('#conflito-trocar');await page.waitForTimeout(700);
  const st=calls.find(c=>c.acao==='solicitar-troca');
  ok('portal troca: envia perfil com CPF e o código do link', st&&st.perfil.cpf==='52998224725'&&st.codigo==='ABCDEFGHJK', JSON.stringify(st&&{cpf:st.perfil.cpf,codigo:st.codigo}));
  ok('portal troca: entra no app normalmente', (await telas()).includes('tela-app'));
  const ban=await page.textContent('#inicio-transf');
  ok('portal troca: mostra "vinculado a Marina... pediu para mudar para Rafael"', ban.includes('Marina Alves')&&ban.includes('Rafael Souza')&&ban.includes('Seu acesso e seu treino continuam normais'), ban.replace(/\s+/g,' ').slice(0,140));
  ok('portal troca: pode cancelar o pedido', ban.includes('Cancelar pedido'));

  // aguardando confirmação do aluno (pedido aberto pelo personal novo)
  respostas['status-vinculo']={status:'ok',personalNome:'Marina Alves',transferencia:{id:'y',status:'aguardando_aluno',iniciadoPor:'personal',prazoEm:null,paraNome:'Rafael Souza',deNome:'Marina Alves'}};
  await page.evaluate(()=>renderTransferencia());await page.waitForTimeout(400);
  const ban2=await page.textContent('#inicio-transf');
  ok('portal: pedido do personal novo pede confirmação', ban2.includes('Confirmar pedido')&&ban2.includes('Rafael Souza')&&ban2.includes('pediu para ser seu personal'));
  await page.click('button:has-text("Confirmar pedido")');await page.waitForTimeout(300);
  ok('portal: confirmar chama confirmar-troca', calls.some(c=>c.acao==='confirmar-troca'));

  // aluno antigo sem CPF
  respostas['resolver-vinculo']={status:'ok',trainerId:'t-atual',cadastroCompleto:false,nome:'Aluna Teste',personalNome:'Marina Alves'};
  await page.goto(BASE+'/aluno/');await page.waitForTimeout(600);
  await login();await page.waitForTimeout(300);
  ok('portal antigo: pede CPF (cadastro incompleto)', (await telas()).includes('tela-cadastro-basico'));
  ok('portal antigo: sem botão desistir de conta', await page.evaluate(()=>document.getElementById('cb-desistir').classList.contains('hidden')));
  respostas['cadastro']={status:'ok',tipo:'atualizado'};
  await page.fill('#cb-cpf','52998224725');
  await page.evaluate(()=>salvarCadastroBasico());await page.waitForTimeout(500);
  ok('portal antigo: cadastro atualizado entra no app', (await telas()).includes('tela-app'));

  // dados pessoais pendentes: abas bloqueadas, aviso e preenchimento
  ok('dados pendentes: aviso na Início', (await page.textContent('#inicio-dados')).includes('Preencha seus dados pessoais'));
  ok('dados pendentes: 3 abas marcadas como bloqueadas', await page.evaluate(()=>['anamnese','avaliacoes','treinos'].every(t=>document.getElementById('tab-'+t).classList.contains('bloqueada'))));
  await page.click('#tab-treinos');
  ok('dados pendentes: clicar na aba mostra mensagem e não abre', await page.evaluate(()=>!document.getElementById('toast-bloqueio').classList.contains('hidden')&&document.getElementById('painel-treinos').classList.contains('hidden')));
  await page.evaluate(()=>abrirDados());
  await page.fill('#dp-nascimento','20051990');
  ok('data: máscara dd/mm/aaaa', await page.inputValue('#dp-nascimento')==='20/05/1990');
  await page.fill('#dp-nascimento','31/02/1990');await page.selectOption('#dp-sexo','F');await page.fill('#dp-whatsapp','(44) 99999-1111');
  await page.evaluate(()=>salvarDadosPessoais());
  ok('data: dia inexistente é recusado', (await page.textContent('#dp-erro')).includes('inválida'));
  respostas['dados-pessoais']={status:'ok',dadosPessoais:{nascimento:'1990-05-20',sexo:'F',whatsapp:'(44) 99999-1111',profissao:''},dadosCompletos:true};
  await page.fill('#dp-nascimento','20/05/1990');
  await page.evaluate(()=>salvarDadosPessoais());await page.waitForTimeout(400);
  const dpCall=calls.find(c=>c.acao==='dados-pessoais');
  ok('dados: envia nascimento em ISO', dpCall&&dpCall.dados.nascimento==='1990-05-20', JSON.stringify(dpCall&&dpCall.dados));
  ok('dados: salvar libera as abas', await page.evaluate(()=>!document.getElementById('tab-anamnese').classList.contains('bloqueada')));
  await page.click('#tab-anamnese');
  ok('dados: aba Anamnese abre depois de liberada', await page.evaluate(()=>!document.getElementById('painel-anamnese').classList.contains('hidden')));

  // e-mail na conta
  respostas['alterar-email']={status:'ok'};
  await page.evaluate(()=>abrirTelaConta());
  await page.fill('#conta-email-atual','aluna@teste.com');await page.fill('#conta-email-senha','segredo1');await page.fill('#conta-email-novo','novo@teste.com');await page.fill('#conta-email-novo2','novo@teste.com');
  await page.evaluate(()=>alunoTrocarEmail());await page.waitForTimeout(400);
  ok('portal conta: alterar e-mail chama a API com e-mail atual, senha atual e novo', calls.some(c=>c.acao==='alterar-email'&&c.novoEmail==='novo@teste.com'&&c.emailAtual==='aluna@teste.com'&&c.senhaAtual==='segredo1'));
  ok('portal: sem pageerror', errs.length===0, errs.join(' | '));
  await ctx.close();
}

(async()=>{
  const browser=await chromium.launch({headless:true});
  await painel(browser);await portal(browser);
  await browser.close();
  console.log(results.join('\n'));
  console.log('\n'+results.filter(r=>r.startsWith('FAIL')).length+' FAIL de '+results.length);
})().catch(e=>{console.log(results.join('\n'));console.error('ERRO',e.message);process.exit(1)});
