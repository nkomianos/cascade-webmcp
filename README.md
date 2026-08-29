# Cascade

**Stress-test decisions with your agent.**

Cascade is a WebMCP-native decision canvas where a person and their agent turn a plan into an inspectable map of assumptions, dependencies, constraints, risks, and outcomes. The agent can stage a model, fork what-if worlds, apply shocks, and trace impact paths. The person keeps authority over locks, accepted facts, rejected proposals, and which branch becomes the decision.

The default demo stress-tests the launch of a privacy-first team planning app in six weeks. A second, fully connected community tool-lending pre-mortem proves the model is reusable for migrations, events, policies, civic programs, hiring plans, research programs, or any decision with hidden dependencies.

## Why WebMCP

A conventional chatbot can discuss a plan, but it cannot safely and reliably manipulate the exact decision state visible in a browser. Cascade exposes compact, typed tools directly from the page. This gives the agent precise access to the active scenario while the visual interface gives the human provenance, review controls, locks, comparisons, and a decision receipt.

The collaboration boundary is the product:

- The agent explores breadth: hidden assumptions, counterfactual branches, shocks, mitigations, and causal paths.
- The human supplies judgment: what is true, what is locked, which proposals are accepted, and which branch is promoted.
- Agent changes are staged as drafts unless they occur inside an isolated what-if branch.
- Every mutating tool uses scenario versions to reject stale writes.
- The stress engine is local and deterministic. Its scores are sensitivity signals, not forecasts.

## WebMCP tools

| Tool | Purpose |
| --- | --- |
| `read_workspace` | Read the decision, goal, and scenario summaries |
| `read_scenario` | Inspect factors, relationships, locks, and stress state |
| `stage_plan_map` | Stage structured factors for human review |
| `revise_draft` | Refine one unlocked draft |
| `stage_relationships` | Stage causal links between existing factors |
| `fork_scenario` | Create an isolated what-if branch |
| `apply_shock` | Add a bounded shock to a branch |
| `stage_mitigations` | Propose mitigations and reduction links |
| `run_stress_test` | Run the deterministic sensitivity engine |
| `compare_scenarios` | Compare two to four scenario results |
| `explain_impact_path` | Explain paths touching a selected factor |

Tools are registered imperatively with `document.modelContext.registerTool()`. Schemas are closed with `additionalProperties: false`, writes are bounded, outputs are compact, user content is marked untrusted, and read-only tools declare `readOnlyHint`.

## Demo script

1. Open the included **Billing delay** scenario and run its stress test.
2. Ask the agent: “Read this decision, compare the scenarios, and explain the strongest impact path.”
3. Ask: “Stage two mitigations for the billing-delay branch. Do not change locked factors.”
4. Review the staged proposals in the **Proposals** tab; accept one and reject another.
5. Re-run the stress test and open the decision receipt.

Drag any factor card to reorganize the map. Connections stay anchored to the cards in real time, and the canvas supports pan, zoom, and fit-to-view controls. Card positions persist locally without changing the decision model's semantic version.

Choose **New plan → Product launch** for the featured, preselected demo. Cascade loads a connected pre-mortem covering demand, reliability, budget, trust, and timing. To prove the model is reusable beyond software, **Community tool lending** remains available as an alternate connected starter; **Start from scratch** supports any consequential plan.

## Run locally

Requirements: Node.js 22.13 or later and a WebMCP-enabled browser.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. In Google Chrome, enable `chrome://flags/#enable-webmcp-testing`. Cascade also works as a normal human-only web app when WebMCP is unavailable.

```bash
npm test
npm run lint
npm run build
```

## Architecture

- `app/cascade-app.tsx` — human interface, local persistence, and WebMCP registration
- `app/decision-flow.tsx` — draggable React Flow canvas with measured edge anchors
- `lib/sample.ts` — product-launch demonstration plus generic blank workspace
- `lib/layout.ts` — deterministic semantic-lane arrangement
- `lib/stress.ts` — deterministic graph propagation and scenario metrics
- `lib/types.ts` — shared decision-domain model
- `lib/stress.test.ts` — invariants for determinism, shocks, and draft isolation

Data is kept in browser `localStorage`; there is no account requirement and no external AI API. The connected agent operates through the page's WebMCP tools. The interactive node canvas uses the MIT-licensed [React Flow](https://github.com/xyflow/xyflow) library.

## License

[MIT](LICENSE)
