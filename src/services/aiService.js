const USE_REAL_AI = false;

const PALAVRAS_CHAVE = {
  perseguicao: {
    palavras: ['perseguição', 'perseguido', 'correndo', 'fuga', 'escape', 'perseguindo', 'caçando', 'caçador', 'caçado', 'fugindo', 'ameaça', 'ameaçando', 'atingindo', 'alcançando'],
    tipo: 'medo',
    categoria: 'pesadelo'
  },
  queda: {
    palavras: ['cair', 'queda', 'caiu', 'caindo', 'despencar', 'despencou', 'despencando', 'caía', 'caindo', 'quedas'],
    tipo: 'queda'
  },
  dente: {
    palavras: ['dente', 'dentes', 'dentista', 'dente quebrado', 'dente caindo', 'dentes caindo', 'mordendo', 'morder'],
    tipo: 'dente',
    espirituais: 'autoimagem'
  },
  animal: {
    palavras: ['animal', 'cachorro', 'cobra', 'gato', 'pássaro', 'peixe', 'leão', 'tigre', 'lobo', 'urso', 'macaco', 'elefante', 'passaro', 'burro', 'cavalo', 'porco', 'galinha', 'rato', 'aranha', 'besouro', 'formiga', 'abelha', 'mosca', 'mosquito', 'barata', 'gafanhoto', 'lagarta', 'borboleta'],
    tipo: 'animal'
  },
  morte: {
    palavras: ['morte', 'morto', 'morrer', 'falecido', 'defunto', 'túmulo', 'enterro', 'funeral', 'caixão', 'caixao', 'sepultura', 'morreu', 'morrendo'],
    tipo: 'morte',
    categoria: 'transformação'
  },
  voar: {
    palavras: ['voar', 'voando', 'voei', 'pairando', 'flutuar', 'ascender', 'subindo', 'altitude', 'céu', 'ceu', 'nuvem', 'nuvens'],
    tipo: 'voar',
    espirituais: 'liberdade'
  },
  agua: {
    palavras: ['água', 'mar', 'rio', 'oceano', 'piscina', 'chuva', 'afogar', 'nadar', 'onda', 'ondas', 'corrente', 'rio', 'córrego', 'corrego', 'lago', 'lagoa', 'banho', 'banhando', 'enchente', 'inundação', 'inundacao'],
    tipo: 'agua'
  },
  casa: {
    palavras: ['casa', 'apartamento', 'quarto', 'sala', 'cozinha', 'banheiro', 'porta', 'janela', 'escada', 'teto', 'parede', 'chão', 'chao', 'porão', 'porao', 'varanda', 'jardim', 'garagem'],
    tipo: 'casa'
  },
  pessoa_familiar: {
    palavras: ['mãe', 'pai', 'irma', 'irmão', 'irmao', 'avó', 'avo', 'filho', 'filha', 'tio', 'tia', 'primo', 'prima', 'papai', 'mamãe', 'mamae', 'vó', 'vo', 'tios', 'primos'],
    tipo: 'pessoa_familiar'
  },
  trabalho: {
    palavras: ['trabalho', 'emprego', 'escritório', 'escritorio', 'chefe', 'colega', 'reunião', 'reuniao', 'projeto', 'escritorio', 'computador', 'notebook', 'desk', 'funcionário', 'funcionario', 'presidente', 'diretor', 'gerente'],
    tipo: 'trabalho'
  },
  relacao: {
    palavras: ['namorado', 'namorada', 'marido', 'esposa', 'amigo', 'amiga', 'parceiro', 'parceira', 'ex', ' crush', 'apaixonado', 'beijo', 'abraço', 'abracou', 'relação', 'relacao', 'amor'],
    tipo: 'relacao'
  },
  escola: {
    palavras: ['escola', 'colégio', 'colegio', 'universidade', 'faculdade', 'aula', 'prova', 'exame', 'professor', 'aluno', 'colega', 'colegial', 'vestibular', 'trabalho escolar'],
    tipo: 'escola'
  },
  veiculo: {
    palavras: ['carro', 'ônibus', 'onibus', 'ônibus', 'moto', 'motocicleta', 'bicicleta', 'trem', 'metrô', 'metro', 'avião', 'aviao', 'barco', 'taxi', 'uber'],
    tipo: 'transporte'
  },
  dinheiro: {
    palavras: ['dinheiro', 'nota', 'cedula', 'cédula', 'moeda', 'bani', 'rico', 'pobre', 'divida', 'dívida', 'dividas', 'dívidas', 'conta', 'pagamento', 'compra', 'loja', 'preço', 'preco'],
    tipo: 'dinheiro'
  },
  corpo: {
    palavras: ['corpo', 'mão', 'mao', 'pe', 'pé', 'braço', 'cabeca', 'cabeça', 'olho', 'olhos', 'boca', 'nariz', 'orelha', 'perna', 'pele', 'sangue', 'osso', 'ossos'],
    tipo: 'corpo'
  },
  espelho: {
    palavras: ['espelho', 'reflexo', 'reflexão', 'reflexao', 'visual', 'olhando', 'olho', 'espelh'],
    tipo: 'espelho',
    espirituais: 'autoimagem'
  },
  fogo: {
    palavras: ['fogo', 'incêndio', 'incendio', 'chamas', 'queimando', 'queimado', 'fogueira', 'brasa'],
    tipo: 'fogo'
  },
  floresta: {
    palavras: ['floresta', 'mata', 'árvore', 'arvore', 'árvores', 'arvores', 'bosque', 'madeira', 'verde', 'folha', 'folhas', 'árvore'],
    tipo: 'floresta'
  },
  cidade: {
    palavras: ['cidade', 'rua', 'avenida', 'prédio', 'predio', 'build', 'trafego', 'trânsito', 'transito', 'semáforo', 'semaforo', 'sinal', 'placa'],
    tipo: 'cidade'
  }
};

