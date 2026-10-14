// ══════════════════════════════════════════════════════════════════════════
// PORTAL DO ALUNO — marca do personal (nome do app, ícone, logo, cor, studio, foto)
// ══════════════════════════════════════════════════════════════════════════
// Os dados vêm de funções públicas do Supabase (supabase/sql/marca-link.sql):
//   marca_do_link(codigo)  tela de login/cadastro, antes de o aluno ter sessão (?c= ou ?p=)
//   marca_do_aluno()       aluno logado que abriu o portal por um link sem código
// Nada aqui lê dado de aluno. Todo texto vem de campo com CHECK no banco e passa de novo por
// marcaNomeLimpo(); entra na página só por textContent / className validado (nunca innerHTML).
// Logo e foto só entram se a URL passar em marcaUrlImagemOk() (bucket "marca" do próprio projeto).
// Depende de ../js/marca.js. Sem marca configurada, o portal continua exatamente como era.

const MARCA_PORTAL_LS = 'fitcpx-marca-portal';
let _marcaPortal = null;   // última marca aplicada ({nome_app, cor, icone, studio, personal, logo_url, foto_url})

function _mpTexto(v, max){ return String(v == null ? '' : v).replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max); }

// Ícone de instalação: logo do personal centralizada sobre fundo branco; se a imagem não puder ser lida
// (rede, CORS), cai para a inicial do nome sobre a cor.
function _mpCarregarImagem(url){
  return new Promise(res => {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => res(img); img.onerror = () => res(null); img.src = url;
  });
}
function _mpIconePng(cor, inicial, tam, imagem){
  try{
    const c = document.createElement('canvas'); c.width = c.height = tam;
    const g = c.getContext('2d'); if(!g) return null;
    g.beginPath();
    if(g.roundRect) g.roundRect(0, 0, tam, tam, tam * 0.22); else g.rect(0, 0, tam, tam);
    if(imagem){
      g.fillStyle = '#ffffff'; g.fill();
      const area = tam * 0.76, k = Math.min(area / imagem.width, area / imagem.height);
      const w = imagem.width * k, h = imagem.height * k;
      g.drawImage(imagem, (tam - w) / 2, (tam - h) / 2, w, h);
    } else {
      g.fillStyle = cor; g.fill();
      g.fillStyle = marcaCalcular(cor).claro['--on-primary'];
      g.font = '700 ' + Math.round(tam * 0.56) + 'px system-ui,sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(inicial, tam / 2, tam / 2 + tam * 0.03);
    }
    return c.toDataURL('image/png');
  }catch(e){ return null; }
}

// Manifest e ícone de "Adicionar à tela inicial" com o nome, a cor e a logo do personal.
async function _mpManifest(nome, cor, codigo, logoUrl){
  try{
    const base = location.origin + location.pathname;
    const inicial = (nome.match(/[A-Za-zÀ-ÿ0-9]/) || ['F'])[0].toUpperCase();
    const imagem = logoUrl ? await _mpCarregarImagem(logoUrl) : null;
    const i192 = _mpIconePng(cor, inicial, 192, imagem), i512 = _mpIconePng(cor, inicial, 512, imagem), i180 = _mpIconePng(cor, inicial, 180, imagem);
    const manifesto = {
      id: base, name: nome + ' | Portal do Aluno', short_name: nome.slice(0, 12), start_url: base + (codigo ? '?p=' + encodeURIComponent(codigo) : ''),
      scope: base, display: 'standalone', background_color: '#121212', theme_color: cor,
      icons: [i192 && { src:i192, sizes:'192x192', type:'image/png', purpose:'any' }, i512 && { src:i512, sizes:'512x512', type:'image/png', purpose:'any' }].filter(Boolean),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(manifesto)], { type:'application/manifest+json' }));
    let ln = document.querySelector('link[rel=manifest]');
    if(!ln){ ln = document.createElement('link'); ln.rel = 'manifest'; document.head.appendChild(ln); }
    ln.href = url;
    if(i180){
      let ap = document.querySelector('link[rel=apple-touch-icon]');
      if(!ap){ ap = document.createElement('link'); ap.rel = 'apple-touch-icon'; document.head.appendChild(ap); }
      ap.href = i180;
    }
  }catch(e){}
}

function _mpImg(url){
  const img = document.createElement('img');
  img.alt = ''; img.decoding = 'async'; img.referrerPolicy = 'no-referrer'; img.src = url;
  return img;
}

// Quadradinho do cabeçalho: logo (imagem) ou ícone.
function _mpMarcaDoTopo(icone, logoUrl){
  document.querySelectorAll('.topo-mark').forEach(mk => {
    mk.textContent = '';
    if(logoUrl){ mk.classList.add('com-logo'); mk.appendChild(_mpImg(logoUrl)); }
    else {
      mk.classList.remove('com-logo');
      const i = document.createElement('i'); i.className = icone || 'ph-barbell'; mk.appendChild(i);
    }
  });
}

