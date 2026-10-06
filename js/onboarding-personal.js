// ══════════════════════════════════════════════════════════════════════════
// PORTAL DO ALUNO — visão do personal (Fase 4)
// ══════════════════════════════════════════════════════════════════════════
// Cadastro/anamnese/avaliação/equipamentos são enviados pelo aluno pelo app
// separado (pasta aluno/), que grava DIRETO no aluno de verdade via a Edge
// Function supabase/functions/aluno-api (service_role) — sem fila de
// aprovação. Tabelas Supabase próprias, com RLS própria (supabase/sql/onboarding-aluno.sql):
//   personal_links          — código do link de cadastro (1 por trainer)
//   alunos_acesso           — vínculo aluno↔trainer + status ativo/bloqueado
//   avaliacoes_pendentes    — rastro/auditoria dos envios (não é mais fila)
//   alunos_identidade       — índice central Nome+CPF(hash)+E-mail (supabase/sql/vinculo-cpf.sql)
//   transferencias_vinculo  — pedidos de troca de personal (30 dias, ver seção abaixo)
//   locais_treino / locais_treino_alunos — ver js/locais-alunos.js
//
// O que ainda pede você: liberar transferência antes do prazo (opcional) e
// "marcar como visto" em aluno novo (js/avaliacao.js renderScreenAlunos).

let _portalSubtab = 'link';
let _portalLinkCodigo = null;
let _portalNomeExibicao = '';

function renderPortalAluno(){
  switchPortalSubtab(_portalSubtab || 'link');
  carregarPortalTransferencias(); // atualiza o badge da aba mesmo se ela não estiver ativa
}

function switchPortalSubtab(tab){
  _portalSubtab = tab;
  ['link','transferencias'].forEach(t=>{
    toggle('portal-sub-'+t, t===tab);
    const btn = $('portal-tab-'+t);
    if(btn) btn.classList.toggle('active', t===tab);
  });
  if(tab==='link') carregarPortalLink();
  if(tab==='transferencias') carregarPortalTransferencias();
}

// ─── MEU LINK ─────────────────────────────────────────────────────────────

async function carregarPortalLink(){
  const wrap = $('portal-link-wrap'); if(!wrap || !_supaUser) return;
  wrap.innerHTML = '<div style="color:var(--text3);font-size:13px">Carregando...</div>';
  let { data, error } = await supa.from('personal_links').select('codigo,nome_exibicao').eq('trainer_user_id', _supaUser.id).maybeSingle();
  if(error && /nome_exibicao/.test(error.message||'')){   // SQL da Fase 4.1 ainda não rodou: segue sem o nome
    ({ data, error } = await supa.from('personal_links').select('codigo').eq('trainer_user_id', _supaUser.id).maybeSingle());
  }
  if(error){ wrap.innerHTML = '<div class="alert alert-amber">Erro ao carregar link: '+escHTML(error.message)+'</div>'; return; }
  _portalLinkCodigo = data?.codigo || null;
  _portalNomeExibicao = data?.nome_exibicao || '';
  renderPortalLinkBox();
}

function _gerarCodigoAleatorio(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O/1/I — evita confusão ao digitar
  // crypto (não Math.random): o código é o que separa o link do personal de um chute.
  const buf = new Uint32Array(12); crypto.getRandomValues(buf);
  let out = '';
  for(let i=0;i<12;i++) out += chars[buf[i] % chars.length];
  return out;
}

async function gerarPortalLink(){
  if(!_supaUser) return;
  const codigo = _gerarCodigoAleatorio();
  const { error } = await supa.from('personal_links').insert({ trainer_user_id:_supaUser.id, codigo });
  if(error){ alert('Erro ao gerar link: '+error.message); return; }
  _portalLinkCodigo = codigo;
  renderPortalLinkBox();
}

// Aberto via file:// (duplo clique no index.html) o navegador não resolve
// "aluno/" pro index.html da pasta — mostra a listagem do diretório. Por isso
// aponta direto pro arquivo nesse caso. Servido por HTTP, "aluno/" basta.
function _portalUrlAcesso(){
  const alvo = location.protocol === 'file:' ? 'aluno/index.html' : 'aluno/';
  return new URL(alvo, location.href).href;
}
function _portalLinkSoLocal(){
  return location.protocol === 'file:' || ['localhost','127.0.0.1'].includes(location.hostname);
}
function abrirAppAluno(modo){
  const url = modo === 'cadastro' ? _portalUrlCadastro() : _portalUrlAcesso();
  if(url) window.open(url, '_blank', 'noopener');
}
function _portalUrlCadastro(){ return _portalLinkCodigo ? _portalUrlAcesso() + '?c=' + _portalLinkCodigo : null; }

