import { degToRad, eclipticToEquatorial, normalizeDegrees, trueObliquityRad } from "./frames.mjs";

export function computeSunEquatorial(timeCtx) {
  const T = timeCtx.jcTt;
  const L0 = normalizeDegrees(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M = normalizeDegrees(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
  const mRad = degToRad(M);
  const c =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(mRad) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * mRad) +
    0.000289 * Math.sin(3 * mRad);
  const trueLonDeg = L0 + c;
  const vDeg = M + c;
  const rAu = (1.000001018 * (1 - e * e)) / (1 + e * Math.cos(degToRad(vDeg)));
  const omegaDeg = 125.04 - 1934.136 * T;
  const lambdaAppDeg = trueLonDeg - 0.00569 - 0.00478 * Math.sin(degToRad(omegaDeg));
  const eps = trueObliquityRad(T);
  const eq = eclipticToEquatorial(degToRad(normalizeDegrees(lambdaAppDeg)), 0, eps);
  return {
    raRad: eq.raRad,
    decRad: eq.decRad,
    distanceAu: rAu
  };
}
