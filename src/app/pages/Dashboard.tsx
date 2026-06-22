import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  TrendingUp,
  PlusCircle,
  Activity,
  Percent,
  Eye,
  ArrowRight,
  Info,
  BarChart3,
  Clock,
  AlertCircle,
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
import {
  getDashboardSummary,
  getDashboardMonthlyClaims,
  getDashboardMonthlySinistrality,
  getDashboardRecentActivities,
  type DashboardSummary,
  type MonthlyClaimsItem,
  type MonthlySinistralityItem,
  type RecentActivityItem,
} from "../api";

const BRAND = "#8B1A1A";
const BRAND_GOLD = "#C9A227";
const BRAND_GREEN = "#3F7D58";

const statusBadge: Record<string, string> = {
  "Em análise": "bg-amber-100 text-amber-800 border-amber-200",
  "Aguardando seguradora": "bg-blue-100 text-blue-800 border-blue-200",
  Pago: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Concluído: "bg-[#F5E9D7] text-[#8B1A1A] border-[#E8DCCB]",
  Cancelado: "bg-red-100 text-red-800 border-red-200",
};

function formatCreatedAt(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString())
    return `Hoje, ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  if (d.toDateString() === yesterday.toDateString())
    return `Ontem, ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  return d.toLocaleDateString("pt-BR");
}

