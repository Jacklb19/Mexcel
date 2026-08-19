/**
 * SpreadsheetEngine — Facade that orchestrates the formula pipeline.
 *
 * Coordinates: Tokenizer → Parser → Evaluator → DependencyGraph
 * Does NOT depend on React. Receives its RecalculationStrategy via DI.
 */

import { Cell, type SerializedCell } from './Cell';
import { FormulaTokenizer } from './FormulaTokenizer';
import { FormulaParser, extractCellRefs } from './FormulaParser';
import { FormulaEvaluator } from './FormulaEvaluator';
import { DependencyGraph } from './DependencyGraph';
import type { RecalculationStrategy } from './strategies/RecalculationStrategy';
import {
  SpreadsheetError,
  CircularReferenceError,
} from './errors';

export interface CellData {
  id: string;
  rawInput: string;
  computedValue: number | string;
  displayValue: string;
  type: string;
  error: string | null;
  hasFormula: boolean;
}

export interface EngineSnapshot {
  cells: SerializedCell[];
  totalRows: number;
  totalCols: number;
}

export class SpreadsheetEngine {
  private readonly _cells: Map<string, Cell>;
  private readonly _graph: DependencyGraph;
  private _strategy: RecalculationStrategy;
  private _totalRows: number;
  private _totalCols: number;

  constructor(strategy: RecalculationStrategy, rows: number = 100, cols: number = 26) {
    this._cells = new Map();
    this._graph = new DependencyGraph();
    this._strategy = strategy;
    this._totalRows = rows;
    this._totalCols = cols;
  }

  get totalRows(): number {
    return this._totalRows;
  }

  get totalCols(): number {
    return this._totalCols;
  }

  get graph(): DependencyGraph {
    return this._graph;
  }

  /**
   * Replace the recalculation strategy at runtime.
   */
  setStrategy(strategy: RecalculationStrategy): void {
    this._strategy = strategy;
  }

  /**
   * Set a cell's raw input and parse its formula (if any).
   * Returns the cell data. Does NOT trigger recalculation — call recalculate() separately.
   */
  setCellRawInput(cellId: string, rawInput: string): CellData {
    let cell = this._cells.get(cellId);
    if (!cell) {
      cell = new Cell(cellId);
      this._cells.set(cellId, cell);
    }

    cell.setRawInput(rawInput);

    // If it's a formula, tokenize + parse + update dependencies
    if (cell.hasFormula) {
      try {
        const tokenizer = new FormulaTokenizer(rawInput);
        const tokens = tokenizer.tokenize();
        const parser = new FormulaParser(tokens);
        const ast = parser.parse();
        cell.setFormula(ast);

        // Extract cell references and update dependency graph
        const refs = extractCellRefs(ast);

        // Check for circular references before committing
        const cyclePath = this._graph.wouldCreateCycle(cellId, refs);
        if (cyclePath) {
          cell.setError(new CircularReferenceError(cyclePath));
          this._graph.removeDependencies(cellId);
          return this.getCellData(cellId);
        }

        this._graph.setDependencies(cellId, refs);
      } catch (e) {
        if (e instanceof SpreadsheetError) {
          cell.setError(e);
        } else {
          cell.setError(new SpreadsheetError(String(e), '#ERROR!'));
        }
        this._graph.removeDependencies(cellId);
      }
    } else {
      // Not a formula — remove any old dependencies
      this._graph.removeDependencies(cellId);
    }

    // Evaluate this single cell immediately (if it's a formula)
    if (cell.hasFormula && !cell.error) {
      this.evaluateCell(cell);
    }

    return this.getCellData(cellId);
  }

  /**
   * Evaluate a single cell's formula using current cell values.
   */
  evaluateCell(cell: Cell): void {
    if (!cell.formula) return;

    try {
      const evaluator = new FormulaEvaluator((refId: string) => {
        const refCell = this._cells.get(refId);
        if (!refCell) {
          // Treat as empty cell → 0
          return 0;
        }
        if (refCell.error) {
          throw refCell.error;
        }
        const val = refCell.computedValue;
        return val === '' ? 0 : val;
      });

      const result = evaluator.evaluate(cell.formula);
      cell.setComputedValue(result);
    } catch (e) {
      if (e instanceof SpreadsheetError) {
        cell.setError(e);
      } else {
        cell.setError(new SpreadsheetError(String(e), '#ERROR!'));
      }
    }
  }

  /**
   * Trigger recalculation of all cells affected by changes to the given cells.
   * Delegates to the injected RecalculationStrategy.
   */
  async recalculate(
    changedCellIds: string[],
    onProgress?: (completed: number, total: number) => void,
  ): Promise<Map<string, CellData>> {
    return this._strategy.recalculate(this, changedCellIds, onProgress);
  }

