import { useCallback, useEffect, useRef, useState } from 'react';
import { getDashboard } from '../services/api.js';

const POLL_INTERVAL_MS = 2500;

export function useDashboard(astronautId = 1) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState('');

  const inFlightRef = useRef(false);
  const mountedRef = useRef(false);
  const dashboardRef = useRef(null);

  const refresh = useCallback(async ({ quiet = false } = {}) => {
    if (inFlightRef.current) return null;
    inFlightRef.current = true;
    if (!quiet && !dashboardRef.current) setLoading(true);

    try {
      const data = await getDashboard(astronautId);
      if (mountedRef.current) {
        dashboardRef.current = data;
        setDashboard(data);
        setConnected(true);
        setLastUpdated(new Date());
        setError('');
        setLoading(false);
      }
      return data;
    } catch (err) {
      if (mountedRef.current) {
        setConnected(false);
        setError(err?.message || 'Telemetry connection failed.');
        setLoading(false);
      }
      return null;
    } finally {
      inFlightRef.current = false;
    }
  }, [astronautId]);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();

    const timer = window.setInterval(() => {
      void refresh({ quiet: true });
    }, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      window.clearInterval(timer);
    };
  }, [refresh]);

  return { dashboard, loading, connected, lastUpdated, error, refresh };
}