// Card da Dashboard com os dois links — cópia rápida sem precisar abrir a
// tela Portal do Aluno. Busca o código só se ainda não tiver em memória.
async function renderDashPortalLinks(){
  const box = $('dash-portal-links'); if(!box || !_supaUser) return;
  if(!_portalLinkCodigo){
    const { data } = await supa.from('personal_links').select('codigo').eq('trainer_user_id', _supaUser.id).maybeSingle();
    _portalLinkCodigo = data?.codigo || null;
  }
  const urlAcesso = _portalUrlAcesso(), urlCadastro = _portalUrlCadastro();
  box.innerHTML = `
    <div style="font-weight:600;font-size:13px;margin-bottom:10px;color:var(--text)"><i class=ph-device-mobile></i> Links do Portal do Aluno</div>
    <div style="display:flex;gap:16px;flex-wrap:wrap">
      <div style="flex:1;min-width:220px">
        <div style="font-size:12px;color:var(--text3);margin-bottom:4px">Acesso (aluno já cadastrado)</div>
        <div style="display:flex;gap:6px">
          <input type="text" readonly value="${escHTML(urlAcesso)}" id="dash-link-acesso" style="flex:1;font-variant-numeric:tabular-nums;font-size:12px;padding:6px 8px">
          <button class="btn btn-ghost btn-sm" onclick="copiarLink('dash-link-acesso', this)"><i class=ph-clipboard-text></i></button>
        </div>
      </div>
      <div style="flex:1;min-width:220px">
        <div style="font-size:12px;color:var(--text3);margin-bottom:4px">Cadastro (aluno novo ou sem CPF)</div>
        ${urlCadastro ? `
          <div style="display:flex;gap:6px">
            <input type="text" readonly value="${escHTML(urlCadastro)}" id="dash-link-cadastro" style="flex:1;font-variant-numeric:tabular-nums;font-size:12px;padding:6px 8px">
            <button class="btn btn-ghost btn-sm" onclick="copiarLink('dash-link-cadastro', this)"><i class=ph-clipboard-text></i></button>
          </div>` : `<button class="btn btn-primary btn-sm" onclick="gerarPortalLink().then(renderDashPortalLinks)">Gerar link</button>`}
      </div>
    </div>
    ${_avisoSemCpf()}`;
}

// Aluno antigo sem CPF não entra no índice de vínculo. Solução: mandar o link de cadastro;
// ao preencher, o cadastro dele é atualizado (sem duplicar).
function _avisoSemCpf(){
  const n = alunosSemCpf().length;
  if(!n) return '';
  return `<div class="alert alert-amber" style="margin:12px 0 0"><i class=ph-identification-card></i><span>${n===1?'1 aluno ainda sem CPF':n+' alunos ainda sem CPF'}. Mande o link de cadastro: ao preencher, o cadastro é atualizado e ele passa a ser reconhecido.</span></div>`;
}

function renderPortalLinkBox(){
  const wrap = $('portal-link-wrap'); if(!wrap) return;
  const urlAcesso = _portalUrlAcesso();
  const urlCadastro = _portalUrlCadastro();
  wrap.innerHTML = `
    <div class="card" style="margin-bottom:18px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <div style="flex:1;min-width:200px">
        <div style="font-weight:600;font-size:13px;color:var(--text)">Testar o app do aluno</div>
        <div style="font-size:12px;color:var(--text3)">Abre em nova aba, sessão separada — não desloga você daqui.</div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="abrirAppAluno('acesso')"><i class=ph-play></i> Abrir app do aluno</button>
      ${urlCadastro ? `<button class="btn btn-ghost btn-sm" onclick="abrirAppAluno('cadastro')">Abrir como aluno novo</button>` : ''}
    </div>
    <div class="field" style="margin-bottom:18px">
      <label>Seu nome para os alunos e outros personals</label>
      <div style="font-size:12px;color:var(--text3);margin-bottom:6px">Aparece em avisos como "este perfil já está vinculado ao personal ...". Sem nome, aparece "outro personal".</div>
      <div style="display:flex;gap:8px;align-items:center">
        <input type="text" id="portal-nome-exibicao" maxlength="80" value="${escHTML(_portalNomeExibicao)}" placeholder="Ex: Rafael Souza" style="flex:1" oninput="this.dataset.sujo=1">
        <button class="btn btn-ghost btn-sm" onclick="salvarNomeExibicao(this)">Salvar</button>
      </div>
      ${_portalNomeExibicao ? '' : '<div class="alert alert-amber" style="margin:10px 0 0"><i class=ph-warning></i> Defina seu nome pra que os avisos de transferência mostrem quem você é.</div>'}
    </div>
    ${_portalLinkSoLocal() ? `<div class="alert alert-amber" style="margin-bottom:14px"><i class=ph-warning></i> Você está rodando o sistema localmente — estes links só abrem neste computador. Pra mandar pro celular do aluno, o sistema precisa estar publicado (Fase 9).</div>` : ''}
    <div class="field">
      <label>Link de acesso — pra quem já é seu aluno</label>
      <div style="font-size:12px;color:var(--text3);margin-bottom:6px">Pra quem já é seu aluno e já tem acesso. Ele entra com o e-mail e a senha dele.</div>
      <div style="display:flex;gap:8px;align-items:center">
        <input type="text" readonly value="${escHTML(urlAcesso)}" id="portal-link-acesso-input" style="flex:1;font-variant-numeric:tabular-nums;font-size:12px">
        <button class="btn btn-ghost btn-sm" onclick="copiarLink('portal-link-acesso-input', this)"><i class=ph-clipboard-text></i> Copiar</button>
      </div>
    </div>
    <div class="field" style="margin-top:18px">
      <label>Link de cadastro — pra gente nova</label>
      <div style="font-size:12px;color:var(--text3);margin-bottom:6px">Aluno novo preenche nome, CPF e e-mail e já fica ativo. Aluno antigo (sem CPF) também usa este link: ao preencher, o cadastro dele é atualizado, sem duplicar. Se o CPF já for de outro personal, vira pedido de transferência.</div>
      ${urlCadastro ? `
        <div style="display:flex;gap:8px;align-items:center">
          <input type="text" readonly value="${escHTML(urlCadastro)}" id="portal-link-cadastro-input" style="flex:1;font-variant-numeric:tabular-nums;font-size:12px">
          <button class="btn btn-ghost btn-sm" onclick="copiarLink('portal-link-cadastro-input', this)"><i class=ph-clipboard-text></i> Copiar</button>
        </div>` : `<button class="btn btn-primary btn-sm" onclick="gerarPortalLink()">Gerar meu link de cadastro</button>`}
    </div>`;
}

