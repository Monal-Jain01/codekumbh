import type { NextConfig } from "next";
import dns from "dns";

dns.setDefaultResultOrder("ipv4first");

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

module.exports = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000', // localhost
        'congenial-telegram-v5wxp6xpx9gh645-3000.app.github.dev', // Codespaces
      ],
    },
  },
};



export default nextConfig;
