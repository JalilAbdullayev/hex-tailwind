import colors from "tailwindcss/colors";
import { closest, diff, rgb_to_lab } from "color-diff";
import { converter, formatHex, formatHex8, parse, wcagContrast } from "culori";
import {
  tailwindV1,
  tailwindV2,
  tailwindV3,
  type TailwindPalette,
} from "./tailwind-palettes";

export type TailwindVersion = "v1" | "v2" | "v3" | "v4";

type Rgb = { R: number; G: number; B: number };
type Shade = string | null;

type TailwindColorEntry = {
  family: string;
  hex: string;
  name: string;
  rgb: Rgb;
  shade: Shade;
};

type RgbMap = Map<Rgb, TailwindColorEntry>;

type VersionData = {
  entries: TailwindColorEntry[];
  families: Map<string, TailwindColorEntry[]>;
  keys: Rgb[];
  map: RgbMap;
};

const rgbConverter = converter("rgb");
const hslConverter = converter("hsl");
const oklchConverter = converter("oklch");

const AA_CONTRAST = 4.5;
const AAA_CONTRAST = 7;
const ARBITRARY_FALLBACK_THRESHOLD = 4;

export const hexToRgb: (hex: string) => Rgb = (hex) => {
  // https://github.com/sindresorhus/hex-rgb/blob/main/index.js
  const number = Number.parseInt(hex, 16);
  const red = number >> 16;
  const green = (number >> 8) & 255;
  const blue = number & 255;

  return { R: red, G: green, B: blue };
};

const createEntry = (
  family: string,
  shade: Shade,
  value: string,
): TailwindColorEntry | undefined => {
  const hex = formatHex(value)?.slice(1);
  if (!hex) return undefined;

  return {
    family,
    hex,
    name: shade ? `${family}-${shade}` : family,
    rgb: hexToRgb(hex),
    shade,
  };
};

// ── Build an RGB→TailwindName map from a palette ────────────────────────
const buildMapFromPalette = (
  palette: TailwindPalette,
): TailwindColorEntry[] => {
  const out: TailwindColorEntry[] = [];

  for (const [name, value] of Object.entries(palette)) {
    if (typeof value === "string") {
      const entry = createEntry(name, null, value);
      if (entry) out.push(entry);
    } else {
      for (const [shade, colorValue] of Object.entries(value)) {
        const entry = createEntry(name, shade, colorValue);
        if (entry) out.push(entry);
      }
    }
  }

  return out;
};

// ── Build map from the live v4 import (oklch values) ────────────────────
const buildMapFromV4 = (): TailwindColorEntry[] => {
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

  const out: TailwindColorEntry[] = [];

  const blackEntry = createEntry("black", null, "#000000");
  if (blackEntry) out.push(blackEntry);
  delete importedColors.black;

  const whiteEntry = createEntry("white", null, "#ffffff");
  if (whiteEntry) out.push(whiteEntry);
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
      const entry = createEntry(color, null, tailwindShadesForGivenColor);
      if (entry) out.push(entry);
      return;
    }

    Object.keys(tailwindShadesForGivenColor).forEach((shade) => {
      const val = tailwindShadesForGivenColor[shade];
      if (typeof val !== "string") return;

      const entry = createEntry(color, shade, val);
      if (entry) out.push(entry);
    });
  });

  return out;
};

// ── Cached maps per version ─────────────────────────────────────────────
const mapCache = new Map<TailwindVersion, VersionData>();

const sortFamilyEntries = (entries: TailwindColorEntry[]) =>
  [...entries].sort((a, b) => {
    if (a.shade === null && b.shade === null) return 0;
    if (a.shade === null) return -1;
    if (b.shade === null) return 1;
    return Number(a.shade) - Number(b.shade);
  });

const createVersionData = (entries: TailwindColorEntry[]): VersionData => {
  const map = new Map<Rgb, TailwindColorEntry>();
  const families = new Map<string, TailwindColorEntry[]>();

  for (const entry of entries) {
    map.set(entry.rgb, entry);

    const familyEntries = families.get(entry.family) ?? [];
    familyEntries.push(entry);
    families.set(entry.family, familyEntries);
  }

  for (const [family, familyEntries] of families.entries()) {
    families.set(family, sortFamilyEntries(familyEntries));
  }

  return {
    entries,
    families,
    keys: entries.map((entry) => entry.rgb),
    map,
  };
};

