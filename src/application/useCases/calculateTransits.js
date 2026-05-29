const { TransitPlanet, NatalPlanet } = require("../../domain/entities");

class CalculateTransitsUseCase {
  #astronomyAdapter;

  constructor(astronomyAdapter) {
    this.#astronomyAdapter = astronomyAdapter;
  }

  execute({ date, latitude, longitude }) {
    if (!date || isNaN(new Date(date).getTime())) {
      throw new Error("Data inválida");
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw new Error("Coordenadas geográficas inválidas");
    }

    const time = this.#astronomyAdapter.makeTime(new Date(date));
    const observer = this.#astronomyAdapter.createObserver(lat, lon, 0);

    const planets = Object.entries(this.#astronomyAdapter.getBodies())
      .filter(([name]) => name !== "sun")
      .map(([name, body]) => {
        const position = this.#astronomyAdapter.calculatePosition(body, time, observer);
        return new TransitPlanet({
          name,
          sign: position.sign,
          degree: position.degree,
          fullDegree: position.fullDegree,
          retrograde: position.retrograde
        });
      });

    const sunPosition = this.#astronomyAdapter.calculateSunPosition(time);
    planets.unshift(new TransitPlanet({
      name: "sun",
      sign: sunPosition.sign,
      degree: sunPosition.degree,
      fullDegree: sunPosition.fullDegree,
      retrograde: false
    }));

    const transits = planets.reduce((acc, planet) => {
      acc[planet.name] = planet.toJSON();
      return acc;
    }, {});

    return transits;
  }
}

class MapNatalPlanetsUseCase {
  execute(planetsFromDb) {
    if (!planetsFromDb || !Array.isArray(planetsFromDb)) {
      throw new Error("Planetas natal inválidos");
    }

    const natalPlanets = {};
    planetsFromDb.forEach(planet => {
      natalPlanets[planet.planet] = new NatalPlanet({
        name: planet.planet,
        sign: planet.sign,
        degree: planet.degree,
        fullDegree: planet.fullDegree,
        house: planet.house,
        retrograde: planet.retrograde
      }).toJSON();
    });

    return natalPlanets;
  }
}

module.exports = {
  CalculateTransitsUseCase,
  MapNatalPlanetsUseCase
};