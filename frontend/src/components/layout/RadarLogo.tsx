import { motion } from 'framer-motion'

interface RadarLogoProps {
  collapsed?: boolean
}

export function RadarLogo({ collapsed }: RadarLogoProps) {
  return (
    <div className="flex items-center gap-2.5">
      {/* Animated radar icon */}
      <div className="relative w-8 h-8 flex-shrink-0">
        <svg viewBox="0 0 32 32" fill="none" className="w-8 h-8">
          <circle cx="16" cy="16" r="15" stroke="#3b82f6" strokeWidth="1.5" strokeOpacity="0.3" />
          <circle cx="16" cy="16" r="10" stroke="#3b82f6" strokeWidth="1.5" strokeOpacity="0.5" />
          <circle cx="16" cy="16" r="5" stroke="#3b82f6" strokeWidth="1.5" strokeOpacity="0.7" />
          <circle cx="16" cy="16" r="2" fill="#3b82f6" />
          {/* Sweep line */}
          <motion.line
            x1="16" y1="16" x2="16" y2="1"
            stroke="#3b82f6"
            strokeWidth="1.5"
            strokeLinecap="round"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '16px 16px' }}
          />
          {/* Blip */}
          <motion.circle
            cx="20" cy="8" r="1.5"
            fill="#60a5fa"
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear', delay: 0.8 }}
          />
        </svg>
      </div>

      {!collapsed && (
        <motion.div
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-white font-bold text-sm leading-tight">DealRadar</div>
          <div className="text-blue-400 text-[10px] font-medium tracking-wide uppercase">Intelligence OS</div>
        </motion.div>
      )}
    </div>
  )
}
