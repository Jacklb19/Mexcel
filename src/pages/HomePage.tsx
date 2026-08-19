import React from 'react';
import { Link } from 'react-router';

export const HomePage: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-12 text-slate-800 dark:text-slate-200">
      {/* Hero Header */}
      <section className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
          <span>🚀</span> Browser Performance Lab & Case Study
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Mini-Excel: Event Loop & INP Lab
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400">
          A real, functional spreadsheet engine built from scratch to observe, measure, and dissect
          browser main thread blocking, task scheduling, and <strong>Interaction to Next Paint (INP)</strong>.
        </p>
      </section>

      {/* 3 Strategy Variant Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* /bad */}
        <div className="flex flex-col justify-between p-6 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 shadow-lg shadow-rose-500/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 px-3 py-1 bg-rose-500 text-white font-bold text-[10px] uppercase rounded-bl-lg">
            Synchronous
          </div>
          <div className="space-y-3">
            <div className="text-3xl">🛑</div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              1. The Blocking UI (<code className="text-rose-600 dark:text-rose-400 text-base">/bad</code>)
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Recalculates the entire dependency tree 100% synchronously inside the input event handler.
              Locks the call stack, starves the event loop, and produces long tasks (&gt;50ms) causing poor INP.
            </p>
          </div>
          <Link
            to="/bad"
            className="mt-6 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow transition"
          >
            Explore /bad →
          </Link>
        </div>

        {/* /good */}
        <div className="flex flex-col justify-between p-6 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 shadow-lg shadow-amber-500/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 px-3 py-1 bg-amber-500 text-white font-bold text-[10px] uppercase rounded-bl-lg">
            Chunked + Concurrent
          </div>
          <div className="space-y-3">
            <div className="text-3xl">⚡</div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              2. Concurrent React (<code className="text-amber-600 dark:text-amber-400 text-base">/good</code>)
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Splits topological calculation into batches and yields control to the main thread with{' '}
              <code>scheduler.postTask</code>. Separates high-priority cell typing from deferred calculation via{' '}
              <code>startTransition</code>.
            </p>
          </div>
          <Link
            to="/good"
            className="mt-6 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow transition"
          >
            Explore /good →
          </Link>
        </div>

        {/* /worker */}
        <div className="flex flex-col justify-between p-6 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 shadow-lg shadow-emerald-500/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 px-3 py-1 bg-emerald-500 text-white font-bold text-[10px] uppercase rounded-bl-lg">
            Web Worker
          </div>
          <div className="space-y-3">
            <div className="text-3xl">🛡️</div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              3. Worker Off-Thread (<code className="text-emerald-600 dark:text-emerald-400 text-base">/worker</code>)
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Delegates the entire formula evaluation cascade to a background Web Worker via <code>postMessage</code>.
              The main thread never freezes, guaranteeing 0ms calculation blocking and pristine INP ratings.
            </p>
          </div>
          <Link
            to="/worker"
            className="mt-6 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow transition"
          >
            Explore /worker →
          </Link>
        </div>
      </section>

      {/* Theoretical Background: Event Loop & INP */}
      <section className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            📚 Core Concepts: Event Loop, Tasks & INP
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            A quick visual and practical reference for understanding browser concurrency.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Microtasks vs Macrotasks */}
          <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
              🔄 Macrotasks vs. Microtasks
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              The browser executes <strong>one macrotask</strong> (e.g. <code>setTimeout</code>, DOM event, <code>postTask</code>),
              then completely drains the <strong>entire microtask queue</strong> (<code>Promise.then</code>, <code>queueMicrotask</code>),
              before deciding whether to run rendering/paint steps.
            </p>
            <div className="p-3 bg-slate-950 text-slate-200 rounded-lg font-mono text-[11px] overflow-x-auto">
              <span className="text-slate-500">// Execution order:</span>
              <br />
              1. Current Synchronous Call Stack
              <br />
              2. All Microtasks (Promise, queueMicrotask)
              <br />
              3. Render &amp; Paint (requestAnimationFrame)
              <br />
              4. Next Macrotask in Queue (setTimeout, I/O)
            </div>
            <Link
              to="/event-loop-demo"
              className="inline-block text-indigo-600 dark:text-indigo-400 font-semibold underline text-xs pt-1"
            >
              Run interactive execution order demo →
            </Link>
          </div>

          {/* INP Metric Breakdown */}
          <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              📊 Interaction to Next Paint (INP)
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              INP is a Core Web Vital measuring page responsiveness. It calculates the latency from the moment
              a user interacts (click, tap, keyboard input) until the browser presents the next frame on screen.
            </p>
            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="p-1.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300">
                ✓ <strong>Good:</strong> ≤ 200 ms (smooth and immediate)
              </div>
              <div className="p-1.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300">
                ⚠ <strong>Needs Improvement:</strong> 201 ms – 500 ms
              </div>
              <div className="p-1.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300">
                ✕ <strong>Poor:</strong> &gt; 500 ms (noticeable lag or UI freeze)
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
