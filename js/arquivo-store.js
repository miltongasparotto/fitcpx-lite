// ══════════════════════════════════════════════════════════════════════════
// ARQUIVO-STORE — camada de dados do Arquivo (exclusão reversível) + Log
// ══════════════════════════════════════════════════════════════════════════
// Responsabilidade ÚNICA: envelopar, guardar, listar e restaurar o que o
// personal exclui. Zero DOM aqui — quem desenha a tela é arquivo-ui.js.
//
// REGRA DO PROJETO: nada sai de verdade. Não existe "apagar definitivo".
// Excluir = mover para o Arquivo. O item some das telas de trabalho mas
// continua inteiro aqui, e pode voltar a qualquer momento.
//
// Formato do envelope:
// { arqId, tipo, ownerId, ownerNome, rotulo, dados, excluidoEm, excluidoPor,
//   idOriginal, restauradoEm, restauradoComoId }
//
// Persistência: chaves 'arquivo' e 'log' na tabela app_data do Supabase
// (PK composta (user_id,key) — nenhuma migração de schema foi necessária) e
// espelho em localStorage por usuário.

let ARQUIVO = [];
let LOG     = [];

const LOG_MAX = 2000; // corte circular — a linha é um JSON só, não pode crescer sem fim

const ARQ_LABEL = {
  aluno:        'Aluno',
  avaliacao:    'Avaliação',
  treino:       'Treino',
  local:        'Local de treino',
  template:     'Template de treino',
  divisao:      'Divisão de treino',
  periodizacao: 'Periodização',
};

// Coleção de LIBS correspondente a cada tipo (para restaurar no lugar certo).
// aluno/avaliacao/treino não entram aqui — moram em students, não em LIBS.
const ARQ_LIBS_COLECAO = {
  local:        'locais',
  template:     'biblioteca',
  divisao:      'distribuicao',
  periodizacao: 'periodizacao',
};

// Nome da coleção de LIBS → tipo do arquivo (o caminho inverso, usado pelo
// confirmarDeletar() genérico da biblioteca, que trabalha por coleção).
const ARQ_TIPO_POR_COLECAO = {
  locais:       'local',
  biblioteca:   'template',
  distribuicao: 'divisao',
  periodizacao: 'periodizacao',
};

function _arqAgora(){ return new Date().toISOString(); }

function _arqUsuario(){
  try{ return (typeof _supaUser !== 'undefined' && _supaUser?.email) ? _supaUser.email : 'local'; }
  catch(e){ return 'local'; }
}

// ── LOG ────────────────────────────────────────────────────────────────────
function registrarLog(acao, tipo, alvoId, rotulo){
  LOG.push({
    id: novoId(),
    ts: _arqAgora(),
    usuario: _arqUsuario(),
    acao,            // 'criar' | 'excluir' | 'restaurar' | 'importar'
    tipo,
    alvoId,
    rotulo: rotulo || '',
  });
  if(LOG.length > LOG_MAX) LOG = LOG.slice(-LOG_MAX);
}

// ── Rótulo legível de cada tipo ────────────────────────────────────────────
function rotuloDoItem(tipo, item){
  if(!item) return '—';
  if(tipo === 'aluno')     return item.perfil?.nome || 'Aluno sem nome';
  if(tipo === 'avaliacao') return 'Avaliação de ' + (item.data_avaliacao || 'data não informada');
  if(tipo === 'treino'){
    const obj = (typeof TREINOS_OBJ_LABEL !== 'undefined' && TREINOS_OBJ_LABEL[item.objetivo]) || item.objetivo || 'Treino';
    const dt  = item.dataAprovacao || item.dataCriacao || '';
    return obj + (dt ? ' — ' + dt : '');
  }
  return item.nome || ARQ_LABEL[tipo] || 'Item';
}

// ── ARQUIVAR ───────────────────────────────────────────────────────────────
// item é copiado por inteiro (structuredClone com fallback). Guardar a
// referência viva seria um erro: quem chama costuma continuar mexendo no
// array de origem logo depois.
function arquivarItem(tipo, item, ctx){
  if(!item) return null;
  ctx = ctx || {};
  let copia;
  try{ copia = structuredClone(item); }
  catch(e){ copia = JSON.parse(JSON.stringify(item)); }

  const env = {
    arqId:       novoId(),
    tipo,
    ownerId:     ctx.ownerId   ?? null,
    ownerNome:   ctx.ownerNome ?? null,
    rotulo:      ctx.rotulo || rotuloDoItem(tipo, item),
    dados:       copia,
    excluidoEm:  _arqAgora(),
    excluidoPor: _arqUsuario(),
    idOriginal:  item.id ?? null,
    restauradoEm: null,
    restauradoComoId: null,
  };
  ARQUIVO.push(env);
  registrarLog('excluir', tipo, env.idOriginal, env.rotulo);
  salvarArquivo();
  return env;
}

// ── LISTAR ─────────────────────────────────────────────────────────────────
// Por padrão mostra só o que ainda está arquivado. f.incluirRestaurados traz
// o histórico completo (o registro de uma restauração não é apagado — ele
// fica marcado, para o log continuar contando a história inteira).
function listarArquivo(f){
  f = f || {};
  let lista = ARQUIVO.slice();
  if(!f.incluirRestaurados) lista = lista.filter(e => !e.restauradoEm);
  if(f.tipo)    lista = lista.filter(e => e.tipo === f.tipo);
  if(f.ownerId != null) lista = lista.filter(e => e.ownerId === f.ownerId);
  if(f.busca){
    const q = f.busca.toLowerCase();
    lista = lista.filter(e =>
      (e.rotulo||'').toLowerCase().includes(q) ||
      (e.ownerNome||'').toLowerCase().includes(q)
    );
  }
  return lista.sort((a,b) => (b.excluidoEm||'').localeCompare(a.excluidoEm||''));
}

