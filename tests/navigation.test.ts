import { it, expect, describe } from "vitest";
import { resolveConfig } from "../src/content/profile";
import {
  generateTerrain,
  buildRegions,
  edgeAllowed,
  center,
  changeCell,
  terrainHash,
  type Terrain,
} from "../src/world/terrain";
import {
  beginSearch,
  resumeSearch,
  pullPath,
  segments,
} from "../src/world/routing";
import { counters } from "../src/kernel/counters";
export function flat(width = 8, height = 8): Terrain {
  const t = generateTerrain(
    "flat",
    resolveConfig({ width, height, regionCells: 2 }, { actors: 1, sites: 1 }),
  );
  t.passable.fill(1);
  t.speed.fill(1);
  t.kind.fill(0);
  return t;
}
const route = (t: Terrain, start: number, goal: number, budget = 99999) => {
  const c = counters(),
    s = beginSearch(t, buildRegions(t), start, goal, c);
  return resumeSearch(t, s, budget, c);
};
describe("terrain and connected corridors", () => {
  it("retains seeded terrain repeatability, typed rasters and acyclic drainage", () => {
    const c = resolveConfig({ width: 32, height: 24 });
    const a = generateTerrain("terrain", c),
      b = generateTerrain("terrain", c);
    expect(terrainHash(a)).toBe(terrainHash(b));
    expect(terrainHash(generateTerrain("other", c))).not.toBe(terrainHash(a));
    for (let k = 0; k < a.kind.length; k++) {
      const seen = new Set<number>();
      let at = k;
      while (at >= 0) {
        expect(seen.has(at)).toBe(false);
        seen.add(at);
        at = a.drain[at]!;
      }
    }
    expect([...a.passable].some((x) => x === 0)).toBe(true);
    expect([...a.passable].some((x) => x === 1)).toBe(true);
  });
  it("builds actual connected regions, bidirectional portals and changes versions", () => {
    const t = flat(),
      r = buildRegions(t);
    expect(r.sizes).toEqual([64]);
    expect(r.neighbours.size).toBe(16);
    expect(r.portals.length).toBeGreaterThan(0);
    for (const p of r.portals) {
      expect(edgeAllowed(t, p.from, p.to)).toBe(true);
      expect(r.neighbours.get(p.a)!.has(p.b)).toBe(true);
      expect(r.neighbours.get(p.b)!.has(p.a)).toBe(true);
    }
    changeCell(t, 0, false, 0);
    expect(buildRegions(t).version).toBe(r.version + 1);
  });
});
describe("bounded weighted eight-neighbour navigation", () => {
  it("uses Euclidean diagonals and cell-weighted costs", () => {
    const t = flat(3, 3),
      r = route(t, 0, 4);
    expect(r.status).toBe("found");
    if (r.status === "found") {
      expect(r.path).toEqual([0, 4]);
      expect(r.cost).toBeCloseTo(0.1 * Math.sqrt(2), 15);
    }
    t.speed[4] = 0.5;
    const w = route(t, 0, 4);
    if (w.status === "found")
      expect(w.cost).toBeCloseTo(0.1 * Math.sqrt(2) * 1.5, 15);
  });
  it("does not cut corners or cross impassable terrain", () => {
    const t = flat(3, 3);
    changeCell(t, 1, false, 0);
    changeCell(t, 3, false, 0);
    expect(edgeAllowed(t, 0, 4)).toBe(false);
    expect(route(t, 0, 4).status).toBe("unreachable");
    expect(segments(t, center(t, 0), center(t, 4))).toBeNull();
    expect(route(t, 0, 1).status).toBe("unreachable");
  });
  it("reports budget exhaustion as unresolved, persists it, and resumes to the same path", () => {
    const t = flat(16, 16),
      c = counters(),
      s = beginSearch(t, buildRegions(t), 0, 255, c);
    expect(resumeSearch(t, s, 1, c).status).toBe("unresolved");
    const restored = JSON.parse(JSON.stringify(s));
    let result = resumeSearch(t, restored, 1, c);
    while (result.status === "unresolved")
      result = resumeSearch(t, restored, 1, c);
    const direct = route(t, 0, 255);
    expect(result.status).toBe("found");
    if (result.status === "found" && direct.status === "found") {
      expect(result.path).toEqual(direct.path);
      expect(result.cost).toBe(direct.cost);
    }
  });
  it("invalidates a held search after terrain mutation", () => {
    const t = flat(),
      c = counters(),
      s = beginSearch(t, buildRegions(t), 0, 63, c);
    resumeSearch(t, s, 1, c);
    changeCell(t, 20, false, 0);
    expect(resumeSearch(t, s, 100, c).status).toBe("invalidated");
  });
  it("string-pulls only traversable continuous segments and preserves geometry", () => {
    const t = flat(),
      r = route(t, 0, 63);
    if (r.status !== "found") throw Error("fixture");
    const points = pullPath(t, r.path);
    expect(points).toEqual([center(t, 0), center(t, 63)]);
    const chunks = segments(t, points[0]!, points[1]!)!;
    expect(chunks.reduce((n, s) => n + s.length, 0)).toBeCloseTo(
      0.7 * Math.sqrt(2),
      14,
    );
    for (const chunk of chunks) expect(t.passable[chunk.cell]).toBe(1);
  });
});
