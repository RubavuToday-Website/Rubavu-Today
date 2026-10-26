import React, { useState } from "react";
import { Link } from "react-router-dom";
import { getArticleUrl } from "../../utils/slug";
import { useLanguage } from "../../context/LanguageContext";
import AuthorProfilePopup, {
  PROFILE_POPUP_EVENT,
  getAuthorKey,
} from "../common/AuthorProfilePopup";
import OptimizedImage from "../common/OptimizedImage";
import { RESOLUTION_WIDTHS } from "../../utils/images";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=900&q=80";

const PostCard = ({ post }) => {
  const [copied, setCopied] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { language, t } = useLanguage();

  const locale = language === "fr" ? "fr-FR" : language === "sw" ? "sw-KE" : language === "en" ? "en-US" : "rw-RW";

  const published = post?.createdDate
    ? new Date(post.createdDate).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
    : t("today");


  const calculateReadTime = (text) => {
    if (!text) return t("readTimeMin").replace("{count}", "1");
    const words = text.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return t("readTimeMin").replace("{count}", String(minutes));
  };

  const contentText = post?.summary || post?.description || "";
  const readTime = calculateReadTime(contentText);
  const authorName =
    post?.Author ||
    (typeof post?.author === "object"
      ? post.author.name
      : post?.author) ||
    "Rubavu Today";
  const authorProfileImage =
    post?.author_profile_image ||
    (typeof post?.author === "object"
      ? post.author.profile_image
      : null) ||
    null;
  const author =
    typeof post?.author === "object"
      ? { ...post.author, profile_image: authorProfileImage }
      : {
        name: authorName,
        role: post?.author_role || post?.role || "unknown",
        profile_image: authorProfileImage,
      };

  const toggleProfile = () => {
    const nextOpen = !profileOpen;

    if (nextOpen) {
      document.dispatchEvent(
        new CustomEvent(PROFILE_POPUP_EVENT, {
          detail: getAuthorKey(author),
        })
      );
    }

    setProfileOpen(nextOpen);
  };

  const getPostSlugPath = (entry) => getArticleUrl(entry);

  const handleShare = async (e) => {
    e.preventDefault();
    const postUrl = `${window.location.origin}${getPostSlugPath(post)}`;

    const title = post?.title || "Rubavu Today";
    const shareText = `${title}\n\n${postUrl}`;

    const shareData = {
      title,
      text: shareText,
      url: postUrl,
    };

    if (post?.image) {
      try {
        const response = await fetch(post.image);
        const blob = await response.blob();
        const file = new File([blob], "rubavu-today.jpg", { type: "image/jpeg" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          shareData.files = [file];
        }
      } catch (err) {
        // fallback: share without image
      }
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // user cancelled
      }
    } else {
      navigator.clipboard.writeText(postUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <article className="post-card-mobile group grid min-w-0 grid-cols-[38%_minmax(0,1fr)] overflow-hidden rounded-lg border border-[#E5E3DC] bg-white shadow-sm transition hover:border-[#D8D5CC] hover:shadow-md sm:flex sm:flex-col">
      <div className="contents sm:block">
        <Link
          to={getPostSlugPath(post)}
          className="relative block min-h-[148px] overflow-hidden bg-[#F1EFE8] sm:aspect-[16/10] sm:min-h-0"
        >
          <OptimizedImage
            src={post.image || FALLBACK_IMAGE}
            alt={post.title}
            widths={RESOLUTION_WIDTHS.CARD}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 400px"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = FALLBACK_IMAGE;
            }}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {post.category && (
            <span className="news-category news-category-inverse absolute left-1.5 top-1.5 bg-[#B3261E] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-white shadow-sm sm:left-2.5 sm:top-2.5 sm:px-2 sm:tracking-[0.12em]">
              {post.category}
            </span>
          )}
        </Link>

        <div className="min-w-0 p-2.5 sm:p-4 lg:p-5">
          <div className="news-meta mb-1.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 uppercase tracking-wider text-[#888780] sm:mb-2 sm:gap-2">
            <time>{published}</time>
            <span aria-hidden="true">•</span>
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 lowercase text-[9px] text-slate-700 sm:px-2 sm:text-xs">{readTime}</span>
            <span className="relative flex min-w-0 items-center gap-1">
              <button
                type="button"
                onClick={toggleProfile}
                className="flex min-w-0 items-center gap-1 rounded-full text-left transition hover:text-[#B3261E]"
                aria-expanded={profileOpen}
              >
                {authorProfileImage ? (
                  <img
                    src={authorProfileImage}
                    alt=""
                    className="h-3.5 w-3.5 flex-shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full bg-red-600 text-[8px] font-bold text-white">
                    {authorName.trim().charAt(0).toUpperCase() || "A"}
                  </span>
                )}
                <span className="max-w-[72px] truncate sm:max-w-[100px]" title={authorName}>{authorName}</span>
              </button>
              <AuthorProfilePopup
                author={author}
                open={profileOpen}
                onClose={() => setProfileOpen(false)}
              />
            </span>
          </div>

          <Link to={getPostSlugPath(post)}>
            <h2 className="news-headline-card mt-1 line-clamp-3 break-words font-masthead text-sm font-extrabold leading-snug text-[#161616] transition group-hover:text-[#B3261E] sm:text-lg">
              {post.title}
            </h2>
          </Link>

          <p className="news-summary mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#5F5E5A] sm:mt-2 sm:text-sm">
            {contentText}
          </p>
        </div>
      </div>

      <div className="col-span-2 flex min-w-0 items-center justify-between gap-2 border-t border-[#E5E3DC] bg-[#FAFAF7] px-2.5 py-2 text-[10px] sm:px-4 sm:py-3 sm:text-xs lg:px-5">
        <Link
          to={getPostSlugPath(post)}
          className="shrink-0 font-bold uppercase tracking-wider text-[#161616] transition hover:text-[#B3261E]"
        >
          Read More →
        </Link>

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="text-[#888780]" title={t("views")}>👁 {post.views || 0}</span>
          <button
            type="button"
            onClick={handleShare}
            className="truncate text-slate-600 transition hover:text-red-600"
            title={t("shareCode")}
          >
            {copied ? t("copied") : `🔗 ${t("shareCode")}`}
          </button>
        </div>
      </div>
    </article>
  );
};

export default PostCard;