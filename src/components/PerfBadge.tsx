import React, { useState } from 'react';
import { useINPMonitor } from '../hooks/useINPMonitor';

export const PerfBadge: React.FC = () => {
  const { inp, longTasks, clearLongTasks } = useINPMonitor();
  const [isOpen, setIsOpen] = useState(false);

  // Rating color tokens
  const getRatingBadge = (rating: string | undefined) => {
    switch (rating) {
      case 'good':
        return {
          label: 'Good (≤200ms)',
          bg: 'bg-emerald-500',
          text: 'text-emerald-700 dark:text-emerald-300',
          border: 'border-emerald-500/30',
          badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60',
        };
      case 'needs-improvement':
        return {
          label: 'Needs Imp. (≤500ms)',
          bg: 'bg-amber-500',
          text: 'text-amber-700 dark:text-amber-300',
          border: 'border-amber-500/30',
          badgeBg: 'bg-amber-100 dark:bg-amber-950/60',
        };
      case 'poor':
        return {
          label: 'Poor (>500ms)',
          bg: 'bg-rose-500',
          text: 'text-rose-700 dark:text-rose-300',
          border: 'border-rose-500/30',
          badgeBg: 'bg-rose-100 dark:bg-rose-950/60',
        };
      default:
        return {
          label: 'Waiting for interaction...',
          bg: 'bg-slate-400',
          text: 'text-slate-600 dark:text-slate-400',
          border: 'border-slate-300 dark:border-slate-700',
          badgeBg: 'bg-slate-100 dark:bg-slate-800',
        };
    }
  };

  const currentRating = getRatingBadge(inp?.rating);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 max-w-[calc(100vw-2rem)]">
      {/* Expanded Details Panel */}
      {isOpen && (
        <div className="w-80 sm:w-96 max-h-[75vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-2">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full animate-pulse bg-indigo-500" />
              <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                Performance & Event Loop Monitor
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs px-1"
            >
              ✕
            </button>
          </div>

          <div className="p-3 space-y-3 overflow-y-auto text-xs">
            {/* INP Card */}
            <div className={`p-2.5 rounded-lg border ${currentRating.badgeBg} ${currentRating.border}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  INP (Interaction to Next Paint)
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${currentRating.text}`}>
                  {currentRating.label}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100">
                  {inp ? `${inp.value} ms` : '—'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  via Event Timing API
                </span>
              </div>
            </div>

            {/* Long Tasks Card */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  Long Tasks (&gt;50ms): {longTasks.length}
                </span>
                {longTasks.length > 0 && (
                  <button
                    type="button"
                    onClick={clearLongTasks}
                    className="text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
                  >
                    Clear
                  </button>
                )}
              </div>

              {longTasks.length === 0 ? (
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
                  No long tasks recorded yet. Try editing cells or generating a stress load!
                </div>
              ) : (
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
                  {longTasks.slice().reverse().map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded text-rose-800 dark:text-rose-300"
                    >
                      <span>⏱ Long task (+{task.relativeTime})</span>
                      <span className="font-bold">{task.duration} ms</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick explanation footer */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              <p>
                <strong>INP Thresholds:</strong> Good ≤200ms · Needs improvement ≤500ms · Poor &gt;500ms.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Pill Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-900/90 dark:bg-slate-800/90 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition border border-slate-700 backdrop-blur-md"
      >
        <span className={`w-2.5 h-2.5 rounded-full ${currentRating.bg}`} />
        <span className="font-mono font-bold text-xs">
          INP: {inp ? `${inp.value}ms` : 'N/A'}
        </span>
        {longTasks.length > 0 && (
          <span className="px-1.5 py-0.2 bg-rose-600 text-white text-[10px] font-bold rounded-full">
            {longTasks.length} LT
          </span>
        )}
        <span className="text-[10px] text-slate-400">{isOpen ? '▼' : '▲'}</span>
      </button>
    </div>
  );
};
