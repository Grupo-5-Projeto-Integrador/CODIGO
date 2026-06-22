import { useMemo, useState, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Link } from "react-router";
import { fetchClaims } from "../../apiClient";
import type { ClaimStatus, ClaimSeverity } from "../../types";

type Claim = {
  id: string;
  store: string;
  date: string;
  responsibleArea: string;
  status: ClaimStatus;
  severity: ClaimSeverity;
  tenantNotified?: boolean;
  irregularPolicy?: boolean;
  employeeName?: string;
};

const formatClaimsForHistory = (allClaims: any[]): Claim[] => {
  return allClaims.map((claim) => {
    const store = (claim.store || "").split(' - LUC ')[0] || claim.store;
    const [year, month, day] = (claim.date || "").split('-');
    return {
      id: claim.id,
      store,
      date: day && month && year ? `${day}/${month}/${year}` : claim.date,
      responsibleArea: claim.responsibleArea || 'Não definida',
      status: claim.status as ClaimStatus,
      severity: claim.severity as ClaimSeverity,
      tenantNotified: claim.tenantNotified,
      irregularPolicy: claim.irregularPolicy,
      employeeName: claim.employeeName,
    };
  });
};

const getPaginatedClaims = (allClaims: Claim[], itemsPerPage: number = 5): Claim[][] => {
  const pages: Claim[][] = [];
  for (let i = 0; i < allClaims.length; i += itemsPerPage) {
    pages.push(allClaims.slice(i, i + itemsPerPage));
  }
  return pages.length > 0 ? pages : [[]];
};

const getStatusStyles = (status: ClaimStatus) => {
  switch (status) {
    case "Em análise":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "Aguardando seguradora":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "Pago":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "Concluído":
      return "bg-[#F5E9D7] text-[#8B1A1A] border-[#E8DCCB]";
    case "Cancelado":
      return "bg-red-100 text-red-800 border-red-200";
  }
};

const getSeverityStyles = (severity: ClaimSeverity) => {
  switch (severity) {
    case "Alta":
      return "bg-red-100 text-red-800 border-red-200";
    case "Média":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "Baixa":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }
};

