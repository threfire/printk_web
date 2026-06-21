import { cookies } from "next/headers";
import Link from "next/link";
import { AccountDialog, AccountModals } from "@/components/AccountDialog";
import { ThemeRoot, ThemeSwitcher } from "@/components/ThemeRoot";
import { robotRoles } from "@/lib/robots";

const navItems = [
  { href: "/", label: "首页" },
  { href: "/season-plan", label: "赛季规划" },
  { href: "/forum", label: "论坛" },
];

const featureNavItems = [
  { href: "/invoices", label: "发票管理" },
  { href: "/image2", label: "图片工具" },
  { href: "/admin", label: "管理后台" },
];

const memberNavItems = [
  { href: "/members#all-members", label: "全部队员" },
  { href: "/members#active-members", label: "现役队员" },
  { href: "/members#retired-members", label: "退役队员" },
  { href: "/members#retired-2025", label: "2025 退役" },
  { href: "/members#retired-2024", label: "2024 退役" },
  { href: "/members#retired-2023", label: "2023 退役" },
];

export async function SiteShell({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const accountName = cookieStore.get("printk-site-account")?.value ?? "";
  const accountFeedback = cookieStore.get("printk-account-feedback")?.value ?? "";

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
          </nav>
          <div className="header-actions">
            {accountFeedback ? <span className="account-feedback">{accountFeedback}</span> : null}
            <AccountDialog accountName={accountName} />
          </div>
        </header>
        <AccountModals />
        <main>{children}</main>
        <ThemeSwitcher />
      </div>
    </ThemeRoot>
  );
}
