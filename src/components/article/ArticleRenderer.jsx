import React from "react";
import { useLanguage } from "../../context/LanguageContext";
import { getYouTubeEmbedUrl } from "../../utils/video";
import OptimizedImage from "../common/OptimizedImage";
import { RESOLUTION_WIDTHS, isCloudinaryUrl } from "../../utils/images";

const normalizeImageUrl = (url) => {
  if (!url) return null;

  const value = String(url).trim();

  if (/^https?:\/\//i.test(value)) {
    const https = value.replace(/^http:\/\//i, "https://");

    /* Cloudinary optimization is handled by OptimizedImage at render time;
       just normalize to https here. */
    if (isCloudinaryUrl(https)) {
      return https;
    }

    return https;
  }

  return value;
};

const getVideoEmbed = (url) => getYouTubeEmbedUrl(url);

const positionClasses = {
  full: "mt-10 mb-2 w-full",
  center: "mt-10 mb-2 mx-auto max-w-[720px]",
  inline: "mt-10 mb-2 mx-auto w-[88%] max-w-[560px]",
  left: "mt-6 mb-6 md:float-left md:mr-6 md:w-[42%]",
  right: "mt-6 mb-6 md:float-right md:ml-6 md:w-[42%]",
  gallery: "mt-8 mb-2",
};

const clearClassAfterFloat = (prevFloated) =>
  prevFloated ? "clear-both md:clear-both" : "";

const GalleryFigure = ({ block, onImageDownload }) => {
  const src = normalizeImageUrl(block.url);

  if (!src) return null;

  return (
    <figure className="min-w-0 flex-1 basis-[45%] md:basis-[30%]">
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <OptimizedImage
          src={src}
          alt={block.alt || "Rubavu Today article photo"}
          widths={RESOLUTION_WIDTHS.GALLERY}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 45vw, 400px"
          loading="lazy"
          decoding="async"
          className="block aspect-[4/3] h-auto w-full object-cover"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "";
          }}
        />
      </div>
      {block.caption && (
        <figcaption className="mt-1.5 text-center font-body text-[11px] leading-snug text-slate-500">
          {block.caption}
        </figcaption>
      )}
      {onImageDownload && (
        <button
          type="button"
          onClick={() => onImageDownload(block.url)}
          className="mt-1 font-body text-[10px] font-semibold text-slate-400 transition hover:text-red-600"
        >
          Download
        </button>
      )}
    </figure>
  );
};

const ImageFigure = ({ block, onImageDownload }) => {
  if (block.position === "gallery") return null;

  const src = normalizeImageUrl(block.url);

  if (!src) return null;

  return (
    <figure
      className={`${positionClasses[block.position] || positionClasses.center} max-w-full`}
    >
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <OptimizedImage
          src={src}
          alt={block.alt || "Rubavu Today article photo"}
          widths={RESOLUTION_WIDTHS.GALLERY}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 720px"
          loading="lazy"
          decoding="async"
          width="1200"
          height="675"
          className="article-image select-none"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "";
          }}
        />
      </div>
      {block.caption && (
        <figcaption className="mt-2 text-center font-body text-xs leading-snug text-slate-500">
          {block.caption}
        </figcaption>
      )}
      {onImageDownload && (
        <button
          type="button"
          onClick={() => onImageDownload(block.url)}
          className="mt-1.5 font-body text-[10px] font-semibold text-slate-400 transition hover:text-red-600"
        >
          Download
        </button>
      )}
    </figure>
  );
};

