// Portal com Supabase simulado: captura o que o app manda pra aluno-api e passa pelos saneadores do servidor.
const { chromium } = require('playwright');
const BASE="http://localhost:5178";
const bodies=[];
const limpaTexto=(v,max=200)=>typeof v!=='string'?'':v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/<(?=[a-zA-Z\/!?])/g,'‹').trim().slice(0,max);
const limpaNumero=v=>{const s=typeof v==='number'?String(v):(typeof v==='string'?v.trim():'');return /^\d{1,4}([.,]\d{1,2})?$/.test(s)?s:''};
(async()=>{
  const browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext({viewport:{width:390,height:844}});
  const page=await ctx.newPage();
  const errs=[];page.on('pageerror',e=>errs.push(e.message.slice(0,150)));page.on('dialog',d=>d.accept().catch(()=>{}));
  await ctx.route('**/*.supabase.co/**',async route=>{
    const u=route.request().url();
    const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'};
    if(route.request().method()==='OPTIONS') return route.fulfill({status:200,headers:cors,body:''});
    if(u.includes('/rpc/resolver_codigo')) return route.fulfill({status:200,headers:{...cors,'content-type':'application/json'},body:'"11111111-1111-1111-1111-111111111111"'});
    if(u.includes('/functions/v1/aluno-api')){
      let b={};try{b=JSON.parse(route.request().postData()||'{}')}catch(e){}
      bodies.push(b);
      return route.fulfill({status:200,headers:{...cors,'content-type':'application/json'},body:JSON.stringify({status:'ok',trainerId:'t',cadastroCompleto:true,nome:'Aluna Teste',avaliacaoId:1})});
    }
    if(u.includes('/auth/v1/')) return route.fulfill({status:200,headers:{...cors,'content-type':'application/json'},body:JSON.stringify({})});
    return route.fulfill({status:200,headers:{...cors,'content-type':'application/json'},body:'[]'});
  });
  await page.goto(BASE+'/aluno/?c=ABCDEFGHJK');await page.waitForTimeout(900);
  const r1=await page.evaluate(()=>({trainer:_alunoTrainerId,codigo:_alunoCodigo,tela:[...document.querySelectorAll('.tela:not(.hidden),.app-shell:not(.hidden)')].map(e=>e.id)}));
  console.log('boot com ?c=',JSON.stringify(r1));
  // simula usuário autenticado e entra no app
  await page.evaluate(async()=>{ _alunoUser={id:'22222222-2222-2222-2222-222222222222',email:'aluna@teste.com',user_metadata:{nome:'Aluna Teste'}}; await aoAutenticar(_alunoUser); });
  await page.waitForTimeout(500);
  console.log('após resolver-vinculo:',await page.evaluate(()=>[...document.querySelectorAll('.tela:not(.hidden),.app-shell:not(.hidden)')].map(e=>e.id)));
  // cadastro básico
  await page.evaluate(()=>{ irPara('tela-cadastro-basico'); });
  await page.fill('#cb-cpf','52998224725');
  await page.evaluate(()=>salvarCadastroBasico());await page.waitForTimeout(400);
  await page.evaluate(()=>{_dadosCompletos=true;aplicarBloqueioAbas();});
  // anamnese
  await page.evaluate(()=>{mostrarTab('anamnese');});await page.waitForTimeout(300);
  await page.evaluate(()=>{
    const set=(id,v)=>{const e=document.getElementById(id);if(e){e.value=v}};
    set('an-tempo','1–2 anos');set('an-consistencia','regular');set('an-frequencia','3x');set('an-duracao','45–60 min');
    set('an-gosta-texto','Gosto de agachamento <script>alert(1)</script>');set('an-evitar-texto','corrida');set('an-obs-clinicas','nenhuma');
    set('an-liberacao','sim');
    const c=document.querySelector('.chk-sintomas[value="Nenhum"]');if(c)c.checked=true;
  });
  await page.evaluate(()=>salvarAnamnese());await page.waitForTimeout(400);
  // avaliação
  await page.evaluate(()=>{mostrarTab('avaliacoes');avalMostrarForm();});await page.waitForTimeout(200);
  await page.evaluate(()=>{const ids=document.querySelectorAll('#painel-avaliacoes input');window.__avIds=[...ids].map(i=>i.id).filter(Boolean)});
  const avIds=await page.evaluate(()=>window.__avIds);console.log('campos avaliação:',avIds.join(','));
  await page.evaluate(()=>{const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v};set('av-peso','71,5');set('av-altura','168');set('av-cintura','80');set('av-quadril','100');});
  await page.evaluate(()=>salvarAvaliacao()).catch(()=>{});await page.waitForTimeout(500);
  console.log('\n== CORPOS ENVIADOS A aluno-api ==');
  for(const b of bodies){
    if(b.acao==='resolver-vinculo') console.log('resolver-vinculo ->',JSON.stringify(b));
    if(b.acao==='cadastro') console.log('cadastro BRUTO ',JSON.stringify(b.perfil),'\n   limpo  ',JSON.stringify({nome:limpaTexto(b.perfil.nome,120),nascimento:/^\d{4}-\d{2}-\d{2}$/.test(b.perfil.nascimento||'')?b.perfil.nascimento:'(PERDIDO:'+b.perfil.nascimento+')',sexo:b.perfil.sexo,whatsapp:(b.perfil.whatsapp||'').replace(/[^\d()+\-\s]/g,''),profissao:limpaTexto(b.perfil.profissao,120)}));
    if(b.acao==='anamnese'){const lim={};for(const [k,v] of Object.entries(b.anamnese)){lim[k]=typeof v==='string'?limpaTexto(v,1500):'(NAO-STRING '+typeof v+')'}console.log('anamnese BRUTA ',JSON.stringify(b.anamnese),'\n   limpa  ',JSON.stringify(lim));}
    if(b.acao==='avaliacao'){const m=b.medidas;const o={};for(const k of ['peso','altura','cintura','quadril','abdomen','ombro','braco_d','braco_e','coxa_d','coxa_e','pant_d','pant_e','gordura','mmuscular','osso'])o[k]=limpaNumero(m[k]);console.log('avaliacao BRUTA ',JSON.stringify(m),'\n   limpa  ',JSON.stringify(o),'\n   fotos',JSON.stringify(b.fotos));}
  }
  console.log('ERRS',errs);
  await browser.close();
})();