const INTERPRETACOES = {
  perseguicao: [
    'Este sonho pode refletir situações da sua vida em que você se sente pressionado ou perseguido. Pode ser responsabilidades no trabalho, relationships ou compromissos que parecem te perseguir.',
    'O ato de fugir ou ser perseguido often representa medos não enfrentados. Pergunte-se: o que você está evitando enfrentar atualmente?',
    'Este padrão often aparece quando você sente que não tem controle sobre certain aspek of sua vida. A perseguição pode simbolizar obligaciones que você Acceptou mas não consegue cumplir.',
    'Se alguém specific te perseguiu no sonho, think about quem essa pessoa representa.Pode ser um chefe exigente, uma expectation familiar ou até mesmo você mismo cobrando demais.',
    'Emocionalmente, este sonho pode indicar que você está carryando ansiedade relacionada ao futuro ou medos sobre o unknown.'
  ],
  queda: [
    'Quedas em sonhos often representam feelings of perda de controle. Você pode estar se sentindo insecure sobre algumsituação na sua vida.',
    'Este sonho pode indicar que você está passando por uma mudança significativa onde se sente sem chão. Ocair pode simbolizar o fim de uma fase.',
    'Medo de fracasso or insegurança often se manifestam como quedas nos sonhos. Pergunte-se lately where você tem doubtado de si mesmo.',
    'If você caiu de um lugar alto, isso pode representar anseio de controle or medo de falhar em algumsituação importante.',
    'Sometimes quedas indicate que você precisa parar de se cobrartanto. Osono pode estar te dizendo para relaxar e não se pressionar tanto.'
  ],
  dente: [
    'Sonhar com dentes often relates to preocupação com sua imagem e como os outros te percebem. Pode indicar insegurança sobre sua aparência or comunicação.',
    'This padrão frequentemente aparece em momentos de transição ou insegurança. Você pode estar worried about como as pessoas te veem.',
    'Dentes symbolchave expressão e comunicação. Se estiverem caindo, pode indicate que você sente que não está se expressando bem lately.',
    'This sueño puede indicar preocupações estéticas ou medo de parecer diferente diante dos outros.',
    'Em contexts sociais, sonhar com dentes often significa receio de julgamento alheio ou preocupação com aceitação social.'
  ],
  animal: [
    'Animais nos sonhos representan seus instintos naturales. Cada animal tem um significado específico - think about as características do animal que appeared.',
    'If você lutou contra o animal, isso pode representar struggle interno com seus impulsos instintivos.',
    'Animais podem simbolizar aspects of you that you feel are wild or uncontrolled. Pergunte: que aspect of sua personalidade você está repressent?',
    'Se o animal era amigável, pode representar desejos de conexão mais natural e autêntica com o mundo.',
    'O tipo de animal matters: predators podem representar medos, enquanto animals nativos podem representar your true self.'
  ],
  morte: [
    'Sonhar com muerte frequentemente representa transformação, não vida real. É o fim de uma fase e começo de uma nova.',
    'La muerte en sueños symbolizes cambio profundo. Você está deixando algo antigo para algo novo emergir.',
    'Este sueño puede indicar que você está pronto para uma grande mudança ou transição de vida.',
    'If você viu a morte de alguém conhecido, pode representar mudanças nessa relação ou aspect of that person in você.',
    'Morte y renascimento são ciclos naturais. Este sonho puede ser um sinal de que você está pronto para evoluir.'
  ],
  voar: [
    'Voar representa desejo de liberdade, transcendência or perspective elevated. Você está buscando ver as coisas de uma another perspectiva.',
    'Este sonho pode indicar que você está ready to superar limitações que you have accepted.',
    'A altitude no sonho pode representar seu nível de confiança or aspições atuais. Você está se elevando ou ainda no chão?',
    'If você voou facilmente, pode symbolize confiança recent. If lutou para voar, pode indicate que algo está te segurando.',
    'Voar também puede representar seu desejo de escape de situações restritivas.'
  ],
  agua: [
    'Água em sueños usually representa emoções. A qualidade da água reflete seu state emocional recente.',
    'Água turva ou tumultuada pode indicar emoções confusas ou situações emocionalmente carregadas.',
    'Água calma pode indicate que você está em paz emocional. Water movement puede representar transições emocionais.',
    'If você estava nadando, pode symbolize seu ability to lidar com suas emoções. Se estava se afogando, você pode sentir-se overwhelmed.',
    'Este sonho pode indicar a need de processar sentimentos que você tem avoided lately.'
  ],
  casa: [
    'Casas representan sua psyche. Different cômodos representam different aspects de você mesmo.',
    'O quarto pode representar sua vida íntima. A cozinha pode representar sua criatividade or nutrimento.',
    'Se você estava perdido na casa, pode indicate que você está exploring different aspects de sua personalidade.',
    'Casas unknown ou abandonadas podem symbolize experiências passadas ou aspects de você que você forget.',
    'Subir escadas pode symbolize progress espiritual ou intelectual. Descer pode representarimersão no inconsciente.'
  ],
  pessoa_familiar: [
    'Ver pessoas familiares nos sonhos often represents aspectos de você mesmo que você associa com essa pessoa.',
    'Se dream with tua mãe, pode representar seu instinto de cuidado ou intuição. With pai, pode representar autoridade ou estrutura.',
    'These sonhos podem highlight questões não resolvidas with essas pessoas ou aspects of those relações.',
    'Se dream with alguém que já morreu, pode indicar que você quer conectar with that aspect que essa pessoa representava.',
    'A presence dessas pessoas podem symbolize support ou guidance que você busca.'
  ],
  trabalho: [
    'Sonhar com trabalho often reflects your feelings about seu employment atual.',
    'If você foi pressureado no trabalho, pode indicate que você está sentindo muito pressure lately.',
    'Estar atrasado pode symbolize medo de não cumprir expectativas.',
    'Problemas com coworkers podem indicar conflitos atuais ou issues não resolvidas.',
    'Este sueño puede ser um reflection de sua anxiety sobre desempenho or expectations no trabalho.'
  ],
  relacao: [
    'Sonhos sobre relacões often reflectem seus feelings sobre relationships atuais ou desejados.',
    'If você sonhou com um ex, pode indicar que há feelings não resolvidos sobre essa relação.',
    'Sonhar com alguém que você gosta pode indicar your desire de conexão ou vulnerability emocional.',
    'Conflitos em sueños pueden reflejar tensions em suas relationships reales.',
    'Este sonho pode indicar sua necessidade de intimacy emocional ou conexão mais profunda.'
  ],
  dinheiro: [
    'Dinheiro nos sonhos often represents seu senso de valor próprio ou segurança financeira.',
    'Perder dinheiro pode indicar medos sobre estabilidade financeira ou medo de perder algo valioso.',
    'Ganhar dinheiro pode indicar sucesso recente ou anseio por reconhecimento.',
    'Este sonho pode refletir suas preocupações sobre dinheiro ou situação financeira.',
    'If alguém te deu dinheiro, pode representar ajuda ou generosidade que você recebeu ou deseja.'
  ],
  corpo: [
    'Partes do corpo nos sonhos often representam aspectos específicos da sua vida ou personalidade.',
    'Mãos representan sua capacidade de agir ou controlar situações. Pés representan sua direção ou base.',
    'Problemas com partes do corpo podem indicar preocupações sobre sua habilidade de fazer algo.',
    'Este sonho pode indicar how você está se sentindo sobre sua capacidade de realizar algo.',
    'Corpo saudável pode indicar confiança; corpo ferido pode indicar vulnerabilidade.'
  ],
  espelho: [
    'Espelhos representan auto-reflexão e como você se vê. O que você viu no reflexo pode ser revealing.',
    'Ver seu rosto diferente pode indicate que você está passando por mudanças identity.',
    'If você não conseguia ver seu reflexo, pode indicate questões sobre sua identidade ou auto-conhecimento.',
    'Este sonho pode te chamar para introspection sobre como você se percebe.',
    'O reflexo pode mostrar aspects de você que você não está reconhecendo ouaceitando.'
  ]
};

