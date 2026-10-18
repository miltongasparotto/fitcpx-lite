// Países e códigos de discagem (DDI), em português. Usado pelo seletor de código do telefone (js/telefone.js).
// [ISO 3166-1 alfa-2, nome, código]. A bandeira vem do ISO (emoji de bandeira).
// +1 (América do Norte) vale para vários países: o ISO guarda qual bandeira mostrar; o código é o mesmo.
const PAISES_DDI = [
  ['BR','Brasil','55'],
  ['AF','Afeganistão','93'],['ZA','África do Sul','27'],['AL','Albânia','355'],['DE','Alemanha','49'],['AD','Andorra','376'],
  ['AO','Angola','244'],['SA','Arábia Saudita','966'],['DZ','Argélia','213'],['AR','Argentina','54'],['AM','Armênia','374'],
  ['AW','Aruba','297'],['AU','Austrália','61'],['AT','Áustria','43'],['AZ','Azerbaijão','994'],['BS','Bahamas','1'],
  ['BH','Bahrein','973'],['BD','Bangladesh','880'],['BB','Barbados','1'],['BY','Bielorrússia','375'],['BE','Bélgica','32'],
  ['BZ','Belize','501'],['BJ','Benin','229'],['BO','Bolívia','591'],['BA','Bósnia e Herzegovina','387'],['BW','Botsuana','267'],
  ['BN','Brunei','673'],['BG','Bulgária','359'],['BF','Burkina Faso','226'],['BI','Burundi','257'],['BT','Butão','975'],
  ['CV','Cabo Verde','238'],['CM','Camarões','237'],['KH','Camboja','855'],['CA','Canadá','1'],['QA','Catar','974'],
  ['KZ','Cazaquistão','7'],['TD','Chade','235'],['CL','Chile','56'],['CN','China','86'],['CY','Chipre','357'],
  ['CO','Colômbia','57'],['KM','Comores','269'],['CG','Congo','242'],['CD','Congo (Rep. Democrática)','243'],['KP','Coreia do Norte','850'],
  ['KR','Coreia do Sul','82'],['CI','Costa do Marfim','225'],['CR','Costa Rica','506'],['HR','Croácia','385'],['CU','Cuba','53'],
  ['CW','Curaçao','599'],['DK','Dinamarca','45'],['DJ','Djibuti','253'],['EG','Egito','20'],['SV','El Salvador','503'],
  ['AE','Emirados Árabes Unidos','971'],['EC','Equador','593'],['ER','Eritreia','291'],['SK','Eslováquia','421'],['SI','Eslovênia','386'],
  ['ES','Espanha','34'],['US','Estados Unidos','1'],['EE','Estônia','372'],['SZ','Essuatíni','268'],['ET','Etiópia','251'],
  ['FJ','Fiji','679'],['PH','Filipinas','63'],['FI','Finlândia','358'],['FR','França','33'],['GA','Gabão','241'],
  ['GM','Gâmbia','220'],['GH','Gana','233'],['GE','Geórgia','995'],['GI','Gibraltar','350'],['GR','Grécia','30'],
  ['GL','Groenlândia','299'],['GP','Guadalupe','590'],['GT','Guatemala','502'],['GY','Guiana','592'],['GF','Guiana Francesa','594'],
  ['GN','Guiné','224'],['GQ','Guiné Equatorial','240'],['GW','Guiné-Bissau','245'],['HT','Haiti','509'],['NL','Países Baixos','31'],
  ['HN','Honduras','504'],['HK','Hong Kong','852'],['HU','Hungria','36'],['YE','Iêmen','967'],['FO','Ilhas Faroé','298'],
  ['FK','Ilhas Falkland','500'],['MH','Ilhas Marshall','692'],['SB','Ilhas Salomão','677'],['CK','Ilhas Cook','682'],['IN','Índia','91'],
  ['ID','Indonésia','62'],['IQ','Iraque','964'],['IR','Irã','98'],['IE','Irlanda','353'],['IS','Islândia','354'],
  ['IL','Israel','972'],['IT','Itália','39'],['JM','Jamaica','1'],['JP','Japão','81'],['JO','Jordânia','962'],
  ['XK','Kosovo','383'],['KW','Kuwait','965'],['LA','Laos','856'],['LS','Lesoto','266'],['LV','Letônia','371'],
  ['LB','Líbano','961'],['LR','Libéria','231'],['LY','Líbia','218'],['LI','Liechtenstein','423'],['LT','Lituânia','370'],
  ['LU','Luxemburgo','352'],['MO','Macau','853'],['MK','Macedônia do Norte','389'],['MG','Madagascar','261'],['MY','Malásia','60'],
  ['MW','Malaui','265'],['MV','Maldivas','960'],['ML','Mali','223'],['MT','Malta','356'],['MA','Marrocos','212'],
  ['MQ','Martinica','596'],['MU','Maurício','230'],['MR','Mauritânia','222'],['YT','Mayotte','262'],['MX','México','52'],
  ['MM','Mianmar','95'],['FM','Micronésia','691'],['MZ','Moçambique','258'],['MD','Moldávia','373'],['MC','Mônaco','377'],
  ['MN','Mongólia','976'],['ME','Montenegro','382'],['NA','Namíbia','264'],['NR','Nauru','674'],['NP','Nepal','977'],
  ['NI','Nicarágua','505'],['NE','Níger','227'],['NG','Nigéria','234'],['NU','Niue','683'],['NO','Noruega','47'],
  ['NC','Nova Caledônia','687'],['NZ','Nova Zelândia','64'],['OM','Omã','968'],['PW','Palau','680'],['PS','Palestina','970'],
  ['PA','Panamá','507'],['PG','Papua-Nova Guiné','675'],['PK','Paquistão','92'],['PY','Paraguai','595'],['PE','Peru','51'],
  ['PF','Polinésia Francesa','689'],['PL','Polônia','48'],['PR','Porto Rico','1'],['PT','Portugal','351'],['KE','Quênia','254'],
  ['KG','Quirguistão','996'],['KI','Quiribati','686'],['GB','Reino Unido','44'],['CF','República Centro-Africana','236'],['DO','República Dominicana','1'],
  ['CZ','República Tcheca','420'],['RE','Reunião','262'],['RO','Romênia','40'],['RW','Ruanda','250'],['RU','Rússia','7'],
  ['WS','Samoa','685'],['SM','San Marino','378'],['PM','Saint-Pierre e Miquelon','508'],['ST','São Tomé e Príncipe','239'],['SN','Senegal','221'],
  ['SL','Serra Leoa','232'],['RS','Sérvia','381'],['SC','Seicheles','248'],['SG','Singapura','65'],['SY','Síria','963'],
  ['SO','Somália','252'],['LK','Sri Lanka','94'],['SD','Sudão','249'],['SS','Sudão do Sul','211'],['SE','Suécia','46'],
  ['CH','Suíça','41'],['SR','Suriname','597'],['TJ','Tadjiquistão','992'],['TH','Tailândia','66'],['TW','Taiwan','886'],
  ['TZ','Tanzânia','255'],['TL','Timor-Leste','670'],['TG','Togo','228'],['TO','Tonga','676'],['TT','Trinidad e Tobago','1'],
  ['TN','Tunísia','216'],['TM','Turcomenistão','993'],['TR','Turquia','90'],['TV','Tuvalu','688'],['UA','Ucrânia','380'],
  ['UG','Uganda','256'],['UY','Uruguai','598'],['UZ','Uzbequistão','998'],['VU','Vanuatu','678'],['VA','Vaticano','379'],
  ['VE','Venezuela','58'],['VN','Vietnã','84'],['ZM','Zâmbia','260'],['ZW','Zimbábue','263'],
];
// Bandeira (emoji) a partir do ISO: letras viram "indicadores regionais"
function paisBandeira(iso){
  iso = String(iso || '').toUpperCase();
  if(!/^[A-Z]{2}$/.test(iso)) return '';
  return String.fromCodePoint(0x1F1E6 + iso.charCodeAt(0) - 65, 0x1F1E6 + iso.charCodeAt(1) - 65);
}
// País de um código. Vários países dividem o +1 e o +7: o primeiro da lista é o mais comum (EUA, Rússia), exceto o padrão do studio.
const _PAIS_PREFERIDO = { '1':'US', '7':'RU', '44':'GB', '262':'RE', '358':'FI' };
function paisPorDdi(ddi, iso){
  ddi = String(ddi || '').replace(/\D/g, '');
  const lista = PAISES_DDI.filter(p => p[2] === ddi);
  if(!lista.length) return null;
  return lista.find(p => p[0] === iso) || lista.find(p => p[0] === _PAIS_PREFERIDO[ddi]) || lista[0];
}
