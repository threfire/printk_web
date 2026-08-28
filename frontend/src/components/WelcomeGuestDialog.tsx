"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function WelcomeGuestDialog() {
  const [dismissedPath, setDismissedPath] = useState<string | null>(null);
  const pathname = usePathname();
  const isOpen = dismissedPath !== pathname;

  useEffect(() => {
    const closeDialog = () => setDismissedPath(pathname);

    window.addEventListener("keydown", closeDialog);
    return () => window.removeEventListener("keydown", closeDialog);
  }, [pathname]);

  if (!isOpen) {
    return null;
  }

  const closeDialog = () => setDismissedPath(pathname);

  return (
    <div className="guest-welcome-backdrop" role="presentation" onClick={closeDialog}>
      <section className="guest-welcome-dialog" role="dialog" aria-modal="true" aria-labelledby="guest-welcome-title">
        <button className="guest-welcome-close" type="button" aria-label="关闭欢迎弹窗" onClick={closeDialog}>
          ×
        </button>
        <p className="guest-welcome-kicker">未登录游客模式</p>
        <h2 id="guest-welcome-title">
          <span>贵州大学 PRINTK</span>
          <span>战队展示网站</span>
          <small>(≧∇≦)ﾉ</small>
        </h2>
        <p>
          这里收纳了战队展示、赛季规划、队员资料和常用工具入口，方便大家快速找到需要的信息，也能更轻松地参与战队协作。
        </p>
        <p>非战队成员也欢迎来逛逛，想加入招新群、了解战队日常和赛季方向的小伙伴，可以先注册账号保持联系喔～</p>
        <div className="guest-welcome-actions">
          <a className="button" href="#account-register">
            去注册
          </a>
          <a className="ghost-button" href="#account-login">
            去登录
          </a>
        </div>
        <p className="guest-welcome-tip">按任意键，或点击任意位置就可以关闭这个小弹窗喔( •̀ ω •́ )✧</p>
      </section>
    </div>
  );
}
