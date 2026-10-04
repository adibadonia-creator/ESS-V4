import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
function files(dir) {
  return fs.readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    return fs.statSync(p).isDirectory() ? files(p) : [p];
  });
}
const errors = [];
for (const p of files("src").filter((p) => p.endsWith(".ts"))) {
  const source = ts.createSourceFile(
    p,
    fs.readFileSync(p, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const organ = p.split("/")[1];
  const pure = [
    "kernel",
    "world",
    "evidence",
    "runtime",
    "mind",
    "content",
    "projection",
    "measurement",
  ].includes(organ);
  function visit(node) {
    if (
      ts.isImportDeclaration(node) ||
      (ts.isExportDeclaration(node) && node.moduleSpecifier)
    ) {
      const spec = node.moduleSpecifier.text,
        target = spec.startsWith(".")
          ? path.normalize(path.join(path.dirname(p), spec))
          : spec;
      if (pure && (spec.startsWith("node:") || !spec.startsWith(".")))
        errors.push(`${p}: external dependency ${spec}`);
      if (
        ["presentation", "measurement"].includes(organ) &&
        !target.startsWith("src/projection") &&
        !target.startsWith("src/measurement") &&
        !target.startsWith("src/presentation") &&
        spec !== "pixi.js" &&
        !spec.endsWith(".css")
      )
        errors.push(`${p}: read-side import ${spec}`);
      if (organ === "projection" && !target.startsWith("src/projection"))
        errors.push(`${p}: projection imports runtime ${spec}`);
      if (
        organ === "measurement" &&
        !target.startsWith("src/projection") &&
        !target.startsWith("src/measurement")
      )
        errors.push(`${p}: measurement imports writable surface ${spec}`);
      if (
        organ === "kernel" &&
        spec.startsWith(".") &&
        !target.startsWith("src/kernel")
      )
        errors.push(`${p}: substrate depends on ${spec}`);
      if (organ === "world" && /\/mind(\/|$)/.test(target))
        errors.push(`${p}: law imports mind`);
      if (
        ["mind", "evidence", "runtime"].includes(organ) &&
        /\/(world|runners|presentation|measurement)(\/|$)/.test(target)
      )
        errors.push(
          `${p}: personal organ imports authoritative/read-side surface`,
        );
      if (organ === "mind" && /\/evidence\/service$/.test(target))
        errors.push(`${p}: mind imports evidence writer`);
      if (
        organ === "content" &&
        !target.startsWith("src/content") &&
        target !== "src/kernel/canonical"
      )
        errors.push(`${p}: content depends on runtime ${spec}`);
    }
    if (
      pure &&
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    )
      errors.push(`${p}: dynamic core import`);
    if (
      pure &&
      ts.isIdentifier(node) &&
      !(
        ts.isPropertyAccessExpression(node.parent) && node.parent.name === node
      ) &&
      !(ts.isPropertySignature(node.parent) && node.parent.name === node) &&
      !(ts.isPropertyAssignment(node.parent) && node.parent.name === node) &&
      [
        "document",
        "window",
        "self",
        "Date",
        "performance",
        "fetch",
        "requestAnimationFrame",
        "setTimeout",
        "setInterval",
      ].includes(node.text)
    )
      errors.push(`${p}: forbidden core global ${node.text}`);
    if (
      pure &&
      ts.isPropertyAccessExpression(node) &&
      node.expression.getText(source) === "Math" &&
      [
        "random",
        "exp",
        "log",
        "log1p",
        "expm1",
        "tanh",
        "pow",
        "sin",
        "cos",
        "hypot",
      ].includes(node.name.text)
    )
      errors.push(`${p}: unadapted causal math ${node.name.text}`);
    if (
      pure &&
      ts.isIdentifier(node) &&
      node.text === "globalThis" &&
      ts.isPropertyAccessExpression(node.parent) &&
      ["self", "window", "document"].includes(node.parent.name.text)
    )
      errors.push(`${p}: forbidden browser global`);
    ts.forEachChild(node, visit);
  }
  visit(source);
}
for (const p of files("src/content").filter((p) => p.endsWith(".json"))) {
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  function check(o) {
    if (!o || typeof o !== "object") return;
    for (const [k, v] of Object.entries(o)) {
      if (
        ["callback", "execute", "planner", "score", "query", "script"].includes(
          k,
        )
      )
        errors.push(`${p}: forbidden content construct ${k}`);
      if (typeof v === "number" && !Number.isFinite(v))
        errors.push(`${p}: nonfinite content`);
      check(v);
    }
  }
  check(data);
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("Import, pure-core, numerical and content boundaries passed");
