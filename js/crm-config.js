// ══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÕES DO PERSONAL — Perfil · Marca · Regras e prazos
// ══════════════════════════════════════════════════════════════════════════
// Tudo mora em DB.config (blob 'crm' do app_data; criado em js/crm-store.js).
// Regra do projeto: só existe campo aqui se algum motor lê o valor.
//   Perfil   -> {studio} {personal} {cref} {whatsappStudio} nas mensagens (js/crm-whatsapp.js),
//               DDI padrão dos envios (js/mensagens-wa.js), saudação do Painel e nome na lateral.
//   Marca    -> cor do sistema (js/marca.js) e identidade do portal do aluno
//               (publicada em personal_links; o portal lê por marca_do_link / marca_do_aluno).
//   Regras   -> prazos de urgência (crm-tarefas.js), janelas e validade do treino
//               (treinos-store.js, dashboard.js, prescricao-motor.js), revisão de parados
//               (crm-alunos.js) e "aluno novo" (dashboard.js, wa-regras.js).
// Mensagens de WhatsApp (modelos e fila) ficam na tela WhatsApp; aqui só o telefone do studio.
// Backup/exportação de dados NÃO fica aqui (tela própria, fase futura).

let _cfgTab = 'perfil';          // 'perfil' | 'marca' | 'regras'
let _cfgMarca = null;            // rascunho da marca enquanto o personal escolhe (só vale ao salvar)

function _cfgAba(tab){ _cfgTab = tab; renderConfigCRM(); }

function renderConfigCRM(){
  const el = $('screen-config-body'); if(!el) return;
  const abas = [['perfil','ph-identification-card','Perfil'], ['marca','ph-palette','Marca'], ['regras','ph-sliders-horizontal','Regras e prazos']];
  const tabs = '<div class="seg" style="margin-bottom:16px">' + abas.map(a =>
    '<button class="seg-btn' + (_cfgTab === a[0] ? ' active' : '') + '" onclick="_cfgAba(\'' + a[0] + '\')"><i class=' + a[1] + '></i>' + a[2] + '</button>').join('') + '</div>';
  const corpo = _cfgTab === 'marca' ? _cfgHtmlMarca() : _cfgTab === 'regras' ? _cfgHtmlRegras() : _cfgHtmlPerfil();
  el.innerHTML = tabs + corpo;
  if(_cfgTab === 'perfil') _cfgPreencherNomeDoPortal();
}

function _cfgCampo(id, rotulo, valor, opc){
  opc = opc || {};
  return '<div class="field' + (opc.span ? ' cfg-span' : '') + '"><label for="' + id + '">' + rotulo + '</label>' +
    '<input id="' + id + '" type="' + (opc.tipo || 'text') + '" value="' + escHTML(valor || '') + '" placeholder="' + escHTML(opc.ph || '') + '" maxlength="' + (opc.max || 80) + '">' +
    (opc.dica ? '<div class="field-sub">' + opc.dica + '</div>' : '') + '</div>';
}
function _cfgSalvoEm(){ return DB.config._savedAt ? 'Salvo às ' + DB.config._savedAt : ''; }
function _cfgCarimbo(){ DB.config._savedAt = new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }); }

