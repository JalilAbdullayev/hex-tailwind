import { useState, type ReactNode } from "react";

const Copy = ({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onClick();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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
      aria-label={copied ? "Copied!" : "Click to copy to clipboard"}
    >
      {children}
      {copied && (
        <span className="absolute -inset-e-2 -inset-bs-2 flex size-5 items-center justify-center rounded-full bg-emerald-500 text-xs text-white">
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      )}
    </button>
  );
};

export default Copy;
