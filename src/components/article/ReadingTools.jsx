import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Headphones,
  Play,
  Pause,
  Square,
  Sun,
  Moon,
  Minus,
  Plus,
  ChevronsUp,
  Clock,
} from "lucide-react";

const FONT_SCALE_KEY = "rubavu_reader_font_scale";
const DARK_MODE_KEY = "rubavu_reader_dark";

const FONT_STEPS = [0.9, 1, 1.15, 1.3, 1.5];

const splitSentences = (value) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return [];

  const matches = text.match(/[^.!?…]+[.!?…]+["')\]]*\s*|[^.!?…]+$/g);

  return (matches || [text])
    .map((part) => part.trim())
    .filter(Boolean);
};

const readStoredNumber = (key, fallback) => {
  try {
    const raw = Number(window.localStorage.getItem(key));
    return Number.isFinite(raw) && raw > 0 ? raw : fallback;
  } catch {
    return fallback;
  }
};

const readStoredFlag = (key) => {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
};

const ReadingTools = ({
  contentId,
  text = "",
  title = "",
  language = "rw",
}) => {
  const rw = language === "rw";

  const [fontScale, setFontScale] = useState(() =>
    readStoredNumber(FONT_SCALE_KEY, 1)
  );
  const [darkMode, setDarkMode] = useState(() => readStoredFlag(DARK_MODE_KEY));
  const [progress, setProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechStatus, setSpeechStatus] = useState("idle");
  const [rate, setRate] = useState(0.95);
  const [voices, setVoices] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const synthRef = useRef(null);
  const rateRef = useRef(rate);
  const voiceRef = useRef(null);
  const stoppedRef = useRef(false);
  const timerRef = useRef(null);

  const sentences = useMemo(() => splitSentences(text), [text]);

  const readingMinutes = useMemo(() => {
    const words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
    if (!words) return 0;
    return Math.max(1, Math.round(words / 200));
  }, [text]);

  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const synth = window.speechSynthesis;
    synthRef.current = synth;
    setSpeechSupported(true);

    const loadVoices = () => {
      const list = synth.getVoices ? synth.getVoices() : [];
      if (list && list.length) {
        setVoices(list);
      }
    };

    loadVoices();
    synth.addEventListener?.("voiceschanged", loadVoices);

    return () => {
      synth.removeEventListener?.("voiceschanged", loadVoices);
    };
  }, []);

  useEffect(() => {
    voiceRef.current = pickVoice(voices, language);
  }, [voices, language]);

  useEffect(() => {
    const el = contentId ? document.getElementById(contentId) : null;
    if (!el) return;

    el.style.setProperty("--reader-scale", String(fontScale));
  }, [contentId, fontScale]);

  useEffect(() => {
    const el = contentId ? document.getElementById(contentId) : null;
    if (!el) return;

    el.classList.toggle("rt-reader-dark", darkMode);
  }, [contentId, darkMode]);

  useEffect(() => {
    const handleScroll = () => {
      const el = contentId ? document.getElementById(contentId) : null;

      if (el) {
        const rect = el.getBoundingClientRect();
        const total = el.offsetHeight - window.innerHeight;
        const scrolled = -rect.top;
        const ratio = total > 0 ? scrolled / total : 0;
        setProgress(Math.min(100, Math.max(0, ratio * 100)));
      }

      setShowBackToTop(window.scrollY > 600);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [contentId]);

  const stopSpeech = useCallback((resetIndex = true) => {
    stoppedRef.current = true;

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const synth = synthRef.current || window.speechSynthesis;
    if (synth) {
      synth.cancel();
    }

    setSpeechStatus("idle");
    if (resetIndex) setCurrentIndex(0);
  }, []);

  useEffect(() => {
    stopSpeech(true);
  }, [text, stopSpeech]);

  useEffect(
    () => () => {
      stoppedRef.current = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (synthRef.current) synthRef.current.cancel();
    },
    []
  );

  const speakSentence = useCallback(
    (index) => {
      const synth = synthRef.current;
      if (!synth) return;

      if (index >= sentences.length) {
        setSpeechStatus("idle");
        setCurrentIndex(0);
        return;
      }

      const utterance = new window.SpeechSynthesisUtterance(sentences[index]);
      const voice = voiceRef.current;

      if (voice) utterance.voice = voice;
      utterance.lang = voice?.lang || (rw ? "rw-RW" : "en-US");
      utterance.rate = Math.min(2, Math.max(0.5, rateRef.current));
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onend = () => {
        if (stoppedRef.current) return;

        const next = index + 1;

        if (next >= sentences.length) {
          setSpeechStatus("idle");
          setCurrentIndex(0);
          return;
        }

        setCurrentIndex(next);
        timerRef.current = window.setTimeout(
          () => speakSentence(next),
          260
        );
      };

      utterance.onerror = () => {
        if (stoppedRef.current) return;
        setSpeechStatus("idle");
      };

      setCurrentIndex(index);
      synth.speak(utterance);
    },
    [sentences, rw]
  );

  const startSpeech = useCallback(
    (fromIndex = 0) => {
      const synth = synthRef.current;
      if (!synth || sentences.length === 0) return;

      stoppedRef.current = false;
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      synth.cancel();

      setSpeechStatus("playing");
      speakSentence(Math.min(fromIndex, sentences.length - 1));
    },
    [sentences, speakSentence]
  );

  const toggleSpeech = useCallback(() => {
    const synth = synthRef.current;
    if (!synth) return;

    if (speechStatus === "playing") {
      synth.pause();
      setSpeechStatus("paused");
      return;
    }

    if (speechStatus === "paused") {
      synth.resume();
      setSpeechStatus("playing");
      return;
    }

    startSpeech(currentIndex);
  }, [speechStatus, currentIndex, startSpeech]);

  const adjustFontScale = (direction) => {
    setFontScale((current) => {
      const index = FONT_STEPS.findIndex((step) => step >= current - 0.001);
      const baseIndex = index === -1 ? FONT_STEPS.length - 1 : index;
      const nextIndex = Math.min(
        FONT_STEPS.length - 1,
        Math.max(0, baseIndex + direction)
      );
      const next = FONT_STEPS[nextIndex];

      try {
        window.localStorage.setItem(FONT_SCALE_KEY, String(next));
      } catch {
        /* ignore storage failures */
      }

      return next;
    });
  };

  const toggleDarkMode = () => {
    setDarkMode((current) => {
      const next = !current;

      try {
        window.localStorage.setItem(DARK_MODE_KEY, next ? "1" : "0");
      } catch {
        /* ignore storage failures */
      }

      return next;
    });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const css = `
#${contentId} { transition: background-color .25s ease, color .25s ease; }
#${contentId} p,
#${contentId} li { font-size: calc(1.0625rem * var(--reader-scale, 1)); }
#${contentId} h2,
#${contentId} h3 { font-size: calc(1.35rem * var(--reader-scale, 1)); }
#${contentId} blockquote { font-size: calc(1.15rem * var(--reader-scale, 1)); }
#${contentId}.rt-reader-dark {
  background-color: #0b1220;
  border-radius: 1rem;
  padding: 1.25rem;
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.18);
}
#${contentId}.rt-reader-dark h1,
#${contentId}.rt-reader-dark h2,
#${contentId}.rt-reader-dark h3,
#${contentId}.rt-reader-dark .news-headline-featured { color: #f8fafc !important; }
#${contentId}.rt-reader-dark p,
#${contentId}.rt-reader-dark li,
#${contentId}.rt-reader-dark blockquote { color: #cbd5e1 !important; }
#${contentId}.rt-reader-dark .bg-white { background-color: #111c2e !important; }
#${contentId}.rt-reader-dark .border-slate-200 { border-color: #23324a !important; }
#${contentId}.rt-reader-dark a { color: #93c5fd; }
`;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div
        className="fixed left-0 top-0 z-[70] h-0.5 bg-red-600 transition-[width] duration-150 ease-out print:hidden"
        style={{ width: `${progress}%` }}
        role="progressbar"
        aria-label={rw ? "Aho usomiye ugeze" : "Reading progress"}
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      />

      <div className="print:hidden mt-3 sm:mt-4">
        <div className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-full border border-slate-200 bg-white/95 px-1.5 py-1 shadow-sm backdrop-blur">
          {readingMinutes > 0 && (
            <span className="inline-flex items-center gap-1 px-2 font-body text-[10px] font-bold text-slate-500">
              <Clock className="h-3 w-3" />
              {rw ? `${readingMinutes} min` : `${readingMinutes} min`}
            </span>
          )}

          {speechSupported && sentences.length > 0 && (
            <div className="inline-flex items-center gap-0.5 rounded-full bg-slate-900 p-0.5 text-white">
              <button
                type="button"
                onClick={toggleSpeech}
                className="inline-flex h-6 items-center gap-1 rounded-full bg-red-600 px-2 font-body text-[10px] font-bold transition hover:bg-red-700"
                aria-label={rw ? "Soma inkuru mu ijwi" : "Listen to the article"}
              >
                {speechStatus === "playing" ? (
                  <Pause className="h-3 w-3" />
                ) : speechStatus === "paused" ? (
                  <Play className="h-3 w-3" />
                ) : (
                  <Headphones className="h-3 w-3" />
                )}
                <span className="hidden xs:inline">
                  {speechStatus === "playing"
                    ? rw
                      ? "Hagarika"
                      : "Pause"
                    : speechStatus === "paused"
                    ? rw
                      ? "Komeza"
                      : "Resume"
                    : rw
                    ? "Umva"
                    : "Listen"}
                </span>
              </button>

              {(speechStatus === "playing" || speechStatus === "paused") && (
                <button
                  type="button"
                  onClick={() => stopSpeech(true)}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-white/70 transition hover:text-white"
                  aria-label={rw ? "Hagarika rwose" : "Stop"}
                >
                  <Square className="h-3 w-3" />
                </button>
              )}

              <select
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="h-6 rounded-full bg-white/10 px-1 font-body text-[10px] font-bold text-white outline-none"
                aria-label={rw ? "Umuvuduko wo gusoma" : "Reading speed"}
              >
                <option value={0.75} className="text-slate-900">0.75x</option>
                <option value={0.95} className="text-slate-900">1x</option>
                <option value={1.25} className="text-slate-900">1.25x</option>
                <option value={1.5} className="text-slate-900">1.5x</option>
              </select>
            </div>
          )}

          <div className="inline-flex items-center rounded-full bg-slate-100 p-0.5">
            <button
              type="button"
              onClick={() => adjustFontScale(-1)}
              className="flex h-6 w-6 items-center justify-center rounded-full text-slate-600 transition hover:bg-white hover:text-slate-900"
              aria-label={rw ? "Gabanya inyuguti" : "Decrease text size"}
            >
              <Minus className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => adjustFontScale(1)}
              className="flex h-6 w-6 items-center justify-center rounded-full text-slate-600 transition hover:bg-white hover:text-slate-900"
              aria-label={rw ? "Ongera inyuguti" : "Increase text size"}
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          <button
            type="button"
            onClick={toggleDarkMode}
            aria-pressed={darkMode}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-slate-900"
            aria-label={
              darkMode
                ? rw
                  ? "Hindura mu mucyo"
                  : "Switch to light mode"
                : rw
                ? "Hindura mu mwijima"
                : "Switch to dark mode"
            }
          >
            {darkMode ? (
              <Sun className="h-3 w-3" />
            ) : (
              <Moon className="h-3 w-3" />
            )}
          </button>
        </div>

        {(speechStatus === "playing" || speechStatus === "paused") &&
          sentences[currentIndex] && (
            <p className="mt-2 max-w-full rounded-lg bg-slate-50 px-2 py-1 font-body text-[11px] italic text-slate-600">
              <span className="font-bold not-italic text-red-600">
                {rw ? "Arasoma:" : "Reading:"}
              </span>{" "}
              {sentences[currentIndex]}
            </p>
          )}
      </div>

      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label={rw ? "Subira hejuru — sita hejuru" : "Swipe up to top"}
          title={rw ? "Sita hejuru usubire ahabanza" : "Swipe up to go back to top"}
          className="fixed bottom-5 left-5 z-[60] flex flex-col items-center gap-0.5 rounded-full bg-red-600 px-3 py-2 text-white shadow-lg transition hover:bg-red-700 print:hidden"
        >
          <ChevronsUp className="rt-swipe-up-icon h-5 w-5" aria-hidden="true" />
          <span className="font-body text-[8px] font-black uppercase leading-none tracking-wider">
            {rw ? "Hejuru" : "Up"}
          </span>
        </button>
      )}
    </>
  );
};

const pickVoice = (voices, language) => {
  if (!Array.isArray(voices) || voices.length === 0) return null;

  const rw = language === "rw";
  const langPrefixes = rw ? ["rw", "sw", "en"] : ["en"];

  const score = (voice) => {
    const lang = String(voice.lang || "").toLowerCase();
    const name = String(voice.name || "").toLowerCase();

    let value = 0;
    const prefixIndex = langPrefixes.findIndex((prefix) =>
      lang.startsWith(prefix)
    );
    if (prefixIndex === -1) return -1;

    value += (langPrefixes.length - prefixIndex) * 10;

    if (/natural|neural|premium|enhanced|siri/.test(name)) value += 6;
    if (/google/.test(name)) value += 4;
    if (/female|woman|zira|samantha|aria|jenny/.test(name)) value += 2;
    if (voice.localService) value += 1;
    if (voice.default) value += 1;

    return value;
  };

  return [...voices]
    .map((voice) => ({ voice, value: score(voice) }))
    .filter((entry) => entry.value >= 0)
    .sort((a, b) => b.value - a.value)[0]?.voice || null;
};

export default ReadingTools;
