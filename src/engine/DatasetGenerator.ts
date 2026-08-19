/**
 * DatasetGenerator — Creates realistic and stress-test datasets.
 *
 * Generates a budget/inventory spreadsheet with meaningful data,
 * plus configurable stress-load cells with chained formulas.
 */

import type { SpreadsheetEngine } from './SpreadsheetEngine';
import { toCellId } from './FormulaParser';

/** Budget item for the realistic dataset */
interface BudgetItem {
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
}

const BUDGET_ITEMS: BudgetItem[] = [
  { name: 'Laptop Dell XPS 15', category: 'Equipment', quantity: 5, unitPrice: 1299.99 },
  { name: 'Monitor 27" 4K', category: 'Equipment', quantity: 10, unitPrice: 449.99 },
  { name: 'Mechanical Keyboard', category: 'Peripherals', quantity: 15, unitPrice: 89.99 },
  { name: 'Wireless Mouse', category: 'Peripherals', quantity: 15, unitPrice: 39.99 },
  { name: 'USB-C Hub', category: 'Peripherals', quantity: 10, unitPrice: 59.99 },
  { name: 'Webcam HD 1080p', category: 'Peripherals', quantity: 8, unitPrice: 79.99 },
  { name: 'Headset Noise-Cancel', category: 'Audio', quantity: 12, unitPrice: 159.99 },
  { name: 'Desk Lamp LED', category: 'Furniture', quantity: 15, unitPrice: 34.99 },
  { name: 'Ergonomic Chair', category: 'Furniture', quantity: 5, unitPrice: 599.99 },
  { name: 'Standing Desk', category: 'Furniture', quantity: 3, unitPrice: 799.99 },
  { name: 'Whiteboard 4x6', category: 'Office', quantity: 2, unitPrice: 189.99 },
  { name: 'Printer Laser Color', category: 'Equipment', quantity: 2, unitPrice: 349.99 },
  { name: 'Paper A4 (500 sheets)', category: 'Supplies', quantity: 50, unitPrice: 8.99 },
  { name: 'Sticky Notes Pack', category: 'Supplies', quantity: 30, unitPrice: 5.99 },
  { name: 'Pen Set (12 pcs)', category: 'Supplies', quantity: 20, unitPrice: 12.99 },
  { name: 'Cable Management Kit', category: 'Office', quantity: 10, unitPrice: 19.99 },
  { name: 'Monitor Stand', category: 'Furniture', quantity: 10, unitPrice: 49.99 },
  { name: 'Ethernet Cable 3m', category: 'Network', quantity: 20, unitPrice: 7.99 },
  { name: 'Wi-Fi Router Pro', category: 'Network', quantity: 2, unitPrice: 199.99 },
  { name: 'External SSD 1TB', category: 'Storage', quantity: 5, unitPrice: 119.99 },
  { name: 'USB Flash Drive 64GB', category: 'Storage', quantity: 25, unitPrice: 14.99 },
  { name: 'Surge Protector 8-Outlet', category: 'Electrical', quantity: 10, unitPrice: 29.99 },
  { name: 'Extension Cord 3m', category: 'Electrical', quantity: 15, unitPrice: 12.99 },
  { name: 'Screen Protector 15"', category: 'Accessories', quantity: 5, unitPrice: 19.99 },
  { name: 'Laptop Sleeve 15"', category: 'Accessories', quantity: 10, unitPrice: 24.99 },
  { name: 'Webcam Cover', category: 'Accessories', quantity: 20, unitPrice: 4.99 },
  { name: 'HDMI Cable 2m', category: 'Cables', quantity: 15, unitPrice: 11.99 },
  { name: 'DisplayPort Cable', category: 'Cables', quantity: 10, unitPrice: 14.99 },
  { name: 'USB-C Cable 1m', category: 'Cables', quantity: 20, unitPrice: 9.99 },
  { name: 'Desk Organizer', category: 'Office', quantity: 10, unitPrice: 22.99 },
];

const TAX_RATE = 0.16;

