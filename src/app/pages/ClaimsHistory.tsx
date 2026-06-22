import { useState, useEffect, useRef } from "react";
import {
  Search, ChevronLeft, ChevronRight, Eye, X,
} from "lucide-react";
import { Link } from "react-router";
import { getClaimsHistory } from "../api";
import type { ApiClaim } from "../api";

type ClaimStatus = "Em análise" | "Aguardando seguradora" | "Pago" | "Concluído" | "Cancelado";
type ClaimSeverity = "Alta" | "Média" | "Baixa";

const STATUS_STYLES: Record<ClaimStatus, string> = {
  "Em análise": "bg-amber-100 text-amber-800 border-amber-200",
  "Aguardando seguradora": "bg-blue-100 text-blue-800 border-blue-200",
  "Pago": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Concluído": "bg-[#F5E9D7] text-[#8B1A1A] border-[#E8DCCB]",
  "Cancelado": "bg-red-100 text-red-800 border-red-200",
};

const SEVERITY_STYLES: Record<ClaimSeverity, string> = {
  "Alta": "bg-red-100 text-red-800 border-red-200",
  "Média": "bg-amber-100 text-amber-800 border-amber-200",
  "Baixa": "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const AREAS = [
  "Manutenção", "Brigada", "Engenharia", "Conservação",
  "Relacionamento", "Segurança / CFTV", "Estacionamento", "Arquitetura",
];

function formatDate(iso: string): string {
  if (!iso) return "—";
  return iso.split("-").reverse().join("/");
}

function pageRange(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

export function ClaimsHistory() {
  // Dados
  const [items, setItems] = useState<ApiClaim[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Filtros
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [responsibilityFilter, setResponsibilityFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const cancelRef = useRef(false);

  // Debounce da busca
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Resetar página quando filtros (não busca) mudam
  useEffect(() => {
    setPage(1);
  }, [statusFilter, severityFilter, areaFilter, responsibilityFilter, startDate, endDate]);

  // Fetch principal
  useEffect(() => {
    cancelRef.current = false;
    setLoading(true);
    setError(false);

    getClaimsHistory({
      search: debouncedSearch,
      status: statusFilter,
      severity: severityFilter,
      area: areaFilter,
      responsibility: responsibilityFilter,
      start_date: startDate,
      end_date: endDate,
      page,
      limit: 10,
    })
      .then((result) => {
        if (cancelRef.current) return;
        setItems(result.items ?? []);
        setTotalPages(result.total_pages ?? 1);
        setTotal(result.total ?? 0);
      })
      .catch(() => {
        if (!cancelRef.current) setError(true);
      })
      .finally(() => {
        if (!cancelRef.current) setLoading(false);
      });

    return () => { cancelRef.current = true; };
  }, [page, debouncedSearch, statusFilter, severityFilter, areaFilter, responsibilityFilter, startDate, endDate]);

  const hasActiveFilters =
    searchInput !== "" || statusFilter !== "" || severityFilter !== "" ||
    areaFilter !== "" || responsibilityFilter !== "" || startDate !== "" || endDate !== "";

  const clearFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setStatusFilter("");
    setSeverityFilter("");
    setAreaFilter("");
    setResponsibilityFilter("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#8B1A1A]">Histórico de Sinistros</h1>
          <p className="text-sm text-gray-400 mt-1">
            Consulte e rastreie todas as ocorrências registradas no shopping.
          </p>
        </div>

      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">Filtros</p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-[#D93030] hover:underline flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Limpar filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
            <input
              type="text"
              placeholder="Buscar por Nº, Loja, Área..."
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] focus:bg-white outline-none transition-all text-sm text-gray-800 placeholder:text-gray-400"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-50 border border-gray-100 text-gray-700 px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] outline-none cursor-pointer text-sm appearance-none transition-all"
          >
            <option value="">Status: Todos</option>
            <option value="Em análise">Em análise</option>
            <option value="Aguardando seguradora">Aguardando seguradora</option>
            <option value="Pago">Pago</option>
            <option value="Concluído">Concluído</option>
            <option value="Cancelado">Cancelado</option>
          </select>

          {/* Gravidade */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-gray-50 border border-gray-100 text-gray-700 px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] outline-none cursor-pointer text-sm appearance-none transition-all"
          >
            <option value="">Gravidade: Todas</option>
            <option value="Alta">Alta</option>
            <option value="Média">Média</option>
            <option value="Baixa">Baixa</option>
          </select>

          {/* Área */}
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="bg-gray-50 border border-gray-100 text-gray-700 px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] outline-none cursor-pointer text-sm appearance-none transition-all"
          >
            <option value="">Área: Todas</option>
            {AREAS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {/* Responsabilidade */}
          <select
            value={responsibilityFilter}
            onChange={(e) => setResponsibilityFilter(e.target.value)}
            className="bg-gray-50 border border-gray-100 text-gray-700 px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] outline-none cursor-pointer text-sm appearance-none transition-all"
          >
            <option value="">Responsabilidade: Todas</option>
            <option value="Externa">Externa</option>
            <option value="Interna">Interna</option>
          </select>

          {/* Data inicial */}
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            title="Data inicial"
            className="bg-gray-50 border border-gray-100 text-gray-700 px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] outline-none text-sm transition-all"
          />

          {/* Data final */}
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            title="Data final"
            className="bg-gray-50 border border-gray-100 text-gray-700 px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] outline-none text-sm transition-all"
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden w-full">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-600">Data</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-600">Loja</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-600">Área Responsável</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-600">Gravidade</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-600">Status</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-600">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-sm text-gray-400">
                    Carregando...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-sm text-red-400">
                    Erro ao carregar sinistros. Verifique a conexão com o servidor.
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-sm text-gray-400">
                    Nenhum sinistro encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                items.map((claim) => (
                  <tr key={claim.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {formatDate(claim.date)}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900 text-sm">{claim.store}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <p className="text-xs text-gray-400">{claim.id}</p>
                        {claim.employeeName && (
                          <span className="text-xs text-gray-400">· {claim.employeeName}</span>
                        )}
                        {claim.tenantNotified && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                            Lojista Notificado
                          </span>
                        )}
                        {claim.irregularPolicy && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-[#D93030] border border-red-100">
                            Apólice Irregular
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500 max-w-[180px] truncate">
                      {claim.responsibleArea || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${SEVERITY_STYLES[claim.severity as ClaimSeverity] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
                        {claim.severity}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[claim.status as ClaimStatus] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
                        {claim.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <Link
                        to={`/sinistro/${claim.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#8B1A1A] border border-gray-100 hover:border-[#8B1A1A]/30 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="px-5 py-3.5 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-gray-400">
            Página {page} de {totalPages} · {total} registro{total !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-1 flex-wrap justify-center">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="p-2 border border-gray-100 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-[#8B1A1A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {pageRange(page, totalPages).map((p, idx) =>
              p === "…" ? (
                <span key={`e${idx}`} className="px-1 text-gray-400 text-xs select-none">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  disabled={loading}
                  className={`min-w-[34px] h-8 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                    page === p
                      ? "bg-[#8B1A1A] text-white shadow-sm"
                      : "border border-gray-100 text-gray-500 hover:border-[#8B1A1A]/30 hover:text-[#8B1A1A]"
                  }`}
                >
                  {p}
                </button>
              )
            )}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="p-2 border border-gray-100 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-[#8B1A1A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