const getVersionData = (version: TailwindVersion) => {
  if (mapCache.has(version)) return mapCache.get(version)!;

  let entries: TailwindColorEntry[];
  switch (version) {
    case "v1":
      entries = buildMapFromPalette(tailwindV1);
      break;
    case "v2":
      entries = buildMapFromPalette(tailwindV2);
      break;
    case "v3":
      entries = buildMapFromPalette(tailwindV3);
      break;
    case "v4":
      entries = buildMapFromV4();
      break;
  }

  const data = createVersionData(entries);
  mapCache.set(version, data);
  return data;
};

const formatNumber = (value: number, digits = 3) =>
  Number(value.toFixed(digits)).toString();

const getInputFormats = (colorInput: string) => {
  const parsed = parse(colorInput);
  const hex = formatHex(colorInput);
  const hex8 = formatHex8(colorInput);

  if (!parsed || !hex || !hex8) {
    throw Error("invalid color");
  }

  const rgb = rgbConverter(parsed);
  const hsl = hslConverter(parsed);
  const oklch = oklchConverter(parsed);

  if (!rgb || !hsl || !oklch) {
    throw Error("couldn't convert color");
  }

  return {
    alpha:
      parsed.alpha !== undefined && parsed.alpha < 1 ? parsed.alpha : undefined,
    hex: hex.slice(1),
    rgb: `rgb(${Math.round(rgb.r * 255)}, ${Math.round(rgb.g * 255)}, ${Math.round(
      rgb.b * 255,
    )}${parsed.alpha !== undefined && parsed.alpha < 1 ? ` / ${formatNumber(parsed.alpha, 2)}` : ""})`,
    hsl: `hsl(${formatNumber(hsl.h ?? 0, 1)} ${formatNumber(hsl.s * 100, 1)}% ${formatNumber(hsl.l * 100, 1)}%${parsed.alpha !== undefined && parsed.alpha < 1 ? ` / ${formatNumber(parsed.alpha, 2)}` : ""})`,
    oklch: `oklch(${formatNumber(oklch.l)} ${formatNumber(oklch.c)} ${formatNumber(
      oklch.h ?? 0,
      1,
    )}${parsed.alpha !== undefined && parsed.alpha < 1 ? ` / ${formatNumber(parsed.alpha, 2)}` : ""})`,
    arbitraryHex:
      parsed.alpha !== undefined && parsed.alpha < 1
        ? hex8.toLowerCase()
        : hex.toLowerCase(),
  };
};

const withOpacitySuffix = (tailwind: string, alpha?: number) => {
  if (alpha === undefined) return tailwind;

  const opacityPercent = Math.round(alpha * 100);
  return `${tailwind}/${opacityPercent}`;
};

const getContrastReport = (hex: string) => {
  const solidHex = `#${hex}`;
  const white = wcagContrast(solidHex, "#ffffff");
  const black = wcagContrast(solidHex, "#000000");

  return {
    black,
    white,
  };
};

const getRecommendedTextColors = (
  backgroundHex: string,
  entries: TailwindColorEntry[],
) => {
  const solidHex = `#${backgroundHex}`;

  return [...entries]
    .map((entry) => {
      const contrast = wcagContrast(solidHex, `#${entry.hex}`);

      return {
        aaa: contrast >= AAA_CONTRAST,
        aa: contrast >= AA_CONTRAST,
        contrast,
        hex: entry.hex,
        tailwind: entry.name,
      };
    })
    .filter((entry) => entry.aa)
    .sort((a, b) => {
      if (b.contrast !== a.contrast) return b.contrast - a.contrast;
      return a.tailwind.localeCompare(b.tailwind);
    });
};

