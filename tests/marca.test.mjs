// Cor da marca (js/marca.js): as 10 cores prontas e cores livres geram tokens legíveis nos dois temas.
// Rodar a partir de sistema/:  node --test tests/marca.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const M = require('../js/marca.js');

const SUP_CLARA = '#ffffff', SUP_ESCURA = '#1e1e1e';   // cartão claro e cartão do escuro (proposta B)

test('as 10 cores prontas são hex válidos e diferentes', () => {
  assert.equal(M.MARCA_CORES.length, 10);
  const vistas = new Set(M.MARCA_CORES.map(c => c.hex));
  assert.equal(vistas.size, 10);
  M.MARCA_CORES.forEach(c => assert.ok(M.marcaHexOk(c.hex), c.nome));
});

test('cor padrão devolve exatamente os tokens do tokens.css (par claro e escuro)', () => {
  const v = M.marcaCalcular('#3dbb6E');
  assert.equal(v.claro['--primary'], '#3dbb6e');
  assert.equal(v.claro['--primary-ink'], '#15783b');
  assert.equal(v.claro['--on-primary'], '#06180d');
  assert.equal(v.escuro['--primary'], '#3dbb6e');
  assert.equal(v.escuro['--primary-ink'], '#6fd69a');
  assert.equal(v.escuro['--on-primary'], '#06180d');
});

