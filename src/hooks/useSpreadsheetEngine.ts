/**
 * useSpreadsheetEngine — Core hook managing the SpreadsheetEngine lifecycle.
 *
 * Handles: engine creation, cell updates, recalculation, undo/redo,
 * localStorage persistence, and stress load generation.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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

export function useSpreadsheetEngine(
  options: UseSpreadsheetEngineOptions,
): [SpreadsheetState, SpreadsheetActions] {
  const { strategy, routeKey } = options;
  const storageKey = `${STORAGE_KEY_PREFIX}${routeKey}`;

  const engineRef = useRef<SpreadsheetEngine | null>(null);
  const historyRef = useRef(new CommandHistory());
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [cellData, setCellData] = useState<Map<string, CellData>>(new Map());
  const [totalRows, setTotalRows] = useState(100);
  const [totalCols, setTotalCols] = useState(26);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalcProgress, setRecalcProgress] = useState<{ completed: number; total: number } | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);

  // Initialize or re-initialize engine
  const initEngine = useCallback(() => {
    const engine = new SpreadsheetEngine(strategy);
    engineRef.current = engine;

    // Try to load from localStorage
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const snapshot = JSON.parse(saved);
        engine.deserialize(snapshot);
      } catch {
        // Corrupted data — generate default dataset
        DatasetGenerator.generateBudgetDataset(engine);
      }
    } else {
      DatasetGenerator.generateBudgetDataset(engine);
    }

    // Update React state
    setCellData(new Map(engine.getAllCellData()));
    setTotalRows(engine.totalRows);
    setTotalCols(engine.totalCols);
    historyRef.current.clear();
    setHistoryVersion((v) => v + 1);
  }, [strategy, storageKey]);

  // Init on mount
  useEffect(() => {
    initEngine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update strategy when it changes
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setStrategy(strategy);
    }
  }, [strategy]);

  // Autosave with debounce
  const scheduleAutosave = useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = setTimeout(() => {
      if (engineRef.current) {
        const snapshot = engineRef.current.serialize();
        localStorage.setItem(storageKey, JSON.stringify(snapshot));
      }
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [storageKey]);

  // Set cell value with command history
  const setCellValue = useCallback(
    (cellId: string, rawInput: string) => {
      const engine = engineRef.current;
      if (!engine) return;

      const previousValue = engine.getCellData(cellId).rawInput;
      if (previousValue === rawInput) return; // No change

      // Create and push command
      const command = new EditCellCommand(cellId, rawInput, previousValue);
      historyRef.current.push(command);
      setHistoryVersion((v) => v + 1);

      // Apply the change
      engine.setCellRawInput(cellId, rawInput);

      // Update the changed cell immediately in state
      setCellData((prev) => {
        const next = new Map(prev);
        next.set(cellId, engine.getCellData(cellId));
        return next;
      });

      // Trigger recalculation for dependents
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
    [scheduleAutosave],
  );

  // Apply a cell edit from undo/redo
  const applyEdit = useCallback(
    (cellId: string, rawInput: string) => {
      const engine = engineRef.current;
      if (!engine) return;

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
      setHistoryVersion((v) => v + 1);
    }
  }, [applyEdit]);

  const redo = useCallback(() => {
    const command = historyRef.current.redo();
    if (command) {
      const data = command.getExecuteData();
      applyEdit(data.cellId, data.rawInput);
      setHistoryVersion((v) => v + 1);
    }
  }, [applyEdit]);

  const save = useCallback(() => {
    if (engineRef.current) {
      const snapshot = engineRef.current.serialize();
      localStorage.setItem(storageKey, JSON.stringify(snapshot));
    }
  }, [storageKey]);

  const generateLoad = useCallback(
    (count: number) => {
      const engine = engineRef.current;
      if (!engine) return;

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
    if (!engine) return;

    engine.clear();
    DatasetGenerator.generateBudgetDataset(engine);
    setCellData(new Map(engine.getAllCellData()));
    setTotalRows(engine.totalRows);
    setTotalCols(engine.totalCols);
    historyRef.current.clear();
    setHistoryVersion((v) => v + 1);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  const getCellData = useCallback((cellId: string): CellData => {
    return engineRef.current?.getCellData(cellId) ?? {
      id: cellId,
      rawInput: '',
      computedValue: '',
      displayValue: '',
      type: 'empty',
      error: null,
      hasFormula: false,
    };
  }, []);

  const getCellDependencies = useCallback((cellId: string): ReadonlySet<string> => {
    return engineRef.current?.getCellDependencies(cellId) ?? new Set();
  }, []);

  const getCellDependents = useCallback((cellId: string): ReadonlySet<string> => {
    return engineRef.current?.getCellDependents(cellId) ?? new Set();
  }, []);

  const canUndo = useMemo(() => historyRef.current.canUndo, [historyVersion]);
  const canRedo = useMemo(() => historyRef.current.canRedo, [historyVersion]);

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
