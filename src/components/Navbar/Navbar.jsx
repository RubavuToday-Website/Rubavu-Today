





import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import logo from "../../Rubavu.jpeg";

import {
  getAdvertisements,
  getPosts,
} from "../../services/api";

import SearchBar from "../SearchBar/SearchBar";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pause,
  Play,
  Radio as RadioIcon,
} from "lucide-react";
import { useRadio } from "../../context/RadioContext";
import AdBanner from "../common/AdBanner";
import OptimizedImage from "../common/OptimizedImage";
import { getArticleUrl } from "../../utils/slug";
import { formatRelativeTime } from "../../utils/time";
import { useLanguage, translateCategory } from "../../context/LanguageContext";
import { useTranslatedPosts } from "../../hooks/useTranslatedPosts";
import LanguageSelector from "../common/LanguageSelector";
import { AppDownloadButton } from "../common/AppDownloadBanner";
import { RESOLUTION_WIDTHS, getCloudinaryUrl, isCloudinaryUrl } from "../../utils/images";
import { getYouTubeEmbedUrl } from "../../utils/video";
import { getYouTubeThumbnail } from "../../utils/youtube";





export const DEPARTMENTS = [
  {
    name: "Amakuru",
    label: "Amakuru",
    icon: "ðŸ“°",
  },
  {
    name: "Ubukungu",
    label: "Ubukungu",
    icon: "ðŸ’¼",
  },
  {
    name: "Imikino",
    label: "Imikino",
    icon: "âš½",
  },
  {
    name: "Imyidagaduro",
    label: "Imyidagaduro",
    icon: "ðŸŽ­",
  },
  {
    name: "Uburezi",
    label: "Uburezi",
    icon: "ðŸŽ“",
  },
];

const normalizeDepartment = (value) => {
  const category = String(value || "").trim().toLowerCase();
  const aliases = {
    news: "Amakuru",
    amakuru: "Amakuru",
    economy: "Ubukungu",
    business: "Ubukungu",
    ubukungu: "Ubukungu",
    sports: "Imikino",
    sport: "Imikino",
    imikino: "Imikino",
    entertainment: "Imyidagaduro",
    imyidagaduro: "Imyidagaduro",
    education: "Uburezi",
    uburezi: "Uburezi",
  };

  if (aliases[category]) return aliases[category];

  return DEPARTMENTS.find(
    (department) => department.name.toLowerCase() === category
  )?.name || String(value || "").trim();
};

const getPostDepartmentLabel = (post, language) =>
  normalizeDepartment(post?.category) === "Amakuru" && post?.amakuru_department
    ? post.amakuru_department
    : translateCategory(post?.category, language);





const getPostId = (post, index = 0) =>
  post?._id ||
  post?.id ||
  `post-${index}`;

const getPostDate = (post) =>
  post?.createdDate ||
  post?.created_at ||
  post?.createdAt ||
  post?.date ||
  0;

const getTime = (post) => {
  const date = new Date(getPostDate(post));
  const time = date.getTime();

  return Number.isNaN(time) ? 0 : time;
};

export const MAX_MIXED_POSTS = 15;

/* TICKER PACING
   A breaking-news ticker should stay readable, so it only carries the
   newest headlines instead of the whole archive. The loop translates
   -50% (one full copy of the headlines), so its travel distance grows
   with the headline count; scaling the duration by the count keeps the
   visible speed constant and slow.

   The 40-headline cap matches the count the strip was originally built
   for, which keeps the doubled track comfortably wider than the
   viewport so the loop stays seamless. */
const TICKER_MAX_HEADLINES = 40;
const TICKER_SECONDS_PER_HEADLINE = 12;
const TICKER_MIN_DURATION_SECONDS = 60;

export const buildMixedPosts = (posts = []) => {
  if (!posts.length) {
    return [];
  }

  const newest = [...posts].sort((a, b) => getTime(b) - getTime(a));
  const oldest = [...posts].sort((a, b) => getTime(a) - getTime(b));

  const result = [];
  const used = new Set();

  let newestIndex = 0;
  let oldestIndex = 0;

  while (
    result.length < MAX_MIXED_POSTS &&
    (newestIndex < newest.length || oldestIndex < oldest.length)
  ) {
    if (newestIndex < newest.length && result.length < MAX_MIXED_POSTS) {
      const post = newest[newestIndex];
      const id = getPostId(post, newestIndex);
      newestIndex += 1;

      if (!used.has(id)) {
        result.push(post);
        used.add(id);
      }
    }

    if (oldestIndex < oldest.length && result.length < MAX_MIXED_POSTS) {
      const post = oldest[oldestIndex];
      const id = getPostId(post, oldestIndex);
      oldestIndex += 1;

      if (!used.has(id)) {
        result.push(post);
        used.add(id);
      }
    }
  }

  return result.slice(0, MAX_MIXED_POSTS);
};

export const buildNaturalPostOrder = (posts = []) => {
  const newest = [...posts].sort((a, b) => getTime(b) - getTime(a));
  const oldest = [...posts].sort((a, b) => getTime(a) - getTime(b));
  const result = [];
  const used = new Set();
  let newestIndex = 0;
  let oldestIndex = 0;
  let recentCount = 0;
  const getStablePostKey = (post, index) =>
    post?._id ||
    post?.id ||
    `${post?.title || "post"}-${getPostDate(post) || index}`;

  const addNext = (source, index) => {
    const post = source[index];
    if (!post) return false;

    const id = getStablePostKey(post, index);
    if (used.has(id)) return false;

    used.add(id);
    result.push(post);
    return true;
  };

  while (newestIndex < newest.length || oldestIndex < oldest.length) {
    if (recentCount < 2 && newestIndex < newest.length) {
      if (addNext(newest, newestIndex)) recentCount += 1;
      newestIndex += 1;
      continue;
    }

    if (oldestIndex < oldest.length) {
      addNext(oldest, oldestIndex);
      oldestIndex += 1;
      recentCount = 0;
      continue;
    }

    if (newestIndex < newest.length) {
      addNext(newest, newestIndex);
      newestIndex += 1;
    }
  }

  return result;
};

const preloadAdImages = (ads = []) => {
  if (
    typeof window === "undefined" ||
    typeof Image === "undefined"
  ) {
    return;
  }

  ads.forEach((ad) => {
    if (
      ad &&
      typeof ad.image === "string" &&
      ad.image.trim() !== ""
    ) {
      const image = new Image();

      image.decoding = "async";

      /* Warm the cache with the optimized derivative that the rendered
         banner will actually use - never the full-size original. */
      image.src = isCloudinaryUrl(ad.image)
        ? getCloudinaryUrl(ad.image, { width: 1280 })
        : ad.image;
    }
  });
};

const normalizeAdTargetUrl = (ad) => {
  if (!ad) {
    return "";
  }

  const candidates = [
    ad.target_url,
    ad.link,
    ad.url,
    ad.href,
  ];

  for (const candidate of candidates) {
    const value = String(candidate || "").trim();

    if (!value || value.toLowerCase() === "null" || value === "#") {
      continue;
    }

    return value;
  }

  return "";
};

