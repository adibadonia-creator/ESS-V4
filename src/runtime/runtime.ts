import {
  chargeRoute,
  routeAllowance,
  type EffortKind,
  type EffortAccount,
} from "../kernel/effort";
import { canonical, digest } from "../kernel/canonical";
import { EVIDENCE_PROFILE, EFFORT_PROFILE } from "../content/profile";
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
  private current = new Map<string, Task>();
  private byId = new Map<string, Task>();
  private activities = new Map<string, ActivityState>();
  private routing = new Map<string, Task>();
  constructor(
    private port: RuntimePort,
    private counts: Counters,
    state: RuntimeState = {
      tasks: [],
      terminal: [],
      retry: {},
      purpose: {},
      issuedTaskIds: {},
      latestTerminal: {},
      paidArchive: [],
      activityArchive: [],
      effort: {},
      currentEffort: {},
      reviewAuthorizations: {},
      budgets: {},
      activity: [],
    },
  ) {
    this.state = state;
    for (const t of state.tasks) {
      this.current.set(t.actor, t);
      this.byId.set(t.taskId, t);
      if (t.status === "routing" && !t.route?.deferred)
        this.routing.set(t.actor, t);
    }
    for (const a of state.activity) this.activities.set(a.actor, a);
  }
  task(actor: string): Task | null {
    this.counts.currentTaskLookups++;
    return this.current.get(actor) ?? null;
  }
  admitEffort(
    account: EffortAccount,
    selected: SelectedIntention | null = null,
  ): void {
    const existing = this.state.effort[account.key];
    if (existing && canonical(existing) !== canonical(account))
      throw Error("Review admission cannot rewrite an account");
    if (
      account.key !==
        canonical([account.actor, account.kind, account.openedAt]) ||
      account.openedAt !== this.port.now()
    )
      throw Error("Invalid review admission");
    this.state.effort[account.key] = clone(account);
    this.state.currentEffort[account.actor] = account.key;
    if (selected) {
      if (
        selected.actor !== account.actor ||
        selected.effortAccount !== account.key ||
        selected.envelope?.reviewAccount !== account.key
      )
        throw Error("Mismatched review envelope");
      this.state.reviewAuthorizations[account.key] = digest(selected);
    }
  }
  suspendForSafety(actor:string) {
    const t=this.task(actor);if(!t)return;
    if(t.source==="bounded-safety-reflex"){this.abandon(actor);return;}
    if((this.state.suspended??[]).some(s=>s.actor===actor))throw Error("Nested ordinary safety suspension");
    this.interrupt(actor,"immediate personal danger");
    this.state.tasks.splice(this.state.tasks.indexOf(t),1);this.current.delete(actor);this.byId.delete(t.taskId);
    (this.state.suspended??=[]).push(t);
  }
  resumeSuspended(actor:string) {
    const rows=this.state.suspended??[],index=rows.findIndex(t=>t.actor===actor);if(index<0||this.current.has(actor))return false;
    const t=rows.splice(index,1)[0]!;this.state.tasks.push(t);this.current.set(actor,t);this.byId.set(t.taskId,t);this.resume(actor);return true;
  }
  private budget(t: Task) {
    return this.state.budgets[t.actor + ":" + t.semanticKey]!;
  }
  select(input: SelectedIntention, diagnosticAdmission?: () => void): Task {
    input = clone(input);
    if (
      !input.source ||
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
    if (
      input.envelope &&
      (!input.effortAccount ||
        input.envelope.reviewAccount !== input.effortAccount ||
        this.state.effort[input.effortAccount]?.actor !== input.actor)
    )
      throw Error("Intention lacks its admitted review authority");
    if (
      input.envelope &&
      this.state.reviewAuthorizations[input.effortAccount!] !== digest(input)
    )
      throw Error("Selection differs from the admitted review envelope");
    // Reject malformed bindings before committing budgets, reservations or history.
    for (const step of input.steps) {
      if (
        step.family === "Work" &&
        step.compulsory !== undefined &&
        typeof step.compulsory !== "boolean"
      )
        throw Error("Invalid compulsory-service declaration");
      if (
        step.family === "Transfer" &&
        (!Number.isFinite(step.quantity) ||
          step.quantity <= 0 ||
          (step.use !== undefined && step.use !== "consume"))
      )
        throw Error("Invalid transfer quantity/use");
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
    if (view.belief(`method:${input.method}`, "known")?.value !== true)
      throw Error("Method is not personally known");
    const old = this.task(input.actor);
    if (old && !["done", "failed", "abandoned"].includes(old.status))
      throw Error("Retain or abandon existing task before selecting another");
    if (this.state.issuedTaskIds[input.taskId])
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
    const purposeKey = canonical([input.actor, input.objective]);
    const samePurpose = this.state.purpose[purposeKey];
    if (samePurpose && samePurpose !== input.semanticKey)
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
      const local = view.belief(r.subject, "own-local-stocks");
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
    if (diagnosticAdmission) {
      if (input.source !== "diagnostic-selected-intention" || input.envelope)
        throw Error("Diagnostic admission cannot authorize autonomous choice");
      diagnosticAdmission();
    }
    if (!input.effortAccount && !this.state.currentEffort[input.actor])
      throw Error("Selected intention lacks explicit cognitive admission");
    this.state.budgets[key] ??= {
      authorised: clone(input.authorised),
      spent: { time: 0, goods: {} },
      descriptor,
    };
    const archiveIndex = this.state.retry[key];
    const prior =
      archiveIndex === undefined ? null : this.state.terminal[archiveIndex]!;
    const t: Task = {
      ...input,
      steps: clone(prior?.steps ?? input.steps),
      bindings: clone(prior?.bindings ?? input.bindings),
      dependsOn: clone(prior?.dependsOn ?? input.dependsOn),
      bindingRevision: prior?.bindingRevision ?? 0,
      paidForStep: prior?.paidForStep ?? 0,
      physicalStepOutput: prior?.physicalStepOutput ?? 0,
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
    if (t.route?.geographyId)
      this.port.pinGeographyVersion(t.route.geographyId, t.taskId);
    this.state.tasks.push(t);
    this.current.set(t.actor, t);
    this.byId.set(t.taskId, t);
    this.state.issuedTaskIds[t.taskId] = true;
    this.state.purpose[purposeKey] = t.semanticKey;
    this.port.pin(t);
    this.port.record("intention-selected", t.actor, {
      semanticKey: t.semanticKey,
      objective: t.objective,
      source: t.source,
    });
    if (prior && t.cursor < t.steps.length) {
      t.status = "suspended";
      this.resume(t.actor);
    } else this.start(t);
    return clone(t);
  }
  private valid(t: Task): boolean {
    return t.dependsOn.every((d) => {
      const version = this.port.version(t.actor, d.key);
      if (version === d.version) return true;
      // A newer own receipt with the SAME balances does not invalidate paid
      // movement. Changed backing still takes the existing Reconsider path.
      if (d.valueFingerprint) {
        const [subject, property] = JSON.parse(d.key) as string[];
        const e = this.port.personal(t.actor).belief(subject!, property!);
        if (
          e &&
          (e.modality === "self" || e.modality === "direct") &&
          digest(e.value) === d.valueFingerprint
        ) {
          d.version = version;
          return true;
        }
      }
      return false;
    });
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
      this.archive(t);
      this.port.record("task-complete", t.actor, {
        project:t.project??null,projectFinal:t.projectFinal??false,
        semanticKey: t.semanticKey,
      });
      return;
    }
    const step = t.steps[t.cursor]!;
    if (
      !["Move", "Attend", "Transfer", "Work", "Recover", "Engage"].includes(step.family)
    ) {
      t.status = "failed";
      t.failure = `not-yet-implemented law: ${step.family}`;
      this.port.record("task-repair-required", t.actor, { reason: t.failure });
      this.release(t);
      this.archive(t);
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
      const prepared = t.preparedRoutes?.[t.cursor];
      if (prepared) {
        if (
          prepared.status !== "found" ||
          prepared.start !== k(view.self.location) ||
          prepared.goal !== k(step.target)
        )
          throw Error("Invalid prepared personal route");
        t.route = clone(prepared);
        if (prepared.geographyId)
          this.port.pinGeographyVersion(prepared.geographyId, t.taskId);
        t.routeCursor = 1;
        t.status = "running";
        t.active = {
          family: "Move",
          start: this.port.now(),
          paidThrough: this.port.now(),
          end: null,
        };
        const physical = this.port.beginPhysical(t, step, this.remaining(t));
        if (!physical.ok) this.block(t, physical.observed);
        else this.movePrefix(t);
        return;
      }
      t.route = beginPersonalSearch(
        p,
        [],
        k(view.self.location),
        k(step.target),
        step.exploratory,
        view.traversalPrior(),
        this.counts,
        [],
        this.port.pinGeography(t.actor, t.taskId),
      );
      t.route!.effortAccount =
        t.effortAccount ?? this.state.currentEffort[t.actor]!;
      t.routeCursor = 1;
      t.status = "routing";
      this.routing.set(t.actor, t);
      return;
    }
    const duration = step.duration - t.paidForStep;
    if (duration > this.remaining(t)) {
      this.block(t, "next step exceeds authorised time");
      return;
    }
    if (step.family === "Transfer") {
      for(const role of ["from","to"] as const){if(step[role].startsWith("$output:")){const binding=t.bindings[step[role]];if(!binding){this.block(t,"authorised production has not completed");return;}step[role]=binding;}}
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
    const physical = this.port.beginPhysical(t, step, duration);
    if(physical.ok)this.advanceOwnWrites(t,physical.ownWrites??[]);
    if (!physical.ok) {
      this.block(t, physical.observed);
      return;
    }
    t.active.end = physical.end;
    this.port.schedule(t, physical.end, "operation");
  }
  resumeRouting(slice: number): boolean {
    const t = this.routing.values().next().value as Task | undefined;
    if (!t) return false;
    this.counts.activeTaskRowsVisited++;
    const search = t.route!,
      account = this.state.effort[search.effortAccount!]!;
    const before = search.expansions;
    const result = resumePersonalSearch(
      search,
      slice,
      this.counts,
      routeAllowance(account),
      search.geographyId ? this.port.geography(search.geographyId) : undefined,
    );
    chargeRoute(account, search.expansions - before);
    if (result === "deferred") {
      // Computational deferral is causal, but neither evidence nor physical failure.
      search.deferred = true;
      this.routing.delete(t.actor);
      this.port.record("route-computationally-deferred", t.actor, {
        semanticKey: t.semanticKey,
        account: account.key,
        expansions: search.expansions,
      });
    } else if (result === "unreachable") {
      this.routing.delete(t.actor);
      this.block(t, "no route in personal geography");
    } else if (result === "found") {
      this.routing.delete(t.actor);
      t.status = "running";
      t.active = {
        family: "Move",
        start: this.port.now(),
        paidThrough: this.port.now(),
        end: null,
      };
      this.port.beginPhysical(t, t.steps[t.cursor]!, this.remaining(t));
      this.movePrefix(t);
    }
    return this.routing.size > 0;
  }
  // Diagnostic stand-in for an already admitted review/repair, not a mind.
  // Its semantic identity is actor/kind/causal boundary, never a supplied task label.
  authorizeEffort(actor: string, kind: EffortKind, alreadySpent = 0): string {
    const now = this.port.now(),
      key = canonical([actor, kind, now]);
    if (
      !Number.isSafeInteger(alreadySpent) ||
      alreadySpent < 0 ||
      alreadySpent > EFFORT_PROFILE[kind]
    )
      throw Error("Invalid diagnostic shared effort spend");
    if (this.state.effort[key]) {
      if (this.state.effort[key]!.spent < alreadySpent)
        throw Error("Cannot rewrite an existing cognitive account");
      return key;
    }
    this.state.effort[key] = {
      key,
      actor,
      kind,
      openedAt: now,
      allowance: EFFORT_PROFILE[kind],
      spent: alreadySpent,
      routeExpansions: 0,
      prepaidExpansions: 0,
      expansionsPerEu: EFFORT_PROFILE.routeExpansionsPerEu,
    };
    this.state.currentEffort[actor] = key;
    const t = this.task(actor);
    if (t?.status === "routing" && t.route?.deferred) {
      t.route.effortAccount = key;
      t.route.deferred = false;
      this.routing.set(actor, t);
    }
    this.port.record("diagnostic-effort-authorised", actor, {
      key,
      kind,
      alreadySpent,
    });
    return key;
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
    this.settlePhysical(t, false);
    this.port.beginPhysical(t, t.steps[t.cursor]!, this.remaining(t));
    this.movePrefix(t);
  }
  operation(taskId: string, kind: "operation" | "budget"): void {
    const t = this.byId.get(taskId);
    if (!t || t.status !== "running" || !t.active) return;
    this.pay(t);
    if (kind === "budget") {
      this.port.stopMove(t.actor);
      this.block(t, "authorised time exhausted");
      return;
    }
    const step = t.steps[t.cursor]!;
    const physical = this.settlePhysical(t, true);
    if (physical.good) {
      t.progress.push({
        kind: "physical-output",
        location: this.port.exactSelf(t.actor).location,
        at: this.port.now(),
        quantity:
          step.family === "Work" ? t.physicalStepOutput : physical.quantity,
        good: physical.good,
      });
    }
    if (physical.reason) {
      this.block(t, physical.reason);
      return;
    }
    if (step.family === "Attend") this.port.observe(t.actor, step.duration);
    if (step.family === "Transfer" && step.use !== "consume") {
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
  private advanceOwnWrites(t:Task,writes:{key:string;before:number;after:number}[]) {
    for(const write of writes){const d=t.dependsOn.find(d=>d.key===write.key&&d.version===write.before);if(d){d.version=write.after;if(d.valueFingerprint){const [subject,property]=JSON.parse(d.key) as [string,string];d.valueFingerprint=digest(this.port.personal(t.actor).belief(subject,property)?.value);}}}
  }
  private settlePhysical(t: Task, final: boolean) {
    const result = this.port.endPhysical(t, final),
      step = t.steps[t.cursor];
    // Only evidence written by settlement of this paid operation can advance
    // its own dependencies. External revisions still invalidate the intention.
    for (const write of result.ownWrites ?? []) {
      const d = t.dependsOn.find(
        (d) => d.key === write.key && d.version === write.before,
      );
      if (d) {
        d.version = write.after;
        if (d.valueFingerprint) {
          const [subject, property] = JSON.parse(d.key) as string[];
          d.valueFingerprint = digest(
            this.port.personal(t.actor).belief(subject!, property!)?.value,
          );
        }
      }
    }
    if(result.maintenanceCost)t.maintenanceForStep=(t.maintenanceForStep??0)+result.maintenanceCost;
    if(result.outputSubject)t.bindings[`$output:${t.cursor}`]=result.outputSubject;
    if (step?.family === "Work") t.physicalStepOutput += result.quantity;
    for (const [good, quantity] of Object.entries(result.costs ?? {})) {
      const budget = this.budget(t);
      budget.spent.goods[good] = (budget.spent.goods[good] ?? 0) + quantity;
      if (
        budget.spent.goods[good]! >
        (budget.authorised.goods[good] ?? 0) + 1e-9
      )
        throw Error("Material-effect budget overrun");
    }
    if (
      step?.family === "Transfer" &&
      step.use === "consume" &&
      result.quantity > 0
    ) {
      const budget = this.budget(t);
      budget.spent.goods[step.good] =
        (budget.spent.goods[step.good] ?? 0) + result.quantity;
      if (
        budget.spent.goods[step.good]! >
        (budget.authorised.goods[step.good] ?? 0) + 1e-9
      )
        throw Error("Consumption budget overrun");
    }
    return result;
  }
  private complete(t: Task): void {
    this.pay(t);
    this.settlePhysical(t, true);
    t.active = null;
    t.cursor++;
    t.paidForStep = 0;
    t.physicalStepOutput = 0;
    t.maintenanceForStep=0;
    t.route = null;
    this.port.unpinGeography(t.taskId);
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
    let a = this.activities.get(actor);
    if (!a) {
      a = { actor, closedThrough: 0, lastPaidEnd: 0, totals: {}, prefixes: [] };
      this.state.activity.push(a);
      this.activities.set(actor, a);
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
    const a = this.activity(t.actor);
    if (a.lastPaidEnd > start) throw Error("Overlapping personal activity");
    const b = this.budget(t);
    if (b.spent.time + now - start > b.authorised.time)
      throw Error("Unauthorised time overrun");
    const category =
      op.family === "Work"
        ? "work"
        : op.family === "Recover"
          ? ((t.steps[t.cursor] as Extract<Operation, { family: "Recover" }>)
              .mode ?? "rest")
          : op.family === "Move"
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
    this.state.paidArchive.push({
      actor: t.actor,
      revision: t.bindingRevision,
      semanticKey: t.semanticKey,
      cursor: t.cursor,
      category,
      start,
      end: now,
    });
    this.port.paidPhysical(t, start, now);
    a.lastPaidEnd = now;
    t.paidForStep += now - start;
    b.spent.time += now - start;
    op.paidThrough = now;
  }
  reviewBoundary(actor: string): void {
    const t = this.task(actor);
    if (!t || t.status !== "running" || !t.active) return;
    this.pay(t);
    const result = this.settlePhysical(t, false);
    if (result.reason) {
      this.block(t, result.reason);
      return;
    }
    const step = t.steps[t.cursor]!;
    const begun = this.port.beginPhysical(
      t,
      step,
      step.family === "Move"
        ? this.remaining(t)
        : step.duration - t.paidForStep,
    );
    if (!begun.ok) this.block(t, begun.observed);
    else if (step.family !== "Move") {
      this.port.cancel(t);
      t.active.end = begun.end;
      this.port.schedule(t, begun.end, "operation");
    }
  }
  closure(actor: string): void {
    const t = this.task(actor);
    if (t?.status === "running") this.pay(t);
    const activity = this.activity(actor);
    if (t?.status === "running") this.settlePhysical(t, false);
    this.port.physicalClosure(actor);
    if (t?.status === "running" && t.active) {
      const step = t.steps[t.cursor]!;
      const result = this.port.beginPhysical(
        t,
        step,
        step.family === "Move"
          ? this.remaining(t)
          : step.duration - t.paidForStep,
      );
      if (!result.ok) this.block(t, result.observed);
      else if (step.family !== "Move") {
        this.port.cancel(t);
        t.active.end = result.end;
        this.port.schedule(t, result.end, "operation");
      }
    }
    activity.closedThrough = this.port.now();
    const day = Math.floor(this.port.now() / QUANTA);
    for (const [key, totals] of Object.entries(activity.totals))
      if (+key < day) {
        this.state.activityArchive.push({ actor, day: +key, totals });
        delete activity.totals[+key];
      }
  }
  interrupt(actor: string, reason = "diagnostic interruption"): void {
    const t = this.task(actor);
    if (!t || !["running", "routing", "ready"].includes(t.status)) return;
    this.pay(t);
    if (t.active?.family === "Move") this.port.stopMove(actor);
    this.settlePhysical(t, true);
    this.port.cancel(t);
    this.routing.delete(t.actor);
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
      this.port.beginPhysical(t, t.steps[t.cursor]!, this.remaining(t));
      this.movePrefix(t);
    } else if (t.route?.status === "unresolved") {
      t.status = "routing";
      if (!t.route.deferred) this.routing.set(t.actor, t);
    } else {
      // Retain the unpaid suffix of an interrupted timed operation.
      const step = t.steps[t.cursor]!;
      const paid = t.paidForStep;
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
        const result = this.port.beginPhysical(t, step, remaining);
        if(result.ok)this.advanceOwnWrites(t,result.ownWrites??[]);
        if (!result.ok) {
          this.block(t, result.observed);
          return;
        }
        t.active.end = result.end;
        this.port.schedule(t, result.end, "operation");
      } else this.start(t);
    }
  }
  private block(t: Task, reason: string): void {
    this.pay(t);
    if (t.active?.family === "Move") this.port.stopMove(t.actor);
    this.settlePhysical(t, true);
    this.port.cancel(t);
    this.routing.delete(t.actor);
    t.active = null;
    t.status = "blocked";
    t.failure = reason;
    this.counts.repairRequiredTransitions++;
    this.port.record("task-repair-required", t.actor, {
      semanticKey: t.semanticKey,
      observed: reason,
    });
  }
  private archive(t: Task): void {
    const index = this.state.terminal.length;
    this.state.terminal.push(t);
    this.state.retry[t.actor + ":" + t.semanticKey] = index;
    if (!t.route) this.port.unpinGeography(`retry:${t.actor}:${t.semanticKey}`);
    this.state.latestTerminal[t.actor] = index;
    this.current.delete(t.actor);
    this.byId.delete(t.taskId);
    this.routing.delete(t.actor);
    this.state.tasks.splice(this.state.tasks.indexOf(t), 1);
    if (t.route?.geographyId)
      this.port.pinGeographyVersion(
        t.route.geographyId,
        `retry:${t.actor}:${t.semanticKey}`,
      );
    this.port.unpinGeography(t.taskId);
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
    this.archive(t);
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
          !view.cell(k)?.passable ||
          "priorSpeed" in next ||
          "effortEu" in next
        )
          throw Error("Repair target is not an authorised known place");
        if (next.exploratory !== previous.exploratory)
          throw Error("Repair changes authorised exposure");
      } else if(next.family==="Transfer"&&previous.family==="Transfer"&&next.from!==previous.from){
        const role=`input:${t.cursor+i}`;
        const stocks=next.from===view.self.carried.subject?view.self.carried.stocks:view.belief(next.from,"own-local-stocks")?.value as Record<string,number>|undefined;
        if(!scope.bindings[role]?.includes(next.from)||repair.bindings[role]!==next.from||!stocks||canonical({...next,from:previous.from})!==canonical(previous))throw Error("Repair changes fixed input terms or supplier");
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
    if(repair.preparedRoutes){
      t.preparedRoutes={};for(const [index,route] of Object.entries(repair.preparedRoutes))t.preparedRoutes[t.cursor+Number(index)]=clone(route);
    }else if(t.preparedRoutes)delete t.preparedRoutes[t.cursor];
    t.bindings = clone(repair.bindings);
    t.dependsOn = clone(repair.dependsOn);
    t.bindingRevision++;
    if (old[0]?.family === "Move") t.paidForStep = 0;
    this.port.unpinGeography(t.taskId);
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
  currentExecution(actor: string) {
    const t = this.task(actor);
    const task = t ? clone(t) : null,
      budget = t ? clone(this.budget(t)) : null;
    if (t?.active && task && budget) {
      const elapsed = this.port.now() - t.active.paidThrough;
      budget.spent.time += elapsed;
      task.paidForStep += elapsed;
    }
    return {
      task,
      budget,
      activity: clone(this.activities.get(actor) ?? null),
    };
  }
  projection(actor: string): unknown {
    // Explicit observer path may retrieve the last terminal archive by exact index.
    const current = this.task(actor),
      index = this.state.latestTerminal[actor];
    const t =
        current ?? (index === undefined ? null : this.state.terminal[index]!),
      budget = t ? clone(this.budget(t)) : null,
      activity = clone(this.activities.get(actor) ?? null);
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
