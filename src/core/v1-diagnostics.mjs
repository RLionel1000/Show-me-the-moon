function round2(value) {
  return Math.round(value * 100) / 100;
}

export function createV1Diagnostics(config) {
  const cfg = Object.assign(
    {
      mobileMinFps: 24,
      mobileTargetFps: 30,
      sampleWindow: 180
    },
    config || {}
  );

  const samples = [];
  const state = {
    frameCount: 0,
    avgFps: 0,
    minFps: Number.POSITIVE_INFINITY,
    maxFps: 0,
    lowFpsStrike: 0,
    fetch: {
      total: 0,
      failed: 0,
      bySource: {}
    },
    fallback: {},
    activeTemplateMode: "core",
    lang: "fr",
    lowEndMode: false,
    astro: {
      computeTotal: 0,
      computeCount: 0,
      avgComputeMs: 0,
      qualityFlagCount: 0,
      lastQualityFlags: [],
      engineVersion: "unknown",
      framePolicy: "full",
      snapshotCacheHits: 0,
      snapshotCacheMisses: 0,
      sunEventsCacheHits: 0,
      sunEventsCacheMisses: 0,
      moonTimesCacheHits: 0,
      moonTimesCacheMisses: 0
    }
  };

  function pushFps(fps) {
    samples.push(fps);
    if (samples.length > cfg.sampleWindow) samples.shift();
    const total = samples.reduce((acc, v) => acc + v, 0);
    state.avgFps = samples.length ? total / samples.length : 0;
  }

  return {
    config: cfg,
    recordFrame(fps) {
      if (!Number.isFinite(fps) || fps <= 0) return;
      state.frameCount += 1;
      state.minFps = Math.min(state.minFps, fps);
      state.maxFps = Math.max(state.maxFps, fps);
      pushFps(fps);
      if (fps < cfg.mobileMinFps) state.lowFpsStrike += 1;
      else state.lowFpsStrike = Math.max(0, state.lowFpsStrike - 1);
    },
    recordFetch(source, ok) {
      const key = source || "unknown";
      if (!state.fetch.bySource[key]) {
        state.fetch.bySource[key] = { total: 0, failed: 0 };
      }
      state.fetch.total += 1;
      state.fetch.bySource[key].total += 1;
      if (!ok) {
        state.fetch.failed += 1;
        state.fetch.bySource[key].failed += 1;
      }
    },
    markFallback(name, active) {
      state.fallback[name] = !!active;
    },
    setTemplateMode(mode) {
      state.activeTemplateMode = mode === "islamic" ? "islamic" : "core";
    },
    setLang(lang) {
      if (lang) state.lang = String(lang).toLowerCase();
    },
    setLowEndMode(enabled) {
      state.lowEndMode = !!enabled;
    },
    recordAstroCompute(durationMs) {
      if (!Number.isFinite(durationMs) || durationMs < 0) return;
      state.astro.computeTotal += durationMs;
      state.astro.computeCount += 1;
      state.astro.avgComputeMs = state.astro.computeTotal / state.astro.computeCount;
    },
    recordAstroQualityFlags(flags) {
      const list = Array.isArray(flags) ? flags.filter(Boolean).map((v) => String(v)) : [];
      state.astro.lastQualityFlags = list;
      if (list.length) state.astro.qualityFlagCount += list.length;
    },
    setAstroEngineVersion(version) {
      if (version) state.astro.engineVersion = String(version);
    },
    setAstroFramePolicy(policy) {
      if (policy) state.astro.framePolicy = String(policy);
    },
    recordAstroCache(kind, hit) {
      const ok = !!hit;
      if (kind === "snapshot") {
        if (ok) state.astro.snapshotCacheHits += 1;
        else state.astro.snapshotCacheMisses += 1;
        return;
      }
      if (kind === "sunEvents") {
        if (ok) state.astro.sunEventsCacheHits += 1;
        else state.astro.sunEventsCacheMisses += 1;
        return;
      }
      if (kind === "moonTimes") {
        if (ok) state.astro.moonTimesCacheHits += 1;
        else state.astro.moonTimesCacheMisses += 1;
      }
    },
    shouldEnableLowEndMode() {
      return state.lowFpsStrike >= 120 && state.avgFps > 0 && state.avgFps < cfg.mobileTargetFps;
    },
    shouldDisableLowEndMode() {
      return state.lowFpsStrike === 0 && state.avgFps >= cfg.mobileTargetFps + 3;
    },
    snapshot() {
      return {
        perfBudget: Object.assign({}, cfg),
        frameCount: state.frameCount,
        avgFps: round2(state.avgFps),
        minFps: Number.isFinite(state.minFps) ? round2(state.minFps) : 0,
        maxFps: round2(state.maxFps),
        lowFpsStrike: state.lowFpsStrike,
        lowEndMode: state.lowEndMode,
        activeTemplateMode: state.activeTemplateMode,
        lang: state.lang,
        fetch: {
          total: state.fetch.total,
          failed: state.fetch.failed,
          bySource: JSON.parse(JSON.stringify(state.fetch.bySource))
        },
        fallback: Object.assign({}, state.fallback),
        astro: {
          avgComputeMs: round2(state.astro.avgComputeMs),
          computeCount: state.astro.computeCount,
          qualityFlagCount: state.astro.qualityFlagCount,
          lastQualityFlags: state.astro.lastQualityFlags.slice(),
          engineVersion: state.astro.engineVersion,
          framePolicy: state.astro.framePolicy,
          cacheHitRate: (state.astro.snapshotCacheHits + state.astro.snapshotCacheMisses) > 0
            ? round2((state.astro.snapshotCacheHits / (state.astro.snapshotCacheHits + state.astro.snapshotCacheMisses)) * 100) / 100
            : 0,
          sunEventsCacheHitRate: (state.astro.sunEventsCacheHits + state.astro.sunEventsCacheMisses) > 0
            ? round2((state.astro.sunEventsCacheHits / (state.astro.sunEventsCacheHits + state.astro.sunEventsCacheMisses)) * 100) / 100
            : 0,
          moonTimesCacheHitRate: (state.astro.moonTimesCacheHits + state.astro.moonTimesCacheMisses) > 0
            ? round2((state.astro.moonTimesCacheHits / (state.astro.moonTimesCacheHits + state.astro.moonTimesCacheMisses)) * 100) / 100
            : 0
        }
      };
    }
  };
}
