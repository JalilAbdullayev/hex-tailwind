import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useStore } from "@nanostores/react";
import { formatHex } from "culori";
import { hexCodeInUrlStore } from "../hexCodeInUrlStore";
import {
  buildBrandKit,
  getPaletteFamilies,
  parseBatchInputs,
  parseCustomPalette,
  resolveColorMatch,
  type ColorMatch,
  type MatchOptions,
  type TailwindVersion,
} from "../utils/colors";
import { announceCopy } from "../copyToastStore";
import ClipboardIcon from "./ClipboardIcon";
import Copy, { CopyToast } from "./Copy";

const VERSIONS: TailwindVersion[] = ["v1", "v2", "v3", "v4"];
const HISTORY_KEY = "hex-tailwind-history";
const HISTORY_LIMIT = 6;
const PRIMARY_VARIANTS = ["background", "text", "border"] as const;
const MORE_VARIANTS = [
  "ring",
  "fill",
  "stroke",
  "outline",
  "from",
  "via",
  "to",
] as const;
const MORE_TOOL_TABS = ["brand", "palette", "batch"] as const;

type HistoryItem = {
  hex: string;
  tailwind: string;
  version: TailwindVersion;
};

const ColorToTailwind = ({ url }: { url: string }) => {
  const [colorInput, setColorInput] = useState("3e3e66");
  const [version, setVersion] = useState<TailwindVersion>("v4");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [familyFilter, setFamilyFilter] = useState("");
  const [useCustomPalette, setUseCustomPalette] = useState(false);
  const [customPaletteText, setCustomPaletteText] = useState("");
  const [batchText, setBatchText] = useState("");
  const [hasSampleImage, setHasSampleImage] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [showMoreUtilities, setShowMoreUtilities] = useState(false);
  const [moreToolTab, setMoreToolTab] =
    useState<(typeof MORE_TOOL_TABS)[number]>("brand");
  const [showStickyMatch, setShowStickyMatch] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const matchPanelRef = useRef<HTMLDivElement>(null);
  const sampleButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const $hexCodeInUrlStore = useStore(hexCodeInUrlStore);
  const customPalette = useCustomPalette
    ? parseCustomPalette(customPaletteText)
    : undefined;
  const matchOptions: MatchOptions = {
    ...(customPalette ? { customPalette } : {}),
    ...(familyFilter ? { family: familyFilter } : {}),
  };
  const families = getPaletteFamilies(version, customPalette);
  const closestTailwind = resolveColorMatch(colorInput, version, matchOptions);

  useEffect(() => {
    if (!imageModalOpen) return;

    closeButtonRef.current?.focus();

    const handleDocumentPaste = (event: globalThis.ClipboardEvent) => {
      const file = [...(event.clipboardData?.items ?? [])]
        .find((item) => item.type.startsWith("image/"))
        ?.getAsFile();
      if (!file) return;
      event.preventDefault();
      loadImageFile(file);
    };

    const handleModalKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeImageModal();
        return;
      }

      if (event.key !== "Tab" || !modalRef.current) return;

      const focusable = [
        ...modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, canvas, [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((element) => !element.hasAttribute("disabled"));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("paste", handleDocumentPaste);
    document.addEventListener("keydown", handleModalKey);
    return () => {
      document.removeEventListener("paste", handleDocumentPaste);
      document.removeEventListener("keydown", handleModalKey);
    };
  }, [imageModalOpen]);

  useEffect(() => {
    const panel = matchPanelRef.current;
    if (!panel || !closestTailwind) {
      setShowStickyMatch(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyMatch(!entry?.isIntersecting);
      },
      { threshold: 0 },
    );
    observer.observe(panel);
    return () => observer.disconnect();
  }, [closestTailwind]);

  useEffect(() => {
    if ($hexCodeInUrlStore.color.length > 0) {
      setColorInput(normalizeColorInput($hexCodeInUrlStore.color));
    }
    if ($hexCodeInUrlStore.version) {
      setVersion($hexCodeInUrlStore.version);
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

  useEffect(() => {
    if (familyFilter && !families.includes(familyFilter)) {
      setFamilyFilter("");
    }
  }, [families, familyFilter]);

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
    setColorInput(normalizeColorInput(event.target.value));
  };

  const handleColorInputCopy = (event: ClipboardEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const selectedLength =
      (input.selectionEnd ?? 0) - (input.selectionStart ?? 0);
    const hasPartialSelection =
      selectedLength > 0 && selectedLength < input.value.length;
    if (hasPartialSelection || !closestTailwind) return;

    event.preventDefault();
    void navigator.clipboard.writeText(closestTailwind.tailwind);
    announceCopy(closestTailwind.tailwind);
  };

  const closeImageModal = () => {
    setImageModalOpen(false);
    sampleButtonRef.current?.focus();
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

  const loadImageFile = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;

    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        URL.revokeObjectURL(objectUrl);
        return;
      }

      const maxWidth = 720;
      const scale = Math.min(1, maxWidth / image.width);
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      context?.drawImage(image, 0, 0, canvas.width, canvas.height);
      setHasSampleImage(true);
      URL.revokeObjectURL(objectUrl);
    };

    image.onerror = () => URL.revokeObjectURL(objectUrl);
    image.src = objectUrl;
  };

  const handleCanvasClick = (event: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(
      ((event.clientX - rect.left) * canvas.width) / rect.width,
    );
    const y = Math.floor(
      ((event.clientY - rect.top) * canvas.height) / rect.height,
    );
    const pixel = context.getImageData(x, y, 1, 1).data;
    const red = pixel[0] ?? 0;
    const green = pixel[1] ?? 0;
    const blue = pixel[2] ?? 0;
    const hex = [red, green, blue]
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
    setColorInput(hex);
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    loadImageFile(event.dataTransfer.files[0]);
  };

  const inputHex = formatHex(colorInput) ?? closestTailwind?.input.hex;
  const pickerValue = formatHex(inputHex ?? "#3e3e66") ?? "#3e3e66";
  const inputAlpha = closestTailwind?.alpha;
  const normalizedInputHex = inputHex
    ? inputHex.startsWith("#")
      ? inputHex
      : `#${inputHex}`
    : undefined;
  const inputBgColor = !normalizedInputHex
    ? "transparent"
    : inputAlpha === undefined
      ? normalizedInputHex
      : hexToRgba(normalizedInputHex, inputAlpha);
  const matchBgColor = !closestTailwind
    ? "transparent"
    : inputAlpha === undefined
      ? `#${closestTailwind.hex}`
      : hexToRgba(`#${closestTailwind.hex}`, inputAlpha);
  const urlToCopy = `${url}?hex=${encodeURIComponent(colorInput)}&v=${version}`;
  const batchRows = parseBatchInputs(batchText).map((input) => ({
    input,
    match: resolveColorMatch(input, version, matchOptions),
  }));
  const brandKitSource = formatHex(colorInput) ?? closestTailwind?.input.hex;
  const brandKit = brandKitSource
    ? (() => {
        try {
          return buildBrandKit(brandKitSource, version, matchOptions);
        } catch {
          return undefined;
        }
      })()
    : undefined;

  return (
    <section
      data-nosnippet
      className="relative mb-4 w-full overflow-hidden rounded-4xl border border-indigo-100 bg-white p-6 shadow-xl shadow-indigo-100/40 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-100/60 md:p-10 dark:border-indigo-900/50 dark:bg-slate-900 dark:shadow-indigo-950/50"
    >
      <div className="pointer-events-none absolute inset-e-0 inset-bs-0 -me-16 -mt-16 size-64 rounded-full bg-indigo-100/70 blur-3xl dark:bg-indigo-900/20" />
      <div className="pointer-events-none absolute inset-s-0 inset-be-0 -ms-20 -mb-20 size-72 rounded-full bg-cyan-100/60 blur-3xl dark:bg-cyan-900/20" />

      <div className="relative z-10 space-y-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <Panel>
            <label
              htmlFor="colorcode"
              className="mb-3 block text-sm font-semibold text-slate-500 dark:text-slate-400"
            >
              Input color
            </label>
            <div className="flex items-center gap-3">
              <input
                id="colorcode"
                type="text"
                value={colorInput}
                onChange={handleColorInputChange}
                onCopy={handleColorInputCopy}
                placeholder="3B82F6, rgb(), or blue-500"
                className="block min-w-0 flex-1 rounded-2xl border-2 border-slate-100 bg-slate-50/80 px-4 py-4 font-mono text-xl font-bold text-slate-800 shadow-sm transition-all duration-200 outline-none focus:border-indigo-400 focus:bg-white focus:shadow-lg focus:ring-4 focus:shadow-indigo-500/10 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100 dark:focus:border-indigo-500 dark:focus:bg-slate-900"
                aria-label="Enter a color code or Tailwind token"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
              <label className="relative size-14 shrink-0 overflow-hidden rounded-2xl border-2 border-slate-100 shadow-sm dark:border-slate-800">
                <span className="sr-only">Pick a color</span>
                <input
                  type="color"
                  value={pickerValue}
                  onChange={(event) =>
                    setColorInput(normalizeColorInput(event.target.value))
                  }
                  className="absolute inset-0 size-full cursor-pointer appearance-none border-0 bg-transparent p-0"
                />
              </label>
              <button
                ref={sampleButtonRef}
                type="button"
                onClick={() => setImageModalOpen(true)}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:text-indigo-300"
              >
                Sample from image
              </button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
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
              <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                Family
                <select
                  value={familyFilter}
                  onChange={(event) => setFamilyFilter(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                >
                  <option value="">All families</option>
                  {families.map((family) => (
                    <option key={family} value={family}>
                      {family}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {!closestTailwind && colorInput.length > 0 ? (
              <p className="mt-4 text-sm font-medium text-rose-600 dark:text-rose-400">
                Enter a valid HEX, RGB, HSL, CSS color, or Tailwind token.
              </p>
            ) : null}
            {familyFilter || (useCustomPalette && customPalette) ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {familyFilter ? (
                  <button
                    type="button"
                    onClick={() => setFamilyFilter("")}
                    className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300"
                  >
                    Matching {familyFilter} only ×
                  </button>
                ) : null}
                {useCustomPalette && customPalette ? (
                  <button
                    type="button"
                    onClick={() => setUseCustomPalette(false)}
                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
                  >
                    Custom palette ×
                  </button>
                ) : null}
              </div>
            ) : null}
            {history.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {history.map((item) => (
                  <button
                    key={`${item.version}-${item.hex}-${item.tailwind}`}
                    onClick={() => {
                      setVersion(item.version);
                      setColorInput(item.hex.replace("#", ""));
                    }}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1 text-left dark:border-slate-800 dark:bg-slate-950"
                  >
                    <ColorDot color={item.hex} />
                    <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200">
                      {item.tailwind}
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearHistory}
                  className="text-xs font-semibold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400"
                >
                  Clear
                </button>
              </div>
            ) : null}
          </Panel>

          <Panel>
            <div
              ref={matchPanelRef}
              className="flex items-start justify-between gap-4"
            >
              <div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Best match
                </p>
                {closestTailwind ? (
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <CodePill>{closestTailwind.tailwind}</CodePill>
                      <IconCopy
                        onClick={createCopyToClipboardFunction(
                          closestTailwind.tailwind,
                        )}
                        copiedValue={closestTailwind.tailwind}
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
                label="Copy share link"
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
                  label="Text on this color"
                  value={closestTailwind.contrast.recommendedText ?? "None"}
                />
              </div>
            ) : null}
          </Panel>
        </div>

        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Input vs match
            </p>
            {closestTailwind ? (
              <p className="font-mono text-sm text-slate-500 dark:text-slate-400">
                {closestTailwind.input.hex} {"->"} {closestTailwind.tailwind}
              </p>
            ) : null}
          </div>
          <div className="relative flex h-48 overflow-hidden rounded-3xl border border-slate-200/70 shadow-inner max-md:flex-col md:h-44 dark:border-slate-800">
            <div className="absolute inset-bs-1/2 left-1/2 z-10 -translate-1/2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-semibold tracking-wide text-slate-500 uppercase shadow dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-400">
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
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Quick copy
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {PRIMARY_VARIANTS.map((key) => (
                    <CopyChip
                      key={key}
                      value={closestTailwind.variants[key]}
                      onCopy={createCopyToClipboardFunction(
                        closestTailwind.variants[key],
                      )}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowMoreUtilities((open) => !open)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                  >
                    {showMoreUtilities ? "Hide utilities" : "More utilities"}
                  </button>
                  {showMoreUtilities
                    ? MORE_VARIANTS.map((key) => (
                        <CopyChip
                          key={key}
                          value={closestTailwind.variants[key]}
                          onCopy={createCopyToClipboardFunction(
                            closestTailwind.variants[key],
                          )}
                        />
                      ))
                    : null}
                </div>

                {closestTailwind.arbitrarySuggestion ? (
                  <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                          This match is far enough that a custom{" "}
                          <span className="font-mono">bg-[#…]</span> class may
                          be safer.
                        </p>
                        <p className="mt-1 text-sm text-amber-700 dark:text-amber-300/80">
                          Delta E is {closestTailwind.diff.toFixed(2)}{" "}
                          (threshold{" "}
                          {closestTailwind.arbitrarySuggestion.threshold}).
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
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                      Dark mode pair
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
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    Contrast
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
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Text that reads on this color
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
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Formats
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
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    Shade family
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
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Nearest matches
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

            <Collapsible title="More tools">
              <div className="mb-4 flex flex-wrap gap-2">
                {MORE_TOOL_TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setMoreToolTab(tab)}
                    className={`rounded-xl px-3 py-1.5 text-sm font-semibold capitalize ${
                      moreToolTab === tab
                        ? "bg-indigo-600 text-white dark:bg-indigo-500"
                        : "border border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                    }`}
                  >
                    {tab === "brand"
                      ? "Brand kit"
                      : tab === "palette"
                        ? "Custom palette"
                        : "Batch convert"}
                  </button>
                ))}
              </div>
              {moreToolTab === "brand" ? (
                brandKit ? (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <BrandKitCard
                      label="Source"
                      hex={brandKit.source.hex}
                      match={brandKit.source.match}
                      onCopy={createCopyToClipboardFunction(
                        brandKit.source.match.tailwind,
                      )}
                      onSelect={() =>
                        setColorInput(normalizeColorInput(brandKit.source.hex))
                      }
                    />
                    <BrandKitCard
                      label="Complementary"
                      hex={brandKit.complementary.hex}
                      match={brandKit.complementary.match}
                      onCopy={createCopyToClipboardFunction(
                        brandKit.complementary.match.tailwind,
                      )}
                      onSelect={() =>
                        setColorInput(
                          normalizeColorInput(brandKit.complementary.hex),
                        )
                      }
                    />
                    {brandKit.analogous.map((item, index) => (
                      <BrandKitCard
                        key={`${item.hex}-${index}`}
                        label={`Analogous ${index + 1}`}
                        hex={item.hex}
                        match={item.match}
                        onCopy={createCopyToClipboardFunction(
                          item.match.tailwind,
                        )}
                        onSelect={() =>
                          setColorInput(normalizeColorInput(item.hex))
                        }
                      />
                    ))}
                    <BrandKitCard
                      label="Neutral"
                      hex={brandKit.neutral.hex}
                      match={brandKit.neutral.match}
                      onCopy={createCopyToClipboardFunction(
                        brandKit.neutral.match.tailwind,
                      )}
                      onSelect={() =>
                        setColorInput(normalizeColorInput(brandKit.neutral.hex))
                      }
                    />
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Enter a valid color to generate complementary, analogous,
                    and neutral Tailwind matches.
                  </p>
                )
              ) : moreToolTab === "palette" ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={useCustomPalette}
                        onChange={(event) =>
                          setUseCustomPalette(event.target.checked)
                        }
                        className="size-4 rounded border-slate-300 text-indigo-600"
                      />
                      Use custom palette
                    </label>
                    {useCustomPalette && !customPalette ? (
                      <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
                        Could not parse the palette. Use JSON, name: hex lines,
                        or @theme tokens.
                      </p>
                    ) : null}
                  </div>
                  <textarea
                    value={customPaletteText}
                    onChange={(event) =>
                      setCustomPaletteText(event.target.value)
                    }
                    placeholder={'{\n  "brand": { "500": "#3b82f6" }\n}'}
                    className="mt-4 min-h-36 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-700 shadow-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                  />
                </>
              ) : (
                <>
                  <textarea
                    value={batchText}
                    onChange={(event) => setBatchText(event.target.value)}
                    placeholder={"#3b82f6\nrgb(15, 23, 42)\nblue-500"}
                    className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-700 shadow-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                  />
                  {batchRows.length > 0 ? (
                    <>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <CopyButton
                          label="Copy TSV"
                          onClick={createCopyToClipboardFunction(
                            [
                              "input\ttoken\thex\tdeltaE",
                              ...batchRows.map(
                                (row) =>
                                  `${row.input}\t${row.match?.tailwind ?? ""}\t${row.match ? `#${row.match.hex}` : ""}\t${row.match?.diff.toFixed(2) ?? ""}`,
                              ),
                            ].join("\n"),
                          )}
                        />
                        <CopyButton
                          label="Copy JSON"
                          onClick={createCopyToClipboardFunction(
                            JSON.stringify(
                              batchRows.map((row) => ({
                                input: row.input,
                                token: row.match?.tailwind ?? null,
                                hex: row.match ? `#${row.match.hex}` : null,
                                deltaE: row.match?.diff ?? null,
                              })),
                              null,
                              2,
                            ),
                          )}
                        />
                      </div>
                      <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                          <thead>
                            <tr className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                              <th className="px-3 py-2">Preview</th>
                              <th className="px-3 py-2">Input</th>
                              <th className="px-3 py-2">Token</th>
                              <th className="px-3 py-2">HEX</th>
                              <th className="px-3 py-2">Delta E</th>
                              <th className="px-3 py-2">Copy</th>
                            </tr>
                          </thead>
                          <tbody>
                            {batchRows.map((row) => (
                              <tr
                                key={row.input}
                                className={`border-t border-slate-100 dark:border-slate-800 ${
                                  row.match
                                    ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/60"
                                    : ""
                                }`}
                                onClick={() => {
                                  if (!row.match) return;
                                  setColorInput(normalizeColorInput(row.input));
                                }}
                              >
                                <td className="px-3 py-2">
                                  {row.match ? (
                                    <span className="flex items-center gap-2">
                                      <ColorDot color={row.match.input.hex} />
                                      <ColorDot color={`#${row.match.hex}`} />
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-2">
                                      <span className="block size-8 rounded-full bg-slate-100 dark:bg-slate-800" />
                                      <span className="block size-8 rounded-full bg-slate-100 dark:bg-slate-800" />
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-200">
                                  {row.input}
                                </td>
                                <td className="px-3 py-2 font-mono font-bold text-slate-800 dark:text-slate-100">
                                  {row.match?.tailwind ?? "Invalid"}
                                </td>
                                <td className="px-3 py-2 font-mono text-slate-500 dark:text-slate-400">
                                  {row.match ? `#${row.match.hex}` : "—"}
                                </td>
                                <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                                  {row.match ? row.match.diff.toFixed(2) : "—"}
                                </td>
                                <td
                                  className="px-3 py-2"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  {row.match ? (
                                    <IconCopy
                                      onClick={createCopyToClipboardFunction(
                                        row.match.tailwind,
                                      )}
                                      copiedValue={row.match.tailwind}
                                    />
                                  ) : null}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                      Paste HEX, RGB, or Tailwind tokens — one per line,
                      comma-separated, or as a JSON array.
                    </p>
                  )}
                </>
              )}
            </Collapsible>
          </>
        ) : null}

        {imageModalOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="image-eyedrop-title"
          >
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/50"
              aria-label="Close image sampler"
              onClick={closeImageModal}
            />
            <div
              ref={modalRef}
              className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    id="image-eyedrop-title"
                    className="text-sm font-semibold text-slate-500 dark:text-slate-400"
                  >
                    Sample from image
                  </h2>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Drop, paste, or click to upload a screenshot, then click a
                    pixel.
                  </p>
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={closeImageModal}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <ColorDot color={normalizedInputHex ?? "#e2e8f0"} />
                <ColorDot
                  color={
                    closestTailwind ? `#${closestTailwind.hex}` : "#e2e8f0"
                  }
                />
                <div>
                  <p className="font-mono text-sm font-bold text-slate-800 dark:text-slate-100">
                    {closestTailwind?.tailwind ?? "No match yet"}
                  </p>
                  <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    {closestTailwind?.input.hex ?? "Click a pixel to sample"}
                    {closestTailwind
                      ? ` -> #${closestTailwind.hex.toUpperCase()}`
                      : ""}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                className="mt-4 w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-8 text-sm text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-400 dark:hover:border-indigo-700 dark:hover:text-indigo-300"
              >
                Drop, paste, or click to upload a screenshot
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  loadImageFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                className={`mt-4 max-w-full cursor-crosshair rounded-2xl border border-slate-200 dark:border-slate-800 ${hasSampleImage ? "block" : "hidden"}`}
              />
            </div>
          </div>
        ) : null}
      </div>
      {showStickyMatch && closestTailwind ? (
        <div className="fixed inset-s-0 inset-e-0 inset-bs-16 z-40 mx-auto flex w-fit items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-2 shadow-lg dark:border-slate-800 dark:bg-slate-900/95">
          <ColorDot color={`#${closestTailwind.hex}`} />
          <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-100">
            {closestTailwind.tailwind}
          </span>
          <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
            #{closestTailwind.hex.toUpperCase()}
          </span>
          <IconCopy
            onClick={createCopyToClipboardFunction(closestTailwind.tailwind)}
            copiedValue={closestTailwind.tailwind}
          />
        </div>
      ) : null}
      <CopyToast />
    </section>
  );
};

const Panel = ({ children }: { children: ReactNode }) => (
  <div className="rounded-[1.75rem] border border-slate-200/70 bg-white/80 p-5 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/40">
    {children}
  </div>
);

const Collapsible = ({
  children,
  defaultOpen = false,
  title,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
  title: string;
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Panel>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          {title}
        </p>
        <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
          {open ? "Hide" : "Show"}
        </span>
      </button>
      {open ? <div className="mt-4">{children}</div> : null}
    </Panel>
  );
};

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
  <Copy onClick={onClick} copiedValue={label}>
    <span className="inline-flex items-center gap-2 rounded-xl border border-indigo-100 bg-white px-3 py-2 text-sm font-semibold text-indigo-600 shadow-sm transition hover:-translate-y-0.5 hover:text-indigo-800 dark:border-slate-800 dark:bg-slate-950 dark:text-indigo-400 dark:hover:text-indigo-300">
      <ClipboardIcon />
      {label}
    </span>
  </Copy>
);

const IconCopy = ({
  copiedValue,
  onClick,
}: {
  copiedValue?: string;
  onClick: () => Promise<void>;
}) => (
  <Copy onClick={onClick} {...(copiedValue ? { copiedValue } : {})}>
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
      <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
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
  <Copy onClick={onCopy} copiedValue={value}>
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
      <div className="flex gap-2 text-xs font-semibold tracking-wide uppercase">
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
      <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
        {label}
      </p>
      <p className="truncate font-mono text-sm font-bold text-slate-800 dark:text-slate-100">
        {value}
      </p>
    </div>
    <IconCopy onClick={onCopy} copiedValue={value} />
  </div>
);

const BrandKitCard = ({
  hex,
  label,
  match,
  onCopy,
  onSelect,
}: {
  hex: string;
  label: string;
  match: ColorMatch;
  onCopy: () => Promise<void>;
  onSelect: () => void;
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/50">
    <button type="button" onClick={onSelect} className="w-full text-left">
      <ColorDot color={hex} />
      <p className="mt-3 text-[11px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate font-mono text-sm font-bold text-slate-800 dark:text-slate-100">
        {match.tailwind}
      </p>
      <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
        {hex}
      </p>
    </button>
    <div className="mt-3">
      <IconCopy onClick={onCopy} />
    </div>
  </div>
);

const ColorDot = ({ color }: { color: string }) => (
  <span
    className="block size-8 rounded-full border border-white/70 shadow-sm transition-transform duration-200 hover:scale-110"
    style={{ backgroundColor: color }}
  />
);

const normalizeColorInput = (input: string) => {
  let nextInput = input.toLowerCase().trim();
  if (nextInput.startsWith("#")) {
    nextInput = nextInput.slice(1);
  }
  return nextInput;
};

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
