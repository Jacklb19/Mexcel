import { describe, it, expect } from 'vitest';
import { SpreadsheetEngine } from '../SpreadsheetEngine';
import { SyncRecalculationStrategy } from '../strategies/SyncRecalculationStrategy';
import { ChunkedRecalculationStrategy } from '../strategies/ChunkedRecalculationStrategy';

describe('SpreadsheetEngine', () => {
  it('manages cell setting and evaluates simple cascades', async () => {
    const engine = new SpreadsheetEngine(new SyncRecalculationStrategy());
    engine.setCellRawInput('A1', '10');
    engine.setCellRawInput('A2', '=A1 * 2');
    engine.setCellRawInput('A3', '=A2 + 5');

    // Initial evaluation
    expect(engine.getCellData('A1').computedValue).toBe(10);
    expect(engine.getCellData('A2').computedValue).toBe(20);
    expect(engine.getCellData('A3').computedValue).toBe(25);

    // Update A1 and recalculate
    engine.setCellRawInput('A1', '50');
    await engine.recalculate(['A1']);

    expect(engine.getCellData('A1').computedValue).toBe(50);
    expect(engine.getCellData('A2').computedValue).toBe(100);
    expect(engine.getCellData('A3').computedValue).toBe(105);
  });

  it('handles circular references gracefully with #CICLO!', () => {
    const engine = new SpreadsheetEngine(new SyncRecalculationStrategy());
    engine.setCellRawInput('A1', '=B1');
    engine.setCellRawInput('B1', '=A1');

    expect(engine.getCellData('B1').error).toBe('#CICLO!');
  });

  it('works with ChunkedRecalculationStrategy', async () => {
    const engine = new SpreadsheetEngine(new ChunkedRecalculationStrategy(2));
    engine.setCellRawInput('A1', '10');
    engine.setCellRawInput('B1', '=A1 + 1');
    engine.setCellRawInput('C1', '=B1 + 1');
    engine.setCellRawInput('D1', '=C1 + 1');

    await engine.recalculate(['A1']);

    expect(engine.getCellData('D1').computedValue).toBe(13);
  });
});
