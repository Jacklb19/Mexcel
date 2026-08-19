/**
 * FormulaParser — Recursive descent parser that builds an AST from tokens.
 *
 * Grammar:
 *   expression   → comparison
 *   comparison   → addition (('>' | '<' | '>=' | '<=' | '=' | '<>') addition)*
 *   addition     → multiplication (('+' | '-') multiplication)*
 *   multiplication → unary (('*' | '/') unary)*
 *   unary        → ('-' unary) | primary
 *   primary      → NUMBER | STRING | cellRefOrRange | functionCall | '(' expression ')'
 *   cellRefOrRange → CELL_REF (':' CELL_REF)?
 *   functionCall → FUNCTION_NAME '(' argumentList? ')'
 *   argumentList → expression (',' expression)*
 */

import type { Token } from './FormulaTokenizer';
import { FormulaParseError } from './errors';

// AST Node Types
export interface NumberLiteral {
  type: 'NumberLiteral';
  value: number;
}

export interface StringLiteral {
  type: 'StringLiteral';
  value: string;
}

export interface CellRef {
  type: 'CellRef';
  cellId: string;
}

export interface RangeRef {
  type: 'RangeRef';
  start: string;
  end: string;
}

export interface BinaryOp {
  type: 'BinaryOp';
  operator: string;
  left: ASTNode;
  right: ASTNode;
}

export interface UnaryOp {
  type: 'UnaryOp';
  operator: string;
  operand: ASTNode;
}

export interface FunctionCall {
  type: 'FunctionCall';
  name: string;
  args: ASTNode[];
}

export type ASTNode =
  | NumberLiteral
  | StringLiteral
  | CellRef
  | RangeRef
  | BinaryOp
  | UnaryOp
  | FunctionCall;

/**
 * Extracts all cell references from an AST node (used for dependency tracking).
 */
export function extractCellRefs(node: ASTNode): string[] {
  const refs: string[] = [];

  function walk(n: ASTNode): void {
    switch (n.type) {
      case 'CellRef':
        refs.push(n.cellId);
        break;
      case 'RangeRef':
        // Expand range to individual cell refs
        for (const cellId of expandRange(n.start, n.end)) {
          refs.push(cellId);
        }
        break;
      case 'BinaryOp':
        walk(n.left);
        walk(n.right);
        break;
      case 'UnaryOp':
        walk(n.operand);
        break;
      case 'FunctionCall':
        for (const arg of n.args) {
          walk(arg);
        }
        break;
      case 'NumberLiteral':
      case 'StringLiteral':
        break;
    }
  }

  walk(node);
  return refs;
}

/**
 * Parse a cell ID like "B3" into { col: 1, row: 2 } (0-indexed).
 */
export function parseCellId(cellId: string): { col: number; row: number } {
  const match = cellId.match(/^([A-Z]+)(\d+)$/);
  if (!match) {
    throw new FormulaParseError(`Invalid cell reference: ${cellId}`);
  }
  const colStr = match[1];
  const rowStr = match[2];

  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 64);
  }
  col--; // 0-indexed

  const row = parseInt(rowStr, 10) - 1; // 0-indexed
  return { col, row };
}

/**
 * Convert 0-indexed col/row to a cell ID like "B3".
 */
export function toCellId(col: number, row: number): string {
  let colStr = '';
  let c = col;
  do {
    colStr = String.fromCharCode(65 + (c % 26)) + colStr;
    c = Math.floor(c / 26) - 1;
  } while (c >= 0);

  return `${colStr}${row + 1}`;
}

/**
 * Expand a range like A1:C3 into an array of cell IDs.
 */
export function expandRange(start: string, end: string): string[] {
  const s = parseCellId(start);
  const e = parseCellId(end);

  const minCol = Math.min(s.col, e.col);
  const maxCol = Math.max(s.col, e.col);
  const minRow = Math.min(s.row, e.row);
  const maxRow = Math.max(s.row, e.row);

  const cells: string[] = [];
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      cells.push(toCellId(col, row));
    }
  }
  return cells;
}

