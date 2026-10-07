// XSS armazenado: injeta payloads em todos os textos de aluno/biblioteca/CRM e percorre as telas procurando execução ou elementos injetados.
const { chromium } = require('playwright');
const BASE="http://localhost:5178";
const PAY = `"'><img src=x onerror="window.__x=(window.__x||0)+1"><svg onload="window.__x=(window.__x||0)+1">`;
const PAY2 = `');window.__x=(window.__x||0)+1;//`;
(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await (await browser.newContext({viewport:{width:1440,height:900}})).newPage();
  const errs=[];page.on('pageerror',e=>errs.push(e.message.slice(0,100)));page.on('dialog',d=>d.dismiss().catch(()=>{}));
  await page.goto(BASE+'/index.html',{waitUntil:'load'});
  await page.evaluate(async([PAY,PAY2])=>{
    history.replaceState(null,'','/?demo');
    const t=await (await fetch('tests/fixtures/seed-ficticio.js?'+Date.now())).text();
    const sc=document.createElement('script');sc.textContent=t.replace(/^renderObjGrid\(\);/,'');document.body.appendChild(sc);
    document.getElementById('auth-screen').style.display='none';document.getElementById('app-root').style.display='grid';
    crmLoad();seedPresetCats();
    const SKIP=/^(id|sexo|nivel|status|tipo|cat|objetivo|modelo|data|dataAprovacao|dataCriacao|nascimento|data_avaliacao|alunoUserId|portalStatus|codigo|code|key|chave|local|modId|refId|trigger|triggerCat|icon|icone|cor|color|modalidade|freq|frequencia|duracao|horario|tempo|consistencia|objetivo_ef|objetivo_sec|gestacao|liberacao|g|gp|grupo|musculo|nome_grupo|series|reps|intervalo|intensidade|sintomas|condicoes|lesoes|medicamentos|grupos|equip|equipamentos)$/;
    let n=0;
    const walk=(o,depth)=>{ if(depth>9||!o||typeof o!=='object')return; for(const k of Object.keys(o)){const v=o[k]; if(typeof v==='string'&&v.length<400&&!SKIP.test(k)&&!/^\d+$/.test(v)){ o[k]=v+'"\'><img src=x data-k="'+k+'" onerror="window.__x=(window.__x||0)+1">'; } else walk(v,depth+1);} };
    walk(students,0);walk(DB,0);walk(LIBS,0);
    const cats=getCatDefs(),today=todayStr();
    DB.tasks=students.map((s,i)=>({id:3000+i,alunoId:s.id,titulo:'T'+PAY,cat:cats[i%cats.length].id,tipo:'prazo',data:addDays(today,i-2),hora:'',done:false,doneDate:null,manual:true,obs:PAY}));
    DB.customCats.push({id:900,label:'C'+PAY,icon:'ph-x"><img src=x onerror=window.__x=9>',color:'red;background:url(x)"><img src=x onerror=window.__x=8>'});
    DB.waTpls.push({id:5,nome:'W'+PAY,msg:'m'+PAY,cat:null,fav:false});
    DB.config.studioName='S'+PAY;DB.config.personalName='P'+PAY;
    window.__x=0; renderStudentList();
  },[PAY,PAY2]);
  const hits=[];
  let prev=0;const check=async(name)=>{ const info=await page.evaluate(()=>{const els=[...document.querySelectorAll('img[src="x"],svg[onload]')];return {n:els.length,last:els.slice(-1).map(e=>{let p=e.parentElement,path=[];for(let i=0;i<4&&p;i++){path.push(p.tagName.toLowerCase()+(p.id?'#'+p.id:'')+(p.className&&typeof p.className==='string'?'.'+p.className.split(' ')[0]:''));p=p.parentElement}return path.join('<')})[0]}}); if(info.n>prev){hits.push(name+': +'+(info.n-prev)+' em '+info.last);prev=info.n} const r=await page.evaluate(()=>({x:window.__x||0})); if(r.x) hits.push(name+': EXEC='+r.x); await page.evaluate(()=>{window.__x=0}); };
  const steps=[];
  for(const s of ['dashboard','alunos','locais','biblioteca','distribuicao','periodizacao','exercicios','arquivadas','agenda','pipeline','whatsapp','fluxos','portal-aluno','config']) steps.push(['nav '+s,`navGo('${s}')`]);
  steps.push(['pipeline lista',"navGo('pipeline');crmPipelineView='lista';renderPipelineCRM()"]);
  steps.push(['fluxos tabs',"navGo('fluxos');crmFluxosTab='fluxos';renderFluxosCRM();crmFluxosTab='modalidades';renderFluxosCRM();crmFluxosTab='categorias';renderFluxosCRM()"]);
  for(let i=0;i<5;i++){
    steps.push(['aluno '+i,`selectStudent(students[${i}].id)`]);
    for(const tab of ['perfil','anamnese','prescricao','evolucao']) steps.push([`aluno ${i} ${tab}`,`switchTab('${tab}')`]);
    for(const st of ['anamnese-hist','anamnese-antro','anamnese-meta']) steps.push([`aluno ${i} ${st}`,`switchTab('anamnese');switchSubtab('${st}')`]);
    steps.push([`aluno ${i} crm`,`navAlunoCrm(students[${i}].id)`]);
    steps.push([`aluno ${i} ficha`,`closeAlunoCrm();selectStudent(students[${i}].id);switchTab('prescricao');if(students[${i}].treinos&&students[${i}].treinos[0])treinosAbrirAprovado(students[${i}].treinos[0].id)`]);
  }
  steps.push(['modais',"document.querySelectorAll('.modal-overlay').forEach(e=>e.classList.remove('hidden'))"]);
  for(const [name,code] of steps){ await page.evaluate(code).catch(()=>{}); await page.waitForTimeout(120); await check(name); }
  const keys=await page.evaluate(()=>{const m={};document.querySelectorAll('img[data-k]').forEach(e=>{let p=e.parentElement,pa=[];for(let i=0;i<3&&p;i++){pa.push(p.id||(p.className&&String(p.className).split(' ')[0])||p.tagName);p=p.parentElement}const k=e.dataset.k;(m[k]=m[k]||new Set()).add(pa.join('<'))});return Object.fromEntries(Object.entries(m).map(([k,v])=>[k,[...v].slice(0,2)]))});
  console.log('CHAVES',JSON.stringify(keys));
  console.log('HITS',hits.length);hits.forEach(h=>console.log(' ',h));console.log('ERRS',errs.length,JSON.stringify([...new Set(errs)].slice(0,5)));
  await browser.close();
})();
