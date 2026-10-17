import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Heart } from "lucide-react";

const STORAGE_KEY = "rubavu_article_reactions_v1";

const REACTIONS = [
  { id: "love", emoji: "❤️", rw: "Ndagukunda", en: "Love it" },
  { id: "clap", emoji: "👏", rw: "Byiza", en: "Nice" },
  { id: "wow", emoji: "😮", rw: "Bitangaje", en: "Surprising" },
  { id: "thanks", emoji: "🙏", rw: "Murakoze", en: "Thank you" },
];

const EMPTY_COUNTS = { love: 0, clap: 0, wow: 0, thanks: 0 };

const readStore = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeStore = (store) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore storage failures */
  }
};

const thankYouFor = (id, rw) => {
  switch (id) {
    case "love":
      return rw ? "Urukundo rwawe rwageze kuri rubanda! 💙" : "Your love reached the newsroom! 💙";
    case "clap":
      return rw ? "Murakoze, abanditsi barashimye cyane! 👏" : "Thanks, the writers feel appreciated! 👏";
    case "wow":
      return rw ? "Ndetse na twebwe twabyumvise dutunguye! 😮" : "We are amazed too! 😮";
    case "thanks":
      return rw ? "Turabakiriye, mwamuke neza! 🙏" : "You are most welcome! 🙏";
    default:
      return "";
  }
};

const ArticleReactions = ({ postId, language = "rw", className = "" }) => {
  const rw = language === "rw";
  const id = String(postId || "default");

  const [store, setStore] = useState(() => readStore());
  const [bursts, setBursts] = useState([]);
  const [cheered, setCheered] = useState(false);
  const sectionRef = useRef(null);
  const burstId = useRef(0);

  const entry = store[id] || {};
  const counts = useMemo(
    () => ({ ...EMPTY_COUNTS, ...(entry.counts || {}) }),
    [entry.counts]
  );
  const mine = entry.mine || null;

  useEffect(() => {
    const node = sectionRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((item) => {
          if (item.isIntersecting) {
            setCheered(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.35 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const react = useCallback(
    (reactionId) => {
      setStore((current) => {
        const previous = current[id] || {};
        const prevCounts = { ...EMPTY_COUNTS, ...(previous.counts || {}) };
        const nextCounts = { ...prevCounts };

        if (previous.mine === reactionId) {
          nextCounts[reactionId] = Math.max(0, (nextCounts[reactionId] || 0) - 1);
          const updated = { ...current, [id]: { counts: nextCounts, mine: null } };
          writeStore(updated);
          return updated;
        }

        if (previous.mine) {
          nextCounts[previous.mine] = Math.max(
            0,
            (nextCounts[previous.mine] || 0) - 1
          );
        }

        nextCounts[reactionId] = (nextCounts[reactionId] || 0) + 1;
        const updated = {
          ...current,
          [id]: { counts: nextCounts, mine: reactionId },
        };
        writeStore(updated);
        return updated;
      });
    },
    [id]
  );

  const spawnBurst = (emoji) => {
    const nextId = (burstId.current += 1);
    setBursts((current) => [
      ...current,
      { id: nextId, emoji, left: 10 + Math.random() * 80 },
    ]);

    window.setTimeout(() => {
      setBursts((current) => current.filter((item) => item.id !== nextId));
    }, 1000);
  };

  const handleReact = (reaction) => {
    react(reaction.id);
    spawnBurst(reaction.emoji);
  };

  const css = `
@keyframes rt-reaction-float {
  0% { opacity: 0; transform: translateY(6px) scale(0.7); }
  25% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-58px) scale(1.4); }
}
.rt-reaction-burst {
  position: absolute;
  bottom: 0.75rem;
  font-size: 1.35rem;
  pointer-events: none;
  animation: rt-reaction-float 1s ease-out forwards;
}
@media (prefers-reduced-motion: reduce) {
  .rt-reaction-burst { animation: none; opacity: 0; }
}
`;

  return (
    <section
      ref={sectionRef}
      aria-label={rw ? "Iyumve nk'iyi nkuru" : "React to this story"}
      className={`relative mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 sm:p-5 print:hidden ${className}`}
    >
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {bursts.map((item) => (
        <span
          key={item.id}
          aria-hidden="true"
          className="rt-reaction-burst"
          style={{ left: `${item.left}%` }}
        >
          {item.emoji}
        </span>
      ))}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-post-title text-sm font-black text-slate-950">
            <Heart className="h-4 w-4 text-red-600" />
            {rw ? "Iyumve nk'iyi nkuru?" : "How did this story make you feel?"}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {rw
              ? "Kanda ku kimenyetso bishimira umwanditsi."
              : "Tap an emoji to cheer on the writer."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {REACTIONS.map((reaction) => {
            const active = mine === reaction.id;
            const count = counts[reaction.id] || 0;

            return (
              <button
                key={reaction.id}
                type="button"
                onClick={() => handleReact(reaction)}
                aria-pressed={active}
                aria-label={rw ? reaction.rw : reaction.en}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-sm transition active:scale-90 ${
                  active
                    ? "border-red-500 bg-red-50 text-red-600"
                    : "border-slate-200 bg-white text-slate-600 hover:border-red-200 hover:bg-red-50/60"
                }`}
              >
                <span className="text-base leading-none">{reaction.emoji}</span>
                {count > 0 && (
                  <span className="font-body text-[11px] font-bold tabular-nums">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {(mine || cheered) && (
        <p
          className="mt-3 border-t border-slate-100 pt-3 font-body text-xs font-semibold text-slate-600"
          role="status"
        >
          {mine
            ? thankYouFor(mine, rw)
            : rw
            ? "Urakoze gusoma iyi nkuru kugeza kw'isoranyuma! 💙"
            : "Thank you for reading this story to the end! 💙"}
        </p>
      )}
    </section>
  );
};

export default ArticleReactions;
