import { expect, test } from "vitest";
import { closestTailwindToColor, hexToRgb, normalizeHex } from "./colors";

test.each([
  ["fff", "ffffff"],
  ["ffffff", "ffffff"],
])("normalizeHex(%s) -> %s", (input, expected) => {
  expect(normalizeHex(input)).toBe(expected);
});

test.each([
  ["d6d3d1", { R: 214, G: 211, B: 209 }],
  ["215b63", { R: 33, G: 91, B: 99 }],
])("hexToRgb(%s) -> %j", (input, expected) => {
  expect(hexToRgb(input)).toStrictEqual(expected);
});

// ── v4 palette tests (default) ──────────────────────────────────────────
test.each([
  ["000000", { tailwind: "black", hex: "000000", truncatedDiff: 0 }],
  ["ffffff", { tailwind: "white", hex: "ffffff", truncatedDiff: 0 }],
  ["93c5fd", { tailwind: "blue-300", hex: "8ec5ff", truncatedDiff: 0 }],
  ["701a75", { tailwind: "fuchsia-900", hex: "721378", truncatedDiff: 1 }],
  ["9101ec", { tailwind: "purple-600", hex: "9810fa", truncatedDiff: 2 }],
  ["123c2d", { tailwind: "emerald-950", hex: "002c22", truncatedDiff: 5 }],
  ["rgb(0, 0, 0)", { tailwind: "black", hex: "000000", truncatedDiff: 0 }],
  [
    "hsl(0, 0%, 100%)",
    { tailwind: "white", hex: "ffffff", truncatedDiff: 0 },
  ],
])("closestTailwindToColor(%s, v4) -> %j", (input, expected) => {
  const closestTailwind = closestTailwindToColor(input, "v4");

  expect(closestTailwind.tailwind).toBe(expected.tailwind);
  expect(closestTailwind.hex).toBe(expected.hex);
  expect(Math.trunc(closestTailwind.diff)).toBe(expected.truncatedDiff);
});

// ── v3 palette tests ────────────────────────────────────────────────────
test.each([
  ["000000", { tailwind: "black", hex: "000000", truncatedDiff: 0 }],
  ["3b82f6", { tailwind: "blue-500", hex: "3b82f6", truncatedDiff: 0 }],
])("closestTailwindToColor(%s, v3) -> %j", (input, expected) => {
  const closestTailwind = closestTailwindToColor(input, "v3");

  expect(closestTailwind.tailwind).toBe(expected.tailwind);
  expect(closestTailwind.hex).toBe(expected.hex);
  expect(Math.trunc(closestTailwind.diff)).toBe(expected.truncatedDiff);
});

// ── v1 palette tests ────────────────────────────────────────────────────
test.each([
  ["000000", { tailwind: "black", hex: "000000", truncatedDiff: 0 }],
  ["4299e1", { tailwind: "blue-500", hex: "4299e1", truncatedDiff: 0 }],
])("closestTailwindToColor(%s, v1) -> %j", (input, expected) => {
  const closestTailwind = closestTailwindToColor(input, "v1");

  expect(closestTailwind.tailwind).toBe(expected.tailwind);
  expect(closestTailwind.hex).toBe(expected.hex);
  expect(Math.trunc(closestTailwind.diff)).toBe(expected.truncatedDiff);
});

// ── Alpha / opacity support ─────────────────────────────────────────────
test.each([
  [
    "rgba(59, 130, 246, 0.4)",
    { tailwindIncludes: "/40", hasAlpha: true, alpha: 0.4 },
  ],
  ["#3b82f666", { tailwindIncludes: "/40", hasAlpha: true, alpha: 0.4 }],
  [
    "hsla(217, 91%, 60%, 0.5)",
    { tailwindIncludes: "/50", hasAlpha: true, alpha: 0.5 },
  ],
  [
    "#3b82f6",
    { tailwindIncludes: undefined, hasAlpha: false, alpha: undefined },
  ],
])("alpha support: closestTailwindToColor(%s) -> %j", (input, expected) => {
  const result = closestTailwindToColor(input as string, "v3");

  if (expected.hasAlpha) {
    expect(result.tailwind).toContain(expected.tailwindIncludes);
    expect(result.alpha).toBeCloseTo(expected.alpha!, 2);
  } else {
    expect(result.tailwind).not.toContain("/");
    expect(result.alpha).toBeUndefined();
  }
});