// ── Perfil ──────────────────────────────────────────────────────────────────
function _cfgHtmlPerfil(){
  const c = DB.config;
  return '<div class="card">' +
    '<div class="card-title"><i class=ph-identification-card></i> Perfil do personal e do studio</div>' +
    '<div class="field-sub" style="margin-bottom:12px">Aparece nas mensagens de WhatsApp (variáveis {studio}, {personal}, {cref}) e para os alunos no portal.</div>' +
    '<div class="cfg-grid">' +
    '<div class="field cfg-span"><label>Foto</label>' + _cfgImagemHtml('foto') + '</div>' +
    _cfgCampo('cfg-studio', 'Nome do studio', c.studioName === 'FitCPX Lite' ? '' : c.studioName, { ph:'Ex: Studio Movimento' }) +
    _cfgCampo('cfg-name', 'Seu nome (é o nome que o aluno vê)', c.personalName, { ph:'Ex: João Silva', dica:'Aparece também nos avisos de transferência entre personais.' }) +
    _cfgCampo('cfg-cref', 'CREF', c.cref, { ph:'Ex: 012345-G/SP', max:30 }) +
    '<div class="field"><label for="cfg-wa">WhatsApp do studio</label><div style="display:flex;gap:8px">' +
      '<select id="cfg-ddi" style="width:auto;max-width:150px" aria-label="DDI">' + crmDdiOptions(c.waCountryCode) + '</select>' +
      '<input id="cfg-wa" type="text" inputmode="tel" value="' + escHTML(c.whatsapp) + '" placeholder="(11) 99999-0000" maxlength="20" style="flex:1"></div>' +
      '<div class="field-sub">O DDI escolhido é o padrão dos envios aos seus alunos.</div></div>' +
    _cfgCampo('cfg-email', 'E-mail de contato', c.email, { tipo:'email', ph:'voce@email.com', max:120 }) +
    _cfgCampo('cfg-insta', 'Instagram', c.instagram, { ph:'@seuperfil', max:60 }) +
    _cfgCampo('cfg-cidade', 'Cidade', c.cidade, { ph:'Ex: São Paulo - SP', max:80 }) +
    _cfgCampo('cfg-end', 'Endereço do studio', c.endereco, { ph:'Rua, número, bairro', max:160, span:true }) +
    '<div class="field cfg-span"><label for="cfg-bio">Apresentação curta</label><textarea id="cfg-bio" maxlength="280" style="min-height:76px" placeholder="Uma ou duas frases sobre o seu trabalho">' + escHTML(c.bio) + '</textarea></div>' +
    '</div>' +
    '<div class="btn-row" style="justify-content:flex-start">' +
      '<button class="btn btn-primary" onclick="cfgSalvarPerfil()"><i class=ph-check-circle></i> Salvar perfil</button>' +
      '<span id="cfg-saved-at" style="font-size:12px;color:var(--text3);align-self:center">' + _cfgSalvoEm() + '</span></div>' +
  '</div>';
}

// O nome que o aluno vê já pode estar salvo em Portal do Aluno (antes do Perfil existir): traz para o campo.
async function _cfgPreencherNomeDoPortal(){
  const campo = $('cfg-name');
  if(!campo || campo.value.trim() || typeof supa === 'undefined' || !_supaUser) return;
  try{
    const { data } = await supa.from('personal_links').select('nome_exibicao').eq('trainer_user_id', _supaUser.id).maybeSingle();
    const n = data && data.nome_exibicao;
    if(n){ _portalNomeExibicao = n; const c2 = $('cfg-name'); if(c2 && !c2.value.trim()) c2.value = n; }
  }catch(e){}
}

