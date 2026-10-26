import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAdminPostById, updatePost, logout } from "../../services/api";
import { DashboardLayout } from "../../components/dashboard";
import ArticleEditor from "../../components/article/ArticleEditor";

const DEPARTMENTS = [
    { name: "Amakuru", icon: "📰", color: "bg-blue-100 text-blue-700" },
    { name: "Ubukungu", icon: "💼", color: "bg-emerald-100 text-emerald-700" },
    { name: "Imikino", icon: "⚽", color: "bg-amber-100 text-amber-700" },
    { name: "Imyidagaduro", icon: "🎭", color: "bg-purple-100 text-purple-700" },
    { name: "Uburezi", icon: "🎓", color: "bg-rose-100 text-rose-700" },
];

const DEPARTMENTS_NAV = [
    { label: "Dashboard", items: [{ icon: <span>▦</span>, label: "Imbonerahamwe", path: "/admin/dashboard" }] },
];

function EditPost() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [editorKey, setEditorKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setError("");
            try {
                const data = await getAdminPostById(id);
                if (cancelled) return;
                if (!data) {
                    setError("Ntitwashoboye kubona iyi nkuru.");
                } else {
                    setPost(data);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err?.message || "Ntitwashoboye kubona iyi nkuru.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [id]);

    const handleSave = useCallback(async (formData) => {
        if (saving) return;
        setSaving(true);
        try {
            await updatePost(id, formData);
            setEditorKey((k) => k + 1);
            navigate(`/admin/posts/${id}/view`, { replace: true });
        } catch (err) {
            console.error("[EditPost] Failed:", err);
            alert(err.message || "Hari ikosa ryabaye mu guhindura inkuru.");
        } finally {
            setSaving(false);
        }
    }, [saving, id, navigate]);

    const handleCancel = useCallback(() => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate("/admin/dashboard", { replace: true });
        }
    }, [navigate]);

    if (loading) {
        return (
            <DashboardLayout navigationSections={DEPARTMENTS_NAV} roleLabel="Imicungire y'ubwanditsi" onLogout={() => { logout(); navigate("/admin/login", { replace: true }); }}>
                <div className="mx-auto max-w-4xl px-3 py-10 sm:px-6 lg:px-8">
                    <div className="animate-pulse space-y-4">
                        <div className="h-6 w-32 rounded bg-slate-200" />
                        <div className="h-8 w-1/3 rounded bg-slate-200" />
                        <div className="h-64 rounded-2xl bg-slate-200" />
                        <div className="space-y-3">
                            <div className="h-4 w-full rounded bg-slate-100" />
                            <div className="h-4 w-5/6 rounded bg-slate-100" />
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (error || !post) {
        return (
            <DashboardLayout navigationSections={DEPARTMENTS_NAV} roleLabel="Imicungire y'ubwanditsi" onLogout={() => { logout(); navigate("/admin/login", { replace: true }); }}>
                <div className="mx-auto max-w-4xl px-3 py-10 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-lg font-bold text-slate-800">Ntitwashoboye kubona iyi nkuru.</h2>
                    <p className="mt-2 text-sm text-slate-400">{error}</p>
                    <button onClick={() => navigate(-1)} className="mt-4 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700">
                        ← Subira inyuma
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout navigationSections={DEPARTMENTS_NAV} roleLabel="Imicungire y'ubwanditsi" onLogout={() => { logout(); navigate("/admin/login", { replace: true }); }}>
            <div className="mx-auto max-w-4xl px-3 py-6 sm:px-6 lg:px-8">
                {/* Back button */}
                <button
                    onClick={handleCancel}
                    className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-800"
                >
                    <span>←</span> Subira inyuma
                </button>

                {/* Page header */}
                <div className="mb-6 flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                        ✏️
                    </span>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 sm:text-2xl">
                            Hindura Inkuru
                        </h1>
                        <p className="mt-0.5 text-sm text-slate-400">
                            Hindura amakuru y'inkuru iriho.
                        </p>
                    </div>
                </div>

                {/* Article editor card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                    <ArticleEditor
                        key={editorKey}
                        initial={post}
                        categories={DEPARTMENTS}
                        authorText={post.author || ""}
                        submitLabel="Bika impinduka"
                        saving={saving}
                        onSubmit={handleSave}
                        onCancel={handleCancel}
                    />
                </div>
            </div>
        </DashboardLayout>
    );
}

export default EditPost;