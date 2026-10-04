import { canonical, digest } from "../kernel/canonical";
import { EVIDENCE_PROFILE } from "../content/profile";
import { checkTime, QUANTA } from "../kernel/time";
import type { Counters } from "../kernel/counters";
import { clone } from "../evidence/service";
import { beginPersonalSearch, resumePersonalSearch } from "./routing";
import type {
  ActivityState,
  Operation,
  RuntimePort,
  RuntimeState,
  SelectedIntention,
  Task,
  BoundRepair,
} from "./types";
export class TaskRuntime {
  readonly state: RuntimeState;
  constructor(
    private port: RuntimePort,
    private counts: Counters,
    state: RuntimeState = { tasks: [], budgets: {}, activity: [] },
  ) {
    this.state = state;
  }
  task(actor: string): Task | null {
    return (
      [...this.state.tasks].reverse().find((t) => t.actor === actor) ?? null
    );
  }
  private budget(t: Task) {
    return this.state.budgets[t.actor + ":" + t.semanticKey]!;
  }
  select(input: SelectedIntention): Task {
    input = clone(input);
    if (
      input.source !== "diagnostic-selected-intention" ||
      !input.semanticKey ||
      input.steps.length < 1 ||
      input.steps.length > EVIDENCE_PROFILE.maxTaskSteps
    )
      throw Error("Invalid selected intention");
    checkTime(input.authorised.time);
    if (
      Object.values(input.authorised.goods).some(
        (x) => !Number.isFinite(x) || x < 0,
      )
    )
      throw Error("Invalid goods budget");
    if (
      input.steps.some(
        (s) =>
          s.family !== "Move" &&
          (!Number.isSafeInteger(s.duration) || s.duration <= 0),
      )
    )
      throw Error("Operations require positive paid duration");
    const view = this.port.personal(input.actor);
    // Reject malformed bindings before committing budgets, reservations or history.
    for (const step of input.steps) {
      if (step.family === "Move") {
        const p = view.profile;
        if (
          !Number.isFinite(step.target.x) ||
          !Number.isFinite(step.target.y) ||
          step.target.x < 0 ||
          step.target.y < 0 ||
          step.target.x >= p.width * p.cellKm ||
          step.target.y >= p.height * p.cellKm ||
          "priorSpeed" in step ||
          "effortEu" in step
        )
          throw Error("Invalid personal route binding");
      } else {
        checkTime(step.duration);
        checkTime(this.port.now() + step.duration);
      }
    }
    for (const r of input.reserve) checkTime(r.expires);
    if (
      !view.methods.some(
        (e) => e.subject === `method:${input.method}` && e.value === true,
      )
    )
      throw Error("Method is not personally known");
    const old = this.task(input.actor);
    if (old && !["done", "failed", "abandoned"].includes(old.status))
      throw Error("Retain or abandon existing task before selecting another");
    if (this.state.tasks.some((t) => t.taskId === input.taskId))
      throw Error("Duplicate task identity");
    const descriptor = canonical([
      input.objective,
      input.method,
      input.bindings,
      input.steps,
      input.authorised,
      input.reserve,
      input.repairScope ?? null,
    ]);
    input.semanticKey = digest([
      input.actor,
      input.objective,
      input.method,
      input.bindings,
      input.steps,
    ]);
    const samePurpose = [...this.state.tasks]
      .reverse()
      .find((t) => t.actor === input.actor && t.objective === input.objective);
    if (samePurpose && samePurpose.semanticKey !== input.semanticKey)
      throw Error(
        "Same-objective changes require retained semantic repair; a new task id grants no authority",
      );
    const key = input.actor + ":" + input.semanticKey,
      previous = this.state.budgets[key];
    if (previous && previous.descriptor !== descriptor)
      throw Error("Semantic retry cannot change authorisation");
    // Validate all required reservations before issuing any; local own endowment only.
    const demand = new Map<string, number>();
    for (const r of input.reserve) {
      const local = [...view.evidence]
        .reverse()
        .find(
          (e) => e.subject === r.subject && e.property === "own-local-stocks",
        );
      const stocks = (
        r.subject === view.self.carried.subject
          ? view.self.carried.stocks
          : local?.value
      ) as Record<string, number> | undefined;
      const tag = r.subject + ":" + r.good,
        q = (demand.get(tag) ?? 0) + r.quantity;
      demand.set(tag, q);
      if (
        !stocks ||
        !Number.isFinite(r.quantity) ||
        r.quantity <= 0 ||
        q > (stocks[r.good] ?? 0) ||
        r.expires <= this.port.now()
      )
        throw Error("Reservation lacks local backing");
    }
    this.state.budgets[key] ??= {
      authorised: clone(input.authorised),
      spent: { time: 0, goods: {} },
      descriptor,
    };
    const prior = [...this.state.tasks]
      .reverse()
      .find(
        (t) => t.actor === input.actor && t.semanticKey === input.semanticKey,
      );
    const t: Task = {
      ...input,
      steps: clone(prior?.steps ?? input.steps),
      bindings: clone(prior?.bindings ?? input.bindings),
      dependsOn: clone(prior?.dependsOn ?? input.dependsOn),
      bindingRevision: prior?.bindingRevision ?? 0,
      cursor: prior?.cursor ?? 0,
      status: "ready",
      reservations: [],
      progress: clone(prior?.progress ?? []),
      active: null,
      route: clone(prior?.route ?? null),
      routeCursor: prior?.routeCursor ?? 0,
      failure: null,
      interruption: null,
    };
    try {
      for (const r of t.cursor < input.steps.length ? input.reserve : [])
        t.reservations.push({
          key: this.port.reserve(
            input.actor,
            r.subject,
            r.good,
            r.quantity,
            r.expires,
          ),
          subject: r.subject,
          good: r.good,
        });
    } catch (e) {
      for (const r of t.reservations) this.port.release(t.actor, r.key);
      if (!previous) delete this.state.budgets[key];
      throw e;
    }
    this.state.tasks.push(t);
    this.port.pin(t);
    this.port.record("diagnostic-intention-selected", t.actor, {
      semanticKey: t.semanticKey,
      objective: t.objective,
    });
    if (prior && t.cursor < t.steps.length) {
      t.status = "suspended";
      this.resume(t.actor);
    } else this.start(t);
    return clone(t);
  }
  private valid(t: Task): boolean {
    return t.dependsOn.every(
      (d) => this.port.version(t.actor, d.key) === d.version,
    );
  }
  private remaining(t: Task): number {
    const b = this.budget(t);
    return b.authorised.time - b.spent.time;
  }
  private start(t: Task): void {
    if (!this.valid(t)) {
      this.block(t, "personal evidence dependency changed");
      return;
    }
    if (t.cursor >= t.steps.length) {
      t.status = "done";
      this.release(t);
      this.port.record("task-complete", t.actor, {
        semanticKey: t.semanticKey,
      });
      return;
    }
    const step = t.steps[t.cursor]!;
    if (!["Move", "Attend", "Transfer"].includes(step.family)) {
      t.status = "failed";
      t.failure = `not-yet-implemented law: ${step.family}`;
      this.release(t);
      return;
    }
    if (this.remaining(t) <= 0) {
      this.block(t, "authorised time exhausted");
      return;
    }
    this.counts.runtimeStepStarts++;
    if (step.family === "Move") {
      const view = this.port.personal(t.actor),
        p = view.profile;
      const k = (pt: { x: number; y: number }) =>
        Math.floor(pt.x / p.cellKm) + p.width * Math.floor(pt.y / p.cellKm);
      t.route = beginPersonalSearch(
        p,
        view.geography,
        k(view.self.location),
        k(step.target),
        step.exploratory,
        view.traversalPrior,
        this.counts,
        view.regions,
      );
      t.routeCursor = 1;
      t.status = "routing";
      return;
    }
    const duration =
      step.duration -
      this.activity(t.actor)
        .prefixes.filter(
          (p) =>
            p.semanticKey === t.semanticKey &&
            p.cursor === t.cursor &&
            p.revision === t.bindingRevision,
        )
        .reduce((sum, p) => sum + p.end - p.start, 0);
    if (duration > this.remaining(t)) {
      this.block(t, "next step exceeds authorised time");
      return;
    }
    if (step.family === "Transfer") {
      const b = this.budget(t),
        spent = b.spent.goods[step.good] ?? 0;
      if (
        !Number.isFinite(step.quantity) ||
        step.quantity <= 0 ||
        spent + step.quantity > (b.authorised.goods[step.good] ?? 0)
      ) {
        this.block(t, "next step exceeds authorised goods");
        return;
      }
    }
    const now = this.port.now();
    t.status = "running";
    t.active = {
      family: step.family,
      start: now,
      paidThrough: now,
      end: now + duration,
    };
    this.port.schedule(t, now + duration, "operation");
  }
  resumeRouting(slice: number): boolean {
    const t = this.state.tasks.find((x) => x.status === "routing");
    if (!t) return false;
    const result = resumePersonalSearch(t.route!, slice, this.counts);
    if (result === "deferred") {
      this.block(t, "route not established: engineering computation exhausted");
    } else if (result === "unreachable") {
      this.block(t, "no route in personal geography");
    } else if (result === "found") {
      t.status = "running";
      t.active = {
        family: "Move",
        start: this.port.now(),
        paidThrough: this.port.now(),
        end: null,
      };
      this.movePrefix(t);
    }
    return this.state.tasks.some((x) => x.status === "routing");
  }
  private movePrefix(t: Task): void {
    if (!this.valid(t)) {
      this.block(t, "personal evidence dependency changed");
      return;
    }
    const step = t.steps[t.cursor] as Extract<Operation, { family: "Move" }>,
      s = t.route!;
    if (t.routeCursor >= s.path.length) {
      const p = this.port.exactSelf(t.actor).location;
      if (p.x !== step.target.x || p.y !== step.target.y) {
        this.launch(t, step.target);
        return;
      }
      this.port.routeEvidence(
        t.actor,
        `route:${t.semanticKey}:${t.cursor}`,
        s.path,
        "established",
        this.port.now(),
      );
      this.complete(t);
      return;
    }
    const k = s.path[t.routeCursor]!,
      p = s.profile;
    this.launch(t, {
      x: ((k % p.width) + 0.5) * p.cellKm,
      y: (Math.floor(k / p.width) + 0.5) * p.cellKm,
    });
  }
  private launch(t: Task, target: { x: number; y: number }): void {
    if (this.remaining(t) <= 0) {
      this.block(t, "authorised time exhausted");
      return;
    }
    const r = this.port.startPrefix(t.actor, target);
    if (!r.ok && t.status === "blocked") return;
    if (!r.ok) {
      this.port.routeEvidence(
        t.actor,
        `route:${t.semanticKey}:${t.cursor}`,
        t.route!.path.slice(0, t.routeCursor + 1),
        "blocked",
        this.port.now(),
      );
      this.block(t, r.observed);
      return;
    }
    t.active!.end = r.end;
    const remaining = this.remaining(t),
      duration = r.end - this.port.now();
    if (duration > remaining)
      this.port.schedule(t, this.port.now() + remaining, "budget");
  }
  evidenceBoundary(actor: string): void {
    const t = this.task(actor);
    if (!t || t.status !== "running" || t.active?.family !== "Move" || !t.route)
      return;
    if (
      this.port.blockedCells(
        actor,
        t.route.path.slice(Math.max(0, t.routeCursor - 1)),
      )
    ) {
      this.port.routeEvidence(
        actor,
        `route:${t.semanticKey}:${t.cursor}`,
        t.route.path.slice(0, t.routeCursor + 1),
        "blocked",
        this.port.now(),
      );
      this.block(t, "route blocked here");
    }
  }
  // Called in Decide after Close and causal perception have settled.
  movementBoundary(actor: string): void {
    const t = this.task(actor);
    if (!t || t.status !== "running" || t.active?.family !== "Move") return;
    this.pay(t);
    t.progress.push({
      kind: "route-position",
      location: this.port.exactSelf(actor).location,
      at: this.port.now(),
    });
    t.routeCursor++;
    this.movePrefix(t);
  }
  operation(taskId: string, kind: "operation" | "budget"): void {
    const t = this.state.tasks.find((x) => x.taskId === taskId);
    if (!t || t.status !== "running" || !t.active) return;
    this.pay(t);
    if (kind === "budget") {
      this.port.stopMove(t.actor);
      this.block(t, "authorised time exhausted");
      return;
    }
    const step = t.steps[t.cursor]!;
    if (step.family === "Attend") this.port.observe(t.actor, step.duration);
    if (step.family === "Transfer") {
      const reservation = t.reservations.find(
        (r) => r.subject === step.from && r.good === step.good,
      );
      const result = this.port.transfer(t, step, reservation?.key);
      if (!result.ok) {
        this.block(t, result.observed);
        return;
      }
      const b = this.budget(t);
      b.spent.goods[step.good] =
        (b.spent.goods[step.good] ?? 0) + step.quantity;
      t.progress.push({
        kind: "goods-transfer",
        location: this.port.exactSelf(t.actor).location,
        at: this.port.now(),
        quantity: step.quantity,
        good: step.good,
      });
    }
    this.complete(t);
  }
  private complete(t: Task): void {
    this.pay(t);
    t.active = null;
    t.cursor++;
    t.route = null;
    this.counts.runtimeStepCompletions++;
    this.port.record("task-step-complete", t.actor, {
      semanticKey: t.semanticKey,
      cursor: t.cursor,
    });
    if (t.cursor < t.steps.length) this.counts.continueTransitions++;
    t.status = "ready";
    this.port.pin(t);
    this.start(t);
  }
  private activity(actor: string): ActivityState {
    let a = this.state.activity.find((a) => a.actor === actor);
    if (!a) {
      a = { actor, closedThrough: 0, totals: {}, prefixes: [] };
      this.state.activity.push(a);
    }
    return a;
  }
  private pay(t: Task): void {
    const op = t.active;
    if (!op) return;
    const now = this.port.now(),
      start = op.paidThrough;
    if (now === start) return;
    if (now < start) throw Error("Paid cursor regression");
    const a = this.activity(t.actor),
      last = a.prefixes.at(-1);
    if (last && last.end > start) throw Error("Overlapping personal activity");
    const b = this.budget(t);
    if (b.spent.time + now - start > b.authorised.time)
      throw Error("Unauthorised time overrun");
    const category =
      op.family === "Move"
        ? "travel"
        : op.family === "Attend"
          ? "attention"
          : "handling";
    for (let x = start; x < now;) {
      const day = Math.floor(x / QUANTA),
        end = Math.min(now, (day + 1) * QUANTA),
        totals = a.totals[day] ?? {};
      totals[category] = (totals[category] ?? 0) + end - x;
      a.totals[day] = totals;
      if (Object.values(totals).reduce((a, b) => a + b, 0) > QUANTA)
        throw Error("Activity exceeds one SD");
      x = end;
    }
    a.prefixes.push({
      revision: t.bindingRevision,
      semanticKey: t.semanticKey,
      cursor: t.cursor,
      category,
      start,
      end: now,
    });
    b.spent.time += now - start;
    op.paidThrough = now;
  }
  closure(actor: string): void {
    const t = this.task(actor);
    if (t?.status === "running") this.pay(t);
    this.activity(actor).closedThrough = this.port.now();
  }
  interrupt(actor: string, reason = "diagnostic interruption"): void {
    const t = this.task(actor);
    if (!t || !["running", "routing", "ready"].includes(t.status)) return;
    this.pay(t);
    if (t.active?.family === "Move") this.port.stopMove(actor);
    this.port.cancel(t);
    t.active = null;
    t.status = "suspended";
    t.interruption = { at: this.port.now(), reason };
    this.counts.taskInterruptions++;
  }
  resume(actor: string): void {
    const t = this.task(actor);
    if (!t || t.status !== "suspended") throw Error("No suspended task");
    t.interruption = null;
    if (!this.valid(t)) {
      this.block(t, "personal evidence dependency changed");
      return;
    }
    if (t.route?.status === "found") {
      t.status = "running";
      t.active = {
        family: "Move",
        start: this.port.now(),
        paidThrough: this.port.now(),
        end: null,
      };
      this.movePrefix(t);
    } else if (t.route?.status === "unresolved") t.status = "routing";
    else {
      // Retain the unpaid suffix of an interrupted timed operation.
      const step = t.steps[t.cursor]!;
      const paid = this.activity(actor)
        .prefixes.filter(
          (p) =>
            p.semanticKey === t.semanticKey &&
            p.cursor === t.cursor &&
            p.revision === t.bindingRevision,
        )
        .reduce((sum, p) => sum + p.end - p.start, 0);
      if (step.family !== "Move") {
        t.status = "running";
        const remaining = step.duration - paid;
        if (remaining <= 0) {
          this.complete(t);
          return;
        }
        t.active = {
          family: step.family,
          start: this.port.now(),
          paidThrough: this.port.now(),
          end: this.port.now() + remaining,
        };
        this.port.schedule(t, t.active.end!, "operation");
      } else this.start(t);
    }
  }
  private block(t: Task, reason: string): void {
    this.pay(t);
    if (t.active?.family === "Move") this.port.stopMove(t.actor);
    this.port.cancel(t);
    t.active = null;
    t.status = "blocked";
    t.failure = reason;
    this.counts.repairRequiredTransitions++;
    this.port.record("task-repair-required", t.actor, {
      semanticKey: t.semanticKey,
      observed: reason,
    });
  }
  private release(t: Task): void {
    this.port.unpin(t);
    for (const r of t.reservations) this.port.release(t.actor, r.key);
  }
  abandon(actor: string): void {
    const t = this.task(actor);
    if (!t) return;
    this.interrupt(actor, "abandoned");
    t.status = "abandoned";
    this.release(t);
  }
  installBoundRepair(actor: string, repair: BoundRepair): Task {
    const t = this.task(actor);
    if (
      !t ||
      !["blocked", "suspended"].includes(t.status) ||
      repair.semanticKey !== t.semanticKey ||
      repair.objective !== t.objective
    )
      throw Error("Repair must retain the selected semantic purpose");
    const scope = t.repairScope,
      view = this.port.personal(actor),
      old = t.steps.slice(t.cursor);
    if (
      !scope ||
      repair.steps.length !== old.length ||
      repair.steps.length === 0
    )
      throw Error("Repair is outside the selected envelope");
    for (const [key, value] of Object.entries(repair.bindings))
      if (value !== t.bindings[key] && !scope.bindings[key]?.includes(value))
        throw Error("Binding substitution is not authorised");
    if (Object.keys(t.bindings).some((k) => !(k in repair.bindings)))
      throw Error("Repair drops a required binding");
    for (let i = 0; i < old.length; i++) {
      const next = repair.steps[i]!,
        previous = old[i]!;
      if (next.family === "Move" && previous.family === "Move") {
        const k =
          Math.floor(next.target.x / view.profile.cellKm) +
          view.profile.width * Math.floor(next.target.y / view.profile.cellKm);
        if (
          !scope.moveTargets.some(
            (p) => p.x === next.target.x && p.y === next.target.y,
          ) ||
          !view.geography.some((c) => c.cell === k && c.passable) ||
          "priorSpeed" in next ||
          "effortEu" in next
        )
          throw Error("Repair target is not an authorised known place");
        if (next.exploratory !== previous.exploratory)
          throw Error("Repair changes authorised exposure");
      } else if (canonical(next) !== canonical(previous))
        throw Error("Repair changes fixed operation terms");
    }
    if (
      repair.dependsOn.some(
        (d) => this.port.version(actor, d.key) !== d.version,
      )
    )
      throw Error("Repair depends on stale personal knowledge");
    t.steps = [...t.steps.slice(0, t.cursor), ...clone(repair.steps)];
    t.bindings = clone(repair.bindings);
    t.dependsOn = clone(repair.dependsOn);
    t.bindingRevision++;
    t.route = null;
    t.routeCursor = 0;
    t.failure = null;
    t.interruption = null;
    t.status = "ready";
    this.port.pin(t);
    this.port.record("task-bound-suffix-installed", actor, {
      semanticKey: t.semanticKey,
      revision: t.bindingRevision,
    });
    this.start(t);
    return clone(t);
  }
  projection(actor: string): unknown {
    const t = this.task(actor),
      budget = t ? clone(this.budget(t)) : null,
      activity = clone(
        this.state.activity.find((x) => x.actor === actor) ?? null,
      );
    if (t?.active && budget) {
      const start = t.active.paidThrough,
        end = this.port.now();
      budget.spent.time += end - start;
      if (activity)
        for (let x = start; x < end;) {
          const day = Math.floor(x / QUANTA),
            to = Math.min(end, (day + 1) * QUANTA),
            category =
              t.active.family === "Move"
                ? "travel"
                : t.active.family === "Attend"
                  ? "attention"
                  : "handling";
          const totals = activity.totals[day] ?? {};
          totals[category] = (totals[category] ?? 0) + to - x;
          activity.totals[day] = totals;
          x = to;
        }
    }
    return clone({ task: t, budget, activity });
  }
}
