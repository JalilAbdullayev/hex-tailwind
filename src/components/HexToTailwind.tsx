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

    newInput = newInput.replaceAll("#", "");

    setHexInput(newInput);
  };

  const createCopyToClipboardFunction = (
    text: string,
  ): (() => Promise<void>) => {
    return async () => {
      try {
        await navigator.clipboard.writeText(text);
      } catch (err) {
        console.error("Failed to copy text to clipboard:", err);
      }
    };
  };

  const urlToCopy = `${url}?hex=${hexInput}`;

  return (
    <section className="text-xl">
      <div className="grid grid-cols-2 gap-y-2">
        <label className="font-bold" htmlFor="hexcode">
          Input HEX code:
        </label>
        <p className="font-bold">Tailwind color:</p>

        <input
          id="hexcode"
          type="text"
          className="block w-40 rounded border border-black p-2 uppercase focus:ring-cyan-800"
          value={`#${hexInput}`}
          onChange={handleHexInputChange}
        />

        <div className="flex flex-col justify-center align-middle">
          <span>
            {closestTailwind ? (
              <>
                <div className="mb-2 flex">
                  <div className="mr-1">{closestTailwind.tailwind}</div>
                  <Copy
                    onClick={createCopyToClipboardFunction(
                      closestTailwind.tailwind,
                    )}
                  >
                    <ClipboardIcon />
                  </Copy>
                </div>
                <div className="flex flex-row align-middle">
                  <div className="mr-1">
                    #{closestTailwind.hex.toUpperCase()}
                  </div>
                  <Copy
                    onClick={createCopyToClipboardFunction(
                      "#" + closestTailwind.hex.toUpperCase(),
                    )}
                  >
                    <ClipboardIcon />
                  </Copy>
                </div>
              </>
            ) : (
              "..."
            )}
          </span>
        </div>

        <div
          className="h-10 w-full"
          style={{ backgroundColor: "#" + hexInput }}
        ></div>
        <div
          className="h-10 w-full"
          style={{
            backgroundColor: closestTailwind
              ? "#" + closestTailwind.hex
              : "transparent",
          }}
        ></div>

        <div className="col-span-2 text-lg md:text-xl">
          Difference visible to the human eye?{" "}
          {closestTailwind
            ? ColorDifferenceResult(closestTailwind.diff)
            : "..."}
        </div>
        <div className="col-span-2 text-lg md:text-xl">
          <Copy onClick={createCopyToClipboardFunction(urlToCopy)}>
            <span className="underline">Copy Link</span>
          </Copy>
        </div>
      </div>
    </section>
  );
};

const isValidHex: (input: string) => boolean = (input) => {
  let regex = new RegExp(/^([a-f0-9]{6}|[a-f0-9]{3})$/);
  return regex.test(input);
};

const ColorDifferenceResult = (diff: number) => {
  return <span className="font-bold">{diff > 1 ? "Yes" : "No"}</span>;
};

export default HexToTailwind;
