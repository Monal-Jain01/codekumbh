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
      bodySizeLimit: '10mb',
      allowedOrigins: [
        "localhost:3000",
        "localhost:3001",
        // GitHub Codespaces (any subdomain)
        "*.app.github.dev",
        // Vercel previews
        "*.vercel.app",
      ],
    },
  },
};

export default nextConfig;
