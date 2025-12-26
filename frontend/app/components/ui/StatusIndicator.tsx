type Status = "idle" | "listening" | "speaking" | "loading" | "error";

interface StatusIndicatorProps {
  status: Status;
  label?: string;
}

const statusConfig: Record<Status, { color: string; pulse: boolean }> = {
  idle: { color: "bg-zinc-400", pulse: false },
  listening: { color: "bg-blue-500", pulse: false },
  speaking: { color: "bg-green-500", pulse: true },
  loading: { color: "bg-yellow-500", pulse: true },
  error: { color: "bg-red-500", pulse: false },
};

const statusLabels: Record<Status, string> = {
  idle: "중지됨",
  listening: "대기 중",
  speaking: "말하는 중...",
  loading: "로딩 중...",
  error: "에러 발생",
};

export function StatusIndicator({ status, label }: StatusIndicatorProps) {
  const config = statusConfig[status];
  const displayLabel = label ?? statusLabels[status];

  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-4 h-4 rounded-full transition-colors ${config.color} ${
          config.pulse ? "animate-pulse" : ""
        }`}
      />
      <span className="text-zinc-700 dark:text-zinc-300">{displayLabel}</span>
    </div>
  );
}
