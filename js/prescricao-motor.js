// ══════════════════════════════════════════════════════
// MOTOR DE PRESCRIÇÃO FitCPX Lite — Constantes e utilitários
// ══════════════════════════════════════════════════════

// VOL_REF removida (2026-06) — era tabela órfã, redundante com LIM_SESSAO_REF
// (linha ~6057), que já é a fonte única de verdade para Volume Total da Sessão
// (vault REF-Volume-Derivado-MAV §9). O único uso real era um fallback dentro
// de gerarFichaMotorV2 — substituído para usar LIM_SESSAO_REF diretamente.

// Séries por Exercício — faixas por Família × Nível (vault REF-Volume-Derivado-MAV §6).
// Reab usa a mesma faixa de Resist (vault §6: "Reabilitação (→ Resistência)").
const SERIES_POR_EX = {
  Hip:      {Inic:[1,3], Inte:[3,4], Avan:[3,6]},
  Forca:    {Inic:[1,3], Inte:[3,4], Avan:[3,6]},
  Resist:   {Inic:[1,2], Inte:[2,3], Avan:[2,4]},
  Reab:     {Inic:[1,2], Inte:[2,3], Avan:[2,4]},
  Gestacao: {Inic:[1,2], Inte:[2,3], Avan:[2,4]},
};

// ── Progressão de Séries por Exercício (vault §10.2) ──────────────────────────
// Passo 1: moda das séries dos exercícios de um treino; empate → menor valor (conservador).
function calcularSerieRegistrada(exerciciosDoTreino){
  if(!exerciciosDoTreino || !exerciciosDoTreino.length) return null;
  const contagem = {};
  exerciciosDoTreino.forEach(ex => {
    const serie = parseInt(ex.series);
    if(!serie) return;
    contagem[serie] = (contagem[serie] || 0) + 1;
  });
  let modaValor = null, modaFreq = 0;
  Object.keys(contagem).forEach(serie => {
    const freq = contagem[serie];
    const serieNum = Number(serie);
    if(freq > modaFreq || (freq === modaFreq && (modaValor === null || serieNum < modaValor))){
      modaFreq = freq;
      modaValor = serieNum;
    }
  });
  return modaValor;
}

// Passo 2: sugestão do próximo treino — moda+1, travado entre piso e teto da faixa atual.
// Sem histórico nesse objetivo → piso da faixa.
function getSeriesPorEx(objetivo, nivel, ultimaSerieRegistrada){
  const familia = FAMILIA_OBJETIVO[objetivo] || 'Resist';
  const faixa = (SERIES_POR_EX[familia] || SERIES_POR_EX['Resist'])[nivel] || [1,3];
  if(ultimaSerieRegistrada == null) return faixa[0];
  const proximo = ultimaSerieRegistrada + 1;
  return Math.max(faixa[0], Math.min(proximo, faixa[1]));
}

// Busca a "última série registrada" para um objetivo — lê direto do campo dedicado
// s.historicoSeries (vault §10.2: histórico sobrevive a qualquer número de trocas de
// objetivo no meio, não só 1-2 ciclos). Gravação/reset ficam em registrarHistoricoSeries.
function buscarUltimaSerieRegistrada(s, objetivoAtual){
  if(!s || !s.historicoSeries) return null;
  const v = s.historicoSeries[objetivoAtual];
  return (v == null) ? null : v;
}

// Grava a moda do ciclo recém-aprovado no histórico do próprio objetivo (vault §10.2,
// independência por objetivo — sobrevive indefinidamente a trocas no meio).
// Exceção Reab (vault §10.2): ENTRAR em Reab (veio de outro objetivo, não estava já em
// Reab) zera tanto o histórico do próprio Reab quanto o do objetivo principal que estava
// em andamento antes dela — ambos retomam do piso depois.
function registrarHistoricoSeries(s, objetivoAprovado, exerciciosDoTreino, objetivoAnterior){
  if(!s) return;
  if(!s.historicoSeries) s.historicoSeries = {};

  if(objetivoAprovado === 'Reab' && objetivoAnterior && objetivoAnterior !== 'Reab'){
    delete s.historicoSeries['Reab'];
    delete s.historicoSeries[objetivoAnterior];
  }

  const moda = calcularSerieRegistrada(exerciciosDoTreino);
  if(moda != null) s.historicoSeries[objetivoAprovado] = moda;
}

// Reps de referência — valor fixo por objetivo (médio da faixa técnica)
const REPS_REF = {
  Hip:'10',    Forca:'4',   Emagr:'12',  Comp:'10',
  Resist:'15', CardioR:'20', Func:'15',  Saude:'15',
  Esport:'4',  Reab:'15',   Envelhec:'15', Gestacao:'12',
};

const INT_REF = {
  Hip:'60–85% 1RM', Forca:'80–95% 1RM', Emagr:'50–75% 1RM',
  Comp:'60–80% 1RM', Resist:'40–60% 1RM', CardioR:'60–90% FCmáx',
  Func:'40–65% 1RM', Saude:'50–70% 1RM', Esport:'70–90% 1RM',
  Reab:'20–50% 1RM', Envelhec:'40–65% 1RM', Gestacao:'40–60% 1RM',
};

// Intervalo de descanso — valor fixo por objetivo (médio da faixa técnica)
const INT_DESCANSO = {
  Hip:'90s',   Forca:'240s', Emagr:'45s',  Comp:'60s',
  Resist:'40s', CardioR:'40s', Func:'75s', Saude:'75s',
  Esport:'180s', Reab:'90s', Envelhec:'90s', Gestacao:'90s',
};


const DIVISOES = {
  2: {
    default:[
      [{g:'Peitoral'},{g:'Triceps'},{g:'Deltoide'},{g:'RetoAbdominal'}],
      [{g:'Latissimo'},{g:'Biceps'},{g:'Quadriceps'},{g:'Isquiossurais'},{g:'Gluteos'}],
    ],
    label:['Treino A — Empurrar + Core','Treino B — Puxar + Pernas'],
  },
  3: {
    default:[
      [{g:'Peitoral'},{g:'Triceps'},{g:'Deltoide'}],
      [{g:'Quadriceps'},{g:'Isquiossurais'},{g:'Gluteos'},{g:'Panturrilhas'}],
      [{g:'Latissimo'},{g:'Biceps'},{g:'RetoAbdominal'},{g:'Obliquo'}],
    ],
    label:['Treino A — Peito/Tríceps/Ombro','Treino B — Pernas','Treino C — Costas/Bíceps/Core'],
  },
  4: {
    default:[
      [{g:'Peitoral'},{g:'Triceps'}],
      [{g:'Latissimo'},{g:'Biceps'},{g:'Trapezio'}],
      [{g:'Quadriceps'},{g:'Gluteos'},{g:'Panturrilhas'}],
      [{g:'Deltoide'},{g:'Isquiossurais'},{g:'RetoAbdominal'},{g:'Obliquo'}],
    ],
    label:['Treino A — Peito/Tríceps','Treino B — Costas/Bíceps','Treino C — Quadríceps/Glúteos','Treino D — Ombros/Posteriores/Core'],
  },
  5: {
    default:[
      [{g:'Peitoral'}],
      [{g:'Latissimo'},{g:'Biceps'}],
      [{g:'Quadriceps'},{g:'Gluteos'},{g:'Panturrilhas'}],
      [{g:'Deltoide'},{g:'Trapezio'}],
      [{g:'Isquiossurais'},{g:'Triceps'},{g:'RetoAbdominal'},{g:'Obliquo'}],
    ],
    label:['Treino A — Peito','Treino B — Costas/Bíceps','Treino C — Pernas','Treino D — Ombros','Treino E — Posteriores/Tríceps/Core'],
  },
  6: {
    default:[
      [{g:'Peitoral'},{g:'Triceps'}],
      [{g:'Latissimo'},{g:'Biceps'}],
      [{g:'Quadriceps'},{g:'Gluteos'}],
      [{g:'Deltoide'},{g:'Trapezio'}],
      [{g:'Isquiossurais'},{g:'Panturrilhas'}],
      [{g:'RetoAbdominal'},{g:'Obliquo'}],
    ],
    label:['Treino A — Peito/Tríceps','Treino B — Costas/Bíceps','Treino C — Quadríceps/Glúteos','Treino D — Ombros','Treino E — Posteriores/Panturrilhas','Treino F — Core'],
  },
};

const PORCOES = {
  Peitoral:    ['Superior','Médio','Inferior',null],
  Triceps:     ['Longa Porção','Lateral',null],
  // Bíceps e Reto Abdominal: pesquisa (2026-08) não sustenta ativação
  // independente por feixe o suficiente pra justificar ranking de porção —
  // não diferenciar, mas o motor tenta variar o exercício via critério de
  // padrão de movimento/impacto articular (ver sortearExercicioC4).
  Biceps:      [null],
  Deltoide:    ['Anterior','Medial','Posterior'],
  // Glúteo Mínimo adicionado (pesquisa 2026-08): abdução + rotação interna de
  // quadril ativa bem o Mínimo e também recruta o Médio.
  Gluteos:     ['Máximo','Médio','Mínimo',null],
  Quadriceps:  [null],
  Isquiossurais:[null],
  Latissimo:   [null],
  RetoAbdominal:[null],
  Obliquo:     [null],
  Panturrilhas:[null],
  Trapezio:    [null],
  Romboides:   [null],
  Adutores:    [null],
  QuadradoLombar:[null],
  Antebracos:  [null],
};

// IDs de "Tipo de Resistência" — direto da aba "Corelação" da planilha oficial
// (Cabo=1, Elástico=2, Máquina=3, Peso Corporal=4, Peso Livre=5, Suspenso=6).
// Trocado de sigla (TRPL/TRM/...) pra ID na reimportação de 2026-08-28.
const RESIST_ID = { CABO:1, ELASTICO:2, MAQUINA:3, PESO_CORPORAL:4, PESO_LIVRE:5, SUSPENSO:6 };
const TODAS_RESIST = Object.values(RESIST_ID);

// LOCAL_RESIST (buckets 'academia'/'casa'/'ar livre'/'híbrido') REMOVIDO em
// 2026-09-02: classificacao generica desnecessaria. A fonte de verdade do que o
// aluno tem disponivel e a lista de equipamentos do LOCAL REAL (LIBS.locais),
// nao um rotulo aproximado. Sem local definido, nada e restringido.

// ── Perfil de equipamento personalizado por local ────────────────────────────
// O mapa manual equipamento -> tipo de resistencia foi REMOVIDO (2026-09-02).
// Ele era mantido a mao com nomes que nao batiam com os do banco ('Halteres' vs
// 'Halter', 'Barra olímpica' vs 'Barra Reta', 'Elásticos/Faixas' vs 'Elastico'):
// dos 68 equipamentos que um local do LIBS lista, apenas 2 casavam. Na pratica
// uma academia COMPLETA devolvia so [PESO_CORPORAL] — 217 dos 692 exercicios,
// todos de peso corporal — e ninguem percebia porque a falha era silenciosa.
//
// Agora o mapa e DERIVADO do proprio banco: cada exercicio ja traz `eq`
// (equipamentos) e `r` (tipo de resistencia), entao a relacao entre os dois e
// um fato do banco, nao uma tabela paralela que pode divergir. Chaveado por
// `chave` dos dois lados. Construcao preguicosa + memoizada: DB_EXERCICIOS ja
// carregou quando a primeira prescricao roda.
let _equipResistIdx = null;
function _getEquipResistIdx(){
  if(_equipResistIdx) return _equipResistIdx;
  const idx = {};
  (typeof DB_EXERCICIOS !== 'undefined' ? DB_EXERCICIOS : []).forEach(e => {
    if(!e.r) return;
    (e.eq || []).forEach(q => {
      if(!q.chave) return;
      (idx[q.chave] = idx[q.chave] || new Set()).add(e.r.id);
    });
  });
  _equipResistIdx = idx;
  return idx;
}

// Deriva os tipos de resistencia disponiveis a partir dos equipamentos de um
// local. PESO_CORPORAL entra sempre (o corpo do aluno esta sempre disponivel).
// `equipamentos` guarda CHAVES (migracao _migrarLibsChaves em
// biblioteca-exercicios.js); nomes antigos com acento/espaco ainda sao aceitos
// por normalizacao, pra nao quebrar dado que ainda nao passou pela migracao.
function _resistFromEquipamentos(equipamentos){
  const idx = _getEquipResistIdx();
  const ids = new Set([RESIST_ID.PESO_CORPORAL]);
  (equipamentos || []).forEach(eq => {
    let rs = idx[eq];
    if(!rs){
      const alvo = normalizarIdentificador(eq).replace(/[^a-z0-9]/g, '');
      const k = Object.keys(idx).find(c => normalizarIdentificador(c).replace(/[^a-z0-9]/g,'') === alvo);
      rs = k ? idx[k] : null;
    }
    if(rs) rs.forEach(id => ids.add(id));
  });
  return [...ids];
}

// Lookup central de tipos de resistencia permitidos. Aceita "libs:ID" (local
// real do personal). Qualquer outro valor — inclusive vazio — nao restringe.
function getResistPermitida(local){
  const locais = (typeof LIBS !== 'undefined') ? (LIBS?.locais||[]) : [];
  if(local && String(local).startsWith('libs:')){
    const libsId = parseInt(String(local).split(':')[1]);
    const libsLocal = locais.find(l => l.id === libsId);
    if(libsLocal) return _resistFromEquipamentos(libsLocal.equipamentos);
  }
  // Compatibilidade: anamnese antiga guardava o NOME do local em vez de libs:ID.
  if(local){
    const porNome = locais.find(l => (l.nome||'') === local);
    if(porNome) return _resistFromEquipamentos(porNome.equipamentos);
  }
  return [...TODAS_RESIST];   // sem local definido: nao restringe
}

// ── Corte por equipamento EXATO (2026-09-16) ─────────────────────────────────
// getResistPermitida() acima e um proxy furado pro corte automatico de
// disponibilidade: ele libera o TIPO INTEIRO de resistencia (Cabo/Peso
// Livre/Suspenso/...) sempre que algum equipamento do local aparece em
// QUALQUER exercicio daquele tipo — mesmo que esse exercicio especifico
// tambem exija outro equipamento que o local nao tem. Ex.: "Abdominal de
// Costas para o Cross" usa Colchonete+CrossOver e e do tipo Cabo; um local
// que so tem Colchonete ja destravava o tipo Cabo inteiro, inclusive pra
// exercicios que nem usam Colchonete (tipo "Pull Over - Barra"). Confirmado
// em teste real: local com só Colchonete+Mini Band+Peso Corporal+Super
// Band+Tube Band liberava 5 dos 6 tipos de resistencia.
//
// getResistPermitida() fica mantida só pro dropdown manual de "Tipo de
// resistência" (filtro avulso que o personal escolhe na tela, não é corte
// automático). O corte automático de disponibilidade agora usa a função
// abaixo, que confere equipamento a equipamento, exercício por exercício —
// só entra se TODOS os equipamentos que aquele exercício exige (`e.eq`)
// estiverem disponíveis no local (peso corporal sempre disponível).
// Retrato do local que o aluno escolheu no Portal (anamnese.local_info),
// só se for o mesmo local pedido. null quando não há.
function _localDoAluno(local){
  const s = (typeof getActive === 'function') ? getActive() : null;
  const a = s?.anamnese || {};
  if(!local || a.local !== local || !a.local_info) return null;
  return { nome: a.local_info.nome || 'Local do aluno', equipamentos: a.local_info.equipamentos || [] };
}

function getEquipamentosPermitidos(local){
  const locais = (typeof LIBS !== 'undefined') ? (LIBS?.locais||[]) : [];
  let libsLocal = null;
  if(local && String(local).startsWith('libs:')){
    const libsId = parseInt(String(local).split(':')[1]);
    libsLocal = locais.find(l => l.id === libsId);
  }
  if(!libsLocal && local){
    libsLocal = locais.find(l => (l.nome||'') === local); // compat: anamnese antiga guardava nome
  }
  // Local cadastrado pelo ALUNO no Portal (tabela locais_treino, fora do LIBS).
  // A Edge Function aluno-api grava um retrato dele em anamnese.local_info.
  if(!libsLocal && local && String(local).startsWith('aluno:')) libsLocal = _localDoAluno(local);
  if(!libsLocal) return null; // sem local definido/reconhecido: nao restringe
  const set = new Set(libsLocal.equipamentos || []);
  set.add('PesoCorporal'); // o corpo do aluno esta sempre disponivel
  return set;
}

// equipPermitidos === null → sem restrição (nenhum local definido).
// Caso contrário, só passa se TODO equipamento exigido pelo exercício está
// no set. Aceita variação de chave/nome via normalizarIdentificador (mesma
// tolerância que _resistFromEquipamentos já usava).
function _exercicioEquipamentoOk(e, equipPermitidos){
  if(!equipPermitidos) return true;
  const itens = e.eq || [];
  if(!itens.length) return true; // exercicio sem equipamento cadastrado — nao bloqueia
  return itens.every(q => {
    if(equipPermitidos.has(q.chave)) return true;
    const alvo = normalizarIdentificador(q.chave).replace(/[^a-z0-9]/g, '');
    return [...equipPermitidos].some(c => normalizarIdentificador(c).replace(/[^a-z0-9]/g,'') === alvo);
  });
}

// Popula o select #pr-local com opções genéricas + locais personalizados do
// LIBS. Chamado ao abrir o Step 1 da prescrição (preencherStep1DaAnamnese),
// ANTES do setVal dos outros campos — assim as opções libs:X já existem quando
// o código tenta restaurar o valor salvo.
// valorDesejado (opcional): valor libs:X a selecionar após popular. Se omitido,
// preserva o valor atual do select (comportamento antigo).
function populateLocalSelect(valorDesejado){
  const sel = document.getElementById('pr-local');
  if(!sel) return;
  // Lê valor atual ANTES de limpar — só usado como fallback se valorDesejado
  // não for passado. Quando chamado de preencherStep1DaAnamnese(), valorDesejado
  // vem do treino salvo e é confiável; o sel.value antes de popular pode ser
  // um valor hardcoded do HTML que não existe nas novas opções.
  const valRestaurar = (valorDesejado !== undefined && valorDesejado !== null)
    ? valorDesejado
    : sel.value;
  // Limpa todas as opções (inclusive as hardcoded do HTML)
  sel.innerHTML = '';
  const libsLocais = (typeof LIBS !== 'undefined') ? (LIBS?.locais||[]) : [];
  // "Todos os Equipamentos" (id=-1) — opção primária/padrão
  const interno = libsLocais.find(l => l.id === -1);
  const optInterno = document.createElement('option');
  optInterno.value = 'libs:-1';
  optInterno.textContent = interno ? interno.nome : 'Todos os Equipamentos';
  optInterno.title = interno ? (interno.equipamentos||[]).join(', ') : '';
  sel.appendChild(optInterno);
  // Locais criados pelo usuário (id > 0)
  const userLocais = libsLocais.filter(l => l.id !== -1);
  if(userLocais.length){
    const sep = document.createElement('option');
    sep.disabled = true;
    sep.textContent = '── Locais personalizados ──';
    sel.appendChild(sep);
    userLocais.forEach(loc => {
      const opt = document.createElement('option');
      opt.value = `libs:${loc.id}`;
      opt.textContent = loc.nome || `Local ${loc.id}`;
      opt.title = (loc.equipamentos||[]).join(', ');
      sel.appendChild(opt);
    });
  }
  // Local que o aluno cadastrou pelo Portal (se houver)
  const sAt = (typeof getActive === 'function') ? getActive() : null;
  const locAluno = sAt?.anamnese?.local;
  const infoAluno = locAluno && String(locAluno).startsWith('aluno:') ? _localDoAluno(locAluno) : null;
  if(infoAluno){
    const sep2 = document.createElement('option');
    sep2.disabled = true;
    sep2.textContent = '── Local do aluno ──';
    sel.appendChild(sep2);
    const opt = document.createElement('option');
    opt.value = locAluno;
    opt.textContent = '' + infoAluno.nome;
    opt.title = (infoAluno.equipamentos||[]).join(', ');
    sel.appendChild(opt);
  }
  // Restaura valor desejado se existir nas opções; senão mantém a primeira opção
  if(valRestaurar && [...sel.options].some(o => o.value === valRestaurar)){
    sel.value = valRestaurar;
  }
}

function motorRand(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }

// ── Modal de Vídeo Embutido ──────────────────────────────────────────────────
// Extrai o ID do YouTube de qualquer formato de URL (youtu.be/ID ou ?v=ID)
// e abre um modal inline sem redirecionar pro YouTube.
function _ytId(url){
  if(!url) return null;
  const m = url.match(/(?:youtu\.be\/|[?&]v=)([\w-]{11})/);
  return m ? m[1] : null;
}
function abrirVideoModal(url, titulo){
  const id = _ytId(url);
  if(!id){ if(/^https?:\/\//i.test(url||'')) window.open(url,'_blank','noopener,noreferrer'); return; } // fallback: nova aba (só http/https)
  const modal = document.getElementById('modal-video');
  const iframe = document.getElementById('modal-video-iframe');
  const tituloEl = document.getElementById('modal-video-titulo');
  if(!modal || !iframe) return;
  // Aberto via file:// o YouTube recusa o embed (Erro 153, sem Referer) -> abre em nova aba
  if(location.protocol === 'file:'){ window.open(`https://www.youtube.com/watch?v=${id}`,'_blank'); return; }
  iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&origin=${encodeURIComponent(location.origin)}`;
  if(tituloEl) tituloEl.textContent = titulo || '';
  modal.classList.remove('hidden');
  // Fecha no ESC
  modal._escHandler = (e) => { if(e.key==='Escape') fecharVideoModal(); };
  document.addEventListener('keydown', modal._escHandler);
}
function fecharVideoModal(){
  const modal = document.getElementById('modal-video');
  const iframe = document.getElementById('modal-video-iframe');
  if(!modal) return;
  modal.classList.add('hidden');
  if(iframe) iframe.src = ''; // para o áudio
  if(modal._escHandler){ document.removeEventListener('keydown', modal._escHandler); modal._escHandler = null; }
}

// ── Tempo de execução — Momento 1 (tela de modelos) ─────────────────────────
// Fechado e validado com o Milton em 2026-08-29 (planilha linha a linha,
// bateu 100%). Usa REPS_REF[objetivo] e INT_DESCANSO[objetivo] diretamente
// (keyed por código de objetivo). A variação mín/máx da sessão vem da
// lateralidade dos exercícios, não de faixas de valência.

// Troca (30s) — acontece entre exercícios de um mesmo biset/triset E entre os
// dois lados de um exercício Unilateral. Mesmo valor nos dois casos (regra
// fechada em 2026-08-29). Não aparece pro personal/aluno, só entra no cálculo.
const TEMPO_TROCA_SEG = 30;

// Tempo (em segundos) de execução de UMA repetição — min/médio/máx — olhando
// todos os exercícios do banco cujo grupo PRINCIPAL bate com `grupoNome`.
// Não considera lateralidade/dobra aqui (isso entra no momento 2, quando o
// exercício real já foi escolhido — ver _blocosExecucao/calcularTempoEstimadoTreino).
function tempoRepPorGrupo(grupoNome){
  const exs = DB_EXERCICIOS.filter(e => e.g.some(x => x.chave === grupoNome));
  const tempos = exs.map(e => e.tempo).filter(t => t > 0);
  if(!tempos.length) return null;
  return {
    min: Math.min(...tempos),
    max: Math.max(...tempos),
    medio: +(tempos.reduce((a,b)=>a+b,0) / tempos.length).toFixed(2),
    nExercicios: exs.length,
  };
}

// Estimativa de duração de UMA sessão pra um grupo, dado o objetivo e o
// número de séries planejadas (vem do modelo de volume já existente). Usa
// REPS_REF[objetivo] e INT_DESCANSO[objetivo] direto + o tempo
// MÉDIO de execução do grupo (tempoRepPorGrupo) — ainda não sabemos qual
// exercício específico vai ser escolhido nesta tela, só o grupo. Retorna
// segundos, considerando 2 cenários (regra fechada com o Milton em
// 2026-08-29): mínimo = tudo Bilateral (sem dobra, sem troca de lado);
// máximo = tudo Unilateral (dobra a execução + 1 troca de 30s por
// exercício/série). O médio (mostrado pro personal) é a média dos dois.
function estimarTempoSessaoGrupo(grupoNome, objetivo, numSeries){
  const tempo = tempoRepPorGrupo(grupoNome);
  const ref = { reps: parseFaixaMedia(REPS_REF[objetivo]||REPS_REF['Hip']), descansoSeg: parseFaixaMedia(INT_DESCANSO[objetivo]||INT_DESCANSO['Hip']) };
  if(!tempo || !numSeries) return null;
  const min = numSeries * (tempo.medio * ref.reps + ref.descansoSeg);
  const max = numSeries * (tempo.medio * ref.reps * 2 + TEMPO_TROCA_SEG + ref.descansoSeg);
  return { min, max, medio: (min + max) / 2 };
}

// Mesma lógica de estimarTempoSessaoGrupo, mas pra SESSÃO INTEIRA (vários
// grupos de uma vez) — é a função que a tela de modelos usa de fato.
// `gruposPlanejados`: [{ grupo, nExercicios, nSeries }, ...] — o que o modelo
// de divisão já decidiu antes de escolher qualquer exercício específico.
// Retorna { min, max, medio } em segundos (soma de todos os grupos).
function estimarTempoModeloSessao(gruposPlanejados, objetivo){
  const ref = { reps: parseFaixaMedia(REPS_REF[objetivo]||REPS_REF['Hip']), descansoSeg: parseFaixaMedia(INT_DESCANSO[objetivo]||INT_DESCANSO['Hip']) };
  let min = 0, max = 0;
  for(const { grupo, nExercicios, nSeries } of (gruposPlanejados || [])){
    const tempo = tempoRepPorGrupo(grupo);
    if(!tempo || !nExercicios || !nSeries) continue;
    min += nExercicios * nSeries * (tempo.medio * ref.reps + ref.descansoSeg);
    max += nExercicios * nSeries * (tempo.medio * ref.reps * 2 + TEMPO_TROCA_SEG + ref.descansoSeg);
  }
  return { min, max, medio: (min + max) / 2 };
}

// ── Normalização de texto — ignora acentos e caixa em todas as comparações ──
// Resolve o descasamento estrutural entre GRUPOS_MAPA (sem acento: 'Latissimo',
// 'Deltoide', 'Gluteos'...) e DB_EXERCICIOS (com acento: 'Latíssimo', 'Deltóide',
// 'Glúteos'...). Antes desta correção, 8 dos 12 grupos musculares da tela de
// Volume retornavam ZERO exercícios sempre, porque e.g!==musculo nunca casava
// para esses grupos — comparação direta de string é frágil para dados em
// português com acentuação que vêm de fontes diferentes.
// Normalização para BUSCA FUZZY — remove acentos e baixa caixa, mas preserva
// espaços (necessários para o split por palavra em buscaFuzzy).
function normalizarTexto(str){
  if(!str) return '';
  return str
    .toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .trim();
}

// Normalização para COMPARAÇÃO EXATA de identificadores — remove acentos,
// espaços e caixa. Cobre casos como "RetoAbdominal" (GRUPOS_MAPA) vs.
// "Reto Abdominal" (DB_EXERCICIOS), além do problema original de acentuação.
function normalizarIdentificador(str){
  return normalizarTexto(str).replace(/\s+/g, '');
}

// Compara dois identificadores ignorando acento/espaço/caixa — usar em vez de
// === sempre que uma string vier de fonte diferente da outra (ex: GRUPOS_MAPA
// 'RetoAbdominal' vs DB_EXERCICIOS 'Reto Abdominal').
function textoIgual(a, b){
  return normalizarIdentificador(a) === normalizarIdentificador(b);
}

// `uni` (flag binária) virou `lateralidade` — 3 categorias (2026-08-28):
// Bilateral / Bilateral com Carga Unilateral / Unilateral. Só "Unilateral" de
// fato exige trocar de lado (dobra o tempo de execução) — "Bilateral com Carga
// Unilateral" (ex.: agachamento com halteres) é um movimento só, sem troca.
function _exercicioUnilateral(e){
  return e.lateralidade?.chave === 'Unilateral';
}
function _exercicioBilateralCU(e){
  return e.lateralidade?.chave === 'BilateralCargaUnilateral';
}

// Alto impacto (2026-08-28) — não existe campo no banco (nem `tp` nem `pad`
// identificam isso de forma confiável: só 1 exercício tem tp="Potência" e
// "Aeróbio" hoje inclui abdominais que não têm nada de impacto). Detecção por
// nome — lista curta e curada manualmente, resultado de varredura na base
// atual (9 exercícios em 692). Revisar/expandir conforme a base crescer.
const _REGEX_ALTO_IMPACTO = /salto|polichinelo|burpee|corrida|correr/i;
function _exercicioAltoImpacto(e){
  const n = e.n.toLowerCase();
  if(n.includes('sem salto')) return false; // "Burpee sem Salto" etc — não conta
  return _REGEX_ALTO_IMPACTO.test(e.n);
}

// Busca fuzzy por fragmento — ignora acentos/caixa e permite que o personal
// digite abreviações como "sup re" para encontrar "Supino Reto - Barra" ou
// "sup hal" para encontrar as variações de Supino com Halter. Cada palavra do
// termo de busca deve aparecer como substring em algum lugar do texto alvo,
// na ordem em que foi digitada — não precisa ser contígua nem completa.
function buscaFuzzy(termoBusca, textoAlvo){
  const termo = normalizarTexto(termoBusca);
  const alvo  = normalizarTexto(textoAlvo);
  if(!termo) return true;
  const palavras = termo.split(/\s+/).filter(Boolean);
  let posicaoAtual = 0;
  for(const palavra of palavras){
    const idx = alvo.indexOf(palavra, posicaoAtual);
    if(idx === -1) return false;
    posicaoAtual = idx + palavra.length;
  }
  return true;
}

// Filtra uma lista de exercícios por termo de busca fuzzy no nome (e opcionalmente
// no equipamento), para uso nos campos de busca de exercício da interface.
function filtrarExerciciosPorBusca(lista, termoBusca){
  if(!termoBusca || !termoBusca.trim()) return lista;
  return lista.filter(e => buscaFuzzy(termoBusca, e.n) || buscaFuzzy(termoBusca, e.eq||''));
}

// Compara NIVEIS por chave ASCII ('Iniciante'/'Intermediario'/'Avancado').
// Antes a tabela era indexada por rotulo acentuado e qualquer descasamento caia
// no `||1` — um exercicio Avancado virava Iniciante em silencio e passava no
// bloqueio duro de um aluno iniciante. Com chave nao ha acento na comparacao.
function nivelOk(exNivelChave, alunoNivelChave){
  const ordem={Iniciante:1,Intermediario:2,Avancado:3};
  return (ordem[exNivelChave]||1)<=(ordem[alunoNivelChave]||1);
}

// Rotulo para EXIBICAO — mantem acento, nunca usar em comparacao.
function nivelLabel(n){
  return n==='Inic'?'Iniciante':n==='Inte'?'Intermediário':'Avançado';
}

// Chave para COMPARACAO — espelha nivelLabel sem acento.
function nivelChave(n){
  return n==='Inic'?'Iniciante':n==='Inte'?'Intermediario':'Avancado';
}

// Tipos elegíveis pra seleção AUTOMÁTICA de exercício (ver sortearExercicioC4).
// Não é corte de pool manual — mobilidade/estabilidade/flexibilidade/aeróbio/
// liberação continuam disponíveis pra escolha manual do personal, só não
// entram no sorteio automático. Fonte: e.tp (Supabase), nunca nome do
// exercício (2026-09-18: corte por prefixo de nome era frágil — pegava/deixava
// passar exercício errado sempre que o nome fugia do padrão esperado).
const _TIPOS_SELECAO_AUTOMATICA = ['Forca','Potencia'];

// ── Pool base (FONTE ÚNICA DE VERDADE do corte inicial) ──────────────────────
// Extraído de filtrarExerciciosFicha em 2026-09-08. Antes existiam DUAS funções
// de pool independentes: esta (motor, com nível+resistência) e filtrarExercicios
// em avaliacao.js (contador da coluna "Filtro", só com grupo muscular). O contador
// mostrava o MESMO número para Iniciante e Avançado, e para "Todos os Equipamentos"
// e um studio limitado — divergindo do pool que o motor de fato sorteia.
// Agora as duas passam por aqui: é impossível divergir de novo.
//
// Corte inicial = grupo + equipamento exato (local) + nível + CI. Tudo que vem
// depois (camada clínica, classificação, sorteio) opera sobre este pool, nunca
// sobre o banco inteiro. (2026-09-16: corte de equipamento trocou de "tipo de
// resistência liberado" — furado, ver getEquipamentosPermitidos — pra match
// exato do e.eq de cada exercício.) (2026-09-18: corte de mobilidade/aeróbio
// por prefixo de nome saiu daqui — pool manual mostra todos os tipos; o corte
// pra Força/Potência agora é só da seleção automática, ver sortearExercicioC4.)
function poolBaseExercicios(musculo, porcao, equipPermitidos, nivelAluno, contraindicacoes){
  const chaveGrupo = porcao ? musculo + normalizarIdentificador(porcao) : musculo;
  return DB_EXERCICIOS.filter(e=>{
    if(!e.g.some(x=>x.chave === chaveGrupo)) return false;
    if(!_exercicioEquipamentoOk(e, equipPermitidos)) return false;
    if(!e.nv || !nivelOk(e.nv.chave, nivelChave(nivelAluno))) return false;
    if(e.ci?.length && contraindicacoes){
      const ciAluno = String(contraindicacoes).toLowerCase();
      if(e.ci.some(c => ciAluno.includes(c.nome.toLowerCase()))) return false; // `nome` de proposito: compara contra texto livre da anamnese
    }
    return true;
  });
}

// Contexto de prescrição da tela (nível + local → resistência + contraindicações).
// Ponto único de leitura: quem precisa contar/filtrar exercício usa isto, em vez
// de reler os selects por conta própria e divergir.
function getContextoPool(){
  const s      = (typeof getActive === 'function') ? getActive() : null;
  const nivel  = val('pr-nivel')  || s?.anamnese?.nivel || 'Inic';
  const local  = val('pr-local')  || s?.anamnese?.local || '';
  const lesoes = (s?.perfil?.lesoes||'') + ' ' + (s?.anamnese?.preferencias||'');
  return { nivel, local, resist: getEquipamentosPermitidos(local), lesoes };
}

function filtrarExerciciosFicha(musculo, porcao, resistPermitida, nivelAluno, contraindicacoes){
  // Filtro base (nível, recurso, ci, grupo+porção) — delegado a poolBaseExercicios
  // Porção deixou de ser campo à parte (`e.p`) — agora é lida como uma variação
  // do próprio grupo muscular (ex.: "Peitoral" casa com "Peitoral" e também com
  // "Peitoral Superior" dentro de `e.g`), conforme decisão da revisão de 2026-08-28.
  // Grupo casa por `chave` (ASCII, sem espaco) — mesmo formato dos ids de
  // GRUPOS_MAPA, de onde `musculo` vem. Antes usava buscaFuzzy sobre `nome`,
  // que quebrava para ids de mais de uma palavra: buscaFuzzy('RetoAbdominal',
  // 'Reto abdominal') dava false porque o termo normalizado perde o espaco mas
  // o alvo nao — resultado: abdomen NUNCA entrava na prescricao.
  // `porcao` refina montando a chave composta (ex.: 'PeitoralSuperior'). Hoje o
  // banco nao traz porcoes em `g`, entao esse filtro nao acha nada e o chamador
  // cai no fallback com porcao=null — comportamento identico ao anterior, mas
  // passa a funcionar sozinho se as porcoes forem adicionadas ao banco.
  let pool = poolBaseExercicios(musculo, porcao, resistPermitida, nivelAluno, contraindicacoes);

  // ── Camada 3: aplicar filtro clínico ──────────────────────────────────────
  const { bloqueios } = extrairFlagsClinicas();
  if(bloqueios.length){
    const poolFiltrado = pool.filter(e=>{
      for(const flag of bloqueios){
        const regra = FLAGS_FILTRO[flag];
        if(regra?.bloqueio(e)) return false;
      }
      return true;
    });
    // Só aplicar se restar pelo menos 1 exercício — senão usar pool original
    if(poolFiltrado.length > 0) pool = poolFiltrado;
  }

  return pool;
}

function sortearExercicio(pool, jaUsados){
  const disponivel = pool.filter(e => !jaUsados.has(e.n));
  if(disponivel.length === 0) return pool[Math.floor(Math.random() * pool.length)] || null;
  return disponivel[Math.floor(Math.random() * disponivel.length)];
}

// ── Camada 4 — Classificação de exercícios ─────────────────────────────────
// Renomeado de "PESO_SORTEIO"/"score" pra CLASSIFICACAO (2026-08-28) — não é
// aleatoriedade sem critério, é uma nota final por exercício. Regra fechada
// com o Milton: cada característica que muda a nota vale sempre 1 ponto (pra
// mais ou pra menos) — nunca 2, 3 etc. A nota final é a soma de tudo; pode dar
// 0 (neutro, nenhum fator bateu), positivo (vários fatores bons) ou negativo
// (fator ruim pesa mais que os bons). O que decide é o valor final, não um
// fator isolado. Nenhum fator aqui BLOQUEIA — só sobe/desce a nota, e quem tem
// nota mais alta tem mais chance de ser sorteado (nunca zero chance).
const CLASSIFICACAO = {
  prioridadeClinica: 1, // +1 — prioritário por flag clínica (assimetria etc.)
  tipoCadeia:        1, // +1 — combina com tipo/cadeia preferida da condição clínica (item 16)
  variedadePad:      1, // +1 — traz padrão de movimento ainda não usado neste treino (item 19)
  eficiente:         1, // +1 — multiarticular + atinge grupo secundário, quando a sessão está apertada
  naoRecomendado:    1, // −1 — "não recomendado" pro aluno (hoje: Baixo Impacto com IMC≥30). Mesmo tratamento visual/de nota que lesão vai receber quando a arquitetura de pontuação clínica completa for implementada (item pendente).
  favorito:          1, // +1 — favoritado pelo personal (LIBS.favoritos) — preferência de curadoria
  preferidoAluno:    1, // +1 — exercício está na lista de preferidos do aluno (anamnese)
  naoGrupoMae:       1, // −1 — grupo da sessão não é o 1º (grupo mãe) do array `g` do exercício — ele
                         // trabalha o grupo mas não é o alvo principal (ex.: Afundo p/ Glúteos quando
                         // g=[Quadríceps,Glúteos]). Continua elegível, só perde prioridade no sorteio.
};

// ── Favoritar exercício por personal ────────────────────────────────────────
// LIBS.favoritos: array de exercise IDs (numérico) que o personal marcou como
// favoritos. Vinculado à CONTA do personal, nunca ao banco original nem ao
// aluno — substitui o antigo `base_exercicio` que foi removido (2026-08-28).
// A preferência dá +1 na classificação (ver CLASSIFICACAO.favorito) e mostra
// ⭐ no seletor. Persistido em localStorage + Supabase via saveLibs/supaAutoSave.
function ehFavorito(exId){
  return (typeof LIBS !== 'undefined' && (LIBS?.favoritos||[])).includes(Number(exId));
}
function toggleFavorito(exId, elOuEvt){
  if(typeof LIBS === 'undefined') return;
  if(!LIBS.favoritos) LIBS.favoritos = [];
  const id = Number(exId);
  const idx = LIBS.favoritos.indexOf(id);
  if(idx >= 0) LIBS.favoritos.splice(idx, 1);
  else LIBS.favoritos.push(id);
  if(typeof saveLibs === 'function') saveLibs(LIBS);
  if(typeof supaAutoSave === 'function') supaAutoSave();
  // Atualiza ícone inline sem re-render completo
  const agora = ehFavorito(id); // após toggle
  if(elOuEvt && elOuEvt.nodeType === 1){
    if(elOuEvt.tagName === 'BUTTON'){
      elOuEvt.innerHTML = agora ? '<i class=ph-star></i> Favoritado' : '<i class=ph-star></i> Favoritar';
    } else {
      elOuEvt.innerHTML = agora ? '<span style="color:var(--amber);display:inline-flex"><i class=ph-star></i></span>' : '<i class=ph-star></i>';
      elOuEvt.title = agora ? 'Remover favorito' : 'Favoritar exercício';
    }
  }
}

function sortearExercicioC4(pool, jaUsados, musculo, exerciciosTreino, aperto){
  const { prioridades } = extrairFlagsClinicas();
  const prefTipoCadeia = preferenciasTipoCadeia();
  const s = getActive();

  // Exercícios preferidos e a evitar pelo aluno (anamnese.gosta_ex / evitar_ex)
  let _prefIds = new Set(), _evitIds = new Set();
  try{
    const _ae = s?.anamnese;
    if(_ae?.gosta_ex)  JSON.parse(_ae.gosta_ex).forEach(e=>_prefIds.add(Number(e.id)));
    if(_ae?.evitar_ex) JSON.parse(_ae.evitar_ex).forEach(e=>_evitIds.add(Number(e.id)));
  }catch(e){}

  // Variedade dentro do treino baseada em característica do exercício: tipo de
  // movimentação (campo `pad`). Ângulo já é coberto separadamente pelo filtro
  // de porção (PORCOES/filtrarExerciciosFicha) nos grupos que têm essa
  // informação; comprimento muscular (alongado/encurtado) ainda não existe no
  // banco — fica pra quando esse campo for criado. `imp` (impacto articular) é
  // classificação de risco, não característica de variabilidade — não entra aqui.
  const padsUsadosTreino = new Set((exerciciosTreino||[]).map(e=>e._pad).filter(Boolean));
  const trazVariedade = (e) => e.pad && !padsUsadosTreino.has(e.pad.id);

  // Prioritário clínico (flags Camada 4 — assimetria etc.)
  const isPrio = (e) => prioridades.some(p => { const fn=FLAGS_PRIORIDADE[p]; return fn && fn(e); });

  // Combina com a condição clínica do aluno (tipo ou cadeia preferida — item 16).
  // `tp` e `cad` são lista/objeto {id,nome,chave} — compara pela chave ASCII.
  const combinaComCondicao = (e) =>
    (e.tp||[]).some(t => prefTipoCadeia.tp.has(t.chave)) ||
    (e.cad && prefTipoCadeia.cad.has(e.cad.chave));

  // Eficiência (Fase F): multiarticular + atinge grupo muscular secundário
  // (campo `gs`) rende mais estímulo por série — vale mais quando a sessão
  // está apertada em relação ao tempo disponível. Antes era bônus contínuo
  // (escalava com `aperto`); virou fixo +1 pra seguir a regra "cada fator
  // vale sempre 1" (2026-08-28).
  const eficiente = (e) => e.art?.chave === 'Multiarticular' && !!(e.gs && e.gs.length);

  // "Não recomendado" (2026-08-28) — hoje só cobre Baixo Impacto (alto impacto
  // + IMC≥30). Não bloqueia, só tira 1 ponto da classificação e mostra aviso
  // visual (ver tag_naoRecomendado em abrirListaExercicios).
  const { bloqueios: flagsAtivas } = extrairFlagsClinicas();
  const naoRecomendado = (e) => flagsAtivas.includes('BaixoImpacto') && _exercicioAltoImpacto(e);

  // Seleção automática: restringe a Força/Potência (ver _TIPOS_SELECAO_AUTOMATICA)
  // — mobilidade/estabilidade/flexibilidade/aeróbio continuam elegíveis pra
  // escolha MANUAL (filtrarExerciciosFicha não corta por tipo), só não entram
  // no sorteio automático. Fallback pro pool completo se não sobrar nada —
  // não deveria acontecer (grupo já validado como disponível na tela de
  // seleção de grupos), mas evita deixar o slot sem exercício.
  let poolAutomatico = pool.filter(e => (e.tp||[]).some(t => _TIPOS_SELECAO_AUTOMATICA.includes(t.chave)));
  if(!poolAutomatico.length) poolAutomatico = pool;

  // 1. Filtrar já usados nesta sessão
  const todos = poolAutomatico.filter(e => !jaUsados.has(e.n));
  if(!todos.length) return poolAutomatico[Math.floor(Math.random() * poolAutomatico.length)] || null;

  // 2. Classificação por exercício — soma de todos os fatores (cada um ±1).
  const classificacaoDe = (e) => {
    let nota = 0;
    if(isPrio(e))              nota += CLASSIFICACAO.prioridadeClinica;
    if(combinaComCondicao(e))  nota += CLASSIFICACAO.tipoCadeia;
    if(trazVariedade(e))       nota += CLASSIFICACAO.variedadePad;
    if(aperto>0 && eficiente(e)) nota += CLASSIFICACAO.eficiente;
    if(naoRecomendado(e))      nota -= CLASSIFICACAO.naoRecomendado;
    if(ehFavorito(e.id))       nota += CLASSIFICACAO.favorito;
    if(_prefIds.has(Number(e.id))) nota += CLASSIFICACAO.preferidoAluno;
    if(e.g?.[0] && e.g[0].chave !== musculo) nota -= CLASSIFICACAO.naoGrupoMae;
    return nota;
  };

  // 3. Montar pool ponderado repetindo cada exercício conforme sua nota —
  // nota mais alta = mais chance, mas nunca zero chance (mínimo 1 entrada).
  // Exercícios explicitamente evitados pelo aluno são removidos do pool.
  const ponderado = [];
  todos.forEach(e => {
    if(_evitIds.has(Number(e.id))) return; // aluno pediu pra evitar — exclui
    const n = Math.max(1, Math.round(classificacaoDe(e)));
    for(let i=0; i<n; i++) ponderado.push(e);
  });

  const final = ponderado.length ? ponderado : todos;
  return final[Math.floor(Math.random() * final.length)];
}

// ── Painel de assimetrias ativas (Camada 4) ─────────────────────────────────
function renderPainelAssimetrias(){
  const el = $('ficha-assimetrias'); if(!el) return;
  const s = getActive();
  if(!s?.anamnese){ el.style.display='none'; return; }
  const a = s.anamnese;
  const notas = [];

  // Coxa
  const coxaD=parseFloat(a.coxa_d), coxaE=parseFloat(a.coxa_e);
  if(coxaD&&coxaE&&Math.abs(coxaD-coxaE)>=1){
    const lado=coxaD>coxaE?'E':'D';
    notas.push(`⚑ Quadríceps/Glúteos: iniciar exercícios unilaterais pelo lado <strong>${lado}</strong> (coxa Δ${Math.abs(coxaD-coxaE).toFixed(1)}cm)`);
  }
  // Equilíbrio
  const eqD=parseFloat(a.equilibrio_d), eqE=parseFloat(a.equilibrio_e);
  if(eqD&&eqE&&Math.abs(eqD-eqE)>=3){
    const lado=eqD<eqE?'D':'E';
    notas.push(`⚑ Equilíbrio: priorizar estabilização lado <strong>${lado}</strong> (Δ${Math.abs(eqD-eqE).toFixed(0)}s)`);
  }
  // Braço
  const bracoD=parseFloat(a.braco_d), bracoE=parseFloat(a.braco_e);
  if(bracoD&&bracoE&&Math.abs(bracoD-bracoE)>=1){
    const lado=bracoD>bracoE?'E':'D';
    notas.push(`⚑ MMSS: iniciar exercícios unilaterais pelo lado <strong>${lado}</strong> (braço Δ${Math.abs(bracoD-bracoE).toFixed(1)}cm)`);
  }
  // Preensão
  const grD=parseFloat(a.grip_d), grE=parseFloat(a.grip_e);
  if(grD&&grE&&Math.abs(grD-grE)>=2){
    const lado=grD<grE?'D':'E';
    notas.push(`⚑ Preensão: lado <strong>${lado}</strong> mais fraco (Δ${Math.abs(grD-grE).toFixed(1)}kg) — usar carga independente`);
  }
  // Prancha lateral
  const pld=parseFloat(a.prancha_lat_d), ple=parseFloat(a.prancha_lat_e);
  if(pld&&ple&&(Math.abs(pld-ple)/Math.max(pld,ple))>0.10){
    const lado=pld<ple?'D':'E';
    notas.push(`⚑ Core lateral: lado <strong>${lado}</strong> mais fraco na prancha (Δ${(Math.abs(pld-ple)/Math.max(pld,ple)*100).toFixed(0)}%) — duplicar séries laterais`);
  }
  // Isquiotibial
  if(['Moderado','Acentuado'].some(v=>(a.isquio_d||'').includes(v)||(a.isquio_e||'').includes(v))){
    notas.push('⚑ Isquiotibiais: incluir mobilização pré-exercício de cadeia posterior');
  }
  // Valgo
  if((a.fms_slsq_flag||'').includes('Valgo')||(a.fms_ohsa_flag||'').includes('Valgo')){
    notas.push('⚑ Valgo de joelho: ativação de glúteo médio no aquecimento — abdução e side step');
  }

  if(!notas.length){ el.style.display='none'; return; }
  el.style.display='block';
  const corpoAss = `
    <div style="padding:10px 14px;background:var(--amber-dim);border:1px solid var(--amber-line);border-radius:var(--radius)">
      <div style="font-size:12px;font-variant-numeric:tabular-nums;color:var(--amber);margin-bottom:7px;">
        ⚑ Ajustes por assimetrias — Camada 4
      </div>
      <div style="display:flex;flex-direction:column;gap:5px">
        ${notas.map(n=>`<div style="font-size:12px;color:var(--text2);line-height:1.5">${n}</div>`).join('')}
      </div>
    </div>`;
  el.innerHTML = prAcc('ph-warning', notas.length + (notas.length===1?' ajuste':' ajustes') + ' por assimetria', 'Camada 4: toque para ver', corpoAss, {cls:'pr-acc-aviso', key:'assim'});
}


function gerarNotaAssimetria(musculo){
  const s = getActive();
  if(!s?.anamnese) return '';
  const a = s.anamnese;
  const notas = [];

  // Assimetria de coxa → iniciar pelo lado mais fraco em MMII unilaterais
  const coxaD = parseFloat(a.coxa_d), coxaE = parseFloat(a.coxa_e);
  if(coxaD && coxaE && Math.abs(coxaD - coxaE) >= 1 &&
     ['Quadriceps','Isquiossurais','Gluteos'].includes(musculo)){
    const lado = coxaD > coxaE ? 'E' : 'D';
    notas.push(`⚑ Iniciar pelo lado ${lado} (assimetria coxa Δ${Math.abs(coxaD-coxaE).toFixed(1)}cm)`);
  }

  // Assimetria de equilíbrio
  const eqD = parseFloat(a.equilibrio_d), eqE = parseFloat(a.equilibrio_e);
  if(eqD && eqE && Math.abs(eqD - eqE) >= 3 &&
     ['Quadriceps','Gluteos'].includes(musculo)){
    const lado = eqD < eqE ? 'D' : 'E';
    notas.push(`⚑ Priorizar estabilização lado ${lado} (equilíbrio Δ${Math.abs(eqD-eqE).toFixed(0)}s)`);
  }

  // Assimetria de braço
  const bracoD = parseFloat(a.braco_d), bracoE = parseFloat(a.braco_e);
  if(bracoD && bracoE && Math.abs(bracoD - bracoE) >= 1 &&
     ['Biceps','Triceps','Peitoral','Latissimo','Deltoide'].includes(musculo)){
    const lado = bracoD > bracoE ? 'E' : 'D';
    notas.push(`⚑ Iniciar pelo lado ${lado} (assimetria braço Δ${Math.abs(bracoD-bracoE).toFixed(1)}cm)`);
  }

  // Assimetria de preensão
  const grD = parseFloat(a.grip_d), grE = parseFloat(a.grip_e);
  if(grD && grE && Math.abs(grD - grE) >= 2 &&
     ['Biceps','Triceps','Latissimo'].includes(musculo)){
    const lado = grD < grE ? 'D' : 'E';
    notas.push(`⚑ Lado ${lado} mais fraco na preensão (Δ${Math.abs(grD-grE).toFixed(1)}kg) — usar carga independente`);
  }

  // Assimetria de prancha lateral → core antirotacional
  const pld = parseFloat(a.prancha_lat_d), ple = parseFloat(a.prancha_lat_e);
  if(pld && ple && (Math.abs(pld-ple)/Math.max(pld,ple)) > 0.10 &&
     ['RetoAbdominal','Obliquo'].includes(musculo)){
    const lado = pld < ple ? 'D' : 'E';
    notas.push(`⚑ Lado ${lado} mais fraco na prancha lateral — duplicar séries laterais deste lado`);
  }

  // Isquiotibial → encurtamento
  if(musculo === 'Isquiossurais'){
    const iD = a.isquio_d || '', iE = a.isquio_e || '';
    if(['Moderado','Acentuado'].some(v => iD.includes(v) || iE.includes(v))){
      notas.push('⚑ Encurtamento de isquio — incluir mobilização pré-exercício');
    }
  }

  return notas.join(' | ');
}



// ─── STEP 3: VOLUME → DIVISÃO → FICHA ───────────────────────────────────────

// MEV/MRV: Israetel, Hoffman & Smith (2019) — Scientific Principles of Hypertrophy Training
// Fonte: FASE-3-Variaveis-e-Metodos.md (ACM Obsidian v2.0)
const GRUPOS_MAPA = [
  {id:'Peitoral',      label:'Peito',       mev:8,  mav_min:12, mav_max:20, mrv:22},
  {id:'Latissimo',     label:'Costas',      mev:8,  mav_min:14, mav_max:22, mrv:25},
  {id:'Deltoide',      label:'Ombro',       mev:8,  mav_min:16, mav_max:22, mrv:26},
  {id:'Triceps',       label:'Tríceps',     mev:6,  mav_min:12, mav_max:18, mrv:22},
  {id:'Biceps',        label:'Bíceps',      mev:6,  mav_min:14, mav_max:20, mrv:26},
  {id:'Quadriceps',    label:'Quadríceps',  mev:8,  mav_min:12, mav_max:18, mrv:20},
  {id:'Isquiossurais', label:'Posteriores', mev:6,  mav_min:10, mav_max:16, mrv:20},
  {id:'Gluteos',       label:'Glúteos',     mev:4,  mav_min:8,  mav_max:16, mrv:20},
  {id:'Panturrilhas',  label:'Panturrilha', mev:8,  mav_min:12, mav_max:16, mrv:20},
  {id:'RetoAbdominal', label:'Abdômen',     mev:4,  mav_min:8,  mav_max:16, mrv:20},
  {id:'Obliquo',       label:'Oblíquos',    mev:4,  mav_min:8,  mav_max:14, mrv:18},
  {id:'Trapezio',      label:'Trapézio',    mev:6,  mav_min:10, mav_max:16, mrv:20},
];

// visualização de volume via tabela (vol-tbody)

// ── Mapeamento de família por objetivo (vault REF-Volume-Derivado-MAV §3/§6) ──
const FAMILIA_OBJETIVO = {
  Hip:'Hip', Emagr:'Hip', Comp:'Hip',
  Forca:'Forca', Esport:'Forca',
  Resist:'Resist', Envelhec:'Resist', Saude:'Resist', Func:'Resist', CardioR:'Resist',
  Reab:'Reab', Gestacao:'Gestacao',
};

// ── Fator de escala por Objetivo sobre Volume por Grupo (vault §3, base 2026-06) ──
// Base de referência = Resistência (1.00). Nenhum fator > 1.00 (regra: sempre reduzir do teto).
// Reab/Gestacao não usam este fator — fonte clínica própria, fora deste pacote de variável.
const FATOR_OBJETIVO_VOLGRUPO = {
  Resist:   {Inic:1.00, Inte:1.00, Avan:1.00},
  Hip:      {Inic:0.88, Inte:0.84, Avan:0.80},
  Forca:    {Inic:0.62, Inte:0.60, Avan:0.58},
  Saude:    {Inic:1.00, Inte:1.00, Avan:1.00}, // provisório, sem fonte própria — vault §3/§5
  Envelhec: {Inic:1.00, Inte:1.00, Avan:1.00},
  Func:     {Inic:1.00, Inte:1.00, Avan:1.00},
  CardioR:  {Inic:1.00, Inte:1.00, Avan:1.00},
};

// ── Zonas de Volume por Grupo × Sexo (vault §8) — valores já escalados para Avançado ──
// Inte/Inic aplicam 0.80/0.60 sobre estes valores (vault §8.1/§8.2), com piso no MEV do grupo.
// Vale para QUALQUER objetivo (correção 2026-06) — fator de Objetivo aplica-se POR CIMA do resultado.
const ZONAS_VOLUME_SEXO = {
  M: {
    Latissimo:     [24,28], Peitoral:      [24,28], Deltoide:      [24,28],
    Quadriceps:    [18,22],
    Isquiossurais: [12,16], Biceps:        [12,16], Triceps:       [12,16],
    Gluteos:       [4,8],   RetoAbdominal: [4,8],   Trapezio:      [4,8],
    Panturrilhas:  [8,12],
  },
  F: {
    Quadriceps:    [18,22], Gluteos:       [18,22], Isquiossurais: [18,22],
    Latissimo:     [14,17], Deltoide:      [14,17],
    Panturrilhas:  [8,12],  Triceps:       [8,12],  Biceps:        [8,12],
    RetoAbdominal: [4,8],   Trapezio:      [4,8],
    Peitoral:      [8,12],
  },
};

function getZonaVolumeGrupo(grupoId, sexo, nivel){
  // Oblíquo herda de RetoAbdominal (vault §8.1/§8.2, sem fonte própria)
  const idEfetivo = (grupoId === 'Obliquo') ? 'RetoAbdominal' : grupoId;
  const s = (sexo === 'F') ? 'F' : 'M';
  const base = (ZONAS_VOLUME_SEXO[s] || ZONAS_VOLUME_SEXO.M)[idEfetivo];
  if(!base) return null; // sem zona definida para este grupo — caller usa fallback do MAV puro
  const fatorNivel = nivel === 'Avan' ? 1.00 : nivel === 'Inte' ? 0.80 : 0.60;
  return [Math.round(base[0]*fatorNivel), Math.round(base[1]*fatorNivel)];
}

// ── Volume por Grupo — fórmula final (vault §1: Grupo → Sexo → Nível → Objetivo → piso MEV) ──
function getVolumePorGrupo(grupoId, sexo, nivel, objetivo){
  const grupo = GRUPOS_MAPA.find(g => g.id === grupoId);
  if(!grupo) return [0,0];
  const { mev, mav_min, mav_max, mrv } = grupo;

  const familia = FAMILIA_OBJETIVO[objetivo] || 'Resist';

  // Reab/Gestacao: fora de escopo deste fator — fonte clínica própria (vault §3, §9), não tratada aqui
  if(familia === 'Reab' || familia === 'Gestacao'){
    return [mav_min || mev, mav_max || mrv];
  }

  const zona = getZonaVolumeGrupo(grupoId, sexo, nivel);
  const fatorObjetivo = (FATOR_OBJETIVO_VOLGRUPO[familia] || FATOR_OBJETIVO_VOLGRUPO['Resist'])[nivel] ?? 1.00;

  let semMin, semMax;
  if(zona){
    semMin = Math.round(zona[0] * fatorObjetivo);
    semMax = Math.round(zona[1] * fatorObjetivo);
  } else {
    // Sem zona de sexo definida para o grupo (ex.: Trapézio em algumas combinações) →
    // cai direto no MAV puro do grupo (vault §2), ainda escalado pelo fator de Objetivo.
    semMin = Math.round((mav_min || mev) * fatorObjetivo);
    semMax = Math.round((mav_max || mrv) * fatorObjetivo);
  }

  // Piso de segurança — nunca abaixo do MEV do próprio grupo (vault §1, passo 5)
  semMin = Math.max(semMin, mev);
  semMax = Math.max(semMax, mev);

  return [semMin, semMax];
}

let _s3 = {
  seriesPorEx: 3,
  volPorGrupo: {},      // {id: {sem, sessao, freq}}
  divisaoIdx: 0,
  divisaoOpcoes: [],    // calculadas a partir do volume
  fichaObj: null,
  treinoAtivo: 0,
  aquecTipos: ['Mobilidade'], // tipos de aquecimento selecionados (TIPOS_AQUECIMENTO valores)
};

// Modelos de periodização — alinhados com FASE-2 do Obsidian
// DORMENTE por decisão do personal (não usado hoje — todo treino roda em
// padrão Linear). Estrutura de dados mantida intacta pra reativação futura;
// só não é mais chamada em nenhum ponto do fluxo ativo enquanto
// PERIODIZACAO_ATIVA=false. Ver `_modeloSelecionado` mais abaixo.
const PERIODIZACAO_ATIVA = false;

const MODELOS_PERIODO = {
  LP:  { nome:'Linear Progressiva',    sigla:'LP',  desc:'Progressão de carga semana a semana. Ideal para iniciantes e retorno após pausa.', icon:'<i class=ph-trend-up></i>' },
  DUP: { nome:'DUP — Ondulação Diária', sigla:'DUP', desc:'Varia volume/intensidade a cada sessão. Excelente para intermediários e mulheres.', icon:'<i class=ph-wave-sine></i>' },
  BLO: { nome:'Blocos (Block)',         sigla:'BLO', desc:'Mesociclos concentrados em uma qualidade por vez. Ideal para quem tem data-alvo.', icon:'<i class=ph-wall></i>' },
  LPR: { nome:'Linear Reversa',         sigla:'LPR', desc:'Alta intensidade → maior volume. Foco em resistência muscular e condicionamento.', icon:'<i class=ph-arrows-clockwise></i>' },
  CON: { nome:'Conjugado',              sigla:'CON', desc:'Esforço máximo + dinâmico simultâneos. Restrito a homens avançados em força.', icon:'<i class=ph-lightning></i>' },
};

// Tabela de decisão: Objetivo × Nível × Sexo → Modelo recomendado
// Fonte: FASE-2-Objetivos-e-Periodizacao.md (ACM Obsidian v2.0)
const MODELO_TABELA = {
  Hip:    {Inic:{M:'LP',  F:'LP'},  Inte:{M:'DUP', F:'DUP'}, Avan:{M:'CON', F:'DUP'}},
  Forca:  {Inic:{M:'LP',  F:'LP'},  Inte:{M:'DUP', F:'DUP'}, Avan:{M:'CON', F:'BLO'}},
  Emagr:  {Inic:{M:'LP',  F:'LP'},  Inte:{M:'DUP', F:'DUP'}, Avan:{M:'DUP', F:'DUP'}},
  Comp:   {Inic:{M:'LP',  F:'LP'},  Inte:{M:'DUP', F:'DUP'}, Avan:{M:'BLO', F:'DUP'}},
  Resist: {Inic:{M:'LPR', F:'LPR'}, Inte:{M:'LPR', F:'LPR'}, Avan:{M:'LPR', F:'LPR'}},
  CardioR:{Inic:{M:'LPR', F:'LPR'}, Inte:{M:'LPR', F:'LPR'}, Avan:{M:'LPR', F:'LPR'}},
  Func:   {Inic:{M:'LP',  F:'LP'},  Inte:{M:'DUP', F:'DUP'}, Avan:{M:'DUP', F:'DUP'}},
  Saude:  {Inic:{M:'LP',  F:'LP'},  Inte:{M:'LP',  F:'LP'},  Avan:{M:'LP',  F:'LP'}},
  Esport: {Inic:{M:'LP',  F:'LP'},  Inte:{M:'BLO', F:'BLO'}, Avan:{M:'BLO', F:'BLO'}},
  Reab:   {Inic:{M:'LP',  F:'LP'},  Inte:{M:'LP',  F:'LP'},  Avan:{M:'LP',  F:'LP'}},
  Envelhec:{Inic:{M:'LP', F:'LP'},  Inte:{M:'LP',  F:'LP'},  Avan:{M:'LP',  F:'LP'}},
  Gestacao:{Inic:{M:'LP', F:'LP'},  Inte:{M:'LP',  F:'LP'},  Avan:{M:'LP',  F:'LP'}},
};

function recomendarModelo(obj, nivel, sexo){
  const s = (sexo === 'M') ? 'M' : 'F';
  return (MODELO_TABELA[obj]?.[nivel]?.[s]) || 'LP';
}

// Enquanto PERIODIZACAO_ATIVA=false, todo treino novo roda em Linear fixo —
// sem card clicável, sem recomendação automática por objetivo/nível/sexo.
// Treinos reabertos (aprovados ou vindos de biblioteca) preservam o modelo
// que já tinham gravado, não são forçados pra LP.
let _modeloSelecionado = '';

// ── Step 1 (Configurações Gerais) — resumo/sugestão do sistema ─────────────
// Substitui o antigo fillStep2() (tela de Periodização, agora dormente).
// Chamado a cada mudança relevante de objetivo/nível/frequência no step 1.
function atualizarResumoConfigGeral(){
  const s   = getActive(); if(!s) return;
  const nivel = val('pr-nivel');
  const freq  = val('pr-frequencia');
  const resumoEl = $('resumo-config-geral');
  if(!selectedObj || !nivel || !freq){
    if(resumoEl) resumoEl.style.display='none';
    return;
  }
  if(resumoEl) resumoEl.style.display='block';

  const sexo  = s.perfil?.sexo || '—';
  const obj   = OBJETIVOS.find(o=>o.code===selectedObj);
  const v     = VARIAVEIS_REF[selectedObj]||{};

  // Periodização dormente (ver PERIODIZACAO_ATIVA) — modelo sempre exibido
  // como Linear, sem recomendação dinâmica por objetivo/nível/sexo.
  $('modelo-recomendado').innerHTML = `<span><i class=ph-check></i></span><div>Base: <strong>${selectedObj}</strong> · <strong>${nivelLabel(nivel)}</strong> · <strong>${sexo}</strong> — sugestão do sistema pronta para a Distribuição.</div>`;
  $('info-objetivo').textContent  = obj ? obj.label : '—';
  $('info-modelo').textContent    = 'Linear (padrão)';
  $('info-freq').textContent      = freq + '/semana';
  $('info-nivel').textContent     = nivelLabel(nivel);
  $('info-sexo').textContent      = sexo;
  $('info-duracao').textContent   = (val('pr-duracao')||s.anamnese?.duracao||60) + ' min';

  const mods2 = calcModificadoresPerfil();
  const intervaloExibido = mods2.intervaloFator > 1.0 && v.intervalo && v.intervalo !== '—'
    ? `<span style="color:var(--amber)">${escHTML(v.intervalo)} → preferir limite superior ${mods2.intervaloMsg?'('+mods2.intervaloMsg.replace(/^<i class=ph-[a-z-]+><\/i> /,'').split(' —')[0]+')':''}</span>`
    : v.intervalo || '—';
  $('ref-variaveis').innerHTML = `<strong>Referência para ${selectedObj}:</strong><br>Séries: ${escHTML(v.series||'—')} | Reps: ${escHTML(v.reps||'—')}<br>Intensidade: ${escHTML(v.intensidade||'—')}<br>Intervalo: ${intervaloExibido} | TUT: ${escHTML(v.tut||'—')}`;

  if(PERIODIZACAO_ATIVA){
    _modeloSelecionado = _modeloSelecionado || recomendarModelo(selectedObj, nivel, sexo);
  }
}

// Mensagens de contexto de perfil (idade/impacto/métodos) — úteis
// independente de periodização, então seguem ativas. Ancoradas agora no
// topo da tela de Distribuição (step 2), que é onde volume/divisão são
// realmente ajustados.
function renderContextoPerfil(mods){
  let el = $('step2-perfil-ctx');
  if(!el){
    el = document.createElement('div');
    el.id = 'step2-perfil-ctx';
    el.style.cssText = 'display:flex;flex-direction:column;gap:5px;margin-bottom:10px';
    const anchor = $('step2-perfil-ctx-anchor');
    if(anchor) anchor.after(el);
  }
  const msgs = [mods.progressaoMsg, mods.metodosMsg, mods.impactoMsg].filter(Boolean);
  if(!msgs.length){ el.style.display='none'; return; }
  el.style.display='flex';
  el.innerHTML = msgs.map(msg=>{
    const isWarn=msg.startsWith('<i class=ph-warning></i>');
    const cor=isWarn?'var(--amber-line)':'rgba(0,160,255,.2)';
    const corTxt=isWarn?'var(--amber)':'var(--blue)';
    return `<div style="padding:6px 12px;background:var(--bg4);border-left:1px solid ${cor};border-radius:0 var(--radius) var(--radius) 0;font-size:12px;color:${corTxt}">${msg}</div>`;
  }).join('');
}

function renderModeloCards(nivel, sexo, mods){
  const cont = $('modelo-cards'); if(!cont) return;
  const modificadores = mods || calcModificadoresPerfil();
  cont.innerHTML = '';
  Object.entries(MODELOS_PERIODO).forEach(([key, m]) => {
    const sel  = (key === _modeloSelecionado);
    const bloqCON = (key === 'CON' && (nivel !== 'Avan' || sexo !== 'M'));
    const bloqBLO = (key === 'BLO' && nivel === 'Inic');
    // 65+: apenas LP e LPR permitidos
    const bloq65  = modificadores.bloquearMetodosAvancados && !['LP','LPR'].includes(key);
    const bloq = bloqCON || bloqBLO || bloq65;
    const bloqLabel = bloq65 ? '<i class=ph-lock></i> 65+' : bloqCON ? '<i class=ph-lock></i> Avan <i class=ph-gender-male></i>' : bloqBLO ? '<i class=ph-lock></i> Inte+' : '';
    const card = document.createElement('div');
    card.style.cssText = `padding:10px 12px;border-radius:var(--radius);border:1px solid ${sel?'rgba(0,229,160,.5)':'var(--border)'};background:${sel?'var(--accent-dim)':'var(--bg3)'};cursor:${bloq?'not-allowed':'pointer'};opacity:${bloq?'0.4':'1'};transition:all .15s`;
    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span style="font-size:14px">${m.icon}</span>
        <span style="font-variant-numeric:tabular-nums;font-size:12px;color:${sel?'var(--accent)':'var(--text2)'};font-weight:600">${escHTML(m.sigla)}</span>
        <span style="font-size:12px;color:var(--text2)">${escHTML(m.nome)}</span>
        ${sel?'<span style="margin-left:auto;font-size:12px;color:var(--accent);background:rgba(0,229,160,.1);padding:1px 5px;border-radius:6px;border:1px solid rgba(0,229,160,.2)">SELECIONADO</span>':''}
        ${bloq?`<span style="margin-left:auto;font-size:12px;color:var(--text3)">${bloqLabel}</span>`:''}
      </div>
      <div style="font-size:12px;color:var(--text3);line-height:1.5">${escHTML(m.desc)}</div>`;
    if(!bloq) card.onclick = () => { _modeloSelecionado = key; renderModeloCards(nivel, sexo); };
    cont.appendChild(card);
  });
}

// ── STEP 3 ENTRY ─────────────────────────────────────────────

function fillStep3(){
  iniciarTelaVolume();
  // Volume e Divisão ficam na mesma tela, lado a lado — gera as opções de
  // divisão junto com a tabela de volume, em vez de esperar um clique em
  // "Distribuir Treinos →" (essa navegação não existe mais).
  irParaDivisao();
  // Listeners dos botões +/- do campo séries/ex padrão
  const btnM = $('btn-series-menos');
  const btnP = $('btn-series-mais');
  if(btnM && !btnM._bound){
    btnM._bound = true;
    btnM.addEventListener('click', function(){
      const inp = $('vol-series');
      inp.value = Math.max(1, (parseInt(inp.value)||3) - 1);
      resetSeriesGlobal();
    });
  }
  if(btnP && !btnP._bound){
    btnP._bound = true;
    btnP.addEventListener('click', function(){
      const inp = $('vol-series');
      inp.value = Math.min(8, (parseInt(inp.value)||3) + 1);
      resetSeriesGlobal();
    });
  }
}

// ── CAMADA 2 — Modificadores de parâmetros por perfil ────────────────────────
// Retorna objeto com ajustes a aplicar no motor de prescrição
// Baseado em: idade (FASE-2 §5, Envelhec), IMC ≥30 (FASE-1 §3)

function calcModificadoresPerfil(){
  const s = getActive();
  const mods = {
    // Intervalos
    intervaloFator: 1.0,  // multiplicador: 1.0 = padrão, 1.2 = +20% (limit upper)
    intervaloMsg: '',
    // Progressão de carga
    progressaoMsg: '',
    // Métodos avançados
    bloquearMetodosAvancados: false,
    metodosMsg: '',
    // IMC
    baixoImpacto: false,
    impactoMsg: '',
  };

  if(!s?.perfil || !s?.anamnese) return mods;
  const p = s.perfil, a = s.anamnese;

  // ── Idade ─────────────────────────────────────────────────────────────────
  // Idade não influencia mais Volume por Grupo (vault REF-Volume-Derivado-MAV §1,
  // revisão 2026-06 — ACSM 2026). A proteção do aluno 50+/65+ continua aqui, mas
  // só nas variáveis de intervalo, progressão de carga e métodos avançados.
  const idade = p.nascimento
    ? new Date().getFullYear() - new Date(p.nascimento).getFullYear()
    : 0;

  if(idade >= 65){
    mods.intervaloFator = 1.2;
    mods.intervaloMsg   = `<i class=ph-warning></i> 65+ anos — intervalos de descanso no limite superior da faixa.`;
    mods.progressaoMsg  = `<i class=ph-warning></i> 65+ anos — progressão de carga ≤ 5% por semana. Priorizar técnica e controle.`;
    mods.bloquearMetodosAvancados = true;
    mods.metodosMsg = `<i class=ph-warning></i> 65+ anos — métodos avançados (drop set, rest-pause, série gigante) não recomendados neste nível. Usar pirâmide crescente e circuito.`;
  } else if(idade >= 50){
    mods.intervaloFator = 1.1;
    mods.intervaloMsg   = `<i class=ph-warning></i> 50+ anos — preferir intervalos no limite superior da faixa prescrita.`;
    mods.progressaoMsg  = `<i class=ph-warning></i> 50+ anos — progressão de carga conservadora (< 5%/semana). Atenção à recuperação.`;
  } else if(idade >= 40){
    mods.progressaoMsg = `<i class=ph-info></i> 40–49 anos — progressão de carga moderada. Tendões menos adaptativos. Monitorar recuperação.`;
  }

  // ── IMC ≥ 30 ───────────────────────────────────────────────────────────────
  const peso = parseFloat(a.peso), alt = parseFloat(a.altura);
  if(peso && alt){
    const imc = peso / Math.pow(alt/100, 2);
    if(imc >= 35){
      mods.baixoImpacto = true;
      mods.impactoMsg = `<i class=ph-warning></i> IMC ${imc.toFixed(1)} (Obesidade grau II/III) — priorizar exercícios de baixo impacto. Evitar corrida, saltos e cargas axiais pesadas sem progressão prévia.`;
    } else if(imc >= 30){
      mods.baixoImpacto = true;
      mods.impactoMsg = `<i class=ph-info></i> IMC ${imc.toFixed(1)} (Obesidade grau I) — preferir exercícios de baixo impacto no início. Progressão gradual de amplitude e carga.`;
    }
  }

  return mods;
}

// ── TELA A: VOLUME ────────────────────────────────────────────

function iniciarTelaVolume(){
  const s       = getActive(); if(!s) return;
  const nivel   = val('pr-nivel') || s.anamnese?.nivel || 'Inic';
  const freq    = val('pr-frequencia') || s.anamnese?.frequencia || '3x';
  const obj     = selectedObj || 'Saude';
  const sexo    = s.perfil?.sexo || 'M';
  const numDias = parseInt(freq) || 3;

  // ── Calcular modificadores de perfil (Camada 2) ──────────────────────────
  // Idade não influencia mais Volume por Grupo (vault REF-Volume-Derivado-MAV §1,
  // revisão 2026-06 — ACSM 2026 não sustenta corte de volume por idade; proteção
  // do idoso passa a viver em intensidade/RIR/frequência, fora desta tela).
  const mods = calcModificadoresPerfil();

  // Renderizar avisos de modificadores acima da tabela
  renderAvisosVolume(mods);

  // Séries por Exercício — progressão por histórico (vault §10.2): consulta a moda
  // do último treino deste aluno no mesmo objetivo (com reset cruzado por Reab) e
  // sugere um degrau acima, travado na faixa do objetivo×nível atual.
  const ultimaSerie = buscarUltimaSerieRegistrada(s, obj);
  _s3.seriesPorEx = getSeriesPorEx(obj, nivel, ultimaSerie);
  $('vol-series').value = _s3.seriesPorEx;

  // Frequência estimada por grupo
  const freqEst = {
    Peitoral:1, Latissimo:1, Deltoide:1, Triceps:1, Biceps:1,
    Quadriceps:1, Isquiossurais:1, Gluteos:1, Panturrilhas:1,
    RetoAbdominal:1, Obliquo:1, Trapezio:1,
  };
  if(numDias >= 4){ freqEst.Quadriceps=2; freqEst.Gluteos=2; }
  if(numDias >= 5){ freqEst.Peitoral=2; freqEst.Latissimo=2; }

  GRUPOS_MAPA.forEach(({id}) => {
    // chave inclui sexo — recalcula sempre que objetivo/nível/sexo mudar (vault §1: Grupo→Sexo→Nível→Objetivo)
    const chave = obj + nivel + sexo;
    if(!_s3.volPorGrupo[id] || _s3.volPorGrupo[id]._chave !== chave){
      const freq_g = freqEst[id] || 1;
      const serEx  = _s3.seriesPorEx;

      const [semMin, semMax] = getVolumePorGrupo(id, sexo, nivel, obj);
      const semMid = Math.round((semMin + semMax) / 2);

      _s3.volPorGrupo[id] = {
        semMin, semMax,
        sem: semMid,
        serEx,
        freq: freq_g,
        ativo: true,
        _chave: chave,
      };
    }
  });

  renderTabelaVolumeGlobal();
  // Volume e Divisão ficam juntos na mesma tela (ver irParaDivisao, chamado
  // logo depois em fillStep3) — não esconde mais 's3-divisao' aqui, senão a
  // caixa de Modelos de Divisão desaparece assim que o volume é recalculado.
  show('s3-volume');
  show('s3-divisao');
  show('s3-vd-btnrow');
  hide('s3-ficha');
}

function renderAvisosVolume(mods){
  // Renderiza (ou limpa) o bloco de avisos de perfil acima da tabela de volume
  let el = $('vol-mods-avisos');
  if(!el){
    // Criar container se não existe ainda
    el = document.createElement('div');
    el.id = 'vol-mods-avisos';
    el.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-bottom:12px';
    const tbl = $('vol-tbody');
    if(tbl && tbl.closest('table')) tbl.closest('table').before(el);
  }

  const avisos = [
    mods.intervaloMsg,
    mods.progressaoMsg, mods.impactoMsg, mods.metodosMsg,
  ].filter(Boolean);

  if(!avisos.length){ el.style.display='none'; return; }
  el.style.display = 'flex';
  el.innerHTML = avisos.map(msg => {
    const isWarn = msg.startsWith('<i class=ph-warning></i>');
    const cor = isWarn ? 'var(--amber-line)' : 'rgba(0,160,255,.2)';
    const corTxt = isWarn ? 'var(--amber)' : 'var(--blue)';
    return `<div style="padding:7px 12px;background:var(--bg4);border-left:1px solid ${cor};border-radius:0 var(--radius) var(--radius) 0;font-size:12px;color:${corTxt};line-height:1.5">${msg}</div>`;
  }).join('');
}

function calcExercicios(semMin, semMax, serEx){
  // Exercícios = séries/sem ÷ séries/exercício (apenas inteiros)
  if(!serEx || serEx === 0) return '—';
  const exMin = Math.floor(semMin / serEx);
  const exMax = Math.ceil(semMax / serEx);
  if(exMin === exMax || exMin === 0) return String(exMax);
  return exMin + '–' + exMax;
}

// ── Disponibilidade por grupo (corte inicial: nível + local) ─────────────────
// Roda antes de desenhar a tabela de volume. Conta o pool REAL de cada grupo (o
// mesmo que o motor vai sortear) e, quando dá ZERO, DESATIVA o grupo e o TRAVA:
// não adianta prescrever grupo que não tem um único exercício compatível com o
// nível e o local escolhidos.
//
// Só reativa sozinho o que ele mesmo desligou (`_offAuto`) — grupo que o personal
// desligou na mão continua desligado quando o pool volta a existir.
function aplicarDisponibilidadeGrupos(){
  const ctx = getContextoPool();
  const travados = [];
  _s3._dispGrupos = {};
  GRUPOS_MAPA.forEach(({id, label}) => {
    let fc;
    try { fc = contarFiltros(id, ctx); } catch(e){ fc = null; }  // contador indisponível: não trava nada
    if(!fc) return;
    _s3._dispGrupos[id] = fc;
    const vg = _s3.volPorGrupo[id]; if(!vg) return;
    if(fc.disponivel === 0){
      if(vg.ativo !== false){ vg._offAuto = true; vg.ativo = false; }
      vg._semEx = true;
      travados.push({ id, label, bloqueado: fc.bloqueado });
    } else {
      if(vg._semEx && vg._offAuto) vg.ativo = true;   // destrava o que ele mesmo desligou
      delete vg._semEx; delete vg._offAuto;
    }
  });
  return { travados, ctx };
}

// Aviso acima da tabela listando os grupos travados por falta de exercício.
function renderAvisoGruposSemExercicio(travados, ctx){
  let box = $('vol-aviso-semex');
  if(!box){
    const tabela = $('vol-tabela'); if(!tabela) return;
    box = document.createElement('div');
    box.id = 'vol-aviso-semex';
    tabela.parentNode.insertBefore(box, tabela);
  }
  if(!travados || !travados.length){ box.style.display = 'none'; box.innerHTML = ''; return; }
  const plural = travados.length > 1 ? 's' : '';
  const nomes  = travados.map(t => t.label).join(', ');
  const porCli = travados.filter(t => t.bloqueado > 0).map(t => t.label);
  box.style.cssText =
    'display:block;margin-bottom:12px;padding:10px 12px;border-radius:var(--radius);' +
    'border:1px solid var(--amber);background:var(--amber-dim);font-size:13px;color:var(--text2)';
  box.innerHTML =
    '<div style="font-weight:700;color:var(--amber);margin-bottom:4px"><i class=ph-warning></i> ' + travados.length +
      ' grupo' + plural + ' sem exercício disponível</div>' +
    '<div><strong>' + nomes + '</strong> — nenhum exercício compatível com o nível <strong>' +
      nivelLabel(ctx.nivel) + '</strong> e o local de treino selecionados. Desativado' + plural +
      ' automaticamente e bloqueado' + plural + ' até que o nível ou o local mudem.</div>' +
    (porCli.length
      ? '<div style="margin-top:4px;font-size:12px;color:var(--text3)">Filtros clínicos da avaliação também contribuíram em: ' + porCli.join(', ') + '.</div>'
      : '');
}

function renderTabelaVolumeGlobal(){
  const tbody = $('vol-tbody'); if(!tbody) return;
  const { travados, ctx: ctxPool } = aplicarDisponibilidadeGrupos();
  renderAvisoGruposSemExercicio(travados, ctxPool);
  tbody.innerHTML = '';
  GRUPOS_MAPA.forEach(({id, label, mev, mav_min, mav_max, mrv}) => {
    const vg     = _s3.volPorGrupo[id] || {sem:0,semMin:mav_min||mev,semMax:mav_max||mrv,serEx:_s3.seriesPorEx,freq:1,ativo:true};
    if(vg.ativo === undefined) vg.ativo = true;
    if(!vg.serEx) vg.serEx = _s3.seriesPorEx;
    const ativo  = vg.ativo !== false;
    const semEx  = vg._semEx === true;   // travado: zero exercício no nível/local atual
    const semMin = vg.semMin !== undefined ? vg.semMin : (mav_min||mev);
    const semMax = vg.semMax !== undefined ? vg.semMax : (mav_max||mrv);
    const semMid = Math.round((semMin + semMax) / 2);
    const serEx  = vg.serEx || _s3.seriesPorEx;
    // Classifica o ponto médio da faixa-alvo na régua do grupo (RÉGUA A)
    const faixa   = classificarVolumeGrupo(semMid, {mev, mav_min, mav_max, mrv}, ativo);
    const cor     = VOL_FAIXAS[faixa].cor;
    const status  = VOL_FAIXAS[faixa].label;
    const exRange = ativo ? calcExercicios(semMin, semMax, serEx) : '—';

    const tr = document.createElement('tr');
    tr.id = 'row-' + id;
    if(!ativo) tr.style.opacity = '0.45';

    // td0: switch on/off
    const td0 = document.createElement('td');
    td0.style.textAlign = 'center';
    const switchWrap = document.createElement('div');
    switchWrap.style.cssText = 'display:inline-flex;align-items:center;user-select:none;cursor:' +
      (semEx ? 'not-allowed' : 'pointer') + (semEx ? ';opacity:.5' : '');
    switchWrap.title = semEx
      ? label + ' não tem exercício disponível para o nível e o local selecionados — não pode ser ativado'
      : (ativo ? 'Desativar' : 'Ativar') + ' ' + label;
    switchWrap.dataset.grupo = id;

    const track = document.createElement('div');
    track.style.cssText = 'width:32px;height:18px;border-radius:9px;background:' + (ativo ? 'var(--accent)' : 'var(--border2)') +
      ';position:relative;transition:background .2s;border:1px solid ' + (ativo ? 'var(--accent)' : 'var(--text3)');
    const thumb = document.createElement('div');
    thumb.style.cssText = 'width:14px;height:14px;border-radius:50%;background:#fff;position:absolute;top:1px;' +
      'left:' + (ativo ? '15px' : '1px') + ';transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.3)';
    track.appendChild(thumb);
    switchWrap.appendChild(track);
    if(!semEx) switchWrap.addEventListener('click', function(){ toggleGrupo(this.dataset.grupo); });
    td0.appendChild(switchWrap);

    // td1: label. No notebook só o nome; no celular e no tablet (css/prescricao.css) vira nome + resumo + selo da situação + seta que abre os detalhes.
    const td1 = document.createElement('td');
    td1.style.cssText = 'font-size:12px;font-weight:' + (ativo ? '500' : '400') +
      ';color:' + (semEx ? 'var(--amber)' : ativo ? 'var(--text)' : 'var(--text3)');
    td1.innerHTML = '<div class="vol-nm"><span class="vol-n">' + escHTML(label) + (semEx ? ' ' : '') + '</span>'
      + '<span class="vol-res" id="vol-res-' + id + '">' + (ativo ? semMin + '–' + semMax + ' séries por semana' : 'Desligado') + '</span></div>'
      + '<div class="vol-r"><span class="vol-chip" id="vol-chip-' + id + '" style="color:' + cor + ';background:color-mix(in srgb,' + cor + ' 14%, transparent)">' + escHTML(status) + '</span>'
      + '<span class="vol-car"><i class=ph-caret-down></i></span></div>';
    td1.addEventListener('click', function(){
      if(!_s3._volAberto) _s3._volAberto = {};
      _s3._volAberto[id] = !_s3._volAberto[id];
      tr.classList.toggle('aberta', !!_s3._volAberto[id]);
    });
    if(_s3._volAberto && _s3._volAberto[id]) tr.classList.add('aberta');
    if(semEx) td1.title = 'Sem exercício disponível para o nível e o local selecionados';

    // helper: cria célula input + −/+
    function makeInpCell(campo, val, minV, maxV, w){
      const td = document.createElement('td');
      td.style.textAlign = 'center';
      const wrap = document.createElement('div');
      wrap.className = 'vol-st';
      wrap.style.cssText = 'display:flex;align-items:center;gap:2px;justify-content:center';

      const btnM = document.createElement('button');
      btnM.textContent = '−';
      btnM.style.cssText = 'width:18px;height:22px;background:var(--bg2);border:1px solid var(--border);' +
        'border-radius:6px 0 0 3px;color:var(--text2);font-size:13px;cursor:pointer;line-height:1;padding:0' +
        (ativo ? '' : ';opacity:.3;cursor:default');
      if(ativo){ btnM.dataset.g=id; btnM.dataset.c=campo;
        btnM.addEventListener('click', function(){ stepVol(this.dataset.g, this.dataset.c, -1); }); }

      const inpEl = document.createElement('input');
      inpEl.type = 'number'; inpEl.id = 'inp-' + id + '-' + campo;
      inpEl.value = val; inpEl.min = minV; inpEl.max = maxV;
      inpEl.disabled = !ativo;
      inpEl.style.cssText = 'width:' + w + 'px;background:var(--bg4);border-top:1px solid var(--border);' +
        'border-bottom:1px solid var(--border);border-left:none;border-right:none;padding:3px 2px;' +
        'color:var(--text);font-variant-numeric:tabular-nums;font-size:12px;outline:none;text-align:center' +
        (ativo ? '' : ';opacity:.3');
      if(ativo){ inpEl.dataset.g=id; inpEl.dataset.c=campo;
        inpEl.addEventListener('input', function(){ atualizarVolGrupo(this.dataset.g, this.dataset.c, this.value); }); }

      const btnP = document.createElement('button');
      btnP.textContent = '+';
      btnP.style.cssText = 'width:18px;height:22px;background:var(--bg2);border:1px solid var(--border);' +
        'border-radius:0 3px 3px 0;color:var(--text2);font-size:13px;cursor:pointer;line-height:1;padding:0' +
        (ativo ? '' : ';opacity:.3;cursor:default');
      if(ativo){ btnP.dataset.g=id; btnP.dataset.c=campo;
        btnP.addEventListener('click', function(){ stepVol(this.dataset.g, this.dataset.c, 1); }); }

      wrap.appendChild(btnM); wrap.appendChild(inpEl); wrap.appendChild(btnP);
      td.appendChild(wrap);
      return td;
    }

    const td2 = makeInpCell('semMin', semMin, 0, 50, 38);
    const td3 = makeInpCell('semMax', semMax, 0, 50, 38);
    const td4 = makeInpCell('serEx',  serEx,  1,  8, 38);
    td2.dataset.l = 'Séries/sem mínimo'; td3.dataset.l = 'Séries/sem máximo'; td4.dataset.l = 'Séries por exercício';

    const td5 = document.createElement('td');
    td5.style.cssText = 'font-variant-numeric:tabular-nums;font-size:12px;color:var(--accent);text-align:center;font-weight:600';
    td5.textContent = exRange;
    td5.dataset.l = 'Exercícios';

    const td6 = document.createElement('td');
    td6.style.cssText = 'font-variant-numeric:tabular-nums;font-size:12px;color:var(--text3);text-align:center';
    td6.textContent = (mav_min||mev) + '–' + (mav_max||mrv);
    td6.dataset.l = 'MEV–MRV';

    // td7: barra de status na régua do grupo (MEV / MAV / MRV) — RÉGUA A.
    // O valor aqui é uma FAIXA (Sér/sem mín–máx), não um número: a barra
    // desenha a faixa inteira, então a largura do alvo fica visível. O status
    // classifica o ponto médio dela.
    const td7 = document.createElement('td');
    td7.style.cssText = 'min-width:170px';
    td7.className = 'vol-bar';
    const gRef  = {mev, mav_min, mav_max, mrv};
    const mk    = _volMarcos(gRef);
    const barWrap = document.createElement('div');
    barWrap.style.cssText = 'display:flex;align-items:center;gap:8px';

    const barCol = document.createElement('div');
    barCol.style.cssText = 'flex:1;min-width:110px';
    barCol.innerHTML =
      barraVolumeGrupoHTML(gRef,
        ativo ? volFaixaHTML(posVolReguaA(semMin, gRef), posVolReguaA(semMax, gRef), cor, 'bar-fill-' + id)
              : '') +
      escalaVolumeHTML([mk.mev, mk.mn, mk.mx, mk.mrv], VOL_RA_X);

    const statusSpan = document.createElement('span');
    statusSpan.id = 'bar-status-' + id;
    statusSpan.style.cssText = 'font-size:12px;font-weight:600;color:' + cor +
      ';white-space:nowrap;min-width:74px;text-align:right';
    statusSpan.textContent = status;
    barWrap.appendChild(barCol); barWrap.appendChild(statusSpan);
    td7.appendChild(barWrap);

    // td_filtro: resumo de filtros clínicos Camada 3
    const tdFiltro = document.createElement('td');
    tdFiltro.style.cssText = 'text-align:center;font-size:12px;font-variant-numeric:tabular-nums;';
    tdFiltro.dataset.l = 'Exercícios disponíveis';
    try {
      // Contagem já feita em aplicarDisponibilidadeGrupos() — uma passada pelo
      // banco por render, em vez de 12 chamadas independentes aqui dentro.
      const fc = (_s3._dispGrupos||{})[id] || contarFiltros(id, ctxPool);
      const dica = `${fc.disponivel} disponível(is) · nível ${nivelLabel(ctxPool.nivel)} + local selecionado`;
      if(fc.disponivel === 0){
        tdFiltro.innerHTML = `<span style="color:var(--amber)" title="Sem exercício compatível com o nível e o local selecionados"><i class=ph-lock></i> 0</span>`;
      } else if(fc.bloqueado > 0){
        tdFiltro.innerHTML = `<span style="color:var(--red)" title="${fc.bloqueado} bloqueado(s) por flags clínicos — ${dica}"><i class=sd-red></i> ${fc.disponivel} <span style="color:var(--text3)">(−${fc.bloqueado})</span></span>`;
      } else if(fc.prio > 0){
        tdFiltro.innerHTML = `<span style="color:var(--accent)" title="${fc.prio} prioritário(s) para correção — ${dica}"><i class=sd-green></i> ${fc.disponivel}</span>`;
      } else {
        tdFiltro.innerHTML = `<span style="color:var(--text3)" title="${dica}"><i class=ph-check></i> ${fc.disponivel}</span>`;
      }
    } catch(e){ tdFiltro.textContent = '—'; }

    // td8: botão reset linha
    const td8 = document.createElement('td');
    td8.style.textAlign = 'center';
    td8.className = 'vol-rs';
    const btnReset = document.createElement('button');
    btnReset.innerHTML = '<i class=ph-arrow-counter-clockwise></i>';
    btnReset.title = 'Restaurar ' + label + ' para MEV–MRV';
    btnReset.style.cssText = 'width:22px;height:22px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;color:var(--text3);font-size:12px;cursor:pointer;line-height:1;padding:0;transition:color .15s';
    btnReset.dataset.grupo = id;
    btnReset.addEventListener('mouseover', function(){ this.style.color='var(--text)'; });
    btnReset.addEventListener('mouseout',  function(){ this.style.color='var(--text3)'; });
    btnReset.addEventListener('click', function(){ resetarLinhaGrupo(this.dataset.grupo); });
    td8.appendChild(btnReset);
    const rsTxt = document.createElement('span'); rsTxt.className = 'vol-rs-t'; rsTxt.textContent = 'Restaurar este grupo'; td8.appendChild(rsTxt);
    td8.addEventListener('click', function(e){ if(e.target.closest('button')) return; btnReset.click(); });

    [td0,td1,td2,td3,td4,td5,td6,td7,tdFiltro,td8].forEach(td => tr.appendChild(td));
    tbody.appendChild(tr);
  });
}

function stepVol(id, campo, delta){
  const inp = $('inp-' + id + '-' + campo);
  if(!inp) return;
  const novo = Math.max(0, (parseInt(inp.value)||0) + parseInt(delta));
  inp.value = novo;
  atualizarVolGrupo(id, campo, novo);
}

function toggleGrupo(id){
  const vg = _s3.volPorGrupo[id]; if(!vg) return;
  // Trava: grupo sem nenhum exercício compatível com o nível/local atual não pode
  // ser religado. Só destrava quando o corte inicial mudar (nível ou local).
  if(vg._semEx) return;
  vg.ativo = !(vg.ativo !== false);
  delete vg._offAuto;   // ligar/desligar na mão passa a ser decisão do personal
  if(!vg.ativo){
    // Guarda backup dos valores
    vg._semMinBak = vg.semMin;
    vg._semMaxBak = vg.semMax;
    vg._serExBak  = vg.serEx;
  } else {
    // Restaura — usa MAV do grupo se não tinha backup
    const grupo = GRUPOS_MAPA.find(g => g.id === id);
    vg.semMin = vg._semMinBak !== undefined ? vg._semMinBak : (grupo ? (grupo.mav_min||grupo.mev) : 10);
    vg.semMax = vg._semMaxBak !== undefined ? vg._semMaxBak : (grupo ? (grupo.mav_max||grupo.mrv) : 16);
    vg.serEx  = vg._serExBak  !== undefined ? vg._serExBak  : _s3.seriesPorEx;
    vg.sem    = Math.round((vg.semMin + vg.semMax) / 2);
  }
  renderTabelaVolumeGlobal();
  recalcularCargasDivisoes();
  if(typeof _markDirty==='function') _markDirty();
}

function atualizarNumEx(){
  resetSeriesGlobal();
}

function resetSeriesGlobal(){
  const novo = parseInt($('vol-series').value) || 3;
  _s3.seriesPorEx = novo;
  GRUPOS_MAPA.forEach(({id}) => {
    if(_s3.volPorGrupo[id]) _s3.volPorGrupo[id].serEx = novo;
  });
  renderTabelaVolumeGlobal();
  recalcularCargasDivisoes();
  if(typeof _markDirty==='function') _markDirty();
}

function resetarLinhaGrupo(id){
  const grupo = GRUPOS_MAPA.find(g => g.id === id); if(!grupo) return;
  const vg = _s3.volPorGrupo[id]; if(!vg) return;
  const s     = getActive();
  const nivel = val('pr-nivel') || s?.anamnese?.nivel || 'Inic';
  const obj   = selectedObj || 'Saude';
  const sexo  = s?.perfil?.sexo || 'M';
  const [semMin, semMax] = getVolumePorGrupo(id, sexo, nivel, obj);
  vg.semMin  = semMin;
  vg.semMax  = semMax;
  vg.serEx   = _s3.seriesPorEx;
  vg.sem     = Math.round((vg.semMin + vg.semMax) / 2);
  vg.ativo   = true;
  delete vg._chave; // força reinicialização na próxima entrada
  // Atualiza inputs visualmente
  const inpMin = $('inp-' + id + '-semMin');
  const inpMax = $('inp-' + id + '-semMax');
  const inpEx  = $('inp-' + id + '-serEx');
  if(inpMin) inpMin.value = vg.semMin;
  if(inpMax) inpMax.value = vg.semMax;
  if(inpEx)  inpEx.value  = _s3.seriesPorEx;
  atualizarLinhaTabela(id);
  recalcularCargasDivisoes();
}

function resetarVolumes(){
  iniciarTelaVolume();
  recalcularCargasDivisoes();
}

function atualizarVolGrupo(id, campo, valor){
  if(!_s3.volPorGrupo[id]) return;
  const vg = _s3.volPorGrupo[id];
  vg[campo] = parseInt(valor) || 0;
  // Recalcula semMid
  vg.sem = Math.round(((vg.semMin || 0) + (vg.semMax || 0)) / 2);
  atualizarLinhaTabela(id);
  recalcularCargasDivisoes();
  if(typeof _markDirty==='function') _markDirty();
}

function atualizarLinhaTabela(id){
  const grupo = GRUPOS_MAPA.find(g => g.id === id); if(!grupo) return;
  const vg = _s3.volPorGrupo[id]; if(!vg) return;
  const ativo  = vg.ativo !== false;
  const semMin = vg.semMin || 0, semMax = vg.semMax || 0;
  const semMid = Math.round((semMin + semMax) / 2);
  const serEx  = vg.serEx || _s3.seriesPorEx;
  const faixa  = classificarVolumeGrupo(semMid, grupo, ativo);
  const cor    = VOL_FAIXAS[faixa].cor;
  const status = VOL_FAIXAS[faixa].label;
  const exRange = ativo ? calcExercicios(semMin, semMax, serEx) : '—';

  const row = $('row-' + id); if(!row) return;

  // Atualiza switch (track + thumb)
  const track = row.cells[0].querySelector('div > div');
  if(track){
    track.style.background = ativo ? 'var(--accent)' : 'var(--border2)';
    track.style.borderColor = ativo ? 'var(--accent)' : 'var(--text3)';
    const thumb = track.querySelector('div');
    if(thumb) thumb.style.left = ativo ? '15px' : '1px';
  }
  // Atualiza label opacity
  if(row.cells[1]) row.cells[1].style.color = ativo ? 'var(--text)' : 'var(--text3)';
  // Atualiza exercícios
  if(row.cells[5]) row.cells[5].textContent = exRange;
  // Atualiza status (faixa na barra + label) — via ID direto.
  // Só a faixa se move; as zonas e a escala numérica são fixas por grupo.
  const fill = $('bar-fill-' + id);
  if(fill){
    const a = Math.max(0, Math.min(100, posVolReguaA(semMin, grupo)));
    const b = Math.max(0, Math.min(100, posVolReguaA(semMax, grupo)));
    fill.style.left  = a + '%';
    fill.style.width = Math.max(2, Math.min(100 - a, b - a)) + '%';
    fill.style.background = cor;
  }
  const span = $('bar-status-' + id);
  if(span){ span.textContent = status; span.style.color = cor; }
  const resEl = $('vol-res-' + id); if(resEl) resEl.textContent = ativo ? semMin + '–' + semMax + ' séries por semana' : 'Desligado';
  const chipEl = $('vol-chip-' + id);
  if(chipEl){ chipEl.textContent = status; chipEl.style.color = cor; chipEl.style.background = 'color-mix(in srgb,' + cor + ' 14%, transparent)'; }
  // Opacidade da linha
  row.style.opacity = ativo ? '1' : '0.45';
}


// getVolColor() e getVolStatus() foram REMOVIDAS (2026-09-08), substituídas por
// classificarVolumeGrupo() + VOL_FAIXAS logo abaixo. Usavam só MEV e MRV com
// fronteiras ±1 hardcoded e ignoravam o MAV: a faixa "Ideal" resultante cobria
// 77–86% do intervalo MEV–MRV em todos os 12 grupos (no bíceps, qualquer valor
// de 8 a 25 séries/semana era "Ideal"), então o rótulo não discriminava nada.
// Verificado: nenhuma chamada restante em prescricao-motor.js, avaliacao.js,
// biblioteca-exercicios.js ou index.html.

// ══════════════════════════════════════════════════════════════════════════
// RÉGUAS DE VOLUME — classificação em faixas + barra segmentada
// ══════════════════════════════════════════════════════════════════════════
// Duas réguas, porque as duas perguntas são diferentes:
//
// RÉGUA A — limite fisiológico do grupo (GRUPOS_MAPA: MEV / MAV / MRV).
//   Responde "este volume faz sentido para este músculo?". 4 marcos = 5 faixas,
//   sem nenhuma constante arbitrária:
//     v < MEV            → Baixo        (não gera estímulo)
//     MEV ≤ v < MAV_min  → Aceitável ↓  (estimula, abaixo da faixa adaptativa)
//     MAV_min ≤ v ≤ MAV_max → Ideal     (dentro da faixa adaptativa)
//     MAV_max < v ≤ MRV  → Aceitável ↑  (acima da adaptativa, ainda recuperável)
//     v > MRV            → Alto         (acima do máximo recuperável)
//   Usada na tela de Volume por Grupo (Step 2) e no preview semanal (Step 3).
//   A régua NÃO varia com sexo/nível/objetivo — esses entram só no valor
//   preenchido (getVolumePorGrupo), nunca na referência.
//
// RÉGUA B — alvo do personal (volPorGrupo.semMin/semMax).
//   Responde "a divisão entrega o que eu escolhi?". 2 marcos = 3 faixas:
//     v < semMin → Baixo | semMin ≤ v ≤ semMax → Escolhido | v > semMax → Alto
//   Usada nas linhas de grupo dentro do modelo de divisão (acordeão do Step 2).
//   Baixo/Alto em âmbar e não vermelho de propósito: o limite fisiológico já
//   foi julgado pela régua A quando o alvo foi definido — aqui o desvio é do
//   plano, não clínico.
//
// Substitui getVolColor/getVolStatus, que usavam só MEV e MRV com fronteiras
// ±1 hardcoded e ignoravam o MAV — a faixa "Ideal" resultante cobria 77–86%
// do intervalo MEV–MRV em todos os 12 grupos, ou seja, não discriminava nada.

const VOL_FAIXAS = {
  baixo:        {cor:'var(--red)',    label:'Baixo'},
  'aceitavel-': {cor:'var(--amber)',  label:'Aceitável ↓'},
  ideal:        {cor:'var(--accent)', label:'Ideal'},
  'aceitavel+': {cor:'var(--amber)',  label:'Aceitável ↑'},
  alto:         {cor:'var(--red)',    label:'Alto'},
  off:          {cor:'var(--text3)',  label:'OFF'},
  zerado:       {cor:'var(--text3)',  label:'Zerado'},
};

const VOL_ALVO_FAIXAS = {
  baixo:     {cor:'var(--amber)',  label:'Baixo'},
  escolhido: {cor:'var(--accent)', label:'Escolhido'},
  alto:      {cor:'var(--amber)',  label:'Alto'},
  off:       {cor:'var(--text3)',  label:'OFF'},
  zerado:    {cor:'var(--text3)',  label:'Zerado'},
};

// Zonas de fundo em rgba fixo: são overlay translúcido, funcionam nos dois temas.
const VOL_Z_LO   = 'rgba(220,38,38,.10)';
const VOL_Z_AC   = 'rgba(234,88,12,.10)';
const VOL_Z_ID   = 'rgba(22,163,74,.13)';
const VOL_Z_TICK = 'rgba(128,128,128,.38)';

// Larguras FIXAS por faixa (não proporcionais ao número). Isso é deliberado:
// com zonas em posição fixa, o verde começa e termina no mesmo x em todas as
// linhas da tabela, e dá pra varrer a coluna de relance mesmo com o bíceps
// indo até 26 e o quadríceps até 20. O custo é perder a proporção numérica —
// por isso os marcos aparecem escritos embaixo da barra.
const VOL_RA_X = [0,15,30,70,85,100], VOL_RA_W = [15,15,40,15,15];
const VOL_RB_X = [0,30,70,100],       VOL_RB_W = [30,40,30];

// Marcos da régua A a partir de uma entrada do GRUPOS_MAPA
function _volMarcos(grupo){
  const mev = grupo.mev || 0;
  return {
    mev,
    mn:  grupo.mav_min || mev,
    mx:  grupo.mav_max || grupo.mrv || mev,
    mrv: grupo.mrv || 0,
  };
}

function classificarVolumeGrupo(v, grupo, ativo){
  if(ativo === false) return 'off';
  if(!v || v <= 0)    return 'zerado';
  const {mev, mn, mx, mrv} = _volMarcos(grupo);
  if(v <  mev) return 'baixo';
  if(v <  mn)  return 'aceitavel-';
  if(v <= mx)  return 'ideal';
  if(v <= mrv) return 'aceitavel+';
  return 'alto';
}

function classificarVolumeAlvo(v, alvoMin, alvoMax, ativo){
  if(ativo === false) return 'off';
  if(!v || v <= 0)    return 'zerado';
  if(v <  alvoMin) return 'baixo';
  if(v <= alvoMax) return 'escolhido';
  return 'alto';
}

// Posição (0–100%) de um valor na régua A — interpolação linear dentro da faixa
function posVolReguaA(v, grupo){
  const {mev, mn, mx, mrv} = _volMarcos(grupo);
  if(v <= 0)   return 0;
  if(v <  mev) return VOL_RA_X[0] + (v/Math.max(1,mev))            * VOL_RA_W[0];
  if(v <  mn)  return VOL_RA_X[1] + ((v-mev)/Math.max(1,mn-mev))   * VOL_RA_W[1];
  if(v <= mx)  return VOL_RA_X[2] + ((v-mn) /Math.max(1,mx-mn))    * VOL_RA_W[2];
  if(v <= mrv) return VOL_RA_X[3] + ((v-mx) /Math.max(1,mrv-mx))   * VOL_RA_W[3];
  // Acima do MRV: os últimos 15% cobrem +25% do MRV, depois satura.
  return Math.min(100, VOL_RA_X[4] + ((v-mrv)/Math.max(1,mrv*0.25)) * VOL_RA_W[4]);
}

// Posição (0–100%) de um valor na régua B
function posVolReguaB(v, alvoMin, alvoMax){
  if(v <= 0)       return 0;
  if(v <  alvoMin) return VOL_RB_X[0] + (v/Math.max(1,alvoMin))              * VOL_RB_W[0];
  if(v <= alvoMax) return VOL_RB_X[1] + ((v-alvoMin)/Math.max(1,alvoMax-alvoMin)) * VOL_RB_W[1];
  return Math.min(100, VOL_RB_X[2] + ((v-alvoMax)/Math.max(1,alvoMax*0.6))   * VOL_RB_W[2]);
}

function _volZona(left, width, bg){
  return '<div style="position:absolute;left:'+left+'%;width:'+width+'%;top:0;bottom:0;background:'+bg+'"></div>';
}
function _volTick(left){
  return '<div style="position:absolute;left:'+left+'%;top:0;bottom:0;width:1px;background:'+VOL_Z_TICK+'"></div>';
}

// Traço marcando "onde este grupo está" — usado quando o valor é um número.
function volMarcadorHTML(pct, cor, id){
  const p = Math.max(1, Math.min(99, pct));
  return '<div' + (id ? ' id="'+id+'"' : '') + ' style="position:absolute;left:calc(' + p +
    '% - 1.5px);top:-1px;bottom:-1px;width:3px;border-radius:6px;background:' + cor +
    ';box-shadow:0 0 0 1.5px var(--bg2);transition:left .25s"></div>';
}
// Bloco preenchido de A a B — usado quando o valor é uma faixa (mín–máx).
function volFaixaHTML(pctA, pctB, cor, id){
  const a = Math.max(0, Math.min(100, pctA));
  const w = Math.max(2, Math.min(100-a, pctB-a));
  return '<div' + (id ? ' id="'+id+'"' : '') + ' style="position:absolute;left:' + a +
    '%;width:' + w + '%;top:2px;bottom:2px;border-radius:6px;background:' + cor +
    ';opacity:.85;transition:left .25s,width .25s"></div>';
}

// Barra da régua A (5 zonas). `conteudo` = marcador ou faixa.
function barraVolumeGrupoHTML(grupo, conteudo, altura){
  const X = VOL_RA_X, W = VOL_RA_W;
  return '<div style="position:relative;height:' + (altura||12) +
    'px;border-radius:6px;overflow:hidden;background:var(--bg2)">'
    + _volZona(X[0], W[0], VOL_Z_LO) + _volZona(X[1], W[1], VOL_Z_AC)
    + _volZona(X[2], W[2], VOL_Z_ID) + _volZona(X[3], W[3], VOL_Z_AC)
    + _volZona(X[4], W[4], VOL_Z_LO)
    + _volTick(X[1]) + _volTick(X[2]) + _volTick(X[3]) + _volTick(X[4])
    + (conteudo||'') + '</div>';
}

// Barra da régua B (3 zonas)
function barraVolumeAlvoHTML(conteudo, altura){
  const X = VOL_RB_X, W = VOL_RB_W;
  return '<div style="position:relative;height:' + (altura||12) +
    'px;border-radius:6px;overflow:hidden;background:var(--bg2)">'
    + _volZona(X[0], W[0], VOL_Z_AC) + _volZona(X[1], W[1], VOL_Z_ID)
    + _volZona(X[2], W[2], VOL_Z_AC)
    + _volTick(X[1]) + _volTick(X[2])
    + (conteudo||'') + '</div>';
}

// Números dos marcos sob a barra. Fixos por grupo — nunca precisam de update.
function escalaVolumeHTML(marcos, xs){
  let h = '<div style="position:relative;height:12px;margin-top:2px">';
  marcos.forEach((m, i) => {
    h += '<div style="position:absolute;left:' + xs[i+1] + '%;transform:translateX(-50%);' +
         'font-variant-numeric:tabular-nums;font-size:12px;color:var(--text3);white-space:nowrap">' + m + '</div>';
  });
  return h + '</div>';
}

// ── MAPA (no-op — status integrado na tabela) ─────────────────────────────────

function renderMapaMuscular(){
  // Status integrado na tabela — sem painel separado
}

// ── TELA B: DIVISÃO ────────────────────────────────────────────────────────────


// Volume Total da Sessão — faixas oficiais (vault REF-Volume-Derivado-MAV §9, 2026-06)
// Substitui a tabela antiga de valor único. Família segue FAMILIA_OBJETIVO (Hip/Forca/Resist/Reab/Gestacao).
const LIM_SESSAO_REF = {
  //          Inic     Inte     Avan
  Hip:      { Inic:[15,20], Inte:[18,24], Avan:[20,28] },
  Forca:    { Inic:[10,15], Inte:[12,18], Avan:[15,20] },
  Emagr:    { Inic:[15,20], Inte:[18,24], Avan:[20,28] },
  Comp:     { Inic:[15,20], Inte:[18,24], Avan:[20,28] },
  Resist:   { Inic:[16,24], Inte:[20,30], Avan:[24,36] },
  CardioR:  { Inic:[16,24], Inte:[20,30], Avan:[24,36] },
  Func:     { Inic:[16,24], Inte:[20,30], Avan:[24,36] },
  Saude:    { Inic:[16,24], Inte:[20,30], Avan:[24,36] },
  Esport:   { Inic:[10,15], Inte:[12,18], Avan:[15,20] },
  Reab:     { Inic:[2,4],   Inte:[4,8],   Avan:[6,12] },
  Envelhec: { Inic:[16,24], Inte:[20,30], Avan:[24,36] },
  Gestacao: { Inic:[10,10], Inte:[20,20], Avan:[20,30] },
};

// 3 fases fixas dentro da faixa de Volume da Sessão (vault §10.2-bis)
// Progride só se a ficha IMEDIATAMENTE anterior foi do mesmo objetivo — qualquer
// quebra de sequência (inclusive Reabilitação) reseta para 'baixa'.
function getFaseVolumeSessao(objetivoAtual, objetivoUltimaFicha, faseUltimaFicha){
  if(objetivoUltimaFicha == null || objetivoUltimaFicha !== objetivoAtual){
    return 'baixa'; // sem histórico ou sequência quebrada → reinicia
  }
  if(faseUltimaFicha === 'baixa') return 'media';
  return 'alta'; // já estava em média ou alta → avança/trava em alta
}

function getVolumeSessaoPorFase(faixaMin, faixaMax, fase){
  const largura = faixaMax - faixaMin;
  const terco = largura / 3;
  switch(fase){
    case 'baixa': return Math.round(faixaMin);
    case 'media': return Math.round(faixaMin + terco);
    case 'alta':  return Math.round(faixaMin + 2 * terco);
    default: return Math.round(faixaMin);
  }
}

function getDivisoesDisponiveis(numDias, objetivo){
  const mapa = {
    2:[
      {nome:'Full Body A/B',               treinos:['A — Empurrar+Core','B — Puxar+Pernas'],                                              chave:2},
      {nome:'Full Body A/B — Superior/Inferior', treinos:['A — Membros Superiores+Core','B — Membros Inferiores+Core'],                    chave:'2b'},
    ],
    3:[
      {nome:'Push / Pull / Legs (PPL)',     treinos:['A — Peito·Tríceps·Ombro','B — Pernas','C — Costas·Bíceps·Core'],                    chave:3},
      {nome:'Full Body A/B/A',             treinos:['A — Ênf. Superior Emp.','B — Ênf. Inferior','A — Ênf. Superior Pux.'],               chave:'3b'},
      {nome:'Full Body Metabólico',        treinos:['A — Metabólico (MMSS+Core)','B — Metabólico (MMII+Core)','A — Metabólico (Full)'],   chave:'3c',
        objetivos_compativeis:['Emagr','Comp','CardioR']},
    ],
    4:[
      {nome:'Upper / Lower × 2',           treinos:['A — Sup. Emp.','B — Inferior','C — Sup. Pux.','D — Inf.+Core'],                      chave:'4b'},
      {nome:'Push / Pull / Legs + Ombros', treinos:['A — Peito·Trí','B — Costas·Bíc','C — Pernas','D — Ombros·Core'],                    chave:4},
    ],
    5:[
      {nome:'PPL + Especialização',        treinos:['A — Peito','B — Costas·Bíc','C — Pernas','D — Ombros','E — Post.·Trí·Core'],         chave:5},
      {nome:'Upper/Lower + PPL',           treinos:['A — Superior','B — Inferior','C — Peito·Trí','D — Costas·Bíc','E — Pernas+Core'],    chave:'5b'},
    ],
    6:[
      {nome:'PPL × 2',                     treinos:['A — Peito·Trí','B — Costas·Bíc','C — Quad·Glút','D — Ombros','E — Post.·Pant','F — Core'], chave:6},
      {nome:'Upper/Lower × 3',             treinos:['A — Sup. Emp.','B — Inferior','C — Sup. Pux.','D — Inferior+Core','E — Ombros+Core','F — Especialização'], chave:'6b'},
    ],
  };
  const base = (mapa[numDias] || mapa[3]).slice();

  // ── Mescla modelos salvos pelo personal (LIBS.distribuicao) compatíveis com numDias ──
  // Sem isto, um modelo salvo nunca aparecia como opção real na prescrição — só existia
  // na aba de gestão de biblioteca (renderDistrib), desconectada deste fluxo.
  (LIBS.distribuicao || []).forEach(d => {
    if(!d.dias || !d.dias.length) return;
    if(d.dias.length !== numDias) return; // só oferece modelos com o número certo de sessões
    const chave = 'lib-' + d.id;
    const divisao = converterDivisaoLibParaTemplate(d);
    if(!divisao) return;
    DIVISOES_TEMPLATES[chave] = divisao;
    base.push({
      nome: '★ ' + d.nome,
      treinos: d.dias.map(dia => (dia.label||'Treino') + (dia.enfase ? ' — '+dia.enfase : '')),
      chave,
      _libId: d.id,
      objetivos_compativeis: d.objetivos_compativeis || [],
    });
  });

  // ── Filtro por objetivo ────────────────────────────────────────────────
  // Um modelo sem objetivos_compativeis definido (ou array vazio) é considerado
  // genérico/universal — a maioria das divisões (PPL, Upper/Lower, Full Body
  // clássico) é só um "contêiner" de sessões, serve pra qualquer objetivo.
  // Só filtramos modelos que foram explicitamente marcados como específicos
  // (ex: Full Body Metabólico → Emagrecimento/Composição/Cardio), pra não
  // esconder, por exemplo, um Push/Pull/Legs de quem escolheu Hipertrofia.
  if(!objetivo) return base;
  return base.filter(op => !op.objetivos_compativeis || !op.objetivos_compativeis.length || op.objetivos_compativeis.includes(objetivo));
}

// Converte um item de LIBS.distribuicao para o formato DIVISOES_TEMPLATES.
// Desde 2026-09-02 os dois lados usam CHAVE (ASCII, sem acento, sem espaco):
// LIBS.distribuicao[].grupos guarda 'RetoAbdominal' e GRUPOS_MAPA.id tambem —
// comparacao direta, sem normalizacao em runtime (dado antigo e convertido no
// load por _migrarLibsChaves). Grupos fora dos 12 oficiais de volume
// ('Adutores', 'TransversoDoAbdomen', 'QuadradoLombar', 'Romboides') sao
// ignorados de proposito.
function converterDivisaoLibParaTemplate(d){
  const def = [];
  const label = [];
  d.dias.forEach((dia, i) => {
    const grupos = (dia.grupos||[])
      .map(chaveGrupo => {
        // Compara por chave, mas tolera dado AINDA NAO MIGRADO ('Reto Abdominal'
        // com espaco) — LIBS pode vir do Supabase de uma sessao antiga, de um
        // backup, ou de um import. Trocar isto por === puro fez o grupo sumir
        // da divisao em silencio quando a migracao nao tinha rodado. Migrar e a
        // correcao; tolerar aqui e a rede de seguranca. (2026-09-03)
        const achado = GRUPOS_MAPA.find(gm => gm.id === chaveGrupo)
                    || GRUPOS_MAPA.find(gm => textoIgual(gm.id, chaveGrupo));
        return achado ? { g: achado.id } : null;
      })
      .filter(Boolean);
    def.push(grupos);
    label.push(dia.label || ('Treino ' + String.fromCharCode(65+i)));
  });
  if(!def.some(s => s.length)) return null; // nenhum grupo reconhecido em nenhuma sessão
  return { default: def, label };
}

const DIVISOES_TEMPLATES = {
  2:   {default:[
          [{g:'Peitoral'},{g:'Triceps'},{g:'Deltoide'},{g:'RetoAbdominal'}],
          [{g:'Latissimo'},{g:'Biceps'},{g:'Quadriceps'},{g:'Isquiossurais'},{g:'Gluteos'}]],
        label:['Treino A — Empurrar+Core','Treino B — Puxar+Pernas']},
  3:   {default:[
          [{g:'Peitoral'},{g:'Triceps'},{g:'Deltoide'}],
          [{g:'Quadriceps'},{g:'Isquiossurais'},{g:'Gluteos'},{g:'Panturrilhas'}],
          [{g:'Latissimo'},{g:'Biceps'},{g:'RetoAbdominal'},{g:'Obliquo'}]],
        label:['Treino A — Peito·Tríceps·Ombro','Treino B — Pernas','Treino C — Costas·Bíceps·Core']},
  '3b':{default:[
          [{g:'Peitoral'},{g:'Triceps'},{g:'Deltoide'},{g:'Quadriceps'}],
          [{g:'Latissimo'},{g:'Biceps'},{g:'Isquiossurais'},{g:'Gluteos'},{g:'Panturrilhas'}],
          [{g:'Peitoral'},{g:'Latissimo'},{g:'RetoAbdominal'},{g:'Obliquo'}]],
        label:['Treino A — Full Body Emp.','Treino B — Full Body Pux.','Treino C — Full Body Core']},
  4:   {default:[
          [{g:'Peitoral'},{g:'Triceps'}],
          [{g:'Latissimo'},{g:'Biceps'},{g:'Trapezio'}],
          [{g:'Quadriceps'},{g:'Gluteos'},{g:'Panturrilhas'}],
          [{g:'Deltoide'},{g:'Isquiossurais'},{g:'RetoAbdominal'},{g:'Obliquo'}]],
        label:['Treino A — Peito·Tríceps','Treino B — Costas·Bíceps','Treino C — Pernas','Treino D — Ombros·Post·Core']},
  '4b':{default:[
          [{g:'Peitoral'},{g:'Triceps'},{g:'Deltoide'}],
          [{g:'Quadriceps'},{g:'Isquiossurais'},{g:'Gluteos'},{g:'Panturrilhas'}],
          [{g:'Latissimo'},{g:'Biceps'},{g:'Trapezio'}],
          [{g:'Quadriceps'},{g:'Gluteos'},{g:'RetoAbdominal'},{g:'Obliquo'}]],
        label:['Treino A — Superior Emp.','Treino B — Inferior','Treino C — Superior Pux.','Treino D — Inferior+Core']},
  5:   {default:[
          [{g:'Peitoral'}],
          [{g:'Latissimo'},{g:'Biceps'}],
          [{g:'Quadriceps'},{g:'Gluteos'},{g:'Panturrilhas'}],
          [{g:'Deltoide'},{g:'Trapezio'}],
          [{g:'Isquiossurais'},{g:'Triceps'},{g:'RetoAbdominal'},{g:'Obliquo'}]],
        label:['Treino A — Peito','Treino B — Costas·Bíceps','Treino C — Pernas','Treino D — Ombros','Treino E — Post.·Tríceps·Core']},
  6:   {default:[
          [{g:'Peitoral'},{g:'Triceps'}],
          [{g:'Latissimo'},{g:'Biceps'}],
          [{g:'Quadriceps'},{g:'Gluteos'}],
          [{g:'Deltoide'},{g:'Trapezio'}],
          [{g:'Isquiossurais'},{g:'Panturrilhas'}],
          [{g:'RetoAbdominal'},{g:'Obliquo'}]],
        label:['Treino A — Peito·Trí','Treino B — Costas·Bíc','Treino C — Quad·Glút','Treino D — Ombros','Treino E — Post.·Pant','Treino F — Core']},
  // ── Divisões adicionadas do vault ACM ──────────────────────────────────
  '2b': {default:[
          [{g:'Peitoral'},{g:'Deltoide'},{g:'Triceps'},{g:'RetoAbdominal'},{g:'Obliquo'}],
          [{g:'Quadriceps'},{g:'Isquiossurais'},{g:'Gluteos'},{g:'Panturrilhas'},{g:'Latissimo'},{g:'Biceps'}]],
         label:['Treino A — Membros Superiores+Core','Treino B — Membros Inferiores+Puxar']},
  // Full Body Metabólico — 3 sessões com alta densidade metabólica (vault Saude/Emagr 3x)
  '3c': {default:[
          [{g:'Peitoral'},{g:'Triceps'},{g:'Deltoide'},{g:'RetoAbdominal'}],
          [{g:'Quadriceps'},{g:'Isquiossurais'},{g:'Gluteos'},{g:'Panturrilhas'}],
          [{g:'Latissimo'},{g:'Biceps'},{g:'Trapezio'},{g:'Obliquo'}]],
         label:['Treino A — MMSS Empurrar+Core','Treino B — Membros Inferiores','Treino C — MMSS Puxar+Core']},
  // Upper/Lower + PPL — 5 sessões (vault Hip/Emagr 5x avançado)
  '5b': {default:[
          [{g:'Peitoral'},{g:'Deltoide'},{g:'Triceps'},{g:'RetoAbdominal'}],
          [{g:'Quadriceps'},{g:'Isquiossurais'},{g:'Gluteos'},{g:'Panturrilhas'}],
          [{g:'Peitoral'},{g:'Triceps'},{g:'Deltoide'}],
          [{g:'Latissimo'},{g:'Biceps'},{g:'Trapezio'}],
          [{g:'Quadriceps'},{g:'Gluteos'},{g:'Isquiossurais'},{g:'Obliquo'}]],
         label:['Treino A — Superior','Treino B — Inferior','Treino C — Push','Treino D — Pull','Treino E — Pernas+Core']},
  // Upper/Lower × 3 — 6 sessões com especialização
  '6b': {default:[
          [{g:'Peitoral'},{g:'Triceps'},{g:'Deltoide'}],
          [{g:'Quadriceps'},{g:'Gluteos'},{g:'Panturrilhas'}],
          [{g:'Latissimo'},{g:'Biceps'},{g:'Trapezio'}],
          [{g:'Isquiossurais'},{g:'Gluteos'},{g:'RetoAbdominal'},{g:'Obliquo'}],
          [{g:'Deltoide'},{g:'Trapezio'},{g:'Triceps'},{g:'RetoAbdominal'}],
          [{g:'Quadriceps'},{g:'Latissimo'},{g:'Peitoral'},{g:'Obliquo'}]],
         label:['Treino A — Sup. Emp.','Treino B — Inferior A','Treino C — Sup. Pux.','Treino D — Inf+Core','Treino E — Ombros+Trí','Treino F — Full Body']},
};


// ── LIMITE DE SÉRIES POR SESSÃO ────────────────────────────────────────────

function calcLimSessaoRecomendado(){
  const s     = getActive(); if(!s) return 20;
  const nivel = val('pr-nivel') || s.anamnese?.nivel || 'Inic';
  const obj   = selectedObj || 'Saude';
  const faixa = (LIM_SESSAO_REF[obj] || LIM_SESSAO_REF['Saude'])[nivel] || [16,24];

  // Progressão por 3 fases (vault §10.2-bis) — consulta apenas a última ficha
  // criada para este aluno (objetivo + fase), não um histórico completo.
  const ultima = s.ultimaFaseVolSessao || null;
  const fase = getFaseVolumeSessao(obj, ultima?.objetivo ?? null, ultima?.fase ?? null);
  _s3._faseVolSessaoAtual = fase; // lido por aprovarTreinoMotor para persistir junto da ficha aprovada

  return getVolumeSessaoPorFase(faixa[0], faixa[1], fase);
}

function iniciarLimiteSessao(){
  if(_s3.limSessao === undefined){
    _s3.limSessao = calcLimSessaoRecomendado();
  }
  const inp = $('lim-sessao');
  if(inp) inp.value = _s3.limSessao;

  // Listeners botões +/-
  const btnM = $('btn-lim-menos');
  const btnP = $('btn-lim-mais');
  if(btnM && !btnM._bound){
    btnM._bound = true;
    btnM.addEventListener('click', () => {
      const inp = $('lim-sessao');
      inp.value = Math.max(4, (_s3.limSessao||20) - 1);
      _s3.limSessao = parseInt(inp.value);
      onLimSessaoChange();
    });
  }
  if(btnP && !btnP._bound){
    btnP._bound = true;
    btnP.addEventListener('click', () => {
      const inp = $('lim-sessao');
      inp.value = Math.min(60, (_s3.limSessao||20) + 1);
      _s3.limSessao = parseInt(inp.value);
      onLimSessaoChange();
    });
  }
  atualizarBadgeLimite();
}

function onLimSessaoChange(){
  const v = parseInt($('lim-sessao')?.value) || 20;
  _s3.limSessao = v;
  atualizarBadgeLimite();
  // Recalcula média/desvio do header de cada card — dependem do limite de sessão
  // através de calcSeriesSessaoComLimite. Preserva chaves de edição em andamento
  // (op.chave já apontando pra 'edit-i'/'lib-id') recalculando só cargasSessao/media/desvio,
  // sem regenerar a lista de opções do zero (regenerá-la perderia o ajuste em curso).
  if(_s3.divisaoOpcoes){
    const lim = _s3.limSessao;
    _s3.divisaoOpcoes.forEach((op, opIdx) => {
      const numDias = parseInt(val('pr-frequencia')||'3') || 3;
      const divisao = DIVISOES_TEMPLATES[op.chave] || DIVISOES[numDias];
      op.cargasSessao = divisao.default.map(sessaoGrupos =>
        calcSeriesSessaoOuZerado(sessaoGrupos, lim, divisao).totalAlvo
      );
      const media = op.cargasSessao.reduce((a,b)=>a+b,0) / op.cargasSessao.length;
      op.media  = Math.round(media);
      op.desvio = Math.round(Math.sqrt(op.cargasSessao.reduce((s,v)=>s+Math.pow(v-media,2),0) / op.cargasSessao.length) * 10) / 10;
      // Mudar o limite invalida os valores congelados anteriormente (foram
      // calculados pro limite antigo) — limpa e re-congela com o novo limite,
      // só na divisão atualmente selecionada (as outras opções da lista nem
      // têm overrides, só importa pra quem está sendo de fato editado).
      if(opIdx === _s3.divisaoIdx && _s3._sessionOverrides && !divisao._naoCalculada){
        divisao.default.forEach((sessao, ti) => {
          sessao.forEach(({g}) => { delete _s3._sessionOverrides[String(ti) + '-' + g]; });
        });
        dcCongelarValoresAtuais(divisao);
      }
    });
  }
  renderTelaDivisao();
}

function atualizarBadgeLimite(){
  const badge = $('lim-badge'); if(!badge) return;
  const rec = calcLimSessaoRecomendado();
  const lim = _s3.limSessao || rec;
  const baseCss = 'font-size:13px;font-variant-numeric:tabular-nums;padding:1px 5px;border-radius:6px;margin-left:4px;display:inline-block;min-width:8.5em;text-align:center;white-space:nowrap;flex-shrink:0;';
  if(Math.abs(lim - rec) <= 2){
    badge.textContent = 'Recomendado';
    badge.style.cssText = baseCss + 'background:var(--accent-dim);color:var(--accent);border:1px solid var(--accent-line)';
  } else if(lim < rec - 2){
    badge.textContent = 'Conservador';
    badge.style.cssText = baseCss + 'background:var(--amber-dim);color:var(--orange);border:1px solid var(--amber-line)';
  } else {
    badge.textContent = 'Intenso';
    badge.style.cssText = baseCss + 'background:var(--red-dim);color:var(--red);border:1px solid var(--red-line)';
  }
}

// Calcula série-alvo por grupo em uma sessão, respeitando o limite
// Parte do mínimo e sobe até o máximo sem ultrapassar o limite global da sessão
function calcExPorGrupo(semVol, freq, serEx, minimo){
  // Para grupos com freq > 1: arredonda volume semanal para número par antes de dividir
  let semAdj = semVol;
  if(freq > 1 && semAdj % 2 !== 0) semAdj = semAdj + 1; // próximo par
  const exSessao = Math.max(minimo, Math.floor(semAdj / freq / serEx));
  return exSessao;
}

// ══════════════════════════════════════════════════════════════════════════
// MOTOR DE VOLUME — calcula TODA a divisão de uma vez (visão semanal completa),
// porque a regra de mínimo semanal depende de somar todas as sessões onde um
// grupo aparece, não pode ser decidida sessão por sessão isoladamente.
//
// Regra validada com o personal trainer em 3 exemplos reais:
// 1. Todo grupo começa em 1 exercício em cada sessão onde aparece.
// 2. SUBIDA PRO MÍNIMO SEMANAL, em rodadas: cada rodada percorre as sessões em
//    ordem e, dentro de cada sessão, os grupos em ordem de hierarquia (#1
//    primeiro). Para cada grupo ainda abaixo do PRÓPRIO mínimo semanal
//    (somando todas as sessões onde aparece), tenta subir 1 exercício — só
//    aplica se isso não estourar o limite da sessão onde está essa ocorrência.
//    Se estourar, pula (tenta de novo na rodada seguinte, caso a situação
//    mude por outro grupo ter parado de subir). Repete até todos baterem o
//    mínimo semanal ou nenhuma sessão conseguir mais subir ninguém que precise
//    (situação travada — fica abaixo da faixa, sistema nunca remove/move nada,
//    só sinaliza visualmente).
// 3. DISTRIBUIÇÃO DA SOBRA: sessões com margem restante depois do passo 2
//    sobem o #1 (e seguintes, em rodada) até bater o limite ou o próprio teto
//    semanal (exMax) — só entre os grupos que já estão naquela sessão.
// ══════════════════════════════════════════════════════════════════════════
const _cacheVolumeDivisao = { chave: null, resultado: null };

function calcVolumeDivisaoCompleta(divisao, limSessao){
  // Cache simples: evita reprocessar a mesma divisão+limite repetidamente
  // quando chamada em sequência dentro do mesmo .map()/.forEach() de render.
  const chaveCache = JSON.stringify({ d: divisao.default, lim: limSessao, vp: _s3.volPorGrupo });
  if(_cacheVolumeDivisao.chave === chaveCache) return _cacheVolumeDivisao.resultado;

  const serExGlobal = _s3.seriesPorEx || 3;
  const volPorGrupo = _s3.volPorGrupo;

  // 1. Monta estrutura por sessão, partindo de 1 exercício.
  const sessoesProcessadas = divisao.default.map(sessaoGrupos =>
    sessaoGrupos.map(({g}, idx) => {
      const vg    = volPorGrupo[g];
      const ativo = vg && vg.ativo !== false;
      if(!ativo) return { g, idx, ativo:false };
      const freq_g = Math.max(1, vg.freq || 1);
      const serEx  = vg.serEx || serExGlobal;
      const semMinRaw = vg.semMin || 0;
      const semMaxRaw = vg.semMax || 0;
      const semMinAdj = freq_g > 1 && semMinRaw % 2 !== 0 ? semMinRaw + 1 : semMinRaw;
      const semMaxAdj = freq_g > 1 && semMaxRaw % 2 !== 0 ? semMaxRaw + 1 : semMaxRaw;
      return { g, idx, serEx, freq: freq_g, semMin: semMinAdj, semMax: semMaxAdj, exAlvo: 1, ativo: true };
    })
  );

  // 2. Mapa grupo -> todas as ocorrências (pode estar em mais de uma sessão).
  const porGrupo = {};
  sessoesProcessadas.forEach(sessao => sessao.forEach(item => {
    if(!item.ativo) return;
    if(!porGrupo[item.g]) porGrupo[item.g] = [];
    porGrupo[item.g].push(item);
  }));

  function serSemanalAtual(g){
    return (porGrupo[g]||[]).reduce((s,item) => s + item.exAlvo*item.serEx, 0);
  }
  function totalSessaoAtual(ti){
    return sessoesProcessadas[ti].reduce((s,item) => item.ativo ? s + item.exAlvo*item.serEx : s, 0);
  }

  // 3. SUBIDA PRO MÍNIMO SEMANAL — em rodadas, nunca estoura sessão nenhuma.
  let mudouAlgumaCoisa = true;
  while(mudouAlgumaCoisa){
    mudouAlgumaCoisa = false;
    for(let ti = 0; ti < sessoesProcessadas.length; ti++){
      const sessao = sessoesProcessadas[ti];
      for(let idx = 0; idx < sessao.length; idx++){
        const item = sessao[idx];
        if(!item.ativo) continue;
        if(serSemanalAtual(item.g) >= item.semMin) continue; // já bateu o próprio mínimo
        if(totalSessaoAtual(ti) + item.serEx > limSessao) continue; // estouraria — pula
        item.exAlvo++;
        mudouAlgumaCoisa = true;
      }
    }
  }

  // 4. DISTRIBUIÇÃO DA SOBRA — agora coordenada GLOBALMENTE entre TODAS as
  // sessões ao mesmo tempo (não sessão por sessão até esgotar). Cada rodada
  // percorre TODAS as sessões dando no máximo +1 exercício por ocorrência,
  // respeitando o teto semanal (semMax) do grupo e o limite de cada sessão.
  // Sem isso, um grupo repetido em mais de uma sessão (ex: Peitoral 2x/sem)
  // tinha a PRIMEIRA sessão onde aparece consumindo toda a margem semanal
  // restante antes das outras sessões do mesmo grupo serem visitadas — bug
  // real, confirmado: 3 sessões idênticas do mesmo grupo ficavam com
  // 18s/6s/6s em vez de ~9s/9s/9s.
  let sobrouMargemGlobal = true;
  while(sobrouMargemGlobal){
    sobrouMargemGlobal = false;
    for(let ti = 0; ti < sessoesProcessadas.length; ti++){
      const sessao = sessoesProcessadas[ti];
      for(let idx = 0; idx < sessao.length; idx++){
        const item = sessao[idx];
        if(!item.ativo) continue;
        if(serSemanalAtual(item.g) + item.serEx > item.semMax) continue; // teto semanal
        if(totalSessaoAtual(ti) + item.serEx > limSessao) continue;
        item.exAlvo++;
        sobrouMargemGlobal = true;
      }
    }
  }

  // 5. Monta resultado por sessão (formato compatível com o uso anterior).
  // Grupos INATIVOS (desligados na tela de Volume) são EXCLUÍDOS aqui, não
  // mapeados para uma entrada zerada — uma entrada fantasma zerada consumia
  // uma posição no array sem nunca ser desenhada na tela, o que desalinhava
  // o índice usado pelo zebrado (linhas claras/escuras alternadas) de todas
  // as linhas seguintes, e também acabava sendo congelada como override
  // fantasma sempre que a divisão era selecionada/recalculada.
  const resultado = sessoesProcessadas.map(sessao => {
    const grupos = sessao.filter(item => item.ativo).map(item => {
      const semAtual = serSemanalAtual(item.g);
      // forcouAbaixoDoMinimo: travado por falta de margem em TODAS as sessões onde aparece
      const forcou = semAtual < item.semMin;
      return {
        g: item.g, idx: item.idx, exAlvo: item.exAlvo, serEx: item.serEx, freq: item.freq,
        exMin: Math.max(1, Math.ceil(item.semMin/item.freq/item.serEx)), // referência informativa
        exMax: Math.max(1, Math.floor(item.semMax/item.freq/item.serEx)),
        serSessao: item.exAlvo * item.serEx,
        serSemana: semAtual,
        exSemana: item.exAlvo * item.freq,
        exMinSem: item.semMin, exMaxSem: item.semMax,
        serMinSem: item.semMin, serMaxSem: item.semMax,
        _forcouAbaixoDoMinimo: forcou,
      };
    });
    const totalAlvo = grupos.reduce((s,g) => s + g.serSessao, 0);
    const forcouAbaixoDoMinimo = grupos.some(g => g._forcouAbaixoDoMinimo);
    const estourou = totalAlvo > limSessao;
    const pct = limSessao > 0 ? Math.round((totalAlvo/limSessao)*100) : 0;
    const totalMin = grupos.reduce((s,g) => s + g.serSessao, 0); // referência informativa
    return { grupos, totalMin, totalAlvo, limSessao, estourou, forcouAbaixoDoMinimo, pct };
  });

  _cacheVolumeDivisao.chave = chaveCache;
  _cacheVolumeDivisao.resultado = resultado;
  return resultado;
}

// Mantém a assinatura antiga (por sessão) pra compatibilidade com os pontos de
// chamada existentes — internamente delega pro motor de divisão completa,
// já que a regra de mínimo semanal exige ver todas as sessões de uma vez.
// Mantém a assinatura antiga (por sessão) pra compatibilidade com os pontos de
// chamada existentes — internamente delega pro motor de divisão completa, já
// que a regra de mínimo semanal exige ver todas as sessões de uma vez.
// Aceita um terceiro parâmetro opcional `divisaoForcada`: usado por chamadores
// que já sabem exatamente qual divisão estão processando (ex: onLimSessaoChange
// iterando por TODAS as opções, não só a selecionada) — sem isso, o código
// inferia a divisão via _s3.divisaoIdx, o que processava a divisão ERRADA
// sempre que o loop estivesse processando uma opção diferente da selecionada.
function calcSeriesSessaoComLimite(sessaoGrupos, limSessao, divisaoForcada){
  let divisao = divisaoForcada;
  if(!divisao){
    const op = _s3.divisaoOpcoes && _s3.divisaoOpcoes[_s3.divisaoIdx];
    divisao = op && DIVISOES_TEMPLATES[op.chave];
  }
  if(divisao){
    const ti = divisao.default.indexOf(sessaoGrupos);
    if(ti >= 0){
      const resultadoCompleto = calcVolumeDivisaoCompleta(divisao, limSessao);
      return resultadoCompleto[ti];
    }
  }
  // Fallback: sessaoGrupos não pertence à divisão informada/selecionada (ex:
  // chamada isolada/teste) — processa como divisão de 1 sessão só, mesma regra.
  const divisaoIsolada = { default: [sessaoGrupos] };
  return calcVolumeDivisaoCompleta(divisaoIsolada, limSessao)[0];
}

// Wrapper usado nos pontos de RENDERIZAÇÃO de uma divisão já selecionada
// (resumo semanal e acordeão por sessão). Se a divisão de trabalho estiver
// marcada como _naoCalculada (nasceu de "⚡ Divisão Rápida" e ainda não passou
// por "Recalcular volume"), devolve tudo zerado em vez de calcular de verdade
// — o personal monta a composição como quiser, sem o sistema preencher
// número nenhum, até clicar explicitamente em recalcular. Modelos prontos
// (templates fixos, LIBS, ou um modelo existente em ajuste via dc*) nunca têm
// essa flag, então continuam calculando normalmente como sempre fizeram.
function calcSeriesSessaoOuZerado(sessaoGrupos, limSessao, divisao){
  if(divisao && divisao._naoCalculada){
    const grupos = sessaoGrupos.map(({g}, idx) => ({
      g, idx, exMin:0, exMax:0, exAlvo:0, serEx:0, freq:0,
      serSessao:0, serSemana:0, exSemana:0, exMinSem:0, exMaxSem:0, serMinSem:0, serMaxSem:0,
    }));
    return { grupos, totalMin:0, totalAlvo:0, limSessao, estourou:false, forcouAbaixoDoMinimo:false, pct:0 };
  }
  return calcSeriesSessaoComLimite(sessaoGrupos, limSessao, divisao);
}

// Retorna o resultado de uma sessão usando os valores REALMENTE EXIBIDOS nas
// linhas — override manual (_sessionOverrides) tem prioridade sobre o cálculo
// puro da engine, exatamente como cada linha individual já decide o que
// mostrar. Usado em todo lugar que soma/totaliza uma sessão (badge do header,
// resumo semanal) — sem isso, reordenar um grupo (que não toca em overrides,
// só troca posição) fazia o BADGE mostrar o total recalculado do zero,
// enquanto as linhas continuavam mostrando os valores congelados antigos,
// gerando uma divergência visual real entre o número grande e a soma das
// linhas abaixo dele (bug confirmado: badge ia de 16s pra 28s sem nenhuma
// linha mudar).
function calcSeriesSessaoExibida(sessaoGrupos, limSessao, divisao, ti){
  const calc = calcSeriesSessaoOuZerado(sessaoGrupos, limSessao, divisao);
  const overrides = _s3._sessionOverrides || {};
  let totalAlvo = 0;
  const grupos = calc.grupos.map(g => {
    const ov = overrides[String(ti) + '-' + g.g];
    const exAlvo = ov ? ov.numEx : g.exAlvo;
    const serEx  = ov ? ov.serEx : g.serEx;
    const serSessao = ov ? ov.serSessao : g.serSessao;
    totalAlvo += serSessao;
    return { ...g, exAlvo, serEx, serSessao };
  });
  const estourou = totalAlvo > limSessao;
  const pct = limSessao > 0 ? Math.round((totalAlvo/limSessao)*100) : 0;
  return { ...calc, grupos, totalAlvo, estourou, pct };
}

// Prepara a caixa "Modelos de Divisão" — chamada junto com iniciarTelaVolume()
// ao entrar no step 2, já que Volume e Divisão agora vivem na mesma tela,
// lado a lado, e não são mais telas navegáveis separadamente (voltarVolume/
// irParaDivisao existiam quando eram sub-telas alternadas; hoje as duas caixas
// ficam sempre visíveis e sincronizadas).
function irParaDivisao(){
  const s       = getActive(); if(!s) return;
  const freq    = val('pr-frequencia') || s.anamnese?.frequencia || '3x';
  const numDias = parseInt(freq) || 3;
  const obj     = selectedObj || 'Saude';

  // Preserva edições de divisão em andamento (dc*) ao apenas re-entrar nesta
  // tela — só gera opções do zero na primeira visita, ou quando o nº de
  // sessões ou o objetivo (que filtra quais modelos aparecem) mudou de fato.
  const chaveGeracao = numDias + '|' + obj;
  const jaTinhaOpcoes = _s3.divisaoOpcoes && _s3.divisaoOpcoes.length && _s3._divChaveGeracao === chaveGeracao;
  if(!jaTinhaOpcoes){
    _s3.divisaoOpcoes     = gerarDivisoesBalanceadas(numDias, obj);
    _s3._divNumDias       = numDias;
    _s3._divChaveGeracao  = chaveGeracao;
    _s3.divisaoIdx        = Math.min(_s3.divisaoIdx||0, _s3.divisaoOpcoes.length - 1);
  }

  requestAnimationFrame(() => {
    // Reseta limSessao se mudou objetivo/nível
    const chave = (selectedObj||'') + (val('pr-nivel')||'');
    if(_s3._limChave !== chave){ _s3.limSessao = undefined; _s3._limChave = chave; }
    iniciarLimiteSessao();
    // Congela o card selecionado por padrão com o limite já resolvido e
    // estável — feito aqui (depois de iniciarLimiteSessao), não antes, pra
    // não congelar com um limite que está prestes a ser invalidado pela
    // checagem de objetivo/nível acima.
    if(!jaTinhaOpcoes){
      const opInicial = _s3.divisaoOpcoes[_s3.divisaoIdx];
      const divisaoInicial = opInicial && DIVISOES_TEMPLATES[opInicial.chave];
      if(divisaoInicial && !divisaoInicial._naoCalculada){
        sincronizarFreqGrupos(); // limpa grupos inativos fantasmas antes de congelar
        dcCongelarValoresAtuais(divisaoInicial);
      }
    }
    renderTelaDivisao();
  });
}

// Recalcula média/desvio de cada modelo de divisão já listado, sem regerar a
// lista nem reordenar os cards — chamado toda vez que o volume por grupo muda
// (Grupo 1 alimentando a Tela de Divisão ao vivo, sem precisar de um botão
// "Avançar"). Reordenar aqui bagunçaria a posição dos cards enquanto o
// personal ainda está ajustando os números.
function recalcularCargasDivisoes(){
  if(!_s3.divisaoOpcoes || !_s3.divisaoOpcoes.length) return;
  const lim = _s3.limSessao || calcLimSessaoRecomendado();
  _s3.divisaoOpcoes.forEach(op => {
    const divisao = DIVISOES_TEMPLATES[op.chave];
    if(!divisao) return;
    const cargasSessao = divisao.default.map(sessaoGrupos =>
      calcSeriesSessaoOuZerado(sessaoGrupos, lim, divisao).totalAlvo
    );
    const media  = cargasSessao.reduce((a,b) => a+b, 0) / cargasSessao.length;
    const desvio = Math.sqrt(cargasSessao.reduce((s,v) => s + Math.pow(v-media,2), 0) / cargasSessao.length);
    op.cargasSessao = cargasSessao;
    op.media  = Math.round(media);
    op.desvio = Math.round(desvio*10)/10;
  });
  renderTelaDivisao();
}

function gerarDivisoesBalanceadas(numDias, objetivo){
  const templates = getDivisoesDisponiveis(numDias, objetivo || selectedObj || 'Saude');
  const lim = _s3.limSessao || calcLimSessaoRecomendado();
  return templates.map(op => {
    const divisao = DIVISOES_TEMPLATES[op.chave] || DIVISOES[numDias];
    // Usa o cálculo real pós-corte de limite (calcSeriesSessaoComLimite) — o mesmo
    // que é exibido em cada sessão do acordeão — em vez do volume semanal alvo bruto
    // por grupo (vg.sem), que ignorava a divisão por frequência e o corte de limite.
    // Sem isso, o header mostrava média/desvio inconsistentes com o que cada sessão
    // de fato entrega (ex: 3 sessões a 20/20s reais, mas header dizia 62/54/59s).
    const cargasSessao = divisao.default.map(sessaoGrupos =>
      calcSeriesSessaoOuZerado(sessaoGrupos, lim, divisao).totalAlvo
    );
    const media  = cargasSessao.reduce((a,b) => a+b, 0) / cargasSessao.length;
    const desvio = Math.sqrt(cargasSessao.reduce((s,v) => s + Math.pow(v-media,2), 0) / cargasSessao.length);
    return { ...op, cargasSessao, media: Math.round(media), desvio: Math.round(desvio*10)/10 };
  }).sort((a,b) => a.desvio - b.desvio);
}

// ══════════════════════════════════════════════════════════════════════════
// EDITOR LEVE DE DIVISÃO (dc*) — ajuste rápido de sessões direto no acordeão,
// sem modal, sem formulário de critérios. Por padrão NÃO salva nada: o ajuste
// vive só em _s3 (estado da prescrição atual) e é descartado se o personal sair
// sem usar "Salvar como modelo". Para catalogar formalmente, use o botão ✏
// (abre o formulário completo, que sempre grava em LIBS.distribuicao).
// ══════════════════════════════════════════════════════════════════════════

// Liga/desliga o modo de edição leve para o card i. Ao ligar, clona a divisão
// atual desse card para uma chave de trabalho própria (DIVISOES_TEMPLATES['edit-'+i])
// e aponta op.chave pra ela — assim TODO o resto do sistema (cálculo de limite,
// resumo semanal, geração de ficha) lê a versão editada sem precisar de nenhum
// código especial em nenhuma outra função.
function dcToggleEdicao(i){
  const ligando = _s3._dcEditando !== i;
  _s3._dcEditando = ligando ? i : undefined;
  if(ligando){
    const op = _s3.divisaoOpcoes[i]; if(!op) return;
    const numDias = parseInt(val('pr-frequencia')||'3') || 3;
    const origem  = DIVISOES_TEMPLATES[op.chave] || DIVISOES[numDias];
    // Clone profundo — nunca muta o template original (compartilhado/persistido)
    const chaveEdit = 'edit-' + i;
    DIVISOES_TEMPLATES[chaveEdit] = {
      default: origem.default.map(sessao => sessao.map(x => ({...x}))),
      label:   [...origem.label],
    };
    op._chaveOriginal = op._chaveOriginal || op.chave; // guarda a original pra referência/restaurar nome
    op.chave = chaveEdit;
  }
  // Reabre o acordeão deste card automaticamente e re-renderiza
  setTimeout(() => {
    const body  = $('acc-body-' + i);
    const arrow = $('acc-arrow-' + i);
    if(body)  body.style.display = 'block';
    if(arrow) arrow.innerHTML = '<i class=ph-caret-down></i>';
  }, 0);
  renderTelaDivisao();
}

// Reordena um grupo DENTRO da mesma sessão — sobe (-1) ou desce (+1) na lista.
// A posição na lista determina a prioridade de corte em calcSeriesSessaoComLimite
// (remove do último pro primeiro quando o limite aperta): grupo no topo = protegido.
// NÃO recalcula nada — a chave de override (ti+g) não muda com a reordenação,
// então o número exibido continua exatamente o mesmo até o personal clicar
// "Recalcular volume" (cálculo automático só roda ao abrir a tela e nesse clique).
function dcReordenarGrupo(cardIdx, ti, g, direcao){
  const op = _s3.divisaoOpcoes[cardIdx]; if(!op) return;
  const divisao = DIVISOES_TEMPLATES[op.chave]; if(!divisao) return;
  const sessao = divisao.default[ti]; if(!sessao) return;
  const idx = sessao.findIndex(x => x.g === g); if(idx < 0) return;
  const novoIdx = idx + direcao;
  if(novoIdx < 0 || novoIdx >= sessao.length) return;
  const gVizinho = sessao[novoIdx].g;
  [sessao[idx], sessao[novoIdx]] = [sessao[novoIdx], sessao[idx]];
  // Espelha a troca no snapshot _defaultOrig — ver _dcOrigReordenar.
  _dcOrigReordenar(divisao, ti, g, gVizinho, direcao);
  renderTelaDivisao();
}

// ── Sincronização do snapshot _defaultOrig ────────────────────────────────
// sincronizarFreqGrupos() guarda uma cópia intacta das sessões em
// divisao._defaultOrig e RESTAURA divisao.default a partir dela em toda
// chamada (é assim que um grupo reativado na tela de Volume volta a aparecer).
// renderTelaDivisao() chama sincronizarFreqGrupos() na primeira linha — então
// qualquer mudança estrutural feita em divisao.default logo antes de
// renderizar é desfeita se o snapshot não for atualizado junto.
// dcAdicionarGrupo/dcRemoverGrupo resolvem isso invalidando o snapshot
// (delete _defaultOrig). Reordenar/mover NÃO podem simplesmente invalidar:
// o snapshot também carrega os grupos hoje inativos (removidos fisicamente
// de default), e descartá-lo perderia esses grupos pra sempre. Por isso aqui
// a mesma operação é aplicada ao snapshot, casando por grupo (g) — os índices
// de default e _defaultOrig divergem por causa dos inativos.
// Bug que isso corrige: na "⚡ Divisão rápida" o card em edição é também o
// card selecionado (abrirNovaDivisaoRapida seta divisaoIdx e _dcEditando no
// mesmo índice, e sincronizarFreqGrupos só age no selecionado), então ↑/↓ e
// "→ mover p/..." não tinham efeito nenhum — a restauração revertia tudo no
// mesmo render.
function _dcOrigReordenar(divisao, ti, g, gVizinho, direcao){
  const orig = divisao._defaultOrig && divisao._defaultOrig[ti];
  if(!orig) return;
  const iG = orig.findIndex(x => x.g === g); if(iG < 0) return;
  const [item] = orig.splice(iG, 1);
  const iViz = orig.findIndex(x => x.g === gVizinho);
  if(iViz < 0){ orig.splice(iG, 0, item); return; } // vizinho não está no snapshot: desfaz
  orig.splice(direcao < 0 ? iViz : iViz + 1, 0, item);
}

function _dcOrigMover(divisao, ti, tiDestino, g){
  const orig = divisao._defaultOrig; if(!orig) return;
  if(!orig[ti] || !orig[tiDestino]) return;
  const iG = orig[ti].findIndex(x => x.g === g); if(iG < 0) return;
  const [item] = orig[ti].splice(iG, 1);
  if(!orig[tiDestino].some(x => x.g === g)) orig[tiDestino].push(item);
}

// Move um grupo da sessão ti para outra sessão (tiDestino), mesma divisão de
// trabalho. NÃO recalcula nada — congela o número que o grupo já tinha
// (override existente ou valor calculado que estava exibido) e o transfere
// pra chave da sessão destino, já que a chave de override é "ti-g" e muda
// quando o grupo muda de sessão. Os demais grupos das duas sessões (origem e
// destino) mantêm seus próprios valores intactos.
function dcMoverGrupo(cardIdx, ti, g, tiDestino){
  const op = _s3.divisaoOpcoes[cardIdx]; if(!op) return;
  const divisao = DIVISOES_TEMPLATES[op.chave]; if(!divisao) return;
  tiDestino = parseInt(tiDestino);
  if(tiDestino === ti || isNaN(tiDestino)) return;
  const origemArr = divisao.default[ti]; const destinoArr = divisao.default[tiDestino];
  if(!origemArr || !destinoArr) return;
  const idx = origemArr.findIndex(x => x.g === g); if(idx < 0) return;

  // Captura o valor ATUAL do grupo (override já existente, senão o calculado
  // que estava sendo mostrado na sessão de origem) antes de mover.
  const lim = _s3.limSessao || calcLimSessaoRecomendado();
  const chaveAntiga = String(ti) + '-' + g;
  let valorAtual = (_s3._sessionOverrides||{})[chaveAntiga];
  if(!valorAtual){
    const calcOrigem = calcSeriesSessaoOuZerado(origemArr, lim, divisao);
    const grupoCalc = calcOrigem.grupos.find(x => x.g === g);
    if(grupoCalc) valorAtual = { numEx: grupoCalc.exAlvo, serEx: grupoCalc.serEx, serSessao: grupoCalc.serSessao };
  }

  const [item] = origemArr.splice(idx, 1);
  // Evita duplicar se o grupo já existe na sessão destino
  const novoNaDestino = !destinoArr.some(x => x.g === item.g);
  if(novoNaDestino) destinoArr.push(item);
  // Espelha a movimentação no snapshot _defaultOrig — sem isso o próximo
  // render (sincronizarFreqGrupos) devolve o grupo pra sessão de origem.
  if(novoNaDestino) _dcOrigMover(divisao, ti, tiDestino, g);
  else { // já existia no destino: o efeito real foi só remover da origem
    const orig = divisao._defaultOrig;
    if(orig && orig[ti]){
      const iG = orig[ti].findIndex(x => x.g === g);
      if(iG >= 0) orig[ti].splice(iG, 1);
    }
  }

  if(!_s3._sessionOverrides) _s3._sessionOverrides = {};
  delete _s3._sessionOverrides[chaveAntiga];
  if(novoNaDestino && valorAtual){
    // Congela o mesmo valor na chave nova — o grupo mantém o número que tinha.
    _s3._sessionOverrides[String(tiDestino) + '-' + g] = valorAtual;
  }
  sincronizarFreqGrupos();
  renderTelaDivisao();
}

// Adiciona um grupo a UMA sessão específica. Diferente de dcMoverGrupo: aqui a
// duplicação ENTRE sessões é o objetivo (ex: Peitoral em A e também em C = 2x/sem),
// só bloqueia duplicar dentro da MESMA sessão (não faz sentido o mesmo grupo 2x
// na mesma sessão). O grupo novo entra ZERADO (sem cálculo nenhum) — os outros
// grupos da sessão mantêm seus próprios valores intactos, sem recálculo.
function dcAdicionarGrupo(cardIdx, ti, g){
  const op = _s3.divisaoOpcoes[cardIdx]; if(!op) return;
  const divisao = DIVISOES_TEMPLATES[op.chave]; if(!divisao) return;
  const sessao = divisao.default[ti]; if(!sessao) return;
  if(sessao.some(x => x.g === g)) return; // já está nesta sessão, não duplica
  // Mesma trava do switch de volume: grupo sem exercício no nível/local atual não
  // entra em sessão nenhuma, nem por este caminho.
  if(_s3.volPorGrupo[g]?._semEx) return;
  sessao.push({ g });
  if(!_s3._sessionOverrides) _s3._sessionOverrides = {};
  // Nasce com 1 exercício e a série já configurada na tela de Volume (vg.serEx) —
  // não com zero: zerado fazia o grupo aparecer "fantasma" (0×0=0s) na sessão até
  // o personal clicar manualmente em "+", com a régua e o total da sessão
  // ignorando esse grupo enquanto isso.
  const _vgNovo    = _s3.volPorGrupo[g];
  const _serExNovo = (_vgNovo && _vgNovo.serEx) || _s3.seriesPorEx || 3;
  _s3._sessionOverrides[String(ti) + '-' + g] = { numEx: 1, serEx: _serExNovo, serSessao: _serExNovo };
  // Invalida o backup — o personal acabou de mudar a composição manual,
  // esse novo estado é a nova verdade; a próxima chamada salva backup fresh.
  delete divisao._defaultOrig;
  sincronizarFreqGrupos();
  renderTelaDivisao();
}

// Remove um grupo de uma sessão específica. Se era a última sessão em que esse
// grupo aparecia na divisão, ele passa a ficar "ausente" — o aviso de cobertura
// vai sinalizar isso automaticamente no próximo render (via dcVerificarCobertura).
// Os demais grupos da sessão mantêm seus próprios valores intactos, sem recálculo.
function dcRemoverGrupo(cardIdx, ti, g){
  const op = _s3.divisaoOpcoes[cardIdx]; if(!op) return;
  const divisao = DIVISOES_TEMPLATES[op.chave]; if(!divisao) return;
  const sessao = divisao.default[ti]; if(!sessao) return;
  const idx = sessao.findIndex(x => x.g === g); if(idx < 0) return;
  sessao.splice(idx, 1);
  if(_s3._sessionOverrides) delete _s3._sessionOverrides[String(ti) + '-' + g];
  // Invalida o backup — o personal acabou de mudar a composição manual,
  // esse novo estado é a nova verdade; a próxima chamada salva backup fresh.
  delete divisao._defaultOrig;
  sincronizarFreqGrupos();
  renderTelaDivisao();
}

// Verifica cobertura: grupos ativos (selecionados na tela de Volume) que NÃO aparecem
// em nenhuma sessão da divisão de trabalho atual. Usado para o aviso visual ao vivo
// durante a edição — o personal vê na hora se "esqueceu" algum grupo selecionado.
function dcVerificarCobertura(cardIdx){
  const op = _s3.divisaoOpcoes[cardIdx]; if(!op) return {ausentes:[], extras:[]};
  const divisao = DIVISOES_TEMPLATES[op.chave]; if(!divisao) return {ausentes:[], extras:[]};
  const noModelo = new Set();
  divisao.default.forEach(sessao => sessao.forEach(({g}) => noModelo.add(g)));
  const ativos = Object.keys(_s3.volPorGrupo).filter(g => _s3.volPorGrupo[g]?.ativo !== false);
  const ausentes = ativos.filter(g => !noModelo.has(g));
  const extras   = [...noModelo].filter(g => !ativos.includes(g));
  return { ausentes, extras };
}

// Congela os valores ATUALMENTE CALCULADOS de uma divisão inteira em
// overrides explícitos — usado assim que uma divisão é exibida/selecionada
// (entrada na tela, ou clique num card), e de novo logo após "Recalcular
// volume" terminar de calcular. A partir desse momento, qualquer ação
// (reordenar, mover, adicionar, remover) opera sobre números já congelados,
// nunca mais cai de volta no cálculo puro da engine — que só deve aparecer
// nesses dois momentos exatos (abertura do modelo e clique em recalcular),
// nunca como efeito colateral de reordenar ou qualquer outro ajuste.
function dcCongelarValoresAtuais(divisao){
  if(!_s3._sessionOverrides) _s3._sessionOverrides = {};
  // Não sobrescreve se JÁ existir pelo menos um override desta divisão —
  // significa que o personal já ajustou algo manualmente, e congelar de novo
  // jogaria fora esse ajuste. Só congela quando a divisão está "limpa"
  // (acabou de ser selecionada pela primeira vez, ou acabou de recalcular).
  const jaTemOverride = divisao.default.some((sessaoGrupos, ti) =>
    sessaoGrupos.some(({g}) => (String(ti) + '-' + g) in _s3._sessionOverrides)
  );
  if(jaTemOverride) return;
  divisao.default.forEach((sessaoGrupos, ti) => {
    const calc = calcSeriesSessaoComLimite(sessaoGrupos, _s3.limSessao || calcLimSessaoRecomendado(), divisao);
    calc.grupos.forEach(({g, exAlvo, serEx, serSessao}) => {
      _s3._sessionOverrides[String(ti) + '-' + g] = { numEx: exAlvo, serEx, serSessao };
    });
  });
}

// Descarta os ajustes manuais de exercício/série (_sessionOverrides) feitos via
// input direto nas sessões desta divisão, e deixa calcSeriesSessaoComLimite
// recalcular tudo do zero — respeitando a ordem de prioridade atual dos grupos
// (definida pelo reorder dc*) e o limite de séries/sessão. Não afeta os alvos
// de volume semanal por grupo (_s3.volPorGrupo), só a distribuição por sessão.
function dcRecalcularVolume(cardIdx){
  const op = _s3.divisaoOpcoes[cardIdx]; if(!op) return;
  const divisao = DIVISOES_TEMPLATES[op.chave]; if(!divisao) return;
  if(_s3._sessionOverrides){
    divisao.default.forEach((sessao, ti) => {
      sessao.forEach(({g}) => { delete _s3._sessionOverrides[String(ti) + '-' + g]; });
    });
  }
  // Libera o cálculo real — divisões criadas do zero (⚡ Divisão Rápida) ficam
  // com exercício/série zerados até este clique explícito.
  divisao._naoCalculada = false;
  sincronizarFreqGrupos();
  // Recalcula puro e imediatamente congela esse resultado — assim o próximo
  // reorder/mover/adicionar não recai de volta no cálculo puro.
  dcCongelarValoresAtuais(divisao);
  renderTelaDivisao();
}

// Abre o formulário completo da biblioteca (preencherModalDistrib) pré-preenchido
// com a divisão de trabalho atual — converte o formato interno (ids sem acento)
// de volta para nomes de display (com acento), pro personal só completar os
// critérios clínicos/objetivos e salvar permanentemente em LIBS.distribuicao.
function dcSalvarComoModelo(cardIdx){
  const op = _s3.divisaoOpcoes[cardIdx]; if(!op) return;
  const divisao = DIVISOES_TEMPLATES[op.chave]; if(!divisao) return;
  const s = getActive();
  const numDias = parseInt(val('pr-frequencia')||'3') || 3;
  const nivelCodigo = val('pr-nivel') || s?.anamnese?.nivel || '';
  const NIVEL_LONGO = {Inic:'Iniciante', Inte:'Intermediário', Avan:'Avançado'};
  const nivelLongo  = NIVEL_LONGO[nivelCodigo] || '';
  const dias = divisao.default.map((sessao, ti) => ({
    label: divisao.label[ti] || ('Treino ' + String.fromCharCode(65+ti)),
    enfase: '',
    grupos: sessao.map(({g}) => {
      const gm = GRUPOS_MAPA.find(x => x.id === g);
      return gm ? gm.label : g; // usa o nome de display correspondente
    }),
  }));
  // Pseudo-objeto no formato esperado por preencherModalDistrib (sem id = "novo")
  // — importa nível/objetivo do perfil atual, igual abrirNovaDivisaoCompleta,
  // já que este caminho também nasce de uma prescrição em curso.
  const draft = {
    id: '', nome: (op.nome||'').replace(/^[★⚡]\s*/, '').replace(/\s*\(não salva\)$/,'') + ' (ajustado)',
    tipo_divisao: 'Personalizado', freq: numDias + 'x', freq_musculo: '',
    ref: '', nivel_min: nivelLongo, nivel_max: '',
    objetivos_compativeis: selectedObj ? [selectedObj] : [],
    freq_compativeis: [numDias + 'x'],
    bloq_nivel: [], bloq_cond: [], bloq_obj: [],
    dias, uso_itens: [], contra_itens: [], vant: '', desv: '',
  };
  preencherModalDistrib(draft);
  $('modal-distrib').classList.remove('hidden');
  _pendingDivisaoCallback = true;
}


function renderTelaDivisao(){
  sincronizarFreqGrupos();
  const opcoes = _s3.divisaoOpcoes;
  const cont   = $('divisao-opcoes'); if(!cont) return;
  cont.innerHTML = '';
  const LABEL = {};
  GRUPOS_MAPA.forEach(({id,label}) => { LABEL[id] = label; });

  // Índice do menor desvio ATUAL — não é sempre o índice 0: a lista só é
  // ordenada uma vez, na geração (gerarDivisoesBalanceadas). Depois disso o
  // volume muda ao vivo (recalcularCargasDivisoes) sem reordenar os cards —
  // pra não saltar a posição enquanto o personal ainda está ajustando — então
  // o selo "EQUILIBRADO" precisa ser recalculado à parte, sempre no card que
  // de fato tem o menor desvio no momento, mesmo que não seja mais o primeiro.
  let idxEquilibrado = 0;
  opcoes.forEach((op, i) => { if((op.desvio||0) < (opcoes[idxEquilibrado].desvio||0)) idxEquilibrado = i; });

  opcoes.forEach((op, i) => {
    const sel     = (i === _s3.divisaoIdx);
    const numDias = parseInt(val('pr-frequencia')||'3') || 3;
    const divisao = DIVISOES_TEMPLATES[op.chave] || DIVISOES[numDias];
    const maxC    = Math.max(...op.cargasSessao, 1);
    const lim     = _s3.limSessao || calcLimSessaoRecomendado();

    // Grupos activos neste modelo
    const freqNoModelo = {};
    divisao.default.forEach(s => s.forEach(({g}) => { freqNoModelo[g] = (freqNoModelo[g]||0)+1; }));

    // Badge compatibilidade
    const gruposOff = GRUPOS_MAPA.map(({id}) => id).filter(g => g in freqNoModelo && _s3.volPorGrupo[g]?.ativo === false);

    // ── Card ────────────────────────────────────────────────────────────────
    const card = document.createElement('div');
    card.className = 'dv-card' + (sel ? ' sel' : '');
    card.style.cssText =
      'border-radius:8px;border:2px solid ' + (sel ? 'var(--accent)' : 'var(--border)') +
      ';background:var(--bg3);overflow:hidden;margin-bottom:8px';

    // Header (clique = seleciona)
    const header = document.createElement('div');
    header.className = 'dv-h';
    header.style.cssText =
      'display:flex;align-items:center;gap:8px;padding:10px 14px;cursor:pointer;' +
      'background:' + (sel ? 'var(--accent-dim)' : 'var(--bg4)');

    const radioEl = document.createElement('div');
    radioEl.style.cssText =
      'width:16px;height:16px;border-radius:50%;flex-shrink:0;' +
      'border:2px solid ' + (sel ? 'var(--accent)' : 'var(--text3)') +
      ';background:' + (sel ? 'var(--accent)' : 'transparent') +
      ';display:flex;align-items:center;justify-content:center';
    if(sel) radioEl.innerHTML = '<div style="width:6px;height:6px;border-radius:50%;background:var(--bg)"></div>';

    const infoEl = document.createElement('div');
    infoEl.className = 'dv-info';
    infoEl.style.cssText = 'flex:1';
    infoEl.innerHTML =
      '<span style="font-size:13px;font-weight:700;color:' + (sel ? 'var(--accent)' : 'var(--text)') + '">' + op.nome + '</span>' +
      '<span style="font-size:12px;color:var(--text3);margin-left:8px">média ' + op.media + 's/sessão · desvio ±' + op.desvio + 's</span>' +
      (gruposOff.length ? '<div style="margin-top:3px;font-size:12px;color:var(--amber)"><i class=ph-warning></i> Parcial: ' + gruposOff.map(g=>LABEL[g]||g).join(', ') + ' OFF</div>' : '');

    const badgeEl = document.createElement('div');
    if(i===idxEquilibrado) badgeEl.innerHTML = '<span style="font-size:12px;color:var(--accent);background:var(--accent-dim);padding:2px 7px;border-radius:6px;border:1px solid rgba(0,229,160,.3);font-weight:700">↑ EQUILIBRADO</span>';

    // Edit button for each divisão card — abre o formulário completo da biblioteca
    // (objetivo, nível, bloqueios, critérios). Pensado pra CATALOGAR um modelo formal.
    const editBtn = document.createElement('button');
    editBtn.className='btn btn-ghost btn-sm';
    editBtn.style.cssText='font-size:12px;padding:3px 8px;flex-shrink:0';
    editBtn.innerHTML='<i class=ph-pencil-simple></i>';
    editBtn.setAttribute('aria-label','Editar critérios desta divisão');
    editBtn.title='Editar critérios desta divisão (formulário completo da biblioteca)';
    editBtn.addEventListener('click', function(e){
      e.stopPropagation();
      const op = _s3.divisaoOpcoes[i];
      if(op) abrirEditarDivisaoStep2(op.chave);
    });

    // Botão "Ajustar sessões" — editor leve (dc*): reordenar/mover grupo direto no
    // acordeão, sem formulário, sem salvar nada por padrão. Ver dcToggleEdicao().
    const dcBtn = document.createElement('button');
    dcBtn.className='btn btn-ghost btn-sm';
    dcBtn.style.cssText='font-size:12px;padding:3px 8px;flex-shrink:0';
    const dcAtivo = _s3._dcEditando === i;
    dcBtn.textContent = dcAtivo ? '✓ Concluir ajuste' : 'Ajustar sessões';
    dcBtn.title = 'Reordenar ou mover grupos entre sessões — ajuste rápido, não salva modelo';
    if(dcAtivo) dcBtn.style.cssText += ';background:var(--accent-dim);color:var(--accent);border-color:var(--accent)';
    dcBtn.addEventListener('click', function(e){
      e.stopPropagation();
      dcToggleEdicao(i);
    });

    header.appendChild(radioEl); header.appendChild(infoEl); header.appendChild(badgeEl); header.appendChild(dcBtn); header.appendChild(editBtn);
    // Excluir — só pra modelos que o personal pode de fato descartar: um modelo
    // salvo na biblioteca (op._libId) ou uma "Divisão rápida" nunca salva
    // (chave 'rapida-...'). Modelos padrão do sistema (PPL, Upper/Lower etc.,
    // vêm do "mapa" fixo em getDivisoesDisponiveis) nunca têm esse botão.
    if(podeExcluirDivisaoOpcao(op)){
      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-ghost btn-sm';
      delBtn.style.cssText = 'font-size:12px;padding:3px 8px;flex-shrink:0;color:var(--red)';
      delBtn.innerHTML = '<i class=ph-trash></i>';
      delBtn.setAttribute('aria-label','Excluir esta divisão');
      delBtn.title = op._libId != null ? 'Excluir este modelo da biblioteca' : 'Excluir esta divisão rápida (não salva)';
      delBtn.addEventListener('click', function(e){
        e.stopPropagation();
        excluirDivisaoOpcaoStep2(i);
      });
      header.appendChild(delBtn);
    }
    header.dataset.idx = i;
    header.addEventListener('click', function(){
      _s3.divisaoIdx = parseInt(this.dataset.idx);
      const opSel = _s3.divisaoOpcoes[_s3.divisaoIdx];
      const divisaoSel = opSel && DIVISOES_TEMPLATES[opSel.chave];
      if(divisaoSel && !divisaoSel._naoCalculada){
        sincronizarFreqGrupos(); // limpa grupos inativos fantasmas antes de congelar
        dcCongelarValoresAtuais(divisaoSel);
      } else {
        sincronizarFreqGrupos();
      }
      renderTelaDivisao();
    });

    // Mini barras de carga + tempo estimado por sessão
    const minibars = document.createElement('div');
    minibars.className = 'dv-mini';
    minibars.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;padding:6px 14px 8px;background:var(--bg3)';
    const objAtual = selectedObj || val('pr-objetivo') || 'Saude';
    op.cargasSessao.forEach((c, ti) => {
      const letra = String.fromCharCode(65+ti);
      const pct   = Math.round((c/maxC)*100);

      // Tempo estimado para esta sessão específica (Momento 1 — antes de sortear exercícios).
      // Usa os grupos/volume reais calculados pra esta sessão, não uma estimativa geral.
      const sessaoGT = (divisao.default||[])[ti] || [];
      const calcT = calcSeriesSessaoExibida(sessaoGT, lim, divisao, ti);
      const gpT   = calcT.grupos.map(({g,exAlvo,serEx})=>({grupo:g,nExercicios:exAlvo,nSeries:serEx}));
      const tpT   = estimarTempoModeloSessao(gpT, objAtual);
      const tMin  = Math.round(tpT.min/60), tMax = Math.round(tpT.max/60);
      const tLabel = tMin > 0 ? `${tMin}–${tMax}min` : '';

      const d = document.createElement('div');
      d.className = 'dv-sess';
      d.style.cssText = 'display:flex;align-items:center;gap:5px';
      d.innerHTML =
        '<span style="font-variant-numeric:tabular-nums;font-size:12px;font-weight:700;color:var(--text);min-width:14px">' + letra + '</span>' +
        '<div class="dv-bar" style="width:60px;height:5px;background:var(--bg2);border-radius:6px;overflow:hidden">' +
          '<div style="width:' + pct + '%;height:100%;background:' + (sel?'var(--accent)':'var(--text3)') + ';border-radius:6px"></div>' +
        '</div>' +
        '<span style="font-variant-numeric:tabular-nums;font-size:12px;color:var(--text2)">' + c + 's</span>' +
        (tLabel ? '<span style="font-variant-numeric:tabular-nums;font-size:12px;color:var(--text3);margin-left:2px"><i class=ph-timer></i>' + tLabel + '</span>' : '');
      minibars.appendChild(d);
    });

    // Accordion toggle — o estado aberto/fechado de cada card é guardado em
    // _s3._divExpandido (por índice), não só em memória do DOM: sem isso, o
    // card fechava sozinho toda vez que renderTelaDivisao() re-renderizava
    // (ex: ajustar o volume, selecionar outro card) porque o estado inicial
    // era decidido só por dcAtivo. Guardando à parte, vários cards podem
    // ficar abertos ao mesmo tempo pra comparação, e o botão realmente fecha.
    if(!_s3._divExpandido) _s3._divExpandido = {};
    const expandido = dcAtivo || !!_s3._divExpandido[i];
    const accToggle = document.createElement('div');
    accToggle.style.cssText = 'border-top:1px solid var(--border)';
    const btnExpand = document.createElement('button');
    btnExpand.dataset.accIdx = i;
    btnExpand.style.cssText =
      'width:100%;padding:7px 14px;background:transparent;border:none;cursor:pointer;' +
      'text-align:left;display:flex;align-items:center;gap:6px;font-size:12px;' +
      'font-variant-numeric:tabular-nums;color:var(--text3);font-weight:600';
    btnExpand.innerHTML = '<span id="acc-arrow-' + i + '" style="display:inline-flex">' + (expandido ? '<i class=ph-caret-down></i>' : '<i class=ph-caret-right></i>') + '</span> '
      + (expandido ? 'OCULTAR DISTRIBUIÇÃO DOS TREINOS' : 'VER DISTRIBUIÇÃO DOS TREINOS');
    btnExpand.addEventListener('click', function(e){
      e.stopPropagation();
      const idx = parseInt(this.dataset.accIdx);
      const body  = $('acc-body-' + idx);
      const arrow = $('acc-arrow-' + idx);
      const open  = body.style.display !== 'none';
      const novoAberto = !open;
      _s3._divExpandido[idx] = novoAberto;
      body.style.display = novoAberto ? 'block' : 'none';
      arrow.innerHTML = novoAberto ? '<i class=ph-caret-down></i>' : '<i class=ph-caret-right></i>';
      this.lastChild.textContent = ' ' + (novoAberto ? 'OCULTAR DISTRIBUIÇÃO DOS TREINOS' : 'VER DISTRIBUIÇÃO DOS TREINOS');
    });
    accToggle.appendChild(btnExpand);

    // Accordion body
    const accBody = document.createElement('div');
    accBody.id = 'acc-body-' + i;
    accBody.style.cssText = 'display:' + (expandido ? 'block' : 'none') + ';padding:10px 12px;background:var(--bg4);border-top:1px solid var(--border)';

    // ── Resumo semanal: soma de todas as sessões ────────────────────────────
    const volAtualPorGrupo = {};
    divisao.default.forEach((sessaoGrupos, tiResumo) => {
      const calc = calcSeriesSessaoExibida(sessaoGrupos, lim, divisao, tiResumo);
      calc.grupos.forEach(({g, exAlvo, serEx: sExT}) => {
        if(!volAtualPorGrupo[g]) volAtualPorGrupo[g] = {exSemana:0, serSemana:0};
        volAtualPorGrupo[g].exSemana  += exAlvo;
        volAtualPorGrupo[g].serSemana += exAlvo * sExT;
      });
    });

    const semResumo = document.createElement('div');
    semResumo.style.cssText = 'margin-bottom:10px';
    const semTitle = document.createElement('div');
    semTitle.style.cssText = 'font-size:12px;font-weight:700;color:var(--text2);font-variant-numeric:tabular-nums;margin-bottom:6px;';
    semTitle.textContent = 'Volume Semanal';
    semResumo.appendChild(semTitle);

    const semGrid = document.createElement('div');
    semGrid.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px';
    GRUPOS_MAPA.forEach(({id: g}) => {
      if(!(g in freqNoModelo)) return;
      const vg = _s3.volPorGrupo[g]; if(!vg||vg.ativo===false) return;
      const freq_g = freqNoModelo[g]||1;
      const serEx  = vg.serEx || _s3.seriesPorEx;
      const semMinAdj = freq_g>1&&(vg.semMin||0)%2!==0 ? (vg.semMin||0)+1 : (vg.semMin||0);
      const semMaxAdj = freq_g>1&&(vg.semMax||0)%2!==0 ? (vg.semMax||0)+1 : (vg.semMax||0);
      const atual = volAtualPorGrupo[g]||{serSemana:0};
      const ser   = atual.serSemana;
      const cor   = ser < semMinAdj-1 ? 'var(--red)' : ser > semMaxAdj+1 ? 'var(--amber)' : 'var(--accent)';

      const chip = document.createElement('div');
      chip.id = 'chip-sem-' + i + '-' + g;
      chip.style.cssText =
        'padding:6px 10px;background:var(--bg3);border:1px solid var(--border);' +
        'border-radius:6px;border-top:1px solid ' + cor + ';min-width:72px';
      chip.innerHTML =
        '<div style="font-size:12px;font-weight:700;color:var(--text)">' + (LABEL[g]||g) + '</div>' +
        '<div style="font-size:12px;color:var(--text2);font-variant-numeric:tabular-nums;">' + semMinAdj + '–' + semMaxAdj + 's</div>' +
        '<div data-val style="font-size:14px;font-weight:700;color:' + cor + ';font-variant-numeric:tabular-nums;">' + ser + 's</div>';
      semGrid.appendChild(chip);
    });
    semResumo.appendChild(semGrid);
    accBody.appendChild(semResumo);

    // ── Editor leve (dc*): aviso de cobertura ao vivo + ação salvar como modelo ──
    if(dcAtivo){
      const { ausentes, extras } = dcVerificarCobertura(i);
      if(ausentes.length){
        const avisoAusentes = document.createElement('div');
        avisoAusentes.style.cssText =
          'margin-bottom:8px;padding:8px 10px;border-radius:6px;border:1px solid var(--amber);' +
          'background:var(--amber-dim)';
        const titAus = document.createElement('div');
        titAus.style.cssText = 'font-size:12px;color:var(--amber);margin-bottom:6px';
        titAus.textContent = 'Selecionados na tela de Volume mas AUSENTES desta divisão — escolha uma sessão e insira:';
        avisoAusentes.appendChild(titAus);
        const listaAus = document.createElement('div');
        listaAus.style.cssText = 'display:flex;flex-direction:column;gap:4px';
        ausentes.forEach(g => {
          const linha = document.createElement('div');
          linha.style.cssText = 'display:flex;align-items:center;gap:6px';
          const nomeSpan = document.createElement('span');
          nomeSpan.style.cssText = 'font-size:12px;font-weight:600;color:var(--text);min-width:90px';
          nomeSpan.textContent = LABEL[g]||g;
          const selSessao = document.createElement('select');
          selSessao.style.cssText = 'font-size:12px;padding:2px 4px;border:1px solid var(--border);border-radius:6px;background:var(--bg2);color:var(--text2)';
          divisao.default.forEach((_, tiOpt) => {
            const opt = document.createElement('option');
            opt.value = tiOpt;
            opt.textContent = (divisao.label[tiOpt]||'Treino '+String.fromCharCode(65+tiOpt));
            selSessao.appendChild(opt);
          });
          const btnInserir = document.createElement('button');
          btnInserir.className = 'btn btn-ghost btn-sm';
          btnInserir.style.cssText = 'font-size:12px;padding:2px 8px';
          btnInserir.textContent = '+ Inserir';
          btnInserir.addEventListener('click', function(e){
            e.stopPropagation();
            dcAdicionarGrupo(i, parseInt(selSessao.value), g);
          });
          linha.appendChild(nomeSpan); linha.appendChild(selSessao); linha.appendChild(btnInserir);
          listaAus.appendChild(linha);
        });
        avisoAusentes.appendChild(listaAus);
        accBody.appendChild(avisoAusentes);
      }
      if(extras.length){
        const avisoExtras = document.createElement('div');
        avisoExtras.style.cssText =
          'margin-bottom:8px;padding:6px 10px;border-radius:6px;border:1px solid var(--amber);' +
          'background:var(--amber-dim);font-size:12px;color:var(--amber)';
        avisoExtras.textContent = '· Presentes nesta divisão mas desligados na tela de Volume: ' + extras.map(g=>LABEL[g]||g).join(', ') + '.';
        accBody.appendChild(avisoExtras);
      }
      if(!ausentes.length && !extras.length){
        const okCobertura = document.createElement('div');
        okCobertura.style.cssText =
          'margin-bottom:10px;padding:6px 10px;border-radius:6px;border:1px solid var(--accent);' +
          'background:var(--accent-dim);font-size:12px;color:var(--accent)';
        okCobertura.textContent = '✓ Todos os grupos selecionados estão cobertos por esta divisão.';
        accBody.appendChild(okCobertura);
      }

      const dcAcoes = document.createElement('div');
      dcAcoes.style.cssText = 'display:flex;gap:8px;margin-bottom:10px';
      const btnRecalcular = document.createElement('button');
      btnRecalcular.className = 'btn btn-ghost btn-sm';
      btnRecalcular.innerHTML = '<i class=ph-arrow-counter-clockwise></i> Recalcular volume';
      btnRecalcular.title = 'Descarta ajustes manuais de exercício/série e recalcula tudo automaticamente pelas regras de prioridade e limite';
      btnRecalcular.addEventListener('click', function(e){ e.stopPropagation(); dcRecalcularVolume(i); });
      const btnSalvarModelo = document.createElement('button');
      btnSalvarModelo.className = 'btn btn-ghost btn-sm';
      btnSalvarModelo.textContent = 'Salvar como modelo';
      btnSalvarModelo.title = 'Abre o formulário completo pra catalogar este ajuste como modelo reutilizável';
      btnSalvarModelo.addEventListener('click', function(e){ e.stopPropagation(); dcSalvarComoModelo(i); });
      dcAcoes.appendChild(btnRecalcular);
      dcAcoes.appendChild(btnSalvarModelo);
      accBody.appendChild(dcAcoes);
    }

    // ── Treinos ─────────────────────────────────────────────────────────────
    divisao.default.forEach((sessaoGrupos, ti) => {
      const letra    = String.fromCharCode(65+ti);
      const label_d  = (divisao.label[ti]||'Treino '+letra).replace(/^Treino [A-Z] — /,'');
      const calcSess = calcSeriesSessaoExibida(sessaoGrupos, lim, divisao, ti);
      const {totalAlvo, estourou, forcouAbaixoDoMinimo, pct: pctLim} = calcSess;
      const corLim   = estourou ? 'var(--red)' : pctLim>=90 ? 'var(--amber)' : 'var(--accent)';
      const diffMsg  = estourou ? '+' + (totalAlvo-lim) + 's' : totalAlvo + '/' + lim + 's';

      const treinoDiv = document.createElement('div');
      treinoDiv.style.cssText =
        'margin-bottom:8px;border-radius:6px;border:1px solid ' +
        (estourou ? 'var(--red)' : 'var(--border)') +
        ';overflow:hidden;background:var(--bg3)';

      // Header do treino — inclui barra de limite
      const thd = document.createElement('div');
      thd.style.cssText =
        'display:flex;align-items:center;gap:8px;padding:6px 12px;' +
        'background:' + (estourou ? 'rgba(255,77,106,.08)' : 'var(--bg4)') +
        ';border-bottom:1px solid var(--border)';
      thd.innerHTML =
        '<span style="font-variant-numeric:tabular-nums;font-size:13px;font-weight:800;color:var(--accent);min-width:18px">' + letra + '</span>' +
        '<span style="font-size:12px;font-weight:600;color:var(--text);flex:1">' + label_d + '</span>' +
        // Limite
        '<span style="font-size:12px;color:var(--text3);font-variant-numeric:tabular-nums;margin-right:4px">Limite ' + lim + 's:</span>' +
        '<div style="width:80px;height:5px;background:var(--bg2);border-radius:6px;overflow:hidden;margin-right:4px">' +
          '<div id="lim-bar-fill-' + i + '-' + ti + '" style="width:' + Math.min(100,pctLim) + '%;height:100%;background:' + corLim + ';border-radius:6px"></div>' +
        '</div>' +
        '<span id="lim-bar-label-' + i + '-' + ti + '" style="font-variant-numeric:tabular-nums;font-size:12px;font-weight:700;color:' + corLim + ';min-width:60px;text-align:right">' +
          (estourou ? '<i class=ph-warning></i> ' : '') + diffMsg + ' (' + pctLim + '%)' +
        '</span>';

      // Aviso: volume mínimo definido não cabe no limite de séries/sessão
      if(forcouAbaixoDoMinimo && !estourou){
        const avisoMin = document.createElement('div');
        avisoMin.style.cssText =
          'padding:5px 12px;background:var(--amber-dim);border-bottom:1px solid var(--border);' +
          'font-size:12px;color:var(--amber)';
        avisoMin.textContent = 'O volume mínimo definido não cabe no limite de séries/sessão — alguns grupos foram reduzidos abaixo do mínimo (ou removidos desta sessão) para respeitar o limite.';
        treinoDiv.appendChild(thd);
        treinoDiv.appendChild(avisoMin);
      } else {
        treinoDiv.appendChild(thd);
      }

      // Linhas de grupo
      const tbody = document.createElement('div');
      tbody.style.cssText = 'padding:2px 0';

      calcSess.grupos.forEach(({g, exAlvo, exMin, exMax, serEx: sEx,
          serSessao, serSemana, exSemana, serMinSem, serMaxSem, freq: fq}, gi) => {
        const vg    = _s3.volPorGrupo[g]; if(!vg||vg.ativo===false) return;
        // RÉGUA B — aqui a pergunta é "esta divisão entrega o que eu escolhi?",
        // então as zonas são o alvo do personal (semMin–semMax), não MEV/MAV/MRV:
        // o limite fisiológico já foi julgado na tela de Volume, quando o alvo
        // foi definido. O valor plotado é o total SEMANAL do grupo nesta divisão
        // (soma de todas as sessões) — comparar o volume de UMA sessão contra
        // uma referência semanal seria comparar coisas diferentes.
        const alvoMin = vg.semMin || 0;
        const alvoMax = vg.semMax || 0;
        const semanaG = (volAtualPorGrupo[g] || {}).serSemana || 0;
        const faixaG  = classificarVolumeAlvo(semanaG, alvoMin, alvoMax, true);
        const cor     = VOL_ALVO_FAIXAS[faixaG].cor;
        const rowBg   = gi%2===0 ? 'var(--bg3)' : 'var(--bg4)';

        const row = document.createElement('div');
        row.style.cssText =
          'display:flex;align-items:center;gap:8px;padding:7px 12px;' +
          'background:' + rowBg + ';border-bottom:1px solid var(--border)';

        // Dot cor
        const dot = document.createElement('div');
        dot.id = 'vdot-' + i + '-' + ti + '-' + g;
        dot.style.cssText = 'width:10px;height:10px;border-radius:6px;flex-shrink:0;background:' + cor;

        // Nome
        const nome = document.createElement('span');
        nome.style.cssText = 'font-size:12px;font-weight:600;color:var(--text);min-width:88px;flex-shrink:0';
        nome.textContent = LABEL[g]||g;

        // Barra "chegamos ao alvo?" — régua B, traço na posição do volume semanal
        const barWrap = document.createElement('div');
        barWrap.id = 'vbar-' + i + '-' + ti + '-' + g;
        barWrap.style.cssText = 'flex:1;min-width:88px';
        barWrap.title = 'Semana: ' + semanaG + 's · escolhido: ' + alvoMin + '–' + alvoMax +
                        's · esta sessão: ' + (serSessao||0) + 's — ' + VOL_ALVO_FAIXAS[faixaG].label;
        barWrap.innerHTML =
          barraVolumeAlvoHTML(volMarcadorHTML(posVolReguaB(semanaG, alvoMin, alvoMax), cor), 10) +
          escalaVolumeHTML([alvoMin, alvoMax], VOL_RB_X);

        // Controles: ex − [n] + × ser − [s] + = total
        const ctrl = document.createElement('div');
        ctrl.style.cssText = 'display:flex;align-items:center;gap:4px;flex-shrink:0';

        function mkBtn(txt, ds){
          const b = document.createElement('button');
          b.textContent = txt;
          Object.assign(b.dataset, ds);
          b.style.cssText =
            'width:20px;height:22px;background:var(--bg2);border:1px solid var(--border);' +
            'color:var(--text2);font-size:13px;cursor:pointer;line-height:1;padding:0;border-radius:' +
            (txt==='−' ? '4px 0 0 4px' : '0 4px 4px 0');
          b.addEventListener('click', function(){ stepGrupoSessao(this); });
          return b;
        }
        function mkInp(val, id, field, w){
          const inp = document.createElement('input');
          inp.type='number'; inp.value=val; inp.id=id; inp.min=1; inp.max=20;
          inp.dataset.g=g; inp.dataset.ti=ti; inp.dataset.field=field; inp.dataset.cardIdx=i;
          inp.style.cssText =
            'width:3.2em;background:var(--bg4);border-top:1px solid var(--border);' +
            'border-bottom:1px solid var(--border);border-left:none;border-right:none;' +
            'padding:2px 3px;color:var(--text);font-variant-numeric:tabular-nums;font-size:12px;' +
            'text-align:center;outline:none';
          inp.addEventListener('input', function(){ atualizarTotalSessao(this); });
          return inp;
        }

        const idEx  = 'iex-'  + i + '-' + ti + '-' + g;
        const idSer = 'iser-' + i + '-' + ti + '-' + g;
        const idTot = 'itot-' + i + '-' + ti + '-' + g;

        // Aplicar overrides salvos pelo usuário (prioridade sobre cálculo)
        const _ovKey = String(ti) + '-' + g;
        const _ov   = (_s3._sessionOverrides||{})[_ovKey];
        const exVal  = _ov ? _ov.numEx : exAlvo;
        const serVal = _ov ? _ov.serEx : sEx;

        ctrl.appendChild(mkBtn('−', {g, ti, field:'ex', pair: idEx}));
        ctrl.appendChild(mkInp(exVal, idEx, 'ex'));
        ctrl.appendChild(mkBtn('+', {g, ti, field:'ex', pair: idEx}));

        const x = document.createElement('span');
        x.style.cssText = 'font-size:12px;color:var(--text3);margin:0 2px';
        x.textContent = '×';
        ctrl.appendChild(x);

        ctrl.appendChild(mkBtn('−', {g, ti, field:'ser', pair: idSer}));
        ctrl.appendChild(mkInp(serVal, idSer, 'ser'));
        ctrl.appendChild(mkBtn('+', {g, ti, field:'ser', pair: idSer}));

        const eq = document.createElement('span');
        eq.id = idTot;
        eq.style.cssText = 'font-variant-numeric:tabular-nums;font-size:12px;font-weight:700;color:var(--text);min-width:48px;text-align:right';
        eq.textContent = '= ' + (_ov ? _ov.serSessao : serSessao) + 's';
        ctrl.appendChild(eq);

        row.appendChild(dot); row.appendChild(nome); row.appendChild(barWrap); row.appendChild(ctrl);

        // ── Controles do editor leve (dc*): reordenar dentro da sessão + mover entre sessões ──
        if(dcAtivo){
          const dcCtrl = document.createElement('div');
          dcCtrl.style.cssText = 'display:flex;align-items:center;gap:3px;flex-shrink:0;margin-left:6px;padding-left:6px;border-left:1px solid var(--border)';

          const posIdx = sessaoGrupos.findIndex(x => x.g === g);
          const btnUp = document.createElement('button');
          btnUp.innerHTML = '<i class=ph-arrow-up></i>';
          btnUp.title = 'Subir prioridade nesta sessão (protege contra corte de limite)';
          btnUp.disabled = posIdx <= 0;
          btnUp.style.cssText = 'width:20px;height:20px;font-size:12px;line-height:1;padding:0;cursor:pointer;background:var(--bg2);border:1px solid var(--border);border-radius:6px;color:var(--text2);opacity:' + (posIdx<=0?'.35':'1');
          btnUp.addEventListener('click', function(e){ e.stopPropagation(); dcReordenarGrupo(i, ti, g, -1); });

          const btnDown = document.createElement('button');
          btnDown.innerHTML = '<i class=ph-arrow-down></i>';
          btnDown.title = 'Baixar prioridade nesta sessão';
          btnDown.disabled = posIdx >= sessaoGrupos.length - 1;
          btnDown.style.cssText = 'width:20px;height:20px;font-size:12px;line-height:1;padding:0;cursor:pointer;background:var(--bg2);border:1px solid var(--border);border-radius:6px;color:var(--text2);opacity:' + (posIdx>=sessaoGrupos.length-1?'.35':'1');
          btnDown.addEventListener('click', function(e){ e.stopPropagation(); dcReordenarGrupo(i, ti, g, 1); });

          const posLabel = document.createElement('span');
          posLabel.style.cssText = 'font-variant-numeric:tabular-nums;font-size:12px;color:var(--text3);min-width:16px;text-align:center';
          posLabel.textContent = '#' + (posIdx+1);

          const selMover = document.createElement('select');
          selMover.style.cssText = 'font-size:12px;padding:2px 3px;border:1px solid var(--border);border-radius:6px;background:var(--bg2);color:var(--text2);max-width:90px';
          const optPlaceholder = document.createElement('option');
          optPlaceholder.value = ''; optPlaceholder.textContent = '→ mover p/...';
          selMover.appendChild(optPlaceholder);
          divisao.default.forEach((_, tiOutro) => {
            if(tiOutro === ti) return;
            const opt = document.createElement('option');
            opt.value = tiOutro;
            opt.textContent = (divisao.label[tiOutro]||'Treino '+String.fromCharCode(65+tiOutro)).replace(/^Treino /,'');
            selMover.appendChild(opt);
          });
          selMover.addEventListener('click', function(e){ e.stopPropagation(); });
          selMover.addEventListener('change', function(e){
            e.stopPropagation();
            if(this.value !== '') dcMoverGrupo(i, ti, g, this.value);
          });

          const btnRemover = document.createElement('button');
          btnRemover.innerHTML = '<i class=ph-x></i>';
          btnRemover.title = 'Remover este grupo desta sessão';
          btnRemover.style.cssText = 'width:20px;height:20px;font-size:12px;line-height:1;padding:0;cursor:pointer;background:var(--bg2);border:1px solid var(--border);border-radius:6px;color:var(--red)';
          btnRemover.addEventListener('click', function(e){ e.stopPropagation(); dcRemoverGrupo(i, ti, g); });

          dcCtrl.appendChild(btnUp); dcCtrl.appendChild(posLabel); dcCtrl.appendChild(btnDown); dcCtrl.appendChild(selMover); dcCtrl.appendChild(btnRemover);
          row.appendChild(dcCtrl);
        }

        tbody.appendChild(row);
      });

      // Adicionar grupo a esta sessão (editor leve) — permite repetir um grupo já
      // presente em outra sessão (ex: Peitoral em A e também em C = 2x/semana).
      if(dcAtivo){
        const addRow = document.createElement('div');
        addRow.style.cssText = 'display:flex;align-items:center;gap:6px;padding:6px 12px;background:var(--bg4)';
        const selAdd = document.createElement('select');
        selAdd.style.cssText = 'flex:1;max-width:200px;font-size:12px;padding:3px 6px;border:1px solid var(--border);border-radius:6px;background:var(--bg2);color:var(--text2)';
        const optPh = document.createElement('option');
        optPh.value=''; optPh.textContent='+ adicionar grupo a esta sessão...';
        selAdd.appendChild(optPh);
        GRUPOS_MAPA.forEach(({id,label:lbl}) => {
          const jaNaSessao = sessaoGrupos.some(x=>x.g===id);
          const semExG     = _s3.volPorGrupo[id]?._semEx === true;
          const opt = document.createElement('option');
          opt.value = id;
          opt.textContent = lbl + (semExG ? ' (sem exercício no nível/local)' : jaNaSessao ? ' (já nesta sessão)' : '');
          opt.disabled = jaNaSessao || semExG;
          selAdd.appendChild(opt);
        });
        selAdd.addEventListener('click', function(e){ e.stopPropagation(); });
        selAdd.addEventListener('change', function(e){
          e.stopPropagation();
          if(this.value !== '') dcAdicionarGrupo(i, ti, this.value);
        });
        addRow.appendChild(selAdd);
        tbody.appendChild(addRow);
      }

      treinoDiv.appendChild(tbody);
      accBody.appendChild(treinoDiv);
    });

    card.appendChild(header); card.appendChild(minibars);
    card.appendChild(accToggle); card.appendChild(accBody);
    cont.appendChild(card);
  });
  // Recalcular chip de volume semanal no card selecionado após render
  setTimeout(() => atualizarResumoSemanal(_s3.divisaoIdx), 0);
}

// ── Abrir modal-distrib a partir do step 2, PRÉ-PREENCHIDO com o perfil atual ──
// Importa nível/frequência/objetivo já selecionados na prescrição em curso, pra
// não obrigar o personal a redigitar o que já escolheu. Critérios clínicos,
// vantagens/desvantagens e referência ficam em branco — pra o personal refinar.
function abrirNovaDivisaoCompleta(){
  const s = getActive();
  const nivelCodigo = val('pr-nivel') || s?.anamnese?.nivel || '';
  const NIVEL_LONGO = {Inic:'Iniciante', Inte:'Intermediário', Avan:'Avançado'};
  const nivelLongo  = NIVEL_LONGO[nivelCodigo] || '';
  const freq        = val('pr-frequencia') || s?.anamnese?.frequencia || '3x';

  const draft = {
    id: '', nome: '',
    tipo_divisao: 'Full Body', freq, freq_musculo: '2x',
    ref: '',
    // Nível mínimo = nível atual do aluno (o modelo nasce pensado pra esse perfil,
    // mas o personal pode abrir o range depois); máximo fica livre.
    nivel_min: nivelLongo, nivel_max: '',
    objetivos_compativeis: selectedObj ? [selectedObj] : [],
    freq_compativeis: [freq],
    bloq_nivel: [], bloq_cond: [], bloq_obj: [],
    dias: [], uso_itens: [], contra_itens: [], vant: '', desv: '',
  };
  preencherModalDistrib(draft);
  $('modal-distrib').classList.remove('hidden');
  _pendingDivisaoCallback = true;
}

// ── Divisão rápida (ephemeral): N sessões vazias, sem critérios, sem salvar nada.
// O personal distribui os grupos manualmente usando os controles do editor leve
// (dc*) — reorder/mover/adicionar/remover — que já entram ativados. Se quiser
// guardar o resultado, o botão "💾 Salvar como modelo" (já presente no editor
// leve) abre abrirNovaDivisaoCompleta-equivalente via dcSalvarComoModelo,
// pré-preenchido com o que foi montado aqui.
function abrirNovaDivisaoRapida(){
  const s       = getActive(); if(!s) return;
  const freq    = val('pr-frequencia') || s.anamnese?.frequencia || '3x';
  const numDias = parseInt(freq) || 3;

  const chave = 'rapida-' + Date.now();
  DIVISOES_TEMPLATES[chave] = {
    default: Array.from({length: numDias}, () => []),
    label:   Array.from({length: numDias}, (_, ti) => 'Treino ' + String.fromCharCode(65+ti)),
    // Divisão criada do zero — fica com exercício/série zerados (mesmo depois
    // de adicionar grupos) até o personal clicar "Recalcular volume". Diferente
    // de ajustar um modelo existente, que mantém os números calculados como
    // estavam durante qualquer mover/reordenar/add/remover.
    _naoCalculada: true,
  };

  if(!_s3.divisaoOpcoes) _s3.divisaoOpcoes = [];
  const novoOp = {
    nome: 'Divisão rápida (não salva)',
    treinos: DIVISOES_TEMPLATES[chave].label.slice(),
    chave,
    cargasSessao: new Array(numDias).fill(0),
    media: 0, desvio: 0,
  };
  _s3.divisaoOpcoes.push(novoOp);
  const novoIdx = _s3.divisaoOpcoes.length - 1;
  _s3.divisaoIdx = novoIdx;
  _s3._dcEditando = novoIdx; // entra direto no editor leve, sessões vazias prontas pra distribuir

  renderTelaDivisao();
}

function abrirEditarDivisaoStep2(chave){
  // chave é o id da divisão em LIBS.distribuicao ou em DIVISOES_TEMPLATES
  // Tenta encontrar em LIBS
  const d = LIBS.distribuicao.find(x=> String(x.id)===String(chave) || x.nome===chave);
  if(d){
    preencherModalDistrib(d);
    $('modal-distrib').classList.remove('hidden');
    _pendingDivisaoCallback = true;
  } else {
    alert('Esta é uma divisão do sistema — use a aba Distribuição para editá-la.');
  }
}

let _pendingDivisaoCallback = false;

function stepGrupoSessao(btn){
  const id  = btn.dataset.pair;
  const inp = $(id); if(!inp) return;
  const delta = btn.textContent === '−' ? -1 : 1;
  const novo  = Math.max(1, (parseInt(inp.value)||1) + delta);
  inp.value = novo;
  atualizarTotalSessao(inp);
}

function atualizarTotalSessao(inp){
  const g       = inp.dataset.g;
  const ti      = String(inp.dataset.ti);
  // Usa o índice do CARD a que este input pertence (gravado no próprio input),
  // não _s3.divisaoIdx (que reflete qual card está "selecionado" no momento,
  // podendo ser outro card diferente do que o personal está de fato editando
  // dentro do acordeão aberto — bug real: editar a divisão rápida enquanto
  // outro card estava selecionado fazia a busca por id falhar silenciosamente,
  // deixando o "=Xs" e o override nunca atualizados, mesmo o input mudando).
  const cardIdx = inp.dataset.cardIdx !== undefined ? parseInt(inp.dataset.cardIdx) : _s3.divisaoIdx;
  const inpEx   = $('iex-'  + cardIdx + '-' + ti + '-' + g);
  const inpSer  = $('iser-' + cardIdx + '-' + ti + '-' + g);
  const totEl   = $('itot-' + cardIdx + '-' + ti + '-' + g);
  if(!inpEx || !inpSer || !totEl) return;

  const exV  = Math.max(1, parseInt(inpEx.value)  || 1);
  const serV = Math.max(1, parseInt(inpSer.value) || 1);
  const novoTot = exV * serV;
  totEl.textContent = '= ' + novoTot + 's';

  // ── Sync editado de volta para _s3 para que construirFichaModelo use os valores corretos
  // (mesmo que o accordion seja fechado e reaberto, os valores persistem)
  if(_s3.volPorGrupo[g]){
    // Salva o número de exercícios e séries por exercício editados pelo usuário
    _s3.volPorGrupo[g].serEx = serV;
    // Salva sessão por treino separadamente
    if(!_s3._sessionOverrides) _s3._sessionOverrides = {};
    const key = ti + '-' + g;
    _s3._sessionOverrides[key] = { numEx: exV, serEx: serV, serSessao: novoTot };
  }

  // Recalcula total da sessão somando todas as linhas do treino ti
  const lim = _s3.limSessao || calcLimSessaoRecomendado();
  let totalSessao = 0;
  // Percorre todos os grupos que têm inputs nesta sessão
  GRUPOS_MAPA.forEach(({id}) => {
    const iEx  = $('iex-'  + cardIdx + '-' + ti + '-' + id);
    const iSer = $('iser-' + cardIdx + '-' + ti + '-' + id);
    if(iEx && iSer){
      totalSessao += (parseInt(iEx.value)||1) * (parseInt(iSer.value)||1);
    }
  });

  // Atualiza barra e label do header da sessão
  const pct    = lim > 0 ? Math.min(120, Math.round((totalSessao/lim)*100)) : 0;
  const estouro = totalSessao > lim;
  const corLim = estouro ? 'var(--red)' : pct >= 90 ? 'var(--amber)' : 'var(--accent)';
  const diffMsg = estouro
    ? '<i class=ph-warning></i> ' + totalSessao + '/' + lim + 's (+' + (totalSessao-lim) + ')'
    : totalSessao + '/' + lim + 's (' + Math.min(100,pct) + '%)';

  // Barra: id="lim-bar-fill-{cardIdx}-{ti}"
  const barFill = $('lim-bar-fill-' + cardIdx + '-' + ti);
  const barLabel = $('lim-bar-label-' + cardIdx + '-' + ti);
  if(barFill){
    barFill.style.width      = Math.min(100,pct) + '%';
    barFill.style.background = corLim;
  }
  if(barLabel){
    barLabel.innerHTML = diffMsg;
    barLabel.style.color = corLim;
  }

  // Atualiza resumo semanal — recalcula chips
  atualizarResumoSemanal(cardIdx);
}

function atualizarResumoSemanal(cardIdx){
  // Soma todos os inputs visíveis para calcular volume semanal atual
  const op = _s3.divisaoOpcoes[cardIdx]; if(!op) return;
  const numDias = parseInt(val('pr-frequencia')||'3') || 3;
  const divisao = DIVISOES_TEMPLATES[op.chave] || DIVISOES[numDias];
  const LABEL = {}; GRUPOS_MAPA.forEach(({id,label}) => { LABEL[id]=label; });

  // Acumula volumes lendo os inputs do DOM
  const semAtual = {};
  divisao.default.forEach((sessaoGrupos, ti) => {
    sessaoGrupos.forEach(({g}) => {
      const iEx  = $('iex-'  + cardIdx + '-' + ti + '-' + g);
      const iSer = $('iser-' + cardIdx + '-' + ti + '-' + g);
      if(iEx && iSer){
        const ser = (parseInt(iEx.value)||1) * (parseInt(iSer.value)||1);
        semAtual[g] = (semAtual[g]||0) + ser;
      }
    });
  });

  // Atualiza chips
  Object.keys(semAtual).forEach(g => {
    const chip = $('chip-sem-' + cardIdx + '-' + g);
    if(!chip) return;
    const vg = _s3.volPorGrupo[g]; if(!vg) return;
    const freq_g = Math.max(1, vg.freq||1);
    const semMinAdj = freq_g>1 && (vg.semMin||0)%2!==0 ? (vg.semMin||0)+1 : (vg.semMin||0);
    const semMaxAdj = freq_g>1 && (vg.semMax||0)%2!==0 ? (vg.semMax||0)+1 : (vg.semMax||0);
    const ser = semAtual[g];
    const cor = ser < semMinAdj-1 ? 'var(--red)' : ser > semMaxAdj+1 ? 'var(--amber)' : 'var(--accent)';
    const valEl = chip.querySelector('[data-val]');
    if(valEl){ valEl.textContent = ser + 's'; valEl.style.color = cor; }
    chip.style.borderTopColor = cor;
  });

  // Atualiza a régua "chegamos ao alvo?" (e o dot de cor) de CADA linha onde o
  // grupo aparece — precisa varrer todas as sessões do grupo, não só a que foi
  // editada, porque a régua compara o volume SEMANAL (soma de todas as sessões
  // do grupo), igual ao chip. Antes desta função não tocava nessa barra: ela
  // ficava com a posição do primeiro render, congelada, mesmo o "= Xs" e os
  // chips do topo já tendo atualizado.
  divisao.default.forEach((sessaoGrupos, ti) => {
    sessaoGrupos.forEach(({g}) => {
      const vg = _s3.volPorGrupo[g]; if(!vg) return;
      const iEx  = $('iex-'  + cardIdx + '-' + ti + '-' + g);
      const iSer = $('iser-' + cardIdx + '-' + ti + '-' + g);
      if(!iEx || !iSer) return;
      const serSessaoAtual = (parseInt(iEx.value)||1) * (parseInt(iSer.value)||1);
      const alvoMin = vg.semMin || 0;
      const alvoMax = vg.semMax || 0;
      const semanaG = semAtual[g] || 0;
      const faixaG  = classificarVolumeAlvo(semanaG, alvoMin, alvoMax, true);
      const cor     = VOL_ALVO_FAIXAS[faixaG].cor;

      const barWrap = $('vbar-' + cardIdx + '-' + ti + '-' + g);
      if(barWrap){
        barWrap.title = 'Semana: ' + semanaG + 's · escolhido: ' + alvoMin + '–' + alvoMax +
                        's · esta sessão: ' + serSessaoAtual + 's — ' + VOL_ALVO_FAIXAS[faixaG].label;
        barWrap.innerHTML =
          barraVolumeAlvoHTML(volMarcadorHTML(posVolReguaB(semanaG, alvoMin, alvoMax), cor), 10) +
          escalaVolumeHTML([alvoMin, alvoMax], VOL_RB_X);
      }
      const dotEl = $('vdot-' + cardIdx + '-' + ti + '-' + g);
      if(dotEl) dotEl.style.background = cor;
    });
  });
}



function sincronizarFreqGrupos(){
  const op = _s3.divisaoOpcoes[_s3.divisaoIdx]; if(!op) return;
  const freq    = val('pr-frequencia') || '3x';
  const numDias = parseInt(freq) || 3;
  const divisao = DIVISOES_TEMPLATES[op.chave] || DIVISOES[numDias];

  // Salva cópia original das sessões na primeira chamada. Nas chamadas
  // seguintes, restaura in-place ANTES de aplicar o filtro de grupos inativos.
  // Isso garante que um grupo reativado (switch ligado de volta) volta a
  // aparecer na divisão — sem isso o splice() anterior era permanente e o
  // grupo ficava desaparecido para sempre até recarregar a página.
  // A restauração é in-place (limpa e repopula cada array existente) para
  // preservar as referências de objeto que calcSeriesSessaoComLimite usa
  // internamente via indexOf() — substituir os arrays quebraria o índice.
  if(!divisao._defaultOrig){
    divisao._defaultOrig = divisao.default.map(sessao => sessao.map(g => ({...g})));
  } else {
    divisao._defaultOrig.forEach((sessaoOrig, i) => {
      if(!divisao.default[i]) return;
      divisao.default[i].length = 0;
      sessaoOrig.forEach(g => divisao.default[i].push({...g}));
    });
  }

  // Remove fisicamente grupos INATIVOS (desligados na tela de Volume) das
  // sessões da divisão atual — sem isso, o grupo desativado continuava como
  // um item "fantasma" no array físico, nunca desenhado na tela mas ainda
  // ocupando uma posição real. Isso quebrava o zebrado (índice de exibição
  // desalinhado do índice real) e o reorder (subir/descer um grupo podia
  // trocar de posição com o fantasma sem nenhum efeito visual, exigindo um
  // clique extra pra de fato mover além dele, e arrastando o override errado
  // pra chave de sessão errada).
  divisao.default.forEach(sessao => {
    for(let i = sessao.length - 1; i >= 0; i--){
      const vg = _s3.volPorGrupo[sessao[i].g];
      if(!vg || vg.ativo === false) sessao.splice(i, 1);
    }
  });
  GRUPOS_MAPA.forEach(({id}) => { if(_s3.volPorGrupo[id]) _s3.volPorGrupo[id].freq = 0; });
  divisao.default.forEach(sessao => {
    sessao.forEach(({g}) => { if(_s3.volPorGrupo[g]) _s3.volPorGrupo[g].freq++; });
  });
}

// "← Distribuição" a partir do step 3 (Exercícios) — cruza de volta pro
// step 2, com Volume e Divisão (caixas empilhadas) visíveis de novo.
function voltarDivisao(){
  goStep(2, true);
  renderTabelaVolumeGlobal();
  renderTelaDivisao();
  show('s3-volume');
  show('s3-divisao');
  show('s3-vd-btnrow');
}

// Colapsa/expande a caixa de Volume por Grupo Muscular (a tabela + legenda) —
// os controles do cabeçalho (sér/exercício, reset) continuam sempre visíveis.
function toggleVolumeCaixa(){
  const body  = $('vol-collapse-body');
  const icone = $('vol-collapse-icone');
  if(!body) return;
  const aberto = body.style.display !== 'none';
  body.style.display = aberto ? 'none' : 'block';
  if(icone) icone.style.transform = aberto ? 'rotate(-90deg)' : 'rotate(0deg)';
}

// Colapsa/expande a caixa de Modelo de Divisão inteira (info + modelos
// disponíveis + cards) — mesmo padrão da caixa de Volume acima. O controle de
// Limite séries/sessão fica no cabeçalho, sempre visível mesmo recolhida.
function toggleDivisaoCaixa(){
  const body  = $('div-collapse-body');
  const icone = $('div-collapse-icone');
  if(!body) return;
  const aberto = body.style.display !== 'none';
  body.style.display = aberto ? 'none' : 'block';
  if(icone) icone.style.transform = aberto ? 'rotate(-90deg)' : 'rotate(0deg)';
}

// ══════════════════════════════════════════════════════════════════════════
// GUARDA DE EDIÇÃO NÃO SALVA — "⚙ Ajustar sessões" no Modelo de Divisão
// ══════════════════════════════════════════════════════════════════════════
// Um card ajustado em "⚙ Ajustar sessões" aponta seu op.chave pra um clone de
// trabalho (DIVISOES_TEMPLATES['edit-'+i], ver dcToggleEdicao) — isso só vira
// permanente se o personal usar "Salvar como modelo". Até lá, op._chaveOriginal
// fica marcado (é o rótulo de "existe ajuste não salvo aqui"); sair da tela,
// trocar de aba ou fechar o navegador sem isso descartava o ajuste em silêncio.

// Converte o id interno de grupo (GRUPOS_MAPA) pro nome usado no formulário de
// Nova Divisão / editor de biblioteca (GRUPOS_MUSCULARES, com acentos) — as
// duas listas de grupos do sistema não usam a mesma grafia.
const GRUPOMAPA_PARA_MUSCULAR_DISPLAY = {
  Peitoral:'Peitoral', Latissimo:'Latíssimo', Deltoide:'Deltóide', Triceps:'Tríceps',
  Biceps:'Bíceps', Quadriceps:'Quadríceps', Isquiossurais:'Isquiossurais', Gluteos:'Glúteos',
  Panturrilhas:'Panturrilhas', RetoAbdominal:'Reto Abdominal', Obliquo:'Oblíquo', Trapezio:'Trapézio',
};

function temEdicaoDivisaoNaoSalva(){
  return !!(typeof _s3!=='undefined' && _s3 && _s3.divisaoOpcoes && _s3.divisaoOpcoes.some(op => op._chaveOriginal));
}

// ── Excluir modelo de divisão (biblioteca ou "rápida" não salva) ────────────
// Nunca permite excluir modelo padrão do sistema (PPL, Upper/Lower etc.) —
// só existem duas formas legítimas de exclusão: (1) modelo que o personal
// salvou de verdade na biblioteca (op._libId setado por getDivisoesDisponiveis
// ao mesclar LIBS.distribuicao), ou (2) uma "Divisão rápida" (chave
// 'rapida-...') que nunca chegou a ser salva — só existe nesta sessão.
function podeExcluirDivisaoOpcao(op){
  return !!(op && (op._libId != null || String(op.chave||'').startsWith('rapida-')));
}

function excluirDivisaoOpcaoStep2(i){
  const op = _s3.divisaoOpcoes[i]; if(!op) return;
  if(!podeExcluirDivisaoOpcao(op)){
    alert('Modelos padrão do sistema não podem ser excluídos.');
    return;
  }
  if(op._libId != null){
    // Modelo de verdade na biblioteca — reaproveita o fluxo de confirmação
    // padrão (deletarItem/confirmarDeletar em biblioteca-exercicios.js), que já
    // trata a exclusão definitiva do LIBS.distribuicao. O card some desta tela
    // também, via hook em confirmarDeletar (não duplicar lógica de exclusão aqui).
    deletarItem('distribuicao', op._libId);
    return;
  }
  // Divisão rápida — nunca foi salva, então uma confirmação simples já basta.
  if(!confirm('Excluir esta divisão rápida da lista? Ela não foi salva como modelo, então não pode ser recuperada.')) return;
  removerDivisaoOpcaoDaLista(i);
}

// Remove um card da lista em memória (_s3.divisaoOpcoes) e reindexa os estados
// que dependem de índice (accordion aberto/fechado, edição leve em andamento).
function removerDivisaoOpcaoDaLista(i){
  const op = _s3.divisaoOpcoes[i]; if(!op) return;
  delete DIVISOES_TEMPLATES[op.chave];
  _s3.divisaoOpcoes.splice(i, 1);
  if(_s3._dcEditando === i) _s3._dcEditando = undefined;
  else if(_s3._dcEditando > i) _s3._dcEditando--;
  if(_s3.divisaoIdx >= _s3.divisaoOpcoes.length) _s3.divisaoIdx = Math.max(0, _s3.divisaoOpcoes.length - 1);
  else if(_s3.divisaoIdx > i) _s3.divisaoIdx--;
  const novoExpandido = {};
  Object.keys(_s3._divExpandido || {}).forEach(k => {
    const idx = parseInt(k);
    if(idx < i) novoExpandido[idx] = _s3._divExpandido[k];
    else if(idx > i) novoExpandido[idx-1] = _s3._divExpandido[k];
  });
  _s3._divExpandido = novoExpandido;
  renderTelaDivisao();
}

// Reverte o(s) card(s) ajustado(s) pro chave original (template de sistema ou
// modelo salvo) e descarta o clone de trabalho 'edit-i'.
function descartarEdicaoDivisao(){
  if(!_s3 || !_s3.divisaoOpcoes) return;
  _s3.divisaoOpcoes.forEach((op, i) => {
    if(op._chaveOriginal){
      delete DIVISOES_TEMPLATES['edit-' + i];
      op.chave = op._chaveOriginal;
      delete op._chaveOriginal;
    }
  });
  _s3._dcEditando = undefined;
  recalcularCargasDivisoes();
}

// Ponto de saída genérico: qualquer navegação que abandone a tela de
// Distribuição (voltar, trocar de aba, ir pra lista) passa por aqui. Sem
// ajuste pendente, executa direto; com ajuste pendente, pergunta antes.
let _pendingNavAposDescarte = null;

function confirmarSairEdicaoDivisao(fn){
  if(!temEdicaoDivisaoNaoSalva()){ fn(); return; }
  _pendingNavAposDescarte = fn;
  $('modal-edicao-divisao')?.classList.remove('hidden');
}

function modalDivisaoCancelar(){
  $('modal-edicao-divisao')?.classList.add('hidden');
  _pendingNavAposDescarte = null;
}

function modalDivisaoDescartar(){
  descartarEdicaoDivisao();
  $('modal-edicao-divisao')?.classList.add('hidden');
  const fn = _pendingNavAposDescarte; _pendingNavAposDescarte = null;
  if(fn) fn();
}

// "Salvar como modelo" — abre o formulário completo de Nova Divisão já
// pré-preenchido com as sessões exatamente como foram ajustadas em "⚙ Ajustar
// sessões", pra virar um modelo reutilizável de verdade em vez de se perder.
// A navegação pendente (_pendingNavAposDescarte) só é retomada depois que o
// personal efetivamente salvar no modal (ver hook em biblioteca-exercicios.js)
// — cancelar o modal deixa o personal de volta na tela de Distribuição.
function modalDivisaoSalvar(){
  $('modal-edicao-divisao')?.classList.add('hidden');
  const idx = (_s3.divisaoOpcoes||[]).findIndex(op => op._chaveOriginal);
  if(idx < 0) return;
  const op = _s3.divisaoOpcoes[idx];
  const divisaoEditada = DIVISOES_TEMPLATES[op.chave];
  abrirNovaDivisaoCompleta();
  if(divisaoEditada){
    const dias = divisaoEditada.default.map((sessaoGrupos, i) => ({
      label: (divisaoEditada.label && divisaoEditada.label[i]) || ('Treino ' + String.fromCharCode(65+i)),
      grupos: sessaoGrupos.map(x => GRUPOMAPA_PARA_MUSCULAR_DISPLAY[x.g]).filter(Boolean),
      enfase: '',
    }));
    const diasWrap = $('distrib-dias-wrap');
    if(diasWrap) diasWrap.innerHTML = '';
    dias.forEach(dia => addDiaDistrib(dia));
    const nomeEl = $('distrib-nome');
    if(nomeEl && !nomeEl.value) nomeEl.value = (op.nome||'').replace(/^★\s*/, '') + ' (ajustado)';
  }
}

// Fechar a guia/navegador com um ajuste pendente também avisa — esse é o
// único ponto que o app não controla via modal próprio (é o navegador quem
// mostra o aviso nativo de "sair da página?").
window.addEventListener('beforeunload', function(e){
  if(temEdicaoDivisaoNaoSalva()){
    e.preventDefault();
    e.returnValue = '';
    return '';
  }
});

// ── TELA C: FICHA ─────────────────────────────────────────────────────────────

// Monta o objeto de ficha (_s3.fichaObj) a partir do volume+divisão
// escolhidos. Retorna true se construiu com sucesso, false se o personal
// cancelou algum aviso de confirmação (grupos ausentes / incompatibilidade)
// — nesse caso quem chamou não deve prosseguir (nem mostrar resumo, nem
// re-renderizar a ficha).
function construirFichaModelo(){
  const s      = getActive(); if(!s) return false;
  const nivel  = val('pr-nivel') || s.anamnese?.nivel || 'Inic';
  const freq   = val('pr-frequencia') || s.anamnese?.frequencia || '3x';
  const op     = _s3.divisaoOpcoes[_s3.divisaoIdx] || _s3.divisaoOpcoes[0];
  if(!op){ alert('Selecione uma divisão primeiro.'); return false; }

  // ── Ler dados REAIS dos inputs do DOM por sessão ──────────────────────
  const numDias = parseInt(freq)||3;
  const divisao = DIVISOES_TEMPLATES[op.chave] || DIVISOES[numDias] || DIVISOES[3];
  const cardIdx = _s3.divisaoIdx;

  // Verificar grupos selecionados ausentes do modelo
  const gruposNoModelo = new Set();
  divisao.default.forEach(sess => sess.forEach(({g}) => gruposNoModelo.add(g)));
  const gruposAtivos = Object.keys(_s3.volPorGrupo).filter(g => _s3.volPorGrupo[g]?.ativo !== false);
  const gruposAusentes = gruposAtivos.filter(g => !gruposNoModelo.has(g));
  if(gruposAusentes.length){
    const LABEL = {}; GRUPOS_MAPA.forEach(({id,label}) => { LABEL[id]=label; });
    const nomes = gruposAusentes.map(g => LABEL[g]||g).join(', ');
    if(!confirm(`Atenção: os seguintes grupos estão selecionados mas NÃO aparecem nesta divisão:

${nomes}

Eles não serão incluídos na ficha. Continuar assim mesmo?`)) return false;
  }

  // ── Verificar compatibilidade divisão × periodização ──────────────────
  // Só roda com PERIODIZACAO_ATIVA=true — não faz sentido avisar sobre
  // incompatibilidade de um modelo que ninguém escolheu ativamente.
  if(PERIODIZACAO_ATIVA){
    const modeloPrescricao = _modeloSelecionado || '';
    if(modeloPrescricao){
      const aviso = verificarCompatibilidadePeriodDiv(modeloPrescricao, op, numDias);
      if(aviso && !confirm(aviso + '\n\nDeseja continuar mesmo assim?')) return false;
    }
  }

  // Ler inputs do accordion (se aberto), overrides salvos, ou calcular
  const sessionDataByTreino = divisao.default.map((sessaoGrupos, ti) => {
    // 1ª prioridade: DOM (accordion aberto)
    const fromDOM = lerSessionDataDOM(cardIdx, ti, sessaoGrupos);
    if(fromDOM.length > 0) return fromDOM;
    // 2ª prioridade: overrides salvos pelo usuário ao editar inputs.
    // Para cada grupo ativo da sessão: usa override se existir, senão calcula.
    // Antes usava early-return quando fromOverrides.length > 0 — isso silenciava
    // grupos sem override (ex.: Bíceps reativado após _defaultOrig ser restaurado)
    // porque qualquer outro grupo com override na mesma sessão disparava o return
    // antes de Bíceps ser incluído.
    const overrides = _s3._sessionOverrides || {};
    const gruposAtivos = sessaoGrupos.filter(({g}) => _s3.volPorGrupo[g]?.ativo !== false);
    const temAlgumOverride = gruposAtivos.some(({g}) => overrides[String(ti) + '-' + g]);
    if(temAlgumOverride){
      return gruposAtivos.map(({g}) => {
        const key = String(ti) + '-' + g;
        if(overrides[key]) return { g, ...overrides[key] };
        // Grupo ativo mas sem override: calcula inline (mesmo algoritmo da 3ª prioridade)
        const vg = _s3.volPorGrupo[g];
        if(!vg) return null;
        const sEx = vg.serEx || _s3.seriesPorEx;
        const freq_g = Math.max(1, vg.freq || 1);
        const serSem = Math.round(((vg.semMin||0)+(vg.semMax||0))/2);
        const serSess = Math.max(sEx, Math.round(serSem/freq_g));
        const numEx   = Math.max(1, Math.round(serSess/sEx));
        return { g, numEx, serEx: sEx, serSessao: numEx*sEx };
      }).filter(Boolean);
    }
    // 3ª prioridade: calcular a partir de volPorGrupo (nenhum override existe)
    return gruposAtivos
      .map(({g}) => {
        const vg = _s3.volPorGrupo[g];
        if(!vg || vg.ativo === false) return null;
        const sEx = vg.serEx || _s3.seriesPorEx;
        const freq_g = Math.max(1, vg.freq || 1);
        const serSem = Math.round(((vg.semMin||0)+(vg.semMax||0))/2);
        const serSess = Math.max(sEx, Math.round(serSem/freq_g));
        const numEx   = Math.max(1, Math.round(serSess/sEx));
        return { g, numEx, serEx: sEx, serSessao: numEx*sEx };
      }).filter(Boolean);
  });

  const params = {
    objetivo: selectedObj || 'Saude', nivel, frequencia: freq,
    local:        val('pr-local') || s.anamnese?.local || '',
    lesoes:       s.perfil?.lesoes || '',
    preferencias: val('pr-evitar') || s.anamnese?.preferencias || '',
    seriesPorEx: _s3.seriesPorEx,
    divisaoChave: op.chave,
    volPorGrupo: _s3.volPorGrupo,
    sessionDataByTreino,
    // Fase F — tempo estimado de treino: tempo disponível por sessão, usado
    // pra estimar o quão "apertada" a sessão vai ficar (ver `aperto` em
    // gerarFichaMotorV2) e favorecer exercícios mais eficientes quando necessário.
    duracaoDisponivel: parseInt(val('pr-duracao')) || parseInt(s.anamnese?.duracao) || 60,
  };

  _s3.fichaObj    = gerarFichaMotorV2(params);
  _s3.treinoAtivo = 0;

  $('ficha-divisao-label').textContent = op.nome;
  $('ficha-vol-label').textContent     = _s3.seriesPorEx + ' sér/ex · desvio ±' + (op.desvio !== undefined ? op.desvio : 0) + 's';

  const sel = $('ficha-divisao-select');
  if(sel){
    sel.innerHTML = '';
    _s3.divisaoOpcoes.forEach((o,i) => {
      const opt = document.createElement('option');
      opt.value = i; opt.textContent = o.nome;
      if(i === _s3.divisaoIdx) opt.selected = true;
      sel.appendChild(opt);
    });
  }
  return true;
}

// Botão "Avançar para Exercícios →" da tela de Distribuição (step 2) — monta
// a ficha a partir do volume+divisão escolhidos e já cruza direto pro step de
// Exercícios (a tela de resumo intermediária foi removida: escolhido o
// modelo, não há necessidade de mais uma tela de confirmação no meio).
function montarFichaModelo(){
  if(!construirFichaModelo()) return;
  avancarParaExercicios();
}

// Cruza de fato pro step 3, renderizando a ficha de exercícios já montada.
function avancarParaExercicios(){
  renderFichaTabs();
  renderPainelAssimetrias();
  renderPreviewVolSemanal();
  // 's3-ficha' fica com display:none sempre que a tela de Volume é (re)inicializada
  // (ver iniciarTelaVolume) — sem reexibir aqui, a Tela C escondia isso por trás de
  // si mesma; removida a Tela C (ver montarFichaModelo), ninguém mais tornava esta
  // div visível de novo e o Step 3 aparecia em branco.
  show('s3-ficha');
  goStep(3);
}

function regerarFicha(){
  if(!_s3.fichaObj) return;
  if(!construirFichaModelo()) return;
  renderFichaTabs();
  renderPainelAssimetrias();
  renderPreviewVolSemanal();
}

function mudarDivisaoFicha(idx){
  _s3.divisaoIdx = parseInt(idx) || 0;
  sincronizarFreqGrupos();
  if(!construirFichaModelo()) return;
  renderFichaTabs();
  renderPainelAssimetrias();
  renderPreviewVolSemanal();
}
function renderPreviewVolSemanal(targetId){
  const el = $(targetId || 'preview-vol-semanal'); if(!el) return;
  const f  = _s3.fichaObj; if(!f){ el.innerHTML=''; return; }
  const s  = getActive();
  const obj = selectedObj || getUltimoTreino(s).objetivo || 'Saude';

  // A tabela LIMIARES por OBJETIVO que ficava aqui foi REMOVIDA (2026-09-08):
  // dava um único MEV/MAV/MRV para todos os grupos (Hip = 10/20/25 tanto para
  // bíceps quanto para quadríceps), ignorando justamente a variável que mais
  // muda esses números. Resultado: bíceps com 6 séries aparecia "Abaixo MEV"
  // quando o MEV real do bíceps é 6 — o status mentia em metade das linhas.
  // Agora usa a régua por GRUPO (GRUPOS_MAPA), a mesma da tela de Volume.
  // Objetivo/sexo/nível continuam modulando o ALVO (getVolumePorGrupo), não a régua.

  // Somar volume semanal por grupo (todas as sessões)
  const volSem = {};
  f.treinos.forEach(t => t.exercicios.forEach(ex => {
    volSem[ex.musculo] = (volSem[ex.musculo]||0) + parseInt(ex.series||0);
  }));

  const LBL_G = {};
  GRUPOS_MAPA.forEach(({id, label}) => { LBL_G[id] = label; });

  const grupos = Object.keys(volSem).sort();
  const rows = grupos.map(g => {
    const v = volSem[g]||0;
    const grupo = GRUPOS_MAPA.find(x => x.id === g);
    // Grupo fora do GRUPOS_MAPA (não deveria acontecer): mostra o número sem régua.
    if(!grupo){
      return `<tr>
        <td style="font-size:12px;color:var(--text2);padding:5px 8px">${g}</td>
        <td style="padding:5px 8px;font-variant-numeric:tabular-nums;font-size:13px;font-weight:700;text-align:center">${v}</td>
        <td colspan="3" style="padding:5px 8px;font-size:12px;color:var(--text3)">sem referência de volume para este grupo</td>
      </tr>`;
    }
    const mk    = _volMarcos(grupo);
    const faixa = classificarVolumeGrupo(v, grupo, true);
    const cor   = VOL_FAIXAS[faixa].cor;
    // Traço na posição do valor — a régua inteira fica legível, e a posição
    // é lida direto em vez de comparar comprimentos de preenchimento.
    const barHtml =
      barraVolumeGrupoHTML(grupo, volMarcadorHTML(posVolReguaA(v, grupo), cor), 10) +
      escalaVolumeHTML([mk.mev, mk.mn, mk.mx, mk.mrv], VOL_RA_X);
    return `<tr>
      <td style="font-size:12px;color:var(--text2);padding:5px 8px">${LBL_G[g]||g}</td>
      <td style="padding:5px 8px;font-variant-numeric:tabular-nums;font-size:13px;font-weight:700;color:${cor};text-align:center">${v}</td>
      <td style="padding:5px 8px;font-size:12px;color:var(--text3);text-align:center;font-variant-numeric:tabular-nums;white-space:nowrap">${mk.mev} · ${mk.mn}–${mk.mx} · ${mk.mrv}</td>
      <td style="padding:5px 12px;min-width:150px">${barHtml}</td>
      <td style="font-size:12px;font-weight:600;color:${cor};padding:5px 8px;white-space:nowrap">
        <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${cor};margin-right:5px;vertical-align:middle"></span>${escHTML(VOL_FAIXAS[faixa].label)}
      </td>
    </tr>`;
  }).join('');

  const totalSem = Object.values(volSem).reduce((a,b)=>a+b,0);
  const contFx = {}; grupos.forEach(g => { const gr = GRUPOS_MAPA.find(x => x.id === g); if(!gr) return; const k = classificarVolumeGrupo(volSem[g], gr, true); contFx[k] = (contFx[k]||0) + 1; });
  const resumoVol = totalSem + ' séries' + (contFx.ideal ? ' · ' + contFx.ideal + ' ideais' : '') + (contFx.baixo ? ' · ' + contFx.baixo + ' baixos' : '');
  const corpoVol = `
    <div class="section-label"><i class=ph-chart-bar></i> Volume Semanal por Grupo — ${obj}</div>
    <div style="font-size:12px;color:var(--text3);margin-bottom:8px">
      Referência Israetel 2019, por grupo muscular: <strong>MEV</strong> (mínimo efetivo) → <strong>MAV</strong> (máximo adaptativo) → <strong>MRV</strong> (máximo recuperável)
    </div>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="border-bottom:1px solid var(--border)">
        <th style="text-align:left;padding:4px 8px;font-size:12px;color:var(--text3)">Grupo</th>
        <th style="text-align:center;padding:4px 8px;font-size:12px;color:var(--text3)">Séries/sem</th>
        <th style="text-align:center;padding:4px 8px;font-size:12px;color:var(--text3)">MEV · MAV · MRV</th>
        <th style="padding:4px 12px;font-size:12px;color:var(--text3)">Volume</th>
        <th style="text-align:left;padding:4px 8px;font-size:12px;color:var(--text3)">Status</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin-top:10px;padding:7px 10px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius)">
      <span style="font-variant-numeric:tabular-nums;font-size:12px;color:var(--text3);">STATUS DO VOLUME:</span>
      ${['baixo','aceitavel-','ideal','aceitavel+','alto'].map(k =>
        `<span style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text2)">
           <span style="width:9px;height:9px;border-radius:6px;background:${VOL_FAIXAS[k].cor}"></span>${escHTML(VOL_FAIXAS[k].label)}
         </span>`).join('')}
    </div>
    <div style="margin-top:8px;font-size:12px;color:var(--text3);text-align:right">
      Total na semana: <strong style="color:var(--accent);font-variant-numeric:tabular-nums;">${totalSem} séries</strong>
    </div>`;
  el.innerHTML = prAcc('ph-chart-bar', 'Volume semanal por grupo', resumoVol, corpoVol, {cls:'pr-acc-vol', key:'volsem-' + (targetId || 'p')});
}


function renderFichaTabs(){
  const f = _s3.fichaObj; if(!f) return;
  // Nome do treino (vai como nome_treino no export pro FitCpx). Vazio = padrão.
  const nomeEl = $('ficha-nome-treino');
  if(nomeEl){
    nomeEl.placeholder = _fitcpxNomeTreinoPadrao(f);
    nomeEl.value = f.nomeTreino || _fitcpxNomeTreinoPadrao(f);
  }
  const tabs = $('ficha-tabs'); tabs.innerHTML = '';
  f.treinos.forEach((t,i) => {
    const tab = document.createElement('div');
    tab.className = 'tab ft-tab' + (i===_s3.treinoAtivo?' active':'');
    tab.style.cssText = 'font-size:14px;font-weight:600;padding:9px 22px';
    const nSer = t.exercicios.reduce((a,e)=>a+(parseInt(e.series)||0),0);
    tab.innerHTML = `Treino ${String.fromCharCode(65+i)}` + '<small class="ft-n">' + nSer + 's</small>'; // fixo por posição — nome editável fica no card
    tab.onclick = () => { _s3.treinoAtivo = i; renderFichaTabs(); };
    tabs.appendChild(tab);
  });
  renderTreinoAtivo();
}

// Edição de nomes na tela de Exercícios — gravam direto na ficha (f.nomeTreino
// e t.label), que é o que a ficha aprovada e o export pro FitCpx usam.
function editarNomeTreinoFicha(valor){
  const f = _s3.fichaObj; if(!f) return;
  f.nomeTreino = valor;
}
function editarNomeSessaoFicha(ti, valor){
  const t = _s3.fichaObj?.treinos[ti]; if(!t) return;
  t.label = valor;
}

// ── Barra de Solicitação Articular ──────────────────────────────────────────
// Exibe, em tempo real, quais articulações estão sendo exigidas na sessão e
// com que intensidade relativa (quantos exercícios as recrutam). Atualiza
// automaticamente quando o personal troca um exercício (renderTreinoAtivo faz
// o re-render completo). Usa a mesma ordem de ORDEM_ARTIC_AQUECIMENTO pra
// consistência visual com o bloco de aquecimento.
function _htmlBarraArticular(exercicios){
  if(!exercicios || !exercicios.length) return '';
  const cont = {};
  exercicios.forEach(ex => {
    (ex._artic||[]).forEach(a => {
      if(a) cont[a] = (cont[a]||0) + 1;
    });
  });
  const total = exercicios.length;
  const ordenadas = Object.keys(cont).sort((a,b) => {
    const ia = ORDEM_ARTIC_AQUECIMENTO.indexOf(a), ib = ORDEM_ARTIC_AQUECIMENTO.indexOf(b);
    const ra = ia < 0 ? 999 : ia, rb = ib < 0 ? 999 : ib;
    if(ra !== rb) return ra - rb;
    return cont[b] - cont[a]; // empate na ordem → maior demanda primeiro
  });
  if(!ordenadas.length) return '';
  const maxCont = Math.max(...Object.values(cont));
  const chips = ordenadas.map(a => {
    const n = cont[a];
    const pct = Math.round((n / total) * 100);
    const barPct = Math.round((n / maxCont) * 100);
    // Cor por demanda relativa ao total de exercícios
    const cor = pct >= 60 ? 'var(--accent)' : pct >= 35 ? 'var(--amber)' : pct >= 20 ? 'var(--text2)' : 'var(--text3)';
    const barCor = pct >= 60 ? 'var(--accent)' : pct >= 35 ? 'var(--amber)' : pct >= 20 ? 'var(--text3)' : 'var(--bg2)';
    const badge = n > 1 ? `<span style="font-size:12px;margin-left:3px;opacity:.7">×${n}</span>` : '';
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:2px">
      <span style="font-size:12px;font-weight:${pct>=35?'700':'400'};color:${cor};white-space:nowrap">${a}${badge}</span>
      <div style="width:100%;height:2px;background:var(--bg2);border-radius:1px">
        <div style="width:${barPct}%;height:100%;background:${barCor};border-radius:1px"></div>
      </div>
    </div>`;
  }).join('');
  return `<div style="padding:6px 0 8px;border-bottom:1px solid var(--border);margin-bottom:8px">
    <div style="font-size:12px;font-weight:700;color:var(--text3);margin-bottom:5px"><i class=ph-bone></i> Solicitação articular</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px 14px">${chips}</div>
  </div>`;
}

// ── Painel de info da sessão ─────────────────────────────────────────────────
function _htmlSessaoInfo(treino, fichaObj, objetivoStr){
  // Volume por músculo na sessão atual
  const volSessao = {};
  treino.exercicios.forEach(ex => {
    volSessao[ex.musculo] = (volSessao[ex.musculo]||0) + parseInt(ex.series||0);
  });
  const totalSessao = Object.values(volSessao).reduce((a,b)=>a+b,0);

  // Volume semanal total (todas as sessões) para indicador MEV/MAV/MRV
  const volSem = {};
  fichaObj.treinos.forEach(t => t.exercicios.forEach(ex => {
    volSem[ex.musculo] = (volSem[ex.musculo]||0) + parseInt(ex.series||0);
  }));

  // Segunda cópia da tabela LIMIARES por objetivo REMOVIDA aqui também
  // (2026-09-08) — mesma régua única para todos os grupos, mesmo defeito.
  // A cor do chip agora sai da régua por grupo, igual ao resto do sistema.
  const muscChips = Object.entries(volSessao).map(([m,v]) => {
    const vSem  = volSem[m] || 0;
    const grupo = GRUPOS_MAPA.find(x => x.id === m);
    const cor   = grupo ? VOL_FAIXAS[classificarVolumeGrupo(vSem, grupo, true)].cor
                        : 'var(--text3)';
    const mLabel = m.replace('Isquiossurais','Isquio').replace('RetoAbdominal','Abd').replace('Panturrilhas','Pant');
    return `<span style="display:inline-flex;align-items:center;gap:5px;padding:3px 8px;background:var(--bg3);border:1px solid var(--border);border-radius:20px;font-size:12px;color:var(--text2)">
      <span style="width:6px;height:6px;border-radius:50%;background:${cor};flex-shrink:0"></span>
      ${mLabel} <strong style="color:var(--text);font-variant-numeric:tabular-nums;">${v}s</strong>
    </span>`;
  }).join('');

  // Articulações solicitadas com série count + escala de calor
  const contArtic = {};
  treino.exercicios.forEach(ex => {
    (ex._artic||[]).forEach(a => { if(a) contArtic[a] = (contArtic[a]||0) + parseInt(ex.series||1); });
  });
  const maxArtic = contArtic && Object.keys(contArtic).length ? Math.max(...Object.values(contArtic)) : 1;
  const articChips = Object.keys(contArtic).sort((a,b)=>{
    const ia=ORDEM_ARTIC_AQUECIMENTO.indexOf(a),ib=ORDEM_ARTIC_AQUECIMENTO.indexOf(b);
    return (ia<0?999:ia)-(ib<0?999:ib);
  }).map(a => {
    const n = contArtic[a];
    const pct = Math.round((n/maxArtic)*100);
    const cor = pct>=80?'var(--red)':pct>=55?'var(--amber)':pct>=30?'var(--accent)':'var(--text3)';
    return `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 9px;background:var(--bg3);border:1px solid ${cor}44;border-left:1px solid ${cor};border-radius:6px;font-size:12px;color:${cor};font-weight:600">
      ${a}<span style="opacity:.65;font-weight:400">×${n}</span>
    </span>`;
  }).join('');

  // Tempo estimado
  const tempoEstimado = calcularTempoEstimadoTreino(treino);
  const duracaoAlvoMin = fichaObj.duracaoAlvoMin || 60;
  const difMin = tempoEstimado.minutos - duracaoAlvoMin;
  const corTempo = Math.abs(difMin)<=5?'var(--text3)':(difMin>0?'var(--amber)':'var(--text3)');

  return `<div style="padding:12px 14px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:14px">
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:10px">
      <input type="text" value="${escHTML(treino.label||'')}" title="Nome da sessão (editável — vai pro FitCpx)"
        placeholder="Treino ${String.fromCharCode(65+Math.max(0,fichaObj.treinos.indexOf(treino)))}"
        oninput="editarNomeSessaoFicha(${fichaObj.treinos.indexOf(treino)}, this.value)"
        style="flex:1;min-width:200px;font-size:14px;font-weight:700;color:var(--text);background:transparent;border:1px dashed var(--border);border-radius:var(--radius);padding:4px 8px;outline:none">
      <div style="display:flex;align-items:center;gap:10px;font-size:12px;color:var(--text3)">
        <span style="font-variant-numeric:tabular-nums;font-weight:700;color:var(--accent)">${totalSessao} séries</span>
        <span style="color:${corTempo}" title="Estimativa de duração"><i class=ph-timer></i> ~${tempoEstimado.minutos}min${difMin>5?` (+${difMin})`:''}</span>
      </div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:${articChips?'10px':'0'}">${muscChips}</div>
    ${articChips ? `<div style="margin-top:8px"><div style="font-size:12px;font-weight:700;color:var(--text3);margin-bottom:5px"><i class=ph-bone></i> Solicitação articular</div><div style="display:flex;flex-wrap:wrap;gap:5px">${articChips}</div></div>` : ''}
  </div>`;
}

// Injeta o CSS compartilhado dos cards de exercicio/aquecimento (v2) uma
// unica vez na pagina. Usado tanto pela tela editavel (renderTreinoAtivo)
// quanto pela ficha aprovada read-only (renderFichaAprovadaVisual) — mesmo
// padrao visual nos dois lugares.
function _injetarEstilosExcv2(){
  if(!document.getElementById('ex-card-v2-styles')){
    const st = document.createElement('style');
    st.id = 'ex-card-v2-styles';
    st.textContent = `
      .excv2-row{display:flex;align-items:center;gap:6px;padding:7px 10px;flex-wrap:nowrap}
      .excv2-drag{color:var(--text3);cursor:grab;font-size:12px;user-select:none;flex-shrink:0;width:14px}
      .excv2-drag:hover{color:var(--text2)}
      .excv2-arrows{display:flex;flex-direction:column;gap:3px;flex-shrink:0;justify-content:center;align-self:stretch}
      .excv2-arr{background:none;border:1px solid var(--border);border-radius:6px;color:var(--text3);width:16px;height:15px;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .12s;line-height:1}
      .excv2-arr:hover{border-color:var(--text2);color:var(--text2);background:var(--bg4)}
      .excv2-arr:disabled{opacity:.2;cursor:default}
      .excv2-nameblock{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
      .excv2-chip{align-self:flex-start;flex-shrink:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;font-size:12px;font-weight:700;padding:1px 6px;border-radius:8px;white-space:nowrap}
      .excv2-namewrap{flex:1;min-width:0;position:relative}
      .excv2-namebtn{display:flex;align-items:center;gap:5px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:4px 8px;color:var(--text);font-size:12px;font-weight:500;cursor:pointer;width:100%;transition:border-color .12s;text-align:left}
      .excv2-namebtn:hover{border-color:var(--accent2)}
      .excv2-namebtn.open{border-color:var(--accent2);background:var(--bg4)}
      .excv2-namebtn .nm{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .excv2-namebtn .caret{color:var(--text3);font-size:12px;flex-shrink:0}
      .excv2-iconbtn{flex-shrink:0;background:none;border:1px solid var(--border);border-radius:6px;width:26px;height:26px;color:var(--text2);font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .12s}
      .excv2-iconbtn:hover{border-color:var(--text2);background:var(--bg4);color:var(--text)}
      .excv2-video{color:var(--accent2);border-color:rgba(91,140,247,.3)}
      .excv2-video:hover{background:rgba(91,140,247,.12)!important}
      .excv2-more.act{border-color:var(--border2);background:var(--bg5)}
      .excv2-pg{flex-shrink:0;display:flex;flex-direction:column;gap:2px}
      .excv2-plbl{font-size:12px;font-weight:600;color:var(--text3);text-align:center}
      .excv2-pctrl{display:flex;align-items:stretch;background:var(--bg3);border:1px solid var(--border);border-radius:6px;overflow:hidden;height:26px}
      .excv2-pctrl input{background:none;border:none;outline:none;color:var(--text);font-variant-numeric:tabular-nums;font-size:12px;font-weight:500;width:38px;text-align:center;padding:0}
      .excv2-pm{background:none;border:none;color:var(--text3);font-size:13px;width:18px;min-width:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .1s;line-height:1}
      .excv2-pm.mi{border-left:1px solid var(--border)}
      .excv2-pm.pl{border-left:1px solid var(--border)}
      .excv2-pm:hover{background:var(--bg5);color:var(--text)}
      /* floating search dropdown */
      .excv2-sdrop{position:absolute;top:calc(100% + 4px);left:0;right:0;background:var(--bg2);border:1px solid var(--border2);border-radius:var(--radius);box-shadow:0 6px 28px rgba(0,0,0,.55);z-index:900}
      .excv2-sbar{display:flex;align-items:center;gap:6px;padding:6px 10px;border-bottom:1px solid var(--border);background:var(--bg3);border-radius:var(--radius) var(--radius) 0 0;flex-shrink:0}
      .excv2-sinput{flex:1;background:none;border:none;outline:none;color:var(--text);font-size:12px;caret-color:var(--accent2)}
      .excv2-sinput::placeholder{color:var(--text3)}
      .excv2-ftrig{background:var(--bg4);border:1px solid var(--border2);border-radius:6px;color:var(--accent2);font-size:12px;font-weight:600;padding:3px 8px;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:4px;transition:all .12s;font-family:inherit}
      .excv2-ftrig:hover{background:rgba(91,140,247,.15)}
      .excv2-sdrop.fx-anchored,.excv2-omenu.fx-anchored{position:fixed!important}
      .excv2-slist{max-height:240px;overflow-y:auto}
      .excv2-slist::-webkit-scrollbar{width:4px}
      .excv2-slist::-webkit-scrollbar-thumb{background:var(--border2);border-radius:6px}
      .excv2-sitem{padding:7px 12px;cursor:pointer;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;transition:background .1s}
      .excv2-sitem:last-child{border-bottom:none}
      .excv2-sitem:hover{background:var(--bg4)}
      .excv2-sname{font-size:12px;color:var(--text)}
      .excv2-sname mark{background:none;color:var(--accent2);font-weight:600}
      .excv2-smeta{font-size:12px;color:var(--text3)}
      .excv2-scnt{padding:5px 12px;font-size:12px;color:var(--text3);border-top:1px solid var(--border);background:var(--bg3);border-radius:0 0 var(--radius) var(--radius)}
      /* options menu */
      .excv2-omenu{position:absolute;top:calc(100% + 2px);right:0;background:var(--bg3);border:1px solid var(--border2);border-radius:var(--radius);box-shadow:0 6px 28px rgba(0,0,0,.55);z-index:900;min-width:150px;overflow:hidden}
      .excv2-oi{display:flex;align-items:center;gap:8px;padding:8px 12px;font-size:12px;color:var(--text2);cursor:pointer;border-bottom:1px solid var(--border);transition:background .1s}
      .excv2-oi:last-child{border-bottom:none}
      .excv2-oi:hover{background:var(--bg5);color:var(--text)}
      .excv2-oi.danger{color:var(--red)}
      .excv2-oi.danger:hover{background:rgba(240,90,90,.1)}
      .excv2-oi.delink{color:var(--accent)}
      .excv2-oi.delink:hover{background:var(--accent-dim)}
      /* note area */
      .excv2-notearea{padding:5px 10px 7px}
      .excv2-noteinput{width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;font-family:inherit;padding:6px 8px;outline:none;resize:none;transition:border-color .12s}
      .excv2-noteinput:focus{border-color:var(--amber)}
      /* bi-set connector */
      .excv2-bisetbar{height:3px;background:linear-gradient(90deg,var(--accent) 0%,var(--accent2) 100%);margin:0 10px 0 47px;opacity:.6}
      .excv2-bisetctrl{display:flex;align-items:center;justify-content:space-between;padding:3px 10px 3px 47px;background:rgba(91,140,247,.06);border-top:1px solid rgba(91,140,247,.18);border-bottom:1px solid rgba(91,140,247,.18)}
      .excv2-bisetlbl{font-size:12px;font-weight:700;color:var(--accent2);display:flex;align-items:center;gap:5px}
      .excv2-bisetreorder{display:flex;gap:4px;align-items:center}
      .excv2-bisetreorder span{font-size:12px;color:var(--text3)}
      .excv2-bisetreorder button{background:none;border:1px solid rgba(91,140,247,.35);border-radius:6px;color:var(--accent2);width:19px;height:16px;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .12s}
      .excv2-bisetreorder button:hover{background:rgba(91,140,247,.15)}
      .excv2-bisetreorder button:disabled{opacity:.2;cursor:default}
      /* aquecimento card */
      .aqv2-row{display:flex;align-items:center;gap:5px;padding:7px 10px}
      .aqv2-tipc{flex-shrink:0;font-size:12px;font-weight:700;padding:2px 6px;border-radius:10px;white-space:nowrap}
      .aqv2-artic{flex-shrink:0;font-size:12px;font-weight:600;color:var(--text3);min-width:56px;max-width:72px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .aqv2-durctrl{flex-shrink:0;display:flex;align-items:center;background:var(--bg3);border:1px solid var(--border);border-radius:6px;overflow:hidden;width:76px}
      .aqv2-durctrl input{background:none;border:none;outline:none;color:var(--text);font-variant-numeric:tabular-nums;font-size:12px;width:100%;text-align:center;padding:4px 2px}
      .aqv2-dpm{background:none;border:none;color:var(--text3);font-size:13px;width:19px;min-width:19px;height:25px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .1s}
      .aqv2-dpm.mi{border-right:1px solid var(--border)}
      .aqv2-dpm.pl{border-left:1px solid var(--border)}
      .aqv2-dpm:hover{background:var(--bg5);color:var(--text)}
      .aqv2-rmbtn{flex-shrink:0;background:none;border:1px solid var(--border);border-radius:6px;width:24px;height:24px;color:var(--text3);font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .12s}
      .aqv2-rmbtn:hover{border-color:var(--red);color:var(--red);background:rgba(240,90,90,.1)}
      /* filter overlay */
      .excv2-foverlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1000;display:flex;align-items:center;justify-content:center}
      .excv2-fmodal{background:var(--bg2);border:1px solid var(--border2);border-radius:8px;box-shadow:0 6px 28px rgba(0,0,0,.55);width:90%;max-width:500px;overflow:hidden}
      .excv2-fhead{background:var(--bg3);border-bottom:1px solid var(--border);padding:10px 14px;display:flex;align-items:center;justify-content:space-between}
      .excv2-ftitle{font-size:13px;font-weight:700;color:var(--text);display:flex;align-items:center;gap:8px}
      .excv2-fclose{background:none;border:none;color:var(--text3);font-size:18px;cursor:pointer;line-height:1}
      .excv2-fclose:hover{color:var(--text)}
      .excv2-fbody{padding:12px 14px}
      .excv2-fgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .excv2-fg label{display:block;font-size:12px;font-weight:700;color:var(--text3);margin-bottom:3px}
      .excv2-fsel{width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text2);font-size:12px;font-family:inherit;padding:5px 8px;outline:none;appearance:none;cursor:pointer;transition:border-color .12s}
      .excv2-fsel:focus{border-color:var(--accent2);color:var(--text)}
      .excv2-ffoot{padding:10px 14px;border-top:1px solid var(--border);display:flex;gap:8px}
      .excv2-fbtn-clear{background:none;border:1px solid var(--border);border-radius:6px;color:var(--text3);font-size:12px;padding:6px 12px;cursor:pointer;font-family:inherit;transition:all .12s}
      .excv2-fbtn-clear:hover{border-color:var(--text2);color:var(--text2)}
      .excv2-fbtn-apply{background:var(--accent2);border:none;border-radius:6px;color:var(--on-accent2);font-size:12px;font-weight:700;padding:6px 18px;cursor:pointer;flex:1;font-family:inherit;transition:opacity .12s}
      .excv2-fbtn-apply:hover{opacity:.85}
    `;
    document.head.appendChild(st);
  }
}

function renderTreinoAtivo(){
  const f = _s3.fichaObj; if(!f) return;
  const treino = f.treinos[_s3.treinoAtivo];
  const cont   = $('ficha-treinos-content');
  const obj    = selectedObj || getUltimoTreino(getActive()).objetivo || 'Saude';

  // ── Painel de info da sessão ────────────────────────────────────────────
  const sessaoInfoHtml = _htmlSessaoInfo(treino, f, obj);

  // ── Bloco de Aquecimento — 3 seções separadas ──────────────────────────────
  const aquecimento = treino.aquecimento || [];
  const ti = _s3.treinoAtivo;

  // Articulações e músculos presentes no treino
  const articsTreinoSet = new Set();
  treino.exercicios.forEach(ex => { (ex._artic||[]).forEach(a => { if(a && ARTIC_MOBILIDADE_VALIDAS.has(a)) articsTreinoSet.add(a); }); });
  const sortedArtics = [...articsTreinoSet].sort((a,b) =>
    (ORDEM_ARTIC_AQUECIMENTO.indexOf(a)<0?999:ORDEM_ARTIC_AQUECIMENTO.indexOf(a)) -
    (ORDEM_ARTIC_AQUECIMENTO.indexOf(b)<0?999:ORDEM_ARTIC_AQUECIMENTO.indexOf(b)));
  const musculosTreinoArr = [...new Set(treino.exercicios.map(ex => ex.musculo).filter(Boolean))];

  // Helper: renderiza uma row de item de aquecimento
  function _rowAquecItem(a, ai){
    const refLabel = a.tipo==='Mobilidade' ? (a.artic||'—') : (a.musculo||'—');
    const videoBtn = a.url
      ? `<a data-url="${a.url}" data-nome="${(a.nome||'').replace(/"/g,'&quot;')}" onclick="abrirVideoModal(this.dataset.url,this.dataset.nome)" style="font-size:12px;color:var(--accent);text-decoration:none;cursor:pointer;margin-left:4px" title="Ver vídeo"><i class=ph-play></i></a>`
      : '';
    return `<div style="padding:7px 12px;border-top:1px solid var(--border);background:var(--bg4);transition:background .15s"
      onmouseenter="this.style.background='var(--bg3)'" onmouseleave="this.style.background='var(--bg4)'">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span style="font-size:12px;color:var(--text3);min-width:72px;flex-shrink:0">${refLabel}</span>
        <span style="flex:1;font-size:12px;color:var(--text);min-width:100px">${escHTML(a.nome)}${videoBtn}</span>
        <span style="font-size:12px;color:var(--text2);white-space:nowrap;font-variant-numeric:tabular-nums;">${a.duracao}</span>
        <button class="tbtn" style="font-size:12px;padding:2px 8px;flex-shrink:0"
          onclick="abrirListaAquecimento(${ti},${ai})" title="Alternativos"><i class=ph-caret-down></i></button>
        <button class="tbtn" style="font-size:12px;padding:2px 6px;flex-shrink:0;color:var(--red);border-color:var(--red)"
          onclick="removerItemAquecimento(${ti},${ai})" title="Remover"><i class=ph-x></i></button>
      </div>
      <div id="lista-aquec-${ti}-${ai}" class="hidden"
        style="margin-top:6px;max-height:160px;overflow-y:auto;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:4px"></div>
    </div>`;
  }

  // Helper: chips de articulações para Mobilidade
  function _chipsArticMob(){
    if(!sortedArtics.length) return `<span style="font-size:12px;color:var(--text3);font-style:italic">Nenhuma articulação identificada</span>`;
    return sortedArtics.map(artic => {
      const inDB = DB_EXERCICIOS.some(e => (e.tp||[]).some(t=>t.chave==='Mobilidade') && (e.artic||[]).some(a=>a.nome===artic));
      const sel  = aquecimento.some(x => x.tipo==='Mobilidade' && x.artic===artic);
      if(!inDB) return `<span style="font-size:12px;padding:3px 10px;border-radius:20px;border:1px solid var(--border);color:var(--text3);opacity:.4">${artic}</span>`;
      return `<button onclick="toggleAquecArtic(${ti},'${artic.replace(/'/g,"\\'")}')"
        style="font-size:12px;padding:3px 10px;border-radius:20px;border:1px solid ${sel?'var(--accent)':'var(--border)'};background:${sel?'var(--accent)':'transparent'};color:${sel?'#fff':'var(--text2)'};cursor:pointer;transition:all .15s"
        >${artic}${sel?' '+'<i class=ph-check></i>':''}</button>`;
    }).join('');
  }

  // Helper: chips de músculos para Flex ou Lib
  function _chipsMuscTipo(tipo, color){
    if(!musculosTreinoArr.length) return `<span style="font-size:12px;color:var(--text3);font-style:italic">Nenhum grupo identificado</span>`;
    const disponiveis = musculosTreinoArr.filter(m =>
      DB_EXERCICIOS.some(e => (e.tp||[]).some(t=>t.nome===tipo) && (e.g||[]).some(g=>g.nome===m)));
    if(!disponiveis.length) return `<span style="font-size:12px;color:var(--text3);font-style:italic">Sem exercício disponível</span>`;
    return disponiveis.map(m => {
      const sel  = aquecimento.some(x => x.tipo===tipo && x.musculo===m);
      const mSafe = m.replace(/'/g,"\\'");
      return `<button onclick="toggleAquecMusculo(${ti},'${mSafe}','${tipo}')"
        style="font-size:12px;padding:3px 10px;border-radius:20px;border:1px solid ${sel?color:'var(--border)'};background:${sel?color:'transparent'};color:${sel?'#fff':'var(--text2)'};cursor:pointer;transition:all .15s"
        >${m}${sel?' <i class=ph-check></i>':''}</button>`;
    }).join('');
  }

  // ── Tabela unificada de aquecimento ──────────────────────────────────────
  function _rowAquecUnif(a, ai){
    const isMob  = a.tipo==='Mobilidade';
    const isFlex = a.tipo==='Flexibilidade';
    // Chip visual: MOB azul-ciano / FLEX verde / LIB âmbar
    const tipBg  = isMob ? 'rgba(0,188,212,.18)' : isFlex ? 'rgba(56,142,60,.18)' : 'rgba(255,152,0,.18)';
    const tipFg  = isMob ? '#00bcd4'             : isFlex ? 'var(--accent)'              : 'var(--amber)';
    const tipLbl = isMob ? 'MOB'                 : isFlex ? 'FLEX'                 : 'LIB';
    const refLabel = isMob ? (a.artic||'—') : (a.musculo||'—');
    const videoBtn = a.url
      ? `<button class="excv2-iconbtn excv2-video" title="Ver vídeo"
          onclick="abrirVideoModal('${a.url.replace(/'/g,"\\'")}','${(a.nome||'').replace(/'/g,"\\'")}')"><i class=ph-play></i></button>`
      : `<button class="excv2-iconbtn excv2-video" title="Sem vídeo" disabled style="opacity:.3"><i class=ph-play></i></button>`;
    const podeSubir  = ai > 0;
    const podeDescer = ai < aquecimento.length - 1;
    return `<div style="border-top:1px solid var(--border);position:relative">
      <div class="aqv2-row">
        <span class="excv2-drag" title="Arrastar">⋮⋮</span>
        <div class="excv2-arrows" style="flex-shrink:0">
          <button class="excv2-arr" title="Subir" ${podeSubir?`onclick="moverAquecimento(${ti},${ai},-1)"`:'disabled'}><i class=ph-caret-up></i></button>
          <button class="excv2-arr" title="Descer" ${podeDescer?`onclick="moverAquecimento(${ti},${ai},1)"`:'disabled'}><i class=ph-caret-down></i></button>
        </div>
        <span class="aqv2-tipc" style="background:${tipBg};color:${tipFg}">${tipLbl}</span>
        <span class="aqv2-artic" title="${refLabel}">${refLabel}</span>
        <div style="flex:1;min-width:0;position:relative" id="aqv2-nw-${ti}-${ai}">
          <button class="excv2-namebtn" onclick="abrirListaAquecimento(${ti},${ai})">
            <span class="nm">${escHTML(a.nome)}</span>
            <span class="caret"><i class=ph-caret-down></i></span>
          </button>
          <div id="lista-aquec-${ti}-${ai}" class="hidden excv2-sdrop"
            style="max-height:220px;overflow-y:auto;padding:4px 0"></div>
        </div>
        <div class="aqv2-durctrl">
          <button class="aqv2-dpm mi" onclick="_pmAquecimento(${ti},${ai},-1)">−</button>
          <input id="aqv2-dur-${ti}-${ai}" type="text" value="${a.duracao}"
            onblur="(function(v){const t=_s3.fichaObj?.treinos[${ti}];if(t?.aquecimento?.[${ai}])t.aquecimento[${ai}].duracao=v;})(this.value)">
          <button class="aqv2-dpm pl" onclick="_pmAquecimento(${ti},${ai},1)">+</button>
        </div>
        ${videoBtn}
        <button class="aqv2-rmbtn" onclick="removerItemAquecimento(${ti},${ai})" title="Remover"><i class=ph-x></i></button>
      </div>
    </div>`;
  }

  const warningHtml = treino._aquecDesatualizado
    ? `<div style="padding:6px 12px;background:var(--amber-dim);border-bottom:1px solid var(--amber-line);font-size:12px;color:var(--amber);display:flex;align-items:center;gap:8px">
        <span><i class=ph-warning></i> Exercícios da parte principal foram alterados — revise o aquecimento</span>
        <button onclick="_s3.fichaObj.treinos[${ti}]._aquecDesatualizado=false;renderTreinoAtivo()"
          style="font-size:12px;color:var(--text3);background:none;border:none;cursor:pointer;text-decoration:underline;flex-shrink:0">Dispensar</button>
      </div>` : '';

  const tabelaAquecHtml = aquecimento.length
    ? aquecimento.map((a,ai) => _rowAquecUnif(a,ai)).join('')
    : `<div style="padding:12px;font-size:12px;color:var(--text3);text-align:center;font-style:italic">Clique nos chips acima para adicionar exercícios ao aquecimento</div>`;

  const aquecPickerId = `picker-add-aquec-${ti}`;

  const aquecimentoHtml = `<div style="margin-bottom:16px;border:1px solid var(--border);border-radius:var(--radius);overflow:visible">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--bg3);border-bottom:1px solid var(--border);gap:8px">
      <div style="font-size:12px;font-weight:700;color:var(--text2);"><i class=ph-fire></i> Aquecimento</div>
      <button class="btn btn-ghost btn-sm"  onclick="regerarAquecimentoTreinoAtivo()"><i class=ph-arrows-clockwise></i> Gerar</button>
    </div>
    ${warningHtml}
    <!-- 3 linhas de filtro -->
    <div style="border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:8px;padding:6px 12px;border-bottom:1px solid var(--border)">
        <span style="font-size:12px;font-weight:700;color:var(--accent);min-width:80px;flex-shrink:0">Mobilidade</span>
        <div style="display:flex;gap:4px;flex-wrap:wrap">${_chipsArticMob()}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;padding:6px 12px;border-bottom:1px solid var(--border)">
        <span style="font-size:12px;font-weight:700;color:var(--accent2);min-width:80px;flex-shrink:0">Flexibilidade</span>
        <div style="display:flex;gap:4px;flex-wrap:wrap">${_chipsMuscTipo('Flexibilidade','var(--accent2)')}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;padding:6px 12px">
        <span style="font-size:12px;font-weight:700;color:var(--amber);min-width:80px;flex-shrink:0">Liberação</span>
        <div style="display:flex;gap:4px;flex-wrap:wrap">${_chipsMuscTipo('Liberação Miofascial','var(--amber)')}</div>
      </div>
    </div>
    <!-- tabela unificada -->
    ${tabelaAquecHtml}
    <!-- botão adicionar -->
    <div style="padding:5px 12px 8px;border-top:1px solid var(--border)">
      <button onclick="abrirPickerAdicionarAquecNovo('${aquecPickerId}',${ti})"
        style="font-size:12px;padding:3px 10px;border-radius:var(--radius);border:1px dashed var(--border);background:transparent;color:var(--text3);cursor:pointer;transition:all .15s"
        onmouseenter="this.style.borderColor='var(--accent)';this.style.color='var(--accent)'"
        onmouseleave="this.style.borderColor='var(--border)';this.style.color='var(--text3)'">+ Adicionar exercício</button>
      <div id="${aquecPickerId}" class="hidden" data-ti="${ti}" style="margin-top:6px"></div>
    </div>
  </div>`;

  // ── Parte Principal ──────────────────────────────────────────────────────
  const tiposAq = [...new Set(aquecimento.map(a => a.tipo).filter(Boolean))].join(' · ');
  const aquecAcc = prAcc('ph-fire', 'Aquecimento', aquecimento.length ? aquecimento.length + (aquecimento.length===1?' exercício':' exercícios') + (tiposAq ? ' · ' + tiposAq : '') : 'Sem exercícios', aquecimentoHtml, {cls:'pr-acc-aq', key:'aq-' + ti});
  cont.innerHTML = `
    <div id="sessao-info-box">${sessaoInfoHtml}</div>
    ${aquecAcc}
    <div style="border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:8px">
      <div style="font-size:12px;font-weight:700;color:var(--text2);padding:8px 12px;background:var(--bg3);border-bottom:1px solid var(--border)"><i class=ph-hand-fist></i> Parte Principal</div>
      <div id="cards-treino"></div>
      <div style="padding:5px 12px 8px;border-top:1px solid var(--border)">
        <button onclick="abrirPickerPrincipal(${ti},'picker-add-principal-${ti}')"
          style="font-size:12px;padding:3px 10px;border-radius:var(--radius);border:1px dashed var(--border);background:transparent;color:var(--text3);cursor:pointer;transition:all .15s"
          onmouseenter="this.style.borderColor='var(--accent2)';this.style.color='var(--accent2)'"
          onmouseleave="this.style.borderColor='var(--border)';this.style.color='var(--text3)'">+ Adicionar exercício</button>
        <div id="picker-add-principal-${ti}" class="hidden" data-ti="${ti}" style="margin-top:6px"></div>
      </div>
    </div>`;

  // ── Cards de exercício (novo layout) ────────────────────────────────────
  const cardsEl = $('cards-treino');
  const gruposInfo = _computarGruposExercicios(treino.exercicios);

  _injetarEstilosExcv2();

  treino.exercicios.forEach((ex, rowIdx) => {
    const info = gruposInfo[rowIdx];
    const podeSubir  = rowIdx > 0;
    const podeDescer = rowIdx < treino.exercicios.length - 1;
    // Pertence a um grupo (bi-set/tri-set/super-série)?
    const emGrupo = !!info;
    const podeSubirNoGrupo  = emGrupo && info.pos > 1;
    const podeDescerNoGrupo = emGrupo && info.pos < info.total;
    // Cabeça do grupo (ou solo, que é cabeça de um grupo-de-1) — só ela mostra
    // o botão de agrupar; "remover do grupo" fica disponível pra qualquer membro.
    const isHead = !emGrupo || info.pos === 1;
    const groupEndIdx = emGrupo ? rowIdx + (info.total - info.pos) : rowIdx;
    const temProximoParaAgrupar = isHead && groupEndIdx < treino.exercicios.length - 1;

    const dbExFull = DB_EXERCICIOS.find(e => e.n === ex.nome);
    const gruposRaw = (dbExFull?.g && dbExFull.g.length) ? dbExFull.g.map(g=>g.nome) : [ex.musculo];
    const corChip   = _corChipMusculo(gruposRaw[0]);
    const chipLabel = gruposRaw.map(_abreviaMusculo).join(' › ');
    const chipTitle = gruposRaw.join(' › ').replace(/"/g,'&quot;');
    const porcaoSafe = (ex.porcao==='Geral'||!ex.porcao)?'null':ex.porcao.replace(/'/g,'');
    const dropId  = `excv2-drop-${ti}-${rowIdx}`;
    const menuId  = `excv2-menu-${ti}-${rowIdx}`;
    const noteId  = `excv2-note-${ti}-${rowIdx}`;
    const obsOpen = ex._obsAberta ? '' : 'hidden';

    const videoBtn = (() => {
      const url = dbExFull?.url || '';
      if(!url) return `<button class="excv2-iconbtn excv2-video" title="Sem vídeo" disabled style="opacity:.3"><i class=ph-play></i></button>`;
      return `<button class="excv2-iconbtn excv2-video" title="Ver vídeo"
        onclick="abrirVideoModal('${url.replace(/'/g,"\\'")}','${ex.nome.replace(/'/g,"\\'")}')"><i class=ph-play></i></button>`;
    })();

    const card = document.createElement('div');
    card.style.cssText = `border-bottom:1px solid var(--border);${emGrupo?`border-left:1px solid ${_corGrupo(info.grupoIdx)};background:rgba(91,140,247,.025)`:'border-left:1px solid transparent'};overflow:visible`;

    card.innerHTML = `
      <!-- linha principal -->
      <div class="excv2-row">
        <span class="excv2-drag" title="Arrastar">⋮⋮</span>
        ${isHead ? `
        <div class="excv2-arrows">
          <button class="excv2-arr" title="${emGrupo?'Subir grupo':'Subir'}" ${podeSubir?`onclick="moverExercicio(${ti},${rowIdx},-1)"`:'disabled'}><i class=ph-caret-up></i></button>
          <button class="excv2-arr" title="${emGrupo?'Descer grupo':'Descer'}" ${groupEndIdx<treino.exercicios.length-1?`onclick="moverExercicio(${ti},${rowIdx},1)"`:'disabled'}><i class=ph-caret-down></i></button>
        </div>` : `<div class="excv2-arrows" style="visibility:hidden"><button class="excv2-arr"><i class=ph-caret-up></i></button><button class="excv2-arr"><i class=ph-caret-down></i></button></div>`}
        ${emGrupo ? `
        <span style="flex-shrink:0;font-size:12px;font-weight:700;padding:2px 7px;border-radius:10px;background:color-mix(in srgb, ${_corGrupo(info.grupoIdx)} 15%, transparent);color:color-mix(in srgb, ${_corGrupo(info.grupoIdx)} 62%, var(--text));white-space:nowrap" title="Grupo combinado sem descanso entre os exercícios"><i class=ph-link></i> ${_labelGrupo(info.total)} ${info.pos}/${info.total}</span>
        <div class="excv2-bisetreorder" style="flex-shrink:0">
          <button title="Subir dentro do grupo" ${podeSubirNoGrupo?`onclick="moverDentroDoGrupo(${ti},${rowIdx},-1)"`:'disabled'}><i class=ph-caret-up></i></button>
          <button title="Descer dentro do grupo" ${podeDescerNoGrupo?`onclick="moverDentroDoGrupo(${ti},${rowIdx},1)"`:'disabled'}><i class=ph-caret-down></i></button>
        </div>` : ''}
        <div class="excv2-nameblock">
          <span class="excv2-chip" style="background:${corChip.bg};color:${corChip.fg}" title="${chipTitle}">${chipLabel}</span>
          <div class="excv2-namewrap" id="excv2-nw-${ti}-${rowIdx}">
            <button class="excv2-namebtn" id="excv2-nb-${ti}-${rowIdx}"
              onclick="_toggleBuscaExercicio(${ti},${rowIdx},'${ex.musculo}','${porcaoSafe}')">
              <span class="nm">${escHTML(ex.nome)}</span>
              <span class="caret"><i class=ph-caret-down></i></span>
            </button>
            <!-- dropdown montado dinamicamente -->
            <div id="${dropId}" class="hidden"></div>
          </div>
        </div>
        <div class="excv2-ctrls">
        <div class="excv2-pg">
          <div class="excv2-plbl">Séries</div>
          <div class="excv2-pctrl">
            <input type="number" value="${escHTML(ex.series)}" min="1" max="10"
              onchange="atualizarCampo(${ti},${rowIdx},'series',+this.value)"
              onblur="atualizarCampo(${ti},${rowIdx},'series',+this.value)">
            <button class="excv2-pm mi" onclick="_pmExercicio(${ti},${rowIdx},'series',-1)">−</button>
            <button class="excv2-pm pl" onclick="_pmExercicio(${ti},${rowIdx},'series',1)">+</button>
          </div>
        </div>
        <div class="excv2-pg">
          <div class="excv2-plbl">Reps</div>
          <div class="excv2-pctrl">
            <input type="text" value="${escHTML(ex.reps)}"
              onblur="atualizarCampo(${ti},${rowIdx},'reps',this.value)">
            <button class="excv2-pm mi" onclick="_pmExercicio(${ti},${rowIdx},'reps',-1)">−</button>
            <button class="excv2-pm pl" onclick="_pmExercicio(${ti},${rowIdx},'reps',1)">+</button>
          </div>
        </div>
        <div class="excv2-pg">
          <div class="excv2-plbl">Intervalo</div>
          <div class="excv2-pctrl">
            <input type="text" value="${escHTML(ex.intervalo)}"
              onblur="atualizarCampo(${ti},${rowIdx},'intervalo',this.value)">
            <button class="excv2-pm mi" onclick="_pmExercicio(${ti},${rowIdx},'intervalo',-1)">−</button>
            <button class="excv2-pm pl" onclick="_pmExercicio(${ti},${rowIdx},'intervalo',1)">+</button>
          </div>
        </div>
        </div>
        ${videoBtn}
        <div style="position:relative;flex-shrink:0">
          <button class="excv2-iconbtn excv2-more" id="excv2-morebtn-${ti}-${rowIdx}"
            onclick="_toggleMenuExercicio(${ti},${rowIdx})" title="Mais opções">⋮</button>
          <div id="${menuId}" class="excv2-omenu hidden">
            <div class="excv2-oi" onclick="_toggleObsExercicio(${ti},${rowIdx})"><span><i class=ph-note-pencil></i></span> Observação</div>
            ${dbExFull?.url ? `<div class="excv2-oi mv" onclick="abrirVideoModal('${dbExFull.url.replace(/'/g,"\\'")}','${ex.nome.replace(/'/g,"\\'")}')"><span><i class=ph-play></i></span> Ver vídeo</div>` : ''}
            ${isHead && podeSubir ? `<div class="excv2-oi mv" onclick="moverExercicio(${ti},${rowIdx},-1)"><span><i class=ph-arrow-up></i></span> ${emGrupo?'Subir grupo':'Subir'}</div>` : ''}
            ${isHead && groupEndIdx<treino.exercicios.length-1 ? `<div class="excv2-oi mv" onclick="moverExercicio(${ti},${rowIdx},1)"><span><i class=ph-arrow-down></i></span> ${emGrupo?'Descer grupo':'Descer'}</div>` : ''}
            ${podeSubirNoGrupo ? `<div class="excv2-oi mv" onclick="moverDentroDoGrupo(${ti},${rowIdx},-1)"><span><i class=ph-arrow-up></i></span> Subir no grupo</div>` : ''}
            ${podeDescerNoGrupo ? `<div class="excv2-oi mv" onclick="moverDentroDoGrupo(${ti},${rowIdx},1)"><span><i class=ph-arrow-down></i></span> Descer no grupo</div>` : ''}
            ${temProximoParaAgrupar ? `<div class="excv2-oi delink"
              onclick="agruparProximo(${ti},${rowIdx})"><span><i class=ph-link></i></span> ${_labelGrupo((emGrupo?info.total:1)+1)} (agrupar)</div>` : ''}
            ${emGrupo ? `<div class="excv2-oi" onclick="removerDoGrupo(${ti},${rowIdx})"><span><i class=ph-lock-open></i></span> Remover do grupo</div>` : ''}
            <div class="excv2-oi danger" onclick="_removerExercicio(${ti},${rowIdx})"><span><i class=ph-trash></i></span> Remover</div>
          </div>
        </div>
      </div>
      <!-- observação (toggle) -->
      <div id="${noteId}" class="${obsOpen}">
        <div class="excv2-notearea">
          <textarea class="excv2-noteinput" rows="2" placeholder="Observação clínica / instrução para o aluno…"
            onblur="atualizarCampo(${ti},${rowIdx},'nota_clinica',this.value)">${ex.nota_clinica||''}</textarea>
        </div>
      </div>`;

    cardsEl.appendChild(card);
  });
}

// ── Agrupamento de exercícios (bi-set / tri-set / super-série) ─────────────
// Modelo: cada exercício pode ter `_vinculadoProximo=true`, o que significa
// "este exercício forma um bloco combinado com o PRÓXIMO da lista". Um grupo
// é, portanto, uma sequência contígua de exercícios encadeados assim — não
// existe um "id de grupo" salvo à parte, é só a posição + o flag, igual à
// forma como o personal pensa: "esses eu fiz um atrás do outro, sem descanso
// entre eles".
// Reordenação (2026-09-16): `moverExercicio` (setas gerais) e
// `moverDentroDoGrupo` (setas dentro do grupo) tratam o grupo como bloco
// fechado — mover um exercício de fora nunca entra no meio de um grupo
// existente, e mover um membro pra dentro/fora do grupo é feito só por
// `agruparProximo`/`removerDoGrupo`, nunca pela troca de posição.
function _computarGruposExercicios(exercicios){
  const membroInfo = {};
  let grupoAtual = null, grupoIdx = -1;
  exercicios.forEach((ex, i) => {
    if(grupoAtual === null) grupoAtual = [i];
    else grupoAtual.push(i);
    const ultimoDoTreino = i === exercicios.length - 1;
    if(!ex._vinculadoProximo || ultimoDoTreino){
      if(grupoAtual.length > 1){
        grupoIdx++;
        grupoAtual.forEach((idx, pos) => { membroInfo[idx] = { pos: pos+1, total: grupoAtual.length, grupoIdx }; });
      }
      grupoAtual = null;
    }
  });
  return membroInfo;
}

const _CORES_GRUPO = ['var(--amber)','var(--blue)','#9b59b6','var(--accent)','#e74c3c','#1abc9c'];
function _corGrupo(idx){ return _CORES_GRUPO[idx % _CORES_GRUPO.length]; }
// Nome do agrupamento pelo tamanho: 2 = Bi-set, 3 = Tri-set, 4+ = Super-série.
function _labelGrupo(total){
  if(total <= 2) return 'Bi-set';
  if(total === 3) return 'Tri-set';
  return 'Super-série';
}

// ── Helpers novos cards exercício (excv2) ─────────────────────────────────────

// Chip de músculo — cor distinta por grupo principal
function _corChipMusculo(musculo){
  const m = (musculo||'').toLowerCase();
  // Tom-base por grupo; texto = tom misturado ao texto do tema (contraste em claro e escuro).
  const mk = c => ({ bg:'color-mix(in srgb, '+c+' 15%, transparent)', fg:'color-mix(in srgb, '+c+' 62%, var(--text))' });
  if(/peit/.test(m))                       return mk('#3b82f6');
  if(/cost|lat|dorsal/.test(m))            return mk('#0d9488');
  if(/ombr|delt/.test(m))                  return mk('#9333ea');
  if(/bíc|bic|trí|tri|anteb/.test(m))     return mk('#ea580c');
  if(/ísq|isq/.test(m))                    return mk('#16a34a');
  if(/glút|glut|abdut|adut/.test(m))       return mk('#65a30d');
  if(/quad/.test(m))                       return mk('#dc2626');
  if(/abd|core|reto/.test(m))              return mk('#d97706');
  if(/pant|gast|sol/.test(m))             return mk('#64748b');
  return {bg:'var(--bg4)',fg:'var(--text2)'};
}

// Abrevia nome de grupo muscular pra caber na tag (mesmas abreviações usadas há tempo pro chip)
function _abreviaMusculo(nome){
  return (nome||'').replace('Isquiossurais','Isquio').replace('RetoAbdominal','Abd.').replace('Panturrilhas','Pant.');
}

// Incrementa/decrementa série, reps ou intervalo sem re-render completo
function _pmExercicio(ti, rowIdx, campo, delta){
  const treino = _s3.fichaObj?.treinos[ti]; if(!treino) return;
  const ex = treino.exercicios[rowIdx]; if(!ex) return;
  if(campo === 'series'){
    ex.series = Math.max(1, Math.min(10, (parseInt(ex.series)||1) + delta));
  } else if(campo === 'reps'){
    const m = String(ex.reps).match(/^(\d+)/);
    if(!m) return;
    ex.reps = String(Math.max(1, parseInt(m[1]) + delta));
  } else if(campo === 'intervalo'){
    const m = String(ex.intervalo).match(/^(\d+)/);
    if(!m) return;
    const suf = String(ex.intervalo).replace(/^\d+/, '');
    ex.intervalo = String(Math.max(15, parseInt(m[1]) + delta * 15)) + suf;
  }
  // Atualizar input direto (sem full re-render)
  const btn = document.getElementById(`excv2-nb-${ti}-${rowIdx}`);
  const row = btn?.closest('.excv2-row');
  const card = row?.parentElement;
  if(card){
    const inputs = card.querySelectorAll('.excv2-pctrl input');
    if(campo==='series'   && inputs[0]) inputs[0].value = ex.series;
    if(campo==='reps'     && inputs[1]) inputs[1].value = ex.reps;
    if(campo==='intervalo'&& inputs[2]) inputs[2].value = ex.intervalo;
  }
  _atualizarInfoAoVivo();
}

// ── Recalcula ao vivo os painéis de série/tempo/volume sem full re-render ──
function _atualizarInfoAoVivo(){
  const f = _s3.fichaObj; if(!f) return;
  const treino = f.treinos[_s3.treinoAtivo]; if(!treino) return;
  const box = document.getElementById('sessao-info-box');
  if(box){
    const obj = selectedObj || getUltimoTreino(getActive()).objetivo || 'Saude';
    box.innerHTML = _htmlSessaoInfo(treino, f, obj);
  }
  renderPreviewVolSemanal();
}

// ── Ancoragem de dropdown flutuante ────────────────────────────────────────
// Motivo: os cards ficam dentro de um box com overflow:hidden, então qualquer
// dropdown position:absolute é cortado na borda do box. Aqui o painel vira
// position:fixed, ancorado ao botão pelo rect da viewport — escapa de todo
// overflow, vira pra cima quando não há espaço abaixo, e é reposicionado em
// scroll/resize enquanto está aberto. Sempre chamar _desancorarDrop() ao
// fechar, senão o display:flex inline vence a classe .hidden.
function _ancorarDropFixo(dropEl, anchorEl, opts){
  if(!dropEl || !anchorEl) return;
  const o        = opts || {};
  const minW     = o.minWidth || 260;
  const scrollEl = o.scrollEl || null;
  const alinhaDir= !!o.alinharDireita;
  const MARGEM = 10, MIN_ABAIXO = 180;

  if(dropEl._cssOrig == null) dropEl._cssOrig = dropEl.style.cssText;
  if(scrollEl){
    scrollEl.style.maxHeight  = 'none';
    scrollEl.style.flex       = '1 1 auto';
    scrollEl.style.minHeight  = '0';
    scrollEl.style.overflowY  = 'auto';
  }

  const aplicar = () => {
    if(dropEl.classList.contains('hidden')) return;
    const r = anchorEl.getBoundingClientRect();
    const w = Math.min(Math.max(r.width, minW), window.innerWidth - MARGEM * 2);
    let left = alinhaDir ? (r.right - w) : r.left;
    if(left + w > window.innerWidth - MARGEM) left = window.innerWidth - MARGEM - w;
    if(left < MARGEM) left = MARGEM;

    const abaixo   = window.innerHeight - r.bottom - MARGEM;
    const acima    = r.top - MARGEM;
    const paraCima = abaixo < MIN_ABAIXO && acima > abaixo;

    dropEl.classList.add('fx-anchored');
    dropEl.style.position      = 'fixed';
    dropEl.style.left          = left + 'px';
    dropEl.style.right         = 'auto';
    dropEl.style.width         = w + 'px';
    dropEl.style.zIndex        = '9000';
    dropEl.style.display       = 'flex';
    dropEl.style.flexDirection = 'column';
    dropEl.style.overflow      = 'hidden';
    if(paraCima){
      dropEl.style.top       = 'auto';
      dropEl.style.bottom    = (window.innerHeight - r.top + 4) + 'px';
      dropEl.style.maxHeight = Math.max(140, acima) + 'px';
    }else{
      dropEl.style.bottom    = 'auto';
      dropEl.style.top       = (r.bottom + 4) + 'px';
      dropEl.style.maxHeight = Math.max(140, abaixo) + 'px';
    }
  };

  aplicar();
  const onMove = () => aplicar();
  window.addEventListener('scroll', onMove, true);
  window.addEventListener('resize', onMove);
  dropEl._desancorar = () => {
    window.removeEventListener('scroll', onMove, true);
    window.removeEventListener('resize', onMove);
    dropEl.classList.remove('fx-anchored');
    dropEl.style.cssText = dropEl._cssOrig || '';
    dropEl._desancorar = null;
  };
}

// Remove a ancoragem fixed (obrigatório antes de esconder o painel)
function _desancorarDrop(el){
  if(el && el._desancorar) el._desancorar();
}

// Fecha todos os dropdowns e menus de exercício abertos
function _fecharTodosExcv2(){
  document.querySelectorAll('[id^="excv2-drop-"]').forEach(el => { _desancorarDrop(el); el.classList.add('hidden'); });
  document.querySelectorAll('[id^="excv2-menu-"]').forEach(el => { _desancorarDrop(el); el.classList.add('hidden'); });
  if(window._excv2OutsideHandler){
    document.removeEventListener('click', window._excv2OutsideHandler, true);
    window._excv2OutsideHandler = null;
  }
}

// Toggle busca de exercício — dropdown flutuante com pesquisa + filtros
function _toggleBuscaExercicio(ti, rowIdx, musculo, porcaoStr){
  const dropEl = document.getElementById(`excv2-drop-${ti}-${rowIdx}`);
  if(!dropEl) return;
  const isOpen = !dropEl.classList.contains('hidden');
  _fecharTodosExcv2();
  if(isOpen) return; // já estava aberto → basta fechar

  const porcao = (porcaoStr === 'null' || !porcaoStr) ? null : porcaoStr;
  const s    = getActive();
  const nivel = val('pr-nivel') || s?.anamnese?.nivel || 'Inic';
  const local  = val('pr-local') || s?.anamnese?.local || '';
  const lesoes = (s?.perfil?.lesoes||'') + ' ' + (s?.anamnese?.preferencias||'');
  const resist = getEquipamentosPermitidos(local);

  let poolBase = filtrarExerciciosFicha(musculo, porcao, resist, nivel, lesoes);
  if(!poolBase.length) poolBase = filtrarExerciciosFicha(musculo, null, resist, nivel, lesoes);
  // A escada de fallback PARA AQUI (2026-09-08). Havia um terceiro degrau —
  // DB_EXERCICIOS.filter(grupo) — que derrubava nível E equipamento de uma vez:
  // iniciante em local sem equipamento podia receber exercício avançado no cabo,
  // sem nenhuma pista na tela. Nível e local são cortes DUROS. Quando não sobra
  // nada, o grupo já foi travado em aplicarDisponibilidadeGrupos().

  const { bloqueios, prioridades } = extrairFlagsClinicas();
  const pool = poolBase.map(e => {
    for(const f of bloqueios){ const r=FLAGS_FILTRO[f]; if(r?.bloqueio(e)) return {...e,_status:'bloqueado',_motivo:r.motivo}; }
    for(const p of prioridades){ const fn=FLAGS_PRIORIDADE[p]; if(fn&&fn(e)) return {...e,_status:'prioritario',_motivo:p}; }
    if(bloqueios.includes('BaixoImpacto')&&_exercicioAltoImpacto(e)) return {...e,_status:'nao_recomendado',_motivo:'Alto impacto'};
    return {...e,_status:'ok',_motivo:''};
  }).sort((a,b)=>{
    const o={prioritario:0,ok:1,nao_recomendado:2,bloqueado:3};
    return (o[a._status]||1)-(o[b._status]||1);
  });

  // View padrão do dropdown = mesmo corte da seleção automática (Força/Potência,
  // ver _TIPOS_SELECAO_AUTOMATICA) — a linha já tem grupo muscular fixado, então
  // trocar o exercício aqui é sempre "outro exercício de força pra esse grupo".
  // Pool completo (todos os tipos) fica guardado em _poolCompleto pro botão
  // ⚙ Filtros alargar a busca quando o personal quiser ver mobilidade/estabilidade/etc.
  let poolPadrao = pool.filter(e => (e.tp||[]).some(t => _TIPOS_SELECAO_AUTOMATICA.includes(t.chave)));
  if(!poolPadrao.length) poolPadrao = pool;

  // Montar estrutura do dropdown
  dropEl.className = 'excv2-sdrop';
  dropEl.style.cssText = '';
  dropEl.innerHTML = `
    <div class="excv2-sbar">
      <input id="excv2-srch-${ti}-${rowIdx}" type="text" placeholder="Buscar…"
        style="flex:1;background:var(--bg2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:inherit;font-size:12px;padding:4px 8px;outline:none"
        oninput="_filtrarDropExercicio(${ti},${rowIdx},this.value)">
      <button style="background:var(--bg4);border:1px solid var(--border);border-radius:6px;color:var(--text2);font-size:12px;padding:4px 8px;cursor:pointer;white-space:nowrap;font-family:inherit;transition:all .12s"
        onclick="event.stopPropagation();_abrirFiltroExercicioModal('excv2-drop-${ti}-${rowIdx}',${ti},${rowIdx})"><i class=ph-gear></i> Filtros</button>
    </div>
    <div id="excv2-res-${ti}-${rowIdx}" style="overflow-y:auto;padding:4px 0"></div>`;

  dropEl._pool = poolPadrao;
  dropEl._poolCompleto = pool;
  _renderDropResults(ti, rowIdx, poolPadrao);

  // Ancorar como fixed no botão do nome — escapa do overflow:hidden do box
  _ancorarDropFixo(dropEl, document.getElementById(`excv2-nb-${ti}-${rowIdx}`) || dropEl.parentElement, {
    minWidth: 300,
    scrollEl: document.getElementById(`excv2-res-${ti}-${rowIdx}`)
  });

  setTimeout(() => { document.getElementById(`excv2-srch-${ti}-${rowIdx}`)?.focus(); }, 40);

  window._excv2OutsideHandler = function(e){
    const nw = document.getElementById(`excv2-nw-${ti}-${rowIdx}`);
    const modal = document.getElementById('excv2-fmodal-overlay');
    if(modal && modal.contains(e.target)) return; // dentro do modal de filtros → não fechar
    if(nw && !nw.contains(e.target)) _fecharTodosExcv2();
  };
  document.addEventListener('click', window._excv2OutsideHandler, true);
}

// Renderiza resultados no dropdown (aceita pool filtrado)
function _renderDropResults(ti, rowIdx, pool){
  const res = document.getElementById(`excv2-res-${ti}-${rowIdx}`);
  if(!res) return;
  res.innerHTML = '';
  if(!pool.length){
    res.innerHTML = '<div style="font-size:12px;color:var(--text3);padding:8px 12px">Nenhum exercício encontrado</div>';
    return;
  }
  // Favorito sobe pro topo DENTRO do próprio tier de status clínico — status
  // clínico nunca perde pra favorito (segurança primeiro).
  const _ordemStatus = {prioritario:0, ok:1, nao_recomendado:2, bloqueado:3};
  const poolOrdenado = [...pool].sort((a,b) => {
    const oa = _ordemStatus[a._status] ?? 1, ob = _ordemStatus[b._status] ?? 1;
    if(oa !== ob) return oa - ob;
    return (ehFavorito(b.id)?1:0) - (ehFavorito(a.id)?1:0);
  });
  poolOrdenado.forEach(e => {
    const isBloq   = e._status === 'bloqueado';
    const isPrio   = e._status === 'prioritario';
    const isNaoRec = e._status === 'nao_recomendado';
    const div = document.createElement('div');
    div.style.cssText = `padding:5px 12px;font-size:12px;cursor:${isBloq?'not-allowed':'pointer'};opacity:${isBloq?.5:1};` +
      `color:${isBloq?'var(--text3)':'var(--text2)'};border-left:1px solid ${isPrio?'var(--accent)':isBloq?'var(--red-line)':isNaoRec?'rgba(255,180,50,.5)':'transparent'};` +
      `padding-left:${isPrio||isBloq||isNaoRec?14:12}px;transition:background .1s`;
    const icone = isPrio?'<i class=sd-green></i> ':isBloq?'<i class=sd-red></i> ':isNaoRec?'<i class=sd-amber></i> ':'';
    const tag_url = e.url
      ? `<span data-url="${e.url}" data-nome="${(e.n||'').replace(/"/g,'&quot;')}"
          onclick="event.stopPropagation();abrirVideoModal(this.dataset.url,this.dataset.nome)"
          style="font-size:12px;color:var(--accent);margin-left:4px;cursor:pointer"><i class=ph-play></i></span>` : '';
    const tag_fav = `<span data-exid="${e.id}" onclick="event.stopPropagation();toggleFavorito(${e.id},this)"
        style="font-size:12px;margin-left:4px;cursor:pointer;opacity:.8" title="${ehFavorito(e.id)?'Remover favorito':'Favoritar exercício'}">${ehFavorito(e.id)?'<span style="color:var(--amber);display:inline-flex"><i class=ph-star></i></span>':'<i class=ph-star></i>'}</span>`;
    const tag_motivo = (isBloq||isPrio||isNaoRec)&&e._motivo
      ? `<div style="font-size:12px;color:${isBloq?'var(--red)':isNaoRec?'var(--amber)':'var(--accent)'};opacity:.8">${e._motivo.split('—')[0].trim()}</div>` : '';
    div.innerHTML = `${icone}${e.n}${tag_url}${tag_fav}${tag_motivo}`;
    if(!isBloq){
      div.addEventListener('mouseover', function(){ this.style.background='var(--bg3)'; });
      div.addEventListener('mouseout',  function(){ this.style.background=''; });
      div.addEventListener('click', function(ev){
        ev.stopPropagation();
        _fecharTodosExcv2();
        selecionarExercicio(ti, rowIdx, e.n, null);
      });
    }
    res.appendChild(div);
  });
}

// Filtra resultados por texto (accent-insensitive, partial match, multi-word)
function _filtrarDropExercicio(ti, rowIdx, query){
  const dropEl = document.getElementById(`excv2-drop-${ti}-${rowIdx}`);
  if(!dropEl?._pool) return;
  const words = normalizarTexto(query).split(/\s+/).filter(Boolean);
  const filtrado = !words.length ? dropEl._pool : dropEl._pool.filter(e => {
    const nm = normalizarTexto(e.n);
    return words.every(w => nm.includes(w));
  });
  _renderDropResults(ti, rowIdx, filtrado);
}

// Modal de filtros avançados (overlay centrado fixo)
function _abrirFiltroExercicioModal(dropId, ti, rowIdx){
  if(document.getElementById('excv2-fmodal-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'excv2-fmodal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.48);display:flex;align-items:center;justify-content:center';

  const dropEl = document.getElementById(dropId);
  // Opções vêm do pool COMPLETO (todos os tipos) — mesmo com a view padrão
  // restrita a Força/Potência, o modal precisa oferecer "Mobilidade",
  // "Estabilidade" etc. pra quem quiser alargar a busca manualmente.
  const pool   = dropEl?._poolCompleto || dropEl?._pool || [];
  const uq = arr => [...new Set(arr.filter(Boolean))].sort();
  const grupos  = uq(pool.flatMap(e=>(e.g||[]).map(g=>g.nome)));
  const equips  = uq(pool.flatMap(e=>(e.eq||[]).map(q=>q.nome)));
  const niveis  = uq(pool.map(e=>e.nv?.nome));
  const laterais= uq(pool.map(e=>e.lateralidade?.nome));
  const padroes = uq(pool.map(e=>e.pad?.nome));
  const tipos   = uq(pool.flatMap(e=>(e.tp||[]).map(t=>t.nome)));

  const opts = arr => arr.map(v=>`<option value="${v.replace(/"/g,'&quot;')}">${v}</option>`).join('');
  const sel  = (id, arr) => `<select id="${id}" class="excv2-fsel"><option value="">Todos</option>${opts(arr)}</select>`;

  overlay.innerHTML = `
    <div class="excv2-fmodal" style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:18px 20px;width:min(400px,92vw);max-height:80vh;overflow-y:auto;box-shadow:0 16px 48px rgba(0,0,0,.45)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <span style="font-size:13px;font-weight:700;color:var(--text)"><i class=ph-gear></i> Filtros avançados</span>
        <button onclick="document.getElementById('excv2-fmodal-overlay').remove()"
          style="background:none;border:none;color:var(--text3);font-size:17px;cursor:pointer;line-height:1;padding:0"><i class=ph-x></i></button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        <div><div class="excv2-flbl">Nível</div>${sel('excv2-fn-nivel',niveis)}</div>
        <div><div class="excv2-flbl">Lateralidade</div>${sel('excv2-fn-lat',laterais)}</div>
        <div><div class="excv2-flbl">Equipamento</div>${sel('excv2-fn-eq',equips)}</div>
        <div><div class="excv2-flbl">Padrão mov.</div>${sel('excv2-fn-pad',padroes)}</div>
        <div><div class="excv2-flbl">Tipo de exercício</div>${sel('excv2-fn-tp',tipos)}</div>
        <div style="grid-column:1/-1"><div class="excv2-flbl">Grupo muscular</div>${sel('excv2-fn-grp',grupos)}</div>
      </div>
      <div style="font-size:12px;color:var(--text3);margin:-8px 0 14px">Por padrão a busca já vem limitada a Força/Potência — use "Tipo de exercício" pra ver Mobilidade, Estabilidade etc.</div>
      <div class="excv2-ffoot">
        <button class="excv2-fbtn-clear" onclick="_limparFiltroExercicioModal()">Limpar</button>
        <button class="excv2-fbtn-apply" onclick="_aplicarFiltroExercicioModal('${dropId}',${ti},${rowIdx})">Aplicar</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if(e.target===overlay) overlay.remove(); });
}

function _limparFiltroExercicioModal(){
  ['excv2-fn-nivel','excv2-fn-lat','excv2-fn-eq','excv2-fn-pad','excv2-fn-tp','excv2-fn-grp']
    .forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
}

function _aplicarFiltroExercicioModal(dropId, ti, rowIdx){
  const get = id => (document.getElementById(id)?.value||'');
  const nivel=get('excv2-fn-nivel'), lat=get('excv2-fn-lat'),
        eq=get('excv2-fn-eq'), pad=get('excv2-fn-pad'), tp=get('excv2-fn-tp'), grp=get('excv2-fn-grp');
  const dropEl = document.getElementById(dropId);
  // Parte do pool COMPLETO — modal é o único jeito de alargar além do padrão
  // Força/Potência (ver _toggleBuscaExercicio).
  let pool = dropEl?._poolCompleto || dropEl?._pool || [];
  if(nivel) pool = pool.filter(e=>e.nv?.nome===nivel);
  if(lat)   pool = pool.filter(e=>e.lateralidade?.nome===lat);
  if(eq)    pool = pool.filter(e=>(e.eq||[]).some(q=>q.nome===eq));
  if(pad)   pool = pool.filter(e=>e.pad?.nome===pad);
  if(tp)    pool = pool.filter(e=>(e.tp||[]).some(t=>t.nome===tp));
  if(grp)   pool = pool.filter(e=>(e.g||[]).some(g=>g.nome===grp));
  document.getElementById('excv2-fmodal-overlay')?.remove();
  _renderDropResults(ti, rowIdx, pool);
  // re-abrir dropdown após fechar modal
  const dropEl2 = document.getElementById(dropId);
  if(dropEl2) dropEl2.classList.remove('hidden');
}

// Toggle menu de opções (⋮)
function _toggleMenuExercicio(ti, rowIdx){
  const menuEl = document.getElementById(`excv2-menu-${ti}-${rowIdx}`); if(!menuEl) return;
  const isOpen = !menuEl.classList.contains('hidden');
  document.querySelectorAll('[id^="excv2-menu-"]').forEach(el=>{ _desancorarDrop(el); el.classList.add('hidden'); });
  if(!isOpen){
    menuEl.classList.remove('hidden');
    _ancorarDropFixo(menuEl, document.getElementById(`excv2-morebtn-${ti}-${rowIdx}`) || menuEl.parentElement,
      { minWidth: 160, alinharDireita: true });
  }
}

// Toggle textarea de observação
function _toggleObsExercicio(ti, rowIdx){
  const treino = _s3.fichaObj?.treinos[ti]; if(!treino) return;
  const ex = treino.exercicios[rowIdx]; if(!ex) return;
  ex._obsAberta = !ex._obsAberta;
  document.getElementById(`excv2-note-${ti}-${rowIdx}`)?.classList.toggle('hidden', !ex._obsAberta);
  const _mn = document.getElementById(`excv2-menu-${ti}-${rowIdx}`);
  if(_mn){ _desancorarDrop(_mn); _mn.classList.add('hidden'); }
}

// Remove exercício da sessão
function _removerExercicio(ti, rowIdx){
  const treino = _s3.fichaObj?.treinos[ti]; if(!treino) return;
  treino.exercicios.splice(rowIdx, 1);
  // Garante que item anterior não aponte para o vazio se era o último
  if(rowIdx > 0 && treino.exercicios[rowIdx-1]?._vinculadoProximo && rowIdx >= treino.exercicios.length){
    treino.exercicios[rowIdx-1]._vinculadoProximo = false;
  }
  renderTreinoAtivo();
}

// Move item de aquecimento ▲▼
function moverAquecimento(ti, ai, dir){
  const treino = _s3.fichaObj?.treinos[ti]; if(!treino?.aquecimento) return;
  const alvo = ai + dir;
  if(alvo < 0 || alvo >= treino.aquecimento.length) return;
  [treino.aquecimento[ai], treino.aquecimento[alvo]] = [treino.aquecimento[alvo], treino.aquecimento[ai]];
  renderTreinoAtivo();
}

// Incrementa/decrementa duração do aquecimento em passos de 15s
function _pmAquecimento(ti, ai, delta){
  const treino = _s3.fichaObj?.treinos[ti]; if(!treino?.aquecimento) return;
  const item = treino.aquecimento[ai]; if(!item) return;
  const m = String(item.duracao).match(/^(\d+)/); if(!m) return;
  const suf = String(item.duracao).replace(/^\d+/,'');
  item.duracao = String(Math.max(15, parseInt(m[1]) + delta * 15)) + suf;
  const inp = document.getElementById(`aqv2-dur-${ti}-${ai}`);
  if(inp) inp.value = item.duracao;
}

// ── Tempo estimado de treino (Fase F) ───────────────────────────────────────
// Calcula com os exercícios JÁ escolhidos (usa `_tempoRep`/`_uni` guardados na
// geração — ver gerarFichaMotorV2). Não precisa ser exato, precisa ser útil:
// dá uma referência de quanto a sessão deve durar frente ao tempo disponível
// que o aluno informou.

// Extrai a média de uma faixa tipo "10–15", "60–90s", "15+" (abre mão do "+").
function parseFaixaMedia(str){
  if(!str) return 0;
  const nums = String(str).replace(',', '.').match(/[\d.]+/g);
  if(!nums || !nums.length) return 0;
  const valores = nums.map(Number);
  return valores.reduce((a,b)=>a+b, 0) / valores.length;
}

const TEMPO_ISOMETRICO_PADRAO_SEG = 60; // "usa 60 segundos por enquanto, depois refino" — banco ainda não tem seg/rep pra isométricos

// Blocos de execução de UMA série do exercício (reps × seg/rep, ou o padrão
// isométrico). Um exercício normal (Bilateral / Bilateral com Carga
// Unilateral) é 1 bloco só; um exercício Unilateral vira 2 blocos (um por
// lado, mesmo tempo cada) — é assim que a "dobra" de tempo entra na conta,
// e cada bloco extra gera uma TROCA (ver calcularTempoEstimadoTreino).
function _blocosExecucao(ex){
  const reps = parseFaixaMedia(ex.reps);
  // Isométrico detectado pelo campo `contracao` (Pico de Contração ===
  // "Isométrica"), direto da planilha oficial.
  const tempoBloco = ex._contracaoIsometrica
    ? TEMPO_ISOMETRICO_PADRAO_SEG
    : reps * (parseFloat(ex._tempoRep) || 4); // fallback se o exercício não tiver `tempo` cadastrado
  return ex._uni ? [tempoBloco, tempoBloco] : [tempoBloco];
}

// Tempo total estimado do treino, em segundos e minutos — Momento 2 (tela de
// seleção de exercício, exercícios já escolhidos). Regra fechada e validada
// com o Milton em 2026-08-29 (planilha linha a linha, 6 cenários reais,
// bateu 100%): dentro de um grupamento (bi-set/tri-set via
// `_vinculadoProximo`/_computarGruposExercicios, ou um exercício solo),
// TROCA (30s) acontece entre cada bloco de execução — troca de exercício no
// biset/triset OU troca de lado num Unilateral, mesmo valor pros dois casos.
// DESCANSO (o intervalo prescrito pro grupamento) entra só UMA vez, depois
// do ÚLTIMO bloco, repetido a cada série (não só entre séries).
function calcularTempoEstimadoTreino(treino){
  if(!treino?.exercicios?.length) return { segundos: 0, minutos: 0 };
  const gruposInfo = _computarGruposExercicios(treino.exercicios);
  let totalSegundos = 0;
  let i = 0;
  while(i < treino.exercicios.length){
    const info = gruposInfo[i];
    const ehGrupamento = info && info.pos === 1;
    const membros = ehGrupamento ? treino.exercicios.slice(i, i + info.total) : [treino.exercicios[i]];

    const series = Math.max(...membros.map(m => parseInt(m.series) || 1));
    const descanso = membros.reduce((acc, m) => acc + parseFaixaMedia(m.intervalo), 0) / membros.length;

    const blocos = membros.flatMap(_blocosExecucao);
    const execucaoPorSerie = blocos.reduce((a, b) => a + b, 0);
    const trocasPorSerie = Math.max(0, blocos.length - 1) * TEMPO_TROCA_SEG;

    totalSegundos += series * (execucaoPorSerie + trocasPorSerie + descanso);
    i += ehGrupamento ? info.total : 1;
  }
  return { segundos: Math.round(totalSegundos), minutos: Math.round(totalSegundos / 60) };
}

// Agrupa o exercício imediatamente após o fim do grupo atual (ou, se `rowIdx`
// for solo, agrupa com o próximo direto) — só é chamado a partir da CABEÇA do
// grupo (única que mostra o botão na UI), então sempre "puxa" o próximo pra
// dentro do grupo existente, nunca cria um vínculo solto no meio da lista.
function agruparProximo(ti, rowIdx){
  const treino = _s3.fichaObj?.treinos[ti]; if(!treino) return;
  const arr = treino.exercicios;
  const info = _computarGruposExercicios(arr)[rowIdx];
  const groupEndIdx = info ? rowIdx + (info.total - info.pos) : rowIdx;
  if(groupEndIdx >= arr.length - 1) return; // não há próximo exercício pra puxar
  arr[groupEndIdx]._vinculadoProximo = true;
  renderTreinoAtivo();
}

// Remove UM exercício do grupo a que pertence, reinserindo-o logo depois do
// grupo (que fecha com um membro a menos) — sem deixar buraco nem duplicar.
// Funciona pra cabeça, meio ou última posição do grupo:
//  - remover do MEIO: os vizinhos ficam automaticamente adjacentes um do outro
//    no array, então a flag de quem ficou antes já continua válida (aponta pro
//    índice seguinte, que agora é o outro membro) — não precisa mexer em nada.
//  - remover a CABEÇA: o segundo membro vira a nova cabeça, sem mudar flag.
//  - remover o ÚLTIMO: o penúltimo perde o vínculo (`_vinculadoProximo=false`),
//    porque ele passa a ser o novo último do grupo encolhido.
function removerDoGrupo(ti, rowIdx){
  const treino = _s3.fichaObj?.treinos[ti]; if(!treino) return;
  const arr = treino.exercicios;
  const info = _computarGruposExercicios(arr)[rowIdx]; if(!info) return; // não está em grupo
  const groupStart = rowIdx - (info.pos - 1);
  const groupEnd   = groupStart + info.total - 1;
  if(rowIdx === groupEnd && groupEnd > groupStart){
    arr[rowIdx-1]._vinculadoProximo = false;
  }
  const [removido] = arr.splice(rowIdx, 1);
  removido._vinculadoProximo = false;
  arr.splice(groupEnd, 0, removido); // groupEnd (índice original) já é a posição certa pós-remoção
  renderTreinoAtivo();
}

// Move um "slot" da lista pra cima/baixo — um slot é um exercício solo OU um
// grupo (bi-set/tri-set/super-série) INTEIRO, tratado como bloco atômico.
// Funciona a partir de qualquer membro do grupo (não só a cabeça): sempre acha
// os limites do próprio grupo e do grupo/exercício vizinho antes de mover, então
// nunca quebra um grupo existente nem funde dois grupos sem querer.
function moverExercicio(ti, rowIdx, direcao){
  const treino = _s3.fichaObj?.treinos[ti]; if(!treino) return;
  const arr = treino.exercicios;
  const gruposInfo = _computarGruposExercicios(arr);
  const info = gruposInfo[rowIdx];
  const groupStart = info ? rowIdx - (info.pos - 1) : rowIdx;
  const groupEnd   = info ? groupStart + info.total - 1 : rowIdx; // fim do grupo — fixo, não depende de qual membro chamou
  const tamanho    = groupEnd - groupStart + 1;

  if(direcao < 0){
    if(groupStart === 0) return;
    const infoAnterior = gruposInfo[groupStart - 1];
    const prevStart = infoAnterior ? (groupStart - 1) - (infoAnterior.pos - 1) : groupStart - 1;
    const bloco = arr.splice(groupStart, tamanho);
    arr.splice(prevStart, 0, ...bloco);
  } else {
    if(groupEnd >= arr.length - 1) return;
    const infoProximo = gruposInfo[groupEnd + 1];
    const proximoTamanho = infoProximo ? infoProximo.total : 1;
    const bloco = arr.splice(groupStart, tamanho);
    arr.splice(groupStart + proximoTamanho, 0, ...bloco);
  }
  renderTreinoAtivo();
}

// Reordena DENTRO do grupo — troca dois membros de posição sem deixar nenhum
// sair do grupo (a seta trava nas pontas). Como o vínculo "eu ligo ao próximo
// índice" viaja junto com o objeto, um swap raso de posição confundiria quem
// liga com quem; por isso os membros são extraídos, reordenados como lista
// independente, e as flags são recalculadas do zero por posição (todos ligados
// ao próximo, exceto o último) antes de voltar pro array.
function moverDentroDoGrupo(ti, rowIdx, direcao){
  const treino = _s3.fichaObj?.treinos[ti]; if(!treino) return;
  const arr = treino.exercicios;
  const info = _computarGruposExercicios(arr)[rowIdx]; if(!info) return;
  const groupStart = rowIdx - (info.pos - 1);
  const posAtual = info.pos - 1;
  const posAlvo  = posAtual + direcao;
  if(posAlvo < 0 || posAlvo >= info.total) return;

  const membros = arr.slice(groupStart, groupStart + info.total);
  [membros[posAtual], membros[posAlvo]] = [membros[posAlvo], membros[posAtual]];
  membros.forEach((m, i) => { m._vinculadoProximo = i < membros.length - 1; });
  arr.splice(groupStart, info.total, ...membros);
  renderTreinoAtivo();
}

function abrirListaExercicios(ti, rowIdx, musculo, porcaoStr){
  const listId = `lista-ex-${ti}-${rowIdx}`;
  const listEl = $(listId); if(!listEl) return;
  const isOpen = !listEl.classList.contains('hidden');
  document.querySelectorAll('[id^="lista-ex-"]').forEach(el => el.classList.add('hidden'));
  if(isOpen) return;

  const s     = getActive();
  const nivel = val('pr-nivel') || s?.anamnese?.nivel || 'Inic';
  const local = val('pr-local') || s?.anamnese?.local || '';
  const lesoes = (s?.perfil?.lesoes||'') + ' ' + (s?.anamnese?.preferencias||'');
  const resist = getEquipamentosPermitidos(local);
  const porcao = (porcaoStr==='null'||!porcaoStr) ? null : porcaoStr;

  // Pool base (nível/recurso/ci)
  let poolBase = filtrarExerciciosFicha(musculo, porcao, resist, nivel, lesoes);
  if(!poolBase.length) poolBase = filtrarExerciciosFicha(musculo, null, resist, nivel, lesoes);
  // A escada de fallback PARA AQUI (2026-09-08). Havia um terceiro degrau —
  // DB_EXERCICIOS.filter(grupo) — que derrubava nível E equipamento de uma vez:
  // iniciante em local sem equipamento podia receber exercício avançado no cabo,
  // sem nenhuma pista na tela. Nível e local são cortes DUROS. Quando não sobra
  // nada, o grupo já foi travado em aplicarDisponibilidadeGrupos().

  // Aplicar status Camada 3 para exibição
  const { bloqueios, prioridades } = extrairFlagsClinicas();
  const poolComStatus = poolBase.map(e => {
    for(const flag of bloqueios){
      const regra = FLAGS_FILTRO[flag];
      if(regra?.bloqueio(e)) return { ...e, _status:'bloqueado', _motivo: regra.motivo };
    }
    for(const prio of prioridades){
      const fn = FLAGS_PRIORIDADE[prio];
      if(fn && fn(e)) return { ...e, _status:'prioritario', _motivo: prio };
    }
    // "Não recomendado" (2026-08-28) — não bloqueia, só avisa e tira 1 ponto
    // na classificação (ver sortearExercicioC4). Hoje só Baixo Impacto.
    if(bloqueios.includes('BaixoImpacto') && _exercicioAltoImpacto(e)){
      return { ...e, _status:'nao_recomendado', _motivo: 'Alto impacto — não recomendado com IMC ≥ 30' };
    }
    return { ...e, _status:'ok', _motivo:'' };
  });

  // Ordenar: prioritários > ok > não recomendados > bloqueados
  const ordenado = [
    ...poolComStatus.filter(e=>e._status==='prioritario'),
    ...poolComStatus.filter(e=>e._status==='ok'),
    ...poolComStatus.filter(e=>e._status==='nao_recomendado'),
    ...poolComStatus.filter(e=>e._status==='bloqueado'),
  ];

  listEl.innerHTML = '';

  if(!ordenado.length){
    const empty = document.createElement('div');
    empty.style.cssText = 'font-size:12px;color:var(--text3);padding:6px';
    empty.textContent = 'Nenhum exercício encontrado';
    listEl.appendChild(empty);
  } else {
    // Cabeçalho com legenda compacta
    if(bloqueios.length || prioridades.length){
      const leg = document.createElement('div');
      leg.style.cssText = 'font-size:12px;color:var(--text3);padding:4px 8px;border-bottom:1px solid var(--border);margin-bottom:2px;font-variant-numeric:tabular-nums;';
      leg.textContent = 'Prior.  Ok  Não recom.  Bloq. (Filtros clínicos ativos)';
      listEl.appendChild(leg);
    }

    ordenado.forEach(e => {
      const div = document.createElement('div');
      const isBloq = e._status === 'bloqueado';
      const isPrio = e._status === 'prioritario';
      const isNaoRec = e._status === 'nao_recomendado';
      div.style.cssText = `padding:5px 8px;border-radius:6px;cursor:${isBloq?'not-allowed':'pointer'};` +
        `font-size:12px;color:${isBloq?'var(--text3)':isPrio?'var(--text)':isNaoRec?'var(--text2)':'var(--text2)'};` +
        `opacity:${isBloq?'0.5':'1'};transition:background .1s;` +
        `border-left:1px solid ${isPrio?'var(--accent)':isBloq?'var(--red-line)':isNaoRec?'rgba(255,180,50,.5)':'transparent'};` +
        `padding-left:${isPrio||isBloq||isNaoRec?'10px':'8px'}`;
      div.dataset.nome = e.n;
      div.dataset.bloq = isBloq ? '1' : '0';

      const icone = isPrio ? '<i class=sd-green></i> ' : isBloq ? '<i class=sd-red></i> ' : isNaoRec ? '<i class=sd-amber></i> ' : '';
      const tag_nv = `<span style="color:var(--text3);font-size:12px">${e.nv?.nome||''}</span>`;
      const tag_uni = _exercicioUnilateral(e) ? `<span style="color:var(--text3);font-size:12px;margin-left:4px">uni</span>`
                    : _exercicioBilateralCU(e) ? `<span style="color:var(--text3);font-size:12px;margin-left:4px">CU</span>` : '';
      const tag_url = e.url ? `<a data-url="${e.url}" data-nome="${(e.n||'').replace(/"/g,'&quot;')}" onclick="event.stopPropagation();abrirVideoModal(this.dataset.url,this.dataset.nome)" style="font-size:12px;color:var(--accent);margin-left:4px;text-decoration:none;cursor:pointer" title="Ver vídeo"><i class=ph-play></i></a>` : '';
      const tag_fav = `<span data-exid="${e.id}" onclick="event.stopPropagation();toggleFavorito(${e.id},this)" style="font-size:12px;margin-left:4px;cursor:pointer;opacity:.8" title="${ehFavorito(e.id)?'Remover favorito':'Favoritar exercício'}">${ehFavorito(e.id)?'<span style="color:var(--amber);display:inline-flex"><i class=ph-star></i></span>':'<i class=ph-star></i>'}</span>`;
      const tag_motivo = (isBloq || isPrio || isNaoRec) && e._motivo
        ? `<div style="font-size:12px;color:${isBloq?'var(--red)':isNaoRec?'var(--amber)':'var(--accent)'};margin-top:1px;opacity:.85">${e._motivo.split('—')[0].trim()}</div>` : '';

      div.innerHTML = `${icone}${e.n} ${tag_nv}${tag_uni}${tag_url}${tag_fav}${tag_motivo}`;

      if(!isBloq){
        div.addEventListener('mouseover', function(){ this.style.background = 'var(--bg3)'; });
        div.addEventListener('mouseout',  function(){ this.style.background = ''; });
        div.addEventListener('click', function(){
          if(this.dataset.bloq === '1') return;
          selecionarExercicio(ti, rowIdx, this.dataset.nome, listId);
        });
      }
      listEl.appendChild(div);
    });
  }
  listEl.classList.remove('hidden');
}

function selecionarExercicio(ti, rowIdx, nome, listId){
  const treino = _s3.fichaObj?.treinos[ti];
  if(treino){
    treino.exercicios[rowIdx].nome = nome;
    // Trocar o exercício principal pode trocar a articulação envolvida (ex:
    // trocar "Supino Reto" por "Crucifixo" muda de Cotovelo+Ombro pra só Ombro)
    // — sem atualizar _artic e regerar o aquecimento, ele ficaria desatualizado
    // em relação ao que a sessão de fato vai treinar.
    const dbEx = DB_EXERCICIOS.find(e => e.n === nome);
    treino.exercicios[rowIdx]._artic = (dbEx?.artic||[]).map(a=>a.nome);
    // Marca aquecimento como desatualizado se já existia (não auto-regera — preserva seleção manual)
    if(treino.aquecimento && treino.aquecimento.length) treino._aquecDesatualizado = true;
    renderTreinoAtivo(); // re-render completo
    return;
  }
  const el = $(`ex-nome-${ti}-${rowIdx}`); if(el) el.textContent = nome;
  const listEl = $(listId); if(listEl) listEl.classList.add('hidden');
}

function atualizarCampo(ti, rowIdx, campo, valor){
  if(_s3.fichaObj?.treinos[ti]) _s3.fichaObj.treinos[ti].exercicios[rowIdx][campo] = valor;
  _atualizarInfoAoVivo();
}

// Recalcula o aquecimento de UMA sessão a partir das articulações dos
// exercícios principais que estão nela agora (usado após trocar um exercício
// pelo ↕, ou pelo botão "Sortear de novo" no bloco de aquecimento).
function regerarAquecimentoTreino(ti){
  const f = _s3.fichaObj; if(!f || !f.treinos[ti]) return;
  const treino = f.treinos[ti];
  const s = getActive();
  const nivel = val('pr-nivel') || s?.anamnese?.nivel || 'Inic';
  const local = val('pr-local') || s?.anamnese?.local || '';
  const resistPermitida = getEquipamentosPermitidos(local);
  const contraindicacoes = [
    s?.perfil?.lesoes || '', s?.perfil?.condicoes || '', val('pr-evitar') || s?.anamnese?.preferencias || '',
  ].filter(Boolean).join(' ');
  const articsTreino = new Set();
  treino.exercicios.forEach(ex => { (ex._artic||[]).forEach(a => { if(a) articsTreino.add(a); }); });
  treino.aquecimento = gerarAquecimentoArticular(articsTreino, resistPermitida, nivel, contraindicacoes, _s3.aquecTipos);
  treino._aquecDesatualizado = false;
}


function regerarAquecimentoTreinoAtivo(){
  regerarAquecimentoTreino(_s3.treinoAtivo);
  renderTreinoAtivo();
}

function iniciarConfiguracaoFicha(){ iniciarTelaVolume(); }

function editarFicha(){
  goStep(3, true);
  const s = getActive();
  const treinoAtual = _treinoEditId!=null ? getTreinoPorId(s, _treinoEditId) : null;
  if(!_s3.fichaObj && treinoAtual?._fichaObj){
    // _s3 (estado em memória) é perdido após reload da página ou troca de aluno —
    // sem isto, "Editar" cairia no else abaixo e reconstruiria do zero (sugestões
    // novas), descartando a ficha estruturada já aprovada e salva no aluno.
    _s3.fichaObj    = treinoAtual._fichaObj;
    _s3.treinoAtivo = 0;
  }
  if(_s3.fichaObj){ hide('s3-volume'); hide('s3-divisao'); renderFichaTabs(); show('s3-ficha'); }
  else { iniciarTelaVolume(); }
}

// _treinoEditId: id do item de s.treinos[] que o wizard está preenchendo
// agora (rascunho novo, rascunho retomado, ou aprovado sendo reeditado).
// Substitui o antigo "s.prescricao sempre o último" — agora cada treino é
// um item independente na lista (js/treinos-store.js).
let _treinoEditId = null;

function novaPrescricao(){
  const s=getActive(); if(!s) return;
  _treinoEditId = criarRascunho(s);
  selectedObj=''; _modeloSelecionado = PERIODIZACAO_ATIVA ? '' : 'LP';
  setVal('pr-nivel',''); setVal('pr-frequencia',''); setVal('pr-obs',''); setVal('pr-validade',(typeof cfgValidadePadrao==='function'?cfgValidadePadrao():'12sem'));
  setVal('pr-objetivo-sec',''); setVal('pr-duracao',''); setVal('pr-horario','');
  setVal('pr-local',''); setVal('pr-gosta',''); setVal('pr-evitar','');
  _s3={seriesPorEx:3,volPorGrupo:{},divisaoIdx:0,divisaoOpcoes:[],fichaObj:null,treinoAtivo:0,aquecTipos:(_s3.aquecTipos||['Mobilidade'])};
  renderObjGrid(); goStep(1);
  treinosMostrarForm();
  saveStudent();
  updateHeader(s); renderStudentList();
}

// Continua um rascunho já existente (clicado na lista) — reaproveita o id,
// não cria um segundo rascunho.
// ── Salvar estado completo da prescrição em andamento ────────────────────────
// Chamado por _saveCurrentContext (avaliacao.js) quando o personal clica
// "Salvar" no modal de alterações não salvas enquanto está na aba Prescrição.
// Persiste step 1 (campos DOM pr-*) E step 2 (_s3 editado) no rascunho ativo,
// para que tudo seja restaurado corretamente ao reabrir o treino.
function salvarEstadoPrescricao(){
  const s = getActive(); if(!s) return;
  const patch = {};
  // Step 1 — lê DOM e monta patch
  const localVal = val('pr-local');
  const nivelVal = val('pr-nivel');
  const freqVal  = val('pr-frequencia');
  const durVal   = val('pr-duracao');
  const objVal   = val('pr-objetivo-principal') || selectedObj;
  const secVal   = val('pr-objetivo-sec');
  if(localVal != null) patch.local       = localVal;
  if(nivelVal)         patch.nivel       = nivelVal;
  if(freqVal)          patch.frequencia  = freqVal;
  if(durVal)           patch.duracao     = durVal;
  if(objVal)           { patch.objetivo  = objVal; selectedObj = objVal; } // não grava na Anamnese (override fica no treino)
  if(secVal != null)   patch.objetivoSec = secVal;
  // Step 2 — persiste _s3 editado (grupos ativos, volumes, séries/ex, divisão)
  if(_s3 && _s3.volPorGrupo && Object.keys(_s3.volPorGrupo).length){
    patch._s3Draft = {
      volPorGrupo: JSON.parse(JSON.stringify(_s3.volPorGrupo)),
      seriesPorEx: _s3.seriesPorEx,
      divisaoIdx:  _s3.divisaoIdx || 0,
    };
  }
  if(_treinoEditId != null){
    atualizarTreino(s, _treinoEditId, patch);
  } else {
    // Sem rascunho ativo: persiste pelo menos os campos de anamnese
    if(patch.local != null)  s.anamnese.local      = patch.local;
    if(patch.nivel)          s.anamnese.nivel       = patch.nivel;
    if(patch.frequencia)     s.anamnese.frequencia  = patch.frequencia;
    if(patch.duracao)        s.anamnese.duracao     = patch.duracao;
  }
  saveStudent();
  if(typeof setSyncStatus==='function'){ setSyncStatus('✓ Prescrição salva',false); setTimeout(()=>setSyncStatus('',false),2500); }
}

function treinosContinuarRascunho(id){
  const s=getActive(); if(!s) return;
  const t=getTreinoPorId(s,id); if(!t) return;
  _treinoEditId = id;
  selectedObj = t.objetivo||''; _modeloSelecionado = t.modelo || (PERIODIZACAO_ATIVA ? '' : 'LP');
  setVal('pr-nivel', t.nivel||''); setVal('pr-frequencia', t.frequencia||''); setVal('pr-obs', t.obs||'');
  setVal('pr-validade', t.prazoSemanas||(typeof cfgValidadePadrao==='function'?cfgValidadePadrao():'12sem'));
  setVal('pr-objetivo-sec', t.objetivoSec||''); setVal('pr-duracao', t.duracao||'');
  setVal('pr-horario', t.horario||''); setVal('pr-local', t.local||'');
  setVal('pr-gosta', t.gosta||''); setVal('pr-evitar', t.evitar||'');
  _s3 = {seriesPorEx:3,volPorGrupo:{},divisaoIdx:0,divisaoOpcoes:[],fichaObj:t._fichaObj||null,treinoAtivo:0,aquecTipos:(_s3.aquecTipos||['Mobilidade'])};
  // Restaura rascunho do Step 2 (edições de grupos/volume/séries feitas antes de sair)
  if(t._s3Draft && t._s3Draft.volPorGrupo && Object.keys(t._s3Draft.volPorGrupo).length){
    _s3.volPorGrupo = t._s3Draft.volPorGrupo;
    _s3.seriesPorEx = t._s3Draft.seriesPorEx || 3;
    _s3.divisaoIdx  = t._s3Draft.divisaoIdx  || 0;
  }
  renderObjGrid(); goStep(1);
  treinosMostrarForm();
  updateHeader(s);
}

// Reabre um treino já aprovado (ver / editar a partir da lista)
function treinosAbrirAprovado(id){
  const s=getActive(); if(!s) return;
  const t=getTreinoPorId(s,id); if(!t) return;
  _treinoEditId = id;
  selectedObj = t.objetivo||''; _modeloSelecionado = t.modelo || (PERIODIZACAO_ATIVA ? '' : 'LP');
  setVal('pr-nivel', t.nivel||''); setVal('pr-frequencia', t.frequencia||''); setVal('pr-obs', t.obs||'');
  setVal('pr-validade', t.prazoSemanas||(typeof cfgValidadePadrao==='function'?cfgValidadePadrao():'12sem'));
  setVal('pr-objetivo-sec', t.objetivoSec||''); setVal('pr-duracao', t.duracao||'');
  setVal('pr-horario', t.horario||''); setVal('pr-local', t.local||'');
  setVal('pr-gosta', t.gosta||''); setVal('pr-evitar', t.evitar||'');
  _s3 = {seriesPorEx:3,volPorGrupo:{},divisaoIdx:0,divisaoOpcoes:[],fichaObj:t._fichaObj||null,treinoAtivo:0,aquecTipos:(_s3.aquecTipos||['Mobilidade'])};
  renderFichaAprovadaVisual(t._fichaObj||null);
  $('aprovado-data').textContent = t.dataAprovacao||'—';
  const anterior = getTreinoAnteriorA(s, id);
  renderComparacaoCiclos(anterior?._fichaObj||null, t._fichaObj, anterior?.dataAprovacao||null);
  goStep(4, true);
  treinosMostrarForm();
  updateHeader(s);
}

// ══════════════════════════════════════════════════════════════════════════
// LISTA DE TREINOS — UI (painel Prescrição). Mesmo padrão de
// antro-lista-view/antro-form-view (js/avaliacao.js). Dados vêm de
// js/treinos-store.js.
// ══════════════════════════════════════════════════════════════════════════

function treinosMostrarLista(){
  const lv=$('treinos-lista-view'), fv=$('treinos-form-view');
  if(lv) lv.style.display='block';
  if(fv) fv.style.display='none';
  _treinoEditId = null;
  if(typeof fxFormFechar==='function') fxFormFechar('treino');
  renderTreinosLista();
}

function treinosMostrarForm(){
  const lv=$('treinos-lista-view'), fv=$('treinos-form-view');
  if(lv) lv.style.display='none';
  if(fv) fv.style.display='block';
  // o treino abre em página própria (js/historico.js), sem o cartão do aluno
  const s=getActive(), t=s && _treinoEditId!=null ? getTreinoPorId(s,_treinoEditId) : null;
  fxFormAbrir('treino', t && t.status===TREINOS_STATUS.APROVADO ? treinosNome(t) : 'Novo treino');
}

// Botão "+ Adicionar Treino" — se já existe rascunho em andamento, pergunta
// antes de abrir um segundo (evita lixo de rascunhos abandonados).
function treinosAdicionar(){
  const s=getActive(); if(!s) return;
  const rascunho = getRascunhoAtivo(s);
  if(rascunho){
    if(confirm('Já existe um treino em rascunho (iniciado em '+(rascunho.dataCriacao||'—')+'). Continuar de onde parou?')){
      treinosContinuarRascunho(rascunho.id);
    }
    return;
  }
  novaPrescricao();
}

function treinosVoltarLista(){
  const s=getActive(); if(!s) return;
  saveStudent();
  treinosMostrarLista();
  updateHeader(s);
}

function treinosExcluir(id){
  const s=getActive(); if(!s) return;
  const t = getTreinoPorId(s, id); if(!t) return;
  if(!confirmarExclusao('treino', rotuloDoItem('treino', t))) return;
  arquivarItem('treino', t, { ownerId: s.id, ownerNome: s.perfil?.nome });
  removerTreino(s, id);
  saveStudent();
  renderTreinosLista();
  updateHeader(s); renderStudentList();
}

const TREINOS_OBJ_LABEL = {Hip:'Hipertrofia',Forca:'Força',Emagr:'Emagrecimento',Comp:'Composição',
  Resist:'Resistência',CardioR:'Cardio',Func:'Funcional',Saude:'Saúde',
  Esport:'Esportivo',Reab:'Reabilitação',Envelhec:'Envelhecimento',Gestacao:'Gestação'};

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTADOR → FitCpx legado (app.fitcpx.com)
// ══════════════════════════════════════════════════════════════════════════════
// Converte a ficha aprovada (_s3.fichaObj) pro formato que o backend legado
// espera em POST /workouts (payload validado em 2026-09 — ver prompt de
// continuação). Gera { treino:{...sem cod_aluno/nome_aluno/cod_usuario/
// cod_empresa...}, sessoes:[...] } — os campos do aluno ficam de fora de
// propósito, quem completa é o Injetor (roda no console do FitCpx legado,
// já tem `history.state.usr.aluno` da tela aberta).
//
// FORMATO DE GRUPO CONFIRMADO (captura do POST real do legado, 2026-10-04):
//   - cada BLOCO de topo em exercicios[] (exercício solo OU 1º de um grupo)
//     recebe a próxima sequencia_sessao_exercicio: 1, 2, 3, 4…
//   - os demais membros do grupo vão em sets[] do 1º e REPETEM a mesma
//     sequencia_sessao_exercicio do 1º (não incrementam).
//   - bi-set (1 em sets[]) e tri-set (2 em sets[]) confirmados.
//   - aquecimento: TODOS os itens da sessão formam 1 bloco agrupado (bloco 1),
//     1 série, intervalo 0, reps = número de referência da duração (10 rep→10,
//     45s→45 — o legado não distingue segundos de repetições).
const _NIVEL_LEGADO = {Inic:'Iniciante', Inte:'Intermediário', Avan:'Avançado'};

// Acha o cod_exercicio real (= `id` de DB_EXERCICIOS) a partir do nome usado
// na ficha. Casamento por nome exato primeiro, depois normalizado (trim +
// lowercase) como fallback — ver Tarefa 1: nos 16 casos testados bateu 1:1.
function _buscarCodExercicioPorNome(nome){
  if(!nome) return null;
  let ex = DB_EXERCICIOS.find(e => e.n === nome);
  if(!ex){
    const alvo = nome.trim().toLowerCase();
    ex = DB_EXERCICIOS.find(e => e.n.trim().toLowerCase() === alvo);
  }
  return ex ? ex.id : null;
}

// Extrai o primeiro número de uma string tipo "8-12", "60s", "10 rep" — usado
// pros campos numéricos do legado (repeticao_sessao_exercicio,
// intervalo_sessao_exercicio). Se não achar número nenhum, devolve o default.
function _primeiroNumero(v, def){
  if(v==null) return def;
  if(typeof v === 'number') return v;
  const m = String(v).match(/\d+/);
  return m ? parseInt(m[0], 10) : def;
}

// Converte 1 exercício da ficha (formato fitcpx-auto) pro item do legado.
// `avisos` acumula nomes que não bateram em DB_EXERCICIOS (cod_exercicio null).
function _exportarItemExercicio(ex, seq, avisos){
  const cod = _buscarCodExercicioPorNome(ex.nome);
  if(cod == null) avisos.push(ex.nome);
  return {
    cod_exercicio: cod,
    sequencia_sessao_exercicio: seq,
    sets: [],
    serie_sessao_exercicio: _primeiroNumero(ex.series, 1),
    repeticao_sessao_exercicio: _primeiroNumero(ex.reps, 10),
    intervalo_sessao_exercicio: _primeiroNumero(ex.intervalo, 60),
    carga_sessao_exercicio: 0,
  };
}

// Converte 1 item de aquecimento (formato: {tipo, artic, musculo, nome,
// duracao, url}) pro item do legado: 1 série, reps = primeiro número da
// duração (ex "10 rep"→10, "45s"→45), intervalo 0.
function _exportarItemAquecimento(item, seq, avisos){
  const cod = _buscarCodExercicioPorNome(item.nome);
  if(cod == null) avisos.push(item.nome);
  return {
    cod_exercicio: cod,
    sequencia_sessao_exercicio: seq,
    sets: [],
    serie_sessao_exercicio: 1,
    repeticao_sessao_exercicio: _primeiroNumero(item.duracao, 1),
    intervalo_sessao_exercicio: 0,
    carga_sessao_exercicio: 0,
  };
}

// Todos os itens de aquecimento da sessão viram UM bloco: o 1º no topo, os
// demais em sets[] dele, todos com a mesma sequencia_sessao_exercicio.
// Devolve [] se não houver aquecimento.
function _agruparAquecimentoSessao(aquecimento, seq, avisos){
  if(!aquecimento || !aquecimento.length) return [];
  const cabeca = _exportarItemAquecimento(aquecimento[0], seq, avisos);
  for(let k = 1; k < aquecimento.length; k++){
    cabeca.sets.push(_exportarItemAquecimento(aquecimento[k], seq, avisos));
  }
  return [cabeca];
}

// Recebe a lista `treino.exercicios` (flat, com `_vinculadoProximo` encadeando
// bi-set/tri-set) e devolve os itens já no formato legado: cada bloco de topo
// ganha a próxima seq; membros do grupo vão em sets[] do 1º com a MESMA seq.
function _agruparExerciciosSessao(exercicios, seqInicial, avisos){
  const out = [];
  let seq = seqInicial;
  let i = 0;
  while(i < exercicios.length){
    const seqBloco = seq++;
    const item = _exportarItemExercicio(exercicios[i], seqBloco, avisos);
    let j = i;
    while(exercicios[j] && exercicios[j]._vinculadoProximo && exercicios[j+1]){
      j++;
      item.sets.push(_exportarItemExercicio(exercicios[j], seqBloco, avisos));
    }
    out.push(item);
    i = j + 1;
  }
  return out;
}

// Nome do treino / da sessão no legado. Editados na tela de Exercícios
// (STEP 3): f.nomeTreino (campo acima das abas) e t.label (campo da sessão).
function _fitcpxNomeTreinoPadrao(f){
  return `${TREINOS_OBJ_LABEL[f.objetivo]||f.objetivo||'Treino'} — ${f.dataGeracao||''}`;
}
function _fitcpxNomeSessaoPadrao(t, ti){
  return (t.label && t.label.trim()) || `Treino ${String.fromCharCode(65+ti)}`;
}

// Monta o payload do legado a partir da ficha.
function _fitcpxMontarPayload(f, s){
  const avisos = [];
  const sessoes = f.treinos.map((t, ti) => {
    const itens = [];
    itens.push(..._agruparAquecimentoSessao(t.aquecimento||[], 1, avisos));
    itens.push(..._agruparExerciciosSessao(t.exercicios||[], itens.length + 1, avisos));
    return {
      key: String(ti+1),
      nome_sessao: _fitcpxNomeSessaoPadrao(t, ti),
      sequencia_sessao: ti+1,
      exercicios: itens,
    };
  });

  const freqNum = _primeiroNumero(f.frequencia, null);

  const payload = {
    treino: {
      sexo_treino: (s?.perfil?.sexo) || 'M',
      nome_treino: (f.nomeTreino && f.nomeTreino.trim()) || _fitcpxNomeTreinoPadrao(f),
      frequencia_treino: freqNum != null ? String(freqNum) : '',
      nivel_treino: _NIVEL_LEGADO[f.nivel] || f.nivel || '',
      desenvolvimento_treino: TREINOS_OBJ_LABEL[f.objetivo] || f.objetivo || '',
      // cod_aluno / nome_aluno / cod_usuario / cod_empresa: preenchidos pelo
      // Injetor a partir de history.state.usr.aluno na tela do FitCpx legado.
    },
    sessoes,
  };
  return { payload, avisos: [...new Set(avisos)] };
}

// Chamado pelo botão "Copiar JSON pro FitCpx" na tela de ficha aprovada (STEP 4).
function exportarTreinoParaFitCpx(){
  const f = _s3.fichaObj;
  if(!f){ alert('Nenhuma ficha aprovada em memória pra exportar. Aprove ou reabra uma prescrição antes.'); return; }
  const s = getActive();
  const treinoId = _treinoEditId;
  const treinoItem = treinoId!=null ? getTreinoPorId(s, treinoId) : null;

  if(treinoItem?.envioFitCpx?.status === 'enviado'){
    const ok = confirm(`Este treino já foi marcado como enviado ao FitCpx em ${treinoItem.envioFitCpx.enviadoEm}. Reenviar mesmo assim?`);
    if(!ok) return;
  }

  const { payload, avisos } = _fitcpxMontarPayload(f, s);
  abrirModalExportFitCpx(payload, avisos, treinoId, s?.perfil?.codAlunoLegado);
}

// ── Modal "Copiar JSON FitCpx" — instruções + Código 1 (interceptor, fixo) +
// Código 2 (injeção, com o JSON do treino já embutido) ────────────────────
// Fluxo validado ponta a ponta em produção (POST real, 201, treino conferido
// na tela do FitCpx legado) — ver prompt de ajuste 2026-09-13. 2 passos, não 3:
// o Código 2 já checa sozinho se o token foi capturado e se a tela do aluno
// certo está aberta, e avisa no console em vez de falhar silencioso.
const _FITCPX_COD1_INTERCEPTOR = `window.__capturedAuth = null;
const _origSetHeader = XMLHttpRequest.prototype.setRequestHeader;
XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
  if (name.toLowerCase() === 'authorization') window.__capturedAuth = value;
  return _origSetHeader.apply(this, arguments);
};
'interceptor ativo'`;

function _fitcpxMontarCodigo2(payload, codAlunoLegado){
  const json = JSON.stringify(payload, null, 2);
  const codEsperado = codAlunoLegado ? parseInt(codAlunoLegado, 10) : null;
  const codEsperadoLit = Number.isFinite(codEsperado) ? codEsperado : 'null';
  return `const TREINO_EXPORTADO = ${json};
const COD_ALUNO_ESPERADO = ${codEsperadoLit};

(function injetar() {
  const aluno = history.state?.usr?.aluno;
  if (!aluno?.cod_aluno) { console.error('Não achei o aluno da tela. Confirma que está em "Treino do aluno: ..."'); return; }
  if (!window.__capturedAuth) { console.error('Sem token. Roda o Código 1 e clica em outra aba (Treinos/Avaliações) antes de rodar de novo.'); return; }
  if (COD_ALUNO_ESPERADO != null && aluno.cod_aluno !== COD_ALUNO_ESPERADO) {
    const seguir = confirm('Aluno da tela é cod_aluno ' + aluno.cod_aluno + ' (' + aluno.nome_aluno + '), mas o lite espera cod_aluno ' + COD_ALUNO_ESPERADO + '. Confere se é o aluno certo. Enviar mesmo assim?');
    if (!seguir) { console.error('Envio cancelado — aluno divergente.'); return; }
  }

  const payload = {
    treino: { ...TREINO_EXPORTADO.treino, cod_aluno: aluno.cod_aluno, nome_aluno: aluno.nome_aluno, cod_usuario: 5, cod_empresa: 3 },
    sessoes: TREINO_EXPORTADO.sessoes
  };

  fetch('https://api.fitcpx.com/workouts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': window.__capturedAuth },
    body: JSON.stringify(payload)
  }).then(r => r.json().then(data => console.log('STATUS:', r.status, 'DATA:', data)));
})();`;
}

// id do item de s.treinos[] que a modal aberta agora se refere — usado pelos
// botões "Deu certo"/"Deu erro" pra saber onde gravar o status de envio.
let _fitcpxModalTreinoId = null;

function abrirModalExportFitCpx(payload, avisosUnicos, treinoId, codAlunoLegado){
  const modal = $('modal-fitcpx-export');
  if(!modal){ alert('Modal de export não encontrado na tela — recarregue a página.'); return; }
  _fitcpxModalTreinoId = treinoId ?? null;

  const avisosEl = $('fitcpx-export-avisos');
  if(avisosEl){
    if(avisosUnicos && avisosUnicos.length){
      avisosEl.classList.remove('hidden');
      avisosEl.innerHTML = `<i class=ph-warning></i> ${avisosUnicos.length} nome(s) de exercício não encontrados em DB_EXERCICIOS ` +
        `(cod_exercicio ficou <code>null</code> — corrigir antes de injetar):<br>- ${avisosUnicos.join('<br>- ')}`;
    } else {
      avisosEl.classList.add('hidden');
      avisosEl.innerHTML = '';
    }
  }

  const cod1El = $('fitcpx-cod1');
  const cod2El = $('fitcpx-cod2');
  if(cod1El) cod1El.textContent = _FITCPX_COD1_INTERCEPTOR;
  if(cod2El) cod2El.textContent = _fitcpxMontarCodigo2(payload, codAlunoLegado);

  const statusEl = $('fitcpx-export-status');
  if(statusEl){
    if(!codAlunoLegado){
      statusEl.innerHTML = '<i class=ph-warning></i> Aluno sem <code>Cód. aluno no FitCpx</code> cadastrado na aba Perfil — sem checagem de divergência, confere manualmente se é o aluno certo na tela do legado.';
    } else {
      statusEl.textContent = `Cód. aluno esperado: ${codAlunoLegado}.`;
    }
  }

  modal.classList.remove('hidden');
}

function fecharModalExportFitCpx(){
  const modal = $('modal-fitcpx-export');
  if(modal) modal.classList.add('hidden');
}

// Confirmação manual do resultado (lida no console do legado, ver passo 6/7
// da modal). Sem isso não dá pra saber se o POST funcionou — não tem callback
// entre os dois domínios.
function _fitcpxMarcarEnviado(sucesso){
  const s = getActive();
  if(!s || _fitcpxModalTreinoId==null){
    alert('Não achei o treino pra marcar o status — reabra "Enviar ao FitCpx" a partir da ficha aprovada.');
    return;
  }
  const obs = sucesso ? '' : (prompt('Descreve o erro (opcional, aparece na lista de treinos):', '') || '');
  registrarEnvioFitCpx(s, _fitcpxModalTreinoId, sucesso ? 'enviado' : 'erro', obs);
  saveStudent();
  renderTreinosLista();
  fecharModalExportFitCpx();
}

function _copiarBlocoFitCpx(elId, btnEl){
  const el = $(elId); if(!el) return;
  const texto = el.textContent;
  const marcarCopiado = () => {
    if(!btnEl) return;
    const original = btnEl.textContent;
    btnEl.textContent = '✓ Copiado!';
    setTimeout(() => { btnEl.textContent = original; }, 1500);
  };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(texto).then(marcarCopiado).catch(()=>prompt('Copie manualmente (Ctrl+C):', texto));
  } else {
    prompt('Copie manualmente (Ctrl+C):', texto);
  }
}

// Nome do treino pela data em que foi aprovado (ou criado): "Treino de setembro de 2026"
function treinosNome(t){
  const d=_alDia(t.dataAprovacao||t.dataCriacao);
  return d ? 'Treino de '+HX_MESES[d.getMonth()]+' de '+d.getFullYear() : 'Treino';
}
// Situação de cada treino na lista: rascunho; o aprovado mais recente fica Ativo (ou Vencido, passada a data); os anteriores, Encerrados
function treinosFim(t){ // vencimento gravado ou, nos treinos antigos que não têm, calculado pela aprovação + validade
  return t.dataVencimento || (t.dataAprovacao ? _treinosCalcularVencimento(t.dataAprovacao, t.prazoSemanas) : null);
}
function treinosSituacao(s, t){
  if(t.status!==TREINOS_STATUS.APROVADO) return {k:'rascunho', lbl:'Rascunho', badge:'badge-amber'};
  const ult=getUltimoTreinoAprovado(s);
  if(!ult || ult.id!==t.id) return {k:'encerrado', lbl:'Encerrado', badge:'badge-gray'};
  const fim=_alDia(treinosFim(t));
  return fim && fim<_alHoje() ? {k:'vencido', lbl:'Vencido', badge:'badge-red'} : {k:'ativo', lbl:'Ativo', badge:'badge-green'};
}
function renderTreinosLista(){
  const s=getActive();
  const cont=$('treinos-lista-tabela'); if(!cont) return;
  if(!s){ cont.innerHTML=''; return; }
  const lista = obterTreinosOrdenados(s);
  if(!lista.length){
    cont.innerHTML = hxVazio('ph-barbell', 'Nenhum treino criado ainda', 'Use Novo treino para montar o primeiro treino deste aluno.');
    return;
  }
  const ult=getUltimoTreinoAprovado(s);
  cont.innerHTML = lista.map(t=>{
    const isAprovado = t.status===TREINOS_STATUS.APROVADO;
    const sit = treinosSituacao(s,t);
    const objLbl = TREINOS_OBJ_LABEL[t.objetivo]||t.objetivo||'—';
    const nivel = HX_NIVEL[t.nivel]||t.nivel||'';
    const envio = t.envioFitCpx;
    const envioBadge = !envio ? '' : envio.status==='enviado'
      ? '<div style="margin-top:4px"><span class="badge badge-blue" title="'+escHTML(envio.enviadoEm||'')+'"><i class=ph-upload-simple></i>Enviado FitCpx</span></div>'
      : '<div style="margin-top:4px"><span class="badge badge-red" title="'+escHTML(envio.obs||'')+'"><i class=ph-warning></i>Erro no envio</span></div>';
    // Vigência: da aprovação até o vencimento; o treino ativo mostra a barra de quanto do prazo já passou
    let vig='<div class="hx-v">—</div>';
    if(isAprovado){
      const ini=_alDia(t.dataAprovacao), fim=_alDia(treinosFim(t));
      const fmt=d=>d ? String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0') : '';
      const dias=fim ? Math.round((fim-_alHoje())/864e5) : null;
      const sub = dias===null ? '' : dias>=0 ? (dias===0 ? 'vence hoje' : 'vence em '+dias+' dia'+(dias===1?'':'s')) : (sit.k==='encerrado' ? 'encerrado' : 'venceu')+' há '+Math.abs(dias)+' dia'+(Math.abs(dias)===1?'':'s');
      let barra='';
      if(sit.k==='ativo' && ini && fim && fim>ini){ const pct=Math.max(0,Math.min(100,Math.round((_alHoje()-ini)/(fim-ini)*100))); barra='<div class="hx-prog"><i style="width:'+pct+'%"></i></div>'; }
      vig='<div class="hx-v">'+(ini?fmt(ini):'—')+(fim?' a '+_alFmt(fim):'')+'</div>'+(sub?'<div class="hx-sub2">'+sub+'</div>':'')+barra;
    }
    const abrir = isAprovado ? 'treinosAbrirAprovado('+t.id+')' : 'treinosContinuarRascunho('+t.id+')';
    const dt = _alDia(isAprovado ? t.dataAprovacao : t.dataCriacao);
    return '<div class="hx-tr'+(ult && ult.id===t.id ? ' atual' : '')+'" onclick="'+abrir+'">'
      + '<div class="hx-c"><div class="hx-main">'+escHTML(treinosNome(t))+'</div><div class="hx-sub2">'+(isAprovado?'Aprovado em ':'Criado em ')+(dt?_alFmt(dt):'—')+'</div></div>'
      + '<div class="hx-r2">'
      +   '<div class="hx-c" data-l="Vigência">'+vig+'</div>'
      +   '<div class="hx-c" data-l="Objetivo"><div class="hx-v">'+escHTML(objLbl)+'</div>'+(nivel?'<div class="hx-sub2">'+escHTML(nivel)+'</div>':'')+'</div>'
      +   '<div class="hx-c hx-lo" data-l="Frequência"><div class="hx-v">'+escHTML(t.frequencia||'—')+'</div></div>'
      +   '<div class="hx-c" data-l="Status"><span class="badge '+sit.badge+'">'+sit.lbl+'</span>'+envioBadge+'</div>'
      + '</div>'
      + '<div class="hx-acoes"><button type="button" class="btn '+(isAprovado?'btn-ghost':'btn-primary')+' btn-xs" onclick="event.stopPropagation();'+abrir+'">'+(isAprovado?'Abrir':'Continuar')+'</button>'
      +   '<button type="button" class="icon-btn" onclick="event.stopPropagation();treinosExcluir('+t.id+')" title="Excluir treino" aria-label="Excluir treino"><i class=ph-trash></i></button></div>'
      + '</div>';
  }).join('');
}

// ── Ficha aprovada — visual read-only (2026-09-16) ───────────────────────────
// Substitui o antigo bloco de texto/markdown (<pre>) na tela de Aprovação por
// uma versão que reaproveita o MESMO padrão visual da tela de seleção de
// exercícios (cards, tags de músculo/grupo, aquecimento separado da parte
// principal), só que somente leitura: sem drag, sem setas de reordenar, sem
// dropdown de trocar exercício, sem steppers +/-, sem botões de adicionar.
// Todas as sessões do ciclo aparecem empilhadas, como um documento — a tela
// de edição mostra só a sessão ativa (abas), aqui não tem aba, é o ciclo
// inteiro. As réguas de volume (Volume Semanal por Grupo) continuam vindo de
// renderPreviewVolSemanal(), a mesma função da tela de exercícios.
function _htmlAquecimentoReadOnly(treino){
  const aquecimento = treino.aquecimento || [];
  if(!aquecimento.length){
    return `<div style="margin-bottom:14px;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">
      <div style="font-size:12px;font-weight:700;color:var(--text2);padding:8px 12px;background:var(--bg3)"><i class=ph-fire></i> Aquecimento</div>
      <div style="padding:10px 12px;font-size:12px;color:var(--text3);font-style:italic">Nenhum item de aquecimento</div>
    </div>`;
  }
  const rows = aquecimento.map(a => {
    const isMob  = a.tipo === 'Mobilidade';
    const isFlex = a.tipo === 'Flexibilidade';
    const tipBg  = isMob ? 'rgba(0,188,212,.18)' : isFlex ? 'rgba(56,142,60,.18)' : 'rgba(255,152,0,.18)';
    const tipFg  = isMob ? '#00bcd4'             : isFlex ? 'var(--accent)'              : 'var(--amber)';
    const tipLbl = isMob ? 'MOB'                 : isFlex ? 'FLEX'                 : 'LIB';
    const refLabel = isMob ? (a.artic||'—') : (a.musculo||'—');
    const videoBtn = a.url
      ? `<button class="excv2-iconbtn excv2-video" title="Ver vídeo"
          onclick="abrirVideoModal('${a.url.replace(/'/g,"\\'")}','${(a.nome||'').replace(/'/g,"\\'")}')"><i class=ph-play></i></button>`
      : `<button class="excv2-iconbtn excv2-video" title="Sem vídeo" disabled style="opacity:.3"><i class=ph-play></i></button>`;
    return `<div style="border-top:1px solid var(--border)">
      <div class="aqv2-row">
        <span class="aqv2-tipc" style="background:${tipBg};color:${tipFg}">${tipLbl}</span>
        <span class="aqv2-artic" title="${refLabel}">${refLabel}</span>
        <div style="flex:1;min-width:0;font-size:12px;color:var(--text);padding:0 4px">${escHTML(a.nome)}</div>
        <div style="flex-shrink:0;font-variant-numeric:tabular-nums;font-size:12px;color:var(--text2);padding:0 8px;white-space:nowrap">${a.duracao}</div>
        ${videoBtn}
      </div>
    </div>`;
  }).join('');
  return `<div style="margin-bottom:14px;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">
    <div style="font-size:12px;font-weight:700;color:var(--text2);padding:8px 12px;background:var(--bg3);border-bottom:1px solid var(--border)"><i class=ph-fire></i> Aquecimento</div>
    ${rows}
  </div>`;
}

function _htmlParteReadOnly(treino){
  const gruposInfo = _computarGruposExercicios(treino.exercicios);
  const rows = treino.exercicios.map((ex, rowIdx) => {
    const info    = gruposInfo[rowIdx];
    const emGrupo = !!info;
    const corChip = _corChipMusculo(ex.musculo);
    const mLabel  = ex.musculo.replace('Isquiossurais','Isquio').replace('RetoAbdominal','Abd.').replace('Panturrilhas','Pant.');
    const dbEx = DB_EXERCICIOS.find(e => e.n === ex.nome);
    const url  = dbEx?.url || '';
    const videoBtn = url
      ? `<button class="excv2-iconbtn excv2-video" title="Ver vídeo"
          onclick="abrirVideoModal('${url.replace(/'/g,"\\'")}','${ex.nome.replace(/'/g,"\\'")}')"><i class=ph-play></i></button>`
      : `<button class="excv2-iconbtn excv2-video" title="Sem vídeo" disabled style="opacity:.3"><i class=ph-play></i></button>`;
    const grupoTag = emGrupo
      ? `<span style="flex-shrink:0;font-size:12px;font-weight:700;padding:2px 7px;border-radius:10px;background:color-mix(in srgb, ${_corGrupo(info.grupoIdx)} 15%, transparent);color:color-mix(in srgb, ${_corGrupo(info.grupoIdx)} 62%, var(--text));white-space:nowrap" title="Grupo combinado sem descanso entre os exercícios"><i class=ph-link></i> ${_labelGrupo(info.total)} ${info.pos}/${info.total}</span>`
      : '';
    return `<div style="border-bottom:1px solid var(--border);${emGrupo?`border-left:1px solid ${_corGrupo(info.grupoIdx)};background:rgba(91,140,247,.025)`:'border-left:1px solid transparent'}">
      <div class="excv2-row" style="flex-wrap:wrap;padding:8px 10px">
        <span class="excv2-chip" style="background:${corChip.bg};color:${corChip.fg};flex-shrink:0">${mLabel}</span>
        ${grupoTag}
        <div style="flex:1 1 160px;min-width:0;font-size:12px;font-weight:500;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHTML(ex.nome)}</div>
        <div style="flex-shrink:0;display:flex;gap:12px;font-size:12px;color:var(--text2);white-space:nowrap;font-variant-numeric:tabular-nums;">
          <span title="Séries × Repetições"><strong style="color:var(--text);font-weight:700">${escHTML(ex.series)}×${escHTML(ex.reps)}</strong></span>
          <span title="Intervalo de descanso"><i class=ph-timer></i> ${escHTML(ex.intervalo)}</span>
        </div>
        ${videoBtn}
      </div>
    </div>`;
  }).join('');
  return `<div style="border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:20px">
    <div style="font-size:12px;font-weight:700;color:var(--text2);padding:8px 12px;background:var(--bg3);border-bottom:1px solid var(--border)"><i class=ph-hand-fist></i> Parte Principal</div>
    ${rows}
  </div>`;
}

function renderFichaAprovadaVisual(ficha){
  const el = $('ficha-aprovada'); if(!el) return;
  if(!ficha){ el.innerHTML = ''; return; }
  _injetarEstilosExcv2();
  // Nome do treino (editado na tela de Exercícios) no topo da ficha aprovada.
  const nomeTreino = (ficha.nomeTreino && ficha.nomeTreino.trim()) || _fitcpxNomeTreinoPadrao(ficha);
  const nomeTreinoHtml = `<div style="margin-bottom:16px">
      <div class="param-key">Nome do treino</div>
      <div style="font-size:16px;font-weight:700;color:var(--text)">${escHTML(nomeTreino)}</div>
    </div>`;
  el.innerHTML = nomeTreinoHtml + ficha.treinos.map((treino, ti) => {
    const total = treino.exercicios.reduce((a,e)=>a+parseInt(e.series||0),0);
    const tempo = (typeof calcularTempoEstimadoTreino==='function') ? calcularTempoEstimadoTreino(treino) : null;
    const corpo = `<div>
      <div class="pr-apv-t" style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid var(--border2)">
        ${escHTML(treino.label)} <span style="font-weight:400;color:var(--text3);font-size:12px">(${total} séries)</span>
      </div>
      ${_htmlAquecimentoReadOnly(treino)}
      ${_htmlParteReadOnly(treino)}
    </div>`;
    return prAcc('ph-barbell', escHTML(treino.label), total + ' séries' + (tempo ? ' · ~' + tempo.minutos + ' min' : ''), corpo, {cls:'pr-acc-apv', key:'apv-' + ti, aberto: ti === 0});
  }).join('');
  // Réguas de volume — mesma função/mesmo visual da tela de seleção de exercícios.
  // Depende de _s3.fichaObj/selectedObj já estarem apontando pra esta ficha
  // (garantido pelos dois chamadores: aprovarTreinoMotor e treinosAbrirAprovado).
  renderPreviewVolSemanal('ficha-aprovada-vol');
}

function fichaObjParaTexto(ficha){
  const s     = getActive();
  const nome  = s?.perfil?.nome || 'Aluno';
  const modelo = _modeloSelecionado || 'LP';
  const fence = String.fromCharCode(96,96,96);
  const nl    = '\n';
  let txt = '## CICLO-01 — ' + nome + nl;
  txt += fence + 'yaml' + nl;
  txt += 'objetivo: ' + ficha.objetivo + nl;
  txt += 'nivel: ' + nivelLabel(ficha.nivel) + nl;
  txt += 'frequencia: ' + ficha.frequencia + '/sem' + nl;
  txt += 'modelo: ' + modelo + nl;
  txt += 'local: ' + ficha.local + nl;
  txt += 'data: ' + ficha.dataGeracao + nl;
  txt += fence + nl + nl;
  ficha.treinos.forEach(treino => {
    const total = treino.exercicios.reduce((a,e)=>a+parseInt(e.series||0),0);
    txt += '### ' + treino.label + ' (' + total + ' séries)' + nl + nl;

    // Aquecimento — antes ficava fora do texto (só entrava no export pro
    // FitCpx), mas o Milton precisa ver na ficha de confirmação também.
    if((treino.aquecimento||[]).length){
      txt += '**<i class=ph-fire></i> Aquecimento**' + nl;
      txt += '| Articulação/Músculo | Exercício | Duração |' + nl;
      txt += '|---|---|---|' + nl;
      treino.aquecimento.forEach(a => {
        const ref = a.tipo==='Mobilidade' ? (a.artic||'—') : (a.musculo||'—');
        txt += '| ' + ref + ' | ' + a.nome + ' | ' + a.duracao + ' |' + nl;
      });
      txt += nl;
    }

    // Parte principal — coluna "Grupo" marca bi-set/tri-set (_vinculadoProximo),
    // já que a lista aqui é plana e sem isso não dava pra ver que dois exercícios
    // são pra fazer um atrás do outro sem descanso (mesma lógica do export).
    txt += '**<i class=ph-hand-fist></i> Parte Principal**' + nl;
    txt += '| # | Grupo | Músculo | Exercício | Séries | Reps | Intensidade | Intervalo |' + nl;
    txt += '|---|---|---------|-----------|--------|------|-------------|----------|' + nl;
    const gruposInfo = _computarGruposExercicios(treino.exercicios);
    treino.exercicios.forEach((ex,i) => {
      const info = gruposInfo[i];
      const grupoTxt = info
        ? `<i class=ph-link></i> ${_labelGrupo(info.total)} ${String.fromCharCode(65+info.grupoIdx)} (${info.pos}/${info.total})`
        : '—';
      txt += '| ' + (i+1) + ' | ' + grupoTxt + ' | ' + ex.musculo + ' | ' + ex.nome + ' | ' + ex.series + ' | ' + ex.reps + ' | ' + ex.intensidade + ' | ' + ex.intervalo + ' |' + nl;
    });
    txt += nl;
  });
  txt += '### PROGRESSÃO SEMANAL' + nl;
  txt += '| Sem | Foco | Ajuste |' + nl;
  txt += '|---|---|---|' + nl;
  txt += '| 1 | Adaptação | Carga conservadora |' + nl;
  txt += '| 2 | Desenvolvimento | +carga ou +reps |' + nl;
  txt += '| 3 | Sobrecarga | RPE 7–8 |' + nl;
  txt += '| 4 | Deload | −40% volume |' + nl;
  return txt;
}

function aprovarTreinoMotor(){
  if(!_s3.fichaObj){ alert('Monte a ficha antes de aprovar.'); return; }
  const s = getActive(); if(!s) return;
  const treino  = fichaObjParaTexto(_s3.fichaObj);
  const data    = new Date().toLocaleDateString('pt-BR');
  // ciclo anterior = último treino APROVADO antes deste (não é mais um campo
  // único _fichaObjAnterior — vem da lista s.treinos, ver treinos-store.js)
  const ultimoAprovado = getUltimoTreinoAprovado(s);
  const anterior = ultimoAprovado?._fichaObj || null;
  const dataAprovacaoAnterior = ultimoAprovado?.dataAprovacao || null;

  // Registrar exercícios usados no histórico para diversificação futura
  if(!s.historicoExercicios) s.historicoExercicios = [];
  const usadosNesteCiclo = _s3.fichaObj.treinos.flatMap(t => t.exercicios.map(e => e.nome));
  s.historicoExercicios = [...new Set([...s.historicoExercicios, ...usadosNesteCiclo])].slice(-200);

  // Persistência da progressão de Séries por Exercício (vault §10.2) — histórico
  // dedicado por objetivo, sobrevive a qualquer número de trocas no meio (não só ao
  // ciclo imediatamente anterior). Lê os exercícios já com qualquer ajuste manual do
  // personal (atualizarCampo), captando o que foi de fato aprovado, não o sugerido.
  const objetivoAnteriorReal = s.ultimaFaseVolSessao?.objetivo || null;
  const exerciciosDoCiclo = _s3.fichaObj.treinos.flatMap(t => t.exercicios);
  registrarHistoricoSeries(s, selectedObj, exerciciosDoCiclo, objetivoAnteriorReal);

  if(_treinoEditId==null) _treinoEditId = criarRascunho(s);
  aprovarRascunho(s, _treinoEditId, {
    objetivo:selectedObj, nivel:val('pr-nivel'), frequencia:val('pr-frequencia'),
    modelo:_modeloSelecionado, obs:val('pr-obs')||'',
    prazoSemanas: val('pr-validade')||(typeof cfgValidadePadrao==='function'?cfgValidadePadrao():'12sem'),
    // Dados Atuais de Treino (Bloco 3) — o que foi de fato usado nesta
    // prescrição, que pode ter sido ajustado aqui sem alterar a Anamnese.
    objetivoSec: val('pr-objetivo-sec')||'', duracao: val('pr-duracao')||'',
    horario: val('pr-horario')||'', local: val('pr-local')||'',
    gosta: val('pr-gosta')||'', evitar: val('pr-evitar')||'',
    treino, _fichaObj:_s3.fichaObj,
  });

  // Persistência da progressão por 3 fases de Volume da Sessão (vault §10.2-bis) —
  // guarda apenas o registro mais recente (objetivo + fase), não um histórico completo.
  s.ultimaFaseVolSessao = {
    objetivo: selectedObj,
    fase: _s3._faseVolSessaoAtual || 'baixa',
  };

  saveStudent();
  renderFichaAprovadaVisual(_s3.fichaObj);
  $('aprovado-data').textContent  = data;

  // Renderizar comparação com ciclo anterior
  renderComparacaoCiclos(anterior, _s3.fichaObj, dataAprovacaoAnterior);

  goStep(4);
  updateHeader(s); renderStudentList();
}

function renderComparacaoCiclos(anterior, atual, dataAprovacaoAnterior){
  const el = $('ciclo-comparacao'); if(!el) return;
  if(!anterior){ el.innerHTML=''; el.style.display='none'; return; }

  // Calcular volume semanal por grupo — ciclo anterior vs atual
  const volPor = (ficha) => {
    const mapa = {};
    ficha.treinos.forEach(t => t.exercicios.forEach(ex => {
      mapa[ex.musculo] = (mapa[ex.musculo]||0) + parseInt(ex.series||0);
    }));
    return mapa;
  };
  const volAnt = volPor(anterior);
  const volAtual = volPor(atual);
  const grupos = [...new Set([...Object.keys(volAnt), ...Object.keys(volAtual)])].sort();

  // Exercícios repetidos do ciclo anterior
  const exsAnt  = new Set(anterior.treinos.flatMap(t => t.exercicios.map(e => e.nome)));
  const exsAtual = atual.treinos.flatMap(t => t.exercicios.map(e => e.nome));
  const repetidos = exsAtual.filter(n => exsAnt.has(n));

  let rows = grupos.map(g => {
    const a = volAnt[g]||0, b = volAtual[g]||0;
    const delta = b - a;
    const seta = delta>0?'↑':delta<0?'↓':'=';
    const cor = delta>0?'var(--accent)':delta<0?'var(--red)':'var(--text3)';
    return `<tr>
      <td style="font-size:12px;color:var(--text2)">${g}</td>
      <td style="font-variant-numeric:tabular-nums;font-size:12px;color:var(--text3);text-align:center">${a||'—'}</td>
      <td style="font-variant-numeric:tabular-nums;font-size:12px;color:var(--accent);text-align:center">${b||'—'}</td>
      <td style="font-variant-numeric:tabular-nums;font-size:12px;font-weight:700;color:${cor};text-align:center">${delta>=0?'+':''}${delta} ${seta}</td>
    </tr>`;
  }).join('');

  el.style.display = 'block';
  el.innerHTML = `
    <div class="section-label" style="margin-top:16px"><i class=ph-chart-bar></i> Comparação com ciclo anterior</div>
    <div class="alert alert-blue" style="margin-bottom:10px;font-size:12px">
      Ciclo anterior: <strong>${escHTML(anterior.frequencia)}</strong> · ${escHTML(anterior.objetivo)} · aprovado em ${dataAprovacaoAnterior||'—'}
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:10px">
      <thead><tr style="border-bottom:1px solid var(--border)">
        <th style="text-align:left;padding:5px 8px;font-size:12px;color:var(--text3)">Grupo Muscular</th>
        <th style="text-align:center;padding:5px 8px;font-size:12px;color:var(--text3)"><span class="pr-t-l">Anterior (s/sem)</span><span class="pr-t-c">Antes</span></th>
        <th style="text-align:center;padding:5px 8px;font-size:12px;color:var(--text3)"><span class="pr-t-l">Atual (s/sem)</span><span class="pr-t-c">Agora</span></th>
        <th style="text-align:center;padding:5px 8px;font-size:12px;color:var(--text3)">Δ</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${repetidos.length ? `<div style="font-size:12px;color:var(--amber);background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.2);border-radius:var(--radius);padding:7px 10px">
      <i class=ph-warning></i> <strong>${repetidos.length} exercício(s) repetido(s)</strong> do ciclo anterior: ${repetidos.join(', ')}
    </div>` : `<div style="font-size:12px;color:var(--accent)"><i class=ph-check></i> Nenhum exercício repetido do ciclo anterior — boa variação de estímulo.</div>`}
  `;
}

// ─── MOTOR V2 ─────────────────────────────────────────────────────────────────
// ── Detector de incompatibilidade divisão × periodização ────────────────────
function verificarCompatibilidadePeriodDiv(sigla, op, numDias){
  // Regras de incompatibilidade conhecidas (vault FASE-3)
  const avisos = [];
  const dias = numDias;
  const nomeDivisao = (op?.nome||'').toLowerCase();

  // LP + PPL 6x = contradição (LP precisa de frequência por grupo 2–3x)
  if((sigla==='LP'||sigla==='LPR') && dias>=6 && nomeDivisao.includes('ppl')){
    avisos.push('<i class=ph-warning></i> LP/Linear com PPL 6x não é recomendado: a divisão PPL treina cada grupo apenas 1×/sem, contrariando o princípio de progressão linear que exige frequência ≥2×.');
  }
  // DUP exige ≥3x (variação diária de estímulo)
  if(sigla==='DUP' && dias<3){
    avisos.push('<i class=ph-warning></i> DUP (Ondulatória Diária) exige no mínimo 3 sessões/semana para variar o estímulo por dia. Com '+dias+'x/sem o efeito ondulatório não se realiza.');
  }
  // Conjugado restrito a avançados (verificado no perfil)
  if(sigla==='CONJ'){
    const s = getActive();
    const nivel = val('pr-nivel') || s?.anamnese?.nivel || '';
    if(nivel==='Inic'||nivel==='Iniciante'){
      avisos.push('<i class=ph-warning></i> Modelo Conjugado é contraindicado para iniciantes (Vault FASE-3 §4.5). Exige base sólida em força máxima e técnica avançada.');
    }
    if(s?.perfil?.sexo==='F'){
      avisos.push('<i class=ph-info></i> Modelo Conjugado foi desenvolvido para atletas de força masculinos. Para objetivos femininos há modelos mais adequados (DUP, Blocos).');
    }
  }
  // Full Body + Força Máxima = ok mas avisa se 6x
  if(dias>=6 && (nomeDivisao.includes('full body')||nomeDivisao.includes('full-body'))){
    avisos.push('<i class=ph-warning></i> Full Body 6×/sem gera recuperação insuficiente para a maioria dos objetivos. Considere Upper/Lower ou PPL para esta frequência.');
  }
  // Blocos (CB) com menos de 3x perde eficácia
  if(sigla==='CB' && dias<3){
    avisos.push('<i class=ph-warning></i> Periodização em Blocos (CB) com apenas '+dias+'x/sem pode não gerar sobrecarga suficiente por fase. Recomendado ≥3×/sem.');
  }
  return avisos.length ? avisos.join('\n\n') : null;
}


// Prioridade de grupos para corte quando sessão excede limite
// Primários: grupos grandes/mais funcionais → proteger volume
// Secundários: podem ter volume reduzido primeiro
// CHAVES ASCII (sem acento, sem espaco) — mesmo formato dos ids de GRUPOS_MAPA,
// que e o que chega em a.g/b.g na ordenacao por prioridade. Antes guardavam
// nomes de exibicao acentuados e a comparacao dependia de textoIgual().
const GRUPOS_PRIMARIOS   = new Set(['Quadriceps','Gluteos','Isquiossurais','Peitoral','Latissimo','Deltoide','Trapezio']);
const GRUPOS_SECUNDARIOS = new Set(['RetoAbdominal','Obliquo','TransversoDoAbdomen','Panturrilhas','Biceps','Triceps','Antebracos','FlexoresDoPe','Adutores']);

// Lê os valores REAIS dos inputs do DOM para uma sessão específica
// Retorna array [{g, numEx, serEx}] respeitando o que o usuário editou
// Lê os valores de exercício/série direto do DOM (accordion da tela de
// Distribuição), respeitando a ORDEM REAL da sessão (sessaoGrupos) — a mesma
// ordem de prioridade definida pelo personal no editor (dc*). Antes iterava
// GRUPOS_MAPA (ordem fixa do catálogo: Peitoral, Latíssimo, Deltóide...),
// o que embaralhava a hierarquia na ficha final mesmo quando a tela de
// Distribuição mostrava a ordem certa (bug real, confirmado: Quadríceps #1
// na distribuição virava 2º exercício na ficha, atrás de Peitoral).
// IMPORTANTE: a tela e esta leitura percorrem listas DIFERENTES — o render
// itera calcSeriesSessaoExibida(...).grupos e aqui iteramos sessaoGrupos
// (divisao.default[ti]). Quando um grupo ativo existe em sessaoGrupos mas nao
// teve input desenhado, a versao antiga simplesmente NAO o incluia; como o
// chamador usa `if(fromDOM.length > 0) return fromDOM`, essa lista parcial
// virava autoridade e o grupo sumia da ficha em silencio — enquanto todos os
// outros apareciam normalmente. Foi o que aconteceu com Biceps.
// (Mesma classe de bug ja corrigida no caminho dos _sessionOverrides, ver
// comentario em montarFichaFinal.)
// Agora: input ausente NAO descarta o grupo — calcula inline, mesmo algoritmo
// da 3a prioridade.
function _calcSessaoGrupoInline(id){
  const vg = _s3.volPorGrupo[id];
  if(!vg || vg.ativo === false) return null;
  const sEx     = vg.serEx || _s3.seriesPorEx;
  const freq_g  = Math.max(1, vg.freq || 1);
  const serSem  = Math.round(((vg.semMin||0) + (vg.semMax||0)) / 2);
  const serSess = Math.max(sEx, Math.round(serSem / freq_g));
  const numEx   = Math.max(1, Math.round(serSess / sEx));
  return { g: id, numEx, serEx: sEx, serSessao: numEx * sEx };
}

function lerSessionDataDOM(cardIdx, ti, sessaoGrupos){
  const sessionData = [];
  sessaoGrupos.forEach(({g: id}) => {
    const vg = _s3.volPorGrupo[id];
    if(!vg || vg.ativo === false) return;   // desligado de proposito na tela de Volume
    const inpEx  = $('iex-'  + cardIdx + '-' + ti + '-' + id);
    const inpSer = $('iser-' + cardIdx + '-' + ti + '-' + id);
    if(inpEx && inpSer){
      const numEx = Math.max(1, parseInt(inpEx.value)||1);
      const serEx = Math.max(1, parseInt(inpSer.value)||1);
      sessionData.push({ g: id, numEx, serEx, serSessao: numEx * serEx });
    } else {
      const calc = _calcSessaoGrupoInline(id);   // sem input na tela: calcula, nao descarta
      if(calc) sessionData.push(calc);
    }
  });
  return sessionData;
}

// ── Aquecimento automático (rascunho — a refinar) ───────────────────────────
// Ideia central: o aquecimento não é genérico, é ESPECÍFICO da sessão — olha
// pra articulação (campo `artic` do banco: Ombro, Quadril, Joelho, Cotovelo,
// Lombar, etc.) de cada exercício PRINCIPAL já escolhido pra essa sessão, e
// busca 1 mobilização por articulação envolvida, dentro do mesmo pool de
// recursos/nível/contraindicação do treino principal — usa exatamente os 36
// exercícios tp:"Mobilidade" do banco, que ficam fora da SELEÇÃO AUTOMÁTICA
// da parte principal (ver _TIPOS_SELECAO_AUTOMATICA) e não eram usados em
// lugar nenhum. Não força mobilização se não existir nenhuma pra aquela articulação
// dentro dos filtros — melhor um aquecimento mais curto do que forçar um
// exercício fora de nível/recurso/contraindicação.
const ORDEM_ARTIC_AQUECIMENTO = ['Quadril','Joelho','Tornozelo','Arco Plantar','Tórax','Escápula','Ombro','Cotovelo','Punho'];
// Articulações com exercícios de Mobilidade no banco — única lista válida para chips de aquecimento.
// Corrigido 2026-09-11: faltavam Joelho (4 exercícios) e Cotovelo (2) — reimportação do banco
// (2026-08-28) adicionou Mobilidade pra essas articulações e essa lista não foi atualizada junto,
// o que zerava o aquecimento em qualquer sessão cujos exercícios principais só batiam Joelho/Cotovelo
// (ex: treino de perna focado em joelho, ou treino de braço isolado). "Arco Plantar" fica na lista
// mas tem 0 exercícios de Mobilidade no banco hoje — inofensivo, só nunca vai gerar chip/item.
// 2026-09-16: Cotovelo e Joelho removidos — são articulações-dobradiça
// (flexão/extensão em plano único), sem mobilidade multiplanar real; não
// fazem sentido como alvo de exercícios de "Mobilidade" (que trabalham
// múltiplos planos/graus de liberdade). Backup do estado anterior em
// _backup_20260916/js/prescricao-motor.js antes desta remoção.
const ARTIC_MOBILIDADE_VALIDAS = new Set(['Arco Plantar','Escápula','Ombro','Punho','Quadril','Tórax','Tornozelo']);
const _TETO_ITENS_AQUECIMENTO = 5; // teto propositalmente baixo — aquecimento não pode virar treino paralelo

// Tipos de aquecimento disponíveis no banco (campo `tp` dos exercícios).
// Mapeados pra label curto exibido no UI → nome exato no banco.
const TIPOS_AQUECIMENTO = {
  'Mobilidade':          'Mobilidade',
  'Liberação Miofascial':'Liberação Miofascial',
  'Flexibilidade':       'Flexibilidade',
};

// tiposPermitidos: array de nomes exatos do banco — ex: ['Mobilidade','Flexibilidade']
// Se omitido/vazio, usa o default ['Mobilidade'].
function gerarAquecimentoArticular(articsTreino, resistPermitida, nivel, contraindicacoes, tiposPermitidos){
  if(!articsTreino || !articsTreino.size) return [];
  const tipos = (tiposPermitidos && tiposPermitidos.length) ? tiposPermitidos : ['Mobilidade'];
  const usados = new Set();
  const itens  = [];
  // Filtrar apenas articulações que têm exercícios de Mobilidade no banco
  const articsValidas = [...articsTreino].filter(a => ARTIC_MOBILIDADE_VALIDAS.has(a));
  const ordenadas = articsValidas.sort((a,b) => ORDEM_ARTIC_AQUECIMENTO.indexOf(a) - ORDEM_ARTIC_AQUECIMENTO.indexOf(b));

  ordenadas.forEach(artic => {
    let pool = DB_EXERCICIOS.filter(e =>
      (e.tp||[]).some(t => tipos.includes(t.nome)) &&
      (e.artic||[]).some(x=>x.nome === artic) &&
      _exercicioEquipamentoOk(e, resistPermitida) &&
      e.nv && nivelOk(e.nv.chave, nivelChave(nivel)) &&
      !usados.has(e.n)
    );
    if(contraindicacoes){
      const semCi = pool.filter(e => {
        if(!e.ci?.length) return true;
        const ciAluno = contraindicacoes.toLowerCase();
        return !e.ci.some(c => ciAluno.includes(c.nome.toLowerCase()));
      });
      if(semCi.length) pool = semCi;
    }
    if(!pool.length) return; // sem mobilização disponível pra essa articulação nesses filtros — pula
    const ex = pool[motorRand(0, pool.length-1)];
    usados.add(ex.n);
    const tipoMatch = (ex.tp||[]).map(t=>t.nome).find(t=>tipos.includes(t)) || tipos[0] || 'Mobilidade';
    // se tempo de execução é 0/null → exercício é por tempo → 45s
    // se tem valor → exercício é por rep → 10 rep
    const duracaoAquec = ex.tempo ? '10 rep' : '45s';
    itens.push({
      artic, nome: ex.n,
      duracao: duracaoAquec,
      url: ex.url || '',
      tipo: tipoMatch,
    });
  });

  return itens.slice(0, _TETO_ITENS_AQUECIMENTO);
}

// ── Alternativos para item de aquecimento ───────────────────────────────────
function abrirListaAquecimento(ti, aquecIdx){
  const listId = `lista-aquec-${ti}-${aquecIdx}`;
  const listEl = $(listId); if(!listEl) return;
  const isOpen = !listEl.classList.contains('hidden');
  document.querySelectorAll('[id^="lista-aquec-"]').forEach(el => { _desancorarDrop(el); el.classList.add('hidden'); });
  if(isOpen) return;

  const treino = _s3.fichaObj.treinos[ti];
  const item = treino.aquecimento[aquecIdx];
  const s = getActive();
  const nivel = val('pr-nivel') || s?.anamnese?.nivel || 'Inic';
  const local = val('pr-local') || s?.anamnese?.local || '';
  const resist = getEquipamentosPermitidos(local);
  const tipoFiltro = item.tipo || 'Mobilidade';
  const isMobilidade = tipoFiltro === 'Mobilidade';

  // Pool: Mobilidade filtra por articulação; Liberação/Flexibilidade filtra por grupo muscular
  let pool = DB_EXERCICIOS.filter(e =>
    (e.tp||[]).some(t => t.nome === tipoFiltro) &&
    (isMobilidade
      ? (e.artic||[]).some(x => x.nome === item.artic)
      : (e.g||[]).some(g => g.nome === item.musculo)) &&
    _exercicioEquipamentoOk(e, resist) &&
    e.nv && nivelOk(e.nv.chave, nivelChave(nivel))
  );
  // fallback sem filtro de nível/resistência
  if(!pool.length){
    pool = DB_EXERCICIOS.filter(e =>
      (e.tp||[]).some(t => t.nome === tipoFiltro) &&
      (isMobilidade
        ? (e.artic||[]).some(x => x.nome === item.artic)
        : (e.g||[]).some(g => g.nome === item.musculo))
    );
  }

  // Guardar pool no elemento para busca em tempo real
  listEl._pool = pool;

  function _renderAquecItems(filteredPool){
    resultsEl.innerHTML = '';
    if(!filteredPool.length){
      const empty = document.createElement('div');
      empty.style.cssText = 'font-size:12px;color:var(--text3);padding:6px 10px;font-style:italic';
      empty.textContent = 'Nenhum exercício encontrado';
      resultsEl.appendChild(empty);
      return;
    }
    filteredPool.forEach(e => {
      const div = document.createElement('div');
      const isCurrent = e.n === item.nome;
      div.style.cssText = `padding:5px 10px;border-radius:6px;cursor:${isCurrent?'default':'pointer'};font-size:12px;` +
        `color:${isCurrent?'var(--accent)':'var(--text2)'};background:${isCurrent?'rgba(var(--accent-rgb),.1)':'transparent'};` +
        `transition:background .1s;border-left:1px solid ${isCurrent?'var(--accent)':'transparent'}`;
      div.textContent = e.n + (e.tempo ? ` (${e.tempo} rep)` : ' (45s)');
      if(!isCurrent){
        div.onmouseenter = () => div.style.background='var(--bg4)';
        div.onmouseleave = () => div.style.background='transparent';
        div.onclick = () => {
          item.nome = e.n;
          item.url  = e.url || '';
          item.duracao = e.tempo ? '10 rep' : '45s';
          document.querySelectorAll('[id^="lista-aquec-"]').forEach(el => { _desancorarDrop(el); el.classList.add('hidden'); });
          renderTreinoAtivo();
        };
      }
      resultsEl.appendChild(div);
    });
  }

  listEl.innerHTML = '';

  // Campo de busca
  const searchWrap = document.createElement('div');
  searchWrap.style.cssText = 'padding:6px 8px;border-bottom:1px solid var(--border)';
  const srch = document.createElement('input');
  srch.type = 'text';
  srch.placeholder = 'Buscar exercício…';
  srch.style.cssText = 'width:100%;box-sizing:border-box;font-size:12px;padding:4px 8px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);outline:none';
  srch.oninput = () => {
    const q = normalizarTexto(srch.value);
    const filtered = q ? pool.filter(e => normalizarTexto(e.n).includes(q)) : pool;
    _renderAquecItems(filtered);
  };
  searchWrap.appendChild(srch);
  listEl.appendChild(searchWrap);

  // Área de resultados com scroll
  const resultsEl = document.createElement('div');
  resultsEl.style.cssText = 'overflow-y:auto;padding:4px 0';
  listEl.appendChild(resultsEl);

  _renderAquecItems(pool);
  setTimeout(() => srch.focus(), 40);
  listEl.classList.remove('hidden');

  // Ancorar como fixed (escapa do overflow do container, vira pra cima se preciso)
  searchWrap.style.flexShrink = '0';
  _ancorarDropFixo(listEl, document.getElementById(`aqv2-nw-${ti}-${aquecIdx}`) || listEl.parentElement,
    { minWidth: 300, scrollEl: resultsEl });

  // Click-outside: fechar sem trocar seleção
  if(window._aquecOutsideHandler){
    document.removeEventListener('click', window._aquecOutsideHandler, true);
  }
  window._aquecOutsideHandler = function(e){
    const allNws   = document.querySelectorAll('[id^="aqv2-nw-"]');
    const allLists = document.querySelectorAll('[id^="lista-aquec-"]');
    let inside = false;
    allNws.forEach(n => { if(n.contains(e.target)) inside = true; });
    allLists.forEach(l => { if(l.contains(e.target)) inside = true; });
    if(!inside){
      allLists.forEach(l => { _desancorarDrop(l); l.classList.add('hidden'); });
      document.removeEventListener('click', window._aquecOutsideHandler, true);
      window._aquecOutsideHandler = null;
    }
  };
  document.addEventListener('click', window._aquecOutsideHandler, true);
}

// ── Toggle chip de articulação no aquecimento ───────────────────────────────
// Adiciona Mobilidade item se não existe; remove se já existe.
function toggleAquecArtic(ti, artic){
  const treino = _s3.fichaObj.treinos[ti];
  if(!treino.aquecimento) treino.aquecimento = [];
  const idx = treino.aquecimento.findIndex(x => x.tipo==='Mobilidade' && x.artic===artic);
  if(idx >= 0){
    treino.aquecimento.splice(idx, 1);
  } else {
    const s = getActive();
    const nivel = val('pr-nivel') || s?.anamnese?.nivel || 'Inic';
    const local = val('pr-local') || s?.anamnese?.local || '';
    const resist = getEquipamentosPermitidos(local);
    let pool = DB_EXERCICIOS.filter(e =>
      (e.tp||[]).some(t=>t.chave==='Mobilidade') &&
      (e.artic||[]).some(a=>a.nome===artic) &&
      _exercicioEquipamentoOk(e, resist) &&
      e.nv && nivelOk(e.nv.chave, nivelChave(nivel))
    );
    if(!pool.length) pool = DB_EXERCICIOS.filter(e =>
      (e.tp||[]).some(t=>t.chave==='Mobilidade') && (e.artic||[]).some(a=>a.nome===artic));
    if(!pool.length) return;
    const ex = pool[motorRand(0, pool.length-1)];
    treino.aquecimento.push({ tipo:'Mobilidade', artic, musculo:null, nome:ex.n, duracao:ex.tempo?'10 rep':'45s', url:ex.url||'' });
  }
  renderTreinoAtivo();
}

// ── Toggle chip de músculo para tipo específico (Flexibilidade ou Liberação) ──
function toggleAquecMusculo(ti, musculo, tipo){
  const treino = _s3.fichaObj.treinos[ti];
  if(!treino.aquecimento) treino.aquecimento = [];
  const idx = treino.aquecimento.findIndex(x => x.tipo===tipo && x.musculo===musculo);
  if(idx >= 0){
    treino.aquecimento.splice(idx, 1);
  } else {
    const s = getActive();
    const nivel = val('pr-nivel') || s?.anamnese?.nivel || 'Inic';
    const local = val('pr-local') || s?.anamnese?.local || '';
    const resist = getEquipamentosPermitidos(local);
    let pool = DB_EXERCICIOS.filter(e =>
      (e.tp||[]).some(t=>t.nome===tipo) &&
      (e.g||[]).some(g=>g.nome===musculo) &&
      _exercicioEquipamentoOk(e, resist) &&
      e.nv && nivelOk(e.nv.chave, nivelChave(nivel))
    );
    if(!pool.length) pool = DB_EXERCICIOS.filter(e =>
      (e.tp||[]).some(t=>t.nome===tipo) && (e.g||[]).some(g=>g.nome===musculo));
    if(!pool.length) return;
    const ex = pool[motorRand(0, pool.length-1)];
    treino.aquecimento.push({ tipo, artic:null, musculo, nome:ex.n, duracao:ex.tempo?'10 rep':'45s', url:ex.url||'' });
  }
  renderTreinoAtivo();
}

// ── Picker unificado para adicionar exercício de aquecimento ─────────────────
function abrirPickerAdicionarAquecNovo(pickerId, ti){
  const el = document.getElementById(pickerId); if(!el) return;
  const isOpen = !el.classList.contains('hidden');
  document.querySelectorAll('[id^="picker-add-"]').forEach(e => e.classList.add('hidden'));
  if(isOpen) return;

  const tipos = ['Mobilidade','Flexibilidade','Liberação Miofascial','Cardio','Força'];
  const artics = [...new Set(DB_EXERCICIOS.flatMap(e=>(e.artic||[]).map(a=>a.nome)))].sort();
  const grupos = [...new Set(DB_EXERCICIOS.flatMap(e=>(e.g||[]).map(g=>g.nome)))].sort();
  const selSt = 'font-size:12px;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:3px 6px;outline:none';

  el.innerHTML = `<div style="padding:8px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius)">
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
      <select id="${pickerId}-tipo" onchange="_filtrarPickerAquecNovo('${pickerId}')" style="${selSt}">
        <option value="">Tipo</option>
        ${tipos.map(t=>`<option value="${t}">${t}</option>`).join('')}
      </select>
      <select id="${pickerId}-artic" onchange="_filtrarPickerAquecNovo('${pickerId}')" style="${selSt}">
        <option value="">Articulação</option>
        ${artics.map(a=>`<option value="${a}">${a}</option>`).join('')}
      </select>
      <select id="${pickerId}-grupo" onchange="_filtrarPickerAquecNovo('${pickerId}')" style="${selSt}">
        <option value="">Músculo</option>
        ${grupos.map(g=>`<option value="${g}">${g}</option>`).join('')}
      </select>
      <input type="text" id="${pickerId}-busca" placeholder="Buscar nome…" oninput="_filtrarPickerAquecNovo('${pickerId}')"
        style="${selSt};min-width:120px">
    </div>
    <div id="${pickerId}-list" style="max-height:200px;overflow-y:auto;border:1px solid var(--border);border-radius:6px;background:var(--bg)"></div>
    <div id="${pickerId}-count" style="font-size:12px;color:var(--text3);margin-top:4px"></div>
  </div>`;

  el.classList.remove('hidden');
  _filtrarPickerAquecNovo(pickerId);
}

function _filtrarPickerAquecNovo(pickerId){
  const container = document.getElementById(pickerId); if(!container) return;
  const ti = parseInt(container.dataset.ti);
  const tipoSel  = document.getElementById(`${pickerId}-tipo`)?.value   || '';
  const articSel = document.getElementById(`${pickerId}-artic`)?.value  || '';
  const grupoSel = document.getElementById(`${pickerId}-grupo`)?.value  || '';
  const busca    = (document.getElementById(`${pickerId}-busca`)?.value || '').toLowerCase();
  const listEl   = document.getElementById(`${pickerId}-list`);
  const countEl  = document.getElementById(`${pickerId}-count`);
  if(!listEl) return;

  let pool = DB_EXERCICIOS.filter(e => {
    if(tipoSel  && !(e.tp||[]).some(t=>t.nome===tipoSel))      return false;
    if(articSel && !(e.artic||[]).some(a=>a.nome===articSel))  return false;
    if(grupoSel && !(e.g||[]).some(g=>g.nome===grupoSel))      return false;
    if(busca    && !e.n.toLowerCase().includes(busca))          return false;
    return true;
  });

  if(countEl) countEl.textContent = `${pool.length} exercício${pool.length!==1?'s':''} encontrado${pool.length!==1?'s':''}`;
  if(!pool.length){
    listEl.innerHTML = `<span style="font-size:12px;color:var(--text3);padding:8px;display:block">Nenhum resultado</span>`;
    return;
  }
  pool = [...pool].sort((a,b) => (ehFavorito(b.id)?1:0) - (ehFavorito(a.id)?1:0));
  listEl.innerHTML = pool.slice(0,60).map(e => {
    const tipo   = (e.tp||[]).map(t=>t.nome).join(', ');
    const grupo  = (e.g||[]).map(g=>g.nome).join(', ');
    const artic1 = (e.artic&&e.artic[0])?e.artic[0].nome:'';
    const nSafe  = e.n.replace(/'/g,"\\'");
    const uSafe  = (e.url||'').replace(/'/g,"\\'");
    const dSafe  = (e.tempo||'30s').toString().replace(/'/g,"\\'");
    const a1Safe = artic1.replace(/'/g,"\\'");
    const gSafe  = grupo.replace(/'/g,"\\'");
    const tSafe  = tipo.replace(/'/g,"\\'");
    const tagFav = `<span data-exid="${e.id}" onclick="event.stopPropagation();toggleFavorito(${e.id},this)"
        style="font-size:12px;margin-left:4px;cursor:pointer;opacity:.8" title="${ehFavorito(e.id)?'Remover favorito':'Favoritar exercício'}">${ehFavorito(e.id)?'<span style="color:var(--amber);display:inline-flex"><i class=ph-star></i></span>':'<i class=ph-star></i>'}</span>`;
    return `<div style="padding:5px 8px;cursor:pointer;font-size:12px;color:var(--text2);border-bottom:1px solid var(--border);transition:background .1s"
      onmouseenter="this.style.background='var(--bg3)'" onmouseleave="this.style.background=''"
      onclick="_adicionarAquecDoPicker(${ti},'${nSafe}','${a1Safe}','${gSafe}','${uSafe}','${dSafe}','${tSafe}','${pickerId}')">
      ${e.n}${tagFav}${grupo?`<span style="color:var(--text3);font-size:12px"> — ${tipo}${grupo?' | '+grupo:''}</span>`:''}
    </div>`;
  }).join('') + (pool.length>60?`<div style="padding:6px;font-size:12px;color:var(--text3)">+${pool.length-60} resultados — refine os filtros</div>`:'');
}

function _adicionarAquecDoPicker(ti, nome, artic, musculo, url, dur, tipoExerc, pickerId){
  const treino = _s3.fichaObj?.treinos[ti];
  if(!treino){ return; }
  if(!treino.aquecimento) treino.aquecimento = [];
  const isMob = tipoExerc.includes('Mobilidade');
  const aquecTipo = isMob ? 'Mobilidade'
    : tipoExerc.includes('Flexibilidade') ? 'Flexibilidade'
    : tipoExerc.includes('Liberação') ? 'Liberação Miofascial'
    : tipoExerc.split(',')[0].trim() || 'Mobilidade';
  treino.aquecimento.push({
    tipo: aquecTipo,
    artic: aquecTipo==='Mobilidade' ? (artic||null) : null,
    musculo: aquecTipo!=='Mobilidade' ? (musculo||null) : null,
    nome, duracao: dur||'30s', url: url||''
  });
  document.getElementById(pickerId)?.classList.add('hidden');
  renderTreinoAtivo();
}

// ── Picker para adicionar exercício à Parte Principal ────────────────────────
function abrirPickerPrincipal(ti, pickerId){
  const el = document.getElementById(pickerId); if(!el) return;
  const isOpen = !el.classList.contains('hidden');
  document.querySelectorAll('[id^="picker-add-"]').forEach(e => e.classList.add('hidden'));
  if(isOpen) return;

  const grupos     = [...new Set(DB_EXERCICIOS.flatMap(e=>(e.g||[]).map(g=>g.nome)))].sort();
  const equips     = [...new Set(DB_EXERCICIOS.flatMap(e=>(e.eq||[]).map(q=>q.nome)))].sort();
  const artics     = [...new Set(DB_EXERCICIOS.flatMap(e=>(e.artic||[]).map(a=>a.nome)))].sort();
  const nArtics    = [...new Set(DB_EXERCICIOS.map(e=>e.art?.nome).filter(Boolean))].sort();
  const padroes    = [...new Set(DB_EXERCICIOS.map(e=>e.pad?.nome).filter(Boolean))].sort();
  const tipos      = [...new Set(DB_EXERCICIOS.flatMap(e=>(e.tp||[]).map(t=>t.nome)))].sort();
  const resists    = [...new Set(DB_EXERCICIOS.map(e=>e.r?.nome).filter(Boolean))].sort();
  const lats       = [...new Set(DB_EXERCICIOS.map(e=>e.lateralidade?.nome).filter(Boolean))].sort();
  const selSt = 'font-size:12px;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:2px 5px;outline:none';

  const makeOpts = (arr, placeholder) =>
    `<option value="">${placeholder}</option>` + arr.map(v=>`<option value="${v}">${v}</option>`).join('');

  el.innerHTML = `<div style="padding:8px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius)">
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:5px;margin-bottom:6px">
      <select id="${pickerId}-grupo"  onchange="_filtrarPickerPrincipal('${pickerId}')" style="${selSt}">${makeOpts(grupos,'Grupo muscular')}</select>
      <select id="${pickerId}-eq"     onchange="_filtrarPickerPrincipal('${pickerId}')" style="${selSt}">${makeOpts(equips,'Equipamento')}</select>
      <select id="${pickerId}-artic"  onchange="_filtrarPickerPrincipal('${pickerId}')" style="${selSt}">${makeOpts(artics,'Articulação')}</select>
      <select id="${pickerId}-nart"   onchange="_filtrarPickerPrincipal('${pickerId}')" style="${selSt}">${makeOpts(nArtics,'N. articulação')}</select>
      <select id="${pickerId}-pad"    onchange="_filtrarPickerPrincipal('${pickerId}')" style="${selSt}">${makeOpts(padroes,'Padrão de movimento')}</select>
      <select id="${pickerId}-tp"     onchange="_filtrarPickerPrincipal('${pickerId}')" style="${selSt}">${makeOpts(tipos,'Tipo de exercício')}</select>
      <select id="${pickerId}-resist" onchange="_filtrarPickerPrincipal('${pickerId}')" style="${selSt}">${makeOpts(resists,'Tipo resistência')}</select>
      <select id="${pickerId}-lat"    onchange="_filtrarPickerPrincipal('${pickerId}')" style="${selSt}">${makeOpts(lats,'Lateralidade')}</select>
    </div>
    <input type="text" id="${pickerId}-busca" placeholder="Buscar nome…" oninput="_filtrarPickerPrincipal('${pickerId}')"
      style="${selSt};width:100%;box-sizing:border-box;margin-bottom:6px">
    <div id="${pickerId}-list" style="max-height:220px;overflow-y:auto;border:1px solid var(--border);border-radius:6px;background:var(--bg)"></div>
    <div id="${pickerId}-count" style="font-size:12px;color:var(--text3);margin-top:4px"></div>
  </div>`;

  el.classList.remove('hidden');
  _filtrarPickerPrincipal(pickerId);
}

function _filtrarPickerPrincipal(pickerId){
  const container = document.getElementById(pickerId); if(!container) return;
  const ti = parseInt(container.dataset.ti);
  const grupoSel  = document.getElementById(`${pickerId}-grupo`)?.value  || '';
  const eqSel     = document.getElementById(`${pickerId}-eq`)?.value     || '';
  const articSel  = document.getElementById(`${pickerId}-artic`)?.value  || '';
  const nartSel   = document.getElementById(`${pickerId}-nart`)?.value   || '';
  const padSel    = document.getElementById(`${pickerId}-pad`)?.value    || '';
  const tpSel     = document.getElementById(`${pickerId}-tp`)?.value     || '';
  const resistSel = document.getElementById(`${pickerId}-resist`)?.value || '';
  const latSel    = document.getElementById(`${pickerId}-lat`)?.value    || '';
  const busca     = (document.getElementById(`${pickerId}-busca`)?.value || '').toLowerCase();
  const listEl    = document.getElementById(`${pickerId}-list`);
  const countEl   = document.getElementById(`${pickerId}-count`);
  if(!listEl) return;

  let pool = DB_EXERCICIOS.filter(e => {
    if(grupoSel  && !(e.g||[]).some(g=>g.nome===grupoSel))       return false;
    if(eqSel     && !(e.eq||[]).some(q=>q.nome===eqSel))         return false;
    if(articSel  && !(e.artic||[]).some(a=>a.nome===articSel))   return false;
    if(nartSel   && e.art?.nome!==nartSel)                       return false;
    if(padSel    && e.pad?.nome!==padSel)                        return false;
    if(tpSel     && !(e.tp||[]).some(t=>t.nome===tpSel))         return false;
    if(resistSel && e.r?.nome!==resistSel)                       return false;
    if(latSel    && e.lateralidade?.nome!==latSel)               return false;
    if(busca     && !e.n.toLowerCase().includes(busca))           return false;
    return true;
  });

  if(countEl) countEl.textContent = `${pool.length} exercício${pool.length!==1?'s':''} encontrado${pool.length!==1?'s':''}`;
  if(!pool.length){
    listEl.innerHTML = `<span style="font-size:12px;color:var(--text3);padding:8px;display:block">Nenhum exercício encontrado para os filtros selecionados</span>`;
    return;
  }
  pool = [...pool].sort((a,b) => (ehFavorito(b.id)?1:0) - (ehFavorito(a.id)?1:0));
  listEl.innerHTML = pool.slice(0,60).map(e => {
    const grupo  = (e.g||[]).map(g=>g.nome).join(', ');
    const tags   = [e.pad?.nome, e.art?.nome, e.r?.nome, e.lateralidade?.nome].filter(Boolean).join(' · ');
    const nSafe  = e.n.replace(/'/g,"\\'");
    const gSafe  = grupo.replace(/'/g,"\\'");
    const tagFav = `<span data-exid="${e.id}" onclick="event.stopPropagation();toggleFavorito(${e.id},this)"
        style="font-size:12px;margin-left:4px;cursor:pointer;opacity:.8" title="${ehFavorito(e.id)?'Remover favorito':'Favoritar exercício'}">${ehFavorito(e.id)?'<span style="color:var(--amber);display:inline-flex"><i class=ph-star></i></span>':'<i class=ph-star></i>'}</span>`;
    return `<div style="padding:5px 8px;cursor:pointer;font-size:12px;color:var(--text2);border-bottom:1px solid var(--border);transition:background .1s"
      onmouseenter="this.style.background='var(--bg3)'" onmouseleave="this.style.background=''"
      onclick="_adicionarExercicioPrincipal(${ti},'${nSafe}','${gSafe}','${pickerId}')">
      <div style="font-weight:500">${e.n}${tagFav}</div>
      ${grupo?`<div style="font-size:12px;color:var(--text3)">${grupo}${tags?' · '+tags:''}</div>`:''}
    </div>`;
  }).join('') + (pool.length>60?`<div style="padding:6px;font-size:12px;color:var(--text3)">+${pool.length-60} resultados — refine os filtros</div>`:'');
}

function _adicionarExercicioPrincipal(ti, nome, musculo, pickerId){
  const treino = _s3.fichaObj?.treinos[ti]; if(!treino) return;
  const dbEx   = DB_EXERCICIOS.find(e=>e.n===nome);
  const grupoFinal = musculo || (dbEx?.g?.[0]?.nome) || 'Geral';
  const s2 = getActive(); const obj2 = val('pr-objetivo')||s2?.anamnese?.objetivo||'Hip';
  treino.exercicios.push({
    musculo: grupoFinal, porcao:'Geral', nome,
    series:3, reps: REPS_REF[obj2]||'10', intensidade: INT_REF[obj2]||'65% 1RM', intervalo: INT_DESCANSO[obj2]||'90s',
    nota_clinica:'',
    _artic: (dbEx?.artic||[]).map(a=>a.nome),
    _pad:   dbEx?.pad?.id || '',
    _tempoRep: dbEx?.tempo || '',
    _contracaoIsometrica: dbEx?.contracao?.chave==='Isometrica',
    _uni: (dbEx?.lateralidade?.id===3)?1:0,
  });
  if(treino.aquecimento && treino.aquecimento.length) treino._aquecDesatualizado = true;
  document.getElementById(pickerId)?.classList.add('hidden');
  renderTreinoAtivo();
}

// ── Selecionar chip de músculo: remove se já existe, ou abre picker de tipo ──
function selecionarMusculoAquec(ti, musculo, btn){
  const treino = _s3.fichaObj.treinos[ti];
  if(!treino.aquecimento) treino.aquecimento = [];
  const idx = treino.aquecimento.findIndex(x => x.musculo===musculo && x.tipo!=='Mobilidade');
  if(idx >= 0){
    treino.aquecimento.splice(idx, 1);
    renderTreinoAtivo(); return;
  }
  // Mostra picker de tipo inline
  const pickerId = `picker-tipo-aquec-${ti}`;
  const pickerEl = document.getElementById(pickerId); if(!pickerEl) return;
  const hasLib  = DB_EXERCICIOS.some(e => (e.tp||[]).some(t=>t.chave==='LiberacaoMiofascial') && (e.g||[]).some(g=>g.nome===musculo));
  const hasFlex = DB_EXERCICIOS.some(e => (e.tp||[]).some(t=>t.chave==='Flexibilidade') && (e.g||[]).some(g=>g.nome===musculo));
  const mSafe = musculo.replace(/'/g,"\\'");
  pickerEl.innerHTML = `
    <span style="font-size:12px;color:var(--text3);white-space:nowrap">Tipo para <strong style="color:var(--text2)">${musculo}</strong>:</span>
    <button onclick="adicionarAquecMusculo(${ti},'${mSafe}','Liberação Miofascial')"
      style="font-size:12px;padding:3px 12px;border-radius:12px;border:1px solid ${hasLib?'var(--amber)':'var(--border)'};color:${hasLib?'var(--amber)':'var(--text3)'};background:transparent;cursor:${hasLib?'pointer':'default'};${!hasLib?'opacity:.4;':''}transition:all .15s"
      ${!hasLib?'disabled':''}>Liberação</button>
    <button onclick="adicionarAquecMusculo(${ti},'${mSafe}','Flexibilidade')"
      style="font-size:12px;padding:3px 12px;border-radius:12px;border:1px solid ${hasFlex?'var(--accent)':'var(--border)'};color:${hasFlex?'var(--accent)':'var(--text3)'};background:transparent;cursor:${hasFlex?'pointer':'default'};${!hasFlex?'opacity:.4;':''}transition:all .15s"
      ${!hasFlex?'disabled':''}>Flexibilidade</button>
    <button onclick="document.getElementById('${pickerId}').classList.add('hidden')"
      style="font-size:12px;color:var(--text3);background:none;border:none;cursor:pointer;margin-left:4px"><i class=ph-x></i></button>`;
  pickerEl.classList.remove('hidden');
}

// ── Adicionar item de aquecimento muscular após tipo escolhido ───────────────
function adicionarAquecMusculo(ti, musculo, tipo){
  const treino = _s3.fichaObj.treinos[ti];
  if(!treino.aquecimento) treino.aquecimento = [];
  const s = getActive();
  const nivel = val('pr-nivel') || s?.anamnese?.nivel || 'Inic';
  const local = val('pr-local') || s?.anamnese?.local || '';
  const resist = getEquipamentosPermitidos(local);
  let pool = DB_EXERCICIOS.filter(e =>
    (e.tp||[]).some(t=>t.nome===tipo) &&
    (e.g||[]).some(g=>g.nome===musculo) &&
    _exercicioEquipamentoOk(e, resist) &&
    e.nv && nivelOk(e.nv.chave, nivelChave(nivel))
  );
  if(!pool.length) pool = DB_EXERCICIOS.filter(e =>
    (e.tp||[]).some(t=>t.nome===tipo) && (e.g||[]).some(g=>g.nome===musculo));
  if(!pool.length) return;
  // Remove existing item for this musculo (replace with new tipo)
  treino.aquecimento = treino.aquecimento.filter(x => !(x.musculo===musculo && x.tipo!=='Mobilidade'));
  const ex = pool[motorRand(0, pool.length-1)];
  treino.aquecimento.push({ tipo, artic:null, musculo, nome:ex.n, duracao:ex.tempo||'30–45s', url:ex.url||'' });
  renderTreinoAtivo();
}

// ── Remover item do aquecimento ─────────────────────────────────────────────
function removerItemAquecimento(ti, aquecIdx){
  const treino = _s3.fichaObj.treinos[ti];
  if(treino.aquecimento) treino.aquecimento.splice(aquecIdx, 1);
  renderTreinoAtivo();
}

function gerarFichaMotorV2(params){
  const {objetivo, nivel, frequencia, local, lesoes, preferencias,
         seriesPorEx, volPorGrupo, divisaoChave,
         sessionDataByTreino, duracaoDisponivel} = params;  // ← sessionDataByTreino: [{g,numEx,serEx}][] por sessão

  const numDias = parseInt(frequencia)||3;
  const divisao = (divisaoChave !== undefined && DIVISOES_TEMPLATES[divisaoChave])
    ? DIVISOES_TEMPLATES[divisaoChave]
    : (DIVISOES[numDias] || DIVISOES[3]);

  const resistPermitida = getEquipamentosPermitidos(local);

  // Filtros clínicos do aluno — consolidados aqui para uso no motor
  const s = getActive();
  const a = s?.anamnese || {};
  const p = s?.perfil   || {};

  // Contraindicações: lesões + preferências + condições clínicas
  const contraindicacoes = [
    lesoes || '',
    preferencias || '',
    p.condicoes || '',
    p.lesoes || '',
  ].filter(Boolean).join(' ');

  // Filtro de sexo para prioridade de grupos
  // Mulheres: glúteos são primários; peitoral cai para secundário
  // Homens: quadríceps/posterior são primários; glúteos ficam em nível neutro
  const sexo = p.sexo || '';
  const gruposPrioritariosFinal = new Set([...GRUPOS_PRIMARIOS]);
  if(sexo === 'F'){
    gruposPrioritariosFinal.add('Gluteos');
    // 'Gluteos (Maximo)' / '(Medio)' foram removidos: nao existem como id de
    // GRUPOS_MAPA nem como chave do banco — nunca casavam com nada.
    // Peitoral é menos prioritário para mulheres
    gruposPrioritariosFinal.delete('Peitoral');
  } else if(sexo === 'M'){
    // Para homens, glúteos ficam em nível neutro (nem primário nem secundário)
    gruposPrioritariosFinal.delete('Gluteos');
  }

  const repsRef   = REPS_REF[objetivo]     || '10–15';
  const intensRef = INT_REF[objetivo]      || '60–75% 1RM';
  const descRef   = INT_DESCANSO[objetivo] || '60–90s';
  const jaUsados  = new Set();
  const treinos   = [];

  divisao.default.forEach((treinoGruposTemplate, ti) => {
    const exerciciosTreino = [];

    // ── Obter dados da sessão: prioridade é sessionDataByTreino (DOM) ──────
    // Fallback: calcular a partir de volPorGrupo para grupos presentes no template
    let sessaoGrupos;
    if(sessionDataByTreino && sessionDataByTreino[ti] && sessionDataByTreino[ti].length > 0){
      // Usar exatamente o que o usuário configurou — filtrar só grupos ativos
      sessaoGrupos = sessionDataByTreino[ti].filter(sd => {
        const vg = volPorGrupo?.[sd.g];
        return vg && vg.ativo !== false;
      });
    } else {
      // Fallback: calcular a partir do template, usando o teto de Volume da Sessão
      // (LIM_SESSAO_REF — vault REF-Volume-Derivado-MAV §9) como referência, já que
      // VOL_REF (tabela órfã antiga) foi removida. LIM_SESSAO_REF agora é faixa
      // [min,max]; usa o ponto médio como proxy de referência neste fallback.
      const faixaRef = (LIM_SESSAO_REF[objetivo] || LIM_SESSAO_REF['Saude'])[nivel] || [16,24];
      const limRef = Math.round((faixaRef[0] + faixaRef[1]) / 2);
      sessaoGrupos = treinoGruposTemplate
        .filter(({g}) => {
          const vg = volPorGrupo?.[g];
          return vg && vg.ativo !== false;
        })
        .map(({g}) => {
          const vg = volPorGrupo?.[g];
          const sEx = (vg?.serEx) || seriesPorEx;
          const serSessao = vg?.sessao > 0 ? vg.sessao : Math.max(sEx, Math.round(limRef / Math.max(1, divisao.default.filter(t=>t.some(m=>m.g===g)).length)));
          const numEx = Math.max(1, Math.ceil(serSessao / sEx));
          return { g, numEx, serEx: sEx, serSessao: numEx * sEx };
        });
    }

    // ── Aplicar limite de sessão com corte por prioridade ─────────────────
    const lim = _s3.limSessao || calcLimSessaoRecomendado();
    let totalSessao = sessaoGrupos.reduce((acc, sd) => acc + sd.serSessao, 0);

    if(totalSessao > lim && lim > 0){
      // Cortar de secundários primeiro, depois primários
      const sorted = [...sessaoGrupos].sort((a, b) => {
        // Os dois lados agora sao chave ASCII (GRUPOS_PRIMARIOS/SECUNDARIOS
        // migrados) — .has() direto, sem normalizacao em runtime.
        const temPrioridade = (set, g) => set.has(g);
        const aPri = temPrioridade(gruposPrioritariosFinal, a.g) ? 2 : temPrioridade(GRUPOS_SECUNDARIOS, a.g) ? 0 : 1;
        const bPri = temPrioridade(gruposPrioritariosFinal, b.g) ? 2 : temPrioridade(GRUPOS_SECUNDARIOS, b.g) ? 0 : 1;
        return aPri - bPri; // secundários primeiro (menores ficam no começo → cortados primeiro)
      });

      // Reduzir séries dos grupos de menor prioridade até caber no limite
      for(const sd of sorted){
        if(totalSessao <= lim) break;
        const excesso = totalSessao - lim;
        const reducao = Math.min(excesso, sd.serSessao - sd.numEx); // mínimo 1 série por exercício
        if(reducao > 0){
          const novasSeries = sd.serSessao - reducao;
          // Redistribuir: reduz serEx mantendo numEx, ou reduz numEx
          const novoSerEx = Math.max(1, Math.floor(novasSeries / sd.numEx));
          const novoNumEx = novoSerEx >= 2 ? sd.numEx : Math.max(1, Math.floor(novasSeries));
          sd.serEx     = novoSerEx;
          sd.numEx     = novoNumEx;
          sd.serSessao = sd.numEx * sd.serEx;
          totalSessao  = sessaoGrupos.reduce((acc, s) => acc + s.serSessao, 0);
        }
      }
    }

    // ── Fase F — tempo estimado de treino: estima o quanto essa sessão vai
    // apertar em relação ao tempo disponível, ANTES de escolher os exercícios
    // (só sabemos grupo/nº exercícios/nº séries nesse ponto, ainda não qual
    // exercício específico — por isso usa o tempo MÉDIO real por grupo, não o
    // de um exercício, ver estimarTempoModeloSessao). O cálculo fino, com os
    // exercícios já escolhidos (grupamento/biset/unilateral), é feito depois
    // em calcularTempoEstimadoTreino (Momento 2).
    // `objetivo` aqui é um dos 12 códigos do motor (Hip/Forca/Emagr/...), não
    // uma das 4 valências de treino (Força/Hipertrofia/Resistência/Potência)
    // usadas no cálculo de tempo — mapeamento abaixo é PROVISÓRIO (meu
    // julgamento pela faixa de reps de cada objetivo em REPS_REF), confirmar
    // com o Milton antes de considerar fechado.
    const gruposPlanejadosModelo = sessaoGrupos.map(sd => ({ grupo: sd.g, nExercicios: sd.numEx, nSeries: sd.serEx }));
    const tempoEstimadoModelo = estimarTempoModeloSessao(gruposPlanejadosModelo, objetivo);
    const segundosPlanejados = tempoEstimadoModelo.medio;
    const segundosDisponiveis = (duracaoDisponivel||60)*60;
    // "Aperto": 0 = sessão cabe tranquila no tempo disponível; cresce conforme o
    // planejado passa do disponível. Usado como bônus contínuo (não por limiar)
    // pra exercícios eficientes (multiarticular + atinge grupo secundário) no
    // sorteio — quanto mais apertada a sessão, mais o motor favorece eficiência.
    const aperto = segundosDisponiveis>0 ? Math.max(0, (segundosPlanejados-segundosDisponiveis)/segundosDisponiveis) : 0;

    // ── Gerar exercícios respeitando sessaoGrupos ──────────────────────────
    sessaoGrupos.forEach(({ g: musculo, numEx, serEx: seriesFinal }) => {
      if(numEx < 1) return;

      const porcoes = (PORCOES[musculo] || [null]).slice(0, numEx);
      while(porcoes.length < numEx) porcoes.push(null);

      for(let slot = 0; slot < numEx; slot++){
        const porcao = porcoes[slot] !== undefined ? porcoes[slot] : null;
        let pool = filtrarExerciciosFicha(musculo, porcao, resistPermitida, nivel, contraindicacoes);
        if(pool.length === 0) pool = filtrarExerciciosFicha(musculo, null, resistPermitida, nivel, contraindicacoes);
        if(pool.length === 0) continue; // sem exercício disponível — pular

        const ex = sortearExercicioC4(pool, jaUsados, musculo, exerciciosTreino, aperto);
        if(ex){
          jaUsados.add(ex.n);
          const nota = gerarNotaAssimetria(musculo);
          exerciciosTreino.push({
            musculo, porcao: porcao||'Geral', nome: ex.n,
            series: seriesFinal, reps: repsRef,
            intensidade: intensRef, intervalo: descRef,
            nota_clinica: nota || '',
            _artic: (ex.artic||[]).map(a=>a.nome), // guarda a(s) articulação(ões) do exercício escolhido —
            // não aparece na ficha, é só o insumo pra montar o aquecimento da sessão logo abaixo.
            _pad: ex.pad?.id || '', // insumo pro bônus de variedade por tipo de movimentação (Fase C) — não aparece na ficha.
            _tempoRep: ex.tempo || '',
            _contracaoIsometrica: ex.contracao?.chave === 'Isometrica',
            _uni: _exercicioUnilateral(ex) ? 1 : 0,
          });
        }
      }
    });

    // ── Aquecimento automático da sessão ────────────────────────────────────
    // Gerado A PARTIR dos exercícios principais já escolhidos acima — não é um
    // bloco fixo por grupo muscular, é literalmente "quais articulações essa
    // sessão específica vai exigir", então muda sessão a sessão e aluno a aluno.
    // Fica de fora de `exercicios` (não soma séries, não entra no cálculo de
    // volume/MEV-MAV-MRV) — é preparação, não é a parte que ele registra carga.
    const articsTreino = new Set();
    exerciciosTreino.forEach(ex => {
      (Array.isArray(ex._artic) ? ex._artic : (ex._artic||'').split('|'))
        .forEach(a => { a = (a||'').trim(); if(a) articsTreino.add(a); });
    });
    const aquecimento = gerarAquecimentoArticular(articsTreino, resistPermitida, nivel, contraindicacoes, _s3.aquecTipos);

    treinos.push({
      label: divisao.label[ti] || `Treino ${String.fromCharCode(65+ti)}`,
      aquecimento,
      exercicios: exerciciosTreino,
      // Estimativa da tela de modelos (Momento 1) — mín (tudo Bilateral) / máx
      // (tudo Unilateral) / médio (o que se mostra pro personal). Ainda sem
      // tela própria pra exibir isso — guardado aqui pra quando a tela existir.
      tempoEstimadoModelo: {
        minSeg: Math.round(tempoEstimadoModelo.min),
        maxSeg: Math.round(tempoEstimadoModelo.max),
        medioSeg: Math.round(tempoEstimadoModelo.medio),
        minMin: Math.round(tempoEstimadoModelo.min/60),
        maxMin: Math.round(tempoEstimadoModelo.max/60),
        medioMin: Math.round(tempoEstimadoModelo.medio/60),
      },
    });
  });

  return { objetivo, nivel, frequencia, local, seriesPorEx,
           treinos, dataGeracao: new Date().toLocaleDateString('pt-BR'),
           duracaoAlvoMin: duracaoDisponivel||60 };
}


// ══════════════════════════════════════════════════════════════════════════════
// PERIODIZAÇÃO — renderPeriod + CRUD + Acompanhamento de Carga
// ══════════════════════════════════════════════════════════════════════════════

// ── Render tela de periodização ───────────────────────────────────────────────
function renderPeriod(){
  const grid = $('period-grid'); if(!grid) return;
  const lista = LIBS.periodizacao || [];
  const btnAcomp = $('btn-period-acomp');
  if(btnAcomp) btnAcomp.style.display = lista.length ? 'inline-flex' : 'none';
  grid.innerHTML = '';
  if(!lista.length){
    grid.innerHTML = '<div style="color:var(--text3);font-size:13px">Nenhum modelo cadastrado. Clique em "+ Novo Modelo" para criar.</div>';
    return;
  }
  const OBJ_LBL = {Hip:'Hipertrofia',Forca:'Força',Emagr:'Emagrecimento',Comp:'Composição',
    Resist:'Resistência',CardioR:'Cardio',Func:'Funcional',Saude:'Saúde',
    Esport:'Esportivo',Reab:'Reabilitação',Envelhec:'Envelhecimento',Gestacao:'Gestação'};
  lista.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card'; card.style.margin = '0';
    const objBadges = (p.objetivos_compativeis||[]).map(o =>
      `<span class="badge badge-green" style="font-size:12px">${escHTML(OBJ_LBL[o]||o)}</span>`).join('');
    const freqBadges = (p.freq_compativeis||[]).map(f =>
      `<span class="badge badge-blue" style="font-size:12px">${escHTML(f)}</span>`).join('');
    const bloqBadge = (p.bloq_nivel||[]).length
      ? `<span class="badge badge-red" style="font-size:12px">Bloqueia: ${escHTML(p.bloq_nivel.join(', '))}</span>` : '';
    const mesos = p.mesos||[];
    const totalSem = mesos.reduce((a,m)=>(a+(m.semanas||[]).length),0);
    card.innerHTML = `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;gap:8px">
        <div style="flex:1">
          <div style="font-size:15px;font-weight:700;color:var(--text)">${escHTML(p.nome)}</div>
          <div style="font-size:12px;color:var(--text3);margin-top:2px">${escHTML(p.sigla||'')} · ${p.duracao||''} · ${totalSem} semanas mapeadas</div>
        </div>
        <div style="display:flex;gap:5px;flex-shrink:0">
          <button class="btn btn-ghost btn-sm" onclick="editarPeriod(${p.id})"><i class=ph-pencil-simple></i></button>
          <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="deletarItem('periodizacao',${p.id})"><i class=ph-x></i></button>
        </div>
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px">
        <span class="badge badge-gray" style="font-size:12px">${escHTML(p.nivel||'Qualquer nível')}</span>
        ${p.nivel_max?`<span class="badge badge-gray" style="font-size:12px">até ${escHTML(p.nivel_max)}</span>`:''}
        ${p.sexo?`<span class="badge badge-amber" style="font-size:12px">${p.sexo==='M'?'<i class=ph-gender-male></i> Masc':'<i class=ph-gender-female></i> Fem'}</span>`:''}
        ${bloqBadge}
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">${objBadges}</div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px">${freqBadges}</div>
      ${p.desc?`<div style="font-size:12px;color:var(--text2);margin-bottom:10px">${escHTML(p.desc)}</div>`:''}
      <div style="background:var(--bg4);border-radius:var(--radius);padding:8px 10px;font-size:12px;color:var(--text3)">
        <div style="font-weight:600;color:var(--text2);margin-bottom:5px">Parâmetros base</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px">
          <div>Intensidade: <strong style="color:var(--text)">${escHTML(p.intensidade||'—')}</strong></div>
          <div>RPE: <strong style="color:var(--text)">${escHTML(p.rpe||'—')}</strong></div>
          <div>Vol/músculo: <strong style="color:var(--text)">${escHTML(p.vol_sem||'—')}</strong></div>
          <div>Reps: <strong style="color:var(--text)">${escHTML(p.reps||'—')}</strong></div>
          <div>Intervalo: <strong style="color:var(--text)">${escHTML(p.intervalo||'—')}</strong></div>
          <div>TUT: <strong style="color:var(--text)">${escHTML(p.tut||'—')}</strong></div>
        </div>
      </div>
      ${mesos.length?`
      <div style="margin-top:10px">
        <div style="font-size:12px;font-weight:600;color:var(--text3);margin-bottom:6px">${mesos.length} Mesociclo(s)</div>
        ${mesos.map(m=>`
          <div style="margin-bottom:6px;background:var(--bg4);border-radius:6px;padding:7px 10px">
            <div style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:4px">${escHTML(m.nome)}</div>
            ${(m.semanas||[]).map(s=>`
              <div style="font-size:12px;color:var(--text2);display:flex;gap:8px;padding:2px 0">
                <span style="color:var(--text3);font-variant-numeric:tabular-nums;min-width:40px">Sem ${escHTML(s.num)}</span>
                <span class="badge ${s.tipo==='Deload'?'badge-amber':s.tipo==='Teste'?'badge-blue':'badge-green'}" style="font-size:12px">${escHTML(s.tipo)}</span>
                <span>${escHTML(s.series||'')}</span>
                <span style="color:var(--text3)">${escHTML(s.intensidade||'')}</span>
                <span style="color:var(--accent);font-size:12px">${escHTML(s.foco||'')}</span>
              </div>`).join('')}
          </div>`).join('')}
      </div>`:''
      }
      ${(p.regras||[]).length?`
      <div style="margin-top:10px">
        <div style="font-size:12px;font-weight:600;color:var(--text3);margin-bottom:5px">Regras de progressão</div>
        ${p.regras.map(r=>`<div style="font-size:12px;color:var(--text2);padding:3px 0">▸ <em>${escHTML(r.criterio)}</em> → <strong style="color:var(--accent)">${escHTML(r.acao)}</strong></div>`).join('')}
      </div>`:''
      }
      ${p.ref?`<div style="font-size:12px;color:var(--text3);margin-top:8px;border-top:1px solid var(--border);padding-top:6px"><i class=ph-books></i> ${escHTML(p.ref)}</div>`:''}
    `;
    grid.appendChild(card);
  });
}

// ── Modal abrir/fechar ────────────────────────────────────────────────────────
function abrirModalPeriod(){ preencherModalPeriod(null); $('modal-period').classList.remove('hidden'); }
function fecharModalPeriod(){ $('modal-period').classList.add('hidden'); }

// ── Preencher modal com dados existentes ou em branco ─────────────────────────
function preencherModalPeriod(p){
  $('period-edit-id').value = p ? p.id : '';
  $('modal-period-title').textContent = p ? 'Editar Modelo de Periodização' : 'Novo Modelo de Periodização';

  const sv = (id, v) => { const el=$(id); if(el) el.value = v||''; };
  sv('period-nome',        p?.nome||'');
  sv('period-sigla',       p?.sigla||'LP');
  sv('period-duracao',     p?.duracao||'8 semanas');
  sv('period-estrutura-meso', p?.estrutura_meso||'2x4');
  sv('period-divisao',     p?.divisao||'Full Body');
  sv('period-desc',        p?.desc||'');
  sv('period-ref',         p?.ref||'');
  sv('period-intensidade', p?.intensidade||'60–75%');
  sv('period-rpe',         p?.rpe||'6–8');
  sv('period-vol-sem',     p?.vol_sem||'10–20');
  sv('period-reps',        p?.reps||'10–15');
  sv('period-intervalo',   p?.intervalo||'60–90s');
  sv('period-tut',         p?.tut||'2-1-2');
  sv('period-nivel',       p?.nivel||'');
  sv('period-nivel-max',   p?.nivel_max||'');
  sv('period-sexo',        p?.sexo||'');
  sv('period-bloq-obs',    p?.bloq_obs||'');
  sv('period-criterios',   p?.criterios||'');
  sv('period-acionamentos',p?.acionamentos||'');

  // Objetivos compatíveis
  document.querySelectorAll('#period-obj-wrap input[type=checkbox]').forEach(cb => {
    cb.checked = (p?.objetivos_compativeis||[]).includes(cb.value);
  });
  // Frequências
  ['2x','3x','4x','5x','6x'].forEach(f => {
    const el = document.querySelector(`#period-obj-wrap ~ div input[value="${f}"]`) ||
               document.getElementById('pf-'+f.replace('x','x'));
    const cb2 = document.querySelector(`input[id="pf-${f.replace('+','').replace('x','x')}"]`);
    if(cb2) cb2.checked = (p?.freq_compativeis||[]).includes(f);
  });
  // Bloqueios nível
  ['inic','inte','avan'].forEach(k => {
    const cb = document.getElementById('bl-'+k); if(!cb) return;
    const map = {inic:'Iniciante',inte:'Intermediário',avan:'Avançado'};
    cb.checked = (p?.bloq_nivel||[]).includes(map[k]);
  });
  // Bloqueios condição
  ['gestacao','lesao','card'].forEach(k => {
    const cb = document.getElementById('bc-'+k); if(!cb) return;
    const map = {gestacao:'Gestação',lesao:'Lesão ativa',card:'Cardiopatia'};
    cb.checked = (p?.bloq_cond||[]).includes(map[k]);
  });

  // Mesociclos
  const mWrap = $('period-mesos-wrap'); mWrap.innerHTML = '';
  (p?.mesos||[]).forEach(m => adicionarMesoDOM(m));
  if(!(p?.mesos||[]).length) adicionarMesoDOM(null);

  // Regras
  const rWrap = $('period-regras-wrap'); rWrap.innerHTML = '';
  (p?.regras||[]).forEach(r => adicionarRegraDOM(r.criterio, r.acao));
  if(!(p?.regras||[]).length) adicionarRegraDOM('','');
}

// ── Adicionar mesociclo ao DOM ────────────────────────────────────────────────
function adicionarMesoDOM(meso){
  const wrap = $('period-mesos-wrap'); if(!wrap) return;
  const idx = wrap.querySelectorAll('.meso-block').length;
  const div = document.createElement('div');
  div.className = 'meso-block';
  div.style.cssText = 'border:1px solid var(--border);border-radius:6px;padding:10px 12px;margin-bottom:10px;background:var(--bg4)';

  const semHtml = (meso?.semanas||[{num:1,tipo:'Carga',series:'3×10',intensidade_code:'base',foco:'Adaptação',prog_carga:0,prog_vol:0}]).map((s,si) =>
    `<div class="sem-row" style="display:grid;grid-template-columns:40px 90px 80px 100px 1fr 60px 60px;gap:6px;align-items:center;margin-bottom:4px">
      <input type="number" class="sem-num" value="${s.num||si+1}" min="1" max="52"
        style="width:100%;padding:4px 5px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-variant-numeric:tabular-nums;font-size:12px;text-align:center">
      <select class="sem-tipo" style="font-size:12px;padding:4px 5px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text)">
        ${['Carga','Deload','Teste'].map(t=>`<option${s.tipo===t?' selected':''}>${t}</option>`).join('')}
      </select>
      <input type="text" class="sem-series" value="${escHTML(s.series||'3×10')}" placeholder="3×10"
        style="width:100%;padding:4px 5px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-variant-numeric:tabular-nums;font-size:12px">
      <select class="sem-intens" style="font-size:12px;padding:4px 5px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text)">
        ${[['conservador','−10% (conservador)'],['base','Base'],
           ['+2.5','+2,5%'],['+5','+5%'],['+7.5','+7,5%'],['+10','+10%'],
           ['-10','−10%'],['-15','−15%'],['-20','−20%']
        ].map(([v,lbl])=>`<option value="${v}"${s.intensidade_code===v?' selected':''}>${lbl}</option>`).join('')}
      </select>
      <input type="text" class="sem-foco" value="${escHTML(s.foco||'')}" placeholder="Foco da semana"
        style="width:100%;padding:4px 5px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px">
      <input type="number" class="sem-dcarga" value="${s.prog_carga||0}" placeholder="Δcarga%"
        style="width:100%;padding:4px 5px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-variant-numeric:tabular-nums;font-size:12px;text-align:center">
      <input type="number" class="sem-dvol" value="${s.prog_vol||0}" placeholder="Δvol%"
        style="width:100%;padding:4px 5px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-variant-numeric:tabular-nums;font-size:12px;text-align:center">
    </div>`
  ).join('');

  div.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <input type="text" class="meso-nome" value="${escHTML(meso?.nome||'Mesociclo '+(idx+1))}" placeholder="Nome do mesociclo"
        style="flex:1;padding:5px 8px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-size:13px;font-weight:600;margin-right:8px">
      <button class="btn btn-ghost btn-sm" style="color:var(--red);" onclick="this.closest('.meso-block').remove()"><i class=ph-x></i></button>
    </div>
    <div style="display:grid;grid-template-columns:40px 90px 80px 100px 1fr 60px 60px;gap:6px;margin-bottom:4px">
      <div style="font-size:12px;color:var(--text3);text-align:center;line-height:1.2">Sem</div>
      <div style="font-size:12px;color:var(--text3)">Tipo</div>
      <div style="font-size:12px;color:var(--text3)">Séries</div>
      <div style="font-size:12px;color:var(--text3)">Intensidade</div>
      <div style="font-size:12px;color:var(--text3)">Foco</div>
      <div style="font-size:12px;color:var(--text3);text-align:center">Δcarga%</div>
      <div style="font-size:12px;color:var(--text3);text-align:center">Δvol%</div>
    </div>
    <div class="sem-rows">${semHtml}</div>
    <button class="btn btn-ghost btn-sm" onclick="addSemMeso(this)" style="margin-top:4px">+ Semana</button>
  `;
  wrap.appendChild(div);
}

function addSemMeso(btn){
  const rows = btn.previousElementSibling;
  const idx = rows.querySelectorAll('.sem-row').length + 1;
  const div = document.createElement('div');
  div.className = 'sem-row';
  div.style.cssText='display:grid;grid-template-columns:40px 90px 80px 100px 1fr 60px 60px;gap:6px;align-items:center;margin-bottom:4px';
  div.innerHTML=`
    <input type="number" class="sem-num" value="${idx}" min="1" max="52"
      style="width:100%;padding:4px 5px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-variant-numeric:tabular-nums;font-size:12px;text-align:center">
    <select class="sem-tipo" style="font-size:12px;padding:4px 5px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text)">
      <option>Carga</option><option>Deload</option><option>Teste</option>
    </select>
    <input type="text" class="sem-series" value="3×10" placeholder="3×10"
      style="width:100%;padding:4px 5px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-variant-numeric:tabular-nums;font-size:12px">
    <select class="sem-intens" style="font-size:12px;padding:4px 5px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text)">
      <option value="conservador">−10% (conservador)</option><option value="base" selected>Base</option>
      <option value="+2.5">+2,5%</option><option value="+5">+5%</option>
      <option value="-10">−10%</option><option value="-15">−15%</option>
    </select>
    <input type="text" class="sem-foco" placeholder="Foco"
      style="width:100%;padding:4px 5px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px">
    <input type="number" class="sem-dcarga" value="0"
      style="width:100%;padding:4px 5px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-variant-numeric:tabular-nums;font-size:12px;text-align:center">
    <input type="number" class="sem-dvol" value="0"
      style="width:100%;padding:4px 5px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-variant-numeric:tabular-nums;font-size:12px;text-align:center">
  `;
  rows.appendChild(div);
}

function addMesoPeriod(){ adicionarMesoDOM(null); }

// ── Adicionar regra ───────────────────────────────────────────────────────────
function adicionarRegraDOM(criterio, acao){
  const wrap = $('period-regras-wrap'); if(!wrap) return;
  const div = document.createElement('div');
  div.style.cssText='display:grid;grid-template-columns:1fr 1fr auto;gap:6px;align-items:center;margin-bottom:6px';
  div.innerHTML=`
    <input type="text" class="regra-crit" value="${escHTML(criterio||'')}" placeholder="Critério (se...)"
      style="padding:5px 8px;background:var(--bg4);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-size:12px">
    <input type="text" class="regra-acao" value="${escHTML(acao||'')}" placeholder="Ação (então...)"
      style="padding:5px 8px;background:var(--bg4);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-size:12px">
    <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="this.parentElement.remove()"><i class=ph-x></i></button>`;
  wrap.appendChild(div);
}
function addRegraPeriod(){ adicionarRegraDOM('',''); }

// ── Editar modelo existente ───────────────────────────────────────────────────
function editarPeriod(id){
  const p = (LIBS.periodizacao||[]).find(x=>x.id===id); if(!p) return;
  preencherModalPeriod(p);
  $('modal-period').classList.remove('hidden');
}

// ── Salvar modelo ─────────────────────────────────────────────────────────────
function coletarPeriodDoForm(){
  const idVal = $('period-edit-id').value;
  const getChecked = (sel) => [...document.querySelectorAll(sel+' input[type=checkbox]:checked')].map(c=>c.value);
  const cbFreq = ['2x','3x','4x','5x','6x'].filter(f => {
    const el = document.getElementById('pf-'+f.replace('x','x')); return el && el.checked;
  });
  const cbBloqNv  = ['Iniciante','Intermediário','Avançado'].filter(v => {
    const k = {Iniciante:'inic',Intermediário:'inte',Avançado:'avan'}[v];
    const el = document.getElementById('bl-'+k); return el && el.checked;
  });
  const cbBloqCond = ['Gestação','Lesão ativa','Cardiopatia'].filter(v => {
    const k = {Gestação:'gestacao','Lesão ativa':'lesao',Cardiopatia:'card'}[v];
    const el = document.getElementById('bc-'+k); return el && el.checked;
  });

  // Collect mesos
  const mesos = [...$('period-mesos-wrap').querySelectorAll('.meso-block')].map(blk => ({
    nome: blk.querySelector('.meso-nome').value.trim(),
    semanas: [...blk.querySelectorAll('.sem-row')].map(r => ({
      num:    parseInt(r.querySelector('.sem-num').value)||1,
      tipo:   r.querySelector('.sem-tipo').value,
      series: r.querySelector('.sem-series').value.trim(),
      intensidade_code: r.querySelector('.sem-intens').value,
      intensidade: r.querySelector('.sem-intens').selectedOptions[0]?.textContent||'',
      foco:   r.querySelector('.sem-foco').value.trim(),
      prog_carga: parseFloat(r.querySelector('.sem-dcarga').value)||0,
      prog_vol:   parseFloat(r.querySelector('.sem-dvol').value)||0,
    }))
  }));

  // Collect regras
  const regras = [...$('period-regras-wrap').querySelectorAll('div')].map(r => ({
    criterio: r.querySelector('.regra-crit')?.value.trim()||'',
    acao:     r.querySelector('.regra-acao')?.value.trim()||'',
  })).filter(r => r.criterio);

  return {
    id: idVal ? parseInt(idVal) : novoId(),
    nome:          $('period-nome').value.trim()||'Modelo sem nome',
    sigla:         $('period-sigla').value,
    duracao:       $('period-duracao').value,
    estrutura_meso: $('period-estrutura-meso').value,
    divisao:       $('period-divisao').value,
    desc:          $('period-desc').value.trim(),
    ref:           $('period-ref').value.trim(),
    intensidade:   $('period-intensidade').value,
    rpe:           $('period-rpe').value,
    vol_sem:       $('period-vol-sem').value,
    reps:          $('period-reps').value,
    intervalo:     $('period-intervalo').value,
    tut:           $('period-tut').value,
    nivel:         $('period-nivel').value,
    nivel_max:     $('period-nivel-max').value,
    sexo:          $('period-sexo').value,
    objetivos_compativeis: getChecked('#period-obj-wrap'),
    freq_compativeis: cbFreq,
    bloq_nivel:    cbBloqNv,
    bloq_cond:     cbBloqCond,
    bloq_obs:      $('period-bloq-obs').value.trim(),
    mesos, regras,
    criterios:     $('period-criterios').value.trim(),
    acionamentos:  $('period-acionamentos').value.trim(),
  };
}
function gravarPeriod(novo){
  if(!LIBS.periodizacao) LIBS.periodizacao = [];
  const idx = LIBS.periodizacao.findIndex(x=>x.id===novo.id);
  if(idx>=0) LIBS.periodizacao[idx]=novo; else LIBS.periodizacao.push(novo);
  saveLibs(LIBS);
}
function salvarPeriod(){
  gravarPeriod(coletarPeriodDoForm());
  fecharModalPeriod();
  renderPeriod();
}
// Autosave — mesmo padrão dos modais de Biblioteca. Cobre também as linhas de
// mesociclo/semana e regras adicionadas dinamicamente (delegação de evento).
attachAutosave('modal-period', coletarPeriodDoForm, (novo) => { $('period-edit-id').value = novo.id; gravarPeriod(novo); });

// ══ Acompanhamento de Carga ═══════════════════════════════════════════════════

function abrirAcompPeriod(){
  // Popula select de alunos
  const selAl = $('acomp-aluno-sel');
  selAl.innerHTML = '<option value="">Selecionar aluno...</option>';
  students.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id; opt.textContent = s.perfil?.nome||'—'; selAl.appendChild(opt);
  });
  // Popula select de modelos
  const selPer = $('acomp-period-sel');
  selPer.innerHTML = '<option value="">Selecionar modelo...</option>';
  (LIBS.periodizacao||[]).forEach(p => {
    const opt = document.createElement('option'); opt.value=p.id; opt.textContent=p.nome; selPer.appendChild(opt);
  });
  $('acomp-fase-atual').style.display='none';
  $('acomp-progressao-wrap').style.display='none';
  $('btn-calc-prog').style.display='none';
  $('acomp-cargas-body').innerHTML='';
  $('acomp-nome-aluno').textContent='';
  // If there's an active student, preselect
  if(activeId){ selAl.value=activeId; acompCarregarAluno(); }
  $('modal-acomp-period').classList.remove('hidden');
}

function acompCarregarAluno(){
  const sId = parseInt($('acomp-aluno-sel').value)||0;
  const s = students.find(x=>x.id===sId);
  $('acomp-nome-aluno').textContent = s?.perfil?.nome||'';
  // Load existing carga data if any
  const periodId = parseInt($('acomp-period-sel').value)||0;
  if(s && periodId) _acompPopularCargas(s, periodId);
}

function acompCarregarModelo(){
  const sId = parseInt($('acomp-aluno-sel').value)||0;
  const s   = students.find(x=>x.id===sId);
  const periodId = parseInt($('acomp-period-sel').value)||0;
  const p   = (LIBS.periodizacao||[]).find(x=>x.id===periodId);
  if(!p) return;
  // Show first week info
  const primMeso = p.mesos?.[0];
  const primSem  = primMeso?.semanas?.[0];
  if(primSem){
    $('acomp-meso-label').textContent = primMeso.nome;
    $('acomp-sem-label').textContent  = 'Semana '+primSem.num;
    $('acomp-tipo-label').textContent  = primSem.tipo;
    $('acomp-fase-atual').style.display = 'block';
  }
  $('btn-calc-prog').style.display = 'inline-flex';
  if(s) _acompPopularCargas(s, periodId);
}

function _acompPopularCargas(s, periodId){
  const body = $('acomp-cargas-body'); body.innerHTML='';
  const existentes = s.acomp_period?.[periodId]?.cargas || [];
  if(existentes.length){
    existentes.forEach(c => addCargaAcompRow(c.ex, c.carga, c.reps));
  } else {
    // Default: exercícios da prescrição do aluno se houver
    const exs = getUltimoTreino(s)._fichaObj?.treinos?.flatMap(t=>t.exercicios)||[];
    const uniq = [...new Set(exs.map(e=>e.nome))].slice(0,8);
    if(uniq.length){ uniq.forEach(n=>addCargaAcompRow(n,'','')); }
    else { addCargaAcompRow('','',''); }
  }
}

function addCargaAcompRow(ex, carga, reps){
  const body = $('acomp-cargas-body'); if(!body) return;
  const row = document.createElement('div');
  row.style.cssText='display:grid;grid-template-columns:1fr 80px 70px auto;gap:6px;align-items:center;margin-bottom:5px';
  row.innerHTML=`
    <input type="text" class="acomp-ex" value="${ex||''}" placeholder="Exercício"
      style="padding:5px 8px;background:var(--bg4);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-size:12px">
    <input type="number" class="acomp-carga" value="${carga||''}" placeholder="kg"
      style="padding:5px 8px;background:var(--bg4);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-variant-numeric:tabular-nums;font-size:12px">
    <input type="number" class="acomp-reps" value="${reps||''}" placeholder="reps"
      style="padding:5px 8px;background:var(--bg4);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-variant-numeric:tabular-nums;font-size:12px">
    <button class="btn btn-ghost btn-sm" style="color:var(--red);" onclick="this.parentElement.remove()"><i class=ph-x></i></button>`;
  body.appendChild(row);
}

function addCargaAcomp(){ addCargaAcompRow('','',''); }

function calcularProgressao(){
  const periodId = parseInt($('acomp-period-sel').value)||0;
  const p = (LIBS.periodizacao||[]).find(x=>x.id===periodId); if(!p) return;
  const cargas = [...$('acomp-cargas-body').querySelectorAll('div')].map(r=>({
    ex:    r.querySelector('.acomp-ex')?.value.trim()||'',
    carga: parseFloat(r.querySelector('.acomp-carga')?.value)||0,
    reps:  parseInt(r.querySelector('.acomp-reps')?.value)||0,
  })).filter(c=>c.ex);
  if(!cargas.length){ alert('Adicione pelo menos um exercício com carga para calcular.'); return; }

  const body = $('acomp-progressao-body'); body.innerHTML='';
  // Build week-by-week progression table
  const allSemanas = p.mesos.flatMap(m => m.semanas.map(s=>({...s, meso:m.nome})));
  cargas.forEach(c => {
    const div = document.createElement('div');
    div.style.marginBottom='16px';
    let rows='';
    let cargaAtual = c.carga;
    allSemanas.forEach(s => {
      const delta = s.prog_carga||0;
      if(s.tipo==='Deload'){
        cargaAtual = Math.round(c.carga * (1 + delta/100) * 10)/10;
      } else {
        cargaAtual = Math.round((cargaAtual * (1 + delta/100)) * 10)/10;
      }
      const cor = s.tipo==='Deload'?'var(--amber)':s.tipo==='Teste'?'var(--blue)':'var(--accent)';
      rows+=`<tr>
        <td style="font-variant-numeric:tabular-nums;color:var(--text3);padding:4px 8px">${s.num}</td>
        <td style="padding:4px 8px;font-size:12px;color:var(--text2)">${s.meso}</td>
        <td style="padding:4px 8px"><span class="badge" style="font-size:12px;background:${s.tipo==='Deload'?'rgba(251,191,36,.15)':s.tipo==='Teste'?'rgba(59,130,246,.15)':'var(--accent-dim)'};color:${cor};border:1px solid ${cor}">${escHTML(s.tipo)}</span></td>
        <td style="padding:4px 8px;font-size:12px;color:var(--text2)">${escHTML(s.series)}</td>
        <td style="font-variant-numeric:tabular-nums;font-size:13px;font-weight:700;color:${cor};padding:4px 8px">${cargaAtual}kg</td>
        <td style="font-size:12px;color:var(--text3);padding:4px 8px">${delta>=0?'+':''}${delta}%</td>
        <td style="font-size:12px;color:var(--text3);padding:4px 8px">${escHTML(s.foco||'')}</td>
      </tr>`;
    });
    div.innerHTML=`
      <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:6px">${c.ex} — base: ${c.carga}kg × ${escHTML(c.reps)} reps</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="border-bottom:1px solid var(--border)">
          <th style="text-align:left;padding:4px 8px;color:var(--text3);font-size:12px">Sem</th>
          <th style="text-align:left;padding:4px 8px;color:var(--text3);font-size:12px">Mesociclo</th>
          <th style="text-align:left;padding:4px 8px;color:var(--text3);font-size:12px">Tipo</th>
          <th style="text-align:left;padding:4px 8px;color:var(--text3);font-size:12px">Séries</th>
          <th style="text-align:left;padding:4px 8px;color:var(--text3);font-size:12px">Carga</th>
          <th style="text-align:left;padding:4px 8px;color:var(--text3);font-size:12px">Δ</th>
          <th style="text-align:left;padding:4px 8px;color:var(--text3);font-size:12px">Foco</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    body.appendChild(div);
  });
  $('acomp-progressao-wrap').style.display='block';
}

function coletarAcompDoForm(){
  const sId     = parseInt($('acomp-aluno-sel').value)||0;
  const periodId= parseInt($('acomp-period-sel').value)||0;
  if(!sId || !periodId) return null; // ainda não dá pra identificar o registro
  const cargas = [...$('acomp-cargas-body').querySelectorAll('div')].map(r=>({
    ex:    r.querySelector('.acomp-ex')?.value.trim()||'',
    carga: parseFloat(r.querySelector('.acomp-carga')?.value)||0,
    reps:  parseInt(r.querySelector('.acomp-reps')?.value)||0,
  })).filter(c=>c.ex);
  return {sId, periodId, cargas};
}
function gravarAcomp(dado){
  const s = students.find(x=>x.id===dado.sId); if(!s) return;
  if(!s.acomp_period) s.acomp_period={};
  s.acomp_period[dado.periodId] = { cargas: dado.cargas, data: new Date().toLocaleDateString('pt-BR') };
  // Não usa saveStudent(): s vem do dropdown (acomp-aluno-sel), pode ser diferente
  // do aluno ativo (activeId) na tela principal, ou não haver nenhum ativo agora.
  try{ localStorage.setItem(lsKey('acm-students'), JSON.stringify(students)); }catch(e){}
  supaAutoSave();
}
function salvarAcompPeriod(){
  const dado = coletarAcompDoForm();
  if(!dado){ alert('Selecione aluno e modelo antes de salvar.'); return; }
  gravarAcomp(dado);
  $('modal-acomp-period').classList.add('hidden');
  alert('Acompanhamento salvo! ✓');
}
// Autosave — mesmo padrão dos demais modais; não faz nada até aluno+modelo
// estarem selecionados (coletarAcompDoForm retorna null nesse caso).
attachAutosave('modal-acomp-period', coletarAcompDoForm, gravarAcomp);
