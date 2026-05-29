const Astronomy = require("astronomy-engine");

const SIGNS = Object.freeze([
  "Áries", "Touro", "Gêmeos", "Câncer", "Leão", "Virgem",
  "Libra", "Escorpião", "Sagitário", "Capricórnio", "Aquário", "Peixes"
]);

const PLANETS = Object.freeze({
  sun: Astronomy.Body.Sun,
  moon: Astronomy.Body.Mercury,
  mercury: Astronomy.Body.Mercury,
  venus: Astronomy.Body.Venus,
  mars: Astronomy.Body.Mars,
  jupiter: Astronomy.Body.Jupiter,
  saturn: Astronomy.Body.Saturn,
  uranus: Astronomy.Body.Uranus,
  neptune: Astronomy.Body.Neptune,
  pluto: Astronomy.Body.Pluto
});

const ASPECT_DEFINITIONS = Object.freeze([
  { name: "Conjunção", angle: 0, orb: 8, symbol: "☌", energy: "fusion", intensity: "alta" },
  { name: "Sextil", angle: 60, orb: 6, symbol: "∠", energy: "harmony", intensity: "média" },
  { name: "Quadratura", angle: 90, orb: 7, symbol: "□", energy: "challenge", intensity: "média" },
  { name: "Trígono", angle: 120, orb: 7, symbol: "△", energy: "harmony", intensity: "alta" },
  { name: "Oposição", angle: 180, orb: 8, symbol: "☍", energy: "tension", intensity: "alta" }
]);

const PLANET_METADATA = Object.freeze({
  sun: { house: "1st", modality: "fixed", element: "fire", emoji: "☀️" },
  moon: { house: "4th", modality: "cardinal", element: "water", emoji: "🌙" },
  mercury: { house: "3rd", modality: "mutable", element: "air", emoji: "☿" },
  venus: { house: "7th", modality: "fixed", element: "air", emoji: "♀️" },
  mars: { house: "1st", modality: "cardinal", element: "fire", emoji: "♂️" },
  jupiter: { house: "9th", modality: "mutable", element: "fire", emoji: "♃" },
  saturn: { house: "10th", modality: "cardinal", element: "earth", emoji: "♄" },
  uranus: { house: "11th", modality: "fixed", element: "air", emoji: "♅" },
  neptune: { house: "12th", modality: "mutable", element: "water", emoji: "♆" },
  pluto: { house: "8th", modality: "fixed", element: "water", emoji: "♇" }
});

class TransitPlanet {
  constructor({ name, sign, degree, fullDegree, retrograde = false }) {
    this.name = name;
    this.sign = sign;
    this.degree = degree;
    this.fullDegree = fullDegree;
    this.retrograde = retrograde;
  }

  get metadata() {
    return PLANET_METADATA[this.name] || {};
  }

  toJSON() {
    return {
      name: this.name,
      sign: this.sign,
      degree: this.degree,
      fullDegree: this.fullDegree,
      retrograde: this.retrograde,
      ...this.metadata
    };
  }
}

class NatalPlanet {
  constructor({ name, sign, degree, fullDegree, house, retrograde = false }) {
    this.name = name;
    this.sign = sign;
    this.degree = degree;
    this.fullDegree = fullDegree;
    this.house = house;
    this.retrograde = retrograde;
  }

  toJSON() {
    return {
      name: this.name,
      sign: this.sign,
      degree: this.degree,
      fullDegree: this.fullDegree,
      house: this.house,
      retrograde: this.retrograde
    };
  }
}

class TransitAspect {
  constructor({ transitPlanet, natalPlanet, aspect, angle, orb, transitSign, natalSign }) {
    this.transitPlanet = transitPlanet;
    this.natalPlanet = natalPlanet;
    this.aspect = aspect;
    this.angle = angle;
    this.orb = orb;
    this.transitSign = transitSign;
    this.natalSign = natalSign;
  }

  get definition() {
    return ASPECT_DEFINITIONS.find(d => d.name === this.aspect) || {};
  }

  get energy() {
    return this.definition.energy;
  }

  get intensity() {
    return this.definition.intensity;
  }

  get symbol() {
    return this.definition.symbol;
  }

  toJSON() {
    return {
      transitPlanet: this.transitPlanet,
      natalPlanet: this.natalPlanet,
      aspect: this.aspect,
      symbol: this.symbol,
      angle: this.angle,
      orb: this.orb,
      transitSign: this.transitSign,
      natalSign: this.natalSign,
      energy: this.energy,
      intensity: this.intensity
    };
  }
}

class Prediction {
  constructor({ segments = [], date, chartId }) {
    this.segments = segments;
    this.date = date || new Date().toISOString().split("T")[0];
    this.chartId = chartId;
  }

  addSegment(segment) {
    if (this.segments.length < 5) {
      this.segments.push(segment);
    }
    return this;
  }

  toJSON() {
    return {
      date: this.date,
      chartId: this.chartId,
      segments: this.segments,
      count: this.segments.length
    };
  }
}

const numerology = require('./numerology');
const energyPanel = require('./energyPanel');
const dreamNumerology = require('./dreamNumerology');

module.exports = {
  SIGNS,
  PLANETS,
  ASPECT_DEFINITIONS,
  PLANET_METADATA,
  TransitPlanet,
  NatalPlanet,
  TransitAspect,
  Prediction,
  ...numerology,
  ...energyPanel,
  ...dreamNumerology
};