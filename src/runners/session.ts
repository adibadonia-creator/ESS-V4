import { PhysicalSimulation } from "../runners/simulation";
import { createExplorationFixture } from "./explorationFixture";
import { launchAutonomousFixture } from "./autonomousFixture";
import { launchBodyFixture } from "./bodyFixture";
import { launchEvidenceFixture } from "./evidenceFixture";
import { launchPhysicalFixture } from "./fixture";
import { future } from "../kernel/time";
import type { Command, Response } from "../projection/types";
export class Session {
  private simulation: PhysicalSimulation | null = null;
  handle(command: Command): Response {
    try {
      if (
        command.kind === "create" ||
        command.kind === "create-evidence" ||
        command.kind === "create-body" ||
        command.kind === "create-autonomous" ||
        command.kind === "create-exploration"
      ) {
        this.simulation = command.kind === "create-exploration" ? createExplorationFixture(command.seed) : new PhysicalSimulation(command.seed);
        if (command.kind === "create") launchPhysicalFixture(this.simulation);
        else if (command.kind === "create-autonomous")
          launchAutonomousFixture(this.simulation);
        else if (command.kind === "create-body")
          launchBodyFixture(this.simulation);
        else if (command.kind !== "create-exploration") launchEvidenceFixture(this.simulation);
        return {
          id: command.id,
          ok: true,
          snapshot: this.simulation.snapshot(true),
        };
      }
      if (command.kind === "restore") {
        this.simulation = PhysicalSimulation.restore(command.checkpoint);
        return {
          id: command.id,
          ok: true,
          snapshot: this.simulation.snapshot(true),
        };
      }
      const sim = this.simulation;
      if (!sim) throw new Error("No simulation");
      if (command.kind === "task-interrupt")
        sim.diagnosticTaskInterrupt(command.actor);
      if (command.kind === "task-resume")
        sim.diagnosticTaskResume(command.actor);
      if (command.kind === "task-abandon")
        sim.diagnosticTaskAbandon(command.actor);
      if (command.kind === "advance") sim.advanceTo(command.time);
      if (command.kind === "checkpoint")
        return { id: command.id, ok: true, checkpoint: sim.checkpoint() };
      if (command.kind === "diagnostic-move") {
        sim.diagnosticMove(command.actor, command.target);
        sim.advanceTo(sim.kernel.state.now);
      }
      if (command.kind === "diagnostic-transfer")
        sim.diagnosticGoods({
          kind: "transfer",
          basis: "diagnostic-physical",
          actor: command.actor,
          from: command.from,
          to: command.to,
          good: command.good,
          quantity: command.quantity,
        });
      if (command.kind === "diagnostic-consume")
        sim.diagnosticGoods({
          kind: "sink",
          sink: "consumption",
          actor: command.actor,
          from: command.from,
          good: command.good,
          quantity: command.quantity,
        });
      if (command.kind === "diagnostic-reserve")
        sim.diagnosticGoods({
          kind: "reserve",
          actor: command.actor,
          from: command.from,
          good: command.good,
          quantity: command.quantity,
          expires: future(sim.kernel.state.now, command.durationSd),
        });
      if (command.kind === "diagnostic-release")
        sim.diagnosticGoods({
          kind: "release",
          actor: command.actor,
          reservation: command.reservation,
        });
      return {
        id: command.id,
        ok: true,
        snapshot: sim.snapshot(command.kind === "snapshot" && command.terrain),
      };
    } catch (error) {
      return {
        id: command.id,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