async function cfgSalvarPerfil(){
  const v = id => ($(id) ? $(id).value.trim() : '');
  const email = v('cfg-email');
  if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ crmToast('E-mail inválido', 'err'); return; }
  const tel = v('cfg-wa').replace(/\D/g, '');
  if(tel && tel.length < 10){ crmToast('WhatsApp incompleto: informe o DDD e o número', 'err'); return; }
  const ddi = $('cfg-ddi').value || '55';
  const pais = CRM_DDI_LIST.find(p => p.code === ddi) || CRM_DDI_LIST[0];
  const c = DB.config;
  Object.assign(c, {
    studioName: v('cfg-studio') || 'FitCPX Lite', personalName: v('cfg-name'), cref: v('cfg-cref'),
    whatsapp: v('cfg-wa'), waCountryCode: pais.code, waCountryFlag: pais.flag, waCountryName: pais.name,
    email, instagram: v('cfg-insta'), cidade: v('cfg-cidade'), endereco: v('cfg-end'), bio: v('cfg-bio'),
  });
  _cfgCarimbo();
  crmSave();
  if(typeof marcaAplicarConfig === 'function') marcaAplicarConfig();
  if(typeof updateBadges === 'function') updateBadges();
  let aviso = '';
  await Carregando.durante('Salvando o perfil...', async () => {
    if(c.personalName && c.personalName !== _portalNomeExibicao && typeof chamarTrainerFn === 'function' && _supaUser){
      try{ await chamarTrainerFn('definir-nome', { nome:c.personalName }); _portalNomeExibicao = c.personalName; }
      catch(e){ aviso = 'O nome ainda não foi atualizado para os alunos: ' + e.message; }
    }
    const r = await marcaPublicar();
    if(!r.ok && !aviso) aviso = r.msg;
  });
  const el = $('cfg-saved-at'); if(el) el.textContent = _cfgSalvoEm();
  crmToast(aviso ? 'Perfil salvo. ' + aviso : 'Perfil salvo!', aviso ? 'err' : undefined);
}

// ── Marca ───────────────────────────────────────────────────────────────────
function _cfgHtmlMarca(){
  const m = DB.config.marca || {};
  if(!_cfgMarca) _cfgMarca = { nomeApp:m.nomeApp || '', cor:m.cor || MARCA_COR_PADRAO, icone:m.icone || 'ph-barbell' };
  const d = _cfgMarca;
  const cores = MARCA_CORES.map(k => '<button type="button" class="mc-sw' + (d.cor.toLowerCase() === k.hex ? ' on' : '') + '" style="background:' + k.hex +
    '" onclick="cfgMarcaCor(\'' + k.hex + '\')" title="' + k.nome + '" aria-label="' + k.nome + '"></button>').join('');
  const icones = MARCA_ICONES.map(n => '<button type="button" class="mc-ic' + (d.icone === n ? ' on' : '') + '" onclick="cfgMarcaIcone(\'' + n + '\')" aria-label="' + n.slice(3) + '"><i class=' + n + '></i></button>').join('');
  return '<div class="card">' +
    '<div class="card-title"><i class=ph-palette></i> Marca</div>' +
    '<div class="field-sub" style="margin-bottom:14px">A cor muda o sistema inteiro e o portal do aluno. O nome do app e o ícone aparecem no portal, onde a sua marca tem destaque. A logo do FitCPX no painel não muda.</div>' +
    '<div class="cfg-marca"><div class="cfg-marca-form">' +
    '<div class="field"><label for="cfg-app-nome">Nome do app do aluno</label>' +
      '<input id="cfg-app-nome" type="text" maxlength="40" value="' + escHTML(d.nomeApp) + '" placeholder="FitCPX" oninput="cfgMarcaNome(this.value)">' +
      '<div class="field-sub">Sem nome, o portal mostra "FitCPX".</div></div>' +
    '<div class="field"><label>Logo do app (opcional)</label>' + _cfgImagemHtml('logo') + '</div>' +
    '<div class="field"><label>Cor</label><div class="mc-swatches">' + cores +
      '<label class="mc-custom" title="Cor personalizada"><input type="color" id="cfg-cor-livre" value="' + d.cor + '" oninput="cfgMarcaCor(this.value)"><span>Outra</span></label></div></div>' +
    '<div class="field"><label>Ícone do app</label><div class="mc-icons">' + icones + '</div></div>' +
    '</div><div class="cfg-marca-side"><div class="field"><label>Pré-visualização do portal</label><div class="mc-prevs" id="cfg-marca-prev">' + _cfgPreviewHtml() + '</div></div></div></div>' +
    '<div class="btn-row" style="justify-content:flex-start">' +
      '<button class="btn btn-primary" onclick="cfgSalvarMarca()"><i class=ph-check-circle></i> Salvar marca</button>' +
      '<button class="btn btn-ghost" onclick="cfgMarcaRestaurar()">Voltar ao padrão</button>' +
      '<span id="cfg-saved-at" style="font-size:12px;color:var(--text3);align-self:center">' + _cfgSalvoEm() + '</span></div>' +
  '</div>';
}

