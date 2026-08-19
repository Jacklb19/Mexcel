/**
 * useINPMonitor — Hook for tracking INP and Long Tasks in real-time.
 *
 * Uses the web-vitals library for INP measurement and
 * PerformanceObserver for long task detection.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { onINP } from 'web-vitals';

export interface INPData {
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

export interface LongTaskEntry {
  id: number;
  duration: number;
  timestamp: number;
  relativeTime: string;
}

interface INPMonitorState {
  inp: INPData | null;
  longTasks: LongTaskEntry[];
  clearLongTasks: () => void;
}

const MAX_LONG_TASKS = 20;

export function useINPMonitor(): INPMonitorState {
  const [inp, setINP] = useState<INPData | null>(null);
  const [longTasks, setLongTasks] = useState<LongTaskEntry[]>([]);
  const taskIdCounter = useRef(0);
  const startTime = useRef(0);

  useEffect(() => {
    startTime.current = performance.now();
  }, []);

  useEffect(() => {
    // Monitor INP using web-vitals
    const cleanup = onINP(
      (metric) => {
        setINP({
          value: Math.round(metric.value),
          rating: metric.rating,
        });
      },
      { reportAllChanges: true },
    );

    return cleanup;
  }, []);

  useEffect(() => {
    // Monitor long tasks (>50ms) using PerformanceObserver
    let observer: PerformanceObserver | null = null;

    try {
      observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const newTasks: LongTaskEntry[] = entries.map((entry) => {
          taskIdCounter.current++;
          const seconds = (entry.startTime / 1000).toFixed(1);
          return {
            id: taskIdCounter.current,
            duration: Math.round(entry.duration),
            timestamp: entry.startTime,
            relativeTime: `${seconds}s`,
          };
        });

        setLongTasks((prev) => {
          const updated = [...prev, ...newTasks];
          // Keep only the most recent entries
          return updated.slice(-MAX_LONG_TASKS);
        });
      });

      observer.observe({ type: 'longtask', buffered: true });
    } catch {
      // Long task observer not supported in this browser
      console.warn('PerformanceObserver for longtask not supported');
    }

    return () => {
      observer?.disconnect();
    };
  }, []);

  const clearLongTasks = useCallback(() => {
    setLongTasks([]);
  }, []);

  return { inp, longTasks, clearLongTasks };
}
