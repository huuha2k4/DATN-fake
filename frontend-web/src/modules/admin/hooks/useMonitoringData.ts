import { useEffect, useState } from 'react';

export function useMonitoringData<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ load: typeof load; revision: number; value?: T; error?: string }>();
  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      void load(controller.signal).then(value => {
        if (!controller.signal.aborted) setResult({ load, revision, value });
      }).catch(() => {
        if (!controller.signal.aborted) setResult(previous => ({ load, revision, value: previous?.value,
          error: 'Không thể tải dữ liệu. Vui lòng thử lại.' }));
      });
    });
    return () => controller.abort();
  }, [load, revision]);
  return { value: result?.value, error: result?.error, loading: result?.load !== load || result.revision !== revision,
    reload: () => setRevision(n => n + 1) };
}