const FRASES_CONEXAO = [
  'Além disso, ',
  'Também, ',
  'É interessante notar que, ',
  'Este détail também pode indicar que, ',
  'Além do significado principal, ',
  'Another aspect importante é que, ',
  'Também podemos observers que, ',
  'Another aspect relevante é, '
];

function detectarPadroes(texto) {
  const minusculas = texto.toLowerCase();
  const encontrar = {
    tematicos: [],
    espirituais: [],
    biologicos: []
  };
  const categorias = [];

  for (const [nome, dados] of Object.entries(PALAVRAS_CHAVE)) {
    for (const palavra of dados.palavras) {
      if (minusculas.includes(palavra)) {
        if (dados.tipo && !encontrar.tematicos.includes(dados.tipo)) {
          encontrar.tematicos.push(dados.tipo);
        }
        if (dados.categoria && !categorias.includes(dados.categoria)) {
          categorias.push(dados.categoria);
        }
        if (dados.espirituais && !encontrar.espirituais.includes(dados.espirituais)) {
          encontrar.espirituais.push(dados.espirituais);
        }
        break;
      }
    }
  }

  const palavrasTematicas = ['trabalho', 'relacionamento', 'família', 'amizade', 'sucesso', 'fracasso', 'mudança', 'medo', 'esperança', 'alegria', 'tristeza', '-raiva', 'ansiedade', 'stress'];
  for (const palavra of palavrasTematicas) {
    if (minusculas.includes(palavra) && !encontrar.tematicos.includes(palavra)) {
      encontrar.tematicos.push(palavra);
    }
  }

  const encontrarEmocoes = {
    'medo': ['medo', 'terror', 'pânico', 'assustado', 'receio', 'aphy', 'angústia', 'angustia'],
    'tristeza': ['triste', 'chorei', 'lagrimas', 'choro', 'sofrimento', 'dor', 'melancolia'],
    'raiva': ['raiva', 'odio', 'odio', 'irritado', 'furioso', 'bravo', 'zanga'],
    'alegria': ['feliz', 'alegre', 'risos', 'rir', 'contente', 'eufórico'],
    'ansiedade': ['ansioso', 'nervoso', 'preocupado', 'inquieto', 'angustiado'],
    'amor': ['amor', 'amável', 'carinho', 'afeto', 'apaixonado']
  };

  for (const [emocao, palavras] of Object.entries(encontrarEmocoes)) {
    for (const palavra of palavras) {
      if (minusculas.includes(palavra)) {
        if (!categorias.includes(emocao)) {
          categorias.push(emocao);
        }
        break;
      }
    }
  }

  if (categorias.length === 0) {
    categorias.push('comum');
  }

  if (categorias.includes('medo') || categorias.includes('pesadelo') || encontrar.tematicos.includes('perseguição')) {
    if (!categorias.includes('pesadelo')) {
      categorias.push('pesadelo');
    }
  }

  if (encontrar.tematicos.includes('voar') || encontrar.espirituais.includes('liberdade')) {
    if (!categorias.includes('lúcido')) {
      categorias.push('lúcido');
    }
  }

  return { padroes: encontrar, categorias };
}

