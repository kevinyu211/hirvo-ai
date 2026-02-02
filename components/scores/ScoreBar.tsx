"use client";

export interface ScoreBarProps {
  score: number;
  label: string;
  compact?: boolean;
}

export function ScoreBar({ score, label, compact = false }: ScoreBarProps) {
  const getColorClass = (score: number) => {
    if (score >= 75) return "bg-emerald-500";
    if (score >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  const getTextColorClass = (score: number) => {
    if (score >= 75) return "text-emerald-600";
    if (score >= 50) return "text-amber-600";
    return "text-red-600";
  };

  const barHeight = compact ? "h-1.5" : "h-2.5";
  const textSize = compact ? "text-xs" : "text-sm";

  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      <div className={`flex items-center justify-between ${textSize}`}>
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className={`font-semibold ${getTextColorClass(score)}`}>
          {Math.round(score)}%
        </span>
      </div>
      <div className={`${barHeight} w-full rounded-full bg-muted/50 overflow-hidden`}>
        <div
          className={`h-full rounded-full ${getColorClass(score)} transition-all duration-700 ease-out`}
          style={{ width: `${Math.min(Math.round(score), 100)}%` }}
        />
      </div>
    </div>
  );
}
