// Seed FICTÍCIO só para testes automáticos (nomes, telefones e nascimentos inventados).
// Uso: injetar com ?demo na URL. Não é carregado pelo site.
// ─── INIT ─────────────────────────────────────────────────────────────────────
renderObjGrid();
// Load persisted students
try{
  const saved = localStorage.getItem(lsKey('acm-students'));
  if(saved){
    const parsed = JSON.parse(saved);
    if(Array.isArray(parsed) && parsed.length){
      students = parsed;
      activeId = null;
    }
  }
}catch(e){}

// Conta de teste (Amanda) são sempre a versão mais atual do código —
// sem isso, o registro salvo no localStorage de uma sessão anterior nunca era
// SUBSTITUÍDO, só ACUMULADO: toda vez que a página recarregava, este arquivo
// empurrava outra cópia com o MESMO id (9999999999/9999999998) pra dentro de
// `students`; assim que qualquer ação disparava um save (que persiste o array
// inteiro em localStorage['acm-students']), as cópias idênticas iam junto —
// foi isso que deixou a conta de teste triplicada. Antes de semear de novo, remove
// qualquer entrada existente com o mesmo id, garantindo só 1 cópia sempre.
function _removerAlunoTeste(id){
  students = students.filter(s => s.id !== id);
}

// LIMPEZA 2026-08-27: js/seed-demo.js (Carlos Mendes/Juliana Costa/Roberto
// Alves) foi removido do projeto a pedido do Milton — mas quem já tinha
// aberto a página com ?demo antes disso ficou com esses 3 salvos no
// localStorage pra sempre (o seed antigo nunca rodava de novo pra sumir
// sozinho). Roda uma vez, sem precisar de ?demo, e não faz nada se já não
// existirem.
[1782498533431, 1782498535600, 1782498536358].forEach(_removerAlunoTeste);
try{ localStorage.setItem(lsKey('acm-students'), JSON.stringify(students)); }catch(e){}

