import React from "react";
import { Loader2, Search, X } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

const SearchBar = ({ value, onChange, isLoading: externalLoading }) => {
    const { t } = useLanguage();

    return (
        <div className="relative w-full">
            <label htmlFor="news-search" className="sr-only">{t("searchLabel")}</label>
            <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input id="news-search" type="search" autoComplete="off" placeholder="Shakisha inkuru…" value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-full border border-slate-300 bg-white py-2 pl-9 pr-20 text-sm text-slate-950 shadow-sm outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-100 sm:text-base" />
                <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1">
                    {externalLoading && <Loader2 className="h-4 w-4 animate-spin text-red-600" aria-label={t("searching")} />}
                    {value && !externalLoading && <button type="button" onClick={() => onChange("")} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={t("clearSearch")}><X className="h-4 w-4" /></button>}
                </div>
            </div>
        </div>
    );
};

export default SearchBar;