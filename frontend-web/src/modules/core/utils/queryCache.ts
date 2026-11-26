type CacheEntry<T> = {
  data: T;
  fetchedAt: number;
};

type FetchOptions = {
  /** Time in ms during which cached data is served immediately without background refetch. */
  freshTimeMs?: number;
  /** Time in ms during which stale cached data can still be served while revalidating in background. */
  staleTimeMs?: number;
  /** Bypass cache read and force a fresh network request. */
  forceRefresh?: boolean;
};

type RevalidationSubscriber = {
  prefixes: string[];
  listener: (logicalKey: string) => void;
};

const MAX_CACHE_ENTRIES = 120;
const cacheStore = new Map<string, CacheEntry<unknown>>();
const inFlightStore = new Map<string, Promise<unknown>>();
const keyEpochStore = new Map<string, number>();
const subscribers = new Set<RevalidationSubscriber>();
let clearEpoch = 0;

function getCurrentUserScope(): string {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return 'anon';
    const parsed = JSON.parse(raw);
    return parsed?.id ? String(parsed.id) : 'anon';
  } catch {
    return 'anon';
  }
}

export function buildScopedKey(key: string): string {
  return `${getCurrentUserScope()}::${key}`;
}

export function stableSerializeParams(params?: Record<string, unknown>): string {
  if (!params) return '';
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(entries);
}

function getKeyEpoch(scopedKey: string): number {
  return keyEpochStore.get(scopedKey) ?? 0;
}

function setBoundedCache<T>(scopedKey: string, data: T): void {
  if (cacheStore.has(scopedKey)) {
    cacheStore.delete(scopedKey);
  } else if (cacheStore.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cacheStore.keys().next().value;
    if (oldestKey !== undefined) {
      cacheStore.delete(oldestKey);
    }
  }
  cacheStore.set(scopedKey, { data, fetchedAt: Date.now() });
}

function notifyRevalidated(scopedKey: string): void {
  const scopePrefix = `${getCurrentUserScope()}::`;
  if (!scopedKey.startsWith(scopePrefix)) return;
  const logicalKey = scopedKey.slice(scopePrefix.length);
  for (const sub of subscribers) {
    if (sub.prefixes.some((prefix) => logicalKey.startsWith(prefix))) {
      try {
        sub.listener(logicalKey);
      } catch {
        // Ignore subscriber UI errors
      }
    }
  }
}

/**
 * Subscribe to background SWR revalidation completions for any matching logical key prefix.
 * Mounted React components use this to refresh their state without flashing loading spinners.
 */
export function subscribeQueryRevalidated(
  prefixes: string | string[],
  listener: (logicalKey: string) => void
): () => void {
  const sub: RevalidationSubscriber = {
    prefixes: Array.isArray(prefixes) ? prefixes : [prefixes],
    listener,
  };
  subscribers.add(sub);
  return () => {
    subscribers.delete(sub);
  };
}

/**
 * Fetches data with user-scoped in-memory caching, in-flight request deduplication,
 * epoch-guarded race protection, and stale-while-revalidate background refresh.
 */
export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: FetchOptions = {}
): Promise<T> {
  const {
    freshTimeMs = 15_000,
    staleTimeMs = 60_000,
    forceRefresh = false,
  } = options;

  const scopedKey = buildScopedKey(key);
  const now = Date.now();
  const cached = !forceRefresh ? (cacheStore.get(scopedKey) as CacheEntry<T> | undefined) : undefined;

  if (cached) {
    const age = now - cached.fetchedAt;
    if (age <= freshTimeMs) {
      return cached.data;
    }
    if (age <= staleTimeMs) {
      if (!inFlightStore.has(scopedKey)) {
        const startClearEpoch = clearEpoch;
        const startKeyEpoch = getKeyEpoch(scopedKey);
        const bgPromise = fetcher()
          .then((freshData) => {
            if (clearEpoch === startClearEpoch && getKeyEpoch(scopedKey) === startKeyEpoch) {
              setBoundedCache(scopedKey, freshData);
              notifyRevalidated(scopedKey);
            }
            return freshData;
          })
          .catch(() => cached.data)
          .finally(() => {
            if (inFlightStore.get(scopedKey) === bgPromise) {
              inFlightStore.delete(scopedKey);
            }
          });
        inFlightStore.set(scopedKey, bgPromise);
      }
      return cached.data;
    }
  }

  const existingInFlight = inFlightStore.get(scopedKey) as Promise<T> | undefined;
  if (existingInFlight && !forceRefresh) {
    return existingInFlight;
  }

  const startClearEpoch = clearEpoch;
  const startKeyEpoch = getKeyEpoch(scopedKey);
  const networkPromise = fetcher()
    .then((data) => {
      if (clearEpoch === startClearEpoch && getKeyEpoch(scopedKey) === startKeyEpoch) {
        setBoundedCache(scopedKey, data);
      }
      return data;
    })
    .finally(() => {
      if (inFlightStore.get(scopedKey) === networkPromise) {
        inFlightStore.delete(scopedKey);
      }
    });

  inFlightStore.set(scopedKey, networkPromise);
  return networkPromise;
}

/**
 * Invalidates cached entries matching any of the given logical key prefixes for the current user,
 * and bumps their key epoch so any older in-flight GET cannot write stale data back into cache.
 */
export function invalidateQueryCache(prefixes: string | string[]): void {
  const list = Array.isArray(prefixes) ? prefixes : [prefixes];
  const scopePrefix = `${getCurrentUserScope()}::`;

  for (const key of Array.from(cacheStore.keys())) {
    if (!key.startsWith(scopePrefix)) continue;
    const logicalKey = key.slice(scopePrefix.length);
    if (list.some((prefix) => logicalKey.startsWith(prefix))) {
      cacheStore.delete(key);
      keyEpochStore.set(key, getKeyEpoch(key) + 1);
    }
  }

  for (const key of Array.from(inFlightStore.keys())) {
    if (!key.startsWith(scopePrefix)) continue;
    const logicalKey = key.slice(scopePrefix.length);
    if (list.some((prefix) => logicalKey.startsWith(prefix))) {
      keyEpochStore.set(key, getKeyEpoch(key) + 1);
      inFlightStore.delete(key);
    }
  }
}

/**
 * Clears all cached queries and bumps global epoch (must be called on logout / user switch)
 * so stale in-flight requests from the previous session cannot repopulate the cache.
 */
export function clearQueryCache(): void {
  clearEpoch += 1;
  cacheStore.clear();
  inFlightStore.clear();
  keyEpochStore.clear();
}
