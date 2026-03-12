import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/navbar";
import { ThemeProvider } from "@/components/theme-provider";
import { createClient } from "@/lib/supabase/server";
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
  title: "Estator — Find Your Perfect Property in India",
  description: "Discover, buy, and sell properties across India with smart search, AI-powered market insights, and verified listings.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profileButtonLabel = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Profile";
  const userEmail = user?.email;

  return (
    <html lang="en" suppressHydrationWarning>

      <body
        className={`  ${geistSans.variable} ${geistMono.variable} antialiased bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Navbar
            companyName="Estator"
            links={[
              { label: 'Home', href: '/' },
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Properties', href: '/properties' },
            ]}
            profileButtonLabel={profileButtonLabel}
            userEmail={userEmail}
            isLoggedIn={!!user}
          />
          <main className="pt-30  bg-background min-h-screen">
            {children}
          </main>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
