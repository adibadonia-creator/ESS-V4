import type { Command, Response, Snapshot } from "../src/projection/types";
import { math } from "../src/kernel/numerics";
import { philox } from "../src/kernel/random";
export interface Stage {
  name: string;
  hash: string;
  eventHash: string;
  time: number;
  paid: number[];
  goods: Snapshot["reconciliation"];
}
export async function crossSurface(
  handle: (c: Command) => Promise<Response>,
  report: (s: Stage) => void,
  frame: () => Promise<void> = async () => {},
) {
  let id = 0;
  const call = async (value: object) => {
    const r = await handle({ ...value, id: ++id } as Command);
    if (!r.ok) throw Error(r.error);
    return r;
  };
  const stage = (name: string, s: Snapshot) => {
    if (!s.reconciliation.ok) throw Error("Conservation failure");
    report({
      name,
      hash: s.hash,
      eventHash: s.eventHash,
      time: s.time,
      paid: s.actors.map((a) => a.paidTravelSd),
      goods: s.reconciliation,
    });
  };
  const first = (await call({ kind: "create", seed: "spine" })).snapshot!,
    a = first.actors[0]!,
    cache = first.containers.find(
      (c) => c.kind === "cache" && c.custodian === a.key,
    )!;
  stage("initial", first);
  await call({
    kind: "diagnostic-reserve",
    actor: a.key,
    from: cache.key,
    good: "food",
    quantity: 0.5,
    durationSd: 0.5,
  });
  await call({
    kind: "diagnostic-transfer",
    actor: a.key,
    from: cache.key,
    to: a.container,
    good: "food",
    quantity: 0.5,
  });
  await call({ kind: "advance", time: 100 });
  await call({
    kind: "diagnostic-consume",
    actor: a.key,
    from: a.container,
    good: "food",
    quantity: 0.25,
  });
  const active = (await call({ kind: "snapshot" })).snapshot!;
  if (
    !active.actors.some((a) => a.leg) ||
    !active.reservations.some((r) => r.status === "active")
  )
    throw Error("Expected active physical state");
  stage("active", active);
  const cp = (await call({ kind: "checkpoint" })).checkpoint!;
  const end = (await call({ kind: "advance", time: 2 ** 20 })).snapshot!;
  stage("uninterrupted", end);
  const restored = (await call({ kind: "restore", checkpoint: cp })).snapshot!;
  stage("restored-active", restored);
  if (restored.hash !== active.hash) throw Error("Active checkpoint mismatch");
  // Transport cadence and observer reads vary; causal endpoints are identical.
  for (let q = 100 + 17543; q < 2 ** 20; q += 17543) {
    const r = (await call({ kind: "advance", time: q })).snapshot!;
    const read = (await call({ kind: "snapshot" })).snapshot!;
    if (read.hash !== r.hash) throw Error("Observer changed state");
    await frame();
  }
  const chunked = (await call({ kind: "advance", time: 2 ** 20 })).snapshot!;
  stage("chunked-observed-restored", chunked);
  if (chunked.hash !== end.hash || chunked.eventHash !== end.eventHash)
    throw Error("Partition/replay mismatch");
  return {
    math: [
      math.exp(-0.2),
      math.log(1.3),
      math.pow(1.7, 0.33),
      math.sqrt(2),
      math.log1p(1e-16),
      math.expm1(1e-16),
    ],
    philox: philox([0, 0, 0, 0], [0, 0]),
  };
}
