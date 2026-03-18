import { apparentSiderealRad, normalizeDegrees, radToDeg, wrapRadiansPi, degToRad } from "./frames.mjs";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function refractionCorrectionDeg(trueAltitudeDeg, pressurehPa, temperatureC) {
  if (!Number.isFinite(trueAltitudeDeg) || trueAltitudeDeg < -1.5) return 0;
  const p = Number.isFinite(pressurehPa) ? pressurehPa : 1010;
  const t = Number.isFinite(temperatureC) ? temperatureC : 10;
  const e = trueAltitudeDeg + 10.3 / (trueAltitudeDeg + 5.11);
  const baseArcMin = 1.02 / Math.tan(degToRad(e));
  const scaledArcMin = baseArcMin * (p / 1010) * (283 / (273 + t));
  return scaledArcMin / 60;
}

export function topocentricEquatorial(raRad, decRad, distanceKm, timeCtx, latDeg, lonDeg, elevationMeters) {
  if (!Number.isFinite(raRad) || !Number.isFinite(decRad) || !Number.isFinite(distanceKm) || distanceKm <= 0) {
    return { raRad, decRad };
  }

  const latRad = degToRad(latDeg);
  const lonRad = degToRad(lonDeg);
  const elevationKm = Number.isFinite(elevationMeters) ? elevationMeters / 1000 : 0;
  const lstRad = apparentSiderealRad(timeCtx.jdUtc, timeCtx.jcTt) + lonRad;
  const hourAngleRad = wrapRadiansPi(lstRad - raRad);

  const equatorialRadiusKm = 6378.137;
  const flattening = 1 / 298.257223563;
  const axisRatio = 1 - flattening;
  const u = Math.atan(axisRatio * Math.tan(latRad));
  const rhoSinPhiPrime = axisRatio * Math.sin(u) + (elevationKm / equatorialRadiusKm) * Math.sin(latRad);
  const rhoCosPhiPrime = Math.cos(u) + (elevationKm / equatorialRadiusKm) * Math.cos(latRad);
  const sinPi = equatorialRadiusKm / distanceKm;
  const cosDec = Math.cos(decRad);

  const deltaRaRad = Math.atan2(
    -rhoCosPhiPrime * sinPi * Math.sin(hourAngleRad),
    cosDec - rhoCosPhiPrime * sinPi * Math.cos(hourAngleRad)
  );
  const raTopoRad = raRad + deltaRaRad;
  const decTopoRad = Math.atan2(
    (Math.sin(decRad) - rhoSinPhiPrime * sinPi) * Math.cos(deltaRaRad),
    cosDec - rhoCosPhiPrime * sinPi * Math.cos(hourAngleRad)
  );

  return {
    raRad: raTopoRad,
    decRad: decTopoRad
  };
}

export function equatorialToHorizontal(raRad, decRad, timeCtx, latDeg, lonDeg, options) {
  const latRad = degToRad(latDeg);
  const lonRad = degToRad(lonDeg);
  const lstRad = apparentSiderealRad(timeCtx.jdUtc, timeCtx.jcTt) + lonRad;
  const hRad = wrapRadiansPi(lstRad - raRad);

  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const sinDec = Math.sin(decRad);
  const cosDec = Math.cos(decRad);
  const sinH = Math.sin(hRad);
  const cosH = Math.cos(hRad);

  const sinAlt = clamp(sinLat * sinDec + cosLat * cosDec * cosH, -1, 1);
  const altitudeTrueRad = Math.asin(sinAlt);
  const altitudeTrueDeg = radToDeg(altitudeTrueRad);
  const refrDeg = refractionCorrectionDeg(altitudeTrueDeg, options && options.pressurehPa, options && options.temperatureC);
  const altitudeApparentDeg = altitudeTrueDeg + refrDeg;
  const altitudeApparentRad = degToRad(altitudeApparentDeg);

  // Horizontal basis components:
  // xWest > 0 toward west, yNorth > 0 toward north.
  const xWest = cosDec * sinH;
  const yNorth = sinDec * cosLat - cosDec * sinLat * cosH;
  const xEast = -xWest;
  let azimuthDegTrueNorth = normalizeDegrees(radToDeg(Math.atan2(xEast, yNorth)));

  // Scene/SunCalc-compatible azimuth convention:
  // 0 = South, East = -90, West = +90.
  let azimuthSceneDeg = azimuthDegTrueNorth - 180;
  if (azimuthSceneDeg <= -180) azimuthSceneDeg += 360;
  if (azimuthSceneDeg > 180) azimuthSceneDeg -= 360;

  return {
    hourAngleRad: hRad,
    altitudeTrueDeg,
    altitudeApparentDeg,
    altitudeApparentRad,
    azimuthDegTrueNorth,
    azimuthSceneRad: degToRad(azimuthSceneDeg)
  };
}
