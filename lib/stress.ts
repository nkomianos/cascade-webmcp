import type { FactorEdge, ImpactPath, Scenario, StressResult } from './types';

const relationSign = (edge: FactorEdge) => edge.relation === 'reduces' || edge.relation === 'blocks' ? -1 : 1;
const clamp = (value: number, min = -1, max = 1) => Math.min(max, Math.max(min, value));

export function runStressEngine(scenario: Scenario, maxDepth = 4): StressResult {
  const acceptedNodes = scenario.nodes.filter((node) => node.status === 'accepted');
  const acceptedEdges = scenario.edges.filter((edge) => edge.status === 'accepted');
  const nodeById = new Map(acceptedNodes.map((node) => [node.id, node]));
  const outgoing = new Map<string, FactorEdge[]>();
  for (const edge of acceptedEdges) outgoing.set(edge.sourceId, [...(outgoing.get(edge.sourceId) ?? []), edge]);

  const shocks = acceptedNodes.filter((node) => node.type === 'shock');
  const seeds = shocks.length ? shocks : acceptedNodes.filter((node) => node.type === 'risk');
  const exposure: Record<string, number> = {};
  const paths: ImpactPath[] = [];

  for (const seed of seeds) {
    const seedValue = shocks.length
      ? Math.abs(seed.impact || 0.7)
      : (seed.likelihood ?? 0.5) * (seed.severity ?? Math.abs(seed.impact));
    const queue = [{ nodeId: seed.id, value: seedValue, depth: 0, trail: [seed.id] }];
    exposure[seed.id] = Math.max(Math.abs(exposure[seed.id] ?? 0), Math.abs(seedValue));

    while (queue.length) {
      const item = queue.shift()!;
      if (item.depth >= maxDepth) continue;
      for (const edge of outgoing.get(item.nodeId) ?? []) {
        if (item.trail.includes(edge.targetId) || !nodeById.has(edge.targetId)) continue;
        const value = clamp(item.value * edge.strength * Math.pow(0.72, item.depth + 1) * relationSign(edge));
        const current = exposure[edge.targetId] ?? 0;
        exposure[edge.targetId] = Math.abs(value) > Math.abs(current) ? value : current;
        const trail = [...item.trail, edge.targetId];
        if (Math.abs(value) >= 0.14) {
          const labels = trail.map((id) => nodeById.get(id)?.label).filter(Boolean);
          paths.push({
            id: `path_${seed.id}_${edge.targetId}_${item.depth}`,
            label: labels.join(' → '),
            nodeIds: trail,
            contribution: Math.abs(value),
          });
          queue.push({ nodeId: edge.targetId, value, depth: item.depth + 1, trail });
        }
      }
    }
  }

  const risks = acceptedNodes.filter((node) => node.type === 'risk');
  const mitigations = acceptedNodes.filter((node) => node.type === 'mitigation');
  const mitigatedTargets = new Set(
    acceptedEdges.filter((edge) => edge.relation === 'reduces' && mitigations.some((node) => node.id === edge.sourceId)).map((edge) => edge.targetId),
  );
  const critical = paths.filter((path) => path.contribution >= 0.28);
  const rawExposure = acceptedNodes.length
    ? Object.values(exposure).reduce((sum, value) => sum + Math.abs(value), 0) / acceptedNodes.length
    : 0;
  const riskBase = risks.reduce((sum, risk) => sum + (risk.likelihood ?? 0.5) * (risk.severity ?? Math.abs(risk.impact)), 0);
  const constraintBreaches = acceptedNodes.filter((node) => node.type === 'constraint' && Math.abs(exposure[node.id] ?? 0) >= 0.6).length;
  const unresolvedAssumptions = acceptedNodes.filter((node) => node.type === 'assumption' && node.confidence < 0.75).length;
  const coverage = risks.length ? Math.round((risks.filter((risk) => mitigatedTargets.has(risk.id)).length / risks.length) * 100) : 100;

  return {
    id: `run_${crypto.randomUUID().slice(0, 8)}`,
    scenarioId: scenario.id,
    scenarioVersion: scenario.version,
    exposureIndex: Math.min(100, Math.round((rawExposure * 72 + riskBase * 28) * 100) / 100),
    mitigationCoverage: coverage,
    constraintBreaches,
    criticalPaths: critical.length,
    unresolvedAssumptions,
    estimatedCostDelta: acceptedNodes.reduce((sum, node) => sum + (node.type === 'mitigation' ? node.estimatedCost ?? 0 : 0), 0),
    estimatedDayDelta: acceptedNodes.reduce((sum, node) => sum + (node.type === 'shock' || node.type === 'mitigation' ? node.estimatedDays ?? 0 : 0), 0),
    nodeExposure: exposure,
    paths: paths.sort((a, b) => b.contribution - a.contribution).slice(0, 8),
    warnings: shocks.length ? [] : ['No explicit shock is active; exposure is based on accepted risks.'],
    createdAt: new Date().toISOString(),
  };
}

export function scenarioMetrics(scenario: Scenario) {
  return scenario.stressResult ?? runStressEngine(scenario);
}
