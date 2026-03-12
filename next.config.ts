import type { NextConfig } from "next";
import dns from "dns";

dns.setDefaultResultOrder("ipv4first");

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "**.supabase.in",
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "congenial-telegram-v5wxp6xpx9gh645-3000.app.github.dev",
      ],
    },
  },
};

export default nextConfig;
