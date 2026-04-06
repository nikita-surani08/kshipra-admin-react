import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "kshipra-content.s3.ap-south-2.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
