import React, { useState } from "react";
import { ArrowLeft, ArrowUpRight, Check, Share2 } from "lucide-react";
import { Link } from "react-router-dom";
import { SiteSEO } from "../components/SEO/SEO";
import radioLogo from "../Rubavu Today Radio.png";

const RADIO_URL = "https://www.rubavutoday.com/radio";
const STATION_URL = "https://gocast.fm/station/rubavutoday-radio";
const RADIO_DESCRIPTION =
  "Amakuru, ibiganiro, imyidagaduro, umuziki n'izindi porogaramu zo muri Rubavu.";

function RadioPage() {
  const [shareStatus, setShareStatus] = useState("");

  const shareRadio = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "RubavuToday Radio",
          text: RADIO_DESCRIPTION,
          url: RADIO_URL,
        });
        setShareStatus("");
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Could not share RubavuToday Radio.", error);
          setShareStatus("Ntibyashobotse gusangira.");
        }
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(RADIO_URL);
      setShareStatus("Ihuza ryakoporowe.");
    } catch (error) {
      console.error("Could not copy the RubavuToday Radio link.", error);
      setShareStatus("Ntibyashobotse gukoporora ihuza.");
    }
  };

  return (
    <>
      <SiteSEO
        title="RubavuToday Radio"
        description={RADIO_DESCRIPTION}
        canonicalPath="/radio"
        image="/Rubavu-Today-Radio.png"
      />
      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
        <header className="mb-6 flex flex-col items-center gap-3 text-center">
          <h1 className="font-masthead text-2xl font-extrabold uppercase tracking-tight text-red-700 sm:text-3xl">
            RubavuToday Radio
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-700">
            {RADIO_DESCRIPTION}
          </p>
          <Link
            to="/"
            className="inline-flex min-h-10 items-center justify-center gap-2 border border-red-200 px-4 py-2 text-sm font-bold text-red-700 transition hover:border-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Garuka ku makuru
          </Link>
        </header>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
          <div className="flex flex-col items-center gap-5 p-5 text-center sm:flex-row sm:p-8 sm:text-left">
            <img
              src={radioLogo}
              alt="RubavuToday Radio"
              className="h-36 w-36 shrink-0 object-contain sm:h-44 sm:w-44"
            />

            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-red-700">
                Porogaramu iriho
              </p>
              <h2 className="mt-1 font-masthead text-2xl font-extrabold text-slate-950">
                RubavuToday Radio
              </h2>
              <span
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-black tracking-wider text-red-700"
                role="status"
                aria-label="Radio iriho ubu"
              >
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" aria-hidden="true" />
                LIVE
              </span>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                <a
                  href={STATION_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-md bg-red-600 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                >
                  Fungura Radio
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </a>
                <button
                  type="button"
                  onClick={shareRadio}
                  className="inline-flex min-h-11 items-center gap-2 border border-slate-300 px-4 py-3 text-sm font-bold text-slate-800 transition hover:border-red-500 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                >
                  {shareStatus === "Ihuza ryakoporowe." ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Share2 className="h-4 w-4" aria-hidden="true" />
                  )}
                  Sangira
                </button>
              </div>
              {shareStatus && (
                <p className="mt-3 text-xs text-slate-600" role="status" aria-live="polite">
                  {shareStatus}
                </p>
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export default RadioPage;
