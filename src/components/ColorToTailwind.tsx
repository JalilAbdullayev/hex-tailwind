import {
  useEffect,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { useStore } from "@nanostores/react";
import { formatHex } from "culori";
import { hexCodeInUrlStore } from "../hexCodeInUrlStore";
import { closestTailwindToColor, type TailwindVersion } from "../utils/colors";
import ClipboardIcon from "./ClipboardIcon";
import Copy from "./Copy";

const VERSIONS: TailwindVersion[] = ["v1", "v2", "v3", "v4"];
const HISTORY_KEY = "hex-tailwind-history";
const HISTORY_LIMIT = 6;

type HistoryItem = {
  hex: string;
  tailwind: string;
  version: TailwindVersion;
};

const ColorToTailwind = ({ url }: { url: string }) => {
  const [colorInput, setColorInput] = useState("3e3e66");
  const [version, setVersion] = useState<TailwindVersion>("v4");
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const $hexCodeInUrlStore = useStore(hexCodeInUrlStore);

  useEffect(() => {
    if ($hexCodeInUrlStore.length > 0) {
      setColorInput($hexCodeInUrlStore.toLowerCase());
    }
  }, [$hexCodeInUrlStore]);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem(HISTORY_KEY);
      if (!storedHistory) return;

      const parsedHistory = JSON.parse(storedHistory) as HistoryItem[];
      if (Array.isArray(parsedHistory)) {
        setHistory(parsedHistory.slice(0, HISTORY_LIMIT));
      }
    } catch (error) {
      console.error("Failed to load search history:", error);
    }
  }, []);

  const closestTailwind = isValidColor(colorInput)
    ? closestTailwindToColor(colorInput, version)
    : undefined;

  useEffect(() => {
    if (!closestTailwind) return;

    const nextItem: HistoryItem = {
      hex: closestTailwind.input.hex,
      tailwind: closestTailwind.tailwind,
      version,
    };

    setHistory((currentHistory) => {
      if (
        currentHistory[0]?.hex === nextItem.hex &&
        currentHistory[0]?.version === nextItem.version &&
        currentHistory[0]?.tailwind === nextItem.tailwind
      ) {
        return currentHistory;
      }

      const nextHistory = [
        nextItem,
        ...currentHistory.filter(
          (item) =>
            !(
              item.hex === nextItem.hex &&
              item.version === nextItem.version &&
              item.tailwind === nextItem.tailwind
            ),
        ),
      ].slice(0, HISTORY_LIMIT);

      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
      } catch (error) {
        console.error("Failed to persist search history:", error);
      }

      return nextHistory;
    });
  }, [closestTailwind?.input.hex, closestTailwind?.tailwind, version]);

  const handleColorInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    let nextInput = event.target.value.toLowerCase();

    if (nextInput.startsWith("#")) {
      nextInput = nextInput.slice(1);
    }

    setColorInput(nextInput);
  };

  const createCopyToClipboardFunction =
    (text: string): (() => Promise<void>) =>
    async () => {
      try {
        await navigator.clipboard.writeText(text);
      } catch (error) {
        console.error("Failed to copy text to clipboard:", error);
      }
    };

  const clearHistory = () => {
    setHistory([]);

    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (error) {
      console.error("Failed to clear search history:", error);
    }
  };

  const inputHex = formatHex(colorInput);
  const inputAlpha = closestTailwind?.alpha;
  const inputBgColor = inputHex
    ? inputAlpha !== undefined
      ? hexToRgba(inputHex, inputAlpha)
      : inputHex
    : "transparent";
  const matchBgColor = closestTailwind
    ? inputAlpha !== undefined
      ? hexToRgba(`#${closestTailwind.hex}`, inputAlpha)
      : `#${closestTailwind.hex}`
    : "transparent";
  const urlToCopy = `${url}?hex=${encodeURIComponent(colorInput)}`;

  return (
    <section
      data-nosnippet
      className="relative mb-4 w-full overflow-hidden rounded-4xl border border-indigo-100 bg-white p-6 shadow-xl shadow-indigo-100/40 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-100/60 md:p-10 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
    >
      <div className="pointer-events-none absolute inset-e-0 inset-bs-0 -me-16 -mt-16 size-64 rounded-full bg-indigo-100/70 blur-3xl dark:bg-indigo-900/20" />
      <div className="pointer-events-none absolute inset-s-0 inset-be-0 -ms-20 -mb-20 size-72 rounded-full bg-cyan-100/60 blur-3xl dark:bg-cyan-900/10" />

      <div className="relative z-10 space-y-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <Panel>
            <label
              htmlFor="colorcode"
              className="mb-3 block text-sm font-bold tracking-[0.24em] text-slate-400 uppercase"
            >
              Input Color
            </label>
            <input
              id="colorcode"
              type="text"
              value={colorInput}
              onChange={handleColorInputChange}
              placeholder="3B82F6 or rgb(59, 130, 246)"
              className="block w-full rounded-2xl border-2 border-slate-100 bg-slate-50/80 px-4 py-4 font-mono text-xl font-bold text-slate-800 uppercase shadow-sm transition-all duration-200 outline-none focus:border-indigo-400 focus:bg-white focus:shadow-lg focus:ring-4 focus:shadow-indigo-500/10 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100 dark:focus:border-indigo-500"
              aria-label="Enter a color code (HEX, RGB, HSL)"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-slate-400">
                Tailwind version
              </span>
              <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                {VERSIONS.map((v) => (
                  <button
                    key={v}
                    onClick={() => setVersion(v)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all duration-200 ${
                      version === v
                        ? "bg-indigo-600 text-white shadow-sm dark:bg-indigo-500"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    }`}
                    aria-pressed={version === v}
                  >
                    {v.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            {!closestTailwind && colorInput.length > 0 ? (
              <p className="mt-4 text-sm font-medium text-rose-500">
                Enter a valid HEX, RGB, HSL, or CSS color value.
              </p>
            ) : null}
          </Panel>

          <Panel>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold tracking-[0.24em] text-slate-400 uppercase">
                  Best Match
                </p>
                {closestTailwind ? (
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <CodePill>{closestTailwind.tailwind}</CodePill>
                      <IconCopy
                        onClick={createCopyToClipboardFunction(
                          closestTailwind.tailwind,
                        )}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <CodePill
                        muted
                      >{`#${closestTailwind.hex.toUpperCase()}`}</CodePill>
                      <IconCopy
                        onClick={createCopyToClipboardFunction(
                          `#${closestTailwind.hex.toUpperCase()}`,
                        )}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 font-mono text-3xl font-bold text-slate-300 dark:text-slate-700">
                    ...
                  </p>
                )}
              </div>

              <CopyButton
                label="Copy Share Link"
                onClick={createCopyToClipboardFunction(urlToCopy)}
              />
            </div>

            {closestTailwind ? (
              <div className="mt-5 flex flex-wrap gap-3 text-sm">
                <StatBadge
                  label="Delta E"
                  value={closestTailwind.diff.toFixed(2)}
                />
                <StatBadge
                  label="Visible"
                  value={closestTailwind.diff > 1 ? "Yes" : "No"}
                />
                <StatBadge
                  label="Best Text"
                  value={closestTailwind.contrast.recommendedText ?? "None"}
                />
              </div>
            ) : null}
          </Panel>
        </div>

        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold tracking-[0.24em] text-slate-400 uppercase">
              Input vs Match
            </p>
            {closestTailwind ? (
              <p className="font-mono text-sm text-slate-500 dark:text-slate-400">
                {closestTailwind.input.hex} {"->"} {closestTailwind.tailwind}
              </p>
            ) : null}
          </div>
          <div className="relative flex h-48 overflow-hidden rounded-3xl border border-slate-200/70 shadow-inner max-md:flex-col md:h-44 dark:border-slate-800">
            <div className="absolute inset-bs-1/2 left-1/2 z-10 -translate-1/2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-bold tracking-[0.24em] text-slate-500 uppercase shadow dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-400">
              VS
            </div>
            <SwatchHalf
              label="Input"
              value={closestTailwind?.input.hex ?? "Invalid"}
              backgroundColor={inputBgColor}
            />
            <SwatchHalf
              label="Tailwind"
              value={closestTailwind?.tailwind ?? "..."}
              backgroundColor={matchBgColor}
            />
          </div>
        </Panel>

        {closestTailwind ? (
          <>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
              <Panel>
                <p className="text-sm font-bold tracking-[0.24em] text-slate-400 uppercase">
                  Quick Copy Variants
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <CopyChip
                    value={closestTailwind.variants.background}
                    onCopy={createCopyToClipboardFunction(
                      closestTailwind.variants.background,
                    )}
                  />
                  <CopyChip
                    value={closestTailwind.variants.text}
                    onCopy={createCopyToClipboardFunction(
                      closestTailwind.variants.text,
                    )}
                  />
                  <CopyChip
                    value={closestTailwind.variants.border}
                    onCopy={createCopyToClipboardFunction(
                      closestTailwind.variants.border,
                    )}
                  />
                </div>

                {closestTailwind.arbitrarySuggestion ? (
                  <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                          Arbitrary value fallback suggested
                        </p>
                        <p className="mt-1 text-sm text-amber-700 dark:text-amber-300/80">
                          Delta E is {closestTailwind.diff.toFixed(2)}, which is
                          above the fallback threshold of{" "}
                          {closestTailwind.arbitrarySuggestion.threshold}.
                        </p>
                      </div>
                      <CopyChip
                        value={closestTailwind.arbitrarySuggestion.className}
                        onCopy={createCopyToClipboardFunction(
                          closestTailwind.arbitrarySuggestion.className,
                        )}
                        tone="amber"
                      />
                    </div>
                  </div>
                ) : null}
              </Panel>

              <Panel>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold tracking-[0.24em] text-slate-400 uppercase">
                      Dark Mode Pair
                    </p>
                    <p className="mt-2 font-mono text-lg font-bold text-slate-800 dark:text-slate-100">
                      {closestTailwind.darkModeComplement?.tailwind ?? "None"}
                    </p>
                  </div>
                  {closestTailwind.darkModeComplement ? (
                    <CopyButton
                      label={`dark:bg-${closestTailwind.darkModeComplement.tailwind}`}
                      onClick={createCopyToClipboardFunction(
                        `dark:bg-${closestTailwind.darkModeComplement.tailwind}`,
                      )}
                    />
                  ) : null}
                </div>

                {closestTailwind.darkModeComplement ? (
                  <div className="mt-4 flex items-center gap-4 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                    <ColorDot color={`#${closestTailwind.hex}`} />
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      maps to
                    </span>
                    <ColorDot
                      color={`#${closestTailwind.darkModeComplement.hex}`}
                    />
                  </div>
                ) : null}
              </Panel>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Panel>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-bold tracking-[0.24em] text-slate-400 uppercase">
                    Accessibility Contrast
                  </p>
                  <CodePill muted>{closestTailwind.rawTailwind}</CodePill>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <ContrastCard
                    ratio={closestTailwind.contrast.white}
                    textColor="white"
                    aa={closestTailwind.contrast.whiteAA}
                    aaa={closestTailwind.contrast.whiteAAA}
                    previewColor={`#${closestTailwind.hex}`}
                  />
                  <ContrastCard
                    ratio={closestTailwind.contrast.black}
                    textColor="black"
                    aa={closestTailwind.contrast.blackAA}
                    aaa={closestTailwind.contrast.blackAAA}
                    previewColor={`#${closestTailwind.hex}`}
                  />
                </div>
                <div className="mt-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-bold tracking-[0.24em] text-slate-400 uppercase">
                      Tailwind Text Suggestions
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      AA or better on this background
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {closestTailwind.contrast.recommendedTextColors
                      .slice(0, 12)
                      .map((textColor) => (
                        <Copy
                          key={textColor.tailwind}
                          onClick={createCopyToClipboardFunction(
                            `text-${textColor.tailwind}`,
                          )}
                        >
                          <span className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950">
                            <span
                              className="block size-6 rounded-full border border-white/70 shadow-sm"
                              style={{ backgroundColor: `#${textColor.hex}` }}
                            />
                            <span>
                              <span className="block truncate font-mono text-xs font-bold text-slate-800 dark:text-slate-100">
                                {textColor.tailwind}
                              </span>
                              <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                                {textColor.aaa ? "AAA" : "AA"} ·{" "}
                                {textColor.contrast.toFixed(2)}:1
                              </span>
                            </span>
                          </span>
                        </Copy>
                      ))}
                  </div>
                </div>
              </Panel>

              <Panel>
                <p className="text-sm font-bold tracking-[0.24em] text-slate-400 uppercase">
                  Input Format Breakdown
                </p>
                <div className="mt-4 space-y-3">
                  <FormatRow
                    label="HEX"
                    value={closestTailwind.input.hex}
                    onCopy={createCopyToClipboardFunction(
                      closestTailwind.input.hex,
                    )}
                  />
                  <FormatRow
                    label="RGB"
                    value={closestTailwind.input.rgb}
                    onCopy={createCopyToClipboardFunction(
                      closestTailwind.input.rgb,
                    )}
                  />
                  <FormatRow
                    label="HSL"
                    value={closestTailwind.input.hsl}
                    onCopy={createCopyToClipboardFunction(
                      closestTailwind.input.hsl,
                    )}
                  />
                  <FormatRow
                    label="OKLCH"
                    value={closestTailwind.input.oklch}
                    onCopy={createCopyToClipboardFunction(
                      closestTailwind.input.oklch,
                    )}
                  />
                </div>
              </Panel>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <Panel>
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-bold tracking-[0.24em] text-slate-400 uppercase">
                    Shade Family Preview
                  </p>
                  <CodePill muted>{closestTailwind.family}</CodePill>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {closestTailwind.familyScale.map((familyColor) => (
                    <button
                      key={familyColor.tailwind}
                      onClick={() => setColorInput(familyColor.hex)}
                      className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${
                        familyColor.isMatch
                          ? "border-indigo-300 bg-indigo-50 shadow-sm dark:border-indigo-700 dark:bg-indigo-950/40"
                          : "border-slate-200 bg-white/70 hover:-translate-y-0.5 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-slate-700"
                      }`}
                    >
                      <ColorDot color={`#${familyColor.hex}`} />
                      <div>
                        <p className="truncate font-mono text-sm font-bold text-slate-800 dark:text-slate-100">
                          {familyColor.tailwind}
                        </p>
                        <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                          #{familyColor.hex.toUpperCase()}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </Panel>

              <Panel>
                <p className="text-sm font-bold tracking-[0.24em] text-slate-400 uppercase">
                  Nearest 3 Matches
                </p>
                <div className="mt-4 space-y-3">
                  {closestTailwind.topMatches.map((match, index) => (
                    <div
                      key={`${match.tailwind}-${match.hex}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                          {index + 1}
                        </span>
                        <ColorDot color={`#${match.hex}`} />
                        <div>
                          <p className="truncate font-mono text-sm font-bold text-slate-800 dark:text-slate-100">
                            {match.tailwind}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Delta E {match.diff.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <IconCopy
                        onClick={createCopyToClipboardFunction(match.tailwind)}
                      />
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            <Panel>
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-bold tracking-[0.24em] text-slate-400 uppercase">
                  Recently Viewed
                </p>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-slate-400">
                    Stored in local browser storage
                  </p>
                  {history.length > 0 ? (
                    <button
                      onClick={clearHistory}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:border-rose-200 hover:text-rose-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-rose-900/50 dark:hover:text-rose-300"
                    >
                      Clear History
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                {history.length > 0 ? (
                  history.map((item) => (
                    <button
                      key={`${item.version}-${item.hex}-${item.tailwind}`}
                      onClick={() => {
                        setVersion(item.version);
                        setColorInput(item.hex.replace("#", ""));
                      }}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-left transition hover:-translate-y-0.5 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/50 dark:hover:border-slate-700"
                    >
                      <ColorDot color={item.hex} />
                      <div>
                        <p className="font-mono text-sm font-bold text-slate-800 dark:text-slate-100">
                          {item.tailwind}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {item.hex} · {item.version.toUpperCase()}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Your recent searches will appear here.
                  </p>
                )}
              </div>
            </Panel>
          </>
        ) : null}
      </div>
    </section>
  );
};

const Panel = ({ children }: { children: ReactNode }) => (
  <div className="rounded-[1.75rem] border border-slate-200/70 bg-white/80 p-5 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/40">
    {children}
  </div>
);

const CodePill = ({
  children,
  muted,
}: {
  children: ReactNode;
  muted?: boolean;
}) => (
  <span
    className={`rounded-xl border px-3 py-1.5 font-mono text-sm font-bold shadow-sm ${
      muted
        ? "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        : "border-indigo-100 bg-indigo-50 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300"
    }`}
  >
    {children}
  </span>
);

const CopyButton = ({
  label,
  onClick,
}: {
  label: string;
  onClick: () => Promise<void>;
}) => (
  <Copy onClick={onClick}>
    <span className="inline-flex items-center gap-2 rounded-xl border border-indigo-100 bg-white px-3 py-2 text-sm font-semibold text-indigo-600 shadow-sm transition hover:-translate-y-0.5 hover:text-indigo-800 dark:border-slate-800 dark:bg-slate-950 dark:text-indigo-400 dark:hover:text-indigo-300">
      <ClipboardIcon />
      {label}
    </span>
  </Copy>
);

const IconCopy = ({ onClick }: { onClick: () => Promise<void> }) => (
  <Copy onClick={onClick}>
    <span className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500 dark:hover:text-indigo-400">
      <ClipboardIcon />
    </span>
  </Copy>
);

const StatBadge = ({ label, value }: { label: string; value: string }) => (
  <span className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
    <strong className="me-2 text-slate-800 dark:text-slate-100">{label}</strong>
    {value}
  </span>
);

const SwatchHalf = ({
  backgroundColor,
  label,
  value,
}: {
  backgroundColor: string;
  label: string;
  value: string;
}) => (
  <div className="relative h-1/2 w-full transition-all duration-500 md:h-full md:w-1/2">
    <div className="absolute inset-0" style={checkerboardStyle} />
    <div
      className="absolute inset-0 transition-colors duration-500 ease-out"
      style={{ backgroundColor }}
    />
    <div className="absolute inset-be-3 left-3 rounded-2xl bg-white/90 px-3 py-2 shadow-sm backdrop-blur-sm dark:bg-slate-900/90">
      <p className="text-[11px] font-bold tracking-[0.24em] text-slate-400 uppercase">
        {label}
      </p>
      <p className="mt-1 font-mono text-sm font-bold text-slate-800 dark:text-slate-200">
        {value}
      </p>
    </div>
  </div>
);

const CopyChip = ({
  value,
  onCopy,
  tone = "slate",
}: {
  value: string;
  onCopy: () => Promise<void>;
  tone?: "amber" | "slate";
}) => (
  <Copy onClick={onCopy}>
    <span
      className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 font-mono text-sm font-bold shadow-sm transition hover:-translate-y-0.5 ${
        tone === "amber"
          ? "border-amber-200 bg-white text-amber-700 dark:border-amber-900/60 dark:bg-slate-950 dark:text-amber-300"
          : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
      }`}
    >
      <ClipboardIcon />
      {value}
    </span>
  </Copy>
);

const ContrastCard = ({
  aa,
  aaa,
  previewColor,
  ratio,
  textColor,
}: {
  aa: boolean;
  aaa: boolean;
  previewColor: string;
  ratio: number;
  textColor: "black" | "white";
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/50">
    <div
      className="flex h-20 items-center justify-center rounded-2xl font-semibold"
      style={{
        backgroundColor: previewColor,
        color: textColor,
      }}
    >
      {textColor} text preview
    </div>
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Contrast ratio
        </span>
        <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-100">
          {ratio.toFixed(2)}:1
        </span>
      </div>
      <div className="flex gap-2 text-xs font-semibold tracking-[0.18em] uppercase">
        <PassBadge passed={aa}>AA</PassBadge>
        <PassBadge passed={aaa}>AAA</PassBadge>
      </div>
    </div>
  </div>
);

const PassBadge = ({
  children,
  passed,
}: {
  children: ReactNode;
  passed: boolean;
}) => (
  <span
    className={`rounded-full px-2.5 py-1 ${
      passed
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
        : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
    }`}
  >
    {children} {passed ? "Pass" : "Fail"}
  </span>
);

const FormatRow = ({
  label,
  onCopy,
  value,
}: {
  label: string;
  onCopy: () => Promise<void>;
  value: string;
}) => (
  <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
    <div>
      <p className="text-[11px] font-bold tracking-[0.24em] text-slate-400 uppercase">
        {label}
      </p>
      <p className="truncate font-mono text-sm font-bold text-slate-800 dark:text-slate-100">
        {value}
      </p>
    </div>
    <IconCopy onClick={onCopy} />
  </div>
);

const ColorDot = ({ color }: { color: string }) => (
  <span
    className="block size-8 rounded-full border border-white/70 shadow-sm transition-transform duration-200 hover:scale-110"
    style={{ backgroundColor: color }}
  />
);

const isValidColor = (input: string) => formatHex(input) !== undefined;

const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const checkerboardStyle: CSSProperties = {
  backgroundImage: `
    linear-gradient(45deg, #e2e8f0 25%, transparent 25%),
    linear-gradient(-45deg, #e2e8f0 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e2e8f0 75%),
    linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)
  `,
  backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
  backgroundSize: "20px 20px",
};

export default ColorToTailwind;
