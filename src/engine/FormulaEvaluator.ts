/**
 * FormulaEvaluator — Evaluates an AST node given a cell context.
 *
 * The evaluator is stateless: it receives a context (map of cellId → value)
 * and evaluates the AST purely based on that context.
 */

import type { ASTNode } from './FormulaParser';
import { expandRange } from './FormulaParser';
import {
  DivisionByZeroError,
  InvalidReferenceError,
  ValueTypeError,
  SpreadsheetError,
} from './errors';

/**
 * Context provided to the evaluator: a function that resolves a cell ID
 * to its computed numeric/string value.
 */
export type CellContext = (cellId: string) => number | string;

export class FormulaEvaluator {
  private readonly _context: CellContext;

  constructor(context: CellContext) {
    this._context = context;
  }

  /**
   * Evaluate an AST node and return the result.
   */
  evaluate(node: ASTNode): number | string {
    switch (node.type) {
      case 'NumberLiteral':
        return node.value;

      case 'StringLiteral':
        return node.value;

      case 'CellRef':
        return this.resolveCell(node.cellId);

      case 'RangeRef':
        // A bare range (not inside a function) returns the first cell value
        return this.resolveCell(expandRange(node.start, node.end)[0]);

      case 'BinaryOp':
        return this.evaluateBinaryOp(node.operator, node.left, node.right);

      case 'UnaryOp':
        return this.evaluateUnaryOp(node.operator, node.operand);

      case 'FunctionCall':
        return this.evaluateFunction(node.name, node.args);
    }
  }

  private resolveCell(cellId: string): number | string {
    try {
      return this._context(cellId);
    } catch (e) {
      if (e instanceof SpreadsheetError) throw e;
      throw new InvalidReferenceError(cellId);
    }
  }

  private toNumber(value: number | string): number {
    if (typeof value === 'number') return value;
    const num = Number(value);
    if (isNaN(num)) {
      throw new ValueTypeError(`Cannot convert "${value}" to number`);
    }
    return num;
  }

  private evaluateBinaryOp(op: string, leftNode: ASTNode, rightNode: ASTNode): number | string {
    const left = this.evaluate(leftNode);
    const right = this.evaluate(rightNode);

    // String concatenation with &
    if (op === '&') {
      return String(left) + String(right);
    }

    // Comparison operators can work with strings too
    if (['>', '<', '>=', '<=', '=', '<>'].includes(op)) {
      return this.evaluateComparison(op, left, right);
    }

    // Arithmetic requires numbers
    const l = this.toNumber(left);
    const r = this.toNumber(right);

    switch (op) {
      case '+': return l + r;
      case '-': return l - r;
      case '*': return l * r;
      case '/':
        if (r === 0) throw new DivisionByZeroError();
        return l / r;
      default:
        throw new ValueTypeError(`Unknown operator: ${op}`);
    }
  }

  private evaluateComparison(op: string, left: number | string, right: number | string): number {
    let result: boolean;
    const l = typeof left === 'number' ? left : left.toLowerCase();
    const r = typeof right === 'number' ? right : right.toLowerCase();

    switch (op) {
      case '>':  result = l > r; break;
      case '<':  result = l < r; break;
      case '>=': result = l >= r; break;
      case '<=': result = l <= r; break;
      case '=':  result = l === r; break;
      case '<>': result = l !== r; break;
      default:   result = false;
    }

    return result ? 1 : 0;
  }

  private evaluateUnaryOp(op: string, operandNode: ASTNode): number {
    const operand = this.evaluate(operandNode);
    const num = this.toNumber(operand);

    switch (op) {
      case '-': return -num;
      default:
        throw new ValueTypeError(`Unknown unary operator: ${op}`);
    }
  }

  /**
   * Expand function arguments: if an arg is a RangeRef, expand to individual cells.
   */
  private expandArgs(args: ASTNode[]): (number | string)[] {
    const values: (number | string)[] = [];
    for (const arg of args) {
      if (arg.type === 'RangeRef') {
        const cells = expandRange(arg.start, arg.end);
        for (const cellId of cells) {
          values.push(this.resolveCell(cellId));
        }
      } else {
        values.push(this.evaluate(arg));
      }
    }
    return values;
  }

  private evaluateFunction(name: string, args: ASTNode[]): number | string {
    switch (name) {
      case 'SUM': {
        const values = this.expandArgs(args);
        let sum = 0;
        for (const v of values) {
          if (typeof v === 'number') sum += v;
          else if (v !== '') sum += this.toNumber(v);
        }
        return sum;
      }

      case 'AVERAGE':
      case 'AVG': {
        const values = this.expandArgs(args);
        const nums = values.filter((v): v is number => typeof v === 'number');
        if (nums.length === 0) throw new DivisionByZeroError();
        return nums.reduce((a, b) => a + b, 0) / nums.length;
      }

      case 'MAX': {
        const values = this.expandArgs(args);
        const nums = values.filter((v): v is number => typeof v === 'number');
        if (nums.length === 0) return 0;
        return Math.max(...nums);
      }

      case 'MIN': {
        const values = this.expandArgs(args);
        const nums = values.filter((v): v is number => typeof v === 'number');
        if (nums.length === 0) return 0;
        return Math.min(...nums);
      }

      case 'COUNT': {
        const values = this.expandArgs(args);
        return values.filter((v) => typeof v === 'number').length;
      }

      case 'IF': {
        if (args.length < 2 || args.length > 3) {
          throw new ValueTypeError('IF requires 2 or 3 arguments');
        }
        const condition = this.evaluate(args[0]);
        const isTruthy = typeof condition === 'number' ? condition !== 0 : condition !== '';
        if (isTruthy) {
          return this.evaluate(args[1]);
        }
        return args.length === 3 ? this.evaluate(args[2]) : 0;
      }

      case 'ABS': {
        if (args.length !== 1) throw new ValueTypeError('ABS requires 1 argument');
        return Math.abs(this.toNumber(this.evaluate(args[0])));
      }

      case 'ROUND': {
        if (args.length < 1 || args.length > 2) {
          throw new ValueTypeError('ROUND requires 1 or 2 arguments');
        }
        const val = this.toNumber(this.evaluate(args[0]));
        const decimals = args.length === 2 ? this.toNumber(this.evaluate(args[1])) : 0;
        const factor = Math.pow(10, decimals);
        return Math.round(val * factor) / factor;
      }

      case 'INT': {
        if (args.length !== 1) throw new ValueTypeError('INT requires 1 argument');
        return Math.floor(this.toNumber(this.evaluate(args[0])));
      }

      case 'MOD': {
        if (args.length !== 2) throw new ValueTypeError('MOD requires 2 arguments');
        const dividend = this.toNumber(this.evaluate(args[0]));
        const divisor = this.toNumber(this.evaluate(args[1]));
        if (divisor === 0) throw new DivisionByZeroError();
        return dividend % divisor;
      }

      case 'POWER': {
        if (args.length !== 2) throw new ValueTypeError('POWER requires 2 arguments');
        const base = this.toNumber(this.evaluate(args[0]));
        const exp = this.toNumber(this.evaluate(args[1]));
        return Math.pow(base, exp);
      }

      case 'SQRT': {
        if (args.length !== 1) throw new ValueTypeError('SQRT requires 1 argument');
        const val = this.toNumber(this.evaluate(args[0]));
        if (val < 0) throw new ValueTypeError('SQRT does not accept negative numbers');
        return Math.sqrt(val);
      }

      default:
        throw new ValueTypeError(`Unknown function: ${name}`);
    }
  }
}
