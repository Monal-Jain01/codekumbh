import type { NextConfig } from "next";
import dns from "dns";

dns.setDefaultResultOrder("ipv4first");

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;
