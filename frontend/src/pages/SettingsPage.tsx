import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Info, Shield, Zap, Database } from 'lucide-react'

export function SettingsPage() {
  return (
    <div className="p-6 space-y-5 max-w-2xl">
      {/* Risk thresholds info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield size={14} className="text-blue-500" /> Risk Scoring Configuration
          </CardTitle>
        </CardHeader>
        <div className="space-y-3 text-sm">
          <p className="text-xs text-gray-500">
            Risk scores are computed by the backend using deterministic rules (version 1.0).
            The thresholds below define how scores map to risk levels.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Low Risk', range: '0 – 30', color: 'bg-green-100 text-green-700 border-green-200' },
              { label: 'Medium Risk', range: '31 – 60', color: 'bg-amber-100 text-amber-700 border-amber-200' },
              { label: 'High Risk', range: '61 – 85', color: 'bg-orange-100 text-orange-700 border-orange-200' },
              { label: 'Critical Risk', range: '86 – 100', color: 'bg-red-100 text-red-700 border-red-200' },
            ].map(r => (
              <div key={r.label} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium ${r.color}`}>
                <span>{r.label}</span>
                <span className="font-semibold">{r.range}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">To change thresholds, update <code className="bg-gray-100 px-1 rounded">RISK_LOW_MAX</code>, <code className="bg-gray-100 px-1 rounded">RISK_MEDIUM_MAX</code>, <code className="bg-gray-100 px-1 rounded">RISK_HIGH_MAX</code> in your backend <code className="bg-gray-100 px-1 rounded">.env</code> file and restart the server.</p>
        </div>
      </Card>

      {/* Routing rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap size={14} className="text-blue-500" /> Routing Rules (v1.0)
          </CardTitle>
        </CardHeader>
        <div className="space-y-2">
          {[
            { rule: '1', condition: 'Critical risk + objection / blocker', route: 'Manager Escalation', color: 'text-red-700' },
            { rule: '2', condition: 'Pricing concern detected (non-critical)', route: 'Pricing / Deal Desk', color: 'text-purple-700' },
            { rule: '3', condition: 'Technical blocker (no pricing concern)', route: 'Technical Help', color: 'text-cyan-700' },
            { rule: '4', condition: 'High risk score or overdue commitment', route: 'Manager Escalation', color: 'text-red-700' },
            { rule: '5', condition: 'Pending commitments or next steps', route: 'Rep Follow-up', color: 'text-blue-700' },
            { rule: '6', condition: 'No actionable issue found', route: 'No Action', color: 'text-gray-600' },
          ].map(r => (
            <div key={r.rule} className="flex items-center gap-3 text-xs py-2 border-b border-gray-50 last:border-0">
              <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-semibold flex-shrink-0 text-[10px]">{r.rule}</span>
              <span className="flex-1 text-gray-600">{r.condition}</span>
              <span className={`font-semibold ${r.color}`}>→ {r.route}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">Rules are applied in priority order. The first matching rule wins. To modify rules, edit <code className="bg-gray-100 px-1 rounded">backend/app/services/routing_engine.py</code>.</p>
      </Card>

      {/* Database info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database size={14} className="text-blue-500" /> Database
          </CardTitle>
        </CardHeader>
        <div className="space-y-2 text-xs text-gray-600">
          <p>Development: SQLite (<code className="bg-gray-100 px-1 rounded">dealradar.db</code> in backend directory)</p>
          <p>Production: Set <code className="bg-gray-100 px-1 rounded">DATABASE_URL</code> to a PostgreSQL connection string.</p>
          <p className="text-gray-400">Migrations are managed by Alembic. Run <code className="bg-gray-100 px-1 rounded">alembic upgrade head</code> after schema changes.</p>
        </div>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info size={14} className="text-blue-500" /> About DealRadar
          </CardTitle>
        </CardHeader>
        <div className="space-y-1 text-xs text-gray-600">
          <p><strong>Version:</strong> 1.0.0</p>
          <p><strong>Stack:</strong> React + Vite + TypeScript · FastAPI · SQLite/PostgreSQL</p>
          <p><strong>Evidence extraction:</strong> Rule-based (no external API required)</p>
          <p><strong>Authentication:</strong> Not implemented in v1.0 — do not expose to the public internet with private data.</p>
          <p className="text-gray-400 pt-1">
            This platform contains synthetic sample data for demonstration. Sample records are labelled
            with <code className="bg-gray-100 px-1 rounded">is_synthetic: true</code> and are not real customer data.
          </p>
        </div>
      </Card>
    </div>
  )
}
