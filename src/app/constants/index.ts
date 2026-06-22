// Constantes globais da aplicação.
// Importar de "@/app/constants" para evitar strings mágicas espalhadas.

export const CLAIM_TYPES = [
  "Vazamento / Infiltração",
  "Incêndio",
  "Dano Físico / Vandalismo",
  "Acidente Pessoal",
  "Roubo / Furto",
  "Desastre Natural",
  "Dano Estrutural",
  "Pico de Energia / Elétrico",
  "Outros",
] as const;

export const RESPONSIBLE_AREAS = [
  "Manutenção",
  "Brigada",
  "Engenharia",
  "Conservação",
  "Relacionamento",
  "Segurança / CFTV",
  "Estacionamento",
  "Arquitetura",
] as const;

// Lojas fixas do protótipo (substituir por busca na API em produção)
export const STORES_MOCK = [
  "Zara - LUC A-105",
  "Riachuelo - LUC A-130",
  "Renner - LUC A-118",
  "Starbucks - LUC B-212",
  "Fast Shop - LUC B-220",
  "Vivara - LUC B-204",
  "Centauro - LUC C-301",
  "Outback - LUC C-315",
] as const;

export const STORES_WITH_IRREGULAR_POLICY = ["Renner - LUC A-118", "Outback - LUC C-315"] as const;

export const STATUS_BADGE_CLASSES: Record<string, string> = {
  "Em análise": "bg-amber-100 text-amber-800 border-amber-200",
  "Aguardando seguradora": "bg-blue-100 text-blue-800 border-blue-200",
  Pago: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Concluído: "bg-[#F5E9D7] text-[#8B1A1A] border-[#E8DCCB]",
  Cancelado: "bg-red-100 text-red-800 border-red-200",
};

export const SEVERITY_BADGE_CLASSES: Record<string, string> = {
  Alta: "bg-red-100 text-red-800 border-red-200",
  Média: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Baixa: "bg-green-100 text-green-800 border-green-200",
};

export const MONTHS_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"] as const;

export const BRAND_COLORS = {
  primary: "#8B1A1A",
  primaryHover: "#701515",
  primaryDark: "#E04444",
  gold: "#C9A227",
  green: "#3F7D58",
  danger: "#D93030",
} as const;
