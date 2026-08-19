import { describe, it, expect } from 'vitest';
import { FormulaTokenizer } from '../FormulaTokenizer';
import { FormulaParser, extractCellRefs } from '../FormulaParser';

describe('FormulaParser', () => {
  it('parses operator precedence correctly (multiplication over addition)', () => {
    const tokens = new FormulaTokenizer('=1+2*3').tokenize();
    const parser = new FormulaParser(tokens);
    const ast = parser.parse();

    expect(ast).toEqual({
      type: 'BinaryOp',
      operator: '+',
      left: { type: 'NumberLiteral', value: 1 },
      right: {
        type: 'BinaryOp',
        operator: '*',
        left: { type: 'NumberLiteral', value: 2 },
        right: { type: 'NumberLiteral', value: 3 },
      },
    });
  });

  it('parses nested function calls and range references', () => {
    const tokens = new FormulaTokenizer('=SUM(A1:B2, C3+1)').tokenize();
    const parser = new FormulaParser(tokens);
    const ast = parser.parse();

    expect(ast.type).toBe('FunctionCall');
    if (ast.type === 'FunctionCall') {
      expect(ast.name).toBe('SUM');
      expect(ast.args).toHaveLength(2);
      expect(ast.args[0]).toEqual({ type: 'RangeRef', start: 'A1', end: 'B2' });
      expect(ast.args[1].type).toBe('BinaryOp');
    }

    const refs = extractCellRefs(ast);
    expect(refs).toContain('A1');
    expect(refs).toContain('A2');
    expect(refs).toContain('B1');
    expect(refs).toContain('B2');
    expect(refs).toContain('C3');
  });
});
