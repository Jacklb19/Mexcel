import React, { useMemo } from 'react';
import { useSpreadsheetEngine } from '../hooks/useSpreadsheetEngine';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { SyncRecalculationStrategy } from '../engine/strategies/SyncRecalculationStrategy';
import { SpreadsheetGrid } from '../components/SpreadsheetGrid';
import { FormulaBar } from '../components/FormulaBar';
import { Toolbar } from '../components/Toolbar';
import { PerfBadge } from '../components/PerfBadge';

export const BadPage: React.FC = () => {
  const syncStrategy = useMemo(() => new SyncRecalculationStrategy(), []);

  const [state, actions] = useSpreadsheetEngine({
    strategy: syncStrategy,
    routeKey: 'bad',
  });

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
    setCellValue: actions.setCellValue,
    undo: actions.undo,
    redo: actions.redo,
  });

  const dependencies = actions.getCellDependencies(activeCell);
  const dependents = actions.getCellDependents(activeCell);
  const activeCellData = actions.getCellData(activeCell);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] p-3 sm:p-4 gap-3 bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Educational Banner */}
      <div className="px-3.5 py-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg flex items-center justify-between text-xs text-rose-900 dark:text-rose-200 shadow-sm flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold">🛑 Variant 1: Synchronous Recalculation (/bad)</span>
          <span className="text-rose-700 dark:text-rose-300">
            • Recalculates 100% synchronously on the main thread inside event handlers.
          </span>
        </div>
        <span className="text-[11px] font-mono bg-rose-200/60 dark:bg-rose-900/50 px-2 py-0.5 rounded text-rose-800 dark:text-rose-200">
          Main-Thread Bound
        </span>
      </div>

      {/* Toolbar */}
      <Toolbar
        routeTitle="Sync Engine"
        routeBadge="Synchronous /bad"
        routeBadgeColor="bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800"
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
          actions.setCellValue(cellId, val);
          confirmEditing('none');
        }}
      />

      {/* Virtualized Grid */}
      <SpreadsheetGrid
        totalRows={state.totalRows}
        totalCols={state.totalCols}
        cellData={state.cellData}
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
