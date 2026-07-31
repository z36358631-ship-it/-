import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "盖世游戏 · DST MODS Mac Demo",
  description: "盖世游戏 / GameHub DST 本地 MODS Mac 端交互 Demo"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, overflow: "hidden", background: "#0f1014" }}>{children}</body>
    </html>
  );
}
