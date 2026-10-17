import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../context/LanguageContext";

const postKeyOf = (post) =>
  String(post?.id || post?._id || post?.slug || post?.title || "");

/* Translates the readable text of a list of posts (title + summary/description)
   whenever the active language changes. Category values are left untouched so
   category filtering keeps working; render the label with translateCategory. */
export const useTranslatedPosts = (posts) => {
  const list = useMemo(() => (Array.isArray(posts) ? posts : []), [posts]);
  const { language, translateMany } = useLanguage();
  const [translations, setTranslations] = useState({});

  const signature = useMemo(() => list.map(postKeyOf).join("|"), [list]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const snapshot = useMemo(() => list, [signature]);

  useEffect(() => {
    if (language === "rw" || snapshot.length === 0) {
      setTranslations({});
      return undefined;
    }

    let cancelled = false;
    const titles = snapshot.map((post) => post.title || "");
    const summaries = snapshot.map(
      (post) => post.summary || post.description || ""
    );

    Promise.all([translateMany(titles), translateMany(summaries)])
      .then(([translatedTitles, translatedSummaries]) => {
        if (cancelled) return;
        const next = {};
        snapshot.forEach((post, index) => {
          next[postKeyOf(post)] = {
            title: translatedTitles[index],
            summary: translatedSummaries[index],
          };
        });
        setTranslations(next);
      })
      .catch(() => {
        if (!cancelled) setTranslations({});
      });

    return () => {
      cancelled = true;
    };
  }, [signature, snapshot, language, translateMany]);

  return useMemo(() => {
    if (language === "rw") return list;
    return list.map((post) => {
      const translated = translations[postKeyOf(post)];
      if (!translated) return post;
      return {
        ...post,
        title: translated.title || post.title,
        summary: translated.summary || post.summary,
      };
    });
  }, [list, translations, language]);
};

export default useTranslatedPosts;
