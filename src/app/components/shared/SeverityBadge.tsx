import { SEVERITY_BADGE_CLASSES } from "../../constants";

interface SeverityBadgeProps {
  severity: string;
  className?: string;
}

export function SeverityBadge({ severity, className = "" }: SeverityBadgeProps) {
  const base = SEVERITY_BADGE_CLASSES[severity] ?? "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${base} ${className}`}>
      {severity}
    </span>
  );
}
