'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const ROSE = '#b06472'
const ROSE_SOFT = '#f5e8ea'
const GILT = '#b89651'
const GILT_SOFT = '#e8dbb8'
const STROKE = '#ebe4d8'
const GRAPHITE = '#4d4d4d'
const SILK = '#faf8f5'

const tooltipStyle = {
  backgroundColor: SILK,
  border: `1px solid ${STROKE}`,
  borderRadius: '8px',
  boxShadow: '0 6px 16px rgba(10, 10, 10, 0.08)',
  fontFamily: 'var(--font-family-sans)',
  fontSize: '0.8125rem',
  color: GRAPHITE,
}

const tickStyle = { fontSize: 12, fill: GRAPHITE, fontFamily: 'var(--font-family-sans)' }

export function RevenueTrendChart({
  data,
  formatCurrency,
}: Readonly<{
  data: Array<{ date: string; amount: number }>
  formatCurrency: (n: number) => string
}>) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GILT} stopOpacity={0.28} />
            <stop offset="100%" stopColor={GILT} stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 4" stroke={STROKE} vertical={false} />
        <XAxis dataKey="date" tick={tickStyle} tickLine={false} axisLine={{ stroke: STROKE }} />
        <YAxis
          tick={tickStyle}
          tickFormatter={(value) => `$${value}`}
          tickLine={false}
          axisLine={{ stroke: STROKE }}
          width={56}
        />
        <Tooltip
          formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Revenue']}
          contentStyle={tooltipStyle}
          cursor={{ stroke: ROSE, strokeWidth: 1, strokeDasharray: '2 4' }}
        />
        <Area
          type="monotone"
          dataKey="amount"
          stroke={GILT}
          fill="url(#revenueFill)"
          strokeWidth={1.75}
          activeDot={{ r: 4, fill: GILT, stroke: SILK, strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function NotesTrendChart({
  data,
}: Readonly<{ data: Array<{ date: string; count: number }> }>) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="notesFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ROSE} stopOpacity={0.22} />
            <stop offset="100%" stopColor={ROSE} stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 4" stroke={STROKE} vertical={false} />
        <XAxis dataKey="date" tick={tickStyle} tickLine={false} axisLine={{ stroke: STROKE }} />
        <YAxis tick={tickStyle} tickLine={false} axisLine={{ stroke: STROKE }} width={32} />
        <Tooltip
          formatter={(value) => [Number(value ?? 0), 'Notes']}
          contentStyle={tooltipStyle}
          cursor={{ stroke: ROSE, strokeWidth: 1, strokeDasharray: '2 4' }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke={ROSE}
          fill="url(#notesFill)"
          strokeWidth={1.75}
          activeDot={{ r: 4, fill: ROSE, stroke: SILK, strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

const PIE_PALETTE = [ROSE, GILT, '#945563', '#dfd4c3']

export function DemographicsPieChart({
  data,
}: Readonly<{ data: Array<{ name: string; value: number }> }>) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={42}
          outerRadius={68}
          paddingAngle={1.5}
          stroke={SILK}
          strokeWidth={2}
          dataKey="value"
        >
          {data.map((entry) => (
            <Cell
              key={entry.name}
              fill={PIE_PALETTE[data.indexOf(entry) % PIE_PALETTE.length]}
            />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export const PIE_COLORS = PIE_PALETTE
