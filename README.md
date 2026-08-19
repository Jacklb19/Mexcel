# Mini-Excel — Event Loop & INP Laboratory

An educational, fully-featured, production-ready spreadsheet application and browser performance case study designed to observe, measure, and dissect **Interaction to Next Paint (INP)**, Long Tasks, and the **HTML Event Loop**.

---

## 🎯 Project Objectives

1. **Event Loop Mechanics**: Observe how synchronous code, microtask checkpoints (`Promise`, `queueMicrotask`), render/paint cycles, and macrotasks (`setTimeout`, `postTask`) execute in real time.
2. **INP Optimization**: Measure INP degradation and improvements in real time using the **Event Timing API** via `web-vitals`.
3. **Strategies for Heavy Cascades**: Compare 3 different architectural approaches for the same formula recalculation engine:
   - **`/bad` — Synchronous / Blocking**: Recalculates the full dependency tree synchronously on the main thread inside event handlers.
   - **`/good` — Concurrent & Chunked**: Batches calculation using `scheduler.postTask` yields, paired with React 19's `startTransition` and `useDeferredValue`.
   - **`/worker` — Off-Main-Thread**: Offloads the entire calculation cascade to a dedicated background **Web Worker**.

---

## 🏗️ Architecture & OOP Design

The core engine is isolated in `src/engine/` with zero React dependencies:

```
src/
├── engine/
│   ├── Cell.ts                 # Encapsulated Cell entity (state, rawInput, errors, AST)
│   ├── FormulaTokenizer.ts     # Lexer tokenizing formulas (=A1+SUM(B1:B10)*2)
│   ├── FormulaParser.ts        # Recursive descent parser constructing typed ASTs
│   ├── FormulaEvaluator.ts     # Stateless AST evaluator with function support
│   ├── DependencyGraph.ts      # Bidirectional graph + Kahn's topological sort + cycle detection
│   ├── SpreadsheetEngine.ts    # Facade orchestrating Tokenizer, Parser, Evaluator, Graph
│   ├── DatasetGenerator.ts     # Generates realistic budget/inventory + stress load chains
│   ├── errors.ts               # Domain errors (#CICLO!, #REF!, #VALOR!, #DIV/0!)
│   ├── commands/               # Command Pattern for Undo/Redo
│   │   ├── EditCellCommand.ts
│   │   └── CommandHistory.ts
│   └── strategies/             # Strategy Pattern (Dependency Injection)
│       ├── RecalculationStrategy.ts
│       ├── SyncRecalculationStrategy.ts
│       ├── ChunkedRecalculationStrategy.ts
│       └── WorkerRecalculationStrategy.ts
├── workers/
│   └── engine.worker.ts        # Worker maintaining engine instance & computing diffs
├── hooks/
│   ├── useSpreadsheetEngine.ts # Core engine lifecycle & localStorage persistence
│   ├── useKeyboardNavigation.ts # Arrow keys, Tab, Enter, Esc, Ctrl+C/V, Ctrl+Z/Y
│   └── useINPMonitor.ts        # Live INP measurement & LongTask observer
└── components/
    ├── SpreadsheetGrid.tsx     # TanStack Virtual 2D virtualized grid
    ├── CellRenderer.tsx        # Individual cell with dependency highlighting
    ├── FormulaBar.tsx          # Excel-style formula bar
    ├── Toolbar.tsx             # Undo/Redo, Save, Reset, Stress Load trigger
    └── PerfBadge.tsx           # Floating real-time INP & Long Tasks monitor
```

---

## 📊 Live INP & Performance Comparison Guide

| Route | Execution Strategy | Main Thread Cost | Expected INP Rating | Long Tasks (>50ms) |
|---|---|---|---|---|
| **`/bad`** | Synchronous Main Thread | High (Blocks UI during cascade) | 🔴 **Poor** (>500ms) | Multiple Long Tasks |
| **`/good`** | Chunked (`postTask`) + React 19 Concurrent | Low (Yields every 200 cells) | 🟡 **Needs Improvement / Good** (<200-300ms) | Significantly Reduced |
| **`/worker`** | Dedicated Web Worker | **0 ms** (Offloaded completely) | 🟢 **Good** (≤200ms) | **0 Long Tasks** |

### 🧪 Step-by-Step Reproduction:
1. Open the app and navigate to [`/bad`](http://localhost:5173/bad).
2. Click **⚡ Generate (2,000 cells)** in the toolbar.
3. Edit cell **`A2`** or **`C2`** to trigger a full cascade recalculation.
4. Check the **PerfBadge** at the bottom-right corner: observe long task spikes and poor INP.
5. Navigate to [`/good`](http://localhost:5173/good) and repeat: observe how chunking and `startTransition` yield to the browser.
6. Navigate to [`/worker`](http://localhost:5173/worker) and repeat: notice immediate UI responsiveness with 0 long tasks on the main thread.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ / 20+
- npm 9+

### Installation
```bash
# Clone repository
git clone <repo-url>
cd mini-excel-inp

# Install dependencies
npm install

# Start development server
npm run dev
```

### Running Tests
```bash
# Run unit test suite
npm run test

# Run linter
npm run lint

# Build for production
npm run build
```

---

## ⌨️ Keyboard Shortcuts & Features
- **Arrow Keys / Tab / Shift+Tab**: Navigate grid cells.
- **Enter / Double-Click / F2**: Enter cell edit mode.
- **Escape**: Cancel active edit without saving.
- **Delete / Backspace**: Clear cell contents.
- **Ctrl+C / Ctrl+V**: Copy and paste cells.
- **Ctrl+Z / Ctrl+Y**: Undo and Redo operations (Command pattern).
- **Dependency Highlighting**: Green border indicates referenced inputs; purple border indicates affected dependents.
- **LocalStorage Persistence**: Edits and stress tests automatically persist across browser reloads.
