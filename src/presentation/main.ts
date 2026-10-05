import { Application, Container, Graphics, Sprite, Texture } from "pixi.js";
import type {
  ActorView,
  Command,
  Response,
  Snapshot,
  TerrainView,
} from "../projection/types";
import "./style.css";
const root = document.querySelector<HTMLDivElement>("#app")!;
root.innerHTML = `<header><div><strong>ESS <span>V4</span></strong><small>Personal knowledge, choice & execution</small></div><div id="clock">0.000 SD</div></header>
<section class="controls"><label>Seed <input id="seed" value="spine"></label><button id="new">New world</button><button id="body-fixture">Body fixture</button><button id="autonomous-fixture">Autonomous adults</button><button id="exploration-fixture">Exploration proof</button><button id="material-fixture">Material life</button><button id="play">Play</button><button id="step">+0.01 SD</button><label>Speed <select id="speed"><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="5">5×</option><option value="10">10×</option><option value="max">Max</option></select></label><button id="save">Save</button><button id="load">Load</button><input id="file" type="file" accept=".json" hidden></section>
<main><section class="map-wrap"><div id="map"></div><div class="caption"><span id="fixture-label">DIAGNOSTIC EXECUTION FIXTURE · No autonomous decisions</span><br>Click a shell to inspect its Personal Lens. Wheel to zoom; drag to pan.</div></section><aside><h2>Analyst truth</h2><p id="meta"></p><label>Inspect entity <select id="actor"></select></label><div id="inspect"></div><details id="personal-lens" open><summary>Personal Lens · remembered evidence</summary><canvas id="personal-map" width="384" height="288"></canvas><p id="lens-summary"></p><div id="task-state"></div><div class="row"><button id="interrupt-task">Interrupt task</button><button id="resume-task">Resume task</button><button id="abandon-task">Abandon task</button></div><h3>Dated evidence</h3><div id="evidence-records"></div></details><details id="decision-panel"><summary>Personal decision</summary><pre id="decision-summary"></pre></details><h3>Diagnostic operations</h3><button id="move">Move selected shell</button><label>Source <select id="from"></select></label><label>Destination <select id="to"></select></label><label>Good <select id="good"><option>food</option><option>wood</option><option>stone</option><option>fibre</option></select></label><label>Quantity <input id="quantity" type="number" min="0.01" value="0.5" step="0.1"></label><div class="row"><button id="transfer">Transfer</button><button id="consume">Consume</button><button id="reserve">Reserve 0.5 SD</button><button id="release">Release</button></div><p id="message" role="status"></p><h3>Consequential record</h3><div id="history"></div><details><summary>Measurement counters</summary><pre id="counters"></pre></details></aside></main><footer>Stage I.1 draft · Stage I remains incomplete. I.2 Social boundary is next. <span id="hash"></span></footer>`;
const element = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const worker = new Worker(new URL("../runners/worker.ts", import.meta.url), {
  type: "module",
});
let sequence = 0,
  snapshot: Snapshot | null = null,
  selected = "",
  playing = false,
  pending = false,
  moveMode = false,
  lastWall = performance.now(),
  advanceDebt = 0,
  lastRenderWall = performance.now(),
  displayTime = 0;
const waiting = new Map<number, (r: Response) => void>();
function command(value: Omit<Command, "id">): Promise<Response> {
  const id = ++sequence;
  return new Promise((resolve) => {
    waiting.set(id, resolve);
    worker.postMessage({ ...value, id });
  });
}
function send(value: object): Promise<Response> {
  return command(value as Omit<Command, "id">);
}
worker.onmessage = (event: MessageEvent<Response>) => {
  const r = event.data;
  if (r.ok && r.snapshot) receive(r.snapshot);
  if (!r.ok) element("message").textContent = r.error;
  const resolve = waiting.get(r.id);
  waiting.delete(r.id);
  resolve?.(r);
};
const app = new Application();
await app.init({
  background: 0x25382d,
  resizeTo: element("map"),
  preference: "webgl",
  antialias: true,
});
element("map").append(app.canvas);
const world = new Container(),
  entities = new Container(),
  terrainLayer = new Container();
