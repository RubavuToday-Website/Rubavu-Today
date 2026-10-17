import React, {
    useEffect,
    useState,
    useCallback,
    useRef,
    useMemo,
} from "react";

import {
    API_ROOT,
    getAdminPosts,
    approvePost,
    rejectPost,
    reviewPost,
    updatePost,
    deletePost,
    updateEmployee,
    deleteEmployee,
    updateChiefEditor,
    deleteChiefEditor,
    updateAdvertisement,
    deleteAdvertisement,
    addPost,
    getEmployees,
    addEmployee,
    getChiefEditors,
    addChiefEditor,
    getAdvertisements,
    addAdvertisement,
    changeMyPassword,
    changeMyEmail,
    getAllComments,
    deleteComment,
    getComments,
    getProfileImageUrl,
    getStoredUser,
    uploadProfileImage,
    updatePostStatus,
} from "../../services/api";

import { DashboardLayout } from "../../components/dashboard";
import AuthorProfileTrigger from "../../components/common/AuthorProfileTrigger";
import ArticleEditor from "../../components/article/ArticleEditor";
import YouTubeEmbeds from "../../components/article/YouTubeEmbeds";
import OptimizedImage from "../../components/common/OptimizedImage";
import { RESOLUTION_WIDTHS } from "../../utils/images";
import { isAmakuruCategory } from "../../utils/amakuruDepartments";
import { MessageSquare, Eye, EyeOff, ChevronDown, ChevronRight, Radio } from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_URL = API_ROOT;

