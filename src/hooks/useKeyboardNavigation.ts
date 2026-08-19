/**
 * useKeyboardNavigation — Manages cell selection, navigation, editing, and copy/paste.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { toCellId, parseCellId } from '../engine/FormulaParser';

export interface CellSelection {
  activeCell: string;
  editingCell: string | null;
  editValue: string;
  selectionRange: { start: string; end: string } | null;
}

interface UseKeyboardNavigationOptions {
  totalRows: number;
  totalCols: number;
  getCellRawInput: (cellId: string) => string;
  setCellValue: (cellId: string, value: string) => void;
  undo: () => void;
  redo: () => void;
}

export function useKeyboardNavigation(options: UseKeyboardNavigationOptions) {
  const { totalRows, totalCols, getCellRawInput, setCellValue, undo, redo } = options;

  const [activeCell, setActiveCell] = useState('A1');
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ start: string; end: string } | null>(null);

  const clipboardRef = useRef<{ cellId: string; value: string }[]>([]);

  const navigateTo = useCallback(
    (col: number, row: number) => {
      const clampedCol = Math.max(0, Math.min(col, totalCols - 1));
      const clampedRow = Math.max(0, Math.min(row, totalRows - 1));
      const newCellId = toCellId(clampedCol, clampedRow);
      setActiveCell(newCellId);
      setSelectionRange(null);
      return newCellId;
    },
    [totalRows, totalCols],
  );

  const startEditing = useCallback(
    (cellId?: string, initialValue?: string) => {
      const targetCell = cellId ?? activeCell;
      const value = initialValue ?? getCellRawInput(targetCell);
      setEditingCell(targetCell);
      setEditValue(value);
      setActiveCell(targetCell);
    },
    [activeCell, getCellRawInput],
  );

  const cancelEditing = useCallback(() => {
    setEditingCell(null);
    setEditValue('');
  }, []);

  const confirmEditing = useCallback(
    (moveDirection: 'down' | 'right' | 'none' = 'down') => {
      if (editingCell) {
        setCellValue(editingCell, editValue);
        setEditingCell(null);
        setEditValue('');

        // Move to next cell
        if (moveDirection !== 'none') {
          const { col, row } = parseCellId(editingCell);
          if (moveDirection === 'down') {
            navigateTo(col, row + 1);
          } else {
            navigateTo(col + 1, row);
          }
        }
      }
    },
    [editingCell, editValue, setCellValue, navigateTo],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Handle undo/redo globally
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (editingCell) cancelEditing();
        undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (editingCell) cancelEditing();
        redo();
        return;
      }

      // Handle copy
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        clipboardRef.current = [
          { cellId: activeCell, value: getCellRawInput(activeCell) },
        ];
        return;
      }

      // Handle paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        if (clipboardRef.current.length > 0) {
          const item = clipboardRef.current[0];
          setCellValue(activeCell, item.value);
        }
        return;
      }

      // If currently editing a cell
      if (editingCell) {
        switch (e.key) {
          case 'Escape':
            e.preventDefault();
            cancelEditing();
            break;
          case 'Enter':
            e.preventDefault();
            confirmEditing('down');
            break;
          case 'Tab':
            e.preventDefault();
            confirmEditing('right');
            break;
          default:
            // Let the input handle the keystroke
            break;
        }
        return;
      }

      // Navigation mode (not editing)
      const { col, row } = parseCellId(activeCell);

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          navigateTo(col, row - 1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          navigateTo(col, row + 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          navigateTo(col - 1, row);
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigateTo(col + 1, row);
          break;
        case 'Tab':
          e.preventDefault();
          if (e.shiftKey) {
            navigateTo(col - 1, row);
          } else {
            navigateTo(col + 1, row);
          }
          break;
        case 'Enter':
          e.preventDefault();
          startEditing();
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          setCellValue(activeCell, '');
          break;
        case 'F2':
          e.preventDefault();
          startEditing();
          break;
        default:
          // Start editing on any printable character
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            startEditing(activeCell, e.key);
          }
          break;
      }
    },
    [activeCell, editingCell, getCellRawInput, setCellValue, navigateTo, startEditing, cancelEditing, confirmEditing, undo, redo],
  );

  // Attach keyboard listener to the document
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const selectCell = useCallback(
    (cellId: string) => {
      if (editingCell) {
        confirmEditing('none');
      }
      setActiveCell(cellId);
      setSelectionRange(null);
    },
    [editingCell, confirmEditing],
  );

  const doubleClickCell = useCallback(
    (cellId: string) => {
      startEditing(cellId);
    },
    [startEditing],
  );

  return {
    activeCell,
    editingCell,
    editValue,
    setEditValue,
    selectionRange,
    selectCell,
    doubleClickCell,
    startEditing,
    cancelEditing,
    confirmEditing,
  };
}
