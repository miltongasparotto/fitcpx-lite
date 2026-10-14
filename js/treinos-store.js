// ══════════════════════════════════════════════════════════════════════════
// TREINOS-STORE — camada de dados da lista de treinos (Prescrição)
// ══════════════════════════════════════════════════════════════════════════
// Responsabilidade ÚNICA: CRUD + migração de s.treinos[]. Zero DOM aqui —
// quem renderiza tela é prescricao-motor.js. Separado de propósito pra ser
// fácil de editar/corrigir sem mexer no motor de cálculo de volume/ficha.
//
// Formato de cada item de s.treinos[]:
// { id, status:'rascunho'|'aprovado', objetivo, nivel, frequencia, modelo,
//   obs, treino(texto), dataCriacao, dataAprovacao, _fichaObj,
//   _fromBiblioteca, _bibId, envioFitCpx }
//
// envioFitCpx (Fase 2 — envio ao legado app.fitcpx.com, ver prescricao-motor.js):
// { status:'enviado'|'erro', enviadoEm, obs, tentativas }. Confirmado à mão
// pelo trainer — o POST roda no console do OUTRO domínio, sem callback
// automático pra lite saber se deu certo.
//
// Migração: alunos antigos guardavam só 1 prescrição em s.prescricao (objeto
// único, com _fichaObjAnterior apontando pro ciclo passado). Isso é
// convertido automaticamente pra s.treinos = [anterior, atual] na primeira
// leitura — não perde histórico nenhum aluno já salvo.

const TREINOS_STATUS = { RASCUNHO: 'rascunho', APROVADO: 'aprovado' };

function _treinosHojeBR(){ return new Date().toLocaleDateString('pt-BR'); }

function _treinosParseDataBR(str){
  if(!str || typeof str!=='string') return null;
  const partes = str.split('/').map(Number);
  const d=partes[0], m=partes[1], y=partes[2];
  if(!d||!m||!y) return null;
  return new Date(y, m-1, d);
}

// prazoSemanas aceita tanto '12sem' (valor do select) quanto 12 (número) —
// parseInt('12sem') já resolve pra 12, então não precisa de tratamento extra.
// Configuração do personal (DB.config, js/crm-store.js) com o valor antigo como padrão:
// esta camada continua sem DOM e funciona mesmo se o CRM não estiver carregado.
function _treinosCfg(chave, padrao){ return (typeof cfgNum === 'function') ? cfgNum(chave, padrao) : padrao; }

function _treinosCalcularVencimento(dataAprovacaoBR, prazoSemanas){
  const base = _treinosParseDataBR(dataAprovacaoBR);
  if(!base) return null;
  const semanas = parseInt(prazoSemanas) || _treinosCfg('validadeSemanas', 12);
  const venc = new Date(base);
  venc.setDate(venc.getDate() + semanas*7);
  return venc.toLocaleDateString('pt-BR');
}

// ── MIGRAÇÃO (idempotente — roda 1x por aluno, marca s._treinosMigrado) ────
function migrarTreinosAntigo(s){
  if(!s) return;
  if(!Array.isArray(s.treinos)) s.treinos = [];
  if(s._treinosMigrado) return;
  s._treinosMigrado = true;

  const antigo = s.prescricao;
  if(!antigo || typeof antigo !== 'object' || Object.keys(antigo).length===0) return;
  if(!antigo.objetivo && !antigo.aprovado) return; // {} vazio de seed — nada a migrar

  // Ciclo anterior (se existir) entra primeiro na lista
  if(antigo._fichaObjAnterior){
    s.treinos.push({
      id: (antigo.id||Date.now()) - 2000, // garante ordem antes do atual
      status: TREINOS_STATUS.APROVADO,
      objetivo: antigo._fichaObjAnterior.objetivo || '',
      nivel: antigo._fichaObjAnterior.nivel || '',
      frequencia: antigo._fichaObjAnterior.frequencia || '',
      modelo: '',
      obs: '',
      treino: '',
      dataCriacao: antigo._fichaObjAnterior.dataGeracao || '',
      dataAprovacao: antigo._fichaObjAnterior.dataGeracao || '',
      _fichaObj: antigo._fichaObjAnterior,
    });
  }

  // Ciclo atual (o que estava em s.prescricao)
  s.treinos.push({
    id: antigo.id || Date.now() - 1000,
    status: antigo.aprovado ? TREINOS_STATUS.APROVADO : TREINOS_STATUS.RASCUNHO,
    objetivo: antigo.objetivo || '',
    nivel: antigo.nivel || '',
    frequencia: antigo.frequencia || '',
    modelo: antigo.modelo || '',
    obs: antigo.obs || '',
    treino: antigo.treino || '',
    dataCriacao: antigo.dataAprovacao || '',
    dataAprovacao: antigo.dataAprovacao || null,
    _fichaObj: antigo._fichaObj || null,
    _fromBiblioteca: antigo._fromBiblioteca || false,
    _bibId: antigo._bibId,
  });
}

// ── LEITURA ──────────────────────────────────────────────────────────────
function obterTreinos(s){
  migrarTreinosAntigo(s);
  return s.treinos;
}

function obterTreinosOrdenados(s){
  return obterTreinos(s).slice().sort((a,b)=>(b.id||0)-(a.id||0));
}

