import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    getAdminPostById,
    approvePost,
    rejectPost,
    reviewPost,
    deletePost,
    logout,
} from "../../services/api";
import { DashboardLayout } from "../../components/dashboard";
import ArticleRenderer from "../../components/article/ArticleRenderer";
import YouTubeEmbeds from "../../components/article/YouTubeEmbeds";
import OptimizedImage from "../../components/common/OptimizedImage";
import { RESOLUTION_WIDTHS, isCloudinaryUrl } from "../../utils/images";

const DEPARTMENTS_NAV = [
    { label: "Dashboard", items: [{ icon: <span>▦</span>, label: "Imbonerahamwe", path: "/admin/dashboard" }] },
];

const normalizeStatus = (post) =>
    String(post?.status || post?.approval_status || post?.publication_status || "pending").toLowerCase();

const StatusBadge = ({ status }) => {
    const s = normalizeStatus({ status });
    const styles = {
        approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        pending: "bg-amber-50 text-amber-700 ring-amber-200",
        rejected: "bg-red-50 text-red-700 ring-red-200",
    }[s] || "bg-slate-50 text-slate-600 ring-slate-200";
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ${styles}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {s.toUpperCase()}
        </span>
    );
};

function PostPreview() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const loadPost = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const data = await getAdminPostById(id);
            if (!data) {
                setError("Ntitwashoboye kubona iyi nkuru.");
            } else {
                setPost(data);
            }
        } catch (err) {
            setError(err?.message || "Ntitwashoboye kubona iyi nkuru.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { loadPost(); }, [loadPost]);

    const contentBlocks = useMemo(() => {
        if (!post?.content_blocks) return [];
        try {
            const parsed = JSON.parse(post.content_blocks);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }, [post]);

    const galleryImages = useMemo(() => {
        if (!post?.images) return [];
        try {
            const parsed = typeof post.images === "string" ? JSON.parse(post.images) : post.images;
            return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
        } catch {
            return [];
        }
    }, [post]);

    const inlineParagraphs = useMemo(() => {
        return String(post?.description || "")
            .split(/\n{2,}/)
            .map((part) => part.replace(/\s+/g, " ").trim())
            .filter(Boolean);
    }, [post]);

    const articleBlocks = useMemo(() => {
        if (galleryImages.length === 0) {
            return inlineParagraphs.map((text) => ({ type: "p", text }));
        }
        const blocks = [];
        let inserted = 0;
        const count = inlineParagraphs.length;
        inlineParagraphs.forEach((text, index) => {
            blocks.push({ type: "p", text });
            const target = Math.floor(((index + 1) * galleryImages.length) / count);
            while (inserted < target) {
                blocks.push({ type: "image", url: galleryImages[inserted], num: inserted + 1 });
                inserted += 1;
            }
        });
        while (inserted < galleryImages.length) {
            blocks.push({ type: "image", url: galleryImages[inserted], num: inserted + 1 });
            inserted += 1;
        }
        return blocks;
    }, [galleryImages, inlineParagraphs]);

    const getAuthorName = (p) => {
        if (!p) return "Unknown Author";
        if (typeof p.author === "string" && p.author.trim()) return p.author.trim();
        if (typeof p.Author === "string" && p.Author.trim()) return p.Author.trim();
        if (p.author && typeof p.author === "object") return p.author.name || p.author.username || p.author.full_name || "Unknown Author";
        return p.user_name || p.username || p.postedBy || p.authorName || p.author_name || p.full_name || "Staff Member";
    };

    const handleApprove = async () => {
        if (!window.confirm(`Emeza "${post.title}"?`)) return;
        try {
            await approvePost(post.id);
            setMessage("Inkuru yemejwe neza.");
            await loadPost();
        } catch (err) {
            setError(err?.message || "Failed to approve.");
        }
    };

    const handleReject = async () => {
        const reason = window.prompt("Imyandikire y'impamvu yo kwanza?", "") || "";
        if (!window.confirm(`Zana "${post.title}"?`)) return;
        try {
            await rejectPost(post.id, reason);
            setMessage("Inkuru yanzwe neza.");
            await loadPost();
        } catch (err) {
            setError(err?.message || "Failed to reject.");
        }
    };

    const handlePending = async () => {
        if (!window.confirm(`Subiza "${post.title}" mu zitegereje?`)) return;
        try {
            await reviewPost(post.id);
            setMessage("Inkuru yasubijwe mu zitegereje.");
            await loadPost();
        } catch (err) {
            setError(err?.message || "Failed to change status.");
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(`Siba "${post.title}"?\n\nNtibishobora gusubizwa.`)) return;
        try {
            await deletePost(post.id);
            navigate("/admin/posts/pending", { replace: true });
        } catch (err) {
            setError(err?.message || "Failed to delete.");
        }
    };

    const status = normalizeStatus(post);

    const getImageUrl = (image) => {
        if (!image) return null;
        const value = String(image).trim();
        if (/^https?:\/\//i.test(value)) {
            const https = value.replace(/^http:\/\//i, "https://");
            /* OptimizedImage applies responsive Cloudinary transformations. */
            if (isCloudinaryUrl(https)) return https;
            return https;
        }
        if (value.startsWith("/")) return `${window.location.origin}${value}`;
        if (value.startsWith("uploads/")) return `${window.location.origin}/${value}`;
        return `${window.location.origin}/uploads/${value}`;
    };

    if (loading) {
        return (
            <DashboardLayout navigationSections={DEPARTMENTS_NAV} roleLabel="Imicungire y'ubwanditsi" onLogout={() => { logout(); navigate("/admin/login", { replace: true }); }}>
                <div className="mx-auto max-w-4xl px-3 py-10 sm:px-6 lg:px-8">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 w-1/3 rounded-lg bg-slate-200" />
                        <div className="h-4 w-1/4 rounded bg-slate-100" />
                        <div className="h-64 rounded-2xl bg-slate-200" />
                        <div className="space-y-3">
                            <div className="h-4 w-full rounded bg-slate-100" />
                            <div className="h-4 w-5/6 rounded bg-slate-100" />
                            <div className="h-4 w-4/6 rounded bg-slate-100" />
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (error && !post) {
        return (
            <DashboardLayout navigationSections={DEPARTMENTS_NAV} roleLabel="Imicungire y'ubwanditsi" onLogout={() => { logout(); navigate("/admin/login", { replace: true }); }}>
                <div className="mx-auto max-w-4xl px-3 py-10 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-lg font-bold text-slate-800">Ntitwashoboye kubona iyi nkuru.</h2>
                    <p className="mt-2 text-sm text-slate-400">{error}</p>
                    <button onClick={() => navigate("/admin/posts/pending")} className="mt-4 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700">
                        ← Subira ku nkuru
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    if (!post) return null;

    const authorName = getAuthorName(post);
    const postDate = post.createdDate || post.created_at || post.createdAt || post.date;
    const formattedDate = postDate ? new Date(postDate).toLocaleDateString("rw-RW", { year: "numeric", month: "long", day: "numeric" }) : "Uyu munsi";

    return (
        <DashboardLayout navigationSections={DEPARTMENTS_NAV} roleLabel="Imicungire y'ubwanditsi" onLogout={() => { logout(); navigate("/admin/login", { replace: true }); }}>
            <div className="mx-auto max-w-4xl px-3 py-6 sm:px-6 lg:px-8">
                {/* Back */}
                <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-800">
                    ← Subira inyuma
                </button>

                {/* Admin header */}
                <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-3 flex items-center gap-2">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">👁</span>
                        <div>
                            <h1 className="text-lg font-black text-slate-900">Reba inkuru mbere yo kuyemeza</h1>
                            <p className="text-xs text-slate-400">Reba inkuru mbere yo kuyoboza.</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <StatusBadge status={status} />

                        {status === "rejected" && post.rejection_reason && (
                            <span className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600">
                                Impamvu: {post.rejection_reason}
                            </span>
                        )}

                        {post.approved_by && (
                            <span className="text-xs text-slate-400">
                                Yemejwe na: <span className="font-semibold text-slate-600">{post.approved_by}</span>
                            </span>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="mt-4 flex flex-wrap gap-2">
                        {status !== "approved" && (
                            <button onClick={handleApprove} title="Emeza inkuru"
                                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700">
                                ✓ Emeza
                            </button>
                        )}
                        {status !== "rejected" && (
                            <button onClick={handleReject} title="Anga inkuru"
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700">
                                ✕ Zana
                            </button>
                        )}
                        {status !== "pending" && (
                            <button onClick={handlePending} title="Subiza pending"
                                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-600">
                                ↩ Subiza pending
                            </button>
                        )}
                        <button onClick={() => navigate(`/admin/posts/${post.id}/edit`)} title="Hindura inkuru"
                            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
                            ✎ Hindura
                        </button>
                        <button onClick={handleDelete} title="Siba inkuru"
                            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50">
                            🗑 Siba
                        </button>
                    </div>

                    {message && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">✓ {message}</p>}
                    {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">{error}</p>}
                </div>

                {/* Article preview */}
                <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="p-5 sm:p-8">
                        {/* Title */}
                        <h1 className="font-post-title text-xl font-black leading-[1.12] tracking-tight text-slate-950 sm:text-2xl lg:text-3xl">
                            {post.title}
                        </h1>

                        {/* Summary / standfirst */}
                        {post.summary && post.summary !== post.description && (
                            <p className="mt-5 border-l-4 border-red-600 pl-4 font-post-title text-base font-medium leading-relaxed text-slate-600 sm:text-lg">
                                {post.summary}
                            </p>
                        )}

                        {/* Byline */}
                        <div className="mt-7 border-y border-slate-200 bg-white px-4 py-4 sm:px-5">
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-600 font-post-title text-lg font-black text-white">
                                    {authorName.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-body text-[10px] font-bold uppercase tracking-wider text-slate-400">Yanditswe Na:</span>
                                        <span className="truncate font-body text-sm font-bold text-slate-950">{authorName}</span>
                                    </div>
                                    <p className="mt-1 font-body text-xs text-slate-500">
                                        <time dateTime={postDate ? String(postDate) : undefined}>{formattedDate}</time>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Metadata */}
                        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
                            {post.category && (
                                <span className="rounded-full bg-brand-50 px-3 py-1 font-bold text-brand-700">{post.category}</span>
                            )}
                            <span className="rounded-full bg-slate-100 px-3 py-1">ID: {post.id}</span>
                            {post.slug && <span className="rounded-full bg-slate-100 px-3 py-1">Slug: {post.slug}</span>}
                        </div>

                        {/* Featured image */}
                        {post.image && (
                            <figure className="mt-7">
                                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                    <OptimizedImage
                                        src={getImageUrl(post.image)}
                                        alt={post.title || "Rubavu Today article image"}
                                        widths={RESOLUTION_WIDTHS.HERO}
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 900px"
                                        className="article-image select-none"
                                        loading="eager"
                                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = ""; }}
                                    />
                                </div>
                            </figure>
                        )}

                        {/* Content */}
                        {contentBlocks.length > 0 ? (
                            <ArticleRenderer
                                blocks={contentBlocks}
                                showHero={false}
                                heroUrl={post?.image}
                                post={post}
                            />
                        ) : (
                            articleBlocks.length > 0 && (
                                <div className="rt-article-content mt-8 text-base leading-[1.8] text-slate-800 sm:text-[17px]">
                                    <style>{`
                                        .rt-article-content p {
                                            margin-bottom: 1.5rem;
                                            color: #334155;
                                            font-size: 1.0625rem;
                                            line-height: 1.85;
                                        }
                                        @media (min-width: 640px) {
                                            .rt-article-content p { font-size: 1.125rem; }
                                        }
                                    `}</style>
                                    {articleBlocks.map((block, index) =>
                                        block.type === "p" ? (
                                            <p key={`p-${index}`}>{block.text}</p>
                                        ) : (
                                            <figure key={`img-${index}`} className="my-10">
                                                <div className="relative mx-auto max-w-[720px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                                    <OptimizedImage
                                                        src={getImageUrl(block.url)}
                                                        alt={post?.title || "Rubavu Today article photo"}
                                                        widths={RESOLUTION_WIDTHS.GALLERY}
                                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 720px"
                                                        className="article-image select-none"
                                                        loading="lazy"
                                                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = ""; }}
                                                    />
                                                </div>
                                                <figcaption className="mt-2 text-center font-body text-[10px] font-medium text-slate-400">
                                                    Photo {block.num} of {galleryImages.length}
                                                </figcaption>
                                            </figure>
                                        )
                                    )}
                                </div>
                            )
                        )}

                        {/* YouTube URL */}
                        {(post.youtube_url || (post.youtube_urls && post.youtube_urls.length > 0)) && (
                            <div className="mt-8 space-y-4">
                                <YouTubeEmbeds urls={post.youtube_urls} title={post.title || "YouTube video"} />
                                <a href={post.youtube_url || post.youtube_urls[0]} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-xs font-bold uppercase text-white transition hover:bg-red-700">
                                    ▶ Reba kuri YouTube
                                </a>
                            </div>
                        )}
                    </div>
                </article>

                {/* Bottom actions */}
                <div className="mt-6 flex flex-wrap justify-between gap-3">
                    <button onClick={() => navigate(-1)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
                        ← Subira inyuma
                    </button>
                    <div className="flex gap-2">
                        {status !== "approved" && (
                            <button onClick={handleApprove} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700">
                                ✓ Emeza
                            </button>
                        )}
                        <button onClick={() => navigate(`/admin/posts/${post.id}/edit`)}
                            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
                            ✎ Hindura
                        </button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

export default PostPreview;
