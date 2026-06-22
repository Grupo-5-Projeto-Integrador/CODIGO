import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  FileText,
  Calendar as CalendarIcon,
  ChevronDown,
  Tag,
  Store,
  ListChecks,
  Target,
  Loader2,
  Download,
  AlertCircle,
} from "lucide-react";
import {
  getStores,
  getReportClaims,
  getReportClaimsPdfUrl,
  getReportFinalExcelUrl,
  type ApiClaim,
  type ReportParams,
} from "../api";
import flamboyantLogo from "../../assets/flamboyant-logo.png";

// ── Multi-select dropdown ──────────────────────────────────────────────────
function MultiSelect({
  options,
  selected,
  onChange,
  placeholder,
  loading: optLoading,
}: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
    else setSearch("");
  }, [open]);

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

  const toggle = (val: string) =>
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);

  return (
    <div className="relative" ref={ref}>
      <div
        onClick={() => setOpen(o => !o)}
        className="w-full min-h-[42px] bg-gray-50 border border-gray-100 rounded-xl py-1.5 px-3 pr-9 text-sm cursor-pointer flex flex-wrap gap-1.5 items-center hover:border-[#8B1A1A] transition-all focus-within:border-[#8B1A1A] focus-within:bg-white"
      >
        {optLoading ? (
          <span className="text-gray-400 text-sm flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando lojas...</span>
        ) : selected.length === 0 ? (
          <span className="text-gray-400 text-sm">{placeholder}</span>
        ) : (
          selected.map(v => (
            <span key={v} className="inline-flex items-center gap-1 bg-[#8B1A1A]/10 text-[#8B1A1A] rounded-lg px-2 py-0.5 text-xs font-medium">
              {v}
              <button type="button" onClick={e => { e.stopPropagation(); onChange(selected.filter(s => s !== v)); }} className="hover:text-[#D93030]">
                ✕
              </button>
            </span>
          ))
        )}
      </div>
      <ChevronDown className={`w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none transition-transform ${open ? "rotate-180" : ""}`} />
      {open && !optLoading && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
              placeholder="Buscar por nome, LUC ou segmento..."
              className="w-full text-sm px-2 py-1.5 bg-gray-50 border border-gray-100 rounded-lg outline-none focus:border-[#8B1A1A]/40 focus:bg-white transition-all placeholder:text-gray-400"
            />
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-xs text-gray-400 text-center">Nenhuma loja encontrada</p>
            ) : filtered.map(opt => (
              <label key={opt} className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${selected.includes(opt) ? "bg-[#FAF7F2]" : ""}`}>
                <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} className="w-4 h-4 rounded border-gray-300 accent-[#8B1A1A]" />
                <span className="text-sm text-gray-800">{opt}</span>
              </label>
            ))}
          </div>
          {selected.length > 0 && (
            <div className="border-t border-gray-100 px-3 py-2">
              <button type="button" onClick={() => onChange([])} className="text-xs text-gray-400 hover:text-[#D93030] transition-colors">Limpar seleção</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  const parts = iso?.split("-");
  if (parts?.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return iso ?? "";
}

function severityBadge(severity: string): string {
  const styles: Record<string, string> = {
    Alta: "bg-red-100 text-red-800 border-red-200",
    Média: "bg-amber-100 text-amber-800 border-amber-200",
    Baixa: "bg-emerald-100 text-emerald-800 border-emerald-200",
  };
  return styles[severity] ?? "bg-gray-100 text-gray-700 border-gray-200";
}

function statusBadge(status: string): string {
  const styles: Record<string, string> = {
    "Em análise": "bg-amber-100 text-amber-800 border-amber-200",
    "Aguardando seguradora": "bg-blue-100 text-blue-800 border-blue-200",
    Pago: "bg-emerald-100 text-emerald-800 border-emerald-200",
    Concluído: "bg-[#F5E9D7] text-[#8B1A1A] border-[#E8DCCB]",
    Cancelado: "bg-red-100 text-red-800 border-red-200",
  };
  return styles[status] ?? "bg-gray-100 text-gray-700 border-gray-200";
}

const ALL_AREAS = [
  "Manutenção",
  "Brigada",
  "Engenharia",
  "Conservação",
  "Relacionamento",
  "Segurança / CFTV",
  "Estacionamento",
  "Arquitetura",
];

export function Reports() {
  // ── Filtros ──────────────────────────────────────────────────────────────
  const today = new Date();
  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const fmt2 = (d: Date) => d.toISOString().split("T")[0];

  const [periodFrom, setPeriodFrom] = useState(fmt2(sixMonthsAgo));
  const [periodTo, setPeriodTo] = useState(fmt2(today));
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [severityFilter, setSeverityFilter] = useState("Todas");
  const [responsibility, setResponsibility] = useState("Todos");
  const [category, setCategory] = useState("todos");

  // ── Dados ────────────────────────────────────────────────────────────────
  const [storeOptions, setStoreOptions] = useState<string[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [claims, setClaims] = useState<ApiClaim[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // ── Carregar lojas do banco ───────────────────────────────────────────────
  useEffect(() => {
    setStoresLoading(true);
    getStores()
      .then(stores => {
        setStoreOptions(stores.map(s => `${s.name} - LUC ${s.code}`));
      })
      .catch(err => {
        toast.error("Erro ao carregar lojas: " + (err as Error).message);
      })
      .finally(() => setStoresLoading(false));
  }, []);

  // ── Montar params de filtro ───────────────────────────────────────────────
  const buildParams = (): ReportParams => ({
    start_date: periodFrom || undefined,
    end_date: periodTo || undefined,
    status: statusFilter !== "Todos" ? statusFilter : undefined,
    severity: severityFilter !== "Todas" ? severityFilter : undefined,
    category: category !== "todos" ? category : undefined,
    responsibility: responsibility !== "Todos" ? responsibility : undefined,
    responsible_areas: selectedAreas.length > 0 ? selectedAreas : undefined,
    store_names: selectedStores.length > 0
      ? selectedStores.map(s => s.split(" - LUC ")[0])
      : undefined,
  });

  // ── Carregar sinistros sempre que os filtros mudam ────────────────────────
  useEffect(() => {
    setClaimsLoading(true);
    const params: ReportParams = {
      start_date: periodFrom || undefined,
      end_date: periodTo || undefined,
      status: statusFilter !== "Todos" ? statusFilter : undefined,
      severity: severityFilter !== "Todas" ? severityFilter : undefined,
      category: category !== "todos" ? category : undefined,
      responsibility: responsibility !== "Todos" ? responsibility : undefined,
      responsible_areas: selectedAreas.length > 0 ? selectedAreas : undefined,
      store_names: selectedStores.length > 0
        ? selectedStores.map(s => s.split(" - LUC ")[0])
        : undefined,
    };
    getReportClaims(params)
      .then(setClaims)
      .catch(err => {
        setClaims([]);
        toast.error("Erro ao carregar sinistros: " + (err as Error).message);
      })
      .finally(() => setClaimsLoading(false));
  }, [periodFrom, periodTo, selectedStores, statusFilter, selectedAreas, severityFilter, responsibility, category]);

  // ── Download PDF (backend) ────────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    setDownloadingPdf(true);
    try {
      const url = getReportClaimsPdfUrl(buildParams());
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "relatorio-sinistros-flamboyant.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast.success("PDF exportado com sucesso");
    } catch (err) {
      toast.error("Erro ao gerar PDF: " + (err as Error).message);
    } finally {
      setDownloadingPdf(false);
    }
  };

  // ── Download Excel (backend) ──────────────────────────────────────────────
  const handleDownloadExcel = async () => {
    try {
      const url = getReportFinalExcelUrl(buildParams());
      const res = await fetch(url);
      if (!res.ok) throw new Error("Erro ao gerar planilha");
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "relatorio-sinistros-flamboyant.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast.success("Planilha Excel exportada com sucesso");
    } catch (err) {
      toast.error("Erro ao gerar planilha: " + (err as Error).message);
    }
  };

  const toggleArea = (area: string) =>
    setSelectedAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );

  // ── Contadores do resumo ──────────────────────────────────────────────────
  const counts = {
    total: claims.length,
    alta: claims.filter(c => c.severity === "Alta").length,
    media: claims.filter(c => c.severity === "Média").length,
    baixa: claims.filter(c => c.severity === "Baixa").length,
    emAnalise: claims.filter(c => c.status === "Em análise").length,
    concluidos: claims.filter(c => c.status === "Concluído" || c.status === "Pago").length,
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* FILTROS */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
          <div className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-[#8B1A1A]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Filtros de Relatório</h2>
            <p className="text-xs text-gray-400 mt-0.5">Selecione os parâmetros para gerar o relatório.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Período */}
          <div className="col-span-1 md:col-span-2 lg:col-span-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 block flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5" /> Período
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={periodFrom} onChange={e => setPeriodFrom(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] focus:bg-white outline-none cursor-pointer transition-all" />
              <input type="date" value={periodTo} onChange={e => setPeriodTo(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] focus:bg-white outline-none cursor-pointer transition-all" />
            </div>
          </div>

          {/* Unidade / LUC — carregada do banco */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 block flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5" /> Unidade / LUC
            </label>
            <MultiSelect
              options={storeOptions}
              selected={selectedStores}
              onChange={setSelectedStores}
              placeholder="Selecione uma ou mais lojas..."
              loading={storesLoading}
            />
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 block flex items-center gap-1.5">
              <ListChecks className="w-3.5 h-3.5" /> Status
            </label>
            <div className="relative">
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="w-full appearance-none pl-3 pr-9 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] focus:bg-white outline-none cursor-pointer transition-all">
                <option value="Todos">Todos os Status</option>
                <option value="Em análise">Em análise</option>
                <option value="Aguardando seguradora">Aguardando seguradora</option>
                <option value="Pago">Pago</option>
                <option value="Concluído">Concluído</option>
                <option value="Cancelado">Cancelado</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Gravidade */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 block">Gravidade</label>
            <div className="relative">
              <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}
                className="w-full appearance-none pl-3 pr-9 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] focus:bg-white outline-none cursor-pointer transition-all">
                <option value="Todas">Todas as Gravidades</option>
                <option value="Alta">Alta</option>
                <option value="Média">Média</option>
                <option value="Baixa">Baixa</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Categoria */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 block flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> Categoria
            </label>
            <div className="relative">
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full appearance-none pl-3 pr-9 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] focus:bg-white outline-none cursor-pointer transition-all">
                <option value="todos">Todas as Categorias</option>
                <option value="vazamento">Vazamento / Infiltração</option>
                <option value="incendio">Incêndio</option>
                <option value="dano">Dano Físico / Vandalismo</option>
                <option value="furto">Furto / Roubo</option>
                <option value="acidente">Acidente Pessoal</option>
                <option value="desastre">Desastre Natural</option>
                <option value="estrutural">Dano Estrutural</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Responsabilidade */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 block">Responsabilidade</label>
            <div className="flex gap-2">
              {(["Todos", "Interna", "Externa"] as const).map(resp => (
                <button key={resp} onClick={() => setResponsibility(resp)}
                  className={`flex-1 px-3 py-2.5 text-sm font-medium rounded-lg border transition-all ${
                    responsibility === resp
                      ? "bg-[#8B1A1A] text-white border-[#8B1A1A] shadow-sm"
                      : "bg-gray-50 text-gray-700 border-gray-100 hover:border-[#8B1A1A]"
                  }`}>
                  {resp}
                </button>
              ))}
            </div>
          </div>

          {/* Área (multi-select) */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 block flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" /> Área Responsável
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_AREAS.map(area => (
                <button key={area} onClick={() => toggleArea(area)}
                  className={`px-3 py-2 text-xs font-medium rounded-xl border transition-all ${
                    selectedAreas.includes(area)
                      ? "bg-[#8B1A1A] text-white border-[#8B1A1A] shadow-sm"
                      : "bg-gray-50 text-gray-700 border-gray-100 hover:border-[#8B1A1A]"
                  }`}>
                  {area}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="mt-6 pt-5 border-t border-gray-100 flex flex-wrap justify-end gap-3">
          <button onClick={handleDownloadExcel}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1E7145] hover:bg-[#154F30] text-white text-sm font-semibold rounded-xl shadow-sm transition-all active:scale-[0.98]">
            <Download className="w-4 h-4" /> Exportar Excel
          </button>
          <button onClick={handleDownloadPDF} disabled={downloadingPdf}
            className="flex items-center gap-2 bg-[#8B1A1A] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#701515] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg">
            {downloadingPdf ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Gerando PDF...</>
            ) : (
              <><FileText className="w-4 h-4" /> Gerar Relatório PDF</>
            )}
          </button>
        </div>
      </div>

      {/* PREVIEW A4 */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {/* Barra do preview */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50/50">
          <div>
            <p className="text-sm font-bold text-gray-800">Visualização do Relatório (A4)</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {claimsLoading
                ? "Atualizando dados..."
                : `${counts.total} sinistro${counts.total !== 1 ? "s" : ""} encontrado${counts.total !== 1 ? "s" : ""} com os filtros aplicados`
              }
            </p>
          </div>
          {claimsLoading && <Loader2 className="w-4 h-4 animate-spin text-[#8B1A1A]" />}
        </div>

        <div className="max-h-[900px] overflow-y-auto bg-gray-100/60 p-6">
          {/* Documento A4 */}
          <div className="report-a4-page bg-white shadow-xl mx-auto dark:text-gray-900"
            style={{ width: "210mm", minHeight: "297mm", padding: "18mm 16mm" }}>

            {/* Cabeçalho institucional */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b-2 border-[#D98C94]">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden">
                  <img
                    src={flamboyantLogo}
                    alt="Logo Flamboyant"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-black text-[#D98C94] tracking-wide">FLAMBOYANT</h1>
                  <p className="text-[10px] text-[#D98C94]/70 tracking-wider">Shopping • Urbanismo • Instituto • Agropecuária</p>
                </div>
              </div>
              <div className="text-right text-xs text-gray-500 space-y-0.5">
                <p className="font-semibold text-gray-700">Relatório de Sinistros</p>
                <p>Período: {formatDate(periodFrom)} a {formatDate(periodTo)}</p>
                <p>Emitido em: {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            </div>

            {/* Bloco de metadados */}
            <div className="bg-[#FAF7F2] border border-[#E8DCCB] rounded-lg p-4 mb-6 text-xs">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                <div><span className="font-semibold text-gray-600">Documento:</span> <span className="text-gray-800">FLB-SIN-REL-{new Date().toISOString().replace(/[-:T]/g, "").slice(0,12)}</span></div>
                <div><span className="font-semibold text-gray-600">Total de registros:</span> <span className="text-gray-800">{counts.total}</span></div>
                <div><span className="font-semibold text-gray-600">Unidade:</span> <span className="text-gray-800">Flamboyant Shopping — Goiânia</span></div>
                <div><span className="font-semibold text-gray-600">Lojas filtradas:</span> <span className="text-gray-800">{selectedStores.length > 0 ? selectedStores.map(s => s.split(" - LUC ")[0]).join(", ") : "Todas"}</span></div>
              </div>
            </div>

            {/* Sumário gerencial */}
            {counts.total > 0 && (
              <>
                <p className="text-xs text-gray-600 italic mb-5 leading-relaxed">
                  Este relatório apresenta os registros de sinistros do Flamboyant Shopping conforme os filtros aplicados. No período analisado,
                  foram identificadas <strong>{counts.total}</strong> ocorrências, sendo <strong>{counts.alta}</strong> de alta gravidade,{" "}
                  <strong>{counts.media}</strong> de média gravidade e <strong>{counts.baixa}</strong> de baixa gravidade.
                  Entre os registros, <strong>{counts.emAnalise}</strong> encontram-se em análise e <strong>{counts.concluidos}</strong> já foram concluídos/pagos.
                </p>

                {/* Cards de indicadores */}
                <div className="grid grid-cols-6 gap-2 mb-6">
                  {[
                    { label: "Total", value: counts.total, color: "text-[#8B1A1A]" },
                    { label: "Alta", value: counts.alta, color: "text-red-700" },
                    { label: "Média", value: counts.media, color: "text-amber-700" },
                    { label: "Baixa", value: counts.baixa, color: "text-emerald-700" },
                    { label: "Em análise", value: counts.emAnalise, color: "text-blue-700" },
                    { label: "Concluídos", value: counts.concluidos, color: "text-gray-700" },
                  ].map(card => (
                    <div key={card.label} className="bg-white border border-[#E8DCCB] rounded-lg p-2.5 text-center">
                      <p className={`text-xl font-black ${card.color}`}>{card.value}</p>
                      <p className="text-[9px] text-gray-500 mt-0.5 leading-tight">{card.label}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Tabela analítica */}
            <h3 className="text-xs font-bold text-[#8B1A1A] uppercase tracking-wider mb-2">Tabela Detalhada de Sinistros</h3>
            {claimsLoading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Carregando sinistros...</span>
              </div>
            ) : claims.length === 0 ? (
              <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs">Nenhum sinistro encontrado para os filtros selecionados.</span>
              </div>
            ) : (
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="bg-[#8B1A1A] text-white">
                    <th className="py-2 px-2 font-semibold text-left">Data</th>
                    <th className="py-2 px-2 font-semibold text-left">Código</th>
                    <th className="py-2 px-2 font-semibold text-left">Loja / LUC</th>
                    <th className="py-2 px-2 font-semibold text-left">Tipo</th>
                    <th className="py-2 px-2 font-semibold text-left">Área Resp.</th>
                    <th className="py-2 px-2 font-semibold text-center">Grav.</th>
                    <th className="py-2 px-2 font-semibold text-center">Status</th>
                    <th className="py-2 px-2 font-semibold text-left">Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map((claim, idx) => (
                    <tr key={claim.id} className={idx % 2 === 0 ? "bg-white" : "bg-[#FDF9F7]"}>
                      <td className="py-1.5 px-2 text-gray-700 border-b border-[#F0E8E0] whitespace-nowrap">{formatDate(claim.date)}</td>
                      <td className="py-1.5 px-2 text-gray-600 border-b border-[#F0E8E0] font-mono text-[9px]">{claim.id}</td>
                      <td className="py-1.5 px-2 text-gray-800 font-medium border-b border-[#F0E8E0] max-w-[120px] truncate">
                        {claim.store?.split(" - ")[0] ?? "—"}
                      </td>
                      <td className="py-1.5 px-2 text-gray-700 border-b border-[#F0E8E0]">{claim.type ?? "—"}</td>
                      <td className="py-1.5 px-2 text-gray-600 border-b border-[#F0E8E0]">{claim.responsibleArea ?? "—"}</td>
                      <td className="py-1.5 px-2 text-center border-b border-[#F0E8E0]">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold border ${severityBadge(claim.severity)}`}>
                          {claim.severity}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-center border-b border-[#F0E8E0]">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold border ${statusBadge(claim.status)}`}>
                          {claim.status}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-gray-500 border-b border-[#F0E8E0] max-w-[140px] truncate">
                        {claim.description?.length > 60
                          ? claim.description.substring(0, 60) + "..."
                          : (claim.description ?? "—")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Observações e encerramento */}
            {claims.length > 0 && (
              <div className="mt-8 p-4 bg-[#FAF7F2] border border-[#E8DCCB] rounded-lg">
                <p className="text-[10px] text-gray-600 leading-relaxed italic">
                  As informações apresentadas neste documento refletem os registros disponíveis no Sistema de Gestão de Sinistros na data e horário de sua emissão.
                  Este relatório possui caráter interno e destina-se ao acompanhamento administrativo e operacional do Flamboyant Shopping.
                </p>
              </div>
            )}

            {/* Assinaturas */}
            <div className="mt-12 grid grid-cols-3 gap-6">
              {["Gerente de Operações", "Coordenador de Segurança", "Diretor Administrativo"].map(role => (
                <div key={role} className="text-center text-[10px]">
                  <div className="border-t border-gray-400 mb-2 mt-8" />
                  <p className="font-bold text-gray-800">{role}</p>
                  <p className="text-gray-500 italic mt-1">Flamboyant Shopping</p>
                  <p className="text-gray-400 mt-2">Assinatura / Data: ____/____/____</p>
                </div>
              ))}
            </div>

            {/* Rodapé do documento */}
            <div className="mt-8 pt-4 border-t border-gray-200 flex justify-between items-center text-[9px] text-gray-400">
              <div>
                <span className="font-semibold text-gray-600">Flamboyant Shopping Center</span>
                {" • "}Av. Deputado Jamel Cecílio, 3.300 - Jardim Goiás{" • "}Goiânia - GO, 74810-100
              </div>
              <div className="text-right whitespace-nowrap">Página 1 de 1</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
