import { degToRad, normalizeRadians, radToDeg } from "./frames.mjs";

function precessJ2000(raRad, decRad, timeCtx) {
  const T = (timeCtx.jdTt - 2451545.0) / 36525;
  const zeta = degToRad((2306.2181 * T + 0.30188 * T * T + 0.017998 * T * T * T) / 3600);
  const z = degToRad((2306.2181 * T + 1.09468 * T * T + 0.018203 * T * T * T) / 3600);
  const theta = degToRad((2004.3109 * T - 0.42665 * T * T - 0.041833 * T * T * T) / 3600);
  const A = Math.cos(decRad) * Math.sin(raRad + zeta);
  const B = Math.cos(theta) * Math.cos(decRad) * Math.cos(raRad + zeta) - Math.sin(theta) * Math.sin(decRad);
  const C = Math.sin(theta) * Math.cos(decRad) * Math.cos(raRad + zeta) + Math.cos(theta) * Math.sin(decRad);
  return {
    raRad: normalizeRadians(Math.atan2(A, B) + z),
    decRad: Math.asin(C)
  };
}

export function normalizeStarCatalog(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (let i = 0; i < raw.length; i += 1) {
    const row = raw[i];
    if (!Array.isArray(row) || row.length < 3) continue;
    out.push({
      name: String(row[0] || ""),
      raHours: Number(row[1]),
      decDeg: Number(row[2]),
      mag: Number(row[3]),
      temp: Number(row[4]),
      dist: Number(row[5]),
      // Optional proper motion fields (mas/year): [6] for RA*cos(Dec), [7] for Dec.
      pmRaMasYr: Number(row[6]),
      pmDecMasYr: Number(row[7])
    });
  }
  return out.filter((row) => Number.isFinite(row.raHours) && Number.isFinite(row.decDeg));
}

export function computeStarEquatorial(entry, timeCtx) {
  const yearsSinceJ2000 = (timeCtx.jdTt - 2451545.0) / 365.25;
  const pmRaDegYr = Number.isFinite(entry.pmRaMasYr) ? (entry.pmRaMasYr / 1000) / 3600 : 0;
  const pmDecDegYr = Number.isFinite(entry.pmDecMasYr) ? (entry.pmDecMasYr / 1000) / 3600 : 0;
  const raRad = degToRad((entry.raHours * 15) + pmRaDegYr * yearsSinceJ2000);
  const decRad = degToRad(entry.decDeg + pmDecDegYr * yearsSinceJ2000);
  const prec = precessJ2000(raRad, decRad, timeCtx);
  return {
    raRad: prec.raRad,
    decRad: prec.decRad,
    raDeg: radToDeg(prec.raRad),
    decDeg: radToDeg(prec.decRad),
    name: entry.name,
    mag: entry.mag,
    temp: entry.temp,
    dist: entry.dist
  };
}
