import { expect, test } from "vitest";
import {
  buildBrandKit,
  closestTailwindToColor,
  hexToRgb,
  lookupTailwindToken,
  normalizeHex,
  parseBatchInputs,
  parseCustomPalette,
  parseVersionParam,
  resolveColorMatch,
} from "./colors";

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
  ["hsl(0, 0%, 100%)", { tailwind: "white", hex: "ffffff", truncatedDiff: 0 }],
])("closestTailwindToColor(%s, v4) -> %j", (input, expected) => {
  const closestTailwind = closestTailwindToColor(input, "v4");

  expect(closestTailwind.tailwind).toBe(expected.tailwind);
  expect(closestTailwind.hex).toBe(expected.hex);
  expect(Math.trunc(closestTailwind.diff)).toBe(expected.truncatedDiff);
  expect(closestTailwind.topMatches).toHaveLength(3);
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
  expect(closestTailwind.variants.background).toBe(`bg-${expected.tailwind}`);
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

test("returns family scale, dark mode complement, and contrast metadata", () => {
  const result = closestTailwindToColor("#e2e8f0", "v3");

  expect(result.tailwind).toBe("slate-200");
  expect(result.family).toBe("slate");
  expect(result.familyScale[0]?.tailwind).toBe("slate-50");
  expect(result.familyScale.at(-1)?.tailwind).toBe("slate-950");
  expect(result.darkModeComplement).toStrictEqual({
    hex: "1e293b",
    tailwind: "slate-800",
  });
  expect(result.contrast.blackAA).toBe(true);
  expect(result.contrast.whiteAA).toBe(false);
  expect(result.contrast.recommendedTextColors.length).toBeGreaterThan(0);
  expect(result.contrast.recommendedTextColors[0]?.tailwind).toBe("black");
  expect(result.contrast.recommendedTextColors.every((entry) => entry.aa)).toBe(
    true,
  );
});

test("returns normalized format breakdown for the input color", () => {
  const result = closestTailwindToColor("rgb(59, 130, 246)", "v3");

  expect(result.input.hex).toBe("#3B82F6");
  expect(result.input.rgb).toBe("rgb(59, 130, 246)");
  expect(result.input.hsl).toContain("hsl(");
  expect(result.input.oklch).toContain("oklch(");
});

test("suggests an arbitrary value when the match is too far off", () => {
  const result = closestTailwindToColor("#123c2d", "v4");

  expect(result.arbitrarySuggestion).toStrictEqual({
    className: "bg-[#123c2d]",
    hex: "#123c2d",
    threshold: 4,
  });
});

test("includes extra utility variants", () => {
  const result = closestTailwindToColor("#3b82f6", "v3");

  expect(result.variants).toMatchObject({
    background: "bg-blue-500",
    fill: "fill-blue-500",
    from: "from-blue-500",
    outline: "outline-blue-500",
    ring: "ring-blue-500",
    stroke: "stroke-blue-500",
    text: "text-blue-500",
    to: "to-blue-500",
    via: "via-blue-500",
  });
});

test("constrains matching to a single family", () => {
  const unconstrained = closestTailwindToColor("#3b82f6", "v3");
  const constrained = closestTailwindToColor("#3b82f6", "v3", {
    family: "red",
  });

  expect(unconstrained.family).toBe("blue");
  expect(constrained.family).toBe("red");
  expect(constrained.tailwind).toMatch(/^red-/);
});

test("matches against a custom palette", () => {
  const result = closestTailwindToColor("#3b82f6", "v4", {
    customPalette: {
      brand: {
        500: "#3b82f6",
      },
    },
  });

  expect(result.tailwind).toBe("brand-500");
  expect(result.family).toBe("brand");
  expect(result.hex).toBe("3b82f6");
});

test.each([
  ["blue-500", "blue-500"],
  ["bg-slate-200", "slate-200"],
  ["text-red-500/40", "red-500/40"],
  ["dark:bg-emerald-700", "emerald-700"],
])("lookupTailwindToken(%s) -> %s", (token, expected) => {
  const result = lookupTailwindToken(token, "v3");

  expect(result?.tailwind).toBe(expected);
  expect(result?.input.hex).toMatch(/^#/);
});

test("resolveColorMatch accepts tokens and hex values", () => {
  expect(resolveColorMatch("blue-500", "v3")?.tailwind).toBe("blue-500");
  expect(resolveColorMatch("#3b82f6", "v3")?.tailwind).toBe("blue-500");
  expect(resolveColorMatch("not-a-color", "v3")).toBeUndefined();
});

test("parseCustomPalette accepts JSON, @theme, and name:hex lines", () => {
  expect(
    parseCustomPalette('{ "brand": { "500": "#3b82f6" }, "ink": "#111827" }'),
  ).toEqual({
    brand: { 500: "#3b82f6" },
    ink: "#111827",
  });

  expect(
    parseCustomPalette(
      "@theme { --color-brand: #3b82f6; --color-ink: #111827 }",
    ),
  ).toEqual({
    brand: "#3b82f6",
    ink: "#111827",
  });

  expect(parseCustomPalette("brand-500: #3b82f6\nink: #111827")).toEqual({
    brand: { 500: "#3b82f6" },
    ink: "#111827",
  });
});

test("parseBatchInputs splits lists and JSON arrays", () => {
  expect(parseBatchInputs("#3b82f6, red\n#111827")).toEqual([
    "#3b82f6",
    "red",
    "#111827",
  ]);
  expect(parseBatchInputs('["#3b82f6", "blue-500"]')).toEqual([
    "#3b82f6",
    "blue-500",
  ]);
});

test("parseVersionParam accepts v-prefixed and bare versions", () => {
  expect(parseVersionParam("v3")).toBe("v3");
  expect(parseVersionParam("4")).toBe("v4");
  expect(parseVersionParam("nope")).toBeUndefined();
});

test("buildBrandKit returns complementary, analogous, and neutral matches", () => {
  const kit = buildBrandKit("#3b82f6", "v3");

  expect(kit.source.match.tailwind).toBe("blue-500");
  expect(kit.complementary.hex).toMatch(/^#/);
  expect(kit.complementary.match.tailwind).toBeTruthy();
  expect(kit.analogous).toHaveLength(2);
  expect(kit.neutral.match.tailwind).toBeTruthy();
});