// Mínimos (WCAG AA, texto normal 4,5:1) para o padrão e para qualquer cor escolhida, nos dois temas.
function conferir(v, nome){
  const softC = v.claro['--primary-soft'], softE = v.escuro['--primary-soft'];
  assert.ok(M.marcaContraste(v.claro['--primary-ink'], SUP_CLARA) >= 4.5, nome + ' ink claro x cartão');
  assert.ok(M.marcaContraste(v.claro['--primary-ink'], softC) >= 4.5, nome + ' ink claro x selo');
  assert.ok(M.marcaContraste(v.claro['--on-primary'], v.claro['--primary']) >= 4.5, nome + ' botão claro');
  assert.ok(M.marcaContraste(v.escuro['--primary-ink'], SUP_ESCURA) >= 4.5, nome + ' ink escuro x cartão');
  assert.ok(M.marcaContraste(v.escuro['--primary-ink'], softE) >= 4.5, nome + ' ink escuro x selo');
  assert.ok(M.marcaContraste(v.escuro['--on-primary'], v.escuro['--primary']) >= 4.5, nome + ' botão escuro');
  assert.ok(M.marcaContraste(v.escuro['--primary'], SUP_ESCURA) >= 3, nome + ' primary escuro x cartão (gráfico)');
  [...Object.values(v.claro), ...Object.values(v.escuro)].forEach(t => assert.match(t, /^(#[0-9a-f]{6}|rgba\(\d+,\d+,\d+,[\d.]+\))$/));
}
test('cor padrão atende os mínimos nos dois temas', () => conferir(M.marcaCalcular('#3dbb6e'), 'padrão'));
test('o verde antigo (#22c55e) salvo por quem escolheu "Verde" vale como o padrão', () => {
  assert.ok(M.marcaEhPadrao('#22C55E'));
  assert.deepEqual(M.marcaCalcular('#22c55e'), M.marcaCalcular('#3dbb6e'));
});

for (const cor of ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#f59e0b', '#14b8a6', '#475569', '#ffff00', '#000000', '#ffffff', '#123456']) {
  test('contraste legível em ' + cor, () => conferir(M.marcaCalcular(cor), cor));
}

test('a cor escolhida vira um tom médio, igual nos dois temas, com texto escuro no botão', () => {
  for (const cor of ['#ef4444', '#3b82f6', '#8b5cf6', '#f59e0b']) {
    const v = M.marcaCalcular(cor);
    assert.equal(v.claro['--primary'], v.escuro['--primary'], cor + ': mesmo preenchimento nos dois temas');
    assert.equal(v.claro['--on-primary'], v.escuro['--on-primary'], cor + ': mesmo texto do botão');
    assert.ok(M.marcaContraste(v.claro['--on-primary'], '#ffffff') > 10, cor + ': texto do botão escuro');
    assert.ok(M.marcaContraste(v.escuro['--primary'], '#121212') >= 4, cor + ': aparece no fundo escuro');
    assert.notEqual(v.escuro['--primary'], cor, cor + ': ajustado para tom médio');
  }
});

test('marcaCss monta os dois blocos', () => {
  const css = M.marcaCss('#3b82f6');
  assert.match(css, /^:root\{/);
  assert.ok(css.includes(':root.dark{'));
  assert.ok(css.includes('--primary:' + M.marcaCalcular('#3b82f6').claro['--primary']));
});

test('texto do app: sem marcação, até 40 caracteres', () => {
  assert.equal(M.marcaNomeLimpo('  Studio   <b>Vida</b>  '), 'Studio bVida/b');
  assert.equal(M.marcaNomeLimpo('x'.repeat(80)).length, 40);
  assert.equal(M.marcaNomeLimpo(null), '');
});

test('ícone só aceita a lista; hex só aceita #rrggbb', () => {
  assert.ok(M.marcaIconeOk('ph-barbell'));
  assert.ok(!M.marcaIconeOk('ph-skull'));
  assert.ok(!M.marcaIconeOk('<img src=x>'));
  assert.ok(!M.marcaHexOk('red'));
  assert.ok(!M.marcaHexOk('#fff'));
  assert.ok(!M.marcaHexOk('url(javascript:1)'));
});

const UID = '12345678-1234-1234-1234-123456789abc';
const BASE_IMG = 'https://abcdefgh.supabase.co/storage/v1/object/public/marca/' + UID + '/';

test('URL de imagem: só o bucket "marca" do Supabase, na pasta do usuário', () => {
  assert.ok(M.marcaUrlImagemOk(BASE_IMG + 'logo-a1b2c3d4e5f6a7b8.webp'));
  assert.ok(M.marcaUrlImagemOk(BASE_IMG + 'foto-a1b2c3d4e5f6a7b8.png'));
  assert.ok(!M.marcaUrlImagemOk('https://evil.com/storage/v1/object/public/marca/' + UID + '/logo-a1b2c3d4e5f6a7b8.webp'));
  assert.ok(!M.marcaUrlImagemOk('https://abcdefgh.supabase.co.evil.com/storage/v1/object/public/marca/' + UID + '/logo-a1b2c3d4e5f6a7b8.webp'));
  assert.ok(!M.marcaUrlImagemOk('http://abcdefgh.supabase.co/storage/v1/object/public/marca/' + UID + '/logo-a1b2c3d4e5f6a7b8.webp'));
  assert.ok(!M.marcaUrlImagemOk(BASE_IMG + 'logo-a1b2c3d4e5f6a7b8.svg'));
  assert.ok(!M.marcaUrlImagemOk(BASE_IMG + '../outro/logo-a1b2c3d4e5f6a7b8.webp'));
  assert.ok(!M.marcaUrlImagemOk('javascript:alert(1)'));
  assert.ok(!M.marcaUrlImagemOk('data:image/png;base64,AAAA'));
  assert.ok(!M.marcaUrlImagemOk(null));
});

test('caminho no bucket a partir da URL pública', () => {
  assert.equal(M.marcaCaminhoDaUrl(BASE_IMG + 'logo-a1b2c3d4e5f6a7b8.webp'), UID + '/logo-a1b2c3d4e5f6a7b8.webp');
  assert.equal(M.marcaCaminhoDaUrl('https://evil.com/x.png'), '');
});

test('tipo da imagem pelos primeiros bytes (extensão não vale)', () => {
  const png = Uint8Array.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0]);
  const jpg = Uint8Array.from([0xFF, 0xD8, 0xFF, 0xE0, 0, 0x10, 0x4A, 0x46, 0x49, 0x46, 0, 1]);
  const webp = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]);
  const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  const wav = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45]);
  assert.equal(M.marcaTipoPorBytes(png), 'png');
  assert.equal(M.marcaTipoPorBytes(jpg), 'jpeg');
  assert.equal(M.marcaTipoPorBytes(webp), 'webp');
  assert.equal(M.marcaTipoPorBytes(svg), '');
  assert.equal(M.marcaTipoPorBytes(wav), '');
  assert.equal(M.marcaTipoPorBytes(new Uint8Array(3)), '');
});

test('texto sobre --accent2 (botão Aplicar do filtro de exercícios) legível nos dois temas', () => {
  for (const cor of ['#22c55e', '#3b82f6', '#ef4444', '#f59e0b', '#475569']) {
    const v = M.marcaCalcular(cor);
    assert.ok(M.marcaContraste(v.claro['--on-accent2'], v.claro['--accent2']) >= 4.5, cor + ' claro');
    assert.ok(M.marcaContraste(v.escuro['--on-accent2'], v.escuro['--accent2']) >= 4.5, cor + ' escuro');
  }
});
