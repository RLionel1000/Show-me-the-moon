import { degToRad, normalizeDegrees, normalizeRadians, radToDeg, trueObliquityRad } from "./frames.mjs";

export const PLANET_ELEMENTS = {
  Mercury: { N: [48.3313, 3.24587e-5], i: [7.0047, 5.0e-8], w: [29.1241, 1.01444e-5], a: [0.387098, 0], e: [0.205635, 5.59e-10], M: [168.6562, 4.0923344368] },
  Venus: { N: [76.6799, 2.4659e-5], i: [3.3946, 2.75e-8], w: [54.891, 1.38374e-5], a: [0.72333, 0], e: [0.006773, -1.302e-9], M: [48.0052, 1.6021302244] },
  Earth: { N: [0, 0], i: [0, 0], w: [282.9404, 4.70935e-5], a: [1.0, 0], e: [0.016709, -1.151e-9], M: [356.047, 0.9856002585] },
  Mars: { N: [49.5574, 2.11081e-5], i: [1.8497, -1.78e-8], w: [286.5016, 2.92961e-5], a: [1.523688, 0], e: [0.093405, 2.516e-9], M: [18.6021, 0.5240207766] },
  Jupiter: { N: [100.4542, 2.76854e-5], i: [1.303, -1.557e-7], w: [273.8777, 1.64505e-5], a: [5.20256, 0], e: [0.048498, 4.469e-9], M: [19.895, 0.0830853001] },
  Saturn: { N: [113.6634, 2.3898e-5], i: [2.4886, -1.081e-7], w: [339.3939, 2.97661e-5], a: [9.55475, 0], e: [0.055546, -9.499e-9], M: [316.967, 0.0334442282] },
  Uranus: { N: [74.0005, 1.3978e-5], i: [0.7733, 1.9e-8], w: [96.6612, 3.0565e-5], a: [19.18171, -1.55e-8], e: [0.047318, 7.45e-9], M: [142.5905, 0.011725806] },
  Neptune: { N: [131.7806, 3.0173e-5], i: [1.77, -2.55e-7], w: [272.8461, -6.027e-6], a: [30.05826, 3.313e-8], e: [0.008606, 2.15e-9], M: [260.2471, 0.005995147] }
};

export const PLANET_ORDER = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"];

function keplerSolve(Mrad, e) {
  let E = Mrad + e * Math.sin(Mrad) * (1 + e * Math.cos(Mrad));
  for (let i = 0; i < 6; i += 1) {
    E = E - (E - e * Math.sin(E) - Mrad) / (1 - e * Math.cos(E));
  }
  return E;
}

function orbitalElements(elem, d) {
  return {
    N: degToRad(normalizeDegrees(elem.N[0] + elem.N[1] * d)),
    i: degToRad(elem.i[0] + elem.i[1] * d),
    w: degToRad(normalizeDegrees(elem.w[0] + elem.w[1] * d)),
    a: elem.a[0] + elem.a[1] * d,
    e: elem.e[0] + elem.e[1] * d,
    M: degToRad(normalizeDegrees(elem.M[0] + elem.M[1] * d))
  };
}

function orbitalToHeliocentric(elements) {
  const E = keplerSolve(elements.M, elements.e);
  const xv = elements.a * (Math.cos(E) - elements.e);
  const yv = elements.a * (Math.sqrt(1 - elements.e * elements.e) * Math.sin(E));
  const v = Math.atan2(yv, xv);
  const r = Math.sqrt(xv * xv + yv * yv);
  const vw = v + elements.w;
  return {
    x: r * (Math.cos(elements.N) * Math.cos(vw) - Math.sin(elements.N) * Math.sin(vw) * Math.cos(elements.i)),
    y: r * (Math.sin(elements.N) * Math.cos(vw) + Math.cos(elements.N) * Math.sin(vw) * Math.cos(elements.i)),
    z: r * (Math.sin(vw) * Math.sin(elements.i))
  };
}

function heliocentricEarthCoordinates(d) {
  const w = degToRad(normalizeDegrees(282.9404 + 4.70935e-5 * d));
  const e = 0.016709 - 1.151e-9 * d;
  const M = degToRad(normalizeDegrees(356.047 + 0.9856002585 * d));
  const sunGeocentric = orbitalToHeliocentric({
    N: 0,
    i: 0,
    w,
    a: 1.0,
    e,
    M
  });
  return {
    x: -sunGeocentric.x,
    y: -sunGeocentric.y,
    z: -sunGeocentric.z
  };
}

export function computePlanetEquatorial(planetKey, timeCtx) {
  const d = timeCtx.jdTt - 2451543.5;
  const earth = heliocentricEarthCoordinates(d);
  let p = orbitalToHeliocentric(orbitalElements(PLANET_ELEMENTS[planetKey], d));
  // One-step light-time correction (good tradeoff: notable accuracy gain, tiny CPU cost).
  const xg0 = p.x - earth.x;
  const yg0 = p.y - earth.y;
  const zg0 = p.z - earth.z;
  const dist0 = Math.sqrt(xg0 * xg0 + yg0 * yg0 + zg0 * zg0);
  const tauDays = dist0 * 0.0057755183; // days per AU
  p = orbitalToHeliocentric(orbitalElements(PLANET_ELEMENTS[planetKey], d - tauDays));
  const xg = p.x - earth.x;
  const yg = p.y - earth.y;
  const zg = p.z - earth.z;
  const eps = trueObliquityRad(timeCtx.jcTt);
  const xe = xg;
  const ye = yg * Math.cos(eps) - zg * Math.sin(eps);
  const ze = yg * Math.sin(eps) + zg * Math.cos(eps);
  const ra = normalizeRadians(Math.atan2(ye, xe));
  const dec = Math.atan2(ze, Math.sqrt(xe * xe + ye * ye));
  const distanceAu = Math.sqrt(xg * xg + yg * yg + zg * zg);
  return {
    raRad: ra,
    decRad: dec,
    distanceAu,
    raDeg: radToDeg(ra),
    decDeg: radToDeg(dec)
  };
}
