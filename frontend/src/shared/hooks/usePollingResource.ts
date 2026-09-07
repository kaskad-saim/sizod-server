import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { resolveLoadErrorText } from '@shared/api/errorUtils.ts';

const DEFAULT_POLL_INTERVAL_MS = 10000;
const DEFAULT_STALE_AFTER_MS = 60000;

interface UsePollingResourceOptions<TData> {
  enabled: boolean;
  initialData: TData;
  load: () => Promise<TData>;
  intervalMs?: number;
  staleAfterMs?: number;
  requestKey?: string;
  resetOnInitialLoad?: boolean;
  getErrorMessage?: (error: unknown) => string;
  mergeData?: (previousData: TData, nextData: TData) => TData;
}

interface PollingResourceState<TData> {
  data: TData;
  isLoading: boolean;
  error: string | null;
}

export const usePollingResource = <TData>({
  enabled,
  initialData,
  load,
  intervalMs = DEFAULT_POLL_INTERVAL_MS,
  staleAfterMs = DEFAULT_STALE_AFTER_MS,
  requestKey,
  resetOnInitialLoad = false,
  getErrorMessage,
  mergeData,
}: UsePollingResourceOptions<TData>) => {
  const [state, setState] = useState<PollingResourceState<TData>>({
    data: initialData,
    isLoading: enabled,
    error: null,
  });
  const disabledState: PollingResourceState<TData> = {
    data: initialData,
    isLoading: false,
    error: null,
  };
  const mergeDataRef = useRef(mergeData);
  const lastSuccessfulLoadAtRef = useRef<number | null>(null);
  const runLoadRef = useRef<((options?: { showLoading?: boolean; resetData?: boolean }) => Promise<void>) | null>(null);

  useEffect(() => {
    mergeDataRef.current = mergeData;
  }, [mergeData]);

  const resolveLoad = useEffectEvent(load);
  const resolveErrorMessage = useEffectEvent((error: unknown) =>
    resolveLoadErrorText(error, getErrorMessage?.(error) ?? 'Не удалось загрузить данные')
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    lastSuccessfulLoadAtRef.current = null;

    const runLoad = async ({ showLoading = false, resetData = false } = {}) => {
      if (showLoading) {
        setState((prev) => ({
          data: resetData ? initialData : prev.data,
          isLoading: true,
          error: null,
        }));
      }

      try {
        const data = await resolveLoad();
        if (cancelled) {
          return;
        }

        lastSuccessfulLoadAtRef.current = Date.now();

        setState((prev) => ({
          data: mergeDataRef.current ? mergeDataRef.current(prev.data, data) : data,
          isLoading: false,
          error: null,
        }));
      } catch (error) {
        if (cancelled) {
          return;
        }

        const errorMessage = resolveErrorMessage(error);
        const lastSuccessfulLoadAt = lastSuccessfulLoadAtRef.current;
        const stale = lastSuccessfulLoadAt === null || Date.now() - lastSuccessfulLoadAt > staleAfterMs;

        setState((prev) => ({
          data: stale ? initialData : prev.data,
          isLoading: false,
          error: errorMessage,
        }));
      }
    };

    runLoadRef.current = runLoad;
    runLoad({ showLoading: true, resetData: resetOnInitialLoad }).catch(() => undefined);

    const intervalId = window.setInterval(() => {
      runLoad().catch(() => undefined);
    }, intervalMs);

    return () => {
      cancelled = true;
      runLoadRef.current = null;
      window.clearInterval(intervalId);
    };
  }, [enabled, initialData, intervalMs, requestKey, resetOnInitialLoad, staleAfterMs]);

  // повторяет запрос, не считая ресурс новым: уже показанные данные остаются на экране
  const refetch = useCallback(() => {
    runLoadRef.current?.({ showLoading: true }).catch(() => undefined);
  }, []);

  return enabled ? { ...state, refetch } : { ...disabledState, refetch };
};