const getDarkModeComplement = (
  entry: TailwindColorEntry,
  familyScale: TailwindColorEntry[],
) => {
  if (entry.family === "white") {
    return { hex: "000000", tailwind: "black" };
  }

  if (entry.family === "black") {
    return { hex: "ffffff", tailwind: "white" };
  }

  if (familyScale.length <= 1) return undefined;

  const currentIndex = familyScale.findIndex(
    (familyEntry) => familyEntry.name === entry.name,
  );

  if (currentIndex === -1) return undefined;

  const complement = familyScale[familyScale.length - 1 - currentIndex];
  if (!complement) return undefined;

  return {
    hex: complement.hex,
    tailwind: complement.name,
  };
};

const createTopMatches = (
  gotRgb: Rgb,
  entries: TailwindColorEntry[],
  alpha?: number,
) =>
  [...entries]
    .map((entry) => ({
      diff: diff(rgb_to_lab(gotRgb), rgb_to_lab(entry.rgb)),
      hex: entry.hex,
      tailwind: withOpacitySuffix(entry.name, alpha),
    }))
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 3);

// ── Main function ───────────────────────────────────────────────────────
export const closestTailwindToColor = (
  colorInput: string,
  version: TailwindVersion = "v4",
) => {
  const inputFormats = getInputFormats(colorInput);
  const gotRgb = hexToRgb(inputFormats.hex);
  const {
    entries,
    families,
    map: rgbToTailwindMap,
    keys: tailwindRgbColors,
  } = getVersionData(version);

  const closestTailwindRgb: Rgb = closest(gotRgb, tailwindRgbColors);
  const closestTailwindDiff: number = diff(
    rgb_to_lab(gotRgb),
    rgb_to_lab(closestTailwindRgb),
  );

  const closestTailwind = rgbToTailwindMap.get(closestTailwindRgb);
  if (closestTailwind === undefined) {
    throw Error("couldn't find closest tailwind");
  }

  const familyScale = families.get(closestTailwind.family) ?? [closestTailwind];
  const contrast = getContrastReport(closestTailwind.hex);
  const recommendedTextColors = getRecommendedTextColors(
    closestTailwind.hex,
    entries,
  );
  const darkModeComplement = getDarkModeComplement(
    closestTailwind,
    familyScale,
  );
  const tailwindClass = withOpacitySuffix(
    closestTailwind.name,
    inputFormats.alpha,
  );
  const arbitrarySuggestion =
    closestTailwindDiff >= ARBITRARY_FALLBACK_THRESHOLD
      ? {
          className: `bg-[${inputFormats.arbitraryHex}]`,
          hex: inputFormats.arbitraryHex,
          threshold: ARBITRARY_FALLBACK_THRESHOLD,
        }
      : undefined;

  return {
    alpha: inputFormats.alpha,
    arbitrarySuggestion,
    contrast: {
      black: contrast.black,
      blackAA: contrast.black >= AA_CONTRAST,
      blackAAA: contrast.black >= AAA_CONTRAST,
      recommendedText: recommendedTextColors[0]?.tailwind,
      recommendedTextColors,
      white: contrast.white,
      whiteAA: contrast.white >= AA_CONTRAST,
      whiteAAA: contrast.white >= AAA_CONTRAST,
    },
    darkModeComplement,
    tailwind: tailwindClass,
    diff: closestTailwindDiff,
    family: closestTailwind.family,
    familyScale: familyScale.map((entry) => ({
      hex: entry.hex,
      isMatch: entry.name === closestTailwind.name,
      tailwind: entry.name,
    })),
    hex: closestTailwind.hex,
    input: {
      hex: `#${inputFormats.hex.toUpperCase()}`,
      hsl: inputFormats.hsl,
      oklch: inputFormats.oklch,
      rgb: inputFormats.rgb,
    },
    rawTailwind: closestTailwind.name,
    shade: closestTailwind.shade,
    topMatches: createTopMatches(gotRgb, entries, inputFormats.alpha),
    variants: {
      background: `bg-${tailwindClass}`,
      border: `border-${tailwindClass}`,
      text: `text-${tailwindClass}`,
    },
  };
};

export const normalizeHex = (hex: string) => formatHex(hex)?.slice(1) || hex;
