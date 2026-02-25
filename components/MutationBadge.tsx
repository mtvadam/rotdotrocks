'use client'

import { getMutationClass, getMutationInlineStyle, type MutationGradientData } from '@/lib/utils'

interface MutationBadgeProps {
  name: string
  multiplier?: number
  className?: string
  gradientColors?: string | null
  gradientDirection?: string | null
  isAnimated?: boolean
}

export function MutationBadge({ name, multiplier, className = '', gradientColors, gradientDirection, isAnimated }: MutationBadgeProps) {
  const gradientData: MutationGradientData = { gradientColors, gradientDirection, isAnimated }
  const inlineStyle = getMutationInlineStyle(gradientData)
  const cssClass = inlineStyle ? '' : getMutationClass(name)

  return (
    <span
      className={`animation-always-running font-bold ${cssClass} ${className}`}
      style={inlineStyle}
    >
      {name}
      {multiplier !== undefined && ` (${multiplier}x)`}
    </span>
  )
}
