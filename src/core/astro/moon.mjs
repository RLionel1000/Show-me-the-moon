import { degToRad, eclipticToEquatorial, normalizeDegrees, trueObliquityRad, wrapRadiansPi } from "./frames.mjs";

export function computeMoonEquatorial(timeCtx) {
  // Compact modern-era lunar model with a fuller periodic series than the previous
  // implementation. The extra terms materially improve apparent RA/Dec and distance
  // while staying light enough for browser use.
  const t = timeCtx.jcTt;
  const l0 = normalizeDegrees(
    218.3164477 +
      481267.88123421 * t -
      0.0015786 * t * t +
      (t * t * t) / 538841 -
      (t * t * t * t) / 65194000
  );
  const mMoon = normalizeDegrees(
    134.9633964 +
      477198.8675055 * t +
      0.0087414 * t * t +
      (t * t * t) / 69699 -
      (t * t * t * t) / 14712000
  );
  const mSun = normalizeDegrees(
    357.5291092 +
      35999.0502909 * t -
      0.0001536 * t * t +
      (t * t * t) / 24490000
  );
  const d = normalizeDegrees(
    297.8501921 +
      445267.1114034 * t -
      0.0018819 * t * t +
      (t * t * t) / 545868 -
      (t * t * t * t) / 113065000
  );
  const f = normalizeDegrees(
    93.272095 +
      483202.0175233 * t -
      0.0036539 * t * t -
      (t * t * t) / 3526000 +
      (t * t * t * t) / 863310000
  );

  const mMoonRad = degToRad(mMoon);
  const mSunRad = degToRad(mSun);
  const dRad = degToRad(d);
  const fRad = degToRad(f);

  const lambdaDeg =
    l0 +
    6.289 * Math.sin(mMoonRad) +
    1.274 * Math.sin(2 * dRad - mMoonRad) +
    0.658 * Math.sin(2 * dRad) +
    0.214 * Math.sin(2 * mMoonRad) -
    0.186 * Math.sin(mSunRad) -
    0.114 * Math.sin(2 * fRad) -
    0.059 * Math.sin(2 * dRad - 2 * mMoonRad) -
    0.057 * Math.sin(2 * dRad - mSunRad - mMoonRad) +
    0.053 * Math.sin(2 * dRad + mMoonRad) +
    0.046 * Math.sin(2 * dRad - mSunRad) +
    0.041 * Math.sin(mSunRad + mMoonRad) -
    0.035 * Math.sin(dRad) -
    0.031 * Math.sin(mMoonRad - mSunRad) -
    0.015 * Math.sin(2 * fRad - 2 * dRad) +
    0.011 * Math.sin(mMoonRad - 4 * dRad);

  const betaDeg =
    5.128 * Math.sin(fRad) +
    0.280 * Math.sin(mMoonRad + fRad) +
    0.277 * Math.sin(mMoonRad - fRad) +
    0.173 * Math.sin(2 * dRad - fRad) +
    0.055 * Math.sin(2 * dRad + fRad - mMoonRad) +
    0.046 * Math.sin(2 * dRad - fRad - mMoonRad) +
    0.033 * Math.sin(2 * dRad + fRad) +
    0.017 * Math.sin(2 * mMoonRad + fRad) +
    0.009 * Math.sin(2 * dRad + mMoonRad - fRad) +
    0.009 * Math.sin(2 * dRad - mMoonRad - fRad) +
    0.008 * Math.sin(2 * dRad - mSunRad + fRad);

  const distKm =
    385000.56 -
    20905 * Math.cos(mMoonRad) -
    3699 * Math.cos(2 * dRad - mMoonRad) -
    2956 * Math.cos(2 * dRad) -
    570 * Math.cos(2 * mMoonRad) +
    246 * Math.cos(2 * mMoonRad - 2 * dRad) -
    205 * Math.cos(mSunRad - 2 * dRad) -
    171 * Math.cos(mMoonRad + 2 * dRad) -
    152 * Math.cos(mMoonRad + mSunRad - 2 * dRad);

  const eq = eclipticToEquatorial(degToRad(normalizeDegrees(lambdaDeg)), degToRad(betaDeg), trueObliquityRad(timeCtx.jcTt));
  return {
    raRad: eq.raRad,
    decRad: eq.decRad,
    distanceKm: distKm
  };
}

export function computeMoonIllumination(sunEq, moonEq) {
  const sunDistKm = (sunEq.distanceAu || 1) * 149597870.7;
  const moonDistKm = moonEq.distanceKm;
  const phi = Math.acos(
    Math.sin(sunEq.decRad) * Math.sin(moonEq.decRad) +
      Math.cos(sunEq.decRad) * Math.cos(moonEq.decRad) * Math.cos(sunEq.raRad - moonEq.raRad)
  );
  const inc = Math.atan2(sunDistKm * Math.sin(phi), moonDistKm - sunDistKm * Math.cos(phi));
  const angle = Math.atan2(
    Math.cos(sunEq.decRad) * Math.sin(sunEq.raRad - moonEq.raRad),
    Math.sin(sunEq.decRad) * Math.cos(moonEq.decRad) -
      Math.cos(sunEq.decRad) * Math.sin(moonEq.decRad) * Math.cos(sunEq.raRad - moonEq.raRad)
  );
  const phase = 0.5 + 0.5 * inc * (angle < 0 ? -1 : 1) / Math.PI;
  return {
    fraction: (1 + Math.cos(inc)) / 2,
    phase,
    angle: wrapRadiansPi(angle)
  };
}