function getTreinoPorId(s, id){
  return obterTreinos(s).find(t=>t.id===id) || null;
}

function getRascunhoAtivo(s){
  const rascunhos = obterTreinos(s).filter(t=>t.status===TREINOS_STATUS.RASCUNHO);
  if(!rascunhos.length) return null;
  return rascunhos.sort((a,b)=>(b.id||0)-(a.id||0))[0];
}

function getUltimoTreinoAprovado(s){
  const aprovados = obterTreinos(s).filter(t=>t.status===TREINOS_STATUS.APROVADO);
  if(!aprovados.length) return null;
  return aprovados.sort((a,b)=>(b.id||0)-(a.id||0))[0];
}

// Compat: substitui leituras de "s.prescricao||{}" espalhadas no projeto —
// sempre retorna objeto (nunca null) pra não quebrar encadeamentos tipo pr.objetivo.
// Inclui aprovado:true pro código legado que checava pr.aprovado (booleano),
// já que o item novo usa status:'aprovado' em vez disso.
function getUltimoTreino(s){
  const t = getUltimoTreinoAprovado(s);
  return t ? Object.assign({}, t, {aprovado:true}) : {};
}

// Ciclo aprovado imediatamente ANTERIOR a um id — usado na comparação de ciclos
function getTreinoAnteriorA(s, id){
  const aprovados = obterTreinos(s)
    .filter(t=>t.status===TREINOS_STATUS.APROVADO)
    .sort((a,b)=>(a.id||0)-(b.id||0));
  const idx = aprovados.findIndex(t=>t.id===id);
  if(idx<=0) return null;
  return aprovados[idx-1];
}

// ── ESCRITA ──────────────────────────────────────────────────────────────
function criarRascunho(s){
  obterTreinos(s); // garante array/migração
  const id = novoId();
  s.treinos.push({
    id, status: TREINOS_STATUS.RASCUNHO,
    objetivo:'', nivel:'', frequencia:'', modelo:'', obs:'', treino:'',
    dataCriacao: _treinosHojeBR(), dataAprovacao: null, _fichaObj: null,
  });
  return id;
}

function atualizarTreino(s, id, patch){
  const t = getTreinoPorId(s, id);
  if(!t) return null;
  Object.assign(t, patch);
  return t;
}

// Finaliza um rascunho (ou cria direto, se id não existir mais — fallback seguro)
function aprovarRascunho(s, id, dadosAprovados){
  obterTreinos(s);
  let t = getTreinoPorId(s, id);
  if(!t){
    t = { id: id || novoId(), _fichaObj:null };
    s.treinos.push(t);
  }
  const dataAprovacao = _treinosHojeBR();
  const prazoSemanas  = dadosAprovados.prazoSemanas || t.prazoSemanas || ((typeof cfgValidadePadrao === 'function') ? cfgValidadePadrao() : '12sem');
  Object.assign(t, dadosAprovados, {
    status: TREINOS_STATUS.APROVADO,
    dataAprovacao,
    prazoSemanas,
    dataVencimento: _treinosCalcularVencimento(dataAprovacao, prazoSemanas),
  });
  return t;
}

// Status de vencimento — controle de "validade do treino" (item G), vinculado
// só ao treino/aluno por enquanto. Puramente informativo: NUNCA bloqueia
// nada, só sinaliza pro personal ficar de olho. Faixas:
//  - ok       : mais de 2 semanas restantes (sem indicador)
//  - agendar  : últimas 2 semanas (🗓️ Agendar avaliação)
//  - proximo  : última semana (⚠️ Vencimento próximo)
//  - vencido  : passou da data (🔴 Vencido)
function getStatusVencimento(treino){
  if(!treino || treino.status !== TREINOS_STATUS.APROVADO || !treino.dataVencimento) return null;
  const venc = _treinosParseDataBR(treino.dataVencimento);
  if(!venc) return null;
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  venc.setHours(0,0,0,0);
  const diasRestantes = Math.round((venc - hoje) / 86400000);
  const semanasRestantes = Math.ceil(diasRestantes / 7);
  let tier = 'ok';
  if(diasRestantes < 0) tier = 'vencido';
  else if(diasRestantes <= _treinosCfg('janelaProximo', 7)) tier = 'proximo';
  else if(diasRestantes <= Math.max(_treinosCfg('janelaAgendar', 14), _treinosCfg('janelaProximo', 7))) tier = 'agendar';
  return { tier, diasRestantes, semanasRestantes, dataVencimento: treino.dataVencimento };
}

function removerTreino(s, id){
  obterTreinos(s);
  s.treinos = s.treinos.filter(t=>t.id!==id);
}

// ── Envio ao legado (FitCpx) ────────────────────────────────────────────
// Grava confirmação manual do trainer (ver comentário de envioFitCpx acima).
// tentativas soma a cada chamada, inclusive reenvio após erro.
function registrarEnvioFitCpx(s, id, status, obs){
  const t = getTreinoPorId(s, id);
  if(!t) return null;
  const tentativasAnteriores = t.envioFitCpx?.tentativas || 0;
  t.envioFitCpx = {
    status,
    enviadoEm: _treinosHojeBR(),
    obs: obs || '',
    tentativas: tentativasAnteriores + 1,
  };
  return t.envioFitCpx;
}