function _cfgPreviewHtml(){
  const d = _cfgMarca; const v = marcaCalcular(d.cor.toLowerCase());
  const nome = marcaNomeLimpo(d.nomeApp) || 'FitCPX';
  const logo = marcaUrlImagemOk((DB.config.marca || {}).logoUrl) ? DB.config.marca.logoUrl : '';
  const sub = (DB.config.studioName && DB.config.studioName !== 'FitCPX Lite') ? DB.config.studioName : 'Portal do Aluno';
  const bloco = (vars, bg, fg, rotulo) => '<div class="mc-prev" style="' + Object.keys(vars).map(k => k + ':' + vars[k]).join(';') + ';background:' + bg + ';color:' + fg + '">' +
    '<div class="mc-prev-topo"><span class="mc-prev-mark' + (logo ? ' com-logo' : '') + '">' + (logo ? '<img src="' + escHTML(logo) + '" alt="">' : '<i class=' + d.icone + '></i>') + '</span><span><b>' + escHTML(nome) + '</b><small>' + escHTML(sub) + '</small></span></div>' +
    '<div class="mc-prev-corpo"><span class="mc-prev-chip">Treino de hoje</span><span class="mc-prev-btn">Entrar</span></div>' +
    '<div class="mc-prev-rot">' + rotulo + '</div></div>';
  return bloco(v.claro, '#f5f5f5', '#1f1f1f', 'Claro') + bloco(v.escuro, '#121212', '#dedede', 'Escuro');
}
function _cfgMarcaRedesenhar(){
  const p = $('cfg-marca-prev'); if(p) p.innerHTML = _cfgPreviewHtml();
  document.querySelectorAll('.mc-sw').forEach((b, i) => b.classList.toggle('on', MARCA_CORES[i] && MARCA_CORES[i].hex === _cfgMarca.cor.toLowerCase()));
  document.querySelectorAll('.mc-ic').forEach((b, i) => b.classList.toggle('on', MARCA_ICONES[i] === _cfgMarca.icone));
  const livre = $('cfg-cor-livre'); if(livre) livre.value = _cfgMarca.cor;
}
function cfgMarcaNome(v){ _cfgMarca.nomeApp = v; _cfgMarcaRedesenhar(); }
function cfgMarcaCor(hex){ if(marcaHexOk(hex)){ _cfgMarca.cor = hex.toLowerCase(); _cfgMarcaRedesenhar(); } }
function cfgMarcaIcone(n){ if(marcaIconeOk(n)){ _cfgMarca.icone = n; _cfgMarcaRedesenhar(); } }
function cfgMarcaRestaurar(){ _cfgMarca = { nomeApp:'', cor:MARCA_COR_PADRAO, icone:'ph-barbell' }; renderConfigCRM(); }

async function cfgSalvarMarca(){
  const d = _cfgMarca;
  if(!marcaHexOk(d.cor) || !marcaIconeOk(d.icone)){ crmToast('Cor ou ícone inválido', 'err'); return; }
  DB.config.marca = { nomeApp:marcaNomeLimpo(d.nomeApp), cor:d.cor.toLowerCase(), icone:d.icone };
  _cfgCarimbo();
  crmSave();
  marcaAplicarConfig();
  let r = { ok:true };
  await Carregando.durante('Salvando a marca...', async () => { r = await marcaPublicar(); });
  const el = $('cfg-saved-at'); if(el) el.textContent = _cfgSalvoEm();
  crmToast(r.ok ? (r.semLink ? 'Marca salva. Ela vai para o portal quando você gerar o seu link de cadastro.' : 'Marca salva!') : 'Marca salva no painel. ' + r.msg, r.ok ? undefined : 'err');
}

