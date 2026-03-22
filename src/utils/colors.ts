import colors from "tailwindcss/colors";
import { closest, diff, rgb_to_lab } from "color-diff";
import { formatHex, parse } from "culori";
import {
  tailwindV1,
  tailwindV2,
  tailwindV3,
  type TailwindPalette,
} from "./tailwind-palettes";

export type TailwindVersion = "v1" | "v2" | "v3" | "v4";

type Rgb = { R: number; G: number; B: number };
type RgbMap = Map<Rgb, string>;

export const hexToRgb: (hex: string) => Rgb = (hex) => {
  // https://github.com/sindresorhus/hex-rgb/blob/main/index.js
  const number = Number.parseInt(hex, 16);
  const red = number >> 16;
  const green = (number >> 8) & 255;
  const blue = number & 255;

  return { R: red, G: green, B: blue };
};

// ── Build an RGB→TailwindName map from a palette ────────────────────────
const buildMapFromPalette = (palette: TailwindPalette): RgbMap => {
  const out = new Map<Rgb, string>();

  for (const [name, value] of Object.entries(palette)) {
    if (typeof value === "string") {
      // e.g. black: "#000000", white: "#ffffff"
      const hex = formatHex(value)?.slice(1);
      if (hex) out.set(hexToRgb(hex), name);
    } else {
      for (const [shade, colorValue] of Object.entries(value)) {
        const hex = formatHex(colorValue)?.slice(1);
        if (hex) out.set(hexToRgb(hex), `${name}-${shade}`);
      }
    }
  }

  return out;
};

// ── Build map from the live v4 import (oklch values) ────────────────────
const buildMapFromV4 = (): RgbMap => {
  type DefaultColors = typeof colors;
  let importedColors = JSON.parse(JSON.stringify(colors));

  delete importedColors.inherit;
  delete importedColors.transparent;
  delete importedColors.current;
  delete importedColors.lightBlue;
  delete importedColors.warmGray;
  delete importedColors.trueGray;
  delete importedColors.coolGray;
  delete importedColors.blueGray;

  const out = new Map<Rgb, string>();

  out.set(hexToRgb("000000"), "black");
  delete importedColors.black;

  out.set(hexToRgb("ffffff"), "white");
  delete importedColors.white;

  type TailwindColorsToMap = Omit<
    DefaultColors,
    | "inherit"
    | "transparent"
    | "current"
    | "lightBlue"
    | "warmGray"
    | "trueGray"
    | "coolGray"
    | "trueGray"
    | "white"
    | "black"
  >;

  const colorsToMap: TailwindColorsToMap = importedColors;

  Object.keys(colorsToMap).forEach((color) => {
    const tailwindShadesForGivenColor = colorsToMap[color as "stone"] as
      | Record<string, string>
      | string;

    if (typeof tailwindShadesForGivenColor === "string") {
      const hex = formatHex(tailwindShadesForGivenColor)?.slice(1);
      if (hex) out.set(hexToRgb(hex), color);
      return;
    }

    Object.keys(tailwindShadesForGivenColor).forEach((shade) => {
      const val = tailwindShadesForGivenColor[shade];
      const hex =
        typeof val === "string" ? formatHex(val)?.slice(1) : undefined;
      if (hex) {
        out.set(hexToRgb(hex), `${color}-${shade}`);
      }
    });
  });

  return out;
};

// ── Cached maps per version ─────────────────────────────────────────────
const mapCache = new Map<TailwindVersion, { map: RgbMap; keys: Rgb[] }>();

const getVersionData = (version: TailwindVersion) => {
  if (mapCache.has(version)) return mapCache.get(version)!;

  let map: RgbMap;
  switch (version) {
    case "v1":
      map = buildMapFromPalette(tailwindV1);
      break;
    case "v2":
      map = buildMapFromPalette(tailwindV2);
      break;
    case "v3":
      map = buildMapFromPalette(tailwindV3);
      break;
    case "v4":
      map = buildMapFromV4();
      break;
  }

  const data = { map, keys: [...map.keys()] };
  mapCache.set(version, data);
  return data;
};

// ── Helpers ─────────────────────────────────────────────────────────────
const componentToHex = (c: number) => {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
};

const rgbToHex = (rgb: Rgb) =>
  componentToHex(rgb.R) + componentToHex(rgb.G) + componentToHex(rgb.B);

// ── Main function ───────────────────────────────────────────────────────
export const closestTailwindToColor = (
  colorInput: string,
  version: TailwindVersion = "v4",
) => {
  const hex = formatHex(colorInput);
  if (!hex) {
    throw Error("invalid color");
  }

  // Extract alpha from the parsed color
  const parsed = parse(colorInput);
  const alpha =
    parsed && parsed.alpha !== undefined && parsed.alpha < 1
      ? parsed.alpha
      : undefined;

  const normalizedHex = hex.slice(1); // remove '#'
  const gotRgb = hexToRgb(normalizedHex);

  const { map: RgbToTailwindMap, keys: TailwindRgbColors } =
    getVersionData(version);

  const closestTailwindRgb: Rgb = closest(gotRgb, TailwindRgbColors);
  const closestTailwindDiff: number = diff(
    rgb_to_lab(gotRgb),
    rgb_to_lab(closestTailwindRgb),
  );

  const closestTailwindHex = rgbToHex(closestTailwindRgb);

  const closestTailwind = RgbToTailwindMap.get(closestTailwindRgb);
  if (closestTailwind === undefined) {
    throw Error("couldn't find closest tailwind");
  }

  // Append opacity suffix if alpha is present (e.g. blue-500/40)
  const opacityPercent =
    alpha !== undefined ? Math.round(alpha * 100) : undefined;
  const tailwindClass =
    opacityPercent !== undefined
      ? `${closestTailwind}/${opacityPercent}`
      : closestTailwind;

  return {
    tailwind: tailwindClass,
    hex: closestTailwindHex,
    diff: closestTailwindDiff,
    alpha,
  };
};

export const normalizeHex = (hex: string) => formatHex(hex)?.slice(1) || hex;
