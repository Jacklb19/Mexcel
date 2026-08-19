import { describe, it, expect } from 'vitest';
import { FormulaTokenizer } from '../FormulaTokenizer';

describe('FormulaTokenizer', () => {
  it('tokenizes simple arithmetic formulas', () => {
    const tokenizer = new FormulaTokenizer('=A1+B2*3');
    const tokens = tokenizer.tokenize();

    expect(tokens).toEqual([
      { type: 'CELL_REF', value: 'A1', position: 0 },
      { type: 'OPERATOR', value: '+', position: 2 },
      { type: 'CELL_REF', value: 'B2', position: 3 },
      { type: 'OPERATOR', value: '*', position: 5 },
      { type: 'NUMBER', value: '3', position: 6 },
      { type: 'EOF', value: '', position: 7 },
    ]);
  });

  it('tokenizes functions and ranges', () => {
    const tokenizer = new FormulaTokenizer('=SUM(A1:B10, 5)');
    const tokens = tokenizer.tokenize();

    expect(tokens).toEqual([
      { type: 'FUNCTION_NAME', value: 'SUM', position: 0 },
      { type: 'PAREN_OPEN', value: '(', position: 3 },
      { type: 'CELL_REF', value: 'A1', position: 4 },
      { type: 'COLON', value: ':', position: 6 },
      { type: 'CELL_REF', value: 'B10', position: 7 },
      { type: 'COMMA', value: ',', position: 10 },
      { type: 'NUMBER', value: '5', position: 12 },
      { type: 'PAREN_CLOSE', value: ')', position: 13 },
      { type: 'EOF', value: '', position: 14 },
    ]);
  });

  it('tokenizes comparison operators', () => {
    const tokenizer = new FormulaTokenizer('=IF(A1>=10, "High", "Low")');
    const tokens = tokenizer.tokenize();

    expect(tokens).toEqual([
      { type: 'FUNCTION_NAME', value: 'IF', position: 0 },
      { type: 'PAREN_OPEN', value: '(', position: 2 },
      { type: 'CELL_REF', value: 'A1', position: 3 },
      { type: 'COMPARISON', value: '>=', position: 5 },
      { type: 'NUMBER', value: '10', position: 7 },
      { type: 'COMMA', value: ',', position: 9 },
      { type: 'STRING', value: 'High', position: 11 },
      { type: 'COMMA', value: ',', position: 17 },
      { type: 'STRING', value: 'Low', position: 19 },
      { type: 'PAREN_CLOSE', value: ')', position: 24 },
      { type: 'EOF', value: '', position: 25 },
    ]);
  });
});