async function salvarNomeExibicao(btn){
  const el = $('portal-nome-exibicao'); if(!el) return;
  const nome = el.value.trim();
  if(!nome){ alert('Digite o nome que os alunos devem ver.'); return; }
  try{ await chamarTrainerFn('definir-nome', { nome }); }
  catch(e){ alert('Não foi possível salvar: '+e.message); return; }
  _portalNomeExibicao = nome;
  if(btn){ const t=btn.textContent; btn.textContent='✓ Salvo'; setTimeout(()=>{ btn.textContent=t; renderPortalLinkBox(); }, 1000); }
}

function copiarLink(inputId, btn){
  const el = $(inputId); if(!el) return;
  el.select();
  const ok = () => { if(btn){ const t=btn.textContent; btn.textContent='✓ Copiado'; setTimeout(()=>btn.textContent=t, 1500); } };
  if(navigator.clipboard?.writeText) navigator.clipboard.writeText(el.value).then(ok).catch(()=>document.execCommand('copy'));
  else document.execCommand('copy');
}

// ─── CPF, VÍNCULO E TRANSFERÊNCIA ENTRE PERSONALS (Fase 4.1) ──────────────
// Regras (Fase 4.1 do plano do projeto; lógica em supabase/functions/_shared/vinculo.ts):
//  - o aluno é reconhecido por Nome + CPF + E-mail; só o e-mail pode mudar, e só por caminho autenticado;
//  - aluno já vinculado a outro personal: o novo pede transferência (ou desiste);
//  - durante o pedido o aluno segue com acesso normal; o personal ATUAL só visualiza;
//  - 30 dias depois do pedido do aluno a troca acontece sozinha, sem treinos.
//    O personal atual pode adiantar (cortesia) escolhendo manter ou não os treinos; não pode recusar.
// O painel só mostra e dispara; quem decide e executa é a Edge Function trainer-transferencia.

let _transf = { saindo: [], chegando: [] };

async function chamarTrainerFn(acao, corpo){
  const { data, error } = await supa.functions.invoke('trainer-transferencia', { body: { acao, ...(corpo||{}) } });
  if(error) throw new Error(await msgErroFuncao(error));
  if(data && data.error) throw new Error(data.error);
  return data || {};
}

