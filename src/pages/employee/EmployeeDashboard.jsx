import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Newspaper,
  PenSquare,
  TrendingUp,
  XCircle,
} from "lucide-react";
import {
  getMyPosts,
  getNotifications,
} from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";
import {
  EmployeeStatCard,
  EmployeeStatusBadge,
  CardSkeleton,
  Skeleton,
} from "../../components/employee/EmployeeUI";
import { DailyTaskCard, WeeklyPerformance } from "../../components/dashboard";
import {
  DEPARTMENTS,
  DEPARTMENT_COLORS,
  DEPARTMENT_ICONS,
  getStatus,
  getCategory,
  getPostId,
  formatDate,
} from "./employeeHelpers";

const STATUS_META = {
  draft: { accent: "slate", icon: FileText, label: "Drafts", valueKey: "draft" },
  pending: { accent: "amber", icon: Clock, label: "Pending", valueKey: "pending" },
  approved: { accent: "blue", icon: CheckCircle2, label: "Approved / Zisohowe", valueKey: "approved" },
  rejected: { accent: "red", icon: XCircle, label: "Zanzwe", valueKey: "rejected" },
};

function Dashboard({ onLogout }) {
  const { user } = useAuth();
  const { refresh } = useNotifications();

  const [posts, setPosts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifLoading, setNotifLoading] = useState(true);
  const [showAccessHelp, setShowAccessHelp] = useState(false);

  const loadPosts = useCallback(async () => {
    try {
      const data = await getMyPosts();
      setPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifications(Array.isArray(data) ? data : []);
      refresh();
    } catch (err) {
      setNotifications([]);
    } finally {
      setNotifLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    Promise.all([loadPosts(), loadNotifications()]);
  }, [loadPosts, loadNotifications]);

  const userName = user?.full_name || user?.name || user?.email || "Umukozi";
  const userInitial = String(userName).charAt(0).toUpperCase();

  const todayLabel = new Date().toLocaleDateString("rw-RW", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const counts = {
    draft: posts.filter((p) => getStatus(p) === "draft").length,
    pending: posts.filter((p) => getStatus(p) === "pending").length,
    approved: posts.filter((p) => getStatus(p) === "approved").length,
    rejected: posts.filter((p) => getStatus(p) === "rejected").length,
  };

  const total = posts.length;
  const submissionTotal = counts.pending + counts.approved + counts.rejected;
  const approvalRate = submissionTotal > 0 ? Math.round((counts.approved / submissionTotal) * 100) : 0;
  const totalViews = posts.reduce((sum, post) => sum + (Number(post.views) || 0), 0);

  const departmentStats = DEPARTMENTS.map((dep) => ({
    department: dep,
    count: posts.filter((p) => getCategory(p) === dep).length,
  }));
  const maxDepartment = Math.max(1, ...departmentStats.map((d) => d.count));

  const recentPosts = [...posts]
    .sort((a, b) => (b.createdDate || "").localeCompare(a.createdDate || ""))
    .slice(0, 5);

  const recentNotifications = notifications.slice(0, 3);
  const permissionSummary = {
    view_all_posts: "View all posts",
    edit_post_text: "Edit text",
    edit_post_image: "Edit image",
    delete_own_pending_post: "Delete own pending",
    edit_own_posts: "Edit own posts",
    approve_posts: "Approve",
    reject_posts: "Reject",
    edit_any_post: "Edit any post",
    delete_any_post: "Delete any post",
    publish_approve_posts: "Publish",
    manage_images: "Manage images",
  };

  const rawPermissions = user?.permissions || {};
  const permissionEntries = Array.isArray(rawPermissions)
    ? rawPermissions.map((key) => [key, true])
    : Object.entries(rawPermissions);

  const activePermissions = permissionEntries
    .filter(([key, enabled]) => {
      if (typeof enabled === "boolean") {
        return enabled;
      }

      if (Array.isArray(enabled)) {
        return enabled.length > 0;
      }

      return Boolean(enabled) || Boolean(key);
    })
    .map(([key]) => ({
      key,
      label: permissionSummary[key] || key,
      to: key === "view_all_posts" ? "/employee/workspace?permission=view_all_posts" : "/employee/workspace?permission=" + encodeURIComponent(key),
    }));

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-800 p-6 text-white shadow-lg sm:p-8">
        <div className="absolute -right-10 -top-10 h-52 w-52 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-xl font-black backdrop-blur-sm">
              {userInitial}
            </div>
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-200">{todayLabel}</p>
              <h1 className="text-2xl font-black sm:text-3xl">Muraho, {userName}! 👋</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link
              to="/employee/create"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 shadow-md transition duration-200 hover:-translate-y-0.5 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-white/80"
            >
              <PenSquare className="h-4 w-4" />
              Work Inkuru
            </Link>
            <Link
              to="/employee/articles"
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
            >
              <FileText className="h-4 w-4" />
              My Articles
            </Link>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-violet-300/40 bg-gradient-to-r from-violet-950 via-fuchsia-950 to-rose-900 p-5 text-white shadow-[0_20px_45px_rgba(168,85,247,0.35)]">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-200">Access overview</p>
            <h2 className="mt-1 text-xl font-black text-white">Your current access</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAccessHelp((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl border border-violet-200/30 bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white transition duration-200 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-violet-300"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              Help
            </button>
            <span className="rounded-full border border-rose-200/30 bg-rose-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-rose-100">
              {activePermissions.length} permissions
            </span>
          </div>
        </div>

        {showAccessHelp && (
          <div className="mb-4 rounded-2xl border border-violet-200/30 bg-white/10 p-3 text-sm text-violet-50 shadow-inner backdrop-blur-sm">
            <p className="font-semibold text-white">Permission help</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-violet-100">
              <li>View all posts lets you see the full website article list when the admin grants it.</li>
              <li>Other permissions control editing, deleting, approving, and publishing your posts.</li>
              <li>If you do not see a permission, ask your admin to enable it for your account.</li>
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2.5">
          {activePermissions.length === 0 ? (
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-slate-200">No employee permissions assigned yet.</span>
          ) : (
            activePermissions.map(({ key, label, to }) => (
              <Link
                key={key}
                to={to}
                className="inline-flex items-center gap-2 rounded-full border border-fuchsia-200/50 bg-gradient-to-r from-violet-500/30 via-fuchsia-500/25 to-rose-500/30 px-3 py-1.5 text-xs font-bold text-white shadow-sm ring-1 ring-inset ring-white/10 transition duration-200 hover:scale-[1.02] hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-violet-300"
              >
                {label}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ))
          )}
        </div>
      </section>

      <DailyTaskCard writePath="/employee/create" />

      <WeeklyPerformance />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <EmployeeStatCard
            label="Inkuru zose"
            value={total}
            icon={<Newspaper className="h-5 w-5" />}
            accent="blue"
            hint={`${totalViews.toLocaleString()} views zose`}
          />
          <EmployeeStatCard
            label="Drafts"
            value={counts.draft}
            icon={<FileText className="h-5 w-5" />}
            accent="slate"
            hint="Uzikoramo ukira"
          />
          <EmployeeStatCard
            label="Pending gusuzumwa"
            value={counts.pending}
            icon={<Clock className="h-5 w-5" />}
            accent="amber"
            hint="Chief Editor azi'i urugero gusuzuma"
          />
          <EmployeeStatCard
            label="Approval rate"
            value={`${approvalRate}%`}
            icon={<TrendingUp className="h-5 w-5" />}
            accent="emerald"
            hint={`${counts.approved} zemejwe, ${counts.rejected} zanzwe`}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Ibikorwa biheruka</h2>
              <p className="text-xs text-slate-500">Inkuru 5 za nyuma z'ubwanditsi bwawe</p>
            </div>
            <Link to="/employee/articles" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 transition hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200">
              Reba zose <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : recentPosts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
              <p className="text-2xl">📝</p>
              <h3 className="mt-3 text-base font-semibold text-slate-700">Urahano inkuru zawe</h3>
              <p className="mt-1 text-sm text-slate-500">Tangira ukore inkuru ya mbere utangaze kuri Rubavu Today.</p>
              <Link
                to="/employee/create"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
              >
                <PenSquare className="h-4 w-4" /> Work Inkuru
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentPosts.map((post) => (
                <div key={getPostId(post)} className="flex items-center gap-4 py-3.5">
                  <span className="text-xl">{DEPARTMENT_ICONS[getCategory(post)] || "📰"}</span>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/employee/articles?open=${encodeURIComponent(getPostId(post))}`}
                      className="block truncate text-left text-sm font-semibold text-slate-900 hover:text-blue-700 focus:outline-none focus-visible:underline"
                    >
                      {post.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-400">{formatDate(post)}</p>
                  </div>
                  <EmployeeStatusBadge status={getStatus(post)} size="xs" />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Amanotisi</h2>
            <Link to="/employee/notifications" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700">
              All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {notifLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : recentNotifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
              <Bell className="mx-auto h-7 w-7 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-600">Nta manotisi</p>
              <p className="mt-1 text-xs text-slate-500">Nta sera yatanzwe ubu.</p>
            </div>
          ) : (
            <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
              {recentNotifications.map((n) => (
                <div key={n.id} className={`rounded-2xl border p-3.5 ${n.read_flag ? "border-slate-200 bg-white" : "border-blue-200 bg-blue-50/60"}`}>
                  <div className="flex items-start gap-2.5">
                    <Bell className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                      {n.message && <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{n.message}</p>}
                      <p className="mt-1.5 text-[10px] text-slate-400">{formatNotificationTime(n.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Ubwanditsi ku byiciro</h2>
            <p className="text-xs text-slate-500">Imigabane y'inkuru zawe muri buri cyiciro</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
            <LayoutDashboard className="h-4 w-4" /> {total} zose
          </div>
        </div>
        <div className="space-y-5">
          {departmentStats.map(({ department, count }) => (
            <div key={department}>
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{DEPARTMENT_ICONS[department]}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${DEPARTMENT_COLORS[department]}`}>
                    {department}
                  </span>
                </div>
                <span className="text-sm font-bold text-slate-700">{count}</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-700"
                  style={{ width: `${Math.max((count / maxDepartment) * 100, count > 0 ? 6 : 0)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Object.keys(STATUS_META).map((key) => {
          const meta = STATUS_META[key];
          const Icon = meta.icon;
          return (
            <Link
              key={key}
              to={`/employee/articles?status=${key}`}
              className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${key === "approved" ? "bg-sky-50 text-sky-600" : ""}`}>
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <ArrowRight className="h-4 w-4 text-slate-300" />
              </div>
              <p className="text-2xl font-black text-slate-900">{counts[key]}</p>
              <p className="mt-0.5 text-xs font-medium text-slate-500">{meta.label}</p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}

function formatNotificationTime(value) {
  const date = value ? new Date(value) : null;
  return date && !isNaN(date.getTime())
    ? date.toLocaleString("rw-RW", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : "";
}

export default Dashboard;