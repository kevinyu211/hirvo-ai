"use client";

export interface ScoreGaugeProps {
  score: number;
  size?: number;
}

export function ScoreGauge({ score, size = 160 }: ScoreGaugeProps) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (score / 100) * circumference;
  const strokeWidth = size >= 160 ? 12 : 8;

  const getColorClass = (score: number) => {
    if (score >= 75) return { stroke: "stroke-emerald-500", text: "text-emerald-600" };
    if (score >= 50) return { stroke: "stroke-amber-500", text: "text-amber-600" };
    return { stroke: "stroke-red-500", text: "text-red-600" };
  };

  const colors = getColorClass(score);
  const textSizeClass = size >= 160 ? "text-3xl md:text-4xl" : "text-2xl";
  const labelSizeClass = size >= 160 ? "text-xs" : "text-[10px]";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Progress circle with animated draw */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          className={`${colors.stroke} score-gauge-circle`}
          style={{
            "--circumference": circumference,
            "--progress": progress,
          } as React.CSSProperties}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center score-gauge-text">
        <span className={`${textSizeClass} font-display font-bold ${colors.text}`}>
          {Math.round(score)}
        </span>
        <span className={`${labelSizeClass} text-muted-foreground font-medium`}>out of 100</span>
      </div>
    </div>
  );
}
