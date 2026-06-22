// Serviço de comunicação com o backend JP Mall
// Base URL usa proxy do Vite em dev; em produção apontar para o servidor real.
const BASE = "/api";

function getToken() {
  return localStorage.getItem("jp_token") || "";
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Auth ────────────────────────────────────────────────────────────────────

export interface LoginResult {
  token: string;
  user: { id: number; email: string; name: string; role: string };
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await handleResponse<LoginResult>(res);
  localStorage.setItem("jp_token", data.token);
  return data;
}

export function logout() {
  localStorage.removeItem("jp_token");
}

// ── Claims ──────────────────────────────────────────────────────────────────

export interface EmployeeContact {
  storeId: number;
  storeName: string;
  name: string;
  contact: string;
}

export interface ApiClaim {
  id: string;
  store: string;
  type: string;
  otherType?: string;
  severity: string;
  status: string;
  date: string;
  description: string;
  files: string[];
  tenantNotified: boolean;
  responsibleArea?: string;
  employeeName?: string;
  employeeContact?: string;
  employeeContacts: EmployeeContact[];
  irregularPolicy: boolean;
  auditTrail: AuditEntry[];
  compensationAmount: number;
  responsibility: string;
  responsibleNotified: boolean;
  createdAt: string;
  resolvedAt?: string;
}

export interface AuditEntry {
  id: string;
  user: string;
  userInitials: string;
  userRole: string;
  timestamp: string;
  action: string;
  type: string;
}

export interface ClaimsResponse {
  claims: ApiClaim[];
  total: number;
}

export async function getClaims(params?: {
  status?: string;
  store?: string;
  severity?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<ClaimsResponse> {
  const qs = new URLSearchParams(
    Object.entries(params || {})
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => [k, String(v)])
  ).toString();
  const res = await fetch(`${BASE}/claims${qs ? "?" + qs : ""}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export interface ClaimsHistoryResponse {
  items: ApiClaim[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface HistoryParams {
  search?: string;
  status?: string;
  severity?: string;
  area?: string;
  responsibility?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export async function getClaimsHistory(params?: HistoryParams): Promise<ClaimsHistoryResponse> {
  const qs = new URLSearchParams(
    Object.entries(params || {})
      .filter(([, v]) => v !== undefined && v !== "" && v !== null)
      .map(([k, v]) => [k, String(v)])
  ).toString();
  const res = await fetch(`${BASE}/claims/history${qs ? "?" + qs : ""}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export function claimsReportPDFUrl(params: HistoryParams): string {
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== "" && v !== null)
      .map(([k, v]) => [k, String(v)])
  ).toString();
  return `${BASE}/reports/claims/pdf${qs ? "?" + qs : ""}`;
}

export function claimsHistoryExportUrl(
  params: HistoryParams & { format: "pdf" | "excel" | "csv" }
): string {
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== "" && v !== null)
      .map(([k, v]) => [k, String(v)])
  ).toString();
  return `${BASE}/claims/history/export?${qs}`;
}

export async function getClaimById(id: string): Promise<ApiClaim> {
  const res = await fetch(`${BASE}/claims/${id}`, { headers: authHeaders() });
  return handleResponse(res);
}

export interface NewClaimPayload {
  store: string;
  store_ids?: number[];
  type: string;
  otherType?: string;
  severity: string;
  date: string;
  description: string;
  responsibleArea?: string;
  tenantNotified?: boolean;
  responsibleNotified?: boolean;
  employeeName?: string;
  employeeContact?: string;
  employeeContacts?: EmployeeContact[];
  irregularPolicy?: boolean;
  responsibility?: string;
}

