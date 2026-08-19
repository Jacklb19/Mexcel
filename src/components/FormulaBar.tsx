import React, { useState, useEffect } from 'react';
import type { CellData } from '../engine/SpreadsheetEngine';

interface FormulaBarProps {
  activeCellId: string;
  cellData: CellData | undefined;
  onCommit: (cellId: string, value: string) => void;
}

export const FormulaBar: React.FC<FormulaBarProps> = ({
  activeCellId,
  cellData,
  onCommit,
}) => {
  const [value, setValue] = useState(cellData?.rawInput ?? '');

  useEffect(() => {
    setValue(cellData?.rawInput ?? '');
  }, [activeCellId, cellData?.rawInput]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onCommit(activeCellId, value);
    } else if (e.key === 'Escape') {
      setValue(cellData?.rawInput ?? '');
    }
  };

  const handleBlur = () => {
    if (value !== (cellData?.rawInput ?? '')) {
      onCommit(activeCellId, value);
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-sm shadow-sm">
      {/* Active cell label */}
      <div className="flex items-center justify-center min-w-[50px] px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-mono font-semibold text-xs rounded border border-slate-200 dark:border-slate-700 select-none">
        {activeCellId}
      </div>

      {/* Function icon */}
      <span className="font-serif italic font-bold text-slate-400 dark:text-slate-500 text-base select-none">
        fx
      </span>

      {/* Formula input */}
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder="Enter value or formula like =A1+B2 or =SUM(C2:C30)"
        className="flex-1 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 outline-none font-mono text-xs"
      />

      {/* Cell type / error indicator */}
      {cellData?.error ? (
        <span className="px-2 py-0.5 text-[11px] font-mono font-semibold rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
          {cellData.error}
        </span>
      ) : cellData?.hasFormula ? (
        <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
          formula
        </span>
      ) : null}
    </div>
  );
};
