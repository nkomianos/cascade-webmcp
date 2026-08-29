import type { FactorEdge, FactorNode, Scenario, Workspace } from './types';

const now = '2026-08-28T12:00:00.000Z';

const acceptedNodes: FactorNode[] = [
  { id: 'goal_launch', type: 'objective', label: 'Open a reliable public beta for 500 teams', description: 'A usable beta with onboarding, billing, documentation, and support.', rationale: 'The outcome the launch plan is designed to achieve.', confidence: 1, impact: 1, status: 'accepted', locked: true, origin: 'sample', x: 76, y: 5 },
  { id: 'constraint_privacy', type: 'constraint', label: 'Privacy-first data policy', description: 'Do not collect personal data that is not necessary to operate the product.', rationale: 'A product principle and launch boundary.', confidence: 1, impact: 0.95, status: 'accepted', locked: true, origin: 'sample', x: 1, y: 5 },
  { id: 'constraint_budget', type: 'constraint', label: '$12,000 launch budget', description: 'Total launch spending cannot exceed the approved budget.', rationale: 'A fixed operating boundary.', confidence: 1, impact: 0.8, estimatedCost: 12000, status: 'accepted', locked: true, origin: 'sample', x: 1, y: 30 },
  { id: 'assumption_capacity', type: 'assumption', label: 'Three-person team has 14 build-weeks', description: 'The launch plan assumes predictable availability across product, engineering, and go-to-market.', rationale: 'Capacity supports every critical path.', confidence: 0.68, impact: 0.78, status: 'accepted', locked: false, origin: 'sample', x: 26, y: 30 },
  { id: 'dependency_billing', type: 'dependency', label: 'Billing integration passes QA', description: 'Paid plans depend on the provider integration completing security and checkout testing.', rationale: 'Required before paid plans can open.', confidence: 0.62, impact: 0.9, status: 'accepted', locked: false, origin: 'sample', x: 51, y: 5 },
  { id: 'dependency_onboarding', type: 'dependency', label: 'Onboarding completion stays above 70%', description: 'New teams must reach their first shared plan without support intervention.', rationale: 'Activation is required for a meaningful beta.', confidence: 0.74, impact: 0.7, status: 'accepted', locked: false, origin: 'sample', x: 51, y: 30 },
  { id: 'dependency_docs', type: 'dependency', label: 'Launch documentation is complete', description: 'Setup, privacy, billing, and recovery guidance are available before launch.', rationale: 'Documentation reduces avoidable support volume.', confidence: 0.72, impact: 0.52, status: 'accepted', locked: false, origin: 'sample', x: 1, y: 55 },
  { id: 'risk_support', type: 'risk', label: 'Support demand exceeds capacity', description: 'The team may be unable to respond quickly during the launch window.', rationale: 'Onboarding or billing friction could create a concentrated support spike.', confidence: 0.7, likelihood: 0.58, severity: 0.78, impact: 0.76, status: 'accepted', locked: false, origin: 'sample', x: 51, y: 55 },
  { id: 'outcome_launch', type: 'outcome', label: 'Public beta launches in six weeks', description: 'The launch lands at the planned industry event with core promises intact.', rationale: 'The plan has a fixed external moment.', confidence: 0.66, impact: 1, estimatedDays: 42, status: 'accepted', locked: false, origin: 'sample', x: 76, y: 30 },
  { id: 'draft_qa_window', type: 'assumption', label: 'Two weeks is enough for end-to-end QA', description: 'The schedule assumes billing, onboarding, and account recovery can be tested in parallel.', rationale: 'This timing assumption is not yet verified.', confidence: 0.46, impact: 0.7, status: 'draft', locked: false, origin: 'agent', x: 1, y: 80 },
  { id: 'draft_event_risk', type: 'risk', label: 'The event date compresses recovery time', description: 'A fixed launch moment leaves little room to recover from integration delays.', rationale: 'A calendar dependency can amplify several technical risks.', confidence: 0.64, likelihood: 0.5, severity: 0.74, impact: 0.72, status: 'draft', locked: false, origin: 'agent', x: 76, y: 55 },
  { id: 'draft_recovery', type: 'dependency', label: 'Account recovery works without support', description: 'New users can resolve sign-in and access problems independently.', rationale: 'A hidden dependency of launch-week support capacity.', confidence: 0.55, impact: 0.64, status: 'draft', locked: false, origin: 'agent', x: 26, y: 55 },
];

