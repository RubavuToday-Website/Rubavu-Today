import React, { useState, useRef, useEffect } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  Image as ImageIcon,
  Loader2,
  Plus,
  Trash2,
  ClipboardPaste,
  Wand2,
  ImagePlus,
  X,
} from "lucide-react";
import {
  validateImageFile,
  MAX_IMAGES_PER_POST,
  MAX_IMAGE_SIZE_BYTES,
} from "./ImageUploader";
import ArticlePreview from "./ArticlePreview";
import LinkifiedMessage from "../common/LinkifiedMessage";
import {
  AMAKURU_DEPARTMENTS,
  isAmakuruCategory,
} from "../../utils/amakuruDepartments";

let itemIdCounter = 0;
const nextId = () => `item-${Date.now()}-${itemIdCounter++}`;
const nextImgId = () => `img-${Date.now()}-${itemIdCounter++}`;

export const ARTICLE_TITLE_MAX_LENGTH = 119;

const TITLE_TOO_LONG_MESSAGE = `Umutwe ntugomba kurenga ${ARTICLE_TITLE_MAX_LENGTH} inyuguti.`;

const IMAGE_SIZE_KB = Math.round(MAX_IMAGE_SIZE_BYTES / 1024);
const MAX_IMAGES_MESSAGE = `Inkuru ishobora kugira amafoto ${MAX_IMAGES_PER_POST} gusa: rimwe munsi y'umutwe, irindi munsi y'ibisobanuro.`;
const IMAGE_SIZE_MESSAGE = `Buri foto ntiburenze ${IMAGE_SIZE_KB} KB.`;

const parseInitial = (initial) => {
  let blocks = [];
  const raw = initial?.content_blocks;
  try {
    const parsed = JSON.parse(raw || "");
    blocks = Array.isArray(parsed) ? parsed : [];
  } catch {
    blocks = [];
  }

  const sections = blocks.map((block) => {
    if (block.type === "paragraph") {
      return { type: "paragraph", id: nextId(), text: block.text || "" };
    }
    if (block.type === "image") {
      return {
        type: "image",
        id: nextId(),
        imgId: nextImgId(),
        url: block.url || "",
        position: block.position || "center",
        caption: block.caption || "",
        file: null,
        error: "",
      };
    }
    return null;
  });

  const filtered = sections.filter(Boolean);

  if (filtered.length === 0) {
    const rawDescription = String(initial?.description || "")
      .split(/\n{2,}/)
      .map((part) => part.replace(/\s+/g, " ").trim())
      .filter(Boolean);

    return rawDescription.map((text) => ({
      type: "paragraph",
      id: nextId(),
      text,
    }));
  }

  return filtered;
};

const previewUrl = (section) =>
  section.file
    ? URL.createObjectURL(section.file)
    : section.url || "";

const headerImageUrl = (header) =>
  header?.file ? URL.createObjectURL(header.file) : header?.url || "";

