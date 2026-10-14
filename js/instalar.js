// ══════════════════════════════════════════════════════════════════════════
// INSTALAR O APLICATIVO — painel do personal e portal do aluno (arquivo compartilhado)
// ══════════════════════════════════════════════════════════════════════════
// Registra o service worker mínimo (sw.js: só repassa à rede, sem cache) e cuida do botão
// "Instalar aplicativo" (qualquer elemento com data-instalar).
//   Chrome/Edge/Android: guarda o evento beforeinstallprompt e o botão abre o diálogo do navegador.
//   iPhone/iPad e navegadores sem o evento: o botão mostra o caminho manual (Compartilhar > Adicionar à Tela de Início).
//   Já instalado (aberto em janela própria): os botões somem.
// Só funciona em HTTPS ou localhost; por file:// o botão explica isso.
// Sob automação (testes com Playwright) o service worker NÃO é registrado: ele passaria por cima da
// interceptação de rede dos testes. Usuário real nunca cai nesse caso.

let _instalarEvento = null;

function instalarJaInstalado(){
  try{ return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; }catch(e){ return false; }
}
function instalarEhIos(){
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
function instalarAtualizarBotoes(){
  const instalado = instalarJaInstalado();
  document.querySelectorAll('[data-instalar]').forEach(el => { el.hidden = instalado; });
}

function instalarMensagemAjuda(){
  if(location.protocol === 'file:') return 'A instalação só funciona com o sistema publicado (endereço https). Abrindo o arquivo direto do computador, o navegador não oferece.';
  if(instalarEhIos()) return 'No iPhone ou iPad: toque no botão Compartilhar do Safari e escolha "Adicionar à Tela de Início".';
  return 'Abra o menu do navegador (os três pontos) e escolha "Instalar aplicativo" ou "Adicionar à tela inicial". Se a opção não aparecer, abra o sistema pelo endereço https publicado.';
}

async function instalarApp(){
  if(_instalarEvento){
    const ev = _instalarEvento; _instalarEvento = null;
    try{ ev.prompt(); await ev.userChoice; }catch(e){}
    instalarAtualizarBotoes();
    return;
  }
  const msg = instalarMensagemAjuda();
  const alvo = document.getElementById('instalar-ajuda');   // portal: texto fixo no cartão
  if(alvo){ alvo.textContent = msg; alvo.hidden = false; }
  else if(typeof crmToast === 'function') crmToast(msg);
  else alert(msg);
}

window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); _instalarEvento = e; instalarAtualizarBotoes(); });
window.addEventListener('appinstalled', () => { _instalarEvento = null; instalarAtualizarBotoes(); });
document.addEventListener('DOMContentLoaded', instalarAtualizarBotoes);

if('serviceWorker' in navigator && !navigator.webdriver && location.protocol !== 'file:'){
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}
