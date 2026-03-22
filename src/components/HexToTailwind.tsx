import { useEffect, useState, type ChangeEvent } from "react";
import { closestTailwindToHex } from "../utils/colors";
import Copy from "./Copy";
import ClipboardIcon from "./ClipboardIcon";

import { useStore } from "@nanostores/react";
import { hexCodeInUrlStore } from "../hexCodeInUrlStore";

const HexToTailwind = ({ url }: { url: string }) => {
  const [hexInput, setHexInput] = useState("3e3e66");

  const $hexCodeInUrlStore = useStore(hexCodeInUrlStore);

  useEffect(() => {
    if ($hexCodeInUrlStore.length > 0) {
      const newHexInput = $hexCodeInUrlStore.toLowerCase();
      setHexInput(newHexInput);
    }
  }, [$hexCodeInUrlStore]);

  const closestTailwind = isValidHex(hexInput)
    ? closestTailwindToHex(hexInput)
    : undefined;

  const handleHexInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    let newInput = event.target.value.toLowerCase();

    if (newInput.length === 0) {
      setHexInput(newInput);
      return;
    }

    newInput = newInput.replaceAll("#", "").slice(0, 6);

    setHexInput(newInput);
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

  const urlToCopy = `${url}?hex=${hexInput}`;

  return (
    <section className="group relative mb-4 w-full overflow-hidden rounded-4xl border border-indigo-50 bg-white p-6 shadow-xl shadow-indigo-100/50 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-100/60 md:p-12">
      <div className="pointer-events-none absolute top-0 right-0 -mt-20 -mr-20 h-64 w-64 rounded-full bg-indigo-50/80 opacity-70 blur-3xl transition-opacity group-hover:opacity-100"></div>
      <div className="pointer-events-none absolute bottom-0 left-0 -mb-20 -ml-20 h-64 w-64 rounded-full bg-purple-50/80 opacity-70 blur-3xl transition-opacity group-hover:opacity-100"></div>
      <div className="relative z-10 grid grid-cols-1 items-start gap-x-8 gap-y-8 md:grid-cols-2 lg:gap-x-16">
        <div className="space-y-4">
          <label
            className="block pl-1 text-sm font-bold tracking-widest text-slate-400 uppercase"
            htmlFor="hexcode"
          >
            Input HEX Code
          </label>
          <div className="group/input relative">
            <span className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-2xl font-bold text-slate-300 transition-colors group-focus-within/input:text-indigo-400">
              #
            </span>
            <input
              id="hexcode"
              type="text"
              className="block w-full rounded-2xl border-2 border-slate-100 bg-slate-50/50 py-4 pr-4 pl-11 font-mono text-2xl font-bold text-slate-800 uppercase shadow-sm transition-all placeholder:text-slate-300 hover:border-slate-200 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:outline-none"
              value={hexInput}
              onChange={handleHexInputChange}
              placeholder="3B82F6"
              maxLength={7}
            />
          </div>
        </div>
        <div className="space-y-4">
          <p className="block pl-1 text-sm font-bold tracking-widest text-slate-400 uppercase">
            Tailwind Match
          </p>
          <div className="flex min-h-16 flex-col justify-center px-1">
            {closestTailwind ? (
              <div className="space-y-3 font-mono text-lg font-bold text-slate-700">
                <div className="group/copy flex items-center gap-3">
                  <span className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-indigo-700 shadow-sm transition-transform hover:scale-[1.02]">
                    {closestTailwind.tailwind}
                  </span>
                  <div className="text-slate-400 opacity-0 transition-opacity duration-200 group-hover/copy:opacity-100 hover:text-indigo-600">
                    <Copy
                      onClick={createCopyToClipboardFunction(
                        closestTailwind.tailwind,
                      )}
                    >
                      <ClipboardIcon />
                    </Copy>
                  </div>
                </div>
                <div className="group/copy flex items-center gap-3">
                  <span className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-1.5 text-slate-600 shadow-sm transition-transform hover:scale-[1.02]">
                    #{closestTailwind.hex.toUpperCase()}
                  </span>
                  <div className="text-slate-400 opacity-0 transition-opacity duration-200 group-hover/copy:opacity-100 hover:text-indigo-600">
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
              <span className="py-2 font-mono text-3xl font-bold text-slate-300">
                ...
              </span>
            )}
          </div>
        </div>
        <div className="relative col-span-1 mt-2 mb-2 flex h-32 w-full overflow-hidden rounded-3xl border-2 border-slate-200/60 shadow-inner md:col-span-2 md:h-40">
          <div className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-100 bg-white/90 px-3 py-1 text-xs font-bold tracking-widest text-slate-400 uppercase shadow shadow-black/5 backdrop-blur">
            VS
          </div>
          <div
            className="h-full w-1/2 transition-colors duration-300"
            style={{ backgroundColor: "#" + hexInput }}
          ></div>
          <div
            className="h-full w-1/2 transition-colors duration-300"
            style={{
              backgroundColor: closestTailwind
                ? "#" + closestTailwind.hex
                : "transparent",
            }}
          ></div>
        </div>
        <div className="col-span-1 mt-2 flex flex-col items-start justify-between gap-5 rounded-2xl border border-slate-100 bg-slate-50/80 p-6 sm:flex-row sm:items-center md:col-span-2">
          <div className="flex items-center gap-3 text-base md:text-lg">
            <span className="font-medium text-slate-500">
              Difference visible?
            </span>{" "}
            {closestTailwind ? (
              <div className="rounded-lg border border-indigo-100 bg-indigo-100/50 px-3 py-1 text-indigo-800">
                {ColorDifferenceResult(closestTailwind.diff)}
              </div>
            ) : (
              <span className="text-slate-400">...</span>
            )}
          </div>
          <div className="flex cursor-pointer items-center gap-2 rounded-xl border border-indigo-50 bg-white px-5 py-3 text-sm font-medium tracking-wide text-indigo-600 shadow-sm transition-all hover:-translate-y-0.5 hover:text-indigo-800 hover:shadow active:translate-y-0">
            <Copy onClick={createCopyToClipboardFunction(urlToCopy)}>
              <div className="flex items-center gap-2">
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

const isValidHex: (input: string) => boolean = (input) => {
  let regex = new RegExp(/^([a-f0-9]{6}|[a-f0-9]{3})$/);
  return regex.test(input);
};

const ColorDifferenceResult = (diff: number) => (
  <span className="font-bold">{diff > 1 ? "Yes" : "No"}</span>
);

export default HexToTailwind;
