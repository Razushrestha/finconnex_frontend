import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Allow opening the dev app from LAN IPs (phones / other PCs)
  allowedDevOrigins: ["192.168.137.1", "192.168.1.113", "localhost"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
    ],
  },
};

export default nextConfig;
