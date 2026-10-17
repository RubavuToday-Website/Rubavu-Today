import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { Link, useLocation } from "react-router-dom";

import {
  Bell,
  Loader2,
  Upload,
  User,
  Lock,
  Eye,
  EyeOff,
  X,
  Calendar,
  Tag,
  BookOpen,
  Pencil,
  Trash2,
} from "lucide-react";

import api, {
  API_ROOT,
  getMyPosts,
  getMyPostById,
  updatePost,
  deletePost,
  hasPermission,
} from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";
import ArticleEditor from "../../components/article/ArticleEditor";
import YouTubeEmbeds from "../../components/article/YouTubeEmbeds";
import AuthorProfileTrigger from "../../components/common/AuthorProfileTrigger";
import OptimizedImage from "../../components/common/OptimizedImage";
import { RESOLUTION_WIDTHS } from "../../utils/images";

function Employee() {
  const { user: currentUser, refreshUser } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showAllPosts, setShowAllPosts] = useState(false);


  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const [editingPost, setEditingPost] = useState(null);


  const [selectedPost, setSelectedPost] = useState(null);

  const [actionLoading, setActionLoading] = useState(false);





  const departments = [
    {
      name: "Amakuru",
      icon: "📰",
    },
    {
      name: "Ubukungu",
      icon: "💼",
    },
    {
      name: "Imikino",
      icon: "⚽",
    },
    {
      name: "Imyidagaduro",
      icon: "🎭",
    },
    {
      name: "Uburezi",
      icon: "🎓",
    },
  ];





  const hasPermissionFor = useCallback(
    (permissionKey) => hasPermission(currentUser, permissionKey),
    [currentUser]
  );

  const hasViewAllPostsPermission = hasPermissionFor("view_all_posts");

  const permissionSummary = {
    view_all_posts: "View all posts",
    edit_own_posts: "Edit own posts",
    delete_own_pending_post: "Delete own pending",
    edit_post_text: "Edit text",
    edit_post_image: "Edit image",
    approve_posts: "Approve posts",
    reject_posts: "Reject posts",
    delete_any_post: "Delete any post",
    edit_any_post: "Edit any post",
    publish_approve_posts: "Publish posts",
    manage_images: "Manage images",
  };

  const rawPermissions = currentUser?.permissions || {};
  const permissionEntries = Array.isArray(rawPermissions)
    ? rawPermissions.map((key) => [key, true])
    : Object.entries(rawPermissions);

  const activePermissions = permissionEntries
    .filter(([key, enabled]) => {
      if (typeof enabled === "boolean") return enabled;
      if (Array.isArray(enabled)) return enabled.length > 0;
      return Boolean(enabled) || Boolean(key);
    })
    .map(([key]) => ({
      key,
      label: permissionSummary[key] || key,
    }));

  const selectedPermission = (() => {
    const params = new URLSearchParams(location.search);
    const rawPermission = params.get("permission");
    const normalized = rawPermission ? rawPermission.trim().toLowerCase() : "";

    if (!normalized) {
      return "";
    }

    return normalized.replace(/\s+/g, "_")
      .replace(/-+/g, "_")
      .replace(/^_+|_+$/g, "");
  })();

  const selectedPermissionIsActive = activePermissions.some(
    ({ key }) => key === selectedPermission
  );

  const permissionTarget = selectedPermission
    ? selectedPermission.replace(/\s+/g, "_").replace(/-+/g, "_").replace(/^_+|_+$/g, "")
    : "";

  const permissionColorMap = {
    view_all_posts: "border-violet-200 bg-violet-100 text-violet-700",
    edit_own_posts: "border-emerald-200 bg-emerald-100 text-emerald-700",
    delete_own_pending_post: "border-rose-200 bg-rose-100 text-rose-700",
    edit_post_text: "border-sky-200 bg-sky-100 text-sky-700",
    edit_post_image: "border-cyan-200 bg-cyan-100 text-cyan-700",
    approve_posts: "border-amber-200 bg-amber-100 text-amber-700",
    reject_posts: "border-red-200 bg-red-100 text-red-700",
    delete_any_post: "border-pink-200 bg-pink-100 text-pink-700",
    edit_any_post: "border-indigo-200 bg-indigo-100 text-indigo-700",
    publish_approve_posts: "border-teal-200 bg-teal-100 text-teal-700",
    manage_images: "border-orange-200 bg-orange-100 text-orange-700",
  };

  const broadAccessPermissions = useMemo(
    () => new Set([
      "view_all_posts",
      "edit_any_post",
      "delete_any_post",
      "edit_post_text",
      "edit_post_image",
      "approve_posts",
      "reject_posts",
      "publish_approve_posts",
      "manage_images",
    ]),
    []
  );

  useEffect(() => {
    if (!refreshUser) {
      return;
    }

    const hasPermissionData =
      currentUser &&
      (
        Array.isArray(currentUser.permissions) ||
        (currentUser.permissions && typeof currentUser.permissions === "object" && Object.keys(currentUser.permissions).length > 0)
      );

    if (!hasPermissionData && currentUser) {
      refreshUser().catch((error) => {
        console.error("Failed to refresh employee permissions:", error);
      });
    }
  }, [currentUser, refreshUser]);

  useEffect(() => {
    if (selectedPermission && broadAccessPermissions.has(selectedPermission)) {
      setShowAllPosts(true);
      return;
    }

    if (hasViewAllPostsPermission) {
      setShowAllPosts(true);
    } else {
      setShowAllPosts(false);
    }
  }, [broadAccessPermissions, hasViewAllPostsPermission, selectedPermission]);

  useEffect(() => {
    if (!permissionTarget) {
      return;
    }

    const timer = setTimeout(() => {
      const target = document.getElementById(`permission-${permissionTarget}`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);

    return () => clearTimeout(timer);
  }, [permissionTarget]);




  const getCurrentUserName = useCallback(() => {
    if (!currentUser) {
      return "Employee";
    }

    return (
      currentUser.full_name ||
      currentUser.fullName ||
      currentUser.name ||
      currentUser.username ||
      currentUser.email ||
      "Employee"
    );
  }, [currentUser]);





  const getCurrentUserRole = () => {
    if (!currentUser) {
      return "";
    }

    return (
      currentUser.role ||
      currentUser.role_type ||
      currentUser.user_role ||
      currentUser.position ||
      ""
    );
  };





  /* The list is fetched from the authenticated employee endpoint rather than
     the public feed, and it is never filtered in the browser: visibility is
     decided by the backend from the stored permissions. Asking for "all" is a
     request, not a grant — without "View All Posts" the server keeps replying
     with the employee's own posts. Each post arrives with a `permissions`
     capability map describing the actions the backend will accept. */
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getMyPosts({
        scope: showAllPosts ? "all" : undefined,
      });

      const data = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : response?.posts ||
          response?.data?.posts ||
          response?.data?.data ||
          [];

      setPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(
        "Error fetching posts:",
        err
      );

      setError(
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load posts."
      );

      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [showAllPosts]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);




  const getPostCapabilities = useCallback((post) => {
    const capabilities = post?.permissions;

    if (capabilities && typeof capabilities === "object") {
      return capabilities;
    }

    /* Fallback for posts fetched before the capability map existed: mirror the
       same rules so the UI never offers an action the backend would reject. */
    const isOwner =
      Number(post?.author_id) === Number(currentUser?.id) ||
      String(post?.Author || "").trim() ===
        String(currentUser?.full_name || currentUser?.email || "").trim();

    const status = String(post?.status || "").trim().toLowerCase();
    const ownsEditablePost = isOwner;

    return {
      isOwner,
      canView: isOwner || hasPermissionFor("view_all_posts"),
      canEditText:
        hasPermissionFor("edit_any_post") ||
        hasPermissionFor("edit_post_text") ||
        (ownsEditablePost && hasPermissionFor("edit_own_posts")),
      canEditImage:
        hasPermissionFor("edit_any_post") ||
        hasPermissionFor("edit_post_image") ||
        hasPermissionFor("manage_images") ||
        (ownsEditablePost && hasPermissionFor("edit_own_posts")),
      canDelete:
        status !== "approved" &&
        (hasPermissionFor("delete_any_post") ||
          (isOwner && hasPermissionFor("delete_own_pending_post"))),
      canApprove:
        hasPermissionFor("approve_posts") ||
        hasPermissionFor("publish_approve_posts"),
      canReject: hasPermissionFor("reject_posts"),
      canManageImages: hasPermissionFor("manage_images"),
    };
  }, [currentUser, hasPermissionFor]);





  const toggleAllPosts = () => {
    if (!hasViewAllPostsPermission) {
      return;
    }

    setShowAllPosts((previous) => !previous);
  };





  const handleOpenUploadModal = () => {
    setError("");
    setEditingPost(null);
    setIsUploadModalOpen(true);
  };





  const handleCloseUploadModal = () => {
    if (actionLoading) {
      return;
    }

    setIsUploadModalOpen(false);
    setEditingPost(null);
    setError("");
  };





  const getAuthorName = (post) => {
    if (!post) {
      return "Unknown Author";
    }

    if (
      typeof post.Author === "string" &&
      post.Author.trim() !== ""
    ) {
      return post.Author;
    }

    if (
      typeof post.author === "string" &&
      post.author.trim() !== ""
    ) {
      return post.author;
    }

    if (
      post.author &&
      typeof post.author === "object"
    ) {
      return (
        post.author.full_name ||
        post.author.fullName ||
        post.author.name ||
        post.author.username ||
        post.author.email ||
        "Unknown Author"
      );
    }

    return (
      post.user_name ||
      post.username ||
      post.postedBy ||
      post.authorName ||
      "Staff Member"
    );
  };





  const getImageUrl = (post) => {
    if (!post) {
      return null;
    }

    const image =
      post.image ||
      post.image_url ||
      post.imageUrl ||
      post.photo ||
      post.thumbnail;

    if (!image) {
      return null;
    }

    if (
      image.startsWith("http://") ||
      image.startsWith("https://") ||
      image.startsWith("data:")
    ) {
      return image;
    }

    if (image.startsWith("/")) {
      return `${API_ROOT}${image}`;
    }

    if (image.startsWith("uploads/")) {
      return `${API_ROOT}/${image}`;
    }

    return `${API_ROOT}/uploads/${image}`;
  };





  const getPostDate = (post) => {
    const date =
      post?.createdDate ||
      post?.created_at ||
      post?.createdAt;

    if (!date) {
      return "";
    }

    try {
      return new Date(date).toLocaleDateString(
        "en-GB",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );
    } catch {
      return "";
    }
  };





  const handleViewPost = (post) => {
    setSelectedPost(post);
    setError("");
  };

  /* Open the article editor. The backend refuses anything the capability map
     says is not allowed, so a stale button can never turn into a data leak. */
  const handleEditPost = async (post) => {
    setActionLoading(true);
    setError("");

    try {
      const full = await getMyPostById(post.id || post._id);

      setSelectedPost(null);
      setEditingPost(full);
      setIsUploadModalOpen(true);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Ntitwashoboye guhindura iyi nkuru."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePost = async (post) => {
    if (!window.confirm("Siba iyi nkuru? Ikigizeho ntibizakomeretsa.")) {
      return;
    }

    setActionLoading(true);
    setError("");

    try {
      await deletePost(post.id || post._id);
      setPosts((previous) =>
        previous.filter((item) => String(item.id || item._id) !== String(post.id || post._id))
      );
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Ntitwashoboye gusiba iyi nkuru."
      );
    } finally {
      setActionLoading(false);
    }
  };





  const handleCloseViewPost = () => {
    setSelectedPost(null);
  };





  const getYoutubeUrls = (post) => {
    if (!post) return [];

    const raw = post.youtube_urls ?? post.youtubeUrls;
    let list = [];

    if (Array.isArray(raw)) {
      list = raw;
    } else if (typeof raw === "string" && raw.trim()) {
      try {
        const parsed = JSON.parse(raw);
        list = Array.isArray(parsed) ? parsed : [];
      } catch {
        list = [];
      }
    }

    const fallback = post.youtube_url || post.youtubeUrl || post.youtube;

    return Array.from(
      new Set(
        [...list, ...(fallback ? [fallback] : [])]
          .map((value) => String(value || "").trim())
          .filter(Boolean)
      )
    ).slice(0, 2);
  };





  const handleSubmit = async (formData) => {
    if (actionLoading) return;
    setActionLoading(true);
    setError("");

    try {
      const authorName = getCurrentUserName();

      if (
        !currentUser ||
        authorName === "Employee"
      ) {
        setError(
          "Your account information could not be found. Please login again."
        );

        return;
      }

      /* Editing an existing article reuses the same form; the backend
         re-checks ownership and the edit permissions on every save. */
      if (editingPost) {
        await updatePost(editingPost.id || editingPost._id, formData);

        handleCloseUploadModal();

        await fetchPosts();

        return;
      }

      if (api.addPost) {
        await api.addPost(formData);
      } else if (api.post) {
        await api.post(
          "/posts",
          formData
        );
      } else {
        throw new Error(
          "addPost API function is not available."
        );
      }

      handleCloseUploadModal();

      await fetchPosts();
    } catch (err) {
      console.error(
        "Error creating post:",
        err
      );

      setError(
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to publish post."
      );
    } finally {
      setActionLoading(false);
    }
  };





  return (
    <div className="space-y-6">



      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">

        <div className="flex min-w-0 items-center gap-3">

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 via-orange-500 to-blue-600 text-lg font-black text-white shadow-sm sm:h-14 sm:w-14">
            RT
          </div>

          <div className="min-w-0">

            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Rubavu Today
            </p>
            <h1 className="truncate text-lg font-black tracking-tight text-slate-900 sm:text-2xl">
              Employee workspace
            </h1>

          </div>

        </div>



        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

          <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5">

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              {getCurrentUserName()
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="min-w-0">

              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-500">
                Winjiye nka
              </p>

              <p className="max-w-[180px] truncate text-sm font-bold text-blue-900">
                {getCurrentUserName()}
              </p>

              {getCurrentUserRole() && (
                <p className="text-[10px] text-blue-600">
                  {getCurrentUserRole()}
                </p>
              )}

            </div>

          </div>

          <button
            type="button"
            onClick={handleOpenUploadModal}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:w-auto"
          >
            <Upload className="h-4 w-4" />

            Shyiraho inkuru
          </button>

        </div>

      </div>



      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 sm:p-4">

        <div className="flex gap-3">

          <User className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

          <div className="flex-1">

            <p className="text-sm font-semibold text-emerald-900">
              Izina ryawe ryishyirwaho ubwaryo
            </p>

            <p className="mt-1 text-xs leading-5 text-emerald-700 sm:text-sm">
              Inkuru zashyizweho zigaragaza izina rya konti yawe:
              <strong className="ml-1">{getCurrentUserName()}</strong>.
            </p>

          </div>

        </div>

      </div>



      <div className="rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 via-blue-50 to-emerald-50 p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
              Employee access
            </p>
            <h2 className="mt-1 text-base font-bold text-slate-900">
              {activePermissions.length > 0
                ? "Your current permissions"
                : "No employee permissions yet"}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/employee/notifications"
              className="relative inline-flex items-center justify-center rounded-xl border border-white bg-white/80 p-2 text-slate-700 shadow-sm transition hover:border-violet-200 hover:text-violet-700"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>

            <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
              {activePermissions.length} active
            </div>
          </div>
        </div>

{permissionTarget && !selectedPermissionIsActive && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            This workspace was opened for the permission “{permissionSummary[permissionTarget] || permissionTarget.replace(/_/g, " ")}”, but it is not currently active for this employee.
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {activePermissions.length === 0 ? (
            <span className="text-sm text-slate-500">
              Ask your admin to grant your employee permissions.
            </span>
          ) : (
            activePermissions.map(({ key, label }, index) => (
              <span
                key={`${key}-${index}`}
                id={`permission-${key}`}
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ring-2 ring-transparent transition ${permissionColorMap[key] || "border-slate-200 bg-white text-slate-700"} ${permissionTarget === key ? "ring-violet-400 shadow-sm" : ""}`}
              >
                {label}
              </span>
            ))
          )}
        </div>
      </div>

      {error && !isUploadModalOpen && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">

          <p className="text-sm font-medium text-red-600">
            {error}
          </p>

        </div>
      )}



      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">



        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">

          <div>

            <h2 className="text-base font-bold text-slate-900 sm:text-lg">
              Inkuru
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              Inkuru zose zo mu biro by'amakuru —
              kuzireba no kuzisoma gusa
            </p>

          </div>

          <div className="flex items-center gap-2">

            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
              {posts.length} Inkuru
            </span>

            {hasViewAllPostsPermission && (
              <button
                type="button"
                onClick={toggleAllPosts}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${showAllPosts
                  ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
              >

                {showAllPosts ? (
                  <>
                    <EyeOff className="h-4 w-4" />

                    View all posts
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />

                    View all posts
                  </>
                )}

              </button>
            )}

          </div>

        </div>



        {!showAllPosts && hasViewAllPostsPermission ? (

          <div className="p-12 text-center">

            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">

              <EyeOff className="h-7 w-7 text-slate-400" />

            </div>

            <p className="text-sm font-semibold text-slate-700">
              Inkuru zose zihishe
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Kanda “Erekana zose” kugira ngo uzibone.
            </p>

            <button
              type="button"
              onClick={toggleAllPosts}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Eye className="h-4 w-4" />

              View all posts
            </button>

          </div>

        ) : loading ? (



          <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500">

            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />

            Inkuru zirimo gutegurwa...

          </div>

        ) : posts.length === 0 ? (



          <div className="p-12 text-center">

            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-3xl">
              📰
            </div>

            <p className="text-sm font-medium text-slate-700">
              Nta nkuru zihari.
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Kanda “Shyiraho inkuru” ukore
              inkuru yawe ya mbere.
            </p>

          </div>

        ) : (





          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3 xl:grid-cols-4">

            {posts.map((post) => {

              const imageUrl =
                getImageUrl(post);

              /* Capabilities come from the backend. Only the actions an
                 employee is actually allowed to perform are rendered. */
              const capabilities =
                getPostCapabilities(post);

              const canOpen = capabilities.canView || capabilities.isOwner;

              const canEdit =
                capabilities.canEditText ||
                capabilities.canEditImage;

              return (

                <div
                  key={
                    post.id ||
                    post._id
                  }
                  className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >



                  <div className="relative h-44 w-full overflow-hidden bg-slate-200">

                    {imageUrl ? (

                      <OptimizedImage
                        src={imageUrl}
                        alt={
                          post.title ||
                          "News image"
                        }
                        widths={RESOLUTION_WIDTHS.CARD}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.style.display =
                            "none";
                        }}
                      />

                    ) : (

                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">

                        <span className="text-4xl">
                          📰
                        </span>

                      </div>

                    )}



                    <span className="absolute left-2.5 top-2.5 rounded-full bg-red-600 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-white shadow-sm">

                      {post.category ||
                        "General"}
                      {post.category === "Amakuru" && post.amakuru_department
                        ? ` · ${post.amakuru_department}`
                        : ""}

                    </span>

                  </div>



                  <div className="flex flex-1 flex-col p-4">

                    <h3 className="line-clamp-2 text-base font-bold leading-snug text-slate-900">
                      {canOpen ? (
                        <button
                          type="button"
                          onClick={() => handleViewPost(post)}
                          className="text-left hover:text-blue-700 focus:outline-none focus-visible:underline"
                        >
                          {post.title || "Untitled Post"}
                        </button>
                      ) : (
                        post.title || "Untitled Post"
                      )}
                    </h3>



                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-600">

                      {post.description ||
                        post.content ||
                        "No content available."}

                    </p>



                    <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2">

                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">

                        <User className="h-3.5 w-3.5" />

                      </div>

                      <div className="min-w-0">

                        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                          Written by
                        </p>

                        <AuthorProfileTrigger
                          author={typeof post.author === "object" ? post.author : {
                            name: getAuthorName(post),
                            role: post.author_role || post.role || "employee",
                          }}
                          className="max-w-full"
                        >
                          <span className="block truncate text-xs font-bold text-slate-700">
                            {getAuthorName(post)}
                          </span>
                        </AuthorProfileTrigger>

                      </div>

                    </div>



                    <div className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-400">

                      <Calendar className="h-3 w-3" />

                      {getPostDate(post) ||
                        "Date unavailable"}

                    </div>



                    <div className="mt-4 border-t border-slate-100 pt-3">

                      <div className="flex flex-wrap items-center gap-2">

                        {canOpen && (

                          <button
                            type="button"
                            onClick={() =>
                              handleViewPost(post)
                            }
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700"
                          >

                            <BookOpen className="h-4 w-4" />

                            Soma Inkuru

                          </button>

                        )}

                        {canEdit && (

                          <button
                            type="button"
                            onClick={() =>
                              handleEditPost(post)
                            }
                            disabled={actionLoading}
                            title={
                              capabilities.isOwner
                                ? "Hindura iyi nkuru"
                                : "Hindura inkuru y'uwundi mukozi"
                            }
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
                          >

                            <Pencil className="h-4 w-4" />

                            Hindura

                          </button>

                        )}

                        {capabilities.canDelete && (

                          <button
                            type="button"
                            onClick={() =>
                              handleDeletePost(post)
                            }
                            disabled={actionLoading}
                            title={
                              capabilities.isOwner
                                ? "Siba iyi nkuru"
                                : "Siba inkuru y'uwundi mukozi"
                            }
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-300 bg-red-50 px-3 py-2.5 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                          >

                            <Trash2 className="h-4 w-4" />

                            Siba

                          </button>

                        )}

                        {!canOpen && !canEdit && !capabilities.canDelete && (

                          <p className="text-xs italic text-slate-400">
                            Nta gukubira uyu mukozi.
                          </p>

                        )}

                      </div>

                      {!capabilities.isOwner && capabilities.canView && (

                        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Inkuru y'uwundi mukozi
                        </p>

                      )}

                    </div>

                  </div>

                </div>

              );
            })}

          </div>

        )}

      </div>



      {selectedPost && (

        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-3 backdrop-blur-sm sm:p-5">

          <div className="my-auto max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">



            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-7">

              <div className="min-w-0">

                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                  News Article
                </p>

                <h2 className="mt-1 truncate text-lg font-bold text-slate-900 sm:text-xl">
                  {selectedPost.title ||
                    "Untitled Post"}
                </h2>

              </div>

              <button
                type="button"
                onClick={
                  handleCloseViewPost
                }
                className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
              >

                <X className="h-5 w-5" />

              </button>

            </div>



            <div className="p-5 sm:p-7">



              {getImageUrl(
                selectedPost
              ) && (

                  <div className="mb-6 overflow-hidden rounded-2xl bg-slate-100">

                    <OptimizedImage
                      src={getImageUrl(
                        selectedPost
                      )}
                      alt={
                        selectedPost.title ||
                        "News"
                      }
                      widths={RESOLUTION_WIDTHS.GALLERY}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 800px"
                      loading="lazy"
                      className="max-h-[500px] w-full object-cover"
                    />

                  </div>

                )}



              <div className="mb-4 flex flex-wrap items-center gap-2">

                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700">

                  <Tag className="h-3.5 w-3.5" />

                  {selectedPost.category ||
                    "General"}

                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">

                  <Calendar className="h-3.5 w-3.5" />

                  {getPostDate(
                    selectedPost
                  )}

                </span>

              </div>



              <h1 className="text-2xl font-extrabold leading-tight text-slate-900 sm:text-4xl">

                {selectedPost.title ||
                  "Untitled Post"}

              </h1>



              <div className="mt-5 flex items-center gap-3 border-b border-slate-200 pb-5">

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">

                  {getAuthorName(
                    selectedPost
                  )
                    .charAt(0)
                    .toUpperCase()}

                </div>

                <div>

                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Written by
                  </p>

                  <AuthorProfileTrigger
                    author={typeof selectedPost.author === "object" ? selectedPost.author : {
                      name: getAuthorName(selectedPost),
                      role: selectedPost.author_role || selectedPost.role || "employee",
                    }}
                  >
                    <span className="text-sm font-bold text-slate-800">
                      {getAuthorName(selectedPost)}
                    </span>
                  </AuthorProfileTrigger>

                </div>

              </div>



              <article className="mt-7">

                <div className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 sm:text-base sm:leading-8">

                  {selectedPost.description ||
                    selectedPost.content ||
                    "No article content available."}

                </div>

              </article>



              {getYoutubeUrls(selectedPost).length > 0 && (

                  <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-4">

                    <p className="text-xs font-bold uppercase tracking-wide text-red-700">
                      YouTube Video
                    </p>

                    <YouTubeEmbeds
                      urls={getYoutubeUrls(selectedPost)}
                      title={selectedPost.title || "YouTube video"}
                      className="mt-3"
                    />

                    <div className="mt-3 space-y-1">
                      {getYoutubeUrls(selectedPost).map((url, index) => (
                        <a
                          key={`yt-link-${index}`}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block break-all text-sm font-semibold text-red-600 underline hover:text-red-800"
                        >
                          {url}
                        </a>
                      ))}
                    </div>

                  </div>

                )}



              <div className="mt-8 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">

                <Lock className="h-5 w-5 shrink-0 text-amber-600" />

                <p className="text-xs leading-5 text-amber-700 sm:text-sm">

                  This post is read-only for
                  employee accounts. Employees
                  cannot edit existing posts.

                </p>

              </div>



              <div className="mt-6 flex justify-end">

                <button
                  type="button"
                  onClick={
                    handleCloseViewPost
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >

                  <X className="h-4 w-4" />

                  Close

                </button>

              </div>

            </div>

          </div>

        </div>

      )}



      {isUploadModalOpen && (

        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5">

          <div className="my-auto max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">



            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-7">

              <div>

                <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                  Upload News Post
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">

                  Author:

                  <strong className="ml-1 text-blue-600">

                    {getCurrentUserName()}

                  </strong>

                </p>

              </div>

              <button
                type="button"
                onClick={
                  handleCloseUploadModal
                }
                disabled={actionLoading}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
              >

                <X className="h-5 w-5" />

              </button>

            </div>



            <div className="p-5 sm:p-7">

              {error && (

                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3">

                  <p className="text-xs font-medium text-red-600">
                    {error}
                  </p>

                </div>

              )}

              <ArticleEditor
                initial={editingPost}
                categories={departments}
                authorText={getCurrentUserName()}
                submitLabel={
                  editingPost
                    ? "Bika Impinduka"
                    : "Tangaza Inkuru"
                }
                saving={actionLoading}
                onSubmit={handleSubmit}
                onCancel={handleCloseUploadModal}
              />

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default Employee;