const prefersReducedMotion = () => {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

const isAdCurrentlyActive = (ad) => {
  if (!ad) {
    return false;
  }

  const statusActive =
    !ad.status || String(ad.status).toLowerCase() === "active";

  if (!statusActive) {
    return false;
  }

  const today = new Date().toISOString().slice(0, 10);
  const startsInFuture = ad.start_date && String(ad.start_date).slice(0, 10) > today;
  const hasEnded = ad.end_date && String(ad.end_date).slice(0, 10) < today;

  return !startsInFuture && !hasEnded;
};





const AdCarousel = ({ ads = [] }) => {
  const [currentIndex, setCurrentIndex] =
    useState(0);

  const [failedImages, setFailedImages] =
    useState(() => new Set());

  const validAds = useMemo(() => {
    return ads.filter((ad) => {
      return (
        isAdCurrentlyActive(ad) &&
        typeof ad.image === "string" &&
        ad.image.trim() !== ""
      );
    });
  }, [ads]);

  useEffect(() => {
    preloadAdImages(validAds);
  }, [validAds]);

  useEffect(() => {
    if (
      validAds.length === 0 ||
      currentIndex >= validAds.length
    ) {
      setCurrentIndex(0);
    }
  }, [validAds.length, currentIndex]);

  const visibleAds = useMemo(() => {
    return validAds.filter((ad) => {
      const key =
        ad.id ||
        ad._id ||
        ad.image;

      return !failedImages.has(key);
    });
  }, [validAds, failedImages]);

  useEffect(() => {
    if (
      visibleAds.length > 0 &&
      currentIndex >= visibleAds.length
    ) {
      setCurrentIndex(0);
    }
  }, [visibleAds.length, currentIndex]);

  if (!visibleAds.length) {
    return null;
  }

  const safeIndex =
    currentIndex >= visibleAds.length
      ? 0
      : currentIndex;

  const handleImageError = (ad) => {
    const key =
      ad.id ||
      ad._id ||
      ad.image;

    setFailedImages((previous) => {
      const next = new Set(previous);

      next.add(key);

      return next;
    });
  };

  const renderAd = (ad, index) => {
    if (!ad) {
      return null;
    }

    const key = ad.id || ad._id || `advertisement-${index}`;
    const targetUrl = normalizeAdTargetUrl(ad);
    const title = ad.title || ad.name || "Rubavu Today";
    const reducedMotion = prefersReducedMotion();

    const content = (
      <div className="relative w-full overflow-hidden rounded-none border border-slate-200 bg-slate-100 aspect-[728/60]">
        <OptimizedImage
          src={ad.image}
          alt={title}
          widths={RESOLUTION_WIDTHS.HERO}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1100px"
          loading="eager"
          priority={index === safeIndex}
          decoding="async"
          draggable="false"
          onError={() => handleImageError(ad)}
          className="absolute inset-0 h-full w-full select-none object-cover"
          style={{
            transform: reducedMotion ? "none" : "scale(1.04)",
            animation: reducedMotion ? "none" : "ad-pan 16s ease-in-out infinite alternate",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/30 via-slate-900/10 to-slate-900/10" />
      </div>
    );

    return targetUrl ? (
      <a
        key={key}
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={title}
        className="block w-full transition-opacity duration-500"
      >
        {content}
      </a>
    ) : (
      <div key={key} className="w-full transition-opacity duration-500">
        {content}
      </div>
    );
  };

  return (
    <>
      <style>{`\n        @keyframes ad-pan {\n          0% { transform: scale(1.04) translateX(0); }\n          50% { transform: scale(1.08) translateX(-1.5%); }\n          100% { transform: scale(1.12) translateX(1.5%); }\n        }\n\n        @keyframes ad-slide-in {\n          0% { opacity: 0; transform: translateX(-16px); }\n          100% { opacity: 1; transform: translateX(0); }\n        }\n\n        @keyframes ad-fade-up {\n          0% { opacity: 0; transform: translateY(10px); }\n          100% { opacity: 1; transform: translateY(0); }\n        }\n\n        @keyframes ad-cta {\n          0% { opacity: 0; transform: scale(0.96); }\n          60% { opacity: 1; transform: scale(1.04); }\n          100% { opacity: 1; transform: scale(1); }\n        }\n      `}</style>

      <section
        aria-label="Advertisement"
        dir="ltr"
        className="relative w-full bg-white border-b-0 shadow-none mt-0 pt-0"
      >
        <div className="relative w-full overflow-hidden">
          {renderAd(visibleAds[0], 0)}
        </div>
      </section>
    </>
  );
};

const SocialLinks = ({ compact = false }) => {
  const socials = [
    {
      name: "Instagram",
      href: "https://www.instagram.com/rubavutoday/",
      color: "text-[#E1306C]",
      icon: (
        <svg
          className="h-4 w-4 fill-current"
          viewBox="0 0 24 24"
        >
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      ),
    },
    {
      name: "TikTok",
      href: "https://www.tiktok.com/@papainnocento",
      color: "text-white",
      icon: (
        <svg
          className="h-4 w-4 fill-current"
          viewBox="0 0 24 24"
        >
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
        </svg>
      ),
    },
    {
      name: "WhatsApp",
      href: "https://wa.me/250788945200",
      color: "text-[#25D366]",
      icon: (
        <svg
          className="h-4 w-4 fill-current"
          viewBox="0 0 24 24"
        >
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>
      ),
    },
    {
      name: "YouTube",
      href: "https://www.youtube.com/@ABAMUSIC-c3l",
      color: "text-[#FF0000]",
      icon: (
        <svg
          className="h-4 w-4 fill-current"
          viewBox="0 0 24 24"
        >
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
    },
  ];

  return (
    <div
      className={`flex items-center [&_svg]:h-4 [&_svg]:w-4 ${compact
        ? "gap-2"
        : "gap-2 sm:gap-3"
        }`}
    >
      {socials.map((social) => (
        <a
          key={social.name}
          href={social.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={social.name}
          className={`
            flex
            h-9
            w-9
            items-center
            justify-center
            rounded-full
            border
            border-slate-700
            bg-slate-800
            ${social.color}
            transition
            hover:scale-110
            hover:bg-slate-700
          `}
        >
          {social.icon}
        </a>
      ))}
    </div>
  );
};





const SearchIcon = () => (
  <svg
    className="h-5 w-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-4-4" />
  </svg>
);





const PORTAL_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=900&q=80";

const NewsSectionHeading = ({ title }) => (
  <div className="mb-2 border-l-[3px] border-[#B3261E] pl-2">
    <h2 className="news-section-heading !text-sm leading-tight font-post-title uppercase tracking-tight">
      {title}
    </h2>
  </div>
);

const TimeText = ({ date, className = "" }) => {
  const { language, t } = useLanguage();

  const text = formatRelativeTime(date, language, t);

  if (!text) return null;

  return (
    <time className={className} dateTime={String(date || "").trim() || undefined}>
      {text}
    </time>
  );
};

const FeaturedStory = ({ posts = [], matchedPostId, postRefs, language }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [posts.length]);

  if (!posts.length) return null;

  const post = posts[activeIndex % posts.length];
  if (!post) return null;

  const postId = getPostId(post);
  const moveFeatured = (direction) => {
    setActiveIndex((current) => (current + direction + posts.length) % posts.length);
  };

  return (
    <article
      ref={(element) => {
        if (postRefs && postId) {
          postRefs.current[postId] = element;
        }
      }}
      className={`group overflow-hidden rounded-xl bg-slate-950 shadow-lg ring-1 ring-slate-200 transition-shadow duration-300 hover:shadow-2xl ${matchedPostId === postId
        ? "ring-4 ring-yellow-300"
        : "ring-1 ring-slate-200"
        }`}
    >
      <div className="h-1.5 w-full bg-red-600" />

      <div key={postId} className={`relative ${prefersReducedMotion() ? "" : "featured-story-enter"}`}>
        <Link to={getArticleUrl(post)} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 sm:aspect-[16/9]">
          {post.image ? (
            <OptimizedImage
              src={post.image}
              alt={post.title || "Inkuru"}
              widths={RESOLUTION_WIDTHS.HERO}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1280px"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              loading="eager"
              priority
              decoding="async"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = PORTAL_FALLBACK_IMAGE;
              }}
            />
          ) : (
            <img
              src="/Rubavu.jpeg"
              alt=""
              className="h-full w-full object-cover"
              loading="eager"
              width="1280"
              height="720"
            />
          )}

        </div>
        </Link>

        {posts.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => moveFeatured(-1)}
              aria-label={language === "rw" ? "Inkuru ibanza" : "Previous featured story"}
              className="absolute left-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/60 bg-slate-950/75 text-white shadow-lg backdrop-blur-sm transition hover:bg-[#B3261E] focus:outline-none focus:ring-2 focus:ring-white sm:left-4 sm:h-12 sm:w-12"
            >
              <ChevronLeft className="h-6 w-6" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => moveFeatured(1)}
              aria-label={language === "rw" ? "Inkuru ikurikira" : "Next featured story"}
              className="absolute right-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/60 bg-slate-950/75 text-white shadow-lg backdrop-blur-sm transition hover:bg-[#B3261E] focus:outline-none focus:ring-2 focus:ring-white sm:right-4 sm:h-12 sm:w-12"
            >
              <ChevronRight className="h-6 w-6" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      <div key={`title-${postId}`} className={`bg-slate-950 px-4 py-3 sm:px-6 sm:py-4 ${prefersReducedMotion() ? "" : "featured-story-enter"}`}>
        <Link to={getArticleUrl(post)}>
          <h2 className="news-headline-featured break-words font-post-title text-2xl font-bold leading-tight tracking-tight text-white transition-colors group-hover:text-red-300 sm:text-[1.875rem]">
            {post.title}
          </h2>
        </Link>
      </div>
    </article>
  );
};

const ImportantStory = ({ post, matchedPostId, postRefs }) => {
  const { language } = useLanguage();
  if (!post) return null;

  const postId = getPostId(post);

  return (
    <article
      ref={(element) => {
        if (postRefs && postId) {
          postRefs.current[postId] = element;
        }
      }}
      className={`group flex h-full flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-colors hover:bg-slate-50 hover:shadow-md ${matchedPostId === postId
        ? "border-yellow-300 bg-yellow-50 ring-2 ring-yellow-300"
        : "border-slate-200"
        }`}
    >
      <Link
        to={getArticleUrl(post)}
        className="order-1 relative block aspect-[16/10] w-full shrink-0 overflow-hidden bg-slate-100 sm:h-[132px] sm:aspect-auto"
      >
        <div className="h-full overflow-hidden">
          {post.image ? (
            <OptimizedImage
              src={post.image}
              alt={post.title || "Inkuru"}
              widths={RESOLUTION_WIDTHS.CARD}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 300px"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = PORTAL_FALLBACK_IMAGE;
              }}
            />
          ) : (
            <img src="/Rubavu.jpeg" alt="" className="h-full w-full object-cover" loading="lazy" width="320" height="180" />
          )}
        </div>
      </Link>

      <div className="order-2 flex min-h-0 flex-1 flex-col px-2 py-2 sm:px-2.5 sm:py-2.5">
        {post.category && (
          <span className="news-category mb-1 block truncate font-body uppercase tracking-[0.14em]">
            {getPostDepartmentLabel(post, language)}
          </span>
        )}

        <Link to={getArticleUrl(post)} className="mt-1">
          <h3 className="news-headline-card line-clamp-4 break-words font-post-title text-base font-bold leading-snug tracking-tight text-balance text-slate-950 transition-colors group-hover:text-red-600 sm:text-lg">
            {post.title}
          </h3>
        </Link>

        <TimeText date={getPostDate(post)} className="news-meta mt-auto pt-2 font-body" />
      </div>

    </article>
  );
};