export class DatasetGenerator {
  /**
   * Generate a realistic budget/inventory spreadsheet.
   * Columns: A=Item, B=Category, C=Quantity, D=Unit Price, E=Subtotal, F=Tax, G=Total
   */
  static generateBudgetDataset(engine: SpreadsheetEngine): void {
    // Headers (row 1)
    engine.setCellRawInput('A1', 'Item');
    engine.setCellRawInput('B1', 'Category');
    engine.setCellRawInput('C1', 'Quantity');
    engine.setCellRawInput('D1', 'Unit Price');
    engine.setCellRawInput('E1', 'Subtotal');
    engine.setCellRawInput('F1', 'Tax (16%)');
    engine.setCellRawInput('G1', 'Total');

    // Data rows (starting from row 2)
    for (let i = 0; i < BUDGET_ITEMS.length; i++) {
      const row = i + 2;
      const item = BUDGET_ITEMS[i];
      engine.setCellRawInput(`A${row}`, item.name);
      engine.setCellRawInput(`B${row}`, item.category);
      engine.setCellRawInput(`C${row}`, String(item.quantity));
      engine.setCellRawInput(`D${row}`, String(item.unitPrice));
      // Subtotal = Quantity * Unit Price
      engine.setCellRawInput(`E${row}`, `=C${row}*D${row}`);
      // Tax = Subtotal * tax rate
      engine.setCellRawInput(`F${row}`, `=E${row}*${TAX_RATE}`);
      // Total = Subtotal + Tax
      engine.setCellRawInput(`G${row}`, `=E${row}+F${row}`);
    }

    const lastDataRow = BUDGET_ITEMS.length + 1;
    const summaryRow = lastDataRow + 2; // Leave a blank row

    // Summary section
    engine.setCellRawInput(`A${summaryRow}`, 'SUMMARY');
    engine.setCellRawInput(`A${summaryRow + 1}`, 'Grand Total');
    engine.setCellRawInput(`E${summaryRow + 1}`, `=SUM(E2:E${lastDataRow})`);
    engine.setCellRawInput(`F${summaryRow + 1}`, `=SUM(F2:F${lastDataRow})`);
    engine.setCellRawInput(`G${summaryRow + 1}`, `=SUM(G2:G${lastDataRow})`);

    engine.setCellRawInput(`A${summaryRow + 2}`, 'Average');
    engine.setCellRawInput(`E${summaryRow + 2}`, `=AVERAGE(E2:E${lastDataRow})`);
    engine.setCellRawInput(`G${summaryRow + 2}`, `=AVERAGE(G2:G${lastDataRow})`);

    engine.setCellRawInput(`A${summaryRow + 3}`, 'Max');
    engine.setCellRawInput(`E${summaryRow + 3}`, `=MAX(E2:E${lastDataRow})`);
    engine.setCellRawInput(`G${summaryRow + 3}`, `=MAX(G2:G${lastDataRow})`);

    engine.setCellRawInput(`A${summaryRow + 4}`, 'Min');
    engine.setCellRawInput(`E${summaryRow + 4}`, `=MIN(E2:E${lastDataRow})`);
    engine.setCellRawInput(`G${summaryRow + 4}`, `=MIN(G2:G${lastDataRow})`);

    engine.setCellRawInput(`A${summaryRow + 5}`, 'Item Count');
    engine.setCellRawInput(`E${summaryRow + 5}`, `=COUNT(E2:E${lastDataRow})`);

    // Evaluate all formulas
    engine.evaluateAllFormulas();

    // Ensure grid is big enough
    engine.ensureSize(summaryRow + 10, 10);
  }

  /**
   * Generate N stress-load cells with chained formulas.
   * Each cell depends on the previous one, creating a cascade.
   * Placed starting from column I (index 8), row 2 onwards.
   */
  static generateStressLoad(engine: SpreadsheetEngine, count: number): void {
    const startCol = 8; // Column I
    const startRow = 1; // Row 2 (0-indexed row 1)

    // Header
    engine.setCellRawInput(toCellId(startCol, 0), 'Stress Test Chain');
    engine.setCellRawInput(toCellId(startCol + 1, 0), 'Accumulated');

    // First cell: a simple value
    const firstCellId = toCellId(startCol, startRow);
    engine.setCellRawInput(firstCellId, '1');

    // Create chain: each cell references the previous one
    for (let i = 1; i < count; i++) {
      const row = startRow + i;
      const col = startCol;
      const cellId = toCellId(col, row);
      const prevCellId = toCellId(col, row - 1);

      // Alternate between different formulas to make it more realistic
      if (i % 5 === 0) {
        // Every 5th cell: multiply by a factor
        engine.setCellRawInput(cellId, `=${prevCellId}*1.01`);
      } else if (i % 3 === 0) {
        // Every 3rd cell: add a constant
        engine.setCellRawInput(cellId, `=${prevCellId}+0.5`);
      } else {
        // Default: simple reference + 1
        engine.setCellRawInput(cellId, `=${prevCellId}+1`);
      }

      // Also create an accumulated column that references both
      if (i > 0) {
        const accCellId = toCellId(startCol + 1, row);
        const prevAccCellId = toCellId(startCol + 1, row - 1);
        if (i === 1) {
          engine.setCellRawInput(accCellId, `=${cellId}`);
        } else {
          engine.setCellRawInput(accCellId, `=${prevAccCellId}+${cellId}`);
        }
      }
    }

    // Ensure grid is large enough
    engine.ensureSize(startRow + count + 5, startCol + 3);
  }
}
