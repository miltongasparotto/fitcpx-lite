// ══════════════════════════════════════════════════════════════════════════
// IDS + CHAVES DE ARMAZENAMENTO LOCAL
// ══════════════════════════════════════════════════════════════════════════
// Este arquivo TEM que ser o primeiro script do projeto: biblioteca-exercicios.js
// chama loadLibs() no topo (fora de função), e loadLibs já precisa de lsKey().
//
// Dois problemas resolvidos aqui:
//
// 1) ID DUPLICADO — todo id do sistema era Date.now() puro (aluno, avaliação,
//    treino, local, template, divisão, periodização). Dois cadastros dentro do
//    mesmo milissegundo nasciam com o MESMO id, e o `.filter(x=>x.id!==id)` das
//    exclusões apagava os dois de uma vez. novoId() é monotônico: nunca devolve
//    um número que já devolveu nesta sessão.
//
// 2) LOCALSTORAGE COMPARTILHADO ENTRE CONTAS — as chaves eram fixas
//    ('acm-students', 'fitcpx_libs'), então duas contas abertas no mesmo
//    navegador dividiam o mesmo balde: os alunos da conta A ficavam visíveis
//    (e eram enviados) para a conta B. Agora toda chave é sufixada com o id do
//    usuário logado.

// ── IDs ────────────────────────────────────────────────────────────────────
let _ultimoId = 0;

// Numérico de propósito: o resto do projeto compara id com ===, usa
// parseInt(id_val) nos modais e faz aritmética (id-2000 em treinos-store.js).
// Trocar por UUID quebraria tudo isso.
function novoId(){
  let t = Date.now();
  if(t <= _ultimoId) t = _ultimoId + 1;
  _ultimoId = t;
  return t;
}

// Semeia o contador com o maior id já existente nos dados carregados. Sem isso,
// reabrir o app depois da meia-noite do relógio (ou com o horário do sistema
// atrasado) poderia gerar um id menor que um já usado.
function semearIds(...colecoes){
  colecoes.flat().forEach(item=>{
    const n = Number(item?.id);
    if(Number.isFinite(n) && n > _ultimoId) _ultimoId = n;
  });
}

// Varredura profunda: pega TODO id/arqId/idOriginal em qualquer nível do
// objeto (treinos e avaliações dentro de aluno, dados dentro do envelope do
// Arquivo etc.). semearIds() sozinho só olha o topo de cada coleção — os ids
// aninhados (ex: s.treinos[].id) também saem de novoId() e precisam contar
// aqui, senão a proteção contra id repetido fica furada exatamente onde mais
// se cria id (treinos e avaliações). (2026-09-17)
function coletarIdsProfundo(raiz){
  const achados = [];
  const CHAVES_ID = ['id','arqId','idOriginal'];
  (function andar(v){
    if(Array.isArray(v)){ v.forEach(andar); return; }
    if(v && typeof v==='object'){
      CHAVES_ID.forEach(k=>{ if(k in v) achados.push({id:v[k]}); });
      Object.values(v).forEach(andar);
    }
  })(raiz);
  return achados;
}

// ── Chaves de localStorage por usuário ─────────────────────────────────────
let _lsUserId = null;

function setLsUser(uid){ _lsUserId = uid || null; }
function getLsUser(){ return _lsUserId; }

function lsKey(base){ return base + '::' + (_lsUserId || 'anon'); }

function lsGet(base, fallback){
  try{
    const raw = localStorage.getItem(lsKey(base));
    return raw ? JSON.parse(raw) : fallback;
  }catch(e){ return fallback; }
}

function lsSet(base, valor){
  try{ localStorage.setItem(lsKey(base), JSON.stringify(valor)); }catch(e){}
}

function lsDel(base){
  try{ localStorage.removeItem(lsKey(base)); }catch(e){}
}

// Limpa TODO o estado local do usuário que está saindo — sem isso o logout
// deixava students/LIBS em memória e no localStorage, e a próxima conta a
// logar no mesmo navegador enxergava (e subia para a nuvem) os alunos da
// conta anterior. Só remove chaves do usuário atual; não toca em outras contas.
function limparLocalDoUsuario(){
  ['acm-students','fitcpx_libs','fitcpx_arquivo','fitcpx_log','crm'].forEach(lsDel);
  try{
    const sufixo = '::' + (_lsUserId || 'anon');
    const remover = [];
    for(let i=0; i<localStorage.length; i++){
      const k = localStorage.key(i);
      if(k && k.startsWith('acm-draft-') && k.endsWith(sufixo)) remover.push(k);
    }
    remover.forEach(k=>localStorage.removeItem(k));
  }catch(e){}
}

// ── Dados legados (chaves antigas, sem sufixo de usuário) ──────────────────
// Nada é apagado: o que foi gravado antes deste commit continua no navegador.
// Só não é mais carregado automaticamente — era exatamente esse carregamento
// automático que vazava aluno de uma conta para a outra. A tela Arquivadas
// oferece a importação manual para a conta que o personal escolher.
function temDadosLegados(){
  try{
    const raw = localStorage.getItem('acm-students');
    if(!raw) return false;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) && arr.length > 0;
  }catch(e){ return false; }
}

function lerDadosLegados(){
  try{
    return {
      students: JSON.parse(localStorage.getItem('acm-students')  || '[]'),
      libs:     JSON.parse(localStorage.getItem('fitcpx_libs')   || 'null'),
    };
  }catch(e){ return { students: [], libs: null }; }
}
