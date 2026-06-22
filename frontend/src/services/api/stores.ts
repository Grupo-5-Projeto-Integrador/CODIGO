export async function fetchStores() {
  const res = await fetch('/api/stores');
  if (!res.ok) throw new Error('failed to fetch stores');
  return res.json();
}

export async function searchStores(query: string) {
  const res = await fetch(`/api/stores/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('failed to search stores');
  return res.json();
}
