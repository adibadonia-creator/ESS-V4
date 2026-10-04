import type { Command, Response } from "../src/projection/types";
import { crossSurface, type Stage } from "./cross-surface";
import { versions } from "../src/kernel/versions";
const output = document.getElementById("results")!;
const worker = new Worker(
  new URL("../src/runners/worker.ts", import.meta.url),
  { type: "module" },
);
const pending = new Map<number, (r: Response) => void>();
worker.onmessage = (e: MessageEvent<Response>) => {
  pending.get(e.data.id)?.(e.data);
  pending.delete(e.data.id);
};
worker.onerror = (e) => {
  output.textContent = "FAIL: worker error " + e.message;
};
const handle = (command: Command): Promise<Response> =>
  new Promise((resolve) => {
    pending.set(command.id, resolve);
    worker.postMessage(command);
  });
try {
  const response = await fetch("/browser-reference.json");
  if (!response.ok) throw Error("Run npm run verify:browser first");
  const expected = await response.json();
  if (JSON.stringify(expected.versions) !== JSON.stringify(versions))
    throw Error("Reference has a different build profile");
  const stages: Stage[] = [];
  output.textContent = "Running real browser-worker parity checks…";
  const vectors = await crossSurface(
    handle,
    (s) => {
      stages.push(s);
      output.textContent = stages
        .map(
          (s, i) =>
            `${JSON.stringify(s) === JSON.stringify(expected.stages[i]) ? "PASS" : "FAIL"} ${s.name} ${s.hash}`,
        )
        .join("\n");
    },
    () => new Promise((resolve) => requestAnimationFrame(() => resolve())),
  );
  if (
    JSON.stringify(stages) !== JSON.stringify(expected.stages) ||
    JSON.stringify(vectors) !== JSON.stringify(expected.vectors)
  )
    throw Error("Node/browser hash or numerical-vector mismatch");
  output.textContent +=
    "\nPASS numerical and Philox vectors\nPASS worker vs Node, stepping, checkpoint, observers, frame delays\nALL CHECKS PASSED";
  document.body.dataset.result = "passed";
} catch (error) {
  output.textContent += "\nFAIL " + String(error);
  document.body.dataset.result = "failed";
}
worker.terminate();