const ArticleRenderer = ({
  blocks = [],
  post = null,
  hero = null,
  heroUrl = null,
  onImageDownload = null,
  showHero = true,
}) => {
  const { language } = useLanguage();
  const heroSource = normalizeImageUrl(hero || post?.image || post?.featured_image || null);
  const heroUrlSource = normalizeImageUrl(heroUrl || heroSource);

  const elements = [];
  let prevFloated = false;

  blocks.forEach((block, index) => {
    if (!block || typeof block !== "object") {
      return;
    }

    const type = block.type;

    if (type === "image" && block.position === "header") {
      const blockSource = normalizeImageUrl(block.url);

      if (heroUrlSource && blockSource === heroUrlSource) {
        return;
      }

      prevFloated = false;

      return elements.push(
        <ImageFigure
          key={`image-${index}`}
          block={{ ...block, position: "full" }}
          onImageDownload={onImageDownload}
        />
      );
    }

    if (type === "image" && block.position === "gallery") {
      const run = [];
      let i = index;

      while (
        i < blocks.length &&
        blocks[i] &&
        blocks[i].type === "image" &&
        blocks[i].position === "gallery"
      ) {
        run.push(blocks[i]);
        i += 1;
      }

      elements.push(
        <div
          key={`gallery-${index}`}
          className="my-10 clear-both md:clear-both"
        >
          <div className="flex flex-wrap items-start justify-center gap-4">
            {run.map((gImage, gIndex) => (
              <GalleryFigure
                key={`g-${gIndex}-${gImage.alt || ""}`}
                block={gImage}
                onImageDownload={onImageDownload}
              />
            ))}
          </div>
        </div>
      );
      return;
    }

    if (type === "image") {
      const isFloat = block.position === "left" || block.position === "right";
      prevFloated = isFloat;

      return elements.push(
        <ImageFigure
          key={`image-${index}`}
          block={block}
          onImageDownload={onImageDownload}
        />
      );
    }

    const clearClass = clearClassAfterFloat(prevFloated);
    prevFloated = false;

    if (type === "paragraph") {
      const formatted = String(block.text || "").replace(/\n{2,}/g, "\n\n");
      return elements.push(
        <p
          key={`p-${index}`}
          className={`${clearClass} font-body mb-6 whitespace-pre-line text-[1.0625rem] leading-[1.85] text-slate-700 sm:text-[1.125rem]`}
        >
          {formatted}
        </p>
      );
    }

    if (type === "heading") {
      return elements.push(
        <h2
          key={`h-${index}`}
          className={`font-post-title text-xl font-black leading-snug text-slate-950 sm:text-2xl ${clearClass} mt-9 mb-3`}
        >
          {block.text}
        </h2>
      );
    }

    if (type === "quote") {
      return elements.push(
        <blockquote
          key={`q-${index}`}
          className={`my-8 border-l-4 border-red-600 pl-5 text-lg font-medium italic leading-relaxed text-slate-700 ${clearClass}`}
        >
          {block.text}
        </blockquote>
      );
    }

    if (type === "divider") {
      return elements.push(
        <div
          key={`d-${index}`}
          className="my-10 clear-both md:clear-both"
        >
          <div className="mx-auto h-px max-w-[420px] bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
        </div>
      );
    }

    if (type === "video") {
      const embed = getVideoEmbed(block.url);

      if (!embed && !String(block.url || "").trim()) {
        return null;
      }

      return elements.push(
        <div
          key={`v-${index}`}
          className="my-10 clear-both md:clear-both"
        >
          {embed ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
              <iframe
                src={embed}
                title={post?.title || "YouTube video"}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          ) : (
            <video
              controls
              playsInline
              preload="metadata"
              className="aspect-video w-full rounded-2xl bg-black"
            >
              <source src={String(block.url).trim()} />
            </video>
          )}
          <div className="mt-3">
            <a
              href={block.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 font-body text-xs font-bold uppercase tracking-[0.05em] text-white transition hover:bg-red-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z" />
              </svg>
              {language === "rw" ? "Reba kuri YouTube" : "Watch on YouTube"}
            </a>
          </div>
        </div>
      );
    }

    return null;
  });

  return (
    <div className="rt-article-content text-base leading-[1.8] text-slate-800 sm:text-[17px]">
      {showHero && heroSource && (
        <figure className="mt-7">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <OptimizedImage
              src={heroSource}
              alt={post?.title || "Rubavu Today article image"}
              widths={RESOLUTION_WIDTHS.HERO}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 900px"
              loading="eager"
              priority
              decoding="async"
              width="1200"
              height="675"
              className="article-image select-none"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "";
              }}
            />
          </div>
          {onImageDownload && (
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => onImageDownload(heroSource)}
                className="print:hidden font-body text-[10px] font-semibold text-slate-400 transition hover:text-red-600"
              >
                Download
              </button>
            </div>
          )}
        </figure>
      )}

      <div className="mt-8">{elements}</div>
    </div>
  );
};

export default ArticleRenderer;