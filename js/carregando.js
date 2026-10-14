// Aviso "processando" compartilhado (painel e portal do aluno). Sem dependências, sem dados de aluno.
//   Carregando.mostrar('Salvando...')   abre (bloqueia cliques) ou só troca a mensagem se já está aberto
//   Carregando.esconder()               fecha quando todas as ações em andamento terminaram
//   Carregando.durante('Salvando...', async () => {...})   mostra, executa e sempre fecha (mesmo com erro)
//   Carregando.envolver({ nomeDaFuncaoGlobal: 'mensagem' })  faz funções globais (onclick) usarem o aviso
// Quando usar: toda ação que espera resposta do servidor (login, cadastro, salvar, enviar). Não usar
// em ação que abre confirm()/prompt(): mostrar só depois da confirmação.
// Regras visuais: documentos/DESIGN-SYSTEM.md (seção "Aviso de processamento").
(function(){
  let emAndamento = 0, el = null, msgEl = null, trava = null;
  const PADRAO = 'Processando...';
  const LIMITE_MS = 45000;   // segurança: se uma chamada travar, libera a tela (a ação continua no navegador)

  function montar(){
    if(el) return;
    el = document.createElement('div');
    el.className = 'carregando';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<div class="carregando-card"><div class="carregando-anel" aria-hidden="true"></div><div class="carregando-msg"></div></div>';
    msgEl = el.querySelector('.carregando-msg');
    (document.body || document.documentElement).appendChild(el);
  }

  function liberarTudo(){
    emAndamento = 0; clearTimeout(trava);
    if(el) el.classList.remove('on');
    document.documentElement.removeAttribute('aria-busy');
  }

  const Carregando = {
    mostrar(msg){
      montar();
      emAndamento++;
      msgEl.textContent = msg || PADRAO;
      el.classList.add('on');
      document.documentElement.setAttribute('aria-busy', 'true');
      clearTimeout(trava); trava = setTimeout(liberarTudo, LIMITE_MS);
    },
    esconder(){
      if(emAndamento > 0) emAndamento--;
      if(emAndamento === 0) liberarTudo();
    },
    async durante(msg, fn){
      Carregando.mostrar(msg);
      try{ return await fn(); }
      finally{ Carregando.esconder(); }
    },
    envolver(mapa){
      Object.keys(mapa).forEach(nome => {
        const original = window[nome];
        if(typeof original !== 'function' || original.__carregando) return;
        const envolvida = function(){
          const args = arguments, self = this;
          return Carregando.durante(mapa[nome], () => original.apply(self, args));
        };
        envolvida.__carregando = true;
        window[nome] = envolvida;
      });
    },
  };
  window.Carregando = Carregando;
})();
