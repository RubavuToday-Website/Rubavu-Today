import React from "react";
import { Smartphone, Download } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

export const APK_DOWNLOAD_URL = "/apk/rubavu-today.apk";

const AppDownloadBanner = () => {
  const { t } = useLanguage();

  return (
    <section
      aria-label={t("appDownloadTitle")}
      className="border border-slate-700 bg-gradient-to-r from-red-700 to-slate-900 print:hidden"
    >
      <div className="flex flex-col gap-2 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-white/20 bg-white/10 text-white">
            <Smartphone size={14} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="font-post-title text-[11px] font-black uppercase leading-tight tracking-tight text-white">
              {t("appDownloadTitle")}
            </p>
          </div>
        </div>

        <a
          href={APK_DOWNLOAD_URL}
          download
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-white px-2 py-1.5 text-[10px] font-bold text-slate-900 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-white/60"
        >
          <Download size={12} aria-hidden="true" />
          {t("downloadApk")}
        </a>
      </div>
    </section>
  );
};

export default AppDownloadBanner;
