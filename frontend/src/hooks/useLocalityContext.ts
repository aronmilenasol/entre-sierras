import { useState, useCallback, useRef } from 'react';
import { apiService } from '../services/api';
import type { LocalityContext } from '../types';

export function useLocalityContext() {
  const [context, setContext] = useState<LocalityContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const loadContext = useCallback(async (departmentId: string) => {
    const currentRequestId = ++requestId.current;
    setLoading(true);
    setError(null);

    try {
      const data = await apiService.getLocalityContext(departmentId);
      if (requestId.current === currentRequestId) setContext(data);
    } catch (err) {
      if (requestId.current === currentRequestId)
        setError(err instanceof Error ? err.message : 'Error al cargar contexto');
    } finally {
      if (requestId.current === currentRequestId) setLoading(false);
    }
  }, []);

  const clearContext = useCallback(() => {
    requestId.current += 1;
    setContext(null);
    setLoading(false);
    setError(null);
  }, []);

  return { context, loading, error, loadContext, clearContext };
}
