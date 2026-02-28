import { useState, useCallback, useEffect, useRef } from "react";
import { ApiError } from "@/lib/api-client";

interface UseApiQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for declarative data fetching with loading/error state.
 *
 * @param fetcher - An async function that returns data (typically from api-client).
 * @param deps - Dependency array that triggers a refetch when values change.
 *
 * @example
 * const { data: flats, loading, refetch } = useApiQuery(apiGetFlats);
 * const { data: payments } = useApiQuery(() => apiGetPayments({ monthId }), [monthId]);
 */
export function useApiQuery<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
): UseApiQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (mountedRef.current) {
        setData(result);
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof ApiError ? e.message : "Failed to load data");
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
