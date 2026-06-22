import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useForm, Controller } from "react-hook-form";
import {
  Building2,
  UploadCloud,
  AlertCircle,
  FileText,
  Save,
  File as FileIcon,
  Trash2,
  AlertTriangle,
  Eye,
  ChevronDown,
  CheckCircle2,
  Info,
  ShieldCheck,
  X,
} from "lucide-react";
import { fetchClaims, createClaim, fetchStores } from "../../apiClient";
import { hasIrregularPolicy } from "../store";
import type { ClaimSeverity } from "../../types";

type FormValues = {
  store: string;
  type: string;
  otherType: string;
  severity: ClaimSeverity;
  date: string;
  description: string;
  responsibleArea: string;
  tenantNotified: boolean;
  responsibleAreaNotified: boolean;
  employeeName: string;
  employeeContact: string;
};

interface DuplicateInfo {
  id: string;
  store: string;
  type: string;
  date: string;
  status: string;
}

const CLAIM_TYPES = [
  "Vazamento / Infiltração",
  "Incêndio",
  "Dano Físico / Vandalismo",
  "Acidente Pessoal",
  "Roubo / Furto",
  "Desastre Natural",
  "Dano Estrutural",
  "Outros",
];

type StoreOption = {
  id: number;
  code: string;
  name: string;
  segment: string;
  label: string; // "Name - Code"
};

