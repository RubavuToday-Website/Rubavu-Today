import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Mail, MapPin, Phone } from "lucide-react";
import logo from "../../Rubavu.jpeg";
import { DEPARTMENTS } from "../Navbar/Navbar";
import { getPosts } from "../../services/api";
import OptimizedImage from "../common/OptimizedImage";
import { RESOLUTION_WIDTHS } from "../../utils/images";
import { getArticleUrl } from "../../utils/slug";
import { getYouTubeThumbnail } from "../../utils/youtube";

const WHATSAPP_URL = "https://wa.me/250788945200";
const WHATSAPP_DISPLAY = "+250 788 945 200";

const EMAIL_ADDRESS = "rubavutoday@gmail.com";

const DEPT_NAMES_EN = {
  Amakuru: "News",
  Ubukungu: "Economy",
  Imikino: "Sports",
  Imyidagaduro: "Entertainment",
  Uburezi: "Education",
};

const OFFICE_LOCATION = "Rubavu, Rwanda";

const SOCIAL_LINKS = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/rubavutoday/",
    color: "text-[#E1306C]",
    icon: (
      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@papainnocento",
    color: "text-white",
    icon: (
      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
      </svg>
    ),
  },
  {
    label: "WhatsApp",
    href: WHATSAPP_URL,
    color: "text-[#25D366]",
    icon: (
      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@ABAMUSIC-c3l",
    color: "text-[#FF0000]",
    icon: (
      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
];

const FooterHeading = ({ children }) => (
  <h3 className="flex items-center gap-1 font-post-title text-[9px] font-black uppercase tracking-wider text-white">
    <span aria-hidden="true" className="h-2 w-0.5 rounded-sm bg-red-600" />
    {children}
  </h3>
);

const FooterLink = ({ to, children }) => (
  <li>
    <Link
      to={to}
      className="group inline-flex items-center gap-1 py-0 text-[10px] font-medium text-slate-400 transition hover:text-white"
    >
      <span
        aria-hidden="true"
        className="h-px w-0 bg-red-500 transition-all duration-300 group-hover:w-3"
      />
      <span>{children}</span>
    </Link>
  </li>
);

const Footer = () => {
  const [mediaPosts, setMediaPosts] = useState([]);
  const [latestPosts, setLatestPosts] = useState([]);
  const [mediaLoadError, setMediaLoadError] = useState("");
  const mediaStripRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    getPosts()
      .then((posts) => {
        if (!mounted) return;
        const sortedPosts = (Array.isArray(posts) ? posts : [])
          .slice()
          .sort((a, b) => new Date(b.createdDate || 0) - new Date(a.createdDate || 0));
        setLatestPosts(sortedPosts.slice(0, 10));

        const recentMedia = sortedPosts
          .filter((post) => post.image || post.youtube_url);
        setMediaPosts(recentMedia);
      })
      .catch((error) => {
        if (mounted) {
          setMediaLoadError(error?.message || "Could not load recent media.");
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const scrollMedia = (direction) => {
    const strip = mediaStripRef.current;
    if (!strip) return;
    strip.scrollBy({
      left: direction * strip.clientWidth * 0.8,
      behavior: "smooth",
    });
  };

  const quickLinks = [
    { label: "Home", to: "/" },
    { label: "About Us", to: "/about" },
    { label: "Contact Us", to: "/contact" },
    { label: "Advertise With Us", to: "/contact" },
    { label: "Privacy Policy", to: "/privacy-policy" },
    { label: "Terms", to: "/terms" },
  ];

  return (
    <footer className="bg-slate-950 text-slate-300">
      {latestPosts.length > 0 && (
        <section
          aria-label="Amakuru mashya"
          className="overflow-hidden border-b border-slate-800 bg-slate-900/80"
        >
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-3 sm:px-8 lg:px-16">
            <div className="flex shrink-0 items-center gap-2">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-red-500" />
              <h2 className="font-post-title text-[10px] font-black uppercase tracking-wider text-white">
                Amakuru mashya
              </h2>
            </div>
            <div className="latest-stories-marquee min-w-0 flex-1">
              <div className="latest-stories-marquee__track">
                {[false, true].map((isDuplicate) => (
                  <div
                    key={isDuplicate ? "duplicate" : "stories"}
                    className="latest-stories-marquee__group"
                    aria-hidden={isDuplicate || undefined}
                  >
                    {latestPosts.map((post, index) => (
                      <Link
                        key={`${post.id || post._id || post.title}-${index}`}
                        to={getArticleUrl(post)}
                        tabIndex={isDuplicate ? -1 : undefined}
                        className="group flex w-56 shrink-0 items-center gap-2 border-r border-slate-700 pr-4 sm:w-64"
                      >
                        {(post.image || post.youtube_url) && (
                          <OptimizedImage
                            src={post.image || getYouTubeThumbnail(post.youtube_url)}
                            alt=""
                            widths={RESOLUTION_WIDTHS.THUMB}
                            sizes="48px"
                            loading="lazy"
                            decoding="async"
                            className="h-10 w-12 shrink-0 rounded-sm object-cover"
                          />
                        )}
                        <span className="line-clamp-2 text-[10px] font-semibold leading-snug text-slate-300 transition group-hover:text-white">
                          {post.title}
                        </span>
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
      <div className="mx-auto max-w-7xl px-5 py-3 sm:px-8 lg:px-16 lg:py-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-12 lg:gap-3">
          {/* BRAND / ABOUT */}
          <div className="md:col-span-2 lg:col-span-3">
            <Link to="/" className="group inline-flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-red-600 bg-white shadow transition duration-300 group-hover:scale-105">
                <img
                  src={logo}
                  alt="Rubavu Today"
                  className="h-full w-full object-cover"
                />
              </span>
              <span className="font-post-title text-sm font-black tracking-tight text-white sm:text-base">
                Rubavu Today
              </span>
            </Link>

            <p className="mt-1.5 max-w-md text-[10px] leading-snug text-slate-400">
              Rubavu Today is a modern digital news platform delivering trusted
              news, stories, entertainment, sports, business and community
              updates from Rubavu and beyond.
            </p>

            <div className="mt-2 flex items-center gap-1.5">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className={`flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 bg-slate-800 transition duration-300 hover:-translate-y-0.5 hover:border-red-600 ${social.color}`}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* NEWS CATEGORIES */}
          <div className="lg:col-span-2">
            <FooterHeading>News Categories</FooterHeading>

            <ul className="mt-1.5 space-y-0">
              {DEPARTMENTS.map((department) => (
                <FooterLink
                  key={department.name}
                  to={`/?category=${encodeURIComponent(department.name)}`}
                >
                  {DEPT_NAMES_EN[department.name] || department.name}
                </FooterLink>
              ))}
            </ul>
          </div>

          {/* QUICK LINKS */}
          <div className="lg:col-span-2">
            <FooterHeading>Quick Links</FooterHeading>

            <ul className="mt-1.5 space-y-0">
              {quickLinks.map((link) => (
                <FooterLink key={link.label} to={link.to}>
                  {link.label}
                </FooterLink>
              ))}
            </ul>
          </div>

          {/* CONTACT */}
          <div className="lg:col-span-2">
            <FooterHeading>Contact</FooterHeading>

            <ul className="mt-1.5 space-y-1 text-[10px]">
              <li>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-1.5 text-slate-400 transition hover:text-white"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-700 bg-slate-800 text-red-500 transition group-hover:border-red-600">
                    <Phone size={11} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-500">
                      Phone / WhatsApp
                    </span>
                    <span className="font-semibold text-slate-300 group-hover:text-white">
                      {WHATSAPP_DISPLAY}
                    </span>
                  </span>
                </a>
              </li>

              <li className="flex items-center gap-1.5 text-slate-400">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-700 bg-slate-800 text-red-500">
                  <MapPin size={11} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-500">
                    Our location
                  </span>
                  <span className="font-semibold text-slate-300">{OFFICE_LOCATION}</span>
                </span>
              </li>

              <li>
                <a
                  href={`mailto:${EMAIL_ADDRESS}`}
                  className="group flex items-center gap-1.5 text-slate-400 transition hover:text-white"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-700 bg-slate-800 text-red-500 transition group-hover:border-red-600">
                    <Mail size={11} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-500">
                      Email
                    </span>
                    <span className="font-semibold text-slate-300 group-hover:text-white">
                      {EMAIL_ADDRESS}
                    </span>
                  </span>
                </a>
              </li>
            </ul>

            <Link
              to="/contact"
              className="mt-2 inline-flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white transition hover:bg-red-700"
            >
              Contact Us →
            </Link>
          </div>

          {/* RECENT PHOTOS AND VIDEOS */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between gap-2">
              <FooterHeading>Photos &amp; Videos</FooterHeading>
              {mediaPosts.length > 3 && (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => scrollMedia(-1)}
                    aria-label="Previous photos and videos"
                    className="grid h-5 w-5 place-items-center rounded-full border border-slate-700 text-slate-300 transition hover:border-red-500 hover:text-white focus:outline-none focus:ring-1 focus:ring-red-400"
                  >
                    <ChevronLeft className="h-3 w-3" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollMedia(1)}
                    aria-label="Next photos and videos"
                    className="grid h-5 w-5 place-items-center rounded-full border border-slate-700 text-slate-300 transition hover:border-red-500 hover:text-white focus:outline-none focus:ring-1 focus:ring-red-400"
                  >
                    <ChevronRight className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
            {mediaLoadError ? (
              <p className="mt-2 text-[9px] text-slate-500">{mediaLoadError}</p>
            ) : mediaPosts.length > 0 ? (
              <div
                ref={mediaStripRef}
                className="mt-2 flex snap-x snap-mandatory gap-1 overflow-x-auto scroll-smooth"
                style={{ scrollbarWidth: "none" }}
              >
                {mediaPosts.map((post) => (
                  <Link
                    key={post.id || post._id || post.title}
                    to={getArticleUrl(post)}
                    aria-label={post.title || "View photo or video"}
                    className="group relative aspect-square w-[calc((100%-0.5rem)/3)] shrink-0 snap-start overflow-hidden rounded-sm bg-slate-800"
                  >
                    <OptimizedImage
                      src={getYouTubeThumbnail(post.youtube_url) || post.image}
                      alt=""
                      widths={RESOLUTION_WIDTHS.THUMB}
                      sizes="(max-width: 1024px) 28vw, 70px"
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {post.youtube_url && (
                      <span className="absolute inset-0 grid place-items-center bg-black/20 text-white">
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-red-600/90 text-[9px]" aria-hidden="true">
                          ▶
                        </span>
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-[9px] text-slate-500">Recent media will appear here.</p>
            )}
            <Link
              to="/media"
              className="mt-1.5 inline-block font-body text-[8px] font-bold uppercase tracking-wide text-slate-400 transition hover:text-white"
            >
              View all media →
            </Link>
          </div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="border-t border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-col gap-1.5 px-5 py-2 text-[9px] text-slate-500 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-16">
          <p>
            © 2026 Rubavu Today. <span className="text-slate-400">All rights reserved.</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;