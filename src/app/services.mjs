export function createAppServices(options) {
  const opts = options || {};
  const fetchFn = opts.fetchFn || fetch;
  const safeJsonFetch = opts.safeJsonFetch;
  const diagnostics = opts.diagnostics || null;
  const documentRef = opts.documentRef || document;
  const localStorageRef = opts.localStorageRef || localStorage;

  function reportFetch(source, ok) {
    if (diagnostics && typeof diagnostics.recordFetch === "function") {
      diagnostics.recordFetch(source, !!ok);
    }
  }

  async function fetchJsonTracked(url, requestOptions, source) {
    const result = await safeJsonFetch(fetchFn, url, requestOptions || {});
    reportFetch(source, result.ok);
    return result;
  }

  function setCookie(name, value, days) {
    const duration = Number.isFinite(days) ? Number(days) : 365;
    const expires = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
    documentRef.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  }

  function getCookie(name) {
    const prefix = `${name}=`;
    const parts = String(documentRef.cookie || "").split(";");
    for (let i = 0; i < parts.length; i += 1) {
      const candidate = parts[i].trim();
      if (candidate.startsWith(prefix)) return decodeURIComponent(candidate.slice(prefix.length));
    }
    return null;
  }

  function getStorageItem(key, fallback = null) {
    try {
      const value = localStorageRef.getItem(key);
      return value == null ? fallback : value;
    } catch {
      return fallback;
    }
  }

  function setStorageItem(key, value) {
    try {
      localStorageRef.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  function getJsonStorage(key, fallback) {
    const raw = getStorageItem(key, null);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function setJsonStorage(key, value) {
    return setStorageItem(key, JSON.stringify(value));
  }

  return {
    reportFetch,
    fetchJsonTracked,
    setCookie,
    getCookie,
    getStorageItem,
    setStorageItem,
    getJsonStorage,
    setJsonStorage
  };
}
