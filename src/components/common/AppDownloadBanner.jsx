import React from "react";
import { Download, Smartphone } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useAppInstall } from "../../context/AppInstallContext";

const getApkDownloadUrl = () => {
  const configuredUrl = process.env.REACT_APP_ANDROID_APK_URL;
  if (!configuredUrl) {
    return "";
  }

  try {
    const url = new URL(configuredUrl);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.toString()
      : "";
  } catch {
    return "";
  }
};

export const APK_DOWNLOAD_URL = getApkDownloadUrl();

export const AppDownloadButton = ({ className = "" }) => {
  const { t } = useLanguage();
  const { openDialog } = useAppInstall();

  return (
    <button
      type="button"
      onClick={openDialog}
      aria-haspopup="dialog"
      className={className}
    >
      <Download size={14} aria-hidden="true" />
      {t("downloadApp")}
    </button>
  );
};

const AppDownloadBanner = () => {
  const { t } = useLanguage();

  return (
    <section
      aria-label={t("appDownloadTitle")}
      className="flex w-full flex-col items-start gap-3 border border-slate-700 bg-gradient-to-r from-red-700 to-slate-900 px-3 py-3 sm:w-auto sm:flex-row sm:items-center sm:gap-5 sm:px-4"
    >
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/20 bg-white/10 text-white">
          <Smartphone size={16} aria-hidden="true" />
        </span>
        <div>
          <p className="font-post-title text-[11px] font-black uppercase leading-tight tracking-tight text-white">
            {t("appDownloadTitle")}
          </p>
          <p className="mt-0.5 text-[10px] text-red-100">{t("appDownloadSubtitle")}</p>
        </div>
      </div>
      <AppDownloadButton className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-white px-3 py-2 text-[10px] font-bold text-slate-900 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-white/60 sm:w-auto" />
    </section>
  );
};

export default AppDownloadBanner;
