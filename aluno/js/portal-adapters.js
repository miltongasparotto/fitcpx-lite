// ══════════════════════════════════════════════════════════════════════════
// PORTAL DO ALUNO — pontos de encaixe para o que ainda não existe
// ══════════════════════════════════════════════════════════════════════════
// Agenda, Pagamentos e a lista de Treinos do aluno ainda não têm fonte de dados.
// As telas já existem e leem só estes objetos. Hoje `disponivel:false` mostra
// "Em breve". Quando a fonte existir: implementar `listar()` e ligar `disponivel`.
// Formato dos dados: documentos/CONTRATO-INTEGRACAO.md (seção Portal do aluno).
// Regra: só dados do PRÓPRIO aluno logado (RLS no servidor), nunca de outros.

const PortalAgenda = {
  disponivel: false,
  // [{ id, data:'AAAA-MM-DD', hora:'HH:MM', titulo, local }] (próximos compromissos)
  listar(){ return []; },
  textoEmBreve: 'Aqui vão aparecer suas avaliações e aulas marcadas pelo seu personal.',
};

const PortalPagamentos = {
  disponivel: false,
  // [{ id, descricao, valor:number, vencimento:'AAAA-MM-DD', status:'aberto'|'atrasado'|'pago' }]
  listar(){ return []; },
  textoEmBreve: 'Aqui você vai acompanhar suas mensalidades e pagamentos.',
};

const PortalTreinos = {
  disponivel: false,
  // [{ id, titulo, validade:'AAAA-MM-DD', resumo }] (treinos do aluno, mais recente primeiro)
  listar(){ return []; },
  textoEmBreve: 'Seu personal está preparando seu treino de adaptação. Assim que ficar pronto, aparece aqui.',
};

function _vazioCard(icone, titulo, texto, breve){
  return '<div class="card vazio-card"><div class="vazio-ic"><i class=' + icone + '></i></div>' +
    '<div class="vazio-t">' + titulo + '</div><div class="vazio-s">' + escHTML(texto) + '</div>' +
    (breve ? '<span class="badge-breve">Em breve</span>' : '') + '</div>';
}
function _dataBR(iso){ return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : ''; }
function _moedaBR(v){ return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 }); }

function renderAgenda(){
  const box = $('agenda-corpo'); if(!box) return;
  let itens = [];
  if(PortalAgenda.disponivel){ try{ itens = PortalAgenda.listar(); }catch(e){} }
  if(!itens.length){
    box.innerHTML = _vazioCard('ph-calendar-blank', PortalAgenda.disponivel ? 'Nada marcado' : 'Agenda', PortalAgenda.disponivel ? 'Você não tem compromissos próximos.' : PortalAgenda.textoEmBreve, !PortalAgenda.disponivel);
    return;
  }
  const mes = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  box.innerHTML = '<div class="card">' + itens.map(a =>
    '<div class="item-lista"><div class="agenda-dia"><b>' + a.data.slice(8, 10) + '</b><span>' + mes[Number(a.data.slice(5, 7)) - 1] + '</span></div>' +
    '<div class="it-b"><div class="it-t">' + escHTML(a.titulo) + '</div><div class="it-s">' + escHTML([a.hora, a.local].filter(Boolean).join(' · ')) + '</div></div></div>').join('') + '</div>';
}

function renderPagamentos(){
  const box = $('pagamentos-corpo'); if(!box) return;
  let itens = [];
  if(PortalPagamentos.disponivel){ try{ itens = PortalPagamentos.listar(); }catch(e){} }
  if(!itens.length){
    box.innerHTML = _vazioCard('ph-money', PortalPagamentos.disponivel ? 'Tudo em dia' : 'Pagamentos', PortalPagamentos.disponivel ? 'Você não tem pagamentos em aberto.' : PortalPagamentos.textoEmBreve, !PortalPagamentos.disponivel);
    return;
  }
  const chip = { aberto:['chip-amber', 'em aberto'], atrasado:['chip-red', 'atrasado'], pago:['chip-green', 'pago'] };
  box.innerHTML = '<div class="card">' + itens.map(p => {
    const c = chip[p.status] || chip.aberto;
    return '<div class="item-lista"><div class="it-b"><div class="it-t">' + escHTML(p.descricao) + '</div><div class="it-s">vence ' + _dataBR(p.vencimento) + '</div></div>' +
      '<div style="text-align:right"><div class="it-t">' + _moedaBR(p.valor) + '</div><span class="chip ' + c[0] + '">' + c[1] + '</span></div></div>';
  }).join('') + '</div>';
}

function renderTreinos(){
  const box = $('treinos-corpo'); if(!box) return;
  let itens = [];
  if(PortalTreinos.disponivel){ try{ itens = PortalTreinos.listar(); }catch(e){} }
  if(!itens.length){
    box.innerHTML = _vazioCard('ph-barbell', 'Nenhum treino ainda', PortalTreinos.textoEmBreve, false);
    return;
  }
  box.innerHTML = itens.map(t =>
    '<div class="card"><strong>' + escHTML(t.titulo) + '</strong>' +
    (t.validade ? '<div class="it-s" style="margin-top:2px">válido até ' + _dataBR(t.validade) + '</div>' : '') +
    (t.resumo ? '<p class="hint" style="margin:10px 0 0">' + escHTML(t.resumo) + '</p>' : '') + '</div>').join('');
}

// Resumo da Início: pagamentos (a aba própria só abre a partir daqui).
function pagamentosResumoInicio(){
  let n = 0;
  if(PortalPagamentos.disponivel){ try{ n = PortalPagamentos.listar().filter(p => p.status !== 'pago').length; }catch(e){} }
  const txt = PortalPagamentos.disponivel ? (n ? n + ' em aberto' : 'Tudo em dia') : 'Em breve';
  return '<div class="card"><strong>Pagamentos</strong><div class="status-row"><span class="st">' + txt + '</span>' +
    '<button class="btn btn-ghost btn-sm" onclick="mostrarTab(\'pagamentos\')">Ver</button></div></div>';
}
