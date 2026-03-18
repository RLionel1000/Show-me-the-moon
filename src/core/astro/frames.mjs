const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

export function degToRad(value) {
  return value * DEG2RAD;
}

export function radToDeg(value) {
  return value * RAD2DEG;
}

export function normalizeDegrees(value) {
  let out = value % 360;
  if (out < 0) out += 360;
  return out;
}

export function normalizeRadians(value) {
  let out = value % (2 * Math.PI);
  if (out < 0) out += 2 * Math.PI;
  return out;
}

export function wrapRadiansPi(value) {
  let out = normalizeRadians(value);
  if (out > Math.PI) out -= 2 * Math.PI;
  return out;
}

export function meanObliquityRad(jcTt) {
  const u = jcTt / 100;
  const arcsec =
    84381.406 -
    4680.93 * u -
    1.55 * u * u +
    1999.25 * u * u * u -
    51.38 * u * u * u * u;
  return degToRad(arcsec / 3600);
}

export function nutationRad(jcTt) {
  const L = degToRad(normalizeDegrees(280.4665 + 36000.7698 * jcTt));
  const Lm = degToRad(normalizeDegrees(218.3165 + 481267.8813 * jcTt));
  const Om = degToRad(normalizeDegrees(125.04452 - 1934.136261 * jcTt));
  const dPsiArcsec = -17.2 * Math.sin(Om) - 1.32 * Math.sin(2 * L) - 0.23 * Math.sin(2 * Lm) + 0.21 * Math.sin(2 * Om);
  const dEpsArcsec = 9.2 * Math.cos(Om) + 0.57 * Math.cos(2 * L) + 0.1 * Math.cos(2 * Lm) - 0.09 * Math.cos(2 * Om);
  return {
    dPsiRad: degToRad(dPsiArcsec / 3600),
    dEpsRad: degToRad(dEpsArcsec / 3600)
  };
}

export function trueObliquityRad(jcTt) {
  const mean = meanObliquityRad(jcTt);
  const nut = nutationRad(jcTt);
  return mean + nut.dEpsRad;
}

export function gmstRad(jdUtc) {
  const T = (jdUtc - 2451545.0) / 36525;
  const gmstDeg =
    280.46061837 +
    360.98564736629 * (jdUtc - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000;
  return degToRad(normalizeDegrees(gmstDeg));
}

export function apparentSiderealRad(jdUtc, jcTt) {
  const gmst = gmstRad(jdUtc);
  const nut = nutationRad(jcTt);
  const eps = trueObliquityRad(jcTt);
  return normalizeRadians(gmst + nut.dPsiRad * Math.cos(eps));
}

export function eclipticToEquatorial(lambdaRad, betaRad, epsRad) {
  const sinL = Math.sin(lambdaRad);
  const cosL = Math.cos(lambdaRad);
  const sinB = Math.sin(betaRad);
  const cosB = Math.cos(betaRad);
  const sinE = Math.sin(epsRad);
  const cosE = Math.cos(epsRad);
  const ra = Math.atan2(sinL * cosE - Math.tan(betaRad) * sinE, cosL);
  const dec = Math.asin(sinB * cosE + cosB * sinE * sinL);
  return { raRad: normalizeRadians(ra), decRad: dec };
}
