'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import type { AIAgentResponse } from '@/lib/aiAgent'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FiHome, FiSettings, FiClock, FiDollarSign, FiTrendingUp, FiTrendingDown,
  FiCreditCard, FiAlertTriangle, FiSend, FiMessageSquare, FiX, FiPlus,
  FiTrash2, FiEdit, FiShield, FiPieChart, FiActivity, FiChevronRight,
  FiLoader, FiCheck, FiInfo, FiArrowDown, FiArrowUp
} from 'react-icons/fi'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

// ============================================================================
// CONSTANTS
// ============================================================================

const MANAGER_AGENT_ID = '6992c20848cf09a10ff22202'

const AGENTS = [
  { id: '6992c20848cf09a10ff22202', name: 'Finance Coordinator', purpose: 'Coordinates analysis workflow' },
  { id: '6992c1d9db29f3a7c1dd9945', name: 'Email Transaction Agent', purpose: 'Fetches Gmail transactions' },
  { id: '6992c1f11de6d4d0944ce377', name: 'Financial Analyst', purpose: 'Analyzes spending patterns' },
]

const PIE_COLORS = [
  'hsl(27, 61%, 26%)',
  'hsl(43, 75%, 38%)',
  'hsl(30, 55%, 25%)',
  'hsl(35, 45%, 42%)',
  'hsl(20, 65%, 35%)',
  'hsl(15, 50%, 40%)',
  'hsl(40, 60%, 30%)',
  'hsl(25, 45%, 50%)',
]

// ============================================================================
// TYPES
// ============================================================================

interface CreditCardProfile {
  name: string
  limit: number
}

interface EMIProfile {
  name: string
  amount: number
}

interface FixedExpenses {
  rent: number
  utilities: number
  insurance: number
}

interface FinancialProfile {
  salary: number
  cards: CreditCardProfile[]
  emis: EMIProfile[]
  fixedExpenses: FixedExpenses
}

interface IncomeSummary {
  net_income: number
  total_fixed_expenses: number
  total_variable_expenses: number
  total_emi: number
  total_outflow: number
  savings: number
  savings_rate: number
}

interface CreditCardData {
  card_name: string
  limit: number
  spend: number
  utilization_percent: number
}

interface CategoryBreakdown {
  category: string
  amount: number
  percent_of_total: number
  transaction_count: number
}

interface RiskAlert {
  alert_type: string
  message: string
  severity: string
}

interface FinancialReport {
  report_type: string
  income_summary: IncomeSummary | null
  credit_cards: CreditCardData[]
  category_breakdown: CategoryBreakdown[]
  risk_alerts: RiskAlert[]
  safe_to_spend: number
  analysis_period: string
  advice: string
  follow_up_response: string
}

interface ChatMessage {
  role: 'user' | 'agent'
  content: string
  timestamp: number
}

interface HistoryEntry {
  id: string
  date: string
  report: FinancialReport
  profile: FinancialProfile
}

// ============================================================================
// SAMPLE DATA
// ============================================================================

const SAMPLE_PROFILE: FinancialProfile = {
  salary: 8500,
  cards: [
    { name: 'Chase Sapphire', limit: 15000 },
    { name: 'Amex Gold', limit: 10000 },
  ],
  emis: [
    { name: 'Car Loan', amount: 450 },
    { name: 'Student Loan', amount: 280 },
  ],
  fixedExpenses: { rent: 1800, utilities: 220, insurance: 180 },
}

const SAMPLE_REPORT: FinancialReport = {
  report_type: 'Monthly Financial Analysis',
  income_summary: {
    net_income: 8500,
    total_fixed_expenses: 2200,
    total_variable_expenses: 2850,
    total_emi: 730,
    total_outflow: 5780,
    savings: 2720,
    savings_rate: 32,
  },
  credit_cards: [
    { card_name: 'Chase Sapphire', limit: 15000, spend: 3200, utilization_percent: 21.3 },
    { card_name: 'Amex Gold', limit: 10000, spend: 1850, utilization_percent: 18.5 },
  ],
  category_breakdown: [
    { category: 'Groceries', amount: 680, percent_of_total: 13.2, transaction_count: 12 },
    { category: 'Dining Out', amount: 420, percent_of_total: 8.1, transaction_count: 8 },
    { category: 'Transportation', amount: 310, percent_of_total: 6.0, transaction_count: 15 },
    { category: 'Entertainment', amount: 280, percent_of_total: 5.4, transaction_count: 6 },
    { category: 'Shopping', amount: 560, percent_of_total: 10.8, transaction_count: 9 },
    { category: 'Subscriptions', amount: 120, percent_of_total: 2.3, transaction_count: 5 },
    { category: 'Healthcare', amount: 240, percent_of_total: 4.6, transaction_count: 3 },
    { category: 'Travel', amount: 240, percent_of_total: 4.6, transaction_count: 2 },
  ],
  risk_alerts: [
    { alert_type: 'Spending Trend', message: 'Dining expenses increased 18% compared to last month', severity: 'medium' },
    { alert_type: 'Budget Warning', message: 'Entertainment spending is approaching your monthly average', severity: 'low' },
    { alert_type: 'Credit Alert', message: 'Chase Sapphire approaching 25% utilization threshold', severity: 'high' },
  ],
  safe_to_spend: 1420,
  analysis_period: 'January 2026',
  advice: 'Your savings rate of 32% is excellent. Consider reducing dining expenses which increased 18% this month. Your credit utilization remains healthy across both cards. Continue maintaining this disciplined approach to build your emergency fund.',
  follow_up_response: '',
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatCurrency(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return '₹0.00'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value)
}

