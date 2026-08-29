import { describe, expect, it } from 'vitest';
import { createSampleWorkspace } from './sample';
import { runStressEngine } from './stress';

describe('Cascade stress engine', () => {
  it('returns stable metrics for the same accepted model', () => {
    const scenario = createSampleWorkspace().scenarios[0];
    const first = runStressEngine(scenario);
    const second = runStressEngine(scenario);

    expect({ ...first, id: '', createdAt: '' }).toEqual({ ...second, id: '', createdAt: '' });
    expect(first.warnings).toContain('No explicit shock is active; exposure is based on accepted risks.');
  });

  it('traces an accepted shock into downstream factors', () => {
    const scenario = createSampleWorkspace().scenarios[1];
    const result = runStressEngine(scenario);

    expect(result.warnings).toEqual([]);
    expect(result.nodeExposure.dependency_billing).toBeLessThan(0);
    expect(result.paths.some((path) => path.nodeIds.includes('shock_billing_delay'))).toBe(true);
    expect(result.estimatedDayDelta).toBe(21);
  });

  it('does not count draft mitigations until a human accepts them', () => {
    const scenario = createSampleWorkspace().scenarios[1];
    const before = runStressEngine(scenario);
    scenario.nodes.filter((node) => node.type === 'mitigation').forEach((node) => { node.status = 'accepted'; });
    scenario.edges.filter((edge) => edge.sourceId.startsWith('mit_')).forEach((edge) => { edge.status = 'accepted'; });
    const after = runStressEngine(scenario);

    expect(before.estimatedCostDelta).toBe(0);
    expect(after.estimatedCostDelta).toBe(800);
    expect(after.estimatedDayDelta).toBe(9);
  });
});
