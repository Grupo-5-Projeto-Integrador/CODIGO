import { useState, useEffect, useCallback } from "react";
import { getDashboardStats, getDashboardRecent } from "../api";
import type { DashboardStats, Claim } from "../types";

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, recentData] = await Promise.all([
        getDashboardStats(),
        getDashboardRecent(),
      ]);
      setStats(statsData);
      setRecent(recentData as Claim[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { stats, recent, loading, error, fetch };
}
