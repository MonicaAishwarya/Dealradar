import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { uploadFile, getImports, getImportErrors } from '@/services/api'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDateTime } from '@/utils/formatters'
import type { ImportBatch } from '@/types'

function StatusIcon({ status }: { status: string }) {
  if (status === 'completed') return <CheckCircle size={14} className="text-green-500" />
  if (status === 'failed') return <XCircle size={14} className="text-red-500" />
  return <Clock size={14} className="text-blue-500" />
}

function ImportRow({ batch }: { batch: ImportBatch }) {
  const [expanded, setExpanded] = useState(false)
  const { data: errors } = useQuery({
    queryKey: ['importErrors', batch.id],
    queryFn: () => getImportErrors(batch.id),
    enabled: expanded && batch.records_failed > 0,
  })

  return (
    <div className="border-b border-gray-50 last:border-0">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        <StatusIcon status={batch.status} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-800">{batch.filename}</p>
          <p className="text-[11px] text-gray-400">{formatDateTime(batch.created_at)} · {batch.file_format.toUpperCase()}</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500 flex-shrink-0">
          <span className="text-green-600 font-medium">+{batch.records_created}</span>
          <span className="text-blue-600 font-medium">~{batch.records_updated}</span>
          <span className="text-gray-400">={batch.records_skipped}</span>
          {batch.records_failed > 0 && <span className="text-red-600 font-medium">✕{batch.records_failed}</span>}
          <span className="text-gray-300">/ {batch.records_total} total</span>
        </div>
        {expanded ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 bg-gray-50/50 space-y-3">
              <div className="flex flex-wrap gap-4 text-xs">
                <div><span className="text-gray-400">Created:</span> <span className="font-medium text-green-700">{batch.records_created}</span></div>
                <div><span className="text-gray-400">Updated:</span> <span className="font-medium text-blue-700">{batch.records_updated}</span></div>
                <div><span className="text-gray-400">Skipped:</span> <span className="font-medium text-gray-600">{batch.records_skipped}</span></div>
                <div><span className="text-gray-400">Failed:</span> <span className="font-medium text-red-700">{batch.records_failed}</span></div>
                {batch.completed_at && (
                  <div><span className="text-gray-400">Completed:</span> <span className="font-medium">{formatDateTime(batch.completed_at)}</span></div>
                )}
              </div>
              {batch.error_summary && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">{batch.error_summary}</p>
              )}
              {errors && errors.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Errors ({errors.length})</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {errors.map((e: any) => (
                      <div key={e.id} className="text-xs bg-red-50 border border-red-100 rounded px-3 py-1.5">
                        {e.row_number != null && <span className="font-medium">Row {e.row_number}: </span>}
                        {e.field && <span className="text-red-700">[{e.field}] </span>}
                        {e.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function ImportCenter() {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['imports'],
    queryFn: () => getImports({ page: 1, page_size: 50 }),
  })

  const mutation = useMutation({
    mutationFn: uploadFile,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['imports'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      toast.success(
        `Import complete: ${result.records_created} created, ${result.records_updated} updated, ${result.records_skipped} skipped`
      )
    },
    onError: (e: Error) => toast.error(`Import failed: ${e.message}`),
  })

  const handleFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['csv', 'json'].includes(ext || '')) {
      toast.error('Only .csv and .json files are supported')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File too large (max 50 MB)')
      return
    }
    mutation.mutate(file)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [])

  return (
    <div className="p-6 space-y-5">
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
          dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.json"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
        />
        <motion.div animate={{ y: dragging ? -4 : 0 }} className="flex flex-col items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${dragging ? 'bg-blue-100' : 'bg-gray-100'}`}>
            <Upload size={20} className={dragging ? 'text-blue-600' : 'text-gray-400'} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Drop a CSV or JSON file here</p>
            <p className="text-xs text-gray-400">or click to browse · max 50 MB</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            loading={mutation.isPending}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Processing…' : 'Choose File'}
          </Button>
        </motion.div>

        {mutation.isPending && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-blue-500 rounded-full"
                animate={{ width: ['0%', '90%'] }}
                transition={{ duration: 3, ease: 'easeOut' }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">Analyzing transcript and extracting evidence…</p>
          </motion.div>
        )}
      </div>

      {/* Format guide */}
      <Card padding="sm">
        <CardHeader><CardTitle>Expected Format</CardTitle></CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600">
          <div>
            <p className="font-semibold text-gray-700 mb-2">CSV columns</p>
            <div className="space-y-1 font-mono text-[11px]">
              {['conversation_id *', 'transcript *', 'deal_name', 'account_name', 'representative', 'conversation_date', 'source'].map(f => (
                <div key={f} className="flex gap-2">
                  <span className={f.includes('*') ? 'text-red-600' : 'text-gray-400'}>{f.replace(' *', '')}</span>
                  {f.includes('*') && <span className="text-red-500">required</span>}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-2">JSON structure</p>
            <pre className="bg-gray-50 rounded p-2 text-[11px] overflow-x-auto">{`{
  "conversations": [
    {
      "conversation_id": "CONV-001",
      "transcript": "...",
      "deal_name": "Acme Deal"
    }
  ]
}`}</pre>
          </div>
        </div>
      </Card>

      {/* Import history */}
      <Card padding="none">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">Import History</p>
          {data && <p className="text-xs text-gray-400">{data.total} import{data.total !== 1 ? 's' : ''}</p>}
        </div>
        <div className="px-4 py-2 border-b border-gray-50 flex gap-6 text-[11px] text-gray-400">
          <span className="text-green-600">+Created</span>
          <span className="text-blue-600">~Updated</span>
          <span>=Skipped</span>
          <span className="text-red-600">✕Failed</span>
        </div>
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} lines={1} />)}
          </div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="No imports yet" description="Upload a CSV or JSON file above." />
        ) : (
          data.items.map(b => <ImportRow key={b.id} batch={b} />)
        )}
      </Card>
    </div>
  )
}
