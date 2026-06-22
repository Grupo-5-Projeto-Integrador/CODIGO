import { STATUS_BADGE_CLASSES } from "../../constants";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const base = STATUS_BADGE_CLASSES[status] ?? "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${base} ${className}`}>
      {status}
    </span>
  );
}
