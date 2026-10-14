// ══════════════════════════════════════════════════════════════════════════
// MARCA — cor do sistema e identidade do portal do aluno (painel e portal)
// ══════════════════════════════════════════════════════════════════════════
// O personal escolhe UMA cor (Configurações > Marca). Daqui saem sozinhas as
// outras 7 do grupo --primary-* de css/tokens.css, nos temas claro e escuro,
// com o texto garantido legível (contraste mínimo 4,5:1 sobre o fundo).
// A logo do FitCPX no painel não muda; só a cor. No portal do aluno a marca do
// personal (nome do app, ícone, cor) tem destaque.
// Arquivo compartilhado: carregado por index.html e por aluno/index.html.
// Sem dependência de DB, do painel ou do Supabase.

const MARCA_COR_PADRAO = '#3dbb6e';
const MARCA_COR_PADRAO_ANTIGA = '#22c55e';   // valor salvo por quem escolheu "Verde" antes de 14/10/2026: vale como o padrão
function marcaEhPadrao(h){ h = String(h || '').toLowerCase(); return h === MARCA_COR_PADRAO || h === MARCA_COR_PADRAO_ANTIGA; }

const MARCA_CORES = [
  { nome:'Verde',    hex:'#3dbb6e' },
  { nome:'Azul',     hex:'#3b82f6' },
  { nome:'Índigo',   hex:'#6366f1' },
  { nome:'Roxo',     hex:'#8b5cf6' },
  { nome:'Rosa',     hex:'#ec4899' },
  { nome:'Vermelho', hex:'#ef4444' },
  { nome:'Laranja',  hex:'#f97316' },
  { nome:'Âmbar',    hex:'#f59e0b' },
  { nome:'Turquesa', hex:'#14b8a6' },
  { nome:'Grafite',  hex:'#475569' },
];

const MARCA_ICONES = ['ph-barbell','ph-heartbeat','ph-person-simple-run','ph-lightning','ph-fire','ph-trophy',
  'ph-target','ph-star','ph-flag','ph-heart','ph-plant','ph-mountains','ph-medal','ph-sneaker','ph-hand-fist',
  'ph-person-simple-tai-chi','ph-bowl-food','ph-scales','ph-timer','ph-sparkle','ph-crown','ph-shield-check',
  'ph-rocket-launch','ph-bicycle'];

// Superfícies dos temas (iguais às de css/tokens.css; cinza neutro, proposta B do modo escuro).
const MARCA_ESCURO_SUPERFICIE = '#1e1e1e';
const MARCA_ESCURO_FUNDO = '#121212';
const MARCA_CLARO_SUPERFICIE = '#ffffff';

