import { describe, expect, it } from 'vitest';
import { arrangeNodes } from './layout';
import { createSampleWorkspace } from './sample';

describe('Cascade map layout', () => {
  it('places factor types in stable semantic lanes without duplicate positions', () => {
    const nodes = arrangeNodes(createSampleWorkspace().scenarios[1].nodes);
    const visible = nodes.filter((node) => node.status !== 'rejected');
    const positions = new Set(visible.map((node) => `${node.x}:${node.y}`));

    expect(positions.size).toBe(visible.length);
    expect(nodes.find((node) => node.type === 'constraint')?.x).toBe(1);
    expect(nodes.find((node) => node.type === 'dependency')?.x).toBe(26);
    expect(nodes.find((node) => node.type === 'risk')?.x).toBe(51);
    expect(nodes.find((node) => node.type === 'outcome')?.x).toBe(76);
  });
});
