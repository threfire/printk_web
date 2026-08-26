import { cookies } from "next/headers";
import Link from "next/link";
import { AccountDialog, AccountModals } from "@/components/AccountDialog";
import { ThemeRoot, ThemeSwitcher } from "@/components/ThemeRoot";
import { WelcomeGuestDialog } from "@/components/WelcomeGuestDialog";
import { API_BASE } from "@/lib/api";
import { robotRoles } from "@/lib/robots";
import { ENABLE_FORUM, ENABLE_INTERACTIVE } from "@/lib/site-mode";

const navItems = [
  { href: "/", label: "首页" },
  { href: "/ssl", label: "SSL 部" },
  { href: "/season-plan", label: "赛季规划" },
];

const featureNavItems = [
  { href: "/invoices", label: "报销资料管理" },
  { href: "/admin", label: "管理后台" },
  { href: "/market", label: "闲置物品展示" },
];

const memberNavItems = [
  { href: "/members#all-members", label: "全部队员" },
  { href: "/members#active-members", label: "现役队员" },
  { href: "/members#retired-members", label: "退役队员" },
];

async function getUnreadMessageCount(account: string) {
  if (!account) return 0;

  try {
    const response = await fetch(`${API_BASE}/api/site-messages/${encodeURIComponent(account)}?limit=1`, {
      cache: "no-store",
    });
    if (!response.ok) return 0;
    const data = (await response.json()) as { unread_count?: number };
    return data.unread_count ?? 0;
  } catch {
    return 0;
  }
}

export async function SiteShell({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const accountName = cookieStore.get("printk-site-account")?.value ?? "";
  const accountFeedback = cookieStore.get("printk-account-feedback")?.value ?? "";
  const unreadMessageCount = await getUnreadMessageCount(accountName);

  return (
    <ThemeRoot>
      <div className="site-frame">
        <header className="site-header">
          <Link className="brand" href="/">
            <span className="brand-copy">
              <strong>PRINTK</strong>
              <small>贵州大学机甲大师战队</small>
            </span>
          </Link>
          <nav className="nav-links" aria-label="主导航">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
            <details className="nav-dropdown">
              <summary>功能</summary>
              <div className="nav-dropdown-menu">
                {featureNavItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    {item.label}
                  </Link>
                ))}
              </div>
            </details>
            {ENABLE_FORUM ? <Link href="/forum">论坛</Link> : null}
            <details className="nav-dropdown">
              <summary>兵种</summary>
              <div className="nav-dropdown-menu">
                <Link href="/robots">兵种总览</Link>
                {robotRoles.map((robot) => (
                  <Link key={robot.id} href={`/robots/${robot.id}`}>
                    {robot.shortName}
                  </Link>
                ))}
              </div>
            </details>
            <details className="nav-dropdown">
              <summary>队员</summary>
              <div className="nav-dropdown-menu">
                {memberNavItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    {item.label}
                  </Link>
                ))}
              </div>
            </details>
            <a href="https://gzu-printk.yuque.com" target="_blank" rel="noreferrer">
              战队语雀库
            </a>
          </nav>
          <div className="header-actions">
            {accountFeedback ? <span className="account-feedback">{accountFeedback}</span> : null}
            {ENABLE_INTERACTIVE ? <AccountDialog accountName={accountName} /> : null}
          </div>
        </header>
        {ENABLE_INTERACTIVE ? <AccountModals /> : null}
        {ENABLE_INTERACTIVE && !accountName ? <WelcomeGuestDialog /> : null}
        <main>{children}</main>
        <div className="site-quick-actions">
          {ENABLE_INTERACTIVE && accountName ? (
            <Link
              className="account-message-fab"
              href="/account/messages"
              aria-label={unreadMessageCount > 0 ? `站内消息，有 ${unreadMessageCount} 条未读消息` : "站内消息"}
              title="站内消息"
            >
              <svg aria-hidden="true" viewBox="0 0 32 32">
                <path d="M6 5.5h20a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H14l-7.2 5v-5H6a3 3 0 0 1-3-3v-12a3 3 0 0 1 3-3Z" />
                <path d="M9 12h14M9 17h10" />
              </svg>
              {unreadMessageCount > 0 ? <span className="account-message-unread" aria-hidden="true" /> : null}
            </Link>
          ) : null}
          <Link className="market-quick-link" href="/market" aria-label="跳转到闲置物品展示" title="闲置物品展示">
            <span className="market-quick-icon" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </span>
          </Link>
        </div>
        <ThemeSwitcher />
      </div>
    </ThemeRoot>
  );
}