world.addChild(terrainLayer, entities);
app.stage.addChild(world);
let terrain: TerrainView | null = null,
  mapSprite: Sprite | null = null,
  fit = false;
const actors = new Map<string, Graphics>(),
  sites = new Map<string, Graphics>();
function paintTerrain(t: TerrainView) {
  terrain = t;
  const canvas = document.createElement("canvas");
  canvas.width = t.width;
  canvas.height = t.height;
  const ctx = canvas.getContext("2d")!,
    data = ctx.createImageData(t.width, t.height);
  for (let i = 0; i < t.kind.length; i++) {
    const color = t.colors[t.kind[i]!]!;
    data.data[i * 4] = (color >> 16) & 255;
    data.data[i * 4 + 1] = (color >> 8) & 255;
    data.data[i * 4 + 2] = color & 255;
    data.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  if (mapSprite) {
    terrainLayer.removeChild(mapSprite);
    mapSprite.destroy({ texture: true, textureSource: true });
  }
  mapSprite = new Sprite(Texture.from(canvas));
  mapSprite.texture.source.scaleMode = "nearest";
  mapSprite.width = t.width * t.cellKm;
  mapSprite.height = t.height * t.cellKm;
  terrainLayer.addChild(mapSprite);
  if (!fit) {
    world.scale.set(
      Math.min(
        app.screen.width / mapSprite.width,
        app.screen.height / mapSprite.height,
      ) * 0.94,
    );
    world.position.set(
      (app.screen.width - mapSprite.width * world.scale.x) / 2,
      (app.screen.height - mapSprite.height * world.scale.y) / 2,
    );
    fit = true;
  }
}
function receive(s: Snapshot) {
  snapshot = s;
  displayTime = s.time;
  lastRenderWall = performance.now();
  if (s.terrain) paintTerrain(s.terrain);
  if (!s.actors.some((a) => a.key === selected))
    selected = s.actors[0]?.key ?? "";
  for (const [key, g] of actors)
    if (!s.actors.some((a) => a.key === key)) {
      g.destroy();
      actors.delete(key);
    }
  for (const [key, g] of sites)
    if (!s.containers.some((c) => c.key === key) && s.predator?.key !== key) {
      g.destroy();
      sites.delete(key);
    }
  const select = element<HTMLSelectElement>("actor");
  if (
    select.options.length !== s.actors.length ||
    !Array.from(select.options).some((o) => o.value === selected)
  ) {
    select.innerHTML = "";
    for (const a of s.actors) select.add(new Option(a.label, a.key));
  }
  select.value = selected;
  for (const a of s.actors) {
    let graphic = actors.get(a.key);
    if (!graphic) {
      graphic = new Graphics()
        .circle(0, 0, 0.065)
        .fill(0xf6d9a4)
        .stroke({ color: 0x302d27, width: 0.02 });
      graphic.eventMode = "static";
      graphic.cursor = "pointer";
      graphic.on("pointertap", () => {
        selected = a.key;
        select.value = a.key;
        inspect();
      });
      entities.addChild(graphic);
      actors.set(a.key, graphic);
    }
    graphic.position.set(a.position.x, a.position.y);
  }
  for (const c of s.containers.filter((c) => c.kind !== "carried")) {
    let g = sites.get(c.key);
    if (!g) {
      g = new Graphics();
      entities.addChild(g);
      sites.set(c.key, g);
    }
    g.clear();
    if (c.kind === "site")
      g.circle(
        0,
        0,
        0.035 +
          0.015 * Math.sqrt(Object.values(c.stocks).reduce((n, v) => n + v, 0)),
      ).fill(
        c.stocks.food
          ? 0xefbd58
          : c.stocks.stone
            ? 0xc1c4bc
            : c.stocks.wood
              ? 0x31472d
              : 0xcbdda0,
      );
    else g.rect(-0.045, -0.04, 0.09, 0.08).fill(0xa9784d);
    g.position.set(c.position.x, c.position.y);
  }
  if (s.predator) {
    let g = sites.get(s.predator.key);
    if (!g) {
      g = new Graphics();
      entities.addChild(g);
      sites.set(s.predator.key, g);
    }
    g.clear()
      .poly([-0.07, 0, 0, -0.06, 0.07, 0, 0, 0.06])
      .fill(s.predator.retreating ? 0x987b66 : 0xa63427);
    g.position.set(s.predator.position.x, s.predator.position.y);
  }
  for (const id of ["from", "to"]) {
    const selector = element<HTMLSelectElement>(id),
      previous = selector.value;
    selector.innerHTML = "";
    for (const c of s.containers) {
      const owner =
        s.actors.find((a) => a.key === c.custodian)?.label ?? c.key.slice(0, 6);
      selector.add(new Option(`${c.kind} · ${owner}`, c.key));
    }
    if (Array.from(selector.options).some((o) => o.value === previous))
      selector.value = previous;
    else {
      const a = s.actors.find((a) => a.key === selected)!;
      selector.value =
        id === "to"
          ? a.container
          : s.containers.find(
              (c) => c.custodian === a.key && c.kind === "cache",
            )!.key;
    }
  }
  element("clock").textContent = (s.time / 2 ** 20).toFixed(4) + " SD";
  element("meta").textContent =
    `Seed ${s.seed} · ${s.actors.length} physical shells · ${s.reconciliation.ok ? "conservation verified" : "CONSERVATION FAILURE"}`;
  element("fixture-label").textContent = s.fixture;
  element("hash").textContent = "Causal hash " + s.hash;
  inspect();
  element("history").replaceChildren(
    ...s.history
      .slice(-12)
      .reverse()
      .map((h) => {
        const div = document.createElement("div");
        div.className = "event";
        div.textContent = `${(h.at / 2 ** 20).toFixed(4)} · ${h.kind}`;
        return div;
      }),
  );
  element("counters").textContent = JSON.stringify(s.counters, null, 2);
}
function inspect() {
  if (!snapshot) return;
  const a = snapshot.actors.find((a) => a.key === selected)!;
  const panel = element("inspect");
  panel.replaceChildren();
  const rows: [string, string][] = [
    ["Status", a.motionStatus],
    ["Position", `${a.position.x.toFixed(3)}, ${a.position.y.toFixed(3)} km`],
    ["Paid travel", a.paidTravelSd.toFixed(6) + " SD"],
    ["Cargo", a.cargoCu.toFixed(3) + " CU"],
    ["Identity", a.key.slice(0, 12)],
    [
      "Leg",
      a.leg
        ? `${(a.leg.start / 2 ** 20).toFixed(5)} → ${(a.leg.end / 2 ** 20).toFixed(5)} SD`
        : "none",
    ],
  ];
  if (a.body)
    rows.push(
      ["Condition", a.body.c.toFixed(3)],
      ["Wounds", a.body.w.toFixed(3)],
      ["Fatigue", a.body.d.toFixed(3)],
      ["Enjoyment", a.body.f.toFixed(3)],
      ["Intake", a.body.intake.toFixed(3) + " FU/SD"],
      [
        "Mastery (analyst)",
        Object.entries(a.body.mastery)
          .map(([domain, value]) => `${domain} ${value.toFixed(3)}`)
          .join(", "),
      ],
      [
        "Practice SD",
        Object.entries(a.body.practice)
          .map(([domain, value]) => `${domain} ${value.toFixed(3)}`)
          .join(", "),
      ],
    );
  for (const [label, value] of rows) {
    const row = document.createElement("div");
    row.className = "detail";
    const left = document.createElement("span"),
      right = document.createElement("b");
    left.textContent = label;
    right.textContent = value;
    row.append(left, right);
    panel.append(row);
  }
  if (a.inputs && !a.body) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = `Held diagnostic inputs: ability ${a.inputs.ability}, condition ${a.inputs.condition}, wound ${a.inputs.wound}, fatigue ${a.inputs.fatigue}. These are fixture coefficients, not simulated physiology.`;
    panel.append(p);
  }
  const reserved = document.createElement("p");
  reserved.className = "muted";
  reserved.textContent =
    "Reservations: " +
    snapshot.reservations
      .filter((r) => r.actor === selected && r.status === "active")
      .map((r) => r.good + " " + r.remaining)
      .join(", ");
  panel.append(reserved);
  inspectPersonal();
}
element<HTMLSelectElement>("actor").onchange = (e) => {
  selected = (e.target as HTMLSelectElement).value;
  inspect();
};
element("play").onclick = () => {
  playing = !playing;
  element("play").textContent = playing ? "Pause" : "Play";
  lastWall = performance.now();
  advanceDebt = 0;
};
element("step").onclick = () =>
  snapshot &&
  send({ kind: "advance", time: snapshot.time + Math.ceil(0.01 * 2 ** 20) });
