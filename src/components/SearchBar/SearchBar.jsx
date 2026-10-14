import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Loader2, Search, X } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { searchPosts } from "../../services/api";
import { getArticleUrl } from "../../utils/slug";
import OptimizedImage from "../common/OptimizedImage";
import { RESOLUTION_WIDTHS } from "../../utils/images";

const formatDate = (value) => value ? new Date(value).toLocaleDateString("rw-RW", { day: "numeric", month: "short", year: "numeric" }) : "";

const Highlight = ({ text, query }) => {
    const value = String(text || "");
    const terms = String(query || "").trim().split(/\s+/).filter(Boolean);
    if (!value || !terms.length) return value;
    const pattern = new RegExp(`(${terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "ig");
    return value.split(pattern).map((part, index) => terms.some((term) => part.toLowerCase() === term.toLowerCase()) ? <mark key={`${part}-${index}`} className="rounded bg-yellow-200 px-0.5 text-slate-950">{part}</mark> : part);
};

const SearchResultCard = ({ post, query }) => (
    <Link to={getArticleUrl(post)} className="group flex h-20 w-[min(78vw,250px)] shrink-0 flex-row overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:border-red-300 hover:bg-slate-50 hover:shadow-md sm:w-[250px]">
        <div className="relative h-full w-20 shrink-0 overflow-hidden bg-slate-100">
            {post.image ? <OptimizedImage src={post.image} alt="" widths={RESOLUTION_WIDTHS.THUMB} sizes="280px" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/Rubavu.jpeg"; }} /> : <img src="/Rubavu.jpeg" alt="" className="h-full w-full object-cover" loading="lazy" width="80" height="80" />}
            <span className="news-category news-category-inverse absolute bottom-1 left-1 rounded bg-red-600 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white">{post.category || "Amakuru"}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center px-2 py-1.5">
            <h3 className="news-headline-card line-clamp-2 font-post-title text-xs font-bold leading-tight text-slate-950 group-hover:text-red-700"><Highlight text={post.title} query={query} /></h3>
            {post.createdDate && <time className="news-meta mt-1 font-semibold uppercase tracking-wider">{formatDate(post.createdDate)}</time>}
        </div>
    </Link>
);

const SearchBar = ({ value, onChange, searchHistory = [], onSelectHistory, isLoading: externalLoading }) => {
    const { t } = useLanguage();
    const [isFocused, setIsFocused] = useState(false);
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [error, setError] = useState(false);
    const dropdownRef = useRef(null);
    const railRef = useRef(null);
    const dragState = useRef(null);

    useEffect(() => {
        const query = String(value || "").trim();
        if (!query) {
            setResults([]);
            setHasSearched(false);
            setError(false);
            return undefined;
        }
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            setIsLoading(true);
            setError(false);
            try {
                const data = await searchPosts(query, { signal: controller.signal });
                setResults(data.posts || []);
                setHasSearched(true);
            } catch (requestError) {
                if (requestError.name !== "AbortError") { setResults([]); setHasSearched(true); setError(true); }
            } finally {
                if (!controller.signal.aborted) setIsLoading(false);
            }
        }, 300);
        return () => { controller.abort(); clearTimeout(timer); };
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsFocused(false); };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const scrollRail = (amount) => railRef.current?.scrollBy({ left: amount, behavior: "smooth" });
    const handlePointerDown = (event) => { if (railRef.current) { dragState.current = { x: event.clientX, left: railRef.current.scrollLeft }; railRef.current.setPointerCapture?.(event.pointerId); } };
    const handlePointerMove = (event) => { if (dragState.current && railRef.current) railRef.current.scrollLeft = dragState.current.left - (event.clientX - dragState.current.x); };
    const handlePointerUp = () => { dragState.current = null; };
    const query = String(value || "").trim();
    const showResults = isFocused && query && hasSearched;
    const showHistory = isFocused && !query && searchHistory.length > 0;

    return (
        <div ref={dropdownRef} className="relative w-full">
            <label htmlFor="news-search" className="sr-only">{t("searchLabel")}</label>
            <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input id="news-search" type="search" autoComplete="off" placeholder="Shakisha inkuru…" value={value} onChange={(event) => onChange(event.target.value)} onFocus={() => setIsFocused(true)} className="w-full rounded-full border border-slate-300 bg-white py-2 pl-9 pr-20 text-sm text-slate-950 shadow-sm outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-100 sm:text-base" />
                <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
                    {(isLoading || externalLoading) && <Loader2 className="h-4 w-4 animate-spin text-red-600" aria-label={t("searching")} />}
                    {value && !isLoading && <button type="button" onClick={() => onChange("")} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={t("clearSearch")}><X className="h-4 w-4" /></button>}
                </div>
            </div>
            {(showResults || showHistory) && <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-2xl sm:p-4">
                {showHistory && <div className="flex flex-wrap gap-2"><span className="w-full text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("recentSearches")}</span>{searchHistory.map((item) => <button key={item} type="button" onClick={() => onSelectHistory?.(item)} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-700 hover:bg-red-50 hover:text-red-700">{item}</button>)}</div>}
                {showResults && <><div className="mb-3 flex items-center justify-between gap-2"><p className="text-sm font-bold text-slate-950">Ibisubizo by’ishakisha</p><div className="hidden gap-1 sm:flex"><button type="button" onClick={() => scrollRail(-300)} className="rounded-full border border-slate-200 p-1.5 text-slate-600 hover:border-red-300 hover:text-red-600" aria-label="Ibisubizo bibanza"><ChevronLeft className="h-4 w-4" /></button><button type="button" onClick={() => scrollRail(300)} className="rounded-full border border-slate-200 p-1.5 text-slate-600 hover:border-red-300 hover:text-red-600" aria-label="Ibisubizo bikurikira"><ChevronRight className="h-4 w-4" /></button></div></div>{error || !results.length ? <p className="py-6 text-center text-sm text-slate-500">Nta nkuru ijyanye n’icyo washakishije yabonetse.</p> : <div ref={railRef} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} className="flex cursor-grab gap-3 overflow-x-auto pb-1 [scrollbar-width:none] active:cursor-grabbing [&::-webkit-scrollbar]:hidden">{results.map((post) => <SearchResultCard key={post.id} post={post} query={query} />)}</div>}</>}
            </div>}
        </div>
    );
};

export default SearchBar;