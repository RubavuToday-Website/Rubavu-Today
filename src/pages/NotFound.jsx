import React from "react";
import { Link } from "react-router-dom";
import rubavuLogo from "../Rubavu.jpeg";
import { NotFoundSEO } from "../components/SEO/SEO";
import { useLanguage } from "../context/LanguageContext";

function NotFound() {
  const { t } = useLanguage();
  return (
    <div className="min-h-[80vh] bg-slate-50 flex flex-col justify-center items-center px-5 sm:px-8 py-12 text-center font-serif">
      <NotFoundSEO />
      <div className="mb-6">
        <img 
          src={rubavuLogo} 
          alt="Rubavu Logo" 
          className="w-16 h-16 rounded-2xl object-cover mx-auto shadow-sm border border-slate-200" 
          width="64"
          height="64"
        />
      </div>
      <h1 className="text-7xl sm:text-8xl font-black text-slate-800 tracking-tight font-sans">
        404
      </h1>
      <p className="text-base sm:text-lg font-medium text-slate-500 mt-2 font-serif">
        {t("pageNotFound")}
      </p>
      <p className="text-sm text-slate-400 max-w-sm mt-1 font-serif">
        {t("pageNotFoundDescription")}
      </p>
      <Link
        to="/"
        className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition text-sm shadow-sm cursor-pointer font-sans"
      >
        {t("returnHome")}
      </Link>
    </div>
  );
}

export default NotFound;
