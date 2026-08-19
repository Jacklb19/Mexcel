import { describe, it, expect } from 'vitest';
import { FormulaTokenizer } from '../FormulaTokenizer';
import { FormulaParser } from '../FormulaParser';
import { FormulaEvaluator } from '../FormulaEvaluator';

describe('FormulaEvaluator', () => {
  const context = (cellId: string) => {
    const data: Record<string, number | string> = {
      A1: 10,
      A2: 20,
      A3: 30,
      B1: 5,
      B2: 'Hello',
    };
    return data[cellId] ?? 0;
  };

  const evaluateFormula = (formulaStr: string) => {
    const tokens = new FormulaTokenizer(formulaStr).tokenize();
    const ast = new FormulaParser(tokens).parse();
    const evaluator = new FormulaEvaluator(context);
    return evaluator.evaluate(ast);
  };

  it('evaluates basic arithmetic expressions', () => {
    expect(evaluateFormula('=A1 + B1 * 2')).toBe(20);
    expect(evaluateFormula('=(A1 + A2) / 2')).toBe(15);
  });

  it('evaluates aggregate functions SUM, AVERAGE, MAX, MIN, COUNT', () => {
    expect(evaluateFormula('=SUM(A1:A3)')).toBe(60);
    expect(evaluateFormula('=AVERAGE(A1:A3)')).toBe(20);
    expect(evaluateFormula('=MAX(A1:A3)')).toBe(30);
    expect(evaluateFormula('=MIN(A1:A3)')).toBe(10);
    expect(evaluateFormula('=COUNT(A1:A3)')).toBe(3);
  });

  it('evaluates conditional IF expressions', () => {
    expect(evaluateFormula('=IF(A1 > B1, 100, 200)')).toBe(100);
    expect(evaluateFormula('=IF(A1 < B1, 100, 200)')).toBe(200);
  });
});
