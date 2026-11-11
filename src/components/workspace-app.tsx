"use client";
import { useMemo, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import * as Dialog from "@radix-ui/react-dialog";
import {
  LayoutDashboard,
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Users,
  Target,
  Sparkles,
  ChartNoAxesCombined,
  Link2,
  Settings,
  Search,
  Bell,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Plus,
  ShieldCheck,
  Check,
  CheckCheck,
  X,
  Menu,
  LogOut,
  Download,
  CalendarDays,
  ExternalLink,
  Info,
  RefreshCw,
  ReceiptText,
  Copy,
  LockKeyhole,
  CircleHelp,
  LoaderCircle,
  SlidersHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Brand } from "./brand";
import { Button } from "./ui/button";
import type { Workspace } from "@/lib/workspace";
import { analyze, type Entry } from "@/lib/analytics";
import type { CopilotAnswer } from "@/lib/copilot";
import { currencies, categories, money, toMinor, decimal, splitEqual } from "@/lib/money";
import { logout } from "@/app/actions";
const Charts = dynamic(() => import("./charts"), {
  ssr: false,
  loading: () => <div className="chart-loading skeleton" />,
});
const Grid = dynamic(() => import("./transaction-grid"), {
  ssr: false,
  loading: () => <div className="chart-loading skeleton" />,
});
const navigation: { id: string; label: string; icon: LucideIcon; group?: boolean }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
  { id: "pay", label: "Pay", icon: Wallet },
  { id: "divide-pay", label: "Divide & Pay", icon: Users },
  { id: "budgets", label: "Budgets", icon: Target },
  { id: "copilot", label: "AI Copilot", icon: Sparkles, group: true },
  { id: "analytics", label: "Analytics", icon: ChartNoAxesCombined },
  { id: "connection", label: "PayPal Connection", icon: Link2 },
  { id: "settings", label: "Settings", icon: Settings, group: true },
];
function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal">
          <div className="modal-header">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>{description}</Dialog.Description>
            </div>
            <Dialog.Close className="icon-button" aria-label="Close dialog">
              <X size={20} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
