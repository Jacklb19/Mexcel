import type { ASTNode } from './FormulaParser';
import { SpreadsheetError } from './errors';

/**
 * Represents the type of content in a cell.
 */
export type CellType = 'empty' | 'number' | 'string' | 'formula';

/**
 * Serializable representation of a cell for transfer (Worker, localStorage).
 */
export interface SerializedCell {
  id: string;
  rawInput: string;
  computedValue: number | string;
  type: CellType;
  error: string | null;
}

/**
 * Represents a single cell in the spreadsheet.
 * Uses strict encapsulation with private fields.
 */
export class Cell {
  private _id: string;
  private _rawInput: string;
  private _computedValue: number | string;
  private _formula: ASTNode | null;
  private _error: SpreadsheetError | null;
  private _type: CellType;

  constructor(id: string, rawInput: string = '') {
    this._id = id;
    this._rawInput = '';
    this._computedValue = '';
    this._formula = null;
    this._error = null;
    this._type = 'empty';

    if (rawInput !== '') {
      this.setRawInput(rawInput);
    }
  }

  get id(): string {
    return this._id;
  }

  get rawInput(): string {
    return this._rawInput;
  }

  get computedValue(): number | string {
    return this._computedValue;
  }

  get formula(): ASTNode | null {
    return this._formula;
  }

  get error(): SpreadsheetError | null {
    return this._error;
  }

  get type(): CellType {
    return this._type;
  }

  get displayValue(): string {
    if (this._error) {
      return this._error.displayCode;
    }
    if (this._type === 'empty') {
      return '';
    }
    if (typeof this._computedValue === 'number') {
      // Show up to 10 decimal places, removing trailing zeros
      return Number.isInteger(this._computedValue)
        ? this._computedValue.toString()
        : parseFloat(this._computedValue.toFixed(10)).toString();
    }
    return String(this._computedValue);
  }

  get hasFormula(): boolean {
    return this._type === 'formula';
  }

  /**
   * Sets the raw input and determines the cell type.
   * Does NOT parse formulas — that is the Tokenizer/Parser's responsibility.
   */
  setRawInput(input: string): void {
    this._rawInput = input;
    this._error = null;
    this._formula = null;

    if (input === '') {
      this._type = 'empty';
      this._computedValue = '';
    } else if (input.startsWith('=')) {
      this._type = 'formula';
      // Formula will be parsed externally and set via setFormula()
      this._computedValue = '';
    } else {
      const num = Number(input);
      if (!isNaN(num) && input.trim() !== '') {
        this._type = 'number';
        this._computedValue = num;
      } else {
        this._type = 'string';
        this._computedValue = input;
      }
    }
  }

  /**
   * Set the parsed formula AST (called by the engine after parsing).
   */
  setFormula(ast: ASTNode | null): void {
    this._formula = ast;
  }

  /**
   * Set the computed value after evaluation.
   */
  setComputedValue(value: number | string): void {
    this._computedValue = value;
    this._error = null;
  }

  /**
   * Set an error on this cell.
   */
  setError(error: SpreadsheetError): void {
    this._error = error;
    this._computedValue = '';
  }

  /**
   * Clear the error state.
   */
  clearError(): void {
    this._error = null;
  }

  /**
   * Create a deep clone of this cell.
   */
  clone(): Cell {
    const cell = new Cell(this._id);
    cell._rawInput = this._rawInput;
    cell._computedValue = this._computedValue;
    cell._formula = this._formula; // AST is immutable, safe to share
    cell._error = this._error;
    cell._type = this._type;
    return cell;
  }

  /**
   * Serialize for transfer (Worker postMessage, localStorage).
   */
  toSerializable(): SerializedCell {
    return {
      id: this._id,
      rawInput: this._rawInput,
      computedValue: this._computedValue,
      type: this._type,
      error: this._error ? this._error.displayCode : null,
    };
  }

  /**
   * Create a Cell from serialized data.
   */
  static fromSerializable(data: SerializedCell): Cell {
    const cell = new Cell(data.id);
    cell._rawInput = data.rawInput;
    cell._computedValue = data.computedValue;
    cell._type = data.type;
    // Error and formula need to be re-evaluated by the engine
    return cell;
  }
}
