import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  Tooltip, XAxis, YAxis, CartesianGrid
} from 'recharts'
import {
  AlertTriangle, Clock, ArrowRight, TrendingUp,
  Users, FileText, CheckCircle, Zap, Upload
} from 'lucide-react'
import { getDashboard } from '@/services/api'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { RiskBadge, RouteBadge } from '@/components/ui/Badge'
import { RiskScoreBar } from '@/components/ui/RiskScoreBar'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { timeAgo, RISK_CHART_COLORS, ROUTE_LABELS, ROUTE_CHART_COLORS, RISK_LABELS } from '@/utils/formatters'
import type { RiskLevel, RouteType } from '@/types'

function MetricCard({
  label, value, icon: Icon, color, onClick, sublabel
}: {
  label: string
  value: number | string
  icon: any
  color: string
  onClick?: () => void
  sublabel?: string
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-left hover:border-blue-200 hover:shadow-md transition-all w-full"
      disabled={!onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={16} className="text-white" />
        </div>
        {onClick && <ArrowRight size={14} className="text-gray-300 mt-1" />}
      </div>
      <div className="text-2xl font-bold text-gray-900 tabular-nums">{value}</div>
      <div className="text-xs font-medium text-gray-500 mt-0.5">{label}</div>
      {sublabel && <div className="text-xs text-gray-400 mt-0.5">{sublabel}</div>}
    </motion.button>
  )
}

export function CommandCenter() {
  const navigate = useNavigate()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    refetchInterval: 30000,
  })

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} lines={2} />)}
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<AlertTriangle size={20} />}
          title="Could not load dashboard"
          description="Make sure the backend is running on port 8000."
        />
      </div>
    )
  }

  const isEmpty = data.total_conversations === 0

  if (isEmpty) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[calc(100vh-112px)]">
        <EmptyState
          title="No conversations yet"
          description="Import your first dataset to see intelligence insights, risk scores, and routing recommendations."
          action={
            <Button onClick={() => navigate('/imports')}>
              <Upload size={14} /> Import Sample Data
            </Button>
          }
        />
      </div>
    )
  }

  // Charts data
  const riskChartData = Object.entries(data.risk_distribution).map(([level, count]) => ({
    name: RISK_LABELS[level as RiskLevel],
    value: count,
    color: RISK_CHART_COLORS[level as RiskLevel],
  })).filter(d => d.value > 0)

  const routeChartData = Object.entries(data.route_distribution).map(([route, count]) => ({
    name: ROUTE_LABELS[route as RouteType],
    value: count,
    color: ROUTE_CHART_COLORS[route as RouteType],
  })).filter(d => d.value > 0)

  const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }
  const item = { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl">
      {/* Synthetic data notice */}
      {data.recent_activity.some(c => c.is_synthetic) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 flex items-center gap-2 text-xs text-blue-700">
          <Zap size={12} />
          Displaying synthetic sample data for demonstration. Not real customer information.
        </div>
      )}

      {/* Key metrics */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <motion.div variants={item}>
          <MetricCard
            label="Total Conversations"
            value={data.total_conversations}
            icon={FileText}
            color="bg-blue-500"
            onClick={() => navigate('/deals')}
          />
        </motion.div>
        <motion.div variants={item}>
          <MetricCard
            label="High Risk Deals"
            value={data.high_risk_deals}
            icon={AlertTriangle}
            color="bg-red-500"
            onClick={() => navigate('/queue?risk=high')}
            sublabel="High + Critical"
          />
        </motion.div>
        <motion.div variants={item}>
          <MetricCard
            label="Overdue Commitments"
            value={data.overdue_commitments}
            icon={Clock}
            color="bg-orange-500"
            onClick={() => navigate('/commitments?status=overdue')}
          />
        </motion.div>
        <motion.div variants={item}>
          <MetricCard
            label="Rep Follow-ups Needed"
            value={data.awaiting_rep_followup}
            icon={Users}
            color="bg-indigo-500"
            onClick={() => navigate('/queue?route=rep_followup')}
          />
        </motion.div>
        <motion.div variants={item}>
          <MetricCard
            label="Manager Escalations"
            value={data.needs_manager_escalation}
            icon={AlertTriangle}
            color="bg-rose-500"
            onClick={() => navigate('/queue?route=manager_escalation')}
          />
        </motion.div>
        <motion.div variants={item}>
          <MetricCard
            label="Pricing Reviews"
            value={data.needs_pricing_review}
            icon={TrendingUp}
            color="bg-purple-500"
            onClick={() => navigate('/queue?route=pricing_deal_desk')}
          />
        </motion.div>
        <motion.div variants={item}>
          <MetricCard
            label="Technical Help Needed"
            value={data.needs_technical_help}
            icon={Zap}
            color="bg-cyan-500"
            onClick={() => navigate('/queue?route=technical_help')}
          />
        </motion.div>
        <motion.div variants={item}>
          <MetricCard
            label="Pending Commitments"
            value={data.pending_commitments}
            icon={CheckCircle}
            color="bg-teal-500"
            onClick={() => navigate('/commitments?status=pending')}
          />
        </motion.div>
      </motion.div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Risk Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
          </CardHeader>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={riskChartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
              >
                {riskChartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [value, name]}
                contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2">
            {riskChartData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name} ({d.value})
              </div>
            ))}
          </div>
        </Card>

        {/* Routing Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Routing Distribution</CardTitle>
          </CardHeader>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={routeChartData} layout="vertical" margin={{ left: 0, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
              <Tooltip
                contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {routeChartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Top Priority Deals */}
      <Card>
        <CardHeader>
          <CardTitle>Top Priority Deals</CardTitle>
          <button
            onClick={() => navigate('/queue')}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            View all <ArrowRight size={12} />
          </button>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Deal</th>
                <th className="pb-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Account</th>
                <th className="pb-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Rep</th>
                <th className="pb-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Risk</th>
                <th className="pb-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Score</th>
                <th className="pb-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Route</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {data.top_priority_deals.map(deal => (
                <motion.tr
                  key={deal.id}
                  whileHover={{ backgroundColor: '#f9fafb' }}
                  className="border-b border-gray-50 cursor-pointer"
                  onClick={() => navigate(`/deals/${deal.id}`)}
                >
                  <td className="py-2.5 pr-4 font-medium text-gray-800 max-w-[180px] truncate">
                    {deal.deal_name || deal.conversation_id}
                  </td>
                  <td className="py-2.5 pr-4 text-gray-500 max-w-[140px] truncate">
                    {deal.account_name || '—'}
                  </td>
                  <td className="py-2.5 pr-4 text-gray-500 max-w-[120px] truncate">
                    {deal.representative || '—'}
                  </td>
                  <td className="py-2.5 pr-4">
                    {deal.risk_level && <RiskBadge level={deal.risk_level} />}
                  </td>
                  <td className="py-2.5 pr-6 w-28">
                    {deal.risk_score !== undefined && deal.risk_level && (
                      <RiskScoreBar score={deal.risk_score} level={deal.risk_level} />
                    )}
                  </td>
                  <td className="py-2.5 pr-4">
                    {deal.recommended_route && <RouteBadge route={deal.recommended_route} />}
                  </td>
                  <td className="py-2.5">
                    <ArrowRight size={14} className="text-gray-300" />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <div className="space-y-2">
          {data.recent_activity.slice(0, 5).map(c => (
            <motion.button
              key={c.id}
              whileHover={{ backgroundColor: '#f9fafb' }}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors text-left"
              onClick={() => navigate(`/deals/${c.id}`)}
            >
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <FileText size={14} className="text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">
                  {c.deal_name || c.conversation_id}
                </div>
                <div className="text-xs text-gray-400">
                  {c.account_name} · {c.representative}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {c.risk_level && <RiskBadge level={c.risk_level} />}
                <span className="text-xs text-gray-400">{timeAgo(c.created_at)}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </Card>
    </div>
  )
}
