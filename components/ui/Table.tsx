import React from 'react'
import { Skeleton } from './Skeleton'
import { EmptyState } from './EmptyState'

export interface Column<T> {
  key: string
  header: string
  render?: (item: T) => React.ReactNode
  sortable?: boolean
  /** Right-aligns header and cells. Implied by `numeric`. */
  align?: 'left' | 'right'
  /** Numeric column: right-aligned with tabular numerals. */
  numeric?: boolean
  /** Cell content stays hidden until the row is hovered or focused (row actions). */
  hoverOnly?: boolean
}

export interface TableProps<T> {
  data: T[]
  columns: Column<T>[]
  onRowClick?: (item: T) => void
  loading?: boolean
  emptyMessage?: string
  /** Optional designed empty state; overrides emptyMessage. */
  empty?: React.ReactNode
}

/** Muted dash for cells with no value. Use instead of "N/A". */
export function EmptyCell() {
  return <span className="text-charcoal-300">&ndash;</span>
}

const cellAlign = <T,>(column: Column<T>) =>
  column.numeric || column.align === 'right' ? 'text-right' : 'text-left'

/**
 * The shared data table: one card boundary, one header style, one divider
 * style, one hover style, one row height (h-row) across every list view.
 */
export function Table<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  loading = false,
  emptyMessage = 'No data available',
  empty
}: TableProps<T>) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-lg border border-champagne-200 bg-champagne-50">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-champagne-200">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-5 py-3 text-th font-medium tracking-wide text-charcoal-500 ${cellAlign(column)}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-champagne-200">
            {Array.from({ length: 4 }).map((_, row) => (
              <tr key={row} className="h-row">
                {columns.map((column) => (
                  <td key={column.key} className="px-5 align-middle">
                    <Skeleton variant="text" width={row % 2 ? '60%' : '75%'} height={14} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="overflow-hidden rounded-lg border border-champagne-200 bg-champagne-50">
        {empty ?? <EmptyState message={emptyMessage} />}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-champagne-200 bg-champagne-50">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-champagne-200">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-5 py-3 text-th font-medium tracking-wide text-charcoal-500 ${cellAlign(column)}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-champagne-200">
            {data.map((item, index) => (
              <tr
                key={item.id || index}
                onClick={() => onRowClick?.(item)}
                className={`group h-row ${
                  onRowClick ? 'cursor-pointer transition-colors hover:bg-champagne-100' : ''
                }`}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`whitespace-nowrap px-5 align-middle text-cell text-charcoal-900 ${cellAlign(column)} ${
                      column.numeric ? 'tabular-nums' : ''
                    } ${
                      column.hoverOnly
                        ? 'opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100'
                        : ''
                    }`}
                  >
                    {column.render ? column.render(item) : item[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
