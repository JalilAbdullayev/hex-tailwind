import { useEffect, type ReactNode } from "react";
import { useStore } from "@nanostores/react";
import { announceCopy, copyToastStore } from "../copyToastStore";

const Copy = ({
  children,
  copiedValue,
  onClick,
}: {
  children: ReactNode;
  copiedValue?: string;
  onClick: () => void;
}) => {
  const handleCopy = () => {
    onClick();
    announceCopy(copiedValue);
  };

  return (
    <button
      onClick={handleCopy}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleCopy();
        }
      }}
      className="relative rounded-xl transition-transform focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95"
      aria-label={
        copiedValue ? `Copy ${copiedValue}` : "Click to copy to clipboard"
      }
    >
      {children}
    </button>
  );
};

export const CopyToast = () => {
  const toast = useStore(copyToastStore);

  useEffect(() => {
    if (!toast) return;

    const timeout = window.setTimeout(() => copyToastStore.set(null), 1500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  if (!toast) return null;

  return (
    <div
      role="status"
      className="fixed inset-be-6 left-1/2 z-[70] -translate-x-1/2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg"
    >
      {toast.text}
    </div>
  );
};

export default Copy;