element("new").onclick = () => {
  playing = false;
  element("play").textContent = "Play";
  for (const g of actors.values()) g.destroy();
  for (const g of sites.values()) g.destroy();
  actors.clear();
  sites.clear();
  snapshot = null;
  fit = false;
  send({
    kind: "create-evidence",
    seed: element<HTMLInputElement>("seed").value,
  });
};
element("body-fixture").onclick = () => {
  playing = false;
  element("play").textContent = "Play";
  for (const g of actors.values()) g.destroy();
  for (const g of sites.values()) g.destroy();
  actors.clear();
  sites.clear();
  snapshot = null;
  fit = false;
  send({ kind: "create-body", seed: element<HTMLInputElement>("seed").value });
};
element("autonomous-fixture").onclick = () => {
  playing = false;
  element("play").textContent = "Play";
  for (const g of actors.values()) g.destroy();
  for (const g of sites.values()) g.destroy();
  actors.clear();
  sites.clear();
  snapshot = null;
  fit = false;
  send({
    kind: "create-autonomous",
    seed: element<HTMLInputElement>("seed").value,
  });
};
element("exploration-fixture").onclick = () => {
  playing = false;
  element("play").textContent = "Play";
  for (const g of actors.values()) g.destroy();
  for (const g of sites.values()) g.destroy();
  actors.clear();
  sites.clear();
  snapshot = null;
  fit = false;
  send({
    kind: "create-exploration",
    seed: element<HTMLInputElement>("seed").value,
  });
};
element("material-fixture").onclick = () => {
  playing = false;
  element("play").textContent = "Play";
  for (const g of actors.values()) g.destroy();
  for (const g of sites.values()) g.destroy();
  actors.clear();
  sites.clear();
  snapshot = null;
  fit = false;
  send({
    kind: "create-material",
    seed: element<HTMLInputElement>("seed").value,
  });
};
element("move").onclick = () => {
  moveMode = true;
  element("message").textContent =
    "Click a target on the map. This issues diagnostic movement.";
};
let dragging = false,
  startX = 0,
  startY = 0,
  originX = 0,
  originY = 0,
  moved = false;
