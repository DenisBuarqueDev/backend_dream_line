const { TransitAspect, ASPECT_DEFINITIONS } = require("../../domain/entities");

class CalculateTransitAspectsUseCase {
  #calculateOrb;

  constructor() {
    this.#calculateOrb = (diff, angle) => Math.abs(diff - angle);
  }

  execute({ transitPlanets, natalPlanets }) {
    if (!transitPlanets || !natalPlanets) {
      throw new Error("Planetas de trânsito e natal são obrigatórios");
    }

    const aspects = [];
    const transitNames = Object.keys(transitPlanets);
    const natalNames = Object.keys(natalPlanets);

    for (const transitName of transitNames) {
      const transit = transitPlanets[transitName];
      if (!transit || !transit.fullDegree) continue;

      for (const natalName of natalNames) {
        const natal = natalPlanets[natalName];
        if (!natal || !natal.fullDegree) continue;

        const diff = this.#calculateAngularDistance(
          transit.fullDegree,
          natal.fullDegree
        );

        for (const aspectDef of ASPECT_DEFINITIONS) {
          const orb = this.#calculateOrb(diff, aspectDef.angle);

          if (orb <= aspectDef.orb) {
            aspects.push(new TransitAspect({
              transitPlanet: transitName,
              natalPlanet: natalName,
              aspect: aspectDef.name,
              angle: aspectDef.angle,
              orb: Math.round(orb * 10) / 10,
              transitSign: transit.sign,
              natalSign: natal.sign
            }).toJSON());

            break;
          }
        }
      }
    }

    return aspects.sort((a, b) => a.orb - b.orb);
  }

  #calculateAngularDistance(lon1, lon2) {
    let diff = Math.abs(lon1 - lon2);
    if (diff > 180) diff = 360 - diff;
    return diff;
  }
}

module.exports = { CalculateTransitAspectsUseCase };