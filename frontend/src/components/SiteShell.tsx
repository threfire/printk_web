import { cookies } from "next/headers";
import Link from "next/link";
import { AccountDialog, AccountModals } from "@/components/AccountDialog";
import { ThemeRoot, ThemeSwitcher } from "@/components/ThemeRoot";

const navItems = [
  { href: "/", label: "首页" },
  { href: "/robots", label: "机器人" },
  { href: "/members", label: "队员风采" },
  { href: "/season-plan", label: "赛季规划" },
  { href: "/forum", label: "队内论坛" },
  { href: "/invoices", label: "发票管理" },
  { href: "/image2", label: "图片工具" },
  { href: "/admin", label: "管理后台" },
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
              <small>机器人战队门户</small>
            </span>
          </Link>
          <nav className="nav-links" aria-label="主导航">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
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
