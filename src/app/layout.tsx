import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  applicationName: "Tablewise",
  title: {
    default: "Tablewise — Smarter meals for your household",
    template: "%s | Tablewise"
  },
  description: "Meal planning that learns your household's real preferences.",
  openGraph: {
    title: "Tablewise — Smarter meals for your household",
    description: "Tablewise remembers what works. Meal planning that learns your household's real preferences.",
    siteName: "Tablewise",
    type: "website"
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tablewise"
  },
  icons: {
    icon: [
      {
        url: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon"
      },
      {
        url: "/icons/tablewise-bowl-192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        url: "/icons/tablewise-bowl-512.png",
        sizes: "512x512",
        type: "image/png"
      },
      {
        url: "/icons/tablewise-bowl-icon.svg",
        type: "image/svg+xml"
      }
    ],
    apple: [
      {
        url: "/icons/tablewise-bowl-apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png"
      }
    ]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1F5E46"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
