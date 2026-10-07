// Login real do painel com Supabase simulado (rotas interceptadas): login -> carga de dados -> painel -> sair.
const { chromium } = require('playwright');
const BASE="http://localhost:5178";
const UID='aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb';
(async()=>{
  const browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext({viewport:{width:1280,height:800}});
  const page=await ctx.newPage();
  const errs=[],reqs=[];page.on('pageerror',e=>errs.push(e.message.slice(0,150)));page.on('dialog',d=>d.accept().catch(()=>{}));
  const user={id:UID,aud:'authenticated',role:'authenticated',email:'personal@teste.com',created_at:'2026-01-01T00:00:00Z',app_metadata:{},user_metadata:{}};
  const session={access_token:'fake.jwt.token',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:'r',user};
  const students=[{id:111,perfil:{nome:'Aluna Cloud',sexo:'F',nascimento:'1992-03-04'},anamnese:{nivel:'Inte'},treinos:[],avaliacoesAntro:[]}];
  await ctx.route('**/*.supabase.co/**',async route=>{
    const rq=route.request(),u=rq.url();const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'};
    reqs.push(rq.method()+' '+u.replace(/https:\/\/[^/]+/,'').slice(0,70));
    if(rq.method()==='OPTIONS') return route.fulfill({status:200,headers:cors,body:''});
    const j=(b,s=200)=>route.fulfill({status:s,headers:{...cors,'content-type':'application/json'},body:JSON.stringify(b)});
    if(u.includes('/auth/v1/token')) return j(session);
    if(u.includes('/auth/v1/user')) return j(user);
    if(u.includes('/auth/v1/logout')) return route.fulfill({status:204,headers:cors,body:''});
    if(u.includes('/rest/v1/app_data')){
      if(rq.method()==='GET') return j([{key:'students',data:students},{key:'libs',data:{}},{key:'arquivo',data:[]},{key:'log',data:[]}]);
      return j([]);
    }
    return j([]);
  });
  await page.goto(BASE+'/index.html');await page.waitForTimeout(600);
  const tela0=await page.evaluate(()=>({auth:getComputedStyle(document.getElementById('auth-screen')).display,app:getComputedStyle(document.getElementById('app-root')).display}));
  console.log('antes do login',JSON.stringify(tela0));
  await page.fill('#auth-email','personal@teste.com');await page.fill('#auth-senha','senha123');
  await page.click('#auth-screen .btn-primary');await page.waitForTimeout(1500);
  const r=await page.evaluate(()=>({auth:getComputedStyle(document.getElementById('auth-screen')).display,app:getComputedStyle(document.getElementById('app-root')).display,email:document.getElementById('supa-user-email').textContent,av:document.getElementById('supa-user-avatar').textContent,alunos:students.map(s=>s.perfil.nome),painel:!document.getElementById('screen-dashboard').classList.contains('hidden'),erroLogin:document.getElementById('auth-erro').textContent}));
  console.log('depois do login',JSON.stringify(r));
  // erro de senha mostra mensagem
  console.log('requisicoes',[...new Set(reqs)].slice(0,12).join(' | '));
  // sair
  await page.evaluate(()=>authSair());await page.waitForTimeout(800);
  const s=await page.evaluate(()=>({auth:getComputedStyle(document.getElementById('auth-screen')).display,app:getComputedStyle(document.getElementById('app-root')).display,alunos:students.length}));
  console.log('depois de sair',JSON.stringify(s));
  console.log('ERRS',errs);
  await browser.close();
})();
