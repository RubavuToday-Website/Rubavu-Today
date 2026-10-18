import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    getAdminPosts,
    approvePost,
    rejectPost,
    reviewPost,
    deletePost,
    logout,
} from "../../services/api";
import { DashboardLayout } from "../../components/dashboard";
import { ADMIN_NAV_SECTIONS } from "./adminNav";
import OptimizedImage from "../../components/common/OptimizedImage";
import { RESOLUTION_WIDTHS } from "../../utils/images";

const DEPARTMENTS = [
    "Amakuru",
    "Ubukungu",
    "Imikino",
    "Imyidagaduro",
    "Uburezi",
];

const PAGE_SIZE = 8;

const normalizeStatus = (post) =>
    String(post?.status || post?.approval_status || post?.publication_status || "pending").toLowerCase();

const MODE_CONFIG = {
    all: {
        title: "Inkuru zose",
        desc: "Inkuru zose zanditswe, zemejwe cyangwa zanzwe.",
        status: null,
    },
    pending: {
        title: "Zitegereje gusuzumwa",
        desc: "Inkuru zitegereje gusuzumwa n'abayobozi.",
        status: "pending",
    },
    published: {
        title: "Inkuru zasohotse",
        desc: "Inkuru zemejwe zisohotse.",
        status: "approved",
    },
    rejected: {
        title: "Zanzwe",
        desc: "Inkuru zanzwe.",
        status: "rejected",
    },
};

function StatusBadge({ status }) {
    const s = String(status || "pending").toLowerCase();
    const styles = {
        approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        pending: "bg-amber-50 text-amber-700 ring-amber-200",
        rejected: "bg-red-50 text-red-700 ring-red-200",
    }[s] || "bg-slate-50 text-slate-600 ring-slate-200";
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${styles}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {s}
        </span>
    );
}