const collectYoutubeUrls = (post) => {
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

const DEPARTMENTS = [
    { name: "Amakuru", icon: "📰", color: "blue" },
    { name: "Ubukungu", icon: "💼", color: "emerald" },
    { name: "Imikino", icon: "⚽", color: "orange" },
    { name: "Imyidagaduro", icon: "🎭", color: "pink" },
    { name: "Uburezi", icon: "🎓", color: "purple" },
];

const DEFAULT_AD_POSITIONS = [
    "header",
    "sidebar",
    "footer",
    "inline",
    "between-posts",
];

const POST_STATUSES = {
    ALL: "all",
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
};

const PAGE_SIZE = 8;

const AdminDashboard = ({
    onLogout,
    onNavigateToChiefEditors,
    onCreateEmployee,
    onCreateChiefEditor,
    onPostAdvertisement,
}) => {
    const navigate = useNavigate();
    const [posts, setPosts] = useState([]);
    const [selectedDepartment, setSelectedDepartment] = useState("All");
    const [selectedStatus, setSelectedStatus] = useState(
        POST_STATUSES.PENDING
    );

    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState("newest");
    const [currentPage, setCurrentPage] = useState(1);

    const [selectedPosts, setSelectedPosts] = useState([]);
    const [showFilters, setShowFilters] = useState(false);
    const [viewMode, setViewMode] = useState("grid");

    const [allComments, setAllComments] = useState([]);
    const [loadingComments, setLoadingComments] = useState(true);
    const [commentsError, setCommentsError] = useState("");
    const [showAllComments, setShowAllComments] = useState(false);

    const [editingPostId, setEditingPostId] = useState(null);
    const [editInitial, setEditInitial] = useState(null);
    const [editSaving, setEditSaving] = useState(false);
    const [createPostSaving, setCreatePostSaving] = useState(false);

    const previousRef = useRef([]);

    const [selectedPost, setSelectedPost] = useState(null);
    const [loadingPostComments, setLoadingPostComments] = useState(false);

    const adminUser = getStoredUser();

    const [adminProfilePreview, setAdminProfilePreview] = useState(null);
    const [adminProfileFile, setAdminProfileFile] = useState(null);
    const [adminProfileImage, setAdminProfileImage] = useState(getProfileImageUrl(adminUser));
    const [adminProfileSaving, setAdminProfileSaving] = useState(false);
    const [adminProfileMessage, setAdminProfileMessage] = useState("");
    const [adminProfileError, setAdminProfileError] = useState("");
    const adminProfileInputRef = useRef(null);

    const handleAdminProfileSelect = (e) => {
        const file = e.target.files?.[0];

        if (!file) return;

        if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
            setAdminProfileError("Shyiramo ifoto ya JPG, PNG cyangwa WebP gusa.");
            return;
        }

        setAdminProfileError("");
        setAdminProfileMessage("");
        setAdminProfileFile(file);

        const reader = new FileReader();

        reader.onload = () => setAdminProfilePreview(reader.result);

        reader.readAsDataURL(file);

    };

    const handleAdminProfileUpload = async () => {
        const file = adminProfileFile;

        if (!file) {
            setAdminProfileError("Hitamo ifoto mbere yo kuyibika.");
            return;
        }

        setAdminProfileSaving(true);
        setAdminProfileMessage("");
        setAdminProfileError("");

        try {
            const result = await uploadProfileImage(file);
            setAdminProfileMessage("Ifoto yavuguruwe neza.");
            setAdminProfilePreview(null);
            setAdminProfileFile(null);
            setAdminProfileImage(getProfileImageUrl({ profile_image: result?.profile_image_url || result?.profile_image }));
            if (adminProfileInputRef.current) adminProfileInputRef.current.value = "";
        } catch (err) {
            setAdminProfileError(err?.message || "Ntibyashobotse kubika ifoto.");
        } finally {
            setAdminProfileSaving(false);
        }
    };





    const [showCreatePost, setShowCreatePost] = useState(false);
    const [postEditorKey, setPostEditorKey] = useState(0);





    const [showCreateEmployee, setShowCreateEmployee] = useState(false);
    const [empName, setEmpName] = useState("");
    const [empEmail, setEmpEmail] = useState("");
    const [empPhone, setEmpPhone] = useState("");
    const [empPassword, setEmpPassword] = useState("");





    const [showCreateChief, setShowCreateChief] = useState(false);
    const [chiefName, setChiefName] = useState("");
    const [chiefEmail, setChiefEmail] = useState("");
    const [chiefPhone, setChiefPhone] = useState("");
    const [chiefPassword, setChiefPassword] = useState("");





    const [showCreateAd, setShowCreateAd] = useState(false);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [showChangeEmail, setShowChangeEmail] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [adTitle, setAdTitle] = useState("");
    const [adDescription, setAdDescription] = useState("");
    const [adTargetUrl, setAdTargetUrl] = useState("");
    const [adLink, setAdLink] = useState("");
    const [adPosition, setAdPosition] = useState("");
    const [adPositions] = useState(DEFAULT_AD_POSITIONS);
    const [adStartDate, setAdStartDate] = useState("");
    const [adEndDate, setAdEndDate] = useState("");
    const [adStatus, setAdStatus] = useState("active");
    const [adImage, setAdImage] = useState(null);

    const [employees, setEmployees] = useState([]);
    const [chiefEditors, setChiefEditors] = useState([]);
    const [advertisements, setAdvertisements] = useState([]);

    const [showEditEmployee, setShowEditEmployee] = useState(false);
    const [editEmpId, setEditEmpId] = useState(null);
    const [editEmpName, setEditEmpName] = useState("");
    const [editEmpEmail, setEditEmpEmail] = useState("");
    const [editEmpPhone, setEditEmpPhone] = useState("");
    const [editEmpStatus, setEditEmpStatus] = useState("active");

    const [showEditChief, setShowEditChief] = useState(false);
    const [editChiefId, setEditChiefId] = useState(null);
    const [editChiefName, setEditChiefName] = useState("");
    const [editChiefEmail, setEditChiefEmail] = useState("");
    const [editChiefPhone, setEditChiefPhone] = useState("");
    const [editChiefStatus, setEditChiefStatus] = useState("active");

    const [showEditAd, setShowEditAd] = useState(false);
    const [editAdId, setEditAdId] = useState(null);
    const [editAdTitle, setEditAdTitle] = useState("");
    const [editAdDescription, setEditAdDescription] = useState("");
    const [editAdTargetUrl, setEditAdTargetUrl] = useState("");
    const [editAdLink, setEditAdLink] = useState("");
    const [editAdPosition, setEditAdPosition] = useState("");
    const [editAdPositions] = useState(DEFAULT_AD_POSITIONS);
    const [editAdStartDate, setEditAdStartDate] = useState("");
    const [editAdEndDate, setEditAdEndDate] = useState("");
    const [editAdStatus, setEditAdStatus] = useState("active");
    const [editAdImage, setEditAdImage] = useState(null);





    const normalizeStatus = (post) =>
        String(
            post?.status ||
            post?.approval_status ||
            post?.publication_status ||
            "pending"
        ).toLowerCase();

    const getImageUrl = (image) => {
        if (!image) return null;

        if (
            typeof image === "string" &&
            (image.startsWith("http://") ||
                image.startsWith("https://") ||
                image.startsWith("blob:"))
        ) {
            return image;
        }

        return `${API_URL}${image}`;
    };





    const loadPosts = useCallback(async (isPolling = false) => {
        try {
            setLoading(true);
            setErrorMessage("");

            const data = await getAdminPosts();
            const list = Array.isArray(data) ? data : [];

            if (isPolling && previousRef.current.length) {
                list.forEach((post) => {
                    const previous = previousRef.current.find(
                        (item) => item.id === post.id
                    );

                    const oldComments = previous?.comments?.length || 0;
                    const newComments = post.comments?.length || 0;

                    if (newComments > oldComments) {
                        setStatusMessage(
                            `Ibitekerezo bishya kuri "${post.title || "inkuru"}"`
                        );
                    }
                });
            }

            setPosts(list);
            previousRef.current = list;
        } catch (error) {
            console.error("loadPosts", error);
            setPosts([]);
            setErrorMessage("Ntibyashobotse kunyura mu nkuru. Gerageza ukundi.");
        } finally {
            setLoading(false);
        }
    }, []);





    useEffect(() => {
        loadPosts();
    }, [loadPosts]);





    useEffect(() => {
        const loadAll = async () => {
            try {
                const emps = await getEmployees();
                setEmployees(Array.isArray(emps) ? emps : []);
            } catch (err) {
                console.error("loadEmployees", err);
                setEmployees([]);
            }

            try {
                const chiefs = await getChiefEditors();
                setChiefEditors(Array.isArray(chiefs) ? chiefs : []);
            } catch (err) {
                console.error("loadChiefEditors", err);
                setChiefEditors([]);
            }

            try {
                const ads = await getAdvertisements();
                setAdvertisements(Array.isArray(ads) ? ads : []);
            } catch (err) {
                console.error("loadAdvertisements", err);
                setAdvertisements([]);
            }

            try {
                const comments = await getAllComments();
                setAllComments(Array.isArray(comments) ? comments : []);
            } catch (err) {
                console.error("loadAllComments", err);
                setCommentsError(err?.message || "Ntibyashobotse kunyura mu bitekerezo.");
                setAllComments([]);
            } finally {
                setLoadingComments(false);
            }
        };

        loadAll();
    }, []);





    const handleDeleteAllComment = async (commentId) => {
        if (!commentId) {
            setCommentsError("Ntibyashobotse kumenya iki bitekerezo.");
            return;
        }

        const confirmed = window.confirm("Siba iki bitekerezo?");
        if (!confirmed) return;

        try {
            setCommentsError("");
            await deleteComment(commentId);
            setAllComments((prev) =>
                prev.filter((c) => (c.id ?? c.comment_id ?? c._id) !== commentId)
            );
        } catch (err) {
            console.error("Delete comment error:", err);
            setCommentsError(err?.message || "Ntibyashobotse kureka iki bitekerezo.");
        }
    };




    const handleViewPost = async (post) => {
        const postId = post?.id || post?._id;
        let enriched = { ...post, comments: [] };

        if (postId) {
            setLoadingPostComments(true);
            try {
                const comments = await getComments(postId);
                enriched.comments = Array.isArray(comments) ? comments : [];
            } catch (err) {
                console.error("Load post comments error:", err);
                enriched.comments = [];
            } finally {
                setLoadingPostComments(false);
            }
        }

        setSelectedPost(enriched);
    };

    const handleClosePostDetail = () => setSelectedPost(null);

    const handleStatusChangeFromDetail = async (postId, newStatus) => {
        let confirmation = "Hindura imimerere y'iyi nkuru?";
        if (newStatus === "approved") confirmation = "Emeka iyi nkuru kandi utangaze ku rubuga?";
        if (newStatus === "rejected") confirmation = "Anga iyi nkuru? Ntizizerekanwa ku rubuga.";
        if (newStatus === "pending") confirmation = "Subiza iyi nkuru gusuzumwa?";

        if (!window.confirm(confirmation)) return;

        try {
            setStatusMessage("Nirimo guhindura imimerere...");
            await updatePostStatus(postId, newStatus);
            setStatusMessage(
                newStatus === "approved" ? "Inkuru yemewe kandi yatangajwe." :
                    newStatus === "rejected" ? "Inkuru yanze." :
                        "Inkuru yasubijwe gusuzumwa."
            );
            await loadPosts();

            if (selectedPost && (selectedPost.id === postId || selectedPost._id === postId)) {
                setSelectedPost((prev) => prev ? { ...prev, status: newStatus } : null);
            }
        } catch (error) {
            console.error("Status update error:", error);
            setErrorMessage(error?.message || "Ntibyashobotse guhindura imimerere.");
        }
    };

    const handleDeletePostComment = async (commentId) => {
        if (!commentId) return;
        if (!window.confirm("Siba iki bitekerezo?")) return;

        try {
            await deleteComment(commentId);
            setSelectedPost((prev) => {
                if (!prev) return null;
                return {
                    ...prev,
                    comments: (prev.comments || []).filter(
                        (c) => (c.id ?? c.comment_id ?? c._id) !== commentId
                    ),
                };
            });
            setStatusMessage("Iki bitekerezo cyasibwe.");
        } catch (err) {
            console.error("Delete comment error:", err);
            setErrorMessage(err?.message || "Ntibyashobotse kureka iki bitekerezo.");
        }
    };

    const handleBulkDelete = async () => {
        if (!selectedPosts.length) return;
        if (!window.confirm(`Siba inkuru ${selectedPosts.length} zatoranijwe? Iki gikorwa ntigishobora guhitirwa.`)) return;

        try {
            setStatusMessage("Nirimo kureka inkuru...");
            for (const id of selectedPosts) {
                await deletePost(id);
            }
            clearSelection();
            setStatusMessage("Inkuru zatoranijwe zasibwe.");
            await loadPosts();
        } catch (error) {
            console.error(error);
            setStatusMessage("Inkuru nkeyo ntizibashoye kusibwa.");
        }
    };




    const modalOpen =
        showCreateChief ||
        showEditEmployee ||
        showEditChief ||
        showEditAd ||
        Boolean(editingPostId) ||
        Boolean(selectedPost);

    useEffect(() => {
        if (!modalOpen) return;

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [modalOpen]);

    const inlinePanelId = showCreatePost
        ? "panel-create-post"
        : showCreateAd
            ? "panel-create-ad"
            : showCreateEmployee
                ? "panel-create-employee"
                : showChangePassword
                    ? "panel-change-password"
                    : showChangeEmail
                        ? "panel-change-email"
                        : null;

    useEffect(() => {
        if (!inlinePanelId) return;

        const timer = setTimeout(() => {
            const el = document.getElementById(inlinePanelId);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);

        return () => clearTimeout(timer);
    }, [inlinePanelId]);





    const statistics = useMemo(() => {
        const pending = posts.filter(
            (post) => normalizeStatus(post) === POST_STATUSES.PENDING
        ).length;

        const approved = posts.filter(
            (post) => normalizeStatus(post) === POST_STATUSES.APPROVED
        ).length;

        const rejected = posts.filter(
            (post) => normalizeStatus(post) === POST_STATUSES.REJECTED
        ).length;

        const comments = posts.reduce(
            (total, post) => total + (post.comments?.length || 0),
            0
        );

        return {
            total: posts.length,
            pending,
            approved,
            rejected,
            comments,
        };
    }, [posts]);






    const filteredPosts = useMemo(() => {
        let result = [...posts];

        if (selectedDepartment !== "All") {
            result = result.filter(
                (post) => post.category === selectedDepartment
            );
        }

        if (selectedStatus !== POST_STATUSES.ALL) {
            result = result.filter(
                (post) => normalizeStatus(post) === selectedStatus
            );
        }

        if (search.trim()) {
            const query = search.toLowerCase().trim();

            result = result.filter((post) => {
                return (
                    post.title?.toLowerCase().includes(query) ||
                    post.description?.toLowerCase().includes(query) ||
                    post.category?.toLowerCase().includes(query)
                );
            });
        }

        result.sort((a, b) => {
            if (sortBy === "title") {
                return (a.title || "").localeCompare(b.title || "");
            }

            if (sortBy === "oldest") {
                return (
                    new Date(a.createdDate || 0) -
                    new Date(b.createdDate || 0)
                );
            }

            return (
                new Date(b.createdDate || 0) -
                new Date(a.createdDate || 0)
            );
        });

        return result;
    }, [
        posts,
        selectedDepartment,
        selectedStatus,
        search,
        sortBy,
    ]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredPosts.length / PAGE_SIZE)
    );

    const paginatedPosts = filteredPosts.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [search, selectedDepartment, selectedStatus, sortBy]);





    const handleApprove = async (post) => {
        if (!window.confirm(`Emeka "${post.title}"?`)) return;

        try {
            setStatusMessage("Nirimo kwemera...");
            await approvePost(post.id);
            setStatusMessage("Inkuru yemewe neza.");
            await loadPosts();
        } catch (error) {
            console.error(error);
            setStatusMessage("Ntibyashobotse kwemera inkuru.");
        }
    };

    const handleReject = async (post) => {
        if (!window.confirm(`Anga "${post.title}"?`)) return;

        try {
            setStatusMessage("Nirimo kureka...");
            await rejectPost(post.id);
            setStatusMessage("Inkuru yanze.");
            await loadPosts();
        } catch (error) {
            console.error(error);
            setStatusMessage("Ntibyashobotse kunze inkuru.");
        }
    };

    const handlePending = async (post) => {
        if (!window.confirm(`Subiza "${post.title}" gusuzumwa?`)) return;

        try {
            setStatusMessage("Nirimo guhindura imimerere...");
            await reviewPost(post.id);
            setStatusMessage("Inkuru yasubijwe gusuzumwa.");
            await loadPosts();
        } catch (error) {
            console.error(error);
            setStatusMessage("Ntibyashobotse guhindura imimerere.");
        }
    };

    const handleDelete = async (post) => {
        if (
            !window.confirm(
                `Siba "${post.title}"?\n\nIki gikorwa ntigishobora guhitirwa.`
            )
        ) {
            return;
        }

        try {
            setStatusMessage("Nirimo kureka inkuru...");

            await deletePost(post.id);

            setSelectedPosts((current) =>
                current.filter((id) => id !== post.id)
            );

            setStatusMessage("Inkuru yasibwe.");
            await loadPosts();
        } catch (error) {
            console.error(error);
            setStatusMessage("Ntibyashobotse kureka inkuru.");
        }
    };





    const openEdit = (post) => {
        setEditingPostId(post.id);
        setEditInitial({
            title: post.title || "",
            description: post.description || post.content || "",
            youtube_url: post.youtube_url || "",
            youtube_urls: post.youtube_urls || post.youtubeUrls || null,
            image: post.image || null,
            category: post.category || DEPARTMENTS[0].name,
            amakuru_department: post.amakuru_department || "",
            status: post.status || "",
            content_blocks: post.content_blocks || null,
        });
    };

    const closeEdit = () => {
        setEditingPostId(null);
        setEditInitial(null);
    };

    const handleSubmitEdit = async (formData) => {
        if (!editingPostId) return;

        try {
            setStatusMessage("Nirimo guhindura inkuru...");
            setEditSaving(true);

            await updatePost(editingPostId, formData);

            setStatusMessage("Inkuru yavuguruwe neza.");
            closeEdit();
            await loadPosts();
        } catch (error) {
            console.error("Update post error:", error);
            setErrorMessage(
                error?.message || "Ntibyashobotse guhindura inkuru."
            );
        } finally {
            setEditSaving(false);
        }
    };





    const togglePostSelection = (id) => {
        setSelectedPosts((current) =>
            current.includes(id)
                ? current.filter((item) => item !== id)
                : [...current, id]
        );
    };

    const selectAllVisible = () => {
        const visibleIds = paginatedPosts.map((post) => post.id);

        const allSelected =
            visibleIds.length > 0 &&
            visibleIds.every((id) => selectedPosts.includes(id));

        if (allSelected) {
            setSelectedPosts((current) =>
                current.filter((id) => !visibleIds.includes(id))
            );
        } else {
            setSelectedPosts((current) => [
                ...new Set([...current, ...visibleIds]),
            ]);
        }
    };

    const clearSelection = () => {
        setSelectedPosts([]);
    };

    const handleBulkApprove = async () => {
        if (!selectedPosts.length) return;

        if (
            !window.confirm(
                `Emeka inkuru ${selectedPosts.length} zatoranijwe?`
            )
        ) {
            return;
        }

        try {
            setStatusMessage("Nirimo kwemera inkuru zatoranijwe...");

            for (const id of selectedPosts) {
                await approvePost(id);
            }

            clearSelection();
            setStatusMessage("Inkuru zatoranijwe zemewe.");
            await loadPosts();
        } catch (error) {
            console.error(error);
            setStatusMessage("Inkuru nkeyo ntizemewe.");
        }
    };

    const handleBulkReject = async () => {
        if (!selectedPosts.length) return;

        if (
            !window.confirm(
                `Anka inkuru ${selectedPosts.length} zatoranijwe?`
            )
        ) {
            return;
        }

        try {
            setStatusMessage("Nirimo kunze inkuru zatoranijwe...");

            for (const id of selectedPosts) {
                await rejectPost(id);
            }

            clearSelection();
            setStatusMessage("Inkuru zatoranijwe zanze.");
            await loadPosts();
        } catch (error) {
            console.error(error);
            setStatusMessage("Inkuru nkeyo ntizanze.");
        }
    };





    const exportPosts = () => {
        if (!filteredPosts.length) {
            setStatusMessage("Nta nkuru ziriho kurishyiraho.");
            return;
        }

        const headers = [
            "Umutwe",
            "Ibyiciro",
            "Imimerere",
            "Itariki y'iyaremwe",
            "Ibitekerezo",
        ];

        const rows = filteredPosts.map((post) => [
            post.title || "",
            post.category || "",
            normalizeStatus(post),
            post.createdDate || "",
            post.comments?.length || 0,
        ]);

        const csv = [headers, ...rows]
            .map((row) =>
                row
                    .map((value) =>
                        `"${String(value).replace(/"/g, '""')}"`
                    )
                    .join(",")
            )
            .join("\n");

        const blob = new Blob([csv], {
            type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "rubavu-today-posts.csv";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);

        setStatusMessage("Inkuru zarishyijweho neza.");
    };





    const quickAction = (callback, fallback) => {
        if (callback) {
            callback();
        } else {
            setStatusMessage(fallback);
        }
    };





    const handleCreatePost = async (formData) => {
        if (createPostSaving) return;
        try {
            setCreatePostSaving(true);
            setStatusMessage("Nirimo kurema inkuru...");

            await addPost(formData);

            setStatusMessage("Inkuru yaremewe.");
            setShowCreatePost(false);
            setPostEditorKey((k) => k + 1);

            await loadPosts();
        } catch (err) {
            console.error(err);
            setStatusMessage(
                err?.message || "Ntibyashobotse kurema inkuru."
            );
        } finally {
            setCreatePostSaving(false);
        }
    };





    const handleCreateEmployee = async () => {
        if (
            !empName.trim() ||
            !empEmail.trim() ||
            !empPassword.trim()
        ) {
            setStatusMessage(
                "Izina, imeyili n'ijambo ry'ibanga birakenewe kuri umukozi."
            );
            return;
        }

        try {
            setStatusMessage("Nirimo kurema umukozi...");

            await addEmployee({
                full_name: empName,
                email: empEmail,
                phone: empPhone || null,
                password: empPassword,
                role: "reporter",
                status: "active",
            });

            const emps = await getEmployees();
            setEmployees(Array.isArray(emps) ? emps : []);

            setStatusMessage("Umukozi yaremewe.");
            setShowCreateEmployee(false);

            setEmpName("");
            setEmpEmail("");
            setEmpPhone("");
            setEmpPassword("");
        } catch (err) {
            console.error(err);
            setStatusMessage(
                err?.message || "Ntibyashobotse kurema umukozi."
            );
        }
    };





    const handleCreateChief = async () => {
        if (
            !chiefName.trim() ||
            !chiefEmail.trim() ||
            !chiefPassword.trim()
        ) {
            setStatusMessage(
                "Izina, imeyili n'ijambo ry'ibanga birakenewe kuri umwanditsi mukuru."
            );
            return;
        }

        try {
            setStatusMessage("Nirimo kurema umwanditsi mukuru...");

            await addChiefEditor({
                full_name: chiefName,
                email: chiefEmail,
                phone: chiefPhone || null,
                password: chiefPassword,
                status: "active",
            });

            const chiefs = await getChiefEditors();
            setChiefEditors(Array.isArray(chiefs) ? chiefs : []);

            setStatusMessage("Umwanditsi mukuru yaremewe.");
            setShowCreateChief(false);

            setChiefName("");
            setChiefEmail("");
            setChiefPhone("");
            setChiefPassword("");
        } catch (err) {
            console.error(err);
            setStatusMessage(
                err?.message || "Ntibyashobotse kurema umwanditsi mukuru."
            );
        }
    };

    const handleChangePassword = async (event) => {
        event.preventDefault();

        if (newPassword.length < 6) {
            setStatusMessage("Ijambo ry'ibanga rishya rigomba kuba n'ibyangombwa 6 ku bundle.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setStatusMessage("Ijambo ry'ibanga rishya n'iryo ririho ntiringana.");
            return;
        }

        try {
            await changeMyPassword(currentPassword, newPassword);
            setStatusMessage("Ijambo ry'ibanga ryahinduwe neza.");
            setShowChangePassword(false);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error) {
            setStatusMessage(error?.message || "Ntibyashobotse guhindura ijambo ry'ibanga.");
        }
    };

    const handleChangeEmail = async (event) => {
        event.preventDefault();

        try {
            await changeMyEmail(newEmail, currentPassword);
            setStatusMessage("Imeyili yahinduwe neza.");
            setShowChangeEmail(false);
            setNewEmail("");
            setCurrentPassword("");
        } catch (error) {
            setStatusMessage(error?.message || "Ntibyashobotse guhindura imeyili.");
        }
    };





    const handleCreateAd = async () => {
        if (!adTitle.trim() || !adPosition.trim()) {
            setStatusMessage(
                "Umutwe n'ahantu birakenewe kuri itangazo."
            );
            return;
        }

        try {
            setStatusMessage("Nirimo kurema itangazo...");

            await addAdvertisement({
                title: adTitle,
                description: adDescription || null,
                target_url: adTargetUrl || null,
                link: adLink || null,
                position: adPosition,
                start_date: adStartDate || null,
                end_date: adEndDate || null,
                status: adStatus || "active",
                image: adImage || null,
            });

            const ads = await getAdvertisements();
            setAdvertisements(Array.isArray(ads) ? ads : []);

            setStatusMessage("Itangazo ryaremewe.");
            setShowCreateAd(false);

            setAdTitle("");
            setAdDescription("");
            setAdTargetUrl("");
            setAdLink("");
            setAdPosition("");
            setAdStartDate("");
            setAdEndDate("");
            setAdStatus("active");
            setAdImage(null);
        } catch (err) {
            console.error(err);
            setStatusMessage(
                err?.message || "Ntibyashobotse kurema itangazo."
            );
        }
    };


    const openEditEmployee = (emp) => {
        setEditEmpId(emp.id);
        setEditEmpName(emp.full_name || emp.name || "");
        setEditEmpEmail(emp.email || "");
        setEditEmpPhone(emp.phone || "");
        setEditEmpStatus(emp.status || "active");
        setShowEditEmployee(true);
    };

    const handleSaveEmployeeEdit = async () => {
        if (!editEmpName.trim() || !editEmpEmail.trim()) {
            setStatusMessage("Izina n'imeyili birakenewe.");
            return;
        }

        try {
            setStatusMessage("Nirimo kubika umukozi...");
            await updateEmployee(editEmpId, {
                full_name: editEmpName,
                email: editEmpEmail,
                phone: editEmpPhone || null,
                status: editEmpStatus || "active",
            });


            try {
                const emps = await getEmployees();
                setEmployees(Array.isArray(emps) ? emps : []);
            } catch (err2) {
                console.error('refresh employees', err2);
            }

            setStatusMessage("Umukozi yavuguruwe.");
            setShowEditEmployee(false);
        } catch (err) {
            console.error(err);
            setStatusMessage(err?.message || "Ntibyashobotse guhindura umukozi.");
        }
    };

    const handleDeleteEmployee = async (id) => {
        if (!window.confirm('Siba iyi mukozi? Iki gikorwa ntigishobora guhitirwa.')) return;

        try {
            setStatusMessage('Nirimo kureka umukozi...');
            await deleteEmployee(id);

            const emps = await getEmployees();
            setEmployees(Array.isArray(emps) ? emps : []);
            setStatusMessage('Umukozi yasibwe.');
        } catch (err) {
            console.error(err);
            setStatusMessage(err?.message || 'Ntibyashobotse kureka umukozi.');
        }
    };


    const openEditChief = (c) => {
        setEditChiefId(c.id);
        setEditChiefName(c.full_name || c.name || "");
        setEditChiefEmail(c.email || "");
        setEditChiefPhone(c.phone || "");
        setEditChiefStatus(c.status || "active");
        setShowEditChief(true);
    };

    const handleSaveChiefEdit = async () => {
        if (!editChiefName.trim() || !editChiefEmail.trim()) {
            setStatusMessage("Izina n'imeyili birakenewe.");
            return;
        }

        try {
            setStatusMessage("Nirimo kubika umwanditsi mukuru...");
            await updateChiefEditor(editChiefId, {
                full_name: editChiefName,
                email: editChiefEmail,
                phone: editChiefPhone || null,
                status: editChiefStatus || "active",
            });


            try {
                const chiefs = await getChiefEditors();
                setChiefEditors(Array.isArray(chiefs) ? chiefs : []);
            } catch (err2) {
                console.error('refresh chiefs', err2);
            }

            setStatusMessage("Umwanditsi mukuru yavuguruwe.");
            setShowEditChief(false);
        } catch (err) {
            console.error(err);
            setStatusMessage(err?.message || "Ntibyashobotse guhindura umwanditsi mukuru.");
        }
    };

    const handleDeleteChief = async (id) => {
        if (!window.confirm('Siba uyu mwanditsi mukuru? Iki gikorwa ntigishobora guhitirwa.')) return;

        try {
            setStatusMessage('Nirimo kureka umwanditsi mukuru...');
            await deleteChiefEditor(id);

            const chiefs = await getChiefEditors();
            setChiefEditors(Array.isArray(chiefs) ? chiefs : []);
            setStatusMessage('Umwanditsi mukuru yasibwe.');
        } catch (err) {
            console.error(err);
            setStatusMessage(err?.message || 'Ntibyashobotse kureka umwanditsi mukuru.');
        }
    };


    const openEditAd = (a) => {
        setEditAdId(a.id);
        setEditAdTitle(a.title || "");
        setEditAdDescription(a.description || "");
        setEditAdTargetUrl(a.target_url || "");
        setEditAdLink(a.link || "");
        setEditAdPosition(a.position || "");
        setEditAdStartDate(a.start_date || "");
        setEditAdEndDate(a.end_date || "");
        setEditAdStatus(a.status || "active");
        setEditAdImage(null);
        setShowEditAd(true);
    };

    const handleSaveAdEdit = async () => {
        if (!editAdTitle.trim() || !editAdPosition.trim()) {
            setStatusMessage("Umutwe n'ahantu birakenewe.");
            return;
        }

        try {
            setStatusMessage("Nirimo kubika itangazo...");

            await updateAdvertisement(editAdId, {
                title: editAdTitle,
                description: editAdDescription || null,
                target_url: editAdTargetUrl || null,
                link: editAdLink || null,
                position: editAdPosition,
                start_date: editAdStartDate || null,
                end_date: editAdEndDate || null,
                status: editAdStatus || 'active',
                image: editAdImage || null,
            });

            const ads = await getAdvertisements();
            setAdvertisements(Array.isArray(ads) ? ads : []);

            setStatusMessage('Itangazo ryavuguruwe.');
            setShowEditAd(false);
        } catch (err) {
            console.error(err);
            setStatusMessage(err?.message || 'Ntibyashobotse guhindura itangazo.');
        }
    };

    const handleDeleteAd = async (id) => {
        if (!window.confirm('Siba itangazo? Iki gikorwa ntigishobora guhitirwa.')) return;

        try {
            setStatusMessage('Nirimo kureka itangazo...');
            await deleteAdvertisement(id);

            const ads = await getAdvertisements();
            setAdvertisements(Array.isArray(ads) ? ads : []);
            setStatusMessage('Itangazo ryasibwe.');
        } catch (err) {
            console.error(err);
            setStatusMessage(err?.message || 'Ntibyashobotse kureka itangazo.');
        }
    };

    const handleSendAd = async (ad) => {
        const id = ad?.id || ad;

        if (!id) return;

        if (!window.confirm('Ohora itangazo ririho (shyira imimerere ku "rirakora")?')) return;

        try {
            setStatusMessage('Nirimo kohora itangazo...');

            await updateAdvertisement(id, { status: 'active' });

            const ads = await getAdvertisements();
            setAdvertisements(Array.isArray(ads) ? ads : []);

            setStatusMessage('Itangazo ryohotse (ryakoze).');
        } catch (err) {
            console.error('send ad', err);
            setStatusMessage(err?.message || 'Ntibyashobotse kohora itangazo.');
        }
    };


    const navSections = [
        {
            label: "MAIN",
            items: [
                { icon: <span>▦</span>, label: "Dashboard", path: "/admin/dashboard" },
            ],
        },
        {
            label: "INKURU",
            items: [
                { icon: <span>⏳</span>, label: "Zitegereje gusuzumwa", path: "/admin/posts/pending", badge: statistics.pending },
                { icon: <span>✓</span>, label: "Published Articles", path: "/admin/posts/published" },
                { icon: <span>✕</span>, label: "Zanzwe", path: "/admin/posts/rejected" },
            ],
        },
        {
            label: "IMICUNGIRE",
            items: [
                { icon: <span>👤</span>, label: "Employees", path: "/admin/employees" },
                { icon: <span>🛡️</span>, label: "Chief Editors", path: "/admin/chief-editors" },
                { icon: <span>👥</span>, label: "Konti n'Inkuru", path: "/admin/accounts" },
                { icon: <span>📊</span>, label: "Imikorere y'Employees", path: "/admin/performance" },
            ],
        },
        {
            label: "IBINDI",
            items: [
                { icon: <span>📢</span>, label: "Kwamamaza", path: "/admin/advertisements" },
                { icon: <span>📥</span>, label: "Reports", path: "/admin/reports" },
                { icon: <span>🧹</span>, label: "Text Cleaner", path: "/admin/text-cleaner" },
            ],
        },
    ];

    return (
        <DashboardLayout navigationSections={navSections} roleLabel="Imicungire y'ubwanditsi" onLogout={onLogout}>

            {showEditEmployee && (
                <ModalShell onClose={() => setShowEditEmployee(false)} maxWidth="max-w-md">
                    <ModalHeader title="Hindura Umukozi" description="Vugurura amakuru y'umukozi." onClose={() => setShowEditEmployee(false)} />

                    <form onSubmit={(e) => { e.preventDefault(); handleSaveEmployeeEdit(); }} className="flex min-h-0 flex-1 flex-col">
                        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
                            <input value={editEmpName} onChange={(e) => setEditEmpName(e.target.value)} placeholder="Izina ry'umuntu" className="form-input" />
                            <input value={editEmpEmail} onChange={(e) => setEditEmpEmail(e.target.value)} placeholder="Imeyili" type="email" className="form-input" />
                            <input value={editEmpPhone} onChange={(e) => setEditEmpPhone(e.target.value)} placeholder="Telefone (Byibuze)" className="form-input" />
                            <FormField label="Imimerere">
                                <select value={editEmpStatus} onChange={(e) => setEditEmpStatus(e.target.value)} className="form-input">
                                    <option value="active">Akitirije</option>
                                    <option value="inactive">Itigize</option>
                                </select>
                            </FormField>
                        </div>

                        <ModalFooter onCancel={() => setShowEditEmployee(false)} confirmText="Kubika" confirmClass="bg-emerald-600 hover:bg-emerald-700" confirmType="submit" />
                    </form>
                </ModalShell>
            )}



            {showEditChief && (
                <ModalShell onClose={() => setShowEditChief(false)} maxWidth="max-w-md">
                    <ModalHeader title="Hindura Umwanditsi Mukuru" description="Vugurura amakuru y'umwanditsi mukuru." onClose={() => setShowEditChief(false)} />

                    <form onSubmit={(e) => { e.preventDefault(); handleSaveChiefEdit(); }} className="flex min-h-0 flex-1 flex-col">
                        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
                            <input value={editChiefName} onChange={(e) => setEditChiefName(e.target.value)} placeholder="Izina ry'umuntu" className="form-input" />
                            <input value={editChiefEmail} onChange={(e) => setEditChiefEmail(e.target.value)} placeholder="Imeyili" type="email" className="form-input" />
                            <input value={editChiefPhone} onChange={(e) => setEditChiefPhone(e.target.value)} placeholder="Telefone (Byibuze)" className="form-input" />
                            <FormField label="Imimerere">
                                <select value={editChiefStatus} onChange={(e) => setEditChiefStatus(e.target.value)} className="form-input">
                                    <option value="active">Akitirije</option>
                                    <option value="inactive">Itigize</option>
                                </select>
                            </FormField>
                        </div>

                        <ModalFooter onCancel={() => setShowEditChief(false)} confirmText="Kubika" confirmClass="bg-indigo-600 hover:bg-indigo-700" confirmType="submit" />
                    </form>
                </ModalShell>
            )}



            {showEditAd && (
                <ModalShell onClose={() => setShowEditAd(false)} maxWidth="max-w-2xl">
                    <ModalHeader title="Hindura Kwamamaza" description="Vugurura amakuru y'kwamamaza." onClose={() => setShowEditAd(false)} />
                    <form onSubmit={(e) => { e.preventDefault(); handleSaveAdEdit(); }} className="flex min-h-0 flex-1 flex-col">
                        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
                            <FormField label="Umutwe">
                                <input value={editAdTitle} onChange={(e) => setEditAdTitle(e.target.value)} className="form-input" />
                            </FormField>

                            <FormField label="Ahandi ko barobanye">
                                <select value={editAdPosition} onChange={(e) => setEditAdPosition(e.target.value)} className="form-input">
                                    <option value="">Hitamo inzira</option>
                                    {editAdPositions.map((p) => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </FormField>

                            <FormField label="URL y'ikintu">
                                <input value={editAdTargetUrl} onChange={(e) => setEditAdTargetUrl(e.target.value)} className="form-input" />
                            </FormField>

                            <FormField label="Ikintu cyokubikira (Byibuze)">
                                <input value={editAdLink} onChange={(e) => setEditAdLink(e.target.value)} className="form-input" />
                            </FormField>

                            <FormField label="Ibisobanuro">
                                <textarea value={editAdDescription} onChange={(e) => setEditAdDescription(e.target.value)} rows={4} className="form-input resize-none" />
                            </FormField>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <FormField label="Itariki y'inzira">
                                    <input type="date" value={editAdStartDate} onChange={(e) => setEditAdStartDate(e.target.value)} className="form-input" />
                                </FormField>

                                <FormField label="Itariki y'impera">
                                    <input type="date" value={editAdEndDate} onChange={(e) => setEditAdEndDate(e.target.value)} className="form-input" />
                                </FormField>
                            </div>

                            <FormField label="Ifoto (Byibuze)">
                                <input type="file" accept="image/*" onChange={(e) => setEditAdImage(e.target.files?.[0] || null)} className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-indigo-700" />
                            </FormField>

                            <FormField label="Imimerere">
                                <select value={editAdStatus} onChange={(e) => setEditAdStatus(e.target.value)} className="form-input">
                                    <option value="active">Akitirije</option>
                                    <option value="inactive">Itigize</option>
                                </select>
                            </FormField>
                        </div>

                        <ModalFooter onCancel={() => setShowEditAd(false)} confirmText="Kubika" confirmClass="bg-indigo-600 hover:bg-indigo-700" confirmType="submit" />
                    </form>
                </ModalShell>
            )}







            <div className="min-w-0">


                <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
                    <div className="mx-auto flex min-h-16 max-w-[1700px] flex-wrap items-center gap-2 px-3 py-2 sm:flex-nowrap sm:gap-3 sm:px-6 lg:px-8">




                        <div className="min-w-0 flex-1">
                            <p className="hidden text-[11px] font-medium text-slate-400 sm:block">
                                Ubwanditsi / Dashboard
                            </p>

                            <h2 className="truncate text-sm font-bold text-slate-900 sm:text-lg">
                                Dashboard y'ubwanditsi
                            </h2>
                        </div>


                        <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-1.5 sm:w-auto sm:shrink-0 sm:flex-nowrap sm:gap-3">
                            <button
                                type="button"
                                onClick={() => navigate("/admin/radio")}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-2.5 py-2 text-sm font-bold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-200 sm:px-3"
                                title="Gucunga Radio"
                            >
                                <Radio className="h-4 w-4" />
                                <span>Radio</span>
                            </button>

                            <button
                                onClick={() => loadPosts()}
                                className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-sm font-medium text-slate-600 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 sm:px-3"
                                title="Ongera ushyireho"
                            >
                                ↻
                                <span className="ml-1 hidden sm:inline">
                                    Ongera ushyireho
                                </span>
                            </button>

                            <button
                                onClick={() => navigate("/admin/change-password")}
                                className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-sm font-medium text-slate-600 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 sm:px-3"
                            >
                                Change Password
                            </button>

                            <button
                                onClick={() => navigate("/admin/change-email")}
                                className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-sm font-medium text-slate-600 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 sm:px-3"
                            >
                                Change Email
                            </button>

                            <button
                                className="relative rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm sm:p-2.5"
                                title="Imenyesha"
                            >
                                🔔

                                {statistics.pending > 0 && (
                                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                                        {statistics.pending > 9
                                            ? "9+"
                                            : statistics.pending}
                                    </span>
                                )}
                            </button>

                            <div className="relative hidden items-center gap-2 border-l border-slate-200 pl-3 sm:flex">
                                <div className="relative shrink-0">
                                    {adminProfilePreview ? (
                                        <img
                                            src={adminProfilePreview}
                                            alt="Ifoto"
                                            className="h-9 w-9 rounded-full object-cover"
                                        />
                                    ) : adminProfileImage ? (
                                        <img
                                            src={adminProfileImage}
                                            alt={adminUser?.full_name || "Umuyobozi"}
                                            className="h-9 w-9 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                                            {(adminUser?.full_name || "A").trim().charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>

                                <div className="hidden xl:block">
                                    <p className="text-xs font-bold text-slate-800">
                                        {adminUser?.full_name || "Umuyobozi"}
                                    </p>

                                    <p className="text-[10px] text-slate-400">
                                        Umuyobozi mwiza
                                    </p>

                                    <div className="mt-0.5">
                                        <input
                                            ref={adminProfileInputRef}
                                            type="file"
                                            accept="image/jpeg,image/jpg,image/png,image/webp"
                                            onChange={handleAdminProfileSelect}
                                            className="hidden"
                                        />

                                        <button
                                            type="button"
                                            onClick={() => adminProfileInputRef.current?.click()}
                                            className="text-[10px] font-bold text-blue-600 transition hover:underline"
                                            title="Hitamo ifoto"
                                        >
                                            {adminProfilePreview ? "Hindura ifoto" : "+ Ifoto"}
                                        </button>

                                        {adminProfilePreview && (
                                            <span className="ml-1.5 inline-flex gap-1">
                                                <button
                                                    type="button"
                                                    onClick={handleAdminProfileUpload}
                                                    disabled={adminProfileSaving}
                                                    className="text-[10px] font-bold text-emerald-600 transition hover:underline disabled:opacity-50"
                                                >
                                                    {adminProfileSaving ? "..." : "Bika"}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAdminProfilePreview(null);
                                                        setAdminProfileFile(null);
                                                        if (adminProfileInputRef.current) adminProfileInputRef.current.value = "";
                                                    }}
                                                    className="text-[10px] font-bold text-red-500 transition hover:underline"
                                                >
                                                    Reka
                                                </button>
                                            </span>
                                        )}

                                        {adminProfileMessage && (
                                            <p className="text-[10px] font-bold text-emerald-600">✓ {adminProfileMessage}</p>
                                        )}

                                        {adminProfileError && (
                                            <p className="text-[10px] font-bold text-red-600">✕ {adminProfileError}</p>
                                        )}
                                    </div>
                                </div>
                            </div>


                            <div className="items-center gap-2 flex">
                                <button
                                    onClick={() => navigate("/admin/posts/new")}
                                    className="rounded-xl bg-blue-600 px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 lg:px-4"
                                >
                                    + Inkuru nshya
                                </button>

                                <button
                                    onClick={() => setShowCreateAd(true)}
                                    className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-800 transition duration-200 hover:-translate-y-0.5 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 lg:px-4"
                                >
                                    + Kwamamaza
                                </button>
                            </div>
                        </div>
                    </div>
                </header>


                {showCreatePost && (
                    <div className="mx-auto w-full max-w-[1700px] px-3 sm:px-6 lg:px-8">
                        <InlinePanel
                            id="panel-create-post"
                            title="Kora Inkuru"
                            description="Onjera inkuru nshya mu miryango."
                            onClose={() => setShowCreatePost(false)}
                        >
                            <ArticleEditor
                                key={postEditorKey}
                                initial={null}
                                categories={DEPARTMENTS}
                                submitLabel="Kora inkuru"
                                saving={createPostSaving}
                                onSubmit={handleCreatePost}
                                onCancel={() => setShowCreatePost(false)}
                            />
                        </InlinePanel>
                    </div>
                )}

                {showCreateAd && (
                    <div className="mx-auto w-full max-w-[1700px] px-3 sm:px-6 lg:px-8">
                        <InlinePanel
                            id="panel-create-ad"
                            title="Ongeraho itangazo"
                            description="Ongeraho itangazo rishya ku rubuga."
                            onClose={() => setShowCreateAd(false)}
                        >
                            <form
                                onSubmit={(e) => { e.preventDefault(); handleCreateAd(); }}
                            >
                                <div className="space-y-5 p-5 sm:p-7">
                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <FormField label="Umutwe">
                                            <input
                                                value={adTitle}
                                                onChange={(e) =>
                                                    setAdTitle(e.target.value)
                                                }
                                                className="form-input"
                                                placeholder="Umutwe w'itangazo"
                                            />
                                        </FormField>

                                        <FormField label="Ahantu">
                                            <select
                                                value={adPosition}
                                                onChange={(e) =>
                                                    setAdPosition(e.target.value)
                                                }
                                                className="form-input"
                                            >
                                                <option value="">
                                                    Hitamo ahantu
                                                </option>

                                                {adPositions.map((position) => (
                                                    <option key={position} value={position}>
                                                        {position}
                                                    </option>
                                                ))}
                                            </select>
                                        </FormField>
                                    </div>

                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <FormField label="Linko igenga">
                                            <input
                                                value={adTargetUrl}
                                                onChange={(e) =>
                                                    setAdTargetUrl(e.target.value)
                                                }
                                                placeholder="https://example.com"
                                                className="form-input"
                                            />
                                        </FormField>

                                        <FormField label="Linko y'ubwugero (byibuze)">
                                            <input
                                                value={adLink}
                                                onChange={(e) =>
                                                    setAdLink(e.target.value)
                                                }
                                                placeholder="Linko yo mu mirongo cyangwa nimero y'igikorwa (byibuze)"
                                                className="form-input"
                                            />
                                        </FormField>
                                    </div>

                                    <FormField label="Ibisobanuro (byibuze)">
                                        <textarea
                                            value={adDescription}
                                            onChange={(e) =>
                                                setAdDescription(e.target.value)
                                            }
                                            rows={4}
                                            className="form-input resize-none"
                                            placeholder="Ibisobanuro by'itangazo"
                                        />
                                    </FormField>

                                    <div className="grid gap-4 sm:grid-cols-3">
                                        <FormField label="Itariki y'itangira">
                                            <input
                                                type="date"
                                                value={adStartDate}
                                                onChange={(e) =>
                                                    setAdStartDate(e.target.value)
                                                }
                                                className="form-input"
                                            />
                                        </FormField>

                                        <FormField label="Itariki y'irangirira">
                                            <input
                                                type="date"
                                                value={adEndDate}
                                                onChange={(e) =>
                                                    setAdEndDate(e.target.value)
                                                }
                                                className="form-input"
                                            />
                                        </FormField>

                                        <FormField label="Imimerere">
                                            <select
                                                value={adStatus}
                                                onChange={(e) =>
                                                    setAdStatus(e.target.value)
                                                }
                                                className="form-input"
                                            >
                                                <option value="active">
                                                    Rirakora
                                                </option>

                                                <option value="inactive">
                                                    Ntirirakora
                                                </option>
                                            </select>
                                        </FormField>
                                    </div>

                                    <FormField label="Ifoto (byibuze)">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) =>
                                                setAdImage(
                                                    e.target.files?.[0] || null
                                                )
                                            }
                                            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-indigo-700"
                                        />
                                    </FormField>

                                    {(adImage || adTitle || adDescription) && (
                                        <AdPreview
                                            image={adImage}
                                            title={adTitle}
                                            description={adDescription}
                                            targetUrl={adTargetUrl}
                                        />
                                    )}
                                </div>

                                <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateAd(false)}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100 sm:w-auto"
                                    >
                                        Hagarika
                                    </button>
                                    <button
                                        type="submit"
                                        className="w-full rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-indigo-700 sm:w-auto"
                                    >
                                        Bika itangazo
                                    </button>
                                </div>
                            </form>
                        </InlinePanel>
                    </div>
                )}

                {showChangePassword && (
                    <div className="mx-auto w-full max-w-[1700px] px-3 sm:px-6 lg:px-8">
                        <section
                            id="panel-change-password"
                            className="mb-6 mt-4 flex max-h-[calc(100dvh-9rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                        >
                            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/60 px-5 py-4">
                                <div className="min-w-0">
                                    <h3 className="text-base font-black text-slate-900">
                                        Hindura ijambo ry'ibanga
                                    </h3>
                                    <p className="mt-0.5 text-xs text-slate-400">
                                        Emeza ijambo ry'ibanga ririho mbere yo guhitamo rishya.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowChangePassword(false)}
                                    className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                    aria-label="Hagarika"
                                >
                                    ✕
                                </button>
                            </div>

                            <form onSubmit={handleChangePassword} className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 scrollbar-thin sm:p-6">
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <FormField label="Ijambo ry'ibanga ririho">
                                        <input
                                            type="password"
                                            value={currentPassword}
                                            onChange={(event) => setCurrentPassword(event.target.value)}
                                            className="form-input"
                                            autoComplete="current-password"
                                            required
                                        />
                                    </FormField>

                                    <FormField label="Ijambo ry'ibanga rishya">
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(event) => setNewPassword(event.target.value)}
                                            className="form-input"
                                            autoComplete="new-password"
                                            minLength={6}
                                            required
                                        />
                                    </FormField>
                                </div>

                                <FormField label="Emeza ijambo ry'ibanga rishya">
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(event) => setConfirmPassword(event.target.value)}
                                        className="form-input"
                                        autoComplete="new-password"
                                        minLength={6}
                                        required
                                    />
                                </FormField>

                                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setShowChangePassword(false)}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100 sm:w-auto"
                                    >
                                        Hagarika
                                    </button>
                                    <button
                                        type="submit"
                                        className="w-full rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-blue-700 sm:w-auto"
                                    >
                                        Hindura
                                    </button>
                                </div>
                            </form>
                        </section>
                    </div>
                )}

                {showChangeEmail && (
                    <div className="mx-auto w-full max-w-[1700px] px-3 sm:px-6 lg:px-8">
                        <section
                            id="panel-change-email"
                            className="mb-6 mt-4 flex max-h-[calc(100dvh-9rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                        >
                            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/60 px-5 py-4">
                                <div className="min-w-0">
                                    <h3 className="text-base font-black text-slate-900">
                                        Change Email
                                    </h3>
                                    <p className="mt-0.5 text-xs text-slate-400">
                                        Emeza ijambo ry'ibanga ririho mbere yo guhindura imeyili.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowChangeEmail(false)}
                                    className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                    aria-label="Hagarika"
                                >
                                    ✕
                                </button>
                            </div>

                            <form onSubmit={handleChangeEmail} className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 scrollbar-thin sm:p-6">
                                <FormField label="Imeyili mishya">
                                    <input
                                        type="email"
                                        value={newEmail}
                                        onChange={(event) => setNewEmail(event.target.value)}
                                        className="form-input"
                                        autoComplete="email"
                                        required
                                    />
                                </FormField>

                                <FormField label="Ijambo ry'ibanga ririho">
                                    <input
                                        type="password"
                                        value={currentPassword}
                                        onChange={(event) => setCurrentPassword(event.target.value)}
                                        className="form-input"
                                        autoComplete="current-password"
                                        required
                                    />
                                </FormField>

                                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setShowChangeEmail(false)}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100 sm:w-auto"
                                    >
                                        Hagarika
                                    </button>
                                    <button
                                        type="submit"
                                        className="w-full rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-blue-700 sm:w-auto"
                                    >
                                        Change Email
                                    </button>
                                </div>
                            </form>
                        </section>
                    </div>
                )}


                <main className="mx-auto w-full max-w-[1700px] px-3 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-7">


                    <section className="mb-5 grid grid-cols-2 gap-3 sm:mb-6 sm:grid-cols-3 lg:grid-cols-5">
                        <StatCard
                            label="Inkuru zose"
                            value={statistics.total}
                            icon="📰"
                            color="blue"
                        />

                        <StatCard
                            label="Zitegereje gusuzumwa"
                            value={statistics.pending}
                            icon="⏳"
                            color="amber"
                        />

                        <StatCard
                            label="Zemejwe"
                            value={statistics.approved}
                            icon="✓"
                            color="emerald"
                        />

                        <StatCard
                            label="Zanzwe"
                            value={statistics.rejected}
                            icon="✕"
                            color="red"
                        />

                        <StatCard
                            label="Ibigambi"
                            value={statistics.comments}
                            icon="💬"
                            color="purple"
                        />
                    </section>

                    <section className="mb-5 grid gap-4 md:grid-cols-2">
                        <button
                            type="button"
                            onClick={() => navigate("/admin/performance")}
                            className="group rounded-2xl border border-blue-200 bg-blue-50 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Imicungire</p>
                                    <h2 className="mt-1 text-lg font-black text-slate-900">📊 Imikorere y'Employees</h2>
                                    <p className="mt-1 text-sm text-slate-600">Reba imikorere y'abakozi n'abanditsi bakuru.</p>
                                </div>
                                <span className="shrink-0 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white">Reba Imikorere →</span>
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate("/admin/accounts")}
                            className="group rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">Imicungire</p>
                                    <h2 className="mt-1 text-lg font-black text-slate-900">👥 Konti n'Inkuru</h2>
                                    <p className="mt-1 text-sm text-slate-600">Genzura konti n'amateka yuzuye y'inkuru.</p>
                                </div>
                                <span className="shrink-0 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Fungura →</span>
                            </div>
                        </button>
                    </section>



                    {/* ---- ALL COMMENTS (every reader comment on every post) ---- */}
                    <section className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                        <button
                            type="button"
                            onClick={() => setShowAllComments((v) => !v)}
                            className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-slate-50 sm:px-5"
                        >
                            <div className="flex min-w-0 items-center gap-3">
                                <span
                                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${showAllComments
                                        ? "bg-blue-600 text-white"
                                        : "bg-blue-50 text-blue-600"
                                        }`}
                                >
                                    <MessageSquare className="h-5 w-5" />
                                </span>
                                <div className="min-w-0">
                                    <h2 className="truncate text-base font-black text-slate-900">
                                        Ibitekerezo byose
                                    </h2>
                                    <p className="mt-0.5 text-xs text-slate-400">
                                        Reba ibisobanuro by'abasomyi ku nkuru zose.
                                    </p>
                                </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
                                    {allComments.length}
                                </span>
                                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100">
                                    {showAllComments
                                        ? <EyeOff className="h-4 w-4" />
                                        : <Eye className="h-4 w-4" />}
                                </span>
                                <span className="hidden text-slate-400 sm:block">
                                    {showAllComments
                                        ? <ChevronDown className="h-4 w-4" />
                                        : <ChevronRight className="h-4 w-4" />}
                                </span>
                            </div>
                        </button>

                        {showAllComments && (
                            <div className="border-t border-slate-100 p-4 sm:p-5">

                                {commentsError && (
                                    <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                                        {commentsError}
                                    </p>
                                )}

                                {loadingComments ? (
                                    <p className="py-6 text-center text-sm text-slate-500">
                                        Birimo gutwara ibitekerezo...
                                    </p>
                                ) : allComments.length === 0 ? (
                                    <p className="py-6 text-center text-sm text-slate-500">
                                        Nta bitekerezo bihari.
                                    </p>
                                ) : (
                                    <div className="max-h-[480px] space-y-3 overflow-y-auto pr-1">

                                        {allComments.map((comment) => {

                                            const commentId = comment.id ?? comment.comment_id ?? comment._id;

                                            return (

                                                <div
                                                    key={commentId}
                                                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                                                >

                                                    <div className="flex items-start justify-between gap-3">

                                                        <div className="min-w-0">

                                                            <div className="flex flex-wrap items-center gap-2">

                                                                <span className="text-sm font-black text-slate-900">
                                                                    {comment.name || comment.user_name || comment.author || "Nturwaho"}
                                                                </span>

                                                                {comment.post_title && (
                                                                    <span className="truncate rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700">
                                                                        {comment.post_title}
                                                                    </span>
                                                                )}

                                                            </div>

                                                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                                                {comment.comment || comment.content || comment.text || ""}
                                                            </p>

                                                            {comment.created_at && (
                                                                <p className="mt-2 text-[11px] text-slate-400">
                                                                    {new Date(comment.created_at).toLocaleString()}
                                                                </p>
                                                            )}

                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteAllComment(commentId)}
                                                            className="flex-shrink-0 rounded-lg bg-red-50 px-2 py-1 text-[10px] font-black text-red-600 hover:bg-red-600 hover:text-white"
                                                        >
                                                            Gusiba
                                                        </button>

                                                    </div>

                                                </div>

                                            );
                                        })}

                                    </div>
                                )}
                            </div>
                        )}

                    </section>

                    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-6">


                        <section className="min-w-0">

                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                                <div className="flex flex-col gap-4">

                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="text-lg font-black text-slate-900">
                                                    Inkuru
                                                </h2>

                                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                                                    {filteredPosts.length}
                                                </span>
                                            </div>

                                            <p className="mt-1 text-xs text-slate-400">
                                                Suzuma kandi uyigenzure inkuru zatewe mu ubwanditsi.
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={exportPosts}
                                                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                                            >
                                                📥 Kuramo
                                            </button>

                                            <button
                                                onClick={() =>
                                                    setShowFilters(
                                                        (value) => !value
                                                    )
                                                }
                                                className={`
                                                    rounded-xl px-3 py-2
                                                    text-sm font-semibold
                                                    transition
                                                    ${showFilters
                                                        ? "bg-slate-900 text-white"
                                                        : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                                                    }
                                                `}
                                            >
                                                ⚙ Izuza
                                            </button>

                                            <div className="hidden overflow-hidden rounded-xl border border-slate-200 sm:flex">
                                                <button
                                                    onClick={() =>
                                                        setViewMode("grid")
                                                    }
                                                    className={`px-3 py-2 text-sm ${viewMode === "grid"
                                                        ? "bg-slate-900 text-white"
                                                        : "text-slate-500 hover:bg-slate-50"
                                                        }`}
                                                >
                                                    ▦
                                                </button>

                                                <button
                                                    onClick={() =>
                                                        setViewMode("list")
                                                    }
                                                    className={`px-3 py-2 text-sm ${viewMode === "list"
                                                        ? "bg-slate-900 text-white"
                                                        : "text-slate-500 hover:bg-slate-50"
                                                        }`}
                                                >
                                                    ☰
                                                </button>
                                            </div>
                                        </div>
                                    </div>


                                    <div className="flex min-w-0 flex-col gap-3 md:flex-row">
                                        <div className="relative min-w-0 flex-1">
                                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                                🔎
                                            </span>

                                            <input
                                                value={search}
                                                onChange={(e) =>
                                                    setSearch(e.target.value)
                                                }
                                                placeholder="Shakisha inkuru..."
                                                className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                                            />
                                        </div>

                                        <select
                                            value={sortBy}
                                            onChange={(e) =>
                                                setSortBy(e.target.value)
                                            }
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-blue-500 md:w-auto"
                                        >
                                            <option value="newest">
                                                Inyanya zikipiranya
                                            </option>

                                            <option value="oldest">
                                                Inyanya zizirizaga
                                            </option>

                                            <option value="title">
                                                Umutwe A-Z
                                            </option>
                                        </select>
                                    </div>


                                    {showFilters && (
                                        <div className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                                            <div className="min-w-0">
                                                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                                                    Ibyiciro
                                                </label>

                                                <select
                                                    value={
                                                        selectedDepartment
                                                    }
                                                    onChange={(e) =>
                                                        setSelectedDepartment(
                                                            e.target.value
                                                        )
                                                    }
                                                    className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                                                >
                                                    <option value="All">
                                                        Ibyiciro byose
                                                    </option>

                                                    {DEPARTMENTS.map(
                                                        (department) => (
                                                            <option
                                                                key={
                                                                    department.name
                                                                }
                                                                value={
                                                                    department.name
                                                                }
                                                            >
                                                                {
                                                                    department.icon
                                                                }{" "}
                                                                {
                                                                    department.name
                                                                }
                                                            </option>
                                                        )
                                                    )}
                                                </select>
                                            </div>

                                            <div className="min-w-0">
                                                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                                                    Imimerere
                                                </label>

                                                <select
                                                    value={selectedStatus}
                                                    onChange={(e) =>
                                                        setSelectedStatus(
                                                            e.target.value
                                                        )
                                                    }
                                                    className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                                                >
                                                    <option value="all">
                                                        Imimerere yose
                                                    </option>

                                                    <option value="pending">
                                                        Zitegereje gusuzumwa
                                                    </option>

                                                    <option value="approved">
                                                        Zemejwe
                                                    </option>

                                                    <option value="rejected">
                                                        Zanzwe
                                                    </option>
                                                </select>
                                            </div>
                                        </div>
                                    )}


                                    <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
                                        <StatusTab
                                            active={
                                                selectedStatus ===
                                                POST_STATUSES.PENDING
                                            }
                                            onClick={() =>
                                                setSelectedStatus(
                                                    POST_STATUSES.PENDING
                                                )
                                            }
                                            label="Zitegereje gusuzumwa"
                                            count={statistics.pending}
                                            color="amber"
                                        />

                                        <StatusTab
                                            active={
                                                selectedStatus ===
                                                POST_STATUSES.APPROVED
                                            }
                                            onClick={() =>
                                                setSelectedStatus(
                                                    POST_STATUSES.APPROVED
                                                )
                                            }
                                            label="Zemejwe"
                                            count={statistics.approved}
                                            color="emerald"
                                        />

                                        <StatusTab
                                            active={
                                                selectedStatus ===
                                                POST_STATUSES.REJECTED
                                            }
                                            onClick={() =>
                                                setSelectedStatus(
                                                    POST_STATUSES.REJECTED
                                                )
                                            }
                                            label="Zanzwe"
                                            count={statistics.rejected}
                                            color="red"
                                        />

                                        <StatusTab
                                            active={
                                                selectedStatus ===
                                                POST_STATUSES.ALL
                                            }
                                            onClick={() =>
                                                setSelectedStatus(
                                                    POST_STATUSES.ALL
                                                )
                                            }
                                            label="All"
                                            count={statistics.total}
                                            color="slate"
                                        />
                                    </div>


                                    <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                                        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    paginatedPosts.length > 0 &&
                                                    paginatedPosts.every(
                                                        (post) =>
                                                            selectedPosts.includes(
                                                                post.id
                                                            )
                                                    )
                                                }
                                                onChange={selectAllVisible}
                                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />

                                            <span>Toranya byose byatemuye</span>
                                        </label>

                                        {selectedPosts.length > 0 && (
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-xs font-semibold text-slate-500">
                                                    {selectedPosts.length}{" "}
                                                    zatoranyijwe
                                                </span>

                                                <button
                                                    onClick={
                                                        handleBulkApprove
                                                    }
                                                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                                                >
                                                    ✓ Emeza
                                                </button>

                                                <button
                                                    onClick={
                                                        handleBulkReject
                                                    }
                                                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
                                                >
                                                    ✕ Anga
                                                </button>

                                                <button
                                                    onClick={
                                                        handleBulkDelete
                                                    }
                                                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-600 hover:text-white"
                                                >
                                                    🗑 Siba
                                                </button>

                                                <button
                                                    onClick={clearSelection}
                                                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
                                                >
                                                    Siba
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>


                            {errorMessage && (
                                <div className="mt-4 flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
                                    <span>⚠ {errorMessage}</span>

                                    <button
                                        onClick={() => loadPosts()}
                                        className="self-start font-bold underline sm:self-auto"
                                    >
                                        Gerageza
                                    </button>
                                </div>
                            )}


                            <div
                                className={`
                                    mt-5 min-w-0
                                    ${viewMode === "grid"
                                        ? "grid gap-4 sm:grid-cols-2"
                                        : "space-y-3"
                                    }
                                `}
                            >
                                {loading ? (
                                    Array.from({ length: 4 }).map(
                                        (_, index) => (
                                            <PostSkeleton
                                                key={index}
                                                viewMode={viewMode}
                                            />
                                        )
                                    )
                                ) : paginatedPosts.length === 0 ? (
                                    <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center sm:px-6 sm:py-16">
                                        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
                                            📰
                                        </div>

                                        <h3 className="font-bold text-slate-800">
                                            Nta nkuru zabonetse
                                        </h3>

                                        <p className="mt-1 text-sm text-slate-500">
                                            Gerageza guhindura isango cyangwa usohore inkuru nshya.
                                        </p>

                                        <button
                                            onClick={() => {
                                                setSearch("");
                                                setSelectedDepartment("All");
                                                setSelectedStatus(
                                                    POST_STATUSES.ALL
                                                );
                                            }}
                                            className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                                        >
                                            Gushyira isango mu ntangiriro
                                        </button>
                                    </div>
                                ) : (
                                    paginatedPosts.map((post) => (
                                        <PostCard
                                            key={post.id}
                                            post={post}
                                            selected={selectedPosts.includes(
                                                post.id
                                            )}
                                            viewMode={viewMode}
                                            imageUrl={getImageUrl(
                                                post.image
                                            )}
                                            statusBadge={
                                                <StatusBadge post={post} />
                                            }
                                            onSelect={() =>
                                                togglePostSelection(post.id)
                                            }
                                            onApprove={() =>
                                                handleApprove(post)
                                            }
                                            onReject={() =>
                                                handleReject(post)
                                            }
                                            onPending={() =>
                                                handlePending(post)
                                            }
                                            onEdit={() => openEdit(post)}
                                            onDelete={() =>
                                                handleDelete(post)
                                            }
                                            onView={() =>
                                                handleViewPost(post)
                                            }
                                        />
                                    ))
                                )}
                            </div>


                            {filteredPosts.length > 0 && (
                                <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-xs text-slate-500">
                                        Kwerekana{" "}
                                        <strong>
                                            {(currentPage - 1) *
                                                PAGE_SIZE +
                                                1}
                                        </strong>{" "}
                                        -{" "}
                                        <strong>
                                            {Math.min(
                                                currentPage * PAGE_SIZE,
                                                filteredPosts.length
                                            )}
                                        </strong>{" "}
                                        muri{" "}
                                        <strong>
                                            {filteredPosts.length}
                                        </strong>
                                    </p>

                                    <div className="flex w-full items-center gap-2 sm:w-auto">
                                        <button
                                            disabled={currentPage === 1}
                                            onClick={() =>
                                                setCurrentPage((page) =>
                                                    Math.max(1, page - 1)
                                                )
                                            }
                                            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none sm:text-sm"
                                        >
                                            ← Ibanza
                                        </button>

                                        <span className="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white sm:text-sm">
                                            {currentPage} / {totalPages}
                                        </span>

                                        <button
                                            disabled={
                                                currentPage === totalPages
                                            }
                                            onClick={() =>
                                                setCurrentPage((page) =>
                                                    Math.min(
                                                        totalPages,
                                                        page + 1
                                                    )
                                                )
                                            }
                                            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none sm:text-sm"
                                        >
                                            Ikurikira →
                                        </button>
                                    </div>
                                </div>
                            )}
                        </section>



                        <aside className="min-w-0 space-y-5">

                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                                <div className="mb-4">
                                    <h3 className="font-black text-slate-900">
                                        Ibikorwa vyihutiraho
                                    </h3>

                                    <p className="mt-1 text-xs text-slate-400">
                                        Ibikorwa bisanzwe mu kigo
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <QuickAction
                                        icon="👤"
                                        label="Ongeraho umukozi"
                                        onClick={() =>
                                            onCreateEmployee
                                                ? quickAction(
                                                    onCreateEmployee,
                                                    "Kongera umukozi birabonetse."
                                                )
                                                : setShowCreateEmployee(
                                                    true
                                                )
                                        }
                                    />

                                    <QuickAction
                                        icon="🛡️"
                                        label="Ongeraho umwanditsi mukuru"
                                        onClick={() =>
                                            onCreateChiefEditor
                                                ? quickAction(
                                                    onCreateChiefEditor,
                                                    "Kongera umwanditsi mukuru birabonetse."
                                                )
                                                : setShowCreateChief(
                                                    true
                                                )
                                        }
                                    />

                                    <QuickAction
                                        icon="📢"
                                        label="Tangaza"
                                        onClick={() =>
                                            onPostAdvertisement
                                                ? quickAction(
                                                    onPostAdvertisement,
                                                    "Kongera itangazo birabonetse."
                                                )
                                                : setShowCreateAd(true)
                                        }
                                    />

                                    <QuickAction
                                        icon="📥"
                                        label="Reports"
                                        onClick={exportPosts}
                                    />
                                </div>
                            </div>


                            <AccountsPanel
                                employees={employees}
                                chiefEditors={chiefEditors}
                                advertisements={advertisements}
                                onEditEmployee={openEditEmployee}
                                onDeleteEmployee={handleDeleteEmployee}
                                onEditChief={openEditChief}
                                onDeleteChief={handleDeleteChief}
                                onEditAd={openEditAd}
                                onDeleteAd={handleDeleteAd}
                                onSendAd={handleSendAd}
                            />


                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                                <div className="mb-4 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="font-black text-slate-900">
                                            Ibikorwa
                                        </h3>

                                        <p className="mt-1 text-xs text-slate-400">
                                            Igihe gishya ku rubuga
                                        </p>
                                    </div>

                                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                                </div>

                                <div className="rounded-xl bg-slate-50 p-4">
                                    <p className="break-words text-sm font-medium text-slate-700">
                                        {statusMessage ||
                                            "Urubuga rushya neza."}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-400">
                                        Kuvugurura byarakora
                                    </p>
                                </div>
                            </div>


                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                                <div className="mb-4">
                                    <h3 className="font-black text-slate-900">
                                        Ibyiciro
                                    </h3>

                                    <p className="mt-1 text-xs text-slate-400">
                                        Imigabane y'inkuru
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {DEPARTMENTS.map((department) => {
                                        const count = posts.filter(
                                            (post) =>
                                                post.category ===
                                                department.name
                                        ).length;

                                        const percentage =
                                            statistics.total > 0
                                                ? Math.round(
                                                    (count /
                                                        statistics.total) *
                                                    100
                                                )
                                                : 0;

                                        return (
                                            <button
                                                key={department.name}
                                                onClick={() =>
                                                    setSelectedDepartment(
                                                        department.name
                                                    )
                                                }
                                                className="w-full min-w-0 text-left"
                                            >
                                                <div className="mb-1 flex min-w-0 items-center justify-between gap-3">
                                                    <span className="min-w-0 truncate text-xs font-semibold text-slate-600">
                                                        {department.icon}{" "}
                                                        {department.name}
                                                    </span>

                                                    <span className="shrink-0 text-xs font-bold text-slate-400">
                                                        {count}
                                                    </span>
                                                </div>

                                                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                                    <div
                                                        className="h-full rounded-full bg-blue-600 transition-all"
                                                        style={{
                                                            width: `${percentage}%`,
                                                        }}
                                                    />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                        </aside>
                    </div>
                </main>
            </div>



            {showCreateEmployee && (
                <section
                    id="panel-create-employee"
                    className="mb-6 scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                    <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/60 px-5 py-4">
                        <div className="min-w-0">
                            <h3 className="text-base font-black text-slate-900">
                                Ongeraho Umukozi
                            </h3>
                            <p className="mt-0.5 text-xs text-slate-400">
                                Kurema konti y'umwanditsi.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowCreateEmployee(false)}
                            className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            aria-label="Hagarika"
                        >
                            ✕
                        </button>
                    </div>

                    <form
                        onSubmit={(e) => { e.preventDefault(); handleCreateEmployee(); }}
                    >
                        <div className="space-y-3 p-5">
                            <input
                                value={empName}
                                onChange={(e) =>
                                    setEmpName(e.target.value)
                                }
                                placeholder="Izina ryuzuye"
                                className="form-input"
                            />

                            <input
                                value={empEmail}
                                onChange={(e) =>
                                    setEmpEmail(e.target.value)
                                }
                                placeholder="Imeyili"
                                type="email"
                                className="form-input"
                            />

                            <input
                                value={empPhone}
                                onChange={(e) =>
                                    setEmpPhone(e.target.value)
                                }
                                placeholder="Telefoni (byibuze)"
                                className="form-input"
                            />

                            <input
                                value={empPassword}
                                onChange={(e) =>
                                    setEmpPassword(e.target.value)
                                }
                                placeholder="Ijambo ry'ibanga"
                                type="password"
                                className="form-input"
                            />
                        </div>
                        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 p-5 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setShowCreateEmployee(false)}
                                className="w-full rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100 sm:w-auto"
                            >
                                Hagarika
                            </button>
                            <button
                                type="submit"
                                className="w-full rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-700 sm:w-auto"
                            >
                                Kurema
                            </button>
                        </div>
                    </form>
                </section>
            )}



            {showCreateChief && (
                <ModalShell
                    onClose={() => setShowCreateChief(false)}
                    maxWidth="max-w-md"
                >
                    <ModalHeader
                        title="Ongeraho Umwanditsi Mukuru"
                        description="Kurema konti y'umwanditsi mukuru."
                        onClose={() => setShowCreateChief(false)}
                    />

                    <form
                        onSubmit={(e) => { e.preventDefault(); handleCreateChief(); }}
                        className="flex min-h-0 flex-1 flex-col"
                    >
                        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
                            <input
                                value={chiefName}
                                onChange={(e) =>
                                    setChiefName(e.target.value)
                                }
                                placeholder="Izina ryuzuye"
                                className="form-input"
                            />

                            <input
                                value={chiefEmail}
                                onChange={(e) =>
                                    setChiefEmail(e.target.value)
                                }
                                placeholder="Imeyili"
                                type="email"
                                className="form-input"
                            />

                            <input
                                value={chiefPhone}
                                onChange={(e) =>
                                    setChiefPhone(e.target.value)
                                }
                                placeholder="Telefoni (byibuze)"
                                className="form-input"
                            />

                            <input
                                value={chiefPassword}
                                onChange={(e) =>
                                    setChiefPassword(e.target.value)
                                }
                                placeholder="Ijambo ry'ibanga"
                                type="password"
                                className="form-input"
                            />
                        </div>

                        <ModalFooter
                            onCancel={() => setShowCreateChief(false)}
                            confirmText="Kurema"
                            confirmClass="bg-indigo-600 hover:bg-indigo-700"
                            confirmType="submit"
                        />
                    </form>
                </ModalShell>
            )}



            {editingPostId && editInitial && (
                <ArticleEditor
                    key={`edit-${editingPostId}`}
                    initial={editInitial}
                    categories={DEPARTMENTS}
                    submitLabel="Vugurura inkuru"
                    saving={editSaving}
                    onSubmit={handleSubmitEdit}
                    onCancel={closeEdit}
                />
            )}

            {selectedPost && (
                <PostDetailModal
                    post={selectedPost}
                    loadingComments={loadingPostComments}
                    onClose={handleClosePostDetail}
                    onStatusChange={handleStatusChangeFromDetail}
                    onDeleteComment={handleDeletePostComment}
                    getImageUrl={getImageUrl}
                    getStatus={normalizeStatus}
                    formatDate={(post) => {
                        const date = post.createdDate || post.created_at || post.createdAt;
                        if (!date) return "Nta itariki";
                        try { return new Date(date).toLocaleString(); } catch { return String(date); }
                    }}
                    saving={editSaving}
                />
            )}

        </DashboardLayout>
    );
};





const AccountsPanel = ({
    employees,
    chiefEditors,
    advertisements,
    onEditEmployee,
    onDeleteEmployee,
    onEditChief,
    onDeleteChief,
    onEditAd,
    onDeleteAd,
    onSendAd,
}) => {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4">
                <h3 className="font-black text-slate-900">
                    Amakonti n'Ibyangamwa
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                    Amakuru agezweho y'ubushakashatsi
                </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">

                <AccountSection
                    title="Employees"
                    count={employees.length}
                    items={employees}
                    emptyText="Nta baakozi bihari"
                    onEdit={onEditEmployee}
                    onDelete={onDeleteEmployee}
                    renderItem={(item) => (
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-700">{item.full_name || item.name || item.email}</p>
                            <p className="truncate text-xs text-slate-400">{item.email}</p>
                        </div>
                    )}
                />


                <AccountSection
                    title="Chief Editors"
                    count={chiefEditors.length}
                    items={chiefEditors}
                    emptyText="Nta banditsi bakuru bihari"
                    onEdit={onEditChief}
                    onDelete={onDeleteChief}
                    renderItem={(item) => (
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-700">{item.full_name || item.name || item.email}</p>
                            <p className="truncate text-xs text-slate-400">{item.email}</p>
                        </div>
                    )}
                />


                <AccountSection
                    title="Ibyangamwa"
                    count={advertisements.length}
                    items={advertisements}
                    emptyText="Nta vyangamwa bihari"
                    onEdit={onEditAd}
                    onDelete={onDeleteAd}
                    onSend={onSendAd}
                    renderItem={(item) => (
                        <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-3">
                                {item.image ? (
                                    <OptimizedImage src={item.image} alt={item.title || 'ad'} widths={RESOLUTION_WIDTHS.THUMB} sizes="80px" loading="lazy" className="h-12 w-12 flex-none rounded-md object-cover sm:h-14 sm:w-14 md:h-20 md:w-20" />
                                ) : (
                                    <div className="h-12 w-12 flex-none rounded-md bg-slate-200 text-xs text-slate-500 flex items-center justify-center sm:h-14 sm:w-14 md:h-20 md:w-20">Nta
                                        ifoto</div>
                                )}

                                <div className="min-w-0">
                                    <p className="truncate text-sm sm:text-base md:text-lg font-semibold text-slate-700">{item.title || item.name || 'Nta mutwe'}</p>
                                    <p className="mt-0.5 truncate text-xs sm:text-sm text-slate-400">{item.description || item.summary || ''}</p>

                                    {item.link || item.target_url ? (
                                        <a href={item.link || item.target_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] font-medium text-indigo-600 hover:underline">Fungura</a>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    )}
                />
            </div>
        </div>
    );
};

const AccountSection = ({
    title,
    count,
    items,
    emptyText,
    renderItem,
    onEdit,
    onDelete,
    onSend,
}) => {
    return (
        <div className="min-w-0">
            <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-600">{title}</span>

                <span className="shrink-0 text-xs text-slate-400">{count}</span>
            </div>

            <div className="max-h-56 md:max-h-96 overflow-y-auto pr-1">
                <ul className="space-y-2">
                    {items.length === 0 ? (
                        <li className="rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-400">{emptyText}</li>
                    ) : (
                        items.map((item) => (
                            <li key={item.id} className="flex min-w-0 items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 sm:px-4 sm:py-3">
                                {renderItem(item)}

                                {(onEdit || onDelete || onSend) && (
                                    <div className="ml-3 flex items-center gap-2">
                                        {onSend && <button onClick={() => onSend(item)} className="text-sm sm:text-xs text-emerald-600 hover:underline">Ohora</button>}
                                        {onEdit && <button onClick={() => onEdit(item)} className="text-sm sm:text-xs text-blue-600 hover:underline">Hindura</button>}
                                        {onDelete && <button onClick={() => onDelete(item.id)} className="text-sm sm:text-xs text-red-600 hover:underline">Siba</button>}
                                    </div>
                                )}
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    );
};





const StatusBadge = ({ post }) => {
    const status = String(
        post?.status ||
        post?.approval_status ||
        post?.publication_status ||
        "pending"
    ).toLowerCase();

    if (status === "approved") {
        return (
            <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 shadow-sm sm:text-xs">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                Yemewe
            </span>
        );
    }

    if (status === "rejected") {
        return (
            <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-700 shadow-sm sm:text-xs">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                Yanzwe
            </span>
        );
    }

    return (
        <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700 shadow-sm sm:text-xs">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
            Irimo gusuzumwa
        </span>
    );
};





const StatCard = ({ label, value, icon, color }) => {
    const colors = {
        blue: "bg-blue-50 text-blue-600",
        amber: "bg-amber-50 text-amber-600",
        emerald: "bg-emerald-50 text-emerald-600",
        red: "bg-red-50 text-red-600",
        purple: "bg-purple-50 text-purple-600",
    };

    return (
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
            <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-base sm:h-10 sm:w-10 sm:text-lg ${colors[color]}`}
            >
                {icon}
            </div>

            <p className="mt-3 truncate text-[10px] font-semibold text-slate-400 sm:mt-4 sm:text-xs">
                {label}
            </p>

            <p className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
                {Number(value || 0).toLocaleString()}
            </p>
        </div>
    );
};