export class FormulaParser {
  private _tokens: Token[];
  private _pos: number;

  constructor(tokens: Token[]) {
    this._tokens = tokens;
    this._pos = 0;
  }

  /**
   * Parse the token stream into an AST.
   */
  parse(): ASTNode {
    const node = this.parseExpression();

    if (this.current().type !== 'EOF') {
      throw new FormulaParseError(
        `Unexpected token: "${this.current().value}" at position ${this.current().position}`,
      );
    }

    return node;
  }

  private current(): Token {
    return this._tokens[this._pos] ?? { type: 'EOF', value: '', position: -1 };
  }

  private advance(): Token {
    const token = this.current();
    this._pos++;
    return token;
  }

  private expect(type: Token['type']): Token {
    const token = this.current();
    if (token.type !== type) {
      throw new FormulaParseError(
        `Expected ${type} but found ${token.type} ("${token.value}") at position ${token.position}`,
      );
    }
    return this.advance();
  }

  private parseExpression(): ASTNode {
    return this.parseComparison();
  }

  private parseComparison(): ASTNode {
    let left = this.parseAddition();

    while (this.current().type === 'COMPARISON') {
      const op = this.advance().value;
      const right = this.parseAddition();
      left = { type: 'BinaryOp', operator: op, left, right };
    }

    return left;
  }

  private parseAddition(): ASTNode {
    let left = this.parseMultiplication();

    while (
      this.current().type === 'OPERATOR' &&
      (this.current().value === '+' || this.current().value === '-')
    ) {
      const op = this.advance().value;
      const right = this.parseMultiplication();
      left = { type: 'BinaryOp', operator: op, left, right };
    }

    return left;
  }

  private parseMultiplication(): ASTNode {
    let left = this.parseUnary();

    while (
      this.current().type === 'OPERATOR' &&
      (this.current().value === '*' || this.current().value === '/')
    ) {
      const op = this.advance().value;
      const right = this.parseUnary();
      left = { type: 'BinaryOp', operator: op, left, right };
    }

    return left;
  }

  private parseUnary(): ASTNode {
    if (
      this.current().type === 'OPERATOR' &&
      this.current().value === '-'
    ) {
      this.advance();
      const operand = this.parseUnary();
      return { type: 'UnaryOp', operator: '-', operand };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ASTNode {
    const token = this.current();

    switch (token.type) {
      case 'NUMBER': {
        this.advance();
        return { type: 'NumberLiteral', value: parseFloat(token.value) };
      }

      case 'STRING': {
        this.advance();
        return { type: 'StringLiteral', value: token.value };
      }

      case 'CELL_REF': {
        this.advance();
        // Check if this is a range (CELL_REF : CELL_REF)
        if (this.current().type === 'COLON') {
          this.advance(); // consume ':'
          const endToken = this.expect('CELL_REF');
          return { type: 'RangeRef', start: token.value, end: endToken.value };
        }
        return { type: 'CellRef', cellId: token.value };
      }

      case 'FUNCTION_NAME': {
        return this.parseFunctionCall();
      }

      case 'PAREN_OPEN': {
        this.advance(); // consume '('
        const expr = this.parseExpression();
        this.expect('PAREN_CLOSE');
        return expr;
      }

      default:
        throw new FormulaParseError(
          `Unexpected token: "${token.value}" (${token.type}) at position ${token.position}`,
        );
    }
  }

  private parseFunctionCall(): ASTNode {
    const nameToken = this.advance(); // consume function name
    this.expect('PAREN_OPEN');

    const args: ASTNode[] = [];

    if (this.current().type !== 'PAREN_CLOSE') {
      args.push(this.parseExpression());

      while (this.current().type === 'COMMA') {
        this.advance(); // consume ','
        args.push(this.parseExpression());
      }
    }

    this.expect('PAREN_CLOSE');

    return { type: 'FunctionCall', name: nameToken.value, args };
  }
}
