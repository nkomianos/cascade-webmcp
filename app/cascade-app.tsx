'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createBlankWorkspace, createCommunityWorkspace, createSampleWorkspace } from '../lib/sample';
import { arrangeNodes, edgeCurve } from '../lib/layout';
import { runStressEngine, scenarioMetrics } from '../lib/stress';
import type { FactorEdge, FactorNode, FactorType, Relation, Scenario, ToolResult, Workspace } from '../lib/types';

type ViewMode = 'map' | 'list' | 'compare';
type InspectorTab = 'factor' | 'proposals' | 'impact';
type Modal = 'new-plan' | 'add-factor' | 'add-relationship' | 'branch' | 'receipt' | null;

const STORAGE_KEY = 'cascade-workspace-v1';
const activeStorageKey = () => new URLSearchParams(window.location.search).has('qa') ? 'cascade-workspace-qa-v1' : STORAGE_KEY;
const factorTypes: FactorType[] = ['objective', 'assumption', 'dependency', 'constraint', 'risk', 'mitigation', 'outcome', 'shock'];
const relations: Relation[] = ['depends_on', 'enables', 'amplifies', 'reduces', 'blocks'];
const typeGlyph: Record<FactorType, string> = {
  objective: '◎', assumption: '?', dependency: '◇', constraint: '◆', risk: '△', mitigation: '✦', outcome: '●', shock: '⚡',
};

const compactScenario = (scenario: Scenario) => ({
  id: scenario.id, name: scenario.name, premise: scenario.premise, version: scenario.version, status: scenario.status,
  accepted_factors: scenario.nodes.filter((node) => node.status === 'accepted').length,
  draft_factors: scenario.nodes.filter((node) => node.status === 'draft').length,
  draft_relationships: scenario.edges.filter((edge) => edge.status === 'draft').length,
  has_stress_result: Boolean(scenario.stressResult),
});

const safeNumber = (value: unknown, fallback: number, min = 0, max = 1) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

