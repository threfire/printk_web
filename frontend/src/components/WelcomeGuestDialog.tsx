"use client";

import { useEffect, useState } from "react";

export function WelcomeGuestDialog() {
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const closeDialog = () => setIsOpen(false);

    window.addEventListener("keydown", closeDialog);
    return () => window.removeEventListener("keydown", closeDialog);
  }, []);

  if (!isOpen) {
    return null;
  }

  const closeDialog = () => setIsOpen(false);

  return (
    <div className="guest-welcome-backdrop" role="presentation" onClick={closeDialog}>
      <section className="guest-welcome-dialog" role="dialog" aria-modal="true" aria-labelledby="guest-welcome-title">
        <button className="guest-welcome-close" type="button" aria-label="关闭欢迎弹窗" onClick={closeDialog}>
          ×
        </button>
        <p className="guest-welcome-kicker">未登录游客模式</p>
        <h2 id="guest-welcome-title">
          <span>欢迎来到贵州大学</span>
          <span>PRINTK 战队门户网站</span>
          <small>(｡･ω･｡)ﾉ</small>
        </h2>
        <p>
          这里收纳了战队展示、赛季规划、队员资料、论坛交流和常用工具入口，方便大家快速找到需要的信息，也能更轻松地参与战队协作。
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
        <p className="guest-welcome-tip">按任意键，或点击任意位置就可以关闭这个小弹窗啦 ( •̀ ω •́ )✧</p>
      </section>
    </div>
  );
}
