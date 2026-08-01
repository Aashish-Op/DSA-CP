# Constrained Optimization

FlowOps exposes two bounded search strategies for small decision batches.

## Objective

The optimizer minimizes:

`Objective = alpha x TravelCost + beta x DelayRisk + gamma x SLAPenalty + delta x ReassignmentCost`

The weights are policy controls and can be changed in Settings.

## Bounded backtracking

Backtracking explores assignments one job at a time, tracks used workers, and prunes branches that already exceed the best known cost or violate constraints. The search is deliberately bounded to a small batch so the interactive UI stays responsive.

## Dynamic programming

The DP verification path memoizes subproblems using the job position and worker-availability mask. Repeated states reuse their best known cost instead of recomputing them. This is appropriate for bounded worker batches; it is not intended to solve an unbounded workforce optimization problem.

## Decision trace

The optimizer records validation, candidate filtering, priority ordering, route scoring, greedy assignment, backtracking, DP verification, and completion as visible trace steps. This makes an optimization result explainable rather than a black box.