// Aplica a configuração ao painel: cor do sistema e nome do studio na lateral.
function marcaAplicarConfig(){
  const c = DB.config || {};
  if(typeof marcaAplicar === 'function') marcaAplicar(c.marca && c.marca.cor);
  const studio = (c.studioName && c.studioName !== 'FitCPX Lite') ? c.studioName : '';
  document.querySelectorAll('.sb-role').forEach(e => { e.textContent = studio || 'Personal Trainer'; });
}

// Publica nome do app, cor, ícone e studio no registro público do link (o portal lê por RPC).
// Sem o SQL marca-link.sql aplicado, devolve a mensagem de como corrigir (a marca fica só no painel).
async function marcaPublicar(){
  if(typeof supa === 'undefined' || !_supaUser) return { ok:true, semLink:true };
  const c = DB.config, m = c.marca || {};
  const base = {
    marca_nome_app: marcaNomeLimpo(m.nomeApp) || null,
    marca_cor: marcaHexOk(m.cor) ? m.cor : null,
    marca_icone: marcaIconeOk(m.icone) ? m.icone : null,
    marca_studio: (c.studioName && c.studioName !== 'FitCPX Lite') ? c.studioName.slice(0, 60) : null,
  };
  const imagens = { marca_logo_url: marcaUrlImagemOk(m.logoUrl) ? m.logoUrl : null, foto_url: marcaUrlImagemOk(c.fotoUrl) ? c.fotoUrl : null };
  try{
    const gravar = linha => supa.from('personal_links').update(linha).eq('trainer_user_id', _supaUser.id).select('trainer_user_id');
    let { data, error } = await gravar(Object.assign({}, base, imagens));
    // SQL antigo (sem as colunas de imagem): grava o resto e avisa só se há imagem para publicar
    if(error && /marca_logo_url|foto_url/.test(error.message || '')){
      ({ data, error } = await gravar(base));
      if(!error && (imagens.marca_logo_url || imagens.foto_url)) return { ok:false, msg:'A logo e a foto ainda não chegaram ao portal: rode a versão nova do marca-link.sql no Supabase.' };
    }
    if(error) throw error;
    return { ok:true, semLink:!(data && data.length) };
  }catch(e){
    const faltaSql = /marca_|column|schema cache/i.test(e.message || '');
    return { ok:false, msg: faltaSql ? 'A marca ainda não chegou ao portal: rode o arquivo marca-link.sql no Supabase.' : 'Não foi possível publicar a marca no portal: ' + e.message };
  }
}

// ── Logo e foto (Supabase Storage, bucket público "marca") ──────────────────
// Fluxo: confere o tipo real pelos primeiros bytes (só PNG, JPEG e WebP; nunca SVG) -> redesenha em até 512 px
// (foto: quadrada, recortando o centro) -> WebP até 200 KB (PNG se o navegador não gerar WebP) -> envia para
// <id do usuário>/<logo|foto>-<sufixo>.<ext> -> publica a URL em personal_links -> apaga o arquivo anterior.
// O nome muda a cada envio para o celular do aluno nunca mostrar a imagem velha (cache de 1 ano).
const MARCA_IMG_MAX_BYTES = 200 * 1024;

