"use client";

import { Badge } from "@/components/ui/badge";

export type SeverityLevel = "critical" | "warning" | "info";

export interface SeverityBadgeProps {
  severity: SeverityLevel;
  showLabel?: boolean;
}

const SEVERITY_CONFIG: Record<SeverityLevel, { className: string; label: string; dotClass: string }> = {
  critical: {
    className: "bg-red-100 text-red-700 border-red-200",
    label: "Critical",
    dotClass: "bg-red-500",
  },
  warning: {
    className: "bg-amber-100 text-amber-700 border-amber-200",
    label: "Warning",
    dotClass: "bg-amber-500",
  },
  info: {
    className: "bg-sky-100 text-sky-700 border-sky-200",
    label: "Info",
    dotClass: "bg-sky-500",
  },
};

export function SeverityBadge({ severity, showLabel = true }: SeverityBadgeProps) {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info;

  return (
    <Badge variant="outline" className={`${config.className} text-xs font-medium border`}>
      {showLabel ? config.label : <span className={`w-2 h-2 rounded-full ${config.dotClass}`} />}
    </Badge>
  );
}

export function SeverityDot({ severity }: { severity: SeverityLevel }) {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info;
  return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${config.dotClass}`} />;
}
