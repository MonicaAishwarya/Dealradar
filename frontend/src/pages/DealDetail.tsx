import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { getConversation } from '@/services/api'
import { DealDrawer } from '@/components/deals/DealDrawer'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { SkeletonCard } from '@/components/ui/Skeleton'

export function DealDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['conversation', id],
    queryFn: () => getConversation(id!),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <SkeletonCard lines={6} />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<AlertTriangle size={20} />}
          title="Deal not found"
          description="This deal may have been removed or the ID is invalid."
          action={<Button onClick={() => navigate('/deals')}>Back to Deals</Button>}
        />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      <div className="p-4 border-b border-gray-100 bg-white flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <span className="text-xs text-gray-300">/</span>
        <span className="text-xs text-gray-600">{data.deal_name || data.conversation_id}</span>
      </div>

      {/* Open the drawer inline — it covers the page from the right */}
      <DealDrawer dealId={id!} onClose={() => navigate('/deals')} />
    </div>
  )
}
