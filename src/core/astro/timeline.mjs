import { createAstroEngine } from "./engine.mjs";
import { degToRad, normalizeDegrees } from "./frames.mjs";

function clamp01(value) {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function lerp(a, b, alpha) {
  return a + (b - a) * alpha;
}

function lerpAngleDeg(a, b, alpha) {
  const delta = ((b - a + 540) % 360) - 180;
  return normalizeDegrees(a + delta * alpha);
}

function lerpAngleRad(a, b, alpha) {
  const twoPi = Math.PI * 2;
  let delta = (b - a) % twoPi;
  if (delta > Math.PI) delta -= twoPi;
  if (delta < -Math.PI) delta += twoPi;
  let value = a + delta * alpha;
  value %= twoPi;
  if (value < 0) value += twoPi;
  return value;
}

function lerpNullable(a, b, alpha) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return lerp(a, b, alpha);
}

function copyDistance(distance) {
  if (!distance || typeof distance !== "object") return distance || null;
  return { ...distance };
}

function interpolateDistance(left, right, alpha) {
  if (!left || !right || typeof left !== "object" || typeof right !== "object") {
    return copyDistance(left || right);
  }
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  const out = {};
  for (const key of keys) {
    const value = lerpNullable(left[key], right[key], alpha);
    out[key] = value == null ? (left[key] ?? right[key] ?? null) : value;
  }
  return out;
}

function interpolateBody(left, right, alpha) {
  if (!left || !right) return left || right || null;
  return {
    ...left,
    ...right,
    id: left.id || right.id,
    raDeg: lerpAngleDeg(left.raDeg, right.raDeg, alpha),
    decDeg: lerp(left.decDeg, right.decDeg, alpha),
    altitudeDegTrue: lerp(left.altitudeDegTrue, right.altitudeDegTrue, alpha),
    altitudeDegApparent: lerp(left.altitudeDegApparent, right.altitudeDegApparent, alpha),
    altitudeRadApparent: lerp(left.altitudeRadApparent, right.altitudeRadApparent, alpha),
    azimuthDegTrueNorth: lerpAngleDeg(left.azimuthDegTrueNorth, right.azimuthDegTrueNorth, alpha),
    azimuthRad: lerpAngleRad(left.azimuthRad, right.azimuthRad, alpha),
    distance: interpolateDistance(left.distance, right.distance, alpha),
    illuminationFraction: lerpNullable(left.illuminationFraction, right.illuminationFraction, alpha),
    phase: lerpNullable(left.phase, right.phase, alpha),
    parallacticAngleRad: Number.isFinite(left.parallacticAngleRad) && Number.isFinite(right.parallacticAngleRad)
      ? lerpAngleRad(left.parallacticAngleRad, right.parallacticAngleRad, alpha)
      : (left.parallacticAngleRad ?? right.parallacticAngleRad ?? null)
  };
}

function buildBodyMap(bodies) {
  const map = new Map();
  for (const body of bodies || []) {
    if (body && body.id) map.set(body.id, body);
  }
  return map;
}

function interpolateBodyArray(leftBodies, rightBodies, alpha) {
  const leftMap = buildBodyMap(leftBodies);
  const rightMap = buildBodyMap(rightBodies);
  const ids = [];
  for (const body of leftBodies || []) {
    if (body && body.id) ids.push(body.id);
  }
  for (const body of rightBodies || []) {
    if (body && body.id && !leftMap.has(body.id)) ids.push(body.id);
  }
  return ids
    .map((id) => interpolateBody(leftMap.get(id), rightMap.get(id), alpha))
    .filter(Boolean);
}

function snapshotBodyIds(snapshot) {
  const ids = [];
  if (snapshot && snapshot.sun && snapshot.sun.id) ids.push(snapshot.sun.id);
  if (snapshot && snapshot.moon && snapshot.moon.id) ids.push(snapshot.moon.id);
  for (const body of snapshot && snapshot.planets ? snapshot.planets : []) {
    if (body && body.id) ids.push(String(body.id).toLowerCase());
  }
  for (const body of snapshot && snapshot.stars ? snapshot.stars : []) {
    if (body && body.id) ids.push(String(body.id).toLowerCase());
  }
  return ids;
}