function cpfDigitos(v){ return String(v||'').replace(/\D/g,'').slice(0,11); }
function cpfFormatado(v){
  const d = cpfDigitos(v);
  return d.replace(/^(\d{3})(\d)/,'$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/,'$1.$2.$3').replace(/\.(\d{3})(\d)/,'.$1-$2');
}
function mascararCpfInput(el){ el.value = cpfFormatado(el.value); }
function cpfValidoLocal(cpf){
  const d = cpfDigitos(cpf);
  if(d.length!==11 || /^(\d)\1{10}$/.test(d)) return false;
  for(let t=9;t<11;t++){
    let soma = 0;
    for(let i=0;i<t;i++) soma += +d[i]*(t+1-i);
    if(((soma*10)%11)%10 !== +d[t]) return false;
  }
  return true;
}
function _fmtDataBR(iso){ return iso ? new Date(iso).toLocaleDateString('pt-BR') : ''; }
function _diasAte(iso){ return iso ? Math.max(0, Math.ceil((new Date(iso).getTime()-Date.now())/86400000)) : null; }

// ─── Estado: pedidos abertos (que saem / que chegam) ───────────────────────

function transfDoAluno(s){
  if(!s) return null;
  return _transf.saindo.find(t=>t.studentId===s.id) || _transf.chegando.find(t=>t.rascunhoId===s.id) || null;
}
function alunoTravado(s){ return !!transfDoAluno(s); }

async function carregarPortalTransferencias(){
  const wrap = $('portal-transferencias-lista');
  if(!_supaUser) return;
  if(wrap) wrap.innerHTML = '<div style="color:var(--text3);font-size:13px">Carregando...</div>';
  let erroMsg = '';
  try{
    const r = await chamarTrainerFn('listar');
    _transf = { saindo: r.saindo||[], chegando: r.chegando||[] };
    if(r.executadas>0 && typeof _formDirty!=='undefined' && _formDirty){
      alert('Uma transferência de aluno foi concluída. Salve o que está editando e recarregue a página para atualizar sua lista.');
    } else if(r.executadas>0 && typeof supaCarregarDados==='function' && !carregarPortalTransferencias._recarregando){
      // Um prazo venceu e a troca foi feita no servidor: a lista local de alunos está velha.
      carregarPortalTransferencias._recarregando = true;
      try{ await supaCarregarDados(); } finally { carregarPortalTransferencias._recarregando = false; }
      return;
    }
  }catch(e){
    erroMsg = e.message || 'Não foi possível consultar as transferências.';
    _transf = { saindo: [], chegando: [] };
  }
  const total = _transf.saindo.length + _transf.chegando.length;
  [$('portal-transferencias-count'), $('nav-portal-aluno-count')].forEach(badge=>{
    if(!badge) return;
    badge.style.display = total ? 'inline-block' : 'none';
    badge.textContent = total;
  });
  renderPortalTransferencias(wrap, erroMsg);
  renderFaixaChegando();
  if(typeof renderScreenAlunos==='function') renderScreenAlunos();
  aplicarEstadoTransferencia(typeof getActive==='function' ? getActive() : null);
}

function _linhaDado(rotulo, valor){
  return valor ? `<div style="font-size:12px;color:var(--text3)">${escHTML(rotulo)}: <span style="color:var(--text2)">${escHTML(valor)}</span></div>` : '';
}

function renderPortalTransferencias(wrap, erroMsg){
  if(!wrap) return;
  if(erroMsg){ wrap.innerHTML = '<div class="alert alert-amber"><i class=ph-warning></i> '+escHTML(erroMsg)+'</div>'; return; }
  if(!_transf.saindo.length && !_transf.chegando.length){
    wrap.innerHTML = '<div style="color:var(--text3);font-size:13px;padding:20px 0">Nenhuma transferência em andamento.</div>';
    return;
  }
  let html = '';
  if(_transf.saindo.length){
    html += '<div style="font-size:12px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin:4px 0 8px">Saindo da sua carteira</div>';
    html += _transf.saindo.map(t=>{
      const dias = _diasAte(t.prazoEm);
      const situacao = t.status==='pendente'
        ? `O aluno pediu a troca. Transferência automática em ${_fmtDataBR(t.prazoEm)} (${dias} dia${dias===1?'':'s'}), sem os treinos.`
        : `${escHTML(t.outroNome)} abriu o pedido e o aluno ainda não confirmou.`;
      return `<div class="card" style="margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span style="font-weight:600;font-size:14px;color:var(--text)">${escHTML(t.nomeAluno||'Aluno')}</span><span class="badge badge-amber">Transferência</span></div>
        <div style="font-size:13px;color:var(--text2);margin:4px 0 10px">Quer ir para <b>${escHTML(t.outroNome)}</b>. ${situacao}</div>
        <div style="font-size:12px;color:var(--text3);margin-bottom:10px">Enquanto isso o aluno continua usando o app e o treino normalmente, e você só pode visualizar o cadastro. Avaliações e anamnese vão junto; os treinos só se você escolher.</div>
        <div class="btn-row" style="padding:0;justify-content:flex-start;gap:8px;flex-wrap:wrap">
          <button class="btn btn-primary btn-sm" onclick="anteciparTransferencia('${escHTML(t.id)}', true)">Liberar agora, com treinos</button>
          <button class="btn btn-ghost btn-sm" onclick="anteciparTransferencia('${escHTML(t.id)}', false)">Liberar agora, sem treinos</button>
        </div>
      </div>`;
    }).join('');
  }
  if(_transf.chegando.length){
    html += '<div style="font-size:12px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin:16px 0 8px">Chegando na sua carteira</div>';
    html += _transf.chegando.map(t=>{
      const precisaAceite = t.iniciadoPor==='aluno' && !t.aceiteNovoEm;
      const dias = _diasAte(t.prazoEm);
      let situacao, acoes = '';
      if(precisaAceite){
        situacao = 'Este aluno pediu pelo seu link para passar a ser seu. Confirme que é seu aluno.';
        acoes = `<button class="btn btn-primary btn-sm" onclick="responderChegada('${escHTML(t.id)}', true)">Confirmar novo aluno</button>
                 <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="responderChegada('${escHTML(t.id)}', false)">Recusar</button>`;
      } else if(t.status==='aguardando_aluno'){
        situacao = 'Pedido enviado. Falta o aluno confirmar pelo app dele. O prazo de 30 dias só começa nessa confirmação.';
        acoes = `<button class="btn btn-ghost btn-sm" onclick="cancelarPedidoTransferencia('${escHTML(t.id)}')">Cancelar pedido</button>`;
      } else {
        situacao = `Aguardando liberação. Se ${escHTML(t.outroNome)} não liberar antes, ele chega em ${_fmtDataBR(t.prazoEm)} (${dias} dia${dias===1?'':'s'}), sem os treinos anteriores.`;
      }
      return `<div class="card" style="margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span style="font-weight:600;font-size:14px;color:var(--text)">${escHTML(t.nomeAluno||'Aluno')}</span><span class="badge badge-amber">Transferência</span></div>
        <div style="font-size:13px;color:var(--text2);margin:4px 0 8px">Hoje com <b>${escHTML(t.outroNome)}</b>. ${situacao}</div>
        ${_linhaDado('CPF', t.cpfMascarado)}${_linhaDado('E-mail', t.email)}${_linhaDado('WhatsApp', t.whatsapp)}
        ${acoes ? `<div class="btn-row" style="padding:8px 0 0;justify-content:flex-start;gap:8px;flex-wrap:wrap">${acoes}</div>` : ''}
      </div>`;
    }).join('');
  }
  wrap.innerHTML = html;
}

// Faixa no topo da lista de Alunos: quem está chegando (ainda não está na lista).
function renderFaixaChegando(){
  const el = $('alunos-transf-strip'); if(!el) return;
  const n = _transf.chegando.length;
  el.classList.toggle('hidden', !n);
  if(!n){ el.innerHTML=''; return; }
  el.innerHTML = `<div class="alert alert-amber" style="margin:0 24px 12px;cursor:pointer" onclick="navGo('portal-aluno');switchPortalSubtab('transferencias')"><i class=ph-arrows-left-right></i><span>${n===1?'1 aluno chegando':n+' alunos chegando'} por transferência. Ver detalhes.</span></div>`;
}

async function _aposAcaoTransferencia(){
  if(typeof supaCarregarDados==='function') await supaCarregarDados();   // pode ter saído/entrado aluno do seu cadastro
  else await carregarPortalTransferencias();
}

async function anteciparTransferencia(id, manterTreinos){
  const msg = manterTreinos
    ? 'Liberar agora este aluno para o outro personal, levando os treinos junto?'
    : 'Liberar agora este aluno para o outro personal SEM os treinos? Anamnese e avaliações vão junto.';
  if(!confirm(msg+'\n\nIsso não pode ser desfeito.')) return;
  try{ await chamarTrainerFn('antecipar', { id, manterTreinos }); }
  catch(e){ alert('Não foi possível liberar: '+e.message); return; }
  await _aposAcaoTransferencia();
}

async function responderChegada(id, aceitar){
  if(!aceitar && !confirm('Recusar este aluno? O pedido de transferência é encerrado.')) return;
  try{ await chamarTrainerFn('responder-novo', { id, aceitar }); }
  catch(e){ alert('Não foi possível responder: '+e.message); return; }
  await carregarPortalTransferencias();
}

async function cancelarPedidoTransferencia(id){
  if(!confirm('Cancelar o pedido de transferência deste aluno?')) return;
  try{ await chamarTrainerFn('cancelar', { id }); }
  catch(e){ alert('Não foi possível cancelar: '+e.message); return; }
  await carregarPortalTransferencias();
}

// ─── Aluno em transferência: faixa + cadastro só pra visualização ──────────

function aplicarEstadoTransferencia(s){
  const banner = $('aluno-transf-banner');
  const painel = $('tab-content');
  const t = transfDoAluno(s);
  if(painel) Array.from(painel.children).forEach(el=>{ if(t) el.setAttribute('inert',''); else el.removeAttribute('inert'); });
  if(!banner) return;
  if(!t){ banner.classList.add('hidden'); banner.innerHTML=''; return; }
  const saindo = _transf.saindo.some(x=>x.id===t.id);
  const dias = _diasAte(t.prazoEm);
  const prazo = t.status==='pendente' ? ` Transferência automática em ${_fmtDataBR(t.prazoEm)} (${dias} dia${dias===1?'':'s'}).` : ' O prazo de 30 dias começa quando o aluno confirmar.';
  banner.classList.remove('hidden');
  banner.innerHTML = `<div class="alert alert-amber" style="margin:0"><i class=ph-arrows-left-right></i><div style="flex:1">
    <b>Transferência em andamento.</b> ${saindo ? `Este aluno vai para <b>${escHTML(t.outroNome)}</b>.${prazo} Você só pode visualizar o cadastro; o aluno segue com acesso normal.`
      : `Hoje ele é de <b>${escHTML(t.outroNome)}</b>. Aguardando liberação.${prazo} O cadastro fica só pra visualização até a troca.`}
    ${saindo ? `<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-primary btn-xs" onclick="anteciparTransferencia('${escHTML(t.id)}', true)">Liberar agora, com treinos</button><button class="btn btn-ghost btn-xs" onclick="anteciparTransferencia('${escHTML(t.id)}', false)">Liberar agora, sem treinos</button></div>` : ''}
  </div></div>`;
}

function badgeTransferencia(s){
  return alunoTravado(s) ? '<span class="badge badge-amber"><i class=ph-arrows-left-right></i>Transferência</span>' : '';
}

// ─── Registro do aluno no índice central (nome + CPF + e-mail) ─────────────

function _msgCpf(texto, erro){
  const el = $('p-cpf-msg'); if(!el) return;
  el.classList.toggle('hidden', !texto);
  el.style.color = erro ? 'var(--red)' : 'var(--text3)';
  el.textContent = texto || '';
}

function _abrirVinculo(titulo, corpoHtml, botoes){
  $('vinculo-titulo').textContent = titulo;
  $('vinculo-corpo').innerHTML = corpoHtml;
  const box = $('vinculo-acoes'); box.innerHTML = '';
  botoes.forEach(b=>{
    const el = document.createElement('button');
    el.className = 'btn ' + (b.primario ? 'btn-primary' : 'btn-ghost');
    if(b.perigo) el.style.color = 'var(--red)';
    el.textContent = b.texto;
    el.onclick = ()=>{ _fecharVinculo(); if(b.acao) b.acao(); };
    box.appendChild(el);
  });
  $('modal-vinculo-overlay').classList.remove('hidden');
}
function _fecharVinculo(){ $('modal-vinculo-overlay').classList.add('hidden'); }

// Chamado ao salvar o Perfil. Silencioso quando não há CPF (aluno antigo) ou nada mudou.
async function registrarAlunoNuvem(s){
  if(!_supaUser || !s || !s.perfil) return;
  const p = s.perfil, cpf = cpfDigitos(p.cpf);
  _msgCpf('', false);
  if(!cpf) return;
  if(!cpfValidoLocal(cpf)){ _msgCpf('CPF inválido. Confira os números.', true); return; }
  if(!(p.nome||'').trim()){ _msgCpf('Preencha o nome pra registrar o CPF.', true); return; }
  const chave = [cpf, (p.nome||'').trim().toLowerCase(), (p.email||'').trim().toLowerCase()].join('|');
  if(p.identidadeId && p.vinculoSync === chave) return;
  let r;
  try{
    r = await chamarTrainerFn('registrar-aluno', { studentId: s.id, nome: p.nome, cpf, email: p.email||'', whatsapp: p.whatsapp||'' });
  }catch(e){ _msgCpf('Não foi possível registrar o CPF agora: '+e.message, true); return; }
  if(r.status==='ok'){
    p.identidadeId = r.identidadeId; p.vinculoSync = chave;
    try{ localStorage.setItem(lsKey('acm-students'), JSON.stringify(students)); }catch(e){}
    if(typeof supaAutoSave==='function') supaAutoSave();
    _msgCpf('CPF registrado.', false);
    return;
  }
  _tratarRespostaVinculo(s, r, chave);
}

function _tratarRespostaVinculo(s, r, chave){
  const editar = ()=>{ if(typeof switchTab==='function') switchTab('perfil'); const el=$('p-cpf'); if(el) el.focus(); };
  switch(r.status){
    case 'travado': _msgCpf('Cadastro em transferência: só visualização.', true); break;
    case 'cpf-invalido': _msgCpf('CPF inválido. Confira os números.', true); break;
    case 'cpf-nao-confere': _msgCpf('Este aluno já tem acesso ligado a outro CPF. O CPF não muda depois do vínculo.', true); break;
    case 'duplicado': _msgCpf('Você já tem esse CPF cadastrado em "'+(r.nomeOutroAluno||'outro aluno')+'". Abra aquele cadastro.', true); break;
    case 'email-diferente':
      _msgCpf('Esse CPF já tem cadastro com o e-mail '+(r.emailMascarado||'')+'. Use o mesmo e-mail.', true); break;
    case 'divergencia':
      _abrirVinculo('Dados não conferem',
        'Esse CPF já existe no sistema, mas o nome ou o e-mail informados não batem com o cadastro. Confira os três dados (nome, CPF e e-mail).',
        [{ texto:'Voltar e editar', primario:true, acao:editar }]);
      break;
    case 'conflito': _dialogoConflito(s, r); break;
    case 'ja-solicitado': case 'ja-ha-pedido': break;
    default: _msgCpf('Não foi possível registrar o CPF.', true);
  }
}

// Aluno que já é de outro personal: voltar, desistir ou pedir transferência.
function _dialogoConflito(s, r){
  const nomePersonal = escHTML(r.personalNome || 'outro personal');
  const editar = ()=>{ if(typeof switchTab==='function') switchTab('perfil'); const el=$('p-cpf'); if(el) el.focus(); };
  if(r.jaHaPedido){
    _abrirVinculo('Perfil já vinculado',
      `Este perfil já está vinculado ao personal <b>${nomePersonal}</b> e já existe um pedido de transferência em andamento. Não é possível abrir outro agora.`,
      [{ texto:'Voltar e editar', primario:true, acao:editar },
       { texto:'Desistir deste cadastro', perigo:true, acao:()=>desistirCadastroLocal(s.id) }]);
    return;
  }
  _abrirVinculo('Perfil já vinculado',
    `Este perfil já está vinculado ao personal <b>${nomePersonal}</b>.<br><br>Você pode corrigir os dados, desistir deste cadastro ou solicitar a transferência. Na transferência, o aluno confirma o pedido pelo app dele e segue com acesso normal por até 30 dias; depois disso a troca acontece sozinha, sem os treinos que ele tinha.`,
    [{ texto:'Voltar e editar', acao:editar },
     { texto:'Desistir deste cadastro', perigo:true, acao:()=>desistirCadastroLocal(s.id) },
     { texto:'Solicitar transferência', primario:true, acao:()=>solicitarTransferenciaDe(s.id) }]);
}

function desistirCadastroLocal(id){
  if(typeof confirmarDeletarAluno==='function') confirmarDeletarAluno(id);
}

async function solicitarTransferenciaDe(id){
  const s = students.find(x=>x.id===id); if(!s) return;
  const p = s.perfil;
  let r;
  try{
    r = await chamarTrainerFn('solicitar-troca', { studentId: s.id, nome: p.nome, cpf: cpfDigitos(p.cpf), email: p.email||'', whatsapp: p.whatsapp||'' });
  }catch(e){ alert('Não foi possível solicitar: '+e.message); return; }
  if(r.status==='ok' || r.status==='ja-solicitado'){
    const tel = r.alunoTemConta===false
      ? 'Esse aluno ainda não tem conta: só o personal atual pode liberar agora.'
      : 'O aluno recebe o pedido ao entrar no app dele e confirma por lá. O prazo de 30 dias começa na confirmação.';
    _abrirVinculo('Pedido enviado', `Pedido de transferência registrado. ${escHTML(tel)}<br><br>Enquanto isso o cadastro fica só pra visualização.`, [{ texto:'Entendi', primario:true }]);
    await carregarPortalTransferencias();
    return;
  }
  if(r.status==='ja-ha-pedido'){ alert('Já existe um pedido de transferência desse aluno para '+(r.paraNome||'outro personal')+'.'); return; }
  _tratarRespostaVinculo(s, r);
}

// ─── E-mail do aluno que já tem acesso ─────────────────────────────────────

async function alunoAlterarEmail(){
  const s = getActive(); if(!s || !s.perfil?.alunoUserId) return;
  if(alunoTravado(s)){ alert('Cadastro em transferência: só visualização.'); return; }
  const novo = prompt('Novo e-mail de login deste aluno:\n(O e-mail antigo deixa de funcionar. Nome e CPF continuam os mesmos.)', s.perfil.email||'');
  if(novo===null) return;
  let r;
  try{ r = await chamarTrainerFn('alterar-email-aluno', { studentId: s.id, novoEmail: novo.trim() }); }
  catch(e){ alert('Não foi possível alterar: '+e.message); return; }
  if(r.status==='email-em-uso'){ alert('Esse e-mail já é usado por outra conta.'); return; }
  s.perfil.email = novo.trim().toLowerCase();
  setVal('p-email', s.perfil.email);
  s.perfil.vinculoSync = '';   // força reconferir o índice no próximo salvar
  try{ localStorage.setItem(lsKey('acm-students'), JSON.stringify(students)); }catch(e){}
  if(typeof supaAutoSave==='function') supaAutoSave();
  renderPortalStatusBadge(s);
}

// Aluno antigo sem CPF: o jeito é mandar o link de cadastro; ele preenche e o sistema atualiza.
function alunosSemCpf(){
  return (typeof students!=='undefined' ? students : []).filter(s=>!cpfDigitos(s.perfil?.cpf));
}


// Gancho pra Fase 6 (treino de adaptação automático) — ainda não implementado.
// Em v2 (sem fila de aprovação), o cadastro/anamnese do aluno grava direto
// pela Edge Function aluno-api, não por aqui — quando a Fase 6 chegar, este
// gancho provavelmente precisa morar do lado do servidor (Edge Function ou
// trigger), não no painel, já que o trainer pode nem estar com o app aberto
// no momento em que o aluno termina o cadastro.
function gerarTreinoAdaptacao(s){ /* implementar na Fase 6 */ }

// ─── STATUS DE ACESSO (aba Perfil do aluno) ──────────────────────────────

// Todo aluno pode ter acesso ao Portal, não só quem se autocadastrou pelo
// link — basta ter e-mail preenchido aqui. O botão "Resetar senha" funciona
// também como "primeiro acesso": manda o mesmo código de 6 dígitos, não
// importa se é a primeira vez ou a enésima.
function renderPortalStatusBadge(s){
  const badge = $('p-portal-status-badge'), btnReset = $('p-portal-reset-btn'), btnStatus = $('p-portal-status-btn');
  if(!badge || !btnReset || !btnStatus) return;
  // Com conta criada, o e-mail é o login: só muda pelo botão "Alterar" (função no servidor).
  const emailInput = $('p-email'), btnEmail = $('p-email-alterar-btn');
  const comConta = !!s?.perfil?.alunoUserId;
  if(emailInput) emailInput.readOnly = comConta;
  if(btnEmail) btnEmail.classList.toggle('hidden', !comConta);
  const email = s?.perfil?.email;
  if(!email){
    badge.className = 'badge badge-gray'; badge.textContent = '— preencha o e-mail';
    btnReset.style.display = 'none'; btnStatus.style.display = 'none';
    return;
  }
  btnReset.style.display = 'inline-block';
  if(!s.perfil.alunoUserId){
    badge.className = 'badge badge-gray'; badge.textContent = 'Aguardando primeiro acesso';
    btnStatus.style.display = 'none';
    return;
  }
  const bloqueado = s.perfil.portalStatus === 'bloqueado';
  badge.className = bloqueado ? 'badge badge-red' : 'badge badge-green';
  badge.textContent = bloqueado ? 'Bloqueado' : '✓ Ativo';
  btnStatus.style.display = 'inline-block';
  btnStatus.textContent = bloqueado ? 'Liberar acesso' : 'Bloquear acesso';
}

// Mesmo botão serve pra "conceder acesso" (aluno sem conta ainda) e pra
// "resetar senha" (já tem conta) — a Edge Function decide sozinha qual dos
// dois casos é. Sem e-mail/link envolvido: você define a senha temporária
// (ou deixa eu gerar uma) e repassa pro aluno por fora (WhatsApp etc.); ele
// troca em "Minhas informações" dentro do Portal quando quiser.
function _gerarSenhaTemporaria(){
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let out = ''; for(let i=0;i<8;i++) out += chars[Math.floor(Math.random()*chars.length)];
  return out;
}

async function alunoResetarSenha(){
  const s = getActive(); if(!s || !s.perfil?.email) { alert('Preenche o e-mail do aluno primeiro.'); return; }
  if(alunoTravado(s)){ alert('Cadastro em transferência: só visualização.'); return; }
  const digitada = prompt('Senha temporária pra esse aluno (mínimo 6 caracteres).\nDeixe em branco pra eu gerar uma:');
  if(digitada === null) return; // cancelou
  const senha = digitada.trim() || _gerarSenhaTemporaria();
  if(senha.length < 6){ alert('Senha precisa de pelo menos 6 caracteres.'); return; }

  const { data, error } = await supa.functions.invoke('trainer-transferencia', {
    body: { acao: 'definir-senha', email: s.perfil.email, novaSenha: senha },
  });
  if(error){ alert('Erro ao definir senha: '+await msgErroFuncao(error)); return; }

  s.perfil.alunoUserId = data.alunoUserId;
  s.perfil.portalStatus = s.perfil.portalStatus || 'ativo';
  renderPortalStatusBadge(s);
  try{ localStorage.setItem(lsKey('acm-students'), JSON.stringify(students)); }catch(e){}
  if(typeof supaAutoSave==='function') supaAutoSave();

  alert('Senha definida: '+senha+'\n\nRepassa pro aluno (WhatsApp, etc). Ele pode trocar em "Minhas informações" dentro do Portal quando quiser.');
}

async function alunoTogglePortalStatus(){
  const s = getActive(); if(!s || !s.perfil?.alunoUserId || !_supaUser) return;
  if(alunoTravado(s)){ alert('Cadastro em transferência: só visualização.'); return; }
  const novo = s.perfil.portalStatus === 'bloqueado' ? 'ativo' : 'bloqueado';
  if(novo==='bloqueado' && !confirm('Bloquear o acesso deste aluno ao Portal? Ele continua logando, mas vê uma tela de acesso bloqueado até você liberar de novo.')) return;
  const { error } = await supa.from('alunos_acesso').update({ status: novo })
    .eq('trainer_user_id', _supaUser.id).eq('aluno_user_id', s.perfil.alunoUserId);
  if(error){ alert('Erro ao atualizar acesso: '+error.message); return; }
  s.perfil.portalStatus = novo;
  renderPortalStatusBadge(s);
  try{ localStorage.setItem(lsKey('acm-students'), JSON.stringify(students)); }catch(e){}
  if(typeof supaAutoSave==='function') supaAutoSave();
}

// Voltar pra aba/janela depois de um tempo: reconsulta os pedidos (e roda prazos vencidos).
// Evita ficar com a lista de alunos velha se uma troca aconteceu enquanto o painel estava aberto.
let _transfUltimaConsulta = 0;
document.addEventListener('visibilitychange', ()=>{
  if(document.visibilityState !== 'visible' || !_supaUser) return;
  if(Date.now() - _transfUltimaConsulta < 120000) return;
  _transfUltimaConsulta = Date.now();
  carregarPortalTransferencias();
});
