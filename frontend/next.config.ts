import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost", "10.*.*.*", "172.*.*.*", "192.168.*.*"],
  experimental: {
    proxyClientMaxBodySize: "62mb",
  },
};

export default nextConfig;
