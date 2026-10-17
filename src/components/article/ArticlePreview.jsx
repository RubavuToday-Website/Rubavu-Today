import React from "react";
import { Eye, X } from "lucide-react";
import ArticleRenderer from "./ArticleRenderer";
import YouTubeEmbeds from "./YouTubeEmbeds";

const ArticlePreview = ({
  open = false,
  onClose = () => {},
  title = "",
  category = "",
  description = "",
  hero = null,
  blocks = [],
  author = "",
  dateLabel = "",
  youtubeUrls = [],
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-900/70 p-3 backdrop-blur-sm sm:p-6">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-slate-200 bg-white px-5 py-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Eye className="h-4 w-4 text-blue-600" />
            Reba Inkuru
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close preview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-6 sm:px-10 sm:py-8">
          <div className="mx-auto max-w-[760px]">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-red-600/10 px-3 py-1">
              <span className="font-post-title text-[10px] font-black uppercase tracking-widest text-red-600">
                {category}
              </span>
            </div>

            <h1 className="font-post-title text-2xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
              {title || "Untitled Article"}
            </h1>

            {description && (
              <p className="mt-3 font-body text-base font-medium text-slate-600 sm:text-lg">
                {description}
              </p>
            )}

            <p className="mt-3 font-body text-xs text-slate-400">
              {[author, dateLabel].filter(Boolean).join(" • ")}
            </p>

            <ArticleRenderer
              blocks={blocks}
              hero={hero}
              post={{ title }}
              showHero
            />

            <YouTubeEmbeds
              urls={youtubeUrls}
              title={title || "YouTube video"}
              className="mt-8"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticlePreview;