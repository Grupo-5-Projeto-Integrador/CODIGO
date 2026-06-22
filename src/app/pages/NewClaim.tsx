import { useState, useRef, useEffect } from "react";
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
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Info,
  ShieldCheck,
  X,
} from "lucide-react";
type ClaimSeverity = "Alta" | "Média" | "Baixa";

type FormValues = {
  store_ids: number[];
  type: string;
  otherType: string;
  severity: ClaimSeverity;
  date: string;
  description: string;
  responsibleAreas: string[];
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

import { getStores, type Store as ApiStore, createClaim, getClaims as apiGetClaims, type NewClaimPayload, type EmployeeContact } from "../api";

const AREAS = [
  "Manutenção",
  "Brigada",
  "Engenharia",
  "Conservação",
  "Relacionamento",
  "Segurança / CFTV",
  "Estacionamento",
  "Arquitetura",
];

const today = new Date().toISOString().split("T")[0];

// ── Multi-select dropdown component ───────────────────────────────────────
interface StoreSelectProps {
  options: ApiStore[];
  selectedIds: number[];
  onChange: (values: number[]) => void;
  placeholder: string;
  hasError?: boolean;
  isLoading?: boolean;
  isError?: boolean;
}

function StoreSelect({ options, selectedIds, onChange, placeholder, hasError, isLoading, isError }: StoreSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
    else setSearch("");
  }, [open]);

  const filtered = options.filter(o => 
    o.name.toLowerCase().includes(search.toLowerCase()) || 
    o.code.toLowerCase().includes(search.toLowerCase()) ||
    (o.segment && o.segment.toLowerCase().includes(search.toLowerCase()))
  );

  const toggle = (val: number) => {
    onChange(selectedIds.includes(val) ? selectedIds.filter(v => v !== val) : [...selectedIds, val]);
  };

  const remove = (val: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedIds.filter(v => v !== val));
  };

  const selectedCount = selectedIds.length;
  let displayText = placeholder;
  if (selectedCount === 1) displayText = "1 loja selecionada";
  else if (selectedCount > 1) displayText = `${selectedCount} lojas selecionadas`;

  return (
    <div className="relative" ref={ref}>
      <div
        onClick={() => setOpen(o => !o)}
        className={`w-full min-h-[42px] border ${hasError ? "border-[#D93030] bg-red-50" : "border-gray-200"} rounded-xl py-2 px-3 pr-9 focus-within:ring-2 focus-within:ring-[#8B1A1A]/20 focus-within:border-[#8B1A1A] bg-white text-sm cursor-pointer flex flex-wrap gap-1.5 items-center`}
      >
        <span className={selectedCount === 0 ? "text-gray-400" : "text-gray-900 font-medium"}>
          {isLoading ? "Carregando lojas..." : isError ? "Erro ao carregar lojas" : displayText}
        </span>
      </div>
      <ChevronDown className={`w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none transition-transform ${open ? "rotate-180" : ""}`} />

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="px-3 py-2 border-b border-gray-100">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
              placeholder="Buscar loja..."
              className="w-full text-sm px-2 py-1.5 bg-gray-50 border border-gray-100 rounded-lg outline-none focus:border-[#8B1A1A]/40 focus:bg-white transition-all placeholder:text-gray-400"
            />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-xs text-gray-400 text-center">Nenhuma loja encontrada</p>
            ) : filtered.map(opt => {
              const checked = selectedIds.includes(opt.id);
              return (
                <label key={opt.id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors ${checked ? "bg-[#8B1A1A]/5" : ""}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(opt.id)}
                    className="w-4 h-4 rounded border-gray-300 text-[#8B1A1A] focus:ring-[#8B1A1A]/20 accent-[#8B1A1A]"
                  />
                  <span className="text-sm text-gray-800">{opt.name} - <span className="text-gray-500">{opt.code}</span></span>
                </label>
              );
            })}
          </div>
          {selectedIds.length > 0 && (
            <div className="border-t border-gray-100 px-3 py-2 flex flex-wrap gap-1 mb-2">
              {options.filter(o => selectedIds.includes(o.id)).map(opt => (
                <span key={opt.id} className="inline-flex items-center gap-1 bg-[#8B1A1A]/10 text-[#8B1A1A] rounded-lg px-2 py-0.5 text-xs font-medium">
                  {opt.code}
                  <button type="button" onClick={e => remove(opt.id, e)} className="hover:text-[#D93030] transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          {selectedIds.length > 0 && (
            <div className="border-t border-gray-100 px-3 py-2">
              <button type="button" onClick={() => onChange([])} className="text-xs text-gray-400 hover:text-[#D93030] transition-colors">
                Limpar seleção
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Multi-select para listas de strings (áreas responsáveis) ─────────────────
interface AreaSelectProps {
  options: string[];
  selected: string[];
  onChange: (vals: string[]) => void;
  placeholder: string;
  hasError?: boolean;
}

function AreaSelect({ options, selected, onChange, placeholder, hasError }: AreaSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
    else setSearch("");
  }, [open]);

  const filtered = options.filter(o =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (val: string) => {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  };

  const count = selected.length;
  const displayText =
    count === 0 ? placeholder :
    count === 1 ? selected[0] :
    `${count} áreas selecionadas`;

  return (
    <div className="relative" ref={ref}>
      <div
        onClick={() => setOpen(o => !o)}
        className={`w-full min-h-[42px] border ${hasError ? "border-[#D93030] bg-red-50" : "border-gray-200"} rounded-xl py-2 px-3 pr-9 bg-white text-sm cursor-pointer flex items-center focus-within:ring-2 focus-within:ring-[#8B1A1A]/20 focus-within:border-[#8B1A1A]`}
      >
        <span className={count === 0 ? "text-gray-400" : "text-gray-900 font-medium"}>
          {displayText}
        </span>
      </div>
      <ChevronDown className={`w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none transition-transform ${open ? "rotate-180" : ""}`} />

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
              placeholder="Buscar área..."
              className="w-full text-sm px-2 py-1.5 bg-gray-50 border border-gray-100 rounded-lg outline-none focus:border-[#8B1A1A]/40 focus:bg-white transition-all placeholder:text-gray-400"
            />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-xs text-gray-400 text-center">Nenhuma área encontrada</p>
            ) : filtered.map(opt => {
              const checked = selected.includes(opt);
              return (
                <label key={opt} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors ${checked ? "bg-[#8B1A1A]/5" : ""}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(opt)}
                    className="w-4 h-4 rounded border-gray-300 accent-[#8B1A1A]"
                  />
                  <span className="text-sm text-gray-800">{opt}</span>
                </label>
              );
            })}
          </div>
          {selected.length > 0 && (
            <div className="border-t border-gray-100 px-3 py-2">
              <button type="button" onClick={() => onChange([])} className="text-xs text-gray-400 hover:text-[#D93030] transition-colors">
                Limpar seleção
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function NewClaim() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo | null>(null);
  const [pendingData, setPendingData] = useState<FormValues | null>(null);

  const [apiStores, setApiStores] = useState<ApiStore[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [storesError, setStoresError] = useState(false);
  const [storeContacts, setStoreContacts] = useState<Record<number, { name: string; contact: string }>>({});

  useEffect(() => {
    getStores()
      .then(data => {
        setApiStores(data);
        setStoresLoading(false);
      })
      .catch(() => {
        setStoresError(true);
        setStoresLoading(false);
      });
  }, []);

  const {
    register,
    handleSubmit,
    control,
    watch,
    trigger,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      severity: "Média",
      tenantNotified: false,
      responsibleAreaNotified: false,
      store_ids: [],
      responsibleAreas: [],
    },
  });

  const watchedSeverity = watch("severity");
  const watchedType = watch("type");
  const watchedStoreIds = watch("store_ids");
  const isHighSeverity = watchedSeverity === "Alta";
  const isOtherType = watchedType === "Outros";
  const selectedStoresData = apiStores.filter(s => watchedStoreIds?.includes(s.id));

  // Sincroniza storeContacts quando lojas selecionadas mudam
  useEffect(() => {
    setStoreContacts(prev => {
      const updated: Record<number, { name: string; contact: string }> = {};
      watchedStoreIds?.forEach(id => {
        updated[id] = prev[id] || { name: "", contact: "" };
      });
      return updated;
    });
  }, [watchedStoreIds?.join(",")]);
  const hasIrregularPolicySelected = false;
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

  const [submitError, setSubmitError] = useState("");

  const checkForDuplicate = async (data: FormValues): Promise<DuplicateInfo | null> => {
    try {
      const result = await apiGetClaims({ status: "Em análise" });
      const claimType = data.type === "Outros" ? (data.otherType || "Outros") : data.type;
      const existing = result.claims.find(
        c =>
          selectedStoresData.some(s => c.store.includes(s.name)) &&
          c.type === claimType
      );
      if (existing) {
        return { id: existing.id, store: existing.store, type: existing.type, date: existing.date, status: existing.status };
      }
    } catch {}
    return null;
  };

  const saveAndNavigate = async (data: FormValues) => {
    setSubmitError("");
    const storeLabel = selectedStoresData.map(s => s.name).join(", ");
    const areasLabel = data.responsibleAreas.join(", ");

    const employeeContacts: EmployeeContact[] = selectedStoresData
      .filter(s => storeContacts[s.id]?.name || storeContacts[s.id]?.contact)
      .map(s => ({
        storeId: s.id,
        storeName: s.name,
        name: storeContacts[s.id]?.name || "",
        contact: storeContacts[s.id]?.contact || "",
      }));

    const payload: NewClaimPayload = {
      store: storeLabel,
      store_ids: data.store_ids,
      type: data.type === "Outros" ? (data.otherType || "Outros") : data.type,
      otherType: data.type === "Outros" ? data.otherType : undefined,
      severity: data.severity,
      date: data.date,
      description: data.description,
      responsibleArea: areasLabel,
      tenantNotified: data.tenantNotified,
      responsibleNotified: data.responsibleAreaNotified,
      employeeName: data.employeeName,
      employeeContact: data.employeeContact,
      employeeContacts,
      irregularPolicy: false,
    };

    try {
      await createClaim(payload, files);
      navigate("/historico");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSubmitError(msg || "Erro ao registrar sinistro.");
    }
  };

  const STEPS = [
    { label: "Dados da Ocorrência", icon: Building2 },
    { label: "Dados do Lojista",    icon: FileText },
    { label: "Evidências",          icon: UploadCloud },
  ];

  const goToStep = async (next: number) => {
    // Validate current step before advancing
    if (next > currentStep) {
      if (currentStep === 0) {
        const vals = watch();
        const ok = await trigger(["store_ids", "date", "type", "severity", "responsibleAreas", "description"]);
        if (!ok) return;
        if (vals.type === "Outros") {
          const ok2 = await trigger(["otherType"]);
          if (!ok2) return;
        }
      }
      // Step 1 (Dados do Lojista) has no required fields — always allow advance
    }
    setCurrentStep(next);
  };

  const onSubmit = async (data: FormValues) => {
    const dup = await checkForDuplicate(data);
    if (dup) {
      setDuplicateInfo(dup);
      setPendingData(data);
      setShowDuplicateModal(true);
    } else {
      await saveAndNavigate(data);
    }
  };

  const handleRegisterAnyway = async () => {
    if (pendingData) await saveAndNavigate(pendingData);
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
      <div className="max-w-4xl mx-auto space-y-5 pb-10">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#8B1A1A] rounded-xl flex items-center justify-center text-white shadow-sm shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Registro de Novo Sinistro</h1>
              <p className="text-sm text-gray-400 mt-0.5">Preencha os dados detalhados da ocorrência no complexo.</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-600 shrink-0">
            <Info className="w-3.5 h-3.5 mr-1.5" />
            Campos com * são obrigatórios
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          onKeyDown={(e) => { if (e.key === "Enter" && currentStep < STEPS.length - 1) e.preventDefault(); }}
        >
          {/* ── Step indicators ── */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {STEPS.map((s, i) => {
              const StepIcon = s.icon;
              const isActive = i === currentStep;
              const isDone = i < currentStep;
              return (
                <div key={i} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToStep(i)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border
                      ${isActive ? "bg-[#8B1A1A] text-white border-[#8B1A1A] shadow-sm" :
                        isDone  ? "bg-[#8B1A1A]/10 text-[#8B1A1A] border-[#8B1A1A]/20 hover:bg-[#8B1A1A]/20" :
                                  "bg-white text-gray-400 border-gray-200 hover:bg-gray-50"}`}
                  >
                    {isDone
                      ? <CheckCircle2 className="w-3.5 h-3.5" />
                      : <StepIcon className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{s.label}</span>
                    <span className="sm:hidden">{i + 1}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={`w-8 h-px transition-colors ${i < currentStep ? "bg-[#8B1A1A]/40" : "bg-gray-200"}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Single stepped card ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Card header */}
            <div className="px-4 sm:px-8 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/60 dark:bg-[#1a1a2e]">
              <h2 className="text-gray-900 dark:text-[#f0f0f0] flex items-center text-base">
                {currentStep === 0 && <><Building2 className="w-4 h-4 mr-2 text-[#8B1A1A]" />Dados da Ocorrência</>}
                {currentStep === 1 && <><FileText className="w-4 h-4 mr-2 text-[#8B1A1A]" />Dados do Lojista</>}
                {currentStep === 2 && (
                  <>
                    <UploadCloud className="w-4 h-4 mr-2 text-[#8B1A1A]" />
                    Anexar Evidências
                    {isHighSeverity && (
                      <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#D93030] text-white">
                        <AlertTriangle className="w-3 h-3 mr-1" />Obrigatório
                      </span>
                    )}
                  </>
                )}
              </h2>
              <span className="text-xs text-gray-400 dark:text-[#aaaaaa]">
                Passo {currentStep + 1} de {STEPS.length}
              </span>
            </div>

            {/* Card body */}
            <div className="p-4 sm:p-8">

              {/* ── Step 0: Dados da Ocorrência ── */}
              {currentStep === 0 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Lojas */}
                    <div>
                      <label className="block text-sm text-gray-700 mb-1.5">
                        Loja(s) / LUC(s) <span className="text-[#D93030]">*</span>
                      </label>
                      <Controller
                        name="store_ids"
                        control={control}
                        rules={{ validate: v => v.length > 0 || "Selecione ao menos uma loja / LUC" }}
                        render={({ field }) => (
                          <StoreSelect
                            options={apiStores}
                            selectedIds={field.value}
                            onChange={field.onChange}
                            placeholder="Selecione uma ou mais lojas..."
                            hasError={!!errors.store_ids}
                            isLoading={storesLoading}
                            isError={storesError}
                          />
                        )}
                      />
                      {errors.store_ids && (
                        <p className="mt-1 text-xs text-[#D93030] flex items-center">
                          <AlertCircle className="w-3 h-3 mr-1" /> {errors.store_ids.message}
                        </p>
                      )}
                      {hasIrregularPolicySelected && (
                        <div className="mt-2 flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-[#D93030] mt-0.5 flex-shrink-0" />
                          <span className="text-sm font-semibold text-[#D93030]">Uma ou mais lojas com apólice irregular</span>
                        </div>
                      )}
                    </div>

                    {/* Data */}
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
                        className={`w-full border ${errors.date ? "border-[#D93030] bg-red-50" : "border-gray-200"} rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] bg-white text-gray-900 text-sm outline-none transition-colors`}
                      />
                      {errors.date && (
                        <p className="mt-1 text-xs text-[#D93030] flex items-center">
                          <AlertCircle className="w-3 h-3 mr-1" /> {errors.date.message}
                        </p>
                      )}
                    </div>

                    {/* Tipo */}
                    <div className={isOtherType ? "" : "md:col-span-1"}>
                      <label className="block text-sm text-gray-700 mb-1.5">
                        Tipo de Ocorrência <span className="text-[#D93030]">*</span>
                      </label>
                      <div className="relative">
                        <select
                          {...register("type", { required: "Selecione o tipo de ocorrência" })}
                          className={`w-full border ${errors.type ? "border-[#D93030] bg-red-50" : "border-gray-200"} rounded-xl py-2.5 px-3 pr-9 focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] bg-white text-gray-900 text-sm outline-none appearance-none transition-colors`}
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

                    {/* Outros */}
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
                          className={`w-full border ${errors.otherType ? "border-[#D93030] bg-red-50" : "border-gray-200"} rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] bg-white text-gray-900 text-sm outline-none transition-colors`}
                        />
                        {errors.otherType && (
                          <p className="mt-1 text-xs text-[#D93030] flex items-center">
                            <AlertCircle className="w-3 h-3 mr-1" /> {errors.otherType.message}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Gravidade */}
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
                      <div className={`mt-2 flex items-center space-x-1.5 text-xs rounded-lg px-3 py-2 border
                        ${watchedSeverity === "Alta" ? "bg-red-50 border-red-100 text-[#D93030]" :
                          watchedSeverity === "Média" ? "bg-yellow-50 border-yellow-100 text-yellow-700" :
                            "bg-green-50 border-green-100 text-green-700"}`}>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0
                          ${watchedSeverity === "Alta" ? "bg-[#D93030]" :
                            watchedSeverity === "Média" ? "bg-yellow-500" : "bg-green-500"}`} />
                        <span>
                          {watchedSeverity === "Alta" && "Sinistro de alta gravidade — evidências obrigatórias"}
                          {watchedSeverity === "Média" && "Sinistro de gravidade intermediária"}
                          {watchedSeverity === "Baixa" && "Sinistro de baixa complexidade operacional"}
                        </span>
                      </div>
                    </div>

                    {/* Áreas Responsáveis */}
                    <div>
                      <label className="block text-sm text-gray-700 mb-1.5">
                        Área(s) Responsável(is) <span className="text-[#D93030]">*</span>
                      </label>
                      <Controller
                        name="responsibleAreas"
                        control={control}
                        rules={{ validate: v => v.length > 0 || "Selecione ao menos uma área responsável" }}
                        render={({ field }) => (
                          <AreaSelect
                            options={AREAS}
                            selected={field.value}
                            onChange={field.onChange}
                            placeholder="Selecione uma ou mais áreas..."
                            hasError={!!errors.responsibleAreas}
                          />
                        )}
                      />
                      {errors.responsibleAreas && (
                        <p className="mt-1 text-xs text-[#D93030] flex items-center">
                          <AlertCircle className="w-3 h-3 mr-1" /> {errors.responsibleAreas.message}
                        </p>
                      )}
                    </div>

                    {/* Descrição */}
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
                        className={`w-full border ${errors.description ? "border-[#D93030] bg-red-50" : "border-gray-200"} rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] bg-white text-gray-900 text-sm outline-none resize-none transition-colors`}
                      />
                      {errors.description && (
                        <p className="mt-1 text-xs text-[#D93030] flex items-center">
                          <AlertCircle className="w-3 h-3 mr-1" /> {errors.description.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 1: Dados do Lojista ── */}
              {currentStep === 1 && (
                <div className="space-y-5">
                  {selectedStoresData.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">Nenhuma loja selecionada. Volte ao passo anterior e selecione ao menos uma loja.</p>
                  )}
                  {selectedStoresData.map((store) => (
                    <div key={store.id} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Building2 className="w-4 h-4 text-[#8B1A1A]" />
                        <span className="text-sm font-semibold text-[#8B1A1A]">{store.name}</span>
                        {store.code && <span className="text-xs text-gray-400">— {store.code}</span>}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1.5">Nome do Responsável</label>
                          <input
                            type="text"
                            placeholder="Nome completo..."
                            value={storeContacts[store.id]?.name || ""}
                            onChange={e => setStoreContacts(prev => ({ ...prev, [store.id]: { ...prev[store.id], name: e.target.value } }))}
                            className="w-full border border-gray-200 rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] bg-white text-gray-900 text-sm outline-none transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1.5">Contato (e-mail ou telefone)</label>
                          <input
                            type="text"
                            placeholder="E-mail ou telefone..."
                            value={storeContacts[store.id]?.contact || ""}
                            onChange={e => setStoreContacts(prev => ({ ...prev, [store.id]: { ...prev[store.id], contact: e.target.value } }))}
                            className="w-full border border-gray-200 rounded-xl py-2.5 px-3 focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] bg-white text-gray-900 text-sm outline-none transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Step 2: Evidências ── */}
              {currentStep === 2 && (
                <div>
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

                  <label
                    className={`block border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer
                      ${isDragging
                        ? "border-[#8B1A1A] bg-red-50/60 scale-[1.01]"
                        : isHighSeverity && files.length === 0
                          ? "border-[#D93030]/40 bg-red-50/30 hover:bg-red-50/50"
                          : "border-gray-200 hover:border-[#8B1A1A]/30 hover:bg-gray-50/50"
                      }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      multiple
                      accept="image/*,application/pdf,video/mp4"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <UploadCloud className={`w-7 h-7 ${isDragging ? "text-[#8B1A1A]" : "text-gray-400"}`} />
                    </div>
                    <p className="text-sm text-gray-700 mb-1">
                      Arraste arquivos aqui ou <span className="text-[#8B1A1A] font-semibold">clique para selecionar</span>
                    </p>
                    <p className="text-xs text-gray-400 mb-5">
                      Formatos aceitos: JPG, PNG, PDF, MP4 · Máx. 50 MB por arquivo
                    </p>
                    <span className="inline-flex items-center pointer-events-none bg-white border border-gray-200 text-gray-700 px-5 py-2 rounded-xl text-sm font-medium shadow-sm">
                      <FileText className="w-4 h-4 mr-2" />
                      Selecionar Arquivos
                    </span>
                  </label>

                  {files.length > 0 && (
                    <div className="mt-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm text-gray-700">
                          Arquivos Selecionados
                          <span className="ml-2 px-2 py-0.5 bg-[#8B1A1A] text-white text-xs rounded-full">{files.length}</span>
                        </h4>
                        <div className="flex items-center text-xs text-green-600">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Evidências anexadas com sucesso
                        </div>
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
              )}
            </div>

            {/* ── Card footer: arrow navigation ── */}
            {submitError && (
              <div className="px-4 sm:px-8 py-3 bg-red-50 border-t border-red-100">
                <p className="text-sm text-red-600 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {submitError}
                </p>
              </div>
            )}
            <div className="px-4 sm:px-8 py-4 border-t border-gray-100 bg-gray-50/40 flex items-center justify-between">
              {currentStep === 0 ? (
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-colors"
                >
                  Cancelar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCurrentStep(s => s - 1)}
                  className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>
              )}

              {currentStep < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); goToStep(currentStep + 1); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#8B1A1A] text-white rounded-xl text-sm font-semibold hover:bg-[#701515] shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
                >
                  Próximo
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition-all
                    ${canSubmit
                      ? "bg-[#8B1A1A] hover:bg-[#701515] hover:shadow-lg active:scale-[0.98]"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                    }`}
                >
                  <Save className="w-4 h-4" />
                  Registrar Sinistro
                  {!canSubmit && isHighSeverity && (
                    <span className="ml-1 text-xs opacity-80">(Evidências necessárias)</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* ── Duplicate Warning Modal ── */}
      {showDuplicateModal && duplicateInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowDuplicateModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="h-1.5 bg-amber-400 w-full" />
            <div className="p-6">
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