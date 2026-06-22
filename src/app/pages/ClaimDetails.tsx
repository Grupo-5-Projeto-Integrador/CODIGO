import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import {
  getClaimById as apiGetClaimById,
  updateClaim as apiUpdateClaim,
  addAuditEntry as apiAddAuditEntry,
  uploadClaimFiles as apiUploadClaimFiles,
  getClaimNotificationData,
  getClaimWhatsappLink,
  updateStoreContact,
  type ApiClaim,
  type AuditEntry,
  type NotificationDataResponse,
  type ClaimNotifRecord,
} from "../api";
import { useAuth } from "../context/AuthContext";

type Claim = ApiClaim;
type ClaimStatus = "Em análise" | "Aguardando seguradora" | "Pago" | "Concluído" | "Cancelado";
// user/userInitials/userRole são opcionais — o componente pai injeta o usuário autenticado
type AuditEntryInput = Omit<AuditEntry, "id" | "timestamp" | "user" | "userInitials" | "userRole"> & {
  id?: string;
  timestamp?: string;
  user?: string;
  userInitials?: string;
  userRole?: string;
};

function buildInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
import {
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  ArrowLeft,
  Image as ImageIcon,
  FileArchive,
  Video,
  Info,
  ExternalLink,
  Bell,
  Mail,
  MessageCircle,
  Send,
  Phone,
  Edit3,
  UploadCloud,
  Trash2,
  ChevronDown,
  UserCheck,
  AlertCircle,
  X,
  Shield,
  Plus,
} from "lucide-react";

// ── Confirmation Modal ─────────────────────────────────────────────────────
interface ConfirmModalProps {
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({ open, message, onConfirm, onCancel }: ConfirmModalProps) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.35)",
        padding: "1rem",
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-[#E8DCCB] rounded-2xl shadow-xl p-6 w-full max-w-sm"
      >
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E8DCCB] flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-[#8B1A1A]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-1">
              Confirmar ação
            </p>
            <p className="text-sm text-gray-500 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-[#E8DCCB] text-gray-600 hover:bg-[#FAF7F2] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#8B1A1A] text-white hover:bg-[#701515] active:scale-[0.98] transition-all"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Toast Notification ─────────────────────────────────────────────────────
interface ToastProps {
  open: boolean;
  message: string;
  type?: "success" | "info";
}

function Toast({ open, message, type = "success" }: ToastProps) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: "1.5rem",
        right: "1.5rem",
        zIndex: 9999,
      }}
      className="flex items-center gap-3 bg-white border border-[#E8DCCB] rounded-2xl shadow-lg px-4 py-3 min-w-[260px]"
    >
      <div className="w-7 h-7 rounded-lg bg-[#FAF7F2] flex items-center justify-center flex-shrink-0">
        <CheckCircle2 className="w-4 h-4 text-[#8B1A1A]" />
      </div>
      <p className="text-sm font-medium text-gray-800">{message}</p>
    </div>
  );
}

// ── useConfirm hook ────────────────────────────────────────────────────────
function useConfirm() {
  const [state, setState] = useState<{
    open: boolean;
    message: string;
    resolve: ((v: boolean) => void) | null;
  }>({ open: false, message: "", resolve: null });

  const confirm = useCallback(
    (message: string): Promise<boolean> =>
      new Promise((resolve) => {
        setState({ open: true, message, resolve });
      }),
    []
  );

  const handleConfirm = () => {
    state.resolve?.(true);
    setState({ open: false, message: "", resolve: null });
  };

  const handleCancel = () => {
    state.resolve?.(false);
    setState({ open: false, message: "", resolve: null });
  };

  const modal = (
    <ConfirmModal
      open={state.open}
      message={state.message}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { confirm, modal };
}

// ── useToast hook ──────────────────────────────────────────────────────────
function useToast() {
  const [state, setState] = useState({ open: false, message: "" });

  const showToast = useCallback((message: string) => {
    setState({ open: true, message });
    setTimeout(() => setState({ open: false, message: "" }), 3000);
  }, []);

  const toast = <Toast open={state.open} message={state.message} />;

  return { showToast, toast };
}

// ── Multi-select dropdown (reusable inline) ────────────────────────────────
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

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}