// ── Cor: matemática básica ──────────────────────────────────────────────────
function marcaHexOk(h){ return typeof h === 'string' && /^#[0-9a-fA-F]{6}$/.test(h); }
function _mcRgb(h){ return [1,3,5].map(i => parseInt(h.slice(i, i+2), 16)); }
function _mcHex(r, g, b){
  return '#' + [r,g,b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
function _mcLum(h){
  const c = _mcRgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function marcaContraste(a, b){
  const la = _mcLum(a), lb = _mcLum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
// mistura: devolve base*(1-t) + cor*t
function _mcMix(base, cor, t){
  const a = _mcRgb(base), b = _mcRgb(cor);
  return _mcHex(a[0]*(1-t) + b[0]*t, a[1]*(1-t) + b[1]*t, a[2]*(1-t) + b[2]*t);
}
function _mcHsl(h){
  let [r,g,b] = _mcRgb(h).map(v => v / 255);
  const mx = Math.max(r,g,b), mn = Math.min(r,g,b), l = (mx + mn) / 2;
  let hh = 0, s = 0;
  if(mx !== mn){
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    hh /= 6;
  }
  return [hh, s, l];
}
function _mcDeHsl(h, s, l){
  const f = (p, q, t) => {
    if(t < 0) t += 1; if(t > 1) t -= 1;
    if(t < 1/6) return p + (q - p) * 6 * t;
    if(t < 1/2) return q;
    if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  if(s === 0) return _mcHex(l*255, l*255, l*255);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  return _mcHex(f(p, q, h + 1/3) * 255, f(p, q, h) * 255, f(p, q, h - 1/3) * 255);
}
function _mcLuz(hex, delta){
  const [h, s, l] = _mcHsl(hex);
  return _mcDeHsl(h, s, Math.max(0, Math.min(1, l + delta)));
}
// Clareia (dir=+1) ou escurece (dir=-1) até o contraste com `fundo` chegar a `minimo`.
function _mcAjustar(hex, fundo, minimo, dir){
  let c = hex;
  for(let i = 0; i < 60 && marcaContraste(c, fundo) < minimo; i++) c = _mcLuz(c, dir * 0.02);
  return c;
}
function _mcRgba(hex, a){ const c = _mcRgb(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
function _mcTextoSobre(hex){ return marcaContraste(hex, '#ffffff') >= 3 ? '#ffffff' : '#13201a'; }

// Valores originais de css/tokens.css para a cor padrão (a derivação não mexe no visual de quem não personaliza).
// O verde padrão (#3dbb6e) é o MESMO nos dois temas e o texto do botão é escuro (7,5:1). Só o texto/ícone verde muda de tom
// (escuro no claro, claro no escuro) para ler bem sobre cada fundo.
const MARCA_ORIGINAL = {
  claro: { '--primary':'#3dbb6e', '--primary-hover':'#34a561', '--primary-ink':'#15783b', '--primary-soft':'#e4f2e9', '--primary-tint':'#eff7f2',
           '--primary-line':'#b9dcc5', '--primary-ring':'rgba(61,187,110,.28)', '--on-primary':'#06180d', '--accent2':'#166534', '--accent-text':'#06180d', '--on-accent2':'#ffffff' },
  escuro:{ '--primary':'#3dbb6e', '--primary-hover':'#34a561', '--primary-ink':'#6fd69a', '--primary-soft':'#23372b', '--primary-tint':'#16231b',
           '--primary-line':'#285038', '--primary-ring':'rgba(61,187,110,.3)', '--on-primary':'#06180d', '--accent2':'#b5e8c9', '--accent-text':'#06180d', '--on-accent2':'#00210c' },
};

// Tokens derivados de uma cor escolhida. Puro: só devolve os valores (usado também nos testes).
//   preenchimento: a cor vira um tom médio (saturação até 62%, claridade entre 48% e 64%), igual nos dois temas, e clareia só o
//                  necessário para o texto escuro do botão ter 4,5:1;
//   texto/ícone  : claro = escurece até 4,8:1 sobre o fundo de selo; escuro = clareia até 6,5:1 sobre o fundo de selo.
function marcaCalcular(hex){
  if(marcaEhPadrao(hex)) return { claro:Object.assign({}, MARCA_ORIGINAL.claro), escuro:Object.assign({}, MARCA_ORIGINAL.escuro) };
  const BRANCO = '#ffffff';
  const [h, s, l] = _mcHsl(hex);
  const sat = Math.min(s, 0.62);
  const texto = _mcDeHsl(h, 0.4, 0.07);
  let fill = _mcDeHsl(h, sat, Math.min(Math.max(l, 0.48), 0.64));
  for(let i = 0; i < 40 && marcaContraste(texto, fill) < 4.5; i++) fill = _mcLuz(fill, 0.02);
  const [, , lf] = _mcHsl(fill);
  const hover = _mcLuz(fill, -0.06);

  const softC = _mcMix(BRANCO, fill, 0.12);
  const claro = {
    '--primary': fill,
    '--primary-hover': hover,
    '--primary-ink': _mcAjustar(fill, softC, 4.8, -1),
    '--primary-soft': softC,
    '--primary-tint': _mcMix(BRANCO, fill, 0.06),
    '--primary-line': _mcMix(BRANCO, fill, 0.3),
    '--primary-ring': _mcRgba(fill, 0.28),
    '--on-primary': texto,
    '--accent2': _mcAjustar(fill, BRANCO, 7, -1),
    '--accent-text': texto,
    '--on-accent2': BRANCO,
  };

  const softE = _mcMix(MARCA_ESCURO_SUPERFICIE, fill, 0.16);
  const inkE = _mcAjustar(_mcDeHsl(h, sat, Math.min(lf + 0.1, 0.78)), softE, 6.5, +1);
  const escuro = {
    '--primary': fill,
    '--primary-hover': hover,
    '--primary-ink': inkE,
    '--primary-soft': softE,
    '--primary-tint': _mcMix(MARCA_ESCURO_FUNDO, fill, 0.1),
    '--primary-line': _mcMix(MARCA_ESCURO_SUPERFICIE, fill, 0.32),
    '--primary-ring': _mcRgba(fill, 0.3),
    '--on-primary': texto,
    '--accent2': _mcMix(inkE, BRANCO, 0.3),
    '--accent-text': texto,
    '--on-accent2': texto,
  };
  return { claro, escuro };
}

function _mcBloco(seletor, vars){
  return seletor + '{' + Object.keys(vars).map(k => k + ':' + vars[k]).join(';') + '}';
}
function marcaCss(hex){
  const v = marcaCalcular(hex);
  return _mcBloco(':root', v.claro) + '\n' + _mcBloco(':root.dark', v.escuro);
}

// ── Aplicação no documento ──────────────────────────────────────────────────
function marcaRemover(){
  if(typeof document === 'undefined') return;
  const el = document.getElementById('marca-vars'); if(el) el.remove();
}
// Cor inválida ou igual à padrão: remove o estilo e o sistema volta aos tokens originais.
function marcaAplicar(hex){
  if(typeof document === 'undefined') return;
  if(!marcaHexOk(hex) || marcaEhPadrao(hex)){ marcaRemover(); return false; }
  let el = document.getElementById('marca-vars');
  if(!el){ el = document.createElement('style'); el.id = 'marca-vars'; document.head.appendChild(el); }
  el.textContent = marcaCss(hex.toLowerCase());
  return true;
}

// Nome do app: texto simples, sem marcação, no máximo 40 caracteres.
function marcaNomeLimpo(s){
  return String(s == null ? '' : s).replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
}
function marcaIconeOk(n){ return typeof n === 'string' && MARCA_ICONES.includes(n); }

// Imagens do personal (logo e foto) ficam no bucket público "marca" do Supabase, numa pasta com o id dele.
// Só uma URL nesse formato entra em <img src>: nada de endereço de fora, data: nem javascript:.
// (O banco tem a mesma regra em CHECK; ver supabase/sql/marca-link.sql.)
const MARCA_URL_IMAGEM = new RegExp('^https://[a-z0-9-]+\\.supabase\\.co/storage/v1/object/public/marca/[0-9a-f-]{36}/(logo|foto)-[a-z0-9]{6,32}\\.(webp|png)$', 'i');
function marcaUrlImagemOk(u){ return typeof u === 'string' && u.length < 300 && MARCA_URL_IMAGEM.test(u); }
// Caminho do arquivo dentro do bucket ("<id>/logo-abc.webp") a partir da URL pública, ou '' se não for uma URL válida.
function marcaCaminhoDaUrl(u){ return marcaUrlImagemOk(u) ? u.split('/object/public/marca/')[1] : ''; }
// Tipo real do arquivo pelos primeiros bytes (a extensão e o type do navegador não bastam): 'png' | 'jpeg' | 'webp' | ''.
function marcaTipoPorBytes(b){
  if(!b || b.length < 12) return '';
  if(b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'png';
  if(b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'jpeg';
  if(b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'webp';
  return '';
}

if(typeof module !== 'undefined' && module.exports){
  module.exports = { MARCA_CORES, MARCA_ICONES, MARCA_COR_PADRAO, marcaEhPadrao, marcaCalcular, marcaCss, marcaContraste, marcaHexOk, marcaNomeLimpo, marcaIconeOk, marcaUrlImagemOk, marcaCaminhoDaUrl, marcaTipoPorBytes };
}