function _cfgImagemUrl(tipo){ return tipo === 'logo' ? ((DB.config.marca || {}).logoUrl || '') : (DB.config.fotoUrl || ''); }
function _cfgImagemHtml(tipo){
  const url = marcaUrlImagemOk(_cfgImagemUrl(tipo)) ? _cfgImagemUrl(tipo) : '';
  const prev = url ? '<img src="' + escHTML(url) + '" alt="">' : '<i class=' + (tipo === 'logo' ? 'ph-image' : 'ph-user') + '></i>';
  return '<div class="cfg-img"><span class="cfg-img-prev cfg-img-' + tipo + '">' + prev + '</span><div class="cfg-img-acoes">' +
    '<div class="cfg-img-btns"><button type="button" class="btn btn-ghost btn-sm" onclick="cfgEscolherArquivo(\'' + tipo + '\')"><i class=ph-upload-simple></i> ' + (url ? 'Trocar' : 'Enviar') + (tipo === 'logo' ? ' logo' : ' foto') + '</button>' +
    (url ? '<button type="button" class="btn btn-ghost btn-sm btn-del" onclick="cfgRemoverImagem(\'' + tipo + '\')"><i class=ph-trash></i> Remover</button>' : '') + '</div>' +
    '<input type="file" id="cfg-file-' + tipo + '" accept="image/png,image/jpeg,image/webp" hidden onchange="cfgEnviarImagem(\'' + tipo + '\', this)">' +
    '<div class="field-sub">' + (tipo === 'logo' ? 'Aparece no portal do aluno no lugar do ícone, e no ícone de instalação. ' : 'Aparece para o aluno no portal. ') + 'PNG, JPEG ou WebP; o sistema reduz e comprime sozinho.</div></div></div>';
}

// Devolve { blob, ext } pronto para enviar, ou lança Error com mensagem para o personal.
async function _cfgPrepararImagem(file, tipo){
  if(file.size > 8 * 1024 * 1024) throw new Error('Imagem muito grande (máximo 8 MB).');
  const cab = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if(!marcaTipoPorBytes(cab)) throw new Error('Use uma imagem PNG, JPEG ou WebP.');
  let bmp;
  try{ bmp = await createImageBitmap(file); }catch(e){ throw new Error('Não consegui abrir essa imagem.'); }
  const desenhar = lado => {
    const cv = document.createElement('canvas'), g = cv.getContext('2d');
    if(tipo === 'foto'){
      const s = Math.min(bmp.width, bmp.height);
      cv.width = cv.height = lado;
      g.drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, lado, lado);
    } else {
      const k = Math.min(1, lado / Math.max(bmp.width, bmp.height));
      cv.width = Math.max(1, Math.round(bmp.width * k)); cv.height = Math.max(1, Math.round(bmp.height * k));
      g.drawImage(bmp, 0, 0, cv.width, cv.height);
    }
    return cv;
  };
  const gerar = (cv, tipoMime, q) => new Promise(r => cv.toBlob(r, tipoMime, q));
  try{
    for(const lado of [512, 384, 256, 192]){
      const cv = desenhar(lado);
      for(const q of [0.85, 0.7, 0.55, 0.4]){
        const b = await gerar(cv, 'image/webp', q);
        if(!b) break;
        if(b.type !== 'image/webp') break;                      // navegador sem WebP: cai para PNG abaixo
        if(b.size <= MARCA_IMG_MAX_BYTES) return { blob:b, ext:'webp' };
      }
      const p = await gerar(cv, 'image/png');
      if(p && p.size <= MARCA_IMG_MAX_BYTES) return { blob:p, ext:'png' };
    }
  } finally { if(bmp.close) bmp.close(); }
  throw new Error('Não consegui deixar a imagem abaixo de 200 KB. Tente uma imagem mais simples.');
}

function _cfgErroImagem(e){
  const m = (e && e.message) || String(e);
  if(/bucket not found|not found/i.test(m) || /row-level security|violates|not authorized|Unauthorized/i.test(m)) return 'O espaço das imagens ainda não existe no Supabase: rode o marca-link.sql (versão nova) e tente de novo.';
  return m;
}

async function _cfgGuardarImagem(tipo, url){
  if(tipo === 'logo') DB.config.marca.logoUrl = url; else DB.config.fotoUrl = url;
  _cfgCarimbo(); crmSave();
  return marcaPublicar();
}

function cfgEscolherArquivo(tipo){ const i = document.getElementById('cfg-file-' + tipo); if(i) i.click(); }

