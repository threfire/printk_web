import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "机器人学习记录",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" data-theme="dark" style={{ colorScheme: "dark" }} suppressHydrationWarning>
      <body data-theme="dark" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