const CompactCard = ({ post, matchedPostId, postRefs, variant = "default" }) => {
  const { language } = useLanguage();
  if (!post) return null;

  const postId = getPostId(post);

  return (
    <article
      ref={(element) => {
        if (postRefs && postId) {
          postRefs.current[postId] = element;
        }
      }}
      className={`group flex h-full flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-colors hover:bg-slate-50 hover:shadow-md ${variant === "large" ? "min-h-[250px] sm:min-h-[280px]" : "min-h-[220px] sm:min-h-[245px]"} ${matchedPostId === postId
        ? "border-yellow-300 bg-yellow-50 ring-2 ring-yellow-300"
        : "border-slate-200"
        }`}
    >
      <Link
        to={getArticleUrl(post)}
        className={`order-1 relative block w-full shrink-0 overflow-hidden bg-slate-100 ${variant === "large" ? "aspect-[16/10] sm:h-[165px] sm:aspect-auto" : "aspect-[16/10] sm:h-[130px] sm:aspect-auto"}`}
      >
        {post.image ? (
          <OptimizedImage
            src={post.image}
            alt={post.title || "Inkuru"}
            widths={RESOLUTION_WIDTHS.THUMB}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = PORTAL_FALLBACK_IMAGE;
            }}
          />
        ) : (
          <img src="/Rubavu.jpeg" alt="" className="h-full w-full object-cover" loading="lazy" width="320" height="180" />
        )}
      </Link>

      <div className="order-2 flex min-h-0 flex-1 flex-col px-2 py-2 sm:px-2.5 sm:py-2.5">
        {post.category && (
          <span className="news-category mb-1 block truncate font-body uppercase tracking-[0.14em]">
            {getPostDepartmentLabel(post, language)}
          </span>
        )}
        <Link to={getArticleUrl(post)} className="mt-1">
          <h3 className={`news-headline-card line-clamp-4 break-words font-post-title leading-tight tracking-tight text-balance text-slate-950 transition-colors group-hover:text-red-600 ${variant === "large" ? "text-lg font-bold sm:text-xl" : "text-base font-bold sm:text-lg"}`}>
            {post.title}
          </h3>
        </Link>
        <TimeText date={getPostDate(post)} className="news-meta mt-auto pt-2 font-body uppercase tracking-wider" />
      </div>
    </article>
  );
};


