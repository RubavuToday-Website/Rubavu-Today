import React, { useCallback, useRef, useState } from "react";
import { Upload } from "lucide-react";

export const MAX_IMAGE_SIZE_BYTES = 120 * 1024;

export const MAX_IMAGES_PER_POST = 2;

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const ALLOWED_TYPES = ALLOWED_IMAGE_TYPES;

export const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const validateImageFile = (file) => {
  if (!file) return "Nta file wahisemo.";

  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Ubwoko bw'ifoto ntibushyigikiwe. Emerera JPG, PNG, WEBP, cyangwa GIF gusa.";
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return `Ifoto ni nini cyane. Buri foto ntiburenze ${Math.round(
      MAX_IMAGE_SIZE_BYTES / 1024
    )} KB.`;
  }

  return "";
};

const ImageUploader = ({
  onAdd,
  multiple = false,
  label = "Shyira amafoto hano",
  hint = "PNG, JPG, WEBP cyangwa GIF (max 120 KB)",
}) => {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const validateFile = useCallback(validateImageFile, []);

  const handleFiles = useCallback(
    (fileList) => {
      const files = Array.from(fileList || []).filter(
        (file) => /^image\//i.test(file.type || "")
      );

      if (files.length === 0) {
        setError("Hitamo ifoto.");
        return;
      }

      const firstInvalid = files
        .map((file) => ({ file, message: validateFile(file) }))
        .find((entry) => entry.message);

      if (firstInvalid) {
        setError(firstInvalid.message);
        return;
      }

      setError("");
      if (onAdd) {
        onAdd(files);
      }
    },
    [onAdd, validateFile]
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
          Kanda kugira uhitemo cyangwa ushye amafoto {multiple ? "" : ""} hano
        </p>
        <span className="text-[10px] text-slate-400">{hint}</span>
      </div>

      {error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
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