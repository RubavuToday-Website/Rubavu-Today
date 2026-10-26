import React, { useEffect, useMemo, useRef, useState } from "react";
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
import {
  filterAmakuruPosts,
  getAmakuruDepartmentBySlug,
  isAmakuruCategory,
} from "../utils/amakuruDepartments";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";


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
  const [mediaSearch, setMediaSearch] = useState("");
  const amakuruRailRef = useRef(null);
  const archiveRailRef = useRef(null);
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

    setQuery(nextQuery);
    setVisibleCount(16);
  }, [location.search, location.pathname]);

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

  const featuredStories = displayPosts.slice(0, 5);

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

  const allPostSearchResults = useMemo(() => {
    const term = mediaSearch.trim().toLowerCase();
    if (!term) return [];

    return [...posts]
      .filter((post) => {
        const searchableText = [
          post.title,
          post.summary,
          post.description,
          post.content,
          post.category,
          post.amakuru_department,
          post.tags,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(term);
      })
      .sort((a, b) => new Date(b.createdDate || 0) - new Date(a.createdDate || 0))
      .map((post) => ({
        ...post,
        articleHref: getArticleUrl(post),
      }));
  }, [posts, mediaSearch]);
  const mediaCarouselPosts = mediaPosts.length >= 3 ? mediaPosts : sidebarPosts;
  const activeMediaSlideIndex = mediaCarouselPosts.length
    ? mediaSlideIndex % mediaCarouselPosts.length
    : 0;

  useEffect(() => {
    if (mediaCarouselPosts.length < 2) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const timer = window.setInterval(() => {
      setMediaSlideIndex((index) => (index + 1) % mediaCarouselPosts.length);
    }, 8000);

    return () => window.clearInterval(timer);
  }, [mediaCarouselPosts.length]);

  const isSearching = query.trim().length > 0;
  const visiblePostCount = Math.min(
    sortedPosts.length,
    featuredStories.length
      + Math.ceil(Math.max(0, visibleCount - featuredStories.length) / postGridColumns) * postGridColumns
  );
  const visiblePosts = displayPosts.slice(0, visiblePostCount);
  const archiveStories = displayPosts.slice(visiblePostCount);
  const gridPosts = visiblePosts.slice(featuredStories.length);
  const hasMore = sortedPosts.length > visiblePostCount;

  const scrollPostRail = (railRef, direction) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: direction * rail.clientWidth, behavior: "smooth" });
  };

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

    return (
      <section
        aria-label={language === "rw" ? "Inkuru z'ingenzi" : "Featured stories"}
        className="mb-6 overflow-hidden bg-white"
      >
        <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[1.45fr_1fr] lg:gap-5">
          <Link
            to={getArticleUrl(leadStory)}
            className="group block min-w-0 overflow-hidden border-t-4 border-[#B3261E] bg-white"
          >
            <div className="aspect-[16/10] overflow-hidden bg-slate-100 lg:aspect-[16/9]">
              <OptimizedImage
                src={leadStory.image || "/Rubavu.jpeg"}
                alt={leadStory.title || ""}
                widths={RESOLUTION_WIDTHS.HERO}
                sizes="(max-width: 1024px) 100vw, 58vw"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              />
            </div>
            <div className="pt-3">
              {leadCategory && (
                <span className="mb-1 block font-body text-[9px] font-bold uppercase tracking-[0.14em] text-[#B3261E]">
                  {leadCategory}
                </span>
              )}
              <h3 className="max-w-3xl font-masthead text-lg font-extrabold leading-snug tracking-tight text-slate-900 transition-colors group-hover:text-[#B3261E] sm:text-xl">
                {leadStory.title}
              </h3>
              {leadStory.createdDate && (
                <time className="mt-2 block font-body text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  {formatDate(leadStory.createdDate, language)}
                </time>
              )}
            </div>
          </Link>

          <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-4">
            {featuredStories.slice(1, 5).map((story) => {
              const label = isAmakuruCategory(story.category) && story.amakuru_department
                ? story.amakuru_department
                : translateCategory(story.category, language);

              return (
                <Link
                  key={story.id || story._id || story.title}
                  to={getArticleUrl(story)}
                  className="group min-w-0"
                >
                  <span className="mb-2 block aspect-[16/10] overflow-hidden bg-slate-100">
                    <OptimizedImage
                      src={story.image || "/Rubavu.jpeg"}
                      alt=""
                      widths={RESOLUTION_WIDTHS.CARD}
                      sizes="(max-width: 1024px) 50vw, 20vw"
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </span>
                  <span className="block min-w-0">
                    {label && (
                      <span className="mb-1 block truncate font-body text-[8px] font-bold uppercase tracking-[0.12em] text-[#B3261E]">
                        {label}
                      </span>
                    )}
                    <span className="line-clamp-3 block font-masthead text-xs font-bold leading-snug text-slate-900 transition-colors group-hover:text-[#B3261E] sm:text-[13px]">
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
        </div>
      </section>
    );
  };

  const MediaSidebar = () => {
    const sourcePosts = mediaCarouselPosts;
    const visibleMediaPosts = sourcePosts.length
      ? Array.from(
        { length: Math.min(3, sourcePosts.length) },
        (_, offset) => sourcePosts[(activeMediaSlideIndex + offset) % sourcePosts.length]
      )
      : [];

    return (
      <aside className="w-full">
        <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm sm:p-2.5">
          <div className="flex w-full items-center rounded-md border border-slate-900 bg-slate-950 px-2.5 py-1.5 font-body text-[8px] font-black uppercase tracking-[0.14em] text-white shadow-sm sm:px-3 sm:py-2 sm:text-[10px] sm:tracking-[0.16em]">
            PHOTOS &amp; VIDEOS
          </div>

            <div className="mt-2">
              <div role="search" className="mb-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm transition focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100 sm:px-3">
                <Search size={15} aria-hidden="true" className="shrink-0 text-slate-400" />
                <label htmlFor="sidebar-post-search" className="sr-only">
                  {language === "rw" ? "Shakisha inkuru zose" : "Search all posts"}
                </label>
                <input
                  id="sidebar-post-search"
                  type="search"
                  value={mediaSearch}
                  onChange={(e) => setMediaSearch(e.target.value)}
                  placeholder={language === "rw" ? "Shakisha inkuru zose..." : "Search all posts..."}
                  aria-controls="sidebar-post-search-results"
                  className="min-w-0 flex-1 border-0 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />
                {mediaSearch && (
                  <button
                    type="button"
                    onClick={() => setMediaSearch("")}
                    aria-label={language === "rw" ? "Siba amagambo yo gushakisha" : "Clear search"}
                    className="grid h-6 w-6 shrink-0 place-items-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-200"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                )}
              </div>

              {mediaSearch.trim() ? (
                <div
                  id="sidebar-post-search-results"
                  className="max-h-80 overflow-y-auto rounded-md border border-slate-200 bg-white"
                >
                  <p className="border-b border-slate-100 px-2.5 py-2 font-body text-[9px] font-semibold text-slate-500" aria-live="polite">
                    {allPostSearchResults.length} {language === "rw" ? "ibyabonetse" : "results"}
                  </p>
                  {allPostSearchResults.length > 0 ? (
                    <ul className="divide-y divide-slate-100">
                      {allPostSearchResults.map((post) => (
                        <li key={post.id || post._id || post.title}>
                          <Link
                            to={post.articleHref}
                            className="block px-2.5 py-2 transition hover:bg-red-50 focus:bg-red-50 focus:outline-none"
                          >
                            {post.category && (
                              <span className="mb-0.5 block truncate font-body text-[8px] font-bold uppercase tracking-wider text-red-700">
                                {translateCategory(post.category, language)}
                              </span>
                            )}
                            <span className="line-clamp-2 font-body text-xs font-semibold leading-snug text-slate-800">
                              {post.title}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-2.5 py-3 font-body text-[10px] text-slate-500">
                      {language === "rw" ? "Nta nkuru zihuye n'ayo magambo." : "No matching posts found."}
                    </p>
                  )}
                </div>
              ) : (
                <>
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

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {visibleMediaPosts.length > 0 ? (
                  visibleMediaPosts.map((post, index) => (
                    <div
                      key={`${post.id || post._id || post.title}-${activeMediaSlideIndex}`}
                      className="home-media-slide-up flex h-24 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm sm:h-28"
                      style={{ animationDelay: `${index * 70}ms` }}
                    >
                      <Link to={post.articleHref} className="block h-full w-24 shrink-0 overflow-hidden bg-slate-100 sm:w-28">
                        <div className="h-full overflow-hidden">
                          <OptimizedImage
                            src={post.image || "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=900&q=80"}
                            alt={post.title}
                            widths={RESOLUTION_WIDTHS.THUMB}
                            sizes="112px"
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                          />
                        </div>
                      </Link>

                      <div className="flex min-w-0 flex-1 flex-col justify-center p-2">
                        {(isAmakuruCategory(post.category) && post.amakuru_department) || post.category ? (
                          <span className="news-category mb-1 block truncate font-body uppercase tracking-wider">
                            {isAmakuruCategory(post.category) && post.amakuru_department
                              ? post.amakuru_department
                              : translateCategory(post.category, language)}
                          </span>
                        ) : null}
                        <Link
                          to={post.articleHref}
                          className="news-headline-card line-clamp-3 block font-body text-[11px] font-bold leading-snug text-slate-900 transition-colors hover:text-red-600"
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
                </>
              )}
            </div>
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
        <section className="max-w-7xl mx-auto px-4 xs:px-6 sm:px-8 pt-6 pb-1.5 sm:pt-8">
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
              {!isSearching && (
                <FeaturedStoriesLayout />
              )}

              <SectionHeader
                title={query.trim()
                  ? (language === "rw" ? "Ibyavuye mu gushakisha" : t("search"))
                  : selectedCategory || ""}
              />

              <div className="space-y-4">
                <div className="min-w-0">
                  {advertisements[0] && advertisements[0].image && (
                    <div className="my-4 xs:my-5 sm:my-6 flex justify-center print:hidden">
                      <AdBanner ad={advertisements[0]} size="728x90" />
                    </div>
                  )}

                  {gridPosts.length > 0 && (
                    <section
                      aria-label={language === "rw" ? "Amakuru" : "News"}
                      className="mb-4"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <h2 className="font-masthead text-sm font-extrabold uppercase tracking-tight text-slate-900">
                          {language === "rw" ? "Amakuru" : "News"}
                        </h2>
                        {gridPosts.length > 1 && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => scrollPostRail(amakuruRailRef, -1)}
                              aria-label={language === "rw" ? "Subira ku makuru abanza" : "Previous news posts"}
                              className="grid h-7 w-7 place-items-center rounded-full border border-slate-300 bg-white text-slate-600 transition hover:border-red-500 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-200"
                            >
                              <ChevronLeft size={15} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => scrollPostRail(amakuruRailRef, 1)}
                              aria-label={language === "rw" ? "Jya ku makuru akurikira" : "Next news posts"}
                              className="grid h-7 w-7 place-items-center rounded-full border border-slate-300 bg-white text-slate-600 transition hover:border-red-500 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-200"
                            >
                              <ChevronRight size={15} aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div
                        ref={amakuruRailRef}
                        className="flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                      >
                        {gridPosts.map((post) => (
                          <div
                            key={post.id || post._id}
                            className="w-[88%] shrink-0 snap-start sm:w-[calc((100%-0.5rem)/2)] lg:w-[calc((100%-1.5rem)/4)]"
                          >
                            <PostCard post={post} />
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {advertisements[1] && advertisements[1].image && hasMore && (
                    <div className="my-0 flex justify-center print:hidden">
                      <AdBanner ad={advertisements[1]} size="728x90" />
                    </div>
                  )}

                  {archiveStories.length > 0 && (
                    <section
                      aria-label={language === "rw" ? "Izindi nkuru" : "More stories"}
                      className="overflow-hidden bg-slate-950 px-3 py-4 text-white sm:px-5 sm:py-5"
                    >
                      <div className="mb-3 flex items-end justify-between gap-3 border-b border-slate-700 pb-2">
                        <div>
                          <p className="font-body text-[9px] font-bold uppercase tracking-[0.16em] text-red-400">
                            {language === "rw" ? "Amakuru" : "News archive"}
                          </p>
                          <h2 className="font-masthead text-base font-extrabold sm:text-lg">
                            {language === "rw" ? "Izindi nkuru" : "More stories"}
                          </h2>
                        </div>
                        {archiveStories.length > 1 && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => scrollPostRail(archiveRailRef, -1)}
                              aria-label={language === "rw" ? "Subira ku nkuru zabanje" : "Previous more stories"}
                              className="grid h-7 w-7 place-items-center rounded-full border border-slate-700 text-slate-300 transition hover:border-red-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-400"
                            >
                              <ChevronLeft size={15} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => scrollPostRail(archiveRailRef, 1)}
                              aria-label={language === "rw" ? "Jya ku zindi nkuru" : "Next more stories"}
                              className="grid h-7 w-7 place-items-center rounded-full border border-slate-700 text-slate-300 transition hover:border-red-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-400"
                            >
                              <ChevronRight size={15} aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div
                        ref={archiveRailRef}
                        className="flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                      >
                        {archiveStories.map((story) => (
                          <Link
                            key={story.id || story._id || story.title}
                            to={getArticleUrl(story)}
                            className="group relative aspect-[4/3] w-[88%] shrink-0 snap-start overflow-hidden bg-slate-800 sm:w-[calc((100%-0.5rem)/2)] lg:w-[calc((100%-1.5rem)/4)]"
                          >
                            <OptimizedImage
                              src={story.image || "/Rubavu.jpeg"}
                              alt={story.title || ""}
                              widths={RESOLUTION_WIDTHS.CARD}
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                              loading="lazy"
                              decoding="async"
                              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <span className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
                            <span className="absolute inset-x-0 bottom-0 p-3">
                              {story.category && (
                                <span className="mb-1 block truncate font-body text-[8px] font-bold uppercase tracking-wider text-red-300">
                                  {translateCategory(story.category, language)}
                                </span>
                              )}
                              <span className="line-clamp-3 font-masthead text-sm font-bold leading-snug text-white transition-colors group-hover:text-red-100">
                                {story.title}
                              </span>
                            </span>
                          </Link>
                        ))}
                      </div>
                    </section>
                  )}

                </div>
                <MediaSidebar />
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
