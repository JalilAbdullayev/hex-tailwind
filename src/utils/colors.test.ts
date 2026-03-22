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

test.each([
  ["000000", { tailwind: "black", hex: "000000", truncatedDiff: 0 }],
  ["ffffff", { tailwind: "white", hex: "ffffff", truncatedDiff: 0 }],
  ["93c5fd", { tailwind: "blue-300", hex: "8ec5ff", truncatedDiff: 0 }],
  ["701a75", { tailwind: "fuchsia-900", hex: "721378", truncatedDiff: 1 }],
  ["9101ec", { tailwind: "purple-600", hex: "9810fa", truncatedDiff: 2 }],
  ["123c2d", { tailwind: "emerald-950", hex: "002c22", truncatedDiff: 5 }],
  ["rgb(0, 0, 0)", { tailwind: "black", hex: "000000", truncatedDiff: 0 }],
  ["hsl(0, 0%, 100%)", { tailwind: "white", hex: "ffffff", truncatedDiff: 0 }],
])("closestTailwindToColor(%s) -> %j", (input, expected) => {
  const closestTailwind = closestTailwindToColor(input);

  expect(closestTailwind.tailwind).toBe(expected.tailwind);
  expect(closestTailwind.hex).toBe(expected.hex);
  expect(Math.trunc(closestTailwind.diff)).toBe(expected.truncatedDiff);
});
