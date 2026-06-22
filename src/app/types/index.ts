// Tipos centrais da aplicação JP Mall.
// Importar de "@/app/types" em vez de definir localmente em cada arquivo.

export type ClaimStatus =
  | "Em análise"
  | "Aguardando seguradora"
  | "Pago"
  | "Concluído"
  | "Cancelado";

export type ClaimSeverity = "Baixa" | "Média" | "Alta";

export type UserRole = "Gerente" | "Regulador" | "Financeiro" | "Analista";

export interface AuditEntry {
  id: string;
  user: string;
  userInitials: string;
  userRole: UserRole;
  timestamp: string;
  action: string;
  type: "status_change" | "assignment" | "document" | "financial" | "created" | "comment";
}

export interface Claim {
  id: string;
  store: string;
  type: string;
  otherType?: string;
  severity: ClaimSeverity;
  status: ClaimStatus;
  date: string;
  description: string;
  files: string[];
  tenantNotified?: boolean;
  responsibleArea?: string;
  employeeName?: string;
  employeeContact?: string;
  irregularPolicy?: boolean;
  auditTrail?: AuditEntry[];
  compensationAmount?: number;
  responsibility?: string;
  responsibleNotified?: boolean;
  createdAt?: string;
  resolvedAt?: string;
}

export interface Store {
  id: number;
  code: string;
  name: string;
  segment?: string;
}

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

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

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