export function Dashboard() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [monthlyClaims, setMonthlyClaims] = useState<MonthlyClaimsItem[]>([]);
  const [monthlySinistrality, setMonthlySinistrality] = useState<MonthlySinistralityItem[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      getDashboardSummary(),
      getDashboardMonthlyClaims(),
      getDashboardMonthlySinistrality(),
      getDashboardRecentActivities(),
    ])
      .then(([s, mc, ms, ra]) => {
        setSummary(s);
        setMonthlyClaims(mc);
        setMonthlySinistrality(ms);
        setRecentActivities(ra);
      })
      .catch((err: Error) => setError(err.message || "Erro ao carregar dashboard."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 text-sm">Carregando dados do dashboard...</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-red-700">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <p className="text-sm font-medium">{error ?? "Erro ao carregar dashboard."}</p>
      </div>
    );
  }

  const volumeTotal = monthlyClaims.reduce((s, m) => s + m.total, 0);
  const indiceMedia = monthlySinistrality.length
    ? (monthlySinistrality.reduce((s, m) => s + m.rate, 0) / monthlySinistrality.length).toFixed(1)
    : "0";

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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 — Sinistros Ativos */}
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
            <p className="text-3xl font-bold text-gray-900 mt-2">{summary.active_claims}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                em aberto
              </span>
              <ArrowRight className="w-4 h-4 text-gray-200 group-hover:text-[#8B1A1A] transition-colors" />
            </div>
          </div>
        </button>

        {/* Card 2 — Sinistralidade */}
        <div className="text-left bg-white rounded-2xl border border-[#E8DCCB] shadow-sm p-5 flex flex-col justify-between min-h-[120px]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Sinistralidade</p>
            <div className="w-9 h-9 rounded-xl bg-[#EAF3EE] border border-[#CFE3D7] flex items-center justify-center text-[#3F7D58] shrink-0">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {summary.sinistrality_rate.toFixed(1).replace(".", ",")}
              <span className="text-xl text-gray-400 font-semibold">%</span>
            </p>
            <div className="mt-2">
              <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> lojas afetadas
              </span>
            </div>
          </div>
        </div>

        {/* Card 3 — Tempo Médio */}
        <div className="text-left bg-white rounded-2xl border border-[#E8DCCB] shadow-sm p-5 flex flex-col justify-between min-h-[120px]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Tempo Médio</p>
            <div className="w-9 h-9 rounded-xl bg-[#FAF7F2] border border-[#E8DCCB] flex items-center justify-center text-[#8B1A1A] shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {summary.average_resolution_hours}
              <span className="text-xl text-gray-400 font-semibold">h</span>
            </p>
            <div className="mt-2">
              <span className="text-xs text-gray-400">resolução de sinistros</span>
            </div>
          </div>
        </div>

        {/* Card 4 — Total últimos 12 meses */}
        <div className="bg-white rounded-2xl border border-[#E8DCCB] shadow-sm p-5 flex flex-col justify-between min-h-[120px]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Últ. 12 meses</p>
            <div className="w-9 h-9 rounded-xl bg-[#FAF7F2] border border-[#E8DCCB] flex items-center justify-center text-[#8B1A1A] shrink-0">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900 mt-2">{summary.last_12_months_total}</p>
            <p className="text-xs text-gray-400 mt-2">sinistros registrados</p>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CHART A — Volume */}
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
              <div className="text-2xl font-bold text-[#8B1A1A]">{volumeTotal}</div>
              <div className="text-xs text-gray-400">ocorrências</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyClaims} margin={{ top: 16, right: 4, left: -8, bottom: 0 }} accessibilityLayer={false}>
              <defs>
                <linearGradient id="volumeBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BRAND} />
                  <stop offset="100%" stopColor="#B83232" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DCCB" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 11 }} dy={6} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 11 }} />
              <Tooltip
                cursor={{ fill: "#FAF7F2" }}
                contentStyle={{ borderRadius: "12px", border: "1px solid #E8DCCB", fontSize: 12 }}
                formatter={(value: number) => [`${value} sinistros`, "Volume"]}
              />
              <Bar dataKey="total" fill="url(#volumeBar)" radius={[5, 5, 0, 0]} barSize={28}
                label={{ position: "top", fill: "#8B1A1A", fontSize: 10, fontWeight: 700 }} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
            <Info className="w-3 h-3 shrink-0" /> Quantidade absoluta de eventos no período.
          </p>
        </div>

        {/* CHART B — Índice */}
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
              <div className="text-2xl font-bold text-[#3F7D58]">{indiceMedia}%</div>
              <div className="text-xs text-gray-400">média do período</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={monthlySinistrality} margin={{ top: 16, right: 4, left: -8, bottom: 0 }} accessibilityLayer={false}>
              <defs>
                <linearGradient id="indiceArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BRAND_GREEN} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={BRAND_GREEN} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DCCB" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 11 }} dy={6} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 11 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "1px solid #E8DCCB", fontSize: 12 }}
                formatter={(value: number) => [`${value}%`, "Índice"]}
              />
              <Area type="monotone" dataKey="rate" stroke="none" fill="url(#indiceArea)" />
              <Line type="monotone" dataKey="rate" stroke={BRAND_GREEN} strokeWidth={2.5}
                dot={{ r: 4, fill: BRAND_GOLD, stroke: BRAND_GREEN, strokeWidth: 2 }}
                activeDot={{ r: 6, fill: BRAND_GOLD, stroke: BRAND_GREEN, strokeWidth: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
            <Info className="w-3 h-3 shrink-0" /> % de lojas afetadas em relação ao total de LUCs.
          </p>
        </div>
      </div>

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

        <div className="divide-y divide-[#F3EDE4]">
          {recentActivities.length === 0 && (
            <p className="text-sm text-gray-400 px-5 py-4">Nenhuma atividade recente.</p>
          )}
          {recentActivities.map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#FAF7F2] transition-colors">
              <div className="w-8 h-8 rounded-xl bg-[#FAF7F2] border border-[#E8DCCB] flex items-center justify-center text-[#8B1A1A] shrink-0">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-gray-900 text-sm">{a.store_name || a.store}</span>
                  {a.luc && (
                    <span className="text-[10px] font-bold text-[#8B1A1A] bg-[#F5E9D7] border border-[#E8DCCB] rounded px-1.5 py-0.5">
                      LUC {a.luc}
                    </span>
                  )}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusBadge[a.status] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
                    {a.status}
                  </span>
                  {a.tenant_notified && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      Lojista Notificado
                    </span>
                  )}
                  {a.irregular_policy && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-[#D93030] border border-red-200">
                      Apólice Irregular
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{a.id} · {formatCreatedAt(a.created_at)}</p>
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
      </div>
    </div>
  );
}
