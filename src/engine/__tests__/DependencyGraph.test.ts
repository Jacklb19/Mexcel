import { describe, it, expect } from 'vitest';
import { DependencyGraph } from '../DependencyGraph';

describe('DependencyGraph', () => {
  it('manages dependencies and calculates topological recalculation order', () => {
    const graph = new DependencyGraph();
    // A1 -> B1 -> C1
    graph.setDependencies('B1', ['A1']);
    graph.setDependencies('C1', ['B1']);

    const order = graph.getRecalculationOrder(['A1']);
    expect(order).toEqual(['B1', 'C1']);
  });

  it('detects direct circular references', () => {
    const graph = new DependencyGraph();
    // A1 depends on A1
    const cycle = graph.wouldCreateCycle('A1', ['A1']);
    expect(cycle).toEqual(['A1', 'A1']);
  });

  it('detects indirect circular references', () => {
    const graph = new DependencyGraph();
    // A1 depends on B1, B1 depends on C1
    graph.setDependencies('A1', ['B1']);
    graph.setDependencies('B1', ['C1']);

    // Attempting to make C1 depend on A1
    const cycle = graph.wouldCreateCycle('C1', ['A1']);
    expect(cycle).not.toBeNull();
    expect(cycle).toContain('A1');
  });

  it('handles multi-branch dependencies in Kahn topological sort', () => {
    const graph = new DependencyGraph();
    // A1 changes. B1 and B2 depend on A1. C1 depends on B1 and B2.
    graph.setDependencies('B1', ['A1']);
    graph.setDependencies('B2', ['A1']);
    graph.setDependencies('C1', ['B1', 'B2']);

    const order = graph.getRecalculationOrder(['A1']);
    expect(order.indexOf('C1')).toBeGreaterThan(order.indexOf('B1'));
    expect(order.indexOf('C1')).toBeGreaterThan(order.indexOf('B2'));
  });
});