function getArquivado(arqId){
  return ARQUIVO.find(e => e.arqId === arqId) || null;
}

function contarArquivados(){
  return ARQUIVO.filter(e => !e.restauradoEm).length;
}

// ── RESTAURAR ──────────────────────────────────────────────────────────────
// Sempre com ID NOVO. O id antigo pode ter sido reaproveitado por um cadastro
// feito depois da exclusão; devolver o item com o id original criaria dois
// registros com a mesma chave (foi assim que a Amanda Silva virou três).
// O id de origem fica preservado em _idOriginal, para rastreio.
//
// Retorna { ok, msg } — quem chama decide como mostrar.
function restaurarItem(arqId){
  const env = getArquivado(arqId);
  if(!env) return { ok:false, msg:'Registro não encontrado no arquivo.' };
  if(env.restauradoEm) return { ok:false, msg:'Este item já foi restaurado.' };

  let item;
  try{ item = structuredClone(env.dados); }
  catch(e){ item = JSON.parse(JSON.stringify(env.dados)); }

  const idNovo = novoId();
  item._idOriginal = env.idOriginal;
  item._restauradoEm = _arqAgora();
  item.id = idNovo;

  // ── Aluno: volta inteiro, com avaliações e treinos dentro ───────────────
  if(env.tipo === 'aluno'){
    // Tarefas do CRM (js/crm-store.js) foram levadas junto no _crmTasksBackup
    // por confirmarDeletarAluno() (js/avaliacao.js) — os ids das tarefas não
    // mudam (só o id do aluno muda aqui), então só precisa apontar alunoId
    // pro id novo e devolvê-las pra DB.tasks.
    if(Array.isArray(item._crmTasksBackup)){
      item._crmTasksBackup.forEach(t => { t.alunoId = idNovo; });
      if(typeof DB !== 'undefined' && Array.isArray(DB.tasks)) DB.tasks.push(...item._crmTasksBackup);
      delete item._crmTasksBackup;
      if(typeof crmSave === 'function') crmSave();
    }
    students.push(item);
    _arqFinalizarRestauro(env, idNovo);
    if(typeof saveLocalStudents === 'function') saveLocalStudents();
    else lsSet('acm-students', students);
    if(typeof supaAutoSave === 'function') supaAutoSave();
    return { ok:true, msg:`Aluno "${env.rotulo}" restaurado.`, tipo:'aluno', id:idNovo };
  }

  // ── Avaliação e treino: precisam do aluno dono de volta na lista ────────
  if(env.tipo === 'avaliacao' || env.tipo === 'treino'){
    const dono = students.find(s => s.id === env.ownerId || s._idOriginal === env.ownerId);
    if(!dono){
      return { ok:false, msg:`O aluno "${env.ownerNome||'—'}" não está mais na lista. Restaure o aluno primeiro — a avaliação volta junto com ele.` };
    }
    if(env.tipo === 'avaliacao'){
      if(!Array.isArray(dono.avaliacoesAntro)) dono.avaliacoesAntro = [];
      dono.avaliacoesAntro.push(item);
    } else {
      if(!Array.isArray(dono.treinos)) dono.treinos = [];
      dono.treinos.push(item);
    }
    _arqFinalizarRestauro(env, idNovo);
    if(typeof saveStudent === 'function') saveStudent();
    return { ok:true, msg:`${ARQ_LABEL[env.tipo]} restaurada para ${dono.perfil?.nome||'o aluno'}.`, tipo:env.tipo, id:idNovo };
  }

  // ── Itens de LIBS: local, template, divisão, periodização ───────────────
  const colecao = ARQ_LIBS_COLECAO[env.tipo];
  if(!colecao) return { ok:false, msg:'Tipo desconhecido: ' + env.tipo };
  if(!Array.isArray(LIBS[colecao])) LIBS[colecao] = [];
  LIBS[colecao].push(item);
  _arqFinalizarRestauro(env, idNovo);
  if(typeof saveLibs === 'function') saveLibs(LIBS);
  return { ok:true, msg:`${ARQ_LABEL[env.tipo]} "${env.rotulo}" restaurado.`, tipo:env.tipo, id:idNovo };
}

function _arqFinalizarRestauro(env, idNovo){
  env.restauradoEm = _arqAgora();
  env.restauradoComoId = idNovo;
  registrarLog('restaurar', env.tipo, idNovo, env.rotulo);
  salvarArquivo();
}

// ── PERSISTÊNCIA ───────────────────────────────────────────────────────────
// Sobe em chamada própria, fora do autosave de 1,5s de students/libs: o
// arquivo cresce e não muda a cada tecla digitada — reenviá-lo junto de todo
// autosave seria desperdício de banda a cada campo preenchido.
function salvarArquivo(){
  lsSet('fitcpx_arquivo', ARQUIVO);
  lsSet('fitcpx_log', LOG);
  if(typeof supaSalvarArquivo === 'function') supaSalvarArquivo();
}

function carregarArquivoLocal(){
  ARQUIVO = lsGet('fitcpx_arquivo', []) || [];
  LOG     = lsGet('fitcpx_log', []) || [];
}
