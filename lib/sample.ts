import type { FactorEdge, FactorNode, Scenario, Workspace } from './types';
import { arrangeNodes } from './layout';

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

export const createCommunityWorkspace = (overrides?: Partial<Pick<Workspace, 'title' | 'question' | 'goal'>>): Workspace => {
  const nodes: FactorNode[] = arrangeNodes([
    { id: 'community_goal', type: 'objective', label: 'Safe, useful access for 100 households', description: 'The pilot makes occasional-use tools affordable without sacrificing safety or trust.', rationale: 'The outcome the community program exists to create.', confidence: 1, impact: 1, status: 'accepted', locked: true, origin: 'sample', x: 0, y: 0 },
    { id: 'community_safety', type: 'constraint', label: 'Every tool passes a safety inspection', description: 'Unsafe, recalled, or damaged tools cannot enter circulation.', rationale: 'Physical safety is a non-negotiable boundary.', confidence: 1, impact: 1, status: 'accepted', locked: true, origin: 'sample', x: 0, y: 0 },
    { id: 'community_budget', type: 'constraint', label: '$6,000 pilot budget', description: 'Storage, insurance, software, and repair costs must stay inside the grant.', rationale: 'The grant is fixed for the twelve-week pilot.', confidence: 1, impact: .82, estimatedCost: 6000, status: 'accepted', locked: true, origin: 'sample', x: 0, y: 0 },
    { id: 'community_donations', type: 'assumption', label: 'Residents donate 80 useful tools', description: 'The inventory must cover enough common jobs to make membership worthwhile.', rationale: 'Variety drives usefulness and repeat participation.', confidence: .58, impact: .78, status: 'accepted', locked: false, origin: 'sample', x: 0, y: 0 },
    { id: 'community_volunteers', type: 'assumption', label: 'Volunteers sustain 12 hours each week', description: 'Inspection, handoff, returns, and repairs depend on predictable volunteer capacity.', rationale: 'The pilot has no full-time staff.', confidence: .61, impact: .84, status: 'accepted', locked: false, origin: 'sample', x: 0, y: 0 },
    { id: 'community_inventory', type: 'dependency', label: 'Inventory and reservation records stay accurate', description: 'Members need reliable availability, condition, borrower, and due-date information.', rationale: 'Shared physical inventory fails when its digital state drifts.', confidence: .72, impact: .9, status: 'accepted', locked: false, origin: 'sample', x: 0, y: 0 },
    { id: 'community_training', type: 'dependency', label: 'Borrowers understand safe use', description: 'Short orientations cover protective equipment and high-risk tools.', rationale: 'Safe operation depends on more than inspecting equipment.', confidence: .66, impact: .88, status: 'accepted', locked: false, origin: 'sample', x: 0, y: 0 },
    { id: 'community_loss', type: 'risk', label: 'Loss and late returns shrink useful inventory', description: 'Unavailable tools can make the service feel unreliable and erode member trust.', rationale: 'A small shared inventory is sensitive to missing items.', confidence: .7, likelihood: .44, severity: .72, impact: .76, status: 'accepted', locked: false, origin: 'sample', x: 0, y: 0 },
    { id: 'community_burnout', type: 'risk', label: 'Volunteer burnout disrupts opening hours', description: 'Unpredictable service makes pickup and return inconvenient.', rationale: 'Operations are concentrated in a small group.', confidence: .68, likelihood: .52, severity: .7, impact: .74, status: 'accepted', locked: false, origin: 'sample', x: 0, y: 0 },
    { id: 'community_outcome', type: 'outcome', label: 'Twelve-week pilot earns community renewal', description: 'At least 100 households join, tools circulate safely, and the next funding round is justified.', rationale: 'The pilot must demonstrate both utility and stewardship.', confidence: .62, impact: 1, estimatedDays: 84, status: 'accepted', locked: false, origin: 'sample', x: 0, y: 0 },
    { id: 'community_draft_equity', type: 'risk', label: 'Deposits and late fees exclude households', description: 'Controls intended to protect inventory may undermine equitable access.', rationale: 'A hidden tradeoff between loss prevention and inclusion.', confidence: .63, likelihood: .46, severity: .7, impact: .73, status: 'draft', locked: false, origin: 'agent', x: 0, y: 0 },
    { id: 'community_draft_insurance', type: 'dependency', label: 'Insurance covers the highest-demand tools', description: 'Coverage exclusions may quietly remove power tools from the viable inventory.', rationale: 'A legal dependency should be verified before donations are accepted.', confidence: .45, impact: .86, status: 'draft', locked: false, origin: 'agent', x: 0, y: 0 },
  ]);
  const edges: FactorEdge[] = [
    { id: 'community_edge_donations', sourceId: 'community_donations', targetId: 'community_inventory', relation: 'enables', strength: .78, rationale: 'Donations create the catalog members can reserve.', status: 'accepted', origin: 'sample' },
    { id: 'community_edge_volunteers_inventory', sourceId: 'community_volunteers', targetId: 'community_inventory', relation: 'enables', strength: .82, rationale: 'Volunteers maintain inventory state and handoffs.', status: 'accepted', origin: 'sample' },
    { id: 'community_edge_safety_training', sourceId: 'community_safety', targetId: 'community_training', relation: 'depends_on', strength: .8, rationale: 'The safety promise requires borrower orientation.', status: 'accepted', origin: 'sample' },
    { id: 'community_edge_inventory_loss', sourceId: 'community_inventory', targetId: 'community_loss', relation: 'reduces', strength: .67, rationale: 'Accurate records reduce preventable loss.', status: 'accepted', origin: 'sample' },
    { id: 'community_edge_volunteers_burnout', sourceId: 'community_volunteers', targetId: 'community_burnout', relation: 'blocks', strength: .58, rationale: 'Insufficient capacity increases burnout risk.', status: 'accepted', origin: 'sample' },
    { id: 'community_edge_loss_outcome', sourceId: 'community_loss', targetId: 'community_outcome', relation: 'blocks', strength: .7, rationale: 'Low availability undermines usefulness and renewal.', status: 'accepted', origin: 'sample' },
    { id: 'community_edge_burnout_outcome', sourceId: 'community_burnout', targetId: 'community_outcome', relation: 'blocks', strength: .74, rationale: 'Unreliable hours undermine participation.', status: 'accepted', origin: 'sample' },
    { id: 'community_edge_training_outcome', sourceId: 'community_training', targetId: 'community_outcome', relation: 'enables', strength: .76, rationale: 'Safe borrowers support incident-free circulation.', status: 'accepted', origin: 'sample' },
    { id: 'community_edge_inventory_outcome', sourceId: 'community_inventory', targetId: 'community_outcome', relation: 'enables', strength: .84, rationale: 'Reliable reservations are central to member value.', status: 'accepted', origin: 'sample' },
    { id: 'community_edge_equity', sourceId: 'community_draft_equity', targetId: 'community_outcome', relation: 'blocks', strength: .62, rationale: 'Exclusion would reduce reach and legitimacy.', status: 'draft', origin: 'agent' },
    { id: 'community_edge_insurance', sourceId: 'community_draft_insurance', targetId: 'community_donations', relation: 'blocks', strength: .72, rationale: 'Coverage exclusions constrain the usable catalog.', status: 'draft', origin: 'agent' },
  ];
  const scenario: Scenario = { id: 'scn_community_baseline', name: 'Baseline', premise: 'A volunteer-run twelve-week neighborhood pilot.', parentScenarioId: null, status: 'baseline', version: 1, nodes, edges };
  return {
    id: `workspace_${crypto.randomUUID().slice(0, 8)}`,
    title: overrides?.title ?? 'Community tool-lending pilot',
    question: overrides?.question ?? 'Can a neighborhood tool library reach useful scale without losing trust or inventory?',
    goal: overrides?.goal ?? 'Pilot a safe, inclusive lending program for 100 households over 12 weeks.',
    budget: 6000,
    baselineScenarioId: scenario.id,
    activeScenarioId: scenario.id,
    version: 1,
    scenarios: [scenario],
    activity: [{ id: crypto.randomUUID(), actor: 'system', action: 'Loaded the community tool-lending pre-mortem starter.', createdAt: new Date().toISOString() }],
  };
};
