import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Globe, Loader2 } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

const LanguageSelector = ({ variant = "light", className = "" }) => {
    const { language, setLanguage, availableLanguages = [], translating } = useLanguage();
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const handlePointerDown = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        const handleKeyDown = (event) => {
            if (event.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("touchstart", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("touchstart", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open]);

    const active = availableLanguages.find((entry) => entry.code === language);

    const isDark = variant === "dark";

    return (
        <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label="Select language"
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-red-200 ${isDark
                        ? "border-slate-700 bg-slate-900/70 text-slate-200 hover:border-red-500 hover:text-white"
                        : "border-slate-300 bg-white text-slate-700 shadow-sm hover:border-[#B3261E] hover:text-[#B3261E]"
                    }`}
            >
                {translating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                    <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span aria-hidden="true">{active?.flag}</span>
                <span className="hidden max-w-[90px] truncate sm:inline">{active?.name || language}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>

            {open && (
                <ul
                    role="listbox"
                    aria-label="Language"
                    className="absolute right-0 z-50 mt-1.5 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
                >
                    {availableLanguages.map((entry) => {
                        const selected = entry.code === language;
                        return (
                            <li key={entry.code} role="option" aria-selected={selected}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setLanguage(entry.code);
                                        setOpen(false);
                                    }}
                                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${selected
                                            ? "bg-red-50 font-semibold text-[#B3261E]"
                                            : "text-slate-700 hover:bg-slate-50"
                                        }`}
                                >
                                    <span aria-hidden="true" className="text-base leading-none">{entry.flag}</span>
                                    <span className="flex-1 truncate">{entry.name}</span>
                                    {selected && <Check className="h-4 w-4" aria-hidden="true" />}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

export default LanguageSelector;