// ─── ALUNO DE TESTE ───────────────────────────────────────────────────────────
(function(){
  if(!location.search.includes('demo')) return; // seed só roda com ?demo na URL
  _removerAlunoTeste(9999999999);
  const amanda = {
    id: 9999999999,
    perfil: {
      nome: 'Amanda Silva',
      nascimento: '1993-09-22',
      sexo: 'F',
      atividade: 'moderadamente_ativo',
      profissao: 'Coordenadora de marketing',
      tempo_sentado: '6a8h',
      whatsapp: '(00) 90000-0005',
      modalidade: 'presencial',
      liberacao: 'sim',
      condicoes: 'Nenhuma',
      medicamentos: 'Nenhum',
      medicamentos_detalhe: '',
      lesoes: 'Nenhuma',
      obs_clinicas: 'Histórico de dor lombar leve em 2022 — resolvida sem cirurgia. Médico liberou treino sem restrições desde jan/2023. Nega alergias e doenças crônicas.',
      menstrual: 'Regular',
      contraceptivo: 'Pílula',
    },
    anamnese: {
      gestacao: 'Não',
      trimestre: '',
      // Anamnese — histórico
      nivel: 'Inte',
      tempo: '2–4 anos',
      consistencia: 'alta',
      modalidades: 'Musculação | Corrida',
      extras: '[{"atividade":"Corrida leve (< 8 km/h)","met":6.0,"minutos":35,"dias":2},{"atividade":"Caminhada moderada (4–6 km/h)","met":3.5,"minutos":30,"dias":3}]',
      sono: 'regular',
      estresse: 'moderado',
      alcool: 'ocasional',
      suplementos: 'Whey protein | Creatina | Cafeína',
      pretreino: 'Lanche leve',
      objetivo_ef: 'Emagrecimento',
      objetivo_sec: 'Composição corporal',

      // Logística (prescrição)
      frequencia: '4x',
      duracao: '60',
      horario: 'manhã',
      local: 'academia',
      gosta: 'Pernas e glúteos',
      preferencias: 'Dores Lombares',

      // Antropométrica
      peso: '72.0',
      altura: '165',
      data_avaliacao: '2025-06-10',
      gordura: '30.97',
      mgorda: '22.3',
      magra: '49.7',
      mmuscular: '23.0',
      osso: '8.6',
      residual: '25.1',
      cintura: '82',
      quadril: '102',
      abdomen: '88',
      braco_d: '30.5',
      braco_e: '30.0',
      braco_d_cont: '33.0',
      braco_e_cont: '32.5',
      coxa_d: '58.0',
      coxa_e: '57.0',
      pant_d: '37.0',
      pant_e: '37.0',
      fc: '68',
      obs_antro: 'Avaliação realizada em jejum de 4h. BIA utilizada como referência principal.',

      // Funcional — FMS
      fms_ohsa: '2', fms_ohsa_flag: 'Inclinação excessiva de tronco',
      fms_slsq: '2', fms_slsq_flag: 'Valgo de joelho',
      fms_hurdle: '3', fms_hurdle_flag: '',
      fms_lunge: '3', fms_lunge_flag: '',
      fms_shoulder: '2', fms_shoulder_flag: 'Limitação lado Direito',
      fms_aslr: '2', fms_aslr_flag: 'Encurtamento isquiotibiais bilateral',
      fms_rotary: '3', fms_rotary_flag: '',
      fms_push: '2',
      fms_pull: '3',
      prancha: '48',
      prancha_lat_d: '38',
      prancha_lat_e: '35',
      equilibrio_d: '26',
      equilibrio_e: '22',
      tug: '',
      sentar_levantar: '',
      obs_func: 'Valgo de joelho bilateral ao unipodal, mais evidente à esq. Encurtamento de isquio limita terra convencional. Ombro D com leve restrição em rot. externa — sem dor. Core apresenta boa resistência frontal mas assimetria lateral.',

      // Força
      formula_1rm: 'brzycki',
      data_forca: '2025-06-10',
      obs_forca: 'Terra limitado por encurtamento de isquio — preferência pelo terra romeno. Agachamento com leve valgo no lado esq a partir de 70% da carga.',
      forca: [
        {ex:'Agachamento livre',           carga:'55',  reps:'8'},
        {ex:'Terra romeno com halteres',   carga:'30',  reps:'8'},
        {ex:'Supino com halteres',         carga:'14',  reps:'10'},
        {ex:'Remada na máquina',           carga:'48',  reps:'8'},
        {ex:'Puxada pronada',              carga:'40',  reps:'8'},
        {ex:'Desenvolvimento com halteres',carga:'10',  reps:'10'},
        {ex:'Avanço com halteres',         carga:'16',  reps:'10'},
        {ex:'Rosca direta com halteres',   carga:'8',   reps:'10'},
        {ex:'Extensão de tríceps na polia alta', carga:'20', reps:'10'},
      ],

      // Resistência
      cooper: '2180',
      step_fc: '',
      flexao: '14',
      flexao_modificada: false,
      abdominal_reps: '22',
      squat_reps: '28',
      grip_d: '31.5',
      grip_e: '30.0',
      obs_resist: 'Cooper realizado em esteira a 8 km/h. VO₂máx estimado abaixo da média para faixa etária — condicionamento aeróbico é gargalo. Push-up abaixo da média ACSM.',

      // Flexibilidade
      sentar_alcancar: '8',
      sitreach_proto: 'YMCA/ACSM',
      sitreach_warmup: false,
      isquio_d: 'Moderado',
      isquio_e: 'Moderado',
      iliopsoas_d: 'Leve',
      iliopsoas_e: 'Leve',
      dorsiflexao_d: 'Normal',
      dorsiflexao_e: 'Leve',
      mob_toracica_d: 'Normal',
      mob_toracica_e: 'Normal',
      ombro_flex_d: 'Moderado',
      ombro_flex_e: 'Normal',
      quadril_rot_d: 'Normal',
      quadril_rot_e: 'Normal',
      obs_flex: 'Isquiotibiais com encurtamento moderado bilateral — consistente com queixa de lombar e limitação no terra. Ombro D com leve restrição em overhead — evitar press acima da cabeça no início.',
    },
    avaliacoesAntro: [
      {
        id: 1741564800000,
        data_avaliacao: '2025-03-10',
        responsavel: 'Milton Gasparotto Junior',
        peso: '73.2', altura: '165',
        mgorda: '24.3', gordura: '33.2',
        mmuscular: '22.2', mmuscular_pct: '30.3',
        osso: '8.6', osso_pct: '11.7',
        ombro: '', cintura: '85', abdomen: '91', quadril: '104',
        braco_d: '31.0', braco_e: '30.5', braco_d_cont: '33.5', braco_e_cont: '33.0',
        coxa_d: '59.0', coxa_e: '58.0', pant_d: '37.5', pant_e: '37.5',
        obs_antro: 'Avaliação fictícia (seed) — ponto anterior à avaliação de 10/06/2025. Inserido pra testar comparação de ciclo.',
        imc: '26.9', imc_class: 'Sobrepeso',
        magra: '48.9', magra_pct: '66.8',
        residual: '24.7', residual_pct: '24.7',
        rcq: '0.82', rcq_class: 'Risco moderado',
      },
      {
        id: 1749513600000,
        data_avaliacao: '2025-06-10',
        responsavel: 'Milton Gasparotto Junior',
        peso: '72.0', altura: '165',
        mgorda: '22.3', gordura: '30.97',
        mmuscular: '23.0', mmuscular_pct: '31.9',
        osso: '8.6', osso_pct: '11.9',
        ombro: '', cintura: '82', abdomen: '88', quadril: '102',
        braco_d: '30.5', braco_e: '30.0', braco_d_cont: '33.0', braco_e_cont: '32.5',
        coxa_d: '58.0', coxa_e: '57.0', pant_d: '37.0', pant_e: '37.0',
        obs_antro: 'Avaliação realizada em jejum de 4h. BIA utilizada como referência principal.',
        imc: '26.4', imc_class: 'Sobrepeso',
        magra: '49.7', magra_pct: '69.0',
        residual: '25.1', residual_pct: '25.1',
        rcq: '0.80', rcq_class: 'Risco moderado',
      },
    ],
    treinos: [
      {
        id: 1751414400000,
        status: 'aprovado',
        objetivo: 'Emag',
        nivel: 'Inte',
        frequencia: '4x',
        modelo: '01 - Julho (Emagrecimento AB)',
        obs: 'Treino fictício (seed) — gerado pós avaliação inicial de jun/2025. Divisão AB, 4x/semana, academia. Foco: emagrecimento + manutenção muscular.',
        treino: '',
        dataCriacao: '01/07/2025',
        dataAprovacao: '01/07/2025',
        _fichaObj: {
          objetivo: 'Emag', nivel: 'Inte', frequencia: '4x', local: 'academia', seriesPorEx: 3,
          dataGeracao: '01/07/2025',
          treinos: [
            { label: 'Treino A — Inferior (Pernas + Glúteos)', exercicios: [
              { musculo:'Quadríceps', porcao:'Geral', nome:'Agachamento livre', series:4, reps:'15', intensidade:'55kg', intervalo:'60s' },
              { musculo:'Quadríceps', porcao:'Geral', nome:'Leg Press 45°', series:3, reps:'15', intensidade:'90kg', intervalo:'60s' },
              { musculo:'Glúteos', porcao:'Geral', nome:'Terra romeno com halteres', series:3, reps:'12', intensidade:'30kg', intervalo:'60s' },
              { musculo:'Glúteos', porcao:'Geral', nome:'Avanço com halteres', series:3, reps:'15', intensidade:'16kg', intervalo:'60s' },
              { musculo:'Glúteos', porcao:'Geral', nome:'Elevação de quadril no banco - Peso corporal', series:3, reps:'15', intensidade:'0kg', intervalo:'60s' },
              { musculo:'Quadríceps', porcao:'Geral', nome:'Extensão de joelho sentado - Cadeira extensora', series:3, reps:'15', intensidade:'40kg', intervalo:'60s' },
            ]},
            { label: 'Treino B — Superior + Core', exercicios: [
              { musculo:'Peitoral', porcao:'Geral', nome:'Supino com halteres', series:3, reps:'12', intensidade:'14kg', intervalo:'60s' },
              { musculo:'Latíssimo', porcao:'Geral', nome:'Puxada pronada', series:3, reps:'12', intensidade:'40kg', intervalo:'60s' },
              { musculo:'Latíssimo', porcao:'Geral', nome:'Remada na máquina', series:3, reps:'12', intensidade:'48kg', intervalo:'60s' },
              { musculo:'Deltóide', porcao:'Geral', nome:'Desenvolvimento com halteres', series:3, reps:'12', intensidade:'10kg', intervalo:'60s' },
              { musculo:'Bíceps', porcao:'Geral', nome:'Rosca direta com halteres', series:3, reps:'12', intensidade:'8kg', intervalo:'60s' },
              { musculo:'Tríceps', porcao:'Geral', nome:'Extensão de tríceps na polia alta', series:3, reps:'12', intensidade:'20kg', intervalo:'60s' },
              { musculo:'Reto Abdominal', porcao:'Geral', nome:'Prancha baixa', series:3, reps:'45', intensidade:'0kg', intervalo:'60s' },
              { musculo:'Reto Abdominal', porcao:'Superior', nome:'Abdominal supra curto', series:3, reps:'20', intensidade:'0kg', intervalo:'60s' },
            ]},
          ],
        },
      },
      {
        id: 1759276800000,
        status: 'aprovado',
        objetivo: 'Emag',
        nivel: 'Inte',
        frequencia: '4x',
        modelo: '02 - Outubro (Emagrecimento ABC)',
        obs: 'Treino fictício (seed) — gerado pós reavaliação de set/2025. Divisão ABC, 4x/semana, academia. Progressão de carga em relação ao treino anterior.',
        treino: '',
        dataCriacao: '01/10/2025',
        dataAprovacao: '01/10/2025',
        _fichaObj: {
          objetivo: 'Emag', nivel: 'Inte', frequencia: '4x', local: 'academia', seriesPorEx: 3,
          dataGeracao: '01/10/2025',
          treinos: [
            { label: 'Treino A — Pernas + Glúteos', exercicios: [
              { musculo:'Quadríceps', porcao:'Geral', nome:'Agachamento livre', series:4, reps:'12', intensidade:'58kg', intervalo:'60s' },
              { musculo:'Quadríceps', porcao:'Geral', nome:'Leg Press 45°', series:3, reps:'15', intensidade:'100kg', intervalo:'60s' },
              { musculo:'Glúteos', porcao:'Geral', nome:'Terra romeno com halteres', series:3, reps:'12', intensidade:'32kg', intervalo:'60s' },
              { musculo:'Glúteos', porcao:'Geral', nome:'Afundo búlgaro - Halter duplo', series:3, reps:'12', intensidade:'16kg', intervalo:'60s' },
              { musculo:'Quadríceps', porcao:'Geral', nome:'Extensão de joelho sentado - Cadeira extensora', series:3, reps:'15', intensidade:'45kg', intervalo:'60s' },
              { musculo:'Isquiossurais', porcao:'Geral', nome:'Flexão de joelho deitado - Mesa flexora', series:3, reps:'12', intensidade:'20kg', intervalo:'60s' },
            ]},
            { label: 'Treino B — Peito + Costas + Core', exercicios: [
              { musculo:'Peitoral', porcao:'Superior', nome:'Supino inclinado com halteres', series:3, reps:'12', intensidade:'14kg', intervalo:'60s' },
              { musculo:'Peitoral', porcao:'Geral', nome:'Crucifixo com halteres', series:3, reps:'12', intensidade:'10kg', intervalo:'60s' },
              { musculo:'Latíssimo', porcao:'Geral', nome:'Remada na máquina', series:3, reps:'12', intensidade:'50kg', intervalo:'60s' },
              { musculo:'Latíssimo', porcao:'Geral', nome:'Puxada pronada', series:3, reps:'12', intensidade:'42kg', intervalo:'60s' },
              { musculo:'Reto Abdominal', porcao:'Geral', nome:'Abdominal militar', series:3, reps:'25', intensidade:'0kg', intervalo:'60s' },
              { musculo:'Oblíquo', porcao:'Geral', nome:'Prancha lateral', series:3, reps:'40', intensidade:'0kg', intervalo:'60s' },
            ]},
            { label: 'Treino C — Ombros + Braços', exercicios: [
              { musculo:'Deltóide', porcao:'Geral', nome:'Desenvolvimento com halteres', series:3, reps:'12', intensidade:'10kg', intervalo:'60s' },
              { musculo:'Deltóide', porcao:'Medial', nome:'Elevação lateral com halteres', series:3, reps:'12', intensidade:'8kg', intervalo:'60s' },
              { musculo:'Deltóide', porcao:'Anterior', nome:'Elevação frontal com halteres', series:3, reps:'12', intensidade:'8kg', intervalo:'60s' },
              { musculo:'Bíceps', porcao:'Geral', nome:'Rosca direta com halteres', series:3, reps:'12', intensidade:'9kg', intervalo:'60s' },
              { musculo:'Tríceps', porcao:'Geral', nome:'Extensão de tríceps na polia alta', series:3, reps:'12', intensidade:'22kg', intervalo:'60s' },
              { musculo:'Tríceps', porcao:'Geral', nome:'Tríceps francês sentado com halter', series:3, reps:'12', intensidade:'10kg', intervalo:'60s' },
            ]},
          ],
        },
      },
    ],
    reavaliacao: {
      peso: '73.2',
      gordura: '33.2',
      magra: '48.9',
      cintura: '85',
      analise: 'Avaliação anterior fictícia (10/03/2025): peso 73,2kg, gordura 33,2% (24,3kg), músculo 30,3% (22,2kg), óssea 11,7% (8,6kg), residual 24,7% (18,1kg), MCM 66,8% (48,9kg). Perimetria: cintura 85 | abdômen 91 | quadril 104cm; braço 31,0/30,5 | coxa 59,0/58,0. Evolução em 3 meses (mar→jun/2025): −2,0kg gordura, +0,8kg músculo — resultado compatível com objetivo de emagrecimento.',
      decisao: '',
      data: '10/03/2025',
    },
  };
  students.push(amanda);
  try{ localStorage.setItem(lsKey('acm-students'), JSON.stringify(students)); }catch(e){}
  renderStudentList();
  navGo('dashboard');
  // Detect unsaved drafts after students load
  if(typeof detectarDraftsNaoSalvos==='function') setTimeout(detectarDraftsNaoSalvos, 400);
})();
