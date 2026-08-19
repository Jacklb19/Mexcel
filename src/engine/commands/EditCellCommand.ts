/**
 * EditCellCommand — Command pattern for cell edits.
 * Stores the previous state for undo capability.
 */

export interface CellEditData {
  cellId: string;
  rawInput: string;
}

export class EditCellCommand {
  readonly description: string;
  private readonly _cellId: string;
  private readonly _newValue: string;
  private readonly _previousValue: string;

  constructor(cellId: string, newValue: string, previousValue: string) {
    this._cellId = cellId;
    this._newValue = newValue;
    this._previousValue = previousValue;
    this.description = `Edit ${cellId}: "${previousValue}" → "${newValue}"`;
  }

  get cellId(): string {
    return this._cellId;
  }

  get newValue(): string {
    return this._newValue;
  }

  get previousValue(): string {
    return this._previousValue;
  }

  /**
   * Returns the data needed to execute this command.
   */
  getExecuteData(): CellEditData {
    return { cellId: this._cellId, rawInput: this._newValue };
  }

  /**
   * Returns the data needed to undo this command.
   */
  getUndoData(): CellEditData {
    return { cellId: this._cellId, rawInput: this._previousValue };
  }
}
