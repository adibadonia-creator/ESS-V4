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
export function flat(width = 8, height = 8, regionCells = 2): Terrain {
  const t = generateTerrain(
    "flat",
    resolveConfig({ width, height, regionCells }, { actors: 1, sites: 1 }),
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

describe("sparse hierarchical routing", () => {
  function finish(
    t: Terrain,
    budget: number,
    guidance: "regional" | "raster" = "regional",
    start = 0,
    goal = t.kind.length - 1,
  ) {
    const c = counters(),
      regions = buildRegions(t),
      search = beginSearch(t, regions, start, goal, c, guidance);
    let result = resumeSearch(t, search, budget, c, regions);
    while (result.status === "unresolved")
      result = resumeSearch(t, search, budget, c, regions);
    return { result, search, c, regions };
  }
  it("stores only a small discovered frontier even on the canonical large raster", () => {
    for (const size of [32, 256]) {
      const t = flat(size, (size * 3) / 4, 8),
        c = counters(),
        r = buildRegions(t),
        s = beginSearch(t, r, 0, t.kind.length - 1, c, "raster");
      expect(Object.keys(s.nodes)).toHaveLength(1);
      expect(resumeSearch(t, s, 2, c, r).status).toBe("unresolved");
      expect(Object.keys(s.nodes).length).toBeLessThanOrEqual(14);
      expect(JSON.stringify(s).length).toBeLessThan(2500);
      expect(s).not.toHaveProperty("g");
      expect(s).not.toHaveProperty("parent");
      expect(s).not.toHaveProperty("closed");
    }
  });
  it("guides a long multi-region route with a corridor and weighted local refinement", () => {
    const t = flat(64, 24, 8);
    // A wall forces a distant, narrow actual crossing rather than a straight line.
    for (let y = 0; y < 24; y++)
      if (y !== 2) changeCell(t, y * 64 + 30, false, 0);
    for (let k = 0; k < t.speed.length; k++)
      if (t.passable[k] && k % 64 < 20) t.speed[k] = 0.75;
    const start = 20 * 64 + 2,
      goal = 20 * 64 + 61,
      guided = finish(t, 100000, "regional", start, goal),
      reference = finish(t, 100000, "raster", start, goal);
    expect(guided.result.status).toBe("found");
    expect(reference.result.status).toBe("found");
    expect(guided.search.corridor!.length).toBeGreaterThan(4);
    expect(guided.c.routeRegionExpansions).toBeGreaterThan(0);
    expect(guided.c.routeExpansions).toBeLessThan(reference.c.routeExpansions);
    if (guided.result.status !== "found") throw Error("Fixture route");
    expect(guided.result.path).toContain(2 * 64 + 30);
    for (let i = 0; i < guided.result.path.length; i++) {
      const k = guided.result.path[i]!;
      expect(t.passable[k]).toBe(1);
      expect(guided.search.corridor).toContain(guided.regions.region[k]);
      if (i) expect(edgeAllowed(t, guided.result.path[i - 1]!, k)).toBe(true);
    }
    const points = pullPath(t, guided.result.path);
    for (let i = 1; i < points.length; i++)
      expect(segments(t, points[i - 1]!, points[i]!)).not.toBeNull();
  });
  it("proves disconnected regions unreachable without searching an imagined portal", () => {
    const t = flat(32, 16, 8);
    for (let y = 0; y < 16; y++) changeCell(t, y * 32 + 16, false, 0);
    const a = finish(t, 1, "regional", 0, 31),
      b = finish(t, 10000, "raster", 0, 31);
    expect(a.result.status).toBe("unreachable");
    expect(b.result.status).toBe("unreachable");
    expect(a.c.routeExpansions + a.c.routeRegionExpansions).toBe(0);
    expect(a.search.nodes).toEqual({});
  });
  it("restores coarse and local unresolved frontiers bit-for-bit under different slices", () => {
    const t = flat(40, 24, 8),
      r = buildRegions(t),
      c = counters();
    let s = beginSearch(t, r, 0, 959, c);
    expect(resumeSearch(t, s, 1, c, r).status).toBe("unresolved");
    expect(s.stage).toBe("regional");
    s = JSON.parse(JSON.stringify(s));
    while (s.stage === "regional") {
      const before = c.routeExpansions + c.routeRegionExpansions;
      resumeSearch(t, s, 1, c, r);
      expect(
        c.routeExpansions + c.routeRegionExpansions - before,
      ).toBeLessThanOrEqual(1);
    }
    expect(s.status).toBe("unresolved");
    resumeSearch(t, s, 2, c, r);
    s = JSON.parse(JSON.stringify(s));
    let result = resumeSearch(t, s, 1, c, r);
    while (result.status === "unresolved") result = resumeSearch(t, s, 1, c, r);
    const direct = finish(t, 100000);
    expect(s).toEqual(direct.search);
    expect(result).toEqual(direct.result);
    expect(c.routeExpansions).toBe(direct.c.routeExpansions);
    expect(c.routeRegionExpansions).toBe(direct.c.routeRegionExpansions);
  });
  it("retains the zero-length corner dependencies of executable diagonals", () => {
    const t = flat(3, 3),
      ss = segments(t, center(t, 0), center(t, 4))!;
    expect(ss[0]!.guards).toEqual([1, 3]);
    changeCell(t, 1, false, 0);
    expect(segments(t, center(t, 0), center(t, 4))).toBeNull();
  });
});
