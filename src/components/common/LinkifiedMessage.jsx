import React from "react";

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

function isUrl(value) {
  return /^https?:\/\//.test(value);
}

export default function LinkifiedMessage({ message, className }) {
  const text = String(message || "");
  const parts = text.split(URL_PATTERN);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        isUrl(part) ? (
          <a
            key={`${part}-${index}`}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold underline break-all"
          >
            {part}
          </a>
        ) : (
          <React.Fragment key={`text-${index}`}>{part}</React.Fragment>
        )
      )}
    </span>
  );
}
