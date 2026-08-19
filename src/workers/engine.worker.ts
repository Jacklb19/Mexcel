/**
 * Web Worker for off-main-thread spreadsheet recalculation.
 *
 * Maintains its own SpreadsheetEngine instance and runs the full
 * recalculation synchronously (since we're already off the main thread).
 */

import { SpreadsheetEngine } from '../engine/SpreadsheetEngine';
import { SyncRecalculationStrategy } from '../engine/strategies/SyncRecalculationStrategy';
import type { WorkerRequest, WorkerResponse } from '../engine/strategies/WorkerRecalculationStrategy';

let engine: SpreadsheetEngine | null = null;

function sendMessage(msg: WorkerResponse): void {
  self.postMessage(msg);
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { type } = event.data;

  switch (type) {
    case 'init': {
      const { snapshot } = event.data;
      if (!snapshot) {
        sendMessage({ type: 'error', errorMessage: 'No snapshot provided for init' });
        return;
      }

      // Create a new engine with sync strategy (safe in worker — won't block main thread)
      engine = new SpreadsheetEngine(new SyncRecalculationStrategy());
      engine.deserialize(snapshot);

      sendMessage({ type: 'ready' });
      break;
    }

    case 'recalculate': {
      if (!engine) {
        sendMessage({ type: 'error', errorMessage: 'Engine not initialized' });
        return;
      }

      const { changedCellIds } = event.data;
      if (!changedCellIds) {
        sendMessage({ type: 'error', errorMessage: 'No changed cells provided' });
        return;
      }

      try {
        const results = await engine.recalculate(
          changedCellIds,
          (completed, total) => {
            sendMessage({ type: 'progress', completed, total });
          },
        );

        const resultArray = Array.from(results.values());
        sendMessage({ type: 'result', results: resultArray });
      } catch (e) {
        sendMessage({
          type: 'error',
          errorMessage: e instanceof Error ? e.message : String(e),
        });
      }
      break;
    }
  }
};

// Signal that the worker is ready
sendMessage({ type: 'ready' });
