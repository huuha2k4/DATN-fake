import { useEffect, useRef } from 'react';
import { subscribeMobileQueryRevalidated } from './mobileQueryCache';

export function useMobileQueryRevalidation(
  prefixes: string | string[],
  onRevalidate: () => void
): void {
  const callbackRef = useRef(onRevalidate);
  callbackRef.current = onRevalidate;
  const prefixKey = Array.isArray(prefixes) ? prefixes.join('|') : prefixes;

  useEffect(() => {
    const list = prefixKey ? prefixKey.split('|') : [];
    return subscribeMobileQueryRevalidated(list, () => {
      callbackRef.current();
    });
  }, [prefixKey]);
}
