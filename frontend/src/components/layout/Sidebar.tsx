import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx } from 'clsx'
import {
  LayoutDashboard, ListChecks, FileText, Search, CheckSquare,
  Upload, BarChart3, ClipboardList, Settings, ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { RadarLogo } from './RadarLogo'

const NAV_ITEMS = [
  { path: '/', label: 'Command Center', icon: LayoutDashboard },
  { path: '/queue', label: 'Decision Queue', icon: ListChecks },
  { path: '/deals', label: 'Deals', icon: FileText },
  { path: '/evidence', label: 'Evidence Explorer', icon: Search },
  { path: '/commitments', label: 'Commitment Tracker', icon: CheckSquare },
  { path: '/imports', label: 'Import Center', icon: Upload },
  { path: '/reports', label: 'Reports & Exports', icon: BarChart3 },
  { path: '/audit', label: 'Audit Log', icon: ClipboardList },
  { path: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 224 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="relative flex flex-col h-full bg-[#0d1528] border-r border-white/[0.06] overflow-hidden flex-shrink-0"
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-white/[0.06]">
        <RadarLogo collapsed={collapsed} />
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors group relative',
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              )
            }
            title={collapsed ? label : undefined}
          >
            <Icon size={16} className="flex-shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="whitespace-nowrap overflow-hidden text-ellipsis"
                >
                  {label}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="px-2 py-3 border-t border-white/[0.06]">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-2.5 py-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.06] transition-colors text-xs"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : (
            <>
              <ChevronLeft size={16} />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  )
}
