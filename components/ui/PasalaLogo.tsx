'use client'

interface PasalaLogoProps {
  variant?: 'dark' | 'light' | 'red'
  size?: 'sm' | 'md' | 'lg'
  iconOnly?: boolean
}

export function PasalaLogo({
  variant = 'dark',
  size = 'md',
  iconOnly = false,
}: PasalaLogoProps) {
  const wordmarkColor = variant === 'light'
    ? '#0C0C0C'
    : '#F5F2EE'

  const sizes = {
    sm: { width: 80,  height: 20 },
    md: { width: 110, height: 28 },
    lg: { width: 160, height: 40 },
  }

  const { width, height } = sizes[size]

  if (iconOnly) {
    return (
      <svg width={height} height={height}
        viewBox="0 0 88 88" fill="none">
        <path d="M8 76 Q44 4 80 76"
          stroke="#E5352A" strokeWidth="6"
          strokeLinecap="round"/>
        <circle cx="80" cy="76" r="8" fill="#E5352A"/>
      </svg>
    )
  }

  return (
    <svg width={width} height={height}
      viewBox="0 0 360 88" fill="none">
      <path d="M12 58 Q38 4 68 58"
        stroke="#E5352A" strokeWidth="5"
        strokeLinecap="round"/>
      <circle cx="68" cy="58" r="6" fill="#E5352A"/>
      <text
        x="88" y="72"
        fontFamily="'Plus Jakarta Sans', sans-serif"
        fontWeight="800"
        fontSize="64"
        fill={wordmarkColor}
        letterSpacing="-2">
        pasala
      </text>
    </svg>
  )
}
