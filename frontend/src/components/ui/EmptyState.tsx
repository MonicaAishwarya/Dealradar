import { motion } from 'framer-motion'
import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-8 text-center"
    >
      <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mb-4 text-gray-400">
        {icon || <Inbox size={20} />}
      </div>
      <p className="text-sm font-semibold text-gray-700 mb-1">{title}</p>
      {description && <p className="text-xs text-gray-400 max-w-xs mb-4">{description}</p>}
      {action}
    </motion.div>
  )
}
