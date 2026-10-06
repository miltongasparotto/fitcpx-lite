// ══════════════════════════════════════════════════════════════════════════
// PORTAL DO ALUNO — cliente Supabase + helpers de DOM
// ══════════════════════════════════════════════════════════════════════════
// Mesma URL/chave pública (anon/publishable) do painel do trainer — não é
// segredo, é a chave de acesso do navegador, protegida pelas RLS de cada
// tabela (ver supabase/sql/onboarding-aluno.sql). Nenhum token secreto aqui.
const SUPA_URL = 'https://subqjcnztqzprtpqqrlt.supabase.co';
const SUPA_KEY = 'sb_publishable_TpGanQ5F3BP082ptzYpYyQ_XyLU1l65';
// storageKey própria — sem isto, este app e o painel do trainer (mesma URL/
// chave) brigam pelo mesmo slot de sessão no localStorage quando servidos da
// mesma origem (ex.: GitHub Pages com painel em / e portal em /aluno/), e
// logar num desloga o outro.
const supa = window.supabase.createClient(SUPA_URL, SUPA_KEY, {
  auth: { storageKey: 'fitcpx-aluno-auth' },
});

let _alunoUser = null;      // usuário logado (Supabase auth)
let _alunoAcesso = null;    // linha de alunos_acesso (trainer_user_id, status...)
let _alunoCodigo = null;    // código do link (?c=) resolvido nesta sessão

const $ = id => document.getElementById(id);
const show = id => { const el=$(id); if(el) el.classList.remove('hidden'); };
const hide = id => { const el=$(id); if(el) el.classList.add('hidden'); };
const val = id => $(id) ? $(id).value : '';
const setVal = (id, v) => { if($(id)) $(id).value = v || ''; };
const toggle = (id, cond) => cond ? show(id) : hide(id);

const TELAS = [
  'tela-carregando','tela-entrada','tela-login-email','tela-login-senha',
  'tela-cadastro','tela-cadastro-basico','tela-conflito','tela-conta',
  'tela-aviso','tela-bloqueado','tela-app',
];
function irPara(tela){ TELAS.forEach(t => t===tela ? show(t) : hide(t)); }

function escHTML(str){
  return String(str==null?'':str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
