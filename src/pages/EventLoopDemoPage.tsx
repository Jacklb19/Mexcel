import React, { useState } from 'react';

interface ExecutionLog {
  id: number;
  order: number;
  message: string;
  type: 'sync' | 'microtask' | 'macrotask' | 'render';
  timestamp: string;
}

export const EventLoopDemoPage: React.FC = () => {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDemo = () => {
    setLogs([]);
    setIsRunning(true);

    const tempLogs: ExecutionLog[] = [];
    let counter = 1;

    const addLog = (
      message: string,
      type: 'sync' | 'microtask' | 'macrotask' | 'render',
    ) => {
      tempLogs.push({
        id: Math.random(),
        order: counter++,
        message,
        type,
        timestamp: `${performance.now().toFixed(2)}ms`,
      });
      // Trigger update
      setLogs([...tempLogs]);
    };

    // 1. Synchronous execution
    addLog('1: Synchronous Call Stack (Start)', 'sync');

    // 2. Schedule Macrotask via setTimeout
    setTimeout(() => {
      addLog('5: Macrotask from Timer Queue (setTimeout 0ms)', 'macrotask');
      setIsRunning(false);
    }, 0);

    // 3. Schedule Microtask via Promise
    Promise.resolve().then(() => {
      addLog('3: Microtask from Promise Queue (Promise.resolve().then)', 'microtask');
    });

    // 4. Schedule Microtask via queueMicrotask
    queueMicrotask(() => {
      addLog('4: Microtask from Microtask Queue (queueMicrotask)', 'microtask');
    });

    // 5. Schedule Animation Frame
    requestAnimationFrame(() => {
      addLog('Rendering Step / Paint Opportunity (requestAnimationFrame)', 'render');
    });

    // 6. Synchronous end
    addLog('2: Synchronous Call Stack (End of Script)', 'sync');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 text-slate-800 dark:text-slate-200">
      {/* Header */}
      <div className="space-y-2 text-center sm:text-left">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          🔬 Event Loop Live Laboratory
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Observe and capture the real runtime execution ordering of Call Stack, Microtasks, Render frames, and Macrotasks.
        </p>
      </div>

      {/* Code Card and Run Button */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Code Snippet */}
        <div className="p-5 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-emerald-400">
              demo-event-loop.js
            </span>
            <button
              type="button"
              onClick={runDemo}
              disabled={isRunning}
              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg shadow transition flex items-center gap-1.5"
            >
              <span>{isRunning ? '⏳ Running...' : '▶ Run Code'}</span>
            </button>
          </div>

          <pre className="text-[12px] font-mono leading-relaxed overflow-x-auto text-slate-300">
            <code>{`console.log('1: Sync script start');

setTimeout(() => {
  console.log('Macrotask: setTimeout');
}, 0);

Promise.resolve().then(() => {
  console.log('Microtask: Promise.then');
});

queueMicrotask(() => {
  console.log('Microtask: queueMicrotask');
});

console.log('2: Sync script end');`}</code>
          </pre>
        </div>

        {/* Right: Captured Execution Log */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-3 flex flex-col">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Captured Execution Stream
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              {logs.length} events
            </span>
          </div>

          <div className="flex-1 min-h-[220px] max-h-[300px] overflow-y-auto space-y-2 pr-1">
            {logs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                Click &quot;▶ Run Code&quot; to execute and inspect the Event Loop queue resolution.
              </div>
            ) : (
              logs.map((log) => {
                let badgeStyle = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';
                if (log.type === 'sync') {
                  badgeStyle = 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800';
                } else if (log.type === 'microtask') {
                  badgeStyle = 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800';
                } else if (log.type === 'macrotask') {
                  badgeStyle = 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800';
                } else if (log.type === 'render') {
                  badgeStyle = 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
                }

                return (
                  <div
                    key={log.id}
                    className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs font-mono transition-all animate-in fade-in slide-in-from-left-2 ${badgeStyle}`}
                  >
                    <span className="font-bold min-w-[20px] text-center">{log.order}.</span>
                    <div className="flex-1">
                      <p className="font-semibold">{log.message}</p>
                      <span className="text-[10px] opacity-75">Queue: {log.type}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Deep Dive Explanation */}
      <div className="p-6 bg-slate-100 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-xs leading-relaxed">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          💡 Why does this happen? The HTML Event Loop Invariant
        </h2>
        <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
          <li>
            <strong>Call Stack:</strong> The synchronous JavaScript runs uninterrupted until completion.
          </li>
          <li>
            <strong>Microtask Checkpoint:</strong> Immediately after the call stack empties, the browser{' '}
            <em>must drain the entire microtask queue</em> before picking any new macrotask or updating the screen.
          </li>
          <li>
            <strong>Render / Paint:</strong> The browser calculates layout and paints only when the main thread is idle
            and microtasks are empty.
          </li>
          <li>
            <strong>Macrotasks:</strong> <code>setTimeout</code> or DOM events wait in the task queue for the next loop iteration.
          </li>
        </ul>
      </div>
    </div>
  );
};
