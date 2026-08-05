# FlowOps Architecture

## Runtime model

FlowOps is a static single-page application. `index.html` defines the operational views, `styles.css` defines the visual system, and `FlowOps_app.js` owns state, algorithms, simulations, and rendering.

## Dispatch flow

```text
Job intake -> validation -> Max Heap priority queue
           -> Hash Map skill lookup -> constraint filtering
           -> graph route cost via Dijkstra + Min Heap
           -> greedy assignment -> bounded optimization
           -> event stream + audit trail + analytics
```

## State boundaries

The `state` object holds jobs, workers, events, assignments, route multipliers, policy weights, metrics, and graph data. Simulation functions mutate only this in-memory state and then invoke the same render and audit paths used by ordinary dispatch actions.

## Production boundary

The browser demo is intentionally self-contained. In production, state mutation, authorization, event durability, optimization execution, and telemetry would move behind authenticated services while the browser remains a read-optimized control surface.
