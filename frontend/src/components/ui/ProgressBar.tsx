interface ProgressBarProps {
  value: number
  max?: number
  color?: string
  height?: string
}

export function ProgressBar({ value, max = 100, color = 'bg-brand-500', height = 'h-2' }: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100)

  return (
    <div className={`w-full bg-gray-800 rounded-full overflow-hidden ${height}`}>
      <div
        className={`${color} ${height} rounded-full transition-all duration-700 ease-out`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