const acceptedEdges: FactorEdge[] = [
  { id: 'edge_privacy_billing', sourceId: 'constraint_privacy', targetId: 'dependency_billing', relation: 'depends_on', strength: 0.42, rationale: 'Billing design must preserve the data boundary.', status: 'accepted', origin: 'sample' },
  { id: 'edge_budget_capacity', sourceId: 'constraint_budget', targetId: 'assumption_capacity', relation: 'blocks', strength: 0.35, rationale: 'Budget limits additional launch capacity.', status: 'accepted', origin: 'sample' },
  { id: 'edge_capacity_billing', sourceId: 'assumption_capacity', targetId: 'dependency_billing', relation: 'enables', strength: 0.72, rationale: 'Engineering capacity enables billing completion.', status: 'accepted', origin: 'sample' },
  { id: 'edge_capacity_onboarding', sourceId: 'assumption_capacity', targetId: 'dependency_onboarding', relation: 'enables', strength: 0.68, rationale: 'Product capacity supports onboarding quality.', status: 'accepted', origin: 'sample' },
  { id: 'edge_billing_launch', sourceId: 'dependency_billing', targetId: 'outcome_launch', relation: 'enables', strength: 0.86, rationale: 'Paid launch depends on billing readiness.', status: 'accepted', origin: 'sample' },
  { id: 'edge_onboarding_launch', sourceId: 'dependency_onboarding', targetId: 'outcome_launch', relation: 'enables', strength: 0.76, rationale: 'Activation quality supports launch success.', status: 'accepted', origin: 'sample' },
  { id: 'edge_docs_support', sourceId: 'dependency_docs', targetId: 'risk_support', relation: 'reduces', strength: 0.62, rationale: 'Better documentation reduces support demand.', status: 'accepted', origin: 'sample' },
  { id: 'edge_onboarding_support', sourceId: 'dependency_onboarding', targetId: 'risk_support', relation: 'reduces', strength: 0.54, rationale: 'Successful onboarding reduces support load.', status: 'accepted', origin: 'sample' },
  { id: 'edge_support_launch', sourceId: 'risk_support', targetId: 'outcome_launch', relation: 'blocks', strength: 0.58, rationale: 'Support overload can degrade the launch.', status: 'accepted', origin: 'sample' },
  { id: 'edge_draft_qa', sourceId: 'draft_qa_window', targetId: 'dependency_billing', relation: 'enables', strength: 0.66, rationale: 'QA time supports billing readiness.', status: 'draft', origin: 'agent' },
  { id: 'edge_draft_event', sourceId: 'draft_event_risk', targetId: 'outcome_launch', relation: 'blocks', strength: 0.7, rationale: 'Date pressure reduces recovery options.', status: 'draft', origin: 'agent' },
  { id: 'edge_draft_recovery', sourceId: 'draft_recovery', targetId: 'risk_support', relation: 'reduces', strength: 0.58, rationale: 'Self-service recovery reduces support demand.', status: 'draft', origin: 'agent' },
];

const baseline: Scenario = {
  id: 'scn_baseline',
  name: 'Baseline',
  premise: 'The accepted six-week launch plan.',
  parentScenarioId: null,
  status: 'baseline',
  version: 4,
  nodes: acceptedNodes,
  edges: acceptedEdges,
};

