import { AlertCircle } from "lucide-react";

interface ConfirmModalProps {
  open: boolean;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/35 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white border border-[#E8DCCB] rounded-2xl shadow-xl p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E8DCCB] flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-[#8B1A1A]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-1">Confirmar ação</p>
            <p className="text-sm text-gray-500 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-[#E8DCCB] text-gray-600 hover:bg-[#FAF7F2] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#8B1A1A] text-white hover:bg-[#701515] active:scale-[0.98] transition-all"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
