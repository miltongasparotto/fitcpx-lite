# Testes ponta a ponta (Playwright, com a nuvem simulada)

Nenhum acessa o Supabase de verdade: as chamadas de rede são interceptadas. Dados 100% fictícios (`../fixtures/seed-ficticio.js`).

Como rodar (cmd ou bash), com o servidor local na porta 5178:
1. Subir o servidor: `npx -y serve -l 5178 .` dentro de `sistema/` (ou `preview_start` do Claude Code com `.claude/launch.json`).
2. Rodar um teste:
   `cd C:/Users/junio/.claude/skills/playwright-skill && node run.js D:/OneDrive/Claude/Projetos/fitcpx-lite/sistema/tests/e2e/fase41.test.js`

| Arquivo | Cobre |
|---|---|
| fase41.test.js | Fase 4.1: CPF, conflito, transferência (painel e portal), trava, e-mail, nome do personal (53 checagens) |
| smoke.test.js | Todas as telas e abas em 1440 e 390 px, sem erro de página |
| xss.test.js | Injeta payload em todos os campos e procura execução |
| func.test.js | Menus, novo aluno, perfil, busca, arquivar, CRM, mobile |
| portal-func.test.js | Portal: o que é enviado a aluno-api |
| login-func.test.js | Login e logout do painel com Supabase simulado |

Observações: o smoke espera 3 alunos de teste e o seed tem 1 (avisos "aluno 1/2" são do script, não do app). Para usar o seed, abra `/?demo` na raiz (o `serve` descarta a query em `/index.html?demo`).

Testes de lógica e das Edge Functions (Node, sem navegador), a partir de `sistema/`:
`node --test tests/vinculo.test.mts tests/trainer-transferencia.test.mts`
