interface ConfidenceGaugeProps {
  confidence: number
  verdict: string
}

function getColor(value: number): string {
  if (value <= 25) return '#ef4444'
  if (value <= 50) return '#f97316'
  if (value <= 75) return '#eab308'
  return '#22c55e'
}

function getVerdictLabel(verdict: string): string {
  const map: Record<string, string> = {
    definitive: 'PASTI',
    probable: 'MUNGKIN',
    possible: 'MUNGKIN',
    unlikely: 'TIDAK MUNGKIN',
  }
  return map[verdict] || verdict.toUpperCase()
}

export function ConfidenceGauge({ confidence, verdict }: ConfidenceGaugeProps) {
  const color = getColor(confidence)
  const rotation = 180 + (confidence / 100) * 180

  return (
    <div className="flex flex-col items-center">
      <svg width="200" height="120" viewBox="0 0 200 120" className="overflow-visible">
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="#1e293b"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={color}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${(confidence / 100) * 251.2} 251.2`}
          className="transition-all duration-1000 ease-out"
        />
        <line
          x1="100"
          y1="100"
          x2="165"
          y2="100"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          transform={`rotate(${rotation} 100 100)`}
        />
        <circle cx="100" cy="100" r="6" fill={color} />
      </svg>
      <div className="text-3xl font-bold mt-2" style={{ color }}>
        {confidence}%
      </div>
      <div className="text-sm font-semibold tracking-wider mt-1" style={{ color }}>
        {getVerdictLabel(verdict)}
      </div>
    </div>
  )
}
