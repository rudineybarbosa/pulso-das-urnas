interface HorseProps {
  color: string
  number?: string
  final?: "winner" | "loser" | null
}

export function Horse({ color, number, final = null }: HorseProps) {
  return (
    <svg
      viewBox="0 0 96 56"
      className={`horse ${final ? `horse--${final}` : ""}`}
      aria-hidden="true"
      focusable="false"
    >
      <g className="horse__legs">
        <rect x="30" y="34" width="5" height="16" rx="2" fill="#3A2416" />
        <rect x="40" y="34" width="5" height="16" rx="2" fill="#5A3A22" />
        <rect x="62" y="34" width="5" height="16" rx="2" fill="#3A2416" />
        <rect x="72" y="34" width="5" height="16" rx="2" fill="#5A3A22" />
      </g>
      <path
        d="M18 30c0-9 8-15 20-15h20c7 0 12 4 14 10l3 8-10 3-6-6H34c-9 0-16-2-16-0Z"
        fill="#8B5A2B"
      />
      <path d="M66 24c3-6 8-10 13-10 4 0 6 2 6 5 0 4-4 8-9 10l-6 2-4-7Z" fill="#8B5A2B" />
      <path d="M82 14c2-4 5-6 7-5 2 1 1 4-1 6l-3 3-3-4Z" fill="#5A3A22" />
      <path d="M18 30c-5 2-8 8-7 15 4-4 7-6 12-6l-5-9Z" fill="#5A3A22" />
      <path d="M30 16c2-7 9-11 15-10 5 1 7 5 6 10l-3 9-18-9Z" fill="#6B4423" />
      <rect x="40" y="20" width="22" height="12" rx="4" fill={color} />
      <circle cx="51" cy="26" r="5" fill="#FFFFFF" />
      {number ? (
        <text x="51" y="29" textAnchor="middle" fontSize="7" fontWeight="700" fill="#0B1220">
          {number}
        </text>
      ) : null}
      <circle cx="70" cy="17" r="1.6" fill="#0B1220" />
    </svg>
  )
}
