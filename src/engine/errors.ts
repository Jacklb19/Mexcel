/**
 * Domain-specific error classes for spreadsheet formula evaluation.
 * Each error has a displayCode that appears in the cell (like Excel).
 */

export class SpreadsheetError extends Error {
  readonly displayCode: string;

  constructor(message: string, displayCode: string) {
    super(message);
    this.name = 'SpreadsheetError';
    this.displayCode = displayCode;
  }
}

export class CircularReferenceError extends SpreadsheetError {
  readonly cycle: string[];

  constructor(cycle: string[] = []) {
    super(
      `Circular reference detected: ${cycle.join(' → ')}`,
      '#CICLO!',
    );
    this.name = 'CircularReferenceError';
    this.cycle = cycle;
  }
}

export class InvalidReferenceError extends SpreadsheetError {
  readonly cellId: string;

  constructor(cellId: string) {
    super(
      `Invalid reference: ${cellId}`,
      '#REF!',
    );
    this.name = 'InvalidReferenceError';
    this.cellId = cellId;
  }
}

export class ValueTypeError extends SpreadsheetError {
  constructor(message: string = 'Invalid value type') {
    super(message, '#VALOR!');
    this.name = 'ValueTypeError';
  }
}

export class FormulaParseError extends SpreadsheetError {
  constructor(message: string) {
    super(message, '#ERROR!');
    this.name = 'FormulaParseError';
  }
}

export class DivisionByZeroError extends SpreadsheetError {
  constructor() {
    super('Division by zero', '#DIV/0!');
    this.name = 'DivisionByZeroError';
  }
}
