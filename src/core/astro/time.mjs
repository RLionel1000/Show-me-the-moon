const LEAP_SECONDS_UTC = [
  ["1972-01-01T00:00:00Z", 10],
  ["1972-07-01T00:00:00Z", 11],
  ["1973-01-01T00:00:00Z", 12],
  ["1974-01-01T00:00:00Z", 13],
  ["1975-01-01T00:00:00Z", 14],
  ["1976-01-01T00:00:00Z", 15],
  ["1977-01-01T00:00:00Z", 16],
  ["1978-01-01T00:00:00Z", 17],
  ["1979-01-01T00:00:00Z", 18],
  ["1980-01-01T00:00:00Z", 19],
  ["1981-07-01T00:00:00Z", 20],
  ["1982-07-01T00:00:00Z", 21],
  ["1983-07-01T00:00:00Z", 22],
  ["1985-07-01T00:00:00Z", 23],
  ["1988-01-01T00:00:00Z", 24],
  ["1990-01-01T00:00:00Z", 25],
  ["1991-01-01T00:00:00Z", 26],
  ["1992-07-01T00:00:00Z", 27],
  ["1993-07-01T00:00:00Z", 28],
  ["1994-07-01T00:00:00Z", 29],
  ["1996-01-01T00:00:00Z", 30],
  ["1997-07-01T00:00:00Z", 31],
  ["1999-01-01T00:00:00Z", 32],
  ["2006-01-01T00:00:00Z", 33],
  ["2009-01-01T00:00:00Z", 34],
  ["2012-07-01T00:00:00Z", 35],
  ["2015-07-01T00:00:00Z", 36],
  ["2017-01-01T00:00:00Z", 37]
].map((row) => ({ utcMs: Date.parse(row[0]), taiMinusUtc: row[1] }));

export function jdFromUnixMs(unixMs) {
  return unixMs / 86400000 + 2440587.5;
}

export function julianCenturiesFromJ2000(jd) {
  return (jd - 2451545.0) / 36525;
}

export function getTaiMinusUtcSeconds(utcMs) {
  let value = LEAP_SECONDS_UTC[0].taiMinusUtc;
  for (let i = 0; i < LEAP_SECONDS_UTC.length; i += 1) {
    if (utcMs >= LEAP_SECONDS_UTC[i].utcMs) value = LEAP_SECONDS_UTC[i].taiMinusUtc;
    else break;
  }
  return value;
}

export function approximateDeltaTSeconds(jdUtc) {
  const y = 2000 + (jdUtc - 2451545.0) / 365.2425;
  if (y < 2005) {
    const t = y - 2000;
    return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t * t * t;
  }
  if (y <= 2050) {
    const t = y - 2000;
    return 62.92 + 0.32217 * t + 0.005589 * t * t;
  }
  const u = (y - 1820) / 100;
  return -20 + 32 * u * u;
}

export function buildTimeContext(timestampUtcMs) {
  const jdUtc = jdFromUnixMs(timestampUtcMs);
  const taiMinusUtcSeconds = getTaiMinusUtcSeconds(timestampUtcMs);
  const ttMinusUtcSeconds = taiMinusUtcSeconds + 32.184;
  const jdTt = jdFromUnixMs(timestampUtcMs + ttMinusUtcSeconds * 1000);
  const jcTt = julianCenturiesFromJ2000(jdTt);
  const deltaTSeconds = approximateDeltaTSeconds(jdUtc);
  return {
    timestampUtcMs,
    jdUtc,
    jdTt,
    jcTt,
    taiMinusUtcSeconds,
    ttMinusUtcSeconds,
    deltaTSeconds
  };
}
