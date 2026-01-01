'use client'

import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  subValue?: string
  icon: LucideIcon
  color?: 'green' | 'blue' | 'purple' | 'orange' | 'red'
}

const colorClasses = {
  green: 'bg-green-500/10 text-green-400',
  blue: 'bg-blue-500/10 text-blue-400',
  purple: 'bg-purple-500/10 text-purple-400',
  orange: 'bg-orange-500/10 text-orange-400',
  red: 'bg-red-500/10 text-red-400',
}

export function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  color = 'green',
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-darkbg-800 rounded-xl p-4 border border-darkbg-700"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {subValue && (
            <p className="text-xs text-gray-500 mt-1">{subValue}</p>
          )}
        </div>
        <div className={`p-2.5 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  )
}
