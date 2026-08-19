import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { CellRenderer } from './CellRenderer';
import { toCellId } from '../engine/FormulaParser';
import type { CellData } from '../engine/SpreadsheetEngine';

interface SpreadsheetGridProps {
  totalRows: number;
  totalCols: number;
  cellData: Map<string, CellData>;
  activeCell: string;
  editingCell: string | null;
  editValue: string;
  dependencies: ReadonlySet<string>;
  dependents: ReadonlySet<string>;
  onEditChange: (val: string) => void;
  onSelectCell: (cellId: string) => void;
  onDoubleClickCell: (cellId: string) => void;
}

const ROW_HEIGHT = 28;
const COL_WIDTH = 110;
const ROW_HEADER_WIDTH = 48;

export const SpreadsheetGrid: React.FC<SpreadsheetGridProps> = ({
  totalRows,
  totalCols,
  cellData,
  activeCell,
  editingCell,
  editValue,
  dependencies,
  dependents,
  onEditChange,
  onSelectCell,
  onDoubleClickCell,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: totalRows,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  const columnVirtualizer = useVirtualizer({
    count: totalCols,
    getScrollElement: () => parentRef.current,
    estimateSize: () => COL_WIDTH,
    horizontal: true,
    overscan: 3,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const virtualColumns = columnVirtualizer.getVirtualItems();

  const totalWidth = columnVirtualizer.getTotalSize();
  const totalHeight = rowVirtualizer.getTotalSize();

  return (
    <div className="flex-1 flex flex-col min-h-0 border border-slate-300 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-950 shadow-inner">
      {/* Top Header Row (Column Letters) */}
      <div className="flex bg-slate-200 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 select-none text-xs font-semibold text-slate-600 dark:text-slate-400 z-20">
        {/* Corner cell */}
        <div
          style={{ width: ROW_HEADER_WIDTH, minWidth: ROW_HEADER_WIDTH, height: ROW_HEIGHT }}
          className="flex items-center justify-center border-r border-slate-300 dark:border-slate-700 bg-slate-300/80 dark:bg-slate-800"
        >
          <span className="text-[10px] text-slate-500">◢</span>
        </div>

        {/* Column letter bar */}
        <div className="flex-1 overflow-hidden relative" style={{ height: ROW_HEIGHT }}>
          <div
            style={{
              width: `${totalWidth}px`,
              transform: `translateX(-${parentRef.current?.scrollLeft ?? 0}px)`,
            }}
            className="absolute top-0 left-0 flex h-full"
          >
            {virtualColumns.map((virtualCol) => {
              const colLetter = toCellId(virtualCol.index, 0).replace(/\d+/, '');
              return (
                <div
                  key={virtualCol.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: `${virtualCol.start}px`,
                    width: `${virtualCol.size}px`,
                    height: `${ROW_HEIGHT}px`,
                  }}
                  className="flex items-center justify-center border-r border-slate-300 dark:border-slate-700"
                >
                  {colLetter}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Virtualized Body */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Virtualized Grid Body */}
        <div
          ref={parentRef}
          role="grid"
          aria-label="Spreadsheet Grid"
          className="flex-1 h-full overflow-auto outline-none"
        >
          <div
            style={{
              height: `${totalHeight}px`,
              width: `${totalWidth + ROW_HEADER_WIDTH}px`,
              position: 'relative',
            }}
          >
            {virtualRows.map((virtualRow) => {
              const rowIndex = virtualRow.index;
              const rowNumber = rowIndex + 1;

              return (
                <React.Fragment key={rowIndex}>
                  {/* Sticky Row Number Header */}
                  <div
                    style={{
                      position: 'sticky',
                      left: 0,
                      top: `${virtualRow.start}px`,
                      width: `${ROW_HEADER_WIDTH}px`,
                      height: `${virtualRow.size}px`,
                      zIndex: 10,
                    }}
                    className="flex items-center justify-center bg-slate-200 dark:bg-slate-800 border-r border-b border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 select-none"
                  >
                    {rowNumber}
                  </div>

                  {/* Virtualized Cells in this row */}
                  {virtualColumns.map((virtualCol) => {
                    const colIndex = virtualCol.index;
                    const cellId = toCellId(colIndex, rowIndex);
                    const isCellActive = activeCell === cellId;
                    const isCellEditing = editingCell === cellId;
                    const isCellDep = dependencies.has(cellId);
                    const isCellDept = dependents.has(cellId);
                    const cData = cellData.get(cellId);

                    return (
                      <div
                        key={cellId}
                        style={{
                          position: 'absolute',
                          top: `${virtualRow.start}px`,
                          left: `${virtualCol.start + ROW_HEADER_WIDTH}px`,
                          width: `${virtualCol.size}px`,
                          height: `${virtualRow.size}px`,
                        }}
                      >
                        <CellRenderer
                          cellId={cellId}
                          cellData={cData}
                          isActive={isCellActive}
                          isEditing={isCellEditing}
                          isDependency={isCellDep}
                          isDependent={isCellDept}
                          editValue={editValue}
                          onEditChange={onEditChange}
                          onSelect={onSelectCell}
                          onDoubleClick={onDoubleClickCell}
                        />
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
