import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import PostDetails from "./PostDetails";
import { LanguageProvider } from "../context/LanguageContext";

const POST = {
  id: 123,
  slug: "123",
  title: "Inkuru ya mbere",
  category: "Amakuru",
  status: "approved",
  createdDate: "2026-10-01T10:00:00.000Z",
  summary: "Incamisake y'inkuru",
  description: "Umubwiriza wa mbere.\n\nUmubwiriza wa kabiri.",
  content_blocks: JSON.stringify([
    { type: "paragraph", text: "Umubwiriza wa mbere." },
    { type: "paragraph", text: "Umubwiriza wa kabiri." },
    {
      type: "image",
      url: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
      position: "full",
      caption: "Ipfoto y'ikirere",
      alt: "Ifoto y'ikirere",
    },
  ]),
  Author: "Mwanditsi",
};

const jsonResponse = (data) => ({
  ok: true,
  status: 200,
  json: async () => data,
});

const mockFetch = () => {
  global.fetch = jest.fn(async (url, options) => {
    const target = String(url);

    if (target.includes("/api/translate")) {
      const body = JSON.parse(options.body);
      return jsonResponse({
        translations: (body.texts || []).map((text) => `[EN] ${text}`),
      });
    }

    if (target.includes("/api/comments")) {
      return jsonResponse([]);
    }

    if (target.includes("/posts/next")) {
      return jsonResponse({ post: null, hasMore: false });
    }

    if (target.includes("/posts/slug/123") || target.includes("/posts/123")) {
      return jsonResponse(POST);
    }

    if (target.includes("/posts")) {
      return jsonResponse([]);
    }

    return jsonResponse({});
  });
};

const renderPost = () =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/post/123"]}>
        <LanguageProvider>
          <Routes>
            <Route path="/post/:id" element={<PostDetails />} />
            <Route path="/:slug" element={<PostDetails />} />
            <Route path="/:slug.html" element={<PostDetails />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>
    </HelmetProvider>
  );

describe("PostDetails language switching", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("selectedLanguage", "en");
    window.matchMedia =
      window.matchMedia ||
      (() => ({
        matches: false,
        addListener: () => { },
        removeListener: () => { },
        addEventListener: () => { },
        removeEventListener: () => { },
      }));
    window.scrollTo = () => { };
    mockFetch();
  });

  it("shows the opened article in the selected language", async () => {
    renderPost();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "[EN] Inkuru ya mbere",
      }, { timeout: 4000 })
    ).toBeInTheDocument();

    expect(
      await screen.findByText("[EN] Incamisake y'inkuru", {}, { timeout: 4000 })
    ).toBeInTheDocument();

    expect(
      await screen.findByText("[EN] Umubwiriza wa mbere.", {}, { timeout: 4000 })
    ).toBeInTheDocument();

    expect(
      await screen.findByText("[EN] Umubwiriza wa kabiri.", {}, { timeout: 4000 })
    ).toBeInTheDocument();

    expect(
      await screen.findByText("[EN] Ipfoto y'ikirere", {}, { timeout: 4000 })
    ).toBeInTheDocument();

    expect(
      screen.queryByText("Umubwiriza wa kabiri.")
    ).not.toBeInTheDocument();
  });
});
