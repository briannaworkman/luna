import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { cn } from "@/lib/utils";
import { GrainOverlay } from "@/components/grain-overlay";
import { TopBar } from "@/components/top-bar/TopBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "LUNA",
  description: "Lunar Unified Navigation & Analysis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable}`}>
      <body className={cn("antialiased font-sans")}>
        <GrainOverlay />
        <TopBar />
        {children}
      </body>
    </html>
  );
}
