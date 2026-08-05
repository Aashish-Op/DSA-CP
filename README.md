# FlowOps

## Intelligent Real-Time Dispatch & Operations Platform

FlowOps is a browser-based operations control center for prioritizing service jobs, discovering qualified workers, computing routes, assigning work, and explaining reoptimization decisions.

## 1. Problem

Dispatch teams must balance urgency, worker skills, travel time, SLA risk, capacity, and changing field conditions. Manual decisions become slow and difficult to explain when workers fail, traffic changes, or a burst of jobs arrives.

## 2. Solution

FlowOps combines classical data structures and bounded optimization into an interactive dispatch simulation. The dashboard exposes operational state, algorithm traces, route calculations, event streams, audit records, and what-if scenarios.

## 3. Core Features

- Operations dashboard with KPI cards, jobs, workers, utilization, and live events.
- Skill-based worker discovery through a Hash Map index.
- Priority ordering with a Max Heap.
- Weighted service graph routing with Dijkstra and a Min Heap.
- Candidate filtering, constraint validation, and greedy assignment.
- Bounded backtracking and dynamic programming verification.
- Worker failure, emergency job, traffic spike, and job burst simulations.
- Event stream, audit trail, optimization trace, and rolling analytics.

## 4. Architecture

The UI is a static HTML shell styled by CSS and driven by `summerprojecthtml/FlowOps_app.js`. The application keeps simulation state in memory and connects views through an event-driven rendering layer.

The dispatch path is: validate, prioritize with a Max Heap, discover workers through the skill Hash Map, filter constraints, calculate a graph route with Dijkstra, score feasible assignments, verify bounded alternatives, then emit events and update analytics.

See [ARCHITECTURE.md](ARCHITECTURE.md) and the focused notes in [docs](docs).

## 5. DSA Used

- **Hash Map -> fast skill-based candidate discovery:** skill keys map to worker IDs for average O(1) lookup.
- **Max Heap -> priority ordering:** highest urgency and SLA risk are processed first.
- **Graph + Dijkstra + Min Heap -> route computation:** weighted locations produce a lowest-cost path.
- **Greedy assignment -> fast feasible dispatch:** the best currently feasible worker is selected immediately.
- **Backtracking -> bounded constrained scheduling:** small batches explore alternatives with pruning.
- **Dynamic Programming -> bounded assignment optimization:** repeated worker-mask states are memoized.
- **Sliding window/deque -> rolling operational analytics:** response metrics stay bounded while reflecting recent intervals.

## 6. Algorithm Complexity

| Component | Complexity |
| --- | --- |
| Hash Map skill lookup | O(1) average lookup, plus returned candidates |
| Max Heap push/pop | O(log n) |
| Min Heap push/pop | O(log n) |
| Dijkstra with binary heap | O((V + E) log V) |
| Worker index rebuild | O(total worker-skill entries) |
| Greedy assignment | O(J x (C + route cost)) |
| Backtracking | Exponential in the bounded batch; pruned in practice |
| Dynamic Programming | Bounded by jobs and worker-mask states |
| Sliding window update | O(1) amortized per sample |

The optimizer minimizes:

`Objective = alpha x TravelCost + beta x DelayRisk + gamma x SLAPenalty + delta x ReassignmentCost`

The UI weights are the practical equivalents of alpha, beta, gamma, and delta.

## 7. Dynamic Re-Optimization

Operational events mutate state and trigger recovery rather than waiting for a full restart. A worker failure releases impacted jobs, an emergency job enters the priority queue, a traffic spike changes regional edge costs, and a job burst stresses queue ordering. Reoptimization records the cause, affected assignments, event stream entries, audit records, and updated rolling metrics.

## 8. Demo Scenarios

Open **Simulate Disruption** from Operations and choose Worker Unavailable, Emergency Job, Route Cost Spike, or Job Burst. The Routes view demonstrates Dijkstra, the Optimizer view shows the decision trace, Security & Audit shows records, and Analytics shows rolling metrics.

## 9. Technology Stack

- HTML5, CSS3, and modern browser JavaScript
- ES classes, Maps, Sets, Canvas, and DOM events
- No backend or third-party runtime dependency

## 10. Running Locally

From the repository root, open `summerprojecthtml/index.html` in a modern browser. A local static server is optional:

```powershell
cd summerprojecthtml
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## 11. Project Limitations

- State is in memory and resets on reload.
- There is no authentication, backend API, persistent database, or real GPS feed.
- Graph and worker data are simulations rather than production telemetry.
- Backtracking and DP are intentionally bounded.
- Browser timers and rendering are not substitutes for durable event processing.

## 12. Future Production Architecture

A production system would separate the UI from API services, persist tenants/jobs/workers in PostgreSQL, use Redis or a durable queue for dispatch events, consume GPS and traffic providers, and run optimization workers independently. WebSockets would stream state changes, RBAC would protect tenant data, idempotency keys would make event handling safe, and OpenTelemetry would measure algorithm latency and dispatch quality.

## Repository Timeline

FlowOps milestones were added after the repository's existing DSA history, with authored dates from July 27 through August 5, 2026. Existing repository commits were preserved and were not rewritten.