  /**
   * Get the recalculation order for a set of changed cells.
   * Used by strategies to determine which cells need re-evaluation.
   */
  getRecalculationOrder(changedCellIds: string[]): string[] {
    try {
      return this._graph.getRecalculationOrder(changedCellIds);
    } catch (e) {
      if (e instanceof CircularReferenceError) {
        // Mark all cells in the cycle with the error
        for (const cellId of e.cycle) {
          const cell = this._cells.get(cellId);
          if (cell) {
            cell.setError(new CircularReferenceError(e.cycle));
          }
        }
        return [];
      }
      throw e;
    }
  }

  /**
   * Get data for a single cell.
   */
  getCellData(cellId: string): CellData {
    const cell = this._cells.get(cellId);
    if (!cell) {
      return {
        id: cellId,
        rawInput: '',
        computedValue: '',
        displayValue: '',
        type: 'empty',
        error: null,
        hasFormula: false,
      };
    }
    return {
      id: cell.id,
      rawInput: cell.rawInput,
      computedValue: cell.computedValue,
      displayValue: cell.displayValue,
      type: cell.type,
      error: cell.error?.displayCode ?? null,
      hasFormula: cell.hasFormula,
    };
  }

  /**
   * Get a Cell instance (or create an empty one).
   */
  getCell(cellId: string): Cell {
    let cell = this._cells.get(cellId);
    if (!cell) {
      cell = new Cell(cellId);
      this._cells.set(cellId, cell);
    }
    return cell;
  }

  /**
   * Check if a cell exists (has been set).
   */
  hasCell(cellId: string): boolean {
    return this._cells.has(cellId);
  }

  /**
   * Get all non-empty cell data.
   */
  getAllCellData(): Map<string, CellData> {
    const result = new Map<string, CellData>();
    for (const [id] of this._cells) {
      result.set(id, this.getCellData(id));
    }
    return result;
  }

  /**
   * Get the dependencies of a cell (cells it references in its formula).
   */
  getCellDependencies(cellId: string): ReadonlySet<string> {
    return this._graph.getDependencies(cellId);
  }

  /**
   * Get the dependents of a cell (cells whose formulas reference it).
   */
  getCellDependents(cellId: string): ReadonlySet<string> {
    return this._graph.getDependents(cellId);
  }

  /**
   * Expand grid dimensions if needed (e.g., when generating load).
   */
  ensureSize(rows: number, cols: number): void {
    this._totalRows = Math.max(this._totalRows, rows);
    this._totalCols = Math.max(this._totalCols, cols);
  }

  /**
   * Serialize the entire engine state for transfer or storage.
   */
  serialize(): EngineSnapshot {
    const cells: SerializedCell[] = [];
    for (const [, cell] of this._cells) {
      if (cell.rawInput !== '') {
        cells.push(cell.toSerializable());
      }
    }
    return {
      cells,
      totalRows: this._totalRows,
      totalCols: this._totalCols,
    };
  }

  /**
   * Restore engine state from a snapshot.
   * Re-parses all formulas and rebuilds the dependency graph.
   */
  deserialize(snapshot: EngineSnapshot): void {
    this._cells.clear();
    this._graph.clear();
    this._totalRows = snapshot.totalRows;
    this._totalCols = snapshot.totalCols;

    // First pass: set all raw inputs (creates cells, parses formulas, builds graph)
    for (const data of snapshot.cells) {
      this.setCellRawInput(data.id, data.rawInput);
    }

    // Second pass: evaluate all formula cells in dependency order
    // Collect all formula cells that were set
    const formulaCells: string[] = [];
    for (const [id, cell] of this._cells) {
      if (cell.hasFormula && !cell.error) {
        formulaCells.push(id);
      }
    }

    // Get topological order and evaluate
    if (formulaCells.length > 0) {
      this.evaluateAllFormulas();
    }
  }

  /**
   * Evaluate all formula cells in topological order.
   * Used during deserialization and full recalculation.
   */
  evaluateAllFormulas(): void {
    const allCells = Array.from(this._cells.keys());
    try {
      const order = this.getRecalculationOrder(allCells);
      for (const cellId of order) {
        const cell = this._cells.get(cellId);
        if (cell && cell.hasFormula && !cell.error) {
          this.evaluateCell(cell);
        }
      }
    } catch {
      for (const [, cell] of this._cells) {
        if (cell.hasFormula && !cell.error) {
          this.evaluateCell(cell);
        }
      }
    }
  }

  /**
   * Get the total number of non-empty cells.
   */
  get cellCount(): number {
    return this._cells.size;
  }

  /**
   * Clear all cells and reset the engine.
   */
  clear(rows: number = 100, cols: number = 26): void {
    this._cells.clear();
    this._graph.clear();
    this._totalRows = rows;
    this._totalCols = cols;
  }
}
