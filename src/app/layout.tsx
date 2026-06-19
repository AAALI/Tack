import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, Space_Mono } from "next/font/google";
import { ThemeInit } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});
const grotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-grotesk",
});
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-space-mono",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tack.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Tack — The board your team actually owns",
    template: "%s · Tack",
  },
  description:
    "Open-source Kanban that your team actually owns. Self-host it free on your own Supabase, or start on Tack Cloud — unlimited projects and members.",
  applicationName: "Tack",
  keywords: [
    "Kanban",
    "open source Kanban",
    "self-hosted Kanban",
    "project management",
    "Supabase",
    "team board",
    "task management",
    "Tack",
  ],
  authors: [{ name: "Tack" }],
  creator: "Tack",
  publisher: "Tack",
  category: "productivity",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Tack",
    title: "Tack — The board your team actually owns",
    description:
      "Open-source Kanban. Self-host it free on your own Supabase, or start on Tack Cloud — unlimited projects and members.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tack — The board your team actually owns",
    description:
      "Open-source Kanban. Self-host it free, or start on Tack Cloud — unlimited projects and members.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F5F2" },
    { media: "(prefers-color-scheme: dark)", color: "#141414" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${grotesk.variable} ${spaceMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeInit />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
