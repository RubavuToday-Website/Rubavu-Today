import React, { useEffect, useState, useRef, useMemo } from "react";
import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import {
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import rubavuLogo from "../Rubavu.jpeg";
import { API_ROOT as API_URL, getPostById, getPostBySlug, getPosts, getNextArticle, formatAuthorName, getPostAuthorNickname, commitCommentReaction } from "../services/api";
import { ArticleSEO } from "../components/SEO/SEO";
import ArticleRenderer from "../components/article/ArticleRenderer";
import YouTubeEmbeds from "../components/article/YouTubeEmbeds";
import ReadingTools from "../components/article/ReadingTools";
import ArticleReactions from "../components/article/ArticleReactions";
import { getPostSlug, getArticleUrl } from "../utils/slug";
import { formatRelativeTime } from "../utils/time";
import { getYouTubeEmbedUrl } from "../utils/video";
import { useLanguage, translateCategory } from "../context/LanguageContext";
import { useTranslatedPosts } from "../hooks/useTranslatedPosts";
import OptimizedImage from "../components/common/OptimizedImage";
import { RESOLUTION_WIDTHS, isCloudinaryUrl } from "../utils/images";
import { isAmakuruCategory, getAmakuruDepartmentSlug } from "../utils/amakuruDepartments";
import AuthorProfilePopup, {
  PROFILE_POPUP_EVENT,
  getAuthorKey,
} from "../components/common/AuthorProfilePopup";

const TimeLabel = ({ date, className = "" }) => {
  const { language, t } = useLanguage();

  const text = formatRelativeTime(date, language, t);

  if (!text) return null;

  return (
    <time className={className} dateTime={date ? String(date) : undefined}>
      {text}
    </time>
  );
};

const StoryCategoryLabel = ({ post, language }) => {
  const isDepartmentPost = isAmakuruCategory(post?.category) && post?.amakuru_department;

  return (
    <span
      className={isDepartmentPost
        ? "inline-flex w-fit max-w-full items-center rounded bg-[#B3261E] px-2 py-1 font-body text-[9px] font-bold uppercase tracking-wider text-white sm:text-[10px]"
        : "news-category font-body uppercase tracking-wider"}
    >
      {isDepartmentPost ? post.amakuru_department : translateCategory(post?.category, language)}
    </span>
  );
};

export default function PostDetails() {
  const { id, slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { language, t, translateMany } = useLanguage();

  const [post, setPost] = useState(null);
  const [originalPost, setOriginalPost] = useState(null);
  const [originalAllPosts, setOriginalAllPosts] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [commentStatus, setCommentStatus] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [translatedContent, setTranslatedContent] = useState({
    title: "",
    summary: "",
    paragraphs: [],
    blocks: [],
  });

  // "Soma Andi Makuru" — the next published article in reading order
  // (newest -> oldest), resolved by the server so every approved
  // article stays reachable no matter how large the archive grows.
  const [nextArticle, setNextArticle] = useState(null);
  const [nextLoading, setNextLoading] = useState(true);
  const [nextError, setNextError] = useState("");

  const translatedAllPosts = useTranslatedPosts(allPosts);
  const translatedNextArticleList = useTranslatedPosts(
    nextArticle ? [nextArticle] : []
  );
  const displayNextArticle = translatedNextArticleList[0] || nextArticle;

  const [name, setName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyName, setReplyName] = useState("");

  const [reactions, setReactions] = useState(() => {
    try {
      const stored = localStorage.getItem("rubavu_comment_reactions");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const getDeviceId = () => {
    let id = localStorage.getItem("rubavu_device_id");
    if (!id) {
      id = (
        "dv-" +
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2, 12)
      );
      localStorage.setItem("rubavu_device_id", id);
    }
    return id;
  };
  const myDeviceId = getDeviceId();

  const persistReactions = (next) => {
    setReactions(next);
    localStorage.setItem(
      "rubavu_comment_reactions",
      JSON.stringify(next)
    );
  };

  const applyCommentReaction = (comment, commentId, action) => {
    if (!commentId) return comment;
    const previous = comment.my_reaction || null;
    const nextAction =
      previous === action ? null : action;

    let likes = comment.likes || 0;
    let dislikes = comment.dislikes || 0;

    if (previous === "like") likes -= 1;
    if (previous === "dislike") dislikes -= 1;
    if (nextAction === "like") likes += 1;
    if (nextAction === "dislike") dislikes += 1;

    return {
      ...comment,
      likes: Math.max(0, likes),
      dislikes: Math.max(0, dislikes),
      my_reaction: nextAction,
    };
  };

  const handleCommentReaction = async (commentId, action, e) => {
    if (e) e.stopPropagation();
    if (!commentId) return;

    const comment = comments.find((c) => c.id === commentId);
    const previous = comment?.my_reaction || null;
    const nextAction = previous === action ? null : action;
    const optimistic = applyCommentReaction(
      comment,
      commentId,
      action
    );

    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? optimistic : c))
    );

    const nextReactions = {
      ...reactions,
      [commentId]: nextAction,
    };
    persistReactions(nextReactions);

    try {
      const result = await commitCommentReaction(
        commentId,
        nextAction || "none",
        myDeviceId
      );
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? {
              ...c,
              likes: result.likes,
              dislikes: result.dislikes,
              my_reaction: result.my_reaction,
            }
            : c
        )
      );
    } catch (error) {
      const rollback = {
        ...reactions,
        [commentId]: previous,
      };
      persistReactions(rollback);
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? {
              ...c,
              likes: comment.likes || 0,
              dislikes: comment.dislikes || 0,
              my_reaction: previous,
            }
            : c
        )
      );
    }
  };


  const imageContainerRef = useRef(null);
  const relatedStoriesRef = useRef(null);
  const moreStoriesRef = useRef(null);
  const moreStoriesSectionRef = useRef(null);

  const scrollStories = (storiesRef, direction) => {
    const rail = storiesRef.current;
    if (!rail) return;

    const card = rail.querySelector("[data-story-card]");
    const distance = card
      ? card.getBoundingClientRect().width + 16
      : rail.clientWidth * 0.8;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    rail.scrollBy({
      left: distance * direction,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  };






  useEffect(() => {
    let cancelled = false;

    const loadArticle = async () => {
      setLoading(true);
      setError("");

      try {
        const numericId = /^\d+$/.test(String(id || "").trim())
          ? String(id).trim()
          : null;

        const pathnameSlug = location.pathname
          .split("/")
          .filter(Boolean)
          .pop() || "";
        const rawSlug = slug || pathnameSlug;
        let slugValue = String(rawSlug || "")
          .replace(/\.html$/i, "")
          .trim()
          .replace(/\/+$/, "");

        try {
          slugValue = decodeURIComponent(slugValue);
        } catch {
          // Keep the original route value when a malformed URL is supplied.
        }

        let postData = null;

        getPosts()
          .then((list) => {
            if (cancelled) return;
            const posts = Array.isArray(list) ? list : [];
            setOriginalAllPosts(posts);
            setAllPosts(posts);
          })
          .catch(() => { });

        if (numericId) {
          postData = await getPostById(numericId);
          if (cancelled) return;

          if (!postData) {
            setPost(null);
            setComments([]);
            setLoading(false);
            return;
          }

          const canonicalSlug = getPostSlug(postData);
          if (canonicalSlug && canonicalSlug !== slugValue) {
            navigate(`/${canonicalSlug}.html`, { replace: true });
          }
        }

        if (slugValue && !numericId) {
          postData = await getPostBySlug(slugValue);
          if (cancelled) return;
        }

        if (cancelled) return;

        if (!postData) {
          setPost(null);
          setComments([]);
          setLoading(false);
          setError("Iyi nkuru ntiyabonetse cyangwa ntikiri hanze.");
          return;
        }

        setOriginalPost(postData);
        setPost(postData);
        setError("");
        setLoading(false);

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });

        const postId = postData.id ?? postData._id;

        let commentsData = [];
        try {
          const commentsRes = await fetch(
            `${API_URL}/api/comments/${postId}?device_id=${encodeURIComponent(
              myDeviceId
            )}`
          );
          if (commentsRes.ok) {
            commentsData = await commentsRes.json();
          }
        } catch (commentsError) {
          console.warn("Comments could not be loaded:", commentsError);
        }

        if (cancelled) return;

        const commentList = Array.isArray(commentsData)
          ? commentsData
          : [];
        setComments(commentList);

        const merged = { ...reactions };
        commentList.forEach((c) => {
          if (c.my_reaction) {
            merged[String(c.id)] = c.my_reaction;
          }
        });
        persistReactions(merged);

      } catch (err) {
        console.error("Ikibazo mu gushaka amakuru:", err);

        if (cancelled) return;

        setComments([]);
        setLoading(false);
        setError(
          "Habaye ikibazo mu kohereza inkuru. Ongera ugerageze."
        );
      }
    };

    loadArticle();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, slug, location.pathname, reloadKey]);





  useEffect(() => {
    // Single-language site: the original article and its related posts are
    // shown as-is (translation system removed).
    if (originalPost) {
      setPost(originalPost);
    }
    setAllPosts(originalAllPosts);
  }, [originalPost, originalAllPosts]);



  // Resolve the next published article for the "Soma Andi Makuru" button.
  // The server walks the whole archive, so this stays correct even when the
  // current article is far outside the cached home-page feed.
  useEffect(() => {
    const currentId = post?.id ?? post?._id ?? null;
    const currentSlug = getPostSlug(post) || "";

    if (!currentId && !currentSlug) {
      setNextArticle(null);
      setNextLoading(false);
      return;
    }

    let cancelled = false;

    setNextLoading(true);
    setNextError("");

    getNextArticle({ id: currentId, slug: currentId ? "" : currentSlug })
      .then((result) => {
        if (cancelled) return;
        setNextArticle(result?.post || null);
        setNextError("");
      })
      .catch(() => {
        if (cancelled) return;
        setNextArticle(null);
        setNextError(
          language === "rw"
            ? "Hari ikibazo cyo kugaragaza inkuru ikurikira."
            : "We could not load the next article."
        );
      })
      .finally(() => {
        if (cancelled) return;
        setNextLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.id, post?._id, post?.slug]);



  const getImageUrl = (image) => {
    if (!image) return null;

    const value = String(image).trim();

    if (/^https?:\/\//i.test(value)) {
      const https = value.replace(/^http:\/\//i, "https://");

      /* Leave Cloudinary URLs untouched here: OptimizedImage applies the
         responsive f_auto/q_auto/width transformations on render. */
      if (isCloudinaryUrl(https)) {
        return https;
      }

      return https;
    }

    if (value.startsWith("/")) {
      return `${API_URL}${value}`;
    }

    if (value.startsWith("uploads/")) {
      return `${API_URL}/${value}`;
    }

    return `${API_URL}/uploads/${value}`;
  };



  const parsePostImages = (value) => {
    if (!value) return [];

    if (Array.isArray(value)) {
      return value.filter(Boolean);
    }

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



  const galleryImages = useMemo(() => {
    const list = parsePostImages(post?.images);

    return list.filter(
      (url) => String(url).trim() !== String(post?.image || "").trim()
    );
  }, [post]);



  const inlineParagraphs = useMemo(() => {
    return String(post?.description || "")
      .split(/\n{2,}/)
      .map((part) => part.replace(/\s+/g, " ").trim())
      .filter(Boolean);
  }, [post]);



  const contentBlocks = useMemo(() => {
    if (!post?.content_blocks) return [];

    try {
      const parsed = JSON.parse(post.content_blocks);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [post]);

  useEffect(() => {
    if (!post || language === "rw") {
      setTranslatedContent({ title: "", summary: "", paragraphs: [], blocks: [] });
      return undefined;
    }

    let cancelled = false;
    const summaryText =
      post.summary && post.summary !== post.description ? post.summary : "";

    /* Every readable field of a block travels in one batch so the
       paragraph text, its caption and its alt text all follow the
       language the reader selected. Non-text slots are sent as empty
       strings to keep the index mapping stable. */
    const blockFields = contentBlocks.map((block) => ({
      text:
        block && ["paragraph", "heading", "quote"].includes(block.type)
          ? String(block.text || "")
          : "",
      caption: block ? String(block.caption || "") : "",
      alt: block ? String(block.alt || "") : "",
    }));
    const blockPayload = blockFields.flatMap((field) => [
      field.text,
      field.caption,
      field.alt,
    ]);

    Promise.all([
      translateMany([post.title || "", summaryText]),
      translateMany(inlineParagraphs),
      translateMany(blockPayload),
    ])
      .then(([meta, paragraphs, blockValues]) => {
        if (cancelled) return;
        setTranslatedContent({
          title: meta[0] || "",
          summary: meta[1] || "",
          paragraphs,
          blocks: blockFields.map((field, index) => ({
            text: blockValues[index * 3] || field.text,
            caption: blockValues[index * 3 + 1] || field.caption,
            alt: blockValues[index * 3 + 2] || field.alt,
          })),
        });
      })
      .catch(() => {
        if (!cancelled) {
          setTranslatedContent({ title: "", summary: "", paragraphs: [], blocks: [] });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [post, language, translateMany, inlineParagraphs, contentBlocks]);

  const displayTitle = translatedContent.title || post?.title || "";
  const displaySummary =
    translatedContent.summary ||
    (post?.summary && post.summary !== post.description ? post.summary : "");

  const displayParagraphs = useMemo(() => {
    if (language === "rw") return inlineParagraphs;
    if (translatedContent.paragraphs.length !== inlineParagraphs.length) {
      return inlineParagraphs;
    }
    return translatedContent.paragraphs;
  }, [language, inlineParagraphs, translatedContent.paragraphs]);

  const displayBlocks = useMemo(() => {
    if (language === "rw") return contentBlocks;
    if (translatedContent.blocks.length !== contentBlocks.length) {
      return contentBlocks;
    }
    return contentBlocks.map((block, index) => {
      const translated = translatedContent.blocks[index];
      if (!translated) return block;
      return {
        ...block,
        text: translated.text || block.text,
        caption: translated.caption || block.caption,
        alt: translated.alt || block.alt,
      };
    });
  }, [language, contentBlocks, translatedContent.blocks]);

  const youtubeEmbedUrls = useMemo(() => {
    if (!post) return [];

    const list = Array.isArray(post.youtube_urls) ? post.youtube_urls : [];
    const fallback = post.youtube_url ? [post.youtube_url] : [];

    return Array.from(
      new Set(
        [...list, ...fallback]
          .map((value) => String(value || "").trim())
          .filter(Boolean)
      )
    ).slice(0, 2);
  }, [post]);

  const videoSourceUrl = useMemo(() => {
    const videoBlock = contentBlocks.find(
      (block) =>
        block &&
        block.type === "video" &&
        block.url &&
        String(block.url).trim() &&
        !getYouTubeEmbedUrl(block.url)
    );

    return videoBlock ? String(videoBlock.url).trim() : "";
  }, [contentBlocks]);

  const articleBlocks = useMemo(() => {
    const count = displayParagraphs.length;
    const galleryCount = galleryImages.length;

    if (galleryCount === 0) {
      return displayParagraphs.map((text) => ({ type: "p", text }));
    }

    const blocks = [];
    let inserted = 0;

    displayParagraphs.forEach((text, index) => {
      blocks.push({ type: "p", text });

      const target = Math.floor(((index + 1) * galleryCount) / count);

      while (inserted < target) {
        blocks.push({ type: "image", url: galleryImages[inserted], num: inserted + 1 });
        inserted += 1;
      }
    });

    while (inserted < galleryCount) {
      blocks.push({ type: "image", url: galleryImages[inserted], num: inserted + 1 });
      inserted += 1;
    }

    return blocks;
  }, [galleryImages, displayParagraphs]);

  const articlePlainText = useMemo(() => {
    const parts = [];

    if (displayBlocks.length > 0) {
      displayBlocks.forEach((block) => {
        if (!block) return;
        if (
          ["paragraph", "heading", "quote"].includes(block.type) &&
          String(block.text || "").trim()
        ) {
          parts.push(String(block.text).trim());
        }
      });
    } else {
      displayParagraphs.forEach((text) => {
        if (String(text || "").trim()) parts.push(String(text).trim());
      });
    }

    if (parts.length === 0 && String(post?.description || "").trim()) {
      parts.push(
        String(post.description).replace(/\s+/g, " ").trim()
      );
    }

    return parts.join(" ");
  }, [displayBlocks, displayParagraphs, post]);





  const triggerWatermarkedDownload = (imageUrl) => {
    const source = imageUrl || post?.image;

    if (!source) return;

    const imgUrl = getImageUrl(source);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const imageObj = new Image();

    imageObj.crossOrigin = "anonymous";
    imageObj.src = imgUrl;

    imageObj.onload = () => {
      canvas.width = imageObj.naturalWidth;
      canvas.height = imageObj.naturalHeight;

      ctx.drawImage(imageObj, 0, 0);

      const link = document.createElement("a");

      link.download = `${post.title
        ? post.title.replace(/[^a-zA-Z0-9]/g, "_")
        : "rubavu-today"
        }.jpg`;

      link.href = canvas.toDataURL("image/jpeg", 0.9);

      link.click();
    };
  };

  const handleImageContextMenu = (e) => {
    e.preventDefault();
    triggerWatermarkedDownload();
  };



  const handleGalleryContextMenu = (url) => (e) => {
    e.preventDefault();
    triggerWatermarkedDownload(url);
  };











  // Open any related post in full using its title-based slug URL (e.g. /slug.html).
  const openPostFull = (p) => (e) => {
    if (e) e.preventDefault();
    const url = getArticleUrl(p);
    if (url && url !== "/") {
      navigate(url);
    }
  };

  const getAuthorName = (p) => {
    if (!p) return "Unknown Author";

    if (
      typeof p.Author === "string" &&
      p.Author.trim() !== ""
    ) {
      return p.Author.trim();
    }

    if (
      typeof p.author === "string" &&
      p.author.trim() !== ""
    ) {
      return p.author.trim();
    }

    if (
      p.author &&
      typeof p.author === "object"
    ) {
      return (
        p.author.name ||
        p.author.username ||
        p.author.full_name ||
        p.author.email ||
        "Unknown Author"
      );
    }

    return (
      p.user_name ||
      p.username ||
      p.postedBy ||
      p.authorName ||
      p.author_name ||
      p.full_name ||
      "Staff Member"
    );
  };

  const isPostByAdmin = (p) => {
    const authorName = getAuthorName(p).toLowerCase();

    const role = (
      p.role ||
      p.user_role ||
      p.type ||
      ""
    ).toLowerCase();

    const userObjRole =
      p.author &&
        typeof p.author === "object"
        ? (p.author.role || "").toLowerCase()
        : "";

    return (
      role === "admin" ||
      userObjRole === "admin" ||
      authorName.includes("admin") ||
      authorName === "rubavutoday" ||
      p.is_admin === true ||
      p.isAdmin === true
    );
  };

  const authorPosts = useMemo(() => {
    if (!post || !Array.isArray(translatedAllPosts) || translatedAllPosts.length === 0) {
      return [];
    }

    const currentIsAdmin = isPostByAdmin(post);
    const currentAuthorKey = currentIsAdmin
      ? "admin"
      : getAuthorName(post).trim().toLowerCase();

    const currentId = post.id ?? post._id;
    const currentSlug = getPostSlug(post);

    return translatedAllPosts
      .filter((candidate) => {
        if (!candidate) return false;

        const candidateId = candidate.id ?? candidate._id;
        const candidateSlug = getPostSlug(candidate);

        const isCurrent =
          (currentId &&
            candidateId &&
            String(candidateId) === String(currentId)) ||
          (currentSlug && candidateSlug === currentSlug);

        if (isCurrent) return false;

        const key = isPostByAdmin(candidate)
          ? "admin"
          : getAuthorName(candidate).trim().toLowerCase();

        return key === currentAuthorKey;
      })
      .map((candidate) => {
        const candidateDate =
          candidate.createdDate ||
          candidate.created_at ||
          candidate.createdAt ||
          candidate.date;

        return {
          id: candidate.id ?? candidate._id ?? getPostSlug(candidate),
          title: candidate.title || "Untitled",
          url: getArticleUrl(candidate),
          category: translateCategory(candidate.category, language),
          dateLabel: formatRelativeTime(candidateDate, language, t),
          image: candidate.image ? getImageUrl(candidate.image) : null,
        };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translatedAllPosts, post, language, t]);

  useEffect(() => {
    setProfileOpen(false);
  }, [post?.id, post?._id, post?.slug]);

  const handleCommentSubmit = async (
    e,
    parentId = null
  ) => {
    e.preventDefault();

    const currentName = parentId
      ? replyName
      : name;

    const currentText = parentId
      ? replyText
      : commentText;

    if (!currentName || !currentText) {
      setCommentStatus("Andika amazina n'igitekerezo mbere yo kohereza.");
      return;
    }

    setCommentStatus("Ohereza igitekerezo...");

    try {
      const res = await fetch(
        `${API_URL}/api/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            post_id: post?._id || post?.id || id || slug,
            name: currentName,
            comment: currentText,
            parent_id: parentId,
          }),
        }
      );

      const newComment = await res.json();

      if (res.ok) {
        setComments((prev) => [
          ...prev,
          newComment,
        ]);

        if (parentId) {
          setReplyingTo(null);
          setReplyText("");
          setReplyName("");
        } else {
          setName("");
          setCommentText("");
        }
        setCommentStatus("Igitekerezo cyawe cyoherejwe.");
      } else {
        setCommentStatus(newComment?.error || "Igitekerezo nticyoherejwe.");
      }
    } catch (error) {
      setCommentStatus("Habaye ikibazo. Ongera ugerageze.");
      console.error(
        "Ikibazo mu kohereza igitekerezo:",
        error
      );
    }
  };





  const sortedOthers = useMemo(() => {
    const currentId = String(post?._id || post?.id || "");
    const others = translatedAllPosts.filter(
      (p) => String(p._id || p.id || "") !== currentId
    );

    return [...others].sort((a, b) => {
      const timeA = new Date(
        a.createdDate || a.created_at || a.createdAt || a.date || 0
      ).getTime();
      const timeB = new Date(
        b.createdDate || b.created_at || b.createdAt || b.date || 0
      ).getTime();

      return timeB - timeA;
    });
  }, [translatedAllPosts, post]);

  const relatedPosts = useMemo(() => {
    const currentDepartment = String(post?.amakuru_department || "").trim().toLowerCase();
    const currentCategory = String(post?.category || "").toLowerCase();
    const sameDepartment = isAmakuruCategory(post?.category) && currentDepartment
      ? sortedOthers.filter(
        (p) =>
          isAmakuruCategory(p.category) &&
          String(p.amakuru_department || "").trim().toLowerCase() === currentDepartment
      )
      : [];
    const sameCategory = sortedOthers.filter(
      (p) =>
        String(p.category || "").toLowerCase() === currentCategory
    );

    const source = sameDepartment.length
      ? sameDepartment
      : sameCategory.length >= 2
        ? sameCategory
        : sortedOthers;

    return source.slice(0, 4);
  }, [sortedOthers, post]);

  const hasRelatedDepartment = isAmakuruCategory(post?.category) &&
    Boolean(post?.amakuru_department) &&
    relatedPosts.some(
      (p) =>
        isAmakuruCategory(p.category) &&
        String(p.amakuru_department || "").trim().toLowerCase() ===
          String(post.amakuru_department).trim().toLowerCase()
    );
  const relatedSectionTitle = hasRelatedDepartment
    ? (language === "rw" ? `Izindi nkuru: ${post.amakuru_department}` : `More from ${post.amakuru_department}`)
    : t("relatedArticles");
  const moreNews = (() => {
    const relatedIds = new Set(
      relatedPosts.map((p) => String(p._id || p.id))
    );

    return sortedOthers
      .filter((p) => !relatedIds.has(String(p._id || p.id)))
      .slice(0, 12);
  })();

  // Chronological neighbours shown below the article.
  const rightSidePosts = moreNews.length
    ? moreNews
    : sortedOthers.slice(0, 6);

  useEffect(() => {
    const rail = moreStoriesRef.current;
    const section = moreStoriesSectionRef.current;
    if (!rail || !section || rightSidePosts.length < 2) return undefined;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionPreference.matches) return undefined;

    let frameId;
    let paused = false;
    let position = rail.scrollLeft;
    let direction = 1;

    const tick = () => {
      const maxScroll = rail.scrollWidth - rail.clientWidth;

      if (!paused && !document.hidden && maxScroll > 0) {
        position += 0.5 * direction;

        if (position >= maxScroll) {
          position = maxScroll;
          direction = -1;
        } else if (position <= 0) {
          position = 0;
          direction = 1;
        }

        rail.scrollLeft = position;
      }

      frameId = window.requestAnimationFrame(tick);
    };

    const pause = () => {
      paused = true;
    };

    const resume = () => {
      paused = false;
      position = rail.scrollLeft;
    };

    const handleVisibilityChange = () => {
      paused = document.hidden;
    };

    section.addEventListener("mouseenter", pause);
    section.addEventListener("mouseleave", resume);
    section.addEventListener("focusin", pause);
    section.addEventListener("focusout", resume);
    section.addEventListener("pointerdown", pause);
    section.addEventListener("pointerup", resume);
    section.addEventListener("pointercancel", resume);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
      section.removeEventListener("mouseenter", pause);
      section.removeEventListener("mouseleave", resume);
      section.removeEventListener("focusin", pause);
      section.removeEventListener("focusout", resume);
      section.removeEventListener("pointerdown", pause);
      section.removeEventListener("pointerup", resume);
      section.removeEventListener("pointercancel", resume);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [rightSidePosts.length]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-3/4 rounded-xl bg-slate-200" />
            <div className="h-5 w-2/3 rounded-lg bg-slate-200" />
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-slate-200" />
              <div className="space-y-2">
                <div className="h-4 w-28 rounded bg-slate-200" />
                <div className="h-3 w-20 rounded bg-slate-200" />
            </div>
            </div>
            <div className="h-[320px] w-full rounded-2xl bg-slate-200" />
            <div className="space-y-3">
              <div className="h-4 w-full rounded bg-slate-200" />
              <div className="h-4 w-full rounded bg-slate-200" />
              <div className="h-4 w-5/6 rounded bg-slate-200" />
              <div className="h-4 w-full rounded bg-slate-200" />
              <div className="h-4 w-4/5 rounded bg-slate-200" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          {language === "rw" ? "Habaye ikibazo" : t("somethingWentWrong")}
        </h2>

        <p className="text-gray-600 mb-6">{error}</p>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            {language === "rw" ? "Ongera Ugerageze" : t("retry")}
          </button>

          <Link
            to="/"
            className="rounded border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
          >
            {language === "rw" ? "Subira ku Ahabanza" : t("backHome")}
          </Link>
        </div>
      </div>
    );
  }



  if (!post || post.error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          {language === "rw" ? "Inkuru ntiyabonetse" : "Article not found"}
        </h2>
        <p className="text-gray-600 mb-6">
          {error || "Ntabwo twashoboye kubona iyi nkuru."}
        </p>
        <Link
          to="/"
          className="rounded border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
        >
          {language === "rw" ? "Subira ku Ahabanza" : t("backHome")}
        </Link>
      </div>
    );
  }






  const adminPost = isPostByAdmin(post);

  const authorName = adminPost
    ? "RubavuToday"
    : getAuthorName(post);

  // Real name stays primary; the optional employee nickname is shown in
  // parentheses next to it (e.g. "MBONYINSHUTI Claude (TPLAY WARAKAYE)").
  const authorNickname = adminPost
    ? null
    : getPostAuthorNickname(post);

  const authorDisplayName = formatAuthorName(
    authorName,
    authorNickname
  );

  const authorProfileImage = adminPost
    ? rubavuLogo
    : post?.author_profile_image ||
    (typeof post?.author === "object"
      ? post.author.profile_image
      : null) ||
    null;

  const author = adminPost
    ? {
      ...(typeof post?.author === "object" ? post.author : {}),
      name: authorName,
      role: "admin",
      profile_image: authorProfileImage,
    }
    : {
      ...(typeof post?.author === "object" ? post.author : {}),
      name: authorName,
      nickname: authorNickname,
      display_name: authorDisplayName,
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

  const employeeInitial = authorName
    .trim()
    .charAt(0)
    .toUpperCase();

  const postDate =
    post.createdDate ||
    post.created_at ||
    post.createdAt ||
    post.date;

  const locale = language === "fr" ? "fr-FR" : language === "sw" ? "sw-KE" : language === "en" ? "en-US" : "rw-RW";

  const formattedDate = postDate
    ? new Date(postDate).toLocaleDateString(
      locale,
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    )
    : language === "rw" ? "Uyu munsi" : "";

  const topLevelComments =
    comments.filter(
      (c) => !c.parent_id
    );





  return (
    <div className="post-detail-page min-h-screen bg-slate-50 text-slate-900">
      <ArticleSEO post={post} />

      <div id="printable-article" className="mx-auto w-full max-w-7xl px-3 pb-12 sm:px-6">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-8">
            <div id="post-reader-content" className="mx-auto max-w-[760px]">

              {/* HEADLINE — the strongest element on the page */}
              {(post.category || post.amakuru_department) && (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {post.category && (!isAmakuruCategory(post.category) || !post.amakuru_department) && (
                    <p className="news-category font-body uppercase tracking-wider">
                      {translateCategory(post.category, language)}
                    </p>
                  )}

                  {/* Amakuru sub-department: a branded badge that doubles as a
                      link back to the department's article list. */}
                  {isAmakuruCategory(post.category) && post.amakuru_department ? (
                    <Link
                      to={`/amakuru/${getAmakuruDepartmentSlug(post.amakuru_department)}`}
                      className="news-category news-category-inverse inline-flex items-center gap-1 rounded-full border border-red-600 bg-red-600 px-2.5 py-1 font-body uppercase tracking-wider text-white transition-colors duration-150 hover:bg-red-700"
                    >
                      {post.amakuru_department}
                    </Link>
                  ) : null}
                </div>
              )}
              <h1 className="news-headline-featured font-post-title text-xl font-black leading-[1.12] tracking-tight text-slate-950 sm:text-2xl lg:text-3xl">
                {displayTitle}
              </h1>

              {/* STANDFIRST */}
              {displaySummary && (
                <p className="mt-5 border-l-4 border-red-600 pl-4 font-body text-base font-medium leading-relaxed text-slate-600 sm:text-lg">
                  {displaySummary}
                </p>
              )}

              {/* BYLINE */}
              <div className="mt-7 border-y border-slate-200 bg-white px-4 py-4 sm:px-5">
                <div className="relative flex flex-wrap items-center gap-3">

                  <button
                    type="button"
                    onClick={toggleProfile}
                    aria-expanded={profileOpen}
                    className="flex min-w-0 items-center gap-3 rounded-xl text-left transition hover:bg-slate-50"
                  >
                    {adminPost ? (
                      <div className="relative shrink-0">
                        <img
                          src={rubavuLogo}
                          alt="RubavuToday"
                          className="h-11 w-11 rounded-full border-2 border-white object-cover shadow-md"
                        />
                        <span
                          className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-blue-600 shadow-md"
                          title="Verified RubavuToday"
                          aria-label="Verified RubavuToday"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            className="h-3 w-3 text-white fill-none stroke-current"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M5 12.5l4 4L19 7.5" />
                          </svg>
                        </span>
                      </div>
                    ) : authorProfileImage ? (
                      <div className="relative shrink-0">
                        <img
                          src={authorProfileImage}
                          alt={authorDisplayName}
                          className="h-11 w-11 rounded-full border-2 border-white object-cover shadow-md"
                        />
                      </div>
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-600 font-post-title text-lg font-black text-white">
                        {employeeInitial || "E"}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="news-meta news-meta--tiny font-body uppercase tracking-wider">
                          {language === "rw" ? "Yanditswe Na:" : t("writtenBy")}
                        </span>
                        <span className="truncate font-body text-sm font-bold text-slate-950">
                          {authorDisplayName}
                        </span>
                        {adminPost && (
                          <span
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 shadow-sm"
                            title="Verified RubavuToday"
                            aria-label="Verified RubavuToday"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              className="h-3 w-3 text-white fill-none stroke-current"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M5 12.5l4 4L19 7.5" />
                            </svg>
                          </span>
                        )}
                      </div>

                      <p className="mt-1 font-body text-xs text-slate-500">
                        <time dateTime={postDate ? String(postDate) : undefined}>
                          {formattedDate}
                        </time>
                      </p>
                    </div>
                  </button>
                  <AuthorProfilePopup
                    author={author}
                    open={profileOpen}
                    onClose={() => setProfileOpen(false)}
                    posts={authorPosts}
                    showRole={false}
                    postsTitle={
                      language === "rw"
                        ? "Izindi nkuru z'uyu mwanditsi"
                        : "More from this author"
                    }
                  />
                </div>

              </div>

              {/* SOCIAL SHARE */}
              <div className="print:hidden mt-2 flex items-center gap-1.5">
                <span className="news-meta font-body font-bold uppercase tracking-wider">
                  Share:
                </span>
                <div className="flex items-center gap-1">
                  {/* Facebook */}
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Share on Facebook"
                    className="inline-flex h-6 w-6 items-center justify-center rounded bg-blue-600 text-white transition hover:bg-blue-700"
                  >
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </a>

                  {/* Instagram */}
                  <a
                    href="https://www.instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Share on Instagram"
                    className="inline-flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 text-white transition hover:shadow-lg"
                  >
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>

                  {/* Twitter/X */}
                  <a
                    href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(displayTitle)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Share on Twitter"
                    className="inline-flex h-6 w-6 items-center justify-center rounded bg-black text-white transition hover:bg-slate-800"
                  >
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.514l-5.106-6.671-5.848 6.671h-3.308l7.742-8.835L2.461 2.25h6.675l4.872 6.237 5.236-6.237zM17.364 20.033h1.828L6.817 3.995H4.881l12.483 16.038z" />
                    </svg>
                  </a>

                  {/* WhatsApp */}
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(displayTitle + " " + window.location.href)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Share on WhatsApp"
                    className="inline-flex h-6 w-6 items-center justify-center rounded bg-green-500 text-white transition hover:bg-green-600"
                  >
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                    </svg>
                  </a>
                </div>
              </div>

              {/* READING TOOLS — listen, font size, dark mode, reading time */}
              <ReadingTools
                contentId="post-reader-content"
                text={articlePlainText}
                title={displayTitle}
                language={language}
              />

              {/* FEATURED IMAGE */}
              {post.image && (
                <figure className="mt-7">
                  <div
                    ref={imageContainerRef}
                    onContextMenu={handleImageContextMenu}
                    className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <OptimizedImage
                      src={getImageUrl(post.image)}
                      alt={displayTitle || "Rubavu Today article image"}
                      widths={RESOLUTION_WIDTHS.HERO}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 900px"
                      className="article-image select-none"
                      draggable="false"
                      loading="eager"
                      priority
                      decoding="async"
                      width="1200"
                      height="675"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = rubavuLogo;
                      }}
                    />
                  </div>

                  <figcaption className="mt-2 flex items-center justify-between gap-3">
                    <span className="news-meta flex min-w-0 flex-wrap items-center gap-1.5 font-body font-medium uppercase tracking-wider">
                      {isAmakuruCategory(post.category) && post.amakuru_department ? (
                        <span className="news-meta rounded-full border border-slate-300 bg-white px-1.5 py-0.5 font-bold text-slate-500">
                          {post.amakuru_department}
                        </span>
                      ) : (
                        translateCategory(post.category, language)
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={triggerWatermarkedDownload}
                      className="print:hidden inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-1.5 font-body text-xs font-semibold text-slate-600 transition hover:border-red-200 hover:text-red-600"
                    >
                      {t("downloadImage")}
                    </button>
                  </figcaption>
                </figure>
              )}

              {/* CONTENT */}
              {contentBlocks.length > 0 ? (
                <ArticleRenderer
                  blocks={displayBlocks}
                  showHero={false}
                  heroUrl={post?.image}
                  post={post}
                  onImageDownload={triggerWatermarkedDownload}
                />
              ) : (
                articleBlocks.length > 0 && (
                  <div className="rt-article-content mt-8 text-base leading-[1.8] text-slate-800 sm:text-[17px]">
                    {articleBlocks.map((block, index) =>
                      block.type === "p" ? (
                        <p key={`p-${index}`}>{block.text}</p>
                      ) : (
                        <figure
                          key={`img-${index}`}
                          className="my-10 print:break-inside-avoid"
                        >
                          <div
                            onContextMenu={handleGalleryContextMenu(block.url)}
                            className="relative mx-auto max-w-[720px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                          >
                            <OptimizedImage
                              src={getImageUrl(block.url)}
                              alt={displayTitle || "Rubavu Today article photo"}
                              widths={RESOLUTION_WIDTHS.GALLERY}
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 720px"
                              className="article-image select-none"
                              draggable="false"
                              loading="lazy"
                              decoding="async"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = rubavuLogo;
                              }}
                            />
                          </div>

                          <figcaption className="mt-2 flex items-center justify-between gap-3">
                            <span className="news-meta font-body uppercase tracking-wider">
                              {language === "rw"
                                ? `Ipfoto ${block.num} ya ${galleryImages.length}`
                                : `Photo ${block.num} of ${galleryImages.length}`}
                            </span>
                            <button
                              type="button"
                              onClick={() => triggerWatermarkedDownload(block.url)}
                              className="print:hidden inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-1.5 font-body text-xs font-semibold text-slate-600 transition hover:border-red-200 hover:text-red-600"
                            >
                              {t("downloadImage")}
                            </button>
                          </figcaption>
                        </figure>
                      )
                    )}
                  </div>
                )
              )}

              {/* VIDEO */}
              {youtubeEmbedUrls.length > 0 || videoSourceUrl ? (
                <div className="mt-10 space-y-4 print:hidden">
                  <YouTubeEmbeds urls={youtubeEmbedUrls} title={post?.title || "YouTube video"} />

                  {videoSourceUrl ? (
                    <video
                      controls
                      playsInline
                      preload="metadata"
                      className="aspect-video w-full rounded-2xl bg-black"
                    >
                      <source src={videoSourceUrl} />
                    </video>
                  ) : null}
                </div>
              ) : null}

              {/* REACTIONS */}
              <ArticleReactions postId={post?.id || post?.slug} language={language} />

              {/* COMMENTS */}
              <section className="mt-12 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 print:hidden">
                <h3 className="mb-6 border-b border-slate-200 pb-3 font-post-title text-xl font-black text-slate-950">
                  {language === "rw" ? "Ibitekerezo" : t("comments")} ({comments.length})
                </h3>

                <form
                  onSubmit={handleCommentSubmit}
                  className="mb-8 rounded-xl bg-slate-50 p-4"
                >
                  <h4 className="mb-3 text-sm font-bold text-slate-900">
                    {language === "rw" ? "Tanga igitekerezo cyawe" : t("leaveComment")}
                  </h4>

                  <input
                    type="text"
                    placeholder={language === "rw" ? "Amazina yawe" : t("yourName")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2.5 font-body text-sm text-slate-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100 sm:w-1/2"
                    required
                  />

                  <textarea
                    placeholder={language === "rw" ? "Andika igitekerezo cyawe hano..." : t("commentPlaceholder")}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows="3"
                    className="mt-3 w-full rounded-lg border border-slate-300 p-2.5 font-body text-sm text-slate-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
                    required
                  />

                  <button
                    type="submit"
                    className="mt-3 rounded-lg bg-red-600 px-4 py-2 font-body text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {language === "rw" ? "Ohereza Igitekerezo" : t("sendComment")}
                  </button>

                  {commentStatus && (
                    <p className="mt-2 text-xs font-medium text-slate-600" role="status">
                      {commentStatus}
                    </p>
                  )}
                </form>

                <div className="space-y-4">
                  {topLevelComments.length === 0 ? (
                    <p className="text-sm italic text-slate-500">
                      {language === "rw" ? "Nta bitekerezo birabaho." : t("noComments")}
                    </p>
                  ) : (
                    topLevelComments.map((comment) => {
                      const replies = comments.filter(
                        (c) => c.parent_id === comment.id
                      );

                      return (
                        <div key={comment.id} className="rounded-xl border border-slate-200 p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-900">
                              {comment.name}
                            </span>
                            <span className="text-xs text-slate-400">
                              {new Date(comment.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          <p className="mb-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                            {comment.comment}
                          </p>

                          <div className="flex items-center">
                            <button
                              onClick={() =>
                                setReplyingTo(
                                  replyingTo === comment.id ? null : comment.id
                                )
                              }
                              className="text-xs font-semibold text-slate-500 transition hover:text-red-600"
                            >
                              {replyingTo === comment.id
                                ? language === "rw"
                                  ? "Hagarika"
                                  : t("cancel")
                                : language === "rw"
                                  ? "Subiza"
                                  : t("reply")}
                            </button>

                            <button
                              onClick={(e) =>
                                handleCommentReaction(comment.id, "like", e)
                              }
                              className={`ml-auto text-xs font-semibold transition ${reactions[comment.id] === "like"
                                ? "text-red-600"
                                : "text-slate-500 hover:text-red-600"
                                }`}
                              aria-label="Kunda ibitekerezo"
                              title="Kunda"
                            >
                              <ThumbsUp className="inline-block h-3.5 w-3.5" />{" "}
                              {comment.likes || 0}
                            </button>

                            <button
                              onClick={(e) =>
                                handleCommentReaction(comment.id, "dislike", e)
                              }
                              className={`ml-2 text-xs font-semibold transition ${reactions[comment.id] === "dislike"
                                ? "text-blue-600"
                                : "text-slate-500 hover:text-blue-600"
                                }`}
                              aria-label="Utanze ibitekerezo"
                              title="Ntanze"
                            >
                              <ThumbsDown className="inline-block h-3.5 w-3.5" />{" "}
                              {comment.dislikes || 0}
                            </button>
                          </div>

                          {replyingTo === comment.id && (
                            <form
                              onSubmit={(e) => handleCommentSubmit(e, comment.id)}
                              className="mt-3 rounded-lg border-l-2 border-red-600 bg-slate-50 p-3"
                            >
                              <input
                                type="text"
                                placeholder={language === "rw" ? "Amazina yawe" : t("yourName")}
                                value={replyName}
                                onChange={(e) => setReplyName(e.target.value)}
                                className="mb-2 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
                                required
                              />

                              <textarea
                                placeholder={language === "rw" ? "Subiza..." : t("replyPlaceholder")}
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                rows="2"
                                className="mb-2 w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
                                required
                              />

                              <button
                                type="submit"
                                className="rounded-lg bg-black px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                              >
                                {language === "rw" ? "Ohereza" : t("send")}
                              </button>
                            </form>
                          )}

                          {replies.length > 0 && (
                            <div className="ml-4 mt-3 space-y-2 border-l-2 border-slate-200 pl-3">
                              {replies.map((reply) => (
                                <div key={reply.id} className="rounded-lg bg-slate-50 p-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-900">
                                      {reply.name}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {new Date(reply.created_at).toLocaleDateString()}
                                    </span>
                                  </div>

                                  <p className="mt-1 text-xs text-slate-700">
                                    {reply.comment}
                                  </p>

                                  <div className="mt-1 flex items-center gap-2">
                                    <button
                                      onClick={(e) =>
                                        handleCommentReaction(reply.id, "like", e)
                                      }
                                      className={`text-[10px] font-semibold transition ${reactions[reply.id] === "like"
                                        ? "text-red-600"
                                        : "text-slate-500 hover:text-red-600"
                                        }`}
                                      aria-label="Kunda igisubizo"
                                      title="Kunda"
                                    >
                                      <ThumbsUp className="inline-block h-3 w-3" />{" "}
                                      {reply.likes || 0}
                                    </button>

                                    <button
                                      onClick={(e) =>
                                        handleCommentReaction(reply.id, "dislike", e)
                                      }
                                      className={`text-[10px] font-semibold transition ${reactions[reply.id] === "dislike"
                                        ? "text-blue-600"
                                        : "text-slate-500 hover:text-blue-600"
                                        }`}
                                      aria-label="Utanze igisubizo"
                                      title="Ntanze"
                                    >
                                      <ThumbsDown className="inline-block h-3 w-3" />{" "}
                                      {reply.dislikes || 0}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              {/* SOMA ANDI MAKURU — walks the whole published archive,
                  newest to oldest, one article at a time. */}
              <section className="mt-14">
                {displayNextArticle ? (
                  <Link
                    to={getArticleUrl(displayNextArticle)}
                    onClick={openPostFull(displayNextArticle)}
                    className="group flex flex-col gap-3 rounded-2xl border-2 border-slate-900 bg-white p-5 shadow-sm transition hover:border-red-600 hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:p-6"
                  >
                    <span className="flex flex-col gap-1">
                      <span className="font-body text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        {language === "rw"
                          ? "Soma Andi Makuru"
                          : t("readNextArticle")}
                      </span>
                      <span className="line-clamp-2 font-post-title text-lg font-black leading-snug text-slate-950 transition-colors group-hover:text-red-600 sm:text-xl">
                        {displayNextArticle.title}
                      </span>
                    </span>

                    <span
                      aria-hidden="true"
                      className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-red-600 px-4 py-2 font-body text-xs font-bold uppercase tracking-wider text-white transition-transform group-hover:translate-x-1 sm:self-auto"
                    >
                      {language === "rw" ? "Komeza" : t("continueReading")}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                ) : nextLoading ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-slate-500 sm:p-6">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="font-body text-sm">
                      {language === "rw"
                        ? "Guhitamo inkuru ikurikira..."
                        : t("loadingNextArticle")}
                    </span>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center sm:p-6">
                    <p className="font-post-title text-base font-bold text-slate-700">
                      {language === "rw"
                        ? "Nta yandi makuru ahari."
                        : t("noMoreArticles")}
                    </p>
                    {nextError ? (
                      <p className="mt-1 font-body text-sm text-slate-500">
                        {nextError}
                      </p>
                    ) : null}
                  </div>
                )}
              </section>

              {/* RELATED ARTICLES */}
              {relatedPosts.length > 0 && (
                <section className="mt-14">
                  <div className="mb-5 flex items-center justify-between gap-3 border-b-2 border-slate-900 pb-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="h-4 w-1.5 shrink-0 rounded-sm bg-red-600" />
                      {hasRelatedDepartment ? (
                        <Link
                          to={`/amakuru/${getAmakuruDepartmentSlug(post.amakuru_department)}`}
                          className="news-section-heading font-post-title uppercase tracking-tight transition-colors hover:text-red-700"
                        >
                          {relatedSectionTitle}
                        </Link>
                      ) : (
                        <h2 className="news-section-heading font-post-title uppercase tracking-tight">
                          {relatedSectionTitle}
                        </h2>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => scrollStories(relatedStoriesRef, -1)}
                        aria-label={language === "rw" ? "Inkuru zibanza" : "Previous stories"}
                        className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-red-300 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-200"
                      >
                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollStories(relatedStoriesRef, 1)}
                        aria-label={language === "rw" ? "Inkuru zikurikira" : "Next stories"}
                        className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-red-300 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-200"
                      >
                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div
                    ref={relatedStoriesRef}
                    role="region"
                    className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-3 [scrollbar-width:thin]"
                    aria-label={t("relatedArticles")}
                  >
                    {relatedPosts.slice(0, 4).map((p) => (
                      <Link
                        key={p._id || p.id}
                        data-story-card
                        to={getArticleUrl(p)}
                        onClick={openPostFull(p)}
                        className="group flex w-[min(82vw,320px)] shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-red-300 hover:shadow-md sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)]"
                      >
                        <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                          {p.image ? (
                            <OptimizedImage
                              src={getImageUrl(p.image)}
                              alt={p.title}
                              widths={RESOLUTION_WIDTHS.CARD}
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
                              loading="lazy"
                              decoding="async"
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = "/Rubavu.jpeg";
                              }}
                            />
                          ) : (
                            <img src="/Rubavu.jpeg" alt="" className="h-full w-full object-cover" loading="lazy" width="320" height="200" />
                          )}
                        </div>

                        <div className="flex min-w-0 flex-1 flex-col p-3">
                          <StoryCategoryLabel post={p} language={language} />
                          <h3 className="news-headline-card mt-1 line-clamp-3 font-post-title text-slate-950 transition-colors group-hover:text-red-700">
                            {p.title}
                          </h3>
                          <p className="mt-auto pt-3">
                            <TimeLabel
                              date={p.createdDate || p.created_at || p.createdAt || p.date}
                              className="news-meta font-body"
                            />
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

            </div>

          </div>
        <aside className="print:hidden min-w-0 lg:col-span-4">
          <div className="space-y-6 lg:sticky lg:top-6">
            {relatedPosts.length > 0 && (
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b-2 border-slate-900 px-4 py-3">
                  <span className="h-4 w-1.5 rounded-sm bg-red-600" />
                  {hasRelatedDepartment ? (
                    <Link
                      to={`/amakuru/${getAmakuruDepartmentSlug(post.amakuru_department)}`}
                      className="news-section-heading font-post-title uppercase tracking-tight transition-colors hover:text-red-700"
                    >
                      {relatedSectionTitle}
                    </Link>
                  ) : (
                    <h2 className="news-section-heading font-post-title uppercase tracking-tight">
                      {relatedSectionTitle}
                    </h2>
                  )}
                </div>

                <div className="divide-y divide-slate-100">
                  {relatedPosts.slice(0, 4).map((p) => (
                    <Link
                      key={p._id || p.id}
                      to={getArticleUrl(p)}
                      onClick={openPostFull(p)}
                      className="group flex items-start gap-3 p-3 transition hover:bg-slate-50"
                    >
                      <div className="h-16 w-24 shrink-0 overflow-hidden rounded-md bg-slate-100">
                        {p.image ? (
                          <OptimizedImage
                            src={getImageUrl(p.image)}
                            alt={p.title}
                            widths={RESOLUTION_WIDTHS.THUMB}
                            sizes="96px"
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = "/Rubavu.jpeg";
                            }}
                          />
                        ) : (
                          <img src="/Rubavu.jpeg" alt="" className="h-full w-full object-cover" loading="lazy" width="96" height="64" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <StoryCategoryLabel post={p} language={language} />
                        <h3 className="news-headline-card mt-1 line-clamp-3 font-post-title text-[12px] font-bold leading-snug text-slate-950 transition-colors group-hover:text-red-600">
                          {p.title}
                        </h3>
                        <p className="mt-1">
                          <TimeLabel
                            date={p.createdDate || p.created_at || p.createdAt || p.date}
                            className="news-meta font-body"
                          />
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </aside>
        </div>
        {rightSidePosts.length > 0 && (
          <section ref={moreStoriesSectionRef} className="mt-14">
            <div className="mb-5 flex items-center justify-between gap-3 border-b-2 border-slate-900 pb-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-4 w-1.5 shrink-0 rounded-sm bg-red-600" />
                <h2 className="news-section-heading font-post-title uppercase tracking-tight">
                  {language === "rw" ? "Izindi Nkuru" : t("otherStories")}
                </h2>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => scrollStories(moreStoriesRef, -1)}
                  aria-label={language === "rw" ? "Inkuru zibanza" : "Previous stories"}
                  className="grid h-9 w-9 place-items-center border border-slate-200 bg-white text-slate-700 transition hover:border-red-300 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-200"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollStories(moreStoriesRef, 1)}
                  aria-label={language === "rw" ? "Inkuru zikurikira" : "Next stories"}
                  className="grid h-9 w-9 place-items-center border border-slate-200 bg-white text-slate-700 transition hover:border-red-300 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-200"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div
              ref={moreStoriesRef}
              role="region"
              aria-label={language === "rw" ? "Izindi nkuru" : t("otherStories")}
              className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide-x"
            >
              {rightSidePosts.map((p) => (
                <Link
                  key={p._id || p.id}
                  data-story-card
                  to={getArticleUrl(p)}
                  onClick={openPostFull(p)}
                  className="group flex w-[min(78vw,280px)] shrink-0 snap-start flex-col bg-white transition sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-3rem)/4)]"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                    {p.image ? (
                      <OptimizedImage
                        src={getImageUrl(p.image)}
                        alt={p.title}
                        widths={RESOLUTION_WIDTHS.CARD}
                        sizes="(max-width: 640px) 78vw, (max-width: 1024px) 50vw, 25vw"
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/Rubavu.jpeg";
                        }}
                      />
                    ) : (
                      <img src="/Rubavu.jpeg" alt="" className="h-full w-full object-cover" loading="lazy" width="320" height="200" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col pt-3">
                    <StoryCategoryLabel post={p} language={language} />
                    <h3 className="news-headline-card line-clamp-3 font-post-title font-bold text-slate-950 transition-colors group-hover:text-red-700">
                      {p.title}
                    </h3>
                    <TimeLabel
                      date={p.createdDate || p.created_at || p.createdAt || p.date}
                      className="news-meta mt-2 font-body"
                    />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
