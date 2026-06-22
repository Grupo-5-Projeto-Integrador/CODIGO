import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  FileText,
  Calendar as CalendarIcon,
  Search,
  ChevronDown,
  Tag,
  Store,
  ListChecks,
  Target,
  Loader2,
} from "lucide-react";
import { fetchReportClaims, downloadFinalReport } from "../../apiClient";
import type { ClaimStatus, ClaimSeverity } from "../../types";

export function Reports() {
  const [rawClaims, setRawClaims] = useState<any[]>([]);
  const [periodFrom, setPeriodFrom] = useState("2026-04-01");
  const [periodTo, setPeriodTo] = useState("2026-04-27");
  const [unitLucSearch, setUnitLucSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "Todos" | ClaimStatus
  >("Todos");
  const [selectedAreas, setSelectedAreas] = useState<string[]>(
    [],
  );
  const [severityFilter, setSeverityFilter] = useState<
    "Todas" | ClaimSeverity
  >("Todas");
  const [responsibility, setResponsibility] = useState<
    "Todos" | "Interna" | "Externa"
  >("Todos");
  const [category, setCategory] = useState("todos");
  const [isGenerating, setIsGenerating] = useState(false);

  const allAreas = [
    "Manutenção",
    "Brigada",
    "Engenharia",
    "Conservação",
    "Relacionamento",
    "Segurança / CFTV",
    "Estacionamento",
    "Arquitetura",
  ];

  // Fetch report data dynamically from backend reports endpoint
  const fetchReportData = async () => {
    setIsGenerating(true);
    try {
      const params = new URLSearchParams();
      if (periodFrom) params.append("start_date", periodFrom);
      if (periodTo) params.append("end_date", periodTo);
      if (unitLucSearch) params.append("search", unitLucSearch);
      if (statusFilter !== "Todos") params.append("status", statusFilter);
      if (severityFilter !== "Todas") params.append("severity", severityFilter);
      if (category !== "todos") params.append("category", category);
      if (responsibility !== "Todos") params.append("responsibility", responsibility);
      if (selectedAreas.length > 0) {
        selectedAreas.forEach((area) => {
          params.append("responsible_area", area);
        });
      }

      const data = await fetchReportClaims(params.toString());
      setRawClaims(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao buscar dados do relatório");
    } finally {
      setIsGenerating(false);
    }
  };

  // Run on mount & when filters change to keep A4 preview fully synced in real-time
  useEffect(() => {
    fetchReportData();
  }, [
    periodFrom,
    periodTo,
    unitLucSearch,
    statusFilter,
    selectedAreas,
    severityFilter,
    responsibility,
    category,
  ]);

  const filteredClaims = useMemo(() => {
    return Array.isArray(rawClaims) ? rawClaims : [];
  }, [rawClaims]);

  const handleGenerateReport = () => {
    fetchReportData().then(() => {
      toast.success("Relatório Final gerado com sucesso");
    });
  };

  const handleDownloadFinalReport = async (format: "pdf" | "excel") => {
    try {
      const params = new URLSearchParams();
      if (periodFrom) params.append("start_date", periodFrom);
      if (periodTo) params.append("end_date", periodTo);
      if (unitLucSearch) params.append("search", unitLucSearch);
      if (statusFilter !== "Todos") params.append("status", statusFilter);
      if (severityFilter !== "Todas") params.append("severity", severityFilter);
      if (category !== "todos") params.append("category", category);
      if (responsibility !== "Todos") params.append("responsibility", responsibility);
      if (selectedAreas.length > 0) {
        selectedAreas.forEach((area) => {
          params.append("responsible_area", area);
        });
      }

      toast.info(`Gerando e baixando relatório em ${format.toUpperCase()}...`);
      const blob = await downloadFinalReport(format, params.toString());
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      const extension = format === "pdf" ? "pdf" : "xlsx";
      link.setAttribute("download", `Relatorio_Final_${Date.now()}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success(`Relatório em ${format.toUpperCase()} baixado com sucesso!`);
    } catch (err) {
      console.error(err);
      toast.error(`Erro ao baixar relatório em ${format.toUpperCase()}`);
    }
  };

  const toggleArea = (area: string) => {
    setSelectedAreas((prev) =>
      prev.includes(area)
        ? prev.filter((a) => a !== area)
        : [...prev, area],
    );
  };

  const getSeverityBadge = (severity: ClaimSeverity) => {
    const styles = {
      Alta: "bg-red-100 text-red-800 border-red-200",
      Média: "bg-amber-100 text-amber-800 border-amber-200",
      Baixa:
        "bg-emerald-100 text-emerald-800 border-emerald-200",
    };
    return styles[severity] || "";
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "32px",
      }}
    >
      {/* TOP SECTION: DYNAMIC FILTER GRID */}
      <div className="bg-white border border-[#E8DCCB] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#FAF7F2] border border-[#E8DCCB] flex items-center justify-center">
              <FileText className="w-4 h-4 text-[#8B1A1A]" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">
              Filtros de Relatório
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Input 1: Period (Date Range) */}
          <div className="col-span-1 md:col-span-2 lg:col-span-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 block flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5" /> Período
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={periodFrom}
                onChange={(e) => setPeriodFrom(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-[#E8DCCB] rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-[#8B1A1A] focus:border-[#8B1A1A] hover:border-[#8B1A1A] active:bg-[#FAF7F2] outline-none cursor-pointer transition-all"
              />
              <input
                type="date"
                value={periodTo}
                onChange={(e) => setPeriodTo(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-[#E8DCCB] rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-[#8B1A1A] focus:border-[#8B1A1A] hover:border-[#8B1A1A] active:bg-[#FAF7F2] outline-none cursor-pointer transition-all"
              />
            </div>
          </div>

          {/* Input 2: Unit/LUC (Searchable) */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 block flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5" /> Unidade / LUC
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={unitLucSearch}
                onChange={(e) =>
                  setUnitLucSearch(e.target.value)
                }
                placeholder="Nome da loja ou LUC..."
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E8DCCB] rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-[#8B1A1A] focus:border-[#8B1A1A] hover:border-[#8B1A1A] active:bg-[#FAF7F2] outline-none transition-all"
              />
            </div>
          </div>

          {/* Input 3: Status */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 block flex items-center gap-1.5">
              <ListChecks className="w-3.5 h-3.5" /> Status
            </label>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as typeof statusFilter,
                  )
                }
                className="w-full appearance-none pl-3 pr-9 py-2.5 bg-white border border-[#E8DCCB] rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-[#8B1A1A] focus:border-[#8B1A1A] hover:border-[#8B1A1A] active:bg-[#FAF7F2] outline-none cursor-pointer transition-all"
              >
                <option value="Todos">Todos os Status</option>
                <option value="Em análise">Em análise</option>
                <option value="Aguardando seguradora">
                  Aguardando seguradora
                </option>
                <option value="Pago">Pago</option>
                <option value="Concluído">Concluído</option>
                <option value="Cancelado">Cancelado</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Input 4: Gravidade */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 block">
              Gravidade
            </label>
            <div className="relative">
              <select
                value={severityFilter}
                onChange={(e) =>
                  setSeverityFilter(
                    e.target.value as typeof severityFilter,
                  )
                }
                className="w-full appearance-none pl-3 pr-9 py-2.5 bg-white border border-[#E8DCCB] rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-[#8B1A1A] focus:border-[#8B1A1A] hover:border-[#8B1A1A] active:bg-[#FAF7F2] outline-none cursor-pointer transition-all"
              >
                <option value="Todas">
                  Todas as Gravidades
                </option>
                <option value="Alta">Alta</option>
                <option value="Média">Média</option>
                <option value="Baixa">Baixa</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Input 5: Categoria */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 block flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> Categoria
            </label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full appearance-none pl-3 pr-9 py-2.5 bg-white border border-[#E8DCCB] rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-[#8B1A1A] focus:border-[#8B1A1A] hover:border-[#8B1A1A] active:bg-[#FAF7F2] outline-none cursor-pointer transition-all"
              >
                <option value="todos">
                  Todas as Categorias
                </option>
                <option value="vazamento">
                  Vazamento / Infiltração
                </option>
                <option value="incendio">Incêndio</option>
                <option value="dano">
                  Dano Físico / Vandalismo
                </option>
                <option value="furto">Furto / Roubo</option>
                <option value="acidente">
                  Acidente Pessoal
                </option>
                <option value="desastre">
                  Desastre Natural
                </option>
                <option value="estrutural">
                  Dano Estrutural
                </option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Input 6: Responsabilidade */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 block">
              Responsabilidade
            </label>
            <div className="flex gap-2">
              {(["Todos", "Interna", "Externa"] as const).map(
                (resp) => (
                  <button
                    key={resp}
                    onClick={() => setResponsibility(resp)}
                    className={`flex-1 px-3 py-2.5 text-sm font-medium rounded-lg border transition-all ${
                      responsibility === resp
                        ? "bg-[#8B1A1A] text-white border-[#8B1A1A] shadow-sm"
                        : "bg-white text-gray-700 border-[#E8DCCB] hover:border-[#8B1A1A] hover:bg-[#FAF7F2] active:bg-[#FAF7F2]"
                    }`}
                  >
                    {resp}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Input 7: Área (Multi-select) — ocupa a linha inteira */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 block flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" /> Área
            </label>
            <div className="flex flex-wrap gap-2">
              {allAreas.map((area) => (
                <button
                  key={area}
                  onClick={() => toggleArea(area)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                    selectedAreas.includes(area)
                      ? "bg-[#8B1A1A] text-white border-[#8B1A1A] shadow-sm"
                      : "bg-white text-gray-700 border-[#E8DCCB] hover:border-[#8B1A1A] hover:bg-[#FAF7F2] active:bg-[#FAF7F2]"
                  }`}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Trigger */}
        <div className="mt-6 pt-6 border-t border-[#E8DCCB] flex justify-end">
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="flex items-center gap-2 bg-[#8B1A1A] text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-[#701515] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Gerar Relatório Final
              </>
            )}
          </button>
        </div>
      </div>

      {/* BOTTOM SECTION: DOCUMENT PREVIEW */}
      <div className="bg-white border border-[#E8DCCB] rounded-2xl p-6 shadow-sm flex flex-col gap-6">
        {/* Sleek Action Bar for downloads */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E8DCCB]">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Visualização do Relatório Final (A4)</h3>
            <p className="text-xs text-gray-500">Exporte este relatório consolidado para PDF executivo ou Excel multi-abas</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleDownloadFinalReport("pdf")}
              className="flex items-center gap-2 px-4 py-2 bg-[#8B1A1A] hover:bg-[#701515] text-white text-xs font-semibold rounded-lg shadow-sm transition-all hover:shadow active:scale-[0.98]"
            >
              <FileText className="w-3.5 h-3.5" />
              Exportar PDF Executivo
            </button>
            <button
              onClick={() => handleDownloadFinalReport("excel")}
              className="flex items-center gap-2 px-4 py-2 bg-[#1E7145] hover:bg-[#154F30] text-white text-xs font-semibold rounded-lg shadow-sm transition-all hover:shadow active:scale-[0.98]"
            >
              <FileText className="w-3.5 h-3.5" />
              Exportar Planilha Excel
            </button>
          </div>
        </div>

        <div className="max-h-[800px] overflow-y-auto bg-gray-50 dark:bg-zinc-900/50 p-6 rounded-xl border border-gray-100 dark:border-zinc-800">
          {/* A4 Document Canvas */}
          <div
            className="bg-white shadow-xl mx-auto dark:text-gray-900"
            style={{
              width: "210mm",
              minHeight: "297mm",
              padding: "20mm",
            }}
          >
            {/* Header */}
            <div className="border-b-2 border-[#8B1A1A] pb-6 mb-8">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-[#8B1A1A] mb-2">
                    Flamboyant Shopping
                  </h1>
                  <p className="text-sm text-gray-600 italic">
                    Elevar para evoluir, envolver para encantar
                  </p>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <p>Relatório de Sinistros</p>
                  <p>
                    Período: {periodFrom} a {periodTo}
                  </p>
                  <p>
                    Gerado em:{" "}
                    {new Date().toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            </div>

            {/* Body: Data Table */}
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                Sinistros Registrados
              </h2>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FAF7F2] border-b-2 border-[#8B1A1A]">
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">
                      Data
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">
                      Loja
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">
                      Área Responsável
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">
                      Responsabilidade
                    </th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">
                      Impacto
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClaims.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-center py-8 text-gray-500"
                      >
                        Nenhum sinistro encontrado para os
                        filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredClaims.map((claim) => {
                      let formattedDate = "Data N/A";
                      if (claim.date && typeof claim.date === "string") {
                        const parts = claim.date.split("-");
                        if (parts.length === 3) {
                          const [year, month, day] = parts;
                          formattedDate = `${day}/${month}/${year}`;
                        } else {
                          formattedDate = claim.date;
                        }
                      }
                      
                      const storeName = claim.store ? claim.store.split(" - ")[0] : "N/A";
                      
                      return (
                        <tr
                          key={claim.id}
                          className="border-b border-gray-200"
                        >
                          <td className="py-2 px-3 text-gray-700">
                            {formattedDate}
                          </td>
                          <td className="py-2 px-3 text-gray-800 font-medium">
                            {storeName}
                          </td>
                          <td className="py-2 px-3 text-gray-700">
                            {claim.responsibleArea || "Não definida"}
                          </td>
                          <td className="py-2 px-3 text-gray-700">
                            {claim.responsibility || "Não definida"}
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${getSeverityBadge(claim.severity)}`}
                            >
                              {claim.severity}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Signature Block (Dedicated Section at the end of Content Body) */}
            <div className="mt-16 mb-8 flex flex-col items-center justify-center text-center">
              <div className="w-64 border-t border-gray-300 my-2"></div>
              <p className="text-xs font-bold text-gray-800">
                Gerente de Operações - JP Mall
              </p>
              <p className="text-[10px] text-gray-500 italic">
                Assinatura Digital / Autorização Técnica
              </p>
              <p className="text-[10px] text-gray-400 italic mt-1">
                Data de Emissão: {new Date().toLocaleDateString("pt-BR")}
              </p>
            </div>

            {/* Page Footer (Signature-Free) */}
            <div className="border-t border-gray-200 pt-4 mt-12 flex justify-between items-center text-[10px] text-gray-500">
              <div className="text-left">
                <span className="font-semibold text-gray-700">Flamboyant Shopping Center</span>
                <span className="mx-1.5">•</span>
                <span>Av. Deputado Jamel Cecílio, 3.300 - Jardim Goiás, Goiânia - GO</span>
                <span className="mx-1.5">•</span>
                <span>Tel: (62) 3250-5000</span>
              </div>
              <div className="text-right whitespace-nowrap font-medium text-gray-400">
                Página 1 de 1
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}