async function cfgEnviarImagem(tipo, input){
  const arquivo = input.files && input.files[0]; input.value = '';
  if(!arquivo) return;
  if(typeof supa === 'undefined' || !_supaUser){ crmToast('Entre na sua conta para enviar imagens', 'err'); return; }
  let r = { ok:true };
  try{
    await Carregando.durante(tipo === 'logo' ? 'Enviando a logo...' : 'Enviando a foto...', async () => {
      const { blob, ext } = await _cfgPrepararImagem(arquivo, tipo);
      const sufixo = Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join('');
      const caminho = _supaUser.id + '/' + tipo + '-' + sufixo + '.' + ext;
      const up = await supa.storage.from('marca').upload(caminho, blob, { contentType:blob.type, cacheControl:'31536000', upsert:false });
      if(up.error) throw up.error;
      const url = supa.storage.from('marca').getPublicUrl(caminho).data.publicUrl;
      if(!marcaUrlImagemOk(url)){ await supa.storage.from('marca').remove([caminho]).catch(() => {}); throw new Error('O endereço da imagem veio fora do padrão esperado.'); }
      const antigo = marcaCaminhoDaUrl(_cfgImagemUrl(tipo));
      r = await _cfgGuardarImagem(tipo, url);
      if(antigo && antigo !== caminho) supa.storage.from('marca').remove([antigo]).catch(() => {});   // melhor esforço
    });
  }catch(e){
    crmToast(_cfgErroImagem(e), 'err'); return;
  }
  renderConfigCRM();
  crmToast(r.ok ? (tipo === 'logo' ? 'Logo salva!' : 'Foto salva!') : (tipo === 'logo' ? 'Logo salva no painel. ' : 'Foto salva no painel. ') + r.msg, r.ok ? undefined : 'err');
}

async function cfgRemoverImagem(tipo){
  const antigo = marcaCaminhoDaUrl(_cfgImagemUrl(tipo));
  let r = { ok:true };
  await Carregando.durante('Removendo...', async () => {
    r = await _cfgGuardarImagem(tipo, '');
    if(antigo && typeof supa !== 'undefined' && _supaUser) supa.storage.from('marca').remove([antigo]).catch(() => {});
  });
  renderConfigCRM();
  crmToast(r.ok ? 'Imagem removida' : 'Removida do painel. ' + r.msg, r.ok ? undefined : 'err');
}