function gerarInterpretacao(texto, padroes, categorias) {
  const minusculas = texto.toLowerCase();
  let interpretacao = '';

  const chavesEncontradas = [];
  for (const nome of Object.keys(PALAVRAS_CHAVE)) {
    const dados = PALAVRAS_CHAVE[nome];
    for (const palavra of dados.palavras) {
      if (minusculas.includes(palavra)) {
        chavesEncontradas.push(nome);
        break;
      }
    }
  }

  if (chavesEncontradas.length > 0) {
    const interpretacoes = [];
    const conexoes = [];

    for (const chave of chavesEncontradas.slice(0, 3)) {
      if (INTERPRETACOES[chave]) {
        const frases = INTERPRETACOES[chave];
        const indice = Math.floor(Math.random() * frases.length);
        interpretacoes.push(frases[indice]);
      }
    }

    if (chavesEncontradas.length > 1) {
      const indiceConexao = Math.floor(Math.random() * FRASES_CONEXAO.length);
      const segundaChave = chavesEncontradas[1];
      if (INTERPRETACOES[segundaChave]) {
        const frases = INTERPRETACOES[segundaChave];
        const indice = Math.floor(Math.random() * frases.length);
        conexoes.push(FRASES_CONEXAO[indiceConexao] + frases[indice].toLowerCase());
      }
    }

    if (interpretacoes.length > 0) {
      interpretacao = interpretacoes.join(' ');
      if (conexoes.length > 0) {
        interpretacao += ' ' + conexoes.join(' ');
      }
    }
  }

  if (!interpretacao) {
    const interpretacoesGerais = [
      'Este sonho carrega significados importante sobesua vida e estados emocionais récents. Os símbolos presentados podem representar desires não realizados ou sensação de precisar de mudança.',
      'Analisando os elementos do seu sonho, percibese uma busca por entender melhor situações actuales da sua vida. Os détails podem revelar messages do seu inconsciente.',
      'Sonhos são a linguagem do nosso inconsciente. Este sueño pode estar indicando a necessidade de introspection sobre aspects específicos da sua vida.',
      'Cada elemento deste sueño tem um significado simbólico. Este pode ser um momento de transformação ou preparação para novas situações.',
      'Os sonhos muitas vezes nos ajudam a processar emoções. Este puede ter relação com recent events ou ansiedades não totalmente conscientes.'
    ];
    interpretacao = interpretacoesGerais[Math.floor(Math.random() * interpretacoesGerais.length)];
  }

  if (categorias.includes('pesadelo')) {
    const appendices = [
      'Isso pode explicar a natureza perturbadora deste sueño.',
      'A natureza inquietante deste sueño pode indicar ansiedade ou estresse acumulado.',
      'Este padrão pode refletir tensões emocionais que precisam de atenção.'
    ];
    interpretacao += ' ' + appendices[Math.floor(Math.random() * appendices.length)];
  }

  if (categorias.includes('lúcido')) {
    const appendices = [
      'O fato de você ter consciência no sonho indica um nível de auto-awareness interesante.',
      'Sonhos lúcidos são sinais de uma mente muy ativa e consciente.'
    ];
    interpretacao += ' ' + appendices[Math.floor(Math.random() * appendices.length)];
  }

  return interpretacao;
}

