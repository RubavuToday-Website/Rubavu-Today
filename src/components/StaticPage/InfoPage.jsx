import React from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

const InfoPageHeader = ({ title, lede }) => (
  <header className="border-b border-slate-200 bg-white">
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10 lg:px-16">
      <nav
        aria-label="Breadcrumb"
        className="mb-3 flex items-center gap-1 text-[12px] font-medium text-slate-500"
      >
        <Link to="/" className="transition hover:text-red-600">
          Rubavu Today
        </Link>
        <ChevronRight size={14} aria-hidden="true" className="text-slate-300" />
        <span className="text-slate-800">{title}</span>
      </nav>

      <h1 className="font-post-title text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
        {title}
      </h1>

      {lede && (
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
          {lede}
        </p>
      )}
    </div>
  </header>
);

const InfoSection = ({ heading, children, id }) => (
  <section
    id={id}
    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
  >
    {heading && (
      <h2 className="mb-3 border-l-4 border-red-600 pl-3 font-post-title text-base font-extrabold text-slate-950 sm:text-lg">
        {heading}
      </h2>
    )}
    <div className="space-y-4 text-sm leading-relaxed text-slate-700 sm:text-[15px]">
      {children}
    </div>
  </section>
);

const InfoParagraph = ({ children }) => <p>{children}</p>;

const InfoList = ({ items }) => (
  <ul className="ml-1 space-y-2">
    {items.map((item) => (
      <li key={item} className="flex items-start gap-2">
        <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red-600" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const InfoPage = ({ title, lede, description, children }) => {
  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "/";
  const canonical = `https://www.rubavutoday.com${pathname}`.replace(
    /\/$/,
    ""
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-14 pt-2 font-body text-slate-900">
      <Helmet>
        <html lang="rw" />
        <title>{title} | Rubavu Today</title>
        <meta name="description" content={description || lede} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${title} | Rubavu Today`} />
        <meta property="og:description" content={description || lede} />
        <meta property="og:url" content={canonical} />
        <meta property="og:site_name" content="Rubavu Today" />
      </Helmet>

      <InfoPageHeader title={title} lede={lede} />

      <div className="mx-auto mt-6 max-w-7xl space-y-5 px-5 sm:px-8 lg:px-16">
        {children}
      </div>
    </div>
  );
};

export default InfoPage;
export { InfoPageHeader, InfoSection, InfoParagraph, InfoList };