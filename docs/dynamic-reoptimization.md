# Dynamic Re-Optimization

FlowOps models dispatch as an event-driven loop rather than a one-time batch.

## Scenarios

The simulator can inject a worker failure, an emergency job, a route-cost spike, or a burst of queued jobs. Each scenario emits an event, mutates the in-memory state, re-evaluates impacted work, and updates the dashboard, audit trail, and rolling metrics.

## Audit behavior

Reassignments record the reason, previous worker, new worker, and affected job. The Event Stream shows state transitions while Security & Audit retains recent decision records.

## What-if simulation

Simulation controls make disruption behavior observable without requiring a backend or external services. The result panel reports the scenario, changes made, and the assignment recovery outcome.

## Operational analytics

The response-time series uses a bounded sliding window/deque. This keeps memory fixed while allowing the dashboard to show current response trends, SLA rate, assignment churn, and utilization after each simulated event.
