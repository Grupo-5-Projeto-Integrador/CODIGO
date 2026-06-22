import { useState, useEffect, useCallback } from "react";
import * as api from "../api";
import type { Claim } from "../types";

interface UseClaimsOptions {
  status?: string;
  store?: string;
  severity?: string;
  search?: string;
  limit?: number;
  autoFetch?: boolean;
}

export function useClaims(options: UseClaimsOptions = {}) {
  const { autoFetch = true, ...params } = options;
  const [claims, setClaims] = useState<Claim[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (overrides?: typeof params) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getClaims({ ...params, ...overrides });
      setClaims(result.claims as Claim[]);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar sinistros");
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (autoFetch) fetch();
  }, [fetch, autoFetch]);

  const createClaim = useCallback(
    async (payload: api.NewClaimPayload, files?: File[]): Promise<Claim> => {
      const created = await api.createClaim(payload, files);
      setClaims((prev) => [created as Claim, ...prev]);
      setTotal((t) => t + 1);
      return created as Claim;
    },
    []
  );

  const updateClaim = useCallback(
    async (id: string, updates: Partial<Claim>): Promise<Claim> => {
      const updated = await api.updateClaim(id, updates as Partial<api.ApiClaim>);
      setClaims((prev) => prev.map((c) => (c.id === id ? (updated as Claim) : c)));
      return updated as Claim;
    },
    []
  );

  return { claims, total, loading, error, fetch, createClaim, updateClaim };
}

export function useClaimById(id: string | undefined) {
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getClaimById(id);
      setClaim(data as Claim);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sinistro não encontrado");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  const update = useCallback(
    async (updates: Partial<Claim>): Promise<void> => {
      if (!id) return;
      const updated = await api.updateClaim(id, updates as Partial<api.ApiClaim>);
      setClaim(updated as Claim);
    },
    [id]
  );

  const addAudit = useCallback(
    async (entry: Omit<api.AuditEntry, "id" | "timestamp">) => {
      if (!id) return;
      const newEntry = await api.addAuditEntry(id, entry);
      setClaim((prev) =>
        prev
          ? { ...prev, auditTrail: [...(prev.auditTrail || []), newEntry as any] }
          : prev
      );
    },
    [id]
  );

  return { claim, loading, error, fetch, update, addAudit };
}
