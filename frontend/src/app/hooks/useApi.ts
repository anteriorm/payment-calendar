/**
 * useApi — универсальный хук для загрузки данных через api/.
 * Заменяет шаблонный useState+useEffect в каждом компоненте.
 *
 * Использование:
 *   const { data, loading, error, refetch } = useApi(
 *     () => api.payments.getAll({ status: 'draft' }),
 *     [],          // начальное значение
 *     [statusF],   // deps — когда перезапрашивать
 *   );
 */

import { useState, useEffect, useCallback } from "react";

export function useApi<T>(
  fetcher:  () => Promise<T>,
  initial:  T,
  deps:     unknown[] = [],
) {
  const [data,    setData]    = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })
          .response?.data?.message ?? "Не удалось загрузить данные";
      setError(msg);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { load(); }, [load]);

  return { data, setData, loading, error, refetch: load };
}
