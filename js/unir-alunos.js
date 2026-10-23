// ══════════════════════════════════════════════════════════════════════════
// Aluno duplicado e cadastro antigo (18/10/2026)
// ══════════════════════════════════════════════════════════════════════════
// Mesma regra de supabase/functions/_shared/alunos-merge.ts: mudar nos dois.
//
//  - "Mesmo aluno": CPF igual (os dois com 11 dígitos), ou, sem CPF de um dos lados, mesmo e-mail E nomes compatíveis.
//    CPF diferente nunca é o mesmo aluno. Duas contas do portal diferentes nunca se unem.
//  - Possível duplicado: dois cadastros ATIVOS do mesmo aluno na lista. "Unir cadastros" junta tudo num só
//    (o que o cadastro principal já tem manda; o outro só completa o que estiver vazio) e guarda o outro nas Arquivadas.
//  - Cadastro antigo encontrado: um aluno Arquivado/Excluído (as Arquivadas nunca apagam) tem o mesmo CPF ou e-mail de um
//    cadastro da lista. "Importar dados antigos" traz os dados dele para o cadastro atual.
// Os dois viram alertas do sistema na lista de Alunos (_alAlertas) e um aviso na ficha.

function uaDigitos(v){ return String(v == null ? '' : v).replace(/\D/g, ''); }
function uaNorm(v){ return String(v == null ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }
function uaNomesCompativeis(a, b){
  const x = uaNorm(a), y = uaNorm(b);
  if(!x || !y) return false;
  if(x === y) return true;
  const tx = x.split(' '), ty = y.split(' ');
  return tx.length > 1 && ty.length > 1 && tx[0] === ty[0] && tx[tx.length - 1] === ty[ty.length - 1];
}
function uaMesmoAluno(a, b){
  const pa = (a && a.perfil) || {}, pb = (b && b.perfil) || {};
  if(pa.alunoUserId && pb.alunoUserId && pa.alunoUserId !== pb.alunoUserId) return false;
  const ca = uaDigitos(pa.cpf), cb = uaDigitos(pb.cpf);
  if(ca.length === 11 && cb.length === 11) return ca === cb;
  const ea = String(pa.email || '').trim().toLowerCase(), eb = String(pb.email || '').trim().toLowerCase();
  return !!ea && ea === eb && uaNomesCompativeis(pa.nome, pb.nome);
}

// ── Índice (recalculado no máximo a cada 50 ms: uma renderização da lista chama isto para cada aluno) ──
let _uaCache = null, _uaCacheEm = 0;
function uaIndice(){
  const agora = Date.now();
  if(_uaCache && agora - _uaCacheEm < 50 && _uaCache.n === students.length) return _uaCache;
  const dup = new Map(), antigo = new Map();
  const lista = students.filter(s => s && s.perfil);
  for(let i = 0; i < lista.length; i++){
    for(let j = i + 1; j < lista.length; j++){
      if(!uaMesmoAluno(lista[i], lista[j])) continue;
      (dup.get(lista[i].id) || dup.set(lista[i].id, []).get(lista[i].id)).push(lista[j].id);
      (dup.get(lista[j].id) || dup.set(lista[j].id, []).get(lista[j].id)).push(lista[i].id);
    }
  }
  const arquivados = (typeof ARQUIVO !== 'undefined' ? ARQUIVO : []).filter(e => e && e.tipo === 'aluno' && !e.restauradoEm && !e.unidoEm && e.dados && e.dados.perfil);
  if(arquivados.length){
    lista.forEach(s => {
      const dica = s.perfil.arquivoAntigo && s.perfil.arquivoAntigo.arqId;
      const env = (dica && arquivados.find(e => e.arqId === dica)) || arquivados.slice().sort((a, b) => String(b.excluidoEm || '').localeCompare(String(a.excluidoEm || ''))).find(e => uaMesmoAluno(e.dados, s));
      if(env) antigo.set(s.id, env);
    });
  }
  _uaCache = { n: students.length, dup, antigo };
  _uaCacheEm = agora;
  return _uaCache;
}
function uaDuplicadosDe(s){ return (uaIndice().dup.get(s && s.id) || []).map(id => students.find(x => x.id === id)).filter(Boolean); }
function uaArquivoAntigo(s){ return (s && uaIndice().antigo.get(s.id)) || null; }

// ── Junção (preenche só o vazio do cadastro principal) ───────────────────────
const _UA_PERFIL_NAO_COPIA = ['alunoUserId', 'identidadeId', 'portalStatus', 'novoCadastro', 'transferidoDe', 'onboardingConcluido', 'arquivoAntigo', 'bloqueioAplicado', 'vinculoSync'];
const _uaVazio = v => v === undefined || v === null || v === '';
function _uaJuntarLista(base, extra){
  const out = Array.isArray(base) ? base.slice() : [];
  const ids = new Set(out.map(x => String(x && x.id)));
  (Array.isArray(extra) ? extra : []).forEach(x => {
    if(x && x.id != null && ids.has(String(x.id))) return;
    out.push(x);
    if(x && x.id != null) ids.add(String(x.id));
  });
  return out;
}
function uaUnir(base, extra){
  const preenchidos = [];
  base.perfil = base.perfil || {};
  Object.keys((extra && extra.perfil) || {}).forEach(k => {
    if(_UA_PERFIL_NAO_COPIA.includes(k)) return;
    if(_uaVazio(base.perfil[k]) && !_uaVazio(extra.perfil[k])){ base.perfil[k] = extra.perfil[k]; preenchidos.push(k); }
  });
  if(extra && extra.crm){
    base.crm = base.crm || {};
    Object.keys(extra.crm).forEach(k => { if(base.crm[k] === undefined && extra.crm[k] !== undefined) base.crm[k] = extra.crm[k]; });
  }
  base.anamnese = base.anamnese || {};
  Object.keys((extra && extra.anamnese) || {}).forEach(k => { if(_uaVazio(base.anamnese[k]) && !_uaVazio(extra.anamnese[k])) base.anamnese[k] = extra.anamnese[k]; });
  if((extra && extra.anamneses && extra.anamneses.length) || base.anamneses) base.anamneses = _uaJuntarLista(base.anamneses, extra && extra.anamneses);
  base.avaliacoesAntro = _uaJuntarLista(base.avaliacoesAntro, extra && extra.avaliacoesAntro)
    .sort((x, y) => String((y && y.data_avaliacao) || '').localeCompare(String((x && x.data_avaliacao) || '')));
  base.treinos = _uaJuntarLista(base.treinos, extra && extra.treinos);
  if((!base.prescricao || !Object.keys(base.prescricao).length) && extra && extra.prescricao && Object.keys(extra.prescricao).length) base.prescricao = extra.prescricao;
  if(extra && Array.isArray(extra.historicoExercicios)) base.historicoExercicios = Array.from(new Set((base.historicoExercicios || []).concat(extra.historicoExercicios)));
  if(!base.reavaliacao && extra && extra.reavaliacao) base.reavaliacao = extra.reavaliacao;
  Object.keys(extra || {}).forEach(k => { if(k.charAt(0) !== '_' && !(k in base) && extra[k] !== undefined) base[k] = extra[k]; });
  return { camposPreenchidos: preenchidos };
}

function _uaSalvar(){
  try{ if(typeof saveLocalStudents === 'function') saveLocalStudents(); else lsSet('acm-students', students); }catch(e){}
  if(typeof crmSave === 'function') crmSave();
  if(typeof supaAutoSave === 'function') supaAutoSave();
}
function _uaAtualizarTela(){
  if(typeof renderStudentList === 'function') renderStudentList();
  if(typeof updateBadges === 'function') updateBadges();
  const ativo = typeof getActive === 'function' ? getActive() : null;
  if(ativo){ if(typeof updateHeader === 'function') updateHeader(ativo); if(typeof aplicarEstadoTransferencia === 'function') aplicarEstadoTransferencia(ativo); }
}
function _uaFmtData(iso){ const d = String(iso || '').slice(0, 10).split('-'); return d.length === 3 ? d[2] + '/' + d[1] + '/' + d[0] : ''; }

// ── Unir cadastros ───────────────────────────────────────────────────────────
// O principal é o que tem conta do portal; sem conta, o que tem mais histórico; empate, o mais antigo.
function _uaPrincipal(grupo){
  const peso = s => (s.perfil && s.perfil.alunoUserId ? 1000000 : 0) + (s.treinos || []).length * 10 + (s.avaliacoesAntro || []).length * 10 + (s.anamneses || []).length * 5 + Object.keys(s.perfil || {}).length;
  return grupo.slice().sort((a, b) => peso(b) - peso(a) || a.id - b.id)[0];
}
async function uaUnirCadastros(id){
  const s = students.find(x => x.id === id); if(!s) return;
  const outros = uaDuplicadosDe(s);
  if(!outros.length) return;
  const grupo = [s].concat(outros);
  if(grupo.some(x => typeof alunoTravado === 'function' && alunoTravado(x))){ alert('Há transferência em andamento neste aluno. Termine a transferência antes de unir os cadastros.'); return; }
  const principal = _uaPrincipal(grupo);
  const resto = grupo.filter(x => x !== principal);
  const nome = principal.perfil.nome || 'aluno';
  if(!confirm('Unir ' + grupo.length + ' cadastros de "' + nome + '" num só?\n\n' +
    'Fica o cadastro com mais informações' + (principal.perfil.alunoUserId ? ' (o que tem acesso ao app)' : '') + '. Do outro entram só os dados que estiverem vazios, mais as avaliações, anamneses e treinos. ' +
    'O cadastro que sai vai para as Arquivadas, de onde você pode restaurar.')) return;
  const rodar = async () => {
    const vistos = new Set([principal.id]);
    resto.forEach(r => {
      uaUnir(principal, r);
      // tarefas e histórico do CRM passam para o cadastro que fica
      if(typeof DB !== 'undefined'){
        (DB.tasks || []).forEach(t => { if(t.alunoId === r.id) t.alunoId = principal.id; });
        if(DB.historico && DB.historico[String(r.id)]){
          const k = String(principal.id);
          DB.historico[k] = (DB.historico[k] || []).concat(DB.historico[String(r.id)]);
          delete DB.historico[String(r.id)];
        }
      }
      const env = typeof arquivarItem === 'function' ? arquivarItem('aluno', r, { rotulo: (r.perfil && r.perfil.nome ? r.perfil.nome : 'Aluno') + ' (cadastro duplicado unido)' }) : null;
      if(env){ env.unidoEm = new Date().toISOString(); env.unidoCom = principal.id; if(typeof salvarArquivo === 'function') salvarArquivo(); }
      vistos.add(r.id);
    });
    students = students.filter(x => x === principal || !resto.includes(x));
    if(typeof activeId !== 'undefined' && resto.some(r => r.id === activeId)) activeId = principal.id;
    _uaCache = null;
    _uaSalvar();
    _uaAtualizarTela();
    if(typeof crmToast === 'function') crmToast('Cadastros unidos');
  };
  if(typeof Carregando !== 'undefined') await Carregando.durante('Unindo os cadastros...', rodar); else await rodar();
}

// ── Importar dados antigos (do Arquivo) ──────────────────────────────────────
async function uaImportarAntigo(id, arqId){
  const s = students.find(x => x.id === id); if(!s) return;
  const env = (arqId && typeof getArquivado === 'function' ? getArquivado(arqId) : null) || uaArquivoAntigo(s);
  if(!env || env.restauradoEm){ alert('O cadastro antigo não está mais nas Arquivadas.'); return; }
  if(typeof alunoTravado === 'function' && alunoTravado(s)){ alert('Cadastro em transferência: só visualização.'); return; }
  const quando = _uaFmtData(env.excluidoEm);
  const antigo = env.dados || {};
  const info = [(antigo.avaliacoesAntro || []).length + ' avaliação(ões)', (antigo.anamneses || []).length + ' anamnese(s)', (antigo.treinos || []).length + ' treino(s)'].join(', ');
  if(!confirm('Importar os dados antigos de "' + (env.rotulo || 'aluno') + '"' + (quando ? ' (arquivado em ' + quando + ')' : '') + ' para este cadastro?\n\n' +
    'Vêm ' + info + ', e os dados pessoais e a anamnese que estiverem vazios aqui. O que já está preenchido neste cadastro não muda.')) return;
  const rodar = async () => {
    uaUnir(s, antigo);
    if(s.perfil) delete s.perfil.arquivoAntigo;
    if(typeof _arqFinalizarRestauro === 'function') _arqFinalizarRestauro(env, s.id);
    else { env.restauradoEm = new Date().toISOString(); env.restauradoComoId = s.id; if(typeof salvarArquivo === 'function') salvarArquivo(); }
    // tarefas guardadas junto com o cadastro arquivado voltam para o aluno
    if(Array.isArray(antigo._crmTasksBackup) && typeof DB !== 'undefined' && Array.isArray(DB.tasks)){
      antigo._crmTasksBackup.forEach(t => { t.alunoId = s.id; DB.tasks.push(t); });
      delete antigo._crmTasksBackup;
      if(typeof salvarArquivo === 'function') salvarArquivo();
    }
    _uaCache = null;
    _uaSalvar();
    _uaAtualizarTela();
    if(typeof crmToast === 'function') crmToast('Dados antigos importados');
  };
  if(typeof Carregando !== 'undefined') await Carregando.durante('Importando os dados antigos...', rodar); else await rodar();
}

// ── Aviso na ficha ───────────────────────────────────────────────────────────
function uaRenderBanner(s){
  const el = document.getElementById('aluno-dup-banner'); if(!el) return;
  const travado = s && typeof alunoTravado === 'function' && alunoTravado(s);
  const dup = s && !travado ? uaDuplicadosDe(s) : [];
  const ant = s && !travado ? uaArquivoAntigo(s) : null;
  if(!dup.length && !ant){ el.classList.add('hidden'); el.innerHTML = ''; return; }
  let html = '';
  if(dup.length){
    html += '<div class="alert alert-amber" style="margin:0 0 8px"><i class=ph-copy></i><div style="flex:1"><b>Possível duplicado.</b> Há ' + (dup.length === 1 ? 'outro cadastro' : dup.length + ' outros cadastros') + ' deste aluno na sua lista (mesmo CPF, ou mesmo e-mail e nome): '
      + dup.map(d => '"' + escHTML((d.perfil && d.perfil.nome) || 'sem nome') + '"').join(', ') + '. Unir mantém um cadastro só, com tudo que cada um tem.'
      + '<div style="margin-top:8px"><button class="btn btn-primary btn-xs" type="button" onclick="uaUnirCadastros(' + s.id + ')">Unir cadastros</button></div></div></div>';
  }
  if(ant){
    const quando = _uaFmtData(ant.excluidoEm);
    html += '<div class="alert alert-amber" style="margin:0 0 8px"><i class=ph-clock-counter-clockwise></i><div style="flex:1"><b>Cadastro antigo encontrado.</b> Este aluno já esteve na sua lista'
      + (quando ? ' (arquivado em ' + quando + ')' : '') + ' com o mesmo CPF ou e-mail. Importe os dados antigos para não perder o histórico dele.'
      + '<div style="margin-top:8px"><button class="btn btn-primary btn-xs" type="button" onclick="uaImportarAntigo(' + s.id + ',\'' + escHTML(String(ant.arqId)) + '\')">Importar dados antigos</button></div></div></div>';
  }
  el.innerHTML = html;
  el.classList.remove('hidden');
}

// Ao salvar o Cadastro de um aluno: se o CPF/e-mail bate com um aluno das Arquivadas, oferece importar (uma vez por cadastro antigo).
function uaAvisarArquivoAntigo(s){
  const env = uaArquivoAntigo(s); if(!env) return false;
  s.perfil = s.perfil || {};
  if(s.perfil.arquivoAntigoAvisado === env.arqId) return false;
  s.perfil.arquivoAntigoAvisado = env.arqId;
  uaModalArquivoAntigo(s, env.arqId, env.rotulo, env.excluidoEm);
  return true;
}
function uaModalArquivoAntigo(s, arqId, rotulo, excluidoEm){
  if(typeof _abrirVinculo !== 'function') return;
  const quando = _uaFmtData(excluidoEm);
  _abrirVinculo('Cadastro antigo encontrado',
    'Já existe um aluno com este CPF ou e-mail nas suas Arquivadas: <b>' + escHTML(rotulo || 'aluno') + '</b>' + (quando ? ' (arquivado em ' + quando + ')' : '') + '.<br><br>Importe os dados antigos para continuar com o histórico dele e não duplicar o cadastro.',
    [{ texto: 'Importar dados antigos', primario: true, acao: () => uaImportarAntigo(s.id, arqId) },
     { texto: 'Continuar sem importar' }]);
}
