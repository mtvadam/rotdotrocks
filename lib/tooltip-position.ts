/**
 * Smart tooltip positioning that stays within viewport boundaries.
 * Tries below first, flips above if clipped. Centers horizontally,
 * clamped to viewport edges with padding.
 */
export function getTooltipPosition(
  triggerRect: DOMRect,
  opts: {
    /** Approximate tooltip width (default 200) */
    tooltipWidth?: number
    /** Approximate tooltip height (default 100) */
    tooltipHeight?: number
    /** Gap between trigger and tooltip (default 8) */
    gap?: number
    /** Viewport edge padding (default 12) */
    padding?: number
    /** Horizontal alignment: 'start' aligns left edges, 'center' centers tooltip on trigger */
    align?: 'start' | 'center'
  } = {}
): { top: number; left: number } {
  const {
    tooltipWidth = 200,
    tooltipHeight = 100,
    gap = 8,
    padding = 12,
    align = 'start',
  } = opts

  const viewportW = window.innerWidth
  const viewportH = window.innerHeight

  // Vertical: prefer below, flip above if clipped
  let top: number
  const spaceBelow = viewportH - triggerRect.bottom - gap
  const spaceAbove = triggerRect.top - gap

  if (spaceBelow >= tooltipHeight || spaceBelow >= spaceAbove) {
    top = triggerRect.bottom + gap
  } else {
    top = triggerRect.top - tooltipHeight - gap
  }

  // Clamp vertical
  top = Math.max(padding, Math.min(top, viewportH - tooltipHeight - padding))

  // Horizontal
  let left: number
  if (align === 'center') {
    left = triggerRect.left + triggerRect.width / 2
  } else {
    left = triggerRect.left
  }

  // Clamp horizontal (for 'start' alignment, clamp the left edge; for 'center', the CSS -translate-x-1/2 handles centering)
  if (align === 'start') {
    left = Math.max(padding, Math.min(left, viewportW - tooltipWidth - padding))
  } else {
    // For center alignment with CSS -translate-x-1/2, ensure the tooltip doesn't overflow
    const halfWidth = tooltipWidth / 2
    if (left - halfWidth < padding) {
      left = padding + halfWidth
    } else if (left + halfWidth > viewportW - padding) {
      left = viewportW - padding - halfWidth
    }
  }

  return { top, left }
}
