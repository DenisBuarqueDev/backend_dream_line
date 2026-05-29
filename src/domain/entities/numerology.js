const MASTER_NUMBERS = Object.freeze([11, 22, 33]);

const NUMEROLOGY_INTERPRETATIONS = Object.freeze({
  1: {
    essence: "Início, ação, liderança",
    traits: ["independência", "originalidade", "coragem"],
    challenge: "Tornar-se demasiado autoritário",
    advice: "Seja pioneiro, não ditador"
  },
  2: {
    essence: "Sensibilidade, relações, equilíbrio",
    traits: ["diplomacia", "cooperação", "intuição"],
    challenge: "Ser excessivamente dependente",
    advice: "Valorize sua voz em parcerias"
  },
  3: {
    essence: "Comunicação, criatividade, alegria",
    traits: ["expressão", "otimismo", "arte"],
    challenge: "Dispersar energia em superficialidades",
    advice: "Aprofunde sua expressão criativa"
  },
  4: {
    essence: "Estabilidade, trabalho, estrutura",
    traits: ["praticidade", "disciplina", "confiabilidade"],
    challenge: "Rigidez excessiva",
    advice: "Adapte-se às mudanças necessárias"
  },
  5: {
    essence: "Mudanças, movimento, liberdade",
    traits: ["adaptabilidade", "versatilidade", "curiosidade"],
    challenge: "Instabilidade constante",
    advice: "Escolha suas mudanças com sabedoria"
  },
  6: {
    essence: "Harmonia, família, responsabilidade",
    traits: ["cuidado", "justiça", "devotamento"],
    challenge: "Sacrificar-se excessivamente",
    advice: "Cuide de si para cuidar dos outros"
  },
  7: {
    essence: "Análise, introspecção, sabedoria",
    traits: ["profundidade", "espiritualidade", "inteligência"],
    challenge: "Isolar-se demais",
    advice: "Compartilhe sua sabedoria"
  },
  8: {
    essence: "Poder, abundância, autoridade",
    traits: ["ambição", "liderança", "materialismo"],
    challenge: "Tornar-se materialista",
    advice: "Use poder com integridade"
  },
  9: {
    essence: "Humanitarismo, completude, transformação",
    traits: ["generosidade", "sabedoria", "compaixão"],
    challenge: "Dificuldade em заверimentos",
    exercise: "Libere o que não serve mais"
  },
  11: {
    essence: "Intuição elevada, inspiração, espiritualidade",
    traits: ["visão", "iluminação", "sensibilidade"],
    challenge: "Nervosismo e ansiedade",
    advice: "Confie em sua intuição"
  },
  22: {
    essence: "Realização prática, construção, maestria",
    traits: ["ambição", "pragmatismo", "grandeza"],
    challenge: "Escalas além das capacidades",
    advice: "Construa com fundamentos sólidos"
  },
  33: {
    essence: "Mestria espiritual, cura, amor altruísta",
    traits: ["sacrifício", "ensinamento", "iluminação"],
    challenge: "Esgotamento espiritual",
    advice: "Equilibre dar e receber"
  }
});

const DAY_NUMBER_MESSAGES = Object.freeze({
  1: "Dia de novoscomeços. Tome a iniciativa em algo que postponha.",
  2: "Dia de cooperação. Busque parcerias e equilíbrio nas relações.",
  3: "Dia de alegria. Expresse-se criativamente e conecte-se com alegria.",
  4: "Dia de trabalho. Foque em estruturas e responsabilidades.",
  5: "Dia de mudanças. Esteja aberto a novas experiências e adaptações.",
  6: "Dia de família. Dedique tempo ao lar e aos que ama.",
  7: "Dia de introspecção. Reserve tempo para reflexão e silêncio.",
  8: "Dia de poder. Foque em realizações materiais e metas importantes.",
  9: "Dia de encerramento. Libere o que não serve e complete ciclos."
});

class LifePathNumber {
  constructor(number) {
    this.number = number;
    this.isMaster = MASTER_NUMBERS.includes(number);
  }

  get interpretation() {
    return NUMEROLOGY_INTERPRETATIONS[this.number] || {};
  }

  toJSON() {
    return {
      number: this.number,
      isMaster: this.isMaster,
      essence: this.interpretation.essence,
      traits: this.interpretation.traits
    };
  }
}

class PersonalNumber {
  constructor(number, date) {
    this.number = number;
    this.date = date;
  }

  toJSON() {
    return {
      number: this.number,
      date: this.date
    };
  }
}

class UniversalDayNumber {
  constructor(number, date) {
    this.number = number;
    this.date = date;
  }

  get message() {
    return DAY_NUMBER_MESSAGES[this.number] || "Dia de reflexão e planejamento.";
  }

  toJSON() {
    return {
      number: this.number,
      date: this.date,
      message: this.message
    };
  }
}

class DailyNumerologyReport {
  constructor({ lifePathNumber, personalNumber, universalNumber, date }) {
    this.lifePathNumber = lifePathNumber;
    this.personalNumber = personalNumber;
    this.universalNumber = universalNumber;
    this.date = date || new Date().toISOString().split("T")[0];
  }

  get combinedMessage() {
    const life = NUMEROLOGY_INTERPRETATIONS[this.lifePathNumber] || {};
    const personal = this.personalNumber;
    const universal = this.universalNumber;

    return this.#generateCombinedMessage(life, personal, universal);
  }

  #generateCombinedMessage(lifeEssence, personalNum, universalNum) {
    const messages = [];

    if (personalNum === universalNum) {
      messages.push(`Hoje seu número pessoal (${personalNum}) se alinha com o universal (${universalNum}).`);
    }

    if (lifeEssence.advice) {
      messages.push(lifeEssence.advice);
    }

    messages.push(DAY_NUMBER_MESSAGES[universalNum] || "");

    return messages.slice(0, 3).join(" ");
  }

  toJSON() {
    return {
      date: this.date,
      lifePath: this.lifePathNumber,
      personalNumber: this.personalNumber,
      universalNumber: this.universalNumber,
      message: this.combinedMessage,
      _interpretation: {
        lifePath: NUMEROLOGY_INTERPRETATIONS[this.lifePathNumber],
        personal: NUMEROLOGY_INTERPRETATIONS[this.personalNumber],
        universal: {
          number: this.universalNumber,
          message: DAY_NUMBER_MESSAGES[this.universalNumber]
        }
      }
    };
  }
}

module.exports = {
  MASTER_NUMBERS,
  NUMEROLOGY_INTERPRETATIONS,
  DAY_NUMBER_MESSAGES,
  LifePathNumber,
  PersonalNumber,
  UniversalDayNumber,
  DailyNumerologyReport
};