import { API_ROOT } from "./api";

const ENDPOINT = `${API_ROOT}/api/translate`;
const STORAGE_PREFIX = "rubavu_tr_v1_";
const CHUNK_SIZE = 25;
const memory = new Map();
const inFlight = new Map();

export const TRANSLATE_LANGUAGES = [
  { code: "rw", name: "Ikinyarwanda", flag: "🇷🇼" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "sw", name: "Kiswahili", flag: "🇹🇿" },
];

export const isSupportedLanguage = (code) =>
  TRANSLATE_LANGUAGES.some((entry) => entry.code === code);

const hash = (str) => {
  let value = 5381;
  for (let index = 0; index < str.length; index += 1) {
    value = ((value << 5) + value + str.charCodeAt(index)) | 0;
  }
  return (value >>> 0).toString(36);
};

const cacheKey = (text, source, target) =>
  `${STORAGE_PREFIX}${source}:${target}:${hash(text)}`;

const readCache = (key) => {
  if (memory.has(key)) return memory.get(key);
  try {
    const value = window.localStorage.getItem(key);
    if (value != null) {
      memory.set(key, value);
      return value;
    }
  } catch {
    /* ignore storage errors */
  }
  return null;
};

const writeCache = (key, value) => {
  memory.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore storage errors */
  }
};

const PLACEHOLDER_PATTERN = /\{[a-zA-Z0-9_]+\}/g;

const placeholdersPreserved = (original, translated) => {
  const expected = String(original).match(PLACEHOLDER_PATTERN) || [];
  if (expected.length === 0) return true;
  const produced = String(translated).match(PLACEHOLDER_PATTERN) || [];
  return expected.every((token) => produced.includes(token));
};

const requestTranslation = async (texts, target, source) => {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts, target, source }),
  });

  if (!response.ok) {
    throw new Error(`translate_${response.status}`);
  }

  const data = await response.json();
  const list = Array.isArray(data?.translations) ? data.translations : [];

  return texts.map((text, index) => {
    const value = list[index];
    return typeof value === "string" && value.trim() ? value : text;
  });
};

export const translateText = async (text, target, source = "rw") => {
  const value = String(text ?? "");

  if (!value.trim()) return value;
  if (!isSupportedLanguage(target) || target === "rw" || target === source) {
    return value;
  }

  const key = cacheKey(value, source, target);
  const cached = readCache(key);
  if (cached != null) return cached;

  if (inFlight.has(key)) return inFlight.get(key);

  const promise = (async () => {
    try {
      const [translated] = await requestTranslation([value], target, source);
      const finalValue = placeholdersPreserved(value, translated) ? translated : value;
      writeCache(key, finalValue);
      return finalValue;
    } catch {
      return value;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  return promise;
};

export const translateBatch = async (texts, target, source = "rw") => {
  const list = Array.isArray(texts) ? texts.map((item) => String(item ?? "")) : [];

  if (!isSupportedLanguage(target) || target === "rw" || target === source) {
    return list;
  }

  const results = list.map((text) => {
    if (!text.trim()) return text;
    const cached = readCache(cacheKey(text, source, target));
    return cached != null ? cached : null;
  });

  const pending = results
    .map((value, index) => (value == null ? index : -1))
    .filter((index) => index >= 0);

  if (pending.length === 0) {
    return results.map((value, index) => (value == null ? list[index] : value));
  }

  for (let start = 0; start < pending.length; start += CHUNK_SIZE) {
    const chunkIndexes = pending.slice(start, start + CHUNK_SIZE);
    const chunkTexts = chunkIndexes.map((index) => list[index]);

    try {
      const translated = await requestTranslation(chunkTexts, target, source);
      chunkIndexes.forEach((index, position) => {
        const original = list[index];
        const value = translated[position];
        const finalValue = placeholdersPreserved(original, value) ? value : original;
        results[index] = finalValue;
        writeCache(cacheKey(original, source, target), finalValue);
      });
    } catch {
      pending.slice(0, CHUNK_SIZE);
      chunkIndexes.forEach((index) => {
        results[index] = list[index];
      });
    }
  }

  return results.map((value, index) => (value == null ? list[index] : value));
};