function formatPercent(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return '0%'
  return `${value.toFixed(1)}%`
}

function getUtilizationColor(percent: number): string {
  if (percent < 30) return 'bg-green-500'
  if (percent < 60) return 'bg-yellow-500'
  return 'bg-red-500'
}

function getUtilizationTextColor(percent: number): string {
  if (percent < 30) return 'text-green-700'
  if (percent < 60) return 'text-yellow-700'
  return 'text-red-700'
}

function getSeverityColor(severity: string): string {
  const s = (severity ?? '').toLowerCase()
  if (s === 'high') return 'border-red-400 bg-red-50 text-red-800'
  if (s === 'medium') return 'border-yellow-400 bg-yellow-50 text-yellow-800'
  return 'border-blue-400 bg-blue-50 text-blue-800'
}

function getSeverityIconColor(severity: string): string {
  const s = (severity ?? '').toLowerCase()
  if (s === 'high') return 'text-red-500'
  if (s === 'medium') return 'text-yellow-500'
  return 'text-blue-500'
}

function parseAgentResponse(result: AIAgentResponse): FinancialReport | null {
  if (!result?.success) return null

  const rawResult = result?.response?.result
  if (!rawResult) return null

  let data: Record<string, unknown> = rawResult as Record<string, unknown>

  if (data?.result && typeof data.result === 'object' && !Array.isArray(data.result)) {
    data = data.result as Record<string, unknown>
  }
  if (data?.response && typeof data.response === 'object' && !Array.isArray(data.response)) {
    data = data.response as Record<string, unknown>
  }

  if (data?.income_summary || data?.credit_cards || data?.category_breakdown) {
    return {
      report_type: (data?.report_type as string) ?? 'Monthly Analysis',
      income_summary: (data?.income_summary as IncomeSummary) ?? null,
      credit_cards: Array.isArray(data?.credit_cards) ? data.credit_cards as CreditCardData[] : [],
      category_breakdown: Array.isArray(data?.category_breakdown) ? data.category_breakdown as CategoryBreakdown[] : [],
      risk_alerts: Array.isArray(data?.risk_alerts) ? data.risk_alerts as RiskAlert[] : [],
      safe_to_spend: typeof data?.safe_to_spend === 'number' ? data.safe_to_spend : 0,
      analysis_period: (data?.analysis_period as string) ?? 'Current Month',
      advice: (data?.advice as string) ?? '',
      follow_up_response: (data?.follow_up_response as string) ?? '',
    }
  }

  const textResponse = typeof rawResult === 'string'
    ? rawResult
    : (rawResult as Record<string, unknown>)?.text as string ?? (rawResult as Record<string, unknown>)?.message as string ?? JSON.stringify(rawResult)

  return {
    follow_up_response: textResponse,
    income_summary: null,
    credit_cards: [],
    category_breakdown: [],
    risk_alerts: [],
    safe_to_spend: 0,
    analysis_period: '',
    advice: '',
    report_type: '',
  }
}

// ============================================================================
// MARKDOWN RENDERER
// ============================================================================

function formatInline(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">{part}</strong>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  )
}

function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## '))
          return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# '))
          return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* '))
          return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line))
          return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

// ============================================================================
// SUB-COMPONENTS (defined above Page)
// ============================================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3 mb-4">
        <FiLoader className="w-5 h-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground font-sans">Fetching transactions from Gmail and analyzing your finances...</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
      <Skeleton className="h-32 rounded-lg" />
    </div>
  )
}