const LatestWidget = ({ posts = [], postRefs }) => {
  const { t } = useLanguage();
  const latest = useMemo(
    () => [...posts].sort((a, b) => getTime(b) - getTime(a)).slice(0, 6),
    [posts]
  );

  if (!latest.length) return null;

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <h2 className="border-b border-slate-200 bg-slate-50 px-3 py-2 font-post-title text-[10px] font-black uppercase tracking-wider text-slate-800">
        {t("latestNews")}
      </h2>
      <div className="divide-y divide-slate-100">
        {latest.map((post) => {
          const postId = getPostId(post);

          return (
            <Link
              key={postId}
              to={getArticleUrl(post)}
              ref={(element) => {
                if (postRefs && postId) postRefs.current[postId] = element;
              }}
              className="group flex items-center gap-2 p-2 transition hover:bg-slate-50"
            >
              <div className="h-10 w-14 shrink-0 overflow-hidden rounded-md bg-slate-100">
                {post.image ? (
                  <OptimizedImage
                    src={post.image}
                    alt={post.title || "Inkuru"}
                    widths={RESOLUTION_WIDTHS.THUMB}
                    sizes="56px"
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = PORTAL_FALLBACK_IMAGE;
                    }}
                  />
                ) : (
                  <img
                    src="/Rubavu.jpeg"
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                    width="56"
                    height="40"
                  />
                )}
              </div>
              <div className="min-w-0">
                <h4 className="news-headline-card line-clamp-2 break-words text-[11px] font-bold leading-tight text-slate-950 transition-colors group-hover:text-red-600">
                  {post.title}
                </h4>
                <p className="mt-0.5">
                  <TimeText date={getPostDate(post)} className="news-meta font-body" />
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

const CategorySection = ({
  title,
  categoryName,
  posts,
  matchedPostId,
  postRefs,
}) => {
  const { language } = useLanguage();

  if (!posts.length) return null;

  const isEntertainment = categoryName === "Imyidagaduro";
  const isBusiness = categoryName === "Ubukungu";

  const heading = <NewsSectionHeading title={title} categoryName={categoryName} />;

  // Business: structured editorial list (numbered rows, no heavy cards).
  if (isBusiness) {
    return (
      <section>
        {heading}

        <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {posts.slice(0, 5).map((post, index) => (
            <Link
              key={getPostId(post)}
              to={getArticleUrl(post)}
              className="group flex items-center gap-3 px-3 py-2.5 transition hover:bg-slate-50"
            >
              <span
                className={`shrink-0 font-post-title text-lg font-black ${index < 3 ? "text-red-600" : "text-slate-300"
                  }`}
              >
                {String(index + 1).padStart(2, "0")}
              </span>

              <div className="min-w-0 flex-1">
                <h4 className="news-headline-card break-words text-sm font-bold leading-snug text-slate-950 transition-colors group-hover:text-red-600">
                  {post.title}
                </h4>
                <p className="news-meta mt-1 font-body">
                  {translateCategory(post.category, language)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  // Entertainment: image-driven, first story gets a large feature card.
  if (isEntertainment) {
    return (
      <section>
        {heading}

        <div className={`grid grid-cols-1 items-stretch gap-3 ${posts.length > 2 ? "sm:grid-cols-3 sm:gap-2.5" : "sm:grid-cols-2 sm:gap-2.5"}`}>
          {posts.slice(0, 4).map((post, index) => {
            const wideCard = posts.length > 2 && (index === 0 || index === 3);

            return (
              <div
                key={getPostId(post)}
                className={`h-full ${wideCard ? "sm:col-span-2" : ""}`}
              >
                <CompactCard
                  post={post}
                  variant={wideCard ? "large" : "default"}
                  matchedPostId={matchedPostId}
                  postRefs={postRefs}
                />
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section>
      {heading}

      <div className={`grid grid-cols-1 items-stretch gap-3 ${posts.length > 2 ? "sm:grid-cols-3 sm:gap-2.5" : "sm:grid-cols-2 sm:gap-2.5"}`}>
        {posts.slice(0, 3).map((post) => (
          <CompactCard
            key={getPostId(post)}
            post={post}
            matchedPostId={matchedPostId}
            postRefs={postRefs}
          />
        ))}
      </div>
    </section>
  );
};

const AdSlot = ({ ad, size = "728x90", className = "" }) => {
  if (!ad || !ad.image) return null;

  return (
    <div className={`print:hidden ${className}`}>
      <AdBanner ad={ad} size={size} />
    </div>
  );
};

/* =========================================================
   NEWS POSTS LAYOUT
========================================================= */

const NewsPostsLayout = ({
  posts = [],
  matchedPostId,
  postRefs,
  advertisements = [],
  activeCategory = "All",
}) => {
  const { language } = useLanguage();

  const sortedNewest = useMemo(
    () => [...posts].sort((a, b) => getTime(b) - getTime(a)),
    [posts]
  );

  const isFilteredView = activeCategory !== "All";

  const categorySections = isFilteredView
    ? []
    : DEPARTMENTS.map(({ name }) => ({
      name,
      title: translateCategory(name, language),
      posts: sortedNewest.filter(
        (p) => normalizeDepartment(p.category) === name
      ),
    })).filter((section) => section.posts.length > 0);
  const archiveCandidates = sortedNewest.slice(4);
  const [archiveSlideIndex, setArchiveSlideIndex] = useState(0);
  const archiveStories = archiveCandidates.length
    ? Array.from(
      { length: Math.min(4, archiveCandidates.length) },
      (_, offset) => archiveCandidates[(archiveSlideIndex + offset) % archiveCandidates.length]
    )
    : [];
  const videoPosts = sortedNewest
    .filter((post) => getYouTubeEmbedUrl(post.youtube_url))
    .slice(0, 6);
  const [selectedVideoId, setSelectedVideoId] = useState("");
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const selectedVideo = videoPosts.find((post) => getPostId(post) === selectedVideoId) || videoPosts[0];

  if (!sortedNewest.length) return null;

  const renderSidebar = () => (
    <aside className="min-w-0 lg:sticky lg:top-36 lg:col-span-4 lg:max-h-[calc(100vh-10rem)] lg:self-start lg:overflow-y-auto scrollbar-thin">
      <div className="space-y-3">
        <AdSlot ad={advertisements[3]} size="rectangle" />
        <LatestWidget posts={sortedNewest} postRefs={postRefs} />
        <AdSlot ad={advertisements[4]} size="rectangle" />
      </div>
    </aside>
  );

  /* Filtered category view (a nav link was clicked) — compact grid + sidebar. */
  if (isFilteredView) {
    return (
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <main className="min-w-0 lg:col-span-8">
          <div className="mb-4 flex items-end justify-between border-b-2 border-slate-900 pb-2.5">
            <div>
              <p className="news-category mb-1 font-body uppercase tracking-[0.2em]">
                {language === "rw" ? "Icyiciro cy'amakuru" : "News department"}
              </p>
              <h1 className="news-section-heading font-post-title uppercase tracking-tight">
                {translateCategory(activeCategory, language)}
              </h1>
            </div>
          </div>

          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sortedNewest.map((post) => (
              <React.Fragment key={getPostId(post)}>
                <CompactCard
                  post={post}
                  matchedPostId={matchedPostId}
                  postRefs={postRefs}
                />
              </React.Fragment>
            ))}
          </div>

          <AdSlot ad={advertisements[0]} size="728x90" className="mt-7" />
        </main>

        {renderSidebar()}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <main className="min-w-0 space-y-2.5 lg:col-span-8">
        {/* FEATURED NEWS */}
        <section>
          <FeaturedStory
            posts={sortedNewest}
            matchedPostId={matchedPostId}
            postRefs={postRefs}
            language={language}
          />
        </section>

        {/* OTHER RECENT STORIES */}
        <section>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-2.5 lg:grid-cols-4">
            {sortedNewest.slice(1, 5).map((post) => (
              <ImportantStory
                key={getPostId(post)}
                post={post}
                matchedPostId={matchedPostId}
                postRefs={postRefs}
              />
            ))}
          </div>
        </section>

        {/* IN-CONTENT AD */}
        <AdSlot ad={advertisements[0]} size="728x90" />

        {/* IN-CONTENT AD */}
        <AdSlot ad={advertisements[1]} size="728x90" />

        {/* CATEGORY SECTIONS */}
        <div id="home-category-sections" className="space-y-0">
          {categorySections.map((section) => (
            <CategorySection
              key={section.name}
              title={section.title}
              categoryName={section.name}
              posts={section.posts}
              matchedPostId={matchedPostId}
              postRefs={postRefs}
            />
          ))}
        </div>

        {/* PRE-FOOTER AD */}
        <AdSlot ad={advertisements[2]} size="728x90" />
        </main>

        {renderSidebar()}
      </div>

      {videoPosts.length > 0 && (
        <section className="overflow-hidden bg-[#20252B] px-5 py-7 text-white shadow-sm sm:px-8 sm:py-9 lg:px-16">
          <div className="mx-auto max-w-7xl">
            <div className="mb-5 flex items-end justify-between gap-4 sm:mb-6">
              <div>
                <p className="mb-1 font-body text-[9px] font-bold uppercase tracking-[0.2em] text-red-400">
                  {language === "rw" ? "Video & Amakuru" : "Live & Video"}
                </p>
                <h2 className="font-post-title text-xl font-extrabold leading-tight tracking-tight text-white sm:text-2xl">
                  Rubavu Today TV
                </h2>
              </div>
              <Link
                to="/media"
                className="shrink-0 font-body text-[10px] font-bold text-slate-300 transition-colors hover:text-white sm:text-xs"
              >
                {language === "rw" ? "Reba videwo →" : "Browse videos →"}
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="min-w-0 lg:col-span-7">
                <div className="overflow-hidden border border-white/10 bg-[#171B20] shadow-lg">
                  <div className="relative aspect-video overflow-hidden bg-black">
                    {isVideoPlaying && selectedVideo && getYouTubeEmbedUrl(selectedVideo.youtube_url) ? (
                      <iframe
                        src={`${getYouTubeEmbedUrl(selectedVideo.youtube_url)}&autoplay=1`}
                        title={selectedVideo.title || "Rubavu Today video"}
                        className="absolute inset-0 h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    ) : (
                      <>
                        <OptimizedImage
                          src={selectedVideo ? (getYouTubeThumbnail(selectedVideo.youtube_url) || selectedVideo.image || PORTAL_FALLBACK_IMAGE) : PORTAL_FALLBACK_IMAGE}
                          alt={selectedVideo?.title || "Rubavu Today video"}
                          widths={RESOLUTION_WIDTHS.HERO}
                          sizes="(max-width: 1024px) 100vw, 58vw"
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setIsVideoPlaying(true)}
                          aria-label={language === "rw" ? "Kina videwo" : "Play video"}
                          className="absolute inset-0 grid place-items-center bg-slate-950/15 transition hover:bg-slate-950/30 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                        >
                          <span className="grid h-14 w-14 place-items-center rounded-full bg-red-700 text-white shadow-xl transition-transform hover:scale-105 sm:h-16 sm:w-16">
                            <Play className="ml-1 h-6 w-6 fill-current sm:h-7 sm:w-7" aria-hidden="true" />
                          </span>
                        </button>
                      </>
                    )}
                  </div>
                  {selectedVideo && (
                    <div className="border-t border-white/10 px-4 py-3 sm:px-5">
                      <span className="font-body text-[9px] font-bold uppercase tracking-[0.16em] text-red-300">
                        {getPostDepartmentLabel(selectedVideo, language)}
                      </span>
                      <Link
                        to={getArticleUrl(selectedVideo)}
                        className="mt-1 block font-post-title text-base font-bold leading-snug text-white transition-colors hover:text-red-200 sm:text-lg"
                      >
                        {selectedVideo.title}
                      </Link>
                      <TimeText
                        date={getPostDate(selectedVideo)}
                        className="mt-2 block font-body text-[10px] text-slate-400"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="min-w-0 divide-y divide-white/10 border border-white/10 bg-white/[0.04] lg:col-span-5">
                {videoPosts.map((video) => {
                  const active = getPostId(video) === getPostId(selectedVideo);
                  const thumbnail = getYouTubeThumbnail(video.youtube_url) || video.image || PORTAL_FALLBACK_IMAGE;

                  return (
                    <button
                      key={getPostId(video)}
                      type="button"
                      onClick={() => {
                        setSelectedVideoId(getPostId(video));
                        setIsVideoPlaying(false);
                      }}
                      aria-pressed={active}
                      className={`group flex w-full items-center gap-3 p-3 text-left transition sm:p-3.5 ${active ? "bg-white/10" : "hover:bg-white/[0.08]"}`}
                    >
                      <span className="relative h-14 w-24 shrink-0 overflow-hidden bg-slate-800 sm:h-[68px] sm:w-28">
                        <OptimizedImage
                          src={thumbnail}
                          alt=""
                          widths={RESOLUTION_WIDTHS.THUMB}
                          sizes="112px"
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <span className="absolute inset-0 grid place-items-center bg-black/20">
                          <span className="grid h-7 w-7 place-items-center rounded-full bg-red-700 text-white">
                            <Play className="ml-0.5 h-3.5 w-3.5 fill-current" aria-hidden="true" />
                          </span>
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 block font-post-title text-xs font-bold leading-snug text-white transition-colors group-hover:text-red-200 sm:text-sm">
                          {video.title}
                        </span>
                        <TimeText
                          date={getPostDate(video)}
                          className="mt-1.5 block font-body text-[10px] text-slate-400"
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {archiveStories.length > 0 && (
        <section className="overflow-hidden bg-[#20252B] px-5 py-7 text-white shadow-sm sm:px-8 sm:py-9 lg:px-16">
          <div className="mx-auto max-w-7xl">
            <div className="mb-5 flex items-end justify-between gap-4 border-b border-white/15 pb-3 sm:mb-6">
              <div>
                <p className="mb-1 font-body text-[9px] font-bold uppercase tracking-[0.22em] text-red-400">
                  {language === "rw" ? "Ububiko" : "Archive"}
                </p>
                <h2 className="font-post-title text-xl font-extrabold leading-tight tracking-tight text-white sm:text-2xl">
                  {language === "rw" ? "Inkuru zatoranyijwe" : "Selected stories"}
                </h2>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {archiveCandidates.length > 4 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setArchiveSlideIndex((index) => (
                        index - 1 + archiveCandidates.length
                      ) % archiveCandidates.length)}
                      aria-label={language === "rw" ? "Inkuru zabanje" : "Previous stories"}
                      className="grid h-8 w-8 place-items-center rounded-full border border-white/20 text-slate-200 transition hover:border-white hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-300"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setArchiveSlideIndex((index) => (
                        index + 1
                      ) % archiveCandidates.length)}
                      aria-label={language === "rw" ? "Inkuru zikurikira" : "Next stories"}
                      className="grid h-8 w-8 place-items-center rounded-full border border-white/20 text-slate-200 transition hover:border-white hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-300"
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
              {archiveStories.map((post) => (
                <Link
                  key={getPostId(post)}
                  to={getArticleUrl(post)}
                  className="group min-w-0 animate-[homeMediaSlideUp_420ms_cubic-bezier(0.2,0.7,0.2,1)_both]"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-800">
                    <OptimizedImage
                      src={post.image || PORTAL_FALLBACK_IMAGE}
                      alt={post.title || "Rubavu Today news"}
                      widths={RESOLUTION_WIDTHS.CARD}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent opacity-70 transition-opacity group-hover:opacity-100" />
                  </div>

                  <div className="pt-3">
                    <span className="font-body text-[9px] font-bold uppercase tracking-[0.16em] text-red-300">
                      {getPostDepartmentLabel(post, language)}
                    </span>
                    <h3 className="mt-1 line-clamp-3 font-post-title text-sm font-bold leading-snug text-white transition-colors group-hover:text-red-200 sm:text-base">
                      {post.title}
                    </h3>
                    <TimeText
                      date={getPostDate(post)}
                      className="mt-2 block font-body text-[10px] text-slate-400"
                    />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

/* =========================================================
   NAVBAR
========================================================= */

const Navbar = ({ showHomeContent = true }) => {
  const { language, t } = useLanguage();
  const {
    queue: radioQueue,
    currentItem: radioItem,
    isPlaying: radioIsPlaying,
    isLoading: radioIsLoading,
    togglePlay: toggleRadio,
    playItem: playRadioItem,
  } = useRadio();

  const radioIsLive = Boolean(radioItem || radioQueue.length);
  const radioPlayableItem = radioItem || radioQueue[0];

  const handleRadioPlay = () => {
    if (radioItem) {
      toggleRadio();
    } else if (radioPlayableItem) {
      playRadioItem(radioPlayableItem);
    }
  };

  const [
    isMenuOpen,
    setIsMenuOpen,
  ] = useState(false);

  const [
    isMobileSearchOpen,
    setIsMobileSearchOpen,
  ] = useState(false);

  const [
    isRadioMenuOpen,
    setIsRadioMenuOpen,
  ] = useState(false);

  const [
    activeCategory,
    setActiveCategory,
  ] = useState("All");

  const [
    posts,
    setPosts,
  ] = useState([]);

  const translatedPosts = useTranslatedPosts(posts);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    advertisements,
    setAdvertisements,
  ] = useState([]);

  const [
    currentTime,
    setCurrentTime,
  ] = useState(new Date());

  const navigate =
    useNavigate();

  const location =
    useLocation();

  const isHomePage = location.pathname === "/";

  const params = useMemo(
    () =>
      new URLSearchParams(
        location.search
      ),
    [location.search]
  );

  /* Apply active news category coming from the URL (e.g. footer category links). */
  useEffect(() => {
    const category = params.get(
      "category"
    );

    if (location.pathname === "/amakuru" || location.pathname.startsWith("/amakuru/")) {
      setActiveCategory("Amakuru");
      return;
    }

    if (
      category &&
      DEPARTMENTS.some(
        (department) =>
          department.name ===
          category
      )
    ) {
      setActiveCategory(
        category
      );
    } else {
      setActiveCategory(
        "All"
      );
    }
  }, [location.pathname, params]);

  const [
    searchValue,
    setSearchValue,
  ] = useState("");

  const [
    searchHistory,
    setSearchHistory,
  ] = useState([]);

  const [
    isLoadingSearch,
    setIsLoadingSearch,
  ] = useState(false);

  const postRefs =
    useRef({});

  /* =====================================================
     CLOCK
  ===================================================== */

  useEffect(() => {
    const interval = setInterval(
      () => {
        setCurrentTime(
          new Date()
        );
      },
      1000
    );

    return () =>
      clearInterval(interval);
  }, []);

  /* =====================================================
     SEARCH URL
   ===================================================== */

  useEffect(() => {
    setSearchValue(
      params.get("q") || ""
    );
  }, [params]);

  /* =====================================================
     SEARCH HISTORY
  ===================================================== */

  useEffect(() => {
    try {
      const saved =
        window.localStorage.getItem(
          "rt.searchHistory"
        );

      if (saved) {
        const parsed =
          JSON.parse(saved);

        setSearchHistory(
          Array.isArray(parsed)
            ? parsed
            : []
        );
      } else {
        setSearchHistory([]);
      }
    } catch {
      setSearchHistory([]);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "rt.searchHistory",
        JSON.stringify(
          searchHistory.slice(
            0,
            10
          )
        )
      );
    } catch {
      // Ignore localStorage errors.
    }
  }, [searchHistory]);

  /* =====================================================
     LOAD POSTS
  ===================================================== */

  useEffect(() => {
    let mounted = true;

    const loadPosts =
      async () => {
        setLoading(true);

        try {
          const data =
            await getPosts();

          if (mounted) {
            setPosts(
              Array.isArray(data)
                ? data
                : []
            );
          }
        } catch (error) {
          console.error(
            "Ntibyashobotse kubona amakuru:",
            error
          );

          if (mounted) {
            setPosts([]);
          }
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      };

    loadPosts();

    return () => {
      mounted = false;
    };
  }, []);

  /* =====================================================
     LOAD ADS
  ===================================================== */

  useEffect(() => {
    let mounted = true;

    const loadAds =
      async () => {
        try {
          const data =
            await getAdvertisements();

          if (!mounted) {
            return;
          }

          const activeAds =
            Array.isArray(data)
              ? data.filter((ad) => {
                return (
                  isAdCurrentlyActive(ad) &&
                  typeof ad.image ===
                  "string" &&
                  ad.image.trim() !==
                  ""
                );
              })
              : [];

          setAdvertisements(
            activeAds
          );

          preloadAdImages(
            activeAds
          );
        } catch (error) {
          console.error(
            "Kwamamaza ntikwashoboye kuboneka:",
            error
          );
        }
      };

    loadAds();

    return () => {
      mounted = false;
    };
  }, []);

  /* =====================================================
     NAV LINKS
  ===================================================== */

  const links = useMemo(
    () => [
      {
        label: t("home"),
        category: "All",
      },
      ...DEPARTMENTS.map(
        (department) => ({
          label: translateCategory(department.name, language),
          category: department.name,
        })
      ),
    ],
    [language, t]
  );

  /* =====================================================
     FILTER
  ===================================================== */

  const filteredPosts =
    useMemo(() => {
      if (
        activeCategory ===
        "All"
      ) {
        return posts;
      }

      return posts.filter(
        (post) =>
          normalizeDepartment(post.category) ===
          activeCategory
      );
    }, [
      posts,
      activeCategory,
    ]);

  /* =====================================================
     SORT
  ===================================================== */

  const sortedPosts =
    useMemo(() => {
      return buildNaturalPostOrder(filteredPosts);
    }, [filteredPosts]);

  /* translated display posts (matched by id) */
  const displayPosts =
    useMemo(() => {
      const translatedMap = new Map(
        translatedPosts.map((p) => [getPostId(p), p])
      );

      return sortedPosts.map((post) => {
        const translated = translatedMap.get(getPostId(post));
        return translated || post;
      });
    }, [sortedPosts, translatedPosts]);

  /* =====================================================
     SEARCH MATCH
  ===================================================== */

  const matchedPostId =
    useMemo(() => {
      const query =
        (searchValue || "")
          .trim()
          .toLowerCase();

      if (!query) {
        return null;
      }

      const found =
        sortedPosts.find(
          (post) =>
            [
              post.title,
              post.category,
            ]
              .filter(Boolean)
              .some((value) =>
                String(value)
                  .toLowerCase()
                  .includes(query)
              )
        );

      return found
        ? getPostId(found)
        : null;
    }, [
      sortedPosts,
      searchValue,
    ]);

  /* =====================================================
     SCROLL TO SEARCH RESULT
  ===================================================== */

  useEffect(() => {
    if (!matchedPostId) {
      return undefined;
    }

    const found =
      sortedPosts.find(
        (post) =>
          getPostId(post) ===
          matchedPostId
      );

    if (found) {
      setActiveCategory(
        found.category ||
        "All"
      );
    }

    const timer =
      setTimeout(() => {
        const element =
          postRefs.current[
          matchedPostId
          ];

        if (
          element &&
          typeof element.scrollIntoView ===
          "function"
        ) {
          element.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }, 150);

    return () =>
      clearTimeout(timer);
  }, [
    matchedPostId,
    sortedPosts,
  ]);

  /* =====================================================
     SEARCH DEBOUNCE
  ===================================================== */

  useEffect(() => {
    const value =
      (searchValue || "").trim();

    setIsLoadingSearch(
      Boolean(value)
    );

    const timeout =
      setTimeout(() => {
        setIsLoadingSearch(
          false
        );

        const next =
          new URLSearchParams(
            location.search
          );

        if (value) {
          next.set("q", value);
        } else {
          next.delete("q");
        }

        const nextSearch =
          next.toString();

        const currentSearch =
          location.search.replace(
            /^\?/,
            ""
          );

        if (
          nextSearch !==
          currentSearch
        ) {
          navigate(
            {
              search:
                nextSearch,
            },
            {
              replace: true,
            }
          );
        }

        if (value.length > 2) {
          setSearchHistory(
            (previous) => {
              const updated = [
                value,
                ...previous.filter(
                  (item) =>
                    item !== value
                ),
              ];

              return updated.slice(
                0,
                10
              );
            }
          );
        }
      }, 300);

    return () =>
      clearTimeout(timeout);
  }, [
    searchValue,
    location.search,
    navigate,
  ]);

  /* =====================================================
     DATE
  ===================================================== */

  const todayLabel =
    currentTime.toLocaleDateString(
      language === "fr" ? "fr-FR" : language === "sw" ? "sw-KE" : language === "en" ? "en-US" : "rw-RW",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );

  const timeLabel =
    currentTime.toLocaleTimeString(
      language === "fr" ? "fr-FR" : language === "sw" ? "sw-KE" : language === "en" ? "en-US" : "rw-RW",
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }
    );

  /* =====================================================
     TICKER
  ===================================================== */

  const tickerHeadlines =
    useMemo(
      () =>
        [
          ...displayPosts
        ]
          .sort(
            (a, b) =>
              getTime(b) -
              getTime(a)
          )
          .map(
            (post) =>
              post.title
          )
          .filter(Boolean)
          .filter(
            (title, index, all) =>
              all.indexOf(title) === index
          )
          .slice(
            0,
            TICKER_MAX_HEADLINES
          ),
      [displayPosts]
    );

  /* Keep a steady, readable pace: the loop distance grows with the number
     of headlines, so the duration is scaled to hold roughly the same
     seconds-per-headline no matter how many articles the archive holds. */
  const tickerDurationSeconds =
    Math.max(
      tickerHeadlines.length *
        TICKER_SECONDS_PER_HEADLINE,
      TICKER_MIN_DURATION_SECONDS
    );

  /* =====================================================
     NAVIGATION
  ===================================================== */

  const handleNavClick =
    (category) => {
      setActiveCategory(
        category
      );

      setIsMenuOpen(false);

      setIsMobileSearchOpen(
        false
      );

      const nextSearch =
        category === "All"
          ? ""
          : `?category=${encodeURIComponent(category)}`;

      navigate(
        {
          pathname: category === "Amakuru" ? "/amakuru" : "/",
          search: category === "Amakuru" ? "" : nextSearch,
        },
        {
          replace: true,
        }
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    };

  const radioDropdown = isRadioMenuOpen && (
    <div className="absolute right-0 top-full z-50 mt-1 w-[min(86vw,160px)] rounded-lg border border-slate-700 bg-slate-950 p-2 text-white shadow-xl">
      <div className="flex items-center">
        <button
          type="button"
          onClick={handleRadioPlay}
          disabled={!radioPlayableItem || radioIsLoading}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={radioIsPlaying ? "Pause radio" : "Play radio"}
        >
          {radioIsLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : radioIsPlaying ? <Pause className="h-3 w-3 fill-current" /> : <Play className="ml-0.5 h-3 w-3 fill-current" />}
          {radioIsPlaying ? "Pause radio" : "Play radio"}
        </button>
      </div>
    </div>
  );

  const radioControl = (
    <div className="relative flex items-center gap-1">
      <Link
        to="/radio"
        aria-label="RubavuToday Radio"
        title="RubavuToday Radio"
        className={`flex h-8 w-8 items-center justify-center gap-1.5 px-0 py-0 font-body text-[11px] font-black uppercase tracking-[0.1em] transition sm:h-auto sm:w-auto sm:px-3 sm:py-2 ${radioIsLive ? "bg-red-600 text-white hover:bg-red-700" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}
      >
        <RadioIcon className={`h-3.5 w-3.5 ${radioIsLive ? "text-red-200" : "text-slate-400"}`} />
        <span className="hidden sm:inline">RubavuToday Radio</span>
      </Link>
      <button
        type="button"
        onClick={() => setIsRadioMenuOpen((previous) => !previous)}
        aria-expanded={isRadioMenuOpen}
        aria-label="Radio playback controls"
        title="Radio playback controls"
        className="grid h-8 w-8 place-items-center text-slate-300 transition hover:bg-slate-800 hover:text-white"
      >
        {radioIsLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : radioIsPlaying ? (
          <Pause className="h-4 w-4 fill-current" />
        ) : (
          <Play className="ml-0.5 h-4 w-4 fill-current" />
        )}
      </button>
      {radioDropdown}
    </div>
  );

  /* =====================================================
     PAGE

     No full-screen preloader here on purpose: the spinning logo blocked the
     first paint and delayed the page for every visitor. The header logo below
     stays, and any in-flight request falls back to the small inline skeletons
     and spinners already used further down.
     ===================================================== */

  return (
    <div className={`${showHomeContent ? "min-h-screen" : ""} bg-slate-50 text-slate-900`}>
      <style>{`
        @keyframes portal-rise {
          from {
            opacity: 0;
            transform: translateY(10px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        









        .navbar-search-input,
        .navbar-search-input input,
        input.navbar-search-input,
        textarea.navbar-search-input {
          color: #000000 !important;
          -webkit-text-fill-color: #000000 !important;
          caret-color: #000000 !important;
        }

        .navbar-search-input::placeholder,
        .navbar-search-input input::placeholder,
        input.navbar-search-input::placeholder {
          color: #64748b !important;
          -webkit-text-fill-color: #64748b !important;
          opacity: 1 !important;
        }

      `}</style>



      <div className="relative z-50 border-b border-slate-800 bg-slate-950 font-body text-slate-300">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1 text-[9px] uppercase tracking-[0.1em] sm:px-8 sm:text-[10px]">
          <span className="truncate">
            Rubavu Today — {todayLabel}
          </span>

          <div className="ml-2 flex shrink-0 items-center gap-2">
            <span className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-yellow-400">
              {timeLabel}
            </span>

            <span className="hidden font-semibold text-white md:inline">
              {language === "rw" ? "Amakuru yizewe, igihe cyose" : t("trustedNews")}
            </span>

            <LanguageSelector variant="dark" />
          </div>
        </div>
      </div>



      {showHomeContent && tickerHeadlines.length > 0 && (
        <div className="relative z-30 flex overflow-hidden border-b border-red-700 bg-red-600 font-body text-[10px] font-semibold text-white">
          <div className="z-10 flex shrink-0 items-center gap-2 bg-black px-2 py-0.5 font-bold uppercase tracking-wider">
            <span className="h-2 w-2 animate-ping rounded-full bg-red-500" />

            <span className="hidden sm:inline">
              {language === "rw" ? "Amakuru agezweho:" : t("breakingNews")}
            </span>

            <span className="sm:hidden">
              {language === "rw" ? "LIVE" : "LIVE"}
            </span>
          </div>

          <div className="relative flex w-full overflow-hidden whitespace-nowrap py-0.5">
            <div
              className="rubavu-ticker-scroll"
              style={
                {
                  "--rubavu-ticker-duration": `${tickerDurationSeconds}s`,
                  willChange: "transform",
                }
              }
            >
              {tickerHeadlines.map(
                (
                  title,
                  index
                ) => (
                  <span
                    key={`ticker1-${index}`}
                    className="mx-8 inline-flex items-center"
                  >
                    {title}
                  </span>
                )
              )}

              {tickerHeadlines.map(
                (
                  title,
                  index
                ) => (
                  <span
                    key={`ticker2-${index}`}
                    className="mx-8 inline-flex items-center"
                  >
                    {title}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      )}



      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950 text-white shadow-xl">
        <div className="relative mx-auto flex h-[56px] max-w-7xl items-center justify-center px-3 sm:h-[68px] sm:px-8 lg:h-[72px] lg:px-16">



          <div className="absolute left-2 flex items-center sm:left-6 lg:left-10">
            <button
              type="button"
              aria-label="Shakisha"
              onClick={() =>
                setIsMobileSearchOpen(
                  (previous) =>
                    !previous
                )
              }
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-200 transition hover:bg-slate-800 sm:hidden"
            >
              <SearchIcon />
            </button>

            <div className="hidden sm:block sm:w-[240px] md:w-[290px] lg:w-[350px] navbar-search-input">
              <SearchBar
                value={
                  searchValue
                }
                onChange={
                  setSearchValue
                }
                searchHistory={
                  searchHistory
                }
                onSelectHistory={(
                  value
                ) =>
                  setSearchValue(
                    value
                  )
                }
                isLoading={
                  isLoadingSearch
                }
              />
            </div>
          </div>



          <button
            type="button"
            onClick={() =>
              handleNavClick(
                "All"
              )
            }
            aria-label="Rubavu Today Ahabanza"
            className="group absolute left-1/2 right-auto flex max-w-[calc(100%-8rem)] -translate-x-1/2 items-center justify-center gap-1 outline-none max-[310px]:left-12 max-[310px]:right-32 max-[310px]:translate-x-0 sm:static sm:w-auto sm:max-w-none sm:translate-x-0 sm:gap-3"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-red-600 bg-white shadow-xl transition duration-300 group-hover:scale-105 sm:h-10 sm:w-10 md:h-11 md:w-11">
              <img
                src={logo}
                alt="Rubavu Today"
                className="h-full w-full object-cover"
              />
            </div>

            <span className="min-w-0 flex-1 break-words text-center font-post-title text-[11px] font-black leading-tight text-white sm:flex-none sm:whitespace-nowrap sm:text-lg md:text-xl lg:text-2xl">
              Rubavu Today
            </span>
          </button>



          <div className="absolute right-3 hidden flex-col items-end gap-3 sm:flex sm:right-6 lg:right-10">
            <SocialLinks />
          </div>



          <div className="absolute right-2 flex items-center gap-0 sm:hidden">
            {!isHomePage && radioControl}
            <button
              type="button"
              onClick={() =>
                setIsMenuOpen(
                  (previous) =>
                    !previous
                )
              }
              aria-label="Ibice"
              aria-expanded={
                isMenuOpen
              }
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900 font-body text-sm font-bold text-slate-200 transition hover:bg-slate-800"
            >
              <span aria-hidden="true">☰</span>
            </button>
          </div>
        </div>



        {isMobileSearchOpen && (
          <div className="border-t border-slate-800 bg-slate-900 px-3 py-3 sm:hidden navbar-search-input">
            <SearchBar
              value={
                searchValue
              }
              onChange={
                setSearchValue
              }
              searchHistory={
                searchHistory
              }
              onSelectHistory={(
                value
              ) => {
                setSearchValue(
                  value
                );

                setIsMobileSearchOpen(
                  false
                );
              }}
              isLoading={
                isLoadingSearch
              }
            />
          </div>
        )}



        <div className="border-t border-slate-800 bg-slate-950">



          <div className="mx-auto hidden max-w-7xl items-center justify-center lg:flex">
            <div className="flex items-center gap-1 rounded-none border-x border-slate-800 bg-slate-950">
              <Link
                to="/media"
                className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 font-body text-[10px] font-black uppercase tracking-[0.1em] text-white transition hover:bg-red-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
                  <path d="M4.5 4.5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h8.25a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3H4.5ZM19.94 18.75l-2.44-2.44V7.69l2.44-2.44a1.5 1.5 0 0 1 2.56 1.06v11.38a1.5 1.5 0 0 1-2.56 1.06Z" />
                </svg>
                PHOTOS & VIDEOS
              </Link>
              {links.map(
                (link) => {
                  const active =
                    activeCategory ===
                    link.category;

                  return (
                    <button
                      key={
                        link.label
                      }
                      type="button"
                      onClick={() =>
                        handleNavClick(
                          link.category
                        )
                      }
                      className={`
                        px-3
                        py-1.5
                        font-body
                        text-[11px]
                        font-bold
                        uppercase
                        tracking-[0.1em]
                        transition
                        ${active
                          ? "bg-white text-slate-950"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        }
                      `}
                    >
                      {
                        link.label
                      }
                    </button>
                  );
                }
              )}
              {!isHomePage && radioControl}
              <AppDownloadButton className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 font-body text-[10px] font-black uppercase tracking-wide text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
          </div>



          <div className="hidden justify-center md:flex lg:hidden">
            <div className="flex max-w-full items-center gap-1 overflow-x-auto px-2">
              <Link
                to="/media"
                className="flex shrink-0 items-center gap-1 bg-slate-950 px-3 py-1.5 font-body text-[9px] font-black uppercase tracking-[0.1em] text-white transition hover:bg-red-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
                  <path d="M4.5 4.5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h8.25a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3H4.5ZM19.94 18.75l-2.44-2.44V7.69l2.44-2.44a1.5 1.5 0 0 1 2.56 1.06v11.38a1.5 1.5 0 0 1-2.56 1.06Z" />
                </svg>
                PHOTOS & VIDEOS
              </Link>
              {links.map(
                (link) => {
                  const active =
                    activeCategory ===
                    link.category;

                  return (
                    <button
                      key={
                        link.label
                      }
                      type="button"
                      onClick={() =>
                        handleNavClick(
                          link.category
                        )
                      }
                      className={`
                        shrink-0
                        px-2.5
                        py-1.5
                        font-body
                        text-[10px]
                        font-bold
                        uppercase
                        ${active
                          ? "bg-white text-slate-950"
                          : "text-slate-300"
                        }
                      `}
                    >
                      {
                        link.label
                      }
                    </button>
                  );
                }
              )}
              {!isHomePage && radioControl}
              <AppDownloadButton className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 font-body text-[10px] font-black uppercase tracking-wide text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
          </div>



          {isMenuOpen && (
            <div className="border-t border-slate-800 bg-slate-900 px-4 py-4 shadow-2xl sm:hidden">
              <div className="mb-4">
                <p className="mb-2 font-body text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  {language === "rw" ? "Ibice by'amakuru" : t("categories")}
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/media"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center justify-center gap-1 rounded-lg border border-red-600 bg-red-600 px-3 py-3 text-left font-body text-xs font-black uppercase tracking-wide text-white transition hover:bg-red-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                      <path d="M4.5 4.5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h8.25a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3H4.5ZM19.94 18.75l-2.44-2.44V7.69l2.44-2.44a1.5 1.5 0 0 1 2.56 1.06v11.38a1.5 1.5 0 0 1-2.56 1.06Z" />
                    </svg>
                    PHOTOS & VIDEOS
                  </Link>
                  {links.map(
                    (link) => {
                      const active =
                        activeCategory ===
                        link.category;

                      return (
                        <button
                          key={
                            link.label
                          }
                          type="button"
                          onClick={() =>
                            handleNavClick(
                              link.category
                            )
                          }
                          className={`
                            rounded-lg
                            border
                            px-3
                            py-3
                            text-left
                            font-body
                            text-xs
                            font-bold
                            uppercase
                            transition
                            ${active
                              ? "border-red-600 bg-red-600 text-white"
                              : "border-slate-700 bg-slate-800 text-slate-300"
                            }
                          `}
                        >
                          {
                            link.label
                          }
                        </button>
                      );
                    }
                  )}
                  {!isHomePage && <div className="col-span-2">{radioControl}</div>}
                  <div className="col-span-2">
                    <AppDownloadButton className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500 bg-red-600 px-3 py-3 text-xs font-black uppercase tracking-wide text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400" />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4">
                <p className="mb-3 font-body text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  {language === "rw" ? "Dukurikire kuri" : t("followUs")}
                </p>

                <SocialLinks compact />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Full-width Advertisement Section - spans the full viewport */}
      {showHomeContent && advertisements.length > 0 && (
        <div className="relative left-1/2 z-10 w-[100vw] -ml-[50vw] border-b border-slate-100 bg-white">
          <div className="mx-auto w-full max-w-[1800px]">
            <AdCarousel ads={advertisements} />
          </div>
        </div>
      )}

      {showHomeContent && (
        <>
          <main className="home-news-layout relative z-20 mx-auto w-full max-w-7xl px-0 pb-2 pt-4 sm:pb-3">
            <div className="px-4 pt-3 sm:px-8 sm:pt-4 lg:px-16">
              {loading ? null : sortedPosts.length ===
                0 ? (
                <div className="py-20 text-center font-body text-slate-500">
                  {language === "rw" ? "Nta makuru aboneka muri iki cyiciro." : t("noPostsInCategory")}
                </div>
              ) : (
                <NewsPostsLayout
                  posts={
                    displayPosts
                  }
                  matchedPostId={
                    matchedPostId
                  }
                  postRefs={
                    postRefs
                  }
                  advertisements={
                    advertisements
                  }
                  activeCategory={
                    activeCategory
                  }
                />
              )}
            </div>
          </main>
        </>
      )}


    </div>
  );
};

export default Navbar;
