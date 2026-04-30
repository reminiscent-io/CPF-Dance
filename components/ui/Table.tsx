import React from 'react'

export interface Column<T> {
  key: string
  header: string
  render?: (item: T) => React.ReactNode
  sortable?: boolean
}

export interface TableProps<T> {
  data: T[]
  columns: Column<T>[]
  onRowClick?: (item: T) => void
  loading?: boolean
  emptyMessage?: string
}

export function Table<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  loading = false,
  emptyMessage = 'No data available'
}: TableProps<T>) {
  if (loading) {
    return (
      <div className="bg-champagne-50 rounded-lg shadow-soft overflow-hidden">
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-rose-600 border-t-transparent" />
          <p className="mt-2 text-charcoal-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bg-champagne-50 rounded-lg shadow-soft overflow-hidden">
        <div className="p-8 text-center text-charcoal-500">
          {emptyMessage}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-champagne-50 rounded-lg shadow-soft overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-champagne-200">
          <thead className="bg-champagne-100">
            <tr>
              {columns.map(column => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-sm font-medium text-charcoal-500"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-champagne-50 divide-y divide-champagne-200">
            {data.map((item, index) => (
              <tr
                key={item.id || index}
                onClick={() => onRowClick?.(item)}
                className={onRowClick ? 'hover:bg-champagne-100 cursor-pointer transition-colors' : ''}
              >
                {columns.map(column => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-charcoal-900">
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
