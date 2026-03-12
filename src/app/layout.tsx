import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/navbar";
import "@/lib/env"; // Validate required env vars at startup

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hackathon Starter",
  description: "Next.js + Supabase + Trigger.dev + Vercel AI SDK",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">

      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Navbar
          companyName="CodeHunt"
          links={[
            { label: 'Home', href: '/' },
            { label: 'For Buyers', href: '/buyers' },
            { label: 'For Tenants', href: '/tenants' },
            { label: 'For Owners', href: '/owners' },
            { label: 'For Dealers/Builderws', href: '/dealers' },

          ]}
          profileButtonLabel="Profile"
        />
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
