# Dispatch Data Structures

FlowOps keeps dispatch decisions deterministic and inspectable in the browser.

## Hash Map worker index

`workerIndex` maps a normalized skill name to worker IDs. Rebuilding the index is linear in the total number of worker skills. Candidate discovery then uses an average O(1) map lookup, followed by worker record retrieval. This keeps skill-based candidate discovery fast as the worker list grows.

## Max Heap priority queue

Jobs are pushed into a max heap using urgency, SLA risk, and customer impact. The highest-priority job is popped first, giving O(log n) insertion and removal and O(1) access to the next job.

## Min Heap route frontier

Dijkstra uses a min heap ordered by current route cost. The smallest tentative distance is expanded first, which supports efficient shortest-path computation on the weighted service graph.

## Rolling analytics

Operational response times are maintained as a fixed-size rolling window. A queue/deque-style update removes the oldest sample as new intervals arrive, keeping the window bounded while producing current trend metrics.
