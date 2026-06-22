export type ClaimStatus = "Em análise" | "Aguardando seguradora" | "Pago" | "Concluído" | "Cancelado";
export type ClaimSeverity = "Baixa" | "Média" | "Alta";
export type RiskLevel = "Baixo" | "Médio" | "Alto";
export type UserRole = "Gerente" | "Regulador" | "Financeiro" | "Analista";

export interface AuditEntry {
  id: string;
  user: string;
  userInitials: string;
  userRole: UserRole;
  timestamp: string; // ISO datetime
  action: string;
  type: "status_change" | "assignment" | "document" | "financial" | "created" | "comment";
}

export interface InsurancePolicy {
  id: string;
  number: string;
  insurer: string;
  type: string;
  coverage: number;
  deductible: number;
  validFrom: string;
  validTo: string;
  status: "Ativa" | "Vencida" | "Em Renovação";
}

export interface Claim {
  id: string;
  store: string;
  type: string;
  otherType?: string;
  severity: ClaimSeverity;
  riskLevel?: RiskLevel;
  status: ClaimStatus;
  date: string;
  description: string;
  files: string[];
  regulator?: string;
  indemnityValue?: number;
  deductibleValue?: number;
  fraudAlert?: boolean;
  tenantNotified?: boolean;
  irregularPolicy?: boolean;
  auditTrail?: AuditEntry[];
  policies?: InsurancePolicy[];
  responsibleArea?: string;
  employeeName?: string;
  employeeContact?: string;
  responsibility?: string;
  compensationAmount?: number;
  resolvedAt?: string;
}

// Lojas com apólice irregular/vencida
export const storesWithIrregularPolicy = [
  "Renner - LUC A-118",
  "Outback - LUC C-315",
];

export const hasIrregularPolicy = (storeName: string): boolean => {
  return storesWithIrregularPolicy.includes(storeName);
};