function buildResampleAdvice(trackedBodies, options) {
  const ids = (trackedBodies || []).map((value) => String(value).toLowerCase());
  const hasMoon = ids.includes("moon");
  const hasPlanet = ids.some((value) => value !== "sun" && value !== "moon" && value !== "star" && value !== "stars");
  const hasOnlySun = ids.length > 0 && ids.every((value) => value === "sun");
  const preferredSampleStepMs = hasMoon ? 30 * 1000 : hasPlanet ? 2 * 60 * 1000 : hasOnlySun ? 5 * 60 * 1000 : 60 * 1000;
  const maxSafeGapMs = hasMoon ? 90 * 1000 : hasPlanet ? 5 * 60 * 1000 : 15 * 60 * 1000;
  const resampleLeadMs = Math.max(preferredSampleStepMs * 2, hasMoon ? 2 * 60 * 1000 : 5 * 60 * 1000);
  return {
    mode: "hybrid-keyframe",
    trackedBodies: ids,
    preferredSampleStepMs: Number.isFinite(options && options.sampleStepMs)
      ? Math.max(1000, Math.trunc(options.sampleStepMs))
      : preferredSampleStepMs,
    maxSafeGapMs: Number.isFinite(options && options.maxSafeGapMs)
      ? Math.max(1000, Math.trunc(options.maxSafeGapMs))
      : maxSafeGapMs,
    resampleLeadMs: Number.isFinite(options && options.resampleLeadMs)
      ? Math.max(1000, Math.trunc(options.resampleLeadMs))
      : resampleLeadMs
  };
}

function normalizeSampleOptions(input, options) {
  const trackedBodies = Array.isArray(options && options.trackedBodies) && options.trackedBodies.length
    ? options.trackedBodies
    : snapshotBodyIds(input.initialSnapshot || {});
  const advice = buildResampleAdvice(trackedBodies, options);
  const sampleStepMs = advice.preferredSampleStepMs;
  const windowMs = Number.isFinite(options && options.windowMs)
    ? Math.max(sampleStepMs, Math.trunc(options.windowMs))
    : Math.max(sampleStepMs * 10, 10 * 60 * 1000);
  return {
    trackedBodies,
    advice,
    sampleStepMs,
    windowMs
  };
}

function interpolateSnapshot(left, right, alpha, advice) {
  const normalizedAlpha = clamp01(alpha);
  const sun = interpolateBody(left.sun, right.sun, normalizedAlpha);
  const moon = interpolateBody(left.moon, right.moon, normalizedAlpha);
  const planets = interpolateBodyArray(left.planets, right.planets, normalizedAlpha);
  const stars = interpolateBodyArray(left.stars, right.stars, normalizedAlpha);
  return {
    sun,
    moon,
    planets,
    stars,
    meta: {
      ...left.meta,
      ...right.meta,
      interpolation: {
        alpha: normalizedAlpha,
        fromTimestampUtcMs: left.meta && left.meta.timestampUtcMs,
        toTimestampUtcMs: right.meta && right.meta.timestampUtcMs,
        mode: "hybrid-keyframe"
      },
      fromCache: false,
      updatePolicy: "timeline-interpolated",
      timelineResampleAdvice: advice
    }
  };
}