function PostListPage() {
    const navigate = useNavigate();
    const { mode = "pending" } = useParams();
    const config = MODE_CONFIG[mode] || MODE_CONFIG.pending;

    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("All");
    const [page, setPage] = useState(1);

    const loadPosts = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getAdminPosts();
            setPosts(Array.isArray(data) ? data : []);
            setError("");
        } catch (err) {
            setError(err?.message || "Unable to load posts.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadPosts(); }, [loadPosts]);

    const filtered = useMemo(() => {
        let result = config.status
            ? posts.filter((p) => normalizeStatus(p) === config.status)
            : [...posts];
        if (category !== "All") result = result.filter((p) => p.category === category);
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter((p) =>
                (p.title || "").toLowerCase().includes(q) ||
                (p.description || "").toLowerCase().includes(q) ||
                (p.category || "").toLowerCase().includes(q)
            );
        }
        result.sort((a, b) => new Date(b.createdDate || 0) - new Date(a.createdDate || 0));
        return result;
    }, [posts, category, search, config.status]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    useEffect(() => { setPage(1); }, [config.status, category, search]);

    const handleApprove = async (post) => {
        if (!window.confirm(`Emeza "${post.title}"?`)) return;
        try { await approvePost(post.id); await loadPosts(); }
        catch (err) { setError(err?.message || "Failed to approve."); }
    };

    const handleReject = async (post) => {
        const reason = window.prompt("Imyandikire y'impamvu yo kwanza? (ni yo mpamvu ya raporo)", "") || "";
        if (!window.confirm(`Zana "${post.title}"?`)) return;
        try { await rejectPost(post.id, reason); await loadPosts(); }
        catch (err) { setError(err?.message || "Failed to reject."); }
    };

    const handlePending = async (post) => {
        if (!window.confirm(`Subiza "${post.title}" mu zitegereje?`)) return;
        try { await reviewPost(post.id); await loadPosts(); }
        catch (err) { setError(err?.message || "Failed to change status."); }
    };

    const handleDelete = async (post) => {
        if (!window.confirm(`Siba "${post.title}"?\n\nNtibishobora gusubizwa.`)) return;
        try { await deletePost(post.id); await loadPosts(); }
        catch (err) { setError(err?.message || "Failed to delete."); }
    };

    return (
        <DashboardLayout
            navigationSections={ADMIN_NAV_SECTIONS}
            roleLabel="Imicungire y'ubwanditsi"
            onLogout={() => { logout(); navigate("/admin/login", { replace: true }); }}
        >
            <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6 lg:px-8">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-black text-slate-900 sm:text-2xl">{config.title}</h1>
                        <p className="mt-0.5 text-sm text-slate-400">{config.desc}</p>
                    </div>
                    <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-black text-brand-700">
                        {filtered.length}
                    </span>
                </div>

                {/* Filters */}
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Shakisha inkuru..."
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    />
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500"
                    >
                        <option value="All">Icyiciro cyose</option>
                        {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>

                {error && (
                    <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
                )}

                {loading ? (
                    <p className="py-10 text-center text-sm text-slate-400">Birimo gutwara...</p>
                ) : paginated.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                        <p className="text-lg font-bold text-slate-700">Nta nkuru ibonetse</p>
                        <p className="mt-1 text-sm text-slate-400">Nta inkuru muri iki gice kiriho.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {paginated.map((post) => (
                                <article key={post.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                    <div className="relative h-40 bg-slate-100">
                                        {post.image ? (
                                            <OptimizedImage src={post.image} alt={post.title || "story"} widths={RESOLUTION_WIDTHS.CARD} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px" loading="lazy" className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-4xl">📰</div>
                                        )}
                                        <div className="absolute right-2 top-2">
                                            <StatusBadge status={normalizeStatus(post)} />
                                        </div>
                                    </div>

                                    <div className="p-3">
                                        {post.category && (
                                            <span className="text-[10px] font-bold uppercase tracking-wide text-red-600">{post.category}</span>
                                        )}
                                        <h3 className="mt-1 line-clamp-2 text-[13px] font-bold leading-[1.35] text-slate-900 sm:text-sm">{post.title || "Untitled"}</h3>
                                        <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500 sm:text-xs">{post.description || ""}</p>
                                        <div className="mt-2 space-y-1 text-[10px] leading-4 text-slate-400">
                                            {post.author?.name || post.author ? (
                                                <p>N'umwanditsi: <span className="font-semibold text-slate-600">{post.author?.name || post.author}</span></p>
                                            ) : null}
                                            <p>Itariki: <span className="font-semibold text-slate-600">{post.createdDate || "—"}</span></p>
                                            {normalizeStatus(post) === "rejected" && post.rejection_reason && (
                                                <p className="text-red-500">Impamvu: {post.rejection_reason}</p>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            <button
                                                onClick={() => navigate(`/admin/posts/${post.id}/view`)}
                                                title="Reba inkuru"
                                                className="rounded-md bg-blue-600 px-2 py-1 text-[10px] font-semibold text-white transition hover:bg-blue-700"
                                            >
                                                👁 Reba
                                            </button>
                                            <button
                                                onClick={() => navigate(`/admin/posts/${post.id}/edit`)}
                                                title="Hindura inkuru"
                                                className="rounded-md border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-50"
                                            >
                                                ✎ Hindura
                                            </button>
                                            {config.status !== "approved" && (
                                                <button onClick={() => handleApprove(post)}
                                                    title="Emeza inkuru"
                                                    className="rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white transition hover:bg-emerald-700">
                                                    ✓ Emeza
                                                </button>
                                            )}
                                            {config.status !== "rejected" && (
                                                <button onClick={() => handleReject(post)}
                                                    title="Anga inkuru"
                                                    className="rounded-md bg-red-600 px-2 py-1 text-[10px] font-semibold text-white transition hover:bg-red-700">
                                                    ✕ Zana
                                                </button>
                                            )}
                                            {config.status !== "pending" && (
                                                <button onClick={() => handlePending(post)}
                                                    title="Subiza pending"
                                                    className="rounded-md bg-amber-500 px-2 py-1 text-[10px] font-semibold text-white transition hover:bg-amber-600">
                                                    ↩ Pending
                                                </button>
                                            )}
                                            <button onClick={() => handleDelete(post)}
                                                title="Siba inkuru"
                                                className="rounded-md border border-red-200 px-2 py-1 text-[10px] font-semibold text-red-600 transition hover:bg-red-50">
                                                🗑 Siba
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (  
                            <div className="mt-6 flex items-center justify-center gap-2">
                                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 disabled:opacity-40 hover:bg-slate-50">
                                    ←
                                </button>
                                <span className="px-2 text-sm text-slate-500">
                                    {page} / {totalPages}
                                </span>
                                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 disabled:opacity-40 hover:bg-slate-50">
                                    →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}

export default PostListPage;
