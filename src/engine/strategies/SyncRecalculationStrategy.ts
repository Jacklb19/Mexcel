/**
 * SyncRecalculationStrategy — 100% synchronous, blocking recalculation.
 *
 * Intentionally does everything in a single synchronous task to demonstrate
 * how blocking the main thread causes long tasks and poor INP scores.
 * Used on the /bad route.
 */

import type { RecalculationStrategy } from './RecalculationStrategy';
import type { SpreadsheetEngine, CellData } from '../SpreadsheetEngine';

export class SyncRecalculationStrategy implements RecalculationStrategy {
  readonly name = 'sync';

  async recalculate(
    engine: SpreadsheetEngine,
    changedCellIds: string[],
    onProgress?: (completed: number, total: number) => void,
  ): Promise<Map<string, CellData>> {
    const order = engine.getRecalculationOrder(changedCellIds);
    const results = new Map<string, CellData>();
    const total = order.length;

    // Evaluate every cell synchronously — no yielding, no chunking.
    // This is intentionally bad for performance demonstration.
    for (let i = 0; i < order.length; i++) {
      const cellId = order[i];
      const cell = engine.getCell(cellId);
      engine.evaluateCell(cell);
      results.set(cellId, engine.getCellData(cellId));

      if (onProgress) {
        onProgress(i + 1, total);
      }
    }

    return results;
  }
}