const StatusTab = ({
    active,
    onClick,
    label,
    count,
    color,
}) => {
    const activeColors = {
        amber: "bg-amber-500 text-white",
        emerald: "bg-emerald-600 text-white",
        red: "bg-red-600 text-white",
        slate: "bg-slate-900 text-white",
    };

    return (
        <button
            onClick={onClick}
            className={`
                flex shrink-0 items-center gap-2 rounded-xl
                px-3 py-2 text-xs font-bold transition
                ${active
                    ? activeColors[color]
                    : "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                }
            `}
        >
            {label}

            <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-white/20" : "bg-slate-100"
                    }`}
            >
                {count}
            </span>
        </button>
    );
};





const QuickAction = ({ icon, label, onClick }) => {
    return (
        <button
            onClick={onClick}
            className="flex w-full min-w-0 items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-blue-100 hover:bg-blue-50 hover:text-blue-700 sm:px-4"
        >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                {icon}
            </span>

            <span className="min-w-0 flex-1 truncate">
                {label}
            </span>

            <span className="shrink-0 text-slate-300">→</span>
        </button>
    );
};





const PostCard = ({
    post,
    selected,
    viewMode,
    imageUrl,
    statusBadge,
    onSelect,
    onApprove,
    onReject,
    onPending,
    onEdit,
    onDelete,
    onView,
}) => {
    const status = String(
        post?.status ||
        post?.approval_status ||
        post?.publication_status ||
        "pending"
    ).toLowerCase();

    const isList = viewMode === "list";

    return (
        <article
            className={`
                group min-w-0 overflow-hidden rounded-2xl
                border bg-white shadow-sm transition
                hover:-translate-y-0.5 hover:shadow-lg
                ${selected
                    ? "border-blue-500 ring-2 ring-blue-500/10"
                    : "border-slate-200"
                }
                ${isList ? "sm:flex" : ""}
            `}
        >

            <div
                className={`
                    relative shrink-0 overflow-hidden bg-slate-100
                    ${isList
                        ? "h-48 w-full sm:h-auto sm:w-52 lg:w-60"
                        : "h-48 sm:h-52"
                    }
                `}
            >
                {imageUrl ? (
                    <OptimizedImage
                        src={imageUrl}
                        alt={post.title || "Story"}
                        widths={RESOLUTION_WIDTHS.CARD}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center text-4xl text-slate-300">
                        📰
                    </div>
                )}


                <div className="absolute left-3 top-3">
                    <label
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-white/95 shadow-lg backdrop-blur"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <input
                            type="checkbox"
                            checked={selected}
                            onChange={onSelect}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600"
                        />
                    </label>
                </div>


                <div className="absolute right-3 top-3 max-w-[45%]">
                    {statusBadge}
                </div>
            </div>


            <div className="flex min-w-0 flex-1 flex-col p-4">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="max-w-full truncate rounded-md bg-blue-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-blue-700 sm:text-[10px]">
                        {post.category || "Amakuru"}
                    </span>

                    {isAmakuruCategory(post.category) && post.amakuru_department && (
                        <span className="max-w-full truncate rounded-md bg-red-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-red-700 sm:text-[10px]">
                            {post.amakuru_department}
                        </span>
                    )}

                    {post.priority && (
                        <span className="shrink-0 rounded-md bg-red-50 px-2 py-1 text-[9px] font-bold uppercase text-red-600 sm:text-[10px]">
                            Igihitamwo
                        </span>
                    )}
                </div>

                <h3 className="mt-3 line-clamp-2 break-words text-base font-black leading-6 text-slate-900">
                    {post.title || "Inkuru itagira umutwe"}
                </h3>

                <p className="mt-2 line-clamp-3 break-words text-sm leading-6 text-slate-500">
                    {post.description || "Nta bisobanuro bihari."}
                </p>

                <div className="mt-4 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-400">
                    <span className="shrink-0">
                        📅{" "}
                        {post.createdDate
                            ? new Date(
                                post.createdDate
                            ).toLocaleDateString()
                            : "Nta itariki"}
                    </span>

                    <span className="shrink-0">
                        💬 {post.comments?.length || 0}
                    </span>

                    {post.author && (
                        <AuthorProfileTrigger
                            author={typeof post.author === "object" ? post.author : {
                                name: post.author,
                                role: post.author_role || post.role || "unknown",
                            }}
                            className="max-w-full"
                        >
                            <span className="block max-w-full truncate">
                                ✍{" "}
                                {post.author.name || post.author}
                            </span>
                        </AuthorProfileTrigger>
                    )}
                </div>


                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    <ActionButton
                        onClick={onView}
                        className="bg-slate-900 text-white hover:bg-blue-700"
                    >
                        👁 Reba
                    </ActionButton>

                    <ActionButton
                        onClick={onEdit}
                        className="border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    >
                        ✎ Hindura
                    </ActionButton>

                    {status !== "approved" && (
                        <ActionButton
                            onClick={onApprove}
                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                            ✓ Emeka
                        </ActionButton>
                    )}

                    {status !== "rejected" && (
                        <ActionButton
                            onClick={onReject}
                            className="bg-red-600 text-white hover:bg-red-700"
                        >
                            ✕ Anga
                        </ActionButton>
                    )}

                    {status !== "pending" && (
                        <ActionButton
                            onClick={onPending}
                            className="bg-amber-500 text-white hover:bg-amber-600"
                        >
                            ↻ Gusuzumwa
                        </ActionButton>
                    )}

                    <ActionButton
                        onClick={onDelete}
                        className="border border-red-100 bg-red-50 text-red-600 hover:bg-red-100"
                    >
                        🗑 Siba
                    </ActionButton>
                </div>
            </div>
        </article>
    );
};

const ActionButton = ({ children, onClick, className }) => {
    return (
        <button
            onClick={onClick}
            className={`rounded-lg px-3 py-2 text-xs font-bold transition ${className}`}
        >
            {children}
        </button>
    );
};





const PostSkeleton = ({ viewMode }) => {
    return (
        <div
            className={`
                overflow-hidden rounded-2xl
                border border-slate-200 bg-white
                ${viewMode === "list" ? "sm:flex" : ""}
            `}
        >
            <div
                className={`
                    animate-pulse bg-slate-200
                    ${viewMode === "list"
                        ? "h-48 w-full sm:h-auto sm:w-52"
                        : "h-48 sm:h-52"
                    }
                `}
            />

            <div className="min-w-0 flex-1 space-y-3 p-4">
                <div className="h-5 w-24 animate-pulse rounded bg-slate-200" />

                <div className="h-5 w-4/5 animate-pulse rounded bg-slate-200" />

                <div className="h-4 w-full animate-pulse rounded bg-slate-100" />

                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />

                <div className="flex flex-wrap gap-2 pt-3">
                    <div className="h-8 w-20 animate-pulse rounded bg-slate-200" />
                    <div className="h-8 w-20 animate-pulse rounded bg-slate-200" />
                </div>
            </div>
        </div>
    );
};





const ModalShell = ({
    children,
    onClose,
    maxWidth = "max-w-md",
}) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
            <div
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
                onClick={onClose}
            />

            <div
                className={`
                    relative z-10 flex max-h-[calc(100dvh-1rem)]
                    w-full ${maxWidth}
                    flex-col overflow-y-auto
                    rounded-2xl bg-white shadow-2xl
                    sm:max-h-[85vh]
                `}
            >
                {children}
            </div>
        </div>
    );
};




const ModalHeader = ({
    title,
    description,
    onClose,
}) => {
    return (
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 bg-white px-4 py-4 sm:px-6">
            <div className="min-w-0">
                <h3 className="truncate text-lg font-black text-slate-900">
                    {title}
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                    {description}
                </p>
            </div>

            <button
                onClick={onClose}
                className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Hagarika"
            >
                ✕
            </button>
        </div>
    );
};




const InlinePanel = ({
    id,
    title,
    description,
    onClose,
    children,
}) => {
    return (
        <section
            id={id}
            className="mb-8 scroll-mt-24 flex max-h-[calc(100dvh-9rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50"
        >
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/40 px-5 py-4 sm:px-7">
                <div className="min-w-0">
                    <h3 className="text-lg font-black text-slate-900">
                        {title}
                    </h3>

                    {description && (
                        <p className="mt-0.5 text-sm text-slate-500">
                            {description}
                        </p>
                    )}
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-800"
                >
                    ✕ Fungura
                </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
                {children}
            </div>
        </section>
    );
};




const ModalFooter = ({
    onCancel,
    onConfirm,
    confirmText,
    confirmClass = "bg-blue-600 hover:bg-blue-700",
    confirmType = "button",
}) => {
    return (
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 p-4 sm:flex-row sm:justify-end sm:p-5">
            <button
                type="button"
                onClick={onCancel}
                className="w-full rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100 sm:w-auto"
            >
                Hagarika
            </button>

            <button
                type={confirmType}
                onClick={confirmType === "submit" ? undefined : onConfirm}
                className={`w-full rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-lg transition sm:w-auto ${confirmClass}`}
            >
                {confirmText}
            </button>
        </div>
    );
};





const FormField = ({ label, children }) => {
    return (
        <div className="min-w-0">
            <label className="mb-2 block text-sm font-bold text-slate-700">
                {label}
            </label>

            {children}
        </div>
    );
};





const AdPreview = ({
    image,
    title,
    description,
    targetUrl,
}) => {
    const [previewUrl, setPreviewUrl] = useState("");

    useEffect(() => {
        if (!image) {
            setPreviewUrl("");
            return;
        }

        const url = URL.createObjectURL(image);
        setPreviewUrl(url);

        return () => {
            URL.revokeObjectURL(url);
        };
    }, [image]);

    return (
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 sm:p-4">
            <p className="mb-3 text-xs font-bold text-slate-700">
                Iherezo ry'itangazo
            </p>

            <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
                {previewUrl ? (
                    <OptimizedImage
                        src={previewUrl}
                        alt="Iherezo ry'itangazo"
                        widths={RESOLUTION_WIDTHS.THUMB}
                        sizes="80px"
                        loading="lazy"
                        className="h-20 w-full shrink-0 rounded-lg object-cover sm:w-20"
                    />
                ) : (
                    <div className="flex h-20 w-full shrink-0 items-center justify-center rounded-lg bg-slate-200 text-xs text-slate-500 sm:w-20">
                        Nta ifoto
                    </div>
                )}

                <div className="min-w-0 flex-1">
                    <div className="break-words text-sm font-bold text-slate-900">
                        {title || "Umutwe"}
                    </div>

                    <div className="mt-1 break-words text-xs leading-5 text-slate-600">
                        {description || "Ibisobanuro"}
                    </div>

                    {targetUrl && (
                        <div className="mt-1 break-all text-xs text-indigo-600">
                            {targetUrl}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const PostDetailModal = ({
    post,
    loadingComments,
    onClose,
    onStatusChange,
    onDeleteComment,
    getImageUrl,
    getStatus,
    formatDate,
    saving,
}) => {
    if (!post) return null;

    const status = getStatus(post);
    const postId = post.id || post._id;
    const imageUrl = getImageUrl(post.image);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-sm font-bold text-white shadow-sm">
                            RT
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                                Isuzuma ry'inkuru
                            </p>
                            <p className="text-xs text-slate-400">
                                Umuyobozi
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-lg font-black text-slate-700 hover:bg-red-100 hover:text-red-600"
                    >
                        ×
                    </button>
                </div>

                <div className="p-5 sm:p-7">
                    <div className="mb-5 flex flex-wrap items-center gap-3">
                        <StatusBadge post={post} />
                        <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">
                            {post.category || "Amakuru"}
                        </span>

                        {isAmakuruCategory(post.category) && post.amakuru_department && (
                            <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-black text-red-700">
                                {post.amakuru_department}
                            </span>
                        )}
                    </div>

                    <h2 className="text-2xl font-black leading-tight text-slate-900 sm:text-4xl">
                        {post.title || "Inkuru itagira umutwe"}
                    </h2>

                    <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-slate-400">
                        <span>
                            Wanditse:{" "}
                            <strong className="text-slate-700">
                                {post.Author || post.author || post.author_name || "Umukozi"}
                            </strong>
                        </span>
                        <span>{formatDate(post)}</span>
                    </div>

                    {imageUrl && (
                        <OptimizedImage
                            src={imageUrl}
                            alt={post.title}
                            widths={RESOLUTION_WIDTHS.GALLERY}
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 800px"
                            loading="lazy"
                            className="mt-6 max-h-[500px] w-full rounded-2xl object-cover"
                        />
                    )}

                    <div className="mt-6 whitespace-pre-wrap text-base leading-8 text-slate-700">
                        {post.description || post.content || "Nta bisobanuro bihari."}
                    </div>

                    {collectYoutubeUrls(post).length > 0 && (
                        <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                                YouTube
                            </p>
                            <YouTubeEmbeds
                                urls={collectYoutubeUrls(post)}
                                title={post.title || "YouTube video"}
                                className="mt-3"
                            />
                            <div className="mt-3 space-y-1">
                                {collectYoutubeUrls(post).map((url, index) => (
                                    <a
                                        key={`yt-link-${index}`}
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block break-all text-sm font-bold text-blue-600 hover:underline"
                                    >
                                        {url}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                            Izina ry'ubusobanuro
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            Inkuru zemerewe zizerekanwa ku rubuga rishingiye.
                        </p>

                        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                            {status === "pending" && (
                                <>
                                    <button
                                        onClick={() => onStatusChange(postId, "approved")}
                                        disabled={saving}
                                        className="flex-1 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                                    >
                                        ✓ Emeka kandi utangaze
                                    </button>
                                    <button
                                        onClick={() => onStatusChange(postId, "rejected")}
                                        disabled={saving}
                                        className="flex-1 rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-700 disabled:opacity-50"
                                    >
                                        ✕ Anga inkuru
                                    </button>
                                </>
                            )}

                            {status === "rejected" && (
                                <button
                                    onClick={() => onStatusChange(postId, "pending")}
                                    disabled={saving}
                                    className="w-full rounded-xl bg-amber-500 px-5 py-3 text-sm font-black text-white hover:bg-amber-600 disabled:opacity-50"
                                >
                                    ↻ Subiza gusuzumwa
                                </button>
                            )}

                            {status === "approved" && (
                                <button
                                    onClick={() => onStatusChange(postId, "pending")}
                                    disabled={saving}
                                    className="w-full rounded-xl bg-amber-500 px-5 py-3 text-sm font-black text-white hover:bg-amber-600 disabled:opacity-50"
                                >
                                    ↻ Subiza gusuzumwa
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="mt-8">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                                    Ibitekerezo
                                </p>
                                <h3 className="mt-1 text-lg font-black text-slate-900">
                                    Ibitekerezo by'abasomi
                                </h3>
                            </div>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                                {Array.isArray(post.comments) ? post.comments.length : 0}
                            </span>
                        </div>

                        {loadingComments ? (
                            <p className="py-6 text-center text-sm text-slate-500">
                                Birimo gutwara ibitekerezo...
                            </p>
                        ) : Array.isArray(post.comments) && post.comments.length > 0 ? (
                            <div className="space-y-3">
                                {post.comments.map((comment, index) => {
                                    const commentId = comment.id || comment.comment_id || comment._id;
                                    return (
                                        <div
                                            key={commentId || index}
                                            className="rounded-2xl border border-slate-200 bg-white p-4"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-black text-slate-900">
                                                        {comment.name || comment.user_name || comment.author || "Anonymous"}
                                                    </p>
                                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                                        {comment.comment || comment.content || comment.text || ""}
                                                    </p>
                                                </div>
                                                {commentId && (
                                                    <button
                                                        onClick={() => onDeleteComment(commentId)}
                                                        className="shrink-0 rounded-lg bg-red-50 px-3 py-2 text-[10px] font-black text-red-600 hover:bg-red-600 hover:text-white"
                                                    >
                                                        Siba
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-semibold text-slate-400">
                                Nta bitekerezo bihari kuri iyi nkuru.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
