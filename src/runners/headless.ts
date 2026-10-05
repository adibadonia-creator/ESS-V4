import fs from "node:fs";
import { PhysicalSimulation } from "../runners/simulation";
import { launchEvidenceFixture } from "./evidenceFixture";
import { launchPhysicalFixture } from "./fixture";
import { time } from "../kernel/time";
import { summarize } from "../measurement/reduce";
const args = process.argv.slice(2),
  arg = (name: string) => {
    const i = args.indexOf(name);
    return i < 0 ? undefined : args[i + 1];
  };
try {
  const restored = arg("--restore"),
    sim = restored
      ? PhysicalSimulation.restore(fs.readFileSync(restored, "utf8"))
      : new PhysicalSimulation(arg("--seed") ?? "spine");
  if (!restored) {
    if (args.includes("--pack0b")) launchEvidenceFixture(sim);
    else launchPhysicalFixture(sim);
  }
  sim.advanceTo(time(Number(arg("--until") ?? 1)));
  const checkpoint = arg("--checkpoint");
  if (checkpoint) fs.writeFileSync(checkpoint, sim.checkpoint());
  process.stdout.write(JSON.stringify(summarize(sim.snapshot())) + "\n");
} catch (e) {
  process.stderr.write(String(e) + "\n");
  process.exitCode = 1;
}
