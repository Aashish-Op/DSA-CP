# Routing and Assignment

## Graph representation

The service network is represented by named nodes and weighted undirected edges. Edge cost is adjusted when a regional traffic multiplier is active.

## Dijkstra shortest path

FlowOps initializes every node to infinity, seeds the origin at zero, and expands the least-cost frontier from a Min Heap. Relaxed edges update the predecessor map. The resulting predecessor chain reconstructs the lowest-cost route.

With a binary heap, route computation is O((V + E) log V), where V is the number of locations and E is the number of links.

## Candidate filtering

The Hash Map discovers workers with the required skill. The assignment engine then filters out unavailable workers, workers beyond capacity, incompatible zones, and workers that fail tenant or policy constraints.

## Greedy assignment

For each priority-ordered job, FlowOps scores feasible workers using route cost, delay risk, SLA penalty, and reassignment cost. It assigns the lowest weighted feasible option immediately. This is the fast dispatch baseline: practical and responsive, but not globally optimal for every batch.
