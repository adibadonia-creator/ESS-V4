import fs from "node:fs";
import { Session } from "../src/runners/session";
import { versions } from "../src/kernel/versions";
import { crossSurface, type Stage } from "../tests/cross-surface";
const stages: Stage[] = [],
  session = new Session();
const vectors = await crossSurface(
  async (c) => session.handle(c),
  (s) => stages.push(s),
);
fs.mkdirSync("public", { recursive: true });
fs.writeFileSync(
  "public/browser-reference.json",
  JSON.stringify({ versions, runtime: process.version, stages, vectors }),
);
console.log(
  "Node parity reference prepared. Run npm run dev, then open /verify.html. A real module Web Worker checks all stages, numerical vectors, and replay with render-frame delays.",
);
