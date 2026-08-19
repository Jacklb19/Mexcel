/**
 * RecalculationStrategy — Interface for recalculation algorithms.
 *
 * Allows swapping the recalculation approach (sync, chunked, worker)
 * without modifying SpreadsheetEngine (Open/Closed principle).
 */

import type { SpreadsheetEngine, CellData } from '../SpreadsheetEngine';

export interface RecalculationStrategy {
  readonly name: string;

  /**
   * Recalculate all cells affected by changes to the given cells.
   * Returns a map of cellId → updated CellData for all cells that changed.
   */
  recalculate(
    engine: SpreadsheetEngine,
    changedCellIds: string[],
    onProgress?: (completed: number, total: number) => void,
  ): Promise<Map<string, CellData>>;
}
