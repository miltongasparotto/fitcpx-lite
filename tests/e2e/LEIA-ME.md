# Testes ponta a ponta (Playwright, com a nuvem simulada)

Nenhum acessa o Supabase de verdade: as chamadas de rede são interceptadas. Dados 100% fictícios (`../fixtures/seed-ficticio.js`).

Como rodar (cmd ou bash), com o servidor local na porta 5178:
1. Subir o servidor: `npx -y serve -l 5178 .` dentro de `sistema/` (ou `preview_start` do Claude Code com `.claude/launch.json`).
2. Rodar um teste:
   `cd C:/Users/junio/.claude/skills/playwright-skill && node run.js D:/OneDrive/Claude/Projetos/fitcpx-lite/sistema/tests/e2e/fase41.test.js`

| Arquivo | Cobre |
|---|---|
| fase41.test.js | Fase 4.1: CPF, conflito, transferência (painel e portal), trava, e-mail, nome do personal (agora salvo em Configurações > Perfil) (62 checagens) |
| portal-cadastro.test.js | Portal: login único, cadastro por link no celular, nome do personal, desfazer conta em erro, conflito (99 checagens: login, cadastro, aviso de processamento, esqueci a senha, link de redefinição, troca obrigatória, conta; `SHOTS_DIR=pasta` salva capturas) |
| senha-painel.test.js | Painel: pedido de "esqueci minha senha" vira tarefa urgente, redefinir senha (automática ou escolhida), mensagem só com a senha, WhatsApp automático, senha escolhida sem mensagem (34 checagens) |
| smoke.test.js | Todas as telas e abas em 1440 e 390 px, sem erro de página |
| xss.test.js | Injeta payload em todos os campos e procura execução |
| painel-v2.test.js | Painel v2: menus, áreas, Financeiro simulado, sino, gaveta, ficha, campo de função no fluxo, escuro em 1440/834/390 (37 checagens) |
| portal-v2.test.js | Portal v2: telas de entrada e do app em 390/360/430/834 px, claro e escuro, sem rolagem horizontal, lua e lembrança do tema, Agenda e Pagamentos com dados simulados (abrir em `/aluno/`, com a barra final) |
| config-marca.test.js | Configurações (Perfil, Marca, Regras), kit de fluxos, modelos de WhatsApp com evento, fila "A enviar" (eventos, linha de base, enviar/dispensar/reabrir, validade, virada do dia com relógio simulado), selo, sino e Painel, marca no portal (?p=, ?c=, sem marca, marca removida, texto malicioso, logado sem código) (227 checagens, inclui Perfil e Marca separados, CEP com ViaCEP simulado, migração do endereço antigo, logo na grade de ícones e foto com Storage simulado; `SHOTS_DIR=pasta` salva capturas) |
| layouts.test.js | Os 5 layouts do painel (notebook 1440, MacBook 1280 com menu em ícones, ultrawide 2560, tablet 834, celular 390) em todas as telas e abas: erro de JS, rolagem horizontal, elemento fora da tela, menu de cada layout, largura máxima no ultrawide e botão Instalar (824 checagens; `SHOTS_DIR=pasta` salva uma captura por tela e layout). Regra em documentos/LAYOUTS.md |
| prescricao-movel.test.js | Prescrição de treino nos 4 layouts (celular, tablet, notebook, ultrawide): passos, barra fixa, volume em lista, exercício em cartão, acordeões, ficha aprovada e notebook inalterado (115 checagens; `SUPA_LOCAL=caminho/supabase.js` serve o supabase.js local quando o CDN está lento) |
| historico-ficha.test.js | Histórico da ficha: anamnese em lista (migração, nova linha, abrir antigo, cancelar, editar, excluir e restaurar, anamnese do portal), avaliação com variação e espelho em `s.anamnese`, treinos em linhas, formulários em página própria com a linha de identificação e os 4 layouts (115 checagens) |
| ficha-aluno.test.js | Ficha do aluno: cartão principal, Informações pessoais, menu de status (Lead, Ativo, Pausado, Inativo, Bloqueado), Editar perfil, página Cadastro com endereço, Salvar e Cancelar, atalho de CPF, Arquivar e aluno novo (169 checagens, inclui a situação do aluno (Lead, Ativo, Inativo, Bloqueado com o servidor simulado), os avisos Novo, Pendente e Transferência e a migração, inclui apelido e a divisão dos cartões do Cadastro, CEP pelo ViaCEP simulado, lista de países com busca, telefone com código, foto do aluno e a ficha e o Cadastro em tablet em pé, tablet deitado e celular) |
| alunos-lista.test.js | Lista de Alunos: situação (abas) e alertas (filtro), filtros e ordem por coluna (com —), 3 quebras por largura, painel de filtros |
| alunos-novo-vazio.test.js | Cadastro manual: sair sem salvar não deixa aluno vazio; Salvar exige nome; limpeza de vazios |
| alunos-paginacao.test.js | Lista de Alunos: 10/20/30/Tudo por página, setas, volta à página 1, escolha lembrada |
| func.test.js | Menus, novo aluno, perfil, busca, arquivar, CRM, mobile |
| portal-func.test.js | Portal: o que é enviado a aluno-api |
| login-func.test.js | Login e logout do painel com Supabase simulado |

Observações: o smoke espera 3 alunos de teste e o seed tem 1 (avisos "aluno 1/2" são do script, não do app). Para usar o seed, abra `/?demo` na raiz (o `serve` descarta a query em `/index.html?demo`).

Testes de lógica e das Edge Functions (Node, sem navegador), a partir de `sistema/`:
`node --test tests/vinculo.test.mts tests/trainer-transferencia.test.mts tests/marca.test.mjs` (a cor da marca e as URLs de imagem: 21 testes)
