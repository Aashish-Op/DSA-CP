/* ============================================================
   FLOWOPS — Intelligent Real-Time Dispatch & Operations Platform
   Standalone demo engine
   Algorithms: Hash Map, Max Heap, Dijkstra, Greedy, Backtracking,
               Dynamic Programming, Sliding Window, Event Stream
   ============================================================ */

(() => {
  "use strict";

  /* ---------- DOM HELPERS ---------- */
  const $ = (id) => document.getElementById(id);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const state = {
    organization: "org_atlascare",
    role: "dispatcher",
    jobs: [],
    workers: [],
    events: [],
    audit: [],
    notifications: [],
    assignments: new Map(),
    routeMultipliers: {},
    weights: { travel: 25, delay: 30, sla: 30, reassign: 15 },
    metrics: {
      response: [18, 21, 17, 23, 19, 20, 16, 18, 17, 15, 16, 14, 15, 13, 14],
      slaRate: 4.2,
      churn: 0,
      utilization: 72
    },
    graph: {
      nodes: {},
      edges: []
    },
    optimizationRunning: false,
    sequence: 1000
  };

  /* ---------- DATA STRUCTURES ---------- */

  class MaxHeap {
    constructor(compare) {
      this.data = [];
      this.compare = compare || ((a, b) => a.score - b.score);
    }
    get size() { return this.data.length; }
    push(item) {
      this.data.push(item);
      this.#bubbleUp(this.data.length - 1);
    }
    pop() {
      if (!this.data.length) return null;
      const root = this.data[0];
      const last = this.data.pop();
      if (this.data.length) {
        this.data[0] = last;
        this.#bubbleDown(0);
      }
      return root;
    }
    #bubbleUp(index) {
      while (index > 0) {
        const parent = Math.floor((index - 1) / 2);
        if (this.compare(this.data[index], this.data[parent]) <= 0) break;
        [this.data[index], this.data[parent]] = [this.data[parent], this.data[index]];
        index = parent;
      }
    }
    #bubbleDown(index) {
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        let best = index;
        if (left < this.data.length && this.compare(this.data[left], this.data[best]) > 0) best = left;
        if (right < this.data.length && this.compare(this.data[right], this.data[best]) > 0) best = right;
        if (best === index) break;
        [this.data[index], this.data[best]] = [this.data[best], this.data[index]];
        index = best;
      }
    }
  }

  class MinHeap {
    constructor(compare = (a, b) => a.cost - b.cost) {
      this.data = [];
      this.compare = compare;
    }
    get size() { return this.data.length; }
    push(item) {
      this.data.push(item);
      this.#up(this.data.length - 1);
    }
    pop() {
      if (!this.data.length) return null;
      const root = this.data[0];
      const last = this.data.pop();
      if (this.data.length) {
        this.data[0] = last;
        this.#down(0);
      }
      return root;
    }
    #up(i) {
      while (i > 0) {
        const p = Math.floor((i - 1) / 2);
        if (this.compare(this.data[i], this.data[p]) >= 0) break;
        [this.data[i], this.data[p]] = [this.data[p], this.data[i]];
        i = p;
      }
    }
    #down(i) {
      while (true) {
        const l = i * 2 + 1, r = l + 1;
        let best = i;
        if (l < this.data.length && this.compare(this.data[l], this.data[best]) < 0) best = l;
        if (r < this.data.length && this.compare(this.data[r], this.data[best]) < 0) best = r;
        if (best === i) break;
        [this.data[i], this.data[best]] = [this.data[best], this.data[i]];
        i = best;
      }
    }
  }

  /* ---------- GRAPH + DIJKSTRA ---------- */

  function buildGraph() {
    const names = ["North Hub", "Central", "East Gate", "South Hub", "West Gate", "Airport", "Industrial", "Old City"];
    const coords = [
      [18, 20], [48, 32], [77, 20], [68, 67],
      [23, 70], [88, 53], [44, 82], [10, 48]
    ];

    state.graph.nodes = {};
    names.forEach((name, i) => {
      state.graph.nodes[name] = { name, x: coords[i][0], y: coords[i][1] };
    });

    const links = [
      ["North Hub", "Central", 7], ["North Hub", "Old City", 5],
      ["Central", "East Gate", 6], ["Central", "South Hub", 9],
      ["Central", "Industrial", 8], ["Old City", "West Gate", 6],
      ["West Gate", "South Hub", 7], ["South Hub", "Industrial", 5],
      ["Industrial", "East Gate", 7], ["East Gate", "Airport", 6],
      ["South Hub", "Airport", 11], ["Industrial", "Airport", 9],
      ["West Gate", "Industrial", 12]
    ];

    state.graph.edges = links.map(([from, to, cost]) => ({ from, to, cost }));
  }

  function neighbors(node) {
    const out = [];
    for (const e of state.graph.edges) {
      if (e.from === node) out.push({ node: e.to, cost: adjustedEdgeCost(e) });
      if (e.to === node) out.push({ node: e.from, cost: adjustedEdgeCost(e) });
    }
    return out;
  }

  function adjustedEdgeCost(edge) {
    const region = edge.from === "Central" || edge.to === "Central" ? "Central" : "default";
    const multiplier = state.routeMultipliers[region] || 1;
    return Number((edge.cost * multiplier).toFixed(2));
  }

  function dijkstra(source, target) {
    const dist = {};
    const prev = {};
    const visited = new Set();
    const heap = new MinHeap();

    Object.keys(state.graph.nodes).forEach(n => dist[n] = Infinity);
    dist[source] = 0;
    heap.push({ node: source, cost: 0 });

    while (heap.size) {
      const current = heap.pop();
      if (!current || visited.has(current.node)) continue;
      visited.add(current.node);
      if (current.node === target) break;

      for (const next of neighbors(current.node)) {
        const alt = dist[current.node] + next.cost;
        if (alt < dist[next.node]) {
          dist[next.node] = alt;
          prev[next.node] = current.node;
          heap.push({ node: next.node, cost: alt });
        }
      }
    }

    if (dist[target] === Infinity) return { path: [], cost: Infinity, visited: visited.size };

    const path = [];
    let cursor = target;
    while (cursor) {
      path.unshift(cursor);
      cursor = prev[cursor];
    }
    return { path, cost: Number(dist[target].toFixed(2)), visited: visited.size };
  }

  /* ---------- HASH INDEX ---------- */

  const workerIndex = new Map();
  function rebuildWorkerIndex() {
    workerIndex.clear();
    state.workers.forEach(worker => {
      worker.skills.forEach(skill => {
        const key = skill.toLowerCase();
        if (!workerIndex.has(key)) workerIndex.set(key, []);
        workerIndex.get(key).push(worker.id);
      });
    });
  }

  function hashLookup(skill) {
    return (workerIndex.get(skill.toLowerCase()) || [])
      .map(id => state.workers.find(w => w.id === id))
      .filter(Boolean);
  }

  /* ---------- SEED DATA ---------- */

  function seedData() {
    state.workers = [
      { id:"W-101", name:"Arjun Mehta", initials:"AM", skills:["HVAC","Electrical"], status:"available", zone:"Central", load:58, rating:4.9, jobs:128, etaBias:1 },
      { id:"W-102", name:"Priya Nair", initials:"PN", skills:["Plumbing","Appliance"], status:"available", zone:"East", load:44, rating:4.8, jobs:116, etaBias:2 },
      { id:"W-103", name:"Rohan Singh", initials:"RS", skills:["Network","Electrical"], status:"busy", zone:"North", load:78, rating:4.7, jobs:142, etaBias:3 },
      { id:"W-104", name:"Neha Kapoor", initials:"NK", skills:["HVAC","Appliance"], status:"available", zone:"West", load:51, rating:4.9, jobs:137, etaBias:1 },
      { id:"W-105", name:"Vikram Rao", initials:"VR", skills:["Plumbing","Electrical"], status:"available", zone:"South", load:63, rating:4.6, jobs:104, etaBias:4 },
      { id:"W-106", name:"Ishita Shah", initials:"IS", skills:["Network","HVAC"], status:"offline", zone:"Central", load:0, rating:4.8, jobs:91, etaBias:2 },
      { id:"W-107", name:"Kabir Verma", initials:"KV", skills:["Electrical","Network"], status:"available", zone:"North", load:39, rating:4.7, jobs:99, etaBias:2 },
      { id:"W-108", name:"Ananya Das", initials:"AD", skills:["Appliance","Plumbing"], status:"available", zone:"East", load:69, rating:4.9, jobs:121, etaBias:2 }
    ];

    const baseJobs = [
      ["J-2048","MetroMart","HVAC","critical",38,"North",9,"AC compressor failure", "in_progress"],
      ["J-2047","GreenLeaf Foods","Electrical","high",52,"Central",8,"Cold-room power instability", "queued"],
      ["J-2046","Rohan Residence","Plumbing","high",76,"East",7,"Main line leakage", "assigned"],
      ["J-2045","Vertex Labs","Network","medium",128,"West",6,"WAN packet loss", "queued"],
      ["J-2044","UrbanNest","Appliance","medium",151,"South",5,"Commercial freezer fault", "assigned"],
      ["J-2043","Apex Retail","Electrical","low",210,"Central",3,"Lighting circuit issue", "completed"],
      ["J-2042","Nova Clinic","HVAC","high",64,"East",8,"Cooling failure in ward", "queued"],
      ["J-2041","BuildPro","Plumbing","medium",180,"South",4,"Pressure drop", "completed"],
      ["J-2040","Skyline Offices","Network","low",245,"North",3,"Switch replacement", "completed"],
      ["J-2039","CityCafe","Appliance","high",91,"West",7,"Display chiller fault", "queued"],
      ["J-2038","Helix Pharma","HVAC","critical",42,"Central",10,"Temperature excursion", "queued"],
      ["J-2037","Oak Homes","Electrical","medium",145,"North",5,"Breaker trip", "assigned"]
    ];

    state.jobs = baseJobs.map((j, i) => ({
      id:j[0], customer:j[1], skill:j[2], priority:j[3], sla:j[4],
      zone:j[5], impact:j[6], description:j[7], status:j[8],
      createdAt:Date.now() - (i + 1) * 1000 * 60 * 13,
      assignedWorker:null, route:null, score:null, reassigned:0
    }));

    state.jobs.forEach(j => {
      const w = ["J-2048","J-2046","J-2044","J-2037"].includes(j.id) ? findBestWorker(j, true) : null;
      if (w) {
        j.assignedWorker = w.id;
        state.assignments.set(j.id, w.id);
      }
    });

    state.notifications = [
      { title:"SLA risk detected", message:"J-2048 is within 38 minutes of deadline.", time:"2 min ago" },
      { title:"Worker capacity changed", message:"Rohan Singh reached 78% utilization.", time:"7 min ago" },
      { title:"Route recomputation", message:"Central corridor cost was refreshed.", time:"12 min ago" }
    ];

    rebuildWorkerIndex();
  }

  /* ---------- SCORING ---------- */

  const priorityBase = { critical:100, high:75, medium:50, low:25 };

  function priorityScore(job) {
    const now = Date.now();
    const elapsed = Math.max(0, (now - job.createdAt) / 60000);
    const remaining = Math.max(1, job.sla - elapsed);
    const urgency = Math.min(100, (120 / remaining) * 100);
    const slaRisk = Math.min(100, (1 - remaining / Math.max(job.sla, 1)) * 100);
    return Number(
      (priorityBase[job.priority] * 0.45 +
       urgency * 0.25 +
       slaRisk * 0.20 +
       job.impact * 1.0).toFixed(2)
    );
  }

  function buildPriorityQueue() {
    const heap = new MaxHeap((a,b) => a.score - b.score);
    state.jobs.filter(j => j.status !== "completed").forEach(job => {
      heap.push({ job, score:priorityScore(job) });
    });

    const ordered = [];
    while (heap.size) ordered.push(heap.pop());
    return ordered;
  }

  function zoneToNode(zone) {
    return {
      North:"North Hub",
      East:"East Gate",
      South:"South Hub",
      West:"West Gate",
      Central:"Central"
    }[zone] || "Central";
  }

  function workerToNode(worker) {
    return zoneToNode(worker.zone);
  }

  function estimateRoute(worker, job) {
    const route = dijkstra(workerToNode(worker), zoneToNode(job.zone));
    return {
      ...route,
      minutes:Number((route.cost * 2.6 + worker.etaBias).toFixed(1)),
      distance:Number((route.cost * 0.84).toFixed(1))
    };
  }

  function slaPenalty(job, minutes) {
    const remaining = Math.max(1, job.sla);
    const projected = minutes + 12;
    return Math.min(100, (projected / remaining) * 100);
  }

  function candidateCost(worker, job) {
    const route = estimateRoute(worker, job);
    const delayRisk = Math.min(100, worker.load * .65 + route.minutes * .35);
    const sla = slaPenalty(job, route.minutes);
    const reassignment = job.reassigned * 20;
    const w = state.weights;

    const normalized =
      (route.cost * w.travel) / 100 +
      (delayRisk * w.delay) / 100 +
      (sla * w.sla) / 100 +
      (reassignment * w.reassign) / 100;

    return {
      worker,
      route,
      delayRisk:Number(delayRisk.toFixed(2)),
      sla:Number(sla.toFixed(2)),
      reassignment,
      cost:Number(normalized.toFixed(2))
    };
  }

  function hardConstraints(worker, job, route) {
    const reasons = [];
    if (worker.status === "offline") reasons.push("worker offline");
    if (!worker.skills.includes(job.skill)) reasons.push("missing required skill");
    if (worker.load >= 96) reasons.push("capacity exceeded");
    if (route.minutes > job.sla * 1.15) reasons.push("SLA feasibility violation");
    return { feasible:reasons.length === 0, reasons };
  }

  function candidateFilter(job) {
    // Hash-index lookup gives the primary O(1) average skill lookup.
    return hashLookup(job.skill).filter(w => {
      if (w.status === "offline") return false;
      if (w.load >= 96) return false;
      return true;
    });
  }

  function findBestWorker(job, preview = false) {
    const candidates = candidateFilter(job)
      .map(worker => candidateCost(worker, job))
      .filter(c => hardConstraints(c.worker, job, c.route).feasible)
      .sort((a,b) => a.cost - b.cost);

    if (!candidates.length) return null;
    return candidates[0].worker;
  }

  /* ---------- BACKTRACKING / DP ---------- */

  function boundedBacktracking(jobs, workers, index = 0, used = new Set(), assignment = {}, best = { cost:Infinity, map:null }) {
    if (index >= jobs.length) {
      const cost = Object.keys(assignment).length === jobs.length
        ? Object.entries(assignment).reduce((sum,[jobId,workerId]) => {
            const job = jobs.find(j => j.id === jobId);
            const worker = workers.find(w => w.id === workerId);
            return sum + (job && worker ? candidateCost(worker,job).cost : 0);
          }, 0)
        : Infinity;
      if (cost < best.cost) best = { cost, map:{...assignment} };
      return best;
    }

    const job = jobs[index];
    const ordered = candidateFilter(job)
      .filter(w => !used.has(w.id))
      .map(w => candidateCost(w,job))
      .sort((a,b) => a.cost - b.cost)
      .slice(0, 4); // pruning: bounded candidate branch

    for (const c of ordered) {
      if (c.cost >= best.cost) continue;
      assignment[job.id] = c.worker.id;
      used.add(c.worker.id);
      best = boundedBacktracking(jobs, workers, index + 1, used, assignment, best);
      used.delete(c.worker.id);
      delete assignment[job.id];
    }

    return best;
  }

  function dpSubsetAssignment(jobs, workers) {
    // Bounded bitmask DP for small sets. State = jobs processed + worker mask.
    const n = Math.min(jobs.length, 5);
    const m = Math.min(workers.length, 8);
    const selectedJobs = jobs.slice(0,n);
    const selectedWorkers = workers.slice(0,m);
    const memo = new Map();

    function solve(i, mask) {
      if (i === n) return { cost:0, choices:[] };
      const key = `${i}|${mask}`;
      if (memo.has(key)) return memo.get(key);

      let best = { cost:Infinity, choices:[] };
      for (let w = 0; w < m; w++) {
        if (mask & (1 << w)) continue;
        const c = candidateCost(selectedWorkers[w], selectedJobs[i]);
        const feasible = hardConstraints(selectedWorkers[w], selectedJobs[i], c.route).feasible;
        if (!feasible) continue;
        const next = solve(i + 1, mask | (1 << w));
        if (next.cost + c.cost < best.cost) {
          best = {
            cost:next.cost + c.cost,
            choices:[{job:selectedJobs[i].id,worker:selectedWorkers[w].id}, ...next.choices]
          };
        }
      }
      memo.set(key,best);
      return best;
    }
    return solve(0,0);
  }

  /* ---------- PIPELINE ---------- */

  const pipelineSteps = ["validate","candidate","priority","route","constraint","rank","assign"];

  function pipelineReset() {
    $$(".pipeline-step").forEach(el => el.classList.remove("active","complete"));
    if ($("pipelineRunStatus")) $("pipelineRunStatus").textContent = "IDLE";
  }

  function setPipelineStep(name, status = "active") {
    const el = document.querySelector(`.pipeline-step[data-step="${name}"]`);
    if (!el) return;
    el.classList.remove("active","complete");
    el.classList.add(status);
  }

  function clearDecisionTrace() {
    if ($("decisionTrace")) {
      $("decisionTrace").innerHTML =
        '<div class="empty-state"><div>✦</div><strong>Optimizer ready</strong><p>Run optimization to inspect candidate scoring.</p></div>';
    }
  }

  function appendTrace(html) {
    const trace = $("decisionTrace");
    if (!trace) return;
    if (trace.querySelector(".empty-state")) trace.innerHTML = "";
    trace.insertAdjacentHTML("beforeend", html);
  }

  async function optimizeJob(job, animate = true) {
    setPipelineStep("validate","active");
    appendTrace(`<div class="trace-block"><strong>01 · Validation</strong><span>${job.id} validated for tenant ${state.organization}; priority=${job.priority}, SLA=${job.sla}m.</span></div>`);
    if (animate) await sleep(180);

    setPipelineStep("validate","complete");
    setPipelineStep("candidate","active");

    const candidates = candidateFilter(job);
    appendTrace(`<div class="trace-block"><strong>02 · Hash-index candidate discovery</strong><span>${candidates.length} ${job.skill} workers discovered from skill index in O(1) average lookup.</span></div>`);
    if (animate) await sleep(180);

    setPipelineStep("candidate","complete");
    setPipelineStep("priority","active");

    const score = priorityScore(job);
    appendTrace(`<div class="trace-block"><strong>03 · Priority Queue</strong><span>Priority score = ${score}. Job is ordered against ${state.jobs.filter(j=>j.status!=="completed").length} active requests using a max heap.</span></div>`);
    if (animate) await sleep(180);

    setPipelineStep("priority","complete");
    setPipelineStep("route","active");

    const scored = candidates.map(worker => candidateCost(worker,job));
    const bestRoute = scored.slice().sort((a,b) => a.route.cost-b.route.cost)[0];
    appendTrace(`<div class="trace-block"><strong>04 · Dijkstra shortest path</strong><span>Best route evaluated from worker zone to ${job.zone}: ${bestRoute ? bestRoute.route.path.join(" → ") : "none"}; cost=${bestRoute ? bestRoute.route.cost : "∞"}.</span></div>`);
    if (animate) await sleep(180);

    setPipelineStep("route","complete");
    setPipelineStep("constraint","active");

    const feasible = scored.filter(c => hardConstraints(c.worker,job,c.route).feasible);
    appendTrace(`<div class="trace-block"><strong>05 · Hard constraints</strong><span>${feasible.length}/${scored.length} candidates remain after skill, availability, capacity and SLA feasibility checks.</span></div>`);
    if (animate) await sleep(180);

    setPipelineStep("constraint","complete");
    setPipelineStep("rank","active");

    feasible.sort((a,b) => a.cost-b.cost);
    const winner = feasible[0];
    if (winner) {
      appendTrace(`<div class="trace-block"><strong>06 · Weighted ranking</strong><span>Lowest composite cost = ${winner.cost}. Weights: Travel ${state.weights.travel}%, Delay ${state.weights.delay}%, SLA ${state.weights.sla}%, Reassign ${state.weights.reassign}%.</span><div>${feasible.slice(0,5).map(c=>`<div class="trace-candidate"><span>${c.worker.name} · ${c.route.minutes}m ETA</span><em>${c.cost}</em></div>`).join("")}</div></div>`);
    } else {
      appendTrace(`<div class="trace-block"><strong>06 · Weighted ranking</strong><span>No feasible candidate remained. Escalation required.</span></div>`);
    }
    if (animate) await sleep(180);

    setPipelineStep("rank","complete");
    setPipelineStep("assign","active");

    if (winner) {
      assignJob(job,winner.worker,false);
      appendTrace(`<div class="trace-block"><strong>07 · Assignment commit</strong><span>${job.id} → ${winner.worker.name}. State mutation committed and event emitted.</span></div>`);
    }
    if (animate) await sleep(180);
    setPipelineStep("assign", winner ? "complete" : "active");

    return winner;
  }

  async function runFullOptimization() {
    if (state.optimizationRunning) return;
    state.optimizationRunning = true;
    pipelineReset();
    clearDecisionTrace();

    showLoading("Running optimization...", "Priority queue → candidates → Dijkstra → constraints → assignment");
    $("engineStatusText").textContent = "Optimizing";
    if ($("pipelineRunStatus")) $("pipelineRunStatus").textContent = "RUNNING";

    const ordered = buildPriorityQueue();
    const targetJobs = ordered.slice(0, Math.min(5, ordered.length)).map(x => x.job);

    for (const job of targetJobs) {
      await optimizeJob(job,true);
    }

    // Use bounded DP as a verification pass for a small constrained batch.
    const activeWorkers = state.workers.filter(w => w.status !== "offline");
    const dpJobs = targetJobs.slice(0,3);
    if (dpJobs.length && activeWorkers.length >= dpJobs.length) {
      const dp = dpSubsetAssignment(dpJobs,activeWorkers);
      appendTrace(`<div class="trace-block"><strong>08 · Dynamic Programming verification</strong><span>Bounded state-space check evaluated ${dpJobs.length} jobs with memoized worker-mask states. Best batch cost = ${Number.isFinite(dp.cost) ? dp.cost.toFixed(2) : "infeasible"}.</span></div>`);
    }

    if ($("pipelineRunStatus")) $("pipelineRunStatus").textContent = "COMPLETE";
    $("engineStatusText").textContent = "Ready";
    hideLoading();

    state.metrics.churn = Math.max(0,state.metrics.churn);
    state.metrics.response.push(Math.max(8, Math.round(14 - state.metrics.churn * .5 + Math.random()*3)));
    state.metrics.response = state.metrics.response.slice(-15);

    emitEvent("OPTIMIZATION_COMPLETE","optimizer","SYSTEM","Full optimization cycle completed", "SUCCESS");
    toast("Optimization complete","Dispatch decisions recalculated with DSA pipeline.","success");
    state.optimizationRunning = false;

    renderAll();
  }

  /* ---------- ASSIGNMENT / RE-OPTIMIZATION ---------- */

  function assignJob(job, worker, emit = true) {
    const oldWorkerId = job.assignedWorker;
    if (oldWorkerId && oldWorkerId !== worker.id) job.reassigned += 1;

    const oldWorker = state.workers.find(w => w.id === oldWorkerId);
    if (oldWorker) oldWorker.load = Math.max(0, oldWorker.load - 10);

    job.assignedWorker = worker.id;
    job.status = "assigned";
    const route = estimateRoute(worker,job);
    job.route = route;
    job.score = candidateCost(worker,job).cost;
    state.assignments.set(job.id,worker.id);
    worker.load = Math.min(100,worker.load + 8);

    if (emit) emitEvent(
      "ASSIGNMENT_COMMITTED",
      "optimizer",
      job.id,
      `${job.id} assigned to ${worker.name}; route ${route.minutes}m`,
      "SUCCESS"
    );
  }

  function reoptimizeImpactedJobs(reason) {
    const impacted = state.jobs.filter(j =>
      j.status !== "completed" &&
      (!j.assignedWorker || j.assignedWorker === reason.workerId || reason.all)
    );

    let changes = 0;
    impacted.forEach(job => {
      const winner = findBestWorker(job);
      if (winner && winner.id !== job.assignedWorker) {
        assignJob(job,winner,true);
        changes++;
      }
    });

    state.metrics.churn += changes;
    emitEvent("REOPTIMIZATION","optimizer","SYSTEM",
      `${changes} assignment changes after ${reason.label}`,
      "SUCCESS"
    );
    return changes;
  }

  /* ---------- EVENT SYSTEM ---------- */

  function emitEvent(type,actor,entity,message,status="INFO") {
    const event = {
      id:`EV-${++state.sequence}`,
      time:new Date(),
      type, actor, entity, message, status,
      tenant:state.organization
    };

    // Idempotency: duplicate event signatures are rejected.
    const signature = `${type}|${entity}|${message}`;
    if (state.events.some(e => e.signature === signature)) return false;
    event.signature = signature;

    state.events.unshift(event);
    state.events = state.events.slice(0,150);

    state.audit.unshift({
      time:event.time,
      actor,
      action:type,
      entity,
      message
    });
    state.audit = state.audit.slice(0,30);

    renderEvents();
    renderAudit();
    renderPreviewEvents();
    return true;
  }

  /* ---------- SIMULATIONS ---------- */

  function simulateWorkerFailure() {
    const available = state.workers.filter(w => w.status === "available" || w.status === "busy");
    const worker = available.sort((a,b) => b.load-a.load)[0];
    if (!worker) return;

    worker.status = "offline";
    const impacted = state.jobs.filter(j => j.assignedWorker === worker.id && j.status !== "completed");
    impacted.forEach(j => j.assignedWorker = null);

    emitEvent("WORKER_UNAVAILABLE","dispatcher",worker.id,
      `${worker.name} became unavailable; ${impacted.length} assignments frozen`,
      "WARNING"
    );

    let changes = 0;
    impacted.forEach(job => {
      const winner = findBestWorker(job);
      if (winner) {
        assignJob(job,winner,true);
        changes++;
      }
    });
    state.metrics.churn += changes;

    openDisruptionResult(
      "Worker failure handled",
      `${worker.name} removed from the active pool and ${changes} impacted jobs re-optimized.`,
      { "Impacted jobs":impacted.length, "Reassigned":changes, "Churn":changes, "Engine":"Dijkstra + Greedy" }
    );

    toast("Worker failure simulated",`${changes} assignments recovered.`,"warning");
    renderAll();
  }

  function injectEmergencyJob() {
    const job = createJobObject({
      customer:"Emergency Control Center",
      skill:"Electrical",
      priority:"critical",
      sla:30,
      zone:"Central",
      impact:10,
      description:"Critical power interruption — emergency dispatch"
    });
    state.jobs.unshift(job);
    emitEvent("EMERGENCY_JOB","dispatcher",job.id,
      `${job.id} entered queue with critical priority and 30m SLA`,
      "WARNING"
    );

    const winner = findBestWorker(job);
    if (winner) assignJob(job,winner,true);

    openDisruptionResult(
      "Emergency job inserted",
      `${job.id} was placed at the head of the max-priority queue and assigned to ${winner ? winner.name : "escalation queue"}.`,
      { "Priority score":priorityScore(job).toFixed(2), "SLA":"30 min", "Assigned":winner ? winner.name : "Unassigned", "Algorithm":"Max Heap" }
    );

    renderAll();
  }

  function spikeTraffic() {
    state.routeMultipliers.Central = 1.85;
    emitEvent("ROUTE_COST_SPIKE","simulator","Central",
      "Central corridor travel cost increased by 85%",
      "WARNING"
    );

    const active = state.jobs.filter(j => j.status !== "completed");
    let changes = 0;
    active.forEach(job => {
      const winner = findBestWorker(job);
      if (winner && winner.id !== job.assignedWorker) {
        assignJob(job,winner,true);
        changes++;
      }
    });
    state.metrics.churn += changes;

    openDisruptionResult(
      "Traffic disruption absorbed",
      `Central route costs increased by 85%. The optimizer recalculated ${active.length} active requests.`,
      { "Route multiplier":"1.85×", "Assignments changed":changes, "SLA protected":Math.max(0,active.length-changes), "Algorithm":"Dijkstra" }
    );

    renderAll();
  }

  function burstJobs() {
    const skills = ["HVAC","Electrical","Plumbing","Network","Appliance"];
    const zones = ["North","East","Central","West","South"];
    let created = 0;

    for (let i=0;i<6;i++) {
      const job = createJobObject({
        customer:`Burst Customer ${i+1}`,
        skill:skills[i % skills.length],
        priority:i < 2 ? "high" : "medium",
        sla:90 + i*10,
        zone:zones[i % zones.length],
        impact:4 + (i % 5),
        description:"Synthetic workload burst for queue stress testing"
      });
      state.jobs.unshift(job);
      created++;
    }

    emitEvent("JOB_BURST","simulator","QUEUE",
      `${created} jobs injected to stress priority queue`,
      "INFO"
    );

    const ordered = buildPriorityQueue();
    const first = ordered.slice(0,created);
    first.forEach(x => {
      const winner = findBestWorker(x.job);
      if (winner) assignJob(x.job,winner,true);
    });

    openDisruptionResult(
      "Queue burst processed",
      `${created} jobs were injected. The max heap reordered the active queue and greedy dispatch processed feasible candidates.`,
      { "Injected":created, "Queue size":ordered.length, "Heap operation":"O(log n)", "Re-optimized":"Yes" }
    );

    renderAll();
  }

  function openDisruptionResult(title,message,metrics) {
    const box = $("simulationResult");
    if (!box) return;
    box.classList.remove("hidden");
    box.innerHTML = `
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
      <div class="simulation-metrics">
        ${Object.entries(metrics).map(([k,v]) => `<div><span>${escapeHtml(k)}</span><strong>${escapeHtml(String(v))}</strong></div>`).join("")}
      </div>`;
  }

  /* ---------- JOB CREATION ---------- */

  function createJobObject(data) {
    const id = `J-${++state.sequence}`;
    return {
      id,
      customer:data.customer,
      skill:data.skill,
      priority:data.priority,
      sla:Number(data.sla),
      zone:data.zone,
      impact:Number(data.impact),
      description:data.description || "Service request",
      status:"queued",
      createdAt:Date.now(),
      assignedWorker:null,
      route:null,
      score:null,
      reassigned:0
    };
  }

  function handleNewJob(event) {
    event.preventDefault();

    const job = createJobObject({
      customer:$("newJobCustomer").value.trim(),
      skill:$("newJobSkill").value,
      priority:$("newJobPriority").value,
      sla:$("newJobSla").value,
      zone:$("newJobZone").value,
      impact:$("newJobImpact").value,
      description:$("newJobDescription").value.trim()
    });

    state.jobs.unshift(job);
    emitEvent("JOB_CREATED","dispatcher",job.id,
      `${job.id} created for ${job.customer} with ${job.skill} requirement`,
      "SUCCESS"
    );

    closeModal();
    toast("Job queued",`${job.id} added to the priority queue.`,"success");

    setTimeout(async () => {
      const winner = findBestWorker(job);
      if (winner) {
        assignJob(job,winner,true);
        toast("Auto-dispatched",`${job.id} → ${winner.name}`,"success");
      } else {
        emitEvent("ESCALATION","optimizer",job.id,"No feasible worker; manual intervention required","WARNING");
        toast("Manual intervention required",`No feasible worker for ${job.id}.`,"warning");
      }
      renderAll();
    },250);

    event.target.reset();
    $("newJobPriority").value = "medium";
    $("newJobSla").value = 120;
    $("newJobImpact").value = 5;
  }

  /* ---------- RENDER: OVERVIEW ---------- */

  function renderOverview() {
    const active = state.jobs.filter(j => j.status !== "completed");
    const available = state.workers.filter(w => w.status === "available").length;
    const risky = active.filter(j => j.sla <= 75 && j.priority !== "low").length;
    const response = Math.round(state.metrics.response.slice(-5).reduce((a,b)=>a+b,0)/5);
    const distanceSaved = Math.max(12, Math.round(31 - state.metrics.churn * .7));

    setText("kpiActiveJobs",active.length);
    setText("kpiAvailableWorkers",available);
    setText("kpiSlaRisk",risky);
    setText("kpiResponse",`${response}m`);
    setText("kpiDistanceSaved",`${distanceSaved}%`);
    setText("jobsNavCount",active.length);
    setText("slaTrend",risky > 4 ? "↑ Needs attention" : "↓ Improving");
    setText("utilizationValue",`${Math.round(state.workers.reduce((s,w)=>s+w.load,0)/state.workers.length)}%`);
    setText("assignmentCount",`${state.assignments.size} active`);
    setText("lastOptimization",state.events.find(e=>e.type==="OPTIMIZATION_COMPLETE") ? formatTime(state.events.find(e=>e.type==="OPTIMIZATION_COMPLETE").time) : "Awaiting run");

    renderMap();
    renderPriorityQueue();
    renderUtilization();
  }

  function renderMap() {
    const container = $("mapNodes");
    if (!container) return;
    container.innerHTML = "";

    const positions = {
      "North Hub":[18,20],"Central":[48,32],"East Gate":[77,20],
      "South Hub":[68,67],"West Gate":[23,70],"Airport":[88,53],
      "Industrial":[44,82],"Old City":[10,48]
    };

    Object.entries(positions).forEach(([name,[x,y]]) => {
      const node = document.createElement("div");
      node.className = "map-node";
      node.style.left = `${x}%`;
      node.style.top = `${y}%`;
      node.title = name;
      node.textContent = name.split(" ").map(v=>v[0]).join("");
      node.classList.add(name === "Central" ? "job" : "worker");
      container.appendChild(node);
    });

    const active = state.jobs.filter(j=>j.status!=="completed").slice(0,6);
    active.forEach((job,i) => {
      const node = document.createElement("div");
      const zoneNode = zoneToNode(job.zone);
      const pos = positions[zoneNode] || [50,50];
      node.className = `map-node ${job.priority==="critical" ? "emergency":"job"}`;
      node.style.left = `${Math.min(94,Math.max(6,pos[0] + (i%3-1)*4))}%`;
      node.style.top = `${Math.min(92,Math.max(8,pos[1] + (i%2 ? 5 : -5)))}%`;
      node.textContent = job.id.slice(-2);
      node.title = `${job.id} · ${job.customer}`;
      node.dataset.job = job.id;
      node.addEventListener("click",()=>showJobDetail(job.id));
      container.appendChild(node);
    });

    setText("mapStatusText", `${state.workers.filter(w=>w.status==="available").length} available · ${active.length} active jobs`);
  }

  function renderPriorityQueue() {
    const container = $("priorityQueue");
    if (!container) return;
    const ordered = buildPriorityQueue().slice(0,7);

    container.innerHTML = ordered.map((x,i) => `
      <div class="priority-item">
        <div class="priority-rank">#${String(i+1).padStart(2,"0")}</div>
        <div class="priority-main">
          <strong>${escapeHtml(x.job.id)} · ${escapeHtml(x.job.customer)}</strong>
          <span>${escapeHtml(x.job.skill)} · ${escapeHtml(x.job.zone)} · SLA ${x.job.sla}m</span>
        </div>
        <div class="priority-risk">
          <strong class="${priorityClass(x.job.priority)}">${x.score}</strong>
          <span>${escapeHtml(x.job.priority)}</span>
        </div>
      </div>
    `).join("") || `<div class="empty-state"><strong>No queued jobs</strong></div>`;
  }

  function renderUtilization() {
    const chart = $("utilizationChart");
    if (!chart) return;
    chart.innerHTML = state.workers.map(w => {
      const height = Math.max(8,Math.min(100,w.load));
      return `<div class="util-bar" style="height:${height}%" data-value="${w.load}%"></div>`;
    }).join("");
  }

  function renderPreviewEvents() {
    const el = $("eventStreamPreview");
    if (!el) return;
    el.innerHTML = state.events.slice(0,6).map(e => `
      <div class="event-row">
        <span class="event-time">${formatTime(e.time)}</span>
        <span class="event-type">${escapeHtml(e.type.replaceAll("_"," "))}</span>
        <span class="event-message">${escapeHtml(e.message)}</span>
      </div>
    `).join("") || `<div class="empty-state">No events yet.</div>`;
  }

  /* ---------- RENDER: JOBS ---------- */

  function renderJobs() {
    const body = $("jobsTableBody");
    if (!body) return;

    const search = ($("jobSearch")?.value || "").toLowerCase();
    const priority = $("jobPriorityFilter")?.value || "all";
    const status = $("jobStatusFilter")?.value || "all";

    let jobs = state.jobs.filter(j => {
      const hay = `${j.id} ${j.customer} ${j.skill} ${j.zone}`.toLowerCase();
      return (!search || hay.includes(search)) &&
             (priority==="all" || j.priority===priority) &&
             (status==="all" || j.status===status);
    });

    if ($("sortJobsBtn")?.dataset.sort === "sla") {
      jobs = jobs.sort((a,b)=>a.sla-b.sla);
    } else {
      jobs = jobs.sort((a,b)=>priorityScore(b)-priorityScore(a));
    }

    setText("jobTableCount",`${jobs.length} jobs`);

    body.innerHTML = jobs.map(job => {
      const worker = state.workers.find(w=>w.id===job.assignedWorker);
      const risk = job.sla <= 60 && job.status!=="completed" ? "critical" : job.sla <= 100 ? "high" : "";
      return `
        <tr>
          <td><div class="job-cell"><strong>${escapeHtml(job.id)}</strong><span>${escapeHtml(job.customer)}</span></div></td>
          <td>${escapeHtml(job.skill)}</td>
          <td><span class="priority-pill ${job.priority}">${job.priority.toUpperCase()}</span></td>
          <td>${escapeHtml(job.zone)}</td>
          <td>${worker ? escapeHtml(worker.name) : "—"}</td>
          <td>${job.sla}m</td>
          <td><span class="sla-pill ${risk}">${risk ? "AT RISK":"ON TRACK"}</span></td>
          <td><span class="status-pill ${job.status}">${job.status.replace("_"," ").toUpperCase()}</span></td>
          <td><button class="table-action" data-job="${job.id}">Inspect</button></td>
        </tr>`;
    }).join("") || `<tr><td colspan="9"><div class="empty-state">No jobs match the current filters.</div></td></tr>`;

    $$(".table-action[data-job]").forEach(btn => btn.addEventListener("click",()=>showJobDetail(btn.dataset.job)));
  }

  /* ---------- RENDER: WORKERS ---------- */

  function renderWorkers() {
    const grid = $("workersGrid");
    if (!grid) return;

    grid.innerHTML = state.workers.map(w => `
      <article class="worker-card ${w.status==="offline" ? "unavailable":""}">
        <div class="worker-head">
          <div class="worker-avatar">${escapeHtml(w.initials)}</div>
          <div class="worker-head-info">
            <strong>${escapeHtml(w.name)}</strong>
            <span>${escapeHtml(w.id)} · ${escapeHtml(w.zone)} Zone</span>
          </div>
          <span class="worker-status ${w.status}">${w.status.toUpperCase()}</span>
        </div>
        <div class="skill-tags">${w.skills.map(s=>`<span class="skill-tag">${escapeHtml(s)}</span>`).join("")}</div>
        <div class="worker-stats">
          <div class="worker-stat"><span>Utilization</span><strong>${w.load}%</strong></div>
          <div class="worker-stat"><span>Rating</span><strong>${w.rating}</strong></div>
          <div class="worker-stat"><span>Jobs</span><strong>${w.jobs}</strong></div>
        </div>
        <div class="worker-load"><i style="width:${w.load}%"></i></div>
      </article>
    `).join("");
  }

  /* ---------- RENDER: ROUTES ---------- */

  function renderRouteSelects() {
    const nodes = Object.keys(state.graph.nodes);
    ["routeOrigin","routeDestination"].forEach(id => {
      const select = $(id);
      if (!select) return;
      const current = select.value;
      select.innerHTML = nodes.map(n=>`<option>${escapeHtml(n)}</option>`).join("");
      if (nodes.includes(current)) select.value=current;
    });
    if ($("routeOrigin")) $("routeOrigin").value = "North Hub";
    if ($("routeDestination")) $("routeDestination").value = "Airport";
  }

  function renderGraph() {
    const canvas = $("graphCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(600,Math.floor(rect.width || 700));
    const height = 480;
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    ctx.scale(devicePixelRatio,devicePixelRatio);
    ctx.clearRect(0,0,width,height);

    const nodes = state.graph.nodes;
    const point = n => ({ x:(nodes[n].x/100)*width, y:(nodes[n].y/100)*height });

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#d1dbe3";
    state.graph.edges.forEach(e => {
      const a=point(e.from), b=point(e.to);
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
      const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
      ctx.fillStyle="#7f8b97";ctx.font="10px Segoe UI";ctx.fillText(adjustedEdgeCost(e),mx+3,my-3);
    });

    Object.keys(nodes).forEach(n => {
      const p=point(n);
      ctx.beginPath();ctx.arc(p.x,p.y,15,0,Math.PI*2);
      ctx.fillStyle="#173f63";ctx.fill();
      ctx.fillStyle="#fff";ctx.font="bold 9px Segoe UI";ctx.textAlign="center";
      ctx.fillText(n.split(" ").map(v=>v[0]).join(""),p.x,p.y+3);
      ctx.fillStyle="#354656";ctx.font="10px Segoe UI";ctx.fillText(n,p.x,p.y+30);
      ctx.textAlign="left";
    });
  }

  function calculateRoute() {
    const origin = $("routeOrigin")?.value;
    const destination = $("routeDestination")?.value;
    if (!origin || !destination) return;

    const result = dijkstra(origin,destination);
    setText("routePath",result.path.join(" → "));
    setText("routeCost",`${result.cost}`);
    setText("routeDistance",`${(result.cost*.84).toFixed(1)} km`);
    const minutes = result.cost === Infinity ? "—" : `${(result.cost*2.6).toFixed(0)} min`;
    const resultBox = $("graphResult");
    if (resultBox) resultBox.innerHTML = `<strong>Dijkstra result</strong> · ${escapeHtml(origin)} → ${escapeHtml(destination)} · ${escapeHtml(result.path.join(" → "))} · cost ${result.cost} · ETA ${minutes}`;

    emitEvent("ROUTE_CALCULATED","dispatcher","GRAPH",
      `Shortest path ${origin} → ${destination}; cost ${result.cost}`,
      "SUCCESS"
    );
    renderGraph();
  }

  /* ---------- RENDER: ANALYTICS ---------- */

  function drawResponseChart() {
    const canvas = $("responseChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.clientWidth || 850;
    const height = 330;
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    ctx.scale(devicePixelRatio,devicePixelRatio);
    ctx.clearRect(0,0,width,height);

    const data=state.metrics.response;
    const min=Math.max(0,Math.min(...data)-4);
    const max=Math.max(...data)+4;
    const pad={l:42,r:18,t:20,b:34};
    const x=i=>pad.l+(i/(data.length-1))*(width-pad.l-pad.r);
    const y=v=>height-pad.b-((v-min)/(max-min))*(height-pad.t-pad.b);

    ctx.strokeStyle="#e5e9ed";
    ctx.lineWidth=1;
    for(let i=0;i<5;i++){
      const yy=pad.t+i*(height-pad.t-pad.b)/4;
      ctx.beginPath();ctx.moveTo(pad.l,yy);ctx.lineTo(width-pad.r,yy);ctx.stroke();
      ctx.fillStyle="#778491";ctx.font="9px Segoe UI";
      ctx.fillText(String(Math.round(max-i*(max-min)/4)),8,yy+3);
    }

    ctx.strokeStyle="#235d8d";
    ctx.lineWidth=2.5;
    ctx.beginPath();
    data.forEach((v,i)=>i?ctx.lineTo(x(i),y(v)):ctx.moveTo(x(i),y(v)));
    ctx.stroke();

    data.forEach((v,i)=>{
      ctx.beginPath();ctx.arc(x(i),y(v),3,0,Math.PI*2);ctx.fillStyle="#235d8d";ctx.fill();
    });

    ctx.fillStyle="#687585";ctx.font="9px Segoe UI";
    ctx.fillText("older",pad.l,height-10);
    ctx.fillText("current",width-pad.r-35,height-10);
  }

  function renderAnalytics() {
    const active = state.jobs.filter(j=>j.status!=="completed");
    const violations = active.filter(j=>j.sla <= 60).length;
    const utilization = Math.round(state.workers.reduce((s,w)=>s+w.load,0)/state.workers.length);

    state.metrics.slaRate = Number((violations/Math.max(1,active.length)*100).toFixed(1));
    state.metrics.utilization = utilization;

    setText("analyticsSla",`${state.metrics.slaRate}%`);
    setText("analyticsChurn",state.metrics.churn);
    setText("analyticsUtilization",`${utilization}%`);

    const counts = ["critical","high","medium","low"].map(p=>({
      p,count:state.jobs.filter(j=>j.priority===p).length
    }));
    const max=Math.max(1,...counts.map(x=>x.count));
    const chart=$("priorityDistributionChart");
    if(chart) chart.innerHTML=counts.map(x=>`
      <div class="bar-row"><span>${x.p.toUpperCase()}</span><div class="bar-track"><i style="width:${(x.count/max)*100}%"></i></div><strong>${x.count}</strong></div>
    `).join("");

    const travelBase=100;
    const travelFlow=Math.max(42,100-state.metrics.churn*1.8);
    const responseBase=100;
    const responseFlow=Math.max(40,100-(state.metrics.response.at(-1)/30)*60);
    const slaBase=100;
    const slaFlow=Math.max(20,100-state.metrics.slaRate*7);

    setStyleWidth("baselineTravelBar",travelBase);setStyleWidth("flowopsTravelBar",travelFlow);
    setStyleWidth("baselineResponseBar",responseBase);setStyleWidth("flowopsResponseBar",responseFlow);
    setStyleWidth("baselineSlaBar",slaBase);setStyleWidth("flowopsSlaBar",slaFlow);

    setText("travelSavingValue",`${Math.round(100-travelFlow)}%`);
    setText("responseSavingValue",`${Math.round(100-responseFlow)}%`);
    setText("slaSavingValue",`${Math.round(100-slaFlow)}%`);

    drawResponseChart();
  }

  /* ---------- RENDER: EVENTS / SECURITY ---------- */

  function renderEvents() {
    const el=$("eventLog");
    if(!el) return;
    el.innerHTML=state.events.map(e=>`
      <div class="event-log-row">
        <span class="event-time-cell">${formatTime(e.time)}</span>
        <span class="event-type-pill">${escapeHtml(e.type)}</span>
        <span>${escapeHtml(e.actor)}</span>
        <span>${escapeHtml(e.entity)}</span>
        <span class="event-message-cell">${escapeHtml(e.message)}</span>
        <span>${escapeHtml(e.status)}</span>
      </div>
    `).join("") || `<div class="empty-state">No events recorded.</div>`;
  }

  function renderAudit() {
    const el=$("auditTable");
    if(!el) return;
    el.innerHTML=state.audit.slice(0,12).map(a=>`
      <div class="audit-row">
        <span>${formatTime(a.time)}</span>
        <strong>${escapeHtml(a.actor)}</strong>
        <span>${escapeHtml(a.action)} · ${escapeHtml(a.entity)}<br>${escapeHtml(a.message)}</span>
        <span class="healthy">RECORDED</span>
      </div>
    `).join("") || `<div class="empty-state">No audit records.</div>`;
  }

  /* ---------- MODALS ---------- */

  function openModal(id) {
    $("modalBackdrop")?.classList.remove("hidden");
    $(id)?.classList.remove("hidden");
  }

  function closeModal() {
    $("modalBackdrop")?.classList.add("hidden");
    $$(".modal").forEach(m=>m.classList.add("hidden"));
  }

  function showJobDetail(jobId) {
    const job=state.jobs.find(j=>j.id===jobId);
    if(!job) return;

    const worker=state.workers.find(w=>w.id===job.assignedWorker);
    const candidates=candidateFilter(job).map(w=>candidateCost(w,job)).sort((a,b)=>a.cost-b.cost);

    setText("jobDetailTitle",`${job.id} · ${job.customer}`);
    const content=$("jobDetailContent");
    if(!content) return;

    content.innerHTML=`
      <div class="detail-header">
        <div><div class="detail-title">${escapeHtml(job.description)}</div><div class="detail-meta">${escapeHtml(job.skill)} · ${escapeHtml(job.zone)} · ${escapeHtml(job.priority).toUpperCase()} priority</div></div>
        <span class="status-pill ${job.status}">${job.status.replace("_"," ").toUpperCase()}</span>
      </div>
      <div class="detail-grid">
        <div class="detail-metric"><span>SLA</span><strong>${job.sla} min</strong></div>
        <div class="detail-metric"><span>Impact</span><strong>${job.impact}/10</strong></div>
        <div class="detail-metric"><span>Priority Score</span><strong>${priorityScore(job)}</strong></div>
        <div class="detail-metric"><span>Assigned</span><strong>${worker ? escapeHtml(worker.name) : "Unassigned"}</strong></div>
      </div>
      <div class="detail-section"><h3>Candidate ranking</h3>
        <div class="candidate-table">
          <div class="candidate-row head"><span>Worker</span><span>ETA</span><span>Route</span><span>Load</span><span>Cost</span></div>
          ${candidates.slice(0,6).map(c=>`
            <div class="candidate-row">
              <span>${escapeHtml(c.worker.name)}</span>
              <span>${c.route.minutes}m</span>
              <span>${c.route.cost}</span>
              <span>${c.worker.load}%</span>
              <span>${c.cost}</span>
            </div>`).join("") || `<div class="empty-state">No feasible candidates.</div>`}
        </div>
      </div>
      <div class="detail-section"><h3>Decision explanation</h3><p>FlowOps uses hash-index candidate discovery, a priority queue for request ordering, Dijkstra for route cost, hard constraints for feasibility, and weighted greedy ranking for the dispatch decision.</p></div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-close-modal>Close</button>
        ${worker ? `<button class="btn btn-primary" id="reoptimizeJobBtn">Re-optimize this job</button>` : `<button class="btn btn-primary" id="assignJobNowBtn">Assign best worker</button>`}
      </div>
    `;

    if($("reoptimizeJobBtn")) $("reoptimizeJobBtn").onclick=async()=>{
      closeModal();
      pipelineReset();clearDecisionTrace();openModal("newJobModal");closeModal();
      showLoading("Re-optimizing job...","Evaluating alternate workers and shortest routes");
      await optimizeJob(job,true);
      hideLoading();
      renderAll();
      toast("Job re-optimized",`${job.id} decision refreshed.`,"success");
    };

    if($("assignJobNowBtn")) $("assignJobNowBtn").onclick=()=>{
      const best=findBestWorker(job);
      if(best){assignJob(job,best,true);closeModal();renderAll();toast("Assigned",`${job.id} → ${best.name}`,"success");}
    };

    openModal("jobDetailModal");
  }

  function showNotifications() {
    const list=$("notificationList");
    if(!list) return;
    list.innerHTML=state.notifications.map(n=>`
      <div class="notification-item">
        <strong>${escapeHtml(n.title)}</strong>
        <p>${escapeHtml(n.message)}</p>
        <time>${escapeHtml(n.time)}</time>
      </div>
    `).join("") || `<div class="empty-state">No notifications.</div>`;
    openModal("notificationModal");
    if($("notificationBadge")) $("notificationBadge").textContent="0";
  }

  /* ---------- SETTINGS ---------- */

  function bindWeights() {
    const mapping=[
      ["weightTravel","travel"],["weightDelay","delay"],
      ["weightSla","sla"],["weightReassign","reassign"]
    ];
    mapping.forEach(([id,key])=>{
      const el=$(id);
      if(!el) return;
      el.addEventListener("input",()=>{
        state.weights[key]=Number(el.value);
        const out=el.parentElement?.querySelector("output");
        if(out) out.value=el.value;
      });
    });
  }

  function saveSettings() {
    state.weights.travel=Number($("settingTravel")?.value || 65);
    state.weights.sla=Number($("settingSla")?.value || 75);
    state.weights.reassign=Number($("settingStability")?.value || 60);
    state.weights.delay=Math.max(1,100-state.weights.travel*.3);

    emitEvent("POLICY_UPDATED","dispatcher","DISPATCH_POLICY",
      "Dispatch sensitivity policy saved",
      "SUCCESS"
    );
    toast("Policy saved","Optimization weights will use the updated policy.","success");
    renderAll();
  }

  /* ---------- NAVIGATION ---------- */

  function switchView(viewName) {
    $$(".nav-item[data-view]").forEach(btn=>btn.classList.toggle("active",btn.dataset.view===viewName));
    $$(".view").forEach(view=>view.classList.remove("active-view"));
    $(`view-${viewName}`)?.classList.add("active-view");

    if(viewName==="routes"){renderRouteSelects();renderGraph();}
    if(viewName==="analytics")renderAnalytics();
    if(viewName==="events")renderEvents();
    if(viewName==="security")renderAudit();
  }

  /* ---------- UTILITIES ---------- */

  function setText(id,value){const el=$(id);if(el)el.textContent=value;}
  function setStyleWidth(id,value){const el=$(id);if(el)el.style.width=`${value}%`;}
  function priorityClass(p){return p==="critical"?"priority-critical":p==="high"?"priority-high":p==="medium"?"priority-medium":"priority-low";}
  function formatTime(date){return new Date(date).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"});}
  function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
  function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

  function toast(title,message,type="info"){
    const box=$("toastContainer");
    if(!box)return;
    const el=document.createElement("div");
    el.className=`toast ${type}`;
    el.innerHTML=`<i></i><div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span></div><button>×</button>`;
    el.querySelector("button").onclick=()=>el.remove();
    box.appendChild(el);
    setTimeout(()=>el.remove(),5000);
  }

  function showLoading(title,message){
    setText("loadingTitle",title);setText("loadingMessage",message);
    $("loadingOverlay")?.classList.remove("hidden");
  }

  function hideLoading(){$("loadingOverlay")?.classList.add("hidden");}

  /* ---------- EVENT BINDING ---------- */

  function bindEvents(){
    $$(".nav-item[data-view]").forEach(btn=>btn.addEventListener("click",()=>switchView(btn.dataset.view)));

    $("notificationBtn")?.addEventListener("click",showNotifications);
    $("profileBtn")?.addEventListener("click",()=>toast("Dispatcher session","Role: Dispatcher · Tenant isolation: active","info"));

    $("newJobBtn")?.addEventListener("click",()=>openModal("newJobModal"));
    $("newJobBtn2")?.addEventListener("click",()=>openModal("newJobModal"));
    $("newJobForm")?.addEventListener("submit",handleNewJob);

    $("simulateDisruptionBtn")?.addEventListener("click",()=>openModal("disruptionModal"));
    $("simulateWorkerFailureBtn")?.addEventListener("click",()=>{openModal("disruptionModal");});
    $("runOptimizerBtn")?.addEventListener("click",runFullOptimization);
    $("runOptimizerBtn2")?.addEventListener("click",runFullOptimization);

    $("generateJobsBtn")?.addEventListener("click",burstJobs);
    $("addWorkerBtn")?.addEventListener("click",()=>{
      const i=state.workers.length+101;
      state.workers.push({
        id:`W-${i}`,name:`Demo Worker ${i}`,initials:"DW",
        skills:["Electrical","HVAC"],status:"available",zone:"Central",
        load:20,rating:4.5,jobs:0,etaBias:2
      });
      rebuildWorkerIndex();
      emitEvent("WORKER_CREATED","admin",`W-${i}`,"New worker added to active workforce","SUCCESS");
      renderAll();
      toast("Worker added",`W-${i} is available for dispatch.`,"success");
    });

    $("clearOptimizationLogBtn")?.addEventListener("click",()=>{pipelineReset();clearDecisionTrace();});
    $("resetGraphBtn")?.addEventListener("click",()=>{buildGraph();state.routeMultipliers={};renderGraph();calculateRoute();toast("Graph reset","Route weights restored.","info");});
    $("calculateRouteBtn")?.addEventListener("click",calculateRoute);
    $("calculateRouteBtn2")?.addEventListener("click",calculateRoute);

    $("clearEventsBtn")?.addEventListener("click",()=>{
      state.events=[];renderEvents();renderPreviewEvents();toast("Event stream cleared","New events will continue to be recorded.","info");
    });

    $("emitTestEventBtn")?.addEventListener("click",()=>{
      emitEvent("TEST_EVENT","dispatcher","SYSTEM","Manual event emitted from control center","INFO");
      toast("Event emitted","Audit trail updated.","success");
    });

    $("resetAnalyticsBtn")?.addEventListener("click",()=>{
      state.metrics.response=[18,21,17,23,19,20,16,18,17,15,16,14,15,13,14];
      state.metrics.churn=0;
      renderAnalytics();
      toast("Metrics reset","Rolling-window metrics restored.","info");
    });

    $("saveSettingsBtn")?.addEventListener("click",saveSettings);

    $("jobSearch")?.addEventListener("input",renderJobs);
    $("jobPriorityFilter")?.addEventListener("change",renderJobs);
    $("jobStatusFilter")?.addEventListener("change",renderJobs);
    $("sortJobsBtn")?.addEventListener("click",e=>{
      e.currentTarget.dataset.sort=e.currentTarget.dataset.sort==="sla"?"priority":"sla";
      e.currentTarget.textContent=e.currentTarget.dataset.sort==="sla"?"Sort: SLA":"Sort: Priority";
      renderJobs();
    });

    $$(".scenario-card[data-scenario]").forEach(card=>{
      card.addEventListener("click",()=>{
        const s=card.dataset.scenario;
        if(s==="worker")simulateWorkerFailure();
        if(s==="emergency")injectEmergencyJob();
        if(s==="traffic")spikeTraffic();
        if(s==="burst")burstJobs();
      });
    });

    $$("[data-close-modal]").forEach(btn=>btn.addEventListener("click",closeModal));
    $("modalBackdrop")?.addEventListener("click",closeModal);

    document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal();});

    window.addEventListener("resize",()=>{if($("view-routes")?.classList.contains("active-view"))renderGraph();if($("view-analytics")?.classList.contains("active-view"))drawResponseChart();});
  }

  /* ---------- CLOCK / LIVE EVENTS ---------- */

  function startClock(){
    const tick=()=>{
      setText("systemClock",new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"}));
    };
    tick();setInterval(tick,1000);
  }

  function startLiveSimulation(){
    setInterval(()=>{
      if(document.hidden)return;
      const active=state.workers.filter(w=>w.status!=="offline");
      if(!active.length)return;

      // Small operational drift keeps the dashboard visibly real-time.
      const w=active[Math.floor(Math.random()*active.length)];
      const delta=Math.random()>.5?1:-1;
      w.load=Math.max(20,Math.min(92,w.load+delta));

      if(Math.random()<.32){
        const activeJobs=state.jobs.filter(j=>j.status!=="completed");
        const job=activeJobs[Math.floor(Math.random()*activeJobs.length)];
        if(job) emitEvent("STATE_REFRESH","realtime",job.id,
          `${job.id} operational state refreshed`,
          "INFO"
        );
      }

      renderOverview();
      renderWorkers();
      renderAnalytics();
    },7000);
  }

  /* ---------- INITIAL STATE ---------- */

  function seedEvents(){
    emitEvent("SYSTEM_READY","system","FLOWOPS","Optimization engine initialized","SUCCESS");
    emitEvent("WORKER_SYNC","realtime","WORKFORCE","8 worker states synchronized","SUCCESS");
    emitEvent("QUEUE_REBUILT","optimizer","JOB_QUEUE","Priority queue rebuilt from active jobs","INFO");
    emitEvent("ROUTE_GRAPH_READY","system","GRAPH","13 weighted edges loaded for route planning","SUCCESS");
  }

  function renderAll(){
    renderOverview();
    renderJobs();
    renderWorkers();
    renderRouteSelects();
    renderGraph();
    renderAnalytics();
    renderEvents();
    renderAudit();
    renderPreviewEvents();
  }

  function boot(){
    buildGraph();
    seedData();
    bindEvents();
    bindWeights();
    startClock();
    seedEvents();
    renderAll();

    setText("engineStatusText","Ready");
    setText("pipelineRunStatus","IDLE");

    toast("FlowOps ready","Real-time dispatch engine initialized.","success");
  }

  window.FlowOps = {
    state,
    algorithms:{
      dijkstra,
      priorityScore,
      buildPriorityQueue,
      candidateFilter,
      boundedBacktracking,
      dpSubsetAssignment
    },
    optimize:runFullOptimization,
    simulate:{
      workerFailure:simulateWorkerFailure,
      emergency:injectEmergencyJob,
      traffic:spikeTraffic,
      burst:burstJobs
    }
  };

  boot();
  startLiveSimulation();
})();
