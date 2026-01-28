
import { useCallback, useRef } from 'react';

/**
 * A hook that returns a throttled version of the passed function.
 * The function is executed immediately on the first call, then blocked for `wait` milliseconds.
 * 
 * @param fn The function to throttle
 * @param wait The wait period in milliseconds (default 1000ms)
 * @returns A throttled function
 */
export function useThrottleFn<T extends (...args: any[]) => any>(
  fn: T,
  wait: number = 1000
): (...args: Parameters<T>) => void {
  const lastRun = useRef(0);
  const fnRef = useRef(fn);

  // Always keep ref updated with the latest function to access fresh state/props
  fnRef.current = fn;

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastRun.current >= wait) {
      fnRef.current(...args);
      lastRun.current = now;
    }
  }, [wait]);
}
