import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Code Battle",
  description: "College symposium programming competition platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
