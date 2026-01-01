'use client'

interface MutationBadgeProps {
  name: string
  multiplier?: number
  className?: string
}

export function MutationBadge({ name, multiplier, className = '' }: MutationBadgeProps) {
  const getMutationClass = (mutationName: string): string => {
    const lowerName = mutationName.toLowerCase()

    switch (lowerName) {
      case 'gold':
        return 'mutation-gold'
      case 'diamond':
        return 'mutation-diamond'
      case 'rainbow':
        return 'mutation-rainbow'
      case 'bloodrot':
      case 'bloodroot':
        return 'mutation-bloodrot'
      case 'candy':
        return 'mutation-candy'
      case 'lava':
        return 'mutation-lava'
      case 'galaxy':
        return 'mutation-galaxy'
      case 'yin yang':
      case 'yinyang':
        return 'mutation-yinyang'
      case 'radioactive':
        return 'mutation-radioactive'
      default:
        return 'text-gray-400'
    }
  }

  return (
    <span className={`animation-always-running font-bold ${getMutationClass(name)} ${className}`}>
      {name}
      {multiplier !== undefined && ` (${multiplier}x)`}
    </span>
  )
}
