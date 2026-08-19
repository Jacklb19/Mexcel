/**
 * WorkerRecalculationStrategy — Delegates recalculation to a Web Worker.
 *
 * The main thread never runs the expensive recalculation loop.
 * Instead, it sends the changed cell to a Worker,
 * which runs the recalculation and returns only the diff.
 */

import type { RecalculationStrategy } from './RecalculationStrategy';
import type { SpreadsheetEngine, CellData } from '../SpreadsheetEngine';
import { SpreadsheetError } from '../errors';

/** Message sent to the worker */
export interface WorkerRequest {
  type: 'init' | 'recalculate';
  snapshot?: import('../SpreadsheetEngine').EngineSnapshot;
  changedCellIds?: string[];
  cellUpdate?: { id: string; rawInput: string };
}

/** Message received from the worker */
export interface WorkerResponse {
  type: 'ready' | 'result' | 'progress' | 'error';
  results?: Array<{
    id: string;
    rawInput: string;
    computedValue: number | string;
    displayValue: string;
    type: string;
    error: string | null;
    hasFormula: boolean;
  }>;
  completed?: number;
  total?: number;
  errorMessage?: string;
}

export class WorkerRecalculationStrategy implements RecalculationStrategy {
  readonly name = 'worker';
  private _worker: Worker | null = null;
  private _ready = false;
  private _synced = false;
  private _pendingInit: (() => void) | null = null;

  constructor() {
    this.initWorker();
  }

  private initWorker(): void {
    try {
      this._worker = new Worker(
        new URL('../../workers/engine.worker.ts', import.meta.url),
        { type: 'module' },
      );
      this._worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.type === 'ready') {
          this._ready = true;
          if (this._pendingInit) {
            this._pendingInit();
            this._pendingInit = null;
          }
        }
      };
    } catch (e) {
      console.error('Failed to initialize Web Worker:', e);
    }
  }

  /**
   * Sync the worker's engine state with the main thread's engine state.
   */
  async syncState(engine: SpreadsheetEngine): Promise<void> {
    if (!this._worker) return;

    if (!this._ready) {
      await new Promise<void>((resolve) => {
        this._pendingInit = resolve;
      });
    }

    const snapshot = engine.serialize();
    this._worker.postMessage({
      type: 'init',
      snapshot,
    } satisfies WorkerRequest);

    await new Promise<void>((resolve) => {
      const handler = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.type === 'ready') {
          this._worker?.removeEventListener('message', handler);
          this._synced = true;
          resolve();
        }
      };
      this._worker?.addEventListener('message', handler);
    });
  }

  /**
   * Notify that the structure changed (e.g. stress load generated).
   */
  markDirty(): void {
    this._synced = false;
  }

  async recalculate(
    engine: SpreadsheetEngine,
    changedCellIds: string[],
    onProgress?: (completed: number, total: number) => void,
  ): Promise<Map<string, CellData>> {
    if (!this._worker) {
      const order = engine.getRecalculationOrder(changedCellIds);
      const results = new Map<string, CellData>();
      for (const cellId of order) {
        const cell = engine.getCell(cellId);
        engine.evaluateCell(cell);
        results.set(cellId, engine.getCellData(cellId));
      }
      return results;
    }

    // Only sync the full snapshot if not yet synced (initial or after load gen)
    if (!this._synced) {
      await this.syncState(engine);
    }

    return new Promise((resolve, reject) => {
      const results = new Map<string, CellData>();

      const handler = (event: MessageEvent<WorkerResponse>) => {
        const data = event.data;

        if (data.type === 'progress' && onProgress && data.completed !== undefined && data.total !== undefined) {
          onProgress(data.completed, data.total);
        }

        if (data.type === 'result' && data.results) {
          for (const cellData of data.results) {
            results.set(cellData.id, cellData);
            const cell = engine.getCell(cellData.id);
            if (cellData.error) {
              cell.setError(new SpreadsheetError(cellData.error, cellData.error));
            } else {
              cell.setComputedValue(cellData.computedValue);
            }
          }
          this._worker?.removeEventListener('message', handler);
          resolve(results);
        }

        if (data.type === 'error') {
          this._worker?.removeEventListener('message', handler);
          reject(new Error(data.errorMessage ?? 'Worker recalculation failed'));
        }
      };

      this._worker?.addEventListener('message', handler);

      const cellUpdate =
        changedCellIds.length === 1
          ? {
              id: changedCellIds[0],
              rawInput: engine.getCellData(changedCellIds[0]).rawInput,
            }
          : undefined;

      this._worker?.postMessage({
        type: 'recalculate',
        changedCellIds,
        cellUpdate,
      } satisfies WorkerRequest);
    });
  }

  /**
   * Terminate the worker when no longer needed.
   */
  terminate(): void {
    this._worker?.terminate();
    this._worker = null;
    this._ready = false;
    this._synced = false;
  }
}
