import type { Claim } from "../../types";

export async function fetchClaims(): Promise<Claim[]> {
  const res = await fetch('/api/claims');
  if (!res.ok) throw new Error('failed to fetch claims');
  return res.json();
}

export async function createClaim(payload: unknown) {
  const res = await fetch('/api/claims', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('failed to create claim');
  return res.json();
}

export async function fetchClaimById(id: string) {
  const res = await fetch(`/api/claims/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('claim not found');
  return res.json();
}

export async function updateClaim(id: string, updates: unknown) {
  const res = await fetch(`/api/claims/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('failed to update');
  return res.json();
}

export async function addAuditEntry(id: string, entry: unknown) {
  const res = await fetch(`/api/claims/${encodeURIComponent(id)}/audit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error('failed to add audit');
  return res.json();
}

export async function fetchClaimNotificationData(id: string) {
  const res = await fetch(`/api/claims/${encodeURIComponent(id)}/notification-data`);
  if (!res.ok) throw new Error('failed to fetch notification data');
  return res.json();
}
