import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "storage.googleapis.com", pathname: "/crewplay-arena-storage/**" },
    ],
  },
};

export default nextConfig;