function detectarBiologicos(texto) {
  const minusculas = texto.toLowerCase();
  const biologicos = [];

  const mapeamento = {
    'fome': ['fome', 'comida', 'comer', 'almoço', 'almoco', 'jantar', 'cafe', 'café', 'faminto'],
    'cansaço': ['cansado', 'cansaço', 'dormir', 'sono', 'acordado', 'noite', 'descansar', 'exausto'],
    'sede': ['sede', 'bebida', 'beber', 'agua', 'água', 'bebê', 'bebe', 'líquido'],
    'frio': ['frio', 'congelando', 'gelo', 'gelado', 'congelado', 'arpente', 'tremendo'],
    'calor': ['quente', 'calor', 'sudando', 'transpirando', 'febre'],
    'desconforto': ['banheiro', 'urinar', 'molhar', 'cistite', 'bexiga'],
    'dor': ['dor', 'doendo', 'machucado', 'machucar', 'ferido', 'lesão', 'lesao', 'dói']
  };

  for (const [nome, palavras] of Object.entries(mapeamento)) {
    for (const palavra of palavras) {
      if (minusculas.includes(palavra)) {
        if (!biologicos.includes(nome.charAt(0).toUpperCase() + nome.slice(1))) {
          biologicos.push(nome.charAt(0).toUpperCase() + nome.slice(1));
        }
        break;
      }
    }
  }

  return biologicos;
}

async function analisarSonhoMock(textoSonho) {
  const delay = Math.floor(Math.random() * 200) + 400;
  await new Promise(resolve => setTimeout(resolve, delay));

  const { padroes, categorias } = detectarPadroes(textoSonho);

  padroes.biologicos = detectarBiologicos(textoSonho);

  const interpretacao = gerarInterpretacao(textoSonho, padroes, categorias);

  return {
    interpretacao,
    categorias,
    padroes
  };
}

async function analisarSonhoReal(textoSonho) {
  console.log('⚠️ USE_REAL_AI está true - função real ainda não implementada');
  return analisarSonhoMock(textoSonho);
}

const analisarSonho = async (textoSonho) => {
  if (USE_REAL_AI) {
    return analisarSonhoReal(textoSonho);
  }
  return analisarSonhoMock(textoSonho);
};

module.exports = { analisarSonho, USE_REAL_AI };