const ArticleEditor = ({
  initial = null,
  categories = [],
  authorText = "",
  submitLabel = "Publish",
  saving = false,
  onSubmit = () => { },
  onCancel = () => { },
  extraFields = null,
  draftLabel = null,
  onDraft = null,
  hideStatusField = false,
  forcedStatus = "",
}) => {
  const [title, setTitle] = useState(initial?.title || "");
  const [category, setCategory] = useState(
    initial?.category || categories[0]?.name || "Amakuru"
  );
  const [amakuruDepartment, setAmakuruDepartment] = useState(
    initial?.amakuru_department || ""
  );
  const [youtubeUrl, setYoutubeUrl] = useState(
    initial?.youtube_url || initial?.youtubeUrl || ""
  );
  const [sections, setSections] = useState(() => parseInitial(initial));
  const [headerImage, setHeaderImage] = useState(() => {
    const existing = initial?.image || initial?.image_url || initial?.imageUrl || null;
    if (!existing) return null;
    return { file: null, url: existing, error: "" };
  });
  const [status, setStatus] = useState(
    (initial?.status && String(initial.status).toLowerCase()) || ""
  );
  const [pasteText, setPasteText] = useState("");
  const [formError, setFormError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  const imageSectionCount = sections.filter((section) => section.type === "image").length;
  const totalImageCount = (headerImage ? 1 : 0) + imageSectionCount;
  const canAddAnotherImage = totalImageCount < MAX_IMAGES_PER_POST;

  const headerInputRef = useRef(null);
  const dirtyRef = useRef(false);

  const markDirty = () => {
    dirtyRef.current = true;
  };

  useEffect(() => {
    const handler = (e) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const handleCancel = () => {
    if (dirtyRef.current) {
      const leave = window.confirm(
        "Ufite impinduka zitabitswe. Ushaka kureka?"
      );
      if (!leave) return;
    }
    onCancel();
  };

  const categoryList =
    categories && categories.length > 0
      ? categories
      : [{ name: "Amakuru" }];

  const isAmakuru = isAmakuruCategory(category);

  const paragraphText = sections
    .filter((s) => s.type === "paragraph" && s.text && s.text.trim())
    .map((s) => s.text.trim())
    .join(" ");

  const updateSection = (id, patch) => {
    markDirty();
    setSections((previous) =>
      previous.map((section) =>
        section.id === id ? { ...section, ...patch } : section
      )
    );
  };

  const addParagraph = (afterId) => {
    markDirty();
    const newSection = { type: "paragraph", id: nextId(), text: "" };
    setSections((previous) => {
      const index = previous.findIndex((s) => s.id === afterId);
      if (afterId && index >= 0) {
        return [
          ...previous.slice(0, index + 1),
          newSection,
          ...previous.slice(index + 1),
        ];
      }
      return [...previous, newSection];
    });
  };

  const addImagesAfter = async (afterId, files) => {
    const fileList = Array.from(files || []).filter(Boolean);

    if (fileList.length === 0) return;

    const remaining = MAX_IMAGES_PER_POST - totalImageCount;

    if (remaining <= 0) {
      setFormError(MAX_IMAGES_MESSAGE);
      return;
    }

    const accepted = [];

    for (const file of fileList) {
      if (accepted.length >= remaining) break;

      const message = await validateImageFile(file);
      if (message) {
        setFormError(message);
        continue;
      }

      accepted.push(file);
    }

    if (fileList.length > remaining) {
      setFormError(MAX_IMAGES_MESSAGE);
    }

    if (accepted.length === 0) return;

    markDirty();
    const newContent = [];
    accepted.forEach((file) => {
      newContent.push({
        type: "image",
        id: nextId(),
        imgId: nextImgId(),
        url: URL.createObjectURL(file),
        file,
        error: "",
      });
      newContent.push({ type: "paragraph", id: nextId(), text: "" });
    });

    setSections((previous) => {
      const index = previous.findIndex((s) => s.id === afterId);
      if (afterId && index >= 0) {
        return [
          ...previous.slice(0, index + 1),
          ...newContent,
          ...previous.slice(index + 1),
        ];
      }
      return [...previous, ...newContent];
    });
  };

  const replaceImage = async (id, file) => {
    markDirty();
    const message = await validateImageFile(file);
    if (message) {
      updateSection(id, { error: message });
      return;
    }
    updateSection(id, { file, url: URL.createObjectURL(file), error: "" });
  };

  const removeParagraph = (id) => {
    markDirty();
    setSections((previous) => previous.filter((s) => s.id !== id));
  };

  const removeImage = (id) => {
    markDirty();
    setSections((previous) => {
      const index = previous.findIndex((s) => s.id === id);
      if (index < 0) return previous;
      const next = previous.slice();
      next.splice(index, 1);
      // Remove the auto-opened empty paragraph that followed the image.
      const following = next[index];
      if (
        following &&
        following.type === "paragraph" &&
        !String(following.text || "").trim()
      ) {
        next.splice(index, 1);
      }
      return next;
    });
  };

  const moveSection = (id, direction) => {
    markDirty();
    setSections((previous) => {
      const index = previous.findIndex((s) => s.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= previous.length) {
        return previous;
      }
      const next = previous.slice();
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const handleHeaderChange = async (e) => {
    markDirty();
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!headerImage && totalImageCount >= MAX_IMAGES_PER_POST) {
      setFormError(MAX_IMAGES_MESSAGE);
      return;
    }

    const message = await validateImageFile(file);
    if (message) {
      setHeaderImage((prev) => ({ file: null, url: prev?.url || "", error: message }));
      return;
    }

    setHeaderImage({ file, url: URL.createObjectURL(file), error: "" });
  };

  const removeHeaderImage = () => {
    markDirty();
    setHeaderImage(null);
  };

  const splitPastedTextIntoParagraphs = () => {
    const raw = String(pasteText || "");

    const paragraphs = raw
      .split(/\n{2,}/)
      .map((part) => part.replace(/\s+/g, " ").trim())
      .filter(Boolean);

    if (paragraphs.length === 0) return;

    markDirty();
    const newSections = paragraphs.map((text) => ({
      type: "paragraph",
      id: nextId(),
      text,
    }));

    setSections(newSections);
    setPasteText("");
  };

  const buildFormData = () => {
    const fd = new FormData();

    fd.append("title", title.trim());
    fd.append("category", category || "Amakuru");
    fd.append("amakuru_department", isAmakuru ? amakuruDepartment : "");
    fd.append("description", paragraphText.slice(0, 400));

    if (headerImage?.file) {
      fd.append("image", headerImage.file);
    }

    if (youtubeUrl.trim()) {
      fd.append("youtube_url", youtubeUrl.trim());
    }
    if (authorText && authorText.trim()) {
      fd.append("author", authorText.trim());
    }
    if (forcedStatus && String(forcedStatus).trim()) {
      fd.append("status", String(forcedStatus).trim());
    }
    if (!hideStatusField && initial && status && String(status).trim()) {
      fd.append("status", String(status).trim());
    }

    const sendBlocks = [];
    const imageFiles = [];

    sections.forEach((section) => {
      if (section.type === "paragraph") {
        if (String(section.text || "").trim()) {
          sendBlocks.push({ type: "paragraph", text: section.text.trim() });
        }
        return;
      }

      if (section.type === "image") {
        const position = section.position === "header" ? "center" : section.position || "center";
        if (section.file) {
          const index = imageFiles.length;
          imageFiles.push(section.file);
          sendBlocks.push({
            type: "image",
            position,
            caption: section.caption || "",
            alt: `${String(title || "Rubavu Today").slice(0, 80)} photo ${
              index + 1
            }`,
            fileKey: "images",
            uploadIndex: index,
          });
        } else if (section.url && String(section.url).trim()) {
          sendBlocks.push({
            type: "image",
            url: String(section.url).trim(),
            position,
            caption: section.caption || "",
            alt: `${String(title || "Rubavu Today").slice(0, 80)} photo`,
          });
        }
      }
    });

    imageFiles.forEach((file) => fd.append("images", file));

    if (sendBlocks.length > 0) {
      fd.append("content_blocks", JSON.stringify(sendBlocks));
    }

    return fd;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!title.trim()) {
      setFormError("Andika umutwe w'inkuru mbere yo gutanga.");
      return;
    }
    if (title.trim().length > ARTICLE_TITLE_MAX_LENGTH) {
      setFormError(TITLE_TOO_LONG_MESSAGE);
      return;
    }
    if (!paragraphText) {
      setFormError("Andika inkuru yawe mbere yo gutanga.");
      return;
    }
    if (isAmakuru && !amakuruDepartment) {
      setFormError("Hitamo Amakuru Department mbere yo gutanga inkuru.");
      return;
    }
    if (headerImage?.error) {
      setFormError(headerImage.error);
      return;
    }

    setFormError("");
    dirtyRef.current = false;
    onSubmit(buildFormData());
  };

  const handleDraft = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!title.trim()) {
      setFormError("Andika umutwe w'inkuru mbere yo kubika draft.");
      return;
    }
    if (title.trim().length > ARTICLE_TITLE_MAX_LENGTH) {
      setFormError(TITLE_TOO_LONG_MESSAGE);
      return;
    }
    if (headerImage?.error) {
      setFormError(headerImage.error);
      return;
    }

    setFormError("");
    dirtyRef.current = false;
    onDraft(buildFormData());
  };

  const previewBlocks = sections
    .filter((section) => {
      if (section.type === "paragraph") {
        return String(section.text || "").trim();
      }
      return section.file || String(section.url || "").trim();
    })
    .map((section) => {
      if (section.type === "paragraph") {
        return { type: "paragraph", text: section.text.trim() };
      }
      return {
        type: "image",
        url: previewUrl(section),
        position: section.position || "center",
        caption: section.caption || "",
      };
    });

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-6">
        {formError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-xs font-medium text-red-600">
              <LinkifiedMessage message={formError} />
            </p>
          </div>
        )}

        {initial && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs font-medium text-emerald-700">
              Uri guhindura inkuru ibaho. Guhindura amagambo y'inkuru, kongeraho, cyangwa gukuraho — kandi amafoto asigaye azabikwa. Ntukeneye kwandika inkuru usubire.
            </p>
          </div>
        )}

        {extraFields}

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-700">
              Umutwe w'inkuru
            </label>
            <span
              className={`shrink-0 text-[10px] font-bold ${
                title.length >= ARTICLE_TITLE_MAX_LENGTH
                  ? "text-amber-600"
                  : "text-slate-400"
              }`}
            >
              {title.length}/{ARTICLE_TITLE_MAX_LENGTH}
            </span>
          </div>
          <input
            type="text"
            value={title}
            maxLength={ARTICLE_TITLE_MAX_LENGTH}
            onChange={(e) => {
              setTitle(e.target.value.slice(0, ARTICLE_TITLE_MAX_LENGTH));
              markDirty();
            }}
            required
            placeholder="Andika umutwe ukurura..."
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-700">
              Icyiciro
            </label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                markDirty();
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {categoryList.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {cat.icon ? `${cat.icon} ` : ""}
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {isAmakuru && (
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-700">
                Amakuru Department <span className="text-red-600">*</span>
              </label>
              <select
                value={amakuruDepartment}
                required={isAmakuru}
                onChange={(e) => {
                  setAmakuruDepartment(e.target.value);
                  markDirty();
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Hitamo ishami</option>
                {AMAKURU_DEPARTMENTS.map((department) => (
                  <option key={department.slug} value={department.name}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-700">
              Umurongo wa YouTube
              <span className="ml-1 font-normal normal-case text-slate-400">
                Ntabwo ari ngombwa
              </span>
            </label>
            <input
              type="url"
              value={youtubeUrl}
              onChange={(e) => {
                setYoutubeUrl(e.target.value);
                markDirty();
              }}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {!hideStatusField && initial && (
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-700">
              Imiterere / Status
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  markDirty();
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-56"
              >
                <option value="">Ntihinduke</option>
                <option value="approved">Yemewe (approved)</option>
                <option value="pending">Itegereje gusuzumwa (pending)</option>
                <option value="rejected">Yanzwe (rejected)</option>
              </select>
              <p className="text-[10px] font-medium text-slate-400">
                Aya mahitamo akurikiza uburenganzira bwawe n'uburyo bwo kwemeza biriho.
              </p>
            </div>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-700">
              Ifoto y'Umutwe
              <span className="ml-1 font-normal normal-case text-slate-400">
                Ifoto ya 1 — igaragara munsi y'umutwe (ntibisabwa)
              </span>
            </label>
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
              {totalImageCount}/{MAX_IMAGES_PER_POST}
            </span>
          </div>
          <p className="mb-2 text-[10px] font-medium text-slate-400">
            {IMAGE_SIZE_MESSAGE}
          </p>

          {headerImage ? (
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <img
                src={headerImageUrl(headerImage)}
                alt="Article header"
                className="block h-56 w-full object-cover sm:h-64"
              />
              {headerImage.error && (
                <div className="bg-red-50 px-4 py-2">
                  <p className="text-xs font-semibold text-red-600">
                    <LinkifiedMessage message={headerImage.error} />
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5">
                <span className="text-[10px] font-medium text-slate-500">
                  Ifoto y'umutwe
                </span>
                <div className="flex items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
                    <ImageIcon className="h-3.5 w-3.5" />
                    Gahindura
                    <input
                      ref={headerInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleHeaderChange}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={removeHeaderImage}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                  >
                    <X className="h-3.5 w-3.5" />
                    Gukuraho
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!canAddAnotherImage) {
                  setFormError(MAX_IMAGES_MESSAGE);
                  return;
                }
                headerInputRef.current?.click();
              }}
              aria-disabled={!canAddAnotherImage}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-sm font-semibold transition ${
                canAddAnotherImage
                  ? "border-slate-300 bg-slate-50 text-slate-500 hover:border-blue-400 hover:bg-blue-50/40 hover:text-blue-600"
                  : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
              }`}
            >
              <ImagePlus className="h-5 w-5" />
              Bikora ifoto y'umutwe
              <input
                ref={headerInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={!canAddAnotherImage}
                className="hidden"
                onChange={handleHeaderChange}
              />
            </button>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-700">
              Inkuru
            </label>
            <span className="text-[10px] font-medium text-slate-400">
              Amafoto {totalImageCount}/{MAX_IMAGES_PER_POST} · {IMAGE_SIZE_MESSAGE}
            </span>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-blue-700">
              <ClipboardPaste className="h-3.5 w-3.5" />
              Iyandike byihuse — inkuru yose
            </div>
            <p className="mt-1 text-[11px] leading-snug text-slate-500">
              Shyira inkuru yawe yose hano. Imirongo itandukanije iza nk'ibice, kandi ushobora kongera amafoto hagati yabyo.
            </p>
            <textarea
              rows={4}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={"Shyira inkuru yawe yose hano...\n\nIgika cya mbere.\n\nIkindi gika cyatandukanijwe n'umurongo utarimo ikintu."}
              className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="button"
              onClick={splitPastedTextIntoParagraphs}
              disabled={!String(pasteText || "").trim()}
              className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Wand2 className="h-3.5 w-3.5" />
              Itandukanya mu bice
            </button>
            <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-slate-400">
              <Plus className="h-3 w-3" />
              Ibi bihagarika ifishi n'ibice bisukuye. Nyuma ongera amafoto aho ushaka.
            </span>
          </div>

          <div className="space-y-3">
            {sections.map((section, index, list) => (
              <div
                key={section.id}
                className="group rounded-2xl border border-slate-200 bg-white p-3 transition focus-within:border-blue-400"
              >
                {section.type === "paragraph" ? (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Igika {index + 1}
                      </span>
                    </div>
                    <textarea
                      rows={section.text ? 5 : 3}
                      placeholder="Andika igika..."
                      value={section.text || ""}
                      onChange={(e) =>
                        updateSection(section.id, { text: e.target.value })
                      }
                      className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 outline-none transition focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <label
                        onClick={(e) => {
                          if (!canAddAnotherImage) {
                            e.preventDefault();
                            setFormError(MAX_IMAGES_MESSAGE);
                          }
                        }}
                        aria-disabled={!canAddAnotherImage}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                          canAddAnotherImage
                            ? "cursor-pointer border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100"
                            : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                        }`}
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                        Ongeraho Ifoto munsi y'igika
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          disabled={!canAddAnotherImage}
                          className="hidden"
                          onChange={(e) => {
                            const files = Array.from(
                              e.target.files || []
                            );
                            if (files.length > 0) {
                              addImagesAfter(section.id, files);
                            }
                            e.target.value = "";
                          }}
                        />
                      </label>

                      <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => moveSection(section.id, -1)}
                          disabled={index === 0}
                          aria-label="Move up"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSection(section.id, 1)}
                          disabled={index === list.length - 1}
                          aria-label="Move down"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeParagraph(section.id)}
                          aria-label="Delete paragraph"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start">
                    <div className="flex items-center gap-3 sm:flex-1">
                      <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                        <img
                          src={previewUrl(section)}
                          alt={`Uploaded ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50">
                            <ImageIcon className="h-3 w-3" />
                            Gahindura
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) replaceImage(section.id, file);
                                e.target.value = "";
                              }}
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm("U Rwanda? Gukuraho iyi foto muri iyi nkuru?")) {
                                removeImage(section.id);
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-600 transition hover:bg-red-100"
                          >
                            <Trash2 className="h-3 w-3" />
                            Gukuraho
                          </button>
                        </div>

                        <select
                          value={section.position || "center"}
                          onChange={(e) =>
                            updateSection(section.id, {
                              position: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 outline-none focus:border-blue-400"
                        >
                          <option value="center">Ahagati (center)</option>
                          <option value="full">Ubugari bwose (full)</option>
                          <option value="left">Iburyo (left)</option>
                          <option value="right">Ibumoso (right)</option>
                          <option value="inline">Buri muri (inline)</option>
                          <option value="gallery">Amafoto (gallery)</option>
                        </select>

                        <input
                          type="text"
                          value={section.caption || ""}
                          onChange={(e) =>
                            updateSection(section.id, {
                              caption: e.target.value,
                            })
                          }
                          placeholder="Igisobanuro cy'ifoto (caption)"
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-600 outline-none focus:border-blue-400 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1 sm:flex-col">
                      <button
                        type="button"
                        onClick={() => moveSection(section.id, -1)}
                        disabled={index === 0}
                        aria-label="Move photo up"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSection(section.id, 1)}
                        disabled={index === list.length - 1}
                        aria-label="Move photo down"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
                {section.error && (
                  <div className="mt-2 rounded-lg bg-red-50 px-3 py-2">
                    <p className="text-[11px] font-semibold text-red-600">
                      <LinkifiedMessage message={section.error} />
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => sections.length === 0 ? addParagraph() : addParagraph(sections[sections.length - 1].id)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Ongeraho igika
          </button>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="w-full rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
          >
            Gusiba
          </button>

          {draftLabel && onDraft && (
            <button
              type="button"
              onClick={handleDraft}
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 sm:w-auto"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              <Plus className="h-4 w-4" />
              {draftLabel}
            </button>
          )}

          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-600 bg-white px-6 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-50 sm:w-auto"
          >
            <Eye className="h-4 w-4" />
            Reba Inkuru
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <ImageIcon className="h-4 w-4" />
            {submitLabel}
          </button>
        </div>
      </form>

      <ArticlePreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={title}
        category={category}
        description={paragraphText.slice(0, 400)}
        hero={headerImageUrl(headerImage) || null}
        blocks={previewBlocks}
        author={authorText}
        dateLabel={new Date().toLocaleDateString()}
      />
    </div>
  );
};

export default ArticleEditor;
