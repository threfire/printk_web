"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/", label: "首页" },
  { href: "/robots", label: "机器人" },
  { href: "/members", label: "队员风采" },
  { href: "/season-plan", label: "赛季规划" },
  { href: "/invoices", label: "发票管理" },
  { href: "/admin", label: "管理后台" },
];

export function SiteShell({ children }: { children: React.ReactNode }) {
  const [light, setLight] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.localStorage.getItem("printk-theme") === "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = light ? "light" : "dark";
    window.localStorage.setItem("printk-theme", light ? "light" : "dark");
  }, [light]);

  return (
    <>
      <header className="site-header">
        <Link className="brand" href="/">
          <span className="brand-mark">P</span>
          <span>
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
        <button
          className="theme-toggle"
          type="button"
          aria-label="切换亮色主题"
          onClick={() => setLight((value) => !value)}
        >
          ☀
        </button>
      </header>
      <main>{children}</main>
    </>
  );
}
