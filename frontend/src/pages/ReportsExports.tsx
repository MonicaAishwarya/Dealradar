import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Download, FileText, Database, CheckSquare, AlertTriangle,
  Route, ClipboardList, Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { createExport, getDashboard } from '@/services/api'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

const EXPORT_ITEMS = [
  { icon: FileText, label: 'Conversations', desc: 'All conversation records with metadata' },
  { icon: Database, label: 'Evidence', desc: 'All extracted evidence items with quotations' },
  { icon: CheckSquare, label: 'Commitments', desc: 'All commitments and their current status' },
  { icon: AlertTriangle, label: 'Risk Assessments', desc: 'Risk scores and contributing factors' },
  { icon: Route, label: 'Routing Decisions', desc: 'System recommendations and manual overrides' },
  { icon: ClipboardList, label: 'Audit Log', desc: 'Recent audit events (up to 5,000)' },
]

export function ReportsExports() {
  const [exporting, setExporting] = useState(false)
  const { data: summary } = useQuery({ queryKey: ['dashboard'], queryFn: () => import('@/services/api').then(m => m.getDashboard()) })

  const handleExport = async () => {
    setExporting(true)
    try {
      await createExport()
      toast.success('Export downloaded successfully')
    } catch (e: any) {
      toast.error(`Export failed: ${e.message}`)
    } finally {
      setExporting(false)
    }
  }

  const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }
  const item = { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Summary stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Conversations', value: summary.total_conversations },
            { label: 'High Risk Deals', value: summary.high_risk_deals },
            { label: 'Pending Commitments', value: summary.pending_commitments },
            { label: 'Overdue Commitments', value: summary.overdue_commitments },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Export bundle */}
      <Card>
        <CardHeader>
          <CardTitle>Full Data Export</CardTitle>
          <span className="text-xs text-gray-400">ZIP bundle with CSV + manifest.json</span>
        </CardHeader>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5"
        >
          {EXPORT_ITEMS.map(({ icon: Icon, label, desc }) => (
            <motion.div
              key={label}
              variants={item}
              className="flex items-start gap-3 p-3 border border-gray-100 rounded-lg bg-gray-50/50"
            >
              <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                <Icon size={13} className="text-gray-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700">{label}</p>
                <p className="text-[11px] text-gray-400">{desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-start gap-4">
            <Button
              onClick={handleExport}
              loading={exporting}
              disabled={exporting}
              size="md"
            >
              {exporting ? (
                <><Loader2 size={14} className="animate-spin" /> Generating…</>
              ) : (
                <><Download size={14} /> Download Export Bundle</>
              )}
            </Button>
            <div className="text-xs text-gray-400 mt-1">
              <p>Exports include a <code className="bg-gray-100 px-1 rounded">manifest.json</code> with timestamps,</p>
              <p>record counts, and SHA-256 content hashes per file.</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Export notes */}
      <Card>
        <CardHeader><CardTitle>Export Notes</CardTitle></CardHeader>
        <ul className="space-y-2 text-xs text-gray-600">
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
            All exports reflect the current state of the database at the time of download.
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
            Transcripts are excluded from conversation exports to keep file sizes manageable.
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
            Manual route overrides are included in the routing decisions export as a separate column.
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
            Every export is recorded in the Audit Log with a timestamp and file manifest.
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
            Synthetic sample data is included in exports and labelled via the <code className="bg-gray-100 px-1 rounded">is_synthetic</code> field.
          </li>
        </ul>
      </Card>
    </div>
  )
}