export function ClaimsHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Todos" | ClaimStatus>("Todos");
  const [severityFilter, setSeverityFilter] = useState<"Todas" | ClaimSeverity>("Todas");
  const [currentPage, setCurrentPage] = useState(1);
  const [rawClaims, setRawClaims] = useState<any[]>([]);

  useEffect(() => {
    fetchClaims().then(setRawClaims).catch(() => setRawClaims([]));
  }, []);

  const allFormattedClaims = useMemo(() => formatClaimsForHistory(rawClaims), [rawClaims]);

  // Apply filters to entire formatted claims first
  const filteredClaims = useMemo(() => {
    return allFormattedClaims.filter((claim) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        term === "" ||
        claim.id.toLowerCase().includes(term) ||
        claim.store.toLowerCase().includes(term) ||
        claim.responsibleArea.toLowerCase().includes(term) ||
        (claim.employeeName || "").toLowerCase().includes(term);
      const matchesStatus = statusFilter === "Todos" || claim.status === statusFilter;
      const matchesSeverity = severityFilter === "Todas" || claim.severity === severityFilter;
      return matchesSearch && matchesStatus && matchesSeverity;
    });
  }, [allFormattedClaims, searchTerm, statusFilter, severityFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, severityFilter]);

  const pages = useMemo(() => getPaginatedClaims(filteredClaims), [filteredClaims]);
  const TOTAL_PAGES = pages.length;

  const visibleClaims = useMemo(() => {
    return pages[currentPage - 1] ?? [];
  }, [currentPage, pages]);

  const totalRecords = filteredClaims.length;

  const goToPage = (page: number) => {
    if (page >= 1 && page <= TOTAL_PAGES) setCurrentPage(page);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#8B1A1A]">Histórico de Sinistros</h1>
          <p className="text-gray-600 mt-1">
            Consulte e rastreie todas as ocorrências registradas no shopping.
          </p>
        </div>
      </div>

      {/* Filters — clean: search + 2 dropdowns */}
      <div className="bg-[#FAF7F2] p-4 rounded-xl shadow-sm border border-[#E8DCCB]">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por Nº do Sinistro, Loja, LUC ou descrição..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E8DCCB] rounded-lg focus:ring-2 focus:ring-[#8B1A1A] focus:border-transparent outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="bg-white border border-[#E8DCCB] text-gray-700 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-[#8B1A1A] outline-none cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          >
            <option value="Todos">Status: Todos</option>
            <option value="Em análise">Em análise</option>
            <option value="Aguardando seguradora">Aguardando seguradora</option>
            <option value="Pago">Pago</option>
            <option value="Concluído">Concluído</option>
            <option value="Cancelado">Cancelado</option>
          </select>

          <select
            className="bg-white border border-[#E8DCCB] text-gray-700 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-[#8B1A1A] outline-none cursor-pointer"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as typeof severityFilter)}
          >
            <option value="Todas">Gravidade: Todas</option>
            <option value="Alta">Alta</option>
            <option value="Média">Média</option>
            <option value="Baixa">Baixa</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#FAF7F2] rounded-xl shadow-sm border border-[#E8DCCB] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#E8DCCB]/50 dark:bg-[#252545] border-b border-[#E8DCCB] dark:border-[#2E3447]">
                <th className="px-6 py-4 text-sm font-semibold text-[#8B1A1A] dark:text-[#e03030]">Data</th>
                <th className="px-6 py-4 text-sm font-semibold text-[#8B1A1A] dark:text-[#e03030]">Loja</th>
                <th className="px-6 py-4 text-sm font-semibold text-[#8B1A1A] dark:text-[#e03030]">Área Responsável</th>
                <th className="px-6 py-4 text-sm font-semibold text-[#8B1A1A] dark:text-[#e03030]">Gravidade</th>
                <th className="px-6 py-4 text-sm font-semibold text-[#8B1A1A] dark:text-[#e03030]">Status</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-[#8B1A1A] dark:text-[#e03030]">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DCCB]">
              {visibleClaims.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Nenhum sinistro encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                visibleClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-white transition-colors">
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{claim.date}</td>
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-semibold text-gray-900">{claim.store}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-400">{claim.id}</p>
                        {claim.employeeName && (
                          <span className="text-xs text-gray-600">• {claim.employeeName}</span>
                        )}
                        {claim.tenantNotified && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            Lojista Notificado
                          </span>
                        )}
                        {claim.irregularPolicy && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-[#D93030] border border-red-200">
                            Apólice Irregular
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700 max-w-xs">{claim.responsibleArea}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getSeverityStyles(claim.severity)}`}
                      >
                        {claim.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusStyles(claim.status)}`}
                      >
                        {claim.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link
                        to={`/sinistro/${claim.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#8B1A1A] hover:bg-red-50 rounded-lg transition-colors"
                        title="Ver Detalhes"
                      >
                        <Eye className="w-4 h-4" />
                        Ver Detalhes
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-[#E8DCCB] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#FAF7F2]">
          <span className="text-sm text-gray-500">
            Página {currentPage} de {TOTAL_PAGES} · {visibleClaims.length} de {totalRecords} registros
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 border border-[#E8DCCB] rounded-lg text-gray-500 hover:bg-white hover:text-[#8B1A1A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => goToPage(page)}
                className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-semibold transition-all ${
                  currentPage === page
                    ? "bg-[#8B1A1A] text-white shadow-md"
                    : "border border-[#E8DCCB] text-gray-700 bg-white hover:border-[#8B1A1A] hover:text-[#8B1A1A]"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === TOTAL_PAGES}
              className="p-2 border border-[#E8DCCB] rounded-lg text-gray-500 hover:bg-white hover:text-[#8B1A1A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
