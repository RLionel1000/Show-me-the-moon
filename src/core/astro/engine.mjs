import { buildTimeContext } from "./time.mjs";
import { radToDeg } from "./frames.mjs";
import { computeSunEquatorial } from "./sun.mjs";
import { computeMoonEquatorial, computeMoonIllumination } from "./moon.mjs";
import { computePlanetEquatorial, PLANET_ORDER } from "./planets.mjs";
import { computeStarEquatorial, normalizeStarCatalog } from "./stars.mjs";
import { equatorialToHorizontal, topocentricEquatorial } from "./horizon.mjs";

function nowMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const SUN_MEAN_RADIUS_KM = 695700;
const MOON_MEAN_RADIUS_KM = 1737.4;

function bodyOutput(id, eq, horiz, distance, sourceEq) {
  const out = {
    id,
    raDeg: radToDeg(eq.raRad),
    decDeg: radToDeg(eq.decRad),
    altitudeDegTrue: horiz.altitudeTrueDeg,
    altitudeDegApparent: horiz.altitudeApparentDeg,
    altitudeRadApparent: horiz.altitudeApparentRad,
    azimuthDegTrueNorth: horiz.azimuthDegTrueNorth,
    azimuthRad: horiz.azimuthSceneRad,
    distance
  };
  if (sourceEq && (sourceEq.raRad !== eq.raRad || sourceEq.decRad !== eq.decRad)) {
    out.geocentricRaDeg = radToDeg(sourceEq.raRad);
    out.geocentricDecDeg = radToDeg(sourceEq.decRad);
  }
  return out;
}

function distanceKmFromPayload(distance) {
  if (!distance || typeof distance !== "object") return null;
  if (Number.isFinite(distance.km)) return distance.km;
  if (Number.isFinite(distance.au)) return distance.au * 149597870.7;
  return null;
}

function topocentricForBody(eq, distance, timeCtx, latDeg, lonDeg, elevationMeters) {
  const distanceKm = distanceKmFromPayload(distance);
  if (!Number.isFinite(distanceKm)) return eq;
  return topocentricEquatorial(eq.raRad, eq.decRad, distanceKm, timeCtx, latDeg, lonDeg, elevationMeters);
}

function refineRootMs(sampleFn, aMs, bMs, targetAltDeg) {
  let lo = Math.min(aMs, bMs);
  let hi = Math.max(aMs, bMs);
  for (let i = 0; i < 24; i += 1) {
    const mid = 0.5 * (lo + hi);
    const fLo = sampleFn(lo) - targetAltDeg;
    const fMid = sampleFn(mid) - targetAltDeg;
    if (fLo === 0) return lo;
    if (fLo * fMid <= 0) hi = mid;
    else lo = mid;
  }
  return 0.5 * (lo + hi);
}

function findExtremumMs(sampleFn, startMs, endMs, iterations, seekMaximum) {
  let lo = Math.min(startMs, endMs);
  let hi = Math.max(startMs, endMs);
  for (let i = 0; i < iterations; i += 1) {
    const left = lo + (hi - lo) / 3;
    const right = hi - (hi - lo) / 3;
    const leftValue = sampleFn(left);
    const rightValue = sampleFn(right);
    if (seekMaximum ? leftValue < rightValue : leftValue > rightValue) lo = left;
    else hi = right;
  }
  return 0.5 * (lo + hi);
}

function findPeakMs(sampleFn, startMs, endMs, stepMs) {
  let bestT = startMs;
  let bestAlt = -1e9;
  for (let t = startMs; t <= endMs; t += stepMs) {
    const alt = sampleFn(t);
    if (alt > bestAlt) {
      bestAlt = alt;
      bestT = t;
    }
  }
  return bestT;
}

function findCrossings(sampleFn, startMs, endMs, stepMs, targetAltDeg) {
  const out = [];
  let t0 = startMs;
  let f0 = sampleFn(t0) - targetAltDeg;
  for (let t = startMs + stepMs; t <= endMs; t += stepMs) {
    const f1 = sampleFn(t) - targetAltDeg;
    if (f0 === 0 || f0 * f1 <= 0) {
      out.push([t0, t]);
    }
    t0 = t;
    f0 = f1;
  }
  return out;
}

