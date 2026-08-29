import type { FactorNode, FactorType } from './types';

const laneByType: Record<FactorType, number> = {
  constraint: 0,
  assumption: 0,
  shock: 0,
  dependency: 1,
  mitigation: 2,
  risk: 2,
  objective: 3,
  outcome: 3,
};

const laneX = [1, 26, 51, 76];

export function arrangeNodes(nodes: FactorNode[]): FactorNode[] {
  const visible = nodes.filter((node) => node.status !== 'rejected');
  const lanes = new Map<number, FactorNode[]>();

  for (const node of visible) {
    const lane = laneByType[node.type];
    lanes.set(lane, [...(lanes.get(lane) ?? []), node]);
  }

  const positions = new Map<string, { x: number; y: number }>();
  for (const [lane, items] of lanes) {
    items
      .sort((a, b) => Number(b.locked) - Number(a.locked) || a.status.localeCompare(b.status) || a.label.localeCompare(b.label))
      .forEach((node, index) => {
        const step = items.length <= 1 ? 0 : Math.min(23, 63 / (items.length - 1));
        positions.set(node.id, { x: laneX[lane], y: Math.round(5 + index * step) });
      });
  }

  return nodes.map((node) => positions.has(node.id) ? { ...node, ...positions.get(node.id)! } : node);
}

export function edgeCurve(source: FactorNode, target: FactorNode) {
  const forward = target.x >= source.x;
  const sourceX = forward ? source.x + 20 : source.x;
  const targetX = forward ? target.x : target.x + 20;
  const sourceY = source.y + 7;
  const targetY = target.y + 7;
  const midpoint = (sourceX + targetX) / 2;
  return `M ${sourceX} ${sourceY} C ${midpoint} ${sourceY}, ${midpoint} ${targetY}, ${targetX} ${targetY}`;
}
