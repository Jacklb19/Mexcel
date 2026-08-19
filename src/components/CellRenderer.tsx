import React, { memo } from 'react';
import type { CellData } from '../engine/SpreadsheetEngine';

interface CellRendererProps {
  cellId: string;
  cellData: CellData | undefined;
  isActive: boolean;
  isEditing: boolean;
  isDependency: boolean;
  isDependent: boolean;
  editValue: string;
  onEditChange: (value: string) => void;
  onSelect: (cellId: string) => void;
  onDoubleClick: (cellId: string) => void;
}

export const CellRenderer: React.FC<CellRendererProps> = memo(
  ({
    cellId,
    cellData,
    isActive,
    isEditing,
    isDependency,
    isDependent,
    editValue,
    onEditChange,
    onSelect,
    onDoubleClick,
  }) => {
    const displayValue = cellData?.displayValue ?? '';
    const hasError = Boolean(cellData?.error);
    const isFormula = cellData?.hasFormula ?? false;
    const isNumber = cellData?.type === 'number';

    let bgClass = 'bg-white dark:bg-slate-900';
    if (isActive) {
      bgClass = 'bg-blue-50/70 dark:bg-blue-950/40';
    } else if (isDependency) {
      bgClass = 'bg-emerald-50/80 dark:bg-emerald-950/40';
    } else if (isDependent) {
      bgClass = 'bg-purple-50/80 dark:bg-purple-950/40';
    }

    let borderClass = 'border-slate-200 dark:border-slate-800';
    if (isActive) {
      borderClass = 'ring-2 ring-blue-500 z-10';
    } else if (isDependency) {
      borderClass = 'ring-1 ring-emerald-400 dark:ring-emerald-500 z-5';
    } else if (isDependent) {
      borderClass = 'ring-1 ring-purple-400 dark:ring-purple-500 z-5';
    }

    return (
      <div
        role="gridcell"
        tabIndex={0}
        aria-selected={isActive}
        data-cell-id={cellId}
        onClick={() => onSelect(cellId)}
        onDoubleClick={() => onDoubleClick(cellId)}
        className={`relative h-full w-full border-b border-r px-2 text-xs flex items-center select-none cursor-cell transition-colors font-mono ${bgClass} ${borderClass} ${
          isNumber ? 'justify-end' : 'justify-start'
        }`}
      >
        {isEditing ? (
          <input
            type="text"
            autoFocus
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            className="w-full h-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none font-mono text-xs px-1"
          />
        ) : (
          <span
            className={`truncate ${
              hasError
                ? 'text-rose-600 dark:text-rose-400 font-bold'
                : isFormula
                ? 'text-blue-700 dark:text-blue-300 font-medium'
                : 'text-slate-800 dark:text-slate-200'
            }`}
          >
            {displayValue}
          </span>
        )}

        {isFormula && !isEditing && (
          <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-blue-500/80 rounded-full" />
        )}
      </div>
    );
  },
);

CellRenderer.displayName = 'CellRenderer';