// ── Regras e prazos ─────────────────────────────────────────────────────────
function _cfgNumero(id, rotulo, valor, min, max, dica){
  return '<div class="field"><label for="' + id + '">' + rotulo + '</label>' +
    '<input id="' + id + '" type="number" inputmode="numeric" min="' + min + '" max="' + max + '" value="' + valor + '" style="max-width:140px">' +
    (dica ? '<div class="field-sub">' + dica + '</div>' : '') + '</div>';
}
function _cfgHtmlRegras(){
  const c = DB.config;
  const validade = [8, 12, 16].map(n => '<option value="' + n + '"' + (c.validadeSemanas === n ? ' selected' : '') + '>' + n + ' semanas</option>').join('');
  return '<div class="card">' +
    '<div class="card-title"><i class=ph-sliders-horizontal></i> Regras e prazos</div>' +
    '<div class="field-sub" style="margin-bottom:12px">Valores em dias, salvos para a sua conta. Cada categoria de tarefa ainda pode ter o próprio prazo (tela Fluxo de Trabalho).</div>' +
    '<div class="cfg-grid">' +
    _cfgNumero('cfg-urg', 'Tarefa com prazo vira urgente quando faltam (dias)', c.urgencyDays, 1, 30, 'Vale para tarefas do tipo "Com Prazo". Vencidas e as de hoje já são sempre urgentes.') +
    _cfgNumero('cfg-jprox', 'Treino "vencendo" a partir de (dias antes do vencimento)', c.janelaProximo, 1, 30, 'Marca o aluno no Painel e cria o aviso de reavaliação no WhatsApp.') +
    _cfgNumero('cfg-jagend', 'Treino "agendar reavaliação" a partir de (dias antes)', c.janelaAgendar, 1, 60, 'Deve ser igual ou maior que o campo acima.') +
    '<div class="field"><label for="cfg-valid">Validade padrão do treino</label><select id="cfg-valid" style="max-width:180px">' + validade + '</select>' +
      '<div class="field-sub">Já vem marcada ao prescrever. Dá para trocar em cada treino.</div></div>' +
    _cfgNumero('cfg-drev', 'Aluno pausado ou inativo precisa de revisão após (dias)', c.diasRevisao, 1, 365, 'Depois desse prazo ele entra na fila de WhatsApp para reativar.') +
    _cfgNumero('cfg-dnovo', 'Aluno é "novo" por (dias após o cadastro)', c.diasAlunoNovo, 1, 60, 'Define a etiqueta "novo" no Painel e o prazo da mensagem de boas-vindas.') +
    '</div>' +
    '<div class="btn-row" style="justify-content:flex-start">' +
      '<button class="btn btn-primary" onclick="cfgSalvarRegras()"><i class=ph-check-circle></i> Salvar regras</button>' +
      '<span id="cfg-saved-at" style="font-size:12px;color:var(--text3);align-self:center">' + _cfgSalvoEm() + '</span></div>' +
  '</div>' +
  '<div class="card" style="margin-top:14px">' +
    '<div class="card-title"><i class=ph-wrench></i> Avançado</div>' +
    '<div style="font-size:12px;color:var(--text2);margin-bottom:10px">Reconstrói do zero as tarefas automáticas (fluxos) de <strong>todos</strong> os clientes. <i class=ph-warning></i> Isso apaga o "concluído" de tarefas automáticas já marcadas como feitas em todo o CRM; só tarefas manuais (as criadas avulsas, sem fluxo) não são afetadas. Use só se o CRM estiver com dado quebrado.</div>' +
    '<button class="btn btn-danger" onclick="crmRegenAllTasksUI()"><i class=ph-arrows-clockwise></i> Recalcular tarefas dos fluxos (todos os clientes)</button>' +
  '</div>';
}

function cfgSalvarRegras(){
  const n = (id, min, max) => { const x = parseInt($(id).value, 10); return (x >= min && x <= max) ? x : null; };
  const r = { urgencyDays:n('cfg-urg', 1, 30), janelaProximo:n('cfg-jprox', 1, 30), janelaAgendar:n('cfg-jagend', 1, 60),
              diasRevisao:n('cfg-drev', 1, 365), diasAlunoNovo:n('cfg-dnovo', 1, 60) };
  const ruim = Object.keys(r).find(k => r[k] === null);
  if(ruim){ crmToast('Confira os números: use valores inteiros dentro dos limites de cada campo', 'err'); return; }
  if(r.janelaAgendar < r.janelaProximo){ crmToast('"Agendar reavaliação" precisa ser igual ou maior que "vencendo"', 'err'); return; }
  Object.assign(DB.config, r, { validadeSemanas:parseInt($('cfg-valid').value, 10) || 12 });
  _cfgCarimbo();
  crmSave();
  if(typeof updateBadges === 'function') updateBadges();
  const el = $('cfg-saved-at'); if(el) el.textContent = _cfgSalvoEm();
  crmToast('Regras salvas!');
}

function crmRegenAllTasksUI(){
  crmConfirm('Isso vai apagar o "concluído" de TODAS as tarefas automáticas de TODOS os clientes e recriá-las do zero (mesmas datas). Tarefas manuais não são afetadas. Confirma?', ()=>{
    regenAllTasks();
    renderConfigCRM();
    updateBadges();
    crmToast('Tarefas dos fluxos recalculadas');
  });
}
