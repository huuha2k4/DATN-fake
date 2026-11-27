import { useCallback, useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import type { AdminPage, AdminPageParams } from '../api/adminApi';

export function adminError(error: unknown, message = 'Không thể tải dữ liệu. Vui lòng thử lại.'): string {
  return isAxiosError<{ message?: string }>(error)
    ? error.response?.data?.message ?? message
    : message;
}

export function useAdminPage<T, P extends AdminPageParams>(
  fetchPage: (params: P, signal?: AbortSignal) => Promise<AdminPage<T>>,
  options: Omit<P, 'page' | 'search'>,
  enabled = true,
) {
  const [query, setQuery] = useState({ page: 0, search: '' });
  const [search, setSearch] = useState('');
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: AdminPage<T>; error?: string; status?: number }>();
  const settledKey = useRef<string | undefined>(undefined);
  const lastData = useRef<AdminPage<T> | undefined>(undefined);
  const setPage = useCallback((page: number) => setQuery(q => ({ ...q, page })), []);
  const reload = useCallback(() => setRevision(v => v + 1), []);
  const key = JSON.stringify({ ...options, ...query, revision });

  useEffect(() => {
    if (search.trim() === query.search) return;
    const timer = window.setTimeout(() => setQuery({ page: 0, search: search.trim() }), 300);
    return () => window.clearTimeout(timer);
  }, [search, query.search]);

  useEffect(() => {
    if (!enabled || settledKey.current === key) return;
    const controller = new AbortController();
    const params: P & { revision?: number } = JSON.parse(key);
    delete params.revision;
    // Waiting a microtask lets React dispose the first StrictMode effect before sending it.
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      void fetchPage(params, controller.signal).then(data => {
        if (controller.signal.aborted) return;
        const lastPage = Math.max(0, data.totalPages - 1);
        if (data.number > lastPage) {
          setPage(lastPage);
          return;
        }
        settledKey.current = key;
        lastData.current = data;
        setResult({ key, data });
      }).catch((error: unknown) => {
        if (!controller.signal.aborted) {
          settledKey.current = key;
          setResult({ key, error: adminError(error), data: lastData.current,
            status: isAxiosError(error) ? error.response?.status : undefined });
        }
      });
    });
    return () => controller.abort();
  }, [enabled, fetchPage, key, setPage]);

  return {
    data: result?.data,
    loading: enabled && result?.key !== key,
    error: result?.key === key ? result.error : undefined,
    errorStatus: result?.key === key ? result.status : undefined,
    page: query.page,
    setPage,
    search,
    setSearch,
    reload,
  };
}

export function useAdminIdempotency() {
  const pending = useRef<{ payload: string; id: string } | null>(null);
  const get = (payload: unknown) => {
    const serialized = JSON.stringify(payload);
    if (pending.current?.payload !== serialized) pending.current = { payload: serialized, id: newRequestId() };
    return pending.current.id;
  };
  return { get, clear: () => { pending.current = null; } };
}

function newRequestId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}
