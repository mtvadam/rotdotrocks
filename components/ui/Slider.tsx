'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface SliderProps {
  value: number[]
  onValueChange: (value: number[]) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  className?: string
  trackClassName?: string
  thumbClassName?: string
}

export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  className,
  trackClassName,
  thumbClassName,
}: SliderProps) {
  const trackRef = React.useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)

  const percentage = ((value[0] - min) / (max - min)) * 100

  const updateValue = React.useCallback(
    (clientX: number) => {
      if (!trackRef.current || disabled) return

      const rect = trackRef.current.getBoundingClientRect()
      const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const rawValue = min + percentage * (max - min)
      const steppedValue = Math.round(rawValue / step) * step
      const clampedValue = Math.max(min, Math.min(max, steppedValue))

      onValueChange([clampedValue])
    },
    [min, max, step, onValueChange, disabled]
  )

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return
    e.preventDefault()
    setIsDragging(true)
    updateValue(e.clientX)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return
    setIsDragging(true)
    updateValue(e.touches[0].clientX)
  }

  React.useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      updateValue(e.clientX)
    }

    const handleTouchMove = (e: TouchEvent) => {
      updateValue(e.touches[0].clientX)
    }

    const handleEnd = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('touchmove', handleTouchMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchend', handleEnd)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchend', handleEnd)
    }
  }, [isDragging, updateValue])

  return (
    <div
      ref={trackRef}
      className={cn(
        'relative h-2 w-full rounded-full cursor-pointer',
        'bg-bg-tertiary',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Fill track */}
      <div
        className={cn(
          'absolute h-full rounded-full bg-gradient-to-r from-neon-pink to-neon-purple',
          trackClassName
        )}
        style={{ width: `${percentage}%` }}
      />

      {/* Thumb */}
      <div
        className={cn(
          'absolute top-1/2 -translate-y-1/2 -translate-x-1/2',
          'w-5 h-5 rounded-full',
          'bg-white border-2 border-neon-pink',
          'shadow-lg shadow-neon-pink/30',
          'transition-transform duration-100',
          isDragging && 'scale-110',
          !disabled && 'hover:scale-110',
          thumbClassName
        )}
        style={{ left: `${percentage}%` }}
      />
    </div>
  )
}

// Range Slider (two thumbs)
interface RangeSliderProps {
  value: [number, number]
  onValueChange: (value: [number, number]) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  className?: string
}

export function RangeSlider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  className,
}: RangeSliderProps) {
  const trackRef = React.useRef<HTMLDivElement>(null)
  const [activeThumb, setActiveThumb] = React.useState<0 | 1 | null>(null)

  const percentage1 = ((value[0] - min) / (max - min)) * 100
  const percentage2 = ((value[1] - min) / (max - min)) * 100

  const updateValue = React.useCallback(
    (clientX: number, thumbIndex: 0 | 1) => {
      if (!trackRef.current || disabled) return

      const rect = trackRef.current.getBoundingClientRect()
      const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const rawValue = min + percentage * (max - min)
      const steppedValue = Math.round(rawValue / step) * step
      const clampedValue = Math.max(min, Math.min(max, steppedValue))

      const newValue: [number, number] = [...value] as [number, number]
      newValue[thumbIndex] = clampedValue

      // Prevent crossing
      if (thumbIndex === 0 && clampedValue > value[1]) {
        newValue[0] = value[1]
      } else if (thumbIndex === 1 && clampedValue < value[0]) {
        newValue[1] = value[0]
      }

      onValueChange(newValue)
    },
    [min, max, step, value, onValueChange, disabled]
  )

  const handleThumbMouseDown = (e: React.MouseEvent, thumbIndex: 0 | 1) => {
    if (disabled) return
    e.preventDefault()
    e.stopPropagation()
    setActiveThumb(thumbIndex)
  }

  React.useEffect(() => {
    if (activeThumb === null) return

    const handleMouseMove = (e: MouseEvent) => {
      updateValue(e.clientX, activeThumb)
    }

    const handleEnd = () => {
      setActiveThumb(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleEnd)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleEnd)
    }
  }, [activeThumb, updateValue])

  return (
    <div
      ref={trackRef}
      className={cn(
        'relative h-2 w-full rounded-full cursor-pointer',
        'bg-bg-tertiary',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {/* Fill track */}
      <div
        className="absolute h-full rounded-full bg-gradient-to-r from-neon-pink to-neon-purple"
        style={{
          left: `${percentage1}%`,
          width: `${percentage2 - percentage1}%`,
        }}
      />

      {/* Thumb 1 */}
      <div
        onMouseDown={(e) => handleThumbMouseDown(e, 0)}
        className={cn(
          'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10',
          'w-5 h-5 rounded-full',
          'bg-white border-2 border-neon-pink',
          'shadow-lg shadow-neon-pink/30',
          'transition-transform duration-100',
          activeThumb === 0 && 'scale-110',
          !disabled && 'hover:scale-110 cursor-grab',
          activeThumb === 0 && 'cursor-grabbing'
        )}
        style={{ left: `${percentage1}%` }}
      />

      {/* Thumb 2 */}
      <div
        onMouseDown={(e) => handleThumbMouseDown(e, 1)}
        className={cn(
          'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10',
          'w-5 h-5 rounded-full',
          'bg-white border-2 border-neon-pink',
          'shadow-lg shadow-neon-pink/30',
          'transition-transform duration-100',
          activeThumb === 1 && 'scale-110',
          !disabled && 'hover:scale-110 cursor-grab',
          activeThumb === 1 && 'cursor-grabbing'
        )}
        style={{ left: `${percentage2}%` }}
      />
    </div>
  )
}
