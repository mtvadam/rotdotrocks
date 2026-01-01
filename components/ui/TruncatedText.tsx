'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'

interface TruncatedTextProps {
  text: string
  className?: string
  maxWidth?: number
}

export function TruncatedText({ text, className = '', maxWidth }: TruncatedTextProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isTruncated, setIsTruncated] = useState(false)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    if (textRef.current && containerRef.current) {
      const textWidth = textRef.current.scrollWidth
      const containerWidth = maxWidth || containerRef.current.clientWidth
      setIsTruncated(textWidth > containerWidth)
      if (textWidth > containerWidth) {
        setScale(containerWidth / textWidth)
      }
    }
  }, [text, maxWidth])

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.span
        ref={textRef}
        animate={{
          scale: isHovered && isTruncated ? scale : 1,
        }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className={`block whitespace-nowrap origin-center ${!isHovered && isTruncated ? 'truncate' : ''}`}
        style={{ transformOrigin: 'center center' }}
      >
        {text}
      </motion.span>
    </div>
  )
}
