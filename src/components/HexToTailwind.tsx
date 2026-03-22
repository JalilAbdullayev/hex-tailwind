import { useEffect, useState, type ChangeEvent } from "react";
import { closestTailwindToColor, type TailwindVersion } from "../utils/colors";
import Copy from "./Copy";
import ClipboardIcon from "./ClipboardIcon";
import { useStore } from "@nanostores/react";
import { hexCodeInUrlStore } from "../hexCodeInUrlStore";
import { formatHex } from "culori";

const VERSIONS: TailwindVersion[] = ["v1", "v2", "v3", "v4"];

const HexToTailwind = ({ url }: { url: string }) => {
  const [colorInput, setColorInput] = useState("3e3e66");
  const [version, setVersion] = useState<TailwindVersion>("v4");

  const $hexCodeInUrlStore = useStore(hexCodeInUrlStore);

  useEffect(() => {
    if ($hexCodeInUrlStore.length > 0) {
      const newColorInput = $hexCodeInUrlStore.toLowerCase();
      setColorInput(newColorInput);
    }
  }, [$hexCodeInUrlStore]);

  const closestTailwind = isValidColor(colorInput)
    ? closestTailwindToColor(colorInput, version)
    : undefined;

  const handleColorInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    let newInput = event.target.value.toLowerCase();

    if (newInput.length === 0) {
      setColorInput(newInput);
      return;
    }

    if (newInput.startsWith("#")) {
      newInput = newInput.slice(1);
    }

    setColorInput(newInput);
  };

  const createCopyToClipboardFunction =
    (text: string): (() => Promise<void>) =>
    async () => {
      try {
        await navigator.clipboard.writeText(text);
      } catch (err) {
        console.error("Failed to copy text to clipboard:", err);
      }
    };

  const urlToCopy = `${url}?hex=${encodeURIComponent(colorInput)}`;

  // Compute alpha-aware background colors for the preview swatches
  const inputHex = formatHex(colorInput);
  const inputAlpha = closestTailwind?.alpha;
  const inputBgColor = inputHex
    ? inputAlpha !== undefined
      ? hexToRgba(inputHex, inputAlpha)
      : inputHex
    : "transparent";

  const matchBgColor = closestTailwind
    ? inputAlpha !== undefined
      ? hexToRgba("#" + closestTailwind.hex, inputAlpha)
      : "#" + closestTailwind.hex
    : "transparent";

  return (
    <section
      data-nosnippet
      className="relative w-full p-6 mb-4 overflow-hidden transition-all duration-300 bg-white border shadow-xl group rounded-4xl border-indigo-50 shadow-indigo-100/50 hover:shadow-2xl hover:shadow-indigo-100/60 md:p-12 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
    >
      <div className="absolute top-0 right-0 w-64 h-64 -mt-20 -mr-20 transition-opacity rounded-full pointer-events-none bg-indigo-50/80 opacity-70 blur-3xl group-hover:opacity-100 dark:bg-indigo-900/20"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 -mb-20 -ml-20 transition-opacity rounded-full pointer-events-none bg-purple-50/80 opacity-70 blur-3xl group-hover:opacity-100 dark:bg-purple-900/20"></div>
      <div className="relative z-10 grid items-start grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-2 lg:gap-x-16">
        <div className="space-y-4">
          <label
            className="block pl-1 text-sm font-bold tracking-widest uppercase text-slate-400"
            htmlFor="colorcode"
          >
            Input Color (HEX, RGB, HSL...)
          </label>
          <div className="relative group/input">
            <input
              id="colorcode"
              type="text"
              className="block w-full px-4 py-4 font-mono text-2xl font-bold uppercase transition-all border-2 shadow-sm rounded-2xl border-slate-100 bg-slate-50/50 text-slate-800 placeholder:text-slate-300 hover:border-slate-200 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:outline-none dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100 dark:placeholder:text-slate-700 dark:hover:border-slate-700 dark:focus:border-indigo-500 dark:focus:bg-slate-950"
              value={colorInput}
              onChange={handleColorInputChange}
              placeholder="3B82F6 or rgb(59, 130, 246)"
            />
          </div>
        </div>
        <div className="space-y-4">
          <p className="block pl-1 text-sm font-bold tracking-widest uppercase text-slate-400">
            Tailwind Match
          </p>
          <div className="flex flex-col justify-center px-1 min-h-16">
            {closestTailwind ? (
              <div className="space-y-3 font-mono text-lg font-bold text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-3 group/copy">
                  <span className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-indigo-700 shadow-sm transition-transform hover:scale-[1.02] dark:border-indigo-900/50 dark:bg-indigo-900/30 dark:text-indigo-300">
                    {closestTailwind.tailwind}
                  </span>
                  <div className="transition-opacity duration-200 opacity-0 text-slate-400 group-hover/copy:opacity-100 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400">
                    <Copy
                      onClick={createCopyToClipboardFunction(
                        closestTailwind.tailwind,
                      )}
                    >
                      <ClipboardIcon />
                    </Copy>
                  </div>
                </div>
                <div className="flex items-center gap-3 group/copy">
                  <span className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-1.5 text-slate-600 shadow-sm transition-transform hover:scale-[1.02] dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                    #{closestTailwind.hex.toUpperCase()}
                  </span>
                  <div className="transition-opacity duration-200 opacity-0 text-slate-400 group-hover/copy:opacity-100 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400">
                    <Copy
                      onClick={createCopyToClipboardFunction(
                        "#" + closestTailwind.hex.toUpperCase(),
                      )}
                    >
                      <ClipboardIcon />
                    </Copy>
                  </div>
                </div>
              </div>
            ) : (
              <span className="py-2 font-mono text-3xl font-bold text-slate-300 dark:text-slate-800">
                ...
              </span>
            )}
          </div>
        </div>
        {/* Color comparison panel with checkerboard for contrast */}
        <div className="relative flex w-full h-32 col-span-1 mt-2 mb-2 overflow-hidden border-2 shadow-inner rounded-3xl border-slate-200/60 md:col-span-2 md:h-40 dark:border-slate-800">
          <div className="absolute z-10 px-3 py-1 text-xs font-bold tracking-widest uppercase -translate-x-1/2 -translate-y-1/2 border rounded-full shadow top-1/2 left-1/2 border-slate-100 bg-white/90 text-slate-400 shadow-black/5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-500">
            VS
          </div>
          {/* Left swatch: input color */}
          <div className="relative w-1/2 h-full">
            <div
              className="absolute inset-0"
              style={{ ...checkerboardStyle }}
            ></div>
            <div
              className="absolute inset-0 transition-colors duration-300 border-r border-slate-200/40 dark:border-slate-800/40"
              style={{ backgroundColor: inputBgColor }}
            ></div>
          </div>
          {/* Right swatch: tailwind match */}
          <div className="relative w-1/2 h-full">
            <div
              className="absolute inset-0"
              style={{ ...checkerboardStyle }}
            ></div>
            <div
              className="absolute inset-0 transition-colors duration-300"
              style={{ backgroundColor: matchBgColor }}
            ></div>
          </div>
        </div>
        <div className="flex flex-col items-start justify-between col-span-1 gap-5 p-6 mt-2 border rounded-2xl border-slate-100 bg-slate-50/80 sm:flex-row sm:items-center md:col-span-2 dark:border-slate-800 dark:bg-slate-950/50">
          <div className="flex flex-wrap items-center gap-3 text-base md:text-lg">
            <span className="font-medium text-slate-500 dark:text-slate-400">
              Difference visible?
            </span>{" "}
            {closestTailwind ? (
              <div className="px-3 py-1 text-indigo-800 border border-indigo-100 rounded-lg bg-indigo-100/50 dark:border-indigo-900/50 dark:bg-indigo-900/30 dark:text-indigo-300">
                {ColorDifferenceResult(closestTailwind.diff)}
              </div>
            ) : (
              <span className="text-slate-400 dark:text-slate-700">...</span>
            )}
            {/* Tailwind version selector */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm font-medium text-slate-400 dark:text-slate-600">
                Tailwind:
              </span>
              <div className="inline-flex overflow-hidden bg-white border shadow-sm rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-900">
                {VERSIONS.map((v) => (
                  <button
                    key={v}
                    onClick={() => setVersion(v)}
                    className={`px-3 py-1.5 text-sm font-semibold transition-all ${
                      version === v
                        ? "bg-indigo-600 text-white shadow-sm dark:bg-indigo-500"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    {v.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="relative flex cursor-pointer items-center gap-2 rounded-xl border border-indigo-50 bg-white px-5 py-3 text-sm font-medium tracking-wide text-indigo-600 shadow-sm transition-all hover:-translate-y-0.5 hover:text-indigo-800 hover:shadow active:translate-y-0 dark:border-slate-800 dark:bg-slate-900 dark:text-indigo-400 dark:hover:text-indigo-300 dark:hover:shadow-black/20">
            <Copy onClick={createCopyToClipboardFunction(urlToCopy)}>
              <div className="flex items-center gap-2 before:absolute before:inset-0">
                <ClipboardIcon />
                <span>Copy Share Link</span>
              </div>
            </Copy>
          </div>
        </div>
      </div>
    </section>
  );
};

const isValidColor = (input: string) => formatHex(input) !== undefined;

const ColorDifferenceResult = (diff: number) => (
  <span className="font-bold">{diff > 1 ? "Yes" : "No"}</span>
);

/** Convert a hex color + alpha (0-1) to an rgba() string */
const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/** CSS checkerboard pattern for showing transparency */
const checkerboardStyle: React.CSSProperties = {
  backgroundImage: `
    linear-gradient(45deg, #e2e8f0 25%, transparent 25%),
    linear-gradient(-45deg, #e2e8f0 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e2e8f0 75%),
    linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)
  `,
  backgroundSize: "20px 20px",
  backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
};

export default HexToTailwind;