function angularRadiusDegFromDistanceKm(radiusKm, distanceKm) {
  if (!Number.isFinite(radiusKm) || !Number.isFinite(distanceKm) || distanceKm <= radiusKm) {
    return 0;
  }
  return radToDeg(Math.asin(radiusKm / distanceKm));
}

function sunRiseSetTargetApparentAltitudeDeg(snapshot) {
  const distanceKm = distanceKmFromPayload(snapshot && snapshot.sun && snapshot.sun.distance);
  return -angularRadiusDegFromDistanceKm(SUN_MEAN_RADIUS_KM, distanceKm);
}

function moonRiseSetTargetApparentAltitudeDeg(snapshot) {
  const distanceKm = distanceKmFromPayload(snapshot && snapshot.moon && snapshot.moon.distance);
  return -angularRadiusDegFromDistanceKm(MOON_MEAN_RADIUS_KM, distanceKm);
}

export function createAstroEngine(options) {
  const opts = options || {};
  let starCatalog = normalizeStarCatalog(opts.starCatalog || []);
  const cache = new Map();
  const cacheLimit = Number.isFinite(opts.snapshotCacheLimit) ? Math.max(64, Math.trunc(opts.snapshotCacheLimit)) : 512;
  const sunEventsCache = new Map();
  const moonTimesCache = new Map();
  const sunEventsCacheLimit = Number.isFinite(opts.sunEventsCacheLimit) ? Math.max(32, Math.trunc(opts.sunEventsCacheLimit)) : 256;
  const moonTimesCacheLimit = Number.isFinite(opts.moonTimesCacheLimit) ? Math.max(32, Math.trunc(opts.moonTimesCacheLimit)) : 256;
  const stats = {
    snapshotHits: 0,
    snapshotMisses: 0,
    sunEventsHits: 0,
    sunEventsMisses: 0,
    moonTimesHits: 0,
    moonTimesMisses: 0
  };
  let version = "astro-engine-v1";

  function lruSet(map, key, value, limit) {
    map.set(key, value);
    if (map.size > limit) {
      const firstKey = map.keys().next().value;
      map.delete(firstKey);
    }
  }

  function makeKey(input, options) {
    const lat = Number(input.latDeg).toFixed(6);
    const lon = Number(input.lonDeg).toFixed(6);
    const rawTs = Math.trunc(Number(input.timestampUtcMs));
    const bucketMs = Number.isFinite(options && options.timeBucketMs)
      ? Math.max(1, Math.trunc(Number(options.timeBucketMs)))
      : 1000;
    // Quantization makes the snapshot cache stable under high-frequency updates.
    const ts = Math.trunc(rawTs / bucketMs) * bucketMs;
    const p = Number.isFinite(input.pressurehPa) ? Number(input.pressurehPa).toFixed(2) : "stdp";
    const t = Number.isFinite(input.temperatureC) ? Number(input.temperatureC).toFixed(2) : "stdt";
    const e = Number.isFinite(input.elevationMeters) ? Number(input.elevationMeters).toFixed(1) : "stde";
    const policy = String((options && options.updatePolicy) || "full");
    return `${ts}|${bucketMs}|${policy}|${lat}|${lon}|${p}|${t}|${e}`;
  }

  function makeDayKey(input, includeAtmos) {
    const d = new Date(Number(input.timestampUtcMs));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    const latQ = (Math.round(Number(input.latDeg) * 20) / 20).toFixed(2);
    const lonQ = (Math.round(Number(input.lonDeg) * 20) / 20).toFixed(2);
    const eQ = Number.isFinite(input.elevationMeters) ? (Math.round(Number(input.elevationMeters) / 50) * 50).toFixed(0) : "stde";
    if (!includeAtmos) return `${y}-${m}-${day}|${latQ}|${lonQ}|${eQ}`;
    const pQ = Number.isFinite(input.pressurehPa) ? (Math.round(Number(input.pressurehPa) / 2) * 2).toFixed(0) : "stdp";
    const tQ = Number.isFinite(input.temperatureC) ? (Math.round(Number(input.temperatureC) / 2) * 2).toFixed(0) : "stdt";
    return `${y}-${m}-${day}|${latQ}|${lonQ}|${eQ}|${pQ}|${tQ}`;
  }

  function computeSnapshot(input, options) {
    const started = nowMs();
    const qualityFlags = [];
    if (!input || !Number.isFinite(input.timestampUtcMs) || !Number.isFinite(input.latDeg) || !Number.isFinite(input.lonDeg)) {
      throw new Error("AstroEngine invalid input");
    }
    const key = makeKey(input, options);
    const bucketMs = Number.isFinite(options && options.timeBucketMs)
      ? Math.max(1, Math.trunc(Number(options.timeBucketMs)))
      : 1000;
    const updatePolicy = String((options && options.updatePolicy) || "full");
    if (cache.has(key)) {
      stats.snapshotHits += 1;
      const cached = cache.get(key);
      return {
        ...cached,
        meta: {
          ...cached.meta,
          fromCache: true,
          computeDurationMs: 0
        }
      };
    }
    stats.snapshotMisses += 1;
    const latDeg = clamp(Number(input.latDeg), -89.999999, 89.999999);
    const lonDeg = Number(input.lonDeg);
    const elevationMeters = Number.isFinite(input.elevationMeters) ? Number(input.elevationMeters) : 0;
    const timeCtx = buildTimeContext(Number(input.timestampUtcMs));
    const atmos = {
      pressurehPa: Number.isFinite(input.pressurehPa) ? Number(input.pressurehPa) : 1010,
      temperatureC: Number.isFinite(input.temperatureC) ? Number(input.temperatureC) : 10
    };

    const sunEq = computeSunEquatorial(timeCtx);
    const moonEq = computeMoonEquatorial(timeCtx);
    const sunTopoEq = topocentricForBody(sunEq, { au: sunEq.distanceAu }, timeCtx, latDeg, lonDeg, elevationMeters);
    const moonTopoEq = topocentricForBody(moonEq, { km: moonEq.distanceKm }, timeCtx, latDeg, lonDeg, elevationMeters);
    const sunHoriz = equatorialToHorizontal(sunTopoEq.raRad, sunTopoEq.decRad, timeCtx, latDeg, lonDeg, atmos);
    const moonHoriz = equatorialToHorizontal(moonTopoEq.raRad, moonTopoEq.decRad, timeCtx, latDeg, lonDeg, atmos);
    const moonIll = computeMoonIllumination(sunEq, moonEq);

    const sun = bodyOutput("sun", sunTopoEq, sunHoriz, { au: sunEq.distanceAu }, sunEq);
    const moon = bodyOutput("moon", moonTopoEq, moonHoriz, { km: moonEq.distanceKm }, moonEq);
    moon.illuminationFraction = moonIll.fraction;
    moon.phase = moonIll.phase;
    moon.parallacticAngleRad = Math.atan2(
      Math.sin(moonHoriz.hourAngleRad),
      Math.tan((latDeg * Math.PI) / 180) * Math.cos(moonEq.decRad) - Math.sin(moonEq.decRad) * Math.cos(moonHoriz.hourAngleRad)
    );

    const planets = new Array(PLANET_ORDER.length);
    for (let i = 0; i < PLANET_ORDER.length; i += 1) {
      const keyName = PLANET_ORDER[i];
      const eq = computePlanetEquatorial(keyName, timeCtx);
      const topoEq = topocentricForBody(eq, { au: eq.distanceAu }, timeCtx, latDeg, lonDeg, elevationMeters);
      const horiz = equatorialToHorizontal(topoEq.raRad, topoEq.decRad, timeCtx, latDeg, lonDeg, atmos);
      planets[i] = bodyOutput(keyName, topoEq, horiz, { au: eq.distanceAu }, eq);
    }

    const stars = new Array(starCatalog.length);
    for (let i = 0; i < starCatalog.length; i += 1) {
      const eq = computeStarEquatorial(starCatalog[i], timeCtx);
      const horiz = equatorialToHorizontal(eq.raRad, eq.decRad, timeCtx, latDeg, lonDeg, atmos);
      const starId = eq.name || `star_${i}`;
      const baseOut = bodyOutput(starId, eq, horiz, { ly: Number.isFinite(eq.dist) ? eq.dist : null });
      stars[i] = {
        ...baseOut,
        name: eq.name,
        mag: Number.isFinite(eq.mag) ? eq.mag : null,
        temp: Number.isFinite(eq.temp) ? eq.temp : null
      };
    }

    const snapshot = {
      sun,
      moon,
      planets,
      stars,
      meta: {
        engineVersion: version,
        timeScale: { input: "UTC", compute: "TT" },
        deltaTSeconds: timeCtx.deltaTSeconds,
        refractionModel: "bennett-saemundsson",
        qualityFlags,
        computeDurationMs: nowMs() - started,
        fromCache: false,
        timeBucketMs: bucketMs,
        updatePolicy,
        observerElevationMeters: elevationMeters
      }
    };

    lruSet(cache, key, snapshot, cacheLimit);
    return snapshot;
  }

  function sampleSunAltitude(inputBase, timestampMs) {
    const snap = computeSnapshot({
      ...inputBase,
      timestampUtcMs: timestampMs
    }, { timeBucketMs: 1000, updatePolicy: "full" });
    return snap.sun.altitudeDegApparent;
  }

  function sampleMoonAltitude(inputBase, timestampMs) {
    const snap = computeSnapshot({
      ...inputBase,
      timestampUtcMs: timestampMs
    }, { timeBucketMs: 1000, updatePolicy: "full" });
    return snap.moon.altitudeDegApparent;
  }

  function createAltitudeSampler(sampleFn) {
    // Daily event solvers call the same timestamps many times (crossing scans + root refine).
    // Keep a local altitude memo to avoid repeated snapshot computations.
    const memo = new Map();
    return (timestampMs) => {
      const key = Math.trunc(timestampMs);
      if (memo.has(key)) return memo.get(key);
      const value = sampleFn(key);
      memo.set(key, value);
      return value;
    };
  }

  function computeSunEventsCached(input, explicitCacheKey) {
    if (!input || !Number.isFinite(input.timestampUtcMs) || !Number.isFinite(input.latDeg) || !Number.isFinite(input.lonDeg)) {
      throw new Error("AstroEngine invalid input");
    }
    const cacheKey = explicitCacheKey || makeDayKey(input, true);
    if (sunEventsCache.has(cacheKey)) {
      stats.sunEventsHits += 1;
      const cached = sunEventsCache.get(cacheKey);
      return {
        ...cached,
        __meta: { fromCache: true }
      };
    }
    stats.sunEventsMisses += 1;
    const centerMs = Math.trunc(Number(input.timestampUtcMs));
    const eventHalfWindowMs = 18 * 3600000;
    const windowStartMs = centerMs - eventHalfWindowMs;
    const windowEndMs = centerMs + eventHalfWindowMs;
    const coarseStepMs = 5 * 60000;
    const sampleFn = createAltitudeSampler((ts) => sampleSunAltitude(input, ts));
    const peakBracketCenter = findPeakMs(sampleFn, windowStartMs, windowEndMs, coarseStepMs);
    const solarNoonMs = findExtremumMs(
      sampleFn,
      Math.max(windowStartMs, peakBracketCenter - coarseStepMs),
      Math.min(windowEndMs, peakBracketCenter + coarseStepMs),
      24,
      true
    );

    function solveDailyCrossing(targetAltDeg, side) {
      const crossings = findCrossings(
        sampleFn,
        solarNoonMs - eventHalfWindowMs,
        solarNoonMs + eventHalfWindowMs,
        coarseStepMs,
        targetAltDeg
      );
      if (!crossings.length) return null;
      const filtered = crossings.filter(([aMs, bMs]) => {
        const midpoint = 0.5 * (aMs + bMs);
        return side === "morning" ? midpoint <= solarNoonMs : midpoint >= solarNoonMs;
      });
      const bracket = side === "morning"
        ? filtered[filtered.length - 1]
        : filtered[0];
      if (!bracket) return null;
      return new Date(refineRootMs(sampleFn, bracket[0], bracket[1], targetAltDeg));
    }

    const sunriseSnapshot = computeSnapshot({
      ...input,
      timestampUtcMs: solarNoonMs
    }, { timeBucketMs: 1000, updatePolicy: "events-sun-threshold" });
    const sunriseTargetDeg = sunRiseSetTargetApparentAltitudeDeg(sunriseSnapshot);

    const out = {
      solarNoon: new Date(solarNoonMs),
      sunrise: solveDailyCrossing(sunriseTargetDeg, "morning"),
      sunset: solveDailyCrossing(sunriseTargetDeg, "evening"),
      dawn: solveDailyCrossing(-6, "morning"),
      dusk: solveDailyCrossing(-6, "evening"),
      __meta: {
        fromCache: false,
        sunriseTargetApparentAltitudeDeg: sunriseTargetDeg,
        dawnTargetApparentAltitudeDeg: -6
      }
    };
    lruSet(sunEventsCache, cacheKey, out, sunEventsCacheLimit);
    return out;
  }

  function computeMoonTimesCached(input, explicitCacheKey) {
    if (!input || !Number.isFinite(input.timestampUtcMs) || !Number.isFinite(input.latDeg) || !Number.isFinite(input.lonDeg)) {
      throw new Error("AstroEngine invalid input");
    }
    const cacheKey = explicitCacheKey || makeDayKey(input, false);
    if (moonTimesCache.has(cacheKey)) {
      stats.moonTimesHits += 1;
      const cached = moonTimesCache.get(cacheKey);
      return {
        ...cached,
        __meta: { fromCache: true }
      };
    }
    stats.moonTimesMisses += 1;
    const date = new Date(Number(input.timestampUtcMs));
    const dayStartUtcMs = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0);
    const dayEndUtcMs = dayStartUtcMs + 24 * 3600000;
    const sampleFn = createAltitudeSampler((ts) => sampleMoonAltitude(input, ts));
    const thresholdSnapshot = computeSnapshot({
      ...input,
      timestampUtcMs: dayStartUtcMs + 12 * 3600000
    }, { timeBucketMs: 1000, updatePolicy: "events-moon-threshold" });
    const targetAltDeg = moonRiseSetTargetApparentAltitudeDeg(thresholdSnapshot);
    const crossings = findCrossings(sampleFn, dayStartUtcMs, dayEndUtcMs, 3 * 60000, targetAltDeg);
    let riseMs = null;
    let setMs = null;
    for (let i = 0; i < crossings.length; i += 1) {
      const bracket = crossings[i];
      const aAlt = sampleFn(bracket[0]);
      const bAlt = sampleFn(bracket[1]);
      const rootMs = refineRootMs(sampleFn, bracket[0], bracket[1], targetAltDeg);
      if (!Number.isFinite(riseMs) && aAlt <= targetAltDeg && bAlt >= targetAltDeg) {
        riseMs = rootMs;
        continue;
      }
      if (!Number.isFinite(setMs) && aAlt >= targetAltDeg && bAlt <= targetAltDeg) {
        setMs = rootMs;
      }
    }
    const out = {
      rise: Number.isFinite(riseMs) ? new Date(riseMs) : null,
      set: Number.isFinite(setMs) ? new Date(setMs) : null,
      __meta: {
        fromCache: false,
        riseSetTargetApparentAltitudeDeg: targetAltDeg
      }
    };
    lruSet(moonTimesCache, cacheKey, out, moonTimesCacheLimit);
    return out;
  }

  function computeSunEvents(input) {
    return computeSunEventsCached(input);
  }

  function computeMoonTimes(input) {
    return computeMoonTimesCached(input);
  }

  function getCacheStats() {
    const snapshotTotal = stats.snapshotHits + stats.snapshotMisses;
    const sunTotal = stats.sunEventsHits + stats.sunEventsMisses;
    const moonTotal = stats.moonTimesHits + stats.moonTimesMisses;
    return {
      snapshotHits: stats.snapshotHits,
      snapshotMisses: stats.snapshotMisses,
      snapshotHitRate: snapshotTotal > 0 ? stats.snapshotHits / snapshotTotal : 0,
      sunEventsHits: stats.sunEventsHits,
      sunEventsMisses: stats.sunEventsMisses,
      sunEventsHitRate: sunTotal > 0 ? stats.sunEventsHits / sunTotal : 0,
      moonTimesHits: stats.moonTimesHits,
      moonTimesMisses: stats.moonTimesMisses,
      moonTimesHitRate: moonTotal > 0 ? stats.moonTimesHits / moonTotal : 0
    };
  }

  return {
    setVersion(nextVersion) {
      if (nextVersion) version = String(nextVersion);
    },
    setStarCatalog(nextCatalog) {
      starCatalog = normalizeStarCatalog(nextCatalog || []);
      cache.clear();
      sunEventsCache.clear();
      moonTimesCache.clear();
    },
    clearCache() {
      cache.clear();
      sunEventsCache.clear();
      moonTimesCache.clear();
    },
    getCacheStats,
    computeSunEventsCached,
    computeMoonTimesCached,
    makeDayKey,
    makeSnapshotCacheKey(input, options) {
      return makeKey(input, options);
    },
    computeSnapshot,
    computeSunEvents,
    computeMoonTimes
  };
}
