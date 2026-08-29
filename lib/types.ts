export type FactorType =
  | 'objective'
  | 'assumption'
  | 'dependency'
  | 'constraint'
  | 'risk'
  | 'mitigation'
  | 'outcome'
  | 'shock';

export type FactorStatus = 'accepted' | 'draft' | 'rejected';
export type FactorOrigin = 'human' | 'agent' | 'sample';
export type Relation = 'depends_on' | 'enables' | 'amplifies' | 'reduces' | 'blocks';

export type FactorNode = {
  id: string;
  type: FactorType;
  label: string;
  description: string;
  rationale: string;
  confidence: number;
  likelihood?: number;
  severity?: number;
  impact: number;
  estimatedCost?: number;
  estimatedDays?: number;
  status: FactorStatus;
  locked: boolean;
  origin: FactorOrigin;
  x: number;
  y: number;
};

export type FactorEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  relation: Relation;
  strength: number;
  rationale: string;
  status: FactorStatus;
  origin: FactorOrigin;
};

export type ImpactPath = {
  id: string;
  label: string;
  nodeIds: string[];
  contribution: number;
};

export type StressResult = {
  id: string;
  scenarioId: string;
  scenarioVersion: number;
  exposureIndex: number;
  mitigationCoverage: number;
  constraintBreaches: number;
  criticalPaths: number;
  unresolvedAssumptions: number;
  estimatedCostDelta: number;
  estimatedDayDelta: number;
  nodeExposure: Record<string, number>;
  paths: ImpactPath[];
  warnings: string[];
  createdAt: string;
};

export type Scenario = {
  id: string;
  name: string;
  premise: string;
  parentScenarioId: string | null;
  status: 'baseline' | 'branch' | 'accepted' | 'archived';
  version: number;
  nodes: FactorNode[];
  edges: FactorEdge[];
  stressResult?: StressResult;
};

export type ActivityEntry = {
  id: string;
  actor: 'human' | 'agent' | 'system';
  action: string;
  createdAt: string;
};

export type Workspace = {
  id: string;
  title: string;
  question: string;
  goal: string;
  budget?: number;
  baselineScenarioId: string;
  activeScenarioId: string;
  version: number;
  scenarios: Scenario[];
  activity: ActivityEntry[];
};

export type ToolResult = {
  ok: boolean;
  code?: string;
  message?: string;
  summary?: string;
  scenario_id?: string;
  scenario_version?: number;
  changed_ids?: string[];
  blocked_ids?: string[];
  next?: string;
  [key: string]: unknown;
};
