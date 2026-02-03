"use client";

export interface ScoreGaugeProps {
  score: number;
  size?: number;
}

export function ScoreGauge({ score, size = 160 }: ScoreGaugeProps) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (score / 100) * circumference;
  const strokeWidth = size >= 160 ? 14 : 10;

  const getColorClass = (score: number) => {
    if (score >= 75) return { stroke: "stroke-emerald-500", text: "text-emerald-600", glow: true };
    if (score >= 50) return { stroke: "stroke-amber-500", text: "text-amber-600", glow: false };
    return { stroke: "stroke-red-500", text: "text-red-600", glow: false };
  };

  const colors = getColorClass(score);
  const textSizeClass = size >= 160 ? "text-4xl md:text-5xl" : "text-3xl";
  const labelSizeClass = size >= 160 ? "text-xs" : "text-[10px]";

  // Excellent score gets pulsing glow effect
  const isExcellent = score >= 85;
  const containerClass = isExcellent
    ? "relative inline-flex items-center justify-center rounded-full score-excellent p-2"
    : "relative inline-flex items-center justify-center";

  return (
    <div className={containerClass}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        {/* Gradient definition for progress circle */}
        <defs>
          <linearGradient id={`scoreGradient-${size}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(158 64% 50%)" />
            <stop offset="100%" stopColor="hsl(158 64% 35%)" />
          </linearGradient>
        </defs>

        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />
        {/* Progress circle with gradient and animated draw */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          stroke={score >= 75 ? `url(#scoreGradient-${size})` : undefined}
          className={`${score < 75 ? colors.stroke : ''} score-gauge-circle`}
          style={{
            "--circumference": circumference,
            "--progress": progress,
            filter: colors.glow ? "drop-shadow(0 0 8px hsl(158 64% 40% / 0.4))" : undefined,
          } as React.CSSProperties}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center score-gauge-text">
        <span className={`${textSizeClass} font-display font-bold ${colors.text} tracking-tight`}>
          {Math.round(score)}
        </span>
        <span className={`${labelSizeClass} text-muted-foreground font-medium tracking-wide uppercase`}>out of 100</span>
      </div>
    </div>
  );
}
