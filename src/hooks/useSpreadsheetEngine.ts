/**
 * useSpreadsheetEngine — Core hook managing the SpreadsheetEngine lifecycle.
 *
 * Handles: engine creation, cell updates, recalculation, undo/redo,
 * localStorage persistence, and stress load generation.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { SpreadsheetEngine, type CellData } from '../engine/SpreadsheetEngine';
import type { RecalculationStrategy } from '../engine/strategies/RecalculationStrategy';
import { CommandHistory } from '../engine/commands/CommandHistory';
import { EditCellCommand } from '../engine/commands/EditCellCommand';
import { DatasetGenerator } from '../engine/DatasetGenerator';

const STORAGE_KEY_PREFIX = 'mini-excel-';
const AUTOSAVE_DEBOUNCE_MS = 1000;

interface UseSpreadsheetEngineOptions {
  strategy: RecalculationStrategy;
  routeKey: string; // 'bad' | 'good' | 'worker'
}

export interface SpreadsheetState {
  cellData: Map<string, CellData>;
  totalRows: number;
  totalCols: number;
  isRecalculating: boolean;
  recalcProgress: { completed: number; total: number } | null;
}

export interface SpreadsheetActions {
  setCellValue: (cellId: string, rawInput: string) => void;
  getCellData: (cellId: string) => CellData;
  getCellDependencies: (cellId: string) => ReadonlySet<string>;
  getCellDependents: (cellId: string) => ReadonlySet<string>;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  save: () => void;
  generateLoad: (count: number) => void;
  resetToDefault: () => void;
}

function initializeEngine(strategy: RecalculationStrategy, storageKey: string): {
  engine: SpreadsheetEngine;
  history: CommandHistory;
  cellData: Map<string, CellData>;
  totalRows: number;
  totalCols: number;
} {
  const engine = new SpreadsheetEngine(strategy);
  const history = new CommandHistory();

  const saved = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
  if (saved) {
    try {
      const snapshot = JSON.parse(saved);
      engine.deserialize(snapshot);
    } catch {
      DatasetGenerator.generateBudgetDataset(engine);
    }
  } else {
    DatasetGenerator.generateBudgetDataset(engine);
  }

  return {
    engine,
    history,
    cellData: new Map(engine.getAllCellData()),
    totalRows: engine.totalRows,
    totalCols: engine.totalCols,
  };
}

export function useSpreadsheetEngine(
  options: UseSpreadsheetEngineOptions,
): [SpreadsheetState, SpreadsheetActions] {
  const { strategy, routeKey } = options;
  const storageKey = `${STORAGE_KEY_PREFIX}${routeKey}`;

  // Initialize engine and initial state lazily
  const [initial] = useState(() => initializeEngine(strategy, storageKey));
  const engineRef = useRef<SpreadsheetEngine>(initial.engine);
  const historyRef = useRef<CommandHistory>(initial.history);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [cellData, setCellData] = useState<Map<string, CellData>>(initial.cellData);
  const [totalRows, setTotalRows] = useState(initial.totalRows);
  const [totalCols, setTotalCols] = useState(initial.totalCols);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalcProgress, setRecalcProgress] = useState<{ completed: number; total: number } | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateHistoryFlags = useCallback(() => {
    setCanUndo(historyRef.current.canUndo);
    setCanRedo(historyRef.current.canRedo);
  }, []);

  // Update strategy when it changes
  useEffect(() => {
    engineRef.current.setStrategy(strategy);
  }, [strategy]);

  // Clean up autosave timer on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  // Autosave with debounce
  const scheduleAutosave = useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = setTimeout(() => {
      const snapshot = engineRef.current.serialize();
      localStorage.setItem(storageKey, JSON.stringify(snapshot));
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [storageKey]);

  // Set cell value with command history
  const setCellValue = useCallback(
    (cellId: string, rawInput: string) => {
      const engine = engineRef.current;
      const previousValue = engine.getCellData(cellId).rawInput;
      if (previousValue === rawInput) return;

      const command = new EditCellCommand(cellId, rawInput, previousValue);
      historyRef.current.push(command);
      updateHistoryFlags();

      engine.setCellRawInput(cellId, rawInput);

      setCellData((prev) => {
        const next = new Map(prev);
        next.set(cellId, engine.getCellData(cellId));
        return next;
      });

      setIsRecalculating(true);
      setRecalcProgress(null);

      engine
        .recalculate([cellId], (completed, total) => {
          setRecalcProgress({ completed, total });
        })
        .then((results) => {
          setCellData((prev) => {
            const next = new Map(prev);
            for (const [id, data] of results) {
              next.set(id, data);
            }
            return next;
          });
          setIsRecalculating(false);
          setRecalcProgress(null);
          scheduleAutosave();
        })
        .catch((error) => {
          console.error('Recalculation error:', error);
          setIsRecalculating(false);
          setRecalcProgress(null);
        });
    },
    [scheduleAutosave, updateHistoryFlags],
  );

  const applyEdit = useCallback(
    (cellId: string, rawInput: string) => {
      const engine = engineRef.current;
      engine.setCellRawInput(cellId, rawInput);

      setCellData((prev) => {
        const next = new Map(prev);
        next.set(cellId, engine.getCellData(cellId));
        return next;
      });

      setIsRecalculating(true);
      engine
        .recalculate([cellId])
        .then((results) => {
          setCellData((prev) => {
            const next = new Map(prev);
            for (const [id, data] of results) {
              next.set(id, data);
            }
            return next;
          });
          setIsRecalculating(false);
          scheduleAutosave();
        })
        .catch(() => {
          setIsRecalculating(false);
        });
    },
    [scheduleAutosave],
  );

  const undo = useCallback(() => {
    const command = historyRef.current.undo();
    if (command) {
      const data = command.getUndoData();
      applyEdit(data.cellId, data.rawInput);
      updateHistoryFlags();
    }
  }, [applyEdit, updateHistoryFlags]);

  const redo = useCallback(() => {
    const command = historyRef.current.redo();
    if (command) {
      const data = command.getExecuteData();
      applyEdit(data.cellId, data.rawInput);
      updateHistoryFlags();
    }
  }, [applyEdit, updateHistoryFlags]);

  const save = useCallback(() => {
    const snapshot = engineRef.current.serialize();
    localStorage.setItem(storageKey, JSON.stringify(snapshot));
  }, [storageKey]);

  const generateLoad = useCallback(
    (count: number) => {
      const engine = engineRef.current;
      DatasetGenerator.generateStressLoad(engine, count);
      setCellData(new Map(engine.getAllCellData()));
      setTotalRows(engine.totalRows);
      setTotalCols(engine.totalCols);
      scheduleAutosave();
    },
    [scheduleAutosave],
  );

  const resetToDefault = useCallback(() => {
    const engine = engineRef.current;
    engine.clear();
    DatasetGenerator.generateBudgetDataset(engine);
    setCellData(new Map(engine.getAllCellData()));
    setTotalRows(engine.totalRows);
    setTotalCols(engine.totalCols);
    historyRef.current.clear();
    updateHistoryFlags();
    localStorage.removeItem(storageKey);
  }, [storageKey, updateHistoryFlags]);

  const getCellData = useCallback((cellId: string): CellData => {
    return engineRef.current.getCellData(cellId);
  }, []);

  const getCellDependencies = useCallback((cellId: string): ReadonlySet<string> => {
    return engineRef.current.getCellDependencies(cellId);
  }, []);

  const getCellDependents = useCallback((cellId: string): ReadonlySet<string> => {
    return engineRef.current.getCellDependents(cellId);
  }, []);

  const state: SpreadsheetState = {
    cellData,
    totalRows,
    totalCols,
    isRecalculating,
    recalcProgress,
  };

  const actions: SpreadsheetActions = {
    setCellValue,
    getCellData,
    getCellDependencies,
    getCellDependents,
    undo,
    redo,
    canUndo,
    canRedo,
    save,
    generateLoad,
    resetToDefault,
  };

  return [state, actions];
}
