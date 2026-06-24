import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  applicationName: "Hearth",
  title: {
    default: "Hearth — Dinner is handled",
    template: "%s | Hearth"
  },
  description: "The operating system for family meals.",
  openGraph: {
    title: "Hearth — Dinner is handled",
    description: "Hearth learns what your household loves and helps make dinner easier.",
    siteName: "Hearth",
    type: "website"
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Hearth"
  },
  icons: {
    icon: [
      {
        url: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon"
      },
      {
        url: "/icons/hearth-192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        url: "/icons/hearth-512.png",
        sizes: "512x512",
        type: "image/png"
      },
      {
        url: "/icons/hearth-icon.svg",
        type: "image/svg+xml"
      }
    ],
    apple: [
      {
        url: "/icons/hearth-apple-touch-icon.png",
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
  themeColor: "#173A34"
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
