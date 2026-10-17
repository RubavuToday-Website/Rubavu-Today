import React, { useEffect, useMemo, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { getPosts, getAdvertisements } from "../services/api";
import { SiteSEO } from "../components/SEO/SEO";
import { getArticleUrl } from "../utils/slug";
import { useLanguage, translateCategory } from "../context/LanguageContext";
import { useTranslatedPosts } from "../hooks/useTranslatedPosts";
import AdBanner from "../components/common/AdBanner";
import AmakuruDepartmentNav from "../components/common/AmakuruDepartmentNav";
import OptimizedImage from "../components/common/OptimizedImage";
import { RESOLUTION_WIDTHS } from "../utils/images";
import { ChevronDown } from "lucide-react";
import {
  filterAmakuruPosts,
  getAmakuruDepartmentBySlug,
  isAmakuruCategory,
} from "../utils/amakuruDepartments";


const formatDate = (dateStr, language) => {
  if (!dateStr) return "";
  const locale = language === "fr" ? "fr-FR" : language === "sw" ? "sw-KE" : language === "en" ? "en-US" : "rw-RW";
  return new Date(dateStr).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const Home = () => {
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [visibleCount, setVisibleCount] = useState(16);
  const [postGridColumns, setPostGridColumns] = useState(4);
  const [mediaSlideIndex, setMediaSlideIndex] = useState(0);
  const [showMedia, setShowMedia] = useState(true);
  const [mediaSearch, setMediaSearch] = useState("");
  const location = useLocation();
  const { language, t } = useLanguage();
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const isAmakuruPage = pathSegments[0] === "amakuru";
  const selectedDepartment = isAmakuruPage
    ? getAmakuruDepartmentBySlug(pathSegments[1] || "")
    : null;
  const selectedCategory = isAmakuruPage
    ? "Amakuru"
    : new URLSearchParams(location.search).get("category") || "";
  const [originalPosts, setOriginalPosts] = useState([]);
  const [advertisements, setAdvertisements] = useState([]);

  useEffect(() => {
    const loadPosts = async () => {
      try {
        const data = await getPosts();
        setOriginalPosts(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || "Ntibyashobotse kubona amakuru.");
      } finally {
        setLoading(false);
      }
    };
    loadPosts();

    const loadAds = async () => {
      try {
        const ads = await getAdvertisements();
        setAdvertisements(Array.isArray(ads) ? ads : []);
      } catch {
        setAdvertisements([]);
      }
    };
    loadAds();
  }, []);

  useEffect(() => {
    // Single-language site: show the original posts as-is.
    setPosts(originalPosts);
  }, [originalPosts]);

  useEffect(() => {
    const updatePostGridColumns = () => {
      const width = window.innerWidth;
      setPostGridColumns(width >= 1280 ? 4 : width >= 1024 ? 3 : width >= 640 ? 2 : 1);
    };

    updatePostGridColumns();
    window.addEventListener("resize", updatePostGridColumns);
    return () => window.removeEventListener("resize", updatePostGridColumns);
  }, []);


  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextQuery = params.get("q") || "";
    const nextCategory = params.get("category") || "";
    const isMediaPage = location.pathname === "/media" || location.pathname.includes("/media");

    setQuery(nextQuery);
    setVisibleCount(16);

    if (isMediaPage || nextCategory || nextQuery || isAmakuruPage) {
      setShowMedia(false);
    } else if (!nextCategory && !nextQuery && !location.pathname.includes("/post/")) {
      setShowMedia(true);
    }
  }, [location.search, location.pathname, isAmakuruPage]);

  const filteredPosts = useMemo(() => {
    return filterAmakuruPosts(posts, {
      category: selectedCategory,
      department: selectedDepartment?.name,
      query,
    });
  }, [posts, query, selectedCategory, selectedDepartment]);


  const sortedPosts = useMemo(() => {
    return [...filteredPosts].sort(
      (a, b) => new Date(b.createdDate || 0) - new Date(a.createdDate || 0)
    );
  }, [filteredPosts]);

  const displayPosts = useTranslatedPosts(sortedPosts);

  const featuredStories = displayPosts.slice(0, 7);

  const mediaPosts = useMemo(() => {
    return [...displayPosts]
      .filter((post) => post.image || post.youtube_url)
      .slice(0, 6)
      .map((post) => ({
        ...post,
        articleHref: getArticleUrl(post),
      }));
  }, [displayPosts]);

  const sidebarPosts = useMemo(() => {
    const allRecent = [...displayPosts].map((post) => ({
      ...post,
      articleHref: getArticleUrl(post),
    }));

    return allRecent.slice(0, 6);
  }, [displayPosts]);

  const filteredMediaPosts = useMemo(() => {
    const term = mediaSearch.trim().toLowerCase();
    const sourcePosts = mediaPosts.length >= 3 ? mediaPosts : sidebarPosts;

    if (!term) return sourcePosts;

    return sourcePosts.filter((post) => {
      const combined = [
        post.title,
        post.summary,
        post.category,
        post.youtube_url,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return combined.includes(term);
    });
  }, [mediaPosts, sidebarPosts, mediaSearch]);
  const mediaCarouselPosts = filteredMediaPosts.length > 0 ? filteredMediaPosts : sidebarPosts;
  const activeMediaSlideIndex = mediaCarouselPosts.length
    ? mediaSlideIndex % mediaCarouselPosts.length
    : 0;

  useEffect(() => {
    if (!showMedia || mediaCarouselPosts.length < 2) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const timer = window.setInterval(() => {
      setMediaSlideIndex((index) => (index + 1) % mediaCarouselPosts.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [mediaCarouselPosts.length, showMedia]);

  const isSearching = query.trim().length > 0;
  const visiblePostCount = Math.min(
    sortedPosts.length,
    featuredStories.length
      + Math.ceil(Math.max(0, visibleCount - featuredStories.length) / postGridColumns) * postGridColumns
  );
  const visiblePosts = displayPosts.slice(0, visiblePostCount);
  const gridPosts = visiblePosts.slice(featuredStories.length);
  const tickerInsertAfter = Math.floor(
    Math.floor(gridPosts.length / 2) / postGridColumns
  ) * postGridColumns;
  const hasMore = sortedPosts.length > visiblePostCount;
  const showInlineStoryTicker = gridPosts.length >= postGridColumns * 2
    && tickerInsertAfter > 0
    && tickerInsertAfter < gridPosts.length;
  const firstGridPosts = showInlineStoryTicker
    ? gridPosts.slice(0, tickerInsertAfter)
    : gridPosts;
  const trailingGridPosts = showInlineStoryTicker
    ? gridPosts.slice(tickerInsertAfter)
    : [];
  const finalGridPosts = showInlineStoryTicker ? trailingGridPosts : firstGridPosts;
  const incompleteFinalRow = !hasMore && finalGridPosts.length % postGridColumns > 0;
  const finalCardSpan = incompleteFinalRow
    ? postGridColumns - (finalGridPosts.length % postGridColumns) + 1
    : 1;

  const handleLoadMore = () => setVisibleCount((prev) => prev + 8);
  const moveMediaSlides = (direction) => {
    if (!mediaCarouselPosts.length) return;
    setMediaSlideIndex((index) => (
      (index % mediaCarouselPosts.length) + direction + mediaCarouselPosts.length
    ) % mediaCarouselPosts.length);
  };
  const PostCard = ({ post, spanColumns = 1 }) => {
    const articleHref = getArticleUrl(post);
    const imageUrl = post.image || "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80";
    const categoryLabel = isAmakuruCategory(post.category) && post.amakuru_department
      ? post.amakuru_department
      : translateCategory(post.category, language);

    return (
      <Link
        to={articleHref}
        style={spanColumns > 1 ? { gridColumn: `span ${spanColumns} / span ${spanColumns}` } : undefined}
        className="group block h-full"
      >
        <article className={`mx-auto flex h-full w-full max-w-[360px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-colors hover:bg-slate-50 hover:shadow-md sm:max-w-none ${spanColumns > 1 ? "sm:flex-row" : ""}`}>
          <div className={`relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-slate-100 ${spanColumns > 1 ? "sm:aspect-auto sm:min-h-[150px] sm:w-2/5" : ""}`}>
            {post.image ? (
              <OptimizedImage
                src={imageUrl}
                alt={post.title}
                widths={RESOLUTION_WIDTHS.CARD}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80";
                }}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <img src="/Rubavu.jpeg" alt="" className="h-full w-full object-cover" loading="lazy" width="320" height="180" />
            )}
          </div>

          <div className={`flex min-w-0 flex-1 flex-col px-2 py-2 sm:px-2.5 sm:py-2.5 ${spanColumns > 1 ? "sm:justify-center sm:px-4 sm:py-4" : ""}`}>
            {categoryLabel && <span className="news-category mb-0.5 truncate uppercase tracking-wider">{categoryLabel}</span>}

            <h4 className="news-headline-card break-words font-masthead text-sm font-extrabold leading-tight text-slate-900 transition-colors group-hover:text-red-600 sm:text-base">
              {post.title}
            </h4>

            {post.createdDate && <time className="news-meta mt-1">{formatDate(post.createdDate, language)}</time>}
          </div>
        </article>
      </Link>
    );
  };

  const SectionHeader = ({ title }) => {
    if (!title) return null;

    return (
      <div className="mb-0 sm:mb-0">
        <h3 className="news-section-heading border-l-[3px] border-[#B3261E] pl-3 font-masthead uppercase tracking-tight">
          {title}
        </h3>
      </div>
    );
  };

  const FeaturedStoriesLayout = () => {
    if (!featuredStories.length) return null;

    const leadStory = featuredStories[0];
    const leadCategory = isAmakuruCategory(leadStory.category) && leadStory.amakuru_department
      ? leadStory.amakuru_department
      : translateCategory(leadStory.category, language);
    const sideStories = featuredStories.slice(5, 7);

    return (
      <section
        aria-label={language === "rw" ? "Inkuru z'ingenzi" : "Featured stories"}
        className="mb-2 overflow-hidden border-y border-slate-200 bg-white py-3 sm:py-4"
      >
        <div className="mb-3 flex items-center gap-2 border-b border-slate-200 px-1 pb-2.5 sm:mb-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="h-5 w-1 shrink-0 rounded-full bg-[#B3261E]" />
            <div className="min-w-0">
              <p className="font-body text-[9px] font-bold uppercase tracking-[0.18em] text-[#B3261E]">
                {language === "rw" ? "Amakuru yatoranyijwe" : "Top stories"}
              </p>
              <h2 className="font-masthead text-sm font-extrabold leading-tight text-slate-900 sm:text-base">
                {language === "rw" ? "Inkuru z'ingenzi" : "Featured stories"}
              </h2>
            </div>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr_0.9fr] lg:gap-4">
          <Link
            to={getArticleUrl(leadStory)}
            className="group relative block min-h-[280px] overflow-hidden bg-slate-900 sm:min-h-[380px] lg:min-h-[430px]"
          >
            <OptimizedImage
              src={leadStory.image || "/Rubavu.jpeg"}
              alt={leadStory.title || ""}
              widths={RESOLUTION_WIDTHS.HERO}
              sizes="(max-width: 1024px) 100vw, 42vw"
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-7 lg:p-8">
              {leadCategory && (
                <span className="mb-2 inline-flex max-w-full truncate rounded-sm bg-[#B3261E] px-2 py-1 font-body text-[9px] font-bold uppercase tracking-[0.13em] text-white sm:text-[10px]">
                  {leadCategory}
                </span>
              )}
              <h3 className="max-w-3xl font-masthead text-xl font-extrabold leading-tight tracking-tight text-white transition-colors group-hover:text-red-100 sm:text-3xl lg:text-4xl">
                {leadStory.title}
              </h3>
              {leadStory.createdDate && (
                <time className="mt-3 block font-body text-[10px] font-medium text-slate-200 sm:text-xs">
                  {formatDate(leadStory.createdDate, language)}
                </time>
              )}
            </div>
          </Link>

          <div className="flex flex-col divide-y divide-slate-200 border-y border-slate-200 md:col-span-2 lg:col-span-1 lg:h-full lg:border-y-0">
            {featuredStories.slice(1, 5).map((story) => {
              const label = isAmakuruCategory(story.category) && story.amakuru_department
                ? story.amakuru_department
                : translateCategory(story.category, language);

              return (
                <Link
                  key={story.id || story._id || story.title}
                  to={getArticleUrl(story)}
                  className="group flex min-h-[86px] flex-1 items-center gap-3 py-2.5 sm:min-h-[94px]"
                >
                  <span className="h-[66px] w-[82px] shrink-0 overflow-hidden bg-slate-100 sm:h-[76px] sm:w-[100px]">
                    <OptimizedImage
                      src={story.image || "/Rubavu.jpeg"}
                      alt=""
                      widths={RESOLUTION_WIDTHS.THUMB}
                      sizes="100px"
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </span>
                  <span className="min-w-0">
                    {label && (
                      <span className="mb-1 block truncate font-body text-[8px] font-bold uppercase tracking-[0.12em] text-[#B3261E]">
                        {label}
                      </span>
                    )}
                    <span className="line-clamp-3 block font-masthead text-xs font-bold leading-snug text-slate-900 transition-colors group-hover:text-[#B3261E] sm:text-sm">
                      {story.title}
                    </span>
                    {story.createdDate && (
                      <time className="mt-1 block font-body text-[9px] text-slate-500">
                        {formatDate(story.createdDate, language)}
                      </time>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:col-span-2 lg:col-span-1 lg:grid-cols-1">
            {sideStories.map((story) => {
              const label = isAmakuruCategory(story.category) && story.amakuru_department
                ? story.amakuru_department
                : translateCategory(story.category, language);

              return (
                <Link
                  key={story.id || story._id || story.title}
                  to={getArticleUrl(story)}
                  className="group overflow-hidden border border-slate-200 bg-white transition-shadow hover:shadow-md"
                >
                  <div className="aspect-[16/9] overflow-hidden bg-slate-100">
                    <OptimizedImage
                      src={story.image || "/Rubavu.jpeg"}
                      alt={story.title || ""}
                      widths={RESOLUTION_WIDTHS.CARD}
                      sizes="(max-width: 1024px) 50vw, 28vw"
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-2.5">
                    {label && (
                      <span className="mb-1 block truncate font-body text-[8px] font-bold uppercase tracking-[0.12em] text-[#B3261E]">
                        {label}
                      </span>
                    )}
                    <h3 className="line-clamp-3 font-masthead text-sm font-bold leading-snug text-slate-900 transition-colors group-hover:text-[#B3261E]">
                      {story.title}
                    </h3>
                    {story.createdDate && (
                      <time className="mt-1.5 block font-body text-[9px] text-slate-500">
                        {formatDate(story.createdDate, language)}
                      </time>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    );
  };

  const MediaSidebar = () => {
    const sourcePosts = mediaCarouselPosts;
  const visibleMediaPosts = sourcePosts.length
    ? Array.from(
      { length: Math.min(5, sourcePosts.length) },
      (_, offset) => sourcePosts[(activeMediaSlideIndex + offset) % sourcePosts.length]
    )
    : [];

    return (
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm sm:p-2.5">
          <button
            type="button"
            onClick={() => setShowMedia((prev) => !prev)}
            className="flex w-full items-center justify-between gap-2 rounded-md border border-slate-900 bg-slate-950 px-2.5 py-1.5 sm:px-3 sm:py-2 font-body text-[8px] xs:text-[9px] sm:text-[10px] font-black uppercase tracking-[0.14em] sm:tracking-[0.16em] text-white shadow-sm transition hover:border-red-600 hover:bg-red-600"
          >
            <span className="truncate">PHOTOS &amp; VIDEOS</span>
            <span className="flex shrink-0 items-center gap-1 text-[10px] sm:text-[12px] leading-none">
              <span aria-hidden="true">{showMedia ? "−" : "+"}</span>
              {showMedia ? (
                <span aria-label="Leave media panel" className="text-[9px] sm:text-[10px]">X</span>
              ) : (
                <span aria-label="Return to media panel" className="text-[9px] sm:text-[10px]">↺</span>
              )}
            </span>
          </button>

          {showMedia && (
            <div className="mt-3">
              <div className="mb-3 flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 sm:px-2.5 sm:py-2">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-500 fill-none stroke-current stroke-2">
                  <circle cx="11" cy="11" r="6"></circle>
                  <path d="M16 16l5 5"></path>
                </svg>
                <input
                  type="text"
                  value={mediaSearch}
                  onChange={(e) => setMediaSearch(e.target.value)}
                  placeholder="Shakisha amafoto / video..."
                  className="w-full border-0 bg-transparent text-[9px] xs:text-[10px] text-slate-700 placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              {sourcePosts.length > 3 && (
                <div className="mb-2 flex items-center justify-between px-0.5">
                  <span className="font-body text-[9px] font-medium text-slate-500">
                    {language === "rw" ? "Inkuru z'amafoto" : "Photo stories"}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveMediaSlides(-1)}
                      aria-label={language === "rw" ? "Subira ku nkuru zabanje" : "Previous stories"}
                      className="grid h-6 w-6 place-items-center rounded border border-slate-200 bg-white text-slate-600 transition hover:border-[#B3261E] hover:text-[#B3261E] focus:outline-none focus:ring-2 focus:ring-red-200"
                    >
                      <span aria-hidden="true">↓</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveMediaSlides(1)}
                      aria-label={language === "rw" ? "Reba izindi nkuru" : "Next stories"}
                      className="grid h-6 w-6 place-items-center rounded border border-slate-200 bg-white text-slate-600 transition hover:border-[#B3261E] hover:text-[#B3261E] focus:outline-none focus:ring-2 focus:ring-red-200"
                    >
                      <span aria-hidden="true">↑</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {visibleMediaPosts.length > 0 ? (
                  visibleMediaPosts.map((post, index) => (
                    <div
                      key={`${post.id || post._id || post.title}-${activeMediaSlideIndex}`}
                      className="home-media-slide-up overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm"
                      style={{ animationDelay: `${index * 70}ms` }}
                    >
                      <Link to={post.articleHref} className="block overflow-hidden bg-slate-100">
                        <div className="aspect-[16/10] overflow-hidden">
                          <OptimizedImage
                            src={post.image || "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=900&q=80"}
                            alt={post.title}
                            widths={RESOLUTION_WIDTHS.THUMB}
                            sizes="(max-width: 1024px) 40vw, 300px"
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                          />
                        </div>
                      </Link>

                      <div className="p-2">
                        {(isAmakuruCategory(post.category) && post.amakuru_department) || post.category ? (
                          <span className="news-category mb-1 block truncate font-body uppercase tracking-wider">
                            {isAmakuruCategory(post.category) && post.amakuru_department
                              ? post.amakuru_department
                              : translateCategory(post.category, language)}
                          </span>
                        ) : null}
                        <Link
                          to={post.articleHref}
                          className="news-headline-card block font-body font-bold leading-snug text-slate-900 transition-colors hover:text-red-600"
                        >
                          {post.title}
                        </Link>

                        {post.youtube_url && (
                          <a
                            href={post.youtube_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 rounded bg-red-600 px-2 py-1 font-body text-[8px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-red-700"
                          >
                            Video
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center">
                    <p className="font-body text-[10px] font-semibold text-slate-500">
                      Nta mafoto cyangwa video bihuye n'ibisubizo.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
    );
  };

  return (
    <div className="min-h-screen emotional-gradient-bg text-black flex flex-col font-body selection:bg-red-600 selection:text-white">
      <SiteSEO
        title={selectedDepartment ? `${selectedDepartment.name} - Rubavu Today` : isAmakuruPage ? "Amakuru - Rubavu Today" : undefined}
        description={selectedDepartment
          ? `Amakuru ya ${selectedDepartment.name} agezweho kuri Rubavu Today.`
          : isAmakuruPage
            ? "Amakuru yose yo mu karere ka Rubavu n'ibindi, harimo politiki, ubuzima, ikoranabuhanga n'andi mashami."
            : undefined}
        canonicalPath={isAmakuruPage
          ? selectedDepartment
            ? `/amakuru/${selectedDepartment.slug}`
            : "/amakuru"
          : "/"}
      />
      <main className="flex-grow">
        <section className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 pt-1.5 pb-1.5">
          {isAmakuruPage && <AmakuruDepartmentNav />}
          {loading ? null : error ? (
            /* Error State */
            <div className="bg-red-50 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 max-w-lg mx-auto text-center my-12">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-600 text-white mb-3 border border-black font-bold text-lg">
                !
              </div>
              <h3 className="text-xl font-black text-red-600 uppercase tracking-wide">
                Habaye ikibazo
              </h3>
              <p className="text-slate-800 font-medium mt-2 text-sm">{error}</p>
            </div>
          ) : isSearching ? (
            /* ==================== SEARCH RESULTS VIEW ==================== */
            <div className="space-y-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-black pb-4">
                <div>
                  <h2 className="news-section-heading font-masthead">
                    {language === "rw" ? "Ibyavuye mu gushakisha" : t("search")}
                  </h2>
                  <p className="mt-1 break-words text-sm text-slate-600">
                    <span className="font-semibold">"{query}"</span> — {language === "rw"
                      ? `habonetse ${sortedPosts.length} ${sortedPosts.length === 1 ? "igisubizo" : "ibisubizo"}`
                      : `${sortedPosts.length} ${sortedPosts.length === 1 ? t("result") : t("results")}`}
                  </p>
                </div>

              </div>

              {sortedPosts.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                   {displayPosts.map((post) => (
                     <PostCard key={post.id || post._id} post={post} />
                   ))}
                </div>
              ) : (
                <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-8 max-w-md mx-auto text-center my-12">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                    {t("noPostsFound")}
                  </h3>
                  <p className="text-slate-600 font-medium mt-2 text-sm">
                    {language === "rw" ? "Ongera ugerageze ukoresheje andi magambo." : t("tryAgain")}
                  </p>
                </div>
              )}
            </div>
          ) : sortedPosts.length > 0 ? (

            <div className="space-y-2">
              {!isSearching && <FeaturedStoriesLayout />}

              <SectionHeader
                title={query.trim()
                  ? (language === "rw" ? "Ibyavuye mu gushakisha" : t("search"))
                  : selectedCategory || ""}
              />

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start lg:gap-5">
                <MediaSidebar />

                <div className="min-w-0">
                  {advertisements[0] && advertisements[0].image && (
                    <div className="my-4 xs:my-5 sm:my-6 flex justify-center print:hidden">
                      <AdBanner ad={advertisements[0]} size="728x90" />
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {firstGridPosts.map((post, index) => (
                      <PostCard
                        key={post.id || post._id}
                        post={post}
                        spanColumns={
                          incompleteFinalRow
                          && !showInlineStoryTicker
                          && index === firstGridPosts.length - 1
                            ? finalCardSpan
                            : 1
                        }
                      />
                    ))}
                  </div>

                  {showInlineStoryTicker && (
                    <section
                      aria-label={language === "rw" ? "Izindi nkuru" : "More stories"}
                      className="my-3 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm sm:my-4"
                    >
                      <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5 sm:px-4">
                        <span className="h-4 w-1 rounded-full bg-[#B3261E]" />
                        <h3 className="font-masthead text-xs font-extrabold uppercase tracking-wide text-slate-800">
                          {language === "rw" ? "Izindi nkuru" : "More stories"}
                        </h3>
                        <span className="font-body text-[9px] text-slate-500">
                          {language === "rw" ? "Amakuru agezweho" : "Latest updates"}
                        </span>
                      </div>
                      <div className="home-story-viewport overflow-hidden py-2.5">
                        <div className="home-story-marquee flex w-max">
                          {[0, 1].map((copy) => (
                            <div
                              key={copy}
                              className="flex shrink-0 gap-3 pr-3"
                              aria-hidden={copy === 1 ? "true" : undefined}
                            >
                              {displayPosts
                                .slice(featuredStories.length, featuredStories.length + 8)
                                .map((story) => (
                                  <Link
                                    key={`${copy}-${story.id || story._id || story.title}`}
                                    to={getArticleUrl(story)}
                                    tabIndex={copy === 1 ? -1 : undefined}
                                    className="group flex w-[250px] items-center gap-2.5 rounded-md border border-slate-100 bg-slate-50 p-2 transition-colors hover:border-red-200 hover:bg-red-50 sm:w-[290px]"
                                  >
                                    <span className="h-14 w-[76px] shrink-0 overflow-hidden rounded bg-slate-200 sm:h-16 sm:w-[88px]">
                                      <OptimizedImage
                                        src={story.image || "/Rubavu.jpeg"}
                                        alt=""
                                        widths={RESOLUTION_WIDTHS.THUMB}
                                        sizes="88px"
                                        loading="lazy"
                                        decoding="async"
                                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                      />
                                    </span>
                                    <span className="min-w-0">
                                      <span className="line-clamp-2 font-masthead text-xs font-bold leading-snug text-slate-800 transition-colors group-hover:text-[#B3261E] sm:text-sm">
                                        {story.title}
                                      </span>
                                      {story.createdDate && (
                                        <time className="mt-1 block font-body text-[9px] text-slate-500">
                                          {formatDate(story.createdDate, language)}
                                        </time>
                                      )}
                                    </span>
                                  </Link>
                                ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  )}

                  {showInlineStoryTicker && (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {trailingGridPosts.map((post, index) => (
                        <PostCard
                          key={post.id || post._id}
                          post={post}
                          spanColumns={
                            incompleteFinalRow && index === trailingGridPosts.length - 1
                              ? finalCardSpan
                              : 1
                          }
                        />
                      ))}
                    </div>
                  )}

                  {advertisements[1] && advertisements[1].image && hasMore && (
                    <div className="my-0 flex justify-center print:hidden">
                      <AdBanner ad={advertisements[1]} size="728x90" />
                    </div>
                  )}

                  {hasMore && (
                    <div className="flex justify-center py-2">
                      <button
                        type="button"
                        onClick={handleLoadMore}
                        aria-label={language === "rw" ? "Soma andi makuru" : "Load more stories"}
                        title={language === "rw" ? "Soma andi makuru" : "Load more stories"}
                        className="grid h-10 w-10 place-items-center rounded-full border border-slate-300 bg-white text-slate-800 shadow-sm transition hover:border-red-600 hover:bg-red-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-200"
                      >
                        <ChevronDown className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (

            <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-8 max-w-md mx-auto text-center my-12">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                {t("noPostsFound")}
              </h3>
              <p className="text-slate-600 font-medium mt-2 text-sm">
                {language === "rw" ? "Nta nkuru zihari ubu. Ongera ugerageze nyuma." : t("noPostsNow")}
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Home;
