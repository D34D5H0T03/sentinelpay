import React from 'react';
import Pagination from './Pagination';

export default function DataTable({
  columns = [],
  data = [],
  keyField = 'id',
  onRowClick,
  selectable = false,
  selectedKeys = [],
  onSelectionChange,
  pagination,
  onPageChange,
  emptyMessage = 'No records found.',
  className = '',
}) {
  const isAllSelected =
    selectable &&
    data.length > 0 &&
    data.every((item) => selectedKeys.includes(item[keyField]));

  const handleSelectAll = (e) => {
    if (!onSelectionChange) return;
    if (e.target.checked) {
      const allKeys = data.map((item) => item[keyField]);
      onSelectionChange(Array.from(new Set([...selectedKeys, ...allKeys])));
    } else {
      const pageKeys = new Set(data.map((item) => item[keyField]));
      onSelectionChange(selectedKeys.filter((k) => !pageKeys.has(k)));
    }
  };

  const handleSelectRow = (key, e) => {
    e.stopPropagation();
    if (!onSelectionChange) return;
    if (selectedKeys.includes(key)) {
      onSelectionChange(selectedKeys.filter((k) => k !== key));
    } else {
      onSelectionChange([...selectedKeys, key]);
    }
  };

  return (
    <div className={`w-full overflow-hidden border border-border rounded-[8px] bg-surface ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-14">
          <thead className="bg-surface-subtle border-b border-border text-12 font-medium text-text-muted select-none">
            <tr>
              {selectable && (
                <th className="w-10 px-4 py-2.5 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    aria-label="Select all rows"
                    className="w-4 h-4 rounded-[4px] border-border-strong text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key || col.header}
                  className={`px-4 py-2.5 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${
                    col.className || ''
                  }`}
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-8 text-center text-text-muted text-14"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => {
                const key = row[keyField] ?? index;
                const isSelected = selectable && selectedKeys.includes(key);

                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`transition-colors duration-150 ${
                      onRowClick ? 'cursor-pointer' : ''
                    } ${
                      isSelected
                        ? 'bg-primary-subtle'
                        : 'hover:bg-surface-subtle bg-surface'
                    }`}
                  >
                    {selectable && (
                      <td
                        className="w-10 px-4 py-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(key, e)}
                          aria-label={`Select row ${key}`}
                          className="w-4 h-4 rounded-[4px] border-border-strong text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
                        />
                      </td>
                    )}
                    {columns.map((col) => {
                      const value = row[col.key];
                      const rendered = col.render ? col.render(row, index) : value;

                      return (
                        <td
                          key={col.key || col.header}
                          className={`px-4 py-3 text-text ${
                            col.align === 'right'
                              ? 'text-right tabular-nums'
                              : col.align === 'center'
                              ? 'text-center'
                              : 'text-left'
                          } ${col.className || ''}`}
                        >
                          {rendered}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.total > 0 && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
