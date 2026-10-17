import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getPosts, API_ROOT } from "../services/api";
import { getArticleUrl } from "../utils/slug";
import { SiteSEO } from "../components/SEO/SEO";
import { useLanguage } from "../context/LanguageContext";
import { useTranslatedPosts } from "../hooks/useTranslatedPosts";
import OptimizedImage from "../components/common/OptimizedImage";
import { RESOLUTION_WIDTHS, isCloudinaryUrl } from "../utils/images";
import { ChevronDown } from "lucide-react";


const getImageUrl = (image) => {
  if (!image) return null;
  const value = String(image).trim();
  if (/^https?:\/\//i.test(value)) {
    const https = value.replace(/^http:\/\//i, "https://");
    if (isCloudinaryUrl(https)) {
      /* OptimizedImage applies the responsive transformations on render. */
      return https;
    }
    return https;
  }
  if (value.startsWith("/")) return `${API_ROOT}${value}`;
  if (value.startsWith("uploads/")) return `${API_ROOT}/${value}`;
  return `${API_ROOT}/uploads/${value}`;
};

const parseImages = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
};

const parseBlocks = (value) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getPostId = (post) => post?.id || post?._id;

const Media = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(9);

  useEffect(() => {
    let mounted = true;

    const loadPosts = async () => {
      try {
        const data = await getPosts();
        if (mounted) setPosts(Array.isArray(data) ? data : []);
      } catch (err) {
        if (mounted) {
          setError(err?.message || "Ntibyashobotse kubona amashusho.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadPosts();

    return () => {
      mounted = false;
    };
  }, []);

  const translatedPosts = useTranslatedPosts(posts);

  const gallery = useMemo(() => {
    return translatedPosts
      .filter((post) => post.image || post.images || post.youtube_url || post.content_blocks)
      .map((post) => {
        const images = [];
        const videos = [];

        if (post.image) images.push(post.image);

        parseImages(post.images).forEach((url) => {
          if (String(url).trim() !== String(post.image || "").trim()) {
            images.push(url);
          }
        });

        parseBlocks(post.content_blocks).forEach((block) => {
          if (block.type === "image" && block.url) images.push(block.url);
          if (block.type === "video" && block.url) videos.push(block.url);
        });

        if (post.youtube_url) videos.push(post.youtube_url);

        return {
          id: getPostId(post),
          title: post.title || post.summary || "Untitled",
          href: getArticleUrl(post),
          createdDate: post.createdDate || null,
          images: images.filter(Boolean).map(getImageUrl),
          videos: videos.filter(Boolean),
        };
      })
      .filter((post) => post.images.length > 0 || post.videos.length > 0)
      .sort((a, b) => new Date(b.createdDate || 0) - new Date(a.createdDate || 0));
  }, [translatedPosts]);

  const filtered = useMemo(() => {
    if (filter === "videos") {
      return gallery.filter((post) => post.videos.length > 0);
    }
    if (filter === "photos") {
      return gallery.filter((post) => post.images.length > 0);
    }
    return gallery;
  }, [gallery, filter]);

  const hasVideos = gallery.some((post) => post.videos.length > 0);
  const hasPhotos = gallery.some((post) => post.images.length > 0);
  const visiblePosts = filtered.slice(0, visibleCount);
  const hasMorePosts = filtered.length > visibleCount;

  const filterBtn = (key, label) => (
    <button
      type="button"
      onClick={() => {
        setFilter(key);
        setVisibleCount(9);
      }}
      className={`inline-flex items-center justify-center rounded-md border px-3 py-1.5 sm:px-4 sm:py-2 font-body text-[8px] xs:text-[9px] sm:text-[10px] font-black uppercase tracking-[0.14em] transition-all duration-200 ${filter === key
        ? "border-slate-900 bg-slate-950 text-white shadow-[2px_2px_0px_0px_rgba(239,68,68,1)]"
        : "border-slate-300 bg-white text-slate-700 hover:border-red-300 hover:text-red-600 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.08)]"
        }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen emotional-gradient-bg text-black flex flex-col font-body selection:bg-red-600 selection:text-white">
      <SiteSEO />

      <main className="flex-grow">
        <section className="mx-auto max-w-7xl px-3 xs:px-4 sm:px-6 pt-4 pb-8">
          <div className="flex flex-col gap-3 border-b-2 border-black pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-masthead text-2xl font-black uppercase tracking-tight text-slate-900">
                PHOTOS & VIDEOS
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {filterBtn("all", language === "rw" ? "Byose" : "All")}
              {hasVideos && filterBtn("videos", language === "rw" ? "Videos" : "Videos")}
              {hasPhotos && filterBtn("photos", language === "rw" ? "Amashusho" : "Photos")}

              <button
                type="button"
                onClick={() => navigate("/")}
                className="inline-flex items-center justify-center rounded-md border border-slate-900 bg-white px-3 py-1.5 sm:px-4 sm:py-2 font-body text-[8px] xs:text-[9px] sm:text-[10px] font-black uppercase tracking-[0.14em] text-slate-900 transition-all duration-200 hover:border-red-300 hover:text-red-600 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.08)]"
              >
                {language === "rw" ? "Gusohoka" : "Exit"}
              </button>
            </div>
          </div>

          {loading ? (
            <p className="py-16 text-center text-sm text-slate-500">
              {language === "rw" ? "Birimo byizuzwa..." : "Loading..."}
            </p>
          ) : error ? (
            <div className="mx-auto my-12 max-w-lg bg-red-50 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 text-center">
              <p className="text-sm font-semibold text-red-600">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="mx-auto my-12 max-w-md bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-8 text-center">
              <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">
                {language === "rw" ? "Nta mashusho cyangwa video zihari" : "No media available"}
              </h3>
            </div>
          ) : (
            <>
              <div className="mt-5 grid grid-cols-1 gap-4 xs:gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visiblePosts.map((post) => {
                const isVideo = post.videos.length > 0;
                const cover = post.images[0] || null;

                return (
                  <article
                    key={post.id || post.title}
                    className={`flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl ${isVideo ? "border-violet-300 ring-1 ring-violet-200" : "border-slate-200"
                      }`}
                  >
                    <Link to={post.href} className="group relative block overflow-hidden bg-slate-100">
                      {cover ? (
                        <OptimizedImage
                          src={cover}
                          alt={post.title}
                          widths={RESOLUTION_WIDTHS.CARD}
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                          className="aspect-[16/10] h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <img
                          src="/Rubavu.jpeg"
                          alt=""
                          className="aspect-[16/10] h-full w-full object-cover"
                          loading="lazy"
                          width="400"
                          height="250"
                        />
                      )}

                      {isVideo && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="ml-1 h-7 w-7" aria-hidden="true">
                              <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" />
                            </svg>
                          </span>
                        </div>
                      )}
                    </Link>

                    <div className="flex flex-1 flex-col p-3 sm:p-3.5">
                      <Link
                        to={post.href}
                        className="break-words font-masthead text-sm font-extrabold leading-snug text-slate-900 transition-colors hover:text-red-600 mt-1"
                      >
                        {post.title}
                      </Link>

                      <div className="mt-auto pt-2.5">
                        {isVideo ? (
                          <div className="flex flex-wrap gap-1.5">
                            {post.videos.map((url, index) => (
                              <a
                                key={`${post.id || post.title}-vid-${index}`}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 font-body text-[9px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-red-700"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
                                  <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" />
                                </svg>
                                {language === "rw" ? `Video ${post.videos.length > 1 ? index + 1 : ""}` : `Watch${post.videos.length > 1 ? ` ${index + 1}` : ""}`}
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-body text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
                              <path d="M4.5 4.5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h8.25a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3H4.5Z" />
                            </svg>
                            {post.images.length} {language === "rw" ? "amashusho" : "photos"}
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
              </div>
              {hasMorePosts && (
                <div className="flex justify-center pt-5">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((count) => count + 9)}
                    aria-label={language === "rw" ? "Reba andi mashusho na videwo" : "Show more photos and videos"}
                    title={language === "rw" ? "Reba andi mashusho na videwo" : "Show more photos and videos"}
                    className="grid h-10 w-10 place-items-center rounded-full border border-slate-300 bg-white text-slate-800 shadow-sm transition hover:border-red-600 hover:bg-red-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-200"
                  >
                    <ChevronDown className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default Media;