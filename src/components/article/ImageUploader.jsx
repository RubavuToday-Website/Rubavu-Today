import React, { useCallback, useRef, useState } from "react";
import { Upload } from "lucide-react";
import LinkifiedMessage from "../common/LinkifiedMessage";

export const MAX_IMAGE_SIZE_BYTES = 120 * 1024;

export const MAX_IMAGES_PER_POST = 2;

export const REQUIRED_IMAGE_WIDTH = 1200;

export const REQUIRED_IMAGE_HEIGHT = 630;

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const RESIZE_IMAGE_URL = "https://imresizer.com/resize-image-to-1200x630";

export const COMPRESS_IMAGE_URL = "https://imresizer.com/resize-image-to-120kb";

const ALLOWED_TYPES = ALLOWED_IMAGE_TYPES;

const FORMAT_ERROR =
  "Ubwoko bw'ifoto ntibushyigikiwe. Emerera JPEG, JPG, PNG cyangwa WebP gusa.";

const INVALID_ERROR = "Ifoto ntibyumvikana cyangwa ntiyemewe.";

export const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const detectImageFormat = (bytes) => {
  if (!bytes || bytes.length < 12) return null;

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }

  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }

  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }

  return null;
};

const readImageDimensions = (file) =>
  new Promise((resolve) => {
    if (typeof createImageBitmap === "function") {
      createImageBitmap(file)
        .then((bitmap) => {
          const dimensions = { width: bitmap.width, height: bitmap.height };
          if (bitmap.close) bitmap.close();
          resolve(dimensions);
        })
        .catch(() => resolve(null));
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(url);
    };

    image.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };

    image.src = url;
  });

export const validateImageFile = async (file) => {
  if (!file) return "Nta file wahisemo.";

  if (!ALLOWED_TYPES.includes(file.type)) {
    return FORMAT_ERROR;
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return `Ifoto ni nini cyane. Buri foto ntiburenze ${Math.round(
      MAX_IMAGE_SIZE_BYTES / 1024
    )} KB. Kanda hano uyike: ${COMPRESS_IMAGE_URL}`;
  }

  let format = null;

  try {
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    format = detectImageFormat(head);
  } catch {
    format = null;
  }

  if (!format) {
    return FORMAT_ERROR;
  }

  const dimensions = await readImageDimensions(file);

  if (!dimensions || !dimensions.width || !dimensions.height) {
    return INVALID_ERROR;
  }

  if (
    dimensions.width !== REQUIRED_IMAGE_WIDTH ||
    dimensions.height !== REQUIRED_IMAGE_HEIGHT
  ) {
    return `Ifoto igomba kuba ${REQUIRED_IMAGE_WIDTH} x ${REQUIRED_IMAGE_HEIGHT} pixels (iyi ni ${dimensions.width} x ${dimensions.height}). Hindura ingano hano: ${RESIZE_IMAGE_URL}`;
  }

  return "";
};

const ImageUploader = ({
  onAdd,
  multiple = false,
  label = "Shyira amafoto hano",
  hint = "JPEG, JPG, PNG cyangwa WebP, 1200 x 630 px, max 120 KB",
}) => {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const handleFiles = useCallback(
    async (fileList) => {
      const files = Array.from(fileList || []).filter(Boolean);

      if (files.length === 0) {
        setError("Hitamo ifoto.");
        return;
      }

      for (const file of files) {
        const message = await validateImageFile(file);
        if (message) {
          setError(message);
          return;
        }
      }

      setError("");
      if (onAdd) {
        onAdd(files);
      }
    },
    [onAdd]
  );

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          setError("");
          inputRef.current?.click();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
          dragging
            ? "border-blue-500 bg-blue-50"
            : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/40"
        }`}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <Upload className="h-5 w-5" />
        </div>
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <p className="text-xs text-slate-400">
          Kanda kugira uhitemo cyangwa ushye amafoto hano
        </p>
        <span className="text-[10px] text-slate-400">{hint}</span>
      </div>

      {error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
          <LinkifiedMessage message={error} />
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
};

export default ImageUploader;