function IncomeSummaryCard({ data }: { data: IncomeSummary | null }) {
  if (!data) return null
  const items = [
    { label: 'Net Income', value: data?.net_income, icon: FiDollarSign, color: 'text-green-600' },
    { label: 'Fixed Expenses', value: data?.total_fixed_expenses, icon: FiArrowDown, color: 'text-red-500' },
    { label: 'Variable Expenses', value: data?.total_variable_expenses, icon: FiActivity, color: 'text-orange-500' },
    { label: 'EMI / Loans', value: data?.total_emi, icon: FiCreditCard, color: 'text-purple-600' },
    { label: 'Total Outflow', value: data?.total_outflow, icon: FiTrendingDown, color: 'text-red-600' },
    { label: 'Savings', value: data?.savings, icon: FiTrendingUp, color: 'text-green-700' },
  ]

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-serif flex items-center gap-2">
          <FiDollarSign className="w-5 h-5 text-primary" />
          Income Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.label} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2.5">
                <Icon className={cn('w-4 h-4', item.color)} />
                <span className="text-sm font-sans text-muted-foreground">{item.label}</span>
              </div>
              <span className="text-sm font-semibold font-sans">{formatCurrency(item.value)}</span>
            </div>
          )
        })}
        <Separator />
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2.5">
            <FiPieChart className="w-4 h-4 text-primary" />
            <span className="text-sm font-sans font-medium">Savings Rate</span>
          </div>
          <Badge variant="secondary" className="font-sans text-sm font-semibold bg-green-100 text-green-700 border-green-200">
            {formatPercent(data?.savings_rate)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

function CreditCardTable({ cards }: { cards: CreditCardData[] }) {
  const safeCards = Array.isArray(cards) ? cards : []
  if (safeCards.length === 0) return null

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-serif flex items-center gap-2">
          <FiCreditCard className="w-5 h-5 text-primary" />
          Credit Cards
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-sans text-xs">Card</TableHead>
              <TableHead className="font-sans text-xs text-right">Limit</TableHead>
              <TableHead className="font-sans text-xs text-right">Spend</TableHead>
              <TableHead className="font-sans text-xs text-right">Utilization</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {safeCards.map((card, idx) => {
              const util = card?.utilization_percent ?? 0
              return (
                <TableRow key={idx}>
                  <TableCell className="font-sans text-sm font-medium">{card?.card_name ?? 'Unknown'}</TableCell>
                  <TableCell className="font-sans text-sm text-right">{formatCurrency(card?.limit)}</TableCell>
                  <TableCell className="font-sans text-sm text-right">{formatCurrency(card?.spend)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                        <div className={cn('h-full rounded-full', getUtilizationColor(util))} style={{ width: `${Math.min(util, 100)}%` }} />
                      </div>
                      <span className={cn('text-xs font-sans font-semibold min-w-[40px] text-right', getUtilizationTextColor(util))}>
                        {formatPercent(util)}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function CategoryBreakdownCard({ categories }: { categories: CategoryBreakdown[] }) {
  const safeCats = Array.isArray(categories) ? categories : []
  if (safeCats.length === 0) return null

  const [sortKey, setSortKey] = useState<'amount' | 'percent_of_total' | 'transaction_count'>('amount')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const sorted = [...safeCats].sort((a, b) => {
    const aVal = (a?.[sortKey] ?? 0)
    const bVal = (b?.[sortKey] ?? 0)
    return sortDir === 'desc' ? bVal - aVal : aVal - bVal
  })

  const pieData = safeCats.map((c) => ({
    name: c?.category ?? 'Other',
    value: c?.amount ?? 0,
  }))

  const handleSort = (key: 'amount' | 'percent_of_total' | 'transaction_count') => {
    if (sortKey === key) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-serif flex items-center gap-2">
          <FiPieChart className="w-5 h-5 text-primary" />
          Spending by Category
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                paddingAngle={2}
              >
                {pieData.map((_, idx) => (
                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ fontSize: '12px', fontFamily: 'sans-serif', borderRadius: '8px' }}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px', fontFamily: 'sans-serif' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-sans text-xs">Category</TableHead>
              <TableHead className="font-sans text-xs text-right cursor-pointer select-none" onClick={() => handleSort('amount')}>
                <span className="inline-flex items-center gap-1">Amount {sortKey === 'amount' && (sortDir === 'desc' ? <FiArrowDown className="w-3 h-3" /> : <FiArrowUp className="w-3 h-3" />)}</span>
              </TableHead>
              <TableHead className="font-sans text-xs text-right cursor-pointer select-none" onClick={() => handleSort('percent_of_total')}>
                <span className="inline-flex items-center gap-1">% Total {sortKey === 'percent_of_total' && (sortDir === 'desc' ? <FiArrowDown className="w-3 h-3" /> : <FiArrowUp className="w-3 h-3" />)}</span>
              </TableHead>
              <TableHead className="font-sans text-xs text-right cursor-pointer select-none" onClick={() => handleSort('transaction_count')}>
                <span className="inline-flex items-center gap-1">Txns {sortKey === 'transaction_count' && (sortDir === 'desc' ? <FiArrowDown className="w-3 h-3" /> : <FiArrowUp className="w-3 h-3" />)}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((cat, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-sans text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[safeCats.indexOf(cat) % PIE_COLORS.length] }} />
                    {cat?.category ?? 'Other'}
                  </div>
                </TableCell>
                <TableCell className="font-sans text-sm text-right">{formatCurrency(cat?.amount)}</TableCell>
                <TableCell className="font-sans text-sm text-right">{formatPercent(cat?.percent_of_total)}</TableCell>
                <TableCell className="font-sans text-sm text-right">{cat?.transaction_count ?? 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function RiskAlertsCard({ alerts }: { alerts: RiskAlert[] }) {
  const safeAlerts = Array.isArray(alerts) ? alerts : []
  if (safeAlerts.length === 0) return null

  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-serif flex items-center gap-2">
          <FiAlertTriangle className="w-5 h-5 text-yellow-600" />
          Risk Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {safeAlerts.map((alert, idx) => (
          <div key={idx} className={cn('p-3 rounded-lg border-l-4 text-sm font-sans', getSeverityColor(alert?.severity ?? 'low'))}>
            <div className="flex items-start gap-2">
              <FiAlertTriangle className={cn('w-4 h-4 mt-0.5 flex-shrink-0', getSeverityIconColor(alert?.severity ?? 'low'))} />
              <div>
                <div className="font-semibold text-xs uppercase tracking-wide mb-0.5">{alert?.alert_type ?? 'Alert'}</div>
                <div>{alert?.message ?? ''}</div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function SafeToSpendCard({ amount, advice }: { amount: number; advice: string }) {
  return (
    <Card className="shadow-sm border-border/50 bg-gradient-to-r from-card to-secondary/30">
      <CardContent className="py-8 px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <p className="text-sm font-sans text-muted-foreground uppercase tracking-wide mb-1">Safe to Spend</p>
            <p className="text-5xl font-bold font-serif" style={{ color: 'hsl(43, 75%, 38%)' }}>
              {formatCurrency(amount)}
            </p>
            <p className="text-xs font-sans text-muted-foreground mt-2">Remaining discretionary budget this month</p>
          </div>
          {advice && (
            <div className="max-w-md">
              <div className="flex items-start gap-2">
                <FiInfo className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                <div className="text-sm font-sans text-muted-foreground leading-relaxed">
                  {renderMarkdown(advice)}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function AgentStatusPanel({ activeAgentId }: { activeAgentId: string | null }) {
  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-sans font-semibold flex items-center gap-2">
          <FiShield className="w-4 h-4 text-primary" />
          AI Agents
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1.5">
          {AGENTS.map((agent) => (
            <div key={agent.id} className="flex items-center gap-2 text-xs font-sans">
              <div className={cn('w-2 h-2 rounded-full', activeAgentId === agent.id ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/30')} />
              <span className={cn('font-medium', activeAgentId === agent.id ? 'text-foreground' : 'text-muted-foreground')}>{agent.name}</span>
              <span className="text-muted-foreground/60 hidden sm:inline">- {agent.purpose}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ChatPanel({
  isOpen,
  onClose,
  messages,
  onSend,
  chatLoading,
}: {
  isOpen: boolean
  onClose: () => void
  messages: ChatMessage[]
  onSend: (msg: string) => void
  chatLoading: boolean
}) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || chatLoading) return
    onSend(trimmed)
    setInput('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-card border-l border-border shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <FiMessageSquare className="w-5 h-5 text-primary" />
          <h3 className="font-serif font-semibold text-base">Financial Assistant</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
          <FiX className="w-4 h-4" />
        </Button>
      </div>
      <div className="p-3 bg-secondary/30 border-b border-border">
        <p className="text-xs font-sans text-muted-foreground">Ask what-if questions, request budget advice, or explore your finances further.</p>
      </div>
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm font-sans">
              <FiMessageSquare className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p>No messages yet. Try asking:</p>
              <div className="mt-3 space-y-2">
                {['What if I cancel my streaming subscriptions?', 'How can I reduce dining expenses?', 'Should I pay off my car loan early?'].map((q) => (
                  <button
                    key={q}
                    onClick={() => { onSend(q) }}
                    className="block w-full text-left text-xs px-3 py-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm font-sans', msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-secondary text-secondary-foreground rounded-bl-sm')}>
                {msg.role === 'agent' ? renderMarkdown(msg.content) : msg.content}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-start">
              <div className="bg-secondary rounded-xl px-4 py-3 rounded-bl-sm">
                <div className="flex items-center gap-2 text-sm font-sans text-muted-foreground">
                  <FiLoader className="w-4 h-4 animate-spin" />
                  Thinking...
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="font-sans text-sm"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
            disabled={chatLoading}
          />
          <Button onClick={handleSend} disabled={chatLoading || !input.trim()} size="sm" className="px-3">
            <FiSend className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function ProfileForm({
  profile,
  onSave,
}: {
  profile: FinancialProfile
  onSave: (p: FinancialProfile) => void
}) {
  const [form, setForm] = useState<FinancialProfile>(profile)

  const updateSalary = (val: string) => {
    setForm((prev) => ({ ...prev, salary: parseFloat(val) || 0 }))
  }

  const addCard = () => {
    setForm((prev) => ({ ...prev, cards: [...prev.cards, { name: '', limit: 0 }] }))
  }

  const removeCard = (idx: number) => {
    setForm((prev) => ({ ...prev, cards: prev.cards.filter((_, i) => i !== idx) }))
  }

  const updateCard = (idx: number, field: 'name' | 'limit', val: string) => {
    setForm((prev) => ({
      ...prev,
      cards: prev.cards.map((c, i) => i === idx ? { ...c, [field]: field === 'limit' ? (parseFloat(val) || 0) : val } : c),
    }))
  }

  const addEMI = () => {
    setForm((prev) => ({ ...prev, emis: [...prev.emis, { name: '', amount: 0 }] }))
  }

  const removeEMI = (idx: number) => {
    setForm((prev) => ({ ...prev, emis: prev.emis.filter((_, i) => i !== idx) }))
  }

  const updateEMI = (idx: number, field: 'name' | 'amount', val: string) => {
    setForm((prev) => ({
      ...prev,
      emis: prev.emis.map((e, i) => i === idx ? { ...e, [field]: field === 'amount' ? (parseFloat(val) || 0) : val } : e),
    }))
  }

  const updateFixed = (field: keyof FixedExpenses, val: string) => {
    setForm((prev) => ({
      ...prev,
      fixedExpenses: { ...prev.fixedExpenses, [field]: parseFloat(val) || 0 },
    }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-2xl shadow-lg border-border/50">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <FiDollarSign className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-serif">Financial Profile Setup</CardTitle>
          <CardDescription className="font-sans text-sm">
            Enter your financial details to get a comprehensive analysis of your spending habits.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          {/* Monthly Salary */}
          <div className="space-y-2">
            <Label className="font-sans text-sm font-medium">Monthly Net Salary</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-sans">$</span>
              <Input
                type="number"
                value={form.salary || ''}
                onChange={(e) => updateSalary(e.target.value)}
                className="pl-7 font-sans"
                placeholder="8,500"
              />
            </div>
          </div>

          <Separator />

          {/* Credit Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-sans text-sm font-medium">Credit Cards</Label>
              <Button variant="outline" size="sm" onClick={addCard} className="font-sans text-xs gap-1">
                <FiPlus className="w-3 h-3" /> Add Card
              </Button>
            </div>
            {form.cards.map((card, idx) => (
              <div key={idx} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Input
                    value={card.name}
                    onChange={(e) => updateCard(idx, 'name', e.target.value)}
                    placeholder="Card name"
                    className="font-sans text-sm"
                  />
                </div>
                <div className="w-36">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-sans">$</span>
                    <Input
                      type="number"
                      value={card.limit || ''}
                      onChange={(e) => updateCard(idx, 'limit', e.target.value)}
                      placeholder="Limit"
                      className="pl-7 font-sans text-sm"
                    />
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeCard(idx)} className="text-destructive h-9 w-9 p-0">
                  <FiTrash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {form.cards.length === 0 && (
              <p className="text-xs font-sans text-muted-foreground">No credit cards added yet.</p>
            )}
          </div>

          <Separator />

          {/* EMIs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-sans text-sm font-medium">EMI / Loans</Label>
              <Button variant="outline" size="sm" onClick={addEMI} className="font-sans text-xs gap-1">
                <FiPlus className="w-3 h-3" /> Add EMI
              </Button>
            </div>
            {form.emis.map((emi, idx) => (
              <div key={idx} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Input
                    value={emi.name}
                    onChange={(e) => updateEMI(idx, 'name', e.target.value)}
                    placeholder="Loan name"
                    className="font-sans text-sm"
                  />
                </div>
                <div className="w-36">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-sans">$</span>
                    <Input
                      type="number"
                      value={emi.amount || ''}
                      onChange={(e) => updateEMI(idx, 'amount', e.target.value)}
                      placeholder="Amount"
                      className="pl-7 font-sans text-sm"
                    />
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeEMI(idx)} className="text-destructive h-9 w-9 p-0">
                  <FiTrash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {form.emis.length === 0 && (
              <p className="text-xs font-sans text-muted-foreground">No EMI or loans added yet.</p>
            )}
          </div>

          <Separator />

          {/* Fixed Expenses */}
          <div className="space-y-3">
            <Label className="font-sans text-sm font-medium">Fixed Monthly Expenses</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-sans text-muted-foreground">Rent</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-sans">$</span>
                  <Input
                    type="number"
                    value={form.fixedExpenses.rent || ''}
                    onChange={(e) => updateFixed('rent', e.target.value)}
                    className="pl-7 font-sans text-sm"
                    placeholder="1,800"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-sans text-muted-foreground">Utilities</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-sans">$</span>
                  <Input
                    type="number"
                    value={form.fixedExpenses.utilities || ''}
                    onChange={(e) => updateFixed('utilities', e.target.value)}
                    className="pl-7 font-sans text-sm"
                    placeholder="220"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-sans text-muted-foreground">Insurance</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-sans">$</span>
                  <Input
                    type="number"
                    value={form.fixedExpenses.insurance || ''}
                    onChange={(e) => updateFixed('insurance', e.target.value)}
                    className="pl-7 font-sans text-sm"
                    placeholder="180"
                  />
                </div>
              </div>
            </div>
          </div>

          <Button onClick={() => onSave(form)} className="w-full font-sans font-medium text-sm gap-2 h-11 mt-4" disabled={form.salary <= 0}>
            <FiCheck className="w-4 h-4" />
            Save & Analyze
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function HistoryView({ history, onSelect }: { history: HistoryEntry[]; onSelect: (entry: HistoryEntry) => void }) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FiClock className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <h3 className="font-serif text-lg font-semibold mb-2">No Analysis History</h3>
        <p className="text-sm font-sans text-muted-foreground max-w-sm">
          Run your first financial analysis to see your history here. Each analysis will be saved automatically.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <h2 className="font-serif text-xl font-semibold">Analysis History</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {history.map((entry) => {
          const totalSpend = entry.report?.income_summary?.total_outflow ?? 0
          const savingsRate = entry.report?.income_summary?.savings_rate ?? 0
          const topCat = Array.isArray(entry.report?.category_breakdown) && entry.report.category_breakdown.length > 0
            ? entry.report.category_breakdown.reduce((prev, curr) => ((curr?.amount ?? 0) > (prev?.amount ?? 0) ? curr : prev))
            : null

          return (
            <Card
              key={entry.id}
              className="shadow-sm border-border/50 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onSelect(entry)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="secondary" className="font-sans text-xs">{entry.report?.analysis_period ?? 'N/A'}</Badge>
                  <FiChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-sans">
                    <span className="text-muted-foreground">Total Spend</span>
                    <span className="font-semibold">{formatCurrency(totalSpend)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-sans">
                    <span className="text-muted-foreground">Savings Rate</span>
                    <span className="font-semibold text-green-600">{formatPercent(savingsRate)}</span>
                  </div>
                  {topCat && (
                    <div className="flex justify-between text-sm font-sans">
                      <span className="text-muted-foreground">Top Category</span>
                      <span className="font-semibold">{topCat?.category ?? 'N/A'}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs font-sans text-muted-foreground mt-3">{entry.date}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function Page() {
  // ---- Navigation ----
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'history'>('dashboard')

  // ---- Profile ----
  const [profile, setProfile] = useState<FinancialProfile | null>(null)
  const [hasProfile, setHasProfile] = useState(false)

  // ---- Report ----
  const [report, setReport] = useState<FinancialReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ---- Chat ----
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)

  // ---- History ----
  const [history, setHistory] = useState<HistoryEntry[]>([])

  // ---- Sample Data ----
  const [sampleMode, setSampleMode] = useState(false)

  // ---- Active Agent ----
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  // ---- Session ID ----
  const [sessionId, setSessionId] = useState('')

  // Initialize session and load history
  useEffect(() => {
    setSessionId(`session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`)

    try {
      const savedHistory = localStorage.getItem('finance_history')
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory)
        if (Array.isArray(parsed)) {
          setHistory(parsed)
        }
      }
      const savedProfile = localStorage.getItem('finance_profile')
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile)
        if (parsed?.salary) {
          setProfile(parsed)
          setHasProfile(true)
        }
      }
    } catch {
      // ignore parse errors
    }
  }, [])

  // Save history
  const saveHistory = useCallback((newReport: FinancialReport, currentProfile: FinancialProfile) => {
    const entry: HistoryEntry = {
      id: `${Date.now()}`,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      report: newReport,
      profile: currentProfile,
    }
    setHistory((prev) => {
      const updated = [entry, ...prev].slice(0, 20)
      try {
        localStorage.setItem('finance_history', JSON.stringify(updated))
      } catch {
        // ignore storage errors
      }
      return updated
    })
  }, [])

  // ---- Handle profile save ----
  const handleSaveProfile = useCallback((p: FinancialProfile) => {
    setProfile(p)
    setHasProfile(true)
    setActiveTab('dashboard')
    try {
      localStorage.setItem('finance_profile', JSON.stringify(p))
    } catch {
      // ignore storage errors
    }
  }, [])

  // ---- Analyze finances ----
  const handleAnalyze = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    setError(null)
    setActiveAgentId(MANAGER_AGENT_ID)

    const message = JSON.stringify({
      action: 'analyze_finances',
      financial_profile: {
        monthly_salary: profile.salary,
        credit_cards: profile.cards.map((c) => ({ name: c.name, limit: c.limit })),
        emis: profile.emis.map((e) => ({ name: e.name, amount: e.amount })),
        fixed_expenses: profile.fixedExpenses,
      },
      search_query: 'credit card transaction alert statement',
    })

    try {
      const result = await callAIAgent(message, MANAGER_AGENT_ID, { session_id: sessionId })
      const parsed = parseAgentResponse(result)
      if (parsed) {
        setReport(parsed)
        saveHistory(parsed, profile)
      } else {
        setError('Could not parse the financial analysis. Please try again.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during analysis.')
    } finally {
      setLoading(false)
      setActiveAgentId(null)
    }
  }, [profile, sessionId, saveHistory])

  // ---- Chat handler ----
  const handleChatSend = useCallback(async (userMessage: string) => {
    setChatMessages((prev) => [...prev, { role: 'user', content: userMessage, timestamp: Date.now() }])
    setChatLoading(true)
    setActiveAgentId(MANAGER_AGENT_ID)

    try {
      const result = await callAIAgent(userMessage, MANAGER_AGENT_ID, { session_id: sessionId })
      const parsed = parseAgentResponse(result)
      const responseText = parsed?.follow_up_response || parsed?.advice || (result?.response?.message) || 'I was unable to process your request. Please try again.'
      setChatMessages((prev) => [...prev, { role: 'agent', content: responseText, timestamp: Date.now() }])

      // If response has structured data, update the report
      if (parsed?.income_summary) {
        setReport(parsed)
      }
    } catch {
      setChatMessages((prev) => [...prev, { role: 'agent', content: 'Sorry, an error occurred. Please try again.', timestamp: Date.now() }])
    } finally {
      setChatLoading(false)
      setActiveAgentId(null)
    }
  }, [sessionId])

  // ---- Sample mode toggle ----
  const handleSampleToggle = useCallback((checked: boolean) => {
    setSampleMode(checked)
    if (checked) {
      if (!hasProfile) {
        setProfile(SAMPLE_PROFILE)
        setHasProfile(true)
      }
      setReport(SAMPLE_REPORT)
    } else {
      setReport(null)
    }
  }, [hasProfile])

  // ---- View history entry ----
  const handleViewHistoryEntry = useCallback((entry: HistoryEntry) => {
    setReport(entry.report)
    if (entry.profile) {
      setProfile(entry.profile)
      setHasProfile(true)
    }
    setActiveTab('dashboard')
  }, [])

  // Determine effective display data
  const displayReport = report
  const displayProfile = profile

  // ---- If no profile and not in profile tab, show setup ----
  if (!hasProfile && activeTab !== 'profile') {
    return (
      <div className="min-h-screen bg-background">
        {/* Sample Data Toggle */}
        <div className="fixed top-4 right-4 z-40 flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2 shadow-sm">
          <Label className="text-xs font-sans text-muted-foreground cursor-pointer">Sample Data</Label>
          <Switch checked={sampleMode} onCheckedChange={handleSampleToggle} />
        </div>

        {sampleMode ? (
          <DashboardView
            report={SAMPLE_REPORT}
            profile={SAMPLE_PROFILE}
            loading={false}
            error={null}
            activeAgentId={null}
            onAnalyze={handleAnalyze}
            onEditProfile={() => setActiveTab('profile')}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            history={history}
            onViewHistory={handleViewHistoryEntry}
          />
        ) : (
          <ProfileForm
            profile={{ salary: 0, cards: [], emis: [], fixedExpenses: { rent: 0, utilities: 0, insurance: 0 } }}
            onSave={handleSaveProfile}
          />
        )}

        {/* Chat Panel */}
        <ChatPanel
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          messages={chatMessages}
          onSend={handleChatSend}
          chatLoading={chatLoading}
        />
        {!chatOpen && sampleMode && (
          <button
            onClick={() => setChatOpen(true)}
            className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
          >
            <FiMessageSquare className="w-6 h-6" />
          </button>
        )}
      </div>
    )
  }

  // ---- Profile edit view ----
  if (activeTab === 'profile') {
    return (
      <div className="min-h-screen bg-background">
        <div className="fixed top-4 right-4 z-40 flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2 shadow-sm">
          <Label className="text-xs font-sans text-muted-foreground cursor-pointer">Sample Data</Label>
          <Switch checked={sampleMode} onCheckedChange={handleSampleToggle} />
        </div>
        <div className="max-w-4xl mx-auto pt-4">
          <div className="px-4 mb-4">
            <Button variant="ghost" size="sm" className="font-sans text-sm gap-1" onClick={() => setActiveTab('dashboard')}>
              <FiHome className="w-4 h-4" /> Back to Dashboard
            </Button>
          </div>
          <ProfileForm
            profile={displayProfile ?? { salary: 0, cards: [], emis: [], fixedExpenses: { rent: 0, utilities: 0, insurance: 0 } }}
            onSave={handleSaveProfile}
          />
        </div>
      </div>
    )
  }

  // ---- Main dashboard / history view ----
  return (
    <div className="min-h-screen bg-background">
      {/* Sample Data Toggle */}
      <div className="fixed top-4 right-4 z-40 flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2 shadow-sm">
        <Label className="text-xs font-sans text-muted-foreground cursor-pointer">Sample Data</Label>
        <Switch checked={sampleMode} onCheckedChange={handleSampleToggle} />
      </div>

      <DashboardView
        report={displayReport}
        profile={displayProfile}
        loading={loading}
        error={error}
        activeAgentId={activeAgentId}
        onAnalyze={handleAnalyze}
        onEditProfile={() => setActiveTab('profile')}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        history={history}
        onViewHistory={handleViewHistoryEntry}
      />

      {/* Chat Toggle Button */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
        >
          <FiMessageSquare className="w-6 h-6" />
        </button>
      )}

      {/* Chat Panel */}
      <ChatPanel
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={chatMessages}
        onSend={handleChatSend}
        chatLoading={chatLoading}
      />
    </div>
  )
}

// ============================================================================
// DASHBOARD VIEW (inlined, not exported)
// ============================================================================

function DashboardView({
  report,
  profile,
  loading,
  error,
  activeAgentId,
  onAnalyze,
  onEditProfile,
  activeTab,
  onTabChange,
  history,
  onViewHistory,
}: {
  report: FinancialReport | null
  profile: FinancialProfile | null
  loading: boolean
  error: string | null
  activeAgentId: string | null
  onAnalyze: () => void
  onEditProfile: () => void
  activeTab: 'dashboard' | 'profile' | 'history'
  onTabChange: (tab: 'dashboard' | 'profile' | 'history') => void
  history: HistoryEntry[]
  onViewHistory: (entry: HistoryEntry) => void
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 pb-20">
      {/* Header */}
      <header className="pt-6 pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold tracking-tight">Personal Finance Assistant</h1>
            {profile && (
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <Badge variant="secondary" className="font-sans text-xs gap-1">
                  <FiDollarSign className="w-3 h-3" /> {formatCurrency(profile.salary)}/mo
                </Badge>
                <Badge variant="secondary" className="font-sans text-xs gap-1">
                  <FiCreditCard className="w-3 h-3" /> {profile.cards.length} card{profile.cards.length !== 1 ? 's' : ''}
                </Badge>
                {report?.analysis_period && (
                  <Badge variant="outline" className="font-sans text-xs gap-1">
                    <FiClock className="w-3 h-3" /> {report.analysis_period}
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onEditProfile} className="font-sans text-xs gap-1.5">
              <FiEdit className="w-3.5 h-3.5" /> Edit Profile
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => onTabChange(val as 'dashboard' | 'profile' | 'history')} className="mb-6">
        <TabsList className="font-sans">
          <TabsTrigger value="dashboard" className="gap-1.5 font-sans text-sm">
            <FiHome className="w-4 h-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 font-sans text-sm">
            <FiClock className="w-4 h-4" /> History
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-1.5 font-sans text-sm">
            <FiSettings className="w-4 h-4" /> Profile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 rounded-lg border border-destructive/50 bg-destructive/5 text-destructive text-sm font-sans flex items-start gap-2">
              <FiAlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold mb-1">Analysis Error</p>
                <p>{error}</p>
                <Button variant="outline" size="sm" className="mt-2 font-sans text-xs" onClick={onAnalyze}>
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && <LoadingSkeleton />}

          {/* Analyze CTA (when no report) */}
          {!loading && !report && (
            <Card className="shadow-sm border-border/50 mb-6">
              <CardContent className="py-12 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <FiTrendingUp className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-serif text-xl font-semibold mb-2">Ready to Analyze Your Finances</h3>
                <p className="text-sm font-sans text-muted-foreground mb-6 max-w-md mx-auto">
                  We will fetch your recent transaction emails from Gmail, categorize your spending,
                  and provide a comprehensive financial report with actionable insights.
                </p>
                <Button onClick={onAnalyze} className="font-sans font-medium text-sm gap-2 h-11 px-8" disabled={loading}>
                  {loading ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiActivity className="w-4 h-4" />}
                  Analyze My Finances
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Report Dashboard */}
          {!loading && report && (
            <div className="space-y-6">
              {/* Report Type Badge */}
              {report.report_type && (
                <div className="flex items-center justify-between">
                  <Badge className="font-sans text-xs">{report.report_type}</Badge>
                  <Button onClick={onAnalyze} variant="outline" size="sm" className="font-sans text-xs gap-1.5" disabled={loading}>
                    {loading ? <FiLoader className="w-3.5 h-3.5 animate-spin" /> : <FiActivity className="w-3.5 h-3.5" />}
                    Re-analyze
                  </Button>
                </div>
              )}

              {/* Main Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  <IncomeSummaryCard data={report.income_summary} />
                  <CategoryBreakdownCard categories={report.category_breakdown} />
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  <CreditCardTable cards={report.credit_cards} />
                  <RiskAlertsCard alerts={report.risk_alerts} />
                </div>
              </div>

              {/* Safe to Spend - Full Width */}
              <SafeToSpendCard amount={report.safe_to_spend} advice={report.advice} />

              {/* Follow-up response if any */}
              {report.follow_up_response && !report.income_summary && (
                <Card className="shadow-sm border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-serif flex items-center gap-2">
                      <FiMessageSquare className="w-5 h-5 text-primary" />
                      Agent Response
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm font-sans text-foreground leading-relaxed">
                      {renderMarkdown(report.follow_up_response)}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Agent Status */}
              <AgentStatusPanel activeAgentId={activeAgentId} />
            </div>
          )}

          {/* Agent Status when no report */}
          {!loading && !report && (
            <AgentStatusPanel activeAgentId={activeAgentId} />
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <HistoryView history={history} onSelect={onViewHistory} />
        </TabsContent>

        <TabsContent value="profile" className="mt-4">
          {/* This tab is handled by the parent routing but just in case */}
          <div className="text-center py-8 text-muted-foreground text-sm font-sans">
            Redirecting to profile settings...
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
