export async function fetchReportClaims(params: string) {
  const res = await fetch(`/api/reports/claims?${params}`);
  if (!res.ok) throw new Error('failed to fetch report claims');
  return res.json();
}

export async function downloadReportClaims(format: 'pdf' | 'excel', params: string) {
  const res = await fetch(`/api/reports/claims/${format}?${params}`);
  if (!res.ok) throw new Error('failed to download report claims');
  return res.blob();
}

export async function downloadFinalReport(format: 'pdf' | 'excel', params: string) {
  const res = await fetch(`/api/reports/final/${format}?${params}`);
  if (!res.ok) throw new Error('failed to download final report');
  return res.blob();
}
