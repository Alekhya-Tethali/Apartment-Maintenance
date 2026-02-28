import type { Metadata, Viewport } from "next";
import { SessionProvider } from "@/contexts/SessionContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Laurel Residency",
  description: "Laurel Residency — Maintenance Tracker",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#4338ca",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
