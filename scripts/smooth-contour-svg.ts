import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type Point = { x: number; y: number };

const root = path.resolve(import.meta.dir, "..");
const inputPath = path.join(root, "assets", "loop_contour_trace.svg");
const variants = [
  { name: "xs", simplifyTolerance: 0.9, smoothingIterations: 1 },
  { name: "sm", simplifyTolerance: 1.4, smoothingIterations: 1 },
  { name: "md", simplifyTolerance: 2.0, smoothingIterations: 1 },
  { name: "lg", simplifyTolerance: 2.6, smoothingIterations: 1 },
  { name: "xl", simplifyTolerance: 3.2, smoothingIterations: 2 },
];

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function perpendicularDistance(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) return distance(point, start);

  return Math.abs(dy * point.x - dx * point.y + end.x * start.y - end.y * start.x) / Math.hypot(dx, dy);
}

function simplify(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) return points;

  let maxDistance = 0;
  let index = 0;

  for (let i = 1; i < points.length - 1; i += 1) {
    const dist = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (dist > maxDistance) {
      index = i;
      maxDistance = dist;
    }
  }

  if (maxDistance <= tolerance) return [points[0], points[points.length - 1]];

  const left = simplify(points.slice(0, index + 1), tolerance);
  const right = simplify(points.slice(index), tolerance);
  return [...left.slice(0, -1), ...right];
}

function chaikin(points: Point[], iterations: number): Point[] {
  let current = points;

  for (let i = 0; i < iterations; i += 1) {
    const next: Point[] = [];

    for (let j = 0; j < current.length; j += 1) {
      const a = current[j];
      const b = current[(j + 1) % current.length];
      next.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
      next.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
    }

    current = next;
  }

  return current;
}

function catmullRomClosedPath(points: Point[]): string {
  if (points.length < 3) return "";

  const fmt = (value: number) => Number(value.toFixed(2));
  const parts = [`M ${fmt(points[0].x)} ${fmt(points[0].y)}`];

  for (let i = 0; i < points.length; i += 1) {
    const p0 = points[(i - 1 + points.length) % points.length];
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const p3 = points[(i + 2) % points.length];

    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    parts.push(`C ${fmt(c1.x)} ${fmt(c1.y)} ${fmt(c2.x)} ${fmt(c2.y)} ${fmt(p2.x)} ${fmt(p2.y)}`);
  }

  parts.push("Z");
  return parts.join(" ");
}

function parseSubpaths(d: string): Point[][] {
  const tokens = [...d.matchAll(/([ML])\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g)];
  const subpaths: Point[][] = [];
  let current: Point[] = [];

  for (const [, command, x, y] of tokens) {
    if (command === "M" && current.length > 0) {
      subpaths.push(current);
      current = [];
    }

    const point = { x: Number(x), y: Number(y) };
    const previous = current.at(-1);
    if (!previous || distance(previous, point) > 0) current.push(point);
  }

  if (current.length > 0) subpaths.push(current);
  return subpaths;
}

async function main(): Promise<void> {
  const source = await readFile(inputPath, "utf8");
  const d = source.match(/<path\b[^>]*\sd="([\s\S]*?)"/)?.[1];
  if (!d) throw new Error("Could not find path data in loop_contour_trace.svg");

  const subpaths = parseSubpaths(d).filter((subpath) => subpath.length >= 8);

  for (const variant of variants) {
    const smoothed = subpaths
      .map((subpath) => {
        const simplified = simplify([...subpath, subpath[0]], variant.simplifyTolerance).slice(0, -1);
        return catmullRomClosedPath(chaikin(simplified, variant.smoothingIterations));
      })
      .filter(Boolean)
      .join("\n    ");

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" role="img" aria-labelledby="title desc">
  <title id="title">Elecmonkey Loop Contour Smooth</title>
  <desc id="desc">A ${variant.name} smoothed vector version of the traced Elecmonkey loop contour.</desc>
  <path fill="#9A6732" fill-rule="evenodd" d="
    ${smoothed}
  "/>
</svg>
`;

    const outputPath = path.join(root, "assets", `loop_contour_trace_smooth_${variant.name}.svg`);
    await writeFile(outputPath, svg);

    if (variant.name === "md") {
      await writeFile(path.join(root, "assets", "loop_contour_trace_smooth.svg"), svg);
    }
  }
}

await main();