function StoreAutocomplete({
  value,
  onChange,
  onSelectStore,
  stores,
  loading,
  error,
  hasError,
}: {
  value: string;
  onChange: (val: string) => void;
  onSelectStore?: (store: StoreOption) => void;
  stores: StoreOption[];
  loading: boolean;
  error: string;
  hasError?: boolean;
}) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Sync external value
  useEffect(() => {
    if (value && value !== query) setQuery(value);
  }, [value]);

  const filtered = query
    ? stores.filter((s) => {
        const q = query.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.segment.toLowerCase().includes(q) ||
          s.label.toLowerCase().includes(q)
        );
      })
    : stores;

  const handleSelect = (store: StoreOption) => {
    setQuery(store.label);
    onChange(store.label);
    onSelectStore?.(store);
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    setOpen(true);
    if (!v) onChange("");
  };

  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
        <AlertCircle className="w-4 h-4 shrink-0" />
        Não foi possível carregar a lista de lojas.
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Building2 className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder={loading ? "Carregando lojas..." : "Pesquise por nome, código ou segmento..."}
          disabled={loading}
          autoComplete="off"
          className={`w-full border ${
            hasError ? "border-[#D93030] bg-red-50" : "border-gray-200"
          } rounded-xl py-2.5 pl-9 pr-9 focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] bg-white text-gray-900 text-sm outline-none transition-colors disabled:bg-gray-50 disabled:text-gray-400`}
        />
        <ChevronDown className={`w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-transform ${open ? "rotate-180" : ""}`} />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg">
          {filtered.slice(0, 50).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleSelect(s)}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#FAF7F2] transition-colors flex items-center justify-between gap-2 ${
                value === s.label ? "bg-[#FAF7F2] font-medium" : ""
              }`}
            >
              <span className="truncate">
                <span className="font-medium text-gray-900">{s.name}</span>
                <span className="text-gray-400 ml-1">- {s.code}</span>
              </span>
              <span className="text-[10px] font-semibold text-[#8B1A1A] bg-[#F5E9D7] border border-[#E8DCCB] rounded px-1.5 py-0.5 shrink-0">
                {s.segment}
              </span>
            </button>
          ))}
          {filtered.length > 50 && (
            <div className="px-4 py-2 text-xs text-gray-400 text-center border-t border-gray-100">
              Mostrando 50 de {filtered.length} resultados. Refine sua busca.
            </div>
          )}
        </div>
      )}

      {open && query && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-6 text-center text-sm text-gray-400">
          Nenhuma loja encontrada para "{query}"
        </div>
      )}
    </div>
  );
}

const today = new Date().toISOString().split("T")[0];

export function NewClaim() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo | null>(null);
  const [pendingData, setPendingData] = useState<FormValues | null>(null);

  // ── Store list from backend ─────────────────────────────────────
  const [storesList, setStoresList] = useState<StoreOption[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [storesError, setStoresError] = useState("");
  const [selectedStoreIds, setSelectedStoreIds] = useState<number[]>([]);

  useEffect(() => {
    setStoresLoading(true);
    fetchStores()
      .then((data: any[]) => {
        const mapped: StoreOption[] = (data || []).map((s) => ({
          id: s.id,
          code: s.code || "",
          name: s.name || "Sem nome",
          segment: s.segment || "Sem segmento",
          label: `${s.name || "Sem nome"} - ${s.code || "N/A"}`,
        }));
        setStoresList(mapped);
      })
      .catch(() => {
        setStoresError("Não foi possível carregar a lista de lojas.");
        setStoresList([]);
      })
      .finally(() => setStoresLoading(false));
  }, []);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      severity: "Média",
      tenantNotified: false,
      responsibleAreaNotified: false,
    },
  });

  const watchedSeverity = watch("severity");
  const watchedType = watch("type");
  const watchedStore = watch("store");
  const isHighSeverity = watchedSeverity === "Alta";
  const isOtherType = watchedType === "Outros";
  const hasIrregularPolicySelected = watchedStore ? hasIrregularPolicy(watchedStore) : false;
  const canSubmit = !isHighSeverity || files.length > 0;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const checkForDuplicate = (data: FormValues): DuplicateInfo | null => {
    // synchronous placeholder — duplicates checked asynchronously before final submit
    return null;
  };

  const saveAndNavigate = (data: FormValues) => {
    const rawUser = localStorage.getItem("user");
    const sessionUser = rawUser ? JSON.parse(rawUser) : null;
    const sessionName: string = sessionUser?.name || "Sistema";
    const sessionInitials: string = sessionName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
    const payload = {
      store: data.store,
      type: data.type === "Outros" ? data.otherType || "Outros" : data.type,
      otherType: data.type === "Outros" ? data.otherType : undefined,
      severity: data.severity,
      date: data.date,
      description: data.description,
      responsibleArea: data.responsibleArea,
      tenantNotified: data.tenantNotified,
      responsibleAreaNotified: data.responsibleAreaNotified,
      employeeName: data.employeeName,
      employeeContact: data.employeeContact,
      files: files.map((f) => f.name),
      irregularPolicy: hasIrregularPolicy(data.store),
      status: "Em análise",
      auditTrail: [
        { id: `a-${Date.now()}`, user: sessionName, userInitials: sessionInitials, userRole: "Gerente", timestamp: new Date().toISOString(), action: "Sinistro registrado no sistema", type: "created" },
      ],
    };
    createClaim({ ...payload, store_ids: selectedStoreIds })
      .then(() => navigate("/dashboard"))
      .catch((err) => alert(err.message || String(err)));
  };

  const onSubmit = (data: FormValues) => {
    // perform duplicate check against backend
    fetchClaims()
      .then((list) => {
        const existing = list.find((c: any) => c.store === data.store && c.type === (data.type === "Outros" ? data.otherType || "Outros" : data.type) && c.status !== "Pago");
        if (existing) {
          setDuplicateInfo({ id: existing.id, store: existing.store, type: existing.type, date: existing.date, status: existing.status });
          setPendingData(data);
          setShowDuplicateModal(true);
        } else {
          saveAndNavigate(data);
        }
      })
      .catch(() => saveAndNavigate(data));
  };

  const handleRegisterAnyway = () => {
    if (pendingData) saveAndNavigate(pendingData);
    setShowDuplicateModal(false);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || ""))
      return "🖼️";
    if (ext === "pdf") return "📄";
    if (["mp4", "avi", "mov"].includes(ext || "")) return "🎥";
    return "📎";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6 pb-10">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#8B1A1A] rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-gray-900">Registro de Novo Sinistro</h1>
              <p className="text-sm text-gray-500">Preencha os dados detalhados da ocorrência no complexo.</p>
            </div>
          </div>
          <div className="flex items-center px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
            <Info className="w-3.5 h-3.5 mr-1.5" />
            Campos marcados com * são obrigatórios
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* ── Section 1: Dados da Ocorrência ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-8 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/60 dark:bg-[#1a1a2e]">
              <h2 className="text-gray-900 dark:text-[#f0f0f0] flex items-center text-base">
                <Building2 className="w-4 h-4 mr-2 text-[#8B1A1A]" />
                Dados da Ocorrência
              </h2>
              <span className="text-xs text-gray-400 dark:text-[#aaaaaa]">Passo 1 de 2</span>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Store / Location — Autocomplete from backend */}
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">
                    Loja / LUC <span className="text-[#D93030]">*</span>
                  </label>
                  <Controller
                    name="store"
                    control={control}
                    rules={{ required: "Selecione a loja / LUC" }}
                    render={({ field }) => (
                      <StoreAutocomplete
                        value={field.value}
                        onChange={field.onChange}
                        onSelectStore={(s) => setSelectedStoreIds([s.id])}
                        stores={storesList}
                        loading={storesLoading}
                        error={storesError}
                        hasError={!!errors.store}
                      />
                    )}
                  />
                  {errors.store && (
                    <p className="mt-1 text-xs text-[#D93030] flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" /> {errors.store.message}
                    </p>
                  )}
                  {hasIrregularPolicySelected && (
                    <div className="mt-2 flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-[#D93030] mt-0.5 flex-shrink-0" />
                      <span className="text-sm font-semibold text-[#D93030]">Loja com apólice irregular</span>
                    </div>
                  )}
                </div>

                {/* Date — max = today to block future dates */}
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">
                    Data do Sinistro <span className="text-[#D93030]">*</span>
                  </label>
                  <input
                    type="date"
                    max={today}
                    {...register("date", {
                      required: "A data é obrigatória",
                      validate: v => v <= today || "Datas futuras não são permitidas",
                    })}
                    className={`w-full border ${errors.date ? "border-[#D93030] bg-red-50" : "border-gray-200"
                      } rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] bg-white text-gray-900 text-sm outline-none transition-colors`}
                  />
                  {errors.date && (
                    <p className="mt-1 text-xs text-[#D93030] flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" /> {errors.date.message}
                    </p>
                  )}
                </div>

                {/* Tipo de Ocorrência — with "Outros" conditional */}
                <div className={isOtherType ? "" : "md:col-span-1"}>
                  <label className="block text-sm text-gray-700 mb-1.5">
                    Tipo de Ocorrência <span className="text-[#D93030]">*</span>
                  </label>
                  <div className="relative">
                    <select
                      {...register("type", { required: "Selecione o tipo de ocorrência" })}
                      className={`w-full border ${errors.type ? "border-[#D93030] bg-red-50" : "border-gray-200"
                        } rounded-xl py-2.5 px-3 pr-9 focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] bg-white text-gray-900 text-sm outline-none appearance-none transition-colors`}
                    >
                      <option value="">Selecione o tipo...</option>
                      {CLAIM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {errors.type && (
                    <p className="mt-1 text-xs text-[#D93030] flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" /> {errors.type.message}
                    </p>
                  )}
                </div>

                {/* Outros — conditionally rendered */}
                {isOtherType && (
                  <div>
                    <label className="block text-sm text-gray-700 mb-1.5">
                      Especifique o Tipo <span className="text-[#D93030]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Descreva o tipo de ocorrência..."
                      {...register("otherType", {
                        required: isOtherType ? "Especifique o tipo de ocorrência" : false,
                      })}
                      className={`w-full border ${errors.otherType ? "border-[#D93030] bg-red-50" : "border-gray-200"
                        } rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] bg-white text-gray-900 text-sm outline-none transition-colors`}
                    />
                    {errors.otherType && (
                      <p className="mt-1 text-xs text-[#D93030] flex items-center">
                        <AlertCircle className="w-3 h-3 mr-1" /> {errors.otherType.message}
                      </p>
                    )}
                  </div>
                )}

                {/* Nível de Gravidade dropdown */}
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">
                    Nível de Gravidade <span className="text-[#D93030]">*</span>
                  </label>
                  <Controller
                    name="severity"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <div className="relative">
                        <select
                          value={field.value}
                          onChange={field.onChange}
                          className="w-full border border-gray-200 rounded-xl py-2.5 px-3 pr-9 focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] bg-white text-gray-900 text-sm outline-none appearance-none transition-colors"
                        >
                          <option value="Baixa">🟢 Baixa</option>
                          <option value="Média">🟡 Média</option>
                          <option value="Alta">🔴 Alta</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    )}
                  />
                  {/* Severity visual indicator */}
                  <div className={`mt-2 flex items-center space-x-1.5 text-xs rounded-lg px-3 py-2 border
                    ${watchedSeverity === "Alta" ? "bg-red-50 border-red-100 text-[#D93030]" :
                      watchedSeverity === "Média" ? "bg-yellow-50 border-yellow-100 text-yellow-700" :
                        "bg-green-50 border-green-100 text-green-700"}
                  `}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0
                      ${watchedSeverity === "Alta" ? "bg-[#D93030]" :
                        watchedSeverity === "Média" ? "bg-yellow-500" : "bg-green-500"}
                    `} />
                    <span>
                      {watchedSeverity === "Alta" && "Sinistro de alta gravidade — evidências obrigatórias"}
                      {watchedSeverity === "Média" && "Sinistro de gravidade intermediária"}
                      {watchedSeverity === "Baixa" && "Sinistro de baixa complexidade operacional"}
                    </span>
                  </div>
                </div>

                {/* Área Responsável */}
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">
                    Área Responsável <span className="text-[#D93030]">*</span>
                  </label>
                  <div className="relative">
                    <select
                      {...register("responsibleArea", { required: "Selecione a área responsável" })}
                      className={`w-full border ${errors.responsibleArea ? "border-[#D93030] bg-red-50" : "border-gray-200"
                        } rounded-xl py-2.5 px-3 pr-9 focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] bg-white text-gray-900 text-sm outline-none appearance-none transition-colors`}
                    >
                      <option value="">Selecione a área...</option>
                      <option value="Manutenção">Manutenção</option>
                      <option value="Brigada">Brigada</option>
                      <option value="Engenharia">Engenharia</option>
                      <option value="Conservação">Conservação</option>
                      <option value="Relacionamento">Relacionamento</option>
                      <option value="Segurança / CFTV">Segurança / CFTV</option>
                      <option value="Estacionamento">Estacionamento</option>
                      <option value="Arquitetura">Arquitetura</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {errors.responsibleArea && (
                    <p className="mt-1 text-xs text-[#D93030] flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" /> {errors.responsibleArea.message}
                    </p>
                  )}
                </div>

                {/* Notificar Lojista */}
                <div className="md:col-span-2">
                  <div className="flex items-start space-x-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                    <input
                      type="checkbox"
                      id="tenantNotified"
                      {...register("tenantNotified")}
                      className="mt-1 w-4 h-4 text-[#8B1A1A] border-gray-300 rounded focus:ring-2 focus:ring-[#8B1A1A]/20"
                    />
                    <label htmlFor="tenantNotified" className="flex-1 cursor-pointer">
                      <span className="text-sm font-semibold text-gray-900">Notificar Lojista sobre o sinistro</span>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Ao marcar esta opção, o lojista receberá uma notificação automática sobre o registro deste sinistro.
                      </p>
                    </label>
                  </div>
                </div>

                {/* Notificar Área Responsável */}
                <div className="md:col-span-2">
                  <div className="flex items-start space-x-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                    <input
                      type="checkbox"
                      id="responsibleAreaNotified"
                      {...register("responsibleAreaNotified")}
                      className="mt-1 w-4 h-4 text-[#8B1A1A] border-gray-300 rounded focus:ring-2 focus:ring-[#8B1A1A]/20"
                    />
                    <label htmlFor="responsibleAreaNotified" className="flex-1 cursor-pointer">
                      <span className="text-sm font-semibold text-gray-900">Notificar Área Responsável sobre o sinistro</span>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Ao marcar esta opção, a área responsável selecionada receberá uma notificação automática sobre o registro deste sinistro.
                      </p>
                    </label>
                  </div>
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-700 mb-1.5">
                    Descrição Detalhada <span className="text-[#D93030]">*</span>
                  </label>
                  <textarea
                    {...register("description", {
                      required: "A descrição é obrigatória",
                      minLength: { value: 20, message: "Mínimo de 20 caracteres" },
                    })}
                    rows={4}
                    placeholder="Descreva detalhadamente o ocorrido: horários, pessoas envolvidas, área afetada e primeiras providências tomadas..."
                    className={`w-full border ${errors.description ? "border-[#D93030] bg-red-50" : "border-gray-200"
                      } rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] bg-white text-gray-900 text-sm outline-none resize-none transition-colors`}
                  />
                  {errors.description && (
                    <p className="mt-1 text-xs text-[#D93030] flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" /> {errors.description.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 2: Dados do Lojista ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-8 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/60 dark:bg-[#1a1a2e]">
              <h2 className="text-gray-900 dark:text-[#f0f0f0] flex items-center text-base">
                <Building2 className="w-4 h-4 mr-2 text-[#8B1A1A]" />
                Dados do Lojista
              </h2>
              <span className="text-xs text-gray-400 dark:text-[#aaaaaa]">Passo 2 de 3</span>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Nome do Lojista Responsável */}
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">
                    Nome do Lojista Responsável
                  </label>
                  <input
                    type="text"
                    placeholder="Nome completo do lojista..."
                    {...register("employeeName")}
                    className="w-full border border-gray-200 rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] bg-white text-gray-900 text-sm outline-none transition-colors"
                  />
                </div>

                {/* Contato do Lojista */}
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">
                    Contato do Lojista
                  </label>
                  <input
                    type="text"
                    placeholder="E-mail ou telefone..."
                    {...register("employeeContact")}
                    className="w-full border border-gray-200 rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] bg-white text-gray-900 text-sm outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 3: Evidências ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-8 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/60 dark:bg-[#1a1a2e]">
              <div className="flex items-center space-x-3">
                <h2 className="text-gray-900 dark:text-[#f0f0f0] flex items-center text-base">
                  <UploadCloud className="w-4 h-4 mr-2 text-[#8B1A1A]" />
                  Anexar Evidências
                </h2>
                {isHighSeverity && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#D93030] text-white">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Obrigatório
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-400 dark:text-[#aaaaaa]">Passo 3 de 3</span>
            </div>

            <div className="p-8">
              {isHighSeverity && files.length === 0 && (
                <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-100 rounded-xl mb-5">
                  <AlertTriangle className="w-4 h-4 text-[#D93030] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-[#D93030] font-semibold">Evidências obrigatórias para gravidade Alta</p>
                    <p className="text-xs text-red-500 mt-0.5">
                      Para sinistros de alta gravidade, é necessário anexar pelo menos um arquivo de evidência antes de salvar.
                    </p>
                  </div>
                </div>
              )}

              {/* Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer
                  ${isDragging
                    ? "border-[#8B1A1A] bg-red-50/60 scale-[1.01]"
                    : isHighSeverity && files.length === 0
                      ? "border-[#D93030]/40 bg-red-50/30 hover:bg-red-50/50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                  }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <UploadCloud className={`w-7 h-7 ${isDragging ? "text-[#8B1A1A]" : "text-gray-400"}`} />
                </div>
                <p className="text-sm text-gray-700 mb-1">
                  Arraste arquivos aqui ou <span className="text-[#8B1A1A] font-semibold">clique para selecionar</span>
                </p>
                <p className="text-xs text-gray-400 mb-5">
                  Formatos aceitos: JPG, PNG, PDF, MP4 · Máx. 50 MB por arquivo
                </p>
                <label className="inline-flex items-center cursor-pointer bg-white border border-gray-200 text-gray-700 px-5 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
                  <FileText className="w-4 h-4 mr-2" />
                  Selecionar Arquivos
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf,video/mp4"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm text-gray-700">
                      Arquivos Selecionados
                      <span className="ml-2 px-2 py-0.5 bg-[#8B1A1A] text-white text-xs rounded-full">{files.length}</span>
                    </h4>
                    {files.length > 0 && (
                      <div className="flex items-center text-xs text-green-600">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Evidências anexadas com sucesso
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {files.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl bg-gray-50/70 hover:border-gray-200 transition-colors group">
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <div className="w-8 h-8 bg-white rounded-lg border border-gray-200 flex items-center justify-center text-base flex-shrink-0 shadow-sm">
                            {getFileIcon(file.name)}
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-sm text-gray-800 truncate">{file.name}</p>
                            <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                          <button
                            type="button"
                            title="Visualizar arquivo"
                            onClick={() => window.open(URL.createObjectURL(file), "_blank")}
                            className="flex items-center space-x-1 text-gray-400 hover:text-[#8B1A1A] p-1.5 rounded-lg hover:bg-[#8B1A1A]/8 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="text-xs hidden sm:inline">Visualizar</span>
                          </button>
                          <button
                            type="button"
                            title="Remover arquivo"
                            onClick={() => removeFile(idx)}
                            className="text-gray-300 hover:text-[#D93030] p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Action Buttons ── */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`px-6 py-3 rounded-xl text-sm font-semibold text-white flex items-center shadow-md transition-all
                ${canSubmit
                  ? "bg-[#8B1A1A] hover:bg-[#701515] hover:shadow-lg active:scale-[0.98]"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                }`}
            >
              <Save className="w-4 h-4 mr-2" />
              Registrar Sinistro
              {!canSubmit && isHighSeverity && (
                <span className="ml-2 text-xs opacity-80">(Evidências necessárias)</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── Duplicate Warning Modal ── */}
      {showDuplicateModal && duplicateInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowDuplicateModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header Strip */}
            <div className="h-1.5 bg-amber-400 w-full" />

            <div className="p-6">
              {/* Warning Icon + Title */}
              <div className="flex items-start space-x-4 mb-5">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center flex-shrink-0 border border-amber-100">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-gray-900 font-semibold">Alerta de Duplicidade</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Já existe um sinistro ativo com características semelhantes.
                  </p>
                </div>
                <button
                  onClick={() => setShowDuplicateModal(false)}
                  className="ml-auto text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Existing Claim Summary Card */}
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-5 space-y-2">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Sinistro Existente</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 font-semibold">{duplicateInfo.id}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
                    ${duplicateInfo.status === "Em análise" ? "bg-amber-100 text-amber-800" :
                      duplicateInfo.status === "Aguardando seguradora" ? "bg-blue-100 text-blue-800" :
                        "bg-orange-100 text-orange-800"}`}>
                    {duplicateInfo.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-600">
                  <div>
                    <span className="text-gray-400 block">Local</span>
                    <span className="font-medium text-gray-700">{duplicateInfo.store}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Data</span>
                    <span className="font-medium text-gray-700">{formatDate(duplicateInfo.date)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-400 block">Tipo</span>
                    <span className="font-medium text-gray-700">{duplicateInfo.type}</span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-5">
                Como deseja proceder? Você pode visualizar o sinistro existente ou registrar um novo mesmo assim.
              </p>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => navigate(`/sinistro/${duplicateInfo.id}`)}
                  className="flex-1 flex items-center justify-center px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors font-medium"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Visualizar Existente
                </button>
                <button
                  onClick={handleRegisterAnyway}
                  className="flex-1 flex items-center justify-center px-4 py-2.5 bg-[#D93030] text-white rounded-xl text-sm font-medium hover:bg-[#c02828] transition-colors"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Registrar Mesmo Assim
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
