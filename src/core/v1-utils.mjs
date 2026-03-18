export function parseCoordinate(value, fallback, min, max) {
  const raw = typeof value === "string" ? value.replace(",", ".").trim() : value;
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return fallback;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

export function buildTimeLapseKeys(date, getParts) {
  const d = date instanceof Date ? date : new Date(date);
  const p = getParts(d);
  const dayKey = `${p.year}-${p.month}-${p.day}`;
  const minuteKey = `${dayKey}-${p.hour}-${p.minute}`;
  return { dayKey, minuteKey };
}

export async function safeJsonFetch(fetchFn, url, options) {
  try {
    const res = await fetchFn(url, options || {});
    if (!res || !res.ok) {
      return {
        ok: false,
        status: res ? res.status : 0,
        data: null,
        error: new Error(`HTTP_${res ? res.status : 0}`)
      };
    }
    const data = await res.json();
    return { ok: true, status: res.status, data, error: null };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}