// Foto e nome do personal: avatar da tela de cadastro e cartão "Seu personal" no Início.
function _mpPersonal(personal, studio, fotoUrl){
  const av = document.getElementById('cad-av');
  if(av){ av.textContent = ''; if(fotoUrl) av.appendChild(_mpImg(fotoUrl)); else av.textContent = (personal || 'P').charAt(0).toUpperCase(); }
  const caixa = document.getElementById('inicio-personal');
  if(!caixa) return;
  caixa.textContent = '';
  if(!personal && !fotoUrl) return;
  const card = document.createElement('div'); card.className = 'card personal-card';
  const f = document.createElement('span'); f.className = 'personal-av';
  if(fotoUrl) f.appendChild(_mpImg(fotoUrl)); else f.textContent = (personal || 'P').charAt(0).toUpperCase();
  const t = document.createElement('div');
  const peq = document.createElement('small'); peq.textContent = 'Seu personal';
  const nome = document.createElement('b'); nome.textContent = personal || '';
  t.appendChild(peq); if(personal) t.appendChild(nome);
  if(studio){ const s = document.createElement('small'); s.textContent = studio; t.appendChild(s); }
  card.appendChild(f); card.appendChild(t); caixa.appendChild(card);
}

// m: objeto devolvido pelas funções do banco. codigo: o código do link, se veio por ele.
function marcaPortalAplicar(m, codigo){
  if(!m || typeof m !== 'object') return false;
  const nomeApp = marcaNomeLimpo(m.nome_app);
  const cor = marcaHexOk(m.cor) ? m.cor.toLowerCase() : '';
  const icone = marcaIconeOk(m.icone) ? m.icone : '';
  const studio = _mpTexto(m.studio, 60);
  const logoUrl = marcaUrlImagemOk(m.logo_url) ? m.logo_url : '';
  const fotoUrl = marcaUrlImagemOk(m.foto_url) ? m.foto_url : '';
  const personal = _mpTexto(m.personal, 80);
  if(!nomeApp && !cor && !icone && !studio && !logoUrl && !fotoUrl) return false;   // nada configurado: portal padrão

  const nome = nomeApp || 'FitCPX';
  marcaAplicar(cor);
  document.querySelectorAll('.topo-logo').forEach(e => { e.textContent = nome; });
  document.querySelectorAll('.topo-sub').forEach(e => { e.textContent = studio || 'Portal do Aluno'; });
  _mpMarcaDoTopo(icone, logoUrl);
  _mpPersonal(personal, studio, fotoUrl);
  document.title = nome + ' | Portal do Aluno';
  if(nomeApp || cor || logoUrl) _mpManifest(nome, cor || MARCA_COR_PADRAO, codigo || '', logoUrl);
  _marcaPortal = { nome_app:nomeApp, cor, icone, studio, personal, logo_url:logoUrl, foto_url:fotoUrl };
  return true;
}

function marcaPortalGuardar(){
  try{ localStorage.setItem(MARCA_PORTAL_LS, JSON.stringify(_marcaPortal)); }catch(e){}
}
// O personal tirou a marca (ou o aparelho guardava a de outro): volta ao portal padrão do FitCPX.
function marcaPortalPadrao(){
  marcaRemover();
  document.querySelectorAll('.topo-logo').forEach(e => { e.textContent = 'FitCPX'; });
  document.querySelectorAll('.topo-sub').forEach(e => { e.textContent = 'Portal do Aluno'; });
  _mpMarcaDoTopo('ph-barbell', '');
  _mpPersonal('', '', '');
  document.title = 'Portal do Aluno | FitCPX';
  const ln = document.querySelector('link[rel=manifest]'); if(ln) ln.href = 'manifest.json';
  const ap = document.querySelector('link[rel=apple-touch-icon]'); if(ap) ap.href = '../icons/apple-touch-icon.png';
  try{ localStorage.removeItem(MARCA_PORTAL_LS); }catch(e){}
  _marcaPortal = null;
}
// Resposta do servidor: aplica e guarda; se vier sem nada configurado, volta ao padrão
// (mas o nome do personal, se veio, ainda aparece no cartão "Seu personal").
function _mpResolver(data, codigo){
  if(!data || typeof data !== 'object') return;
  if(marcaPortalAplicar(data, codigo)) marcaPortalGuardar();
  else { marcaPortalPadrao(); _mpPersonal(_mpTexto(data.personal, 80), '', ''); }
}

// Abertura sem código no link: usa a última marca vista neste aparelho até a confirmação do servidor.
function marcaPortalDoCache(){
  try{ const m = JSON.parse(localStorage.getItem(MARCA_PORTAL_LS) || 'null'); if(m) marcaPortalAplicar(m); }catch(e){}
}
async function marcaPortalDoLink(codigo){
  try{
    const { data } = await supa.rpc('marca_do_link', { p_codigo:codigo });
    _mpResolver(data, codigo);
  }catch(e){}
}
// Aluno logado (link sem código): descobre o personal pelo vínculo.
async function marcaPortalDoAluno(){
  try{
    const { data } = await supa.rpc('marca_do_aluno');
    _mpResolver(data, '');
  }catch(e){}
}
