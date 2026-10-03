import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
function files(dir) {
  return fs
    .readdirSync(dir)
    .sort()
    .flatMap((n) => {
      const p = path.join(dir, n);
      return fs.statSync(p).isDirectory() ? files(p) : [p];
    });
}
const source = crypto.createHash("sha256");
for (const p of files("src").filter(
  (p) => !p.endsWith("buildStamp.ts") && !p.startsWith("src/presentation/"),
)) {
  source.update(p);
  source.update(fs.readFileSync(p));
}
const spec = crypto
  .createHash("sha256")
  .update(fs.readFileSync("docs/spec/REVISION_4_0.md"))
  .digest("hex");
fs.writeFileSync(
  "src/kernel/buildStamp.ts",
  `// Generated content identities; independent of Git commit IDs.\nexport const SOURCE_HASH = '${source.digest("hex")}';\nexport const SPEC_HASH = '${spec}';\n`,
);
