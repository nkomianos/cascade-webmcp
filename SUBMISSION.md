# Cascade — WebMCP Challenge submission kit

## Elevator pitch

All plans look solid until reality changes. Cascade lets people and agents map assumptions, fork what-if worlds, apply shocks, and approve resilient decisions—without surrendering human judgment.

## Submission description

Cascade is a shared decision canvas for stress-testing any consequential plan. The included demo examines a six-week product launch, but the same model works for migrations, policies, events, hiring plans, and research programs.

The use case is a strong fit for WebMCP because the agent needs structured, live access to the exact decision state a person sees—not a screenshot or a lossy summary. Cascade registers eleven typed tools that let an agent read the workspace, stage factors and causal relationships, revise drafts, fork isolated scenarios, apply shocks, propose mitigations, run a deterministic stress test, compare branches, and explain impact paths.

The human and agent have deliberately different powers. The agent explores breadth and counterfactuals; the person controls locks, accepts or rejects proposals, and decides whether a branch becomes the plan. Agent proposals appear directly in the visual review queue with provenance. Scenario versions reject stale writes, inputs are bounded, tool schemas are closed, and user-authored content is marked untrusted.

Before WebMCP, this workflow required copying a plan into chat, losing the page’s live state, then manually translating a response back into a diagram. In Cascade, an agent can reason over the actual model and stage visible changes while the human remains in charge of truth and commitment.

WebMCP is implemented with imperative `document.modelContext.registerTool()` calls in the top-level page. The app is local-first, requires no account, and uses a deterministic graph-propagation engine so judges can reproduce every score. Its React Flow canvas lets people drag factors into a meaningful spatial arrangement while measured edge anchors follow every move in real time.

## Demo video outline (2:35)

- **0:00–0:18 — Hook:** “Most planning tools preserve the plan. Cascade preserves the reasoning—and lets an agent test it.” Show the product-launch baseline.
- **0:18–0:42 — Human model:** Drag a factor while its causal links follow, then select a locked privacy constraint, an uncertain billing dependency, and the agent proposal queue.
- **0:42–1:10 — WebMCP:** Ask the agent to read the workspace and explain the hidden assumptions. Briefly show the eleven registered tools.
- **1:10–1:38 — Counterfactual:** Open the Billing delay branch, run the stress test, and highlight the causal path from shock to launch outcome.
- **1:38–2:02 — Collaboration:** Ask the agent to stage two mitigations. Accept one and reject one in the Proposals tab.
- **2:02–2:22 — Decision:** Re-run the stress test, compare scenarios, and open the decision receipt.
- **2:22–2:35 — Close:** “Agents explore what could happen. People decide what becomes true. That is the agent-native web Cascade is built for.”

## Suggested agent prompts

1. `Read this decision workspace and identify its three most fragile assumptions. Do not change anything.`
2. `Compare the baseline and billing-delay scenarios, then explain the strongest impact path.`
3. `Stage two mitigations for the billing-delay branch. Do not modify locked factors.`
4. `After I review the proposals, run the stress test again and summarize what improved.`

## Optional domain-switch moment

Open **New plan → Community tool lending** to show that Cascade is not a hardcoded launch demo. The connected starter immediately reframes the same human-agent workflow around safety, inventory loss, equitable access, insurance, and volunteer burnout.
