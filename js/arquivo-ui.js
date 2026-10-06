// ══════════════════════════════════════════════════════════════════════════
// ARQUIVO-UI — tela "Arquivadas" + modal de confirmação padrão
// ══════════════════════════════════════════════════════════════════════════
// Toda a parte visual do Arquivo. A camada de dados é arquivo-store.js.

// ── Confirmação padrão de exclusão ─────────────────────────────────────────
// Síncrona de propósito: os pontos de exclusão do projeto seguem o padrão
// `if(!confirmar(...)) return;`. Transformar isso em callback obrigaria a
// reescrever cada callsite e abriria espaço para bug de fluxo. O texto mudou:
// não existe mais "não pode ser desfeita", porque agora pode.
function confirmarExclusao(tipo, rotulo){
  const nome = (typeof ARQ_LABEL !== 'undefined' && ARQ_LABEL[tipo]) || 'item';
  return confirm(
    `Excluir ${nome.toLowerCase()} "${rotulo || '—'}"?\n\n` +
    `O registro sai das telas de trabalho e vai para Arquivadas, onde você pode consultar ou restaurar quando quiser. Nada é apagado de verdade.`
  );
}

// ── Estado dos filtros da tela ─────────────────────────────────────────────
let _arqFiltroTipo  = '';
let _arqBusca       = '';
let _arqVerHistorico = false;

function arqSetTipo(v){  _arqFiltroTipo = v || '';  renderArquivadas(); }
function arqSetBusca(v){ _arqBusca = v || '';       renderArquivadas(); }
function arqToggleHistorico(){ _arqVerHistorico = !_arqVerHistorico; renderArquivadas(); }

function _arqDataBR(iso){
  if(!iso) return '—';
  try{
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  }catch(e){ return iso; }
}

// ── Render principal ───────────────────────────────────────────────────────
function renderArquivadas(){
  const cont = $('arquivadas-lista'); if(!cont) return;

  // Badge de contagem no menu lateral
  const badge = $('nav-arquivadas-count');
  if(badge){
    const n = contarArquivados();
    badge.textContent = n || '';
    badge.style.display = n ? '' : 'none';
  }

  // Aviso de dados locais antigos (pré-namespacing), se houver
  const avisoLeg = $('arq-aviso-legado');
  if(avisoLeg) avisoLeg.style.display = temDadosLegados() ? '' : 'none';

  const lista = listarArquivo({
    tipo: _arqFiltroTipo,
    busca: _arqBusca,
    incluirRestaurados: _arqVerHistorico,
  });

  const btnHist = $('arq-btn-historico');
  if(btnHist) btnHist.textContent = _arqVerHistorico ? 'Ver só arquivadas' : 'Ver histórico completo';

  if(!lista.length){
    cont.innerHTML = `${_arqBusca || _arqFiltroTipo ? '<div class="empty"><i class=ph-magnifying-glass></i><div class="empty-title">Nenhum registro com esses filtros</div></div>' : '<div class="empty"><i class=ph-archive></i><div class="empty-title">Nada arquivado ainda</div><div class="empty-text">O que você excluir no sistema aparece aqui, inteiro, e pode ser restaurado.</div></div>'}`;
    return;
  }

  let html = `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead><tr style="border-bottom:1px solid var(--border);text-align:left">
      <th style="padding:8px 10px;color:var(--text3);font-weight:500">Tipo</th>
      <th style="padding:8px 10px;color:var(--text3);font-weight:500">Item</th>
      <th style="padding:8px 10px;color:var(--text3);font-weight:500">Aluno</th>
      <th style="padding:8px 10px;color:var(--text3);font-weight:500">Excluído em</th>
      <th style="padding:8px 10px;color:var(--text3);font-weight:500">Por</th>
      <th style="padding:8px 10px;color:var(--text3);font-weight:500"></th>
    </tr></thead><tbody>`;

  lista.forEach(e=>{
    const restaurado = !!e.restauradoEm;
    html += `<tr style="border-bottom:1px solid var(--border);${restaurado?'opacity:.55':''}">
      <td style="padding:8px 10px"><span class="badge badge-blue">${ARQ_LABEL[e.tipo]||e.tipo}</span></td>
      <td style="padding:8px 10px">${_arqEsc(e.rotulo)}</td>
      <td style="padding:8px 10px;color:var(--text3)">${_arqEsc(e.tipo==='aluno' ? '—' : (e.ownerNome||'—'))}</td>
      <td style="padding:8px 10px;color:var(--text3);font-variant-numeric:tabular-nums;font-size:12px">${_arqDataBR(e.excluidoEm)}</td>
      <td style="padding:8px 10px;color:var(--text3);font-size:12px">${_arqEsc(e.excluidoPor||'—')}</td>
      <td style="padding:8px 10px;text-align:right">
        ${restaurado
          ? `<span style="color:var(--text3);font-size:12px"><i class=ph-check></i> restaurado ${_arqDataBR(e.restauradoEm)}</span>`
          : `<button class="btn btn-ghost btn-sm"  onclick="arqRestaurar(${e.arqId})"><i class=ph-arrow-u-up-left></i> Restaurar</button>`}
      </td>
    </tr>`;
  });

  html += `</tbody></table></div>`;
  cont.innerHTML = html;
}

