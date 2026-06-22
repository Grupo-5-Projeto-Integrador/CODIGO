import { useNavigate } from "react-router";
import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  PlusCircle,
  Activity,
  Percent,
  Eye,
  ArrowRight,
  DollarSign,
  Clock,
  AlertTriangle,
  BarChart3,
  Info,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  Area,
  ComposedChart,
} from "recharts";
import type { ClaimStatus } from "../../types";

const MONTHS_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const INACTIVE_STATUSES = [
  "resolvido", "concluido", "concluído", "finalizado",
  "fechado", "cancelado", "pago",
];

const TOTAL_LUCS = 8;
const BRAND = "#8B1A1A";
const BRAND_GOLD = "#C9A227";
const BRAND_GREEN = "#3F7D58";

type RecentActivity = {
  id: string;
  store: string;
  luc: string;
  status: ClaimStatus;
  description: string;
  time: string;
  tenantNotified?: boolean;
  irregularPolicy?: boolean;
};

const statusBadge: Record<string, string> = {
  "Em análise": "bg-amber-100 text-amber-800 border-amber-200",
  "Aguardando seguradora": "bg-blue-100 text-blue-800 border-blue-200",
  Pago: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Concluído: "bg-[#F5E9D7] text-[#8B1A1A] border-[#E8DCCB]",
  Cancelado: "bg-red-100 text-red-800 border-red-200",
};

function formatTime(dateStr: string) {
  const claimDate = new Date(dateStr);
  if (isNaN(claimDate.getTime())) return dateStr || "Não informado";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (claimDate.toDateString() === today.toDateString()) {
    return `Hoje, ${claimDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  }
  if (claimDate.toDateString() === yesterday.toDateString()) {
    return `Ontem, ${claimDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  }
  return claimDate.toLocaleDateString("pt-BR");
}

function getIndemnityValue(claim: any): number {
  return (
    Number(claim.indemnityValue) ||
    Number(claim.valor) ||
    Number(claim.indenizacao) ||
    Number(claim.compensation) ||
    Number(claim.amount) ||
    0
  );
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
}

const getLastMonths = (n: number) => {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth(), label: MONTHS_PT[d.getMonth()] };
  });
};

function buildVolumeMensal(claims: any[]) {
  return getLastMonths(6).map(({ year, month, label }) => ({
    mes: label,
    sinistros: claims.filter(c => {
      const d = new Date(c.date);
      return d.getFullYear() === year && d.getMonth() === month;
    }).length,
  }));
}

function buildIndiceMensal(claims: any[]) {
  return getLastMonths(6).map(({ year, month, label }) => {
    const affected = new Set(
      claims
        .filter(c => { const d = new Date(c.date); return d.getFullYear() === year && d.getMonth() === month; })
        .map(c => c.store)
    ).size;
    return { mes: label, indice: parseFloat(((affected / TOTAL_LUCS) * 100).toFixed(1)) };
  });
}