export async function createClaim(
  payload: NewClaimPayload,
  files?: File[]
): Promise<ApiClaim> {
  if (files && files.length > 0) {
    const form = new FormData();
    form.append("data", JSON.stringify(payload));
    files.forEach((f) => form.append("files", f));
    const token = getToken();
    const res = await fetch(`${BASE}/claims`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    return handleResponse(res);
  }

  const res = await fetch(`${BASE}/claims`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function updateClaim(
  id: string,
  updates: Partial<ApiClaim>
): Promise<ApiClaim> {
  const res = await fetch(`${BASE}/claims/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(updates),
  });
  return handleResponse(res);
}

export async function addAuditEntry(
  id: string,
  entry: Omit<AuditEntry, "id" | "timestamp">
): Promise<AuditEntry> {
  const res = await fetch(`${BASE}/claims/${id}/audit`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(entry),
  });
  return handleResponse(res);
}

export async function uploadClaimFiles(
  id: string,
  files: File[]
): Promise<{ files: string[] }> {
  const form = new FormData();
  files.forEach((file) => form.append("files", file));
  const token = getToken();
  const res = await fetch(`${BASE}/claims/${id}/files`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  return handleResponse(res);
}

// ── Claim Notifications ─────────────────────────────────────────────────────

export interface ClaimNotifRecord {
  id: number;
  recipient_type: string;
  recipient_name: string;
  recipient_email: string;
  recipient_phone: string;
  channel: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

export interface NotificationDataResponse {
  claim_code: string;
  store_id: number;
  store_name: string;
  store_code: string;
  store_email: string;
  store_phone: string;
  date: string;
  severity: string;
  status: string;
  description: string;
  responsible_area: string;
  history: ClaimNotifRecord[];
}

export async function getClaimNotificationData(claimId: string): Promise<NotificationDataResponse> {
  const res = await fetch(`${BASE}/claims/${claimId}/notification-data`, { headers: authHeaders() });
  return handleResponse(res);
}

export interface WhatsAppLinkResponse {
  phone: string;
  message: string;
  url: string;
}

export async function getClaimWhatsappLink(claimId: string): Promise<WhatsAppLinkResponse> {
  const res = await fetch(`${BASE}/claims/${claimId}/whatsapp-link`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function getClaimNotifications(claimId: string): Promise<ClaimNotifRecord[]> {
  const res = await fetch(`${BASE}/claims/${claimId}/notifications`, { headers: authHeaders() });
  const data = await handleResponse<{ notifications: ClaimNotifRecord[] }>(res);
  return data.notifications;
}

export interface StoreContactPayload {
  email: string;
  phone: string;
}

export interface StoreContactResponse {
  success: boolean;
  store: {
    id: number;
    code: string;
    name: string;
    email: string;
    phone: string;
  };
}

export async function updateStoreContact(
  storeId: number,
  payload: StoreContactPayload
): Promise<StoreContactResponse> {
  const res = await fetch(`${BASE}/stores/${storeId}/contact`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

// ── Stores ──────────────────────────────────────────────────────────────────

export interface Store {
  id: number;
  code: string;
  name: string;
  segment?: string;
  created_at: string;
}

export async function getStores(params?: { search?: string; segment?: string }): Promise<Store[]> {
  const qs = new URLSearchParams(
    Object.entries(params || {}).filter(([, v]) => !!v) as [string, string][]
  ).toString();
  const res = await fetch(`${BASE}/stores${qs ? "?" + qs : ""}`, { headers: authHeaders() });
  return handleResponse(res);
}

// ── Notifications ────────────────────────────────────────────────────────────

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  priority: string;
  claim_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

export async function getNotifications(params?: { is_read?: boolean }): Promise<NotificationsResponse> {
  const qs = params?.is_read !== undefined ? `?is_read=${params.is_read}` : "";
  const res = await fetch(`${BASE}/notifications${qs}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function markNotificationRead(id: number): Promise<Notification> {
  const res = await fetch(`${BASE}/notifications/${id}/read`, {
    method: "PUT",
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function markAllNotificationsRead(): Promise<{ updated: number }> {
  const res = await fetch(`${BASE}/notifications/read-all`, {
    method: "PUT",
    headers: authHeaders(),
  });
  return handleResponse(res);
}

// ── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  active: number;
  last12Months: number;
  totalStores: number;
  volumeMensal: { mes: string; sinistros: number }[];
  indiceMensal: { mes: string; indice: number }[];
  byStatus: { status: string; total: number }[];
  bySeverity: { severity: string; total: number }[];
  byType: { type: string; total: number }[];
  topStores: { store: string; total: number }[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await fetch(`${BASE}/dashboard/stats`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function getDashboardRecent(): Promise<ApiClaim[]> {
  const res = await fetch(`${BASE}/dashboard/recent`, { headers: authHeaders() });
  return handleResponse(res);
}

export interface DashboardSummary {
  active_claims: number;
  sinistrality_rate: number;
  average_resolution_hours: number;
  last_12_months_total: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  open_count: number;
  closed_count: number;
}

export interface MonthlyClaimsItem {
  month: string;
  total: number;
}

export interface MonthlySinistralityItem {
  month: string;
  rate: number;
}

export interface RecentActivityItem {
  id: string;
  store: string;
  store_name: string;
  luc: string;
  claim_type: string;
  severity: string;
  status: string;
  date: string;
  tenant_notified: boolean;
  irregular_policy: boolean;
  created_at: string;
  responsible_area: string;
  description: string;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const res = await fetch(`${BASE}/dashboard/summary`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function getDashboardMonthlyClaims(): Promise<MonthlyClaimsItem[]> {
  const res = await fetch(`${BASE}/dashboard/monthly-claims`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function getDashboardMonthlySinistrality(): Promise<MonthlySinistralityItem[]> {
  const res = await fetch(`${BASE}/dashboard/monthly-sinistrality`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function getDashboardRecentActivities(): Promise<RecentActivityItem[]> {
  const res = await fetch(`${BASE}/dashboard/recent-activities`, { headers: authHeaders() });
  return handleResponse(res);
}

// ── Reports ──────────────────────────────────────────────────────────────────

export interface ReportParams {
  start_date?: string;
  end_date?: string;
  search?: string;
  status?: string;
  severity?: string;
  category?: string;
  responsibility?: string;
  responsible_areas?: string[];
  store_names?: string[];
}

function buildReportQS(params: ReportParams): string {
  const p = new URLSearchParams();
  if (params.start_date) p.set("start_date", params.start_date);
  if (params.end_date) p.set("end_date", params.end_date);
  if (params.search) p.set("search", params.search);
  if (params.status && params.status !== "Todos") p.set("status", params.status);
  if (params.severity && params.severity !== "Todas") p.set("severity", params.severity);
  if (params.category && params.category !== "todos") p.set("category", params.category);
  if (params.responsibility && params.responsibility !== "Todos") p.set("responsibility", params.responsibility);
  params.responsible_areas?.forEach(a => p.append("responsible_area", a));
  params.store_names?.forEach(n => p.append("store_name", n));
  return p.toString();
}

export async function getReportClaims(params: ReportParams): Promise<ApiClaim[]> {
  const qs = buildReportQS(params);
  const res = await fetch(`${BASE}/reports/claims${qs ? "?" + qs : ""}`, { headers: authHeaders() });
  return handleResponse<ApiClaim[]>(res);
}

export function getReportClaimsPdfUrl(params: ReportParams): string {
  const qs = buildReportQS(params);
  return `${BASE}/reports/claims/pdf${qs ? "?" + qs : ""}`;
}

export function getReportFinalExcelUrl(params: ReportParams): string {
  const qs = buildReportQS(params);
  return `${BASE}/reports/final/excel${qs ? "?" + qs : ""}`;
}
