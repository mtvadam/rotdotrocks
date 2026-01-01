'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface Tab {
  id: string
  label: ReactNode
  icon?: ReactNode
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (tabId: string) => void
  variant?: 'pills' | 'underline'
}

export function Tabs({ tabs, activeTab, onChange, variant = 'pills' }: TabsProps) {
  if (variant === 'underline') {
    return (
      <div className="flex gap-1 border-b border-darkbg-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              relative px-4 py-2.5 text-sm font-medium transition-colors
              ${
                activeTab === tab.id
                  ? 'text-green-500'
                  : 'text-gray-500 hover:text-gray-300'
              }
            `}
          >
            <span className="flex items-center gap-2">
              {tab.icon}
              {tab.label}
            </span>
            {activeTab === tab.id && (
              <motion.div
                layoutId="tab-underline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500"
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="flex gap-2 p-1 bg-darkbg-800 rounded-xl">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            relative px-4 py-2 text-sm font-medium rounded-lg transition-colors
            ${
              activeTab === tab.id
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
            }
          `}
        >
          {activeTab === tab.id && (
            <motion.div
              layoutId="tab-pill"
              className="absolute inset-0 bg-green-600 rounded-lg"
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            {tab.icon}
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  )
}
