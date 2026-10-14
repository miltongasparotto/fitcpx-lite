// Regra de contraste no código: texto sobre fundo de marca ou de erro usa --on-primary / --on-danger / --on-accent2,
// nunca branco fixo (o branco some sobre o verde claro do tema escuro; ver documentos/DESIGN-SYSTEM.md).
// Rodar a partir de sistema/:  node --test tests/contraste-css.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ARQUIVOS = ['css/app.css', 'css/painel.css', 'css/tokens.css', 'aluno/portal.css', 'js/prescricao-motor.js', 'js/dashboard.js', 'js/crm-config.js', 'aluno/js/aluno-app.js'];
const FUNDO = /background(?:-color)?:\s*var\(--(primary|primary-hover|accent|accent2|danger|red|green)\)/;
const BRANCO_FIXO = /(?:^|[;{\s])color:\s*(#fff|#ffffff|white)\b/i;

test('nenhum fundo de marca ou de erro leva texto branco fixo', () => {
  const achados = [];
  for (const arq of ARQUIVOS) {
    const texto = fs.readFileSync(new URL('../' + arq, import.meta.url), 'utf8');
    texto.split('}').forEach(bloco => {
      if (FUNDO.test(bloco) && BRANCO_FIXO.test(bloco)) achados.push(arq + ': ' + bloco.trim().slice(-140).replace(/\s+/g, ' '));
    });
  }
  assert.deepEqual(achados, [], 'use var(--on-primary), var(--on-danger) ou var(--on-accent2)');
});

test('os tokens de texto sobre fundo existem nos dois temas', () => {
  const tk = fs.readFileSync(new URL('../css/tokens.css', import.meta.url), 'utf8');
  const [claro, escuro] = [tk.slice(0, tk.indexOf(':root.dark')), tk.slice(tk.indexOf(':root.dark'))];
  for (const t of ['--on-primary', '--on-danger', '--on-accent2']) {
    assert.ok(claro.includes(t + ':'), t + ' no claro');
    assert.ok(escuro.includes(t + ':'), t + ' no escuro');
  }
});
