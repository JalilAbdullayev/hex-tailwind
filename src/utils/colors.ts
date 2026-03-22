import colors from "tailwindcss/colors";
import { closest, diff, rgb_to_lab } from "color-diff";
import { formatHex } from "culori";

type DefaultColors = typeof colors;
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

const rgbToTailwindMap: (colors: DefaultColors) => RgbMap = (colors) => {
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

const RgbToTailwindMap = rgbToTailwindMap(colors);
const TailwindRgbColors = [...RgbToTailwindMap.keys()];

const componentToHex = (c: number) => {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
};

const rgbToHex = (rgb: Rgb) =>
  componentToHex(rgb.R) + componentToHex(rgb.G) + componentToHex(rgb.B);

export const closestTailwindToColor = (colorInput: string) => {
  const hex = formatHex(colorInput);
  if (!hex) {
    throw Error("invalid color");
  }

  const normalizedHex = hex.slice(1); // remove '#'
  const gotRgb = hexToRgb(normalizedHex);

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

  return {
    tailwind: closestTailwind,
    hex: closestTailwindHex,
    diff: closestTailwindDiff,
  };
};

export const normalizeHex = (hex: string) => formatHex(hex)?.slice(1) || hex;
