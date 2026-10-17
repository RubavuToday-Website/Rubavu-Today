import React, { useEffect, useState } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

const MIN_SCALE = 1;
const MAX_SCALE = 4;

const ImageLightbox = ({ src, alt = "", onClose }) => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    setScale(1);
  }, [src]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "+" || event.key === "=") {
        setScale((current) => Math.min(MAX_SCALE, current + 0.5));
      }
      if (event.key === "-" || event.key === "_") {
        setScale((current) => Math.max(MIN_SCALE, current - 0.5));
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  if (!src) return null;

  const zoomIn = () => setScale((current) => Math.min(MAX_SCALE, current + 0.5));
  const zoomOut = () => setScale((current) => Math.max(MIN_SCALE, current - 0.5));
  const reset = () => setScale(1);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt || "Image preview"}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 sm:p-6"
    >
      <div
        className="relative flex h-full w-full items-center justify-center overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          draggable="false"
          onClick={() => setScale((current) => (current > 1 ? 1 : 2))}
          style={{ transform: `scale(${scale})` }}
          className={`max-h-full max-w-full select-none rounded-lg object-contain shadow-2xl transition-transform duration-200 ${
            scale > 1 ? "cursor-zoom-out" : "cursor-zoom-in"
          }`}
        />
      </div>

      <div
        className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/10 px-3 py-2 backdrop-blur sm:bottom-6"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={zoomOut}
          disabled={scale <= MIN_SCALE}
          aria-label="Zoom out"
          title="Zoom out (-)"
          className="grid h-9 w-9 place-items-center rounded-full text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ZoomOut className="h-5 w-5" />
        </button>
        <span className="min-w-[3rem] text-center font-body text-xs font-bold text-white">
          {Math.round(scale * 100)}%
        </span>
        <button
          type="button"
          onClick={zoomIn}
          aria-label="Zoom in"
          className="grid h-9 w-9 place-items-center rounded-full text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={scale >= MAX_SCALE}
        >
          <ZoomIn className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={reset}
          aria-label="Reset zoom"
          className="grid h-9 w-9 place-items-center rounded-full text-white transition hover:bg-white/20"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close image preview"
        className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-5 sm:top-5"
      >
        <X className="h-6 w-6" />
      </button>
    </div>
  );
};

export default ImageLightbox;