function MultiSelect({ options, selected, onChange, placeholder }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (val: string) => {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  };

  const remove = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter(v => v !== val));
  };

  return (
    <div className="relative" ref={ref}>
      <div
        onClick={() => setOpen(o => !o)}
        className="w-full min-h-[38px] appearance-none border border-gray-200 rounded-xl py-1.5 px-3 pr-9 text-sm focus-within:ring-2 focus-within:ring-[#8B1A1A]/20 focus-within:border-[#8B1A1A] outline-none transition-colors cursor-pointer flex flex-wrap gap-1 items-center"
      >
        {selected.length === 0 ? (
          <span className="text-gray-400 text-sm">{placeholder}</span>
        ) : (
          selected.map(v => (
            <span
              key={v}
              className="inline-flex items-center gap-1 bg-[#8B1A1A]/10 text-[#8B1A1A] rounded-lg px-2 py-0.5 text-xs font-medium"
            >
              {v}
              <button type="button" onClick={e => remove(v, e)} className="hover:text-[#D93030] transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))
        )}
      </div>
      <ChevronDown className={`w-4 h-4 text-gray-400 absolute right-3 top-2.5 pointer-events-none transition-transform ${open ? "rotate-180" : ""}`} />

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-48 overflow-y-auto py-1">
            {options.map(opt => {
              const checked = selected.includes(opt);
              return (
                <label
                  key={opt}
                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${checked ? "bg-[#8B1A1A]/5" : ""}`}
                >
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
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-gray-400 hover:text-[#D93030] transition-colors"
              >
                Limpar seleção
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Audit Trail ────────────────────────────────────────────────────────────
function AuditTimeline({ entries }: { entries: AuditEntry[] }) {
  const TYPE_CONFIG = {
    created: { bg: "bg-blue-100", text: "text-blue-700", icon: "📂" },
    status_change: { bg: "bg-[#8B1A1A]/10", text: "text-[#8B1A1A]", icon: "🔄" },
    assignment: { bg: "bg-purple-100", text: "text-purple-700", icon: "👤" },
    document: { bg: "bg-amber-100", text: "text-amber-700", icon: "📎" },
    financial: { bg: "bg-emerald-100", text: "text-emerald-700", icon: "💰" },
    comment: { bg: "bg-gray-100", text: "text-gray-600", icon: "💬" },
  };

  const formatTimestamp = (iso: string) => {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString("pt-BR"),
      time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };
  };

  const ROLE_COLORS: Record<string, string> = {
    Gerente: "bg-[#8B1A1A] text-white",
    Regulador: "bg-blue-700 text-white",
    Financeiro: "bg-emerald-700 text-white",
    Analista: "bg-amber-600 text-white",
  };

  return (
    <div className="relative">
      <div className="absolute left-4 top-4 bottom-4 w-px bg-gray-100" />
      <div className="space-y-5">
        {[...entries].reverse().map((entry) => {
          const cfg = TYPE_CONFIG[entry.type] || TYPE_CONFIG.comment;
          const { date, time } = formatTimestamp(entry.timestamp);
          return (
            <div key={entry.id} className="relative flex items-start space-x-3 pl-2">
              <div className={`relative z-10 w-5 h-5 rounded-full ${cfg.bg} ${cfg.text} flex items-center justify-center text-xs flex-shrink-0 mt-0.5 border-2 border-white shadow-sm`}>
                <span style={{ fontSize: "10px" }}>{cfg.icon}</span>
              </div>
              <div className="flex-1 min-w-0 bg-gray-50/70 dark:bg-[#252545] border border-gray-100 dark:border-[#2E3447] rounded-xl p-3 hover:bg-gray-50 dark:hover:bg-[#2A2A4A] transition-colors">
                <div className="flex items-center justify-between flex-wrap gap-1.5 mb-1.5">
                  <div className="flex items-center space-x-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${ROLE_COLORS[entry.userRole] || "bg-gray-500 text-white"}`}>
                      {entry.userInitials}
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-gray-800 dark:text-[#f0f0f0]">{entry.user}</span>
                      <span className="ml-1.5 px-1.5 py-0.5 bg-gray-100 dark:bg-[#2a2a4a] text-gray-500 dark:text-[#cccccc] rounded text-[9px] font-medium">{entry.userRole}</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-600 dark:text-[#cccccc] leading-relaxed mb-1.5">{entry.action}</p>
                <div className="flex items-center text-[10px] text-gray-400 dark:text-[#888888]">
                  <Clock className="w-2.5 h-2.5 mr-1" />
                  {date} — {time}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab: Informações Gerais ────────────────────────────────────────────────
function TabGeneralInfo({
  claim,
  onUpdateClaim,
  onAddAuditEntry,
  confirm,
  showToast,
}: {
  claim: Claim;
  onUpdateClaim: (updates: Partial<Claim>) => void;
  onAddAuditEntry: (claimId: string, entry: AuditEntryInput) => void;
  confirm: (msg: string) => Promise<boolean>;
  showToast: (msg: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [newStatus, setNewStatus] = useState<ClaimStatus>(claim.status);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [responsibility, setResponsibility] = useState<"Externa" | "Interna">("Externa");
  const [cancelReason, setCancelReason] = useState("");
  const [cancelReasonError, setCancelReasonError] = useState(false);

  const handleCancelEdit = () => {
    setNewStatus(claim.status);
    setSelectedAreas([]);
    setResponsibility("Externa");
    setComment("");
    setCancelReason("");
    setCancelReasonError(false);
    setIsEditing(false);
  };

  const handleConfirmAll = async () => {
    // Block confirmation if Cancelado is selected but no reason given
    if (newStatus === "Cancelado" && !cancelReason.trim()) {
      setCancelReasonError(true);
      return;
    }
    setCancelReasonError(false);

    const ok = await confirm("Tem certeza que deseja confirmar todas as alterações?");
    if (!ok) return;

    const auditEntries: AuditEntryInput[] = [];

    if (newStatus !== claim.status) {
      const actionText = newStatus === "Cancelado"
        ? `Status alterado de ${claim.status} para Cancelado — Motivo: ${cancelReason.trim()}`
        : `Status alterado de ${claim.status} para ${newStatus}`;
      auditEntries.push({
        action: actionText,
        type: "status_change",
      });
      onUpdateClaim({ status: newStatus });
    }

    if (selectedAreas.length > 0) {
      const areasLabel = selectedAreas.join(", ");
      auditEntries.push({
        action: `Área(s) responsável(is) alterada(s) para: ${areasLabel}`,
        type: "assignment",
      });
      onUpdateClaim({ responsibleArea: areasLabel });
    }

    auditEntries.push({
      action: `Responsabilidade definida como: ${responsibility}`,
      type: "assignment",
    });

    if (comment.trim()) {
      auditEntries.push({
        action: comment,
        type: "comment",
      });
    }

    auditEntries.forEach(entry => onAddAuditEntry(claim.id, entry));
    showToast("Alterações confirmadas com sucesso");
    setIsEditing(false);
    setSelectedAreas([]);
    setComment("");
    setCancelReason("");
    setCancelReasonError(false);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <InfoBlock label="Tipo de Ocorrência" value={claim.type} />
        <InfoBlock label="Local Afetado" value={claim.store} />
        <InfoBlock label="Data do Sinistro" value={new Date(claim.date + "T12:00:00").toLocaleDateString("pt-BR")} />
        <InfoBlock label="Nível de Gravidade" value={claim.severity} />
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Descrição Detalhada</p>
        <div className="bg-gray-50 dark:bg-[#252545] rounded-xl p-4 border border-gray-100 dark:border-[#2E3447] text-sm text-gray-700 dark:text-[#dddddd] leading-relaxed min-h-[80px]">
          {claim.description}
        </div>
      </div>



      {/* ── Situação Atual ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center space-x-2.5 mb-4 pb-3 border-b border-gray-100">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
            <Info className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="text-gray-900 text-sm font-semibold">Situação Atual</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoBlock label="Status" value={claim.status} />
          <InfoBlock label="Responsabilidade" value={([...(claim.auditTrail ?? [])].reverse().find(e => e.action.startsWith("Responsabilidade definida"))?.action.replace("Responsabilidade definida como: ", "")) || "Não definida"} />
          <div className="md:col-span-2">
            <InfoBlock label="Área(s) Responsável(is)" value={claim.responsibleArea || "Não definida"} />
          </div>
          {/* Motivo de cancelamento */}
          {claim.status === "Cancelado" && (() => {
            const entry = [...(claim.auditTrail ?? [])].reverse().find(e => e.action.includes("Motivo:"));
            if (!entry) return null;
            const motivo = entry.action.replace(/.*Motivo:\s*/, "").trim();
            return (
              <div className="md:col-span-2">
                <div className="bg-red-50 border border-red-100 rounded-xl p-3.5">
                  <p className="text-[10px] font-semibold text-[#D93030] uppercase tracking-wider mb-1">Motivo do Cancelamento</p>
                  <p className="text-sm text-red-800 leading-relaxed">{motivo}</p>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Comentários da trilha de auditoria */}
        {(() => {
          const comments = claim.auditTrail?.filter(e => e.type === "comment" && !e.action.startsWith("Notificação") && !e.action.startsWith("Lojista notificado") && !e.action.startsWith("Área")) ?? [];
          if (comments.length === 0) return null;
          return (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Comentários</p>
              <div className="space-y-2">
                {comments.map(c => (
                  <div key={c.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-700">{c.user}</span>
                      <span className="text-[10px] text-gray-400">{new Date(c.timestamp).toLocaleDateString("pt-BR")} {new Date(c.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{c.action}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      <div className={`bg-white rounded-2xl border shadow-sm p-5 transition-colors ${isEditing ? "border-[#8B1A1A]/30" : "border-gray-100"}`}>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
          <div className="flex items-center space-x-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isEditing ? "bg-[#8B1A1A]" : "bg-[#8B1A1A]/10"}`}>
              <Edit3 className={`w-4 h-4 transition-colors ${isEditing ? "text-white" : "text-[#8B1A1A]"}`} />
            </div>
            <h3 className="text-gray-900 text-sm font-semibold">Ações Rápidas</h3>
            {isEditing && (
              <span className="px-2 py-0.5 bg-[#8B1A1A]/10 text-[#8B1A1A] text-xs font-semibold rounded-full">Modo edição</span>
            )}
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-[#8B1A1A] hover:text-[#8B1A1A] hover:bg-[#8B1A1A]/5 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Editar
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Responsabilidade */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Responsabilidade</label>
            <div className="relative">
              <select
                value={responsibility}
                onChange={(e) => setResponsibility(e.target.value as "Externa" | "Interna")}
                disabled={!isEditing}
                className={`w-full appearance-none border rounded-xl py-2 px-3 pr-9 text-sm outline-none transition-colors ${isEditing ? "border-gray-200 focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] bg-white text-gray-900 cursor-pointer" : "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"}`}
              >
                <option value="Externa">Externa (Shopping)</option>
                <option value="Interna">Interna (Entre Lojas)</option>
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Alterar Status */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Alterar Status</label>
            <div className="relative">
              <select
                value={newStatus}
                onChange={(e) => {
                  setNewStatus(e.target.value as ClaimStatus);
                  if (e.target.value !== "Cancelado") {
                    setCancelReason("");
                    setCancelReasonError(false);
                  }
                }}
                disabled={!isEditing}
                className={`w-full appearance-none border rounded-xl py-2 px-3 pr-9 text-sm outline-none transition-colors ${isEditing ? "border-gray-200 focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] bg-white text-gray-900 cursor-pointer" : "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"}`}
              >
                <option value="Em análise">Em análise</option>
                <option value="Aguardando seguradora">Aguardando seguradora</option>
                <option value="Pago">Pago</option>
                <option value="Concluído">Concluído</option>
                <option value="Cancelado">Cancelado</option>
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {/* Justificativa de cancelamento — obrigatória */}
            {isEditing && newStatus === "Cancelado" && (
              <div className="mt-2">
                <textarea
                  value={cancelReason}
                  onChange={(e) => {
                    setCancelReason(e.target.value);
                    if (e.target.value.trim()) setCancelReasonError(false);
                  }}
                  placeholder="Justificativa do cancelamento (obrigatório)..."
                  rows={3}
                  className={`w-full border rounded-xl py-2 px-3 text-sm outline-none resize-none transition-colors focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] bg-white text-gray-900 ${cancelReasonError ? "border-[#D93030] bg-red-50" : "border-gray-200"}`}
                />
                {cancelReasonError && (
                  <p className="mt-1 text-xs text-[#D93030] flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    A justificativa é obrigatória para cancelar o sinistro.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Alterar Área(s) Responsável(is) — multi-select */}
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1.5">Alterar Área(s) Responsável(is)</label>
            {isEditing ? (
              <MultiSelect
                options={AREAS}
                selected={selectedAreas}
                onChange={setSelectedAreas}
                placeholder="Selecione uma ou mais áreas..."
              />
            ) : (
              <div className="w-full border border-gray-100 rounded-xl py-2 px-3 text-sm bg-gray-50 text-gray-400 cursor-not-allowed min-h-[38px]">
                Selecione uma ou mais áreas...
              </div>
            )}
          </div>

          {/* Adicionar Comentário */}
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1.5">Adicionar Comentário</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Digite um comentário sobre o sinistro..."
              rows={3}
              disabled={!isEditing}
              className={`w-full border rounded-xl py-2 px-3 text-sm outline-none resize-none transition-colors ${isEditing ? "border-gray-200 focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] bg-white text-gray-900" : "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"}`}
            />
          </div>
        </div>

        {/* Botões Cancelar + Confirmar — só aparecem no modo edição */}
        {isEditing && (
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={handleCancelEdit}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmAll}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#8B1A1A] text-white hover:bg-[#701515] active:scale-[0.98] transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirmar alterações
            </button>
          </div>
        )}
      </div>

      {/* Histórico */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-[#8B1A1A]" />
            <h3 className="text-sm font-semibold text-gray-900">Histórico de Sinistros</h3>
          </div>
          <span className="px-2 py-0.5 bg-[#8B1A1A] text-white text-xs rounded-full font-semibold">
            {claim.auditTrail?.length || 0}
          </span>
        </div>
        {claim.auditTrail && claim.auditTrail.length > 0 ? (
          <AuditTimeline entries={claim.auditTrail} />
        ) : (
          <div className="text-center py-10 text-gray-400">
            <Clock className="w-8 h-8 mx-auto mb-3 text-gray-200" />
            <p className="text-xs">Nenhum registro no histórico</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab: Galeria de Evidências ─────────────────────────────────────────────
function TabEvidences({
  files,
  claimId,
  onUpdateClaim,
  onFilesChange,
  onAddAuditEntry,
  confirm,
}: {
  files: string[];
  claimId: string;
  onUpdateClaim: (updates: Partial<Claim>) => void;
  onFilesChange: (files: string[]) => void;
  onAddAuditEntry: (claimId: string, entry: AuditEntryInput) => void;
  confirm: (msg: string) => Promise<boolean>;
}) {
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // objectURLs keyed by file name for real File objects
  const [objectURLs, setObjectURLs] = useState<Record<string, string>>({});
  const objectURLsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    objectURLsRef.current = objectURLs;
  }, [objectURLs]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => { Object.values(objectURLsRef.current).forEach(URL.revokeObjectURL); };
  }, []);

  const getFileIcon = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext || "")) return <ImageIcon className="w-8 h-8 text-blue-400" />;
    if (ext === "pdf") return <FileText className="w-8 h-8 text-red-400" />;
    if (["mp4", "mov", "avi"].includes(ext || "")) return <Video className="w-8 h-8 text-purple-400" />;
    return <FileArchive className="w-8 h-8 text-gray-400" />;
  };

  const getBadgeColor = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "webp"].includes(ext || "")) return "bg-blue-100 text-blue-700";
    if (ext === "pdf") return "bg-red-100 text-red-700";
    if (["mp4", "mov"].includes(ext || "")) return "bg-purple-100 text-purple-700";
    return "bg-gray-100 text-gray-600";
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const addFiles = (incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    const urls: Record<string, string> = {};
    arr.forEach(f => { urls[f.name] = URL.createObjectURL(f); });
    setObjectURLs(prev => ({ ...prev, ...urls }));
    setNewFiles(prev => [...prev, ...arr]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length > 0) addFiles(e.dataTransfer.files);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
  };

  const removeNewFile = (index: number) => {
    setNewFiles(prev => {
      const removed = prev[index];
      if (objectURLs[removed.name]) URL.revokeObjectURL(objectURLs[removed.name]);
      setObjectURLs(o => { const n = { ...o }; delete n[removed.name]; return n; });
      return prev.filter((_, i) => i !== index);
    });
  };

  const saveNewFiles = async () => {
    if (newFiles.length === 0 || isSaving) return;
    const ok = await confirm(`Deseja salvar ${newFiles.length} evidência(s) neste sinistro?`);
    if (!ok) return;
    setIsSaving(true);
    try {
      const originalNames = newFiles.map(f => f.name);
      const result = await apiUploadClaimFiles(claimId, newFiles);
      onFilesChange(result.files);
      Object.values(objectURLs).forEach(URL.revokeObjectURL);
      setObjectURLs({});
      setNewFiles([]);
      onAddAuditEntry(claimId, {
        action: `${originalNames.length} evidência(s) anexada(s): ${originalNames.join(", ")}`,
        type: "document",
      });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Erro ao salvar evidências.");
    } finally {
      setIsSaving(false);
    }
  };

  const removeExistingFile = async (fileName: string) => {
    const ok = await confirm(`Deseja remover permanentemente o arquivo "${fileName}"?`);
    if (!ok) return;
    onUpdateClaim({ files: files.filter(f => f !== fileName) });
    onAddAuditEntry(claimId, {
      action: `Evidência removida: ${fileName}`,
      type: "document",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-5">
      {/* Anexar novos */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Anexar Novas Evidências</h4>
        <label
          className={`block border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${isDragging ? "border-[#8B1A1A] bg-red-50/60" : "border-gray-200 hover:border-[#8B1A1A]/30 hover:bg-gray-50/50"}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input type="file" multiple accept="image/*,application/pdf,video/mp4" className="hidden" onChange={handleFileChange} />
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <UploadCloud className={`w-6 h-6 ${isDragging ? "text-[#8B1A1A]" : "text-gray-400"}`} />
          </div>
          <p className="text-sm text-gray-700 mb-1">Arraste arquivos aqui ou <span className="text-[#8B1A1A] font-semibold">clique para selecionar</span></p>
          <p className="text-xs text-gray-400 mb-3">JPG, PNG, PDF, MP4 · Máx. 50 MB</p>
          <span className="inline-flex items-center pointer-events-none bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium">
            <FileText className="w-4 h-4 mr-2" />
            Selecionar Arquivos
          </span>
        </label>

        {newFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 font-medium">Prontos para salvar ({newFiles.length})</p>
              <button
                onClick={saveNewFiles}
                disabled={isSaving}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isSaving ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-[#8B1A1A] text-white hover:bg-[#701515]"}`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isSaving ? "Salvando..." : "Salvar evidências"}
              </button>
            </div>
            <div className="space-y-2">
              {newFiles.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 border border-gray-100 rounded-lg">
                  <div className="flex items-center space-x-2 overflow-hidden flex-1">
                    <div className="w-8 h-8 bg-white rounded-lg border border-gray-200 flex items-center justify-center text-xs flex-shrink-0">
                      {getFileIcon(file.name)}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs text-gray-800 truncate">{file.name}</p>
                      <p className="text-[10px] text-gray-400">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    {objectURLs[file.name] && (
                      <button
                        onClick={() => window.open(objectURLs[file.name], "_blank", "noopener,noreferrer")}
                        className="text-gray-400 hover:text-[#8B1A1A] p-1 rounded transition-colors"
                        title="Visualizar"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => removeNewFile(idx)} className="text-gray-300 hover:text-red-500 p-1 rounded transition-colors" title="Remover">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Arquivos existentes */}
      {!files || files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 mb-4">
            <ImageIcon className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-sm font-medium">Nenhuma evidência anexada</p>
        </div>
      ) : (
        <div>
          <p className="text-xs text-gray-400 mb-3">{files.length} arquivo(s) anexado(s)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {files.map((file, idx) => {
              const fileUrl = `/uploads/${encodeURIComponent(file)}`;
              return (
                <div
                  key={idx}
                  className="group relative flex flex-col items-center justify-center p-5 bg-gray-50 dark:bg-[#252545] border border-gray-100 dark:border-[#2E3447] rounded-2xl hover:border-[#8B1A1A]/30 hover:bg-red-50/20 transition-all"
                >
                  {/* Delete button */}
                  <button
                    onClick={() => removeExistingFile(file)}
                    title="Remover arquivo"
                    className="absolute top-2 right-2 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-300 hover:text-[#D93030] hover:border-red-200 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                  >
                    <X className="w-3 h-3" />
                  </button>

                  <div className="mb-3">{getFileIcon(file)}</div>
                  <p className="text-xs font-medium text-gray-700 dark:text-[#dddddd] text-center truncate w-full">{file}</p>
                  <span className={`mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${getBadgeColor(file)}`}>
                    {file.split(".").pop()?.toUpperCase()}
                  </span>

                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex items-center text-[10px] text-[#8B1A1A] font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" /> Visualizar
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Modal de edição de contato ─────────────────────────────────────────────
function EditContactModal({
  open,
  currentEmail,
  currentPhone,
  onSave,
  onClose,
}: {
  open: boolean;
  currentEmail: string;
  currentPhone: string;
  onSave: (email: string, phone: string) => Promise<void>;
  onClose: () => void;
}) {
  const [email, setEmail] = useState(currentEmail);
  const [phone, setPhone] = useState(currentPhone);
  const [emailError, setEmailError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail(currentEmail);
      setPhone(currentPhone);
      setEmailError("");
      setSaveError("");
    }
  }, [open, currentEmail, currentPhone]);

  const handleSave = async () => {
    const trimEmail = email.trim();
    const trimPhone = phone.trim();
    if (trimEmail && !trimEmail.includes("@")) {
      setEmailError("Email inválido.");
      return;
    }
    setEmailError("");
    setSaveError("");
    setIsSaving(true);
    try {
      await onSave(trimEmail, trimPhone);
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erro ao salvar contato.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)", padding: "1rem" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-[#E8DCCB] rounded-2xl shadow-xl p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#8B1A1A]/10 flex items-center justify-center">
              <Phone className="w-4 h-4 text-[#8B1A1A]" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900">Editar contato do lojista</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              Email <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                placeholder="lojista@exemplo.com.br"
                className={`w-full border rounded-xl py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] ${emailError ? "border-red-300 bg-red-50" : "border-gray-200"}`}
              />
            </div>
            {emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
          </div>

          {/* WhatsApp */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              WhatsApp / Telefone <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <div className="relative">
              <MessageCircle className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(62) 99999-9999 ou 556299999999"
                className="w-full border border-gray-200 rounded-xl py-2.5 pl-9 pr-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A]"
              />
            </div>
            <p className="mt-1 text-[10px] text-gray-400">
              Pode incluir formatação — será normalizado automaticamente para o link WhatsApp.
            </p>
          </div>
        </div>

        {saveError && (
          <div className="mt-4 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-600">{saveError}</p>
          </div>
        )}

        <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${
              isSaving ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-[#8B1A1A] text-white hover:bg-[#701515] active:scale-[0.98]"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSaving ? "Salvando..." : "Salvar contato"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Notificações ──────────────────────────────────────────────────────
const AREA_DEFAULTS: Record<string, { phone: string; email: string }> = {
  "Brigada":       { phone: "(62) 99000-2001", email: "brigada@flamboyant.com.br" },
  "Manutenção":    { phone: "(62) 99000-2002", email: "manutencao@flamboyant.com.br" },
  "Segurança":     { phone: "(62) 99000-2003", email: "seguranca@flamboyant.com.br" },
  "Administração": { phone: "(62) 99000-2004", email: "admin@flamboyant.com.br" },
  "Limpeza":       { phone: "(62) 99000-2005", email: "limpeza@flamboyant.com.br" },
  "TI":            { phone: "(62) 99000-2006", email: "ti@flamboyant.com.br" },
  "RH":            { phone: "(62) 99000-2007", email: "rh@flamboyant.com.br" },
  "Engenharia":    { phone: "(62) 99000-2008", email: "engenharia@flamboyant.com.br" },
  "Conservação":   { phone: "(62) 99000-2009", email: "conservacao@flamboyant.com.br" },
  "Relacionamento":{ phone: "(62) 99000-2010", email: "relacionamento@flamboyant.com.br" },
  "Segurança / CFTV": { phone: "(62) 99000-2011", email: "cftv@flamboyant.com.br" },
  "Estacionamento":{ phone: "(62) 99000-2012", email: "estacionamento@flamboyant.com.br" },
  "Arquitetura":   { phone: "(62) 99000-2013", email: "arquitetura@flamboyant.com.br" },
};

// ── Painel de notificação de um lojista ────────────────────────────────────
function LojistaPainelNotif({
  claimId, claimStatus, storeKey, storeName, initialName, initialContact,
  defaultEmail, defaultPhone, backendStoreId, messageTemplate,
  onAddAuditEntry, showToast, onRefreshHistory,
}: {
  claimId: string; claimStatus: string; storeKey: string; storeName: string;
  initialName: string; initialContact: string;
  defaultEmail: string; defaultPhone: string; backendStoreId: number;
  messageTemplate: string;
  onAddAuditEntry: (id: string, entry: AuditEntryInput) => void;
  showToast: (msg: string) => void;
  onRefreshHistory: () => void;
}) {
  type ContactItem = { id: string; name: string; phone: string };
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [message, setMessage] = useState("");
  const prevStatusRef = useRef("");
  const inited = useRef(false);

  useEffect(() => {
    if (inited.current) return;
    inited.current = true;
    const saved = localStorage.getItem(`notif-tenant-contacts-${claimId}-${storeKey}`);
    if (saved) {
      setContacts(JSON.parse(saved));
      return;
    }
    const ec = initialContact?.trim() || "";
    const ecIsPhone = ec && !ec.includes("@");
    const initialPhone = ecIsPhone ? ec : (defaultPhone || "");
    setContacts([{ id: "0", name: initialName || "", phone: initialPhone }]);
  }, []);

  useEffect(() => {
    if (!messageTemplate) return;
    const statusChanged = prevStatusRef.current !== claimStatus;
    if (message && !statusChanged) return;
    prevStatusRef.current = claimStatus;
    setMessage(messageTemplate);
  }, [messageTemplate, claimStatus]);

  const saveContacts = (updated: ContactItem[]) => {
    setContacts(updated);
    localStorage.setItem(`notif-tenant-contacts-${claimId}-${storeKey}`, JSON.stringify(updated));
    if (backendStoreId > 0 && updated[0]) {
      updateStoreContact(backendStoreId, { email: defaultEmail, phone: updated[0].phone }).catch(() => {});
    }
  };

  const updateContact = (id: string, field: "name" | "phone", value: string) => {
    saveContacts(contacts.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const addContact = () => {
    saveContacts([...contacts, { id: String(Date.now()), name: "", phone: "" }]);
  };

  const removeContact = (id: string) => {
    if (contacts.length <= 1) return;
    saveContacts(contacts.filter(c => c.id !== id));
  };

  const openWhatsApp = (contact: ContactItem) => {
    if (!contact.phone?.trim() || !message.trim()) return;
    const digits = contact.phone.replace(/\D/g, "");
    const wa = digits.startsWith("55") ? digits : `55${digits}`;
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    onAddAuditEntry(claimId, { action: `Link WhatsApp gerado para ${contact.name || storeName} (${contact.phone})`, type: "comment" });
    setTimeout(onRefreshHistory, 600);
    showToast(`WhatsApp aberto para ${contact.name || contact.phone}`);
  };

  return (
    <div className="rounded-2xl border border-[#8B1A1A]/20 overflow-hidden shadow-sm">
      <div className="bg-[#8B1A1A]/8 px-5 py-3 border-b border-[#8B1A1A]/15 flex items-center gap-2">
        <Building2 className="w-4 h-4 text-[#8B1A1A]" />
        <h3 className="text-sm font-bold text-[#8B1A1A]">Notificar Lojista — {storeName}</h3>
      </div>
      <div className="bg-white p-5 space-y-5">
        {/* Lista de contatos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Contatos para notificação</p>
            <button onClick={addContact} className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#8B1A1A]/30 text-xs font-semibold text-[#8B1A1A] hover:bg-[#8B1A1A]/5 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Adicionar contato
            </button>
          </div>
          {contacts.map((c) => (
            <div key={c.id} className="flex items-center gap-2 bg-gray-50 rounded-xl p-3 border border-gray-100">
              <div className="w-8 h-8 bg-[#8B1A1A]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-4 h-4 text-[#8B1A1A]" />
              </div>
              <input
                type="text"
                value={c.name}
                onChange={e => updateContact(c.id, "name", e.target.value)}
                placeholder="Nome do responsável"
                className="flex-1 min-w-0 border border-gray-200 rounded-lg py-1.5 px-2.5 text-sm outline-none focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] bg-white transition-colors"
              />
              <input
                type="text"
                value={c.phone}
                onChange={e => updateContact(c.id, "phone", e.target.value)}
                placeholder="WhatsApp / telefone"
                className="flex-1 min-w-0 border border-gray-200 rounded-lg py-1.5 px-2.5 text-sm outline-none focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] bg-white transition-colors"
              />
              <button
                onClick={() => openWhatsApp(c)}
                disabled={!c.phone?.trim() || !message.trim()}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0 ${!c.phone?.trim() || !message.trim() ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-green-500 text-white hover:bg-green-600 active:scale-[0.98]"}`}
              >
                <Send className="w-3.5 h-3.5" /> WhatsApp
              </button>
              {contacts.length > 1 && (
                <button onClick={() => removeContact(c.id)} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Mensagem */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700">Mensagem</p>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={7} placeholder="Digite a mensagem que será enviada via WhatsApp..." className="w-full border border-gray-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] bg-white text-gray-900 text-sm outline-none resize-none transition-colors" />
        </div>

        {/* Email desabilitado */}
        <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-2xl p-4 opacity-60">
          <div className="flex items-center gap-3"><div className="w-10 h-10 bg-gray-300 rounded-xl flex items-center justify-center"><Mail className="w-5 h-5 text-white" /></div><div><p className="text-sm font-semibold text-gray-600">Email</p><p className="text-xs text-gray-400">Configure SMTP em backend/.env para ativar</p></div></div>
          <button disabled className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gray-200 text-gray-400 cursor-not-allowed"><Mail className="w-4 h-4" />Indisponível</button>
        </div>
      </div>
    </div>
  );
}

// ── Painel de notificação de uma área responsável ──────────────────────────
function AreaPainelNotif({
  claimId, claimStatus, areaName,
  claimCode, storeName: claimStore, claimDate, claimSeverity, claimDescription,
  onAddAuditEntry, showToast, onRefreshHistory,
}: {
  claimId: string; claimStatus: string; areaName: string;
  claimCode: string; storeName: string; claimDate: string;
  claimSeverity: string; claimDescription: string;
  onAddAuditEntry: (id: string, entry: AuditEntryInput) => void;
  showToast: (msg: string) => void;
  onRefreshHistory: () => void;
}) {
  type ContactItem = { id: string; name: string; phone: string };
  const def = AREA_DEFAULTS[areaName] || { phone: "", email: "" };
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [message, setMessage] = useState("");
  const prevStatusRef = useRef("");
  const inited = useRef(false);

  const buildTemplate = (status: string) => {
    const dt = claimDate ? new Date(claimDate + "T12:00:00").toLocaleDateString("pt-BR") : "—";
    return `*JP Mall — Notificação Interna*\n\nÁrea responsável: *${areaName}*\nSinistro: ${claimCode}\nLoja: ${claimStore}\nData: ${dt}\nGravidade: ${claimSeverity}\nStatus: ${status}\n\n${claimDescription}`;
  };

  useEffect(() => {
    if (inited.current) return;
    inited.current = true;
    const saved = localStorage.getItem(`notif-area-contacts-${claimId}-${areaName}`);
    if (saved) {
      setContacts(JSON.parse(saved));
    } else {
      setContacts([{ id: "0", name: "", phone: def.phone }]);
    }
    setMessage(buildTemplate(claimStatus));
    prevStatusRef.current = claimStatus;
  }, []);

  useEffect(() => {
    if (prevStatusRef.current === claimStatus) return;
    prevStatusRef.current = claimStatus;
    setMessage(buildTemplate(claimStatus));
  }, [claimStatus]);

  const saveContacts = (updated: ContactItem[]) => {
    setContacts(updated);
    localStorage.setItem(`notif-area-contacts-${claimId}-${areaName}`, JSON.stringify(updated));
  };

  const updateContact = (id: string, field: "name" | "phone", value: string) => {
    saveContacts(contacts.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const addContact = () => {
    saveContacts([...contacts, { id: String(Date.now()), name: "", phone: "" }]);
  };

  const removeContact = (id: string) => {
    if (contacts.length <= 1) return;
    saveContacts(contacts.filter(c => c.id !== id));
  };

  const openWhatsApp = (contact: ContactItem) => {
    if (!contact.phone?.trim() || !message.trim()) return;
    const digits = contact.phone.replace(/\D/g, "");
    const wa = digits.startsWith("55") ? digits : `55${digits}`;
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    onAddAuditEntry(claimId, { action: `Área ${areaName} notificada via WhatsApp: ${contact.name || areaName} (${contact.phone})`, type: "comment" });
    setTimeout(onRefreshHistory, 600);
    showToast(`WhatsApp aberto para ${contact.name || areaName}`);
  };

  return (
    <div className="rounded-2xl border border-blue-200 overflow-hidden shadow-sm">
      <div className="bg-blue-50 px-5 py-3 border-b border-blue-100 flex items-center gap-2">
        <Shield className="w-4 h-4 text-blue-600" />
        <h3 className="text-sm font-bold text-blue-700">Notificar Área — {areaName}</h3>
      </div>
      <div className="bg-white p-5 space-y-5">
        {/* Lista de contatos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Contatos para notificação</p>
            <button onClick={addContact} className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-blue-300 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Adicionar contato
            </button>
          </div>
          {contacts.map((c) => (
            <div key={c.id} className="flex items-center gap-2 bg-blue-50/50 rounded-xl p-3 border border-blue-100">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-blue-600" />
              </div>
              <input
                type="text"
                value={c.name}
                onChange={e => updateContact(c.id, "name", e.target.value)}
                placeholder="Nome do responsável"
                className="flex-1 min-w-0 border border-gray-200 rounded-lg py-1.5 px-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-colors"
              />
              <input
                type="text"
                value={c.phone}
                onChange={e => updateContact(c.id, "phone", e.target.value)}
                placeholder="WhatsApp / telefone"
                className="flex-1 min-w-0 border border-gray-200 rounded-lg py-1.5 px-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-colors"
              />
              <button
                onClick={() => openWhatsApp(c)}
                disabled={!c.phone?.trim() || !message.trim()}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0 ${!c.phone?.trim() || !message.trim() ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-green-500 text-white hover:bg-green-600 active:scale-[0.98]"}`}
              >
                <Send className="w-3.5 h-3.5" /> WhatsApp
              </button>
              {contacts.length > 1 && (
                <button onClick={() => removeContact(c.id)} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Mensagem */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700">Mensagem</p>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={7} placeholder="Digite a mensagem que será enviada via WhatsApp..." className="w-full border border-gray-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-gray-900 text-sm outline-none resize-none transition-colors" />
        </div>

        {/* Email desabilitado */}
        <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-2xl p-4 opacity-60">
          <div className="flex items-center gap-3"><div className="w-10 h-10 bg-gray-300 rounded-xl flex items-center justify-center"><Mail className="w-5 h-5 text-white" /></div><div><p className="text-sm font-semibold text-gray-600">Email</p><p className="text-xs text-gray-400">Configure SMTP em backend/.env para ativar</p></div></div>
          <button disabled className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gray-200 text-gray-400 cursor-not-allowed"><Mail className="w-4 h-4" />Indisponível</button>
        </div>
      </div>
    </div>
  );
}

function TabNotifications({
  claim,
  onAddAuditEntry,
  showToast,
}: {
  claim: Claim;
  onAddAuditEntry: (claimId: string, entry: AuditEntryInput) => void;
  showToast: (msg: string) => void;
}) {
  const [data, setData] = useState<NotificationDataResponse | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [history, setHistory] = useState<ClaimNotifRecord[]>([]);
  const [messageTemplate, setMessageTemplate] = useState("");
  const [notifSubTab, setNotifSubTab] = useState<"lojistas" | "areas">("lojistas");

  useEffect(() => {
    getClaimNotificationData(claim.id)
      .then((d) => { setData(d); setHistory(d.history); })
      .catch(() => setLoadError(true));
  }, [claim.id]);

  useEffect(() => {
    getClaimWhatsappLink(claim.id)
      .then((r) => setMessageTemplate(r.message))
      .catch(() => {});
  }, [claim.id, claim.status]);

  const refreshHistory = () => {
    getClaimNotificationData(claim.id).then((d) => setHistory(d.history)).catch(() => {});
  };

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <Bell className="w-10 h-10 mb-3 text-gray-200" />
        <p className="text-sm font-medium">Não foi possível carregar os dados de notificação.</p>
        <p className="text-xs mt-1 text-gray-300">Verifique se o backend está rodando e o banco conectado.</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <div className="w-8 h-8 border-2 border-[#8B1A1A]/30 border-t-[#8B1A1A] rounded-full animate-spin mb-3" />
        <p className="text-xs">Carregando dados...</p>
      </div>
    );
  }

  const dateFormatted = data.date ? new Date(data.date + "T12:00:00").toLocaleDateString("pt-BR") : "—";

  // Lojistas: usa employeeContacts se disponível, senão o legado (single)
  const lojistas = (claim.employeeContacts && claim.employeeContacts.length > 0)
    ? claim.employeeContacts
    : [{ storeId: 0, storeName: claim.store, name: claim.employeeName || "", contact: claim.employeeContact || "" }];

  // Áreas: split por vírgula
  const areas = (claim.responsibleArea || "").split(",").map(a => a.trim()).filter(Boolean);

  return (
    <div className="space-y-4">
      {/* Dados do sinistro vinculado */}
      <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Sinistro vinculado</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <InfoBlock label="Código" value={data.claim_code} />
          <InfoBlock label="Data" value={dateFormatted} />
          <InfoBlock label="Gravidade" value={data.severity || "—"} />
          <InfoBlock label="Status" value={data.status || "—"} />
          {data.responsible_area && <div className="col-span-2"><InfoBlock label="Área(s) Responsável(is)" value={data.responsible_area} /></div>}
        </div>
      </div>

      {/* Sub-abas: Lojistas | Áreas Responsáveis */}
      <div className="flex border-b border-gray-100 bg-gray-50/40 rounded-t-xl px-2 pt-1">
        <button
          onClick={() => setNotifSubTab("lojistas")}
          className={`flex items-center gap-1.5 pb-3 pt-1 mr-6 text-sm font-medium border-b-2 transition-all ${notifSubTab === "lojistas" ? "border-[#8B1A1A] text-[#8B1A1A]" : "border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200"}`}
        >
          <Building2 className="w-3.5 h-3.5" />
          Lojistas
          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${notifSubTab === "lojistas" ? "bg-[#8B1A1A] text-white" : "bg-gray-200 text-gray-600"}`}>{lojistas.length}</span>
        </button>
        <button
          onClick={() => setNotifSubTab("areas")}
          className={`flex items-center gap-1.5 pb-3 pt-1 text-sm font-medium border-b-2 transition-all ${notifSubTab === "areas" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200"}`}
        >
          <Shield className="w-3.5 h-3.5" />
          Áreas Responsáveis
          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${notifSubTab === "areas" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600"}`}>{areas.length}</span>
        </button>
      </div>

      {/* Painéis da sub-aba Lojistas */}
      {notifSubTab === "lojistas" && (
        <div className="space-y-5">
          {lojistas.map((loj) => (
            <LojistaPainelNotif
              key={`${loj.storeId}-${loj.storeName}`}
              claimId={claim.id}
              claimStatus={claim.status}
              storeKey={String(loj.storeId)}
              storeName={loj.storeName}
              initialName={loj.name}
              initialContact={loj.contact}
              defaultEmail={data.store_email}
              defaultPhone={data.store_phone}
              backendStoreId={data.store_id}
              messageTemplate={messageTemplate}
              onAddAuditEntry={onAddAuditEntry}
              showToast={showToast}
              onRefreshHistory={refreshHistory}
            />
          ))}
        </div>
      )}

      {/* Painéis da sub-aba Áreas Responsáveis */}
      {notifSubTab === "areas" && (
        <div className="space-y-5">
          {areas.length > 0 ? areas.map((area) => (
            <AreaPainelNotif
              key={area}
              claimId={claim.id}
              claimStatus={claim.status}
              areaName={area}
              claimCode={data.claim_code}
              storeName={data.store_name}
              claimDate={data.date}
              claimSeverity={data.severity}
              claimDescription={data.description}
              onAddAuditEntry={onAddAuditEntry}
              showToast={showToast}
              onRefreshHistory={refreshHistory}
            />
          )) : (
            <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-10 flex flex-col items-center text-gray-400">
              <Shield className="w-8 h-8 mb-3 text-gray-200" />
              <p className="text-sm">Nenhuma área responsável definida para este sinistro.</p>
              <p className="text-xs mt-1 text-gray-300">Defina nas Ações Rápidas ou na criação do sinistro.</p>
            </div>
          )}
        </div>
      )}

      {/* Histórico de notificações */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <Bell className="w-4 h-4 text-[#8B1A1A]" />
            <h3 className="text-sm font-semibold text-gray-900">Histórico de Notificações</h3>
          </div>
          <span className="px-2 py-0.5 bg-[#8B1A1A] text-white text-xs rounded-full font-semibold">{history.length}</span>
        </div>
        {history.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Bell className="w-8 h-8 mx-auto mb-3 text-gray-200" />
            <p className="text-xs">Nenhuma notificação enviada ainda</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((n) => (
              <div key={n.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <span className="text-xs font-semibold text-gray-800 truncate">{n.recipient_name || n.recipient_phone || "—"}</span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">Link gerado</span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(n.created_at).toLocaleDateString("pt-BR")}{" "}
                        {new Date(n.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 truncate">{n.message.split("\n")[0]}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helper ─────────────────────────────────────────────────────────────────
function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 dark:bg-[#252545] rounded-xl p-3.5 border border-gray-100 dark:border-[#2E3447]">
      <p className="text-[10px] font-semibold text-gray-400 dark:text-[#aaaaaa] uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-medium text-gray-800 dark:text-[#dddddd]">{value}</p>
    </div>
  );
}

// ── Status Badge & Severity ────────────────────────────────────────────────
const STATUS_BADGE_COLORS: Record<ClaimStatus, string> = {
  "Em análise": "bg-amber-100 text-amber-800 border-amber-200",
  "Aguardando seguradora": "bg-blue-100 text-blue-800 border-blue-200",
  Pago: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Concluído: "bg-[#F5E9D7] text-[#8B1A1A] border-[#E8DCCB]",
  Cancelado: "bg-red-100 text-red-800 border-red-200",
};

const SEVERITY_CONFIG = {
  Alta: { dot: "bg-[#D93030]", text: "text-[#D93030]", bg: "bg-red-50 border-red-100" },
  Média: { dot: "bg-yellow-500", text: "text-yellow-700", bg: "bg-yellow-50 border-yellow-100" },
  Baixa: { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-100" },
};


// ── Main Component ─────────────────────────────────────────────────────────
export function ClaimDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "evidence" | "notifications">("general");

  const { confirm, modal: confirmModal } = useConfirm();
  const { showToast, toast } = useToast();
  const { user } = useAuth();

  const currentUser = {
    name: user?.name ?? "Sistema",
    initials: user?.name ? buildInitials(user.name) : "SI",
    role: user?.role ?? "Sistema",
  };

  const loadClaim = useCallback(async () => {
    if (!id) return;
    try {
      const data = await apiGetClaimById(id);
      setClaim(data);
    } catch {
      setNotFound(true);
    }
  }, [id]);

  useEffect(() => { loadClaim(); }, [loadClaim]);

  const handleUpdateClaim = async (updates: Partial<Claim>) => {
    if (!claim) return;
    if (Object.keys(updates).length === 0) {
      await loadClaim();
      return;
    }
    try {
      const updated = await apiUpdateClaim(claim.id, updates);
      // Preserva o auditTrail local — pode ter entradas adicionadas por handleAddAuditEntry
      // que ainda não chegaram no banco quando apiUpdateClaim retornou
      setClaim(prev => prev ? { ...updated, auditTrail: prev.auditTrail ?? updated.auditTrail } : updated);
    } catch {
      setClaim(prev => prev ? { ...prev, ...updates } : prev);
    }
  };

  const handleAddAuditEntry = (claimId: string, entry: AuditEntryInput) => {
    const newEntry: AuditEntry = {
      id: entry.id || `a-${Date.now()}`,
      user: currentUser.name,
      userInitials: currentUser.initials,
      userRole: currentUser.role,
      timestamp: entry.timestamp || new Date().toISOString(),
      action: entry.action,
      type: entry.type,
    };
    setClaim(prev =>
      prev ? { ...prev, auditTrail: [...(prev.auditTrail || []), newEntry] } : prev
    );
    apiAddAuditEntry(claimId, {
      user: currentUser.name,
      userInitials: currentUser.initials,
      userRole: currentUser.role,
      action: entry.action,
      type: entry.type,
    }).catch(() => {});
  };

  const handleFilesChange = (files: string[]) => {
    setClaim(prev => prev ? { ...prev, files } : prev);
  };

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <FileText className="w-12 h-12 mb-4 text-gray-300" />
        <p className="text-base font-semibold">Sinistro não encontrado</p>
        <p className="text-sm mt-1">O registro pode ter sido removido ou o ID é inválido.</p>
        <button onClick={() => navigate(-1)} className="mt-6 text-sm text-[#8B1A1A] hover:underline">Voltar para a lista</button>
      </div>
    );
  }

  if (!claim) return null;

  const sev = SEVERITY_CONFIG[claim.severity] || SEVERITY_CONFIG.Baixa;

  const TABS = [
    { key: "general", label: "Informações Gerais", icon: <Info className="w-3.5 h-3.5 mr-1.5" /> },
    { key: "evidence", label: "Galeria de Evidências", icon: <ImageIcon className="w-3.5 h-3.5 mr-1.5" />, badge: claim.files?.length || 0 },
    { key: "notifications", label: "Notificações", icon: <Bell className="w-3.5 h-3.5 mr-1.5" /> },
  ] as const;

  return (
    <div className="max-w-7xl mx-auto space-y-0 pb-10">
      {confirmModal}
      {toast}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
        <button onClick={() => navigate(-1)} className="inline-flex items-center text-sm text-gray-500 hover:text-[#8B1A1A] transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Voltar para Lista
        </button>
        <div className="flex items-center space-x-3">
          <span className={`inline-flex items-center px-3 py-1.5 rounded-full border text-xs font-semibold ${sev.bg} ${sev.text}`}>
            <span className={`w-2 h-2 rounded-full mr-1.5 ${sev.dot}`} />
            Gravidade {claim.severity}
          </span>
          <span className={`inline-flex items-center px-3 py-1.5 rounded-full border text-xs font-semibold ${STATUS_BADGE_COLORS[claim.status]}`}>
            {(claim.status === "Concluído" || claim.status === "Pago") && <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
            {claim.status}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
        <div className="h-1.5 bg-[#8B1A1A]" />
        <div className="px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-[#8B1A1A]/8 rounded-2xl flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-[#8B1A1A]" />
            </div>
            <div>
              <h1 className="text-gray-900 text-xl">{claim.id}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-0.5">
                <span className="text-xs text-gray-500 flex items-center"><Building2 className="w-3.5 h-3.5 mr-1 text-[#C8A882]" />{claim.store}</span>
                <span className="text-xs text-gray-500 flex items-center"><Calendar className="w-3.5 h-3.5 mr-1 text-[#C8A882]" />{new Date(claim.date + "T12:00:00").toLocaleDateString("pt-BR")}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100 bg-gray-50/60 dark:bg-[#1a1a2e] px-3 sm:px-5 pt-3 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center pb-3 pt-1 mr-5 text-sm border-b-2 transition-all whitespace-nowrap font-medium
                ${activeTab === tab.key ? "border-[#8B1A1A] text-[#8B1A1A]" : "border-transparent text-gray-400 dark:text-[#f0f0f0] hover:text-gray-600 dark:hover:text-[#f0f0f0] hover:border-gray-200"}`}
            >
              {tab.icon}
              {tab.label}
              {"badge" in tab && tab.badge > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#8B1A1A] text-white">{tab.badge}</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6">
          {activeTab === "general" && (
            <TabGeneralInfo claim={claim} onUpdateClaim={handleUpdateClaim} onAddAuditEntry={handleAddAuditEntry} confirm={confirm} showToast={showToast} />
          )}
          {activeTab === "evidence" && <TabEvidences files={claim.files || []} claimId={claim.id} onUpdateClaim={handleUpdateClaim} onFilesChange={handleFilesChange} onAddAuditEntry={handleAddAuditEntry} confirm={confirm} />}
          <div className={activeTab === "notifications" ? "" : "hidden"}>
            <TabNotifications claim={claim} onAddAuditEntry={handleAddAuditEntry} showToast={showToast} />
          </div>
        </div>
      </div>
    </div>
  );
}
