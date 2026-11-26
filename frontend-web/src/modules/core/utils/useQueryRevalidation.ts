import { useEffect, useRef } from 'react';
import { subscribeQueryRevalidated } from './queryCache';

/**
 * Re-runs `onRevalidate` when any cached query matching `prefixes` finishes
 * background SWR revalidation, using a ref to avoid subscription churn or loops.
 */
export function useQueryRevalidation(
  prefixes: string | string[],
  onRevalidate: () => void
): void {
  const callbackRef = useRef(onRevalidate);
  callbackRef.current = onRevalidate;
  const prefixKey = Array.isArray(prefixes) ? prefixes.join('|') : prefixes;

  useEffect(() => {
    const list = prefixKey ? prefixKey.split('|') : [];
    return subscribeQueryRevalidated(list, () => {
      callbackRef.current();
    });
  }, [prefixKey]);
}