export function Dashboard() {
  const navigate = useNavigate();
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch("http://localhost:8080/api/claims")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setClaims(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setError("Não foi possível conectar ao servidor. Verifique se o backend está rodando em localhost:8080.");
        setClaims([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalSinistros = claims.length;

  const sinistrosAtivos = claims.filter(
    (c) => !INACTIVE_STATUSES.includes((c.status || "").toLowerCase())
  ).length;

  const indenizacaoTotal = claims.reduce((sum, c) => sum + getIndemnityValue(c), 0);

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 12);
  const totalLast12 = claims.filter(c => new Date(c.date) >= cutoff).length;

  const volumeMensal = buildVolumeMensal(claims);
  const indiceMensal = buildIndiceMensal(claims);

  const recentActivities: RecentActivity[] = claims.slice(0, 3).map((claim: any) => {
    const parts = (claim.store || "").split(" - LUC ");
    return {
      id: claim.id || "—",
      store: parts[0] || claim.store || "Não informado",
      luc: parts[1] || "N/A",
      status: claim.status || "Em análise",
      description: claim.description || "Sem descrição",
      time: formatTime(claim.date),
      tenantNotified: claim.tenantNotified,
      irregularPolicy: claim.irregularPolicy,
    };
  });

  const renderMetric = (value: string | number) => {
    if (loading) return <span className="text-gray-400 animate-pulse">...</span>;
    return <>{value}</>;
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#8B1A1A]">Visão Geral — Sinistros</h1>
          <p className="text-sm text-gray-500 mt-1">
            Dados sincronizados de ocorrências e sinistralidade do shopping.
          </p>
        </div>
        <button
          onClick={() => navigate("/novo-sinistro")}
          className="flex items-center px-5 py-2.5 bg-[#8B1A1A] hover:bg-[#701515] text-white rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Registrar Sinistro
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sinistros Ativos */}
        <button
          onClick={() => navigate("/historico")}
          className="text-left bg-white rounded-2xl border border-[#E8DCCB] shadow-sm p-5 hover:shadow-md transition-all group flex flex-col justify-between min-h-[120px]"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Sinistros Ativos</p>
            <div className="w-9 h-9 rounded-xl bg-[#FAF7F2] border border-[#E8DCCB] flex items-center justify-center text-[#8B1A1A] shrink-0">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900 mt-2">{renderMetric(sinistrosAtivos)}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-gray-500">de {renderMetric(totalSinistros)} registrados</span>
              <ArrowRight className="w-4 h-4 text-gray-200 group-hover:text-[#8B1A1A] transition-colors" />
            </div>
          </div>
        </button>

        {/* Sinistralidade */}
        <div className="text-left bg-white rounded-2xl border border-[#E8DCCB] shadow-sm p-5 flex flex-col justify-between min-h-[120px]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Sinistralidade</p>
            <div className="w-9 h-9 rounded-xl bg-[#EAF3EE] border border-[#CFE3D7] flex items-center justify-center text-[#3F7D58] shrink-0">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {renderMetric(totalSinistros > 0
                ? ((sinistrosAtivos / totalSinistros) * 100).toFixed(1).replace(".", ",")
                : "0")}
              <span className="text-xl text-gray-400 font-semibold">%</span>
            </p>
            <div className="mt-2">
              <span className="text-xs text-gray-500">ativos / total</span>
            </div>
          </div>
        </div>

        {/* Tempo Médio */}
        <div className="text-left bg-white rounded-2xl border border-[#E8DCCB] shadow-sm p-5 flex flex-col justify-between min-h-[120px]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Tempo Médio</p>
            <div className="w-9 h-9 rounded-xl bg-[#FAF7F2] border border-[#E8DCCB] flex items-center justify-center text-[#8B1A1A] shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900 mt-2">—<span className="text-xl text-gray-400 font-semibold">h</span></p>
            <div className="mt-2">
              <span className="text-xs text-gray-500">dados insuficientes</span>
            </div>
          </div>
        </div>

        {/* Total últimos 12 meses */}
        <div className="bg-white rounded-2xl border border-[#E8DCCB] shadow-sm p-5 flex flex-col justify-between min-h-[120px]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Últ. 12 meses</p>
            <div className="w-9 h-9 rounded-xl bg-[#FAF7F2] border border-[#E8DCCB] flex items-center justify-center text-[#8B1A1A] shrink-0">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900 mt-2">{renderMetric(totalLast12)}</p>
            <p className="text-xs text-gray-400 mt-2">sinistros registrados</p>
          </div>
        </div>
      </div>

      {/* Indenizações totais */}
      <div className="bg-gradient-to-br from-[#8B1A1A] to-[#701515] p-6 rounded-2xl shadow-sm text-white relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white/90">Total de Indenizações Pagas</h3>
            <span className="text-4xl font-bold tracking-tight mt-2 block">
              {loading ? <span className="animate-pulse text-white/60">Carregando...</span> : formatCurrency(indenizacaoTotal)}
            </span>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Gráficos */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">Carregando gráficos...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* CHART A — Volume Mensal */}
          <div className="bg-white border border-[#E8DCCB] rounded-2xl p-5 shadow-sm flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="inline-flex items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-[#8B1A1A] text-white text-[10px] font-bold tracking-wider">GRÁFICO A</span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#8B1A1A]">
                    <BarChart3 className="w-3.5 h-3.5" /> Valores Absolutos
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-900">Volume de Sinistros</h3>
                <p className="text-xs text-gray-400 mt-0.5">Ocorrências registradas por mês — últimos 6 meses.</p>
              </div>
              <div className="text-right shrink-0 ml-3">
                <div className="text-2xl font-bold text-[#8B1A1A]">{volumeMensal.reduce((s, m) => s + m.sinistros, 0)}</div>
                <div className="text-xs text-gray-400">ocorrências</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={volumeMensal} margin={{ top: 16, right: 4, left: -8, bottom: 0 }} accessibilityLayer={false}>
                <defs>
                  <linearGradient id="volumeBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BRAND} />
                    <stop offset="100%" stopColor="#B83232" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DCCB" />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 11 }} dy={6} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: "#FAF7F2" }}
                  contentStyle={{ borderRadius: "12px", border: "1px solid #E8DCCB", fontSize: 12 }}
                  formatter={(value: number) => [`${value} sinistros`, "Volume"]}
                />
                <Bar dataKey="sinistros" fill="url(#volumeBar)" radius={[5, 5, 0, 0]} barSize={28}
                  label={{ position: "top", fill: "#8B1A1A", fontSize: 10, fontWeight: 700 }} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
              <Info className="w-3 h-3 shrink-0" /> Quantidade absoluta de eventos no período.
            </p>
          </div>

          {/* CHART B — Índice de Sinistralidade */}
          <div className="bg-white border border-[#E8DCCB] rounded-2xl p-5 shadow-sm flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="inline-flex items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-[#3F7D58] text-white text-[10px] font-bold tracking-wider">GRÁFICO B</span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#3F7D58]">
                    <Percent className="w-3.5 h-3.5" /> Percentual
                  </span>
                </div>
                <h3 className="text-sm font-bold text-gray-900">Índice de Sinistralidade</h3>
                <p className="text-xs text-gray-400 mt-0.5">% de LUCs com sinistro sobre o total — últimos 6 meses.</p>
              </div>
              <div className="text-right shrink-0 ml-3">
                <div className="text-2xl font-bold text-[#3F7D58]">
                  {indiceMensal.length ? (indiceMensal.reduce((s, m) => s + m.indice, 0) / indiceMensal.length).toFixed(1) : "0"}%
                </div>
                <div className="text-xs text-gray-400">média do período</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={indiceMensal} margin={{ top: 16, right: 4, left: -8, bottom: 0 }} accessibilityLayer={false}>
                <defs>
                  <linearGradient id="indiceArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BRAND_GREEN} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={BRAND_GREEN} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DCCB" />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 11 }} dy={6} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 11 }} domain={[0, 12]} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #E8DCCB", fontSize: 12 }}
                  formatter={(value: number) => [`${value}%`, "Índice"]}
                />
                <Area type="monotone" dataKey="indice" stroke="none" fill="url(#indiceArea)" />
                <Line type="monotone" dataKey="indice" stroke={BRAND_GREEN} strokeWidth={2.5}
                  dot={{ r: 4, fill: BRAND_GOLD, stroke: BRAND_GREEN, strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: BRAND_GOLD, stroke: BRAND_GREEN, strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
            <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
              <Info className="w-3 h-3 shrink-0" /> % de lojas afetadas em relação ao total de LUCs.
            </p>
          </div>
        </div>
      )}

      {/* Atividades Recentes */}
      <div className="bg-white rounded-2xl border border-[#E8DCCB] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8DCCB]">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#8B1A1A]" />
            <div>
              <h3 className="text-sm font-bold text-[#8B1A1A]">Atividades Recentes</h3>
              <p className="text-xs text-gray-400">Últimos sinistros registrados.</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/historico")}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#8B1A1A] hover:underline shrink-0"
          >
            Ver todos <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Carregando atividades...</span>
          </div>
        ) : recentActivities.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">Nenhum sinistro registrado ainda.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F3EDE4]">
            {recentActivities.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#FAF7F2] transition-colors">
                <div className="w-8 h-8 rounded-xl bg-[#FAF7F2] border border-[#E8DCCB] flex items-center justify-center text-[#8B1A1A] shrink-0">
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">{a.store}</span>
                    <span className="text-[10px] font-bold text-[#8B1A1A] bg-[#F5E9D7] border border-[#E8DCCB] rounded px-1.5 py-0.5">
                      LUC {a.luc}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusBadge[a.status] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
                      {a.status}
                    </span>
                    {a.tenantNotified && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        Lojista Notificado
                      </span>
                    )}
                    {a.irregularPolicy && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-[#D93030] border border-red-200">
                        Apólice Irregular
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{a.id} · {a.time}</p>
                </div>
                <button
                  onClick={() => navigate(`/sinistro/${a.id}`)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#8B1A1A] hover:bg-[#FAF7F2] rounded-lg transition-colors border border-[#E8DCCB] shrink-0"
                >
                  <Eye className="w-3.5 h-3.5" /> Ver
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
