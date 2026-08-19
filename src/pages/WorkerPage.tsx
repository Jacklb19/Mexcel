import React, { useMemo, useEffect } from 'react';
import { useSpreadsheetEngine } from '../hooks/useSpreadsheetEngine';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { WorkerRecalculationStrategy } from '../engine/strategies/WorkerRecalculationStrategy';
import { SpreadsheetGrid } from '../components/SpreadsheetGrid';
import { FormulaBar } from '../components/FormulaBar';
import { Toolbar } from '../components/Toolbar';
import { PerfBadge } from '../components/PerfBadge';

export const WorkerPage: React.FC = () => {
  const workerStrategy = useMemo(() => new WorkerRecalculationStrategy(), []);

  useEffect(() => {
    return () => {
      workerStrategy.terminate();
    };
  }, [workerStrategy]);

  const [state, actions] = useSpreadsheetEngine({
    strategy: workerStrategy,
    routeKey: 'worker',
  });

  const {
    activeCell,
    editingCell,
    editValue,
    setEditValue,
    selectCell,
    doubleClickCell,
    startEditing,
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
      <div className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-lg flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200 shadow-sm flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold">🛡️ Variant 3: Dedicated Web Worker (/worker)</span>
          <span className="text-emerald-700 dark:text-emerald-300">
            • Complete recalculation executes in a background thread. Main thread never blocks!
          </span>
        </div>
        <span className="text-[11px] font-mono bg-emerald-200/60 dark:bg-emerald-900/50 px-2 py-0.5 rounded text-emerald-800 dark:text-emerald-200">
          Off-Main-Thread
        </span>
      </div>

      {/* Toolbar */}
      <Toolbar
        routeTitle="Worker Engine"
        routeBadge="Web Worker /worker"
        routeBadgeColor="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
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
