/**
 * Shared admin navigation sections for the Rubavu Today admin area.
 * Used across all dedicated admin pages so the sidebar behaves identically.
 */
export const ADMIN_NAV_SECTIONS = [
    {
        label: "MAIN",
        items: [
            { icon: <span>▦</span>, label: "Dashboard", path: "/admin/dashboard" },
        ],
    },
    {
        label: "ARTICLES",
        items: [
            { icon: <span>⏳</span>, label: "Pending Review", path: "/admin/posts/pending" },
            { icon: <span>✓</span>, label: "Published Articles", path: "/admin/posts/published" },
            { icon: <span>✕</span>, label: "Rejected", path: "/admin/posts/rejected" },
        ],
    },
    {
        label: "MANAGEMENT",
        items: [
            { icon: <span>👤</span>, label: "Employees", path: "/admin/employees" },
            { icon: <span>🛡️</span>, label: "Chief Editors", path: "/admin/chief-editors" },
            { icon: <span>👥</span>, label: "Accounts & Articles", path: "/admin/accounts" },
            { icon: <span>📊</span>, label: "Employee Performance", path: "/admin/performance" },
        ],
    },
    {
        label: "OTHERS",
        items: [
            { icon: <span>🎙️</span>, label: "Radio", path: "/admin/radio" },
            { icon: <span>📢</span>, label: "Kwamamaza", path: "/admin/advertisements" },
            { icon: <span>📥</span>, label: "Reports", path: "/admin/reports" },
            { icon: <span>🧹</span>, label: "Text Cleaner", path: "/admin/text-cleaner" },
            { icon: <span>🔑</span>, label: "Change Password", path: "/admin/change-password" },
            { icon: <span>✉️</span>, label: "Change Email", path: "/admin/change-email" },
        ],
    },
];
