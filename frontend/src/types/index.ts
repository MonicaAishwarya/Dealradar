export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type RouteType = 'rep_followup' | 'manager_escalation' | 'pricing_deal_desk' | 'technical_help' | 'no_action'
export type CommitmentStatus = 'pending' | 'completed' | 'overdue' | 'unknown'
export type EvidenceCategory =
  | 'objection'
  | 'buying_signal'
  | 'commitment'
  | 'deadline'
  | 'pricing_concern'
  | 'technical_blocker'
  | 'decision_maker'
  | 'next_step'

export interface RiskFactor {
  factor: string
  weight: number
  description: string
  evidence?: string
}

export interface RiskAssessment {
  id: string
  conversation_id: string
  risk_score: number
  risk_level: RiskLevel
  risk_factors: RiskFactor[]
  rules_version: string
  computed_at: string
}

export interface RoutingDecision {
  id: string
  conversation_id: string
  recommended_route: RouteType
  recommendation_reason: string | null
  recommendation_evidence: Array<{ type: string; quote: string }>
  rules_version: string
  recommended_at: string
  manual_route: RouteType | null
  override_reason: string | null
  overridden_at: string | null
  overridden_by: string | null
}

export interface Evidence {
  id: string
  conversation_id: string
  category: EvidenceCategory
  quotation: string
  speaker: string | null
  position_start: number | null
  position_end: number | null
  context_before: string | null
  context_after: string | null
  extraction_method: string
  validation_status: string
  created_at: string
  deal_name?: string | null
  account_name?: string | null
  representative?: string | null
}

export interface Commitment {
  id: string
  conversation_id: string
  description: string
  responsible_person: string | null
  due_date: string | null
  status: CommitmentStatus
  source_quotation: string | null
  created_at: string
  updated_at: string
  deal_name?: string | null
  account_name?: string | null
  representative?: string | null
}

export interface Conversation {
  id: string
  conversation_id: string
  deal_name: string | null
  account_name: string | null
  representative: string | null
  conversation_date: string | null
  source: string | null
  transcript?: string
  is_synthetic: boolean
  created_at: string
  updated_at: string
  risk_level?: RiskLevel | null
  risk_score?: number | null
  recommended_route?: RouteType | null
  manual_route?: RouteType | null
  overdue_commitments?: number
  pending_commitments?: number
  evidence?: Evidence[]
  commitments?: Commitment[]
  risk_assessment?: RiskAssessment | null
  routing_decision?: RoutingDecision | null
}

export interface ImportBatch {
  id: string
  filename: string
  file_format: string
  status: string
  records_total: number
  records_created: number
  records_updated: number
  records_skipped: number
  records_failed: number
  error_summary: string | null
  errors?: Array<{ row_number: number | null; field: string | null; message: string }>
  created_at: string
  completed_at: string | null
}

export interface AuditEvent {
  id: string
  event_type: string
  entity_type: string | null
  entity_id: string | null
  conversation_id: string | null
  summary: string
  metadata: Record<string, unknown> | null
  actor: string
  created_at: string
}

export interface DashboardSummary {
  total_conversations: number
  total_deals: number
  high_risk_deals: number
  overdue_commitments: number
  pending_commitments: number
  awaiting_rep_followup: number
  needs_manager_escalation: number
  needs_pricing_review: number
  needs_technical_help: number
  risk_distribution: Record<RiskLevel, number>
  route_distribution: Record<RouteType, number>
  recent_activity: Conversation[]
  top_priority_deals: Conversation[]
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}
