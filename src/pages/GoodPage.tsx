import React, { useMemo, useDeferredValue, startTransition } from 'react';
import { useSpreadsheetEngine } from '../hooks/useSpreadsheetEngine';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { ChunkedRecalculationStrategy } from '../engine/strategies/ChunkedRecalculationStrategy';
import { SpreadsheetGrid } from '../components/SpreadsheetGrid';
import { FormulaBar } from '../components/FormulaBar';
import { Toolbar } from '../components/Toolbar';
import { PerfBadge } from '../components/PerfBadge';

export const GoodPage: React.FC = () => {
  const chunkedStrategy = useMemo(() => new ChunkedRecalculationStrategy(200), []);

  const [state, actions] = useSpreadsheetEngine({
    strategy: chunkedStrategy,
    routeKey: 'good',
  });

  // Use React 19 useDeferredValue for derived spreadsheet cell states
  const deferredCellData = useDeferredValue(state.cellData);

  const {
    activeCell,
    editingCell,
    editValue,
    setEditValue,
    selectCell,
    doubleClickCell,
    confirmEditing,
  } = useKeyboardNavigation({
    totalRows: state.totalRows,
    totalCols: state.totalCols,
    getCellRawInput: (cellId) => actions.getCellData(cellId).rawInput,
    setCellValue: (cellId, value) => {
      // High-priority immediate edit wrapped in transition for recalculation
      startTransition(() => {
        actions.setCellValue(cellId, value);
      });
    },
    undo: actions.undo,
    redo: actions.redo,
  });

  const dependencies = actions.getCellDependencies(activeCell);
  const dependents = actions.getCellDependents(activeCell);
  const activeCellData = actions.getCellData(activeCell);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] p-3 sm:p-4 gap-3 bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Educational Banner */}
      <div className="px-3.5 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-lg flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 shadow-sm flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold">⚡ Variant 2: Concurrent & Chunked (/good)</span>
          <span className="text-amber-700 dark:text-amber-300">
            • Batches calculations with postTask yields &amp; uses startTransition + useDeferredValue.
          </span>
        </div>
        <span className="text-[11px] font-mono bg-amber-200/60 dark:bg-amber-900/50 px-2 py-0.5 rounded text-amber-800 dark:text-amber-200">
          Yielding + Concurrent
        </span>
      </div>

      {/* Toolbar */}
      <Toolbar
        routeTitle="Chunked Engine"
        routeBadge="Chunked + Concurrent /good"
        routeBadgeColor="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800"
        onUndo={actions.undo}
        onRedo={actions.redo}
        canUndo={actions.canUndo}
        canRedo={actions.canRedo}
        onSave={actions.save}
        onGenerateLoad={actions.generateLoad}
        onReset={actions.resetToDefault}
        isRecalculating={state.isRecalculating}
        recalcProgress={state.recalcProgress}
      />

      {/* Formula Bar */}
      <FormulaBar
        activeCellId={activeCell}
        cellData={activeCellData}
        onCommit={(cellId, val) => {
          startTransition(() => {
            actions.setCellValue(cellId, val);
          });
          confirmEditing('none');
        }}
      />

      {/* Virtualized Grid using deferredCellData */}
      <SpreadsheetGrid
        totalRows={state.totalRows}
        totalCols={state.totalCols}
        cellData={deferredCellData}
        activeCell={activeCell}
        editingCell={editingCell}
        editValue={editValue}
        dependencies={dependencies}
        dependents={dependents}
        onEditChange={setEditValue}
        onSelectCell={(id) => {
          selectCell(id);
          if (editingCell && editingCell !== id) {
            confirmEditing('none');
          }
        }}
        onDoubleClickCell={doubleClickCell}
      />

      {/* INP & Long Tasks Performance Monitor */}
      <PerfBadge />
    </div>
  );
};
