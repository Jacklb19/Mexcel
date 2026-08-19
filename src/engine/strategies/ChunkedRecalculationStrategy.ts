/**
 * ChunkedRecalculationStrategy — Splits recalculation into chunks.
 *
 * Uses scheduler.postTask() (with setTimeout fallback) to yield control
 * between chunks, allowing the browser to paint and handle user input.
 * Combined with React's startTransition/useDeferredValue on the /good route.
 */

import type { RecalculationStrategy } from './RecalculationStrategy';
import type { SpreadsheetEngine, CellData } from '../SpreadsheetEngine';

/** Default number of cells to process per chunk */
const DEFAULT_CHUNK_SIZE = 200;

/**
 * Yield control to the browser between chunks.
 * Uses scheduler.postTask if available, falls back to setTimeout.
 */
function yieldToMain(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scheduler = (globalThis as any).scheduler;
  if (scheduler?.postTask) {
    return scheduler.postTask(() => {}, { priority: 'user-blocking' });
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export class ChunkedRecalculationStrategy implements RecalculationStrategy {
  readonly name = 'chunked';
  private readonly _chunkSize: number;

  constructor(chunkSize: number = DEFAULT_CHUNK_SIZE) {
    this._chunkSize = chunkSize;
  }

  async recalculate(
    engine: SpreadsheetEngine,
    changedCellIds: string[],
    onProgress?: (completed: number, total: number) => void,
  ): Promise<Map<string, CellData>> {
    const order = engine.getRecalculationOrder(changedCellIds);
    const results = new Map<string, CellData>();
    const total = order.length;

    // Process cells in chunks, yielding between each chunk
    for (let i = 0; i < order.length; i += this._chunkSize) {
      const chunkEnd = Math.min(i + this._chunkSize, order.length);

      // Process this chunk synchronously
      for (let j = i; j < chunkEnd; j++) {
        const cellId = order[j];
        const cell = engine.getCell(cellId);
        engine.evaluateCell(cell);
        results.set(cellId, engine.getCellData(cellId));
      }

      if (onProgress) {
        onProgress(chunkEnd, total);
      }

      // Yield to the browser between chunks (but not after the last chunk)
      if (chunkEnd < order.length) {
        await yieldToMain();
      }
    }

    return results;
  }
}
