import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { X, Newspaper, ChevronRight } from "lucide-react";

const PROFILE_POPUP_EVENT = "rubavu-author-popup-open";

/* Real name first, optional nickname in parentheses. */
const displayNameFor = (name, nickname) => {
  const realName = String(name || "").trim();
  const alias = String(nickname || "").trim();

  if (!alias) return realName;
  if (!realName) return alias;
  if (alias.toLowerCase() === realName.toLowerCase()) {
    return realName;
  }

  return `${realName} (${alias})`;
};

const normalizeAuthor = (author) => {
    if (!author) {
        return {
            id: null,
            name: "Rubavu Today",
            nickname: null,
            display_name: "Rubavu Today",
            role: "unknown",
            profile_image: null,
        };
    }

    if (typeof author === "string") {
        return {
            id: null,
            name: author,
            nickname: null,
            display_name: author,
            role: "unknown",
            profile_image: null,
        };
    }

    const name =
        author.name ||
        author.full_name ||
        author.email ||
        "Rubavu Today";

    const nickname = author.nickname || null;

    return {
        id: author.id || null,
        name,
        nickname,
        display_name:
            author.display_name ||
            displayNameFor(name, nickname),
        role: author.role || author.role_type || "unknown",
        email: author.email || null,
        bio: author.bio || null,
        profile_image: author.profile_image || null,
        profile_path: author.profile_path || null,
    };
};

const roleLabel = (role) => {
    const value = String(role || "").replace(/_/g, " ");

    if (!value || value === "unknown") return "Author";

    return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getAuthorKey = (author) => {
    const normalized = normalizeAuthor(author);
    return `${normalized.id || "name"}:${normalized.name}`;
};

export default function AuthorProfilePopup({
    author,
    open,
    onClose,
    posts = [],
    postsTitle = "Izindi nkuru z'uyu mwanditsi",
    showRole = true,
}) {
    const popupRef = useRef(null);
    const normalizedAuthor = normalizeAuthor(author);
    const authorKey = getAuthorKey(normalizedAuthor);
    const initial = normalizedAuthor.name.trim().charAt(0).toUpperCase() || "A";
    const postList = Array.isArray(posts) ? posts : [];

    useEffect(() => {
        if (!open) return undefined;

        const handlePointerDown = (event) => {
            if (!popupRef.current?.contains(event.target)) {
                onClose();
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === "Escape") onClose();
        };

        const handleOtherPopup = (event) => {
            if (event.detail !== authorKey) onClose();
        };

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("touchstart", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener(PROFILE_POPUP_EVENT, handleOtherPopup);

        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("touchstart", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener(PROFILE_POPUP_EVENT, handleOtherPopup);
        };
    }, [authorKey, onClose, open]);

    if (!open) return null;

    return (
        <div
            ref={popupRef}
            role="dialog"
            aria-label={`${normalizedAuthor.name} profile`}
            className="absolute left-0 top-full z-50 mt-2 flex max-h-[75vh] w-[min(22rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-xl ring-1 ring-black/5"
            onClick={(event) => event.stopPropagation()}
        >
            <button
                type="button"
                onClick={onClose}
                aria-label="Close profile"
                className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
                <X size={16} />
            </button>

            <div className="shrink-0 border-b border-slate-100 p-4">
                <div className="flex items-center gap-3 pr-6">
                    {normalizedAuthor.profile_image ? (
                        <img
                            src={normalizedAuthor.profile_image}
                            alt={normalizedAuthor.name}
                            className="h-12 w-12 shrink-0 rounded-full border-2 border-white object-cover shadow-md"
                            onError={(event) => {
                                event.currentTarget.style.display = "none";
                            }}
                        />
                    ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-600 text-lg font-black text-white shadow-md">
                            {initial}
                        </div>
                    )}

                    <div className="min-w-0">
                        <p className="max-w-full break-words text-sm font-bold leading-tight text-slate-900">
                            {normalizedAuthor.display_name}
                        </p>
                        {showRole && (
                            <p className="mt-0.5 text-[11px] font-semibold capitalize text-red-600">
                                {roleLabel(normalizedAuthor.role)}
                            </p>
                        )}
                    </div>
                </div>

                {normalizedAuthor.email && (
                    <p className="mt-2 max-w-full break-all text-[11px] text-slate-500">
                        {normalizedAuthor.email}
                    </p>
                )}

                {normalizedAuthor.bio && (
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">
                        {normalizedAuthor.bio}
                    </p>
                )}

                {normalizedAuthor.profile_path && (
                    <a
                        href={normalizedAuthor.profile_path}
                        className="mt-3 inline-flex items-center rounded-lg bg-red-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-red-700"
                    >
                        View Profile
                    </a>
                )}
            </div>

            {postList.length > 0 && (
                <div className="flex min-h-0 flex-1 flex-col">
                    <p className="flex shrink-0 items-center gap-1 px-3 pb-1 pt-2.5 text-[9px] font-black uppercase tracking-wider text-slate-400">
                        <Newspaper size={11} />
                        {postsTitle}
                    </p>

                    <ul className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-1.5">
                        {postList.map((item) => (
                            <li key={item.id || item.url || item.title}>
                                <Link
                                    to={item.url || "#"}
                                    onClick={onClose}
                                    className="group flex items-center gap-2 rounded-lg p-1.5 transition hover:bg-slate-50"
                                >
                                    {item.image ? (
                                        <img
                                            src={item.image}
                                            alt=""
                                            loading="lazy"
                                            className="h-9 w-12 shrink-0 rounded-md object-cover"
                                            onError={(event) => {
                                                event.currentTarget.style.display = "none";
                                            }}
                                        />
                                    ) : (
                                        <div className="flex h-9 w-12 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-300">
                                            <Newspaper size={14} />
                                        </div>
                                    )}

                                    <div className="min-w-0 flex-1">
                                        <p className="line-clamp-2 text-[11px] font-bold leading-snug text-slate-800 group-hover:text-red-600">
                                            {item.title}
                                        </p>
                                        <p className="mt-0.5 truncate text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                                            {[item.category, item.dateLabel]
                                                .filter(Boolean)
                                                .join(" • ")}
                                        </p>
                                    </div>

                                    <ChevronRight
                                        size={13}
                                        className="shrink-0 text-slate-300 transition group-hover:text-red-500"
                                    />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export { PROFILE_POPUP_EVENT, getAuthorKey, normalizeAuthor };