function Empty({
  icon: Icon = ReceiptText,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={25} strokeWidth={1.5} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
function PanelHead({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel-heading">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="select-wrap">
      <span className="sr-only">{label}</span>
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
      <ChevronDown size={14} />
    </label>
  );
}
export function WorkspaceApp({
  initial,
  section,
  preview = false,
}: {
  initial: Workspace;
  section: string;
  preview?: boolean;
}) {
  const router = useRouter(),
    params = useSearchParams();
  const [data, setData] = useState(initial),
    [currency, setCurrency] = useState("USD"),
    [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [mobile, setMobile] = useState(false),
    [notifications, setNotifications] = useState(false),
    [userMenu, setUserMenu] = useState(false),
    [query, setQuery] = useState(params.get("q") ?? ""),
    [direction, setDirection] = useState("all"),
    [kind, setKind] = useState("all"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const [selected, setSelected] = useState<Entry | null>(null),
    [evidenceIds, setEvidenceIds] = useState<string[] | null>(null),
    [budgetOpen, setBudgetOpen] = useState(false),
    [groupOpen, setGroupOpen] = useState(false),
    [toast, setToast] = useState(""),
    [error, setError] = useState(""),
    [pending, startTransition] = useTransition();
  const [budgetCategory, setBudgetCategory] = useState(categories[0]),
    [budgetAmount, setBudgetAmount] = useState("");
  const [question, setQuestion] = useState(""),
    [answer, setAnswer] = useState<CopilotAnswer | null>(null),
    [asked, setAsked] = useState(""),
    [aiBusy, setAiBusy] = useState(false);
  const [groupMode, setGroupMode] = useState("equal"),
    [participantText, setParticipantText] = useState(""),
    [groupTotal, setGroupTotal] = useState("");
  const a = useMemo(() => analyze(data.entries, currency, month), [data.entries, currency, month]);
  const href = (id: string) => (preview ? `/preview/${id}` : `/${id}`);
  const title = navigation.find((n) => n.id === section)?.label ?? "Overview";
  const entries = data.entries.filter(
    (e) =>
      e.currency === currency &&
      (direction === "all" || e.direction === direction) &&
      (kind === "all" || e.kind === kind) &&
      (from || to || e.occurredAt.startsWith(month)) &&
      (!from || e.occurredAt >= from) &&
      (!to || e.occurredAt <= `${to}T23:59:59.999Z`),
  );
  const budgets = data.budgets.filter((b) => b.currency === currency && b.month === month);
  const notify = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 5000);
  };
  const gate = () => {
    if (preview) {
      router.push("/login");
      return true;
    }
    return false;
  };
  async function request(url: string, body: unknown) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Please try again.");
    return result;
  }
  async function refresh() {
    if (preview) {
      notify("This is an empty product preview. Connect PayPal to load your own workspace.");
      return;
    }
    setError("");
    try {
      const response = await fetch("/api/workspace", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(result);
      notify("Workspace refreshed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed.");
    }
  }
  function saveBudget(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (gate()) return;
    setError("");
    startTransition(async () => {
      try {
        toMinor(budgetAmount);
        await request("/api/budgets", {
          category: budgetCategory,
          amount: budgetAmount,
          currency,
          month,
          confirmed: true,
        });
        setBudgetOpen(false);
        await refresh();
        notify("Budget saved. You’re in control of the target.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't save budget.");
      }
    });
  }
  async function ask(text: string) {
    if (gate()) return;
    setQuestion("");
    setAsked(text);
    setAiBusy(true);
    setError("");
    try {
      setAnswer(await request("/api/copilot", { question: text, currency, month }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your analysis.");
    } finally {
      setAiBusy(false);
    }
  }
  function exportCsv() {
    if (gate()) return;
    const escape = (v: unknown) =>
      `"${String(v)
        .replace(/"/g, '""')
        .replace(/^[=+\-@]/, "'$&")}"`;
    const rows = [
      [
        "Date",
        "Description",
        "Category",
        "Direction",
        "Amount minor units",
        "Currency",
        "Type",
        "Verified PayPal reference",
      ],
      ...entries
        .filter(
          (e) =>
            !query ||
            `${e.description} ${e.reference} ${e.category}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
        .map((e) => [
          e.occurredAt,
          e.description,
          e.category,
          e.direction,
          e.amountMinor,
          e.currency,
          e.kind,
          e.reference,
        ]),
    ];
    const url = URL.createObjectURL(
      new Blob([rows.map((r) => r.map(escape).join(",")).join("\r\n")], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `paytrack-${currency}-${month}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify("Filtered ledger exported.");
  }
  const evidence = (ids: string[]) => {
    setEvidenceIds(ids);
  };
  const quickBudget = (category?: string, amount?: number) => {
    if (gate()) return;
    setError("");
    setBudgetCategory(category ?? categories[0]);
    setBudgetAmount(amount ? decimal(amount) : "");
    setBudgetOpen(true);
  };
  const connectAction = (
    <Link href={preview ? "/login" : href("pay")} className="button small">
      {preview ? "Connect PayPal" : "Make a Sandbox payment"}
      <ArrowRight size={14} />
    </Link>
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href={href("overview")} className="sidebar-brand">
          <Brand />
        </Link>
        <div className="workspace-switch">
          <span className="workspace-avatar">P</span>
          <div>
            <strong>Personal workspace</strong>
            <small>PayPal Sandbox</small>
          </div>
          <LockKeyhole size={14} />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon, group }) => (
            <Link
              href={href(id)}
              key={id}
              className={`nav-link ${section === id ? "active" : ""} ${group ? "nav-break" : ""}`}
            >
              <Icon size={18} strokeWidth={1.7} />
              {label}
              {id === "copilot" && <span className="nav-ai">AI</span>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <ShieldCheck size={19} />
            <strong>Your decisions. Always.</strong>
            <p>Every payment needs your approval. Every insight has evidence.</p>
            <Link href={href("connection")}>
              About your connection <ArrowRight size={13} />
            </Link>
          </div>
          <Link href="/" className="help-link">
            <CircleHelp size={17} /> About PayTrack <ArrowUpRight size={14} />
          </Link>
          <div className="sidebar-foot">
            <span className="live-dot" /> Sandbox environment <LockKeyhole size={12} />
          </div>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-toggle"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb">
              Workspace <ChevronRight size={13} /> <strong>{title}</strong>
            </span>
          </div>
          <div className="topbar-right">
            <form
              className="global-search"
              onSubmit={(e) => {
                e.preventDefault();
                router.push(`${href("transactions")}?q=${encodeURIComponent(query)}`);
              }}
            >
              <Search size={16} />
              <input
                aria-label="Search transactions"
                placeholder="Search transactions…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <kbd>↵</kbd>
            </form>
            <span className="badge sandbox">
              <span />
              Sandbox
            </span>
            <button
              className="icon-button notification-button"
              aria-label="Notifications"
              onClick={() => setNotifications(true)}
            >
              <Bell size={19} />
              {data.notifications.some((n) => !n.readAt) && <i />}
            </button>
            <div className="user-menu-wrap">
              <button
                className="avatar-button"
                aria-label="Open user menu"
                aria-expanded={userMenu}
                onClick={() => setUserMenu(!userMenu)}
              >
                {data.user.name?.slice(0, 1).toUpperCase() ?? "P"}
              </button>
              {userMenu && (
                <div className="dropdown user-dropdown">
                  <strong>{preview ? "Product preview" : data.user.name}</strong>
                  <small>{data.user.email ?? "Connect your PayPal identity"}</small>
                  <Link href={href("settings")}>
                    <Settings size={15} /> Settings
                  </Link>
                  {preview ? (
                    <Link href="/login">
                      <Link2 size={15} /> Connect PayPal
                    </Link>
                  ) : (
                    <form action={logout}>
                      <button>
                        <LogOut size={15} /> Sign out
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>
        {preview && (
          <div className="preview-bar">
            <span>
              <Info size={14} /> Product preview · Empty workspace, no financial data
            </span>
            <Link href="/login">
              Connect your PayPal <ArrowRight size={14} />
            </Link>
          </div>
        )}
        <main className="workspace-content" id="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {section === "overview"
                  ? "A LITTLE CLARITY GOES A LONG WAY"
                  : section === "copilot"
                    ? "LESS GUESSWORK. MORE PERSPECTIVE."
                    : "YOUR PERSONAL WORKSPACE"}
              </div>
              <h1>
                {section === "overview"
                  ? "Your financial picture."
                  : section === "copilot"
                    ? "Ask a better money question."
                    : title}
              </h1>
              <p>
                {
                  (
                    {
                      overview: `${preview ? "Welcome to PayTrack" : "Welcome back"}. Here's where your money story comes together.`,
                      transactions: "Every recorded payment, with the evidence to back it up.",
                      pay: "A secure Sandbox checkout. You approve it. We verify it.",
                      "divide-pay":
                        "Shared expenses, clearly divided. Every share stays accountable.",
                      budgets: "Make room for what matters, one thoughtful target at a time.",
                      copilot:
                        "Understand your activity. Explore the evidence. Decide what comes next.",
                      analytics: "A closer look at the patterns behind your payments.",
                      connection:
                        "Know what's connected, what's shared, and what's in your control.",
                      settings: "A few details that make this workspace yours.",
                    } as Record<string, string>
                  )[section]
                }
              </p>
            </div>
            <div className="heading-actions">
              {section === "budgets" ? (
                <button className="button primary" onClick={() => quickBudget()}>
                  <Plus size={16} /> Create budget
                </button>
              ) : section === "divide-pay" ? (
                <button
                  className="button primary"
                  onClick={() => {
                    if (!gate()) {
                      setError("");
                      setGroupOpen(true);
                    }
                  }}
                >
                  <Plus size={16} /> New shared expense
                </button>
              ) : section === "transactions" ? (
                <button className="button" onClick={exportCsv}>
                  <Download size={16} /> Export CSV
                </button>
              ) : section === "overview" ? (
                <>
                  <button className="button" onClick={refresh} aria-label="Refresh workspace">
                    <RefreshCw size={15} />
                  </button>
                  <Button asChild>
                    <Link href={href("pay")}>
                      <Plus size={16} /> New payment
                    </Link>
                  </Button>
                </>
              ) : null}
            </div>
          </div>
          {error && (
            <div className="notice error" role="alert">
              {error}
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <X size={15} />
              </button>
            </div>
          )}
          {["overview", "transactions", "budgets", "analytics", "copilot"].includes(section) && (
            <div className="report-toolbar">
              <div className="report-context">
                <span className="live-dot" />
                {preview ? "Your future workspace" : "Verified PayTrack activity"}
                <span className="toolbar-separator" /> <ShieldCheck size={14} />{" "}
                {preview ? "Connect to begin" : "PayPal Sandbox"}
              </div>
              <div className="report-filters">
                <label className="month-filter">
                  <CalendarDays size={15} />
                  <input
                    type="month"
                    aria-label="Reporting month"
                    value={month}
                    onChange={(e) => {
                      if (e.target.value) setMonth(e.target.value);
                      setAnswer(null);
                    }}
                  />
                </label>
                <Select
                  label="Currency"
                  value={currency}
                  onChange={(v) => {
                    setCurrency(v);
                    setAnswer(null);
                  }}
                >
                  {currencies.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </div>
            </div>
          )}
          {section === "overview" && (
            <>
              <div className="overview-banner">
                <div className="banner-icon">
                  <Sparkles size={23} />
                </div>
                <div>
                  <strong>A clear picture starts with a verified payment.</strong>
                  <p>
                    {data.entries.length
                      ? "Your activity is ready to explore. Ask your copilot what's changed."
                      : "Connect, pay, and let the insights follow. No made-up numbers. Just your activity."}
                  </p>
                </div>
                <Link
                  href={href(data.entries.length ? "copilot" : "connection")}
                  className="text-link"
                >
                  {data.entries.length ? "Ask PayTrack" : "Let’s get connected"}
                  <ArrowRight size={15} />
                </Link>
              </div>
              <div className="stat-grid">
                {[
                  {
                    label: "Money received",
                    value: a.received,
                    icon: ArrowDownLeft,
                    color: "green",
                    caption: "Verified incoming activity",
                  },
                  {
                    label: "Money sent",
                    value: a.sent,
                    icon: ArrowUpRight,
                    color: "purple",
                    caption: "Verified outgoing activity",
                  },
                  {
                    label: "Net cash flow",
                    value: a.net,
                    icon: ArrowLeftRight,
                    color: "blue",
                    caption: "Received minus sent",
                  },
                  {
                    label: "Transactions",
                    value: a.count,
                    icon: ReceiptText,
                    color: "gray",
                    caption: "Verified captures this month",
                    count: true,
                  },
                ].map(({ label, value, icon: Icon, color, caption, count }) => (
                  <article className="stat-card" key={label}>
                    <div className="stat-top">
                      <span>{label}</span>
                      <span className={`stat-icon ${color}`}>
                        <Icon size={17} />
                      </span>
                    </div>
                    <strong className="stat-value">{count ? value : money(value, currency)}</strong>
                    <div className="stat-caption">
                      <span className="tiny-dot" />
                      {caption}
                    </div>
                  </article>
                ))}
              </div>
              <div className="overview-middle">
                <section className="panel cashflow-panel">
                  <PanelHead
                    title="Cash flow"
                    subtitle="A little perspective on money in and out."
                    action={
                      <span className="chart-key">
                        <i className="green-bg" />
                        Received <i className="purple-bg" />
                        Sent
                      </span>
                    }
                  />
                  {a.evidence.length ? (
                    <Charts analytics={a} />
                  ) : (
                    <div className="empty-chart">
                      <div className="chart-gridlines">
                        <i />
                        <i />
                        <i />
                        <i />
                      </div>
                      <Empty
                        icon={ChartNoAxesCombined}
                        title="Your story starts here"
                        description="Verified payments will bring your cash flow into focus."
                        action={connectAction}
                      />
                      <div className="chart-axis">
                        <span>01</span>
                        <span>07</span>
                        <span>14</span>
                        <span>21</span>
                        <span>{a.daily.length}</span>
                      </div>
                    </div>
                  )}
                </section>
                <section className="panel breakdown-panel">
                  <PanelHead
                    title="Spending breakdown"
                    subtitle="Where your recorded spending goes."
                  />
                  {a.breakdown.length ? (
                    <Charts analytics={a} kind="categories" />
                  ) : (
                    <div className="breakdown-empty">
                      <div className="empty-donut">
                        <span>
                          <strong>—</strong>
                          <small>No spending yet</small>
                        </span>
                      </div>
                      <p>
                        Categories appear after your
                        <br />
                        first verified outgoing payment.
                      </p>
                    </div>
                  )}
                  <Link href={href("analytics")} className="panel-bottom-link">
                    Explore analytics <ArrowRight size={14} />
                  </Link>
                </section>
              </div>
              <div className="overview-lower">
                <section className="panel">
                  <PanelHead
                    title="Recent activity"
                    subtitle="Verified payments. Nothing assumed."
                    action={
                      <Link href={href("transactions")} className="text-link">
                        View all <ArrowRight size={14} />
                      </Link>
                    }
                  />
                  {data.entries.length ? (
                    <div className="activity-list">
                      {data.entries
                        .filter((e) => e.currency === currency)
                        .slice(0, 5)
                        .map((e) => (
                          <button
                            onClick={() => setSelected(e)}
                            key={e.id}
                            className="activity-row"
                          >
                            <span
                              className={`icon-box ${e.direction === "RECEIVED" ? "green" : "neutral"}`}
                            >
                              {e.direction === "RECEIVED" ? (
                                <ArrowDownLeft size={18} />
                              ) : (
                                <ArrowUpRight size={18} />
                              )}
                            </span>
                            <span>
                              <strong>{e.description}</strong>
                              <small>
                                {e.category} · {new Date(e.occurredAt).toLocaleDateString()}
                              </small>
                            </span>
                            <b className={e.direction === "RECEIVED" ? "positive" : ""}>
                              {e.direction === "RECEIVED" ? "+" : "−"}
                              {money(e.amountMinor, e.currency)}
                            </b>
                            <ChevronRight size={15} />
                          </button>
                        ))}
                    </div>
                  ) : (
                    <Empty
                      title="A fresh start, a clean ledger"
                      description="Your completed PayTrack payments will appear here, with verified PayPal references."
                    />
                  )}
                </section>
                <section className="panel insights-panel">
                  <PanelHead
                    title="A little insight"
                    action={
                      <span className="ai-label">
                        <Sparkles size={12} /> COPILOT
                      </span>
                    }
                  />
                  <div className="insight-note">
                    <span className="icon-box purple">
                      <Sparkles size={20} />
                    </span>
                    <h3>
                      {a.count
                        ? "The facts behind your financial picture."
                        : "Good advice starts with good evidence."}
                    </h3>
                    <p>
                      {a.count
                        ? a.facts[1].text
                        : "Your copilot is ready when your activity is. Make your first Sandbox payment to unlock a grounded spending summary."}
                    </p>
                  </div>
                  <Link href={href("copilot")} className="button full">
                    Meet your copilot <ArrowRight size={15} />
                  </Link>
                  <div className="insight-foot">
                    <ShieldCheck size={13} /> Built on verified records, always.
                  </div>
                </section>
              </div>
              <section className="panel budget-overview">
                <PanelHead
                  title="Your budget, your pace"
                  subtitle="Set a target. Keep the important things in view."
                  action={
                    <Link href={href("budgets")} className="text-link">
                      Manage budgets <ArrowRight size={14} />
                    </Link>
                  }
                />
                {budgets.length ? (
                  <div className="budget-mini-list">
                    {budgets.slice(0, 3).map((b) => {
                      const spent =
                        a.breakdown.find((c) => c.category === b.category)?.amountMinor ?? 0;
                      return (
                        <div key={b.id}>
                          <span>
                            {b.category}
                            <b>
                              {money(spent, currency)}{" "}
                              <small>/ {money(b.limitMinor, currency)}</small>
                            </b>
                          </span>
                          <progress max={b.limitMinor} value={spent} />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="budget-start">
                    <span className="icon-box neutral">
                      <Target size={20} />
                    </span>
                    <div>
                      <strong>A plan makes a difference.</strong>
                      <p>
                        Create your first monthly category budget, or build some history for a
                        recommendation.
                      </p>
                    </div>
                    <button className="button small" onClick={() => quickBudget()}>
                      <Plus size={14} /> Set a budget
                    </button>
                  </div>
                )}
              </section>
            </>
          )}
          {section === "transactions" && (
            <>
              <section className="panel">
                <div className="transaction-toolbar">
                  <div className="table-search">
                    <Search size={16} />
                    <input
                      placeholder="Search descriptions, categories, references…"
                      aria-label="Filter transactions"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                  <Select label="Direction" value={direction} onChange={setDirection}>
                    <option value="all">All directions</option>
                    <option value="SENT">Money sent</option>
                    <option value="RECEIVED">Money received</option>
                  </Select>
                  <Select label="Entry type" value={kind} onChange={setKind}>
                    <option value="all">All types</option>
                    <option value="CAPTURE">Captures</option>
                    <option value="REFUND">Refunds</option>
                  </Select>
                  <label className="date-range">
                    From
                    <input
                      type="date"
                      aria-label="Start date"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                    />
                  </label>
                  <label className="date-range">
                    To
                    <input
                      type="date"
                      aria-label="End date"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                    />
                  </label>
                </div>
                <div className="table-caption">
                  <span>
                    <ShieldCheck size={14} /> {entries.length} verified ledger entries · {currency}
                  </span>
                  <span>Click a row for payment evidence</span>
                </div>
                <Grid entries={entries} query={query} onSelect={setSelected} />
              </section>
              <div className="notice">
                <Info size={16} /> This explorer contains PayTrack-verified captures and refunds.
                Pending orders appear on the Pay page. It does not represent your full PayPal
                history.
              </div>
            </>
          )}
          {section === "pay" && (
            <PayPanel
              preview={preview}
              data={data}
              notify={notify}
              refresh={refresh}
              request={request}
              setError={setError}
            />
          )}
          {section === "budgets" && (
            <>
              <div className="two-columns">
                <section className="panel">
                  <PanelHead
                    title="Monthly category budgets"
                    subtitle={`${month} · ${currency} · You set the targets`}
                  />
                  {budgets.length ? (
                    <div className="budget-list">
                      {budgets.map((b) => {
                        const spent =
                          a.breakdown.find((c) => c.category === b.category)?.amountMinor ?? 0;
                        return (
                          <article key={b.id}>
                            <div>
                              <span className="icon-box purple">
                                <Target size={19} />
                              </span>
                              <div>
                                <h3>{b.category}</h3>
                                <p>
                                  {money(Math.max(0, b.limitMinor - spent), currency)} remaining
                                  {spent > b.limitMinor
                                    ? ` · ${money(spent - b.limitMinor, currency)} over target`
                                    : ""}
                                </p>
                              </div>
                              <button
                                className="button small"
                                onClick={() => quickBudget(b.category, b.limitMinor)}
                              >
                                Edit
                              </button>
                            </div>
                            <progress value={spent} max={b.limitMinor} />
                            <small>
                              {money(spent, currency)} spent{" "}
                              <span>{money(b.limitMinor, currency)} target</span>
                            </small>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <Empty
                      icon={Target}
                      title="Make a little room for your goals"
                      description="Set a monthly category limit. Your verified outgoing captures will track progress automatically."
                      action={
                        <button className="button primary" onClick={() => quickBudget()}>
                          <Plus size={15} /> Create your first budget
                        </button>
                      }
                    />
                  )}
                </section>
                <section className="panel">
                  <PanelHead
                    title="Suggested, with evidence"
                    action={
                      <span className="ai-label">
                        <Sparkles size={13} /> COPILOT
                      </span>
                    }
                  />
                  {a.recommendations.length ? (
                    <div className="recommendation-list">
                      {a.recommendations.map((r) => (
                        <article key={r.category}>
                          <h3>
                            {r.category}
                            <strong>{money(r.limitMinor, currency)}</strong>
                          </h3>
                          <p>{r.reason}</p>
                          <div>
                            <button className="text-link" onClick={() => evidence(r.evidence)}>
                              View evidence <ArrowRight size={13} />
                            </button>
                            <button
                              className="button small"
                              onClick={() => quickBudget(r.category, r.limitMinor)}
                            >
                              Review suggestion
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <Empty
                      icon={Sparkles}
                      title="A thoughtful baseline takes a little history"
                      description="We need at least two complete months of verified outgoing activity before suggesting category targets. You can set your own budget now."
                    />
                  )}
                  <div className="panel-footnote">
                    <Info size={14} /> Targets use historical averages, not guaranteed savings.
                    Refunds remain visible as cash inflows; budget progress uses gross outgoing
                    captures.
                  </div>
                </section>
              </div>
            </>
          )}
          {section === "copilot" && (
            <div className="copilot-layout">
              <section className="panel copilot-main">
                <div className="copilot-top">
                  <span>
                    <span className="icon-box purple">
                      <Sparkles size={20} />
                    </span>
                    <strong>
                      PayTrack Copilot<small>Your evidence navigator</small>
                    </strong>
                  </span>
                  <span className={`badge ${data.readiness.ai ? "green" : "neutral"}`}>
                    {data.readiness.ai ? "AI configured" : "Calculated summaries"}
                  </span>
                </div>
                <div className="copilot-conversation">
                  {!answer && !aiBusy ? (
                    <>
                      <div className="copilot-welcome">
                        <span className="copilot-star">
                          <Sparkles size={33} strokeWidth={1.3} />
                        </span>
                        <h2>
                          A little curiosity.
                          <br />A lot more clarity.
                        </h2>
                        <p>
                          Ask about your recorded spending. Get answers with a trail back to the
                          payments behind them.
                        </p>
                      </div>
                      <div className="prompt-grid">
                        {[
                          "Where did I spend the most this month?",
                          "What changed compared with last month?",
                          "What is a realistic budget for me?",
                          "Show the payments behind my insights.",
                        ].map((q, i) => {
                          const Icon = [ChartNoAxesCombined, ArrowLeftRight, Target, ReceiptText][
                            i
                          ];
                          return (
                            <button key={q} onClick={() => ask(q)}>
                              <Icon size={17} />
                              <span>{q}</span>
                              <ArrowUpRight size={14} />
                            </button>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="chat-question">{asked}</div>
                      {aiBusy ? (
                        <div className="thinking">
                          <LoaderCircle size={18} className="spin" /> Following the evidence…
                        </div>
                      ) : (
                        answer && (
                          <div className="copilot-answer">
                            <span className="answer-brand">
                              <Sparkles size={17} /> PAYTRACK{" "}
                              <small>
                                {answer.source === "gemini"
                                  ? "AI-assisted selection"
                                  : "Calculated summary"}
                              </small>
                            </span>
                            <h3>{answer.message}</h3>
                            {answer.facts.map((f) => (
                              <article className="fact" key={f.id}>
                                <p>{f.text}</p>
                                <button
                                  className="evidence-link"
                                  onClick={() => evidence(f.evidence)}
                                >
                                  <ShieldCheck size={13} /> {f.evidence.length} source records{" "}
                                  <ArrowRight size={12} />
                                </button>
                              </article>
                            ))}
                            {a.count > 0 &&
                              (answer.view === "cashflow" || answer.view === "categories") && (
                                <Charts analytics={a} kind={answer.view} />
                              )}
                            <div className="answer-actions">
                              <Link
                                className="button small"
                                href={href(answer.view === "budgets" ? "budgets" : "transactions")}
                              >
                                {answer.view === "budgets"
                                  ? "Review budget suggestions"
                                  : "Explore the supporting payments"}
                                <ArrowRight size={14} />
                              </Link>
                            </div>
                            <small className="fine">{answer.coverage}</small>
                          </div>
                        )
                      )}
                    </>
                  )}
                </div>
                <form
                  className="copilot-input"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (question.trim()) ask(question);
                  }}
                >
                  <input
                    aria-label="Ask PayTrack"
                    value={question}
                    maxLength={500}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="What would you like to understand?"
                  />
                  <button
                    className="button primary icon-only"
                    type="submit"
                    disabled={aiBusy || !question.trim()}
                    aria-label="Send question"
                  >
                    <ArrowUpRight size={20} />
                  </button>
                </form>
                <p className="copilot-disclaimer">
                  <LockKeyhole size={12} /> Insights inform. You decide. No automatic payments or
                  budget changes.
                </p>
              </section>
              <aside className="copilot-context">
                <section className="panel">
                  <PanelHead title="Your context" />
                  <dl className="context-list">
                    <div>
                      <dt>Reporting period</dt>
                      <dd>{month}</dd>
                    </div>
                    <div>
                      <dt>Currency</dt>
                      <dd>{currency}</dd>
                    </div>
                    <div>
                      <dt>Verified captures</dt>
                      <dd>{a.count}</dd>
                    </div>
                    <div>
                      <dt>Data source</dt>
                      <dd>PayTrack ledger</dd>
                    </div>
                  </dl>
                  <div className="context-note">
                    <ShieldCheck size={18} />
                    <p>
                      Every figure is calculated from authorized records. AI selects relevant
                      evidence and views; it can’t invent financial statements.
                    </p>
                  </div>
                </section>
                <div className="copilot-side-note">
                  <h3>A source for every statement.</h3>
                  <p>
                    Tap “source records” to see the actual payment. If there isn’t enough history,
                    we’ll say so.
                  </p>
                  <Link className="text-link" href={href("connection")}>
                    Understand your data <ArrowRight size={14} />
                  </Link>
                </div>
              </aside>
            </div>
          )}
          {section === "analytics" && (
            <>
              <div className="stat-grid three">
                {[
                  { label: "Recorded spending", value: a.sent },
                  { label: "Recorded income", value: a.received },
                  { label: "Net cash flow", value: a.net },
                ].map((s) => (
                  <article className="stat-card" key={s.label}>
                    <span className="muted">{s.label}</span>
                    <strong className="stat-value">{money(s.value, currency)}</strong>
                    <small className="muted">
                      {month} · {currency}
                    </small>
                  </article>
                ))}
              </div>
              <div className="two-columns">
                <section className="panel">
                  <PanelHead
                    title="Daily cash flow"
                    subtitle="Separate currencies. Clear comparisons."
                  />
                  {a.evidence.length ? (
                    <Charts analytics={a} />
                  ) : (
                    <Empty
                      icon={ChartNoAxesCombined}
                      title="Patterns need a starting point"
                      description="Your first verified payment will start your cash flow chart."
                      action={connectAction}
                    />
                  )}
                </section>
                <section className="panel">
                  <PanelHead
                    title="Spending by category"
                    subtitle="Gross outgoing captures, based on your checkout category."
                  />
                  {a.breakdown.length ? (
                    <Charts analytics={a} kind="categories" />
                  ) : (
                    <Empty
                      icon={SlidersHorizontal}
                      title="No category activity yet"
                      description="Categories are chosen at checkout. We never infer a merchant or invent a spending category."
                    />
                  )}
                </section>
              </div>
              <section className="panel evidence-panel">
                <PanelHead
                  title="The facts behind the view"
                  subtitle="Calculated from your ledger, with traceable sources."
                />
                {a.facts.map((f) => (
                  <article key={f.id}>
                    <ShieldCheck size={18} />
                    <p>{f.text}</p>
                    <button className="text-link" onClick={() => evidence(f.evidence)}>
                      View evidence <ArrowRight size={14} />
                    </button>
                  </article>
                ))}
              </section>
            </>
          )}
          {section === "divide-pay" && (
            <>
              <div className="notice">
                <Info size={17} />
                <span>
                  Shared expenses collect payments to the configured Sandbox Business merchant. This
                  is not escrow or peer-to-peer money transfer. Each participant signs in and
                  approves their own checkout.
                </span>
              </div>
              {data.groups.length ? (
                <div className="groups-grid">
                  {data.groups.map((g) => (
                    <section className="panel group-card" key={g.id}>
                      <PanelHead
                        title={g.title}
                        subtitle={`${g.participants.length} participants · ${g.currency}`}
                      />
                      <strong className="group-total">{money(g.amountMinor, g.currency)}</strong>
                      <progress
                        value={g.participants
                          .filter((p) => p.contribution)
                          .reduce((a, p) => a + p.shareMinor, 0)}
                        max={g.amountMinor}
                      />
                      <p className="muted">
                        {g.participants.filter((p) => p.contribution).length} of{" "}
                        {g.participants.length} shares verified
                      </p>
                      {g.participants.map((p) => (
                        <div className="participant-row" key={p.id}>
                          <span className="participant-avatar">{p.name.slice(0, 1)}</span>
                          <strong>
                            {p.name}
                            <small>{money(p.shareMinor, g.currency)}</small>
                          </strong>
                          {p.contribution ? (
                            <span className="badge green">
                              <Check size={12} /> Verified
                            </span>
                          ) : (
                            <button
                              className="button small"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(
                                    `${location.origin}/share/${p.token}`,
                                  );
                                  notify("Private share link copied. Send it to this participant.");
                                } catch {
                                  setError(
                                    "Clipboard unavailable. Open the participant link to copy it.",
                                  );
                                }
                              }}
                            >
                              <Copy size={13} /> Copy link
                            </button>
                          )}
                        </div>
                      ))}
                    </section>
                  ))}
                </div>
              ) : (
                <section className="panel split-empty">
                  <Empty
                    icon={Users}
                    title="Good company. Clear shares."
                    description="Create an expense, divide the total exactly, and give each participant a private payment link. Only verified captures mark a share as paid."
                    action={
                      <button
                        className="button primary"
                        onClick={() => {
                          if (!gate()) setGroupOpen(true);
                        }}
                      >
                        <Plus size={16} /> Create shared expense
                      </button>
                    }
                  />
                  <div className="split-steps">
                    <span>
                      <b>01</b> Set the expense
                    </span>
                    <ArrowRight size={16} />
                    <span>
                      <b>02</b> Share the links
                    </span>
                    <ArrowRight size={16} />
                    <span>
                      <b>03</b> Verify each payment
                    </span>
                  </div>
                </section>
              )}
            </>
          )}
          {section === "connection" && (
            <div className="connection-layout">
              <section className="panel connection-main">
                <div className="connection-brand">
                  <span className="paypal-tile">P</span>
                  <div>
                    <h2>PayPal Sandbox</h2>
                    <p>Your secure identity and payment connection.</p>
                  </div>
                  <span className={`badge ${data.connection ? "green" : "neutral"}`}>
                    {data.connection ? "Identity connected" : "Not connected"}
                  </span>
                </div>
                <dl className="connection-details">
                  <div>
                    <dt>Account</dt>
                    <dd>{data.user.email ?? "Connect to see your account"}</dd>
                  </div>
                  <div>
                    <dt>Identity verification</dt>
                    <dd>{data.connection ? "Verified by PayPal OAuth" : "Not yet connected"}</dd>
                  </div>
                  <div>
                    <dt>Payer ID shared</dt>
                    <dd>
                      {data.connection?.payerId ? "Yes · matched before capture" : "Not available"}
                    </dd>
                  </div>
                  <div>
                    <dt>Environment</dt>
                    <dd>
                      <span className="badge amber">Sandbox · No real money</span>
                    </dd>
                  </div>
                </dl>
                <div className="connection-actions">
                  <Link className="button primary" href="/login">
                    <Link2 size={16} />
                    {data.connection ? "Reconnect PayPal" : "Connect PayPal"}
                  </Link>
                  <a
                    className="button"
                    href="https://developer.paypal.com/dashboard/applications/sandbox"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Developer Dashboard <ExternalLink size={14} />
                  </a>
                </div>
                <div className="connection-readiness">
                  <h3>Workspace readiness</h3>
                  {[
                    { key: "database", label: "Database configured" },
                    { key: "paypal", label: "Sandbox API credentials configured" },
                    { key: "merchant", label: "Merchant ID configured" },
                    { key: "webhook", label: "Webhook ID configured" },
                    { key: "ai", label: "AI provider configured" },
                  ].map((r) => (
                    <div key={r.key}>
                      <span>{r.label}</span>
                      {data.readiness[r.key as keyof typeof data.readiness] ? (
                        <span className="positive">
                          <Check size={15} /> Configured
                        </span>
                      ) : (
                        <span className="muted">
                          {preview ? "Connect to check" : "Setup needed"}
                        </span>
                      )}
                    </div>
                  ))}
                  <small className="fine">
                    Configuration checks confirm presence, not a successful external API test.
                  </small>
                </div>
              </section>
              <aside>
                <section className="panel permission-panel">
                  <PanelHead title="A connection with clear boundaries" />
                  <h3>
                    <Check size={16} /> What PayTrack uses
                  </h3>
                  <p>
                    Your PayPal identity, payments created through this app, and verified capture or
                    refund references.
                  </p>
                  <h3>
                    <LockKeyhole size={16} /> What stays yours
                  </h3>
                  <p>
                    Your password, your full PayPal transaction history, and your account balance
                    are never available to PayTrack through this login.
                  </p>
                  <h3>
                    <ShieldCheck size={16} /> Your approval comes first
                  </h3>
                  <p>
                    Payment approval happens on PayPal. Budget suggestions are only saved after you
                    review and confirm them.
                  </p>
                </section>
              </aside>
            </div>
          )}
          {section === "settings" && (
            <div className="settings-layout">
              <section className="panel">
                <PanelHead title="Your profile" subtitle="Verified identity details from PayPal." />
                <div className="profile-details">
                  <span className="large-avatar">{data.user.name?.slice(0, 1) ?? "P"}</span>
                  <div>
                    <h3>{data.user.name}</h3>
                    <p>{data.user.email ?? "No connected account"}</p>
                    <span className="badge neutral">
                      {preview ? "Product preview" : "PayPal identity"}
                    </span>
                  </div>
                </div>
                <p className="settings-note">
                  Your profile follows your PayPal identity. Reconnect to refresh the information
                  shared by PayPal.
                </p>
                <Link className="button" href="/login">
                  {preview ? "Connect PayPal" : "Reconnect to update profile"}
                  <ArrowUpRight size={14} />
                </Link>
              </section>
              <section className="panel">
                <PanelHead title="Data & privacy" />
                <div className="settings-item">
                  <ShieldCheck size={21} />
                  <div>
                    <h3>Only your authorized activity</h3>
                    <p>
                      Every query is scoped to your signed-in identity. No financial history is
                      linked by email.
                    </p>
                  </div>
                </div>
                <div className="settings-item">
                  <Sparkles size={21} />
                  <div>
                    <h3>Minimal AI context</h3>
                    <p>
                      The copilot receives calculated summaries and category labels. No OAuth
                      tokens, email addresses, or raw payment descriptions are sent.
                    </p>
                  </div>
                </div>
                <button className="button" onClick={exportCsv}>
                  <Download size={15} /> Export your filtered ledger
                </button>
              </section>
              <section className="panel">
                <PanelHead title="Session" />
                <p className="settings-note">
                  Sign out of PayTrack on this browser. Your records stay securely in your
                  workspace.
                </p>
                {preview ? (
                  <Link className="button primary" href="/login">
                    Sign in with PayPal
                  </Link>
                ) : (
                  <form action={logout}>
                    <button className="button" type="submit">
                      <LogOut size={16} /> Sign out
                    </button>
                  </form>
                )}
              </section>
            </div>
          )}
          <footer className="workspace-footer">
            <span>
              <ShieldCheck size={13} /> Verified activity. Clearer decisions.
            </span>
            <span>
              PayTrack <i>·</i> PayPal Sandbox <i>·</i> No real money
            </span>
          </footer>
        </main>
      </div>
      <Modal
        open={mobile}
        onOpenChange={setMobile}
        title="Your workspace"
        description="Navigate PayTrack"
      >
        <nav className="mobile-nav">
          {navigation.map(({ id, label, icon: Icon }) => (
            <Link
              href={href(id)}
              key={id}
              onClick={() => setMobile(false)}
              className={`nav-link ${section === id ? "active" : ""}`}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
      </Modal>
      <Modal
        open={notifications}
        onOpenChange={setNotifications}
        title="Notifications"
        description="Updates from your verified workspace."
      >
        <div className="notification-list">
          {data.notifications.length ? (
            data.notifications.map((n) => (
              <article key={n.id}>
                <span className={`icon-box ${n.readAt ? "neutral" : "purple"}`}>
                  <Bell size={17} />
                </span>
                <div>
                  <h3>{n.title}</h3>
                  <p>{n.message}</p>
                  <small>{new Date(n.createdAt).toLocaleString()}</small>
                </div>
              </article>
            ))
          ) : (
            <Empty
              icon={Bell}
              title="All quiet here"
              description="Verified payment updates will appear as you use PayTrack."
            />
          )}
        </div>
        {data.notifications.some((n) => !n.readAt) && (
          <button
            className="button full"
            onClick={async () => {
              try {
                await request("/api/notifications", {});
                await refresh();
              } catch {
                setError("Couldn't update notifications.");
              }
            }}
          >
            <CheckCheck size={15} /> Mark all as read
          </button>
        )}
      </Modal>
      <Modal
        open={evidenceIds !== null}
        onOpenChange={(v) => {
          if (!v) setEvidenceIds(null);
        }}
        title="The supporting payments"
        description="Every record behind this statement. Select a payment to inspect its verified reference."
      >
        {evidenceIds?.length ? (
          <div className="activity-list">
            {data.entries
              .filter((e) => evidenceIds.includes(e.id))
              .map((e) => (
                <button
                  className="activity-row"
                  key={e.id}
                  onClick={() => {
                    setEvidenceIds(null);
                    setSelected(e);
                  }}
                >
                  <span className="icon-box neutral">
                    <ReceiptText size={17} />
                  </span>
                  <span>
                    <strong>{e.description}</strong>
                    <small>
                      {new Date(e.occurredAt).toLocaleDateString()} · {e.category}
                    </small>
                  </span>
                  <b>{money(e.amountMinor, e.currency)}</b>
                  <ChevronRight size={14} />
                </button>
              ))}
          </div>
        ) : (
          <Empty
            title="No source records yet"
            description="This statement describes the current empty reporting period. No payments have been inferred."
          />
        )}
      </Modal>
      <Modal
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) setSelected(null);
        }}
        title="Payment evidence"
        description="A verified record, with a traceable PayPal reference."
      >
        {selected && (
          <>
            <div className="detail-amount">
              <span
                className={`icon-box ${selected.direction === "RECEIVED" ? "green" : "purple"}`}
              >
                {selected.direction === "RECEIVED" ? (
                  <ArrowDownLeft size={23} />
                ) : (
                  <ArrowUpRight size={23} />
                )}
              </span>
              <h2>{money(selected.amountMinor, selected.currency)}</h2>
              <p>{selected.description}</p>
              <span className="badge green">
                <ShieldCheck size={12} /> Verified {selected.kind.toLowerCase()}
              </span>
            </div>
            <dl className="detail-list">
              <div>
                <dt>Direction</dt>
                <dd>{selected.direction}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{selected.category}</dd>
              </div>
              <div>
                <dt>Occurred</dt>
                <dd>{new Date(selected.occurredAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt>PayPal reference</dt>
                <dd className="mono">{selected.reference}</dd>
              </div>
              <div>
                <dt>Evidence ID</dt>
                <dd className="mono">{selected.id}</dd>
              </div>
            </dl>
            <div className="notice">
              <ShieldCheck size={15} /> Recorded only after server-side verification against PayPal.
            </div>
          </>
        )}
      </Modal>
      <Modal
        open={budgetOpen}
        onOpenChange={setBudgetOpen}
        title="Set a thoughtful target"
        description="Review your monthly category limit, then confirm to save."
      >
        <form className="stack-form" onSubmit={saveBudget}>
          <label>
            Category
            <select value={budgetCategory} onChange={(e) => setBudgetCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <div className="form-row">
            <label>
              Monthly limit ({currency})
              <input
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                inputMode="decimal"
                placeholder="0.00"
                required
              />
            </label>
            <label>
              Month
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                required
              />
            </label>
          </div>
          <div className="notice">
            <Info size={16} /> This saves a planning target. It does not move money or limit your
            PayPal account.
          </div>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <button className="button primary full" disabled={pending} type="submit">
            {pending ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />} Confirm &
            save budget
          </button>
        </form>
      </Modal>
      <Modal
        open={groupOpen}
        onOpenChange={setGroupOpen}
        title="Make the shares clear"
        description="Collect participant payments directly to the configured Sandbox Business merchant."
      >
        <form
          className="stack-form"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            setError("");
            startTransition(async () => {
              try {
                const participants = participantText
                  .split("\n")
                  .map((p) => p.trim())
                  .filter(Boolean)
                  .map((p) => {
                    const [name, amount] = p.split("|").map((s) => s.trim());
                    return { name, ...(groupMode === "custom" ? { amount } : {}) };
                  });
                await request("/api/groups", {
                  title: form.get("title"),
                  amount: groupTotal,
                  currency,
                  participants,
                  mode: groupMode,
                });
                setGroupOpen(false);
                await refresh();
                notify("Shared expense created. Copy each participant's private link.");
              } catch (e) {
                setError(e instanceof Error ? e.message : "Couldn't create expense.");
              }
            });
          }}
        >
          <label>
            Expense name
            <input name="title" required placeholder="Team dinner, weekend stay…" maxLength={100} />
          </label>
          <div className="form-row">
            <label>
              Total ({currency})
              <input
                value={groupTotal}
                onChange={(e) => setGroupTotal(e.target.value)}
                inputMode="decimal"
                required
                placeholder="0.00"
              />
            </label>
            <label>
              Split method
              <select value={groupMode} onChange={(e) => setGroupMode(e.target.value)}>
                <option value="equal">Equal shares</option>
                <option value="custom">Custom shares</option>
              </select>
            </label>
          </div>
          <label>
            Participants
            <textarea
              value={participantText}
              onChange={(e) => setParticipantText(e.target.value)}
              required
              rows={4}
              placeholder={
                groupMode === "equal" ? "One name per line" : "One per line: Name | Amount"
              }
            />
          </label>
          <p className="fine">
            {groupMode === "equal"
              ? "Any remaining cents are assigned to the first participants. Shares always add up exactly."
              : "Enter each name and amount separated by |. The shares must match the total exactly."}
          </p>
          {groupMode === "equal" && groupTotal && participantText && (
            <SplitPreview
              total={groupTotal}
              names={participantText.split("\n").filter((s) => s.trim())}
              currency={currency}
            />
          )}
          <div className="notice">
            <Info size={15} /> Only the connected Business merchant can create collections. No
            reminders are sent automatically.
          </div>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <button className="button primary full" disabled={pending} type="submit">
            Create expense <ArrowRight size={15} />
          </button>
        </form>
      </Modal>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
          <button
            aria-label="Dismiss notification"
            className="icon-button"
            onClick={() => setToast("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
function SplitPreview({
  total,
  names,
  currency,
}: {
  total: string;
  names: string[];
  currency: string;
}) {
  let shares: number[];
  try {
    shares = splitEqual(toMinor(total), names.length);
  } catch {
    return null;
  }
  return (
    <div className="split-preview">
      {names.map((n, i) => (
        <span key={i}>
          {n}
          <b>{money(shares[i], currency)}</b>
        </span>
      ))}
    </div>
  );
}
function PayPanel({
  preview,
  data,
  notify,
  refresh,
  request,
  setError,
}: {
  preview: boolean;
  data: Workspace;
  notify: (s: string) => void;
  refresh: () => Promise<void>;
  request: (url: string, body: unknown) => Promise<{ approvalUrl?: string; status?: string }>;
  setError: (s: string) => void;
}) {
  const router = useRouter(),
    params = useSearchParams();
  const [busy, setBusy] = useState(false),
    [review, setReview] = useState<{
      description: string;
      amount: string;
      currency: string;
      category: string;
    } | null>(null),
    [requestKey, setRequestKey] = useState<string | null>(null);
  const approved = params.get("approved"),
    cancelled = params.get("cancelled");
  const capture = async (id: string) => {
    setBusy(true);
    setError("");
    try {
      const result = await request(`/api/payments/${id}/capture`, {});
      if (result.status === "COMPLETED") {
        notify("Capture verified. Your payment is recorded.");
        router.replace("/pay");
        await refresh();
      } else notify(`Payment status: ${result.status}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Capture could not be verified.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="pay-layout">
      <section className="panel pay-card">
        <PanelHead
          title="A payment with a paper trail"
          subtitle="Pay the configured Sandbox merchant through PayPal."
        />
        {approved && (
          <div className="notice purple-notice">
            <ShieldCheck size={18} />
            <div>
              <strong>Back from PayPal? Verify your payment.</strong>
              <p>
                Returning here is not proof of payment. Capture and verify the order to record it.
              </p>
              <button
                className="button primary small"
                disabled={busy || preview}
                onClick={() => capture(approved)}
              >
                {busy ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />} Capture &
                verify payment
              </button>
            </div>
          </div>
        )}
        {cancelled && (
          <div className="notice">
            Checkout was cancelled. No success has been recorded. You can create a new order.
          </div>
        )}
        <form
          className="stack-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (preview) {
              router.push("/login");
              return;
            }
            setError("");
            const form = new FormData(e.currentTarget);
            const values = {
              description: String(form.get("description")),
              amount: String(form.get("amount")),
              currency: String(form.get("currency")),
              category: String(form.get("category")),
            };
            try {
              toMinor(values.amount);
              setReview(values);
              setRequestKey(crypto.randomUUID());
            } catch (e) {
              setError(e instanceof Error ? e.message : "Check amount.");
            }
          }}
        >
          <label>
            What is this payment for?
            <input
              name="description"
              placeholder="Give your payment a clear description"
              required
              minLength={2}
              maxLength={120}
            />
          </label>
          <div className="form-row">
            <label>
              Amount
              <input name="amount" inputMode="decimal" placeholder="0.00" required />
            </label>
            <label>
              Currency
              <select name="currency">
                {currencies.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Category
            <select name="category">
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <small>Chosen by you. Used in your spending breakdown and budgets.</small>
          </label>
          <div className="payment-destination">
            <span className="paypal-tile small-tile">P</span>
            <div>
              <strong>PayPal Sandbox merchant</strong>
              <small>Configured Business account · Not a P2P transfer</small>
            </div>
            <ShieldCheck size={18} />
          </div>
          <button type="submit" className="button primary full">
            {preview ? "Connect PayPal to pay" : "Review payment"}
            <ArrowRight size={16} />
          </button>
          <p className="secure-caption">
            <LockKeyhole size={13} /> No real money. Approval happens securely on PayPal.
          </p>
        </form>
      </section>
      <aside>
        <section className="panel pay-how">
          <PanelHead title="Clear at every step" />
          {[
            {
              title: "Review the details",
              text: "Choose a description, amount, currency, and category.",
            },
            {
              title: "Approve on PayPal",
              text: "Use the same Sandbox Personal account you used to sign in.",
            },
            {
              title: "Capture, then verify",
              text: "PayTrack checks the capture before adding it to your ledger.",
            },
          ].map((s, i) => (
            <div className="pay-step" key={s.title}>
              <b>{i + 1}</b>
              <div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </div>
          ))}
        </section>
        <section className="panel pending-orders">
          <PanelHead
            title="Pending checkouts"
            subtitle="Not included in your verified financial totals."
          />
          {data.payments.length ? (
            data.payments.map((p) => (
              <div key={p.id} className="pending-order">
                <strong>{p.description}</strong>
                <span>{money(p.amountMinor, p.currency)}</span>
                <button className="button small" disabled={busy} onClick={() => capture(p.id)}>
                  Verify capture
                </button>
                {p.approvalUrl && (
                  <a href={p.approvalUrl} className="text-link">
                    Continue approval <ExternalLink size={12} />
                  </a>
                )}
              </div>
            ))
          ) : (
            <p className="settings-note">
              No pending orders. A new checkout will appear here until its capture is verified.
            </p>
          )}
        </section>
      </aside>
      <Modal
        open={!!review}
        onOpenChange={(v) => {
          if (!v) setReview(null);
        }}
        title="Review before you pay"
        description="Confirm these details before continuing to PayPal."
      >
        {review && (
          <>
            <dl className="detail-list">
              <div>
                <dt>Description</dt>
                <dd>{review.description}</dd>
              </div>
              <div>
                <dt>Amount</dt>
                <dd>{money(toMinor(review.amount), review.currency)}</dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{review.category}</dd>
              </div>
              <div>
                <dt>Recipient</dt>
                <dd>Configured Sandbox Business merchant</dd>
              </div>
            </dl>
            <div className="notice">
              <ShieldCheck size={16} /> You’ll approve this payment on PayPal. PayTrack cannot pay
              without your approval.
            </div>
            <button
              className="button paypal-button full"
              disabled={busy}
              onClick={async () => {
                if (!requestKey) return;
                setBusy(true);
                try {
                  const result = await request("/api/payments", { ...review, requestKey });
                  if (result.approvalUrl) window.location.assign(result.approvalUrl);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Couldn't create checkout.");
                  setReview(null);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? (
                <LoaderCircle size={17} className="spin" />
              ) : (
                <>
                  <span className="paypal-monogram">P</span> Continue to PayPal{" "}
                  <ExternalLink size={15} />
                </>
              )}
            </button>
          </>
        )}
      </Modal>
    </div>
  );
}