export function createAstroTimelineEngine(options = {}) {
  const astroEngine = options.astroEngine || createAstroEngine(options.astroOptions || options);

  function sampleKeyframes(input, optionsOverride) {
    if (!input || !Number.isFinite(input.timestampUtcMs)) {
      throw new Error("AstroTimelineEngine invalid input");
    }
    const normalized = normalizeSampleOptions(input, optionsOverride);
    const keyframes = [];
    const startMs = Number(input.timestampUtcMs);
    const endMs = startMs + normalized.windowMs;

    for (let timestampUtcMs = startMs; timestampUtcMs <= endMs; timestampUtcMs += normalized.sampleStepMs) {
      const snapshot = astroEngine.computeSnapshot(
        { ...input, timestampUtcMs },
        {
          timeBucketMs: normalized.sampleStepMs,
          updatePolicy: "timeline-keyframe"
        }
      );
      keyframes.push({
        ...snapshot,
        meta: {
          ...snapshot.meta,
          timestampUtcMs,
          timelineResampleAdvice: normalized.advice
        }
      });
    }

    const lastTimestampUtcMs = keyframes[keyframes.length - 1].meta.timestampUtcMs;
    if (lastTimestampUtcMs < endMs) {
      const snapshot = astroEngine.computeSnapshot(
        { ...input, timestampUtcMs: endMs },
        {
          timeBucketMs: normalized.sampleStepMs,
          updatePolicy: "timeline-keyframe"
        }
      );
      keyframes.push({
        ...snapshot,
        meta: {
          ...snapshot.meta,
          timestampUtcMs: endMs,
          timelineResampleAdvice: normalized.advice
        }
      });
    }

    return {
      startTimestampUtcMs: startMs,
      endTimestampUtcMs: endMs,
      sampleStepMs: normalized.sampleStepMs,
      trackedBodies: normalized.trackedBodies.map((value) => String(value).toLowerCase()),
      resampleAdvice: normalized.advice,
      observer: {
        latDeg: Number(input.latDeg),
        lonDeg: Number(input.lonDeg),
        pressurehPa: Number.isFinite(input.pressurehPa) ? Number(input.pressurehPa) : null,
        temperatureC: Number.isFinite(input.temperatureC) ? Number(input.temperatureC) : null
      },
      keyframes
    };
  }

  function evaluate(buffer, timestampUtcMs) {
    if (!buffer || !Array.isArray(buffer.keyframes) || buffer.keyframes.length < 2) {
      throw new Error("AstroTimelineEngine requires at least two keyframes.");
    }
    const targetTs = Number(timestampUtcMs);
    const frames = buffer.keyframes;
    const advice = buffer.resampleAdvice || buildResampleAdvice(buffer.trackedBodies, {});
    const startEdge = frames[0].meta.timestampUtcMs;
    const endEdge = frames[frames.length - 1].meta.timestampUtcMs;

    if (targetTs <= startEdge) {
      return {
        state: frames[0],
        needsResample: targetTs < startEdge,
        reason: targetTs < startEdge ? "before-buffer" : "buffer-start"
      };
    }

    if (targetTs >= endEdge) {
      return {
        state: frames[frames.length - 1],
        needsResample: true,
        reason: targetTs > endEdge ? "after-buffer" : "buffer-end"
      };
    }

    for (let index = 0; index < frames.length - 1; index += 1) {
      const left = frames[index];
      const right = frames[index + 1];
      const leftTs = left.meta.timestampUtcMs;
      const rightTs = right.meta.timestampUtcMs;
      if (targetTs < leftTs || targetTs > rightTs) continue;
      const gapMs = rightTs - leftTs;
      const alpha = gapMs <= 0 ? 0 : (targetTs - leftTs) / gapMs;
      const state = interpolateSnapshot(left, right, alpha, advice);
      const remainingMs = endEdge - targetTs;
      const needsResample = gapMs > advice.maxSafeGapMs || remainingMs <= advice.resampleLeadMs;
      return {
        state,
        needsResample,
        reason: gapMs > advice.maxSafeGapMs ? "gap-too-large" : remainingMs <= advice.resampleLeadMs ? "near-buffer-end" : "within-buffer"
      };
    }

    return {
      state: frames[frames.length - 1],
      needsResample: true,
      reason: "missing-segment"
    };
  }

  function computeState(input, optionsOverride) {
    const buffer = sampleKeyframes(input, optionsOverride);
    return evaluate(buffer, input.timestampUtcMs);
  }

  return {
    astroEngine,
    sampleKeyframes,
    evaluate,
    computeState,
    computeSnapshot(input, optionsOverride) {
      return astroEngine.computeSnapshot(input, optionsOverride);
    },
    computeSunEvents(input) {
      return astroEngine.computeSunEvents(input);
    },
    computeMoonTimes(input) {
      return astroEngine.computeMoonTimes(input);
    }
  };
}

export function snapshotToBodyList(snapshot) {
  const bodies = [];
  if (snapshot && snapshot.sun) bodies.push(snapshot.sun);
  if (snapshot && snapshot.moon) bodies.push(snapshot.moon);
  for (const body of snapshot && snapshot.planets ? snapshot.planets : []) bodies.push(body);
  for (const body of snapshot && snapshot.stars ? snapshot.stars : []) bodies.push(body);
  return bodies;
}

export function bodyAltitudeRad(body) {
  if (!body) return null;
  if (Number.isFinite(body.altitudeRadApparent)) return body.altitudeRadApparent;
  if (Number.isFinite(body.altitudeDegApparent)) return degToRad(body.altitudeDegApparent);
  return null;
}
