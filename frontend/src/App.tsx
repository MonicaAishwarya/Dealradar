import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { CommandCenter } from '@/pages/CommandCenter'
import { DecisionQueue } from '@/pages/DecisionQueue'
import { DealsPage } from '@/pages/DealsPage'
import { DealDetail } from '@/pages/DealDetail'
import { EvidenceExplorer } from '@/pages/EvidenceExplorer'
import { CommitmentTracker } from '@/pages/CommitmentTracker'
import { ImportCenter } from '@/pages/ImportCenter'
import { ReportsExports } from '@/pages/ReportsExports'
import { AuditLog } from '@/pages/AuditLog'
import { SettingsPage } from '@/pages/SettingsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<CommandCenter />} />
            <Route path="/queue" element={<DecisionQueue />} />
            <Route path="/deals" element={<DealsPage />} />
            <Route path="/deals/:id" element={<DealDetail />} />
            <Route path="/evidence" element={<EvidenceExplorer />} />
            <Route path="/commitments" element={<CommitmentTracker />} />
            <Route path="/imports" element={<ImportCenter />} />
            <Route path="/reports" element={<ReportsExports />} />
            <Route path="/audit" element={<AuditLog />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