export default function CascadeApp() {
  const [workspace, setWorkspace] = useState<Workspace>(() => createSampleWorkspace());
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<ViewMode>('map');
  const [tab, setTab] = useState<InspectorTab>('factor');
  const [selectedId, setSelectedId] = useState('dependency_billing');
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState('');
  const [toolStatus, setToolStatus] = useState<'checking' | 'ready' | 'preview'>('checking');
  const [newPlan, setNewPlan] = useState({ title: '', question: '', goal: '' });
  const [newPlanStarter, setNewPlanStarter] = useState<'blank' | 'community'>('blank');
  const [newFactor, setNewFactor] = useState({ type: 'assumption' as FactorType, label: '', description: '', confidence: '70', impact: '60' });
  const [newRelationship, setNewRelationship] = useState({ sourceId: '', targetId: '', relation: 'depends_on' as Relation, strength: '70', rationale: '' });
  const [newBranch, setNewBranch] = useState({ name: '', premise: '' });
  const [agentNotice, setAgentNotice] = useState('');
  const workspaceRef = useRef(workspace);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = localStorage.getItem(activeStorageKey());
        if (saved) {
          const parsed = JSON.parse(saved) as Workspace;
          if (parsed?.scenarios?.length) { workspaceRef.current = parsed; setWorkspace(parsed); }
        }
      } catch { localStorage.removeItem(activeStorageKey()); }
      finally { setHydrated(true); }
    });
  }, []);

  useEffect(() => {
    workspaceRef.current = workspace;
    if (hydrated) localStorage.setItem(activeStorageKey(), JSON.stringify(workspace));
  }, [workspace, hydrated]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!agentNotice) return;
    const timer = window.setTimeout(() => setAgentNotice(''), 4200);
    return () => window.clearTimeout(timer);
  }, [agentNotice]);

  const commit = useCallback((recipe: (current: Workspace) => Workspace) => {
    const next = recipe(structuredClone(workspaceRef.current));
    workspaceRef.current = next;
    setWorkspace(next);
    return next;
  }, []);

  const updateScenario = useCallback((scenarioId: string, recipe: (scenario: Scenario) => void, action: string, actor: 'human' | 'agent' | 'system' = 'human') => {
    return commit((next) => {
      const scenario = next.scenarios.find((item) => item.id === scenarioId);
      if (!scenario) return next;
      recipe(scenario);
      scenario.version += 1;
      scenario.stressResult = undefined;
      next.version += 1;
      next.activity.unshift({ id: crypto.randomUUID(), actor, action, createdAt: new Date().toISOString() });
      return next;
    });
  }, [commit]);

  const active = useMemo(() => workspace.scenarios.find((scenario) => scenario.id === workspace.activeScenarioId) ?? workspace.scenarios[0], [workspace]);
  const selected = active.nodes.find((node) => node.id === selectedId) ?? active.nodes[0];
  const drafts = active.nodes.filter((node) => node.status === 'draft');
  const draftEdges = active.edges.filter((edge) => edge.status === 'draft');
  const proposalCount = drafts.length + draftEdges.length;
  const metrics = useMemo(() => scenarioMetrics(active), [active]);
  const visibleNodes = active.nodes.filter((node) => node.status !== 'rejected');
  const nodeById = new Map(visibleNodes.map((node) => [node.id, node]));
  const visibleEdges = active.edges.filter((edge) => edge.status !== 'rejected' && nodeById.has(edge.sourceId) && nodeById.has(edge.targetId));

  const switchScenario = (id: string) => {
    commit((next) => ({ ...next, activeScenarioId: id }));
    const target = workspace.scenarios.find((scenario) => scenario.id === id);
    setSelectedId(target?.nodes[0]?.id ?? ''); setView('map');
  };

  const createBranch = (name = newBranch.name, premise = newBranch.premise, sourceId = active.id) => {
    if (!name.trim() || !premise.trim()) return null;
    const id = `scn_${crypto.randomUUID().slice(0, 8)}`;
    commit((next) => {
      const source = next.scenarios.find((scenario) => scenario.id === sourceId);
      if (!source) return next;
      const branch = structuredClone(source);
      Object.assign(branch, { id, name: name.trim().slice(0, 60), premise: premise.trim().slice(0, 260), parentScenarioId: source.id, status: 'branch' as const, version: 1, stressResult: undefined });
      next.scenarios.push(branch); next.activeScenarioId = id; next.version += 1;
      next.activity.unshift({ id: crypto.randomUUID(), actor: 'human', action: `Created scenario “${branch.name}”.`, createdAt: new Date().toISOString() });
      return next;
    });
    setModal(null); setNewBranch({ name: '', premise: '' }); setToast('Scenario branch created');
    return id;
  };

  const acceptFactor = (nodeId: string) => {
    updateScenario(active.id, (scenario) => {
      const node = scenario.nodes.find((item) => item.id === nodeId);
      if (node && !node.locked) node.status = 'accepted';
      scenario.edges.filter((edge) => edge.sourceId === nodeId || edge.targetId === nodeId).forEach((edge) => { if (edge.status === 'draft') edge.status = 'accepted'; });
    }, 'Accepted an agent proposal.');
    setToast('Proposal accepted into the plan');
  };

  const rejectFactor = (nodeId: string) => {
    updateScenario(active.id, (scenario) => {
      const node = scenario.nodes.find((item) => item.id === nodeId);
      if (node && !node.locked) node.status = 'rejected';
      scenario.edges.filter((edge) => edge.sourceId === nodeId || edge.targetId === nodeId).forEach((edge) => { if (edge.status === 'draft') edge.status = 'rejected'; });
    }, 'Rejected an agent proposal.'); setToast('Proposal rejected');
  };

  const acceptRelationship = (edgeId: string) => {
    updateScenario(active.id, (scenario) => {
      const edge = scenario.edges.find((item) => item.id === edgeId);
      if (edge) edge.status = 'accepted';
    }, 'Accepted an agent-proposed relationship.');
    setToast('Relationship accepted into the plan');
  };

  const rejectRelationship = (edgeId: string) => {
    updateScenario(active.id, (scenario) => {
      const edge = scenario.edges.find((item) => item.id === edgeId);
      if (edge) edge.status = 'rejected';
    }, 'Rejected an agent-proposed relationship.');
    setToast('Relationship rejected');
  };

  const arrangeActive = () => {
    commit((next) => {
      const scenario = next.scenarios.find((item) => item.id === next.activeScenarioId);
      if (scenario) scenario.nodes = arrangeNodes(scenario.nodes);
      return next;
    });
    setToast('Map arranged into semantic lanes');
  };

  const addFactor = () => {
    if (!newFactor.label.trim()) return;
    const node: FactorNode = {
      id: `factor_${crypto.randomUUID().slice(0, 8)}`, type: newFactor.type, label: newFactor.label.trim().slice(0, 120),
      description: (newFactor.description || newFactor.label).trim().slice(0, 500), rationale: 'Added directly by the decision owner.',
      confidence: safeNumber(Number(newFactor.confidence) / 100, 0.7), impact: safeNumber(Number(newFactor.impact) / 100, 0.6),
      status: 'accepted', locked: false, origin: 'human', x: 10 + Math.round(Math.random() * 65), y: 12 + Math.round(Math.random() * 65),
    };
    updateScenario(active.id, (scenario) => { scenario.nodes = arrangeNodes([...scenario.nodes, node]); }, `Added “${node.label}”.`);
    setSelectedId(node.id); setNewFactor({ type: 'assumption', label: '', description: '', confidence: '70', impact: '60' }); setModal(null); setToast('Factor added');
  };

  const addRelationship = () => {
    if (!newRelationship.sourceId || !newRelationship.targetId || newRelationship.sourceId === newRelationship.targetId) return;
    if (active.edges.some((edge) => edge.status !== 'rejected' && edge.sourceId === newRelationship.sourceId && edge.targetId === newRelationship.targetId && edge.relation === newRelationship.relation)) {
      setToast('That relationship is already mapped');
      return;
    }
    const edge: FactorEdge = {
      id: `edge_${crypto.randomUUID().slice(0, 8)}`,
      sourceId: newRelationship.sourceId,
      targetId: newRelationship.targetId,
      relation: newRelationship.relation,
      strength: safeNumber(Number(newRelationship.strength) / 100, 0.7),
      rationale: (newRelationship.rationale || 'Connected by the decision owner.').trim().slice(0, 300),
      status: 'accepted',
      origin: 'human',
    };
    updateScenario(active.id, (scenario) => { scenario.edges.push(edge); }, 'Added a relationship between two factors.');
    setNewRelationship({ sourceId: '', targetId: '', relation: 'depends_on', strength: '70', rationale: '' });
    setModal(null);
    setToast('Relationship added');
  };

  const runStress = useCallback((scenarioId?: string) => {
    const targetId = scenarioId ?? workspaceRef.current.activeScenarioId;
    let result = runStressEngine(workspaceRef.current.scenarios.find((scenario) => scenario.id === targetId)!);
    commit((next) => {
      const scenario = next.scenarios.find((item) => item.id === targetId);
      if (!scenario) return next;
      result = runStressEngine(scenario); scenario.stressResult = result;
      next.activity.unshift({ id: crypto.randomUUID(), actor: 'system', action: `Stress-tested “${scenario.name}”.`, createdAt: new Date().toISOString() });
      return next;
    });
    setTab('impact'); setToast(`Stress test complete · exposure ${Math.round(result.exposureIndex)}`); return result;
  }, [commit]);

  const exportWorkspace = () => {
    const blob = new Blob([JSON.stringify(workspace, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `${workspace.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'cascade'}-decision.json`; link.click();
    URL.revokeObjectURL(url); setToast('Decision workspace exported');
  };

  const resetDemo = () => {
    const sample = createSampleWorkspace(); workspaceRef.current = sample; setWorkspace(sample); setSelectedId('dependency_billing'); setView('map'); setToast('Product launch demo restored');
  };

  useEffect(() => {
    if (!document.modelContext) { queueMicrotask(() => setToolStatus('preview')); return; }
    const controller = new AbortController();
    const register = async (definition: CascadeToolDefinition) => document.modelContext?.registerTool(definition, { signal: controller.signal });
    const currentScenario = (input: Record<string, unknown>) => {
      const current = workspaceRef.current;
      return current.scenarios.find((scenario) => scenario.id === input.scenario_id) ?? current.scenarios.find((scenario) => scenario.id === current.activeScenarioId)!;
    };
    const versionError = (scenario: Scenario, input: Record<string, unknown>): ToolResult | null => input.scenario_version !== undefined && Number(input.scenario_version) !== scenario.version
      ? { ok: false, code: 'stale_scenario', message: `Expected version ${scenario.version}. Read the scenario again before writing.`, scenario_id: scenario.id, scenario_version: scenario.version }
      : null;
    const definitions: CascadeToolDefinition[] = [
      {
        name: 'read_workspace', title: 'Read decision workspace', description: 'Read the decision question, goal, scenario summaries, and current selection.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: () => { const current = workspaceRef.current; return { ok: true, workspace_id: current.id, title: current.title, question: current.question, goal: current.goal, version: current.version, active_scenario_id: current.activeScenarioId, scenarios: current.scenarios.map(compactScenario) }; },
      },
      {
        name: 'read_scenario', title: 'Read a scenario', description: 'Read accepted and draft factors, relationships, locks, and the latest stress result.',
        inputSchema: { type: 'object', properties: { scenario_id: { type: 'string', description: 'Scenario ID. Omit to read the active scenario.' } }, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: (input) => { const scenario = currentScenario(input); return { ok: true, ...compactScenario(scenario), factors: scenario.nodes.filter((n) => n.status !== 'rejected').map((n) => ({ id: n.id, type: n.type, label: n.label, status: n.status, locked: n.locked, confidence: n.confidence, impact: n.impact })), relationships: scenario.edges.filter((e) => e.status !== 'rejected').map((e) => ({ id: e.id, from: e.sourceId, to: e.targetId, relation: e.relation, status: e.status })), stress: scenario.stressResult ? { exposure: scenario.stressResult.exposureIndex, coverage: scenario.stressResult.mitigationCoverage, breaches: scenario.stressResult.constraintBreaches } : null }; },
      },
      {
        name: 'stage_plan_map', title: 'Stage a decision map', description: 'Stage proposed factors for human review. Never changes accepted or locked factors.',
        inputSchema: { type: 'object', required: ['scenario_id', 'scenario_version', 'factors'], properties: { scenario_id: { type: 'string' }, scenario_version: { type: 'integer' }, factors: { type: 'array', maxItems: 12, items: { type: 'object', required: ['type', 'label', 'description'], properties: { type: { type: 'string', enum: factorTypes }, label: { type: 'string', maxLength: 120 }, description: { type: 'string', maxLength: 500 }, confidence: { type: 'number', minimum: 0, maximum: 1 }, impact: { type: 'number', minimum: -1, maximum: 1 } }, additionalProperties: false } } }, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
        execute: (input, options) => {
          if (options?.signal?.aborted) return { ok: false, code: 'cancelled' };
          const scenario = currentScenario(input); const stale = versionError(scenario, input); if (stale) return stale;
          const factors = Array.isArray(input.factors) ? input.factors as Record<string, unknown>[] : []; const ids = factors.map(() => `factor_${crypto.randomUUID().slice(0, 8)}`);
          updateScenario(scenario.id, (next) => { const additions = factors.map((factor, index) => ({ id: ids[index], type: factorTypes.includes(factor.type as FactorType) ? factor.type as FactorType : 'assumption', label: String(factor.label).slice(0, 120), description: String(factor.description).slice(0, 500), rationale: 'Staged by an agent for human review.', confidence: safeNumber(factor.confidence, 0.6), impact: safeNumber(factor.impact, 0.6, -1, 1), status: 'draft' as const, locked: false, origin: 'agent' as const, x: 0, y: 0 })); next.nodes = arrangeNodes([...next.nodes, ...additions]); }, `Agent staged ${ids.length} factors.`, 'agent');
          setAgentNotice(`Agent staged ${ids.length} new factors for your review.`);
          return { ok: true, summary: `Staged ${ids.length} factors for review.`, scenario_id: scenario.id, scenario_version: scenario.version + 1, changed_ids: ids, next: 'Ask the human to accept, revise, or reject each proposal.' };
        },
      },
      {
        name: 'revise_draft', title: 'Revise a draft factor', description: 'Revise one unlocked draft factor before the human decides whether to accept it.',
        inputSchema: { type: 'object', required: ['scenario_id', 'scenario_version', 'factor_id', 'label', 'description'], properties: { scenario_id: { type: 'string' }, scenario_version: { type: 'integer' }, factor_id: { type: 'string' }, label: { type: 'string', maxLength: 120 }, description: { type: 'string', maxLength: 500 }, confidence: { type: 'number', minimum: 0, maximum: 1 }, impact: { type: 'number', minimum: -1, maximum: 1 } }, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
        execute: (input) => {
          const scenario = currentScenario(input); const stale = versionError(scenario, input); if (stale) return stale; const factor = scenario.nodes.find((node) => node.id === input.factor_id);
          if (!factor || factor.status !== 'draft' || factor.locked) return { ok: false, code: 'not_editable', message: 'Only unlocked draft factors can be revised.' };
          updateScenario(scenario.id, (next) => { const node = next.nodes.find((item) => item.id === factor.id)!; node.label = String(input.label).slice(0, 120); node.description = String(input.description).slice(0, 500); node.confidence = safeNumber(input.confidence, node.confidence); node.impact = safeNumber(input.impact, node.impact, -1, 1); }, `Agent revised “${factor.label}”.`, 'agent');
          setAgentNotice(`Agent revised “${factor.label}”.`);
          return { ok: true, changed_ids: [factor.id], scenario_version: scenario.version + 1, next: 'Ask the human to review the revised draft.' };
        },
      },
      {
        name: 'stage_relationships', title: 'Stage relationships', description: 'Stage causal links between existing factors for human review.',
        inputSchema: { type: 'object', required: ['scenario_id', 'scenario_version', 'relationships'], properties: { scenario_id: { type: 'string' }, scenario_version: { type: 'integer' }, relationships: { type: 'array', maxItems: 16, items: { type: 'object', required: ['source_id', 'target_id', 'relation', 'strength', 'rationale'], properties: { source_id: { type: 'string' }, target_id: { type: 'string' }, relation: { type: 'string', enum: relations }, strength: { type: 'number', minimum: 0.1, maximum: 1 }, rationale: { type: 'string', maxLength: 300 } }, additionalProperties: false } } }, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
        execute: (input) => {
          const scenario = currentScenario(input); const stale = versionError(scenario, input); if (stale) return stale;
          const items = Array.isArray(input.relationships) ? input.relationships as Record<string, unknown>[] : [];
          const valid = items.filter((item) => item.source_id !== item.target_id && scenario.nodes.some((node) => node.status !== 'rejected' && node.id === item.source_id) && scenario.nodes.some((node) => node.status !== 'rejected' && node.id === item.target_id) && !scenario.edges.some((edge) => edge.status !== 'rejected' && edge.sourceId === item.source_id && edge.targetId === item.target_id && edge.relation === item.relation));
          const ids = valid.map(() => `edge_${crypto.randomUUID().slice(0, 8)}`);
          updateScenario(scenario.id, (next) => { valid.forEach((item, index) => next.edges.push({ id: ids[index], sourceId: String(item.source_id), targetId: String(item.target_id), relation: relations.includes(item.relation as Relation) ? item.relation as Relation : 'depends_on', strength: safeNumber(item.strength, 0.6, 0.1, 1), rationale: String(item.rationale).slice(0, 300), status: 'draft', origin: 'agent' })); }, `Agent staged ${ids.length} relationships.`, 'agent');
          setAgentNotice(`Agent connected ${ids.length} factor paths for your review.`);
          return { ok: true, changed_ids: ids, scenario_id: scenario.id, scenario_version: scenario.version + 1, summary: `Staged ${ids.length} relationships for review.`, next: 'Ask the human to accept or reject each relationship.' };
        },
      },
      {
        name: 'fork_scenario', title: 'Fork a scenario', description: 'Create an isolated what-if branch without changing the baseline.',
        inputSchema: { type: 'object', required: ['source_scenario_id', 'name', 'premise'], properties: { source_scenario_id: { type: 'string' }, name: { type: 'string', maxLength: 60 }, premise: { type: 'string', maxLength: 260 } }, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
        execute: (input) => {
          const source = workspaceRef.current.scenarios.find((scenario) => scenario.id === input.source_scenario_id); if (!source) return { ok: false, code: 'not_found', message: 'Source scenario not found.' };
          const id = `scn_${crypto.randomUUID().slice(0, 8)}`;
          commit((next) => { const branch = structuredClone(next.scenarios.find((s) => s.id === source.id)!); Object.assign(branch, { id, name: String(input.name).slice(0, 60), premise: String(input.premise).slice(0, 260), parentScenarioId: source.id, status: 'branch' as const, version: 1, stressResult: undefined }); next.scenarios.push(branch); next.activeScenarioId = id; next.version += 1; next.activity.unshift({ id: crypto.randomUUID(), actor: 'agent', action: `Agent created scenario “${branch.name}”.`, createdAt: new Date().toISOString() }); return next; });
          setAgentNotice(`Agent opened a new what-if branch: “${String(input.name).slice(0, 60)}”.`);
          return { ok: true, scenario_id: id, scenario_version: 1, summary: 'Created an isolated branch. The baseline is unchanged.', next: 'Apply a shock or stage mitigations in this branch.' };
        },
      },
      {
        name: 'apply_shock', title: 'Apply a scenario shock', description: 'Apply one bounded shock inside a branch and connect it to specified factors.',
        inputSchema: { type: 'object', required: ['scenario_id', 'scenario_version', 'label', 'description', 'impact', 'target_factor_ids'], properties: { scenario_id: { type: 'string' }, scenario_version: { type: 'integer' }, label: { type: 'string', maxLength: 120 }, description: { type: 'string', maxLength: 500 }, impact: { type: 'number', minimum: 0, maximum: 1 }, estimated_days: { type: 'integer', minimum: -365, maximum: 365 }, target_factor_ids: { type: 'array', maxItems: 8, items: { type: 'string' } } }, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
        execute: (input) => {
          const scenario = currentScenario(input); const stale = versionError(scenario, input); if (stale) return stale; if (scenario.status === 'baseline') return { ok: false, code: 'branch_required', message: 'Fork the baseline before applying a shock.' };
          const targets = Array.isArray(input.target_factor_ids) ? input.target_factor_ids.map(String).filter((id) => scenario.nodes.some((node) => node.id === id)) : []; const shockId = `shock_${crypto.randomUUID().slice(0, 8)}`;
          updateScenario(scenario.id, (next) => { next.nodes = arrangeNodes([...next.nodes, { id: shockId, type: 'shock', label: String(input.label).slice(0, 120), description: String(input.description).slice(0, 500), rationale: 'Scenario shock applied by an agent in an isolated branch.', confidence: 1, impact: safeNumber(input.impact, 0.7), estimatedDays: safeNumber(input.estimated_days, 0, -365, 365), status: 'accepted', locked: false, origin: 'agent', x: 0, y: 0 }]); targets.forEach((target, index) => next.edges.push({ id: `edge_${crypto.randomUUID().slice(0, 8)}`, sourceId: shockId, targetId: target, relation: 'blocks', strength: Math.max(0.2, safeNumber(input.impact, 0.7) - index * 0.04), rationale: 'Shock impact path proposed by the agent.', status: 'accepted', origin: 'agent' })); }, `Agent applied shock “${String(input.label).slice(0, 120)}”.`, 'agent');
          setAgentNotice(`Agent applied the shock “${String(input.label).slice(0, 120)}”.`);
          return { ok: true, changed_ids: [shockId], scenario_id: scenario.id, scenario_version: scenario.version + 1, summary: `Applied the shock to ${targets.length} target factors in this branch.`, next: 'Run the stress test, then ask the human to review the branch.' };
        },
      },
      {
        name: 'stage_mitigations', title: 'Stage mitigations', description: 'Stage mitigations and reduction links for human review.',
        inputSchema: { type: 'object', required: ['scenario_id', 'scenario_version', 'mitigations'], properties: { scenario_id: { type: 'string' }, scenario_version: { type: 'integer' }, mitigations: { type: 'array', maxItems: 8, items: { type: 'object', required: ['label', 'description', 'target_id', 'strength'], properties: { label: { type: 'string', maxLength: 120 }, description: { type: 'string', maxLength: 500 }, target_id: { type: 'string' }, strength: { type: 'number', minimum: 0.1, maximum: 1 }, estimated_cost: { type: 'number', minimum: 0, maximum: 100000000 }, estimated_days: { type: 'integer', minimum: -365, maximum: 365 } }, additionalProperties: false } } }, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
        execute: (input) => {
          const scenario = currentScenario(input); const stale = versionError(scenario, input); if (stale) return stale; const items = Array.isArray(input.mitigations) ? input.mitigations as Record<string, unknown>[] : []; const valid = items.filter((item) => scenario.nodes.some((node) => node.id === item.target_id)); const ids = valid.map(() => `mit_${crypto.randomUUID().slice(0, 8)}`);
          updateScenario(scenario.id, (next) => { const additions = valid.map((item, index) => ({ id: ids[index], type: 'mitigation' as const, label: String(item.label).slice(0, 120), description: String(item.description).slice(0, 500), rationale: 'Staged by an agent for human review.', confidence: 0.72, impact: -safeNumber(item.strength, 0.5), estimatedCost: safeNumber(item.estimated_cost, 0, 0, 100000000), estimatedDays: safeNumber(item.estimated_days, 0, -365, 365), status: 'draft' as const, locked: false, origin: 'agent' as const, x: 0, y: 0 })); next.nodes = arrangeNodes([...next.nodes, ...additions]); valid.forEach((item, index) => next.edges.push({ id: `edge_${crypto.randomUUID().slice(0, 8)}`, sourceId: ids[index], targetId: String(item.target_id), relation: 'reduces', strength: safeNumber(item.strength, 0.5), rationale: 'Proposed mitigation path.', status: 'draft', origin: 'agent' })); }, `Agent staged ${ids.length} mitigations.`, 'agent');
          setAgentNotice(`Agent staged ${ids.length} mitigations for your review.`);
          return { ok: true, changed_ids: ids, scenario_id: scenario.id, scenario_version: scenario.version + 1, summary: `Staged ${ids.length} mitigations for review.`, next: 'Ask the human to accept, revise, or reject each mitigation.' };
        },
      },
      {
        name: 'run_stress_test', title: 'Run a stress test', description: 'Run the deterministic local stress engine on accepted factors.',
        inputSchema: { type: 'object', required: ['scenario_id', 'scenario_version'], properties: { scenario_id: { type: 'string' }, scenario_version: { type: 'integer' } }, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true },
        execute: (input) => { const scenario = currentScenario(input); const stale = versionError(scenario, input); if (stale) return stale; const result = runStress(scenario.id); setAgentNotice(`Agent completed a stress test: exposure ${Math.round(result.exposureIndex)}.`); return { ok: true, scenario_id: scenario.id, scenario_version: scenario.version, exposure_index: result.exposureIndex, mitigation_coverage: result.mitigationCoverage, constraint_breaches: result.constraintBreaches, critical_paths: result.criticalPaths, unresolved_assumptions: result.unresolvedAssumptions, estimated_cost_delta: result.estimatedCostDelta, estimated_day_delta: result.estimatedDayDelta, top_paths: result.paths.slice(0, 3).map((path) => ({ id: path.id, label: path.label, contribution: path.contribution })) }; },
      },
      {
        name: 'compare_scenarios', title: 'Compare scenarios', description: 'Compare deterministic stress metrics across two to four scenarios.',
        inputSchema: { type: 'object', required: ['scenario_ids'], properties: { scenario_ids: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'string' } } }, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: (input) => ({ ok: true, comparisons: (Array.isArray(input.scenario_ids) ? input.scenario_ids.map(String) : []).map((id) => workspaceRef.current.scenarios.find((scenario) => scenario.id === id)).filter(Boolean).map((scenario) => { const result = scenarioMetrics(scenario!); return { scenario_id: scenario!.id, name: scenario!.name, exposure_index: result.exposureIndex, coverage: result.mitigationCoverage, breaches: result.constraintBreaches, critical_paths: result.criticalPaths, cost_delta: result.estimatedCostDelta, day_delta: result.estimatedDayDelta }; }) }),
      },
      {
        name: 'explain_impact_path', title: 'Explain an impact path', description: 'Explain the strongest modeled paths touching a factor.',
        inputSchema: { type: 'object', required: ['scenario_id', 'factor_id'], properties: { scenario_id: { type: 'string' }, factor_id: { type: 'string' } }, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: (input) => { const scenario = currentScenario(input); const factor = scenario.nodes.find((node) => node.id === input.factor_id); if (!factor) return { ok: false, code: 'not_found' }; const result = scenarioMetrics(scenario); return { ok: true, factor: { id: factor.id, label: factor.label, type: factor.type }, exposure: result.nodeExposure[factor.id] ?? 0, paths: result.paths.filter((path) => path.nodeIds.includes(factor.id)).slice(0, 5).map((path) => ({ label: path.label, contribution: path.contribution })), note: 'Contributions are deterministic sensitivity signals, not forecasts.' }; },
      },
    ];
    Promise.all(definitions.map(register))
      .then(() => { if (!controller.signal.aborted) setToolStatus('ready'); })
      .catch(() => { if (!controller.signal.aborted) setToolStatus('preview'); });
    return () => controller.abort();
  }, [commit, runStress, updateScenario]);

  const selectedConnections = selected ? active.edges.filter((edge) => edge.status !== 'rejected' && (edge.sourceId === selected.id || edge.targetId === selected.id)) : [];
  const prompt = active.status === 'baseline' ? 'Map the hidden assumptions this decision depends on. Stage proposals only; do not change locked factors.' : `Stress-test “${active.name}”, trace the strongest impact paths, and stage two mitigations for my review.`;

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand-lockup plain-button" onClick={resetDemo} aria-label="Reset product launch demo"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span className="brand-name">Cascade</span><span className="beta-chip">WebMCP</span></button>
        <button className="decision-title plain-button" onClick={() => setModal('new-plan')}><span>Decision</span><strong>{workspace.title}</strong></button>
        <div className="top-actions"><button className="ghost-button" onClick={() => setModal('new-plan')}>New plan</button><span className={`tool-status ${toolStatus}`}><i />{toolStatus === 'ready' ? '11 agent tools ready' : toolStatus === 'checking' ? 'Checking tools' : 'Preview mode'}</span><button className="outline-button" onClick={exportWorkspace}>Export</button></div>
      </header>

      <div className="workspace-grid">
        <aside className="scenario-rail">
          <section className="goal-card"><span className="eyebrow">Decision question</span><h1>{workspace.question}</h1><p>{workspace.goal}</p></section>
          <section className="rail-section"><div className="section-heading"><span>Scenarios</span><button aria-label="Add scenario" onClick={() => setModal('branch')}>+</button></div><div className="scenario-list">{workspace.scenarios.map((scenario) => <button className={`scenario-item ${scenario.id === active.id ? 'active' : ''}`} key={scenario.id} onClick={() => switchScenario(scenario.id)}><i /><span><strong>{scenario.name}</strong><small>{scenario.premise}</small></span>{scenario.id === active.id && <b>Live</b>}</button>)}</div></section>
          <section className="rail-section metrics-section"><div className="section-heading"><span>Modelled sensitivity</span><button onClick={() => runStress()}>Run</button></div><div className="metrics-grid"><div className="metric coral"><strong>{Math.round(metrics.exposureIndex)}</strong><span>Exposure</span></div><div className="metric teal"><strong>{metrics.mitigationCoverage}%</strong><span>Coverage</span></div><div className="metric ink"><strong>{metrics.constraintBreaches}</strong><span>Breaches</span></div></div></section>
          <button className="compare-button" onClick={() => setView(view === 'compare' ? 'map' : 'compare')}>⇄ Compare scenarios</button><p className="model-note">Sensitivity scores reveal fragile paths. They are deterministic signals, not forecasts.</p>
        </aside>

        <section className="canvas-panel" aria-label="Decision canvas">
          <div className="canvas-toolbar"><div className="mode-switch"><button className={view === 'map' ? 'selected' : ''} onClick={() => setView('map')}>Map</button><button className={view === 'list' ? 'selected' : ''} onClick={() => setView('list')}>List</button></div><div className="canvas-actions"><span className="version-pill">v{active.version}</span><button onClick={arrangeActive}>Arrange</button><button onClick={() => setModal('receipt')}>Receipt</button><button onClick={() => setModal('add-relationship')}>+ Link</button><button className="primary-small" onClick={() => setModal('add-factor')}>+ Factor</button></div></div>
          {view === 'map' && <div className="decision-canvas"><div className="canvas-label"><span>{active.name} map</span><small>{visibleNodes.length} factors · {visibleEdges.length} relationships</small></div><svg className="connections" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="edge-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 6 3 L 0 6 z" /></marker></defs>{visibleEdges.map((edge) => { const source = nodeById.get(edge.sourceId)!; const target = nodeById.get(edge.targetId)!; return <path key={edge.id} markerEnd="url(#edge-arrow)" className={`${edge.relation === 'blocks' ? 'risk-edge' : ''} ${edge.status === 'draft' ? 'draft-edge' : ''} ${selected && (edge.sourceId === selected.id || edge.targetId === selected.id) ? 'selected-edge' : ''}`} d={edgeCurve(source, target)} />; })}</svg>{visibleNodes.map((node) => <button key={node.id} className={`factor-node ${node.type} ${node.status} ${selected?.id === node.id ? 'selected-node' : ''}`} style={{ left: `${node.x}%`, top: `${node.y}%` }} onClick={() => { setSelectedId(node.id); setTab(node.status === 'draft' ? 'proposals' : 'factor'); }}><span className="node-topline"><span>{typeGlyph[node.type]} {node.type}</span>{node.locked && <b title="Human locked">◆</b>}</span><strong>{node.label}</strong><small>{node.status === 'draft' ? 'Agent proposal · review' : `${Math.round(node.confidence * 100)}% confidence`}</small></button>)}{!visibleNodes.length && <div className="empty-state"><strong>Start with the outcome.</strong><p>Add a factor, or ask your agent to stage a plan map.</p></div>}</div>}
          {view === 'list' && <div className="list-view">{factorTypes.map((type) => { const items = visibleNodes.filter((node) => node.type === type); if (!items.length) return null; return <section key={type}><h2>{typeGlyph[type]} {type}s <span>{items.length}</span></h2>{items.map((node) => <button key={node.id} className={`list-factor ${node.status}`} onClick={() => { setSelectedId(node.id); setTab(node.status === 'draft' ? 'proposals' : 'factor'); }}><span><strong>{node.label}</strong><small>{node.description}</small></span><b>{node.status === 'draft' ? 'Review' : `${Math.round(node.confidence * 100)}%`}</b></button>)}</section>; })}</div>}
          {view === 'compare' && <div className="compare-view"><div className="compare-intro"><span className="eyebrow">Scenario comparison</span><h2>See what bends—and what breaks.</h2><p>Every score comes from the same local, deterministic model.</p></div><div className="comparison-grid">{workspace.scenarios.map((scenario) => { const result = scenarioMetrics(scenario); return <article key={scenario.id} className={scenario.id === active.id ? 'current' : ''}><div><span>{scenario.status}</span><button onClick={() => switchScenario(scenario.id)}>Open</button></div><h3>{scenario.name}</h3><p>{scenario.premise}</p><strong className="exposure-number">{Math.round(result.exposureIndex)}</strong><small>exposure index</small><dl><div><dt>Coverage</dt><dd>{result.mitigationCoverage}%</dd></div><div><dt>Critical paths</dt><dd>{result.criticalPaths}</dd></div><div><dt>Day shift</dt><dd>{result.estimatedDayDelta > 0 ? '+' : ''}{result.estimatedDayDelta}</dd></div></dl></article>; })}</div></div>}
        </section>

        <aside className="inspector-panel"><div className="inspector-tabs"><button className={tab === 'factor' ? 'active' : ''} onClick={() => setTab('factor')}>Factor</button><button className={tab === 'proposals' ? 'active' : ''} onClick={() => setTab('proposals')}>Proposals <b>{proposalCount}</b></button><button className={tab === 'impact' ? 'active' : ''} onClick={() => setTab('impact')}>Impact</button></div>
          {tab === 'factor' && selected && <section className="inspector-content"><div className="factor-heading"><span className={`type-badge ${selected.type}`}>{typeGlyph[selected.type]} {selected.type}</span><button className={`lock-button ${selected.locked ? 'locked' : ''}`} onClick={() => updateScenario(active.id, (scenario) => { const node = scenario.nodes.find((item) => item.id === selected.id); if (node) node.locked = !node.locked; }, `${selected.locked ? 'Unlocked' : 'Locked'} “${selected.label}”.`)}>{selected.locked ? '◆ Locked' : '◇ Lock'}</button></div><h2>{selected.label}</h2><p className="factor-description">{selected.description}</p><div className="detail-row"><span>Confidence</span><strong>{Math.round(selected.confidence * 100)}%</strong></div><div className="confidence-track"><i style={{ width: `${Math.round(selected.confidence * 100)}%` }} /></div><div className="detail-row"><span>Impact magnitude</span><strong className={Math.abs(selected.impact) > .7 ? 'high' : ''}>{Math.round(Math.abs(selected.impact) * 100)}%</strong></div><div className="detail-row"><span>Provenance</span><strong>{selected.origin}</strong></div><div className="divider" /><span className="eyebrow">Connected factors</span>{selectedConnections.length ? selectedConnections.slice(0, 5).map((edge) => { const other = nodeById.get(edge.sourceId === selected.id ? edge.targetId : edge.sourceId); return other ? <button key={edge.id} className="connection-card" onClick={() => setSelectedId(other.id)}><i className={`${other.type}-dot`} /><span><strong>{other.label}</strong><small>{edge.relation.replace('_', ' ')} · strength {edge.strength.toFixed(1)}</small></span></button> : null; }) : <p className="muted-copy">No mapped relationships yet.</p>}<div className="divider" /><div className="agent-callout"><span className="agent-spark">✦</span><div><strong>Invite a second opinion</strong><p>Ask your agent to expose what this factor quietly depends on.</p></div></div></section>}
          {tab === 'proposals' && <section className="inspector-content proposal-stack"><span className="eyebrow">Agent staging area</span><h2>{proposalCount ? `${proposalCount} proposals need you` : 'Nothing waiting'}</h2><p className="factor-description">Agents can prepare factors and connections. Only you can admit them to the plan.</p>{drafts.map((draft) => <article className="proposal-card" key={draft.id}><span className={`type-badge ${draft.type}`}>{typeGlyph[draft.type]} {draft.type}</span><h3>{draft.label}</h3><p>{draft.rationale}</p><div><button onClick={() => rejectFactor(draft.id)}>Reject</button><button className="primary-small" onClick={() => acceptFactor(draft.id)}>Accept</button></div></article>)}{draftEdges.map((edge) => { const source = nodeById.get(edge.sourceId); const target = nodeById.get(edge.targetId); return <article className="proposal-card relationship-proposal" key={edge.id}><span className="type-badge relationship">↗ relationship</span><h3>{source?.label ?? edge.sourceId}<em>{edge.relation.replace('_', ' ')}</em>{target?.label ?? edge.targetId}</h3><p>{edge.rationale}</p><div><button onClick={() => rejectRelationship(edge.id)}>Reject</button><button className="primary-small" onClick={() => acceptRelationship(edge.id)}>Accept</button></div></article>; })}{!proposalCount && <div className="empty-proposals"><span>✓</span><p>The accepted model is fully reviewed.</p></div>}</section>}
          {tab === 'impact' && <section className="inspector-content impact-panel"><span className="eyebrow">Latest sensitivity run</span><div className="impact-score"><strong>{Math.round(metrics.exposureIndex)}</strong><span>Exposure index<br />{metrics.criticalPaths} critical paths</span></div><button className="run-button" onClick={() => runStress()}>Run stress test</button><div className="divider" /><span className="eyebrow">Strongest impact paths</span>{metrics.paths.slice(0, 4).map((path, index) => <button key={path.id} className="path-card" onClick={() => { setSelectedId(path.nodeIds[path.nodeIds.length - 1]); setTab('factor'); }}><b>{index + 1}</b><span><strong>{path.label}</strong><small>{Math.round(path.contribution * 100)}% modeled contribution</small></span></button>)}{!metrics.paths.length && <p className="muted-copy">Add an accepted risk or shock and connect it to see impact paths.</p>}<p className="method-note">Cascade propagates bounded edge strengths across accepted relationships, with depth decay. It does not claim probability or predict the future.</p></section>}
        </aside>
      </div>

      {agentNotice && <div className="agent-presence" role="status"><span>✦</span><div><small>LIVE AGENT ACTIVITY</small><strong>{agentNotice}</strong></div></div>}
      <div className="prompt-dock"><span className="agent-spark">✦</span><div><small>TRY WITH YOUR AGENT</small><strong>“{prompt}”</strong></div><button onClick={() => { navigator.clipboard.writeText(prompt); setToast('Agent prompt copied'); }}>Copy prompt</button></div>

      {modal && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}><section className="modal" role="dialog" aria-modal="true"><button className="modal-close" onClick={() => setModal(null)} aria-label="Close">×</button>
        {modal === 'new-plan' && <><span className="eyebrow">A fresh decision</span><h2>What are you trying to decide?</h2><div className="starter-choice"><button className={newPlanStarter === 'community' ? 'selected' : ''} onClick={() => { setNewPlanStarter('community'); setNewPlan({ title: 'Community tool-lending pilot', question: 'Can a neighborhood tool library reach useful scale without losing trust or inventory?', goal: 'Pilot a safe, inclusive lending program for 100 households over 12 weeks.' }); }}><span>↗ Pre-mortem starter</span><strong>Community tool lending</strong><small>A connected model of trust, inventory, safety, and participation</small></button><button className={newPlanStarter === 'blank' ? 'selected' : ''} onClick={() => { setNewPlanStarter('blank'); setNewPlan({ title: '', question: '', goal: '' }); }}><span>◇ Open canvas</span><strong>Start from scratch</strong><small>Bring any consequential plan</small></button></div><label>Plan name<input value={newPlan.title} onChange={(e) => setNewPlan({ ...newPlan, title: e.target.value })} placeholder="Choose a new market" /></label><label>Decision question<input value={newPlan.question} onChange={(e) => setNewPlan({ ...newPlan, question: e.target.value })} placeholder="Which option survives our constraints?" /></label><label>Desired outcome<textarea value={newPlan.goal} onChange={(e) => setNewPlan({ ...newPlan, goal: e.target.value })} placeholder="Describe the outcome, boundary, or deadline." /></label><button className="modal-primary" disabled={!newPlan.title || !newPlan.question || !newPlan.goal} onClick={() => { const next = newPlanStarter === 'community' ? createCommunityWorkspace(newPlan) : createBlankWorkspace(newPlan.title, newPlan.question, newPlan.goal); next.scenarios[0].nodes = arrangeNodes(next.scenarios[0].nodes); workspaceRef.current = next; setWorkspace(next); setSelectedId(next.scenarios[0].nodes[0].id); setNewPlan({ title: '', question: '', goal: '' }); setNewPlanStarter('blank'); setModal(null); setToast(newPlanStarter === 'community' ? 'Community pre-mortem ready' : 'New decision workspace created'); }}>Create workspace</button></>}
        {modal === 'add-factor' && <><span className="eyebrow">Human-authored factor</span><h2>Add something the plan depends on.</h2><label>Type<select value={newFactor.type} onChange={(e) => setNewFactor({ ...newFactor, type: e.target.value as FactorType })}>{factorTypes.map((type) => <option key={type}>{type}</option>)}</select></label><label>Label<input value={newFactor.label} onChange={(e) => setNewFactor({ ...newFactor, label: e.target.value })} placeholder="A concise, testable statement" /></label><label>Why it matters<textarea value={newFactor.description} onChange={(e) => setNewFactor({ ...newFactor, description: e.target.value })} placeholder="What happens if this is false?" /></label><div className="field-pair"><label>Confidence %<input type="number" min="0" max="100" value={newFactor.confidence} onChange={(e) => setNewFactor({ ...newFactor, confidence: e.target.value })} /></label><label>Impact %<input type="number" min="0" max="100" value={newFactor.impact} onChange={(e) => setNewFactor({ ...newFactor, impact: e.target.value })} /></label></div><button className="modal-primary" disabled={!newFactor.label} onClick={addFactor}>Add to accepted plan</button></>}
        {modal === 'add-relationship' && <><span className="eyebrow">Human-authored relationship</span><h2>Connect cause to consequence.</h2><p className="modal-copy">The arrow runs from the source factor to the target factor.</p><label>Source factor<select value={newRelationship.sourceId} onChange={(e) => setNewRelationship({ ...newRelationship, sourceId: e.target.value })}><option value="">Choose a source</option>{visibleNodes.map((node) => <option value={node.id} key={node.id}>{node.label}</option>)}</select></label><label>Relationship<select value={newRelationship.relation} onChange={(e) => setNewRelationship({ ...newRelationship, relation: e.target.value as Relation })}>{relations.map((relation) => <option value={relation} key={relation}>{relation.replace('_', ' ')}</option>)}</select></label><label>Target factor<select value={newRelationship.targetId} onChange={(e) => setNewRelationship({ ...newRelationship, targetId: e.target.value })}><option value="">Choose a target</option>{visibleNodes.filter((node) => node.id !== newRelationship.sourceId).map((node) => <option value={node.id} key={node.id}>{node.label}</option>)}</select></label><label>Why are they connected?<textarea value={newRelationship.rationale} onChange={(e) => setNewRelationship({ ...newRelationship, rationale: e.target.value })} placeholder="Explain the causal logic so a reviewer can challenge it." /></label><label>Strength %<input type="number" min="10" max="100" value={newRelationship.strength} onChange={(e) => setNewRelationship({ ...newRelationship, strength: e.target.value })} /></label><button className="modal-primary" disabled={!newRelationship.sourceId || !newRelationship.targetId || newRelationship.sourceId === newRelationship.targetId} onClick={addRelationship}>Add accepted relationship</button></>}
        {modal === 'branch' && <><span className="eyebrow">Isolated what-if</span><h2>Fork “{active.name}”.</h2><p className="modal-copy">The accepted scenario stays untouched. Your agent can safely apply shocks in the branch.</p><label>Scenario name<input value={newBranch.name} onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })} placeholder="Supplier delay" /></label><label>Changed premise<textarea value={newBranch.premise} onChange={(e) => setNewBranch({ ...newBranch, premise: e.target.value })} placeholder="What becomes different in this world?" /></label><button className="modal-primary" disabled={!newBranch.name || !newBranch.premise} onClick={() => createBranch()}>Create branch</button></>}
        {modal === 'receipt' && <><span className="eyebrow">Decision receipt</span><h2>{active.name}</h2><p className="modal-copy">A compact, inspectable record of what changed, who proposed it, and what remains unresolved.</p><div className="receipt-grid"><div><span>Accepted</span><strong>{active.nodes.filter((n) => n.status === 'accepted').length}</strong></div><div><span>Agent drafts</span><strong>{drafts.length}</strong></div><div><span>Locked</span><strong>{active.nodes.filter((n) => n.locked).length}</strong></div><div><span>Version</span><strong>{active.version}</strong></div></div><h3>Recent activity</h3><ol className="activity-list">{workspace.activity.slice(0, 6).map((entry) => <li key={entry.id}><i className={entry.actor} /><span><strong>{entry.action}</strong><small>{entry.actor} · {new Date(entry.createdAt).toLocaleString()}</small></span></li>)}</ol>{active.status === 'branch' && <button className="modal-primary" onClick={() => { commit((next) => { next.scenarios.forEach((scenario) => { if (scenario.id === active.id) scenario.status = 'accepted'; }); next.baselineScenarioId = active.id; next.activity.unshift({ id: crypto.randomUUID(), actor: 'human', action: `Promoted “${active.name}” as the accepted decision.`, createdAt: new Date().toISOString() }); return next; }); setModal(null); setToast('Branch promoted by the decision owner'); }}>Promote this branch</button>}</>}
      </section></div>}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
