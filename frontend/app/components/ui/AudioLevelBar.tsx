interface AudioLevelBarProps {
  level: number;
  className?: string;
}

export function AudioLevelBar({ level, className = "" }: AudioLevelBarProps) {
  const percentage = Math.min(Math.max(level * 100, 0), 100);

  return (
    <div
      className={`w-full h-4 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden ${className}`}
    >
      <div
        className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-75"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
