import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CST505 Simulation Suite",
  description:
    "Deterministic operating-system simulation modules for CST505: Advanced Operating Systems Theory.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-indigo-700 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <footer className="print:hidden border-t border-slate-200 dark:border-slate-800 px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
          <div className="mx-auto max-w-5xl">
            CST505 Simulation Suite &mdash; instructional models, not live operating-system,
            container, or virtual-machine environments. No accounts. No data leaves your browser
            unless you export it.
          </div>
        </footer>
      </body>
    </html>
  );
}
