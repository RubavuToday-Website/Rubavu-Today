import React, { useEffect, useRef } from "react";
import { Download, Smartphone, X } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { APK_DOWNLOAD_URL } from "./AppDownloadBanner";
import { useAppInstall } from "../../context/AppInstallContext";

const AppDownloadDialog = () => {
  const { t } = useLanguage();
  const {
    canInstall,
    closeDialog,
    installApp,
    installError,
    isDialogOpen,
    isInstalled,
  } = useAppInstall();
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!isDialogOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    const focusableSelector = "button:not([disabled]), a[href]";
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeDialog();
        return;
      }

      if (event.key === "Tab") {
        const focusableElements = dialogRef.current?.querySelectorAll(focusableSelector);
        if (!focusableElements?.length) {
          event.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    dialogRef.current?.querySelector(focusableSelector)?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      if (previousFocus instanceof HTMLElement) {
        previousFocus.focus();
      }
    };
  }, [closeDialog, isDialogOpen]);

  if (!isDialogOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeDialog();
        }
      }}
    >
      <section
        aria-labelledby="app-download-title"
        aria-modal="true"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        role="dialog"
        ref={dialogRef}
      >
        <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-red-700 to-slate-950 px-5 py-5 text-white sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/20 bg-white/10">
              <Smartphone size={22} aria-hidden="true" />
            </span>
            <div>
              <h2 id="app-download-title" className="font-post-title text-lg font-black">
                {t("appDownloadTitle")}
              </h2>
              <p className="mt-1 text-xs text-red-100">{t("appDownloadSubtitle")}</p>
            </div>
          </div>
          <button
            type="button"
            aria-label={t("close")}
            onClick={closeDialog}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-3 p-5 sm:p-6">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-red-600">
                <Smartphone size={19} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-900">{t("installPwa")}</h3>
                {isInstalled ? (
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {t("appAlreadyInstalled")}
                  </p>
                ) : canInstall ? (
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {t("installPwaDescription")}
                  </p>
                ) : (
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {t("installFromBrowser")}
                  </p>
                )}
                {!isInstalled && canInstall && (
                  <button
                    type="button"
                    onClick={installApp}
                    className="mt-3 inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    {t("installApp")}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-red-600">
                <Download size={19} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-900">{t("androidApk")}</h3>
                {APK_DOWNLOAD_URL ? (
                  <>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      {t("downloadApkDescription")}
                    </p>
                    <a
                      href={APK_DOWNLOAD_URL}
                      download
                      className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-800 transition hover:border-red-500 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      <Download size={14} aria-hidden="true" />
                      {t("downloadApk")}
                    </a>
                  </>
                ) : (
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {t("apkNotPublished")}
                  </p>
                )}
              </div>
            </div>
          </div>

          {installError && (
            <p role="alert" className="text-xs font-medium text-red-700">
              {installError}
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default AppDownloadDialog;
