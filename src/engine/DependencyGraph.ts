/**
 * DependencyGraph — Manages directed dependencies between cells.
 *
 * If cell A1 has formula =B1+C1, then:
 *   - A1 depends on B1 and C1
 *   - B1 and C1 are dependencies of A1
 *   - A1 is a dependent of B1 and C1
 *
 * The graph stores both directions for efficient lookup:
 *   - _dependencies: cellId → Set of cells it depends ON (predecessors)
 *   - _dependents: cellId → Set of cells that depend on it (successors)
 */

import { CircularReferenceError } from './errors';

export class DependencyGraph {
  /** Map from cellId to the set of cells it depends on */
  private readonly _dependencies: Map<string, Set<string>>;
  /** Map from cellId to the set of cells that depend on it */
  private readonly _dependents: Map<string, Set<string>>;

  constructor() {
    this._dependencies = new Map();
    this._dependents = new Map();
  }

  /**
   * Set the dependencies for a cell. Replaces any existing dependencies.
   * @param cellId The cell whose dependencies are being set
   * @param deps The cell IDs this cell depends on
   */
  setDependencies(cellId: string, deps: string[]): void {
    // Remove old dependencies first
    this.removeDependencies(cellId);

    if (deps.length === 0) return;

    const depSet = new Set(deps);
    this._dependencies.set(cellId, depSet);

    // Update reverse map
    for (const dep of depSet) {
      let dependents = this._dependents.get(dep);
      if (!dependents) {
        dependents = new Set();
        this._dependents.set(dep, dependents);
      }
      dependents.add(cellId);
    }
  }

  /**
   * Remove all dependencies for a cell.
   */
  removeDependencies(cellId: string): void {
    const oldDeps = this._dependencies.get(cellId);
    if (oldDeps) {
      for (const dep of oldDeps) {
        const dependents = this._dependents.get(dep);
        if (dependents) {
          dependents.delete(cellId);
          if (dependents.size === 0) {
            this._dependents.delete(dep);
          }
        }
      }
      this._dependencies.delete(cellId);
    }
  }

  /**
   * Get the cells that cellId depends on (its predecessors).
   */
  getDependencies(cellId: string): ReadonlySet<string> {
    return this._dependencies.get(cellId) ?? new Set();
  }

  /**
   * Get the cells that depend on cellId (its successors/dependents).
   */
  getDependents(cellId: string): ReadonlySet<string> {
    return this._dependents.get(cellId) ?? new Set();
  }

  /**
   * Get ALL cells that transitively depend on the given cells.
   * Returns them in topological order (Kahn's algorithm).
   * Throws CircularReferenceError if a cycle is detected.
   */
  getRecalculationOrder(changedCells: string[]): string[] {
    // First, collect all affected cells (BFS from changed cells through dependents)
    const affected = new Set<string>();
    const queue = [...changedCells];

    while (queue.length > 0) {
      const cell = queue.shift()!;
      const dependents = this._dependents.get(cell);
      if (dependents) {
        for (const dep of dependents) {
          if (!affected.has(dep)) {
            affected.add(dep);
            queue.push(dep);
          }
        }
      }
    }

    if (affected.size === 0) return [];

    // Kahn's algorithm for topological sort on the subgraph of affected cells
    // In-degree: count how many of a cell's dependencies are also in the affected set
    const inDegree = new Map<string, number>();
    for (const cell of affected) {
      let degree = 0;
      const deps = this._dependencies.get(cell);
      if (deps) {
        for (const dep of deps) {
          if (affected.has(dep)) {
            degree++;
          }
        }
      }
      inDegree.set(cell, degree);
    }

    // Start with cells that have 0 in-degree (their dependencies are all outside the affected set)
    const toProcess: string[] = [];
    for (const [cell, degree] of inDegree) {
      if (degree === 0) {
        toProcess.push(cell);
      }
    }

    const order: string[] = [];

    while (toProcess.length > 0) {
      const cell = toProcess.shift()!;
      order.push(cell);

      const dependents = this._dependents.get(cell);
      if (dependents) {
        for (const dep of dependents) {
          if (affected.has(dep)) {
            const newDegree = (inDegree.get(dep) ?? 1) - 1;
            inDegree.set(dep, newDegree);
            if (newDegree === 0) {
              toProcess.push(dep);
            }
          }
        }
      }
    }

    // If we didn't process all affected cells, there's a cycle
    if (order.length < affected.size) {
      // Find cells involved in cycle
      const cycleNodes: string[] = [];
      for (const cell of affected) {
        if (!order.includes(cell)) {
          cycleNodes.push(cell);
        }
      }
      throw new CircularReferenceError(cycleNodes);
    }

    return order;
  }

  /**
   * Check if adding dependencies would create a cycle.
   * Returns the cycle path if found, or null.
   */
  wouldCreateCycle(cellId: string, newDeps: string[]): string[] | null {
    // DFS from each new dependency to see if we can reach cellId
    for (const dep of newDeps) {
      const path = this.findPath(dep, cellId);
      if (path) {
        return [cellId, ...path];
      }
      // Also check self-reference
      if (dep === cellId) {
        return [cellId, cellId];
      }
    }
    return null;
  }

  /**
   * Find a path from `from` to `to` following dependency edges.
   * Returns the path (including from and to) or null if no path exists.
   */
  private findPath(from: string, to: string): string[] | null {
    const visited = new Set<string>();
    const path: string[] = [];

    const dfs = (current: string): boolean => {
      if (current === to) {
        path.push(current);
        return true;
      }
      if (visited.has(current)) return false;
      visited.add(current);

      const deps = this._dependencies.get(current);
      if (deps) {
        for (const dep of deps) {
          if (dfs(dep)) {
            path.push(current);
            return true;
          }
        }
      }
      return false;
    };

    if (dfs(from)) {
      return path.reverse();
    }
    return null;
  }

  /**
   * Get all cell IDs in the graph.
   */
  getAllCells(): Set<string> {
    const cells = new Set<string>();
    for (const cell of this._dependencies.keys()) cells.add(cell);
    for (const cell of this._dependents.keys()) cells.add(cell);
    return cells;
  }

  /**
   * Clear the entire graph.
   */
  clear(): void {
    this._dependencies.clear();
    this._dependents.clear();
  }

  /**
   * Get size (number of cells with dependencies).
   */
  get size(): number {
    return this._dependencies.size;
  }
}
