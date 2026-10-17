import React from "react";
import { getYouTubeEmbedUrl } from "../../utils/video";

export const normalizeYouTubeList = (urls) => {
  const source = Array.isArray(urls) ? urls : urls ? [urls] : [];
  const seen = new Set();
  const result = [];

  source.forEach((value) => {
    const trimmed = String(value || "").trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    result.push(trimmed);
  });

  return result.slice(0, 2);
};

const YouTubeEmbeds = ({ urls = [], title = "YouTube video", className = "" }) => {
  const list = normalizeYouTubeList(urls).filter((url) => getYouTubeEmbedUrl(url));

  if (list.length === 0) return null;

  return (
    <div
      className={`grid gap-4 ${list.length > 1 ? "sm:grid-cols-2" : ""} ${className}`.trim()}
    >
      {list.map((url, index) => (
        <div
          key={`youtube-${index}-${url}`}
          className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm"
        >
          <iframe
            src={getYouTubeEmbedUrl(url)}
            title={`${title}${list.length > 1 ? ` ${index + 1}` : ""}`}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
};

export default YouTubeEmbeds;
