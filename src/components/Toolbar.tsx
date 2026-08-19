import React, { useState } from 'react';

interface ToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onSave: () => void;
  onGenerateLoad: (count: number) => void;
  onReset: () => void;
  isRecalculating: boolean;
  recalcProgress: { completed: number; total: number } | null;
  routeTitle: string;
  routeBadge: string;
  routeBadgeColor: string;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onSave,
  onGenerateLoad,
  onReset,
  isRecalculating,
  recalcProgress,
  routeTitle,
  routeBadge,
  routeBadgeColor,
}) => {
  const [loadCount, setLoadCount] = useState(2000);
  const [savedRecently, setSavedRecently] = useState(false);

  const handleSave = () => {
    onSave();
    setSavedRecently(true);
    setTimeout(() => setSavedRecently(false), 2000);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg shadow-sm">
      {/* Left side: Route Badge & Undo/Redo/Save */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Strategy Route indicator */}
        <div className="flex items-center gap-2 mr-2">
          <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
            {routeTitle}
          </span>
          <span
            className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${routeBadgeColor}`}
          >
            {routeBadge}
          </span>
        </div>

        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1 hidden sm:block" />

        {/* Undo / Redo */}
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="px-2.5 py-1 text-xs font-medium rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          ↶ Undo
        </button>

        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className="px-2.5 py-1 text-xs font-medium rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          ↷ Redo
        </button>

        {/* Save */}
        <button
          type="button"
          onClick={handleSave}
          title="Save to LocalStorage"
          className="px-2.5 py-1 text-xs font-medium rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          {savedRecently ? '✓ Saved!' : '💾 Save'}
        </button>

        {/* Reset */}
        <button
          type="button"
          onClick={onReset}
          title="Reset to default budget dataset"
          className="px-2.5 py-1 text-xs font-medium rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          ↺ Reset Sheet
        </button>
      </div>

      {/* Right side: Stress Load generator & Recalculation status */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Recalculation status spinner */}
        {isRecalculating && (
          <div className="flex items-center gap-2 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/50 rounded text-amber-800 dark:text-amber-300 text-xs font-medium animate-pulse">
            <span className="animate-spin inline-block">⚙</span>
            <span>
              {recalcProgress
                ? `Recalculating (${recalcProgress.completed}/${recalcProgress.total})...`
                : 'Recalculating...'}
            </span>
          </div>
        )}

        {/* Load generator button & select */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 pl-1">
            Heavy Load:
          </span>
          <select
            value={loadCount}
            onChange={(e) => setLoadCount(Number(e.target.value))}
            className="text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-slate-800 dark:text-slate-200 outline-none"
          >
            <option value={500}>500 cells</option>
            <option value={2000}>2,000 cells</option>
            <option value={5000}>5,000 cells</option>
          </select>
          <button
            type="button"
            onClick={() => onGenerateLoad(loadCount)}
            className="px-2 py-0.5 text-xs font-semibold rounded bg-indigo-600 hover:bg-indigo-700 text-white shadow transition"
          >
            ⚡ Generate
          </button>
        </div>
      </div>
    </div>
  );
};
