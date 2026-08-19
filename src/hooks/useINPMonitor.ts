/**
 * useINPMonitor — Hook for tracking INP, Latest Interaction Latency, and Long Tasks in real-time.
 *
 * Combines:
 * 1. Event Timing API for real-time per-interaction latency (Latest Interaction)
 * 2. web-vitals onINP for standard session-wide INP
 * 3. PerformanceObserver for Long Tasks (>50ms)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { onINP } from 'web-vitals';

export interface INPData {
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

export interface InteractionEntry {
  id: number;
  name: string;
  duration: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  relativeTime: string;
}

export interface LongTaskEntry {
  id: number;
  duration: number;
  timestamp: number;
  relativeTime: string;
}

interface INPMonitorState {
  inp: INPData | null;
  latestInteraction: InteractionEntry | null;
  interactions: InteractionEntry[];
  longTasks: LongTaskEntry[];
  clearMetrics: () => void;
}

const MAX_LOGS = 15;

function getRating(duration: number): 'good' | 'needs-improvement' | 'poor' {
  if (duration <= 200) return 'good';
  if (duration <= 500) return 'needs-improvement';
  return 'poor';
}

export function useINPMonitor(): INPMonitorState {
  const [inp, setINP] = useState<INPData | null>(null);
  const [latestInteraction, setLatestInteraction] = useState<InteractionEntry | null>(null);
  const [interactions, setInteractions] = useState<InteractionEntry[]>([]);
  const [longTasks, setLongTasks] = useState<LongTaskEntry[]>([]);

  const interactionCounter = useRef(0);
  const taskIdCounter = useRef(0);

  // Monitor session INP using web-vitals
  useEffect(() => {
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

  // Monitor live interactions using Event Timing API
  useEffect(() => {
    let eventObserver: PerformanceObserver | null = null;

    try {
      if (PerformanceObserver.supportedEntryTypes?.includes('event')) {
        eventObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const eventEntry = entry as any;
            // Only measure user inputs (click, keydown, pointerdown)
            if (
              ['click', 'keydown', 'pointerdown', 'input'].includes(eventEntry.name) &&
              eventEntry.duration !== undefined
            ) {
              interactionCounter.current++;
              const duration = Math.round(eventEntry.duration);
              const rating = getRating(duration);
              const seconds = (eventEntry.startTime / 1000).toFixed(1);

              const item: InteractionEntry = {
                id: interactionCounter.current,
                name: eventEntry.name,
                duration,
                rating,
                timestamp: eventEntry.startTime,
                relativeTime: `${seconds}s`,
              };

              setLatestInteraction(item);
              setInteractions((prev) => [...prev, item].slice(-MAX_LOGS));
            }
          }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eventObserver.observe({ type: 'event', durationThreshold: 0, buffered: true } as any);
      }
    } catch (e) {
      console.warn('Event Timing API not supported:', e);
    }

    return () => {
      eventObserver?.disconnect();
    };
  }, []);

  // Monitor long tasks (>50ms)
  useEffect(() => {
    let longTaskObserver: PerformanceObserver | null = null;

    try {
      if (PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
        longTaskObserver = new PerformanceObserver((list) => {
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

          setLongTasks((prev) => [...prev, ...newTasks].slice(-MAX_LOGS));
        });

        longTaskObserver.observe({ type: 'longtask', buffered: true });
      }
    } catch (e) {
      console.warn('LongTask observer not supported:', e);
    }

    return () => {
      longTaskObserver?.disconnect();
    };
  }, []);

  const clearMetrics = useCallback(() => {
    setINP(null);
    setLatestInteraction(null);
    setInteractions([]);
    setLongTasks([]);
  }, []);

  return {
    inp,
    latestInteraction,
    interactions,
    longTasks,
    clearMetrics,
  };
}
