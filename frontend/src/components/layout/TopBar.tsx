import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Search, Upload, Bell, X, Loader2 } from 'lucide-react'
import { globalSearch } from '@/services/api'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'

const BREADCRUMBS: Record<string, string> = {
  '/': 'Command Center',
  '/queue': 'Decision Queue',
  '/deals': 'Deals',
  '/evidence': 'Evidence Explorer',
  '/commitments': 'Commitment Tracker',
  '/imports': 'Import Center',
  '/reports': 'Reports & Exports',
  '/audit': 'Audit Log',
  '/settings': 'Settings',
}

interface SearchResult {
  id: string
  conversation_id?: string
  deal_name?: string | null
  account_name?: string | null
  representative?: string | null
  quotation?: string
  category?: string
  type: string
}

export function TopBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ conversations: SearchResult[]; evidence: SearchResult[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const pageTitle = BREADCRUMBS[location.pathname] || 'DealRadar'

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null)
      setOpen(false)
      return
    }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await globalSearch(query.trim())
        setResults(data)
        setOpen(true)
      } catch {
        setResults(null)
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const totalResults = (results?.conversations.length || 0) + (results?.evidence.length || 0)

  return (
    <header className="h-14 flex items-center gap-4 px-6 bg-white border-b border-gray-100">
      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold text-gray-900 truncate">{pageTitle}</h1>
      </div>

      {/* Global search */}
      <div ref={ref} className="relative w-72">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search deals, transcripts…"
            className="w-full pl-9 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          />
          {loading && (
            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
          )}
          {query && !loading && (
            <button
              onClick={() => { setQuery(''); setResults(null); setOpen(false) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <AnimatePresence>
          {open && results && totalResults > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50"
            >
              {results.conversations.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">
                    Deals
                  </div>
                  {results.conversations.map(c => (
                    <button
                      key={c.id}
                      className="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors"
                      onClick={() => {
                        navigate(`/deals/${c.id}`)
                        setOpen(false)
                        setQuery('')
                      }}
                    >
                      <div className="text-sm font-medium text-gray-800">{c.deal_name || c.conversation_id}</div>
                      <div className="text-xs text-gray-400">{c.account_name} · {c.representative}</div>
                    </button>
                  ))}
                </div>
              )}
              {results.evidence.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">
                    Evidence
                  </div>
                  {results.evidence.map(e => (
                    <button
                      key={e.id}
                      className="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors"
                      onClick={() => {
                        navigate(`/evidence`)
                        setOpen(false)
                        setQuery('')
                      }}
                    >
                      <div className="text-xs text-gray-500 uppercase font-medium">{e.category}</div>
                      <div className="text-sm text-gray-700 truncate">{e.quotation}</div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
          {open && results && totalResults === 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-4 text-center text-sm text-gray-400"
            >
              No results for "{query}"
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Import shortcut */}
      <button
        onClick={() => navigate('/imports')}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
        title="Import Data"
      >
        <Upload size={12} />
        Import
      </button>
    </header>
  )
}
