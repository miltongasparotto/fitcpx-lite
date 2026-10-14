// ══════════════════════════════════════════════════════════════════════════
// ADAPTADORES — ferramentas que ainda não existem (Treinar aluno, Financeiro)
// ══════════════════════════════════════════════════════════════════════════
// O Painel, o menu e o sino só falam com estes objetos. Hoje eles devolvem
// vazio e `disponivel:false`: a tela mostra "Em breve" e nenhum botão quebra.
// Quando o módulo real existir, basta trocar as funções abaixo (ou atribuir
// por cima em outro arquivo) e ligar `disponivel = true`. Nada mais muda.
// Formato dos dados: documentos/CONTRATO-INTEGRACAO.md.
//
// Regra: sem DOM aqui, exceto as duas funções render* no fim (telas reservadas).

const FinanceiroAdapter = {
  disponivel: false,

  // Pagamentos em atraso. Cada item:
  //   { id, alunoId, nome, valor:number, descricao:'Mensalidade', vencimento:'AAAA-MM-DD' }
  // Ordem: o mais atrasado primeiro.
  listarPagamentosVencidos(){ return []; },

  // Contratos vencidos ou perto de vencer. Cada item:
  //   { id, alunoId, nome, plano:'Trimestral', fim:'AAAA-MM-DD' }
  // O painel calcula "vencido" / "vence em N dias" a partir de `fim`.
  listarContratos(){ return []; },

  // Registra o recebimento. Deve devolver uma Promise<boolean> (true = gravou).
  // O painel mostra o aviso e anota em "Últimas atividades" depois do true.
  marcarRecebido(/* pagamentoId */){ return Promise.resolve(false); },

  // Abre a tela/modal de ajuste do contrato (vencido -> "Ajustar").
  abrirContrato(/* contratoId */){ if(typeof navGo === 'function') navGo('financeiro'); },

  // Texto de ajuda mostrado enquanto `disponivel` é false.
  textoEmBreve: 'O controle de pagamentos e contratos chega em breve. Por ora o painel já está pronto para receber os dados.',
};

const TreinarAdapter = {
  disponivel: false,

  // Abre a ferramenta de treinar aluno. `alunoId` é opcional (null = escolher na tela).
  abrir(/* alunoId */){ if(typeof navGo === 'function') navGo('treinar'); },

  textoEmBreve: 'A ferramenta para treinar o aluno chega em breve. Enquanto isso, a prescrição continua pela ficha do aluno.',
};

function financeiroPendencias(){
  try{
    return FinanceiroAdapter.listarPagamentosVencidos().length + FinanceiroAdapter.listarContratos().length;
  }catch(e){ return 0; }
}

// Selo vermelho do item Financeiro no menu (mesma fonte do contador do Painel).
function financeiroAtualizarBadge(){
  const el = document.getElementById('nav-financeiro-badge');
  if(!el) return;
  const n = financeiroPendencias();
  el.textContent = n > 99 ? '99+' : String(n);
  el.style.display = n ? '' : 'none';
}

// ── Telas reservadas (Treinar aluno e Financeiro) ─────────────────────────
function _reservadaHTML(icone, titulo, texto, extra){
  return '<div class="reservada">' +
    '<div class="reservada-ic"><i class="' + icone + '"></i></div>' +
    '<div class="reservada-t">' + titulo + '</div>' +
    '<div class="reservada-s">' + escHTML(texto) + '</div>' +
    '<span class="badge badge-blue">Em breve</span>' +
    (extra || '') +
    '</div>';
}

function renderTreinar(){
  const el = document.getElementById('screen-treinar-body'); if(!el) return;
  el.innerHTML = _reservadaHTML('ph-barbell', 'Treinar aluno', TreinarAdapter.textoEmBreve,
    '<button class="btn btn-primary" onclick="navGo(\'alunos\')"><i class=ph-users></i>Abrir alunos</button>');
}

function renderFinanceiro(){
  const el = document.getElementById('screen-financeiro-body'); if(!el) return;
  el.innerHTML = _reservadaHTML('ph-money', 'Financeiro', FinanceiroAdapter.textoEmBreve,
    '<button class="btn btn-primary" onclick="navGo(\'dashboard\')"><i class=ph-squares-four></i>Voltar ao Painel</button>');
}
