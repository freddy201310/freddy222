import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Haven — parental controls for iPhone and Samsung", template: "%s · Haven" },
  description: "One parent-only dashboard for iPhone and Samsung parental controls, built around the loopholes kids use to get past today's apps.",
};

export const viewport: Viewport = { themeColor: "#14806b" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