app.canvas.addEventListener("pointerdown", (e) => {
  dragging = true;
  moved = false;
  startX = e.clientX;
  startY = e.clientY;
  originX = world.x;
  originY = world.y;
});
app.canvas.addEventListener("pointermove", (e) => {
  if (dragging && !moveMode) {
    const dx = e.clientX - startX,
      dy = e.clientY - startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
    world.position.set(originX + dx, originY + dy);
  }
});
app.canvas.addEventListener("pointerup", (e) => {
  dragging = false;
  if (moveMode && !moved) {
    const rect = app.canvas.getBoundingClientRect(),
      target = {
        x: (e.clientX - rect.left - world.x) / world.scale.x,
        y: (e.clientY - rect.top - world.y) / world.scale.y,
      };
    moveMode = false;
    send({ kind: "diagnostic-move", actor: selected, target });
  }
});
app.canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const rect = app.canvas.getBoundingClientRect(),
      x = e.clientX - rect.left,
      y = e.clientY - rect.top,
      old = world.scale.x,
      next = Math.max(
        10,
        Math.min(500, old * (e.deltaY < 0 ? 1.15 : 1 / 1.15)),
      );
    world.position.set(
      x - ((x - world.x) * next) / old,
      y - ((y - world.y) * next) / old,
    );
    world.scale.set(next);
  },
  { passive: false },
);
const goodsParams = () => ({
  actor: selected,
  from: element<HTMLSelectElement>("from").value,
  good: element<HTMLSelectElement>("good").value,
  quantity: Number(element<HTMLInputElement>("quantity").value),
});
element("transfer").onclick = () =>
  send({
    kind: "diagnostic-transfer",
    ...goodsParams(),
    to: element<HTMLSelectElement>("to").value,
  });
