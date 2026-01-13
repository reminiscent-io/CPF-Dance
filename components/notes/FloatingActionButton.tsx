'use client'

import { motion } from 'framer-motion'

interface FloatingActionButtonProps {
  onClick: () => void
}

export function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-rose-500 text-white shadow-lg hover:bg-rose-600 focus:outline-none focus:ring-4 focus:ring-rose-300 transition-colors flex items-center justify-center"
      style={{
        bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
        right: 'calc(1.5rem + env(safe-area-inset-right, 0px))'
      }}
      aria-label="Create new note"
      animate={{
        boxShadow: [
          "0 4px 6px rgba(0,0,0,0.1)",
          "0 8px 12px rgba(0,0,0,0.15)",
          "0 4px 6px rgba(0,0,0,0.1)",
        ]
      }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4v16m8-8H4"
        />
      </svg>
    </motion.button>
  )
}
