/**
 * CommandHistory — Manages undo/redo stacks with a configurable max depth.
 */

import { EditCellCommand } from './EditCellCommand';

const DEFAULT_MAX_DEPTH = 100;

export class CommandHistory {
  private readonly _undoStack: EditCellCommand[];
  private readonly _redoStack: EditCellCommand[];
  private readonly _maxDepth: number;

  constructor(maxDepth: number = DEFAULT_MAX_DEPTH) {
    this._undoStack = [];
    this._redoStack = [];
    this._maxDepth = maxDepth;
  }

  /**
   * Push a new command onto the undo stack.
   * Clears the redo stack (can't redo after a new action).
   */
  push(command: EditCellCommand): void {
    this._undoStack.push(command);

    // Enforce max depth
    if (this._undoStack.length > this._maxDepth) {
      this._undoStack.shift();
    }

    // Clear redo stack
    this._redoStack.length = 0;
  }

  /**
   * Undo the last command. Returns the command to undo, or null if nothing to undo.
   */
  undo(): EditCellCommand | null {
    const command = this._undoStack.pop();
    if (!command) return null;

    this._redoStack.push(command);
    return command;
  }

  /**
   * Redo the last undone command. Returns the command to redo, or null.
   */
  redo(): EditCellCommand | null {
    const command = this._redoStack.pop();
    if (!command) return null;

    this._undoStack.push(command);
    return command;
  }

  get canUndo(): boolean {
    return this._undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this._redoStack.length > 0;
  }

  get undoCount(): number {
    return this._undoStack.length;
  }

  get redoCount(): number {
    return this._redoStack.length;
  }

  /**
   * Clear all history.
   */
  clear(): void {
    this._undoStack.length = 0;
    this._redoStack.length = 0;
  }
}
