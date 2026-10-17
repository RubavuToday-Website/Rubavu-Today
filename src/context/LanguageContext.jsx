import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import rw from "../i18n/rw.json";
import en from "../i18n/en.json";
import {
    TRANSLATE_LANGUAGES,
    isSupportedLanguage,
    translateBatch,
    translateText,
} from "../services/translation";

/* Multilingual site (Kinyarwanda, English, French, Kiswahili).
   Posts are authored in Kinyarwanda (rw). When another language is selected:
   - the site UI dictionary (rw.json) is machine-translated and cached;
   - article titles, summaries and bodies are translated on demand.
   The provider keeps the same public surface (useLanguage, t, setLanguage,
   flags, translateCategory) so every existing component keeps working. */

const STORAGE_KEY = "selectedLanguage";
const DICT_STORAGE_PREFIX = "rubavu_i18n_";

const LanguageContext = createContext();

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used within LanguageProvider");
    }
    return context;
};

const getNestedValue = (obj, key) => {
    if (!obj) return undefined;
    if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];
    return key
        .split(".")
        .reduce(
            (acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined),
            obj
        );
};

const flatten = (obj, prefix = "", out = {}) => {
    Object.entries(obj).forEach(([key, value]) => {
        const nextKey = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === "object") {
            flatten(value, nextKey, out);
        } else {
            out[nextKey] = value;
        }
    });
    return out;
};

const setNested = (obj, key, value) => {
    const parts = key.split(".");
    let cursor = obj;
    for (let index = 0; index < parts.length - 1; index += 1) {
        if (typeof cursor[parts[index]] !== "object" || cursor[parts[index]] == null) {
            cursor[parts[index]] = {};
        }
        cursor = cursor[parts[index]];
    }
    cursor[parts[parts.length - 1]] = value;
    return obj;
};

const CATEGORY_MAP = {
    Amakuru: { en: "News", fr: "Actualités", sw: "Habari" },
    Ubukungu: { en: "Economy", fr: "Économie", sw: "Uchumi" },
    Imikino: { en: "Sports", fr: "Sports", sw: "Michezo" },
    Imyidagaduro: { en: "Entertainment", fr: "Divertissement", sw: "Burudani" },
    Uburezi: { en: "Education", fr: "Éducation", sw: "Elimu" },
};

/* Category labels are stored on posts in Kinyarwanda. */
export const translateCategory = (category, language = "rw") => {
    const value = String(category || "").trim();
    const entry = CATEGORY_MAP[value];
    if (!entry) return category;
    return entry[language] || category;
};

const readDictCache = (language) => {
    try {
        const raw = window.localStorage.getItem(`${DICT_STORAGE_PREFIX}${language}`);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const writeDictCache = (language, dict) => {
    try {
        window.localStorage.setItem(
            `${DICT_STORAGE_PREFIX}${language}`,
            JSON.stringify(dict)
        );
    } catch {
        /* ignore storage errors */
    }
};

export const LanguageProvider = ({ children }) => {
    const [language, setLanguageState] = useState(() => {
        try {
            const stored = window.localStorage.getItem(STORAGE_KEY);
            return isSupportedLanguage(stored) ? stored : "rw";
        } catch {
            return "rw";
        }
    });
    const [translating, setTranslating] = useState(false);
    const [dictionary, setDictionary] = useState(() => (language === "en" ? en : rw));

    useEffect(() => {
        try {
            window.localStorage.setItem(STORAGE_KEY, language);
        } catch {
            /* ignore storage errors */
        }
    }, [language]);

    useEffect(() => {
        if (language === "rw") {
            setDictionary(rw);
            return undefined;
        }
        if (language === "en") {
            setDictionary(en);
            return undefined;
        }

        const cached = readDictCache(language);
        if (cached) {
            setDictionary(cached);
            return undefined;
        }

        let cancelled = false;
        const flat = flatten(rw);
        const keys = Object.keys(flat);
        const values = keys.map((key) => String(flat[key]));
        const CHUNK_SIZE = 16;

        setTranslating(true);
        (async () => {
            const next = {};
            for (let start = 0; start < keys.length; start += CHUNK_SIZE) {
                if (cancelled) return;
                const chunkKeys = keys.slice(start, start + CHUNK_SIZE);
                const chunkValues = values.slice(start, start + CHUNK_SIZE);
                const translated = await translateBatch(chunkValues, language, "rw");
                chunkKeys.forEach((key, index) => {
                    setNested(next, key, translated[index]);
                });
            }
            if (cancelled) return;
            setDictionary(next);
            writeDictCache(language, next);
        })()
            .catch(() => {
                /* keep the Kinyarwanda dictionary on failure */
            })
            .finally(() => {
                if (!cancelled) setTranslating(false);
            });

        return () => {
            cancelled = true;
        };
    }, [language]);

    const t = useCallback(
        (key) => {
            const value = getNestedValue(dictionary, key);
            if (value !== undefined) return value;
            return getNestedValue(rw, key) || getNestedValue(en, key) || key;
        },
        [dictionary]
    );

    const setLanguage = useCallback((next) => {
        if (isSupportedLanguage(next)) setLanguageState(next);
    }, []);

    const translate = useCallback(
        (text) => translateText(text, language, "rw"),
        [language]
    );

    const translateMany = useCallback(
        (texts) => translateBatch(texts, language, "rw"),
        [language]
    );

    const value = useMemo(
        () => ({
            language,
            setLanguage,
            translating,
            setTranslating: () => {},
            translationUnavailable: false,
            setTranslationUnavailable: () => {},
            translationUnavailableCode: null,
            t,
            translate,
            translateMany,
            translateCategory: (category) => translateCategory(category, language),
            LANGUAGES: TRANSLATE_LANGUAGES.reduce((acc, entry) => {
                acc[entry.code] = { name: entry.name, flag: entry.flag };
                return acc;
            }, {}),
            availableLanguages: TRANSLATE_LANGUAGES,
        }),
        [language, setLanguage, translating, t, translate, translateMany]
    );

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

export default LanguageContext;
