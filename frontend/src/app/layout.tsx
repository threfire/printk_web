import type { Metadata } from "next";
import "./globals.css";
import { SiteShell } from "@/components/SiteShell";

export const metadata: Metadata = {
  title: "机器人学习记录 - 贵州大学 PRINTK 战队展示网站",
  description: "机器人学习记录、战队展示、赛季规划与队内资料管理",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" data-theme="dark" style={{ colorScheme: "dark" }} suppressHydrationWarning>
      <body data-theme="dark" suppressHydrationWarning>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