const billingDelay: Scenario = {
  ...structuredClone(baseline),
  id: 'scn_billing_delay',
  name: 'Billing delay',
  premise: 'The billing integration is delayed by three weeks.',
  parentScenarioId: baseline.id,
  status: 'branch',
  version: 3,
  nodes: [
    ...structuredClone(acceptedNodes),
    { id: 'shock_billing_delay', type: 'shock', label: 'Billing delayed by three weeks', description: 'The external billing integration will not be ready for the planned launch date.', rationale: 'A plausible external dependency failure.', confidence: 1, impact: 0.92, estimatedDays: 21, status: 'accepted', locked: false, origin: 'sample', x: 26, y: 5 },
    { id: 'mit_free_beta', type: 'mitigation', label: 'Launch as a free beta first', description: 'Open the product at the event but delay paid-plan activation.', rationale: 'Preserves the date while removing billing from the immediate critical path.', confidence: 0.8, impact: -0.66, estimatedDays: -12, status: 'draft', locked: false, origin: 'agent', x: 26, y: 80 },
    { id: 'mit_message_shift', type: 'mitigation', label: 'Reframe campaign around early access', description: 'Change the launch promise from paid availability to a guided early-access program.', rationale: 'Aligns expectations with the revised scope.', confidence: 0.76, impact: -0.48, estimatedCost: 800, status: 'draft', locked: false, origin: 'agent', x: 51, y: 80 },
  ],
  edges: [
    ...structuredClone(acceptedEdges),
    { id: 'edge_shock_billing', sourceId: 'shock_billing_delay', targetId: 'dependency_billing', relation: 'blocks', strength: 0.94, rationale: 'The delay directly blocks billing readiness.', status: 'accepted', origin: 'sample' },
    { id: 'edge_mit_free', sourceId: 'mit_free_beta', targetId: 'dependency_billing', relation: 'reduces', strength: 0.76, rationale: 'A free beta reduces immediate billing dependency.', status: 'draft', origin: 'agent' },
    { id: 'edge_mit_message', sourceId: 'mit_message_shift', targetId: 'outcome_launch', relation: 'reduces', strength: 0.5, rationale: 'Expectation-setting reduces launch damage.', status: 'draft', origin: 'agent' },
  ],
};

export const createSampleWorkspace = (): Workspace => ({
  id: 'workspace_cascade_demo',
  title: 'Launch a privacy-first planning app',
  question: 'Can this launch survive the assumptions it depends on?',
  goal: 'Open a reliable public beta for 500 teams in six weeks, within a $12,000 launch budget.',
  budget: 12000,
  baselineScenarioId: baseline.id,
  activeScenarioId: baseline.id,
  version: 7,
  scenarios: [structuredClone(baseline), structuredClone(billingDelay)],
  activity: [
    { id: 'activity_seed', actor: 'system', action: 'Loaded the product-launch demonstration workspace.', createdAt: now },
  ],
});

export const createBlankWorkspace = (title: string, question: string, goal: string): Workspace => {
  const scenarioId = `scn_${crypto.randomUUID().slice(0, 8)}`;
  return {
    id: `workspace_${crypto.randomUUID().slice(0, 8)}`,
    title,
    question,
    goal,
    baselineScenarioId: scenarioId,
    activeScenarioId: scenarioId,
    version: 1,
    scenarios: [{
      id: scenarioId,
      name: 'Baseline',
      premise: 'The current accepted plan.',
      parentScenarioId: null,
      status: 'baseline',
      version: 1,
      nodes: [{
        id: `goal_${crypto.randomUUID().slice(0, 8)}`,
        type: 'objective',
        label: goal.slice(0, 120),
        description: goal,
        rationale: 'The outcome this plan is designed to achieve.',
        confidence: 1,
        impact: 1,
        status: 'accepted',
        locked: true,
        origin: 'human',
        x: 65,
        y: 34,
      }],
      edges: [],
    }],
    activity: [{ id: `activity_${crypto.randomUUID().slice(0, 8)}`, actor: 'human', action: 'Created a new decision workspace.', createdAt: new Date().toISOString() }],
  };
};