element("consume").onclick = () =>
  send({ kind: "diagnostic-consume", ...goodsParams() });
element("reserve").onclick = () =>
  send({ kind: "diagnostic-reserve", ...goodsParams(), durationSd: 0.5 });
element("release").onclick = () => {
  const r = snapshot?.reservations.find(
    (r) => r.actor === selected && r.status === "active",
  );
  if (r)
    send({ kind: "diagnostic-release", actor: selected, reservation: r.key });
};
element("save").onclick = async () => {
  const r = await send({ kind: "checkpoint" });
  if (r.ok && r.checkpoint) {
    const url = URL.createObjectURL(
        new Blob([r.checkpoint], { type: "application/json" }),
      ),
      link = document.createElement("a");
    link.href = url;
    link.download = `ess-v4-${snapshot!.seed}.checkpoint.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
};
element("load").onclick = () => element<HTMLInputElement>("file").click();
element<HTMLInputElement>("file").onchange = async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    playing = false;
    element("play").textContent = "Play";
    await send({ kind: "restore", checkpoint: await file.text() });
  }
};
function renderPosition(a: ActorView, t: number) {
  const l = a.leg;
  if (!l) return a.position;
  const f = Math.max(0, Math.min(1, (t - l.start) / (l.end - l.start)));
  return {
    x: l.from.x + (l.to.x - l.from.x) * f,
    y: l.from.y + (l.to.y - l.from.y) * f,
  };
}
app.ticker.add(() => {
  const now = performance.now(),
    delta = now - lastWall;
  lastWall = now;
  if (snapshot && playing) {
    const speed = element<HTMLSelectElement>("speed").value;
    if (speed === "max") advanceDebt += 0.05 * 2 ** 20;
    else advanceDebt += (delta / 15000) * Number(speed) * 2 ** 20;
    if (!pending && advanceDebt >= 1) {
      const amount = Math.floor(advanceDebt);
      advanceDebt -= amount;
      pending = true;
      send({ kind: "advance", time: snapshot.time + amount }).finally(
        () => (pending = false),
      );
    }
  }
  if (snapshot) {
    const next = snapshot.actors.reduce(
        (v, a) => (a.leg ? Math.min(v, a.leg.end) : v),
        Infinity,
      ),
      speed = Number(element<HTMLSelectElement>("speed").value) || 0;
    displayTime = playing
      ? Math.min(
          next,
          snapshot.time + ((now - lastRenderWall) / 15000) * speed * 2 ** 20,
        )
      : snapshot.time;
    for (const a of snapshot.actors) {
      const p = renderPosition(a, displayTime),
        g = actors.get(a.key)!;
      g.position.set(p.x, p.y);
      g.tint = a.key === selected ? 0xffffff : 0xd0e3c7;
    }
  }
});
await send({ kind: "create-evidence", seed: "spine" });

interface LensDTO {
  personal: {
    memory: {
      discretionaryPlaces: number;
      pinnedPlaces: number;
      limit: number;
    };
    owner: string;
    time: number;
    profile: { width: number; height: number; cellKm: number };
    geography: {
      cell: number;
      terrain: number;
      passable: boolean;
      observedAt: number;
    }[];
    places: {
      subject: string;
      property: string;
      value: unknown;
      observedAt: number;
    }[];
    routes: { cells: number[]; status: string }[];
    evidence: {
      subject: string;
      property: string;
      value: unknown;
      observedAt: number;
      receivedAt: number;
      provenance: string;
      modality: string;
      version: number;
    }[];
    self: { location: { x: number; y: number } };
  };
  decision: {
    periodicAt: number;
    pending: string[];
    projects?: unknown[];
    traces: {
      at: number;
      causes: string[];
      effort: { spent: number; allowance: number };
      winner: string;
      rule: string;
      agenda: unknown[];
      compared: {
        option: {
          key: string;
          method: string;
          reference: boolean;
          reason: string;
        };
        value: number;
        error: number;
        feasible: boolean;
        gate: string | null;
        consequences: { severeProbability: number };
      }[];
      selected: unknown;
      deferrals: string[];
    }[];
  } | null;
  execution: {
    task: {
      objective: string;
      source: string;
      method: string;
      status: string;
      cursor: number;
      steps: { family: string }[];
      progress: unknown[];
      failure: string | null;
      semanticKey: string;
    } | null;
    budget: {
      authorised: { time: number; goods: unknown };
      spent: { time: number; goods: unknown };
    } | null;
  };
}
function inspectPersonal() {
  const lens = (snapshot?.personalLenses as LensDTO[]).find(
    (l) => l.personal.owner === selected,
  );
  element("personal-lens").hidden = !lens;
  if (!lens) return;
  const p = lens.personal,
    t = lens.execution.task,
    b = lens.execution.budget;
  const canvas = element<HTMLCanvasElement>("personal-map"),
    ctx = canvas.getContext("2d")!;
  // A local window keeps sparse personal knowledge readable without filling unseen ground.
  const cell = p.profile.cellKm,
    ox = p.self.location.x / cell - 12,
    oy = p.self.location.y / cell - 9;
  const dx = canvas.width / 24,
    dy = canvas.height / 18;
  ctx.fillStyle = "#182326";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const c of p.geography) {
    const color = terrain?.colors[c.terrain] ?? 0x6e8b70;
    ctx.fillStyle = c.passable
      ? "#" + color.toString(16).padStart(6, "0")
      : "#e09868";
    ctx.fillRect(
      ((c.cell % p.profile.width) - ox) * dx,
      (Math.floor(c.cell / p.profile.width) - oy) * dy,
      Math.max(1, dx),
      Math.max(1, dy),
    );
  }
  for (const r of p.routes) {
    ctx.strokeStyle = r.status === "blocked" ? "#ffb384" : "#d4e4a8";
    ctx.beginPath();
    r.cells.forEach((k, i) => {
      const x = ((k % p.profile.width) + 0.5 - ox) * dx,
        y = (Math.floor(k / p.profile.width) + 0.5 - oy) * dy;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    });
    ctx.stroke();
  }
  for (const place of p.places.filter((e) => e.property === "location")) {
    const q = place.value as { x: number; y: number };
    ctx.fillStyle = "#e9d592";
    ctx.fillRect((q.x / cell - ox) * dx - 2, (q.y / cell - oy) * dy - 2, 4, 4);
  }
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(
    (p.self.location.x / cell - ox) * dx,
    (p.self.location.y / cell - oy) * dy,
    3,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  element("lens-summary").textContent =
    `${p.geography.length} seen cells · ${p.profile.width * p.profile.height - p.geography.length} unseen. Places: ${p.memory.discretionaryPlaces}/${p.memory.limit} discretionary + ${p.memory.pinnedPlaces} pinned. Local window: 2.4 × 1.8 km. Dark ground is unknown. Places and routes are dated personal memory.`;
  element("task-state").textContent = t
    ? ` ${t.source === "bounded-personal-review" ? "AUTONOMOUS INTENTION" : "DIAGNOSTIC SELECTED INTENTION"}: ${t.objective} · method ${t.method}\n${t.status} · step ${t.cursor + 1}/${t.steps.length}: ${t.steps[t.cursor]?.family ?? "complete"}\nLocated progress: ${t.progress.length} records\nTime authorised/spent: ${((b?.authorised.time ?? 0) / 2 ** 20).toFixed(5)} / ${((b?.spent.time ?? 0) / 2 ** 20).toFixed(5)} SD\nGoods authorised/spent: ${JSON.stringify(b?.authorised.goods)} / ${JSON.stringify(b?.spent.goods)}\n${t.failure ?? ""}`
    : "No current intention";
  element("decision-panel").hidden = !lens.decision;
  const trace = lens.decision?.traces.at(-1);
  element("decision-summary").textContent = trace
    ? [
        `Review ${(trace.at / 2 ** 20).toFixed(4)} SD · ${trace.causes.join(", ")} · ${trace.effort.spent}/${trace.effort.allowance} EU`,
        `Objectives: ${JSON.stringify(trace.agenda)}`,
        `Projects: ${JSON.stringify(lens.decision?.projects ?? [])}`,
        ...p.evidence
          .filter((e) =>
            ["items", "work-progress", "threat"].includes(e.property),
          )
          .slice(-6)
          .map((e) => `${e.subject}/${e.property}: ${JSON.stringify(e.value)}`),
        ...trace.compared.map(
          (x) =>
            `${x.option.key === trace.winner ? "Chosen" : "Compared"} ${x.option.reference ? "continuation" : x.option.method}: value ${x.value.toFixed(3)}, held error ${x.error.toFixed(3)}, severe risk ${x.consequences.severeProbability.toFixed(3)}, ${x.feasible ? "feasible" : x.gate} · ${x.option.reason}`,
        ),
        `Rule: ${trace.rule} · deferred ${trace.deferrals.length}`,
        `Envelope: ${JSON.stringify(trace.selected)}`,
        ...p.evidence
          .filter((e) => e.property === "outcome")
          .slice(-3)
          .map((e) => `Observed ${e.subject}: ${JSON.stringify(e.value)}`),
        ...p.evidence
          .filter(
            (e) => e.subject.startsWith("method:") && e.modality === "trial",
          )
          .slice(-8)
          .map(
            (e) =>
              `Provisional ${e.subject}/${e.property}: ${JSON.stringify(e.value)} · v${e.version} · provenance ${e.provenance}`,
          ),
        ...p.evidence
          .filter((e) => e.subject === "exploration")
          .slice(-3)
          .map((e) => `Attempt ${e.property}: ${JSON.stringify(e.value)}`),
      ].join("\n")
    : `Waiting for a personal wake. Next periodic review ${((lens.decision?.periodicAt ?? 0) / 2 ** 20).toFixed(4)} SD`;
  const inspectionEvidence = [...p.evidence]
    .sort((a, b) => a.receivedAt - b.receivedAt)
    .slice(-9)
    .reverse();
  const bodyEvidence = p.evidence.find(
    (e) => e.subject === "self" && e.property === "body-experience",
  );
  if (bodyEvidence && !inspectionEvidence.includes(bodyEvidence))
    inspectionEvidence.push(bodyEvidence);
  element("evidence-records").replaceChildren(
    ...inspectionEvidence.map((e) => {
      const div = document.createElement("div");
      div.className = "event";
      div.textContent = `${(e.observedAt / 2 ** 20).toFixed(5)} SD observed · ${(e.receivedAt / 2 ** 20).toFixed(5)} received · ${e.modality} · ${e.subject}/${e.property} v${e.version} · provenance ${e.provenance.slice(0, 10)}`;
      return div;
    }),
  );
  for (const id of ["move", "transfer", "consume", "reserve", "release"])
    element<HTMLButtonElement>(id).disabled = true;
}
element("interrupt-task").onclick = () =>
  send({ kind: "task-interrupt", actor: selected });
element("resume-task").onclick = () =>
  send({ kind: "task-resume", actor: selected });
element("abandon-task").onclick = () =>
  send({ kind: "task-abandon", actor: selected });