function _arqEsc(s){
  return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ── Ações ──────────────────────────────────────────────────────────────────
function arqRestaurar(arqId){
  const env = getArquivado(arqId);
  if(!env) return;
  if(!confirm(`Restaurar ${(ARQ_LABEL[env.tipo]||'item').toLowerCase()} "${env.rotulo}"?\n\nEle volta para as telas de trabalho com um identificador novo.`)) return;

  const r = restaurarItem(arqId);
  if(!r.ok){ alert(r.msg); return; }

  // Redesenha a tela de origem, se ela existir
  if(env.tipo === 'aluno' && typeof renderScreenAlunos === 'function') renderScreenAlunos();
  if(env.tipo === 'avaliacao' && typeof renderAntroLista === 'function') renderAntroLista();
  if(env.tipo === 'treino' && typeof renderTreinosLista === 'function') renderTreinosLista();
  if(env.tipo === 'local' && typeof renderLocais === 'function') renderLocais();
  if(env.tipo === 'template' && typeof renderBiblioteca === 'function') renderBiblioteca();
  if(env.tipo === 'divisao' && typeof renderDistrib === 'function') renderDistrib();
  if(env.tipo === 'periodizacao' && typeof renderPeriod === 'function') renderPeriod();
  if(typeof renderStudentList === 'function') renderStudentList();

  renderArquivadas();
  alert(r.msg);
}

// ── Importação dos dados locais antigos (chaves sem sufixo de conta) ───────
// Só roda por ação explícita do personal, e ele escolhe para qual conta. O
// carregamento automático disso era a origem do vazamento entre contas.
function arqImportarLegado(){
  const dados = lerDadosLegados();
  const n = (dados.students||[]).length;
  if(!n){ alert('Nenhum dado antigo encontrado neste navegador.'); return; }

  const emailAtual = (typeof _supaUser !== 'undefined' && _supaUser?.email) ? _supaUser.email : 'esta conta';
  if(!confirm(
    `Foram encontrados ${n} aluno(s) salvos neste navegador antes da separação por conta.\n\n` +
    `Importar para ${emailAtual}?\n\n` +
    `Eles entram com identificadores novos. Alunos que já existirem aqui vão aparecer duplicados — confira a lista depois.`
  )) return;

  let importados = 0;
  (dados.students||[]).forEach(a=>{
    const copia = JSON.parse(JSON.stringify(a));
    copia._idOriginal = copia.id;
    copia.id = novoId();
    students.push(copia);
    registrarLog('importar', 'aluno', copia.id, copia.perfil?.nome || 'Aluno sem nome');
    importados++;
  });

  lsSet('acm-students', students);
  salvarArquivo();
  if(typeof supaSalvarAgora === 'function') supaSalvarAgora();
  if(typeof renderScreenAlunos === 'function') renderScreenAlunos();
  if(typeof renderStudentList === 'function') renderStudentList();
  renderArquivadas();
  alert(`${importados} aluno(s) importados. Os dados antigos continuam no navegador — nada foi apagado.`);
}
